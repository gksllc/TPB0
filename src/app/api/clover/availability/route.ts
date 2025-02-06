import { NextResponse } from 'next/server'
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

  return !bookedSlots.some(booking => {
    const bookingStart = Number(booking.start)
    const bookingEnd = Number(booking.end)
    
    return (
      (slotStart < bookingEnd && slotStart >= bookingStart) ||
      (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
      (slotStart <= bookingStart && slotEnd >= bookingEnd)
    )
  })
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
  const lastPossibleSlotStart = endMinutes - duration

  for (let currentMinutes = startMinutes; currentMinutes <= lastPossibleSlotStart; currentMinutes += TIME_SLOT_INTERVAL) {
    const currentTimeString = minutesToTime(currentMinutes)
    if (isTimeSlotAvailable(currentMinutes, duration, bookedSlots)) {
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

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    const groomerId = searchParams.get('groomerId')
    const serviceDuration = parseInt(searchParams.get('duration') || '30', 10)

    if (!dateStr || !groomerId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 })
    }

    // Parse the date string
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return NextResponse.json({
        success: false,
        error: 'Invalid date format'
      }, { status: 400 })
    }

    // Get the business hours for the selected day
    const dayName = getDayOfWeek(date)
    const dayHours = DEFAULT_BUSINESS_HOURS[dayName]

    // Get existing appointments from Supabase
    const { data: bookedAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('appointment_time, appointment_duration')
      .eq('appointment_date', dateStr)
      .eq('employee_id', groomerId)
      .not('status', 'eq', 'cancelled')

    if (appointmentsError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch appointments'
      }, { status: 500 })
    }

    // Convert booked appointments to time ranges in minutes
    const bookedTimeRanges = bookedAppointments.map(appointment => {
      const startMinutes = timeToMinutes(appointment.appointment_time)
      const duration = parseInt(appointment.appointment_duration?.toString() || '30', 10)
      return {
        start: startMinutes,
        end: startMinutes + duration
      }
    })

    // Generate available time slots
    const availableTimeSlots = generateTimeSlots(
      dayHours.open,
      dayHours.close,
      bookedTimeRanges,
      serviceDuration
    )

    return NextResponse.json({
      success: true,
      data: {
        availableTimeSlots,
        businessHours: dayHours
      }
    })

  } catch (error: any) {
    console.error('Error in availability endpoint:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
} 