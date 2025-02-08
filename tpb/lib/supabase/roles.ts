import { createClient } from "./client"

export const supabaseRoles = {
  getUserRole: async (userId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data?.role
  },

  hasRole: async (userId: string, allowedRoles: string[]) => {
    try {
      const role = await supabaseRoles.getUserRole(userId)
      return role ? allowedRoles.includes(role) : false
    } catch (error) {
      console.error('Error checking role:', error)
      return false
    }
  }
} 