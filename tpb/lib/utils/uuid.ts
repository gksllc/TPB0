import type { UUID } from '../types/auth'

export function asUUID(value: string): UUID {
  return value as UUID
} 