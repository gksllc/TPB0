import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ 
    req, 
    res,
  }, {
    supabaseUrl: 'https://ufeqqnxdykarmbpvjnsz.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZXFxbnhkeWthcm1icHZqbnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA1NzI4NDksImV4cCI6MjA0NjE0ODg0OX0.tLQz4qFlb36BTaUFVpI39v7V3cTDs2FBTfESqb7Nj00'
  })

  await supabase.auth.getSession()

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
} 