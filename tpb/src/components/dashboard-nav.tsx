'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="w-64 min-h-screen bg-white border-r border-gray-200 px-4 py-6">
      <div className="space-y-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold">Menu</h2>
          <div className="space-y-1">
            <Link href="/dashboard/admin-appointments">
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start',
                  pathname === '/dashboard/admin-appointments' && 'bg-slate-100'
                )}
              >
                Appointments
              </Button>
            </Link>
            <Link href="/dashboard/customers">
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start',
                  pathname === '/dashboard/customers' && 'bg-slate-100'
                )}
              >
                Customers
              </Button>
            </Link>
            <Link href="/dashboard/staff">
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start',
                  pathname === '/dashboard/staff' && 'bg-slate-100'
                )}
              >
                Staff
              </Button>
            </Link>
            <Link href="/dashboard/settings">
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start',
                  pathname === '/dashboard/settings' && 'bg-slate-100'
                )}
              >
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
} 