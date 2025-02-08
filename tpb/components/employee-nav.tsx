'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogoutButton } from '@/components/logout-button'
import { cn } from '@/lib/utils'

export function EmployeeNav() {
  const pathname = usePathname()

  return (
    <nav className="w-64 min-h-screen bg-white border-r border-gray-200 px-4 py-6">
      <div className="space-y-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold">Menu</h2>
          <div className="space-y-1">
            <Link href="/employee/dashboard">
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start',
                  pathname === '/employee/dashboard' && 'bg-slate-100'
                )}
              >
                Schedule
              </Button>
            </Link>
            <Link href="/employee/profile">
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start',
                  pathname === '/employee/profile' && 'bg-slate-100'
                )}
              >
                Profile
              </Button>
            </Link>
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="space-y-1">
            <LogoutButton />
          </div>
        </div>
      </div>
    </nav>
  )
} 