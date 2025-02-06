'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '../database.types'

export async function getServerSupabase() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: { path: string }) {
          cookieStore.set(name, value, options)
        },
        remove(name: string, options: { path: string }) {
          cookieStore.set(name, '', options)
        },
      },
    }
  )
}

export async function getUserRole(userId: string) {
  const supabase = await getServerSupabase()
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data?.role
} 