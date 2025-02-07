import { Metadata } from "next"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AuthPage } from "@/components/auth-page"
import type { Database } from "@/lib/database.types"

export const metadata: Metadata = {
  title: "Sign In - The Pet Bodega",
  description: "Sign in to your Pet Bodega account to manage your pet grooming appointments.",
}

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Page() {
  try {
    const cookieStore = cookies()
    
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              console.error('Error setting cookie:', error)
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.delete({ name, ...options })
            } catch (error) {
              console.error('Error removing cookie:', error)
            }
          }
        }
      }
    )
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      return <AuthPage />
    }

    // If user is already logged in, redirect them based on their role
    if (session) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (userError) {
        console.error('User data error:', userError)
        return <AuthPage />
      }

      if (userData) {
        // Make sure these routes exist in your app directory structure
        switch (userData.role) {
          case 'admin':
            redirect('/dashboard')
          case 'client':
            redirect('/client/dashboard') // Updated path
          case 'employee':
            redirect('/employee/dashboard')
          default:
            redirect('/client/dashboard') // Updated default path
        }
      }
    }

    return <AuthPage />
  } catch (error) {
    console.error('Root page error:', error)
    return <AuthPage />
  }
} 