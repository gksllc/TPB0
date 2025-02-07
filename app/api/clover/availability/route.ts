import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export async function GET(request: Request) {
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

    // Get user role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (userError) {
      console.error('Error fetching user role:', userError)
      return NextResponse.json(
        { error: 'Failed to verify user role' },
        { status: 500 }
      )
    }

    // Only allow admin and client roles
    if (!['admin', 'client'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const employeeId = searchParams.get('employeeId')

    if (!date || !employeeId) {
      return NextResponse.json(
        { error: 'Missing required parameters: date and employeeId' },
        { status: 400 }
      )
    }

    // Fetch availability from Clover
    const response = await fetch(
      `${process.env.CLOVER_API_BASE}/employees/${employeeId}/availability?date=${date}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.CLOVER_API_TOKEN}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch availability from Clover')
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      data: data.elements || [],
    })
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch availability'
      },
      { status: 500 }
    )
  }
} 