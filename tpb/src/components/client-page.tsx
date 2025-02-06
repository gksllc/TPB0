"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Calendar, PawPrint, History, CreditCard, Settings, LogOut, Plus, Scissors, Clock, Pencil } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createClientComponentClient } from '@supabase/ssr'
import { toast } from "sonner"
import type { Database } from "@/lib/database.types"
import { useEffect, useState } from 'react'
import { formatPhoneNumber } from "@/lib/utils"
import Image from 'next/image'

type Appointment = {
  id: string
  c_order_id?: string
  user_id: string
  pet_id: string
  pet_name: string
  service_type: string
  service_items: string[]
  status: string
  appointment_date: string
  appointment_time: string
  employee_id: string
  employee_name: string
  pet_image_url: string | null
}

type Pet = {
  id: string
  name: string
  breed: string
  user_id: string
  dob: string
  weight?: string
  image_url?: string | null
}

type UserProfile = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
}

const calculateAge = (dob: string): number => {
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  // Adjust age if birthday hasn't occurred this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

export function ClientPage() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  const [petsCount, setPetsCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [pets, setPets] = useState<Pet[]>([])

  useEffect(() => {
    const fetchPets = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch pets for current user
        const { data, error } = await supabase
          .from('pets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        setPets(data || [])
        setPetsCount(data?.length ?? 0)
      } catch (error) {
        console.error('Error fetching pets:', error)
        toast.error('Failed to fetch pets data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPets()
  }, [supabase])

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) {
          console.log('No authenticated user found')
          return
        }

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

        if (error) throw error

        // Transform the data to match our Appointment type
        const transformedAppointments = (data || []).map(rawData => {
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
            pet_image_url: Array.isArray(rawData.pets) && rawData.pets.length > 0 ? rawData.pets[0].image_url : null
          }
        })

        setAppointments(transformedAppointments)
      } catch (error) {
        console.error('Error fetching appointments:', error)
        toast.error("Failed to fetch appointments")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAppointments()
  }, [supabase])

  const convertTo12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/client" },
    { icon: Calendar, label: "My Appointments", href: "/client/appointments" },
    { icon: PawPrint, label: "My Pets", href: "/client/pets" },
    { icon: History, label: "Grooming History", href: "/client/history" },
    { icon: Settings, label: "Settings", href: "/client/profile" },
  ]

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

  const handleProfileClick = () => {
    router.push('/client/profile')
  }

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
          <h1 className="text-2xl font-bold">Welcome</h1>
          <div className="flex items-center gap-4">
            <Input 
              type="search" 
              placeholder="Search..." 
              className="w-64"
            />
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                  <Calendar className="h-8 w-8 mb-2" />
                  <p>No upcoming appointments</p>
                  <Button 
                    variant="link" 
                    onClick={() => router.push('/client/appointments')}
                    className="mt-2"
                  >
                    Schedule an appointment
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
                              <Clock className="h-6 w-6 text-primary" />
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
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Pets Registered
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/client/pets')}
              >
                View all
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-[200px]">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : pets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                  <PawPrint className="h-8 w-8 mb-2" />
                  <p>No pets registered</p>
                  <Button 
                    variant="link" 
                    onClick={() => router.push('/client/pets')}
                    className="mt-2"
                  >
                    Add your first pet
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {pets.slice(0, 3).map((pet) => (
                    <div
                      key={pet.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 relative rounded-full overflow-hidden bg-primary/10">
                          {pet.image_url ? (
                            <Image
                              src={pet.image_url}
                              alt={pet.name}
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
                          <h3 className="font-medium">{pet.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {pet.breed} • {calculateAge(pet.dob)} years old
                          </p>
                          {pet.weight && (
                            <p className="text-sm text-muted-foreground">
                              Weight: {pet.weight} lbs
                            </p>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          // Store the pet ID in localStorage to trigger edit mode
                          localStorage.setItem('editPetId', pet.id)
                          router.push('/client/pets')
                        }}
                      >
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                    </div>
                  ))}
                  {pets.length > 3 && (
                    <Button 
                      variant="link" 
                      className="w-full text-center"
                      onClick={() => router.push('/client/pets')}
                    >
                      View {pets.length - 3} more pets
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No recent activity
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Book Appointment
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Scissors className="mr-2 h-4 w-4" />
                Grooming Packages
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Pet
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
} 