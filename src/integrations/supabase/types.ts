export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      blind_levels: {
        Row: {
          ante: number | null
          big_blind: number
          duration: number
          id: string
          is_break: boolean | null
          level: number
          small_blind: number
          tournament_id: string
        }
        Insert: {
          ante?: number | null
          big_blind: number
          duration?: number
          id?: string
          is_break?: boolean | null
          level: number
          small_blind: number
          tournament_id: string
        }
        Update: {
          ante?: number | null
          big_blind?: number
          duration?: number
          id?: string
          is_break?: boolean | null
          level?: number
          small_blind?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blind_levels_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      game_results: {
        Row: {
          created_at: string
          elo_after: number
          elo_before: number
          elo_change: number
          id: string
          player_id: string
          position: number
          tournament_id: string
        }
        Insert: {
          created_at?: string
          elo_after: number
          elo_before: number
          elo_change: number
          id?: string
          player_id: string
          position: number
          tournament_id: string
        }
        Update: {
          created_at?: string
          elo_after?: number
          elo_before?: number
          elo_change?: number
          id?: string
          player_id?: string
          position?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_results_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_results_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          elo_rating: number
          email: string | null
          games_played: number
          id: string
          name: string
          updated_at: string
          wins: number
        }
        Insert: {
          created_at?: string
          elo_rating?: number
          email?: string | null
          games_played?: number
          id?: string
          name: string
          updated_at?: string
          wins?: number
        }
        Update: {
          created_at?: string
          elo_rating?: number
          email?: string | null
          games_played?: number
          id?: string
          name?: string
          updated_at?: string
          wins?: number
        }
        Relationships: []
      }
      tournament_registrations: {
        Row: {
          addons: number | null
          chips: number | null
          created_at: string
          id: string
          player_id: string
          position: number | null
          rebuys: number | null
          seat_number: number | null
          status: string
          tournament_id: string
        }
        Insert: {
          addons?: number | null
          chips?: number | null
          created_at?: string
          id?: string
          player_id: string
          position?: number | null
          rebuys?: number | null
          seat_number?: number | null
          status?: string
          tournament_id: string
        }
        Update: {
          addons?: number | null
          chips?: number | null
          created_at?: string
          id?: string
          player_id?: string
          position?: number | null
          rebuys?: number | null
          seat_number?: number | null
          status?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          addon_chips: number | null
          addon_cost: number | null
          addon_level: number | null
          break_start_level: number | null
          buy_in: number
          created_at: string
          current_big_blind: number | null
          current_level: number | null
          current_small_blind: number | null
          description: string | null
          finished_at: string | null
          id: string
          is_archived: boolean | null
          is_published: boolean | null
          max_players: number
          name: string
          rebuy_chips: number | null
          rebuy_cost: number | null
          rebuy_end_level: number | null
          start_time: string
          starting_chips: number
          status: string
          timer_duration: number | null
          timer_remaining: number | null
          tournament_format: string | null
          updated_at: string
        }
        Insert: {
          addon_chips?: number | null
          addon_cost?: number | null
          addon_level?: number | null
          break_start_level?: number | null
          buy_in?: number
          created_at?: string
          current_big_blind?: number | null
          current_level?: number | null
          current_small_blind?: number | null
          description?: string | null
          finished_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_published?: boolean | null
          max_players?: number
          name: string
          rebuy_chips?: number | null
          rebuy_cost?: number | null
          rebuy_end_level?: number | null
          start_time: string
          starting_chips?: number
          status?: string
          timer_duration?: number | null
          timer_remaining?: number | null
          tournament_format?: string | null
          updated_at?: string
        }
        Update: {
          addon_chips?: number | null
          addon_cost?: number | null
          addon_level?: number | null
          break_start_level?: number | null
          buy_in?: number
          created_at?: string
          current_big_blind?: number | null
          current_level?: number | null
          current_small_blind?: number | null
          description?: string | null
          finished_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_published?: boolean | null
          max_players?: number
          name?: string
          rebuy_chips?: number | null
          rebuy_cost?: number | null
          rebuy_end_level?: number | null
          start_time?: string
          starting_chips?: number
          status?: string
          timer_duration?: number | null
          timer_remaining?: number | null
          tournament_format?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_tournament: {
        Args: { tournament_id_param: string }
        Returns: boolean
      }
      publish_tournament: {
        Args: { tournament_id_param: string }
        Returns: boolean
      }
      update_tournament_timer: {
        Args: {
          tournament_id_param: string
          new_timer_remaining: number
          new_timer_active?: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
