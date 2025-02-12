'use client'

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react"
import { AuthPage } from "@/components/auth-page"
import type { Database } from "@/lib/database.types"

export default function Page() {
  const router = useRouter()
  const session = useSession()
  const supabase = useSupabaseClient<Database>()

  useEffect(() => {
    const checkSession = async () => {
      if (!session) {
        router.push('/auth/login')
        return
      }

      try {
        // Get user role
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (userError) throw userError

        // Redirect based on role
        switch (userData.role) {
          case 'admin':
            router.push('/dashboard/admin-appointments')
            break
          case 'client':
            router.push('/client/dashboard')
            break
          default:
            router.push('/client/dashboard')
        }
      } catch (error) {
        console.error('Error checking user role:', error)
        router.push('/auth/login')
      }
    }

    void checkSession()
  }, [session, router, supabase])

  return <AuthPage />
} 