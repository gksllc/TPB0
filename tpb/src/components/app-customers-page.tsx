'use client'

import { useState, useEffect } from "react"
import { SearchIcon, PlusIcon, Pencil } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "sonner"
import type { Database } from "@/lib/database.types"
import { EditUserDialog } from "./edit-user-dialog"
import { useRouter } from "next/navigation"
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
  const supabase = createClientComponentClient<Database>()
  const [selectedUser, setSelectedUser] = useState<Customer | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [newUserDialogOpen, setNewUserDialogOpen] = useState(false)
  const router = useRouter()

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          address,
          city,
          state,
          zip_code,
          role,
          created_at
        `)
        .eq('role', 'client')
        .order('created_at', { ascending: false })

      if (error) throw error

      setCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error("Failed to load customers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        router.push('/auth')
        return
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()
      
      if (error || userData?.role !== 'admin') {
        router.push('/client')
      }
    }
    
    checkRole()
  }, [supabase, router])

  useEffect(() => {
    fetchCustomers()
  }, [supabase])

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