import { useState, useEffect } from 'react'
import { cloverApi } from '@/lib/clover-api'

interface Employee {
  id: string
  name: string
  role?: string
  nickname?: string
}

interface Service {
  id: string
  name: string
  price: number
  description?: string
}

export function useAppointmentData() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [availableServices, setAvailableServices] = useState<Service[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch employees
        const employeesResponse = await cloverApi.get('/employees')
        if (!employeesResponse.ok) {
          throw new Error('Failed to fetch employees')
        }
        const employeesData = await employeesResponse.json()
        
        // Filter for employees with customId 'GROOMER'
        const groomers = employeesData.data
          .filter((emp: any) => emp.customId === 'GROOMER')
          .map((emp: any) => ({
            id: emp.id,
            name: emp.name,
            role: emp.role || 'Groomer',
            nickname: emp.nickname
          }))
        
        setEmployees(groomers)

        // Fetch services
        const servicesResponse = await cloverApi.get('/items')
        if (!servicesResponse.ok) {
          throw new Error('Failed to fetch services')
        }
        const servicesData = await servicesResponse.json()
        
        if (!servicesData.success || !servicesData.data) {
          throw new Error('Invalid services response')
        }
        
        const formattedServices = servicesData.data.map((service: any) => ({
          id: service.id,
          name: service.name,
          price: service.price || 0,
          description: service.description || ''
        }))

        setAvailableServices(formattedServices)
        setFetchError(null)
      } catch (error) {
        console.error('Error fetching data:', error)
        setFetchError(error instanceof Error ? error.message : 'Failed to fetch data')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchData()
  }, [])

  return {
    employees,
    availableServices,
    fetchError,
    isLoading
  }
} 