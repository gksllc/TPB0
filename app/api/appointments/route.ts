import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 })
          }
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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 })
          }
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