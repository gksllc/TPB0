'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, isSameDay, isAfter, addDays } from 'date-fns'
import { PawPrint, Plus, Check, ChevronsUpDown } from 'lucide-react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import debounce from 'lodash/debounce'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from "@/lib/database.types"
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
import { useAppointmentData } from '@/hooks/use-appointment-data'

interface AppointmentDetailsDialogProps {
  appointment: {
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
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

// Add helper function to determine size category
const getSizeCategory = (size: string | null | undefined): 'standard' | 'large' | 'x-large' => {
  if (!size) return 'standard'
  
  const normalizedSize = size.toLowerCase()
  if (['x-large', 'xlarge', 'extra large', 'extra-large'].includes(normalizedSize)) {
    return 'x-large'
  }
  if (['large', 'l'].includes(normalizedSize)) {
    return 'large'
  }
  // x-small, small, medium are all considered standard
  return 'standard'
}

// Add helper function to check if service matches pet size
const isServiceMatchingPetSize = (serviceName: string, petSize: string | null | undefined): boolean => {
  const sizeCategory = getSizeCategory(petSize)
  const normalizedName = serviceName.toLowerCase()

  // If service name doesn't contain size indicators, it's available for all sizes
  if (!normalizedName.includes('standard') && 
      !normalizedName.includes('large') && 
      !normalizedName.includes('x-large') &&
      !normalizedName.includes('xlarge')) {
    return true
  }

  switch (sizeCategory) {
    case 'x-large':
      return normalizedName.includes('x-large') || normalizedName.includes('xlarge')
    case 'large':
      return normalizedName.includes('large') && 
             !normalizedName.includes('x-large') && 
             !normalizedName.includes('xlarge')
    case 'standard':
      return normalizedName.includes('standard')
    default:
      return true
  }
}

export function AppointmentDetailsDialog({
  appointment,
  open,
  onOpenChange,
  onUpdate
}: AppointmentDetailsDialogProps) {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { employees, availableServices, fetchError } = useAppointmentData()
  
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [status, setStatus] = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [employeeName, setEmployeeName] = useState("")
  const [services, setServices] = useState<string[]>([])
  const [petSize, setPetSize] = useState<string>('')
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTimes, setIsLoadingTimes] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDoubleBookingWarning, setShowDoubleBookingWarning] = useState(false)
  const [pendingTime, setPendingTime] = useState<string | null>(null)
  const [overlappingAppointment, setOverlappingAppointment] = useState<any>(null)

  useEffect(() => {
    if (fetchError) {
      setError(fetchError)
    }
  }, [fetchError])

  const calculateTotalDuration = useCallback((selectedServiceIds: string[]): number => {
    const selectedServices = availableServices.filter(service => selectedServiceIds.includes(service.id))
    return selectedServices.reduce((total, service) => {
      const durationMatch = service.name.match(/(\d+)\s*min/i)
      return total + (durationMatch ? parseInt(durationMatch[1]) : 30)
    }, 0)
  }, [availableServices])

