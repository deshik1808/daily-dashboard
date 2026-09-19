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
      bio_mining_entries: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          glass_mt: number | null
          id: string
          inert_mt: number | null
          inward_mt: number
          iron_scrap_mt: number | null
          others_mt: number | null
          phase_agency_id: string
          rdf_mt: number | null
          remarks: string | null
          report_date: string
          shift: Database["public"]["Enums"]["shift_enum"]
          soil_mt: number | null
          steel_mt: number | null
          stones_mt: number | null
          tyre_mt: number | null
          updated_at: string
          wires_cables_mt: number | null
          wood_mt: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          glass_mt?: number | null
          id?: string
          inert_mt?: number | null
          inward_mt?: number
          iron_scrap_mt?: number | null
          others_mt?: number | null
          phase_agency_id: string
          rdf_mt?: number | null
          remarks?: string | null
          report_date: string
          shift: Database["public"]["Enums"]["shift_enum"]
          soil_mt?: number | null
          steel_mt?: number | null
          stones_mt?: number | null
          tyre_mt?: number | null
          updated_at?: string
          wires_cables_mt?: number | null
          wood_mt?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          glass_mt?: number | null
          id?: string
          inert_mt?: number | null
          inward_mt?: number
          iron_scrap_mt?: number | null
          others_mt?: number | null
          phase_agency_id?: string
          rdf_mt?: number | null
          remarks?: string | null
          report_date?: string
          shift?: Database["public"]["Enums"]["shift_enum"]
          soil_mt?: number | null
          steel_mt?: number | null
          stones_mt?: number | null
          tyre_mt?: number | null
          updated_at?: string
          wires_cables_mt?: number | null
          wood_mt?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bio_mining_entries_phase_agency_id_fkey"
            columns: ["phase_agency_id"]
            isOneToOne: false
            referencedRelation: "phase_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bio_mining_entries_phase_agency_id_fkey"
            columns: ["phase_agency_id"]
            isOneToOne: false
            referencedRelation: "phase_totals"
            referencedColumns: ["phase_agency_id"]
          },
        ]
      }
      mrf_logs: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          log_date: string
          note: string
          photo_paths: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          log_date: string
          note?: string
          photo_paths?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          log_date?: string
          note?: string
          photo_paths?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      phase_master: {
        Row: {
          agency: Database["public"]["Enums"]["agency_enum"]
          created_at: string
          id: string
          order_qty_mt: number
          phase: Database["public"]["Enums"]["phase_enum"]
          status: Database["public"]["Enums"]["phase_status_enum"]
          updated_at: string
        }
        Insert: {
          agency: Database["public"]["Enums"]["agency_enum"]
          created_at?: string
          id?: string
          order_qty_mt: number
          phase: Database["public"]["Enums"]["phase_enum"]
          status: Database["public"]["Enums"]["phase_status_enum"]
          updated_at?: string
        }
        Update: {
          agency?: Database["public"]["Enums"]["agency_enum"]
          created_at?: string
          id?: string
          order_qty_mt?: number
          phase?: Database["public"]["Enums"]["phase_enum"]
          status?: Database["public"]["Enums"]["phase_status_enum"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      phase_material_breakdown: {
        Row: {
          disposed_mt: number | null
          material: string | null
          phase_agency_id: string | null
          share_pct: number | null
        }
        Relationships: []
      }
      phase_totals: {
        Row: {
          agency: Database["public"]["Enums"]["agency_enum"] | null
          balance_mt: number | null
          cumulative_disposed_mt: number | null
          cumulative_inward_mt: number | null
          last_report_date: string | null
          order_qty_mt: number | null
          pct_of_order: number | null
          phase: Database["public"]["Enums"]["phase_enum"] | null
          phase_agency_id: string | null
          status: Database["public"]["Enums"]["phase_status_enum"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      agency_enum: "Zigma" | "Card Box"
      phase_enum: "I" | "II" | "III"
      phase_status_enum: "Completed" | "In progress"
      shift_enum: "Day" | "Night" | "Full day"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      agency_enum: ["Zigma", "Card Box"],
      phase_enum: ["I", "II", "III"],
      phase_status_enum: ["Completed", "In progress"],
      shift_enum: ["Day", "Night", "Full day"],
    },
  },
} as const
