'use client'

import { useState, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import { Calendar, Search, Plus, Edit2, Trash2, PawPrint } from 'lucide-react'
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
import { supabase } from '@/lib/supabase'
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

type Appointment = {
  id: string
  c_order_id: string
  user_id: string
  pet_id: string
  pet_name: string
  service_type: string
  service_items: string[]
  status: string
  appointment_date: string
  appointment_time: string
  appointment_duration: number
  employee_id: string
  employee_name: string
  pet_image_url: string | null
}

type Order = {
  id: string
  total: number
  state: string
  createdTime: string
  employee: {
    id: string
    name: string
  }
  lineItems?: {
    elements: Array<{
      name: string
      price: number
    }>
  }
  payments?: {
    elements: Array<{
      amount: number
      result: string
    }>
  }
}

export function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [openNewAppointmentDialog, setOpenNewAppointmentDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('appointments')
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  // Fetch appointments from Supabase
  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/appointments')
      if (!response.ok) {
        throw new Error('Failed to fetch appointments')
      }
      const data = await response.json()
      setAppointments(data.data)
    } catch (error) {
      console.error('Error fetching appointments:', error)
      toast.error('Failed to fetch appointments')
    }
  }

  // Fetch orders from Clover
  const fetchOrders = async () => {
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
  }

  // Only fetch appointments initially
  useEffect(() => {
    fetchAppointments()
    setIsLoading(false)
  }, [])

  // Fetch orders only when orders tab is selected
  useEffect(() => {
    if (activeTab === 'orders' && orders.length === 0) {
      fetchOrders()
    }
  }, [activeTab])

  const handleUpdateAppointment = async (appointmentId: string, status: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error('Failed to update appointment')
      }

      toast.success('Appointment updated successfully')
      fetchAppointments() // Refresh the list
    } catch (error) {
      console.error('Error updating appointment:', error)
      toast.error('Failed to update appointment')
    }
  }

  const handleDeleteClick = (appointmentId: string) => {
    setAppointmentToDelete(appointmentId)
  }

  const handleDeleteConfirm = async () => {
    if (!appointmentToDelete) return

    try {
      // First get the appointment details using the API endpoint
      const appointmentResponse = await fetch(`/api/appointments/${appointmentToDelete}`)
      const appointmentData = await appointmentResponse.json()

      if (!appointmentResponse.ok || !appointmentData.success) {
        console.error('Failed to fetch appointment details:', appointmentData)
        throw new Error('Failed to fetch appointment details')
      }

      const appointment = appointmentData.data

      if (!appointment) {
        console.error('Appointment not found:', appointmentToDelete)
        throw new Error('Appointment not found')
      }

      // If there's a Clover order ID, delete from Clover first
      if (appointment.c_order_id) {
        console.log('Starting Clover order deletion:', appointment.c_order_id)
        
        const cloverResponse = await fetch(`/api/clover/orders/${appointment.c_order_id}`, {
          method: 'DELETE',
        })

        const cloverData = await cloverResponse.json()

        if (!cloverResponse.ok || !cloverData.success) {
          console.error('Failed to delete Clover order:', {
            status: cloverResponse.status,
            orderId: appointment.c_order_id,
            error: cloverData
          })
          throw new Error(cloverData.error || 'Failed to delete Clover order')
        }
        
        console.log('Successfully deleted Clover order:', appointment.c_order_id)
      } else {
        console.log('No Clover order ID found for appointment:', appointmentToDelete)
      }

      // Then delete from Supabase using the API endpoint
      console.log('Deleting appointment from Supabase:', appointmentToDelete)
      const deleteResponse = await fetch(`/api/appointments/${appointmentToDelete}`, {
        method: 'DELETE',
      })

      const deleteData = await deleteResponse.json()

      if (!deleteResponse.ok || !deleteData.success) {
        console.error('Failed to delete appointment:', {
          status: deleteResponse.status,
          appointmentId: appointmentToDelete,
          error: deleteData
        })
        throw new Error(deleteData.error || 'Failed to delete appointment')
      }

      console.log('Successfully deleted appointment:', appointmentToDelete)
      toast.success('Appointment deleted successfully')
      fetchAppointments() // Refresh the list
    } catch (error: any) {
      console.error('Error in deletion process:', error)
      toast.error(error.message || 'Failed to delete appointment')
    } finally {
      setAppointmentToDelete(null) // Close the dialog
    }
  }

  const handleDeleteCancel = () => {
    setAppointmentToDelete(null)
  }

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = 
      appointment.pet_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (Array.isArray(appointment.service_items)
        ? appointment.service_items.some(item => 
            item.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : typeof appointment.service_items === 'string'
          ? JSON.parse(appointment.service_items).some((item: string) =>
              item.toLowerCase().includes(searchQuery.toLowerCase())
            )
          : false)
    
    const matchesStatus = 
      statusFilter === 'all' || 
      appointment.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Appointments</h2>
        <Button onClick={() => setOpenNewAppointmentDialog(true)}>
          New Appointment
        </Button>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search orders..."
              className="pl-10 pr-4"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.id}</TableCell>
                      <TableCell>
                        {format(new Date(parseInt(order.createdTime)), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                      <TableCell>
                        {order.lineItems?.elements.map(item => item.name).join(', ')}
                      </TableCell>
                      <TableCell>{order.employee?.name || 'N/A'}</TableCell>
                      <TableCell>${(order.total / 100).toFixed(2)}</TableCell>
                      <TableCell>{order.state}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!appointmentToDelete} onOpenChange={handleDeleteCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the appointment and cannot be undone.
              This will also delete the associated order from Clover if one exists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <NewAppointmentDialog
        open={openNewAppointmentDialog}
        onOpenChange={setOpenNewAppointmentDialog}
        onSuccess={fetchAppointments}
      />

      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpdate={fetchAppointments}
      />
    </div>
  )
} 