  const debouncedFetchTimes = useCallback(
    debounce(async (selectedDate: string, selectedEmployeeId: string, selectedServices: string[]) => {
      if (!selectedDate || !selectedEmployeeId || !selectedServices.length) return

      setIsLoadingTimes(true)
      try {
        const totalDuration = calculateTotalDuration(selectedServices)
        const formattedDate = format(new Date(selectedDate), 'yyyy-MM-dd')

        const response = await fetch(
          `/api/clover/availability?date=${formattedDate}&groomerId=${selectedEmployeeId}&duration=${totalDuration}`
        )
        
        if (!response.ok) {
          throw new Error('Failed to fetch availability')
        }
        
        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch availability')
        }

        let availableSlots = data.data.availableTimeSlots || []

        // Filter out past times if it's today
        if (isSameDay(new Date(selectedDate), new Date())) {
          const now = new Date()
          const bufferTime = new Date(now.getTime() + 30 * 60000) // 30 minutes buffer
          
          availableSlots = availableSlots.filter((timeSlot: string) => {
            const [time, period] = timeSlot.split(' ')
            const [hours, minutes] = time.split(':').map(Number)
            let adjustedHours = hours
            
            if (period === 'PM' && hours !== 12) {
              adjustedHours += 12
            } else if (period === 'AM' && hours === 12) {
              adjustedHours = 0
            }

            const slotDate = new Date(selectedDate)
            slotDate.setHours(adjustedHours, minutes, 0, 0)
            
            return isAfter(slotDate, bufferTime)
          })
        }

        setAvailableTimes(availableSlots)
      } catch (error) {
        console.error('Error fetching availability:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch available times')
      } finally {
        setIsLoadingTimes(false)
      }
    }, 500),
    [calculateTotalDuration]
  )

  useEffect(() => {
    if (date && employeeId && services.length > 0) {
      void debouncedFetchTimes(date, employeeId, services)
    }
  }, [date, employeeId, services, debouncedFetchTimes])

  const handleTimeChange = async (newTime: string) => {
    const overlapping = await checkForOverlappingAppointments(newTime)
    if (overlapping) {
      setPendingTime(newTime)
      setShowDoubleBookingWarning(true)
    } else {
      setTime(newTime)
      setShowDoubleBookingWarning(false)
    }
  }

  const checkForOverlappingAppointments = async (selectedTime: string): Promise<boolean> => {
    if (!date || !employeeId) return false

    try {
      const { data: existingAppointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_date', date)
        .eq('employee_id', employeeId)
        .not('status', 'eq', 'cancelled')

      if (error) throw error

      const [hours, minutes] = selectedTime.split(':').map(Number)
      const selectedDateTime = new Date(date)
      selectedDateTime.setHours(hours, minutes, 0, 0)

      const duration = calculateTotalDuration(services)
      const selectedEndTime = new Date(selectedDateTime.getTime() + duration * 60000)

      const overlap = existingAppointments.find((apt: any) => {
        const [aptHours, aptMinutes] = apt.appointment_time.split(':').map(Number)
        const aptStartTime = new Date(date)
        aptStartTime.setHours(aptHours, aptMinutes, 0, 0)
        const aptEndTime = new Date(aptStartTime.getTime() + apt.appointment_duration * 60000)

        return (
          (selectedDateTime < aptEndTime && selectedDateTime >= aptStartTime) ||
          (selectedEndTime > aptStartTime && selectedEndTime <= aptEndTime) ||
          (selectedDateTime <= aptStartTime && selectedEndTime >= aptEndTime)
        )
      })

      if (overlap) {
        setOverlappingAppointment(overlap)
        return true
      }

      return false
    } catch (error) {
      console.error('Error checking for overlapping appointments:', error)
      return false
    }
  }

  const handleSave = async () => {
    if (!date || !time || !employeeId || !services.length) {
      setError('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: appointment?.id,
          c_order_id: appointment?.c_order_id,
          appointment_date: date,
          appointment_time: time,
          service_items: services,
          employee_id: employeeId,
          employee_name: employeeName,
          duration: calculateTotalDuration(services),
          status: status || 'confirmed',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update appointment')
      }

      toast.success('Appointment updated successfully')
      onUpdate?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating appointment:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update appointment')
    } finally {
      setIsLoading(false)
    }
  }

  if (!appointment) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 relative rounded-full overflow-hidden bg-primary/10">
                  {appointment.pet_image_url ? (
                    <Image
                      src={appointment.pet_image_url}
                      alt={appointment.pet_name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 64px, 96px"
                      quality={95}
                      priority
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <PawPrint className="h-8 w-8 text-primary/60" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{appointment.pet_name}</h3>
                  {!isLoading && (
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(appointment.appointment_date), 'MMMM d, yyyy')} at {format(new Date(`2000-01-01T${appointment.appointment_time}`), 'h:mm a')}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Services</h4>
                </div>
                <div className="space-y-1">
                  {services.map((service, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        • {service}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setServices(services.filter((_, i) => i !== index))}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Groomer</h4>
                <p className="text-sm text-muted-foreground">{employeeName}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Duration</h4>
                <p className="text-sm text-muted-foreground">
                  {calculateTotalDuration(services)} minutes
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Status</h4>
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${status.toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' :
                    status.toLowerCase() === 'cancelled' ? 'bg-red-100 text-red-800' :
                    status.toLowerCase() === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'}`}>
                  {status}
                </div>
              </div>
            </div>

            {isLoading && (
              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDoubleBookingWarning} onOpenChange={setShowDoubleBookingWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Double Booking Warning</AlertDialogTitle>
            <AlertDialogDescription>
              {overlappingAppointment && (
                <div className="space-y-2">
                  <p>There is already an appointment scheduled for this time:</p>
                  <div className="bg-muted p-3 rounded-md">
                    <p><strong>Pet:</strong> {overlappingAppointment.pet_name}</p>
                    <p><strong>Services:</strong> {Array.isArray(overlappingAppointment.service_items) 
                      ? overlappingAppointment.service_items.join(', ')
                      : typeof overlappingAppointment.service_items === 'string'
                        ? JSON.parse(overlappingAppointment.service_items).join(', ')
                        : overlappingAppointment.service_items}
                    </p>
                    <p><strong>Duration:</strong> {Math.floor(overlappingAppointment.appointment_duration / 60)}h {overlappingAppointment.appointment_duration % 60}m</p>
                  </div>
                  <p className="font-medium text-destructive">Are you sure you want to double book this time slot?</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDoubleBookingWarning(false)
              setPendingTime(null)
              setOverlappingAppointment(null)
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowDoubleBookingWarning(false)
                setPendingTime(null)
                setOverlappingAppointment(null)
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Confirm Double Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 