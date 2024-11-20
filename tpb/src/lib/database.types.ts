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
      clients: {
        Row: {
          id: string
          firstname: string
          lastname: string
          personalemail: string
          personalnumber: string
          created_at: string
          role: string
        }
        Insert: {
          id: string
          firstname: string
          lastname: string
          personalemail: string
          personalnumber: string
          created_at?: string
          role?: string
        }
        Update: {
          id?: string
          firstname?: string
          lastname?: string
          personalemail?: string
          personalnumber?: string
          created_at?: string
          role?: string
        }
      }
    }
  }
} 