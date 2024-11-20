"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Database } from "@/lib/database.types"

type FormData = {
  email: string
  password: string
  name?: string
  confirmPassword?: string
}

export function AuthPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignIn = async (formData: FormData) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        toast.error(error.message)
        return false
      }

      if (data.user) {
        toast.success("Signed in successfully!")
        setTimeout(() => {
          router.push("/dashboard")
          router.refresh()
        }, 500)
        return true
      }
    } catch (error) {
      console.error("Sign in error:", error)
      toast.error("Failed to sign in. Please try again.")
      return false
    }
  }

  const handleSignUp = async (formData: FormData) => {
    try {
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match")
        return false
      }

      // Split the full name into first and last name
      const nameParts = (formData.name ?? '').split(' ')
      const firstname = nameParts[0] || ''
      const lastname = nameParts.slice(1).join(' ') || ''

      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            firstname,
            lastname,
          },
        },
      })

      if (authError || !authData.user) {
        console.error("Auth error:", authError)
        toast.error(authError?.message || "Failed to create user account")
        return false
      }

      if (authData.user.identities?.length === 0) {
        toast.error("An account with this email already exists.")
        return false
      }

      // Then create the client record with role
      const { error: clientError } = await supabase
        .from('clients')
        .insert([{
          id: authData.user.id,
          firstname,
          lastname,
          personalemail: formData.email,
          personalnumber: '',
          created_at: new Date().toISOString(),
          role: 'client'
        }])

      if (clientError) {
        console.error("Error creating client record:", clientError)
        // Delete the auth user if client record creation fails
        await supabase.auth.admin.deleteUser(authData.user.id)
        toast.error("Failed to complete signup. Please try again.")
        return false
      }

      // Route to success page with email as query parameter
      router.push(`/signup-success?email=${encodeURIComponent(formData.email)}`)
      return true

    } catch (error) {
      console.error("Sign up error:", error)
      toast.error("Failed to create account. Please try again.")
      return false
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    try {
      const formData = new FormData(event.currentTarget)
      const isSignIn = event.currentTarget.id === "signin-form"

      const data: FormData = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
      }

      if (!isSignIn) {
        data.name = formData.get("name") as string
        data.confirmPassword = formData.get("confirm-password") as string
      }

      const success = isSignIn 
        ? await handleSignIn(data)
        : await handleSignUp(data)

      if (!success) {
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Form submission error:", error)
      toast.error("An unexpected error occurred")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1a2237] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] space-y-6">
        <div className="flex items-center justify-center space-x-4">
          <div className="rounded-full overflow-hidden bg-white w-12 h-12 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="The Pet Bodega logo"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">The Pet Bodega</h1>
        </div>
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>Sign in to your account to continue</CardDescription>
              </CardHeader>
              <form id="signin-form" onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input name="email" id="email" placeholder="m@example.com" required type="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input name="password" id="password" required type="password" />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <Button className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                  <Link className="text-sm text-muted-foreground hover:underline" href="/forgot-password">
                    Forgot your password?
                  </Link>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create an account</CardTitle>
                <CardDescription>Enter your details to get started</CardDescription>
              </CardHeader>
              <form id="signup-form" onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input name="name" id="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-signup">Email</Label>
                    <Input name="email" id="email-signup" placeholder="m@example.com" required type="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-signup">Password</Label>
                    <Input name="password" id="password-signup" required type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input name="confirm-password" id="confirm-password" required type="password" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}