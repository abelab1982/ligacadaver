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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_request_log: {
        Row: {
          created_at: string
          endpoint: string
          error: string | null
          expires_at: string | null
          fetched_at: string
          id: string
          provider: string
          request_key: string
          request_params: Json | null
          response_body: Json | null
          response_status: number | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          error?: string | null
          expires_at?: string | null
          fetched_at?: string
          id?: string
          provider?: string
          request_key: string
          request_params?: Json | null
          response_body?: Json | null
          response_status?: number | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          error?: string | null
          expires_at?: string | null
          fetched_at?: string
          id?: string
          provider?: string
          request_key?: string
          request_params?: Json | null
          response_body?: Json | null
          response_status?: number | null
        }
        Relationships: []
      }
      app_secrets: {
        Row: {
          created_at: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      fixtures: {
        Row: {
          api_fixture_id: number | null
          away_id: string
          away_score: number | null
          created_at: string
          home_id: string
          home_score: number | null
          id: string
          is_locked: boolean
          kick_off: string | null
          round: number
          status: string
          updated_at: string
        }
        Insert: {
          api_fixture_id?: number | null
          away_id: string
          away_score?: number | null
          created_at?: string
          home_id: string
          home_score?: number | null
          id: string
          is_locked?: boolean
          kick_off?: string | null
          round: number
          status?: string
          updated_at?: string
        }
        Update: {
          api_fixture_id?: number | null
          away_id?: string
          away_score?: number | null
          created_at?: string
          home_id?: string
          home_score?: number | null
          id?: string
          is_locked?: boolean
          kick_off?: string | null
          round?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixtures_away_id_fkey"
            columns: ["away_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      h2h_cache: {
        Row: {
          away_team_id: number
          canonical_key: string
          created_at: string
          fetched_at: string
          home_team_id: number
          id: string
          payload: Json
        }
        Insert: {
          away_team_id: number
          canonical_key: string
          created_at?: string
          fetched_at?: string
          home_team_id: number
          id?: string
          payload: Json
        }
        Update: {
          away_team_id?: number
          canonical_key?: string
          created_at?: string
          fetched_at?: string
          home_team_id?: number
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      h2h_fixtures: {
        Row: {
          api_fixture_id: number
          away_team_id: number
          created_at: string
          fixture_date: string | null
          home_team_id: number
          id: string
          raw_json: Json
        }
        Insert: {
          api_fixture_id: number
          away_team_id: number
          created_at?: string
          fixture_date?: string | null
          home_team_id: number
          id?: string
          raw_json: Json
        }
        Update: {
          api_fixture_id?: number
          away_team_id?: number
          created_at?: string
          fixture_date?: string | null
          home_team_id?: number
          id?: string
          raw_json?: Json
        }
        Relationships: []
      }
      h2h_rate_limit: {
        Row: {
          ip_address: string
          minute_bucket: string
          request_count: number
        }
        Insert: {
          ip_address: string
          minute_bucket: string
          request_count?: number
        }
        Update: {
          ip_address?: string
          minute_bucket?: string
          request_count?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          api_team_id: number
          created_at: string
          id: string
          name: string
        }
        Insert: {
          api_team_id: number
          created_at?: string
          id: string
          name: string
        }
        Update: {
          api_team_id?: number
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_cron_secret: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
