import React, { useCallback, useEffect, useState } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'
import { toast } from 'react-hot-toast'

interface Employee {
  id: string
  name: string
}

interface Service {
  id: string
  name: string
  price: number
  description: string
}

interface Customer {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
}

export const NewAppointmentDialog = () => {
  const supabase = useSupabase()
  
  // State declarations
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
  const [allCustomers, setAllCustomers] = useState<Customer[]>([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoadingServices, setIsLoadingServices] = useState(false)
  const [availableServices, setAvailableServices] = useState<Service[]>([])
  const [customerSearchQuery, setCustomerSearchQuery] = useState("")
  const [serviceSearchQuery, setServiceSearchQuery] = useState("")
  const [open, setOpen] = useState(false)

  const fetchCustomers = useCallback(async () => {
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
      
      setAllCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Failed to fetch customers')
    } finally {
      setIsLoadingCustomers(false)
    }
  }, [isLoadingCustomers, allCustomers.length, supabase])

  const fetchEmployees = useCallback(async () => {
    if (isLoadingEmployees || employees.length > 0) return
    
    setIsLoadingEmployees(true)
    try {
      const response = await fetch('/api/clover/employees')
      if (!response.ok) throw new Error('Failed to fetch employees')
      const data = await response.json()
      
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
  }, [isLoadingEmployees, employees.length])

  const fetchServices = useCallback(async () => {
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
  }, [isLoadingServices, availableServices.length])

  const calculateTotalDuration = useCallback((selectedServiceIds: string[]): number => {
    const selectedServices = availableServices.filter(service => selectedServiceIds.includes(service.id))
    return selectedServices.reduce((total, service) => {
      const durationMatch = service.name.match(/(\d+)\s*min/i)
      return total + (durationMatch ? parseInt(durationMatch[1]) : 30)
    }, 0)
  }, [availableServices])

  useEffect(() => {
    if (open) {
      fetchCustomers()
      fetchEmployees()
      fetchServices()
    } else {
      setCustomerSearchQuery("")
      setServiceSearchQuery("")
    }
  }, [open, fetchCustomers, fetchEmployees, fetchServices])

  return (
    <div>
      {/* Rest of the component code */}
    </div>
  )
}

export default NewAppointmentDialog 