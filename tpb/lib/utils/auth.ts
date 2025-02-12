import type { AuthAuditLog, UserSession } from '../types/auth'
import { createClient } from '../supabase/client'

export const MAX_LOGIN_ATTEMPTS = 5
export const LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000 // 15 minutes
export const TOKEN_REFRESH_THRESHOLD = 60 * 60 // 1 hour in seconds

export const isValidSession = (sessionStr: string | null): boolean => {
  if (!sessionStr) return false
  try {
    const session = JSON.parse(sessionStr)
    return Boolean(
      session?.access_token &&
      session?.expires_at &&
      session?.user?.id
    )
  } catch {
    return false
  }
}

export const shouldRefreshToken = (expiresAt: number): boolean => {
  const now = Math.floor(Date.now() / 1000)
  return expiresAt - now < TOKEN_REFRESH_THRESHOLD
}

export const clearAuthData = async () => {
  if (typeof window === 'undefined') return
  
  const supabase = createClient()
  await supabase.auth.signOut()
  
  // Clear all auth-related storage
  localStorage.removeItem('sb-auth-token')
  sessionStorage.clear()
  
  // Clear auth cookies
  document.cookie.split(';').forEach(cookie => {
    const [name] = cookie.split('=')
    document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  })
}

export const createAuditLog = async (log: Omit<AuthAuditLog, 'timestamp'>) => {
  try {
    const supabase = createClient()
    const timestamp = new Date().toISOString()
    
    await supabase
      .from('auth_audit_logs')
      .insert([{ ...log, timestamp }])
      
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

export const getRateLimit = async (userId: string): Promise<number> => {
  const supabase = createClient()
  const now = new Date()
  const windowStart = new Date(now.getTime() - LOGIN_ATTEMPT_WINDOW)
  
  const { count } = await supabase
    .from('auth_audit_logs')
    .select('*', { count: 'exact' })
    .eq('userId', userId)
    .eq('action', 'login')
    .gte('timestamp', windowStart.toISOString())
    
  return MAX_LOGIN_ATTEMPTS - (count || 0)
}

export const rotateToken = async (session: UserSession) => {
  try {
    const supabase = createClient()
    const { data: { session: newSession }, error } = await supabase.auth.refreshSession()
    
    if (error) throw error
    
    if (newSession) {
      await createAuditLog({
        userId: session.user.id,
        action: 'token_refresh',
        metadata: { reason: 'security_rotation' }
      })
    }
    
    return newSession
  } catch (error) {
    console.error('Token rotation failed:', error)
    return null
  }
} 