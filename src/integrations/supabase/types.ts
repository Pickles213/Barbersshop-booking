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
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_role: string | null
          actor_user_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          summary: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          summary?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          summary?: string | null
        }
        Relationships: []
      }
      barber_portfolio: {
        Row: {
          barber_id: string
          caption: string | null
          created_at: string
          id: string
          image_url: string
        }
        Insert: {
          barber_id: string
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
        }
        Update: {
          barber_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_portfolio_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      charities: {
        Row: {
          id: string
          title: string
          description: string | null
          video_url: string | null
          event_date: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
          location: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          video_url?: string | null
          event_date?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          location?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          video_url?: string | null
          event_date?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          location?: string | null
        }
        Relationships: []
      }
      barber_categories: {
        Row: {
          barber_id: string
          category: string
          created_at: string
          id: string
        }
        Insert: {
          barber_id: string
          category: string
          created_at?: string
          id?: string
        }
        Update: {
          barber_id?: string
          category?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_categories_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          experience_years: number
          id: string
          is_active: boolean
          name: string
          rating: number
          specialization: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          experience_years?: number
          id?: string
          is_active?: boolean
          name: string
          rating?: number
          specialization?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          experience_years?: number
          id?: string
          is_active?: boolean
          name?: string
          rating?: number
          specialization?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          category: string
          description: string | null
          key: string
          label: string
        }
        Insert: {
          category: string
          description?: string | null
          key: string
          label: string
        }
        Update: {
          category?: string
          description?: string | null
          key?: string
          label?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      user_permission_overrides: {
        Row: {
          granted: boolean
          granted_by: string | null
          permission_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          granted: boolean
          granted_by?: string | null
          permission_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          granted?: boolean
          granted_by?: string | null
          permission_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
        }
        Relationships: []
      }
      role_permission_assignments: {
        Row: {
          permission_key: string
          role_id: string
        }
        Insert: {
          permission_key: string
          role_id: string
        }
        Update: {
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permission_assignments_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permission_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          barber_id: string | null
          booking_date: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          price: number
          reference: string
          service_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          user_id: string | null
        }
        Insert: {
          barber_id?: string | null
          booking_date: string
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          price?: number
          reference?: string
          service_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          user_id?: string | null
        }
        Update: {
          barber_id?: string | null
          booking_date?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          price?: number
          reference?: string
          service_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_services: {
        Row: {
          booking_id: string
          created_at: string
          duration_minutes: number
          id: string
          price: number
          service_id: string | null
          service_name: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          price?: number
          service_id?: string | null
          service_name: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          price?: number
          service_id?: string | null
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_services_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string
          holiday_date: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          holiday_date: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          holiday_date?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          barber_id: string | null
          barber_name: string | null
          booking_id: string | null
          comment: string | null
          created_at: string
          customer_name: string
          id: string
          rating: number
          service_name: string
          updated_at: string
        }
        Insert: {
          barber_id?: string | null
          barber_name?: string | null
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          customer_name: string
          id?: string
          rating: number
          service_name: string
          updated_at?: string
        }
        Update: {
          barber_id?: string | null
          barber_name?: string | null
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          rating?: number
          service_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          barber_id: string
          day_of_week: number
          end_time: string
          id: string
          is_off: boolean
          start_time: string
        }
        Insert: {
          barber_id: string
          day_of_week: number
          end_time?: string
          id?: string
          is_off?: boolean
          start_time?: string
        }
        Update: {
          barber_id?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_off?: boolean
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price: number
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          price?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
        }
        Relationships: []
      }
      shop_settings: {
        Row: {
          about_image_url: string | null
          about_video_url: string | null
          close_time: string
          facebook_url: string | null
          hero_slideshow: string[] | null
          id: number
          instagram_url: string | null
          mission_video_url: string | null
          open_time: string
          payment_card: boolean
          payment_cash: boolean
          payment_gcash: boolean
          payment_maya: boolean
          services_image_url: string | null
          shop_address: string | null
          shop_email: string | null
          shop_name: string
          shop_phone: string | null
          tiktok_url: string | null
          updated_at: string
          x_url: string | null
          about_hero_title: string | null
          about_hero_subtitle: string | null
          about_heading: string | null
          about_body: string | null
          about_year: string | null
        }
        Insert: {
          about_image_url?: string | null
          about_video_url?: string | null
          close_time?: string
          facebook_url?: string | null
          hero_slideshow?: string[] | null
          id?: number
          instagram_url?: string | null
          mission_video_url?: string | null
          open_time?: string
          payment_card?: boolean
          payment_cash?: boolean
          payment_gcash?: boolean
          payment_maya?: boolean
          services_image_url?: string | null
          shop_address?: string | null
          shop_email?: string | null
          shop_name?: string
          shop_phone?: string | null
          tiktok_url?: string | null
          updated_at?: string
          x_url?: string | null
          about_hero_title?: string | null
          about_hero_subtitle?: string | null
          about_heading?: string | null
          about_body?: string | null
          about_year?: string | null
        }
        Update: {
          about_image_url?: string | null
          about_video_url?: string | null
          close_time?: string
          facebook_url?: string | null
          hero_slideshow?: string[] | null
          id?: number
          instagram_url?: string | null
          mission_video_url?: string | null
          open_time?: string
          payment_card?: boolean
          payment_cash?: boolean
          payment_gcash?: boolean
          payment_maya?: boolean
          services_image_url?: string | null
          shop_address?: string | null
          shop_email?: string | null
          shop_name?: string
          shop_phone?: string | null
          tiktok_url?: string | null
          updated_at?: string
          x_url?: string | null
          about_hero_title?: string | null
          about_hero_subtitle?: string | null
          about_heading?: string | null
          about_body?: string | null
          about_year?: string | null
        }
        Relationships: []
      }
      time_off: {
        Row: {
          barber_id: string
          created_at: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
        }
        Insert: {
          barber_id: string
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
        }
        Update: {
          barber_id?: string
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      walk_ins: {
        Row: {
          barber_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          estimated_wait_minutes: number
          id: string
          notes: string | null
          queue_number: number | null
          served_at: string | null
          service_id: string | null
          status: Database["public"]["Enums"]["walkin_status"]
          user_id: string | null
        }
        Insert: {
          barber_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          estimated_wait_minutes?: number
          id?: string
          notes?: string | null
          queue_number?: number | null
          served_at?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["walkin_status"]
          user_id?: string | null
        }
        Update: {
          barber_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          estimated_wait_minutes?: number
          id?: string
          notes?: string | null
          queue_number?: number | null
          served_at?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["walkin_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "walk_ins_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walk_ins_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      time_off_admin: {
        Row: {
          barber_id: string | null
          created_at: string | null
          end_date: string | null
          id: string | null
          reason: string | null
          start_date: string | null
        }
        Insert: {
          barber_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string | null
          reason?: string | null
          start_date?: string | null
        }
        Update: {
          barber_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string | null
          reason?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_off_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _audit_actor: {
        Args: never
        Returns: {
          email: string
          role: string
          uid: string
        }[]
      }
      _audit_write: {
        Args: {
          p_action: string
          p_after: Json
          p_before: Json
          p_entity_id: string
          p_entity_type: string
          p_summary: string
        }
        Returns: undefined
      }
      get_available_slots: {
        Args: {
          p_barber_id: string
          p_date: string
          p_duration_minutes: number
        }
        Returns: string[]
      }
      get_public_queue: {
        Args: never
        Returns: {
          created_at: string
          duration_minutes: number
          first_name: string
          id: string
          queue_number: number
          served_at: string
          service_id: string
          status: Database["public"]["Enums"]["walkin_status"]
        }[]
      }
      has_permission: {
        Args: {
          _permission_key: string
          _user_id: string
        }
        Returns: boolean
      }
      get_barber_reviews: {
        Args: {
          p_barber_id: string
        }
        Returns: {
          id: string
          created_at: string
          rating: number
          comment: string | null
          customer_name: string
          service_name: string
        }[]
      }
      get_barber_stats: {
        Args: {
          p_barber_id: string
        }
        Returns: {
          appointments_completed: number
          clients_served: number
        }[]
      }
      get_my_permissions: {
        Args: never
        Returns: string[]
      }
      get_my_roles: {
        Args: never
        Returns: {
          id: string
          name: string
          description: string | null
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_customer_by_email: {
        Args: { p_email: string }
        Returns: {
          email: string
          full_name: string
          phone: string
          user_id: string
        }[]
      }
      public_booking_create: {
        Args: {
          p_barber_id: string
          p_booking_date: string
          p_customer_email: string
          p_customer_name: string
          p_customer_phone: string
          p_notes?: string
          p_service_ids: string[]
          p_start_time: string
        }
        Returns: {
          barber_id: string | null
          booking_date: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          price: number
          reference: string
          service_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "barber"
      booking_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      walkin_status: "waiting" | "in_progress" | "completed" | "cancelled"
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
      app_role: ["admin", "staff", "barber"],
      booking_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      walkin_status: ["waiting", "in_progress", "completed", "cancelled"],
    },
  },
} as const
