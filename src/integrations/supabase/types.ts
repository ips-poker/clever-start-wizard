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
          {
            foreignKeyName: "blind_levels_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments_display"
            referencedColumns: ["id"]
          },
        ]
      }
      blind_structure_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          levels: Json
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          levels?: Json
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          levels?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      clan_invitations: {
        Row: {
          clan_id: string
          created_at: string
          expires_at: string | null
          id: string
          player_id: string
          status: string
        }
        Insert: {
          clan_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          player_id: string
          status?: string
        }
        Update: {
          clan_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          player_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_invitations_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_invitations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_members: {
        Row: {
          clan_id: string
          hierarchy_role: string
          id: string
          joined_at: string
          player_id: string
        }
        Insert: {
          clan_id: string
          hierarchy_role?: string
          id?: string
          joined_at?: string
          player_id: string
        }
        Update: {
          clan_id?: string
          hierarchy_role?: string
          id?: string
          joined_at?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_members_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_members_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      clans: {
        Row: {
          created_at: string
          description: string | null
          don_player_id: string
          emblem_id: number
          id: string
          name: string
          seal_id: number
          total_rating: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          don_player_id: string
          emblem_id?: number
          id?: string
          name: string
          seal_id?: number
          total_rating?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          don_player_id?: string
          emblem_id?: number
          id?: string
          name?: string
          seal_id?: number
          total_rating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clans_don_player_id_fkey"
            columns: ["don_player_id"]
            isOneToOne: false
            referencedRelation: "players"
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
          {
            foreignKeyName: "game_results_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments_display"
            referencedColumns: ["id"]
          },
        ]
      }
      online_poker_tournament_levels: {
        Row: {
          ante: number | null
          big_blind: number
          duration: number | null
          id: string
          is_break: boolean | null
          level: number
          small_blind: number
          tournament_id: string
        }
        Insert: {
          ante?: number | null
          big_blind: number
          duration?: number | null
          id?: string
          is_break?: boolean | null
          level: number
          small_blind: number
          tournament_id: string
        }
        Update: {
          ante?: number | null
          big_blind?: number
          duration?: number | null
          id?: string
          is_break?: boolean | null
          level?: number
          small_blind?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_poker_tournament_levels_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "online_poker_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      online_poker_tournament_participants: {
        Row: {
          chips: number | null
          eliminated_at: string | null
          eliminated_by: string | null
          finish_position: number | null
          id: string
          player_id: string
          prize_amount: number | null
          registered_at: string
          seat_number: number | null
          status: string
          tournament_id: string
        }
        Insert: {
          chips?: number | null
          eliminated_at?: string | null
          eliminated_by?: string | null
          finish_position?: number | null
          id?: string
          player_id: string
          prize_amount?: number | null
          registered_at?: string
          seat_number?: number | null
          status?: string
          tournament_id: string
        }
        Update: {
          chips?: number | null
          eliminated_at?: string | null
          eliminated_by?: string | null
          finish_position?: number | null
          id?: string
          player_id?: string
          prize_amount?: number | null
          registered_at?: string
          seat_number?: number | null
          status?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_poker_tournament_participants_eliminated_by_fkey"
            columns: ["eliminated_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_poker_tournament_participants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_poker_tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "online_poker_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      online_poker_tournament_payouts: {
        Row: {
          amount: number | null
          id: string
          paid_at: string | null
          percentage: number
          player_id: string | null
          position: number
          tournament_id: string
        }
        Insert: {
          amount?: number | null
          id?: string
          paid_at?: string | null
          percentage: number
          player_id?: string | null
          position: number
          tournament_id: string
        }
        Update: {
          amount?: number | null
          id?: string
          paid_at?: string | null
          percentage?: number
          player_id?: string | null
          position?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_poker_tournament_payouts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_poker_tournament_payouts_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "online_poker_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      online_poker_tournaments: {
        Row: {
          ante: number | null
          big_blind: number | null
          buy_in: number
          created_at: string
          created_by: string | null
          current_level: number | null
          description: string | null
          finished_at: string | null
          id: string
          level_duration: number | null
          max_players: number
          min_players: number
          name: string
          prize_pool: number | null
          registration_end: string | null
          registration_start: string | null
          small_blind: number | null
          started_at: string | null
          starting_chips: number
          status: string
          updated_at: string
        }
        Insert: {
          ante?: number | null
          big_blind?: number | null
          buy_in?: number
          created_at?: string
          created_by?: string | null
          current_level?: number | null
          description?: string | null
          finished_at?: string | null
          id?: string
          level_duration?: number | null
          max_players?: number
          min_players?: number
          name: string
          prize_pool?: number | null
          registration_end?: string | null
          registration_start?: string | null
          small_blind?: number | null
          started_at?: string | null
          starting_chips?: number
          status?: string
          updated_at?: string
        }
        Update: {
          ante?: number | null
          big_blind?: number | null
          buy_in?: number
          created_at?: string
          created_by?: string | null
          current_level?: number | null
          description?: string | null
          finished_at?: string | null
          id?: string
          level_duration?: number | null
          max_players?: number
          min_players?: number
          name?: string
          prize_pool?: number | null
          registration_end?: string | null
          registration_start?: string | null
          small_blind?: number | null
          started_at?: string | null
          starting_chips?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_poker_tournaments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_balances: {
        Row: {
          balance: number
          created_at: string
          hands_played: number
          id: string
          player_id: string
          total_lost: number
          total_won: number
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          hands_played?: number
          id?: string
          player_id: string
          total_lost?: number
          total_won?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          hands_played?: number
          id?: string
          player_id?: string
          total_lost?: number
          total_won?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_balances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          avatar_url: string | null
          created_at: string
          elo_rating: number
          email: string | null
          games_played: number
          id: string
          manual_rank: string | null
          name: string
          phone: string | null
          telegram: string | null
          updated_at: string
          user_id: string | null
          wins: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          elo_rating?: number
          email?: string | null
          games_played?: number
          id?: string
          manual_rank?: string | null
          name: string
          phone?: string | null
          telegram?: string | null
          updated_at?: string
          user_id?: string | null
          wins?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          elo_rating?: number
          email?: string | null
          games_played?: number
          id?: string
          manual_rank?: string | null
          name?: string
          phone?: string | null
          telegram?: string | null
          updated_at?: string
          user_id?: string | null
          wins?: number
        }
        Relationships: []
      }
      poker_actions: {
        Row: {
          action_order: number
          action_type: string
          amount: number | null
          created_at: string
          hand_id: string
          hole_cards: string[] | null
          id: string
          phase: string
          player_id: string
          seat_number: number
        }
        Insert: {
          action_order: number
          action_type: string
          amount?: number | null
          created_at?: string
          hand_id: string
          hole_cards?: string[] | null
          id?: string
          phase: string
          player_id: string
          seat_number: number
        }
        Update: {
          action_order?: number
          action_type?: string
          amount?: number | null
          created_at?: string
          hand_id?: string
          hole_cards?: string[] | null
          id?: string
          phase?: string
          player_id?: string
          seat_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "poker_actions_hand_id_fkey"
            columns: ["hand_id"]
            isOneToOne: false
            referencedRelation: "poker_hands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poker_actions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      poker_hand_players: {
        Row: {
          bet_amount: number
          created_at: string
          hand_id: string
          hand_rank: string | null
          hole_cards: string[] | null
          id: string
          is_all_in: boolean
          is_folded: boolean
          player_id: string
          seat_number: number
          stack_end: number | null
          stack_start: number
          won_amount: number | null
        }
        Insert: {
          bet_amount?: number
          created_at?: string
          hand_id: string
          hand_rank?: string | null
          hole_cards?: string[] | null
          id?: string
          is_all_in?: boolean
          is_folded?: boolean
          player_id: string
          seat_number: number
          stack_end?: number | null
          stack_start: number
          won_amount?: number | null
        }
        Update: {
          bet_amount?: number
          created_at?: string
          hand_id?: string
          hand_rank?: string | null
          hole_cards?: string[] | null
          id?: string
          is_all_in?: boolean
          is_folded?: boolean
          player_id?: string
          seat_number?: number
          stack_end?: number | null
          stack_start?: number
          won_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "poker_hand_players_hand_id_fkey"
            columns: ["hand_id"]
            isOneToOne: false
            referencedRelation: "poker_hands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poker_hand_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      poker_hands: {
        Row: {
          action_started_at: string | null
          big_blind_seat: number
          community_cards: string[] | null
          completed_at: string | null
          created_at: string
          current_bet: number
          current_player_seat: number | null
          dealer_seat: number
          deck_state: string | null
          hand_number: number
          id: string
          phase: string
          pot: number
          side_pots: Json | null
          small_blind_seat: number
          started_at: string
          table_id: string
          winners: Json | null
        }
        Insert: {
          action_started_at?: string | null
          big_blind_seat: number
          community_cards?: string[] | null
          completed_at?: string | null
          created_at?: string
          current_bet?: number
          current_player_seat?: number | null
          dealer_seat: number
          deck_state?: string | null
          hand_number?: number
          id?: string
          phase?: string
          pot?: number
          side_pots?: Json | null
          small_blind_seat: number
          started_at?: string
          table_id: string
          winners?: Json | null
        }
        Update: {
          action_started_at?: string | null
          big_blind_seat?: number
          community_cards?: string[] | null
          completed_at?: string | null
          created_at?: string
          current_bet?: number
          current_player_seat?: number | null
          dealer_seat?: number
          deck_state?: string | null
          hand_number?: number
          id?: string
          phase?: string
          pot?: number
          side_pots?: Json | null
          small_blind_seat?: number
          started_at?: string
          table_id?: string
          winners?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "poker_hands_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "poker_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      poker_table_players: {
        Row: {
          id: string
          is_dealer: boolean
          joined_at: string
          last_action_at: string | null
          player_id: string
          seat_number: number
          stack: number
          status: string
          table_id: string
        }
        Insert: {
          id?: string
          is_dealer?: boolean
          joined_at?: string
          last_action_at?: string | null
          player_id: string
          seat_number: number
          stack?: number
          status?: string
          table_id: string
        }
        Update: {
          id?: string
          is_dealer?: boolean
          joined_at?: string
          last_action_at?: string | null
          player_id?: string
          seat_number?: number
          stack?: number
          status?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poker_table_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poker_table_players_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "poker_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      poker_tables: {
        Row: {
          action_time_seconds: number | null
          ante: number | null
          auto_start_delay_seconds: number | null
          auto_start_enabled: boolean | null
          big_blind: number
          big_blind_ante_amount: number | null
          big_blind_ante_enabled: boolean | null
          bomb_pot_double_board: boolean | null
          bomb_pot_enabled: boolean | null
          bomb_pot_multiplier: number | null
          button_ante_amount: number | null
          button_ante_enabled: boolean | null
          chat_enabled: boolean | null
          chat_slow_mode: boolean | null
          chat_slow_mode_interval: number | null
          created_at: string
          created_by: string | null
          current_dealer_seat: number | null
          current_hand_id: string | null
          game_type: string
          id: string
          max_buy_in: number
          max_players: number
          max_straddle_count: number | null
          min_buy_in: number
          mississippi_straddle_enabled: boolean | null
          name: string
          rake_cap: number | null
          rake_percent: number | null
          run_it_twice_enabled: boolean | null
          small_blind: number
          status: string
          straddle_enabled: boolean | null
          table_type: string
          time_bank_seconds: number | null
          updated_at: string
        }
        Insert: {
          action_time_seconds?: number | null
          ante?: number | null
          auto_start_delay_seconds?: number | null
          auto_start_enabled?: boolean | null
          big_blind?: number
          big_blind_ante_amount?: number | null
          big_blind_ante_enabled?: boolean | null
          bomb_pot_double_board?: boolean | null
          bomb_pot_enabled?: boolean | null
          bomb_pot_multiplier?: number | null
          button_ante_amount?: number | null
          button_ante_enabled?: boolean | null
          chat_enabled?: boolean | null
          chat_slow_mode?: boolean | null
          chat_slow_mode_interval?: number | null
          created_at?: string
          created_by?: string | null
          current_dealer_seat?: number | null
          current_hand_id?: string | null
          game_type?: string
          id?: string
          max_buy_in?: number
          max_players?: number
          max_straddle_count?: number | null
          min_buy_in?: number
          mississippi_straddle_enabled?: boolean | null
          name: string
          rake_cap?: number | null
          rake_percent?: number | null
          run_it_twice_enabled?: boolean | null
          small_blind?: number
          status?: string
          straddle_enabled?: boolean | null
          table_type?: string
          time_bank_seconds?: number | null
          updated_at?: string
        }
        Update: {
          action_time_seconds?: number | null
          ante?: number | null
          auto_start_delay_seconds?: number | null
          auto_start_enabled?: boolean | null
          big_blind?: number
          big_blind_ante_amount?: number | null
          big_blind_ante_enabled?: boolean | null
          bomb_pot_double_board?: boolean | null
          bomb_pot_enabled?: boolean | null
          bomb_pot_multiplier?: number | null
          button_ante_amount?: number | null
          button_ante_enabled?: boolean | null
          chat_enabled?: boolean | null
          chat_slow_mode?: boolean | null
          chat_slow_mode_interval?: number | null
          created_at?: string
          created_by?: string | null
          current_dealer_seat?: number | null
          current_hand_id?: string | null
          game_type?: string
          id?: string
          max_buy_in?: number
          max_players?: number
          max_straddle_count?: number | null
          min_buy_in?: number
          mississippi_straddle_enabled?: boolean | null
          name?: string
          rake_cap?: number | null
          rake_percent?: number | null
          run_it_twice_enabled?: boolean | null
          small_blind?: number
          status?: string
          straddle_enabled?: boolean | null
          table_type?: string
          time_bank_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poker_tables_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          privacy_consent_at: string | null
          privacy_consent_given: boolean | null
          terms_consent_at: string | null
          terms_consent_given: boolean | null
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
          privacy_consent_at?: string | null
          privacy_consent_given?: boolean | null
          terms_consent_at?: string | null
          terms_consent_given?: boolean | null
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
          privacy_consent_at?: string | null
          privacy_consent_given?: boolean | null
          terms_consent_at?: string | null
          terms_consent_given?: boolean | null
          updated_at?: string
          user_id?: string
          user_role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
      tournament_payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          percentage: number
          place: number
          rps_points: number | null
          tournament_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          percentage: number
          place: number
          rps_points?: number | null
          tournament_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          percentage?: number
          place?: number
          rps_points?: number | null
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_payouts_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_payouts_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments_display"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          additional_sets: number | null
          addons: number | null
          chips: number | null
          created_at: string
          eliminated_at: string | null
          final_position: number | null
          id: string
          player_id: string
          position: number | null
          rebuys: number | null
          reentries: number | null
          seat_number: number | null
          status: string
          tournament_id: string
        }
        Insert: {
          additional_sets?: number | null
          addons?: number | null
          chips?: number | null
          created_at?: string
          eliminated_at?: string | null
          final_position?: number | null
          id?: string
          player_id: string
          position?: number | null
          rebuys?: number | null
          reentries?: number | null
          seat_number?: number | null
          status?: string
          tournament_id: string
        }
        Update: {
          additional_sets?: number | null
          addons?: number | null
          chips?: number | null
          created_at?: string
          eliminated_at?: string | null
          final_position?: number | null
          id?: string
          player_id?: string
          position?: number | null
          rebuys?: number | null
          reentries?: number | null
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
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments_display"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          additional_chips: number | null
          additional_fee: number | null
          additional_level: number | null
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
          last_voice_command: string | null
          max_players: number
          name: string
          participation_fee: number | null
          rebuy_chips: number | null
          rebuy_cost: number | null
          rebuy_end_level: number | null
          reentry_chips: number | null
          reentry_end_level: number | null
          reentry_fee: number | null
          start_time: string
          starting_chips: number
          status: string
          timer_duration: number | null
          timer_remaining: number | null
          tournament_format: string | null
          updated_at: string
          voice_control_enabled: boolean | null
          voice_session_id: string | null
        }
        Insert: {
          additional_chips?: number | null
          additional_fee?: number | null
          additional_level?: number | null
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
          last_voice_command?: string | null
          max_players?: number
          name: string
          participation_fee?: number | null
          rebuy_chips?: number | null
          rebuy_cost?: number | null
          rebuy_end_level?: number | null
          reentry_chips?: number | null
          reentry_end_level?: number | null
          reentry_fee?: number | null
          start_time: string
          starting_chips?: number
          status?: string
          timer_duration?: number | null
          timer_remaining?: number | null
          tournament_format?: string | null
          updated_at?: string
          voice_control_enabled?: boolean | null
          voice_session_id?: string | null
        }
        Update: {
          additional_chips?: number | null
          additional_fee?: number | null
          additional_level?: number | null
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
          last_voice_command?: string | null
          max_players?: number
          name?: string
          participation_fee?: number | null
          rebuy_chips?: number | null
          rebuy_cost?: number | null
          rebuy_end_level?: number | null
          reentry_chips?: number | null
          reentry_end_level?: number | null
          reentry_fee?: number | null
          start_time?: string
          starting_chips?: number
          status?: string
          timer_duration?: number | null
          timer_remaining?: number | null
          tournament_format?: string | null
          updated_at?: string
          voice_control_enabled?: boolean | null
          voice_session_id?: string | null
        }
        Relationships: []
      }
      voice_announcements: {
        Row: {
          announcement_type: string | null
          auto_generated: boolean | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          id: string
          message: string
          scheduled_at: string | null
          tournament_id: string | null
        }
        Insert: {
          announcement_type?: string | null
          auto_generated?: boolean | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          id?: string
          message: string
          scheduled_at?: string | null
          tournament_id?: string | null
        }
        Update: {
          announcement_type?: string | null
          auto_generated?: boolean | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          id?: string
          message?: string
          scheduled_at?: string | null
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_announcements_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_announcements_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments_display"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_command_logs: {
        Row: {
          command_text: string
          created_at: string
          error_message: string | null
          id: string
          processing_time_ms: number | null
          recognized_action: string | null
          response_text: string | null
          success: boolean
          tournament_id: string | null
          user_id: string
        }
        Insert: {
          command_text: string
          created_at?: string
          error_message?: string | null
          id?: string
          processing_time_ms?: number | null
          recognized_action?: string | null
          response_text?: string | null
          success?: boolean
          tournament_id?: string | null
          user_id: string
        }
        Update: {
          command_text?: string
          created_at?: string
          error_message?: string | null
          id?: string
          processing_time_ms?: number | null
          recognized_action?: string | null
          response_text?: string | null
          success?: boolean
          tournament_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_command_logs_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_command_logs_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments_display"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_commands_log: {
        Row: {
          command: string
          confidence_score: number | null
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          parameters: Json | null
          result: Json | null
          success: boolean | null
          tournament_id: string | null
          user_id: string | null
        }
        Insert: {
          command: string
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          parameters?: Json | null
          result?: Json | null
          success?: boolean | null
          tournament_id?: string | null
          user_id?: string | null
        }
        Update: {
          command?: string
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          parameters?: Json | null
          result?: Json | null
          success?: boolean | null
          tournament_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_commands_log_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_commands_log_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments_display"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_custom_commands: {
        Row: {
          action_type: string
          created_at: string
          id: string
          is_active: boolean
          response_text: string
          timer_value: number | null
          trigger: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          response_text: string
          timer_value?: number | null
          trigger: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          response_text?: string
          timer_value?: number | null
          trigger?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_settings: {
        Row: {
          auto_confirm_critical: boolean | null
          confidence_threshold: number | null
          created_at: string
          elevenlabs_voice: string | null
          id: string
          updated_at: string
          user_id: string
          voice_enabled: boolean | null
          voice_language: string | null
          voice_provider: string | null
          voice_speed: number | null
          volume_level: number | null
          warning_intervals: Json | null
        }
        Insert: {
          auto_confirm_critical?: boolean | null
          confidence_threshold?: number | null
          created_at?: string
          elevenlabs_voice?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          voice_enabled?: boolean | null
          voice_language?: string | null
          voice_provider?: string | null
          voice_speed?: number | null
          volume_level?: number | null
          warning_intervals?: Json | null
        }
        Update: {
          auto_confirm_critical?: boolean | null
          confidence_threshold?: number | null
          created_at?: string
          elevenlabs_voice?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          voice_enabled?: boolean | null
          voice_language?: string | null
          voice_provider?: string | null
          voice_speed?: number | null
          volume_level?: number | null
          warning_intervals?: Json | null
        }
        Relationships: []
      }
      voice_time_intervals: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          message: string
          name: string
          seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          message: string
          name: string
          seconds: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          name?: string
          seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      tournaments_display: {
        Row: {
          additional_chips: number | null
          additional_fee: number | null
          additional_level: number | null
          break_start_level: number | null
          created_at: string | null
          current_big_blind: number | null
          current_level: number | null
          current_small_blind: number | null
          description: string | null
          finished_at: string | null
          id: string | null
          is_archived: boolean | null
          is_published: boolean | null
          last_voice_command: string | null
          max_players: number | null
          name: string | null
          participant_count: number | null
          participation_fee: number | null
          reentry_chips: number | null
          reentry_end_level: number | null
          reentry_fee: number | null
          start_time: string | null
          starting_chips: number | null
          status: string | null
          timer_duration: number | null
          timer_remaining: number | null
          total_additional_sets: number | null
          total_reentries: number | null
          total_rps_pool: number | null
          tournament_format: string | null
          updated_at: string | null
          voice_control_enabled: boolean | null
          voice_session_id: string | null
        }
        Insert: {
          additional_chips?: number | null
          additional_fee?: number | null
          additional_level?: number | null
          break_start_level?: number | null
          created_at?: string | null
          current_big_blind?: number | null
          current_level?: number | null
          current_small_blind?: number | null
          description?: string | null
          finished_at?: string | null
          id?: string | null
          is_archived?: boolean | null
          is_published?: boolean | null
          last_voice_command?: string | null
          max_players?: number | null
          name?: string | null
          participant_count?: never
          participation_fee?: number | null
          reentry_chips?: number | null
          reentry_end_level?: number | null
          reentry_fee?: number | null
          start_time?: string | null
          starting_chips?: number | null
          status?: string | null
          timer_duration?: number | null
          timer_remaining?: number | null
          total_additional_sets?: never
          total_reentries?: never
          total_rps_pool?: never
          tournament_format?: string | null
          updated_at?: string | null
          voice_control_enabled?: boolean | null
          voice_session_id?: string | null
        }
        Update: {
          additional_chips?: number | null
          additional_fee?: number | null
          additional_level?: number | null
          break_start_level?: number | null
          created_at?: string | null
          current_big_blind?: number | null
          current_level?: number | null
          current_small_blind?: number | null
          description?: string | null
          finished_at?: string | null
          id?: string | null
          is_archived?: boolean | null
          is_published?: boolean | null
          last_voice_command?: string | null
          max_players?: number | null
          name?: string | null
          participant_count?: never
          participation_fee?: number | null
          reentry_chips?: number | null
          reentry_end_level?: number | null
          reentry_fee?: number | null
          start_time?: string | null
          starting_chips?: number | null
          status?: string | null
          timer_duration?: number | null
          timer_remaining?: number | null
          total_additional_sets?: never
          total_reentries?: never
          total_rps_pool?: never
          tournament_format?: string | null
          updated_at?: string | null
          voice_control_enabled?: boolean | null
          voice_session_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      archive_tournament: {
        Args: { tournament_id_param: string }
        Returns: boolean
      }
      assign_player_rank_safe: {
        Args: { p_player_id: string; p_rank: string }
        Returns: Json
      }
      calculate_final_positions: {
        Args: { tournament_id_param: string }
        Returns: undefined
      }
      calculate_online_tournament_prize_pool: {
        Args: { tournament_id_param: string }
        Returns: number
      }
      calculate_tournament_rps_pool: {
        Args: { tournament_id_param: string }
        Returns: number
      }
      can_view_player_contacts: {
        Args: { player_record: Database["public"]["Tables"]["players"]["Row"] }
        Returns: boolean
      }
      cleanup_stuck_poker_hands: { Args: never; Returns: number }
      complete_tournament: {
        Args: { tournament_id_param: string }
        Returns: boolean
      }
      convert_amount_to_rps: {
        Args: { amount_rubles: number }
        Returns: number
      }
      create_blind_levels_safe: {
        Args: { p_blind_levels: Json; p_tournament_id: string }
        Returns: undefined
      }
      create_default_blind_structure_safe: {
        Args: { p_tournament_id: string }
        Returns: undefined
      }
      create_first_admin: { Args: never; Returns: undefined }
      create_player_safe: {
        Args: {
          p_avatar_url?: string
          p_email?: string
          p_name: string
          p_telegram?: string
          p_user_id?: string
        }
        Returns: Json
      }
      create_tournament_blind_structure: {
        Args: { tournament_id_param: string }
        Returns: undefined
      }
      create_tournament_safe: {
        Args: {
          p_additional_chips: number
          p_additional_fee: number
          p_additional_level: number
          p_break_start_level: number
          p_description: string
          p_is_published: boolean
          p_max_players: number
          p_name: string
          p_participation_fee: number
          p_reentry_chips: number
          p_reentry_end_level: number
          p_reentry_fee: number
          p_start_time: string
          p_starting_chips: number
          p_status: string
          p_timer_duration: number
          p_tournament_format: string
          p_voice_control_enabled: boolean
        }
        Returns: string
      }
      create_user_profile_safe: {
        Args: {
          p_avatar_url?: string
          p_email: string
          p_full_name?: string
          p_user_id: string
        }
        Returns: Json
      }
      delete_tournament_safe: {
        Args: { p_tournament_id: string }
        Returns: undefined
      }
      ensure_player_balance: { Args: { p_player_id: string }; Returns: number }
      generate_tournament_payouts: {
        Args: { tournament_id_param: string }
        Returns: undefined
      }
      get_player_safe: {
        Args: { player_id_param: string }
        Returns: {
          avatar_url: string
          created_at: string
          elo_rating: number
          email: string
          games_played: number
          id: string
          name: string
          updated_at: string
          user_id: string
          wins: number
        }[]
      }
      get_players_count: { Args: never; Returns: number }
      get_players_public: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          elo_rating: number
          games_played: number
          id: string
          name: string
          updated_at: string
          user_id: string
          wins: number
        }[]
      }
      get_system_statistics: { Args: never; Returns: Json }
      get_tournament_voice_stats: {
        Args: { tournament_id_param: string }
        Returns: Json
      }
      get_user_profile: {
        Args: { user_uuid: string }
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          id: string
          privacy_consent_at: string
          privacy_consent_given: boolean
          terms_consent_at: string
          terms_consent_given: boolean
          updated_at: string
          user_id: string
          user_role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      handle_voice_tournament_action: {
        Args: {
          action_type: string
          parameters?: Json
          tournament_id_param: string
        }
        Returns: Json
      }
      is_admin: { Args: { user_uuid: string }; Returns: boolean }
      link_players_to_profiles: { Args: never; Returns: undefined }
      merge_player_profiles: {
        Args: {
          supabase_user_id: string
          telegram_email: string
          telegram_user_id: string
        }
        Returns: string
      }
      pause_tournament: {
        Args: { tournament_id_param: string }
        Returns: boolean
      }
      publish_tournament: {
        Args: { tournament_id_param: string }
        Returns: boolean
      }
      redistribute_chips_on_elimination: {
        Args: { eliminated_player_id: string; tournament_id_param: string }
        Returns: undefined
      }
      register_tournament_safe: {
        Args: { p_player_id: string; p_tournament_id: string }
        Returns: Json
      }
      resume_tournament: {
        Args: { tournament_id_param: string }
        Returns: boolean
      }
      start_tournament: {
        Args: { tournament_id_param: string }
        Returns: boolean
      }
      start_tournament_registration: {
        Args: { tournament_id_param: string }
        Returns: boolean
      }
      sync_all_player_avatars: { Args: never; Returns: undefined }
      update_player_balance: {
        Args: { p_amount: number; p_is_win?: boolean; p_player_id: string }
        Returns: number
      }
      update_player_rating_safe: {
        Args: { p_new_rating: number; p_player_id: string }
        Returns: Json
      }
      update_player_safe: {
        Args: { p_avatar_url?: string; p_name?: string; p_player_id: string }
        Returns: Json
      }
      update_player_wins: { Args: never; Returns: undefined }
      update_timer_only_safe: {
        Args: { p_timer_remaining: number; p_tournament_id: string }
        Returns: undefined
      }
      update_tournament_level_safe: {
        Args: {
          p_big_blind: number
          p_current_level: number
          p_small_blind: number
          p_timer_duration: number
          p_timer_remaining: number
          p_tournament_id: string
        }
        Returns: undefined
      }
      update_tournament_safe: {
        Args: {
          p_additional_chips: number
          p_additional_fee: number
          p_additional_level: number
          p_break_start_level: number
          p_description: string
          p_is_published: boolean
          p_max_players: number
          p_name: string
          p_participation_fee: number
          p_reentry_chips: number
          p_reentry_end_level: number
          p_reentry_fee: number
          p_start_time: string
          p_starting_chips: number
          p_timer_duration: number
          p_tournament_format: string
          p_tournament_id: string
        }
        Returns: undefined
      }
      update_tournament_status_safe: {
        Args: { p_status: string; p_tournament_id: string }
        Returns: undefined
      }
      update_tournament_timer: {
        Args: {
          new_timer_active?: boolean
          new_timer_remaining: number
          tournament_id_param: string
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
