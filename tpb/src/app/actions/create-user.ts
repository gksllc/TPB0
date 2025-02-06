'use server'

import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function createUser(formData: {
  email: string
  password: string
  first_name?: string
  last_name?: string
  phone?: string
}) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })

    // First check if user already exists in Auth
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return { error: 'Failed to check existing users' }
    }

    const existingUser = users?.find(user => user.email === formData.email)
    
    if (existingUser) {
      return { error: 'User already exists' }
    }

    // Create the user
    const { data: { user }, error } = await supabase.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: true,
      user_metadata: {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone
      }
    })

    if (error) {
      console.error('Error creating user:', error)
      return { error: error.message }
    }

    if (!user) {
      return { error: 'Failed to create user' }
    }

    // Update the user's role to 'client'
    const { error: updateError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email!,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        role: 'client'
      })

    if (updateError) {
      console.error('Error updating user role:', updateError)
      return { error: 'Failed to set user role' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in createUser:', error)
    return { error: 'An unexpected error occurred' }
  }
} 