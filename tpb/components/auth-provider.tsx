'use client'

import { useState, useEffect } from "react"
import { createBrowserClient } from '@supabase/ssr'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import type { Database } from '@/lib/database.types'
import { useRouter } from 'next/navigation'

interface AuthProviderProps {
  children: React.ReactNode
}

const STORAGE_KEY = 'sb-session'

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter()
  const [supabase] = useState(() => createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: {
          getItem: (key) => {
            try {
              if (typeof window === 'undefined') return null
              
              // Try to get from localStorage first
              const storedValue = window.localStorage.getItem(key)
              if (storedValue) {
                try {
                  const parsed = JSON.parse(storedValue)
                  if (parsed?.access_token) {
                    return storedValue
                  }
                } catch (e) {
                  console.error('Error parsing stored session:', e)
                }
              }
              
              return null
            } catch (error) {
              console.error('Error getting session:', error)
              return null
            }
          },
          setItem: (key, value) => {
            try {
              if (typeof window === 'undefined') return
              
              // Validate session data
              const parsed = JSON.parse(value)
              if (!parsed?.access_token) {
                console.error('Invalid session data')
                return
              }
              
              // Store in localStorage
              window.localStorage.setItem(key, value)
            } catch (error) {
              console.error('Error setting session:', error)
            }
          },
          removeItem: (key) => {
            try {
              if (typeof window === 'undefined') return
              window.localStorage.removeItem(key)
            } catch (error) {
              console.error('Error removing session:', error)
            }
          }
        }
      }
    }
  ))

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        // Clear session data
        window.localStorage.removeItem(STORAGE_KEY)
        router.push('/auth/login')
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
          // Store session data
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
        }
        router.refresh()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  return (
    <SessionContextProvider supabaseClient={supabase}>
      {children}
    </SessionContextProvider>
  )
} 