'use client'

import dynamicImport from 'next/dynamic'
import { Suspense } from 'react'

// Disable static generation for this route
export const dynamicParams = true
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Dynamically import the AdminAppointmentsPage with no SSR
const AdminAppointmentsPage = dynamicImport(
  () => import('@/components/admin-appointments-page').then(mod => ({ default: mod.AdminAppointmentsPage })),
  { ssr: false }
)

export default function AdminAppointments() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminAppointmentsPage />
    </Suspense>
  )
} 