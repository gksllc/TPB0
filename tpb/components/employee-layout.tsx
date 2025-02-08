'use client'

import { EmployeeNav } from '@/components/employee-nav'

interface EmployeeLayoutProps {
  children: React.ReactNode
}

export function EmployeeLayout({ children }: EmployeeLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <EmployeeNav />
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
} 