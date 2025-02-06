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

    // Fetch all items with their categories, prices, and tax rates
    const url = `${CLOVER_API_BASE_URL}/v3/merchants/${merchantId}/items?expand=categories,price,tax&limit=1000&filter=hidden=false&orderBy=name ASC`
    console.log('Fetching all items with URL:', url)

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
        error: `Failed to fetch items: ${response.statusText}`
      }, { status: response.status })
    }

    const data = await response.json()

    // Transform and filter item data
    const items = (data.elements || [])
      .filter((item: any) => item.name && item.id)
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        price: item.price || 0,
        categories: item.categories?.elements?.map((cat: any) => ({
          id: cat.id,
          name: cat.name
        })) || [],
        tax: item.tax ? {
          id: item.tax.id,
          name: item.tax.name,
          rate: item.tax.rate
        } : null
      }))

    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: any) {
    console.error('Error fetching Clover items:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch items'
    }, { status: 500 })
  }
} 