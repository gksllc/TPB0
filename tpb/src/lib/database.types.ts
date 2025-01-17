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
          first_name: string
          last_name: string
          phone: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          preferred_communication: string
          secondary_contacts: Json
          role: 'admin' | 'client' | 'employee'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          preferred_communication?: string
          secondary_contacts?: Json
          role?: 'admin' | 'client' | 'employee'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          preferred_communication?: string
          secondary_contacts?: Json
          role?: 'admin' | 'client' | 'employee'
          created_at?: string
          updated_at?: string
        }
      }
      pets: {
        Row: {
          id: string
          created_at: string
          name: string
          breed: string | null
          age: number | null
          owner_id: string
          species: string
          image_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          breed?: string | null
          age?: number | null
          owner_id: string
          species?: string
          image_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          breed?: string | null
          age?: number | null
          owner_id?: string
          species?: string
          image_url?: string | null
        }
      }
    }
  }
}

interface SecondaryContact {
  name: string
  phone: string
  email: string
  relationship: string
} 