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
      cash_flow_transactions: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          transaction_date?: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          client_id: string
          created_at: string
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          client_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          client_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active: boolean
          created_at: string
          due_day: number
          id: string
          monthly_fee: number
          name: string
          notes: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          due_day?: number
          id?: string
          monthly_fee?: number
          name: string
          notes?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          due_day?: number
          id?: string
          monthly_fee?: number
          name?: string
          notes?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      complement_menu_items: {
        Row: {
          client_id: string
          complement_id: string
          created_at: string
          id: string
          menu_item_id: string
        }
        Insert: {
          client_id: string
          complement_id: string
          created_at?: string
          id?: string
          menu_item_id: string
        }
        Update: {
          client_id?: string
          complement_id?: string
          created_at?: string
          id?: string
          menu_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complement_menu_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complement_menu_items_complement_id_fkey"
            columns: ["complement_id"]
            isOneToOne: false
            referencedRelation: "complements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complement_menu_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      complements: {
        Row: {
          active: boolean
          category_id: string | null
          client_id: string
          created_at: string
          id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "complements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_neighborhoods: {
        Row: {
          active: boolean
          client_id: string
          created_at: string
          delivery_fee: number
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          client_id: string
          created_at?: string
          delivery_fee?: number
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          client_id?: string
          created_at?: string
          delivery_fee?: number
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          active: boolean
          category_id: string | null
          client_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          client_id: string
          complements: Json | null
          created_at: string
          id: string
          observations: string | null
          order_id: string
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          client_id: string
          complements?: Json | null
          created_at?: string
          id?: string
          observations?: string | null
          order_id: string
          product_name: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          client_id?: string
          complements?: Json | null
          created_at?: string
          id?: string
          observations?: string | null
          order_id?: string
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_id: string
          created_at: string
          customer_name: string
          id: string
          order_number: number
          payment_method: string
          status: string
          table_session_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          customer_name: string
          id?: string
          order_number?: number
          payment_method: string
          status?: string
          table_session_id?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          customer_name?: string
          id?: string
          order_number?: number
          payment_method?: string
          status?: string
          table_session_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_session_id_fkey"
            columns: ["table_session_id"]
            isOneToOne: false
            referencedRelation: "table_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_rates: {
        Row: {
          client_id: string
          id: string
          payment_method: string
          rate_percentage: number
          updated_at: string
        }
        Insert: {
          client_id: string
          id?: string
          payment_method: string
          rate_percentage: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          id?: string
          payment_method?: string
          rate_percentage?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_rates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      printer_config: {
        Row: {
          client_id: string
          connection_type: string
          id: string
          ip_address: string | null
          paper_width: string | null
          port: string | null
          printer_name: string | null
          printer_type: string
          updated_at: string
          updated_by: string | null
          usb_port: string | null
        }
        Insert: {
          client_id: string
          connection_type?: string
          id?: string
          ip_address?: string | null
          paper_width?: string | null
          port?: string | null
          printer_name?: string | null
          printer_type?: string
          updated_at?: string
          updated_by?: string | null
          usb_port?: string | null
        }
        Update: {
          client_id?: string
          connection_type?: string
          id?: string
          ip_address?: string | null
          paper_width?: string | null
          port?: string | null
          printer_name?: string | null
          printer_type?: string
          updated_at?: string
          updated_by?: string | null
          usb_port?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "printer_config_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printer_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          client_id: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          full_name: string
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      session_payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          net_amount: number
          payment_method: string
          table_session_id: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          net_amount: number
          payment_method: string
          table_session_id: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          net_amount?: number
          payment_method?: string
          table_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_payments_table_session_id_fkey"
            columns: ["table_session_id"]
            isOneToOne: false
            referencedRelation: "table_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          client_id: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          client_id: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          client_id?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      table_sessions: {
        Row: {
          client_id: string
          closed_at: string | null
          created_at: string
          created_by: string | null
          customer_name: string | null
          id: string
          opened_at: string
          status: string
          table_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          id?: string
          opened_at?: string
          status?: string
          table_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          id?: string
          opened_at?: string
          status?: string
          table_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          active: boolean
          client_id: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          client_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_admin_user: { Args: never; Returns: undefined }
      get_user_client_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      resolve_client_login: {
        Args: { _client_name: string; _username: string }
        Returns: {
          client_active: boolean
          client_id: string
          email: string
        }[]
      }
      resolve_super_admin_login: {
        Args: { _username: string }
        Returns: {
          email: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "atendente" | "cozinha" | "super_admin"
      transaction_type: "entrada" | "saida"
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
      app_role: ["admin", "atendente", "cozinha", "super_admin"],
      transaction_type: ["entrada", "saida"],
    },
  },
} as const
