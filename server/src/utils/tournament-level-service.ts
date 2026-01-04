/**
 * Tournament Level Service
 * Автоматически управляет уровнями блайндов для всех турниров
 * Работает как серверный cron - проверяет каждые 5 секунд
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger.js';

interface TournamentLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number | null;
  duration: number | null;
  is_break: boolean | null;
}

class TournamentLevelService {
  private supabase: SupabaseClient | null = null;
  private interval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private checkIntervalMs = 5000; // 5 seconds

  setSupabase(client: SupabaseClient): void {
    this.supabase = client;
    logger.info('[TournamentLevelService] Supabase client configured');
  }

  start(): void {
    if (this.interval) {
      logger.warn('[TournamentLevelService] Already running');
      return;
    }

    logger.info('[TournamentLevelService] Starting level manager service');

    // Initial check after 2 seconds
    setTimeout(() => this.checkAndAdvanceLevels(), 2000);

    // Then check every 5 seconds
    this.interval = setInterval(() => this.checkAndAdvanceLevels(), this.checkIntervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('[TournamentLevelService] Stopped');
    }
  }

  private async checkAndAdvanceLevels(): Promise<void> {
    if (!this.supabase || this.isProcessing) return;

    this.isProcessing = true;

    try {
      const now = new Date();

      // Find tournaments with expired level_end_at
      const { data: expiredTournaments, error: fetchError } = await this.supabase
        .from('online_poker_tournaments')
        .select('id, name, current_level, level_duration, level_end_at, status, small_blind, big_blind, ante')
        .in('status', ['running', 'break'])
        .not('level_end_at', 'is', null)
        .lt('level_end_at', now.toISOString());

      if (fetchError) {
        logger.error('[TournamentLevelService] Error fetching tournaments', { error: fetchError.message });
        return;
      }

      if (!expiredTournaments || expiredTournaments.length === 0) {
        return; // No tournaments need advancement - silent return
      }

      logger.info(`[TournamentLevelService] Found ${expiredTournaments.length} tournaments with expired levels`);

      for (const tournament of expiredTournaments) {
        await this.advanceTournamentLevel(tournament);
      }
    } catch (err) {
      logger.error('[TournamentLevelService] Error in checkAndAdvanceLevels', { error: String(err) });
    } finally {
      this.isProcessing = false;
    }
  }

  private async advanceTournamentLevel(tournament: any): Promise<void> {
    if (!this.supabase) return;

    const currentLevel = tournament.current_level || 1;

    // Get next level
    const { data: nextLevel, error: levelError } = await this.supabase
      .from('online_poker_tournament_levels')
      .select('*')
      .eq('tournament_id', tournament.id)
      .eq('level', currentLevel + 1)
      .single();

    if (levelError || !nextLevel) {
      // No next level - extend current level
      logger.info(`[TournamentLevelService] Tournament ${tournament.name}: No next level, extending current`);

      const { data: currentLevelData } = await this.supabase
        .from('online_poker_tournament_levels')
        .select('*')
        .eq('tournament_id', tournament.id)
        .eq('level', currentLevel)
        .single();

      if (currentLevelData) {
        const duration = currentLevelData.duration || tournament.level_duration || 300;
        const newEndTime = new Date(Date.now() + duration * 1000);

        await this.supabase
          .from('online_poker_tournaments')
          .update({ level_end_at: newEndTime.toISOString() })
          .eq('id', tournament.id);
      }
      return;
    }

    const isBreak = nextLevel.is_break || false;
    const wasBreak = tournament.status === 'break';
    const duration = nextLevel.duration || tournament.level_duration || 300;
    const newEndTime = new Date(Date.now() + duration * 1000);

    let action: string;
    let newStatus = tournament.status;

    if (isBreak) {
      action = 'break_started';
      newStatus = 'break';
    } else if (wasBreak) {
      action = 'break_ended';
      newStatus = 'running';
    } else {
      action = 'level_advanced';
      newStatus = 'running';
    }

    // Update tournament
    const { error: updateError } = await this.supabase
      .from('online_poker_tournaments')
      .update({
        current_level: currentLevel + 1,
        small_blind: isBreak ? tournament.small_blind : nextLevel.small_blind,
        big_blind: isBreak ? tournament.big_blind : nextLevel.big_blind,
        ante: isBreak ? tournament.ante : nextLevel.ante,
        level_end_at: newEndTime.toISOString(),
        status: newStatus
      })
      .eq('id', tournament.id);

    if (updateError) {
      logger.error(`[TournamentLevelService] Error updating tournament ${tournament.id}`, { error: updateError.message });
      return;
    }

    // Update all tournament tables with new blinds (if not break)
    if (!isBreak) {
      const { error: tablesError } = await this.supabase
        .from('poker_tables')
        .update({
          small_blind: nextLevel.small_blind,
          big_blind: nextLevel.big_blind,
          ante: nextLevel.ante || 0
        })
        .eq('tournament_id', tournament.id);

      if (tablesError) {
        logger.error(`[TournamentLevelService] Error updating tables for ${tournament.id}`, { error: tablesError.message });
      }
    }

    // Trigger table balancing
    try {
      await this.supabase.rpc('consolidate_tournament_tables', { p_tournament_id: tournament.id });
    } catch (err) {
      logger.warn(`[TournamentLevelService] Table consolidation failed for ${tournament.id}`, { error: String(err) });
    }

    logger.info(`[TournamentLevelService] ${tournament.name}: ${action}`, {
      previousLevel: currentLevel,
      newLevel: currentLevel + 1,
      smallBlind: isBreak ? tournament.small_blind : nextLevel.small_blind,
      bigBlind: isBreak ? tournament.big_blind : nextLevel.big_blind,
      isBreak,
      duration
    });
  }

  /**
   * Force advance a specific tournament's level (for testing/admin)
   */
  async forceAdvance(tournamentId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    const { data: tournament, error } = await this.supabase
      .from('online_poker_tournaments')
      .select('id, name, current_level, level_duration, level_end_at, status, small_blind, big_blind, ante')
      .eq('id', tournamentId)
      .single();

    if (error || !tournament) {
      return { success: false, error: 'Tournament not found' };
    }

    await this.advanceTournamentLevel(tournament);
    return { success: true };
  }
}

export const tournamentLevelService = new TournamentLevelService();
