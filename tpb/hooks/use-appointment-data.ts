import { useState, useEffect, useCallback } from 'react'
import { cloverApi } from '@/lib/clover-api'
import { toast } from 'sonner'

interface Employee {
  id: string
  name: string
  role?: string
  nickname?: string
  customId?: string
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
  const [isInitialized, setIsInitialized] = useState(false)

  const fetchData = useCallback(async (forceFresh = false) => {
    // If already initialized or loading, don't fetch again unless forced
    if ((isInitialized && !forceFresh) || isLoading) return

    setIsLoading(true)
    setFetchError(null)

    try {
      // Use longer cache duration for initial load, shorter for refreshes
      const cacheDuration = forceFresh ? 30000 : 5 * 60 * 1000 // 30 seconds vs 5 minutes

      // Fetch employees and services in parallel with retry options
      const [employeesData, servicesData] = await Promise.all([
        cloverApi.get('employees', {
          cacheDuration,
          retries: 5 // More retries for important data
        }),
        cloverApi.get('items', {
          cacheDuration,
          retries: 5
        })
      ])

      if (!employeesData.success || !employeesData.data) {
        throw new Error(employeesData.error || 'Invalid employee data received')
      }

      if (!servicesData.success || !servicesData.data) {
        throw new Error(servicesData.error || 'Invalid service data received')
      }

      // Filter for employees with customId 'GROOMER'
      const groomers = employeesData.data
        .filter((emp: Employee) => emp.customId === 'GROOMER')
        .map((emp: Employee) => ({
          id: emp.id,
          name: emp.name,
          role: emp.role || 'Groomer',
          nickname: emp.nickname
        }))

      setEmployees(groomers)

      const formattedServices = servicesData.data.map((service: any) => ({
        id: service.id,
        name: service.name,
        price: service.price || 0,
        description: service.description || ''
      }))

      setAvailableServices(formattedServices)
      setFetchError(null)
      setIsInitialized(true)
    } catch (error) {
      console.error('Error fetching data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data'
      setFetchError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [isInitialized, isLoading])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const refresh = useCallback(async () => {
    // Clear cache when manually refreshing
    cloverApi.clearCache()
    await fetchData(true)
  }, [fetchData])

  return {
    employees,
    availableServices,
    fetchError,
    isLoading,
    refresh
  }
} 