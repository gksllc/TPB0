import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export async function GET() {
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

    // Fetch employees from Clover
    const response = await fetch(`${process.env.CLOVER_API_BASE}/employees`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLOVER_API_TOKEN}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch employees from Clover')
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      data: data.elements || [],
    })
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch employees'
      },
      { status: 500 }
    )
  }
} 