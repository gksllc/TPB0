'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { HomeIcon, UsersIcon, ClipboardIcon, SettingsIcon, LogOutIcon, Search, Edit2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useToast } from "./ui/use-toast"
import { Toaster } from "./ui/toaster"

type Customer = {
  id: string
  firstname: string
  lastname: string
  middleinitial: string
  dob: string
  businessnumber: string
  businessemail: string
  personalnumber: string
  personalemail: string
  address: {
    street: string
    city: string
    state: string
    zipcode: string
    country: string
  }
  updated_at?: string
}

// Add this type to define the shape of data from Supabase
type ClientResponse = {
  id: string
  firstname: string | null
  lastname: string | null
  middleinitial: string | null
  dob: string | null
  businessnumber: string | null
  businessemail: string | null
  personalnumber: string | null
  personalemail: string | null
  address: {
    street: string | null
    city: string | null
    state: string | null
    zipcode: string | null
    country: string | null
  } | null
}

export function CustomerList() {
  const pathname = usePathname()
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterState, setFilterState] = useState('all')
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const navItems = [
    { icon: HomeIcon, label: "Overview", href: "/dashboard" },
    { icon: UsersIcon, label: "Customers", href: "/customers" },
    { icon: ClipboardIcon, label: "Appointments", href: "/appointments" },
    { icon: ClipboardIcon, label: "Reports", href: "/reports" },
    { icon: SettingsIcon, label: "Settings", href: "/settings" },
  ]

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Error signing out"
        })
        return
      }
      router.push("/auth")
    } catch (error) {
      console.error("Sign out error:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sign out"
      })
    }
  }

  const filteredCustomers = customers.filter(customer => 
    (customer.firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
     customer.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
     customer.businessemail.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterState === 'all' || customer.address.state === filterState)
  )

  const handleEditCustomer = async (updatedCustomer: Customer) => {
    try {
      console.log('Updating customer:', updatedCustomer)

      const formattedDob = updatedCustomer.dob ? updatedCustomer.dob.split('T')[0] : null;
      const currentTimestamp = new Date().toISOString();

      const { data, error } = await supabase
        .from('clients')
        .update({
          firstname: updatedCustomer.firstname,
          lastname: updatedCustomer.lastname,
          middleinitial: updatedCustomer.middleinitial,
          dob: formattedDob,
          businessnumber: updatedCustomer.businessnumber,
          businessemail: updatedCustomer.businessemail,
          personalnumber: updatedCustomer.personalnumber,
          personalemail: updatedCustomer.personalemail,
          address_street: updatedCustomer.address.street,
          address_city: updatedCustomer.address.city,
          address_state: updatedCustomer.address.state,
          address_zipcode: updatedCustomer.address.zipcode,
          updated_at: currentTimestamp
        })
        .eq('id', updatedCustomer.id)
        .select()

      if (error) {
        console.error('Supabase update error:', error)
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to update customer"
        })
        return
      }

      // Update local state with the new timestamp
      const updatedCustomerWithTimestamp = {
        ...updatedCustomer,
        updated_at: currentTimestamp
      }
      setCustomers(customers.map(c => c.id === updatedCustomer.id ? updatedCustomerWithTimestamp : c))
      
      toast({
        title: "Success",
        description: "Customer updated successfully"
      })

      // Close the dialog
      setIsDialogOpen(false)

    } catch (error) {
      console.error('Error updating customer:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update customer"
      })
    }
  }

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select(`
            id,
            firstname,
            lastname,
            middleinitial,
            dob,
            businessnumber,
            businessemail,
            personalnumber,
            personalemail,
            address_street,
            address_city,
            address_state,
            address_zipcode
          `)

        if (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to fetch customers"
          })
          return
        }

        // Transform the data to match the Customer type
        const transformedData: Customer[] = data.map(client => ({
          id: client.id,
          firstname: client.firstname || '',
          lastname: client.lastname || '',
          middleinitial: client.middleinitial || '',
          dob: client.dob || '',
          businessnumber: client.businessnumber || '',
          businessemail: client.businessemail || '',
          personalnumber: client.personalnumber || '',
          personalemail: client.personalemail || '',
          address: {
            street: client.address_street || '',
            city: client.address_city || '',
            state: client.address_state || '',
            zipcode: client.address_zipcode || '',
            country: ''
          }
        }))

        setCustomers(transformedData)
      } catch (error) {
        console.error('Error fetching customers:', error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch customers"
        })
      }
    }

    fetchCustomers()
  }, [toast])

  return (
    <div className="flex h-screen w-full bg-slate-50">
      <aside className="w-64 bg-slate-800 text-white p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-8 w-8 bg-primary rounded-full" />
          <h1 className="text-xl font-bold">The Pet Bodega</h1>
        </div>

        <nav className="space-y-4">
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
          className="text-white/80 hover:text-white mt-auto absolute bottom-6"
          onClick={handleSignOut}
        >
          <LogOutIcon className="h-5 w-5 mr-2" aria-hidden="true" />
          <span>Log out</span>
        </Button>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Customer List</h1>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between mb-4">
              <div className="relative w-64">
                <Input
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              <Select value={filterState} onValueChange={setFilterState}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  <SelectItem value="NY">New York</SelectItem>
                  <SelectItem value="CA">California</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Personal Contact</TableHead>
                  <TableHead>Business Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {`${customer.firstname} ${customer.middleinitial ? customer.middleinitial + '.' : ''} ${customer.lastname}`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Born: {customer.dob ? new Date(customer.dob + 'T00:00:00').toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            }) : 'N/A'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {customer.personalemail}
                          </div>
                          <div className="text-sm">
                            {customer.personalnumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {customer.businessemail}
                          </div>
                          <div className="text-sm">
                            {customer.businessnumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {customer.address.street}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {`${customer.address.city}, ${customer.address.state} ${customer.address.zipcode}`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex items-center gap-2"
                              onClick={() => setIsDialogOpen(true)}
                            >
                              <Edit2 className="h-4 w-4" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-h-[85vh] flex flex-col">
                            <DialogHeader className="flex-shrink-0">
                              <DialogTitle>Edit Customer</DialogTitle>
                            </DialogHeader>
                            <div className="flex-1 overflow-y-auto">
                              <CustomerForm customer={customer} onSave={handleEditCustomer} />
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No customers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
      <Toaster />
    </div>
  )
}

function CustomerForm({ customer, onSave }: { customer: Customer, onSave: (customer: Customer) => void }) {
  const [formData, setFormData] = useState(customer)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [name]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await onSave(formData)
    } catch (error) {
      console.error('Error in form submission:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="space-y-6 px-6">
        {/* Personal Information Section */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Personal Information</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstname">First Name</Label>
              <Input id="firstname" name="firstname" value={formData.firstname} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastname">Last Name</Label>
              <Input id="lastname" name="lastname" value={formData.lastname} onChange={handleChange} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="middleinitial">Middle Initial</Label>
              <Input id="middleinitial" name="middleinitial" value={formData.middleinitial} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" name="dob" type="date" value={formData.dob} onChange={handleChange} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personalemail">Personal Email</Label>
            <Input id="personalemail" name="personalemail" type="email" value={formData.personalemail} onChange={handleChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="personalnumber">Personal Phone</Label>
            <Input id="personalnumber" name="personalnumber" value={formData.personalnumber} onChange={handleChange} />
          </div>
        </div>

        {/* Business Information Section */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Business Information</h3>
          
          <div className="space-y-2">
            <Label htmlFor="businessemail">Business Email</Label>
            <Input id="businessemail" name="businessemail" type="email" value={formData.businessemail} onChange={handleChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessnumber">Business Phone</Label>
            <Input id="businessnumber" name="businessnumber" value={formData.businessnumber} onChange={handleChange} />
          </div>
        </div>

        {/* Address Section */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Address</h3>
          
          <div className="space-y-2">
            <Label htmlFor="street">Street Address</Label>
            <Input id="street" name="street" value={formData.address.street} onChange={handleAddressChange} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" value={formData.address.city} onChange={handleAddressChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" value={formData.address.state} onChange={handleAddressChange} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zipcode">Zip Code</Label>
            <Input id="zipcode" name="zipcode" value={formData.address.zipcode} onChange={handleAddressChange} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6 px-6 py-4 border-t bg-gray-50">
        <DialogClose asChild>
          <Button variant="outline" type="button">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}