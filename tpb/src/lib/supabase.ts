import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufeqqnxdykarmbpvjnsz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZXFxbnhkeWthcm1icHZqbnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA1NzI4NDksImV4cCI6MjA0NjE0ODg0OX0.tLQz4qFlb36BTaUFVpI39v7V3cTDs2FBTfESqb7Nj00'

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 