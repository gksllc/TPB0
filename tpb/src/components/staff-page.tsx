"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Calendar, FileText, Settings, LogOut, SearchIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "sonner"
import type { Database } from "@/lib/database.types"
import { NewStaffDialog } from "@/components/new-staff-dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

type Employee = {
  id: string
  name: string
  email?: string | null
  role?: string
  nickname?: string | null
  customId?: string | null
  isOwner?: boolean
  pin?: string | null
  roles?: string[]
}

export function StaffPage() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  const [openNewStaffDialog, setOpenNewStaffDialog] = useState(false)
  const [staffCount, setStaffCount] = useState(0)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchStaffCount = async () => {
    setIsLoading(true)
    setError(null)
    try {
      console.log('Fetching staff members...')
      const response = await fetch('/api/clover/employees', {
        cache: 'no-store' // Disable caching to always get fresh data
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Failed to fetch staff:', errorData)
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Received staff data:', data)

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch staff members')
      }

      // Sort employees: owners first, then by name
      const sortedEmployees = [...data.data].sort((a, b) => {
        if (a.isOwner && !b.isOwner) return -1
        if (!a.isOwner && b.isOwner) return 1
        return a.name.localeCompare(b.name)
      })

      setEmployees(sortedEmployees)
      setStaffCount(sortedEmployees.length)
    } catch (error) {
      console.error('Error fetching staff:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch staff members')
      toast.error("Failed to fetch staff members")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStaffCount()
  }, [])

  // Filter employees based on search query
  const filteredEmployees = employees.filter(employee => 
    employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.role?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  const handleRefreshStaff = () => {
    fetchStaffCount() // Fetch fresh data from Clover
  }

  const handleDeleteEmployee = async (employee: Employee) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/clover/employee?id=${employee.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete employee')
      }

      toast.success('Employee deleted successfully')
      fetchStaffCount() // Refresh the list
    } catch (error) {
      console.error('Error deleting employee:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete employee')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" aria-hidden="true" />
            <Input
              type="text"
              placeholder="Search staff..."
              className="pl-10 pr-4 py-2 w-80"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => setOpenNewStaffDialog(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Staff Member
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Staff
            </CardTitle>
            <div className="text-2xl font-bold">{staffCount}</div>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Active employees
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Active Today
            </CardTitle>
            <div className="text-2xl font-bold">0</div>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Staff members on shift
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Appointments Today
            </CardTitle>
            <div className="text-2xl font-bold">0</div>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Scheduled appointments
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col justify-center items-center h-64 space-y-4">
            <p className="text-xl text-red-500">{error}</p>
            <Button onClick={fetchStaffCount}>
              Try Again
            </Button>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-xl text-gray-500">
              {searchQuery ? 'No staff members found matching your search' : 'No staff members added yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr 
                    key={employee.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary text-sm">
                            {employee.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {employee.name}
                          </div>
                          {employee.nickname && (
                            <div className="text-sm text-gray-500">
                              {employee.nickname}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        employee.isOwner 
                          ? 'bg-purple-100 text-purple-800'
                          : employee.roles?.includes('ADMIN')
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {employee.roles?.length ? employee.roles.join(', ') : employee.role || 'Staff'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.email || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.customId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            // TODO: Implement edit functionality
                            toast.info("Edit functionality coming soon")
                          }}
                        >
                          Edit
                        </Button>
                        {!employee.isOwner && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2Icon className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {employee.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => handleDeleteEmployee(employee)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewStaffDialog 
        open={openNewStaffDialog}
        onOpenChange={setOpenNewStaffDialog}
        onUpdate={handleRefreshStaff}
      />
    </div>
  )
} 