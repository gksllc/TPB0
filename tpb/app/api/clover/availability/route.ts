import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const CLOVER_API_BASE_URL = process.env.NEXT_PUBLIC_CLOVER_API_BASE || 'https://api.clover.com'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

// Default business hours
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
const TIME_SLOT_INTERVAL = 15

// Helper function to convert time string to minutes since start of day
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// Helper function to convert minutes to time string
const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

// Helper function to convert 24hr to 12hr format
const formatTo12Hour = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`
}

// Function to check if a time slot overlaps with any booked appointments
const isTimeSlotAvailable = (
  slotStart: number,
  slotDuration: number,
  bookedSlots: Array<{ start: number; end: number }>
): boolean => {
  const slotEnd = slotStart + slotDuration

  // Check if any booked slot overlaps with the current slot
  const isOverlapping = bookedSlots.some(booking => {
    // Ensure all values are numbers for comparison
    const bookingStart = Number(booking.start)
    const bookingEnd = Number(booking.end)
    
    const hasOverlap = (
      (slotStart < bookingEnd && slotStart >= bookingStart) || // Start time overlaps
      (slotEnd > bookingStart && slotEnd <= bookingEnd) || // End time overlaps
      (slotStart <= bookingStart && slotEnd >= bookingEnd) // Slot encompasses booking
    )

    console.log('Overlap check:', {
      slotStart,
      slotEnd,
      bookingStart,
      bookingEnd,
      hasOverlap
    })

    return hasOverlap
  })

  return !isOverlapping
}

// Function to generate time slots
const generateTimeSlots = (
  start: string,
  end: string,
  bookedSlots: Array<{ start: number; end: number }>,
  duration: number = 30
): string[] => {
  const slots: string[] = []
  const startMinutes = timeToMinutes(start)
  const endMinutes = timeToMinutes(end)
  
  // Ensure we don't create slots that would end after business hours
  const lastPossibleSlotStart = endMinutes - duration

  console.log('Generating time slots:', {
    startTime: start,
    endTime: end,
    startMinutes,
    endMinutes,
    lastPossibleSlotStart,
    duration,
    interval: TIME_SLOT_INTERVAL
  })

  for (let currentMinutes = startMinutes; currentMinutes <= lastPossibleSlotStart; currentMinutes += TIME_SLOT_INTERVAL) {
    const currentTimeString = minutesToTime(currentMinutes)
    const isAvailable = isTimeSlotAvailable(currentMinutes, duration, bookedSlots)
    
    console.log('Checking slot:', {
      time: currentTimeString,
      formattedTime: formatTo12Hour(currentTimeString),
      isAvailable,
      currentMinutes,
      wouldEndAt: currentMinutes + duration
    })

    if (isAvailable) {
      slots.push(formatTo12Hour(currentTimeString))
    }
  }

  return slots
}

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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export async function GET(request: Request) {
  try {
    // Parse query parameters
    const url = new URL(request.url)
    const date = url.searchParams.get('date')
    const employeeId = url.searchParams.get('employeeId')
    const duration = parseInt(url.searchParams.get('duration') || '30', 10)

    if (!date || !employeeId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 })
    }

    const selectedDate = new Date(date)
    const dayOfWeek = getDayOfWeek(selectedDate)
    const businessHours = DEFAULT_BUSINESS_HOURS[dayOfWeek]

    // Get existing appointments for the selected date and employee
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('appointment_time, appointment_duration')
      .eq('employee_id', employeeId)
      .eq('appointment_date', date)
      .not('status', 'eq', 'cancelled')

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch appointments'
      }, { status: 500 })
    }

    // Convert appointments to time slots
    const bookedSlots = appointments?.map(appointment => ({
      start: timeToMinutes(appointment.appointment_time),
      end: timeToMinutes(appointment.appointment_time) + (appointment.appointment_duration || 30)
    })) || []

    // Generate available time slots
    const availableSlots = generateTimeSlots(
      businessHours.open,
      businessHours.close,
      bookedSlots,
      duration
    )

    const response = NextResponse.json({
      success: true,
      data: availableSlots
    })

    // Set CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    return response
  } catch (error) {
    console.error('Error in availability endpoint:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
} 