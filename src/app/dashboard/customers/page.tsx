'use client'

import dynamicImport from 'next/dynamic'
import { Suspense } from 'react'

// Route configuration
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Dynamically import CustomersPage with no SSR
const CustomersPage = dynamicImport(
  () => import('@/components/customers-page').then(mod => ({ default: mod.CustomersPage })),
  { ssr: false }
)

export default function Customers() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CustomersPage />
    </Suspense>
  )
} 