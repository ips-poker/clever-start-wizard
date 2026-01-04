/**
 * Tournament Auto-Start Service
 * Professional tournament management:
 * - Auto-starts tournaments at scheduled time
 * - Validates min_players requirement
 * - Handles late registration
 * - Cancels tournaments if not enough players
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger.js';

interface TournamentToProcess {
  id: string;
  name: string;
  status: string;
  auto_start: boolean;
  min_players: number;
  max_players: number;
  scheduled_start_at: string | null;
  late_registration_enabled: boolean;
  late_registration_level: number | null;
  starting_chips: number;
  small_blind: number;
  big_blind: number;
  ante: number | null;
  level_duration: number | null;
  action_time_seconds: number | null;
  players_per_table: number | null;
}

interface ProcessResult {
  tournamentId: string;
  action: 'started' | 'cancelled' | 'waiting' | 'error';
  message: string;
  playerCount?: number;
}

class TournamentAutoStartService {
  private supabase: SupabaseClient | null = null;
  private interval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private checkIntervalMs = 10000; // Check every 10 seconds

  setSupabase(client: SupabaseClient): void {
    this.supabase = client;
    logger.info('[TournamentAutoStart] Supabase client configured');
  }

  start(): void {
    if (this.interval) {
      logger.warn('[TournamentAutoStart] Already running');
      return;
    }

    logger.info('[TournamentAutoStart] Starting auto-start service');

    // Initial check after 5 seconds
    setTimeout(() => this.checkAndStartTournaments(), 5000);

    // Then check every 10 seconds
    this.interval = setInterval(() => this.checkAndStartTournaments(), this.checkIntervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('[TournamentAutoStart] Stopped');
    }
  }

  private async checkAndStartTournaments(): Promise<void> {
    if (!this.supabase || this.isProcessing) return;

    this.isProcessing = true;

    try {
      const now = new Date();
      const nowISO = now.toISOString();

      // Find tournaments with auto_start=true and scheduled_start_at <= now
      const { data: pendingTournaments, error: fetchError } = await this.supabase
        .from('online_poker_tournaments')
        .select('*')
        .eq('status', 'registration')
        .eq('auto_start', true)
        .not('scheduled_start_at', 'is', null)
        .lte('scheduled_start_at', nowISO);

      if (fetchError) {
        logger.error('[TournamentAutoStart] Error fetching tournaments', { error: fetchError.message });
        return;
      }

      if (!pendingTournaments || pendingTournaments.length === 0) {
        return; // No tournaments to process
      }

      logger.info(`[TournamentAutoStart] Found ${pendingTournaments.length} tournaments ready to start`);

      for (const tournament of pendingTournaments as TournamentToProcess[]) {
        await this.processTournament(tournament);
      }
    } catch (err) {
      logger.error('[TournamentAutoStart] Error in checkAndStartTournaments', { error: String(err) });
    } finally {
      this.isProcessing = false;
    }
  }

  private async processTournament(tournament: TournamentToProcess): Promise<ProcessResult> {
    if (!this.supabase) {
      return { tournamentId: tournament.id, action: 'error', message: 'Supabase not configured' };
    }

    try {
      // Count registered players
      const { count, error: countError } = await this.supabase
        .from('online_poker_tournament_participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournament.id)
        .eq('status', 'registered');

      if (countError) {
        logger.error(`[TournamentAutoStart] Error counting players for ${tournament.name}`, { error: countError.message });
        return { tournamentId: tournament.id, action: 'error', message: countError.message };
      }

      const playerCount = count || 0;
      const minPlayers = tournament.min_players || 2;

      logger.info(`[TournamentAutoStart] Tournament ${tournament.name}: ${playerCount}/${minPlayers} players`);

      if (playerCount < minPlayers) {
        // Not enough players - check if we should cancel or wait
        const scheduledTime = new Date(tournament.scheduled_start_at!);
        const waitMinutes = 10; // Wait 10 minutes after scheduled time
        const cancelTime = new Date(scheduledTime.getTime() + waitMinutes * 60 * 1000);

        if (new Date() > cancelTime) {
          // Cancel tournament
          await this.cancelTournament(tournament, playerCount, minPlayers);
          return {
            tournamentId: tournament.id,
            action: 'cancelled',
            message: `Cancelled: only ${playerCount} players, need ${minPlayers}`,
            playerCount
          };
        } else {
          // Still waiting for more players
          logger.info(`[TournamentAutoStart] ${tournament.name}: Waiting for more players (${playerCount}/${minPlayers})`);
          return {
            tournamentId: tournament.id,
            action: 'waiting',
            message: `Waiting for players: ${playerCount}/${minPlayers}`,
            playerCount
          };
        }
      }

      // Enough players - start the tournament!
      await this.startTournament(tournament, playerCount);
      return {
        tournamentId: tournament.id,
        action: 'started',
        message: `Started with ${playerCount} players`,
        playerCount
      };

    } catch (err) {
      logger.error(`[TournamentAutoStart] Error processing ${tournament.name}`, { error: String(err) });
      return { tournamentId: tournament.id, action: 'error', message: String(err) };
    }
  }

  private async startTournament(tournament: TournamentToProcess, playerCount: number): Promise<void> {
    if (!this.supabase) return;

    const now = new Date();
    const levelDuration = tournament.level_duration || 300;
    const levelEndAt = new Date(now.getTime() + levelDuration * 1000);

    logger.info(`[TournamentAutoStart] Starting tournament ${tournament.name} with ${playerCount} players`);

    // 1. Update tournament status
    const { error: updateError } = await this.supabase
      .from('online_poker_tournaments')
      .update({
        status: 'running',
        started_at: now.toISOString(),
        level_end_at: levelEndAt.toISOString(),
        current_level: 1
      })
      .eq('id', tournament.id);

    if (updateError) {
      throw new Error(`Failed to update tournament: ${updateError.message}`);
    }

    // 2. Create tables using RPC function
    const { data: startResult, error: startError } = await this.supabase
      .rpc('start_online_tournament_with_tables', {
        p_tournament_id: tournament.id
      });

    if (startError) {
      logger.warn(`[TournamentAutoStart] RPC start failed, using fallback`, { error: startError.message });
      // Fallback: manually start the tournament via the existing function
      await this.fallbackStartTournament(tournament);
    } else {
      logger.info(`[TournamentAutoStart] ${tournament.name} started successfully`, { result: startResult });
    }

    // 3. Calculate and update prize pool
    await this.updatePrizePool(tournament.id);

    logger.info(`[TournamentAutoStart] Tournament ${tournament.name} fully started`);
  }

  private async fallbackStartTournament(tournament: TournamentToProcess): Promise<void> {
    if (!this.supabase) return;

    // Get all registered participants
    const { data: participants, error: partError } = await this.supabase
      .from('online_poker_tournament_participants')
      .select('player_id')
      .eq('tournament_id', tournament.id)
      .eq('status', 'registered');

    if (partError || !participants) {
      throw new Error(`Failed to get participants: ${partError?.message}`);
    }

    const playersPerTable = tournament.players_per_table || 9;
    const tablesNeeded = Math.ceil(participants.length / playersPerTable);

    // Create tables
    for (let i = 1; i <= tablesNeeded; i++) {
      const { data: table, error: tableError } = await this.supabase
        .from('poker_tables')
        .insert({
          name: `${tournament.name} - Стол ${i}`,
          table_type: 'tournament',
          game_type: 'holdem',
          tournament_id: tournament.id,
          max_players: playersPerTable,
          min_buy_in: 0,
          max_buy_in: 0,
          small_blind: tournament.small_blind,
          big_blind: tournament.big_blind,
          ante: tournament.ante || 0,
          action_time_seconds: tournament.action_time_seconds || 30,
          status: 'waiting',
          auto_start_enabled: true
        })
        .select('id')
        .single();

      if (tableError) {
        logger.error(`[TournamentAutoStart] Failed to create table ${i}`, { error: tableError.message });
      }
    }

    // Seat players at tables using the late_register function
    for (const p of participants) {
      await this.supabase.rpc('late_register_tournament_player', {
        p_tournament_id: tournament.id,
        p_player_id: p.player_id
      });
    }
  }

  private async cancelTournament(tournament: TournamentToProcess, playerCount: number, minPlayers: number): Promise<void> {
    if (!this.supabase) return;

    logger.warn(`[TournamentAutoStart] Cancelling ${tournament.name}: ${playerCount}/${minPlayers} players`);

    // 1. Update tournament status
    await this.supabase
      .from('online_poker_tournaments')
      .update({
        status: 'cancelled',
        finished_at: new Date().toISOString()
      })
      .eq('id', tournament.id);

    // 2. Refund all registered players (if using diamonds)
    const { data: participants } = await this.supabase
      .from('online_poker_tournament_participants')
      .select('player_id')
      .eq('tournament_id', tournament.id)
      .eq('status', 'registered');

    if (participants && participants.length > 0) {
      // Update participant status to refunded
      await this.supabase
        .from('online_poker_tournament_participants')
        .update({ status: 'refunded' })
        .eq('tournament_id', tournament.id);

      // TODO: Process diamond refunds via diamond_wallets if applicable
      logger.info(`[TournamentAutoStart] Marked ${participants.length} players for refund`);
    }
  }

  private async updatePrizePool(tournamentId: string): Promise<void> {
    if (!this.supabase) return;

    try {
      const { data: prizePool } = await this.supabase
        .rpc('calculate_online_tournament_prize_pool', { tournament_id_param: tournamentId });

      if (prizePool) {
        await this.supabase
          .from('online_poker_tournaments')
          .update({ prize_pool: prizePool })
          .eq('id', tournamentId);
      }
    } catch (err) {
      logger.warn(`[TournamentAutoStart] Failed to update prize pool`, { error: String(err) });
    }
  }

  /**
   * Force start a specific tournament (admin action)
   */
  async forceStart(tournamentId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    const { data: tournament, error } = await this.supabase
      .from('online_poker_tournaments')
      .select('*')
      .eq('id', tournamentId)
      .eq('status', 'registration')
      .single();

    if (error || !tournament) {
      return { success: false, error: 'Tournament not found or not in registration' };
    }

    // Count players
    const { count } = await this.supabase
      .from('online_poker_tournament_participants')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .eq('status', 'registered');

    const playerCount = count || 0;
    const minPlayers = tournament.min_players || 2;

    if (playerCount < minPlayers) {
      return { success: false, error: `Not enough players: ${playerCount}/${minPlayers}` };
    }

    await this.startTournament(tournament as TournamentToProcess, playerCount);
    return { success: true };
  }
}

export const tournamentAutoStartService = new TournamentAutoStartService();
