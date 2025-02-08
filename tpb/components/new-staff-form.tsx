'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/database.types"
import { formatPhoneNumber } from "@/lib/utils"

interface NewStaffFormProps {
  onClose: () => void
  onUpdate: () => void
}

export const NewStaffForm = ({ onClose, onUpdate }: NewStaffFormProps) => {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    middle_initial: '',
    last_name: '',
    phone: '',
    primary_email: '',
    staff_role: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    const formattedValue = name === 'phone' ? formatPhoneNumber(value) : value
    
    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }))
  }

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      staff_role: value
    }))
  }

  const generateTPBEmail = (
    firstName: string,
    lastName: string,
    middleInitial: string
  ): string => {
    const firstInitial = firstName.charAt(0)
    const middleI = middleInitial ? middleInitial.charAt(0) : ''
    return `${lastName}${firstInitial}${middleI}@tpb.com`.toUpperCase()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const tpbEmail = generateTPBEmail(
        formData.first_name,
        formData.last_name,
        formData.middle_initial
      )

      // First create the staff member in Supabase
      const staffData = {
        ...formData,
        email: tpbEmail,
        primary_email: formData.primary_email
      }

      let staffId: string | undefined

      // Create staff member in database
      try {
        const response = await fetch('/api/staff', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(staffData),
        })
        
        const data = await response.json()
        if (!response.ok) {
          toast.error(data?.error || 'Failed to create staff member')
          return
        }
        staffId = data.id
      } catch (err) {
        toast.error('Failed to create staff member')
        return
      }

      // Create employee in Clover
      try {
        const cloverEmployeeData = {
          name: `${formData.first_name} ${formData.last_name}`.trim(),
          nickname: formData.first_name,
          email: formData.primary_email,
          role: formData.staff_role
        }

        const cloverResponse = await fetch('/api/clover/employee', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cloverEmployeeData),
        })

        const cloverData = await cloverResponse.json()

        if (!cloverResponse.ok || !cloverData.success) {
          // Cleanup database entry
          if (staffId) {
            await fetch(`/api/staff/${staffId}`, { method: 'DELETE' })
              .catch(() => {
                toast.error('Failed to cleanup staff member after Clover error')
              })
          }
          toast.error(cloverData?.error || 'Failed to create employee in Clover')
          return
        }

        // Success!
        toast.success('Staff member added successfully')
        onUpdate()
        onClose()

      } catch (err) {
        // Cleanup database entry on Clover error
        if (staffId) {
          await fetch(`/api/staff/${staffId}`, { method: 'DELETE' })
            .catch(() => {
              toast.error('Failed to cleanup staff member after Clover error')
            })
        }
        toast.error('Failed to create employee in Clover')
      }

    } catch (err) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-4">
          <div className="space-y-2 col-span-3">
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="First Name"
              required
            />
          </div>

          <div className="space-y-2 col-span-1">
            <Label htmlFor="middle_initial">M.I.</Label>
            <Input
              id="middle_initial"
              name="middle_initial"
              value={formData.middle_initial}
              onChange={handleChange}
              placeholder="M.I."
              maxLength={1}
              className="uppercase"
            />
          </div>

          <div className="space-y-2 col-span-3">
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Last Name"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="staff_role">Role</Label>
          <Select
            value={formData.staff_role}
            onValueChange={handleRoleChange}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="groomer">Groomer</SelectItem>
              <SelectItem value="scheduler">Scheduler</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="primary_email">Primary Email</Label>
          <Input
            id="primary_email"
            name="primary_email"
            type="email"
            value={formData.primary_email}
            onChange={handleChange}
            placeholder="Primary Email"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="123-456-7890"
            required
            maxLength={12}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add Staff Member'}
        </Button>
      </div>
    </form>
  )
} 