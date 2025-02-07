import { Metadata } from "next"
import { redirect } from "next/navigation"
import { AuthPage } from "@/components/auth-page"
import { getAuthSession } from "./actions/auth"

export const metadata: Metadata = {
  title: "Sign In - The Pet Bodega",
  description: "Sign in to your Pet Bodega account to manage your pet grooming appointments.",
}

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Page() {
  try {
    const { session, userData, error } = await getAuthSession()

    if (error) {
      console.error('Auth error:', error)
      return <AuthPage />
    }

    // If user is already logged in, redirect them based on their role
    if (session && userData) {
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
    }

    return <AuthPage />
  } catch (error) {
    console.error('Root page error:', error)
    return <AuthPage />
  }
} 