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
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
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
  const supabase = createClientComponentClient<Database>()
  const [isEditing, setIsEditing] = useState(false)
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [status, setStatus] = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [employeeName, setEmployeeName] = useState("")
  const [services, setServices] = useState<string[]>([])
  const [availableServices, setAvailableServices] = useState<Array<{id: string, name: string, price: number, description?: string}>>([])
  const [petSize, setPetSize] = useState<string>('')
  const [employees, setEmployees] = useState<Array<{id: string, name: string}>>([])
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTimes, setIsLoadingTimes] = useState(false)
  const [serviceSearchQuery, setServiceSearchQuery] = useState("")
  const [showServiceSelector, setShowServiceSelector] = useState(false)
  const [showDoubleBookingWarning, setShowDoubleBookingWarning] = useState(false)
  const [pendingTime, setPendingTime] = useState<string | null>(null)
  const [overlappingAppointment, setOverlappingAppointment] = useState<any>(null)

  // Update the debouncedFetchTimes function to properly handle appointment durations
  const debouncedFetchTimes = useCallback(
    debounce(async (date: string, employeeId: string, services: string[]) => {
      if (!date || !employeeId || !services.length || !appointment) return

      setIsLoadingTimes(true)
      try {
        // Calculate total duration of selected services
        const totalDuration = calculateTotalDuration(services)
        const formattedDate = format(new Date(date), 'yyyy-MM-dd')

        console.log('Fetching available times with params:', {
          date: formattedDate,
          employeeId,
          duration: totalDuration,
          selectedServices: services
        })

        // First get all possible time slots from the availability endpoint
        const response = await fetch(
          `/api/clover/availability?date=${formattedDate}&groomerId=${employeeId}&duration=${totalDuration}`
        )
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Failed to fetch availability:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          })
          throw new Error('Failed to fetch availability')
        }
        
        const data = await response.json()
        
        if (!data.success) {
          console.error('API returned error:', data.error)
          throw new Error(data.error || 'Failed to fetch availability')
        }

        console.log('API Response:', data)

        let availableSlots = data.data.availableTimeSlots || []

        // Then fetch existing appointments for the selected date and employee
        const { data: existingAppointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select('*')
          .eq('appointment_date', formattedDate)
          .eq('employee_id', employeeId)
          .neq('id', appointment?.id) // Safely access id with optional chaining
          .not('status', 'eq', 'cancelled')

        if (appointmentsError) {
          console.error('Error fetching existing appointments:', appointmentsError)
          throw appointmentsError
        }

        console.log('Existing appointments:', existingAppointments)

        // Convert existing appointments to time ranges
        const bookedRanges = existingAppointments.map((apt: any) => {
          const [hours, minutes] = apt.appointment_time.split(':').map(Number)
          const startTime = new Date(formattedDate)
          startTime.setHours(hours, minutes, 0, 0)
          const endTime = new Date(startTime.getTime() + apt.appointment_duration * 60000)
          return { startTime, endTime }
        })

        console.log('Booked time ranges:', bookedRanges.map((range: { startTime: Date; endTime: Date }) => ({
          start: format(range.startTime, 'h:mm a'),
          end: format(range.endTime, 'h:mm a')
        })))

        // Filter out times that would overlap with existing appointments
        availableSlots = availableSlots.filter((timeSlot: string) => {
          // Convert time slot to Date object
          const [time, period] = timeSlot.split(' ')
          const [hours, minutes] = time.split(':').map(Number)
          let adjustedHours = hours
          
          if (period === 'PM' && hours !== 12) {
            adjustedHours += 12
          } else if (period === 'AM' && hours === 12) {
            adjustedHours = 0
          }

          const slotStartTime = new Date(formattedDate)
          slotStartTime.setHours(adjustedHours, minutes, 0, 0)
          const slotEndTime = new Date(slotStartTime.getTime() + totalDuration * 60000)

          // Check if this time slot overlaps with any booked range
          const hasOverlap = bookedRanges.some((range: { startTime: Date; endTime: Date }) => {
            // Check for any overlap between the slot and the booked range
            const slotOverlapsStart = slotStartTime < range.endTime && slotStartTime >= range.startTime
            const slotOverlapsEnd = slotEndTime > range.startTime && slotEndTime <= range.endTime
            const slotContainsRange = slotStartTime <= range.startTime && slotEndTime >= range.endTime

            return slotOverlapsStart || slotOverlapsEnd || slotContainsRange
          })

          return !hasOverlap
        })

        // If it's the same day, filter out past times
        if (isSameDay(new Date(date), new Date())) {
          const now = new Date()
          availableSlots = availableSlots.filter((timeSlot: string) => {
            const [time, period] = timeSlot.split(' ')
            const [hours, minutes] = time.split(':').map(Number)
            let adjustedHours = hours
            
            if (period === 'PM' && hours !== 12) {
              adjustedHours += 12
            } else if (period === 'AM' && hours === 12) {
              adjustedHours = 0
            }

            const slotDate = new Date(date)
            slotDate.setHours(adjustedHours, minutes, 0, 0)
            const bufferTime = new Date(now.getTime() + 30 * 60000)

            return isAfter(slotDate, bufferTime)
          })
        }

        if (availableSlots.length === 0) {
          console.log('No available time slots after filtering')
        } else {
          console.log('Available time slots after filtering:', availableSlots)
        }

        setAvailableTimes(availableSlots)
      } catch (error) {
        console.error('Error fetching availability:', error)
        toast.error('Failed to fetch available times')
      } finally {
        setIsLoadingTimes(false)
      }
    }, 500),
    [appointment?.id, supabase, availableServices]
  )

  // Initialize state with appointment data
  useEffect(() => {
    if (appointment) {
      setDate(appointment.appointment_date)
      setTime(appointment.appointment_time)
      setStatus(appointment.status)
      setEmployeeId(appointment.employee_id)
      setEmployeeName(appointment.employee_name)
      setServices(appointment.service_items)
    }
  }, [appointment])

  // Fetch pet details when dialog opens
  useEffect(() => {
    const fetchPetDetails = async () => {
      if (!open || !appointment?.pet_id) return

      try {
        const { data: pet, error } = await supabase
          .from('pets')
          .select('size')
          .eq('id', appointment.pet_id)
          .single()

        if (error) {
          console.error('Error fetching pet details:', error)
          return
        }

        if (pet) {
          console.log('Fetched pet size:', pet.size)
          setPetSize(pet.size || '')
        }
      } catch (error) {
        console.error('Error fetching pet details:', error)
      }
    }

    fetchPetDetails()
  }, [open, appointment?.pet_id, supabase])

  // Remove the useEffect for fetching services and make it a regular function
  const fetchServices = async () => {
    if (!open || !isEditing || availableServices.length > 0) return

    try {
      console.log('Fetching services from Clover...')
      const response = await fetch('/api/clover/items')
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Failed to fetch services:', errorData)
        throw new Error(errorData.error || 'Failed to fetch services')
      }
      const data = await response.json()
      
      if (!data.success || !data.data) {
        console.error('Invalid services response:', data)
        throw new Error('Invalid services response')
      }

      console.log('Fetched services:', data.data)
      
      // Map the services to the correct format
      const formattedServices = data.data.map((service: any) => ({
        id: service.id,
        name: service.name,
        price: service.price || 0,
        description: service.description || ''
      }))

      setAvailableServices(formattedServices)
    } catch (error) {
      console.error('Error fetching services:', error)
      toast.error('Failed to fetch services')
    }
  }

  // Update the calculateTotalDuration function to match the new appointment form
  const calculateTotalDuration = useCallback((selectedServiceIds: string[]): number => {
    const selectedServices = availableServices.filter(service => selectedServiceIds.includes(service.id))
    return selectedServices.reduce((total, service) => {
      const durationMatch = service.name.match(/(\d+)\s*min/i)
      return total + (durationMatch ? parseInt(durationMatch[1]) : 30)
    }, 0)
  }, [availableServices])

  // Keep the useEffect that calls fetchServices and fetchEmployees
  useEffect(() => {
    if (open && isEditing && (!employees.length || !availableServices.length)) {
      fetchEmployees()
      fetchServices()
    }
  }, [open, isEditing, employees.length, availableServices.length])

  // Add back the useEffect for fetching available times
  useEffect(() => {
    if (isEditing) {
      debouncedFetchTimes(date, employeeId, services)
    }
    
    // Cleanup
    return () => {
      debouncedFetchTimes.cancel()
    }
  }, [date, employeeId, services, isEditing, debouncedFetchTimes])

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/clover/employees')
      if (!response.ok) throw new Error('Failed to fetch employees')
      const data = await response.json()
      
      // Filter for employees with customId 'GROOMER'
      const groomers = data.data
        .filter((emp: any) => emp.customId === 'GROOMER')
        .map((emp: any) => ({
          id: emp.id,
          name: emp.name
        }))
      
      setEmployees(groomers)
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to fetch employees')
    }
  }

  const handleSave = async () => {
    if (!appointment) return

    setIsLoading(true)
    try {
      // Parse the selected date and time
      const [timeStr, period] = time.split(' ')
      const [hours, minutes] = timeStr.split(':').map(Number)
      let adjustedHours = hours

      // Convert to 24-hour format
      if (period === 'PM' && hours !== 12) {
        adjustedHours += 12
      } else if (period === 'AM' && hours === 12) {
        adjustedHours = 0
      }

      const timeString = `${String(adjustedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

      // Ensure all required fields are present and properly formatted
      const updateData = {
        id: appointment.id,
        c_order_id: appointment.c_order_id || null,
        appointment_date: date,
        appointment_time: timeString,
        service_items: services,
        status: status.toLowerCase(),
        employee_id: employeeId,
        employee_name: employeeName,
        duration: calculateTotalDuration(services)
      }

      console.log('Sending update data:', updateData)

      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update appointment')
      }

      const result = await response.json()
      console.log('Update successful:', result)

      toast.success('Appointment updated successfully')
      setIsEditing(false)
      onOpenChange(false)
      
      // Call onUpdate if provided before refreshing the page
      if (onUpdate) {
        await onUpdate()
      }
      
      // Refresh the page
      window.location.reload()
    } catch (error: any) {
      console.error('Error updating appointment:', error)
      toast.error(error.message || 'Failed to update appointment')
    } finally {
      setIsLoading(false)
    }
  }

  // Update the filteredServices logic
  const filteredServices = availableServices.filter((service) => {
    // First check if service matches the pet size
    if (!isServiceMatchingPetSize(service.name, petSize)) {
      return false
    }

    // Then apply search filter if there's a search query
    if (serviceSearchQuery === "") return true
    
    const searchTerms = serviceSearchQuery.toLowerCase()
    const serviceName = service.name.toLowerCase()
    const serviceDescription = (service.description || '').toLowerCase()
    
    return serviceName.includes(searchTerms) || serviceDescription.includes(searchTerms)
  })

  const appointmentDate = appointment ? addDays(new Date(appointment.appointment_date), 1) : new Date()
  const formattedDate = appointment ? format(appointmentDate, 'MMMM d, yyyy') : ''
  const formattedTime = appointment ? format(new Date(`2000-01-01T${appointment.appointment_time}`), 'h:mm a') : ''
  const hours = appointment ? Math.floor(appointment.appointment_duration / 60) : 0
  const minutes = appointment ? appointment.appointment_duration % 60 : 0

  // Update the function to check for overlapping appointments
  const checkForOverlappingAppointments = async (selectedTime: string) => {
    if (!appointment) return false

    try {
      // Convert the selected time to 24-hour format for comparison
      const [timeStr, period] = selectedTime.split(' ')
      const [hours, minutes] = timeStr.split(':').map(Number)
      let adjustedHours = hours

      if (period === 'PM' && hours !== 12) {
        adjustedHours += 12
      } else if (period === 'AM' && hours === 12) {
        adjustedHours = 0
      }

      const timeString = `${String(adjustedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

      console.log('Checking for overlaps with:', {
        date,
        time: timeString,
        employeeId,
        currentAppointmentId: appointment.id
      })

      // Fetch existing appointments for the selected date and employee
      const { data: existingAppointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_date', date)
        .eq('employee_id', employeeId)
        .eq('appointment_time', timeString)
        .neq('id', appointment.id)
        .not('status', 'eq', 'cancelled')

      if (error) {
        console.error('Error checking for overlapping appointments:', error)
        return false
      }

      console.log('Found overlapping appointments:', existingAppointments)

      // If we found any overlapping appointments, show the warning
      if (existingAppointments && existingAppointments.length > 0) {
        // Use the first overlapping appointment for the warning
        const overlap = existingAppointments[0]
        setOverlappingAppointment(overlap)
        setPendingTime(selectedTime)
        setShowDoubleBookingWarning(true)
        return true
      }

      return false
    } catch (error) {
      console.error('Error checking for overlapping appointments:', error)
      return false
    }
  }

  // Modify the time selection handler
  const handleTimeChange = async (newTime: string) => {
    const hasOverlap = await checkForOverlappingAppointments(newTime)
    if (!hasOverlap) {
      setTime(newTime)
    }
  }

  // Add function to confirm double booking
  const handleConfirmDoubleBooking = () => {
    if (pendingTime) {
      setTime(pendingTime)
    }
    setShowDoubleBookingWarning(false)
    setPendingTime(null)
    setOverlappingAppointment(null)
  }

  // Add function to cancel double booking
  const handleCancelDoubleBooking = () => {
    setShowDoubleBookingWarning(false)
    setPendingTime(null)
    setOverlappingAppointment(null)
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
                  {!isEditing && (
                    <p className="text-sm text-muted-foreground">
                      {formattedDate} at {formattedTime}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "Cancel" : "Edit"}
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Services</h4>
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setShowServiceSelector(!showServiceSelector)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {showServiceSelector && isEditing && (
                  <div className="mb-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          Select additional services
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <div className="flex items-center border-b px-3 py-2">
                          <Input
                            placeholder="Search services..."
                            value={serviceSearchQuery}
                            onChange={(e) => setServiceSearchQuery(e.target.value)}
                            className="border-0 focus:ring-0"
                          />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {petSize && (
                            <div className="px-2 py-1 text-xs text-muted-foreground">
                              Showing services for {getSizeCategory(petSize)} size pets
                            </div>
                          )}
                          {filteredServices.map((service) => (
                            <div
                              key={service.id}
                              className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                              onClick={() => {
                                if (!services.includes(service.name)) {
                                  setServices([...services, service.name])
                                }
                              }}
                            >
                              <div className="flex-1">
                                <div className="text-sm font-medium">
                                  {service.name}
                                </div>
                                {service.price > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    ${(service.price / 100).toFixed(2)}
                                  </div>
                                )}
                                {service.description && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {service.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
                <div className="space-y-1">
                  {services.map((service, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        • {service}
                      </div>
                      {isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setServices(services.filter((_, i) => i !== index))}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {isEditing && (
                <>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Date & Time</h4>
                    <div className="space-y-2">
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        min={format(new Date(), "yyyy-MM-dd")}
                      />
                      <Select value={time} onValueChange={handleTimeChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
                          {isLoadingTimes ? (
                            <div className="text-sm text-muted-foreground p-2">
                              Loading available times...
                            </div>
                          ) : (
                            [
                              "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
                              "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
                              "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
                              "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
                              "5:00 PM", "5:30 PM", "6:00 PM"
                            ].map((t) => (
                              <SelectItem 
                                key={t} 
                                value={t}
                                className="py-2.5"
                              >
                                {t}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <h4 className="text-sm font-medium mb-2">Groomer</h4>
                {isEditing ? (
                  <Select
                    value={employeeId}
                    onValueChange={(value) => {
                      const emp = employees.find(e => e.id === value)
                      if (emp) {
                        setEmployeeId(emp.id)
                        setEmployeeName(emp.name)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select groomer" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">{employeeName}</p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Duration</h4>
                <p className="text-sm text-muted-foreground">
                  {isEditing ? (
                    // Show current duration based on selected services
                    (() => {
                      const currentDuration = calculateTotalDuration(services)
                      const currentHours = Math.floor(currentDuration / 60)
                      const currentMinutes = currentDuration % 60
                      return `${currentHours > 0 ? `${currentHours}h ` : ''}${currentMinutes}m`
                    })()
                  ) : (
                    // Show original appointment duration when not editing
                    `${hours > 0 ? `${hours}h ` : ''}${minutes}m`
                  )}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Status</h4>
                {isEditing ? (
                  <Select value={status.toLowerCase()} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${status.toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' :
                      status.toLowerCase() === 'cancelled' ? 'bg-red-100 text-red-800' :
                      status.toLowerCase() === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'}`}>
                    {status}
                  </div>
                )}
              </div>
            </div>

            {isEditing && (
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
            <AlertDialogCancel onClick={handleCancelDoubleBooking}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDoubleBooking}
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