import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'
import { createAuditLog, shouldRefreshToken } from '@/lib/utils/auth'
import type { UserRole, UUID } from '@/lib/types/auth'
import { asUUID } from '@/lib/utils/uuid'

const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

async function getSession(req: NextRequest, res: NextResponse) {
  let retryCount = 0
  let session = null
  let sessionError = null

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          const cookies = req.cookies.getAll()
          return cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
          }))
        },
        async setAll(cookieList) {
          for (const cookie of cookieList) {
            res.cookies.set({
              name: cookie.name,
              value: cookie.value,
              ...cookie.options,
            })
          }
        },
      },
    }
  )

  while (retryCount < MAX_RETRIES) {
    try {
      const result = await supabase.auth.getSession()
      session = result.data.session
      sessionError = result.error
      if (!sessionError) break
    } catch (error) {
      sessionError = error
    }

    retryCount++
    if (retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCount))
    }
  }

  return { supabase, session, error: sessionError }
}

async function refreshSessionIfNeeded(
  supabase: ReturnType<typeof createServerClient>,
  session: NonNullable<Awaited<ReturnType<typeof getSession>>['session']>
) {
  try {
    const expiresAt = session.expires_at
    if (!expiresAt) return session

    if (shouldRefreshToken(expiresAt)) {
      const { data: { session: refreshedSession }, error: refreshError } = 
        await supabase.auth.refreshSession()

      if (refreshError) {
        console.error('Session refresh error:', refreshError)
        throw refreshError
      }

      if (refreshedSession) {
        const userId = asUUID(session.user.id)
        await createAuditLog({
          userId,
          action: 'token_refresh',
          metadata: { automatic: true }
        })
        return refreshedSession
      }
    }
    return session
  } catch (error) {
    console.error('Session refresh exception:', error)
    throw error
  }
}

async function getUserRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: UUID
): Promise<UserRole> {
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (userError) {
    console.error('User role error:', userError)
    throw userError
  }

  return userData.role as UserRole
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  try {
    // Get session with retries
    const { supabase, session, error: sessionError } = await getSession(req, res)

    if (sessionError) {
      console.error('Session error after retries:', sessionError)
      return handleAuthError(req)
    }

    if (session) {
      // Refresh session if needed
      const currentSession = await refreshSessionIfNeeded(supabase, session)
      
      // Get user role
      const userId = asUUID(currentSession.user.id)
      const role = await getUserRole(supabase, userId)

      // Handle route protection based on role
      const path = req.nextUrl.pathname

      if (path.startsWith('/dashboard') && role !== 'admin') {
        await createAuditLog({
          userId,
          action: 'unauthorized_access',
          metadata: { path, role }
        })
        return NextResponse.redirect(new URL('/', req.url))
      }

      if (path.startsWith('/client') && role !== 'client' && role !== 'admin') {
        await createAuditLog({
          userId,
          action: 'unauthorized_access',
          metadata: { path, role }
        })
        return NextResponse.redirect(new URL('/', req.url))
      }

      // Redirect from auth pages if already authenticated
      if (path.startsWith('/auth')) {
        const dashboardUrl = new URL(
          role === 'admin' ? '/dashboard/admin-appointments' :
          role === 'client' ? '/client/dashboard' : '/',
          req.url
        )
        return NextResponse.redirect(dashboardUrl)
      }
    } else {
      // No valid session
      if (isProtectedRoute(req.nextUrl.pathname)) {
        return redirectToLogin(req)
      }
    }

    const response = NextResponse.next()

    // Copy over the cookies from the middleware response to the final response
    const cookies = res.cookies.getAll()
    for (const cookie of cookies) {
      const { name, value, ...options } = cookie
      response.cookies.set({
        name,
        value,
        ...options,
      })
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    return handleAuthError(req)
  }
}

function isProtectedRoute(pathname: string): boolean {
  const protectedPaths = [
    '/dashboard',
    '/client',
    '/api/appointments',
  ]
  
  return protectedPaths.some(prefix => pathname.startsWith(prefix))
}

function redirectToLogin(req: NextRequest) {
  const redirectUrl = req.nextUrl.clone()
  const loginUrl = new URL('/auth/login', req.url)
  loginUrl.searchParams.set('redirectTo', redirectUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

function handleAuthError(req: NextRequest) {
  if (isProtectedRoute(req.nextUrl.pathname)) {
    return redirectToLogin(req)
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|assets).*)',
  ]
}