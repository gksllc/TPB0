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
      appointments: {
        Row: {
          id: string
          c_order_id: string | null
          user_id: string
          pet_id: string
          service_type: string | null
          service_items: Json
          status: string
          appointment_date: string
          appointment_time: string
          employee_id: string
          employee_name: string
          appointment_duration: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          c_order_id?: string | null
          user_id: string
          pet_id: string
          service_type?: string | null
          service_items?: Json
          status?: string
          appointment_date: string
          appointment_time: string
          employee_id: string
          employee_name: string
          appointment_duration?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          c_order_id?: string | null
          user_id?: string
          pet_id?: string
          service_type?: string | null
          service_items?: Json
          status?: string
          appointment_date?: string
          appointment_time?: string
          employee_id?: string
          employee_name?: string
          appointment_duration?: number
          created_at?: string
          updated_at?: string
        }
      }
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
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
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

export interface SecondaryContact {
  name: string
  phone: string
  email: string
  relationship: string
} 