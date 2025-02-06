'use client'

import { useState, useEffect } from 'react'
import { format, isSameDay, isAfter, parse } from 'date-fns'
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/database.types"
import { toast } from "sonner"

interface NewAppointmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface Customer {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
}

interface Pet {
  id: string
  name: string
  breed?: string | null
  user_id: string
  size?: string | null
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

export function NewAppointmentDialog({
  open,
  onOpenChange,
  onSuccess
}: NewAppointmentDialogProps) {
  const [date, setDate] = useState<Date>()
  const [time, setTime] = useState<string>()
  const [petName, setPetName] = useState('')
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null)
  const [customerPets, setCustomerPets] = useState<Pet[]>([])
  const [services, setServices] = useState<string[]>([])
  const [employee, setEmployee] = useState<{id: string, name: string} | null>(null)
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [employees, setEmployees] = useState<Array<{id: string, name: string}>>([])
  const [availableServices, setAvailableServices] = useState<Array<{id: string, name: string}>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)
  const [isLoadingServices, setIsLoadingServices] = useState(false)
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
  const [allCustomers, setAllCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false)
  const [customerSearchQuery, setCustomerSearchQuery] = useState("")
  const [serviceSearchQuery, setServiceSearchQuery] = useState("")
  const [isLoadingTimes, setIsLoadingTimes] = useState(false)
  const supabase = createClientComponentClient<Database>()

  // Fetch employees, services, and customers when dialog opens
  useEffect(() => {
    if (open) {
      fetchEmployees()
      fetchServices()
      fetchCustomers()
    } else {
      // Reset search queries when dialog closes
      setCustomerSearchQuery("")
      setServiceSearchQuery("")
    }
  }, [open, fetchEmployees, fetchServices, fetchCustomers])

  // Fetch customers from Supabase
  const fetchCustomers = async () => {
    if (isLoadingCustomers || allCustomers.length > 0) return
    
    setIsLoadingCustomers(true)
    try {
      console.log('Fetching customers from Supabase...')
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone
        `)
        .eq('role', 'client')
        .order('first_name', { ascending: true })
      
      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      console.log('Fetched customers:', data)
      if (!data || data.length === 0) {
        console.log('No customers found in the database')
      }
      
      setAllCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Failed to fetch customers')
    } finally {
      setIsLoadingCustomers(false)
    }
  }

  // Fetch employees
  const fetchEmployees = async () => {
    if (isLoadingEmployees || employees.length > 0) return
    
    setIsLoadingEmployees(true)
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
    } finally {
      setIsLoadingEmployees(false)
    }
  }

  // Fetch services
  const fetchServices = async () => {
    if (isLoadingServices || availableServices.length > 0) return
    
    setIsLoadingServices(true)
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
    } finally {
      setIsLoadingServices(false)
    }
  }

  // Fetch customer's pets when a customer is selected
  useEffect(() => {
    const fetchCustomerPets = async () => {
      if (!selectedCustomer) {
        setCustomerPets([])
        setSelectedPet(null)
        return
      }

      try {
        const { data: pets, error } = await supabase
          .from('pets')
          .select('*')
          .eq('user_id', selectedCustomer.id)
          .order('name', { ascending: true })

        if (error) throw error

        console.log('Fetched pets:', pets)
        setCustomerPets(pets || [])

        // Auto-select if there's only one pet
        if (pets && pets.length === 1) {
          setSelectedPet(pets[0])
          setPetName(pets[0].name)
        } else {
          setSelectedPet(null)
          setPetName('')
        }
      } catch (error) {
        console.error('Error fetching pets:', error)
        toast.error('Failed to fetch pets')
      }
    }

    fetchCustomerPets()
  }, [selectedCustomer, supabase])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setDate(undefined)
      setTime(undefined)
      setPetName('')
      setSelectedPet(null)
      setServices([])
      setEmployee(null)
      setAvailableTimes([])
      setSelectedCustomer(null)
      setCustomerPets([])
    }
  }, [open])

  // Calculate total duration of selected services
  const calculateTotalDuration = (selectedServiceIds: string[]): number => {
    const selectedServices = availableServices.filter(service => selectedServiceIds.includes(service.id))
    // Get duration from service name or use default 30 minutes
    return selectedServices.reduce((total, service) => {
      // Try to extract duration from service name (e.g., "Service Name - 45 min")
      const durationMatch = service.name.match(/(\d+)\s*min/i)
      return total + (durationMatch ? parseInt(durationMatch[1]) : 30)
    }, 0)
  }

  // Fetch available times when date, employee, and services are selected
  useEffect(() => {
    const fetchAvailableTimes = async () => {
      // Reset times when dependencies change
      setAvailableTimes([])
      setTime(undefined)

      if (!date || !employee || !services.length) {
        return
      }

      setIsLoadingTimes(true)
      try {
        // Calculate total duration of selected services
        const totalDuration = calculateTotalDuration(services)
        const formattedDate = format(date, 'yyyy-MM-dd')

        const response = await fetch(
          `/api/clover/availability?date=${formattedDate}&groomerId=${employee.id}&duration=${totalDuration}`
        )
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error('Failed to fetch availability')
        }
        
        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch availability')
        }

        let availableSlots = data.data.availableTimeSlots || []

        // If it's the same day, filter out past times
        if (isSameDay(date, new Date())) {
          const now = new Date()
          availableSlots = availableSlots.filter(timeSlot => {
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

        setAvailableTimes(availableSlots)
      } catch (error) {
        console.error('Error fetching availability:', error)
        toast.error('Failed to fetch available times')
        setAvailableTimes([])
      } finally {
        setIsLoadingTimes(false)
      }
    }

    fetchAvailableTimes()
  }, [date, employee, services, calculateTotalDuration])

  const handleSubmit = async () => {
    if (!date || !time || !selectedPet || !services.length || !employee || !selectedCustomer) {
      toast.error('Please fill in all required fields')
      return
    }

    console.log('Form Values:', {
      customer: selectedCustomer,
      pet: selectedPet,
      services,
      employee,
      date,
      time
    })

    setIsLoading(true)
    try {
      // Get service details for the selected services
      const selectedServiceDetails = availableServices
        .filter(service => services.includes(service.id))
        .map(service => ({
          id: service.id,
          name: service.name,
          price: service.price || 0
        }))

      // Calculate total price and duration
      const total = selectedServiceDetails.reduce((sum, service) => sum + service.price, 0)
      const totalDuration = calculateTotalDuration(services)

      // Parse the selected date and time
      const [hours, minutes] = time.split(' ')[0].split(':').map(Number)
      const period = time.split(' ')[1]
      let adjustedHours = hours
      if (period === 'PM' && hours !== 12) {
        adjustedHours += 12
      } else if (period === 'AM' && hours === 12) {
        adjustedHours = 0
      }

      // Create a date string in ISO format with the local timezone
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const timeString = `${String(adjustedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      
      // Create the appointment data
      const appointmentData = {
        customer: {
          id: selectedCustomer.id,
          firstName: selectedCustomer.first_name || '',
          lastName: selectedCustomer.last_name || '',
          email: selectedCustomer.email,
          phone: selectedCustomer.phone || ''
        },
        employee: {
          id: employee.id,
          name: employee.name
        },
        employee_name: employee.name,
        petId: selectedPet.id,
        petName: selectedPet.name,
        services: services,
        service_items: selectedServiceDetails.map(service => service.name),
        date: `${year}-${month}-${day}`,
        time: timeString,
        total,
        duration: totalDuration
      }

      console.log('Submitting appointment data:', appointmentData)

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create appointment')
      }

      toast.success('Appointment created successfully')
      onSuccess?.()
      onOpenChange(false)
      
      // Reset form
      setDate(undefined)
      setTime(undefined)
      setPetName('')
      setServices([])
      setEmployee(null)
      setSelectedCustomer(null)
      setSelectedPet(null)
    } catch (error: any) {
      console.error('Error creating appointment:', error)
      toast.error(error.message || 'Failed to create appointment')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter customers based on search query
  const filteredCustomers = allCustomers.filter((customer) => {
    if (customerSearchQuery === "") return true
    
    const searchTerms = customerSearchQuery.toLowerCase()
    const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase()
    const email = customer.email.toLowerCase()
    
    return fullName.includes(searchTerms) || email.includes(searchTerms)
  })

  // Filter services based on search query and pet size
  const filteredServices = availableServices.filter((service) => {
    // First check if service matches the pet size
    if (selectedPet && !isServiceMatchingPetSize(service.name, selectedPet.size)) {
      return false
    }

    // Then apply search filter if there's a search query
    if (serviceSearchQuery === "") return true
    
    const searchTerms = serviceSearchQuery.toLowerCase()
    const serviceName = service.name.toLowerCase()
    const serviceDescription = (service.description || '').toLowerCase()
    
    return serviceName.includes(searchTerms) || serviceDescription.includes(searchTerms)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
          <DialogDescription>
            Create a new appointment. Fill in all the required information.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label>Customer</label>
            <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={customerSearchOpen}
                  className="justify-between w-full"
                >
                  {selectedCustomer ? 
                    `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim() || 'Unnamed Customer' : 
                    "Select customer..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <div className="flex items-center border-b px-3">
                  <Input
                    placeholder="Search customers..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="border-0 focus:ring-0"
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {filteredCustomers.length === 0 ? (
                    <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none text-muted-foreground">
                      No customers found.
                    </div>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className={cn(
                          "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer",
                          selectedCustomer?.id === customer.id && "bg-accent text-accent-foreground"
                        )}
                        onClick={() => {
                          setSelectedCustomer(customer)
                          setCustomerSearchOpen(false)
                          setCustomerSearchQuery("")
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div>
                          <div>
                            {`${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed Customer'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {customer.email}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <label>Pet</label>
            <Select
              value={selectedPet?.id}
              onValueChange={(value) => {
                const pet = customerPets.find(p => p.id === value)
                if (pet) {
                  setSelectedPet(pet)
                  setPetName(pet.name)
                }
              }}
              disabled={!selectedCustomer || customerPets.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedCustomer 
                    ? "Select a customer first" 
                    : customerPets.length === 0 
                      ? "No pets found" 
                      : "Select a pet"
                } />
              </SelectTrigger>
              <SelectContent>
                {customerPets.map((pet) => (
                  <SelectItem key={pet.id} value={pet.id}>
                    {pet.name}
                    {pet.breed && <span className="text-muted-foreground ml-2">({pet.breed})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label>Services</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="justify-between w-full"
                >
                  {services.length > 0
                    ? `${services.length} service${services.length > 1 ? 's' : ''} selected`
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
                        Showing services for {selectedPet.name} ({getSizeCategory(selectedPet.size)} size)
                      </div>
                      {filteredServices.map((service) => (
                        <div
                          key={service.id}
                          className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                          onClick={() => {
                            setServices((prev) => {
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
                            services.includes(service.id) && "bg-primary border-primary"
                          )}>
                            {services.includes(service.id) && (
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
            <label>Date</label>
            <Input
              type="date"
              value={date ? format(date, "yyyy-MM-dd") : ''}
              onChange={(e) => {
                if (e.target.value) {
                  // Create date at noon to avoid timezone issues
                  const [year, month, day] = e.target.value.split('-').map(Number)
                  const selectedDate = new Date(year, month - 1, day, 12, 0, 0)
                  setDate(selectedDate)
                } else {
                  setDate(undefined)
                }
              }}
              min={format(new Date(), "yyyy-MM-dd")}
            />
          </div>

          <div className="grid gap-2">
            <label>Employee</label>
            <Select
              value={employee?.id}
              onValueChange={(value) => {
                const emp = employees.find(e => e.id === value)
                setEmployee(emp || null)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {date && employee && (
            <div className="grid gap-2">
              <label>Time</label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    !services.length 
                      ? "Select services first"
                      : isLoadingTimes
                        ? "Loading available times..."
                        : "Select time"
                  } />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  {!services.length ? (
                    <div className="text-sm text-muted-foreground p-2">
                      Please select services first
                    </div>
                  ) : isLoadingTimes ? (
                    <div className="text-sm text-muted-foreground p-2">
                      Loading available times...
                    </div>
                  ) : availableTimes.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-2">
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
                      .map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : "Create Appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 