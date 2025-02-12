import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../database.types'
import { COOKIE_OPTIONS } from './cookies'

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      cookieOptions: COOKIE_OPTIONS,
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-web',
      },
    },
  })
} 