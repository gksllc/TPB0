import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

const CLOVER_API_BASE_URL = process.env.NEXT_PUBLIC_CLOVER_API_URL || 'https://api.clover.com/v3'

// Default business hours if not set in Clover
const DEFAULT_BUSINESS_HOURS = {
  monday: { open: '09:00', close: '17:00' },
  tuesday: { open: '09:00', close: '17:00' },
  wednesday: { open: '09:00', close: '17:00' },
  thursday: { open: '09:00', close: '17:00' },
  friday: { open: '09:00', close: '17:00' },
  saturday: { open: '09:00', close: '17:00' },
  sunday: { open: '09:00', close: '17:00' },
}

// Time slot interval in minutes
const TIME_SLOT_INTERVAL = 30

const getDayOfWeek = (date: Date): keyof typeof DEFAULT_BUSINESS_HOURS => {
  const days: (keyof typeof DEFAULT_BUSINESS_HOURS)[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ]
  return days[date.getDay()]
}

export async function GET(request: Request) {
  try {
    // Add CORS headers
    const headersList = await headers()
    const origin = await headersList.get('origin') || '*'

    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json',
    }

    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    const groomerId = searchParams.get('groomerId')

    console.log('Received request params:', { dateStr, groomerId })

    if (!dateStr || !groomerId) {
      console.error('Missing parameters:', { dateStr, groomerId })
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { 
        status: 400,
        headers: corsHeaders
      })
    }

    const apiToken = process.env.CLOVER_API_TOKEN
    const merchantId = process.env.CLOVER_MERCHANT_ID

    if (!apiToken || !merchantId) {
      console.error('Missing Clover credentials')
      return NextResponse.json({
        success: false,
        error: 'Clover API configuration error'
      }, { 
        status: 500,
        headers: corsHeaders
      })
    }

    // Parse the date string and set it to midnight UTC
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateStr)
      return NextResponse.json({
        success: false,
        error: 'Invalid date format'
      }, { 
        status: 400,
        headers: corsHeaders
      })
    }

    console.log('Parsed date:', date.toISOString())

    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    console.log('Date range:', { 
      startOfDay: startOfDay.toISOString(), 
      endOfDay: endOfDay.toISOString() 
    })

    // Get business hours from Clover
    const businessHoursUrl = `${CLOVER_API_BASE_URL}/merchants/${merchantId}/business_hours`
    console.log('Fetching business hours:', businessHoursUrl.replace(apiToken, '[REDACTED]'))

    const businessHoursResponse = await fetch(businessHoursUrl, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      }
    })

    let businessHours = DEFAULT_BUSINESS_HOURS
    if (businessHoursResponse.ok) {
      try {
        const businessHoursData = await businessHoursResponse.json()
        console.log('Business hours response:', businessHoursData)

        if (businessHoursData.elements?.length > 0) {
          const dayName = getDayOfWeek(date)
          console.log('Looking for hours for day:', dayName)

          const dayHours = businessHoursData.elements.find(
            (day: any) => day.dayOfWeek.toLowerCase() === dayName
          )
          
          if (dayHours) {
            businessHours = {
              ...businessHours,
              [dayName]: {
                open: dayHours.open || DEFAULT_BUSINESS_HOURS[dayName].open,
                close: dayHours.close || DEFAULT_BUSINESS_HOURS[dayName].close
              }
            }
          }
        }
      } catch (error) {
        console.error('Error parsing business hours:', error)
        // Continue with default hours
      }
    } else {
      console.warn('Failed to fetch business hours, using defaults:', await businessHoursResponse.text())
    }

    // Get existing appointments for the selected date and groomer
    const appointmentsUrl = `${CLOVER_API_BASE_URL}/merchants/${merchantId}/orders?`
      + `filter=createdTime>=${startOfDay.getTime()}`
      + `&filter=createdTime<=${endOfDay.getTime()}`
      + `&filter=employee.id=${groomerId}`

    console.log('Fetching appointments:', appointmentsUrl.replace(apiToken, '[REDACTED]'))

    const appointmentsResponse = await fetch(appointmentsUrl, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      }
    })

    if (!appointmentsResponse.ok) {
      const errorText = await appointmentsResponse.text()
      console.error('Failed to fetch appointments:', {
        status: appointmentsResponse.status,
        statusText: appointmentsResponse.statusText,
        error: errorText
      })
      return NextResponse.json({
        success: false,
        error: `Failed to fetch appointments: ${appointmentsResponse.statusText}`
      }, { 
        status: appointmentsResponse.status,
        headers: corsHeaders
      })
    }

    let appointmentsData
    try {
      appointmentsData = await appointmentsResponse.json()
      console.log('Appointments response:', appointmentsData)
    } catch (error) {
      console.error('Error parsing appointments response:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to parse appointments data'
      }, { 
        status: 500,
        headers: corsHeaders
      })
    }

    const bookedTimes = appointmentsData.elements?.map((appointment: any) => {
      const appointmentDate = new Date(appointment.createdTime)
      return {
        start: appointmentDate.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        duration: 60 // Default duration in minutes
      }
    }) || []

    console.log('Booked times:', bookedTimes)

    // Generate available time slots
    const dayOfWeek = getDayOfWeek(date)
    const dayHours = businessHours[dayOfWeek]
    
    console.log('Using business hours:', { dayOfWeek, dayHours })

    const timeSlots = []
    const startTime = new Date(date)
    startTime.setHours(
      parseInt(dayHours.open.split(':')[0]),
      parseInt(dayHours.open.split(':')[1]),
      0,
      0
    )

    const endTime = new Date(date)
    endTime.setHours(
      parseInt(dayHours.close.split(':')[0]),
      parseInt(dayHours.close.split(':')[1]),
      0,
      0
    )

    console.log('Time range:', { 
      startTime: startTime.toISOString(), 
      endTime: endTime.toISOString() 
    })

    for (
      let time = new Date(startTime); 
      time < endTime; 
      time = new Date(time.getTime() + TIME_SLOT_INTERVAL * 60000)
    ) {
      const timeString = time.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })

      // Check if time slot is available
      const isBooked = bookedTimes.some(booking => {
        const bookingStart = new Date(date)
        bookingStart.setHours(
          parseInt(booking.start.split(':')[0]),
          parseInt(booking.start.split(':')[1]),
          0,
          0
        )
        const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60000)
        return time >= bookingStart && time < bookingEnd
      })

      if (!isBooked) {
        timeSlots.push(timeString)
      }
    }

    console.log('Generated time slots:', timeSlots)

    return NextResponse.json({
      success: true,
      data: {
        businessHours: dayHours,
        availableTimeSlots: timeSlots
      }
    }, { 
      headers: corsHeaders
    })

  } catch (error: any) {
    console.error('Error in availability endpoint:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch availability'
    }, { 
      status: 500,
      headers: corsHeaders
    })
  }
} 