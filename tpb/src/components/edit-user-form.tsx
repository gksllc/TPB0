'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/database.types"
import { X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatPhoneNumber } from "@/lib/utils"

interface Pet {
  id: string
  created_at: string
  name: string
  breed: string | null
  age: number | null
  user_id: string
  weight: string | null
}

interface EditUserFormProps {
  user: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    zip_code: string | null
  }
  onClose: () => void
  onUpdate: () => void
}

interface NewDog {
  name: string
  dob: string
  breed: string
  gender: string
  weight: string
}

export const EditUserForm = ({ user, onClose, onUpdate }: EditUserFormProps) => {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    email: user.email,
    phone: user.phone || '',
    address: user.address || '',
    city: user.city || '',
    state: user.state || '',
    zip_code: user.zip_code || '',
  })
  const [showNewDogForm, setShowNewDogForm] = useState(false)
  const [newDog, setNewDog] = useState<NewDog>({
    name: '',
    dob: '',
    breed: '',
    gender: '',
    weight: ''
  })

  useEffect(() => {
    const fetchPets = async () => {
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          console.error('Session error:', sessionError)
          return
        }

        console.log('Session:', session)
        console.log('User ID being queried:', user.id)

        // Updated query to use user_id instead of owner_id
        const { data: petsData, error: petsError } = await supabase
          .from('pets')
          .select('*')
          .eq('user_id', user.id)
          .throwOnError()

        if (petsError) {
          console.error('Pets query error:', {
            error: petsError,
            message: petsError.message,
            details: petsError.details,
            hint: petsError.hint,
            code: petsError.code
          })
          toast.error('Failed to load pets')
          return
        }

        console.log('Pets data:', petsData)
        setPets(petsData || [])

      } catch (error) {
        // Log the complete error
        if (error instanceof Error) {
          console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause
          })
        } else {
          console.error('Unknown error:', error)
        }
        toast.error('Failed to load pets')
      }
    }

    if (user?.id) {
      fetchPets()
    }
  }, [supabase, user?.id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    // Format phone number if this is the phone field
    const formattedValue = name === 'phone' ? formatPhoneNumber(value) : value
    
    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('Starting update with data:', formData)

      // Update all user fields
      const { data, error } = await supabase
        .from('users')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code
        })
        .eq('id', user.id)
        .select()

      if (error) {
        console.error('Update error:', error)
        toast.error(`Failed to update user: ${error.message}`)
        return
      }

      console.log('Update successful:', data)
      toast.success('User updated successfully')
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error details:', error)
      if (error instanceof Error) {
        toast.error(`Error updating user: ${error.message}`)
      } else {
        toast.error('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNewDog = async () => {
    if (!newDog.name || !newDog.dob || !newDog.gender) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      
      // Calculate age from DOB
      const age = Math.floor(
        (new Date().getTime() - new Date(newDog.dob).getTime()) / 
        (1000 * 60 * 60 * 24 * 365.25)
      )

      const { data: newPet, error } = await supabase
        .from('pets')
        .insert({
          name: newDog.name,
          dob: newDog.dob,
          breed: newDog.breed || null,
          gender: newDog.gender,
          age: age,
          weight: newDog.weight || null,
          user_id: user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Update the local pets state with the new pet
      setPets(prev => [newPet, ...prev])
      setShowNewDogForm(false)
      setNewDog({ name: '', dob: '', breed: '', gender: '', weight: '' })
      toast.success('Dog added successfully')
    } catch (error) {
      console.error('Error adding dog:', error)
      toast.error('Failed to add dog')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form 
      onSubmit={(e) => {
        console.log('Form submission started')
        handleSubmit(e)
      }} 
      className="flex flex-col flex-1 h-full"
    >
      <div className="flex-1 overflow-y-auto px-4">
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium sticky top-0 bg-white py-2 z-10">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
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

              <div className="space-y-2">
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                value={formData.email}
                disabled
                className="bg-slate-100"
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
                maxLength={12} // Account for the hyphens
              />
            </div>

            <h3 className="text-lg font-medium pt-2">Address</h3>
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street Address"
              />
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6 space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                />
              </div>

              <div className="col-span-3 space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="State"
                  maxLength={2}
                />
              </div>

              <div className="col-span-3 space-y-2">
                <Label htmlFor="zip_code">ZIP Code</Label>
                <Input
                  id="zip_code"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={handleChange}
                  placeholder="ZIP Code"
                  maxLength={5}
                  pattern="[0-9]{5}"
                />
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Dogs</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowNewDogForm(true)}
                  disabled={showNewDogForm}
                >
                  Add Dog
                </Button>
              </div>
              
              <div className="space-y-3">
                {showNewDogForm && (
                  <div className="p-4 border rounded-lg bg-slate-50 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">New Dog</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNewDogForm(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dog-name">Name</Label>
                        <Input
                          id="dog-name"
                          value={newDog.name}
                          onChange={(e) => setNewDog(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Dog's name"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="dog-dob">Date of Birth</Label>
                        <Input
                          id="dog-dob"
                          type="date"
                          value={newDog.dob}
                          onChange={(e) => setNewDog(prev => ({ ...prev, dob: e.target.value }))}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="dog-breed">Breed</Label>
                        <Input
                          id="dog-breed"
                          value={newDog.breed}
                          onChange={(e) => setNewDog(prev => ({ ...prev, breed: e.target.value }))}
                          placeholder="Dog's breed"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="dog-weight">Weight (lbs)</Label>
                        <Input
                          id="dog-weight"
                          type="number"
                          min="0"
                          step="0.1"
                          value={newDog.weight}
                          onChange={(e) => setNewDog(prev => ({ ...prev, weight: e.target.value }))}
                          placeholder="Dog's weight"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="dog-gender">Gender</Label>
                        <Select
                          value={newDog.gender}
                          onValueChange={(value) => setNewDog(prev => ({ ...prev, gender: value }))}
                        >
                          <SelectTrigger id="dog-gender">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={handleSaveNewDog}
                        disabled={!newDog.name || !newDog.dob}
                      >
                        Save Dog
                      </Button>
                    </div>
                  </div>
                )}

                {pets.map(pet => (
                  <div 
                    key={pet.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-slate-50"
                  >
                    <div>
                      <p className="font-medium">{pet.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {pet.breed ? pet.breed : 'Mixed Breed'}
                        {pet.age ? ` • ${pet.age} years old` : ''}
                        {pet.weight ? ` • ${pet.weight} lbs` : ''}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </div>
                ))}
                
                {!showNewDogForm && pets.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    No dogs registered
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 p-4 border-t bg-white mt-auto">
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
          onClick={(e) => {
            console.log('Submit button clicked')
          }}
        >
          {loading ? 'Updating...' : 'Update User'}
        </Button>
      </div>
    </form>
  )
} 