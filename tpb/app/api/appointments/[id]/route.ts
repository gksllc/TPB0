import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import axios from 'axios'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOVER_API_BASE = process.env.NEXT_PUBLIC_CLOVER_API_BASE!
const CLOVER_API_TOKEN = process.env.CLOVER_API_TOKEN!
const MERCHANT_ID = process.env.CLOVER_MERCHANT_ID!

// Create a Supabase client for service-role operations
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

// Create a Clover client instance specifically for the API route
const cloverClient = axios.create({
  baseURL: `${CLOVER_API_BASE}/v3/merchants/${MERCHANT_ID}`,
  headers: {
    'Authorization': `Bearer ${CLOVER_API_TOKEN}`,
    'Content-Type': 'application/json'
  }
})

// Helper function to get authenticated supabase client
async function getAuthenticatedClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(
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
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

// Helper function to handle Clover operations
async function handleCloverOperations(oldOrderId: string, appointmentDetails: any) {
  const {
    appointment_date,
    appointment_time,
    service_items,
    employee_id,
    employee_name,
    total,
    pet_name,
    user_name,
    user_email,
    user_phone,
    service_prices,
    services
  } = appointmentDetails

  try {
    // Delete the existing order
    console.log('Attempting to delete Clover order:', oldOrderId, {
      baseURL: cloverClient.defaults.baseURL,
      token: CLOVER_API_TOKEN?.slice(0, 5) + '...'
    })
    
    await cloverClient.delete(`/orders/${oldOrderId}`)
    console.log('Successfully deleted old Clover order:', oldOrderId)

    // Format the note with all details
    const note = [
      `Customer: ${user_name}`,
      `Pet: ${pet_name}`,
      `Appointment Date: ${appointment_date}`,
      `Appointment Time: ${appointment_time}`,
      `Services: ${service_items.join(', ')}`,
      `Contact: ${user_email} | ${user_phone}`
    ].join('\n')

    // Create a new order
    console.log('Creating new Clover order with details:', {
      total,
      note,
      employeeId: employee_id
    })
    
    const orderResponse = await cloverClient.post('/orders', {
      employee: { id: employee_id },
      total: Math.round(total * 100), // Convert to cents
      title: 'Pet Grooming Appointment',
      note,
      state: 'open'
    })

    const newOrderId = orderResponse.data.id
    console.log('Successfully created new Clover order:', newOrderId)

    // Add line items with their respective services
    console.log('Adding service items to order:', service_items)
    try {
      for (let i = 0; i < services.length; i++) {
        const serviceId = services[i]
        await cloverClient.post(`/orders/${newOrderId}/line_items`, {
          item: { id: serviceId }
        })
      }
    } catch (lineItemError: any) {
      // Log the error but continue with the update
      console.error('Failed to add line items:', lineItemError?.response?.data || lineItemError)
      console.log('Continuing with update despite line item error')
    }

    return { success: true, orderId: newOrderId }
  } catch (error: any) {
    console.error('Clover operation failed:', {
      error: error?.response?.data || error,
      status: error?.response?.status,
      config: {
        baseURL: error?.config?.baseURL,
        method: error?.config?.method,
        url: error?.config?.url
      }
    })
    throw error
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseAuth = await getAuthenticatedClient()
    const { data: { session }, error: authError } = await supabaseAuth.auth.getSession()
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching appointment:', error)
      throw error
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        error: 'Appointment not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error: any) {
    console.error('Error in GET /api/appointments/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseAuth = await getAuthenticatedClient()
    const { data: { session }, error: authError } = await supabaseAuth.auth.getSession()
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updateData = await request.json()
    console.log('Received update data:', updateData)

    let newOrderId = updateData.c_order_id

    // First get the appointment to get the user_id
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('user_id, pet_id')
      .eq('id', updateData.id)
      .single()

    if (appointmentError) {
      console.error('Error fetching appointment:', appointmentError)
      throw appointmentError
    }

    // Get user details from Supabase using the appointment's user_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', appointment.user_id)
      .single()

    if (userError) {
      console.error('Error fetching user data:', userError)
      throw userError
    }

    // Get pet details from Supabase
    const { data: petData, error: petError } = await supabase
      .from('pets')
      .select('*')
      .eq('id', appointment.pet_id)
      .single()

    if (petError) {
      console.error('Error fetching pet data:', petError)
      throw petError
    }

    // Get service details from Clover
    const servicesResponse = await cloverClient.get('/items', {
      params: {
        filter: 'hidden=false',
        expand: 'price',
        orderBy: 'name ASC',
        limit: 1000
      }
    })

    const serviceItems = servicesResponse.data.elements
    const services = updateData.service_items.map((serviceName: string) => {
      const service = serviceItems.find((item: any) => item.name === serviceName)
      return service?.id || null
    }).filter(Boolean)

    const total = serviceItems
      .filter((item: any) => updateData.service_items.includes(item.name))
      .reduce((sum: number, item: any) => sum + (item.price || 0), 0) / 100

    // Format the user's full name
    const fullName = [userData.first_name, userData.last_name]
      .filter(Boolean)
      .join(' ') || 'Unnamed Customer'

    // Add user details and service info to the update data
    const updatedDataWithUser = {
      ...updateData,
      user_name: fullName,
      user_email: userData.email,
      user_phone: userData.phone || 'No phone',
      pet_name: petData.name,
      services,
      total,
      service_items: Array.isArray(updateData.service_items) 
        ? updateData.service_items 
        : typeof updateData.service_items === 'string'
          ? JSON.parse(updateData.service_items)
          : []
    }

    // Handle Clover order updates first
    if (updateData.c_order_id) {
      try {
        const cloverResult = await handleCloverOperations(updateData.c_order_id, updatedDataWithUser)
        newOrderId = cloverResult.orderId
      } catch (error: any) {
        // Log the error but continue with Supabase update
        console.error('Failed to update Clover order:', error?.response?.data || error)
        console.log('Continuing with Supabase update despite Clover error')
        // Keep the existing order ID
        newOrderId = updateData.c_order_id
      }
    }

    // Ensure time is in 24-hour format
    const timeString = updateData.appointment_time
    console.log('Processing time:', timeString)

    // Update Supabase using the service role client
    const supabaseUpdate = {
      appointment_date: updateData.appointment_date,
      appointment_time: timeString,
      service_items: Array.isArray(updateData.service_items) 
        ? updateData.service_items 
        : typeof updateData.service_items === 'string'
          ? JSON.parse(updateData.service_items)
          : [],
      status: updateData.status.toLowerCase(),
      employee_id: updateData.employee_id,
      employee_name: updateData.employee_name,
      appointment_duration: updateData.duration,
      c_order_id: newOrderId,
      updated_at: new Date().toISOString()
    }

    console.log('Updating Supabase with data:', supabaseUpdate)

    const { data, error } = await supabase
      .from('appointments')
      .update(supabaseUpdate)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating appointment in Supabase:', error)
      throw error
    }

    console.log('Successfully updated appointment:', data)
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error in PATCH /api/appointments/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseAuth = await getAuthenticatedClient()
    const { data: { session }, error: authError } = await supabaseAuth.auth.getSession()
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the appointment first to check if there's a Clover order
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError) {
      console.error('Error fetching appointment:', fetchError)
      throw fetchError
    }

    // If there's a Clover order, try to delete it first
    if (appointment?.c_order_id) {
      try {
        await cloverClient.delete(`/orders/${appointment.c_order_id}`)
        console.log('Successfully deleted Clover order:', appointment.c_order_id)
      } catch (error: any) {
        // Log the error but continue with Supabase deletion
        console.error('Error deleting Clover order:', error?.response?.data || error)
      }
    }

    // Delete the appointment from Supabase using the service role client
    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error deleting from Supabase:', deleteError)
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/appointments/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 