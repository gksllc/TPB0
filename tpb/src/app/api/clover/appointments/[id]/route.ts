import { NextResponse } from 'next/server'

const CLOVER_API_BASE_URL = process.env.CLOVER_API_URL || 'https://api.clover.com/v3'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const apiToken = process.env.CLOVER_API_TOKEN?.trim()
    const merchantId = process.env.CLOVER_MERCHANT_ID?.trim()

    if (!apiToken || !merchantId) {
      throw new Error('Missing required credentials')
    }

    const orderId = params.id
    const orderUrl = `${CLOVER_API_BASE_URL}/merchants/${merchantId}/orders/${orderId}`

    const response = await fetch(orderUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to delete Clover order:', {
        status: response.status,
        body: errorText,
        orderId
      })
      throw new Error(`Failed to delete Clover order: ${errorText}`)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete order'
    }, { status: error.status || 500 })
  }
} 