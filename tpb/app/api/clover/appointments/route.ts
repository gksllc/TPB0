import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const CLOVER_API_BASE_URL = process.env.NEXT_PUBLIC_CLOVER_API_BASE || 'https://api.clover.com'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

export async function POST(request: Request) {
  try {
    const appointmentData = await request.json()
    console.log('Received appointment data:', appointmentData)

    const apiToken = process.env.CLOVER_API_TOKEN
    const merchantId = process.env.CLOVER_MERCHANT_ID

    if (!apiToken || !merchantId) {
      throw new Error('Missing Clover credentials')
    }

    // Create order in Clover
    const orderUrl = `${CLOVER_API_BASE_URL}/merchants/${merchantId}/orders`
    console.log('Making request to:', orderUrl)

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
Contact: ${appointmentData.customer.email} | ${appointmentData.customer.phone}`
      })
    })

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text()
      throw new Error(`Failed to create order: ${errorText}`)
    }

    const orderData = await orderResponse.json()
    console.log('Created order:', orderData)

    // Add line items to the order
    const lineItems = []
    for (const serviceId of appointmentData.services) {
      console.log('Adding line item:', {
        serviceId,
        url: `${CLOVER_API_BASE_URL}/merchants/${merchantId}/orders/${orderData.id}/line_items`
      })

      const lineItemResponse = await fetch(
        `${CLOVER_API_BASE_URL}/merchants/${merchantId}/orders/${orderData.id}/line_items`,
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
        throw new Error(`Failed to add line item: ${errorText}`)
      }

      const lineItemData = await lineItemResponse.json()
      console.log('Added line item:', lineItemData)
      lineItems.push(lineItemData)
    }

    console.log('All line items added:', lineItems)

    // Create appointment in Supabase
    const { data: appointmentRecord, error: appointmentError } = await supabase
      .from('appointments')
      .insert([{
        user_id: appointmentData.userId,
        pet_id: appointmentData.petId,
        pet_name: appointmentData.petName,
        service_type: 'Grooming',
        service_items: appointmentData.service_items,
        status: 'Confirmed',
        appointment_date: appointmentData.date,
        appointment_time: appointmentData.time,
        c_order_id: orderData.id,
        employee_id: appointmentData.employee.id,
        employee_name: appointmentData.employee_name
      }])
      .select()
      .single()

    if (appointmentError) {
      console.error('Failed to create Supabase appointment:', appointmentError)
      
      // If Supabase insert fails, try to cancel the Clover order
      try {
        await fetch(
          `${CLOVER_API_BASE_URL}/merchants/${merchantId}/orders/${orderData.id}`,
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

    return NextResponse.json({
      success: true,
      data: {
        appointment: appointmentRecord,
        order: orderData,
        lineItems
      }
    })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create appointment'
    }, { status: 500 })
  }
} 