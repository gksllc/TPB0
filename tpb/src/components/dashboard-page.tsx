'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { HomeIcon, UsersIcon, ClipboardIcon, SettingsIcon, LogOutIcon, CalendarIcon, DollarSignIcon, PawPrintIcon, ActivityIcon } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export function DashboardPage() {
  const pathname = usePathname()
  const router = useRouter()
  const [clientCount, setClientCount] = useState<number>(0)

  useEffect(() => {
    const fetchClientCount = async () => {
      try {
        const { count, error } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })

        if (error) {
          throw error
        }

        setClientCount(count || 0)
      } catch (error) {
        console.error('Error fetching client count:', error)
        toast.error('Failed to fetch client count')
      }
    }

    fetchClientCount()
  }, [])

  const navItems = [
    { icon: HomeIcon, label: "Overview", href: "/dashboard" },
    { icon: UsersIcon, label: "Customers", href: "/customers" },
    { icon: ClipboardIcon, label: "Appointments", href: "/appointments" },
    { icon: ClipboardIcon, label: "Reports", href: "/reports" },
    { icon: SettingsIcon, label: "Settings", href: "/settings" },
  ]

  const stats = [
    { title: "Total Appointments", value: "0", icon: CalendarIcon },
    { title: "Total Customers", value: clientCount.toString(), icon: UsersIcon },
    { title: "Revenue (This Month)", value: "$0", icon: DollarSignIcon },
    { title: "Pets Served", value: "0", icon: PawPrintIcon },
  ]

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        toast.error("Error signing out")
        return
      }
      router.push("/auth")
    } catch (error) {
      console.error("Sign out error:", error)
      toast.error("Failed to sign out")
    }
  }

  return (
    <div className="flex h-screen w-full bg-slate-50">
      <aside className="w-64 bg-slate-800 text-white p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-8 w-8 bg-primary rounded-full" />
          <h1 className="text-xl font-bold">The Pet Bodega</h1>
        </div>

        <nav className="space-y-4">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-2 text-white/80 hover:text-white hover:bg-slate-700 p-2 rounded-lg transition-colors ${
                pathname === item.href ? 'bg-slate-700 text-white' : ''
              }`}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <Button 
          variant="ghost" 
          className="text-white/80 hover:text-white mt-auto absolute bottom-6"
          onClick={handleSignOut}
        >
          <LogOutIcon className="h-5 w-5 mr-2" aria-hidden="true" />
          <span>Log out</span>
        </Button>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-8">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No recent activity
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No upcoming appointments
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button>
                <CalendarIcon className="mr-2 h-4 w-4" />
                New Appointment
              </Button>
              <Button>
                <UsersIcon className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
              <Button>
                <ActivityIcon className="mr-2 h-4 w-4" />
                View Reports
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}