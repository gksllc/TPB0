'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Calendar, FileText, Settings, LogOut } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/database.types"
import Image from 'next/image'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Staff', href: '/dashboard/staff', icon: Users },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Appointments', href: '/dashboard/admin-appointments', icon: Calendar },
]

export function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/auth')
    } catch (error) {
      toast.error('Error signing out')
    }
  }

  return (
    <div className="flex h-full w-64 flex-col bg-primary text-primary-foreground">
      <div className="flex h-16 shrink-0 items-center gap-x-3 border-b border-primary-foreground/10 px-6">
        <div className="rounded-full overflow-hidden bg-white w-8 h-8 flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="The Pet Bodega logo"
            width={24}
            height={24}
            className="object-contain"
          />
        </div>
        <span className="text-lg font-semibold">Pet Bodega</span>
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-4 px-4 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground',
                    isActive && 'bg-primary-foreground/10 text-primary-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="mt-auto border-t border-primary-foreground/10 px-4 py-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-x-3 text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </Button>
        </div>
      </nav>
    </div>
  )
} 