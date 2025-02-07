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
    console.log('Starting Clover order deletion process for order:', orderId)

    // First, update the order state to deleted
    const updateUrl = `${CLOVER_API_BASE_URL}/merchants/${merchantId}/orders/${orderId}`
    console.log('Updating order state:', updateUrl.replace(apiToken, '[REDACTED]'))

    const updateResponse = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        state: 'deleted'
      })
    })

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error('Failed to update order state:', {
        status: updateResponse.status,
        body: errorText,
        orderId
      })
      throw new Error(`Failed to update order state: ${errorText}`)
    }

    // Then delete the order
    const deleteResponse = await fetch(updateUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    })

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text()
      console.error('Failed to delete Clover order:', {
        status: deleteResponse.status,
        body: errorText,
        orderId
      })
      throw new Error(`Failed to delete Clover order: ${errorText}`)
    }

    console.log('Successfully deleted Clover order:', orderId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete order'
    }, { status: error.status || 500 })
  }
} 