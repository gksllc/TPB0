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

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Page() {
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
        console.log('Session found:', {
          userId: session.user.id,
          email: session.user.email,
          metadata: session.user.user_metadata,
          app_metadata: session.user.app_metadata // Log existing app_metadata
        })

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

        // First check if user exists in users table
        const { data: userData, error: userError } = await serviceRoleClient
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        console.log('User query result:', {
          data: userData,
          error: userError ? {
            code: userError.code,
            message: userError.message,
            details: userError.details,
            hint: userError.hint
          } : null
        })

        if (userError) {
          if (userError.code === 'PGRST116') {
            console.log('Creating new user record for:', session.user.email)
            
            try {
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

              if (insertError) {
                console.error('Error creating user:', {
                  error: insertError,
                  code: insertError.code,
                  message: insertError.message,
                  details: insertError.details,
                  hint: insertError.hint
                })
                return <AuthPage />
              }

              console.log('Successfully created user:', insertData)

              try {
                // Update user's JWT claims with their role using admin API
                const { data: adminData, error: adminError } = await serviceRoleClient.auth.admin.updateUserById(
                  session.user.id,
                  {
                    app_metadata: { role: 'client' },
                    user_metadata: {
                      ...session.user.user_metadata,
                      role: 'client'
                    }
                  }
                )

                if (adminError) {
                  console.error('Admin API error:', {
                    error: adminError,
                    code: adminError.status,
                    message: adminError.message,
                    name: adminError.name
                  })
                } else {
                  console.log('Successfully updated user claims:', adminData)
                }
              } catch (adminError) {
                console.error('Error calling admin API:', {
                  error: adminError,
                  message: adminError instanceof Error ? adminError.message : 'Unknown admin API error',
                  name: adminError instanceof Error ? adminError.name : 'Unknown',
                  stack: adminError instanceof Error ? adminError.stack : undefined
                })
              }

              // Redirect regardless of JWT update success
              redirect('/client/dashboard')
            } catch (createError) {
              console.error('Error in user creation process:', {
                error: createError,
                message: createError instanceof Error ? createError.message : 'Unknown error in user creation'
              })
              return <AuthPage />
            }
          } else {
            console.error('User data error:', {
              error: userError,
              code: userError.code,
              message: userError.message,
              details: userError.details,
              hint: userError.hint
            })
            return <AuthPage />
          }
        }

        if (userData) {
          console.log('Found existing user:', userData)

          try {
            // Update user's JWT claims with their role using admin API
            const { data: adminData, error: adminError } = await serviceRoleClient.auth.admin.updateUserById(
              session.user.id,
              {
                app_metadata: { role: userData.role },
                user_metadata: {
                  ...session.user.user_metadata,
                  role: userData.role
                }
              }
            )

            if (adminError) {
              console.error('Admin API error:', {
                error: adminError,
                code: adminError.status,
                message: adminError.message,
                name: adminError.name
              })
            } else {
              console.log('Successfully updated user claims:', adminData)
            }
          } catch (adminError) {
            console.error('Error calling admin API:', {
              error: adminError,
              message: adminError instanceof Error ? adminError.message : 'Unknown admin API error',
              name: adminError instanceof Error ? adminError.name : 'Unknown',
              stack: adminError instanceof Error ? adminError.stack : undefined
            })
          }

          // Redirect based on role regardless of JWT update success
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
      } catch (userProcessError) {
        console.error('Error in user processing:', {
          error: userProcessError,
          message: userProcessError instanceof Error ? userProcessError.message : 'Unknown error in user processing',
          stack: userProcessError instanceof Error ? userProcessError.stack : undefined
        })
        return <AuthPage />
      }
    }

    return <AuthPage />
  } catch (error) {
    console.error('Root page error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      keys: error && typeof error === 'object' ? Object.keys(error) : []
    })
    return <AuthPage />
  }
} 