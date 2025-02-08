'use client'

import { ClientNav } from '@/components/client-nav'

interface ClientLayoutProps {
  children: React.ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <ClientNav />
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
} 