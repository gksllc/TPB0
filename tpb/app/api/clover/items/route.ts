import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

interface Item {
  id: string
  name: string
  price?: number | null
  description?: string
  categories?: {
    elements: Array<{
      name: string
    }>
  }
  hidden?: boolean
  tax?: any
}

interface FormattedItem {
  id: string
  name: string
  price: number
  description: string
  categories: string[]
  hidden: boolean
  available: boolean
  taxRates: any[]
}

interface CloverResponse {
  elements: Item[]
}

// Use the correct API base URL for Clover API v3
const CLOVER_API_BASE_URL = 'https://api.clover.com/v3'

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