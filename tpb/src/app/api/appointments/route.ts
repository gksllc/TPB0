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
    const appointmentData = await request.json()
    console.log('Creating appointment with data:', appointmentData)

    const apiToken = process.env.CLOVER_API_TOKEN
    const merchantId = process.env.CLOVER_MERCHANT_ID

    if (!apiToken || !merchantId) {
      throw new Error('Missing Clover credentials')
    }

    // 1. Create the order in Clover first
    const orderUrl = `${CLOVER_API_BASE_URL}/v3/merchants/${merchantId}/orders`
    console.log('Creating Clover order:', orderUrl)

    const orderResponse = await fetch(orderUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        employee: { id: appointmentData.employee.id },
        total: appointmentData.total,
        title: 'Pet Grooming Appointment',
        note: `Customer: ${appointmentData.customer.firstName} ${appointmentData.customer.lastName}
Pet: ${appointmentData.petName}
Appointment Date: ${appointmentData.date}
Appointment Time: ${appointmentData.time}
Services: ${appointmentData.service_items.join(', ')}
Contact: ${appointmentData.customer.email} | ${appointmentData.customer.phone}`
      })
    })

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text()
      throw new Error(`Failed to create Clover order: ${errorText}`)
    }

    const orderData = await orderResponse.json()
    console.log('Created Clover order:', orderData)

    // 2. Add line items to the order
    const lineItems = []
    for (const serviceId of appointmentData.services) {
      console.log('Adding service to order:', serviceId)

      const lineItemResponse = await fetch(
        `${CLOVER_API_BASE_URL}/v3/merchants/${merchantId}/orders/${orderData.id}/line_items`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            item: { id: serviceId }
          })
        }
      )

      if (!lineItemResponse.ok) {
        const errorText = await lineItemResponse.text()
        throw new Error(`Failed to add service to order: ${errorText}`)
      }

      const lineItemData = await lineItemResponse.json()
      console.log('Added service to order:', lineItemData)
      lineItems.push(lineItemData)
    }

    // 3. Create the appointment in Supabase
    const { data: appointmentRecord, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        user_id: appointmentData.customer.id,
        pet_id: appointmentData.petId,
        pet_name: appointmentData.petName,
        service_type: 'Grooming',
        service_items: appointmentData.service_items,
        status: 'Confirmed',
        appointment_date: appointmentData.date,
        appointment_time: appointmentData.time,
        appointment_duration: appointmentData.duration,
        c_order_id: orderData.id,
        employee_id: appointmentData.employee.id,
        employee_name: appointmentData.employee_name
      })
      .select()
      .single()

    if (appointmentError) {
      console.error('Failed to create appointment in Supabase:', appointmentError)
      
      // If Supabase insert fails, try to delete the Clover order
      try {
        await fetch(
          `${CLOVER_API_BASE_URL}/v3/merchants/${merchantId}/orders/${orderData.id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${apiToken}`
            }
          }
        )
      } catch (deleteError) {
        console.error('Failed to delete Clover order after Supabase error:', deleteError)
      }
      
      throw appointmentError
    }

    // 4. Return success response with all created data
    return NextResponse.json({
      success: true,
      data: {
        appointment: appointmentRecord,
        order: orderData,
        lineItems
      }
    })

  } catch (error: any) {
    console.error('Error creating appointment:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create appointment'
    }, { status: 500 })
  }
} 