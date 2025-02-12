'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AuthError, AuthState, UserSession, UUID } from '@/lib/types/auth'
import { monitorAuthError } from '@/lib/utils/monitoring'
import { createAuditLog } from '@/lib/utils/auth'
import { asUUID } from '@/lib/utils/uuid'
import type { Database } from '@/lib/database.types'

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function SupabaseAuthProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode
  initialSession: UserSession | null
}) {
  const [state, setState] = useState<AuthState>({
    loading: true,
    session: initialSession,
    error: null,
  })
  
  const router = useRouter()
  const supabase = createClient()

  // Handle initial session
  useEffect(() => {
    if (initialSession) {
      setState(current => ({ ...current, session: initialSession, loading: false }))
    }
  }, [initialSession])

  // Handle auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id)

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setState(current => ({ 
          ...current, 
          session: session as UserSession | null,
          loading: false 
        }))

        if (session) {
          try {
            // Get user role
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('role')
              .eq('id', session.user.id as unknown as Database['public']['Tables']['users']['Row']['id'])
              .single()

            if (!userError && userData) {
              await createAuditLog({
                userId: asUUID(session.user.id),
                action: 'login',
                metadata: { event, role: userData.role }
              })

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
            }
          } catch (error) {
            console.error('Error handling sign in:', error)
          }
        }
      }
      
      if (event === 'SIGNED_OUT') {
        setState(current => ({ 
          ...current, 
          session: null,
          loading: false 
        }))
        router.push('/auth/login')
      }
    })

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!error && session) {
        setState(current => ({
          ...current,
          session: session as UserSession,
          loading: false
        }))
      } else {
        setState(current => ({ ...current, loading: false }))
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  const signIn = async (email: string, password: string) => {
    try {
      setState(current => ({ ...current, loading: true, error: null }))
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data?.session) {
        setState(current => ({
          ...current,
          session: data.session as UserSession,
          error: null,
        }))
      }
    } catch (error) {
      console.error('Sign in error:', error)
      const authError = error as AuthError
      setState(current => ({ ...current, error: authError }))
      monitorAuthError(authError)
      throw error
    } finally {
      setState(current => ({ ...current, loading: false }))
    }
  }

  const signOut = async () => {
    try {
      setState(current => ({ ...current, loading: true, error: null }))
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setState(current => ({ ...current, session: null }))
      router.push('/auth/login')
    } catch (error) {
      console.error('Sign out error:', error)
      const authError = error as AuthError
      setState(current => ({ ...current, error: authError }))
      monitorAuthError(authError)
      throw error
    } finally {
      setState(current => ({ ...current, loading: false }))
    }
  }

  const refreshSession = async () => {
    try {
      setState(current => ({ ...current, loading: true, error: null }))
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (error) throw error

      setState(current => ({
        ...current,
        session: session as UserSession | null,
        error: null,
      }))

      if (session) {
        await createAuditLog({
          userId: asUUID(session.user.id),
          action: 'token_refresh',
          metadata: { manual: true }
        })
      }
    } catch (error) {
      console.error('Session refresh error:', error)
      const authError = error as AuthError
      setState(current => ({ ...current, error: authError }))
      monitorAuthError(authError, state.session?.user.id)
      throw error
    } finally {
      setState(current => ({ ...current, loading: false }))
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a SupabaseAuthProvider')
  }
  return context
} 