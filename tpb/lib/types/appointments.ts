import { Database } from '@/lib/database.types'

export interface BaseAppointment {
  id: string
  c_order_id: string | null
  user_id: string
  pet_id: string
  service_type: string | null
  service_items: string[]
  status: string
  appointment_date: string
  appointment_time: string
  employee_id: string
  employee_name: string
  appointment_duration: number
}

export interface Pet {
  id: string
  name: string
  image_url: string | null
  size: string | null
}

export interface Customer {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  phone: string | null
}

export interface Employee {
  id: string
  name: string
  role?: string
  nickname?: string
  customId?: string
}

export interface ServiceItem {
  name: string
  price: number
}

export interface AppointmentWithRelations {
  id: string
  c_order_id: string | null
  user_id: string
  pet_id: string
  service_type: string | null
  service_items: string[]
  status: string
  appointment_date: string
  appointment_time: string
  employee_id: string
  employee_name: string
  appointment_duration: number
  created_at: string
  updated_at: string
  pet: Pet | null
  customer: Customer | null
}

export interface AppointmentCreate {
  user_id: string
  pet_id: string
  service_type: string | null
  service_items: string[]
  status: string
  appointment_date: string
  appointment_time: string
  employee_id: string
  employee_name: string
  appointment_duration: number
  customer: Customer
}

export interface AppointmentUpdate {
  id: string
  service_type?: string | null
  service_items?: string[]
  status?: string
  appointment_date?: string
  appointment_time?: string
  employee_id?: string
  employee_name?: string
  appointment_duration?: number
}

export interface AppointmentResponse {
  success: boolean
  data?: AppointmentWithRelations[]
  error?: string
} 