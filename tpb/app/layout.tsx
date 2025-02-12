import React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { AuthProvider } from '@/components/auth-provider'
import { SupabaseAuthProvider } from '@/components/providers/supabase-auth-provider'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "The Pet Boutique",
  description: "Luxury Pet Grooming Services",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  return (
    <html lang="en" className="h-full">
      <body className={inter.className}>
        <SupabaseAuthProvider initialSession={session}>
          <AuthProvider>
            <Toaster position="top-right" />
            <div className="relative min-h-screen">
              {children}
            </div>
          </AuthProvider>
        </SupabaseAuthProvider>
      </body>
    </html>
  )
} 