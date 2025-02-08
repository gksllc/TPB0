"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from "@supabase/ssr"
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
  LogOut 
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
import debounce from 'lodash/debounce'
import { formatPhoneNumber } from "@/lib/utils"

interface SecondaryContact {
  id: string
  name: string
  phone: string
  email: string
  relationship: string
}

interface UserProfile {
  first_name: string
  middle_initial: string
  last_name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip_code: string
  preferred_communication: string
  secondary_contacts: SecondaryContact[]
}

interface NewContact {
  name: string
  phone: string
  email: string
  relationship: string
}

const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function ProfileEditPage() {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/client" },
    { icon: Calendar, label: "My Appointments", href: "/client/appointments" },
    { icon: PawPrint, label: "My Pets", href: "/client/pets" },
    { icon: History, label: "Grooming History", href: "/client/history" },
    { icon: Settings, label: "Settings", href: "/client/profile" },
  ]

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile>({
    first_name: '',
    middle_initial: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    preferred_communication: 'email',
    secondary_contacts: []
  })

  const [showNewContactForm, setShowNewContactForm] = useState(false)
  const [newContact, setNewContact] = useState<NewContact>({
    name: '',
    phone: '',
    email: '',
    relationship: ''
  })

  // Fetch user data when component mounts
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) throw error
        setProfile(profile)
      } catch (error) {
        console.error('Error fetching user profile:', error)
        toast.error('Failed to fetch user profile')
      }
    }

    void fetchUserProfile()
  }, [])

  useEffect(() => {
    const checkPolicies = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Current user:', user)
      
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
        
        console.log('Can read data:', data)
        console.log('Read error:', error)
      }
    }
    
    checkPolicies()
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdate = useCallback(
    (field: keyof UserProfile, value: string) => 
      debounce(async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return

          if (field === 'email') {
            const { error: emailError } = await supabase.auth.updateUser({
              email: value,
            })
            if (emailError) throw emailError
          }

          const { error } = await supabase
            .from('users')
            .update({ [field]: value })
            .eq('id', user.id)

          if (error) throw error

          if (['phone', 'preferred_communication'].includes(field)) {
            toast.success(`${field.replace('_', ' ')} updated successfully`)
          }
        } catch (error) {
          console.error(`Error updating ${field}:`, error)
          toast.error(`Failed to update ${field.replace('_', ' ')}`)
        }
      }, 1000)(),
    []
  )

  const handleFieldUpdate = (field: keyof UserProfile, value: string) => {
    // Format phone number if this is the phone field
    const formattedValue = field === 'phone' ? formatPhoneNumber(value) : value
    
    setProfile(prev => ({ ...prev, [field]: formattedValue }))
    debouncedUpdate(field, formattedValue)
  }

  const handleAddSecondaryContact = () => {
    setNewContact({
      name: '',
      phone: '',
      email: '',
      relationship: ''
    })
    setShowNewContactForm(true)
  }

  const handleSaveNewContact = async () => {
    try {
      // Validate required fields
      if (!newContact.name || !newContact.phone) {
        toast.error("Name and phone are required")
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const contactToSave = {
        user_id: user.id,
        ...newContact
      }

      const { data, error } = await supabase
        .from('secondary_contacts')
        .insert(contactToSave)
        .select()
        .single()

      if (error) throw error

      setProfile(prev => ({
        ...prev,
        secondary_contacts: [...prev.secondary_contacts, data]
      }))

      // Reset form and hide it
      setNewContact({
        name: '',
        phone: '',
        email: '',
        relationship: ''
      })
      setShowNewContactForm(false)
      toast.success("Contact added successfully")
    } catch (error) {
      console.error('Error saving new contact:', error)
      toast.error("Failed to add contact")
    }
  }

  const handleRemoveSecondaryContact = async (index: number) => {
    const contactToRemove = profile.secondary_contacts[index]
    
    try {
      const { error } = await supabase
        .from('secondary_contacts')
        .delete()
        .eq('id', contactToRemove.id)

      if (error) throw error

      setProfile(prev => ({
        ...prev,
        secondary_contacts: prev.secondary_contacts.filter((_, i) => i !== index)
      }))

      toast.success("Contact removed successfully")
    } catch (error) {
      console.error('Error removing contact:', error)
      toast.error("Failed to remove contact")
    }
  }

  const handleSecondaryContactChange = async (
    index: number,
    field: keyof Omit<SecondaryContact, 'id'>,
    value: string
  ) => {
    const contactToUpdate = profile.secondary_contacts[index]
    
    try {
      const { error } = await supabase
        .from('secondary_contacts')
        .update({ [field]: value })
        .eq('id', contactToUpdate.id)

      if (error) throw error

      setProfile(prev => ({
        ...prev,
        secondary_contacts: prev.secondary_contacts.map((contact, i) => {
          if (i === index) {
            return { ...contact, [field]: value }
          }
          return contact
        })
      }))
    } catch (error) {
      console.error('Error updating contact:', error)
      toast.error("Failed to update contact")
    }
  }

  const handleSaveSecondaryContact = async (index: number) => {
    const contactToSave = profile.secondary_contacts[index]
    
    try {
      // Validate required fields
      if (!contactToSave.name || !contactToSave.phone) {
        toast.error("Name and phone are required")
        return
      }

      const { error } = await supabase
        .from('secondary_contacts')
        .update({
          name: contactToSave.name,
          phone: contactToSave.phone,
          email: contactToSave.email,
          relationship: contactToSave.relationship
        })
        .eq('id', contactToSave.id)

      if (error) throw error

      toast.success("Contact saved successfully")
    } catch (error) {
      console.error('Error saving contact:', error)
      toast.error("Failed to save contact")
    }
  }

  const debugSupabaseError = async (error: any) => {
    console.group('Supabase Error Debug')
    console.error('Full error object:', JSON.stringify(error, null, 2))
    
    try {
      // Check current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('Current user:', user)
      console.log('Auth check error:', userError)
      
      // Check if user exists in users table
      if (user) {
        const { data, error: checkError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
        
        console.log('User in database:', data)
        console.log('Database check error:', checkError)
      }
    } catch (debugError) {
      console.error('Error during debug:', debugError)
    }
    
    console.groupEnd()
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      console.log('Starting profile update...')
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('Auth error:', authError)
        throw authError
      }

      if (!user) {
        console.log('No user found, redirecting to auth')
        router.push('/auth')
        return
      }

      console.log('Current user:', user)

      // Validate required fields
      if (!profile.first_name || !profile.last_name || !profile.email) {
        toast.error("Please fill in all required fields")
        return
      }

      // Update auth email if changed
      if (user.email !== profile.email) {
        console.log('Updating email from', user.email, 'to', profile.email)
        const { error: emailUpdateError } = await supabase.auth.updateUser({
          email: profile.email,
        })
        if (emailUpdateError) {
          console.error('Email update error:', emailUpdateError)
          throw emailUpdateError
        }
      }

      // Prepare update data with only the fields that exist in the database
      const updateData = {
        first_name: profile.first_name.trim(),
        last_name: profile.last_name.trim(),
        email: profile.email.trim(),
        phone: profile.phone?.trim() || null,
        address: profile.address?.trim() || null,
        city: profile.city?.trim() || null,
        state: profile.state?.trim() || null,
        zip_code: profile.zip_code?.trim() || null
      }

      console.log('Attempting to update with data:', updateData)

      // Update the user profile
      const { data: updateResult, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select()

      if (updateError) {
        console.error('Update error:', updateError)
        throw updateError
      }

      console.log('Update successful:', updateResult)
      toast.success("Profile updated successfully")
      
    } catch (error) {
      console.error('Full error in handleSave:', error)
      await debugSupabaseError(error)
      
      if (error instanceof Error) {
        toast.error(`Error updating profile: ${error.message}`)
      } else {
        toast.error("An unexpected error occurred while updating profile")
      }
    } finally {
      setLoading(false)
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

  const handleZipCodeChange = (value: string) => {
    // Remove any non-digit characters
    const numbersOnly = value.replace(/\D/g, '')
    // Take only the first 5 digits
    const truncated = numbersOnly.slice(0, 5)
    handleFieldUpdate('zip_code', truncated)
  }

  // Add loading state to the UI
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Loading profile...</h2>
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
          <h1 className="text-2xl font-bold">Edit Profile</h1>
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-6 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={profile.first_name}
                    onChange={e => handleFieldUpdate('first_name', e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div className="col-span-1 space-y-2">
                  <Label htmlFor="middle_initial">Middle Initial</Label>
                  <Input
                    id="middle_initial"
                    value={profile.middle_initial}
                    maxLength={1}
                    onChange={e => handleFieldUpdate('middle_initial', e.target.value.charAt(0).toUpperCase())}
                    placeholder="A"
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={profile.last_name}
                    onChange={e => handleFieldUpdate('last_name', e.target.value)}
                    placeholder="Doe"
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={e => handleFieldUpdate('email', e.target.value)}
                    placeholder="john.doe@example.com"
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={e => handleFieldUpdate('phone', e.target.value)}
                    placeholder="123-456-7890"
                    maxLength={12}
                  />
                </div>
                <div className="col-span-6 space-y-2">
                  <Label htmlFor="preferred_communication">Preferred Communication</Label>
                  <Select
                    value={profile.preferred_communication}
                    onValueChange={value => handleFieldUpdate('preferred_communication', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select preferred communication" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={profile.address}
                  onChange={e => handleFieldUpdate('address', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={profile.city}
                    onChange={e => handleFieldUpdate('city', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={profile.state}
                    onChange={e => handleFieldUpdate('state', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">ZIP Code</Label>
                  <Input
                    id="zip_code"
                    value={profile.zip_code}
                    onChange={e => handleZipCodeChange(e.target.value)}
                    placeholder="12345"
                    maxLength={5}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    type="text"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Secondary Contacts</CardTitle>
              <Button 
                variant="outline" 
                onClick={handleAddSecondaryContact}
                disabled={showNewContactForm}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {showNewContactForm && (
                <div className="border rounded-lg p-4 space-y-4 bg-slate-50">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">New Secondary Contact</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveNewContact}
                        className="flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save Contact
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNewContactForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input
                        value={newContact.name}
                        onChange={e => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Relationship</Label>
                      <Input
                        value={newContact.relationship}
                        onChange={e => setNewContact(prev => ({ ...prev, relationship: e.target.value }))}
                        placeholder="Spouse, Parent, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input
                        type="tel"
                        value={newContact.phone}
                        onChange={e => setNewContact(prev => ({ 
                          ...prev, 
                          phone: formatPhoneNumber(e.target.value)
                        }))}
                        placeholder="123-456-7890"
                        maxLength={12}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input
                        type="email"
                        value={newContact.email}
                        onChange={e => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="john.doe@example.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {profile.secondary_contacts.map((contact, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Secondary Contact {index + 1}</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveSecondaryContact(index)}
                        className="flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save Contact
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSecondaryContact(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input
                        value={contact.name}
                        onChange={e => handleSecondaryContactChange(index, 'name', e.target.value)}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Relationship</Label>
                      <Input
                        value={contact.relationship}
                        onChange={e => handleSecondaryContactChange(index, 'relationship', e.target.value)}
                        placeholder="Spouse, Parent, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input
                        type="tel"
                        value={contact.phone}
                        onChange={e => handleSecondaryContactChange(index, 'phone', formatPhoneNumber(e.target.value))}
                        placeholder="123-456-7890"
                        maxLength={12}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input
                        type="email"
                        value={contact.email}
                        onChange={e => handleSecondaryContactChange(index, 'email', e.target.value)}
                        placeholder="john.doe@example.com"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {profile.secondary_contacts.length === 0 && !showNewContactForm && (
                <div className="text-center text-muted-foreground py-8">
                  No secondary contacts added
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
} 