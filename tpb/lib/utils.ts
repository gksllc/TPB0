import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generatePassword(length: number = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  let password = ""
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

export const formatPhoneNumber = (value: string): string => {
  // Remove all non-digits
  const cleaned = value.replace(/\D/g, '')
  
  // Limit to 10 digits
  const truncated = cleaned.slice(0, 10)
  
  // Format as XXX-XXX-XXXX
  if (truncated.length >= 7) {
    return `${truncated.slice(0, 3)}-${truncated.slice(3, 6)}-${truncated.slice(6)}`
  } else if (truncated.length >= 4) {
    return `${truncated.slice(0, 3)}-${truncated.slice(3)}`
  } else if (truncated.length > 0) {
    return truncated
  }
  
  return ''
}
