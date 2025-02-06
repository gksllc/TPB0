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

export default async function Page() {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
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
  
  const { data: { session } } = await supabase.auth.getSession()

  // If user is already logged in, redirect them based on their role
  if (session) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (userData) {
      switch (userData.role) {
        case 'admin':
          redirect('/dashboard')
        case 'client':
          redirect('/client')
        case 'employee':
          redirect('/employee/dashboard')
        default:
          redirect('/client')
      }
    }
  }

  return <AuthPage />
}
