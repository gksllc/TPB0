import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
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
    
    try {
      const { data: { user }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (sessionError) throw sessionError
      
      if (user) {
        // Check if user already exists in the users table
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!existingUser) {
          const userData = {
            id: user.id,
            email: user.email,
            role: 'client',
            first_name: user.user_metadata.first_name,
            last_name: user.user_metadata.last_name,
            created_at: new Date().toISOString()
          }

          console.log('Creating new user with data:', userData)

          // Create user record if it doesn't exist
          const { error: insertError } = await supabase
            .from('users')
            .insert([userData])

          if (insertError) {
            console.error('Insert error:', insertError)
            throw insertError
          }
        }
      }
    } catch (error) {
      console.error('Error in auth callback:', error)
      return NextResponse.redirect(`${requestUrl.origin}/auth-error`)
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/client`)
} 