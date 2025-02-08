'use server'

import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { type Database } from '@/lib/database.types'
import { 
  type AppointmentResponse, 
  type AppointmentCreate, 
  type AppointmentUpdate 
} from '@/lib/types/appointments'
import { revalidatePath } from 'next/cache'

const CLOVER_API_BASE_URL = 'https://api.clover.com/v3'
const CACHE_REVALIDATE_SECONDS = 60

async function handleCloverRequest(endpoint: string, method: string, body?: any) {
  const response = await fetch(`${CLOVER_API_BASE_URL}/merchants/${process.env.CLOVER_MERCHANT_ID}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${process.env.CLOVER_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    ...(body && { body: JSON.stringify(body) }),
    next: { revalidate: CACHE_REVALIDATE_SECONDS }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Clover API error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        pets:pet_id (
          id,
          name,
          image_url,
          size
        ),
        customer:user_id (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })

    if (error) throw error

    const transformedData = data.map(appointment => ({
      ...appointment,
      pet: appointment.pets,
      customer: appointment.customer ? {
        id: appointment.customer.id,
        firstName: appointment.customer.first_name,
        lastName: appointment.customer.last_name,
        email: appointment.customer.email,
        phone: appointment.customer.phone
      } : null,
      pets: undefined // Remove the original pets field
    }))

    return NextResponse.json({
      success: true,
      data: transformedData
    }, {
      headers: {
        'Cache-Control': `s-maxage=${CACHE_REVALIDATE_SECONDS}, stale-while-revalidate`
      }
    })
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch appointments'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json() as AppointmentCreate
    
    // Create appointment in Clover
    const cloverAppointment = await handleCloverRequest('/appointments', 'POST', {
      customer: {
        id: body.customer.id,
        firstName: body.customer.firstName,
        lastName: body.customer.lastName,
        emailAddress: body.customer.email,
        phoneNumber: body.customer.phone,
      },
      employee: {
        id: body.employee_id,
      },
      date: body.appointment_date,
      time: body.appointment_time,
      duration: body.appointment_duration,
    })

    // Create appointment in database
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        ...body,
        c_order_id: cloverAppointment.id,
        user_id: session.user.id,
      })
      .select()
      .single()

    if (appointmentError) throw appointmentError

    revalidatePath('/dashboard/admin-appointments')
    
    return NextResponse.json({
      success: true,
      data: appointmentData
    })
  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create appointment'
    }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json() as AppointmentUpdate
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Appointment ID is required'
      }, { status: 400 })
    }

    // Update Clover appointment if needed
    if (updateData.status || updateData.appointment_date || updateData.appointment_time) {
      await handleCloverRequest(`/appointments/${id}`, 'PUT', {
        status: updateData.status,
        date: updateData.appointment_date,
        time: updateData.appointment_time,
      })
    }

    // Update database
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (appointmentError) throw appointmentError

    revalidatePath('/dashboard/admin-appointments')
    
    return NextResponse.json({
      success: true,
      data: appointmentData
    })
  } catch (error) {
    console.error('Error updating appointment:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update appointment'
    }, { status: 500 })
  }
} 