'use client'

import dynamicImport from 'next/dynamic'
import { Suspense } from 'react'

// Route configuration
export const dynamicParams = true
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Dynamically import DashboardNav with no SSR
const DashboardNav = dynamicImport(
  () => import('@/components/dashboard-nav').then(mod => ({ default: mod.DashboardNav })),
  { ssr: false }
)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Suspense fallback={<div className="w-64 bg-slate-800" />}>
        <DashboardNav />
      </Suspense>
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container mx-auto py-6 px-4 md:px-6">
          {children}
        </div>
      </main>
    </div>
  )
} 