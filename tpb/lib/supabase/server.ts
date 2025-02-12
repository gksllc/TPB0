'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '../database.types'
import { COOKIE_OPTIONS } from './cookies'
import { asUUID } from '@/lib/utils/uuid'

export async function createServerSupabaseClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies()
          return cookieStore.get(name)?.value ?? ''
        },
        async set(name: string, value: string, options: any) {
          try {
            const cookieStore = await cookies()
            cookieStore.set({
              name,
              value,
              ...COOKIE_OPTIONS,
              ...options,
            })
          } catch (error) {
            console.error('Error setting cookie:', error)
          }
        },
        async remove(name: string, options: any) {
          try {
            const cookieStore = await cookies()
            cookieStore.set({
              name,
              value: '',
              ...COOKIE_OPTIONS,
              ...options,
              maxAge: 0
            })
          } catch (error) {
            console.error('Error removing cookie:', error)
          }
        }
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  )
}

export async function getSession() {
  const supabase = await createServerSupabaseClient()
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) throw error
    
    if (session) {
      // Refresh token if needed
      const { data: { session: refreshedSession }, error: refreshError } = 
        await supabase.auth.refreshSession()
      
      if (refreshError) throw refreshError
      return { data: { session: refreshedSession }, error: null }
    }
    
    return { data: { session }, error: null }
  } catch (error) {
    console.error('Error getting session:', error)
    return { data: { session: null }, error }
  }
}

export async function getUserRole(userId: string) {
  const supabase = await createServerSupabaseClient()
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', asUUID(userId))
      .single()

    if (error) throw error
    return data?.role
  } catch (error) {
    console.error('Error getting user role:', error)
    throw error
  }
} 