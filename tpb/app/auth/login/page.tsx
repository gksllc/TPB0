import { Metadata } from "next"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createClient } from '@supabase/supabase-js'
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AuthPage } from "@/components/auth-page"
import type { Database } from "@/lib/database.types"

export const metadata: Metadata = {
  title: "Sign In - The Pet Bodega",
  description: "Sign in to your Pet Bodega account to manage your pet grooming appointments.",
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function LoginPage() {
  try {
    // Check environment variables first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        hasAnonKey: !!supabaseAnonKey
      })
      return <AuthPage />
    }

    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      return <AuthPage />
    }

    // If user is already logged in, redirect them based on their role
    if (session?.user) {
      try {
        // Create a service role client to bypass RLS
        const serviceRoleClient = createClient<Database>(
          supabaseUrl,
          supabaseServiceKey,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
              detectSessionInUrl: false
            }
          }
        )

        // Check if user exists in users table
        const { data: userData, error: userError } = await serviceRoleClient
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (userError) {
          if (userError.code === 'PGRST116') {
            // User doesn't exist in users table, create them with default role
            const { data: insertData, error: insertError } = await serviceRoleClient
              .from('users')
              .insert({
                id: session.user.id,
                email: session.user.email!,
                role: 'client',
                first_name: session.user.user_metadata.first_name || '',
                last_name: session.user.user_metadata.last_name || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single()

            if (insertError) throw insertError

            // Redirect new users to client dashboard
            redirect('/client/dashboard')
          }
          throw userError
        }

        // Redirect based on role
        switch (userData.role) {
          case 'admin':
            redirect('/dashboard/admin-appointments')
          case 'client':
            redirect('/client/dashboard')
          case 'employee':
            redirect('/employee/dashboard')
          default:
            redirect('/client/dashboard')
        }
      } catch (error) {
        console.error('Error processing user:', error)
        return <AuthPage />
      }
    }

    return <AuthPage />
  } catch (error) {
    console.error('Login page error:', error)
    return <AuthPage />
  }
} 