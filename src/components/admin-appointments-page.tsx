import React, { useCallback, useEffect, useState } from 'react'
import { format, addDays } from 'date-fns'
import { Calendar, Search, Plus, Edit2, Trash2, PawPrint, RefreshCcw, AlertCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { NewAppointmentDialog } from './new-appointment-dialog'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Image from 'next/image'
import { AppointmentDetailsDialog } from './appointment-details-dialog'
import { cloverApi } from '@/lib/clover-api'

interface Employee {
  id: string
  name: string
  role?: string
  nickname?: string
  customId?: string
}

interface Service {
  id: string
  name: string
  price: number
  description?: string
}

interface Appointment {
  id: string
  c_order_id?: string
  user_id: string
  pet_id: string
  pet_name: string
  service_type?: string
  service_items: string[] | string
  status: string
  appointment_date: string
  appointment_time: string
  employee_id: string
  employee_name: string
  appointment_duration: number
  pet_image_url?: string | null
  pet_size?: string
}

interface Order {
  id: string
  total: number
  createdTime: string
  state: string
  employee: {
    id: string
    name: string
  }
  lineItems: Array<{
    id: string
    name: string
    price: number
  }>
}

export function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [availableServices, setAvailableServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('appointments')
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [openNewAppointmentDialog, setOpenNewAppointmentDialog] = useState(false)
  const [deleteAppointmentId, setDeleteAppointmentId] = useState<string | null>(null)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Filter appointments based on search query and status
  const filteredAppointments = React.useMemo(() => {
    console.log('Filtering appointments:', { appointments, searchQuery, statusFilter })
    
    return appointments.filter(appointment => {
      // Handle search query
      const searchLower = searchQuery.toLowerCase().trim()
      const matchesSearch = searchLower === '' || (
        (appointment.pet_name || '').toLowerCase().includes(searchLower) ||
        (appointment.employee_name || '').toLowerCase().includes(searchLower) ||
        (Array.isArray(appointment.service_items) 
          ? appointment.service_items.some(service => 
              (service || '').toLowerCase().includes(searchLower)
            )
          : String(appointment.service_items || '').toLowerCase().includes(searchLower))
      )

      // Handle status filter
      const matchesStatus = statusFilter === 'all' || 
        (appointment.status || '').toLowerCase() === statusFilter.toLowerCase()

      const matches = matchesSearch && matchesStatus
      console.log('Appointment filtering result:', { 
        id: appointment.id, 
        matchesSearch, 
        matchesStatus, 
        matches 
      })

      return matches
    })
  }, [appointments, searchQuery, statusFilter])

  // Handle appointment status update
  const handleUpdateAppointment = async (appointmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId)

      if (error) throw error

      // Refresh appointments after update
      await fetchAppointments()
      toast.success('Appointment status updated')
    } catch (error) {
      console.error('Error updating appointment:', error)
      toast.error('Failed to update appointment status')
    }
  }

  // Handle appointment deletion
  const handleDeleteClick = (appointmentId: string) => {
    setDeleteAppointmentId(appointmentId)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteAppointmentId) return

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', deleteAppointmentId)

      if (error) throw error

      // Refresh appointments after deletion
      await fetchAppointments()
      toast.success('Appointment deleted')
    } catch (error) {
      console.error('Error deleting appointment:', error)
      toast.error('Failed to delete appointment')
    } finally {
      setDeleteAppointmentId(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteAppointmentId(null)
  }

  const fetchAppointments = async () => {
    setIsLoading(true) // Set loading state at the start
    try {
      console.log('Fetching appointments...') // Debug log
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          pets (
            id,
            name,
            image_url,
            size
          ),
          users (
            id,
            first_name,
            last_name
          )
        `)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Raw appointments data:', data)

      if (!data) {
        setAppointments([])
        return
      }

      const transformedAppointments = data.map(rawData => {
        console.log('Processing appointment:', rawData) // Debug individual appointment

        let parsedServiceItems = []
        try {
          parsedServiceItems = typeof rawData.service_items === 'string' 
            ? JSON.parse(rawData.service_items)
            : rawData.service_items || []
        } catch (e) {
          console.error('Error parsing service_items:', e)
          // If parsing fails, try to use the raw value
          parsedServiceItems = Array.isArray(rawData.service_items) 
            ? rawData.service_items 
            : [String(rawData.service_items)]
        }

        const appointment: Appointment = {
          id: rawData.id,
          c_order_id: rawData.c_order_id,
          user_id: rawData.user_id,
          pet_id: rawData.pet_id,
          pet_name: rawData.pets?.name || rawData.pet_name || 'Unknown Pet',
          service_type: rawData.service_type,
          service_items: parsedServiceItems,
          status: rawData.status || 'pending',
          appointment_date: rawData.appointment_date,
          appointment_time: rawData.appointment_time,
          employee_id: rawData.employee_id,
          employee_name: rawData.employee_name || 'Unknown Employee',
          appointment_duration: rawData.appointment_duration || 60,
          pet_image_url: rawData.pets?.image_url || null,
          pet_size: rawData.pets?.size || rawData.pet_size
        }

        console.log('Transformed appointment:', appointment) // Debug transformed appointment
        return appointment
      })

      console.log('Setting appointments:', transformedAppointments)
      setAppointments(transformedAppointments)
      setError(null)
    } catch (error) {
      console.error('Error fetching appointments:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch appointments'
      toast.error(errorMessage)
      setError(errorMessage)
      setAppointments([]) // Clear appointments on error
    } finally {
      setIsLoading(false) // Always set loading to false when done
    }
  }

  // Initial data fetch
  useEffect(() => {
    console.log('Initial fetch triggered') // Debug initial fetch
    void fetchAppointments()
  }, [])

  // Debug appointments state changes
  useEffect(() => {
    console.log('Appointments state updated:', appointments)
  }, [appointments])

  // Debug filtered appointments
  useEffect(() => {
    console.log('Filtered appointments:', filteredAppointments)
  }, [filteredAppointments])

  // Fetch orders when orders tab is selected
  useEffect(() => {
    if (activeTab === 'orders') {
      void fetchOrders()
    }
  }, [activeTab, fetchOrders])

  // Fetch orders from Clover
  const fetchOrders = useCallback(async () => {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const response = await fetch(
        `/api/orders?start=${thirtyDaysAgo.getTime()}&end=${Date.now()}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }
      const data = await response.json()
      setOrders(data.data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to fetch orders')
    } finally {
      setIsLoading(false)
    }
  }, []) // Empty dependency array since it doesn't depend on any props or state

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Appointments</h2>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => void fetchAppointments()}
            className="gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setOpenNewAppointmentDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      <Tabs defaultValue="appointments" className="space-y-4" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search appointments..."
                className="pl-10 pr-4"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-[200px]">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mb-2 text-destructive" />
                  <p>{error}</p>
                  <Button 
                    variant="link" 
                    onClick={() => void fetchAppointments()}
                    className="mt-2"
                  >
                    Try again
                  </Button>
                </div>
              ) : appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                  <Calendar className="h-8 w-8 mb-2" />
                  <p>No appointments found</p>
                  <Button 
                    variant="link" 
                    onClick={() => setOpenNewAppointmentDialog(true)}
                    className="mt-2"
                  >
                    Create your first appointment
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Pet Name</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Groomer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(addDays(new Date(appointment.appointment_date), 1), 'MMM d, yyyy')}
                          </span>
                          <div className="text-base font-medium mt-1">
                            {format(new Date(`2000-01-01T${appointment.appointment_time}`), 'h:mm a')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 relative rounded-full overflow-hidden bg-primary/10 shrink-0">
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
                            <span className="font-medium">{appointment.pet_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {typeof appointment.service_items === 'string' 
                            ? JSON.parse(appointment.service_items).join(', ')
                            : Array.isArray(appointment.service_items)
                              ? appointment.service_items.join(', ')
                              : appointment.service_items}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {Math.floor(appointment.appointment_duration / 60)}h {appointment.appointment_duration % 60}m
                          </div>
                        </TableCell>
                        <TableCell>{appointment.employee_name}</TableCell>
                        <TableCell>
                          <Select
                            value={appointment.status.toLowerCase()}
                            onValueChange={(value) => handleUpdateAppointment(appointment.id, value)}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedAppointment(appointment)
                                setIsDetailsOpen(true)
                              }}
                            >
                              View Details
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(appointment.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-[200px]">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mb-2 text-destructive" />
                  <p>{error}</p>
                  <Button 
                    variant="link" 
                    onClick={() => void fetchOrders()}
                    className="mt-2"
                  >
                    Try again
                  </Button>
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                  <Calendar className="h-8 w-8 mb-2" />
                  <p>No orders found</p>
                  <Button 
                    variant="link" 
                    onClick={() => void fetchOrders()}
                    className="mt-2"
                  >
                    Fetch orders
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Created Time</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Line Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{order.id}</TableCell>
                        <TableCell>{order.total}</TableCell>
                        <TableCell>{order.createdTime}</TableCell>
                        <TableCell>{order.state}</TableCell>
                        <TableCell>{order.employee.name}</TableCell>
                        <TableCell>{order.lineItems.map((item) => item.name).join(', ')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAppointmentId} onOpenChange={() => setDeleteAppointmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the appointment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Appointment Details Dialog */}
      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpdate={fetchAppointments}
      />

      {/* Add New Appointment Dialog */}
      <NewAppointmentDialog
        open={openNewAppointmentDialog}
        onOpenChange={setOpenNewAppointmentDialog}
        onSuccess={fetchAppointments}
      />
    </div>
  )
} 