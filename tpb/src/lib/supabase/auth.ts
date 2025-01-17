import { createClient } from "./client"
import { supabaseConfig } from "./config"
import type { AuthError } from "@supabase/supabase-js"

export type AuthResponse = {
  success: boolean
  error: AuthError | null
  data?: any
}

export const supabaseAuth = {
  signIn: async (email: string, password: string): Promise<AuthResponse> => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Get user role after successful sign in
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (userError) throw userError

      return {
        success: true,
        error: null,
        data: { user: data.user, role: userData.role }
      }
    } catch (error) {
      return {
        success: false,
        error: error as AuthError,
      }
    }
  },

  signUp: async (email: string, password: string, userData: { 
    first_name: string, 
    last_name: string 
  }): Promise<AuthResponse> => {
    try {
      const supabase = createClient()
      console.log('Starting signup process in auth utility...')

      // Validate input
      if (!email || !password || !userData.first_name || !userData.last_name) {
        throw new Error('Missing required fields')
      }

      console.log('Creating auth user...')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) {
        console.error('Auth signup error:', authError)
        return {
          success: false,
          error: authError,
        }
      }

      if (!authData?.user) {
        console.error('No user data returned from signup')
        return {
          success: false,
          error: new Error('No user data returned from signup') as AuthError,
        }
      }

      console.log('Auth user created successfully:', authData.user.id)

      // Wait for auth to complete
      await new Promise(resolve => setTimeout(resolve, 1000))

      console.log('Creating user record in database...')
      const { data: dbUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email.toLowerCase(),
          first_name: userData.first_name.trim(),
          last_name: userData.last_name.trim(),
          role: 'client'
        })
        .select()
        .single()

      if (insertError) {
        console.error('User record creation error:', insertError)
        console.log('Attempting to clean up auth user...')
        try {
          await supabase.auth.admin.deleteUser(authData.user.id)
          console.log('Auth user cleaned up successfully')
        } catch (cleanupError) {
          console.error('Failed to clean up auth user:', cleanupError)
        }
        return {
          success: false,
          error: insertError as AuthError,
        }
      }

      console.log('User record created successfully:', dbUser)

      return {
        success: true,
        error: null,
        data: {
          user: authData.user,
          profile: dbUser
        }
      }
    } catch (error) {
      console.error('Signup process error:', error)
      return {
        success: false,
        error: error as AuthError,
      }
    }
  },

  signOut: async (): Promise<AuthResponse> => {
    const supabase = createClient()
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      return {
        success: true,
        error: null
      }
    } catch (error) {
      return {
        success: false,
        error: error as AuthError,
      }
    }
  },

  getSession: async () => {
    const supabase = createClient()
    return await supabase.auth.getSession()
  },

  getUser: async () => {
    const supabase = createClient()
    return await supabase.auth.getUser()
  }
} 