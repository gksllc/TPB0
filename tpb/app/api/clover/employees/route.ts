import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const CLOVER_API_BASE_URL = 'https://api.clover.com/v3'

export async function GET() {
  try {
    // Initialize Supabase client with service role key
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

    const apiToken = process.env.CLOVER_API_TOKEN
    const merchantId = process.env.CLOVER_MERCHANT_ID

    if (!apiToken || !merchantId) {
      console.error('Missing Clover credentials:', { 
        hasToken: !!apiToken, 
        hasMerchantId: !!merchantId 
      })
      return NextResponse.json({
        success: false,
        error: 'Clover API configuration error'
      }, { status: 500 })
    }

    // Fetch employees from Clover
    const employeesUrl = new URL(`${CLOVER_API_BASE_URL}/merchants/${merchantId}/employees`)
    employeesUrl.searchParams.append('expand', 'roles')
    employeesUrl.searchParams.append('orderBy', 'name ASC')
    
    console.log('Fetching employees with URL:', employeesUrl.toString().replace(apiToken, 'REDACTED'))

    const response = await fetch(employeesUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Clover API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      return NextResponse.json({
        success: false,
        error: `Failed to fetch employees: ${errorText}`
      }, { status: response.status })
    }

    const data = await response.json()
    console.log('Found employees:', {
      total: data.elements?.length || 0,
      sample: data.elements?.[0]
    })

    if (!data.elements) {
      return NextResponse.json({
        success: false,
        error: 'Invalid response format from Clover API'
      }, { status: 500 })
    }

    // Filter and format employees
    const formattedEmployees = data.elements
      .filter((employee: any) => !employee.deleted && !employee.deletedTime)
      .map((employee: any) => ({
        id: employee.id,
        name: employee.name,
        nickname: employee.nickname || '',
        role: employee.role || '',
        customId: employee.customId || ''
      }))

    return NextResponse.json({
      success: true,
      data: formattedEmployees
    })
  } catch (error: any) {
    console.error('Error fetching employees:', {
      message: error.message,
      stack: error.stack
    })
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch employees'
    }, { status: 500 })
  }
} 