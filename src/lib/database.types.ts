export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      pets: {
        Row: {
          id: string
          name: string
          breed: string | null
          user_id: string
          size: string | null
          dob: string | null
          gender: string | null
          age: number | null
          weight: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          breed?: string | null
          user_id: string
          size?: string | null
          dob?: string | null
          gender?: string | null
          age?: number | null
          weight?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          breed?: string | null
          user_id?: string
          size?: string | null
          dob?: string | null
          gender?: string | null
          age?: number | null
          weight?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 