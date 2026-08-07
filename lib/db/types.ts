/*
 * Hand-authored DB types for Phase 0. Replace with generated types once a
 * Supabase project exists:
 *   supabase gen types typescript --linked > lib/db/types.ts
 */
export interface Database {
  public: {
    Tables: {
      config: {
        Row: {
          id: string;
          max_cakes_per_week: number;
          min_notice_days: number;
          pickup_window: string;
          vacation_mode: boolean;
          vacation_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          max_cakes_per_week?: number;
          min_notice_days?: number;
          pickup_window?: string;
          vacation_mode?: boolean;
          vacation_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          max_cakes_per_week?: number;
          min_notice_days?: number;
          pickup_window?: string;
          vacation_mode?: boolean;
          vacation_message?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
