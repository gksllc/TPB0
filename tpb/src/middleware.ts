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

    // Updated role-based route protection
    const roleRoutes = {
      '/dashboard': ['admin'],          // Only admin can access /dashboard
      '/employee': ['employee'],        // Only employee can access /employee/*
      '/client': ['client'],           // Only client can access /client/*
    }

    // Check if user has permission for the route
    for (const [route, roles] of Object.entries(roleRoutes)) {
      if (path.startsWith(route) && !roles.includes(userData.role)) {
        // Redirect to appropriate homepage based on role
        const redirectPath = userData.role === 'admin' ? '/dashboard' 
                         : userData.role === 'client' ? '/client'
                         : '/employee/dashboard'
        return NextResponse.redirect(new URL(redirectPath, req.url))
      }
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.redirect(new URL('/', req.url))
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