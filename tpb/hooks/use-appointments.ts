import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import type { AppointmentWithRelations } from '@/lib/types/appointments'

interface UseAppointmentsReturn {
  appointments: AppointmentWithRelations[]
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  fetchAppointments: () => Promise<void>
  createAppointment: (appointmentData: Omit<AppointmentWithRelations, 'id'>) => Promise<void>
  updateAppointment: (id: string, data: Partial<AppointmentWithRelations>) => Promise<void>
  deleteAppointment: (id: string) => Promise<void>
}

export function useAppointments(): UseAppointmentsReturn {
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAppointments = useCallback(async () => {
    try {
      setIsRefreshing(true)
      setError(null)

      const response = await fetch('/api/appointments')
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch appointments')
      }

      setAppointments(result.data)
    } catch (error) {
      console.error('Error fetching appointments:', error)
      setError('Failed to fetch appointments')
      toast.error('Failed to fetch appointments')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  const createAppointment = async (appointmentData: Omit<AppointmentWithRelations, 'id'>) => {
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to create appointment')
      }

      await fetchAppointments()
      toast.success('Appointment created successfully')
    } catch (error) {
      console.error('Error creating appointment:', error)
      toast.error('Failed to create appointment')
      throw error
    }
  }

  const updateAppointment = async (id: string, data: Partial<AppointmentWithRelations>) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...data }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to update appointment')
      }

      await fetchAppointments()
      toast.success('Appointment updated successfully')
    } catch (error) {
      console.error('Error updating appointment:', error)
      toast.error('Failed to update appointment')
      throw error
    }
  }

  const deleteAppointment = async (id: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete appointment')
      }

      await fetchAppointments()
      toast.success('Appointment deleted successfully')
    } catch (error) {
      console.error('Error deleting appointment:', error)
      toast.error('Failed to delete appointment')
      throw error
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  return {
    appointments,
    isLoading,
    isRefreshing,
    error,
    fetchAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  }
} 