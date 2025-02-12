import type { Database } from '../database.types'
import type { Session } from '@supabase/supabase-js'

export type UUID = string & { _brand: 'UUID' }

export type UserRole = 'admin' | 'client'

export type UserSession = Session

export interface AuthError {
  message: string
  status: number
  name: string
  stack?: string
}

export interface AuthState {
  loading: boolean
  session: UserSession | null
  error: AuthError | null
}

// For audit logging
export type AuthAction = 
  | 'login'
  | 'logout'
  | 'token_refresh'
  | 'password_reset'
  | 'signup'
  | 'unauthorized_access'

export interface AuthAuditLog {
  userId: UUID
  action: AuthAction
  timestamp: string
  metadata?: Record<string, any>
  ip?: string
  userAgent?: string
}

export type Tables = Database['public']['Tables']
export type UserRow = Tables['users']['Row'] 