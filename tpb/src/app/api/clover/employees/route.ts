import { NextResponse } from 'next/server'

const CLOVER_API_BASE_URL = 'https://api.clover.com/v3'

export async function GET() {
  try {
    const apiToken = process.env.CLOVER_API_TOKEN
    const merchantId = process.env.CLOVER_MERCHANT_ID

    if (!apiToken || !merchantId) {
      console.error('Missing Clover credentials:', { apiToken: !!apiToken, merchantId: !!merchantId })
      return NextResponse.json({
        success: false,
        error: 'Clover API configuration error'
      }, { status: 500 })
    }

    // Fetch all employees with roles and payments permissions
    const url = `${CLOVER_API_BASE_URL}/merchants/${merchantId}/employees?expand=roles,payments`
    console.log('Fetching employees from:', url.replace(apiToken, '[REDACTED]'))
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store' // Disable caching to always get fresh data
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Clover API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: url.replace(apiToken, '[REDACTED]')
      })
      return NextResponse.json({
        success: false,
        error: `Failed to fetch employees: ${response.statusText}`
      }, { status: response.status })
    }

    const data = await response.json()
    console.log('Raw employees data:', {
      count: data.elements?.length || 0,
      sample: JSON.stringify(data.elements?.[0], null, 2)
    })

    // Transform and filter employee data
    const employees = (data.elements || [])
      .filter((employee: any) => employee.name && employee.id) // Filter out invalid employees
      .map((employee: any) => ({
        id: employee.id,
        name: employee.name,
        email: employee.email || null,
        role: employee.roles?.elements?.[0]?.name || 'Staff',
        nickname: employee.nickname || null,
        customId: employee.customId || null,
        isOwner: employee.roles?.elements?.some((role: any) => 
          role.name?.toLowerCase() === 'owner' || 
          role.name?.toLowerCase() === 'admin'
        ) || false,
        pin: employee.pin || null,
        roles: employee.roles?.elements?.map((role: any) => role.name) || []
      }))

    console.log('Transformed employees data:', {
      count: employees.length,
      sample: JSON.stringify(employees[0], null, 2)
    })

    return NextResponse.json({
      success: true,
      data: employees
    })
  } catch (error: any) {
    console.error('Error fetching Clover employees:', {
      message: error.message,
      stack: error.stack
    })
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch employees'
    }, { status: 500 })
  }
} 