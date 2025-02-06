'use client'

import dynamicImport from 'next/dynamic'
import { Suspense } from 'react'

// Route configuration
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Dynamically import StaffPage with no SSR
const StaffPage = dynamicImport(
  () => import('@/components/staff-page').then(mod => ({ default: mod.StaffPage })),
  { ssr: false }
)

export default function Staff() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StaffPage />
    </Suspense>
  )
} 