'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { NewUserDialog } from '@/components/new-user-dialog'

interface Customer {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  created_at: string
  role: string
}

export function AppCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewUserDialog, setShowNewUserDialog] = useState(false)

  const fetchCustomers = async () => {
    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, phone, created_at, role')
        .eq('role', 'client')
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Supabase error:', fetchError)
        if (fetchError.code === 'PGRST301') {
          throw new Error('You do not have permission to view customers. Please check your role and permissions.')
        }
        throw fetchError
      }

      if (!data) {
        throw new Error('No data returned from Supabase')
      }

      setCustomers(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching customers:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch customers')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchCustomers()
  }, [])

  const handleRefresh = () => {
    setIsLoading(true)
    void fetchCustomers()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Customers</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button onClick={() => setShowNewUserDialog(true)}>
            Add Customer
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {customer.first_name} {customer.last_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {customer.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {customer.phone || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {new Date(customer.created_at).toLocaleDateString()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewUserDialog
        open={showNewUserDialog}
        onOpenChange={setShowNewUserDialog}
        onUpdate={handleRefresh}
      />
    </div>
  )
} 