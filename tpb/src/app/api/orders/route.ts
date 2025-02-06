import { NextResponse } from 'next/server'

const CLOVER_API_BASE_URL = process.env.CLOVER_API_BASE_URL || 'https://api.clover.com/v3'

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    
    const apiToken = process.env.CLOVER_API_TOKEN
    const merchantId = process.env.CLOVER_MERCHANT_ID

    if (!apiToken || !merchantId) {
      console.error('Missing Clover API configuration')
      return NextResponse.json({
        success: false,
        error: 'Clover API configuration error'
      }, { status: 500 })
    }

    if (!start || !end) {
      return NextResponse.json({
        success: false,
        error: 'Missing date range parameters'
      }, { status: 400 })
    }

    const startTime = parseInt(start)
    const endTime = parseInt(end)

    // First, get the total number of orders for pagination
    const countUrl = `${CLOVER_API_BASE_URL}/merchants/${merchantId}/orders?`
      + `filter=createdTime>=${startTime}&filter=createdTime<=${endTime}`
      + '&limit=1'

    const countResponse = await fetch(countUrl, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json'
      }
    })

    const countData = await countResponse.json()
    const totalOrders = countData.elements?.length || 0

    // Now fetch all orders with payments data
    const url = `${CLOVER_API_BASE_URL}/merchants/${merchantId}/orders?`
      + `filter=createdTime>=${startTime}&filter=createdTime<=${endTime}`
      + '&expand=payments,lineItems'
      + '&limit=1000'

    console.log('Fetching orders with URL:', url.replace(apiToken, 'REDACTED'))

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Clover API error:', {
        status: response.status,
        error,
        url: url.replace(apiToken, 'REDACTED')
      })
      return NextResponse.json({
        success: false,
        error: `Failed to fetch orders: ${error}`
      }, { status: response.status })
    }

    const data = await response.json()
    
    // Debug logging
    console.log('Orders received:', {
      total: data.elements?.length || 0,
      sample: data.elements?.[0]
    })

    // Calculate total revenue from completed orders with successful payments
    const totalRevenue = data.elements
      ?.filter((order: any) => {
        // Debug logging for order state
        console.log('Order state:', {
          id: order.id,
          state: order.state,
          total: order.total,
          paymentState: order.paymentState
        })
        
        return order.state === 'paid' || order.paymentState === 'PAID'
      })
      ?.reduce((sum: number, order: any) => {
        let orderTotal = 0

        // Try to get total from payments first
        if (order.payments?.elements?.length > 0) {
          orderTotal = order.payments.elements
            .filter((payment: any) => payment.result === 'SUCCESS')
            .reduce((paymentSum: number, payment: any) => paymentSum + (payment.amount || 0), 0)
        }

        // If no successful payments found, use order total
        if (!orderTotal && order.total) {
          orderTotal = order.total
        }

        // Debug logging for order total
        console.log('Order total calculation:', {
          id: order.id,
          orderTotal,
          paymentsTotal: order.payments?.elements
            ?.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0),
          rawTotal: order.total
        })

        return sum + (orderTotal / 100) // Convert cents to dollars
      }, 0) || 0

    console.log('Final total revenue:', totalRevenue)

    return NextResponse.json({
      success: true,
      totalRevenue,
      totalOrders,
      orders: data.elements
    })
  } catch (error: any) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch orders'
    }, { status: 500 })
  }
} 