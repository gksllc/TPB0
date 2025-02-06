"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  CalendarIcon, 
  PawPrint, 
  History, 
  Settings, 
  LogOut,
  Clock,
  Search,
  Plus,
  ChevronsUpDown,
  Check
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "sonner"
import type { Database } from "@/lib/database.types"
import { useEffect, useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import Image from "next/image"

type RawAppointment = {
  id: string // Supabase UUID
  c_order_id?: string // Clover order ID (optional)
  user_id: string // UUID from auth.users
  pet_id: string // UUID from pets table
  pet_name: string // Pet name stored directly in appointments
  service_type: string
  service_items: string[] | string // Can be array or JSON string
  status: string
  appointment_date: string
  appointment_time: string
  employee_id: string // Clover employee ID
  employee_name: string // Employee name
  pets: {
    name: string
    image_url: string | null
  }[] // Changed to array to match Supabase response
}

type Appointment = Omit<RawAppointment, 'pets' | 'service_items'> & {
  c_order_id?: string
  employee_id: string // Clover employee ID
  employee_name: string // Employee name
  service_items: string[] // Array of service names
  pet_image_url: string | null
}

type Groomer = {
  id: string
  name: string
  customId: string
}

type Service = {
  id: string
  name: string
  price: number
  description: string
}

type Pet = {
  id: string
  name: string
  breed: string
  user_id: string
  size?: string
}

const convertTo12Hour = (time24: string): string => {
  // Remove any existing AM/PM first
  const cleanTime = time24.replace(/\s*[AaPp][Mm]\s*$/, '')
  const [hours, minutes] = cleanTime.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

export function ClientAppointmentsPage() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [groomers, setGroomers] = useState<Groomer[]>([])
  const [isLoadingGroomers, setIsLoadingGroomers] = useState(true)
  const [services, setServices] = useState<Service[]>([])
  const [isLoadingServices, setIsLoadingServices] = useState(true)
  const [selectedGroomer, setSelectedGroomer] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [selectedPet, setSelectedPet] = useState<string>("")
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [isLoadingTimes, setIsLoadingTimes] = useState(false)
  const [isBooking, setIsBooking] = useState(false)
  const [pets, setPets] = useState<Pet[]>([])
  const [isLoadingPets, setIsLoadingPets] = useState(true)
  const [isGroomersLoaded, setIsGroomersLoaded] = useState(false)
  const [isServicesLoaded, setIsServicesLoaded] = useState(false)
  const [isPetsLoaded, setIsPetsLoaded] = useState(false)
  const [serviceSearchQuery, setServiceSearchQuery] = useState("")

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/client" },
    { icon: CalendarIcon, label: "My Appointments", href: "/client/appointments" },
    { icon: PawPrint, label: "My Pets", href: "/client/pets" },
    { icon: History, label: "Grooming History", href: "/client/history" },
    { icon: Settings, label: "Settings", href: "/client/profile" }
  ]

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) {
          console.log('No authenticated user found')
          return
        }

        console.log('Fetching appointments for user:', currentUser.id)

        // First check if the table exists by trying to get its structure
        const { error: tableError } = await supabase
          .from('appointments')
          .select('id')
          .limit(1)

        if (tableError) {
          console.error('Error checking appointments table:', {
            code: tableError.code,
            message: tableError.message,
            details: tableError.details,
            hint: tableError.hint
          })
          throw new Error(`Database error: ${tableError.message}`)
        }

        // Fetch appointments with pet information using a single object for the join
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            c_order_id,
            user_id,
            pet_id,
            pet_name,
            service_type,
            service_items,
            status,
            appointment_date,
            appointment_time,
            employee_id,
            employee_name,
            pets (
              name,
              image_url
            )
          `)
          .eq('user_id', currentUser.id)
          .order('appointment_date', { ascending: true })

        if (error) {
          console.error('Supabase error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          })
          throw new Error(`Failed to fetch appointments: ${error.message}`)
        }

        console.log('Raw appointments data:', data)

        // Transform the data to match our Appointment type
        const transformedAppointments: Appointment[] = (data || []).map((rawData: any) => {
          console.log('Processing appointment:', rawData)
          // Parse service_items if it's a string, or provide empty array as fallback
          const service_items = (() => {
            if (!rawData.service_items) return []
            if (Array.isArray(rawData.service_items)) return rawData.service_items
            try {
              return JSON.parse(rawData.service_items)
            } catch {
              return []
            }
          })()

          return {
            id: rawData.id,
            c_order_id: rawData.c_order_id,
            user_id: rawData.user_id,
            pet_id: rawData.pet_id,
            pet_name: rawData.pet_name,
            service_type: rawData.service_type,
            service_items,
            status: rawData.status,
            appointment_date: rawData.appointment_date,
            appointment_time: rawData.appointment_time,
            employee_id: rawData.employee_id,
            employee_name: rawData.employee_name,
            pet_image_url: rawData.pets?.[0]?.image_url || null // Access first pet's image if available
          }
        })

        console.log('Transformed appointments:', transformedAppointments)
        setAppointments(transformedAppointments)
      } catch (error: any) {
        console.error('Error fetching appointments:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          details: error
        })
        toast.error(error.message || 'Failed to fetch appointments')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAppointments()
  }, [supabase])

  const fetchGroomers = async () => {
    if (isGroomersLoaded) return // Prevent duplicate loads
    
    try {
      setIsLoadingGroomers(true)
      const response = await fetch('/api/clover/employees')
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch groomers')
      }

      // Filter employees to only include groomers (customId === 'GROOMER')
      const groomersList = data.data
        .filter((employee: any) => employee.customId === 'GROOMER')
        .map((groomer: any) => ({
          id: groomer.id,
          name: groomer.name,
          customId: groomer.customId
        }))

      setGroomers(groomersList)
      setIsGroomersLoaded(true)
    } catch (error) {
      console.error('Error fetching groomers:', error)
      toast.error('Failed to load groomers')
    } finally {
      setIsLoadingGroomers(false)
    }
  }

  const fetchServices = async () => {
    if (isServicesLoaded) return // Prevent duplicate loads
    
    try {
      setIsLoadingServices(true)
      const response = await fetch('/api/clover/items')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch services')
      }

      // Ensure all services have required fields and valid prices
      const validServices = data.data
        .filter((service: any) => 
          service.id && 
          service.name && 
          typeof service.price === 'number' && 
          service.price > 0
        )
        .map((service: any) => ({
          id: service.id,
          name: service.name,
          price: service.price,
          description: service.description || ''
        }))

      if (validServices.length === 0) {
        console.warn('No valid services found in response:', data)
        toast.error('No services available. Please contact support.')
      }

      setServices(validServices)
      setIsServicesLoaded(true)
    } catch (error) {
      console.error('Error fetching services:', error)
      toast.error('Failed to load services. Please try again later.')
    } finally {
      setIsLoadingServices(false)
    }
  }

  const fetchPets = async () => {
    if (isPetsLoaded) return // Prevent duplicate loads
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setIsLoadingPets(true)
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      setPets(data || [])
      setIsPetsLoaded(true)
    } catch (error) {
      console.error('Error fetching pets:', error)
      toast.error('Failed to fetch pets')
    } finally {
      setIsLoadingPets(false)
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      toast.success("Signed out successfully")
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Sign out error:', error)
      toast.error("Error signing out")
    }
  }

  const handleNewAppointment = () => {
    // Reset form state when opening
    setSelectedGroomer("")
    setSelectedDate("")
    setSelectedTime("")
    setSelectedPet("")
    setSelectedServices([])
    setAvailableTimes([])
    
    // Load all necessary data when opening the form
    Promise.all([
      fetchGroomers(),
      fetchServices(),
      fetchPets()
    ]).catch(error => {
      console.error('Error loading form data:', error)
      toast.error('Failed to load some data. Please try again.')
    })
    
    setIsNewAppointmentOpen(true)
  }

  const handleProfileClick = () => {
    router.push('/client/profile')
  }

  const fetchAvailableTimes = async (groomerId: string, date: string) => {
    if (!groomerId || !date) return

    setIsLoadingTimes(true)
    try {
      // First, get all possible time slots from Clover API
      const response = await fetch(
        `/api/clover/availability?date=${date}&groomerId=${groomerId}`
      )
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch available times')
      }

      // Get all booked appointments for the selected groomer and date
      const { data: bookedAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('appointment_date', date)
        .eq('employee_id', groomerId)

      if (appointmentsError) {
        console.error('Error fetching booked appointments:', appointmentsError)
        throw new Error('Failed to check booked appointments')
      }

      // Normalize booked times to HH:mm format
      const bookedTimes = new Set(
        bookedAppointments?.map(app => {
          const timeStr = app.appointment_time
          return timeStr.substring(0, 5)
        }) || []
      )

      // Filter out already booked times
      const availableTimeSlots = data.data.availableTimeSlots.filter(
        (time: string) => !bookedTimes.has(time)
      )

      setAvailableTimes(availableTimeSlots)
    } catch (error) {
      console.error('Error fetching available times:', error)
      toast.error('Failed to load available times')
      setAvailableTimes([])
    } finally {
      setIsLoadingTimes(false)
    }
  }

  const handleGroomerChange = (groomerId: string) => {
    setSelectedGroomer(groomerId)
    setSelectedTime("") // Reset selected time when groomer changes
    if (selectedDate) {
      fetchAvailableTimes(groomerId, selectedDate)
    }
  }

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const date = event.target.value
    setSelectedDate(date)
    setSelectedTime("") // Reset selected time when date changes
    if (selectedGroomer) {
      fetchAvailableTimes(selectedGroomer, date)
    }
  }

  const handleTimeChange = (time: string) => {
    setSelectedTime(time)
  }

  const handlePetChange = (pet: string) => {
    setSelectedPet(pet)
  }

  const handleServiceChange = (serviceId: string) => {
    // Toggle service selection
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId)
      } else {
        return [...prev, serviceId]
      }
    })
  }

  const handleBookAppointment = async () => {
    if (!selectedGroomer || !selectedDate || !selectedTime || !selectedPet || selectedServices.length === 0) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsBooking(true)
    try {
      // Get current user's profile
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('User not authenticated')
      }

      // Get user's profile data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (userError) throw userError

      // Get selected pet data
      const selectedPetData = pets.find(pet => pet.name === selectedPet)
      if (!selectedPetData) {
        throw new Error('Selected pet not found')
      }

      // Get selected groomer details
      const selectedGroomerData = groomers.find(groomer => groomer.id === selectedGroomer)
      if (!selectedGroomerData) {
        throw new Error('Selected groomer not found')
      }

      // Get all selected service details
      const selectedServiceDetails = selectedServices.map(serviceId => {
        const service = services.find(s => s.id === serviceId)
        if (!service) {
          throw new Error(`Service with ID ${serviceId} not found`)
        }
        return service
      })

      // Calculate total price from all selected services
      const total = selectedServiceDetails.reduce((sum, service) => sum + service.price, 0)

      const appointmentData = {
        employee: { id: selectedGroomer },
        employee_name: selectedGroomerData.name,
        services: selectedServices,
        service_items: selectedServiceDetails.map(service => service.name),
        date: selectedDate,
        time: selectedTime,
        startTime: new Date(`${selectedDate}T${selectedTime}`).getTime(),
        endTime: new Date(`${selectedDate}T${selectedTime}`).getTime() + (60 * 60 * 1000), // 1 hour duration
        petName: selectedPet,
        petId: selectedPetData.id,
        userId: authUser.id,
        total,
        customer: {
          firstName: userData.first_name,
          lastName: userData.last_name,
          email: userData.email,
          phone: userData.phone || ''
        }
      }

      const response = await fetch('/api/clover/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to book appointment')
      }

      toast.success('Appointment booked successfully')
      setIsNewAppointmentOpen(false)
      
      // Reset form
      setSelectedGroomer("")
      setSelectedDate("")
      setSelectedTime("")
      setSelectedPet("")
      setSelectedServices([])
      
      // Refresh appointments list
      window.location.reload()
    } catch (error: any) {
      console.error('Error booking appointment:', error)
      toast.error(error.message || 'Failed to book appointment')
    } finally {
      setIsBooking(false)
    }
  }

  const handleDialogClose = () => {
    setIsNewAppointmentOpen(false)
    setSelectedGroomer("")
    setSelectedDate("")
    setSelectedTime("")
    setSelectedPet("")
    setSelectedServices([])
    setAvailableTimes([])
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

  // Calculate total duration of selected services
  const calculateTotalDuration = useCallback((selectedServiceIds: string[]): number => {
    // Find the selected services from the services array
    const selectedServicesDetails = selectedServiceIds
      .map(serviceId => services.find(s => s.id === serviceId))
      .filter((service): service is Service => service !== undefined)

    // Get duration from service name or use default 30 minutes
    return selectedServicesDetails.reduce((total, service) => {
      // Try to extract duration from service name (e.g., "Service Name - 45 min")
      const durationMatch = service.name.match(/(\d+)\s*min/i)
      return total + (durationMatch ? parseInt(durationMatch[1]) : 30)
    }, 0)
  }, [services])

  // Filter services based on search query and pet size
  const filteredServices = services.filter((service) => {
    // First check if service matches the pet size
    if (selectedPet) {
      const selectedPetDetails = pets.find(pet => pet.name === selectedPet)
      if (!isServiceMatchingPetSize(service.name, selectedPetDetails?.size)) {
        return false
      }
    }

    // Then apply search filter if there's a search query
    if (serviceSearchQuery === "") return true
    
    const searchTerms = serviceSearchQuery.toLowerCase()
    const serviceName = service.name.toLowerCase()
    const serviceDescription = (service.description || '').toLowerCase()
    
    return serviceName.includes(searchTerms) || serviceDescription.includes(searchTerms)
  })

  // Update useEffect for fetching available times
  useEffect(() => {
    const fetchAvailableTimes = async () => {
      // Reset times when dependencies change
      setAvailableTimes([])
      setSelectedTime("")

      if (!selectedDate || !selectedGroomer || !selectedServices.length) {
        console.log('Missing required fields for fetching times:', {
          hasDate: !!selectedDate,
          hasGroomer: !!selectedGroomer,
          servicesCount: selectedServices.length
        })
        return
      }

      setIsLoadingTimes(true)
      try {
        // Calculate total duration of selected services
        const totalDuration = calculateTotalDuration(selectedServices)

        console.log('Fetching available times with params:', {
          date: selectedDate,
          groomerId: selectedGroomer,
          duration: totalDuration,
          selectedServices: selectedServices
        })

        // Get all possible time slots from the availability endpoint
        const response = await fetch(
          `/api/clover/availability?date=${selectedDate}&groomerId=${selectedGroomer}&duration=${totalDuration}`
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

        if (!data.data.availableTimeSlots || data.data.availableTimeSlots.length === 0) {
          console.log('No available time slots returned from the API')
        } else {
          console.log('Available time slots:', data.data.availableTimeSlots)
        }

        setAvailableTimes(data.data.availableTimeSlots || [])
      } catch (error) {
        console.error('Error fetching availability:', error)
        toast.error('Failed to fetch available times')
        setAvailableTimes([])
      } finally {
        setIsLoadingTimes(false)
      }
    }

    fetchAvailableTimes()
  }, [selectedDate, selectedGroomer, selectedServices, calculateTotalDuration])

  return (
    <div className="flex h-screen w-full bg-slate-50">
      <aside className="w-64 bg-slate-800 text-white p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-8 w-8 bg-primary rounded-full" />
          <h1 className="text-xl font-bold">The Pet Bodega</h1>
        </div>

        <nav className="space-y-2">
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
          className="text-white/80 hover:text-white mt-auto absolute bottom-6 left-6"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5 mr-2" aria-hidden="true" />
          <span>Log out</span>
        </Button>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">My Appointments</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search appointments..." 
                className="w-64 pl-9"
              />
            </div>
            <Button 
              onClick={handleNewAppointment}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Appointment
            </Button>
            <Button 
              size="icon" 
              variant="ghost"
              onClick={handleProfileClick}
              className="hover:bg-slate-200 transition-colors"
            >
              <span className="sr-only">User menu</span>
              <div className="h-8 w-8 rounded-full bg-slate-200" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-[200px]">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                  <CalendarIcon className="h-8 w-8 mb-2" />
                  <p>No upcoming appointments</p>
                  <Button 
                    variant="link" 
                    onClick={handleNewAppointment}
                    className="mt-2"
                  >
                    Schedule your first appointment
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 relative rounded-full overflow-hidden bg-primary/10">
                          {appointment.pet_image_url ? (
                            <Image
                              src={appointment.pet_image_url}
                              alt={appointment.pet_name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <PawPrint className="h-6 w-6 text-primary" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">
                            {Array.isArray(appointment.service_items) && appointment.service_items.length > 0
                              ? appointment.service_items.join(', ')
                              : appointment.service_type || 'No service specified'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {appointment.pet_name} • {appointment.appointment_date} at {convertTo12Hour(appointment.appointment_time)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Groomer: {appointment.employee_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          Reschedule
                        </Button>
                        <Button variant="destructive" size="sm">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Past Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No past appointments
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog 
        open={isNewAppointmentOpen} 
        onOpenChange={(open) => {
          if (!open) handleDialogClose()
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pet">Pet</Label>
              <Select onValueChange={handlePetChange} value={selectedPet}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingPets ? "Loading pets..." : "Select a pet"} />
                </SelectTrigger>
                <SelectContent>
                  {pets.map((pet) => (
                    <SelectItem key={pet.id} value={pet.name}>
                      {pet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="services">Services</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="justify-between w-full"
                  >
                    {selectedServices.length > 0
                      ? `${selectedServices.length} service${selectedServices.length > 1 ? 's' : ''} selected`
                      : "Select services..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-2">
                  <div className="flex items-center border-b px-3 pb-2">
                    <Input
                      placeholder="Search services..."
                      value={serviceSearchQuery}
                      onChange={(e) => setServiceSearchQuery(e.target.value)}
                      className="border-0 focus:ring-0"
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto pt-2">
                    {isLoadingServices ? (
                      <div className="text-sm text-muted-foreground p-2">
                        Loading services...
                      </div>
                    ) : !selectedPet ? (
                      <div className="text-sm text-muted-foreground p-2">
                        Please select a pet first to see available services
                      </div>
                    ) : filteredServices.length === 0 ? (
                      <div className="text-sm text-muted-foreground p-2">
                        {serviceSearchQuery ? "No matching services found" : "No services available"}
                      </div>
                    ) : (
                      <>
                        <div className="px-2 py-1 text-xs text-muted-foreground">
                          {(() => {
                            const selectedPetDetails = pets.find(pet => pet.name === selectedPet)
                            return selectedPetDetails 
                              ? `Showing services for ${selectedPetDetails.name} (${getSizeCategory(selectedPetDetails.size)} size)`
                              : 'Showing all services'
                          })()}
                        </div>
                        {filteredServices.map((service) => (
                          <div
                            key={service.id}
                            className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                            onClick={() => {
                              setSelectedServices((prev) => {
                                const isSelected = prev.includes(service.id)
                                if (isSelected) {
                                  return prev.filter((id) => id !== service.id)
                                } else {
                                  return [...prev, service.id]
                                }
                              })
                            }}
                          >
                            <div className={cn(
                              "h-4 w-4 border rounded-sm flex items-center justify-center",
                              selectedServices.includes(service.id) && "bg-primary border-primary"
                            )}>
                              {selectedServices.includes(service.id) && (
                                <Check className="h-3 w-3 text-primary-foreground" />
                              )}
                            </div>
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
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="groomer">Groomer</Label>
              <Select onValueChange={handleGroomerChange}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingGroomers ? "Loading groomers..." : "Select a groomer"} />
                </SelectTrigger>
                <SelectContent>
                  {groomers.map((groomer) => (
                    <SelectItem key={groomer.id} value={groomer.id}>
                      {groomer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date">Appointment Date</Label>
              <Input
                type="date"
                id="date"
                className="w-full"
                value={selectedDate}
                onChange={handleDateChange}
                min={new Date().toISOString().split('T')[0]} // Prevent past dates
              />
            </div>

            {(selectedGroomer && selectedDate) && (
              <div className="grid gap-2">
                <Label htmlFor="time">Appointment Time</Label>
                <Select 
                  disabled={isLoadingTimes || availableTimes.length === 0 || !selectedServices.length}
                  onValueChange={handleTimeChange}
                  value={selectedTime}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !selectedServices.length 
                        ? "Select services first"
                        : isLoadingTimes
                          ? "Loading available times..."
                          : availableTimes.length === 0
                            ? "No available times"
                            : "Select time"
                    } />
                  </SelectTrigger>
                  <SelectContent 
                    className="max-h-[300px] overflow-y-auto"
                    align="start"
                    side="top"
                    position="popper"
                  >
                    <div className="grid grid-cols-2 gap-2 p-2">
                      {!selectedServices.length ? (
                        <div className="col-span-2 text-sm text-muted-foreground p-2">
                          Please select services first
                        </div>
                      ) : isLoadingTimes ? (
                        <div className="col-span-2 text-sm text-muted-foreground p-2">
                          Loading available times...
                        </div>
                      ) : availableTimes.length === 0 ? (
                        <div className="col-span-2 text-sm text-muted-foreground p-2">
                          No available times for selected date
                        </div>
                      ) : (
                        availableTimes
                          .sort((a, b) => {
                            // Convert times to comparable format for sorting
                            const timeA = new Date(`2000/01/01 ${a}`).getTime()
                            const timeB = new Date(`2000/01/01 ${b}`).getTime()
                            return timeA - timeB
                          })
                          .map((time) => (
                            <SelectItem 
                              key={time} 
                              value={time}
                              className="cursor-pointer rounded-sm"
                            >
                              {convertTo12Hour(time)}
                            </SelectItem>
                          ))
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNewAppointmentOpen(false)}
              disabled={isBooking}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBookAppointment}
              disabled={isBooking || !selectedGroomer || !selectedDate || !selectedTime || !selectedPet || selectedServices.length === 0}
            >
              {isBooking ? "Booking..." : "Book Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 