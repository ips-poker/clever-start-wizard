/**
 * Tournament State Synchronizer
 * Ensures server state is in sync with database:
 * - Loads active tournaments on startup
 * - Syncs state changes to DB in real-time
 * - Handles server restart recovery
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger.js';

interface TournamentSnapshot {
  id: string;
  name: string;
  status: string;
  currentLevel: number;
  levelEndAt: string | null;
  playersRemaining: number;
  tablesActive: number;
  prizePool: number;
  lastSyncedAt: Date;
}

class TournamentStateSynchronizer {
  private supabase: SupabaseClient | null = null;
  private tournamentSnapshots: Map<string, TournamentSnapshot> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private syncIntervalMs = 30000; // Sync every 30 seconds

  setSupabase(client: SupabaseClient): void {
    this.supabase = client;
    logger.info('[TournamentSync] Supabase client configured');
  }

  async start(): Promise<void> {
    if (this.syncInterval) {
      logger.warn('[TournamentSync] Already running');
      return;
    }

    logger.info('[TournamentSync] Starting state synchronizer');

    // Initial load of active tournaments
    await this.loadActiveTournaments();

    // Periodic sync
    this.syncInterval = setInterval(() => this.syncAll(), this.syncIntervalMs);
  }

  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.info('[TournamentSync] Stopped');
    }
  }

  /**
   * Load all active tournaments from database on startup
   */
  private async loadActiveTournaments(): Promise<void> {
    if (!this.supabase) return;

    try {
      const { data: tournaments, error } = await this.supabase
        .from('online_poker_tournaments')
        .select('id, name, status, current_level, level_end_at, prize_pool')
        .in('status', ['registration', 'running', 'break', 'paused']);

      if (error) {
        logger.error('[TournamentSync] Error loading tournaments', { error: error.message });
        return;
      }

      if (!tournaments || tournaments.length === 0) {
        logger.info('[TournamentSync] No active tournaments found');
        return;
      }

      for (const t of tournaments) {
        // Count players
        const { count: playersCount } = await this.supabase
          .from('online_poker_tournament_participants')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', t.id)
          .in('status', ['registered', 'playing']);

        // Count tables
        const { count: tablesCount } = await this.supabase
          .from('poker_tables')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', t.id)
          .neq('status', 'closed');

        const snapshot: TournamentSnapshot = {
          id: t.id,
          name: t.name,
          status: t.status,
          currentLevel: t.current_level || 1,
          levelEndAt: t.level_end_at,
          playersRemaining: playersCount || 0,
          tablesActive: tablesCount || 0,
          prizePool: t.prize_pool || 0,
          lastSyncedAt: new Date()
        };

        this.tournamentSnapshots.set(t.id, snapshot);
      }

      logger.info(`[TournamentSync] Loaded ${this.tournamentSnapshots.size} active tournaments`);
    } catch (err) {
      logger.error('[TournamentSync] Error in loadActiveTournaments', { error: String(err) });
    }
  }

  /**
   * Sync all tournament states
   */
  private async syncAll(): Promise<void> {
    if (!this.supabase) return;

    for (const [tournamentId, snapshot] of this.tournamentSnapshots) {
      await this.syncTournament(tournamentId, snapshot);
    }

    // Clean up completed tournaments
    for (const [id, snapshot] of this.tournamentSnapshots) {
      if (snapshot.status === 'completed' || snapshot.status === 'cancelled') {
        this.tournamentSnapshots.delete(id);
      }
    }
  }

  /**
   * Sync single tournament state
   */
  private async syncTournament(tournamentId: string, snapshot: TournamentSnapshot): Promise<void> {
    if (!this.supabase) return;

    try {
      // Get current DB state
      const { data: dbState, error } = await this.supabase
        .from('online_poker_tournaments')
        .select('status, current_level, level_end_at, prize_pool')
        .eq('id', tournamentId)
        .single();

      if (error || !dbState) {
        logger.warn(`[TournamentSync] Tournament ${tournamentId} not found, removing from cache`);
        this.tournamentSnapshots.delete(tournamentId);
        return;
      }

      // Update snapshot
      snapshot.status = dbState.status;
      snapshot.currentLevel = dbState.current_level || 1;
      snapshot.levelEndAt = dbState.level_end_at;
      snapshot.prizePool = dbState.prize_pool || 0;
      snapshot.lastSyncedAt = new Date();

      // Check for tournament completion
      if (dbState.status === 'completed') {
        await this.handleTournamentCompletion(tournamentId);
      }

      // Check for stuck tournaments (level_end_at passed by more than 5 minutes)
      if (dbState.status === 'running' && dbState.level_end_at) {
        const levelEnd = new Date(dbState.level_end_at);
        const now = new Date();
        const diffMs = now.getTime() - levelEnd.getTime();
        
        if (diffMs > 5 * 60 * 1000) { // 5 minutes
          logger.warn(`[TournamentSync] Tournament ${snapshot.name} has stuck timer, diff: ${Math.round(diffMs / 1000)}s`);
          // The level service should handle this, but log for debugging
        }
      }

    } catch (err) {
      logger.error(`[TournamentSync] Error syncing tournament ${tournamentId}`, { error: String(err) });
    }
  }

  /**
   * Handle tournament completion
   */
  private async handleTournamentCompletion(tournamentId: string): Promise<void> {
    if (!this.supabase) return;

    logger.info(`[TournamentSync] Processing completion for tournament ${tournamentId}`);

    try {
      // Verify all prizes are paid
      const { data: unpaidPlayers } = await this.supabase
        .from('online_poker_tournament_participants')
        .select('player_id, finish_position, prize_amount')
        .eq('tournament_id', tournamentId)
        .gt('prize_amount', 0)
        .is('eliminated_at', null); // Winners might not have eliminated_at set properly

      if (unpaidPlayers && unpaidPlayers.length > 0) {
        logger.info(`[TournamentSync] ${unpaidPlayers.length} players awaiting prize payout`);
      }

      // Close all tournament tables
      await this.supabase
        .from('poker_tables')
        .update({ status: 'closed' })
        .eq('tournament_id', tournamentId);

    } catch (err) {
      logger.error(`[TournamentSync] Error handling completion`, { error: String(err) });
    }
  }

  /**
   * Get snapshot for tournament
   */
  getSnapshot(tournamentId: string): TournamentSnapshot | null {
    return this.tournamentSnapshots.get(tournamentId) || null;
  }

  /**
   * Get all active tournament IDs
   */
  getActiveTournamentIds(): string[] {
    return Array.from(this.tournamentSnapshots.keys());
  }

  /**
   * Get stats
   */
  getStats(): {
    activeTournaments: number;
    runningTournaments: number;
    registrationTournaments: number;
  } {
    let running = 0;
    let registration = 0;

    for (const snapshot of this.tournamentSnapshots.values()) {
      if (snapshot.status === 'running' || snapshot.status === 'break') running++;
      if (snapshot.status === 'registration') registration++;
    }

    return {
      activeTournaments: this.tournamentSnapshots.size,
      runningTournaments: running,
      registrationTournaments: registration
    };
  }

  /**
   * Force refresh a tournament
   */
  async refreshTournament(tournamentId: string): Promise<void> {
    if (!this.supabase) return;

    const snapshot = this.tournamentSnapshots.get(tournamentId);
    if (snapshot) {
      await this.syncTournament(tournamentId, snapshot);
    } else {
      // Load fresh if not in cache
      const { data: tournament } = await this.supabase
        .from('online_poker_tournaments')
        .select('id, name, status, current_level, level_end_at, prize_pool')
        .eq('id', tournamentId)
        .single();

      if (tournament && !['completed', 'cancelled'].includes(tournament.status)) {
        const newSnapshot: TournamentSnapshot = {
          id: tournament.id,
          name: tournament.name,
          status: tournament.status,
          currentLevel: tournament.current_level || 1,
          levelEndAt: tournament.level_end_at,
          playersRemaining: 0,
          tablesActive: 0,
          prizePool: tournament.prize_pool || 0,
          lastSyncedAt: new Date()
        };
        this.tournamentSnapshots.set(tournamentId, newSnapshot);
      }
    }
  }
}

export const tournamentStateSynchronizer = new TournamentStateSynchronizer();
