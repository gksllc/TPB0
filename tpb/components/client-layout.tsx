'use client'

import { useEffect, useState } from "react"
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import type { Database } from '@/lib/database.types'
import { ClientNav } from '@/components/client-nav'
import { usePathname, useRouter } from 'next/navigation'

interface ClientLayoutProps {
  children: React.ReactNode
}

export function ClientLayout({
  children,
}: ClientLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const session = useSession()
  const supabase = useSupabaseClient<Database>()
  const isAuthPage = pathname?.startsWith('/auth')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Try to get the current session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          if (!isAuthPage) {
            router.push('/auth/login')
          }
          return
        }

        if (!currentSession && !isAuthPage) {
          // Try to refresh the session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          
          if (refreshError || !refreshData.session) {
            router.push('/auth/login')
            return
          }
        }

        if (currentSession && isAuthPage) {
          // Get user role
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', currentSession.user.id)
            .single()

          if (userError) {
            console.error('User role error:', userError)
            return
          }

          // Redirect based on role
          switch (userData?.role) {
            case 'admin':
              router.push('/dashboard/admin-appointments')
              break
            case 'client':
              router.push('/client/dashboard')
              break
            default:
              router.push('/client/dashboard')
          }
        }
      } catch (error) {
        console.error('Session check error:', error)
        if (!isAuthPage) {
          router.push('/auth/login')
        }
      } finally {
        setIsLoading(false)
      }
    }

    void checkSession()
  }, [session, supabase, router, isAuthPage])

  // Setup auth state change listener
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/auth/login')
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (isAuthPage) {
          switch (userData?.role) {
            case 'admin':
              router.push('/dashboard/admin-appointments')
              break
            case 'client':
              router.push('/client/dashboard')
              break
            default:
              router.push('/client/dashboard')
          }
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router, isAuthPage])

  if (isLoading) {
    return null // or a loading spinner
  }

  if (isAuthPage) {
    return children
  }

  if (!session) {
    return null
  }

  return (
    <div className="flex min-h-screen">
      <ClientNav />
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
} 