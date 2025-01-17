'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart, Users, Calendar, DollarSign } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "sonner"
import type { Database } from "@/lib/database.types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, subMonths, startOfMonth, endOfMonth, add } from 'date-fns'

interface Order {
  id: string
  total: number
  state: string
  payments?: Array<{
    id: string
    amount: number
    result: string
    tender?: {
      label: string
    }
  }>
}

export function DashboardPage() {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  const [totalCustomers, setTotalCustomers] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [totalRevenue, setTotalRevenue] = useState<number>(0)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()))
  const [todayAppointments, setTodayAppointments] = useState<number>(0)
  const [appointmentsLoading, setAppointmentsLoading] = useState(true)
  const [upcomingAppointments, setUpcomingAppointments] = useState<Array<{
    id: string
    appointment_date: string
    appointment_time: string
    pet_name: string
    service_items: string[]
  }>>([])
  const [upcomingLoading, setUpcomingLoading] = useState(true)

  const monthOptions = Array.from({ length: 3 }).map((_, index) => {
    const date = subMonths(new Date(), index)
    const firstDayOfMonth = startOfMonth(date)
    return {
      value: format(firstDayOfMonth, 'yyyy-MM'),
      label: format(firstDayOfMonth, 'MMMM'),
      start: startOfMonth(firstDayOfMonth).getTime(),
      end: endOfMonth(firstDayOfMonth).getTime(),
      date: firstDayOfMonth
    }
  })

  const fetchTotalCustomers = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'client')

      if (error) throw error
      setTotalCustomers(count || 0)
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Failed to fetch customer data')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const fetchRevenue = useCallback(async () => {
    setOrdersLoading(true)
    try {
      const selectedMonthStart = startOfMonth(selectedMonth).getTime()
      const selectedMonthEnd = endOfMonth(selectedMonth).getTime()

      const response = await fetch(`/api/orders?start=${selectedMonthStart}&end=${selectedMonthEnd}`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch orders')
      }

      setTotalRevenue(data.totalRevenue || 0)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to fetch revenue data')
    } finally {
      setOrdersLoading(false)
    }
  }, [selectedMonth])

  const fetchTodayAppointments = useCallback(async () => {
    setAppointmentsLoading(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('appointment_date', today)

      if (error) throw error
      setTodayAppointments(count || 0)
    } catch (error) {
      console.error('Error fetching appointments:', error)
      toast.error('Failed to fetch appointments data')
    } finally {
      setAppointmentsLoading(false)
    }
  }, [supabase])

  const fetchUpcomingAppointments = useCallback(async () => {
    setUpcomingLoading(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const nextWeek = format(add(new Date(), { days: 7 }), 'yyyy-MM-dd')

      console.log('Fetching appointments with dates:', { today, nextWeek })

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          pet_name,
          service_items,
          status
        `)
        .gte('appointment_date', today)
        .lte('appointment_date', nextWeek)
        .neq('status', 'Cancelled')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Raw appointments data:', data)

      // Transform the data to ensure proper structure
      const transformedAppointments = (data || []).map(appointment => ({
        ...appointment,
        service_items: (() => {
          try {
            if (!appointment.service_items) return []
            if (Array.isArray(appointment.service_items)) return appointment.service_items
            return JSON.parse(appointment.service_items)
          } catch (e) {
            console.error('Error parsing service_items:', e)
            return []
          }
        })()
      }))

      console.log('Transformed appointments:', transformedAppointments)
      setUpcomingAppointments(transformedAppointments)
    } catch (error) {
      console.error('Error fetching upcoming appointments:', error)
      toast.error('Failed to fetch upcoming appointments')
    } finally {
      setUpcomingLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchTotalCustomers()
  }, [fetchTotalCustomers])

  useEffect(() => {
    fetchRevenue()
  }, [fetchRevenue, selectedMonth])

  useEffect(() => {
    fetchTodayAppointments()
  }, [fetchTodayAppointments])

  useEffect(() => {
    fetchUpcomingAppointments()
  }, [fetchUpcomingAppointments])

  const handleViewCustomers = () => {
    router.push('/dashboard/customers')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ordersLoading ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : (
                `$${totalRevenue.toFixed(2)}`
              )}
            </div>
            <div className="mt-3">
              <Select
                value={format(selectedMonth, 'yyyy-MM')}
                onValueChange={(value) => {
                  const option = monthOptions.find(opt => opt.value === value)
                  if (option) {
                    setSelectedMonth(option.date)
                  }
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : (
                totalCustomers
              )}
            </div>
            <Button
              variant="link"
              className="px-0 text-xs text-muted-foreground"
              onClick={handleViewCustomers}
            >
              View all customers
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointmentsLoading ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : (
                todayAppointments
              )}
            </div>
            <Button
              variant="link"
              className="px-0 text-xs text-muted-foreground"
              onClick={() => router.push('/dashboard/appointments')}
            >
              View Appointments
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent orders</p>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingLoading ? (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-sm text-muted-foreground">Loading appointments...</p>
              </div>
            ) : upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => {
                  console.log('Rendering appointment:', appointment)
                  const appointmentDate = new Date(appointment.appointment_date)
                  const formattedDate = format(appointmentDate, 'MMM d, yyyy')

                  return (
                    <div key={appointment.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{appointment.pet_name}</p>
                          <span className="text-sm text-muted-foreground">•</span>
                          <p className="text-sm text-muted-foreground">
                            {formattedDate} at {appointment.appointment_time}
                          </p>
                        </div>
                        {appointment.service_items?.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Services: {appointment.service_items.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-sm text-muted-foreground">No upcoming appointments</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}