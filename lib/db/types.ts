// Generated from the live Supabase project (`supabase gen types typescript`).
// Regenerate after schema changes:
//   supabase gen types typescript --project-id uciouqrrxrljbhjfcxpq > lib/db/types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      bakers: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      cakes: {
        Row: {
          category: Database["public"]["Enums"]["category"]
          created_at: string
          description: string | null
          flavour: string | null
          id: string
          image_path: string | null
          is_active: boolean
          size: string | null
          slug: string
          sort_order: number
          title: string
        }
        Insert: {
          category: Database["public"]["Enums"]["category"]
          created_at?: string
          description?: string | null
          flavour?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          size?: string | null
          slug: string
          sort_order?: number
          title: string
        }
        Update: {
          category?: Database["public"]["Enums"]["category"]
          created_at?: string
          description?: string | null
          flavour?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          size?: string | null
          slug?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      config: {
        Row: {
          created_at: string
          id: string
          max_cakes_per_week: number
          min_notice_days: number
          pickup_window: string
          vacation_message: string | null
          vacation_mode: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          max_cakes_per_week?: number
          min_notice_days?: number
          pickup_window?: string
          vacation_message?: string | null
          vacation_mode?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          max_cakes_per_week?: number
          min_notice_days?: number
          pickup_window?: string
          vacation_message?: string | null
          vacation_mode?: boolean
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          created_at: string
          event_date: string
          flavour: string
          id: string
          idempotency_key: string | null
          ig_handle: string | null
          internal_notes: string | null
          message: string | null
          notes: string | null
          notification_last_attempt_at: string | null
          notification_status: Database["public"]["Enums"]["notification_status"]
          occasion: Database["public"]["Enums"]["category"]
          preferred_name: string
          reference_link: string | null
          size: string
          status: Database["public"]["Enums"]["inquiry_status"]
          status_changed_at: string
          style_tag: string | null
          submitted_at: string
        }
        Insert: {
          created_at?: string
          event_date: string
          flavour: string
          id?: string
          idempotency_key?: string | null
          ig_handle?: string | null
          internal_notes?: string | null
          message?: string | null
          notes?: string | null
          notification_last_attempt_at?: string | null
          notification_status?: Database["public"]["Enums"]["notification_status"]
          occasion: Database["public"]["Enums"]["category"]
          preferred_name: string
          reference_link?: string | null
          size: string
          status?: Database["public"]["Enums"]["inquiry_status"]
          status_changed_at?: string
          style_tag?: string | null
          submitted_at?: string
        }
        Update: {
          created_at?: string
          event_date?: string
          flavour?: string
          id?: string
          idempotency_key?: string | null
          ig_handle?: string | null
          internal_notes?: string | null
          message?: string | null
          notes?: string | null
          notification_last_attempt_at?: string | null
          notification_status?: Database["public"]["Enums"]["notification_status"]
          occasion?: Database["public"]["Enums"]["category"]
          preferred_name?: string
          reference_link?: string | null
          size?: string
          status?: Database["public"]["Enums"]["inquiry_status"]
          status_changed_at?: string
          style_tag?: string | null
          submitted_at?: string
        }
        Relationships: []
      }
      inquiry_photos: {
        Row: {
          created_at: string
          id: string
          inquiry_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          inquiry_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          inquiry_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_photos_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_baker: { Args: never; Returns: boolean }
    }
    Enums: {
      category:
        | "birthday"
        | "kids"
        | "anniversary"
        | "wedding"
        | "cupcakes"
        | "just_because"
      inquiry_status:
        | "submitted"
        | "needs_quote"
        | "quoted"
        | "confirmed"
        | "completed"
        | "cancelled"
      notification_status: "pending" | "sent" | "failed"
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
      category: [
        "birthday",
        "kids",
        "anniversary",
        "wedding",
        "cupcakes",
        "just_because",
      ],
      inquiry_status: [
        "submitted",
        "needs_quote",
        "quoted",
        "confirmed",
        "completed",
        "cancelled",
      ],
      notification_status: ["pending", "sent", "failed"],
    },
  },
} as const
