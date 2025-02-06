import React, { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'

// Fetch orders from Clover
const fetchOrders = useCallback(async () => {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const response = await fetch(
      `/api/orders?start=${thirtyDaysAgo.getTime()}&end=${Date.now()}`
    )
    if (!response.ok) {
      throw new Error('Failed to fetch orders')
    }
    const data = await response.json()
    setOrders(data.data || [])
  } catch (error) {
    console.error('Error fetching orders:', error)
    toast.error('Failed to fetch orders')
  } finally {
    setIsLoading(false)
  }
}, []) // Empty dependency array since it doesn't depend on any props or state

// Only fetch appointments initially
useEffect(() => {
  fetchAppointments()
  setIsLoading(false)
}, [])

// Fetch orders only when orders tab is selected
useEffect(() => {
  if (activeTab === 'orders') {
    fetchOrders()
  }
}, [activeTab, fetchOrders])

useEffect(() => {
  if (open && isEditing) {
    if (!employees.length) {
      fetchEmployees()
    }
    if (!availableServices.length) {
      fetchServices()
    }
  }
}, [employees.length, availableServices.length]) // Remove unnecessary dependencies

// ... existing code ... 