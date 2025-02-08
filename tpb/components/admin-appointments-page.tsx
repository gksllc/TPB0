'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Plus, RefreshCcw } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { AppointmentList } from '@/components/admin/appointment-list'
import { AppointmentFilters } from '@/components/admin/appointment-filters'
import { NewAppointmentDialog } from '@/components/new-appointment-dialog'
import { AppointmentDetailsDialog } from '@/components/appointment-details-dialog'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'
import type { AppointmentWithRelations } from '@/lib/types/appointments'
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

export function AdminAppointmentsPage() {
  // State
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null)
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [deleteAppointmentId, setDeleteAppointmentId] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient<Database>()

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    try {
      setIsRefreshing(true)
      setError(null)

      const response = await fetch('/api/appointments')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch appointments')
      }

      setAppointments(result.data)
    } catch (error) {
      console.error('Error fetching appointments:', error)
      const message = error instanceof Error ? error.message : 'Failed to fetch appointments'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchAppointments()
  }, [fetchAppointments])

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
      const searchLower = searchQuery.toLowerCase()
      
      // Safely check all searchable fields
      const customerFirstName = appointment?.customer?.firstName?.toLowerCase() ?? ''
      const customerLastName = appointment?.customer?.lastName?.toLowerCase() ?? ''
      const petName = appointment?.pet?.name?.toLowerCase() ?? ''
      const employeeName = appointment?.employee_name?.toLowerCase() ?? ''

      const matchesSearch = searchLower === '' || (
        customerFirstName.includes(searchLower) ||
        customerLastName.includes(searchLower) ||
        petName.includes(searchLower) ||
        employeeName.includes(searchLower)
      )

      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [appointments, searchQuery, statusFilter])

  // Handlers
  const handleRefresh = () => {
    fetchAppointments()
  }

  const handleEdit = (appointment: AppointmentWithRelations) => {
    setSelectedAppointment(appointment)
    setIsDetailsOpen(true)
  }

  const handleDelete = (appointmentId: string) => {
    setDeleteAppointmentId(appointmentId)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteAppointmentId) return

    try {
      const response = await fetch(`/api/appointments/${deleteAppointmentId}`, {
        method: 'DELETE',
      })
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete appointment')
      }

      toast.success('Appointment deleted successfully')
      fetchAppointments()
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

  const handleAppointmentCreated = () => {
    setIsNewAppointmentOpen(false)
    fetchAppointments()
    toast.success('Appointment created successfully')
  }

  const handleAppointmentUpdated = () => {
    setIsDetailsOpen(false)
    fetchAppointments()
    toast.success('Appointment updated successfully')
  }

  if (isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <div className="text-muted-foreground">Loading appointments...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-500">{error}</div>
        <Button onClick={() => void fetchAppointments()}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Appointments</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh appointments"
          >
            <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setIsNewAppointmentOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <AppointmentFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
          />
          
          <div className="mt-6">
            <AppointmentList
              appointments={filteredAppointments}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </CardContent>
      </Card>

      <NewAppointmentDialog
        open={isNewAppointmentOpen}
        onOpenChange={setIsNewAppointmentOpen}
        onSuccess={handleAppointmentCreated}
      />

      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpdate={handleAppointmentUpdated}
      />

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
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 