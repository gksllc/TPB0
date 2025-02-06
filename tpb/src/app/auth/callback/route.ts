import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createServerComponentClient<Database>({ cookies })
    
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