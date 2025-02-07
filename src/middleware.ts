'use client'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0
          })
        },
      },
    }
  )

  try {
    const { data: { session } } = await supabase.auth.getSession()

    // Handle public routes
    const publicRoutes = ['/', '/auth/callback']
    if (publicRoutes.includes(req.nextUrl.pathname)) {
      return res
    }

    // If no session, redirect to login
    if (!session) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // Get user role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (userError || !userData) {
      console.error('User data error:', userError)
      return NextResponse.redirect(new URL('/', req.url))
    }

    const path = req.nextUrl.pathname

    // Role-based route protection
    if (path.startsWith('/dashboard') && userData.role !== 'admin') {
      return NextResponse.redirect(new URL(getHomePageByRole(userData.role), req.url))
    }

    if (path.startsWith('/client') && userData.role !== 'client') {
      return NextResponse.redirect(new URL(getHomePageByRole(userData.role), req.url))
    }

    if (path.startsWith('/employee') && userData.role !== 'employee') {
      return NextResponse.redirect(new URL(getHomePageByRole(userData.role), req.url))
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.redirect(new URL('/', req.url))
  }
}

function getHomePageByRole(role: string): string {
  switch (role) {
    case 'admin':
      return '/dashboard/admin-appointments'
    case 'client':
      return '/client/dashboard'
    case 'employee':
      return '/employee/dashboard'
    default:
      return '/'
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ]
} 