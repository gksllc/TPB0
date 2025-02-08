import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req, res })

  try {
    // Refresh session if expired
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('Session error:', sessionError)
      return redirectToLogin(req)
    }

    // If no session and trying to access protected routes
    if (!session && (
      req.nextUrl.pathname.startsWith('/dashboard') ||
      req.nextUrl.pathname.startsWith('/client') ||
      req.nextUrl.pathname.startsWith('/employee') ||
      req.nextUrl.pathname.startsWith('/api/appointments')
    )) {
      return redirectToLogin(req)
    }

    // If accessing auth routes and we have a session, redirect to appropriate dashboard
    if (req.nextUrl.pathname.startsWith('/auth') && session) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (!userError && userData) {
        switch (userData.role) {
          case 'admin':
            return NextResponse.redirect(new URL('/dashboard/admin-appointments', req.url))
          case 'client':
            return NextResponse.redirect(new URL('/client/dashboard', req.url))
          case 'employee':
            return NextResponse.redirect(new URL('/employee/dashboard', req.url))
          default:
            return NextResponse.redirect(new URL('/client/dashboard', req.url))
        }
      }
    }

    // If accessing any dashboard routes
    if (req.nextUrl.pathname.startsWith('/dashboard')) {
      if (!session) {
        return redirectToLogin(req)
      }

      // Check if user has admin role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (userError || userData?.role !== 'admin') {
        console.error('Access denied: User is not an admin')
        return NextResponse.redirect(new URL('/', req.url))
      }
    }

    // Update response with new session cookies
    return res
  } catch (error) {
    console.error('Middleware error:', error)
    return redirectToLogin(req)
  }
}

function redirectToLogin(req: NextRequest) {
  const redirectUrl = req.nextUrl.clone()
  const loginUrl = new URL('/auth/login', req.url)
  loginUrl.searchParams.set('redirectTo', redirectUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/:path*',
    '/client/:path*',
    '/employee/:path*',
    '/api/appointments/:path*'
  ]
} 