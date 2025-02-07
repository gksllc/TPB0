'use server'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export async function createUser(formData: FormData) {
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const phone = formData.get('phone') as string

    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      console.error('Error creating user:', authError)
      return { error: authError.message }
    }

    // Create the user profile in the users table
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email!,
        first_name: firstName,
        last_name: lastName,
        phone,
        role: 'client'
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      // Clean up the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return { error: profileError.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in createUser:', error)
    return { error: error instanceof Error ? error.message : 'An unknown error occurred' }
  }
} 