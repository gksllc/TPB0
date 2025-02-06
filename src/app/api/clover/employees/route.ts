import { NextResponse } from 'next/server'

const CLOVER_API_BASE_URL = process.env.NEXT_PUBLIC_CLOVER_API_BASE || 'https://api.clover.com'

export const dynamic = 'force-dynamic'

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
    console.log('Fetching employees from:', url)
    
    const response = await fetch(url, {
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
        error: errorText
      })
      return NextResponse.json({
        success: false,
        error: `Failed to fetch employees: ${response.statusText}`
      }, { status: response.status })
    }

    const data = await response.json()

    // Transform and filter employee data
    const employees = (data.elements || [])
      .filter((employee: any) => employee.name && employee.id)
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

    return NextResponse.json({
      success: true,
      data: employees
    })
  } catch (error: any) {
    console.error('Error fetching Clover employees:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch employees'
    }, { status: 500 })
  }
} 