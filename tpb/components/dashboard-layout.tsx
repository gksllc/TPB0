'use client'

import { DashboardNav } from "@/components/dashboard-nav"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen">
      <DashboardNav />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-8">
        {children}
      </main>
    </div>
  )
} 