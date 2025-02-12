import type { CookieOptions } from '@supabase/ssr'

export const COOKIE_OPTIONS: CookieOptions = {
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7 // 1 week
} 