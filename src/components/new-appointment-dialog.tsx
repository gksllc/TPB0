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

export function NewAppointmentDialog() {
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

  // Function declarations using function keyword for proper hoisting
  function fetchEmployees() {
    if (isLoadingEmployees || employees.length > 0) return
    
    setIsLoadingEmployees(true)
    try {
      return fetch('/api/clover/employees')
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch employees')
          return response.json()
        })
        .then(data => {
          const groomers = data.data
            .filter((emp: any) => emp.customId === 'GROOMER')
            .map((emp: any) => ({
              id: emp.id,
              name: emp.name
            }))
          
          setEmployees(groomers)
        })
        .catch(error => {
          console.error('Error fetching employees:', error)
          toast.error('Failed to fetch employees')
        })
        .finally(() => {
          setIsLoadingEmployees(false)
        })
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to fetch employees')
      setIsLoadingEmployees(false)
    }
  }

  function fetchServices() {
    if (isLoadingServices || availableServices.length > 0) return
    
    setIsLoadingServices(true)
    try {
      return fetch('/api/clover/items')
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch services')
          return response.json()
        })
        .then(data => {
          if (!data.success || !data.data) {
            throw new Error('Invalid services response')
          }
          
          const formattedServices = data.data.map((service: any) => ({
            id: service.id,
            name: service.name,
            price: service.price || 0,
            description: service.description || ''
          }))

          setAvailableServices(formattedServices)
        })
        .catch(error => {
          console.error('Error fetching services:', error)
          toast.error('Failed to fetch services')
        })
        .finally(() => {
          setIsLoadingServices(false)
        })
    } catch (error) {
      console.error('Error fetching services:', error)
      toast.error('Failed to fetch services')
      setIsLoadingServices(false)
    }
  }

  function fetchCustomers() {
    if (isLoadingCustomers || allCustomers.length > 0) return
    
    setIsLoadingCustomers(true)
    try {
      supabase
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
        .then(({ data, error }) => {
          if (error) throw error
          setAllCustomers(data || [])
        })
        .catch(error => {
          console.error('Error fetching customers:', error)
          toast.error('Failed to fetch customers')
        })
        .finally(() => {
          setIsLoadingCustomers(false)
        })
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Failed to fetch customers')
      setIsLoadingCustomers(false)
    }
  }

  function calculateTotalDuration(selectedServiceIds: string[]): number {
    const selectedServices = availableServices.filter(service => selectedServiceIds.includes(service.id))
    return selectedServices.reduce((total, service) => {
      const durationMatch = service.name.match(/(\d+)\s*min/i)
      return total + (durationMatch ? parseInt(durationMatch[1]) : 30)
    }, 0)
  }

  // Effects
  useEffect(() => {
    if (open) {
      fetchEmployees()
      fetchServices()
      fetchCustomers()
    } else {
      setCustomerSearchQuery("")
      setServiceSearchQuery("")
    }
  }, [open])

  return (
    <div>
      {/* Rest of the component code */}
    </div>
  )
}

export default NewAppointmentDialog 