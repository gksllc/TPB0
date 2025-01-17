'use server'

import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

export async function createUser(formData: {
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip_code: string
}) {
  try {
    const cookieStore = cookies()
    const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore })
    
    const randomPassword = Math.random().toString(36).slice(-8)
    
    // Create new user in auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: randomPassword,
      options: {
        data: {
          first_name: formData.first_name,
          last_name: formData.last_name,
        }
      }
    })

    if (authError) throw authError

    if (!authData.user?.id) {
      throw new Error('Failed to create user account')
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip_code: formData.zip_code || null,
        role: 'client'
      })

    if (profileError) throw profileError

    return { success: true }
  } catch (error) {
    console.error('Server error creating user:', error)
    return { success: false, error }
  }
} 