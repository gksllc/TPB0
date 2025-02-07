import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const generateTPBEmail = (
  firstName: string,
  lastName: string,
  middleInitial: string
): string => {
  const firstInitial = firstName.charAt(0).toLowerCase()
  const middleI = middleInitial ? middleInitial.charAt(0).toLowerCase() : ''
  const formattedLastName = lastName.toLowerCase()
  return `${formattedLastName}${firstInitial}${middleI}@tpb.com`
}

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ 
      error: 'Server configuration error' 
    }, { status: 500 })
  }

  try {
    const requestData = await request.json()
    
    // Create admin client with service role key
    const supabase = createClient<Database>(
      supabaseUrl,
      supabaseServiceKey
    )

    // Generate TPB email
    const tpbEmail = generateTPBEmail(
      requestData.first_name,
      requestData.last_name,
      requestData.middle_initial
    )

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', tpbEmail)
      .single()

    if (existingUser) {
      return NextResponse.json({ 
        error: 'A user with this email already exists' 
      }, { status: 400 })
    }

    // Create the user in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: tpbEmail,
      password: '00000000',
      email_confirm: true,
      app_metadata: {
        role: requestData.staff_role
      },
      user_metadata: {
        first_name: requestData.first_name,
        middle_initial: requestData.middle_initial,
        last_name: requestData.last_name,
        phone: requestData.phone,
        primary_email: requestData.primary_email
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Insert the user data into public.users table
    const { error: insertError } = await supabase
      .from('users')
      .upsert({
        id: authUser.user.id,
        email: tpbEmail,
        primary_email: requestData.primary_email,
        first_name: requestData.first_name,
        middle_initial: requestData.middle_initial,
        last_name: requestData.last_name,
        phone: requestData.phone,
        role: requestData.staff_role
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })

    if (insertError) {
      // If database insert fails, clean up the auth user
      await supabase.auth.admin.deleteUser(authUser.user.id)
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ 
      message: 'Staff member created successfully', 
      user: authUser.user,
      tpbEmail,
      password: '00000000'
    })

  } catch (error: any) {
    console.error('Server error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 