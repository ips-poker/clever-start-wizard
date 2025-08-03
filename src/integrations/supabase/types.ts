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
      cms_content: {
        Row: {
          content_key: string
          content_type: string
          content_value: string | null
          created_at: string
          id: string
          is_active: boolean
          meta_data: Json | null
          page_slug: string
          updated_at: string
        }
        Insert: {
          content_key: string
          content_type?: string
          content_value?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          meta_data?: Json | null
          page_slug: string
          updated_at?: string
        }
        Update: {
          content_key?: string
          content_type?: string
          content_value?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          meta_data?: Json | null
          page_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_gallery: {
        Row: {
          alt_text: string | null
          category: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean
          is_featured: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean
          is_featured?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean
          is_featured?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_integrations: {
        Row: {
          api_keys: Json | null
          config: Json
          created_at: string
          id: string
          integration_name: string
          integration_type: string
          is_active: boolean | null
          last_sync: string | null
          updated_at: string
        }
        Insert: {
          api_keys?: Json | null
          config?: Json
          created_at?: string
          id?: string
          integration_name: string
          integration_type: string
          is_active?: boolean | null
          last_sync?: string | null
          updated_at?: string
        }
        Update: {
          api_keys?: Json | null
          config?: Json
          created_at?: string
          id?: string
          integration_name?: string
          integration_type?: string
          is_active?: boolean | null
          last_sync?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cms_seo: {
        Row: {
          canonical_url: string | null
          created_at: string
          id: string
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          page_slug: string
          robots_meta: string | null
          schema_markup: Json | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          id?: string
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_slug: string
          robots_meta?: string | null
          schema_markup?: Json | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          id?: string
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_slug?: string
          robots_meta?: string | null
          schema_markup?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      cms_settings: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          setting_key: string
          setting_type: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key?: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fiscal_receipts: {
        Row: {
          amount: number
          created_at: string
          error_message: string | null
          fiscal_at: string | null
          fiscal_document_attribute: string | null
          fiscal_document_number: string | null
          id: string
          items: Json | null
          ofd_receipt_url: string | null
          orange_data_response: Json | null
          order_id: string | null
          receipt_id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          error_message?: string | null
          fiscal_at?: string | null
          fiscal_document_attribute?: string | null
          fiscal_document_number?: string | null
          id?: string
          items?: Json | null
          ofd_receipt_url?: string | null
          orange_data_response?: Json | null
          order_id?: string | null
          receipt_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          error_message?: string | null
          fiscal_at?: string | null
          fiscal_document_attribute?: string | null
          fiscal_document_number?: string | null
          id?: string
          items?: Json | null
          ofd_receipt_url?: string | null
          orange_data_response?: Json | null
          order_id?: string | null
          receipt_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
          user_id: string
          user_role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
          user_role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
          user_role?: Database["public"]["Enums"]["user_role"] | null
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
      create_first_admin: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      publish_tournament: {
        Args: { tournament_id_param: string }
        Returns: boolean
      }
      update_player_wins: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      user_role: "admin" | "editor" | "user"
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
      user_role: ["admin", "editor", "user"],
    },
  },
} as const
