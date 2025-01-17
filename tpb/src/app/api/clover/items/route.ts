import { NextResponse } from 'next/server'

// Use the correct API base URL for Clover API v3
const CLOVER_API_BASE_URL = 'https://api.clover.com/v3'

// Service category keywords to look for (case-insensitive)
const SERVICE_KEYWORDS = ['service', 'groom', 'pet', 'wash', 'trim', 'cut']

export async function GET() {
  try {
    const apiToken = process.env.CLOVER_API_TOKEN
    const merchantId = process.env.CLOVER_MERCHANT_ID

    if (!apiToken || !merchantId) {
      console.error('Missing Clover credentials')
      return NextResponse.json({
        success: false,
        error: 'Clover API configuration error'
      }, { status: 500 })
    }

    // First, try to fetch all items directly
    const itemsUrl = new URL(`${CLOVER_API_BASE_URL}/merchants/${merchantId}/items`)
    itemsUrl.searchParams.append('expand', 'categories,price')
    itemsUrl.searchParams.append('limit', '1000')
    
    console.log('Fetching all items with URL:', itemsUrl.toString().replace(apiToken, 'REDACTED'))

    const itemsResponse = await fetch(itemsUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      }
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

    const itemsData = await itemsResponse.json()
    console.log('Found items:', {
      total: itemsData.elements?.length || 0
    })

    // Filter items that are likely services based on their name or category
    const serviceItems = itemsData.elements
      .filter((item: any) => {
        // Check if item name contains service keywords
        const itemName = item.name?.toLowerCase() || ''
        const hasServiceKeyword = SERVICE_KEYWORDS.some(keyword => 
          itemName.includes(keyword.toLowerCase())
        )

        // Check if any of the item's categories contain service keywords
        const categories = item.categories?.elements || []
        const hasServiceCategory = categories.some((category: any) => {
          const categoryName = category.name?.toLowerCase() || ''
          return SERVICE_KEYWORDS.some(keyword => 
            categoryName.includes(keyword.toLowerCase())
          )
        })

        return hasServiceKeyword || hasServiceCategory
      })
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        price: item.price || 0,
        description: item.description || '',
        categories: (item.categories?.elements || []).map((cat: any) => cat.name)
      }))

    console.log('Filtered service items:', {
      count: serviceItems.length,
      items: serviceItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        categories: item.categories
      }))
    })

    if (serviceItems.length === 0) {
      console.warn('No service items found')
    }

    return NextResponse.json({
      success: true,
      data: serviceItems
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