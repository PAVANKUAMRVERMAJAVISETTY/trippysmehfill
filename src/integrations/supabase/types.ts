export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      banners: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          comments: string | null
          created_at: string
          delivery: number
          food: number
          id: string
          order_id: string
          packing: number
          taste: number
        }
        Insert: {
          comments?: string | null
          created_at?: string
          delivery?: number
          food?: number
          id?: string
          order_id: string
          packing?: number
          taste?: number
        }
        Update: {
          comments?: string | null
          created_at?: string
          delivery?: number
          food?: number
          id?: string
          order_id?: string
          packing?: number
          taste?: number
        }
        Relationships: [
          {
            foreignKeyName: "feedback_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          created_at: string
          id: string
          low_threshold: number
          name: string
          quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          low_threshold?: number
          name: string
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          low_threshold?: number
          name?: string
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      menu_ingredients: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          menu_item_id: string
          qty_per_serving: number
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          menu_item_id: string
          qty_per_serving?: number
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          menu_item_id?: string
          qty_per_serving?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_ingredients_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_ingredients_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          is_special: boolean
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_special?: boolean
          name: string
          price?: number
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_special?: boolean
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          accepted_at: string | null
          address: string
          assigned_at: string | null
          campus: string | null
          cancelled_at: string | null
          created_at: string
          customer_name: string
          delivered_at: string | null
          delivery_fee: number
          delivery_minutes: number | null
          driver_id: string | null
          driver_lat: number | null
          driver_lng: number | null
          driver_location_at: string | null
          eta_minutes: number
          food_preference: string | null
          geo_address: string | null
          id: string
          inventory_deducted: boolean
          ip_address: string | null
          items: Json
          latitude: number | null
          longitude: number | null
          notes: string | null
          order_no: number
          payment_method: string
          payment_ref: string | null
          payment_status: string
          phone: string
          ready_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax: number
          total: number
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          address: string
          assigned_at?: string | null
          campus?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_name: string
          delivered_at?: string | null
          delivery_fee?: number
          delivery_minutes?: number | null
          driver_id?: string | null
          driver_lat?: number | null
          driver_lng?: number | null
          driver_location_at?: string | null
          eta_minutes?: number
          food_preference?: string | null
          geo_address?: string | null
          id?: string
          inventory_deducted?: boolean
          ip_address?: string | null
          items?: Json
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          order_no?: number
          payment_method?: string
          payment_ref?: string | null
          payment_status?: string
          phone: string
          ready_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax?: number
          total?: number
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          address?: string
          assigned_at?: string | null
          campus?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_name?: string
          delivered_at?: string | null
          delivery_fee?: number
          delivery_minutes?: number | null
          driver_id?: string | null
          driver_lat?: number | null
          driver_lng?: number | null
          driver_location_at?: string | null
          eta_minutes?: number
          food_preference?: string | null
          geo_address?: string | null
          id?: string
          inventory_deducted?: boolean
          ip_address?: string | null
          items?: Json
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          order_no?: number
          payment_method?: string
          payment_ref?: string | null
          payment_status?: string
          phone?: string
          ready_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax?: number
          total?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          photo_url: string | null
          status: string
          username: string
          vehicle_number: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          email?: string | null
          id: string
          name: string
          phone?: string | null
          photo_url?: string | null
          status?: string
          username: string
          vehicle_number?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          status?: string
          username?: string
          vehicle_number?: string | null
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          close_time: string
          closed_message: string
          created_at: string
          delivery_charge: number
          eta_minutes: number
          free_delivery_threshold: number
          id: boolean
          is_open: boolean
          min_order_value: number
          open_time: string
          tax_percent: number
          updated_at: string
          upi_id: string
          whatsapp_number: string
        }
        Insert: {
          close_time?: string
          closed_message?: string
          created_at?: string
          delivery_charge?: number
          eta_minutes?: number
          free_delivery_threshold?: number
          id?: boolean
          is_open?: boolean
          min_order_value?: number
          open_time?: string
          tax_percent?: number
          updated_at?: string
          upi_id?: string
          whatsapp_number?: string
        }
        Update: {
          close_time?: string
          closed_message?: string
          created_at?: string
          delivery_charge?: number
          eta_minutes?: number
          free_delivery_threshold?: number
          id?: boolean
          is_open?: boolean
          min_order_value?: number
          open_time?: string
          tax_percent?: number
          updated_at?: string
          upi_id?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_customer: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      order_summary: {
        Args: { p_order_id: string }
        Returns: {
          customer_name: string
          has_feedback: boolean
          order_no: number
          status: Database["public"]["Enums"]["order_status"]
        }[]
      }
      place_order:
        | {
            Args: {
              p_address: string
              p_campus: string
              p_food_preference: string
              p_items: Json
              p_name: string
              p_notes: string
              p_phone: string
              p_total: number
            }
            Returns: {
              id: string
              order_no: number
            }[]
          }
        | {
            Args: {
              p_address: string
              p_campus: string
              p_food_preference: string
              p_geo_address?: string
              p_ip_address?: string
              p_items: Json
              p_latitude?: number
              p_longitude?: number
              p_name: string
              p_notes: string
              p_phone: string
              p_total: number
            }
            Returns: {
              id: string
              order_no: number
            }[]
          }
      submit_feedback: {
        Args: {
          p_comments: string
          p_delivery: number
          p_food: number
          p_order_id: string
          p_packing: number
          p_taste: number
        }
        Returns: undefined
      }
      track_orders: {
        Args: { p_phone: string }
        Returns: {
          created_at: string
          driver_name: string
          id: string
          items: Json
          order_no: number
          status: Database["public"]["Enums"]["order_status"]
          total: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "driver"
      order_status:
        | "pending"
        | "assigned"
        | "delivered"
        | "cancelled"
        | "payment_pending"
        | "payment_successful"
        | "accepted"
        | "preparing"
        | "cooking"
        | "packing"
        | "ready"
        | "out_for_delivery"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff", "driver"],
      order_status: [
        "pending",
        "assigned",
        "delivered",
        "cancelled",
        "payment_pending",
        "payment_successful",
        "accepted",
        "preparing",
        "cooking",
        "packing",
        "ready",
        "out_for_delivery",
      ],
    },
  },
} as const
