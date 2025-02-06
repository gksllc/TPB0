import { NextResponse } from 'next/server'

interface CloverItem {
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

interface CloverResponse {
  elements: CloverItem[]
}

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

    // Fetch all items from the specific merchant
    const itemsUrl = new URL(`https://api.clover.com/v3/merchants/${merchantId}/items`)
    itemsUrl.searchParams.append('expand', 'categories,price,tax')
    itemsUrl.searchParams.append('limit', '1000')
    itemsUrl.searchParams.append('filter', 'hidden=false')
    itemsUrl.searchParams.append('orderBy', 'name ASC')
    
    console.log('Fetching all items with URL:', itemsUrl.toString().replace(apiToken, 'REDACTED'))

    const itemsResponse = await fetch(itemsUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store' // Disable caching to always get fresh data
    })

    if (!itemsResponse.ok) {
      const errorText = await itemsResponse.text()
      console.error('Clover API error response:', {
        status: itemsResponse.status,
        statusText: itemsResponse.statusText,
        body: errorText
      })
      throw new Error(`Failed to fetch items: ${errorText}`)
    }

    const itemsData: CloverResponse = await itemsResponse.json()
    console.log('Found items:', {
      total: itemsData.elements?.length || 0,
      sample: itemsData.elements?.[0]
    })

    if (!itemsData.elements || !Array.isArray(itemsData.elements)) {
      console.error('Invalid response format:', itemsData)
      throw new Error('Invalid response format from Clover API')
    }

    // Map all items to a consistent format
    const formattedItems = itemsData.elements
      .filter((item: CloverItem) => item.price !== undefined && item.price !== null)
      .map((item: CloverItem) => ({
        id: item.id,
        name: item.name,
        price: item.price!,
        description: item.description || '',
        categories: (item.categories?.elements || []).map((cat) => cat.name),
        hidden: item.hidden || false,
        available: !item.hidden,
        taxRates: item.tax ? [item.tax] : []
      }))
      .sort((a, b) => a.name.localeCompare(b.name)) // Sort by name

    console.log('Formatted items:', {
      count: formattedItems.length,
      sample: formattedItems[0]
    })

    if (formattedItems.length === 0) {
      console.warn('No items found')
    }

    return NextResponse.json({
      success: true,
      data: formattedItems
    })

  } catch (error: any) {
    console.error('Error fetching Clover items:', {
      message: error.message,
      stack: error.stack
    })
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch items'
    }, { status: 500 })
  }
} 