import { NextResponse } from 'next/server'

const CLOVER_API_BASE_URL = 'https://api.clover.com/v3'

export async function GET() {
  try {
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
    employeesUrl.searchParams.append('filter', 'inactive=false')
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
      throw new Error(`Failed to fetch employees: ${errorText}`)
    }

    const data = await response.json()
    console.log('Found employees:', {
      total: data.elements?.length || 0,
      sample: data.elements?.[0]
    })

    // Filter for active employees and format response
    const formattedEmployees = (data.elements || [])
      .filter((employee: any) => !employee.inactive)
      .map((employee: any) => ({
        id: employee.id,
        name: employee.name,
        nickname: employee.nickname,
        role: employee.role,
        customId: employee.customId
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