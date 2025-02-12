'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

type Customer = Database['public']['Tables']['users']['Row']

export function AppCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  const fetchCustomers = useCallback(async (session: Session) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select()
        .eq('role', 'client')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      if (data) setCustomers(data)
    } catch (error) {
      console.error('Error fetching customers:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch customers')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  const verifyAdmin = useCallback(async (session: Session) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (userError) throw userError
      if (!userData?.role || userData.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required')
      }

      return true
    } catch (error) {
      console.error('Role verification error:', error)
      router.replace('/')
      return false
    }
  }, [supabase, router])

  // Initialize session and fetch data
  useEffect(() => {
    let mounted = true
    let retryCount = 0
    const maxRetries = 3

    const initialize = async () => {
      try {
        // Get the initial session
        let { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          if (retryCount < maxRetries) {
            retryCount++
            console.log(`Retrying session fetch (${retryCount}/${maxRetries})...`)
            setTimeout(initialize, 1000 * retryCount) // Exponential backoff
            return
          }
          throw sessionError
        }

        // If no session, try to refresh
        if (!session) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError || !refreshData.session) {
            router.replace('/auth/login')
            return
          }
          session = refreshData.session
        }

        // Verify admin role
        const isAdmin = await verifyAdmin(session)
        if (!isAdmin || !mounted) return

        // Fetch customer data
        await fetchCustomers(session)
      } catch (error) {
        console.error('Initialization error:', error)
        if (error instanceof Error && error.message.includes('Auth session missing')) {
          router.replace('/auth/login')
        } else {
          setError(error instanceof Error ? error.message : 'Failed to initialize')
        }
      }
    }

    void initialize()

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/auth/login')
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const isAdmin = await verifyAdmin(session)
        if (isAdmin && mounted) {
          await fetchCustomers(session)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, router, verifyAdmin, fetchCustomers])

  const handleRefresh = useCallback(async () => {
    setIsLoading(true)
    try {
      // Get current session
      let { data: { session }, error: sessionError } = await supabase.auth.getSession()

      // Try to refresh if there's an error or no session
      if (sessionError || !session) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError || !refreshData.session) {
          throw refreshError || new Error('Failed to refresh session')
        }
        session = refreshData.session
      }

      if (!session) {
        router.replace('/auth/login')
        return
      }

      const isAdmin = await verifyAdmin(session)
      if (isAdmin) {
        await fetchCustomers(session)
      }
    } catch (error) {
      console.error('Refresh error:', error)
      setError(error instanceof Error ? error.message : 'Failed to refresh data')
    } finally {
      setIsLoading(false)
    }
  }, [supabase, router, verifyAdmin, fetchCustomers])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-500">{error}</div>
        <Button onClick={handleRefresh}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Customers</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button>
            Add Customer
          </Button>
        </div>
      </div>

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
            {customers.length === 0 ? (
              <tr>
                <td className="px-6 py-4 whitespace-nowrap" colSpan={4}>
                  <div className="text-sm text-gray-500 text-center">
                    {isLoading ? 'Loading customers...' : 'No customers found'}
                  </div>
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
} 