"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "sonner"
import { 
  Save, 
  Plus, 
  Trash2, 
  LayoutDashboard, 
  Calendar, 
  PawPrint, 
  History, 
  CreditCard, 
  Settings,
  LogOut,
  Pencil,
  Upload,
  X
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Database } from "@/lib/database.types"

interface Pet {
  id: string
  name: string
  dob: string
  breed: string
  gender: string
  age: number
  weight: number
  special_notes: string
  medical_conditions: string
  created_at: string
  image_url: string | null
}

interface NewPet {
  name: string
  dob: string
  breed: string
  gender: string
  age: number
  weight: number | null
  special_notes: string
  medical_conditions: string
  image_url: string | null
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

export function PetsPage() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  const [loading, setLoading] = useState(true)
  const [pets, setPets] = useState<Pet[]>([])
  const [showNewPetForm, setShowNewPetForm] = useState(false)
  const [newPet, setNewPet] = useState<NewPet>({
    name: '',
    dob: '',
    breed: '',
    gender: '',
    age: 0,
    weight: null,
    special_notes: '',
    medical_conditions: '',
    image_url: null
  })
  const [editingPetId, setEditingPetId] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Fetch pets data when component mounts
  useEffect(() => {
    const fetchPets = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError

        if (!user) {
          router.push('/auth')
          return
        }

        const { data: petsData, error: petsError } = await supabase
          .from('pets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (petsError) throw petsError

        setPets(petsData || [])

        // Check if we should edit a specific pet
        const editPetId = localStorage.getItem('editPetId')
        if (editPetId) {
          localStorage.removeItem('editPetId') // Clear the stored ID
          const petToEdit = petsData?.find(p => p.id === editPetId)
          if (petToEdit) {
            handleEditPet(petToEdit)
          }
        }
      } catch (error) {
        console.error('Error fetching pets:', error)
        toast.error("Error loading pets")
      } finally {
        setLoading(false)
      }
    }

    fetchPets()
  }, [supabase, router])

  const handleAddPet = () => {
    setNewPet({
      name: '',
      dob: '',
      breed: '',
      gender: '',
      age: 0,
      weight: null,
      special_notes: '',
      medical_conditions: '',
      image_url: null
    })
    setShowNewPetForm(true)
  }

  const handleEditPet = (pet: Pet) => {
    setNewPet({
      name: pet.name,
      dob: pet.dob,
      breed: pet.breed,
      gender: pet.gender,
      age: calculateAge(pet.dob),
      weight: pet.weight,
      special_notes: pet.special_notes,
      medical_conditions: pet.medical_conditions,
      image_url: pet.image_url
    })
    setEditingPetId(pet.id)
    setShowNewPetForm(true)
  }

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // Create a unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      // Upload to Supabase storage
      const { error: uploadError, data } = await supabase.storage
        .from('pets')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pets')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image')
      return null
    } finally {
      setIsUploading(false)
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Image size should be less than 5MB')
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setNewPet(prev => ({ ...prev, image_url: null }))
  }

  const handleSaveNewPet = async () => {
    try {
      // Validate required fields
      if (!newPet.name || !newPet.dob) {
        toast.error("Name and date of birth are required")
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Upload image if selected
      let imageUrl = newPet.image_url
      if (imageFile) {
        imageUrl = await handleImageUpload(imageFile)
      }

      const petToSave = {
        user_id: user.id,
        ...newPet,
        image_url: imageUrl
      }

      if (editingPetId) {
        // Update existing pet
        const { data, error } = await supabase
          .from('pets')
          .update(petToSave)
          .eq('id', editingPetId)
          .select()
          .single()

        if (error) throw error

        setPets(prev => prev.map(pet => 
          pet.id === editingPetId ? data : pet
        ))
        toast.success("Pet updated successfully")
      } else {
        // Create new pet
        const { data, error } = await supabase
          .from('pets')
          .insert(petToSave)
          .select()
          .single()

        if (error) throw error

        setPets(prev => [data, ...prev])
        toast.success("Pet added successfully")
      }

      // Reset form and editing state
      setShowNewPetForm(false)
      setEditingPetId(null)
      // Clear image states
      setImageFile(null)
      setImagePreview(null)
      setNewPet({
        name: '',
        dob: '',
        breed: '',
        gender: '',
        age: 0,
        weight: null,
        special_notes: '',
        medical_conditions: '',
        image_url: null
      })
    } catch (error) {
      console.error('Error saving pet:', error)
      toast.error(editingPetId ? "Failed to update pet" : "Failed to add pet")
    }
  }

  const handleRemovePet = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', id)

      if (error) throw error

      setPets(prev => prev.filter(pet => pet.id !== id))
      toast.success("Pet removed successfully")
    } catch (error) {
      console.error('Error removing pet:', error)
      toast.error("Failed to remove pet")
    }
  }

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

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/client" },
    { icon: Calendar, label: "My Appointments", href: "/client/appointments" },
    { icon: PawPrint, label: "My Pets", href: "/client/pets" },
    { icon: History, label: "Grooming History", href: "/client/history" },
    { icon: Settings, label: "Settings", href: "/client/profile" },
  ]

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Loading pets...</h2>
        </div>
      </div>
    )
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
          <h1 className="text-2xl font-bold">My Pets</h1>
          <div className="flex items-center gap-4">
            <Input 
              type="search" 
              placeholder="Search..." 
              className="w-64"
            />
            <Button 
              size="icon" 
              variant="ghost"
              onClick={() => router.push('/client/profile')}
              className="hover:bg-slate-200 transition-colors"
            >
              <span className="sr-only">User menu</span>
              <div className="h-8 w-8 rounded-full bg-slate-200" />
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {!showNewPetForm && (
            <div className="flex justify-end">
              <Button 
                onClick={handleAddPet}
                disabled={showNewPetForm}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Pet
              </Button>
            </div>
          )}

          {showNewPetForm ? (
            <Card className="max-w-3xl mx-auto">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-2xl font-bold">{editingPetId ? 'Edit Pet' : 'New Pet'}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSaveNewPet}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {editingPetId ? 'Save Changes' : 'Save Pet'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowNewPetForm(false)
                      setEditingPetId(null)
                      setImageFile(null)
                      setImagePreview(null)
                      setNewPet({
                        name: '',
                        dob: '',
                        breed: '',
                        gender: '',
                        age: 0,
                        weight: null,
                        special_notes: '',
                        medical_conditions: '',
                        image_url: null
                      })
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-full flex flex-col items-center space-y-4">
                    <div className="relative h-40 w-40">
                      {(imagePreview || newPet.image_url) ? (
                        <>
                          <Image
                            src={imagePreview || newPet.image_url || ''}
                            alt="Pet preview"
                            fill
                            className="rounded-full object-cover border-4 border-background shadow-lg"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg"
                            onClick={handleRemoveImage}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <div className="h-full w-full rounded-full border-4 border-dashed border-muted flex items-center justify-center bg-muted/5">
                          <PawPrint className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="pet-image"
                        onChange={handleImageChange}
                        disabled={isUploading}
                      />
                      <Label
                        htmlFor="pet-image"
                        className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:text-primary/90 border rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <Upload className="h-4 w-4" />
                        {isUploading ? 'Uploading...' : 'Upload Photo'}
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Pet Name</Label>
                      <Input
                        value={newPet.name}
                        onChange={e => setNewPet(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Max"
                        required
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Date of Birth</Label>
                      <Input
                        type="date"
                        value={newPet.dob}
                        onChange={e => {
                          const dob = e.target.value
                          setNewPet(prev => ({
                            ...prev,
                            dob,
                            age: calculateAge(dob)
                          }))
                        }}
                        required
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Breed</Label>
                      <Input
                        value={newPet.breed}
                        onChange={e => setNewPet(prev => ({ ...prev, breed: e.target.value }))}
                        placeholder="Golden Retriever"
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Gender</Label>
                      <Select
                        value={newPet.gender}
                        onValueChange={value => setNewPet(prev => ({ ...prev, gender: value }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Age (years)</Label>
                      <Input
                        type="number"
                        value={newPet.age}
                        readOnly
                        className="w-full bg-muted/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Weight (lbs)</Label>
                      <Input
                        type="number"
                        value={newPet.weight ?? ''}
                        onChange={e => setNewPet(prev => ({ 
                          ...prev, 
                          weight: e.target.value ? Number(e.target.value) : null 
                        }))}
                        min={0}
                        placeholder="0"
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="col-span-full space-y-2">
                    <Label className="text-sm font-medium">Special Notes</Label>
                    <Input
                      value={newPet.special_notes}
                      onChange={e => setNewPet(prev => ({ ...prev, special_notes: e.target.value }))}
                      placeholder="Any special handling instructions"
                      className="w-full"
                    />
                  </div>
                  <div className="col-span-full space-y-2">
                    <Label className="text-sm font-medium">Medical Conditions</Label>
                    <Input
                      value={newPet.medical_conditions}
                      onChange={e => setNewPet(prev => ({ ...prev, medical_conditions: e.target.value }))}
                      placeholder="Any medical conditions or allergies"
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pets.map((pet) => (
                <Card key={pet.id} className="group hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-20 relative rounded-full overflow-hidden border-4 border-background shadow-sm">
                        {pet.image_url ? (
                          <Image
                            src={pet.image_url}
                            alt={pet.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-muted/10">
                            <PawPrint className="h-10 w-10 text-primary/60" />
                          </div>
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">{pet.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(pet.dob).toLocaleDateString()} • {pet.breed}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditPet(pet)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePet(pet.id)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Age</span>
                        <p className="font-medium">{calculateAge(pet.dob)} years</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Gender</span>
                        <p className="font-medium">{pet.gender || 'Not specified'}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Weight</span>
                        <p className="font-medium">{pet.weight ?? 0} lbs</p>
                      </div>
                    </div>
                    {(pet.special_notes || pet.medical_conditions) && (
                      <div className="border-t pt-4 space-y-3">
                        {pet.special_notes && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Special Notes</p>
                            <p className="text-sm mt-1">{pet.special_notes}</p>
                          </div>
                        )}
                        {pet.medical_conditions && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Medical Conditions</p>
                            <p className="text-sm mt-1">{pet.medical_conditions}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {pets.length === 0 && (
                <div className="col-span-full">
                  <Card className="flex flex-col items-center justify-center py-12">
                    <PawPrint className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No pets added yet</h3>
                    <p className="text-muted-foreground mb-6">Add your first pet to get started</p>
                    <Button onClick={handleAddPet} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Pet
                    </Button>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 