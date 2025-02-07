import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export async function GET() {
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

    // Fetch items from Clover
    const response = await fetch(`${process.env.CLOVER_API_BASE}/items`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLOVER_API_TOKEN}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch items from Clover')
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      data: data.elements || [],
    })
  } catch (error) {
    console.error('Error fetching items:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch items'
      },
      { status: 500 }
    )
  }
} 