'use client'

import { useState, useEffect, useCallback } from "react"
import { SearchIcon, PlusIcon, Pencil } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"
import type { Database } from "@/lib/database.types"
import { EditUserDialog } from "./edit-user-dialog"
import { NewUserDialog } from "./new-user-dialog"

type Customer = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  role: 'admin' | 'client' | 'employee'
  created_at: string
}

export function AppCustomersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [selectedUser, setSelectedUser] = useState<Customer | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [newUserDialogOpen, setNewUserDialogOpen] = useState(false)

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true)
      console.log('Starting customer fetch...')
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'client')
        .order('created_at', { ascending: false })

      console.log('Supabase response:', { data, error })

      if (error) {
        console.error('Error fetching customers:', error)
        toast.error("Failed to load customers: " + error.message)
        throw error
      }

      if (!data || data.length === 0) {
        console.log('No customers found in database')
        setCustomers([])
        return
      }

      console.log('Successfully fetched customers:', data)
      setCustomers(data)
    } catch (error) {
      console.error('Error in fetchCustomers:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load customers'
      toast.error(errorMessage)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const filteredCustomers = customers.filter(customer => {
    const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase())
  })

  const handleEdit = (user: Customer) => {
    setSelectedUser(user)
    setEditDialogOpen(true)
  }

  return (
    <>
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Customers</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" aria-hidden="true" />
            <Input
              type="text"
              placeholder="Search customers..."
              className="pl-10 pr-4 py-2 w-80"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => setNewUserDialogOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </header>

      <div className="rounded-md border bg-white">
        <div className="relative w-full overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-muted-foreground">Loading customers...</p>
            </div>
          ) : filteredCustomers.length > 0 ? (
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b bg-muted/50">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">
                    Name
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">
                    Email
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">
                    Phone
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">
                    Joined
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <td className="p-4 align-middle">
                      {customer.first_name} {customer.last_name}
                    </td>
                    <td className="p-4 align-middle">
                      {customer.email}
                    </td>
                    <td className="p-4 align-middle">
                      {customer.phone || 'N/A'}
                    </td>
                    <td className="p-4 align-middle">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 align-middle">
                      <Button
                        onClick={() => handleEdit(customer)}
                        variant="ghost"
                        size="sm"
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit user</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex justify-center items-center h-32">
              <p className="text-muted-foreground">No customers found</p>
            </div>
          )}
        </div>
      </div>

      
      <EditUserDialog
        user={selectedUser}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUpdate={fetchCustomers}
      />

      <NewUserDialog
        open={newUserDialogOpen}
        onOpenChange={setNewUserDialogOpen}
        onUpdate={fetchCustomers}
      />
    </>
  )
}