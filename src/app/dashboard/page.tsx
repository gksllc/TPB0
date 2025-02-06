'use client'

import dynamicImport from 'next/dynamic'
import { Suspense } from 'react'

// Route configuration
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Dynamically import DashboardPage with no SSR
const DashboardPage = dynamicImport(
  () => import('@/components/dashboard-page').then(mod => ({ default: mod.DashboardPage })),
  { ssr: false }
)

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardPage />
    </Suspense>
  )
} 