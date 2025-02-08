export const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  roles: {
    admin: 'admin',
    employee: 'employee',
    client: 'client'
  },
  routes: {
    signIn: '/',
    signUp: '/',
    forgotPassword: '/forgot-password',
    admin: '/dashboard',
    employee: '/employee/dashboard',
    client: '/client'
  }
} 