import axios, { AxiosInstance } from 'axios'

const CLOVER_API_BASE = process.env.NEXT_PUBLIC_CLOVER_API_BASE
const CLOVER_API_TOKEN = process.env.NEXT_PUBLIC_CLOVER_API_TOKEN
const MERCHANT_ID = process.env.NEXT_PUBLIC_CLOVER_MERCHANT_ID

if (typeof window === 'undefined') {
  if (!CLOVER_API_BASE || !CLOVER_API_TOKEN || !MERCHANT_ID) {
    console.error('Missing required Clover environment variables')
  }
}

export const cloverClient: AxiosInstance = axios.create({
  baseURL: `${CLOVER_API_BASE}/v3/merchants/${MERCHANT_ID}`,
  headers: {
    'Authorization': `Bearer ${CLOVER_API_TOKEN}`,
    'Content-Type': 'application/json'
  }
}) 