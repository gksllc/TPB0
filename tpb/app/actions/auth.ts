'use server'

import { createServerSupabaseClient, getSession as getServerSession } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

export async function getSession() {
  return getServerSession()
}

export async function refreshSession() {
  const supabase = await createServerSupabaseClient()
  return supabase.auth.refreshSession()
}

export async function handleAuthRedirect(userId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: userData, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (error) throw error

  return userData.role === 'admin' 
    ? '/dashboard/admin-appointments'
    : '/client/dashboard'
} 