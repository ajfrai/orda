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
      menus: {
        Row: {
          id: string
          created_at: string
          pdf_url: string
          restaurant_name: string
          location_city: string | null
          location_state: string | null
          tax_rate: number
          items: Json
        }
        Insert: {
          id?: string
          created_at?: string
          pdf_url: string
          restaurant_name: string
          location_city?: string | null
          location_state?: string | null
          tax_rate?: number
          items?: Json
        }
        Update: {
          id?: string
          created_at?: string
          pdf_url?: string
          restaurant_name?: string
          location_city?: string | null
          location_state?: string | null
          tax_rate?: number
          items?: Json
        }
      }
      carts: {
        Row: {
          id: string
          created_at: string
          menu_id: string | null
          tip_percentage: number
        }
        Insert: {
          id?: string
          created_at?: string
          menu_id?: string | null
          tip_percentage?: number
        }
        Update: {
          id?: string
          created_at?: string
          menu_id?: string | null
          tip_percentage?: number
        }
      }
      cart_items: {
        Row: {
          id: string
          created_at: string
          cart_id: string | null
          user_name: string
          item_name: string
          item_price: number | null
          is_price_estimate: boolean
          quantity: number
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          cart_id?: string | null
          user_name: string
          item_name: string
          item_price?: number | null
          is_price_estimate?: boolean
          quantity?: number
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          cart_id?: string | null
          user_name?: string
          item_name?: string
          item_price?: number | null
          is_price_estimate?: boolean
          quantity?: number
          notes?: string | null
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
