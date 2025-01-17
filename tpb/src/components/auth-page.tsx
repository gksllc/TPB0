"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { motion } from "framer-motion"
import { AuthError } from "@supabase/supabase-js"
import type { User } from "@supabase/supabase-js"
import { Database } from "@/lib/database.types"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Mail, Lock, User as UserIcon, ChevronRight, Loader2 } from "lucide-react"

type FormData = {
  email: string
  password: string
  first_name?: string
  last_name?: string
  confirmPassword?: string
}

type AuthPageProps = {
  defaultTab?: 'signin' | 'signup'
  defaultEmail?: string
}

export function AuthPage({ defaultTab = 'signin', defaultEmail = '' }: AuthPageProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    email: defaultEmail,
    password: "",
    first_name: "",
    last_name: "",
    confirmPassword: "",
  })
  
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (signInError) throw signInError

      if (!authData?.user) {
        throw new Error('No user returned from authentication')
      }

      // Check if user exists in users table
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (checkError && checkError.code === 'PGRST116') {
        // User doesn't exist in users table, create them
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: authData.user.email!,
            role: 'client',
            first_name: authData.user.user_metadata.first_name || '',
            last_name: authData.user.user_metadata.last_name || '',
            created_at: new Date().toISOString()
          })

        if (insertError) throw insertError

        toast.success("Signed in successfully")
        router.push('/client')
        return
      }

      if (checkError) throw checkError

      toast.success("Signed in successfully")

      // Redirect based on role
      switch (existingUser.role) {
        case 'admin':
          router.push('/dashboard')
          break
        case 'client':
          router.push('/client')
          break
        case 'employee':
          router.push('/employee/dashboard')
          break
        default:
          router.push('/client')
      }

    } catch (error) {
      console.error('Sign in error:', error)
      if (error instanceof AuthError) {
        toast.error(error.message)
      } else if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error("An unexpected error occurred during sign in")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    
    setIsLoading(true)

    try {
      if (!formData.email || !formData.password || !formData.confirmPassword) {
        throw new Error('Please fill in all required fields')
      }

      if (!formData.first_name || !formData.last_name) {
        throw new Error('First name and last name are required')
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match')
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: formData.first_name.trim(),
            last_name: formData.last_name.trim(),
            full_name: `${formData.first_name.trim()} ${formData.last_name.trim()}`
          }
        }
      })

      if (signUpError) throw signUpError

      if (!authData.user) {
        throw new Error('Failed to create account')
      }

      toast.success("Account created successfully! Please check your email to confirm your account.")
      router.push(`/signup-success?email=${encodeURIComponent(formData.email)}`)
      
    } catch (error) {
      console.error('Sign up error:', error)
      if (error instanceof AuthError) {
        toast.error(error.message)
      } else if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error("An unexpected error occurred")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/20 relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full z-0">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/5 rounded-full mix-blend-multiply filter blur-xl animate-blob opacity-70" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-secondary/5 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000 opacity-70" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-accent/5 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000 opacity-70" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[440px] space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center space-x-4"
          >
            <div className="h-12 w-12 bg-primary rounded-full" />
            <h1 className="text-3xl font-extrabold">The Pet Bodega</h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin" className="text-base">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="text-base">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-3xl font-bold text-center">Welcome back</CardTitle>
                    <CardDescription className="text-center text-lg">Sign in to your account to continue</CardDescription>
                  </CardHeader>
                  <form onSubmit={handleSignIn}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-base font-semibold">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="email"
                            placeholder="m@example.com"
                            required
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="h-12 pl-10 bg-background/50 border border-gray-300 focus:border-primary focus:ring-0"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-base font-semibold">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="password"
                            required
                            type="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            className="h-12 pl-10 bg-background/50 border border-gray-300 focus:border-primary focus:ring-0"
                          />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4">
                      <Button className="w-full h-12 text-lg font-semibold relative group bg-primary text-white hover:bg-primary-dark transition-colors" disabled={isLoading}>
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            Sign In
                            <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </>
                        )}
                      </Button>
                      <Link 
                        className="text-sm text-center text-muted-foreground hover:text-primary transition-colors" 
                        href="/forgot-password"
                      >
                        Forgot your password?
                      </Link>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>
              <TabsContent value="signup">
                <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
                    <CardDescription className="text-center text-base">Enter your details to get started</CardDescription>
                  </CardHeader>
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="first_name" className="text-sm font-medium">First Name</Label>
                          <div className="relative">
                            <UserIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <Input
                              id="first_name"
                              required
                              value={formData.first_name}
                              onChange={handleInputChange}
                              className="h-12 pl-10 bg-background/50"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="last_name" className="text-sm font-medium">Last Name</Label>
                          <div className="relative">
                            <UserIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <Input
                              id="last_name"
                              required
                              value={formData.last_name}
                              onChange={handleInputChange}
                              className="h-12 pl-10 bg-background/50"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="email"
                            placeholder="m@example.com"
                            required
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="h-12 pl-10 bg-background/50"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="password"
                            required
                            type="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            className="h-12 pl-10 bg-background/50"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="confirmPassword"
                            required
                            type="password"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            className="h-12 pl-10 bg-background/50"
                          />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        type="submit" 
                        className="w-full h-12 text-base font-medium relative group" 
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            Create Account
                            <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center space-y-2 pt-4"
          >
            <p className="text-sm text-muted-foreground">Trusted by pet owners across the city</p>
            <div className="flex items-center justify-center space-x-4">
              <div className="w-2 h-2 rounded-full bg-primary/50" />
              <div className="w-2 h-2 rounded-full bg-primary/30" />
              <div className="w-2 h-2 rounded-full bg-primary/20" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}