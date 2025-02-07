'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const CLOVER_API_BASE_URL = process.env.NEXT_PUBLIC_CLOVER_API_BASE || 'https://api.clover.com'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        pets:pet_id (
          image_url
        )
      `)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })

    if (error) throw error

    // Transform the data to include pet_image_url at the top level
    const transformedData = data.map(appointment => ({
      ...appointment,
      pet_image_url: appointment.pets?.image_url,
      pets: undefined // Remove the nested pets object
    }))

    return NextResponse.json({
      success: true,
      data: transformedData
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
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('Received appointment data:', body)

    // Create the appointment in Clover
    const cloverResponse = await fetch(`${process.env.CLOVER_API_BASE}/appointments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLOVER_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: {
          id: body.customer.id,
          firstName: body.customer.firstName,
          lastName: body.customer.lastName,
          emailAddress: body.customer.email,
          phoneNumber: body.customer.phone,
        },
        employee: {
          id: body.employee.id,
        },
        date: body.date,
        time: body.time,
        duration: body.duration,
      }),
    })

    if (!cloverResponse.ok) {
      const errorData = await cloverResponse.json()
      console.error('Clover API error:', errorData)
      throw new Error('Failed to create appointment in Clover')
    }

    const cloverData = await cloverResponse.json()
    console.log('Clover appointment created:', cloverData)

    // Create the appointment in our database
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        c_order_id: cloverData.id,
        customer_id: body.customer.id,
        pet_id: body.petId,
        pet_name: body.petName,
        employee_id: body.employee.id,
        employee_name: body.employee_name,
        service_items: body.service_items,
        appointment_date: body.date,
        appointment_time: body.time,
        appointment_duration: body.duration,
        total_amount: body.total,
        status: 'confirmed',
      })
      .select()
      .single()

    if (appointmentError) {
      console.error('Database error:', appointmentError)
      throw appointmentError
    }

    console.log('Appointment created in database:', appointmentData)

    return NextResponse.json({
      success: true,
      data: appointmentData,
    })
  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create appointment'
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('Updating appointment:', body)

    // Update the appointment in our database
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .update({
        service_items: body.service_items,
        appointment_date: body.appointment_date,
        appointment_time: body.appointment_time,
        appointment_duration: body.duration,
        employee_id: body.employee_id,
        employee_name: body.employee_name,
        status: body.status,
      })
      .eq('id', body.id)
      .select()
      .single()

    if (appointmentError) {
      console.error('Database error:', appointmentError)
      throw appointmentError
    }

    // If there's a Clover order ID, update it in Clover
    if (body.c_order_id) {
      const cloverResponse = await fetch(
        `${process.env.CLOVER_API_BASE}/appointments/${body.c_order_id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${process.env.CLOVER_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: body.appointment_date,
            time: body.appointment_time,
            duration: body.duration,
            employee: {
              id: body.employee_id,
            },
          }),
        }
      )

      if (!cloverResponse.ok) {
        const errorData = await cloverResponse.json()
        console.error('Clover API error:', errorData)
        throw new Error('Failed to update appointment in Clover')
      }

      const cloverData = await cloverResponse.json()
      console.log('Clover appointment updated:', cloverData)
    }

    return NextResponse.json({
      success: true,
      data: appointmentData,
    })
  } catch (error) {
    console.error('Error updating appointment:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update appointment'
      },
      { status: 500 }
    )
  }
} 