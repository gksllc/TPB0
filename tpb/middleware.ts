import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'
import { asUUID } from '@/lib/utils/uuid'
import { createAuditLog } from '@/lib/utils/auth'
import type { UUID } from '@/lib/types/auth'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value ?? ''
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          res.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    try {
      const userId: UUID = asUUID(session.user.id)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (userError) throw userError

      if (userData) {
        await createAuditLog({
          userId,
          action: 'token_refresh',
          metadata: { path: req.nextUrl.pathname }
        })
      }
    } catch (error) {
      console.error('Error in middleware:', error)
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 