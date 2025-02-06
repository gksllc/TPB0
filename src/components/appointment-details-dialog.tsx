import React, { useCallback, useEffect } from 'react'

const AppointmentDetailsDialog: React.FC = () => {
  const calculateTotalDuration = useCallback((selectedServiceIds: string[]) => {
    const selectedServices = availableServices.filter(service => selectedServiceIds.includes(service.id))
    return selectedServices.reduce((total, service) => {
      const durationMatch = service.name.match(/(\d+)\s*min/i)
      return total + (durationMatch ? parseInt(durationMatch[1]) : 30)
    }, 0)
  }, [availableServices])

  useEffect(() => {
    if (open && isEditing && (!employees.length || !availableServices.length)) {
      fetchEmployees()
      fetchServices()
    }
  }, [open, isEditing, employees.length, availableServices.length, fetchServices])

  return (
    // Rest of the component code
  )
}

export default AppointmentDetailsDialog 