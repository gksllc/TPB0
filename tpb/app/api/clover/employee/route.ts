import { NextResponse } from 'next/server'

const CLOVER_API_BASE_URL = 'https://api.clover.com/v3'

export async function POST(request: Request) {
  try {
    const staffData = await request.json()
    console.log('Received staff data:', staffData)
    
    const apiToken = process.env.CLOVER_API_TOKEN
    const merchantId = process.env.CLOVER_MERCHANT_ID

    if (!apiToken || !merchantId) {
      throw new Error('Missing Clover credentials')
    }

    // Create the employee object for Clover API
    const cloverEmployee = {
      name: staffData.name,
      nickname: staffData.nickname || staffData.name.split(' ')[0],
      email: staffData.email,
      pin: Math.floor(100000 + Math.random() * 900000).toString(),
      customId: staffData.role.toUpperCase()
    }

    // Create employee
    const employeeUrl = `${CLOVER_API_BASE_URL}/merchants/${merchantId}/employees`
    console.log('Creating employee:', employeeUrl.replace(apiToken, '[REDACTED]'))

    const employeeResponse = await fetch(employeeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify(cloverEmployee)
    })

    if (!employeeResponse.ok) {
      const errorText = await employeeResponse.text()
      console.error('Failed to create employee:', {
        status: employeeResponse.status,
        statusText: employeeResponse.statusText,
        error: errorText
      })
      throw new Error(`Failed to create employee: ${employeeResponse.statusText}`)
    }

    const employeeData = await employeeResponse.json()
    console.log('Created employee:', employeeData)

    // Assign role to employee
    const roleId = await getRoleId(staffData.role, apiToken, merchantId)
    if (roleId) {
      const roleUrl = `${CLOVER_API_BASE_URL}/merchants/${merchantId}/employees/${employeeData.id}/roles/${roleId}`
      console.log('Assigning role:', roleUrl.replace(apiToken, '[REDACTED]'))

      const roleResponse = await fetch(roleUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        }
      })

      if (!roleResponse.ok) {
        console.error('Failed to assign role:', {
          status: roleResponse.status,
          statusText: roleResponse.statusText
        })
        // Don't throw error here, as employee was created successfully
      } else {
        console.log('Role assigned successfully')
      }
    }

    return NextResponse.json({
      success: true,
      data: employeeData
    })

  } catch (error: any) {
    console.error('Clover API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create employee'
    }, { status: 500 })
  }
}

async function getRoleId(role: string, apiToken: string, merchantId: string): Promise<string | null> {
  try {
    const url = `${CLOVER_API_BASE_URL}/merchants/${merchantId}/roles`
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      }
    })

    if (!response.ok) {
      console.error('Failed to fetch roles:', {
        status: response.status,
        statusText: response.statusText
      })
      return null
    }

    const data = await response.json()
    console.log('Available roles:', data)

    const roleMapping: { [key: string]: string } = {
      'groomer': 'EMPLOYEE',
      'scheduler': 'EMPLOYEE',
      'admin': 'ADMIN',
      'staff': 'EMPLOYEE'
    }

    const targetRole = roleMapping[role.toLowerCase()] || 'EMPLOYEE'
    const matchingRole = data.elements?.find((r: any) => 
      r.name.toUpperCase() === targetRole.toUpperCase()
    )

    return matchingRole?.id || null
  } catch (error) {
    console.error('Error fetching roles:', error)
    return null
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('id')

    if (!employeeId) {
      return NextResponse.json({
        success: false,
        error: 'Employee ID is required'
      }, { status: 400 })
    }

    const apiToken = process.env.CLOVER_API_TOKEN
    const merchantId = process.env.CLOVER_MERCHANT_ID

    if (!apiToken || !merchantId) {
      throw new Error('Missing Clover credentials')
    }

    // Delete from Clover
    const url = `${CLOVER_API_BASE_URL}/merchants/${merchantId}/employees/${employeeId}`
    console.log('Deleting employee from Clover:', url.replace(apiToken, '[REDACTED]'))

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Clover API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      throw new Error(`Failed to delete employee from Clover: ${response.statusText}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Employee deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting employee:', {
      message: error.message,
      stack: error.stack
    })
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete employee'
    }, { status: 500 })
  }
} 