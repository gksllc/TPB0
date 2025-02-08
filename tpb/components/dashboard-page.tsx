'use client'

import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { BarChart, Users, Calendar, DollarSign, PawPrint, RefreshCcw } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"
import type { Database } from "@/lib/database.types"
import type { AppointmentWithRelations } from '@/lib/types/appointments'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format, subMonths, startOfMonth, endOfMonth, add, addDays } from 'date-fns'
import Image from 'next/image'
import { AppointmentDetailsDialog } from '@/components/appointment-details-dialog'
import { cloverApi } from '@/lib/clover-api'

// Dynamic imports for shadcn components
const Card = dynamic(() => import('@/components/ui/card').then(mod => mod.Card))
const CardHeader = dynamic(() => import('@/components/ui/card').then(mod => mod.CardHeader))
const CardTitle = dynamic(() => import('@/components/ui/card').then(mod => mod.CardTitle))
const CardContent = dynamic(() => import('@/components/ui/card').then(mod => mod.CardContent))

// Explicitly type the Order interface
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

// Type for upcoming appointments
interface UpcomingAppointment {
  id: string
  c_order_id?: string
  appointment_date: string
  appointment_time: string
  pet_name: string
  pet_id: string
  service_items: string[]
  status: string
  employee_name: string
  employee_id: string
  pet_image_url: string | null
  appointment_duration: number
  pet_size?: string
}

// Type for month options
interface MonthOption {
  value: string
  label: string
  start: number
  end: number
  date: Date
}

export function DashboardPage(): JSX.Element {
  const router = useRouter()
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [totalCustomers, setTotalCustomers] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [totalRevenue, setTotalRevenue] = useState<number>(0)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()))
  const [todayAppointments, setTodayAppointments] = useState<number>(0)
  const [appointmentsLoading, setAppointmentsLoading] = useState(true)
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([])
  const [upcomingLoading, setUpcomingLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const monthOptions: MonthOption[] = Array.from({ length: 3 }).map((_, index) => {
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
    if (!loading) return
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
  }, [supabase, loading])

  const fetchRevenue = useCallback(async () => {
    if (!ordersLoading) return
    try {
      const selectedMonthStart = startOfMonth(selectedMonth).getTime()
      const selectedMonthEnd = endOfMonth(selectedMonth).getTime()

      const response = await cloverApi.get(`orders?start=${selectedMonthStart}&end=${selectedMonthEnd}`, {
        cacheDuration: 5 * 60 * 1000, // 5 minutes cache
        retries: 3
      })
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
  }, [selectedMonth, ordersLoading])

  const fetchTodayAppointments = useCallback(async () => {
    if (!appointmentsLoading) return
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
  }, [supabase, appointmentsLoading])

  const fetchUpcomingAppointments = useCallback(async () => {
    if (!upcomingLoading) return
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(5)

      if (error) throw error
      
      // Filter and format appointments
      const upcoming = (data || [])
        .filter(apt => apt.status.toLowerCase() !== 'cancelled')
        .map(apt => ({
          id: apt.id,
          c_order_id: apt.c_order_id,
          appointment_date: apt.appointment_date,
          appointment_time: apt.appointment_time,
          pet_name: apt.pet_name,
          pet_id: apt.pet_id,
          service_items: apt.service_items,
          status: apt.status,
          employee_name: apt.employee_name,
          employee_id: apt.employee_id,
          pet_image_url: apt.pet_image_url,
          appointment_duration: apt.appointment_duration,
          pet_size: apt.pet_size
        }))

      setUpcomingAppointments(upcoming)
    } catch (error) {
      console.error('Error fetching upcoming appointments:', error)
      toast.error('Failed to fetch upcoming appointments')
    } finally {
      setUpcomingLoading(false)
    }
  }, [supabase, upcomingLoading])

  // Add function to fetch complete appointment data
  const fetchAppointmentDetails = async (appointmentId: string) => {
    try {
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          pet:pets!appointments_pet_id_fkey (
            id,
            name,
            image_url,
            size
          ),
          customer:users!appointments_user_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('id', appointmentId)
        .single()

      if (appointmentError) throw appointmentError

      if (appointmentData) {
        const transformedAppointment = {
          ...appointmentData,
          pet: appointmentData.pet,
          customer: appointmentData.customer ? {
            id: appointmentData.customer.id,
            firstName: appointmentData.customer.first_name,
            lastName: appointmentData.customer.last_name,
            email: appointmentData.customer.email,
            phone: appointmentData.customer.phone
          } : null
        }
        setSelectedAppointment(transformedAppointment)
        setIsDetailsOpen(true)
      }
    } catch (error) {
      console.error('Error fetching appointment details:', error)
      toast.error('Failed to load appointment details')
    }
  }

  // Initial data fetch
  useEffect(() => {
    void fetchTotalCustomers()
  }, [fetchTotalCustomers])

  useEffect(() => {
    void fetchRevenue()
  }, [fetchRevenue])

  useEffect(() => {
    void fetchTodayAppointments()
  }, [fetchTodayAppointments])

  useEffect(() => {
    void fetchUpcomingAppointments()
  }, [fetchUpcomingAppointments])

  // Refresh handlers
  const handleRefresh = useCallback(() => {
    cloverApi.clearCacheForEndpoint('orders')
    setLoading(true)
    setOrdersLoading(true)
    setAppointmentsLoading(true)
    setUpcomingLoading(true)
    void fetchTotalCustomers()
    void fetchRevenue()
    void fetchTodayAppointments()
    void fetchUpcomingAppointments()
  }, [fetchTotalCustomers, fetchRevenue, fetchTodayAppointments, fetchUpcomingAppointments])

  const handleMonthChange = useCallback((value: string) => {
    const option = monthOptions.find(opt => opt.value === value)
    if (option) {
      setSelectedMonth(option.date)
      setOrdersLoading(true) // Trigger revenue refresh for new month
    }
  }, [monthOptions])

  const handleViewCustomers = () => {
    router.push('/dashboard/customers')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading || ordersLoading || appointmentsLoading || upcomingLoading}
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
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
                onValueChange={handleMonthChange}
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
                          void fetchAppointmentDetails(appointment.id)
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