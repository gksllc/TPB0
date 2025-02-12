'use server'

import { cookies } from 'next/headers'
import { COOKIE_OPTIONS } from '@/lib/supabase/cookies'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

type CookieOptions = Omit<ResponseCookie, 'name' | 'value'>

export async function setCookies(cookieData: { name: string; value: string; options?: CookieOptions }[]) {
  const cookieStore = await cookies()
  for (const cookie of cookieData) {
    cookieStore.set({
      name: cookie.name,
      value: cookie.value,
      ...COOKIE_OPTIONS,
      ...cookie.options,
    })
  }
}

export async function getCookies() {
  const cookieStore = await cookies()
  return cookieStore.getAll()
}

export async function removeCookies(names: string[]) {
  const cookieStore = await cookies()
  for (const name of names) {
    cookieStore.set({
      name,
      value: '',
      ...COOKIE_OPTIONS,
      maxAge: 0,
    })
  }
}

export async function getCookie(name: string) {
  const cookieStore = await cookies()
  return cookieStore.get(name)?.value
}

export async function setCookie(name: string, value: string, options?: CookieOptions) {
  const cookieStore = await cookies()
  cookieStore.set({
    name,
    value,
    ...COOKIE_OPTIONS,
    ...options,
  })
}

export async function deleteCookie(name: string, options?: CookieOptions) {
  const cookieStore = await cookies()
  cookieStore.set({
    name,
    value: '',
    ...COOKIE_OPTIONS,
    ...options,
    maxAge: 0,
  })
} 