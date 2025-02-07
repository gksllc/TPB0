'use server'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

interface CreateUserData {
  email: string
  password: string
  first_name: string
  last_name: string
  phone?: string
}

export async function createUser(userData: CreateUserData) {
  try {
    // Initialize Supabase client with service role key
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

    // Create auth user with admin privileges
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        first_name: userData.first_name,
        last_name: userData.last_name,
      }
    })

    if (authError) {
      console.error('Auth signup error:', authError)
      return {
        success: false,
        error: authError.message
      }
    }

    if (!authData?.user) {
      console.error('No user data returned from signup')
      return {
        success: false,
        error: 'No user data returned from signup'
      }
    }

    // Create user record in database
    const { data: dbUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: userData.email.toLowerCase(),
        first_name: userData.first_name.trim(),
        last_name: userData.last_name.trim(),
        phone: userData.phone?.trim(),
        role: 'client'
      })
      .select()
      .single()

    if (insertError) {
      console.error('User record creation error:', insertError)
      // Clean up auth user if database insert fails
      try {
        await supabase.auth.admin.deleteUser(authData.user.id)
      } catch (cleanupError) {
        console.error('Failed to clean up auth user:', cleanupError)
      }
      return {
        success: false,
        error: insertError.message
      }
    }

    return {
      success: true,
      data: {
        user: authData.user,
        profile: dbUser
      }
    }
  } catch (error) {
    console.error('Signup process error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user'
    }
  }
} 