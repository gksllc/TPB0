'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSaveBusinessHours = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    try {
      // TODO: Implement business hours update
      toast.success('Business hours updated successfully')
    } catch (error) {
      console.error('Error updating business hours:', error)
      toast.error('Failed to update business hours')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="grid gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Business Hours</h2>
          <form onSubmit={handleSaveBusinessHours} className="space-y-4">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
              <div key={day} className="grid grid-cols-3 gap-4 items-center">
                <Label>{day}</Label>
                <div className="space-y-2">
                  <Label htmlFor={`${day.toLowerCase()}-open`}>Open</Label>
                  <Input
                    id={`${day.toLowerCase()}-open`}
                    type="time"
                    defaultValue="09:00"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${day.toLowerCase()}-close`}>Close</Label>
                  <Input
                    id={`${day.toLowerCase()}-close`}
                    type="time"
                    defaultValue="17:00"
                    disabled={isLoading}
                  />
                </div>
              </div>
            ))}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Business Hours'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
} 