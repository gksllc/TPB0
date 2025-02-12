'use server'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { type Database } from '@/lib/database.types'
import { 
  type AppointmentResponse, 
  type AppointmentCreate, 
  type AppointmentUpdate,
  type AppointmentWithRelations
} from '@/lib/types/appointments'
import { revalidatePath } from 'next/cache'
import { getServerSupabase } from '@/lib/supabase/server-actions'
import { createClient } from '@supabase/supabase-js'

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

export async function GET(request: Request) {
  try {
    const supabase = await getServerSupabase()

    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        details: 'Missing or invalid authorization header'
      }, { status: 401 })
    }

    // Extract the token
    const token = authHeader.split(' ')[1]

    // Verify the token and get session
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        details: authError.message
      }, { status: 401 })
    }

    if (!user) {
      console.error('No user found')
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        details: 'No user found'
      }, { status: 401 })
    }

    // Create a service role client to bypass RLS
    const serviceRoleClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    )

    // Try to get user role
    const { data: userData, error: userError } = await serviceRoleClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    // If user doesn't exist, create them with client role
    if (userError?.code === 'PGRST116') {
      const { data: newUser, error: createError } = await serviceRoleClient
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          role: 'client',
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating user:', createError)
        return NextResponse.json({
          success: false,
          error: 'Failed to create user record',
          details: createError.message
        }, { status: 500 })
      }

      // New users should not have admin access
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        details: 'Admin access required'
      }, { status: 403 })
    } else if (userError) {
      console.error('User role check error:', userError)
      return NextResponse.json({
        success: false,
        error: 'Failed to verify user role',
        details: userError.message
      }, { status: 403 })
    }

    if (!userData?.role) {
      console.error('No role found for user')
      return NextResponse.json({
        success: false,
        error: 'Failed to verify user role',
        details: 'No role assigned'
      }, { status: 403 })
    }

    if (userData.role !== 'admin') {
      console.error('User is not an admin:', user.id)
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        details: 'Admin access required'
      }, { status: 403 })
    }

    // Use service role client for fetching appointments to bypass RLS
    const { data: appointmentsData, error: appointmentsError } = await serviceRoleClient
      .from('appointments')
      .select(`
        id,
        user_id,
        pet_id,
        service_type,
        service_items,
        status,
        appointment_date,
        appointment_time,
        employee_id,
        employee_name,
        appointment_duration,
        c_order_id,
        created_at,
        updated_at,
        pet:pets!appointments_pet_id_fkey (
          id,
          name,
          image_url,
          size
        )
      `)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })

    if (appointmentsError || !appointmentsData) {
      console.error('Database query error:', appointmentsError)
      throw appointmentsError
    }

    // Then get user details for each appointment using service role client
    const userIds = Array.from(new Set(appointmentsData.map(a => a.user_id)))
    const { data: usersData, error: usersError } = await serviceRoleClient
      .from('users')
      .select('id, first_name, last_name, email, phone')
      .in('id', userIds)

    if (usersError || !usersData) {
      console.error('Users query error:', usersError)
      throw usersError
    }

    // Create a map of user data
    const userMap = new Map(usersData.map(user => [user.id, user]))

    // Transform the data
    const transformedData = appointmentsData.map(appointment => {
      const user = userMap.get(appointment.user_id)
      const petData = Array.isArray(appointment.pet) ? appointment.pet[0] : appointment.pet
      const transformed: AppointmentWithRelations = {
        id: appointment.id,
        user_id: appointment.user_id,
        pet_id: appointment.pet_id,
        service_type: appointment.service_type,
        service_items: appointment.service_items,
        status: appointment.status,
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        employee_id: appointment.employee_id,
        employee_name: appointment.employee_name,
        appointment_duration: appointment.appointment_duration,
        c_order_id: appointment.c_order_id,
        created_at: appointment.created_at,
        updated_at: appointment.updated_at,
        pet: {
          id: petData.id,
          name: petData.name,
          image_url: petData.image_url,
          size: petData.size
        },
        customer: user ? {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          phone: user.phone
        } : null
      }
      return transformed
    })

    return NextResponse.json({
      success: true,
      data: transformedData
    })

  } catch (error) {
    console.error('Error in appointments API:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch appointments'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getServerSupabase()

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
        pet_id: body.pet_id,
        service_type: body.service_type,
        service_items: body.service_items,
        status: body.status,
        appointment_date: body.appointment_date,
        appointment_time: body.appointment_time,
        employee_id: body.employee_id,
        employee_name: body.employee_name,
        appointment_duration: body.appointment_duration,
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
    const supabase = await getServerSupabase()
    
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
      .update({
        service_type: updateData.service_type,
        service_items: updateData.service_items,
        status: updateData.status,
        appointment_date: updateData.appointment_date,
        appointment_time: updateData.appointment_time,
        employee_id: updateData.employee_id,
        employee_name: updateData.employee_name,
        appointment_duration: updateData.appointment_duration,
      })
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