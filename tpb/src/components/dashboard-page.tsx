'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart, Users, Calendar, DollarSign, PawPrint } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "sonner"
import type { Database } from "@/lib/database.types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, subMonths, startOfMonth, endOfMonth, add, addDays } from 'date-fns'
import Image from 'next/image'
import { AppointmentDetailsDialog } from './appointment-details-dialog'

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
    status: string
    employee_name: string
    pet_image_url: string | null
    appointment_duration: number
  }>>([])
  const [upcomingLoading, setUpcomingLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

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
      const response = await fetch('/api/appointments')
      if (!response.ok) {
        throw new Error('Failed to fetch appointments')
      }
      const data = await response.json()
      
      // Filter for upcoming appointments and sort by date and time
      const upcoming = data.data
        .filter((apt: any) => apt.status.toLowerCase() !== 'cancelled')
        .sort((a: any, b: any) => {
          const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`)
          const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`)
          return dateA.getTime() - dateB.getTime()
        })
        .slice(0, 5) // Show only next 5 appointments

      setUpcomingAppointments(upcoming)
    } catch (error) {
      console.error('Error fetching upcoming appointments:', error)
      toast.error('Failed to fetch upcoming appointments')
    } finally {
      setUpcomingLoading(false)
    }
  }, [])

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
              onClick={() => router.push('/dashboard/admin-appointments')}
            >
              View Appointments
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingLoading ? (
              <div className="flex items-center justify-center h-[200px]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => {
                  const appointmentDate = addDays(new Date(appointment.appointment_date), 1)
                  const formattedDate = format(appointmentDate, 'MMM d, yyyy')
                  const formattedTime = format(new Date(`2000-01-01T${appointment.appointment_time}`), 'h:mm a')

                  return (
                    <div key={appointment.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 relative rounded-full overflow-hidden bg-primary/10">
                          {appointment.pet_image_url ? (
                            <Image
                              src={appointment.pet_image_url}
                              alt={appointment.pet_name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 48px, 96px"
                              quality={90}
                              loading="eager"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <PawPrint className="h-6 w-6 text-primary/60" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{appointment.pet_name}</p>
                            <span className="text-sm text-muted-foreground">•</span>
                            <p className="text-sm text-muted-foreground">
                              {formattedDate} at {formattedTime}
                            </p>
                          </div>
                          {appointment.service_items?.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                              Services: {Array.isArray(appointment.service_items) 
                                ? appointment.service_items.join(', ')
                                : typeof appointment.service_items === 'string'
                                  ? JSON.parse(appointment.service_items).join(', ')
                                  : ''}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Groomer: {appointment.employee_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Duration: {Math.floor(appointment.appointment_duration / 60)}h {appointment.appointment_duration % 60}m
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAppointment(appointment)
                          setIsDetailsOpen(true)
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <Calendar className="h-8 w-8 mb-2" />
                <p>No upcoming appointments</p>
                <Button 
                  variant="link" 
                  onClick={() => router.push('/dashboard/admin-appointments')}
                  className="mt-2"
                >
                  View All Appointments
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />
    </div>
  )
}