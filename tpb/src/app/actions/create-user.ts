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
    
    // First check if user already exists in Auth
    const { data: existingUser } = await supabase.auth.admin.listUsers({
      filters: {
        email: formData.email
      }
    })

    let userId: string

    if (existingUser?.users?.length > 0) {
      // User exists in Auth, use their ID
      userId = existingUser.users[0].id
    } else {
      // Create new user in auth
      const randomPassword = Math.random().toString(36).slice(-8)
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

      userId = authData.user.id
    }

    // Check if user profile already exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
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
        .eq('id', userId)

      if (updateError) throw updateError
    } else {
      // Create new profile
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
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

      if (insertError) throw insertError
    }

    return { success: true }
  } catch (error) {
    console.error('Server error creating user:', error)
    return { success: false, error }
  }
} 