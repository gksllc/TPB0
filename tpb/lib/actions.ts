'use server'

import { cookies } from 'next/headers'
import type { Session } from '@supabase/supabase-js'

const COOKIE_OPTIONS = {
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 7, // 7 days
}

export async function handleCookieAction(action: 'set' | 'remove', session?: Session) {
  const cookieStore = cookies()

  if (action === 'set' && session) {
    cookieStore.set('sb-session', JSON.stringify(session), {
      ...COOKIE_OPTIONS,
      domain: process.env.NEXT_PUBLIC_DOMAIN || undefined
    })
  } else if (action === 'remove') {
    cookieStore.delete('sb-session', {
      ...COOKIE_OPTIONS,
      domain: process.env.NEXT_PUBLIC_DOMAIN || undefined
    })
  }
} 