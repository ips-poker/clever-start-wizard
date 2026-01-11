/**
 * Tournament Elimination Manager
 * PokerStars-style professional tournament elimination logic
 * 
 * Key differences from Cash Games:
 * - Grace period for rebuy/reentry before final elimination
 * - Bust-out animations and announcements
 * - Position/rank tracking
 * - Prize payouts
 * - Table balancing triggers
 * - ITM (In The Money) notifications
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger.js';

// ============= TOURNAMENT ELIMINATION TIMINGS =============
// Based on PokerStars tournament rules
export const TOURNAMENT_ELIMINATION_TIMINGS = {
  // Rebuy/Reentry grace period in seconds
  REBUY_GRACE_PERIOD: 60,         // 60 seconds to decide on rebuy
  REENTRY_GRACE_PERIOD: 90,       // 90 seconds to decide on reentry
  
  // Animation timings (ms)
  BUST_OUT_ANIMATION: 3000,       // Bust-out card flip animation
  RANK_ANNOUNCEMENT: 2000,        // "X finished in Yth place"
  PRIZE_ANNOUNCEMENT: 3500,       // Prize amount reveal (ITM only)
  
  // Final table specifics
  FINAL_TABLE_ELIMINATION: 5000,  // Extended animation for final table
  HEADS_UP_TRANSITION: 4000,      // Heads-up announcement
  
  // Disconnection handling
  DISCONNECT_FOLD_TIMEOUT: 30,    // Fold after 30s disconnect during hand
  DISCONNECT_ELIMINATION_TIMEOUT: 120, // 2 minutes to reconnect
  
  // Hand-for-Hand mode near bubble
  HAND_FOR_HAND_SYNC_DELAY: 500   // Wait for all tables to complete
};

// ============= ELIMINATION STATES =============
export type EliminationState = 
  | 'busted'              // Zero chips, awaiting decision
  | 'rebuy_pending'       // Has rebuy available, in grace period
  | 'reentry_pending'     // Has reentry available, in grace period
  | 'eliminated'          // Final elimination, ranked
  | 'disconnected';       // Disconnected, may return

export interface EliminationInfo {
  playerId: string;
  playerName: string;
  avatarUrl?: string;
  tableId: string;
  tournamentId: string;
  state: EliminationState;
  position?: number;          // Final position (only when eliminated)
  prizeAmount?: number;       // Prize if ITM
  isInTheMoney: boolean;
  eliminatedBy?: string;      // Player who eliminated them
  eliminatorName?: string;
  timestamp: number;
  graceDeadline?: number;     // When grace period ends
  rebuyAvailable: boolean;
  reentryAvailable: boolean;
  lastChips: number;          // Chips before bust
  handNumber: number;         // Hand where busted
}

export interface TournamentEliminationConfig {
  rebuyEnabled: boolean;
  rebuyEndLevel: number;
  rebuyCost: number;
  rebuyChips: number;
  reentryEnabled: boolean;
  reentryEndLevel: number;
  reentryCost: number;
  reentryChips: number;
  currentLevel: number;
  playersPerTable: number;
  payoutStructure: { position: number; percentage: number }[];
  totalPlayers: number;
  prizePool: number;
  remainingPlayers: number;
}

// ============= TOURNAMENT ELIMINATION MANAGER =============
export class TournamentEliminationManager {
  private supabase: SupabaseClient | null = null;
  private pendingEliminations: Map<string, EliminationInfo> = new Map();
  private graceTimers: Map<string, NodeJS.Timeout> = new Map();
  private onEliminationCallback: ((info: EliminationInfo) => void) | null = null;
  private onGraceExpiredCallback: ((playerId: string, tournamentId: string) => void) | null = null;

  setSupabase(client: SupabaseClient): void {
    this.supabase = client;
  }

  onElimination(callback: (info: EliminationInfo) => void): void {
    this.onEliminationCallback = callback;
  }

  onGraceExpired(callback: (playerId: string, tournamentId: string) => void): void {
    this.onGraceExpiredCallback = callback;
  }

  /**
   * Handle player bust (zero chips)
   * PokerStars-style: Check for rebuy/reentry, set grace period
   */
  async handlePlayerBust(
    playerId: string,
    tableId: string,
    tournamentId: string,
    eliminatedBy: string | undefined,
    lastChips: number,
    handNumber: number,
    config: TournamentEliminationConfig
  ): Promise<EliminationInfo> {
    // Clear any existing grace timer
    this.clearGraceTimer(playerId);

    // Determine available options
    const rebuyAvailable = config.rebuyEnabled && config.currentLevel <= config.rebuyEndLevel;
    const reentryAvailable = config.reentryEnabled && config.currentLevel <= config.reentryEndLevel;

    // Get player info
    let playerName = 'Player';
    let avatarUrl: string | undefined;
    let eliminatorName: string | undefined;

    if (this.supabase) {
      try {
        const { data: playerData } = await this.supabase
          .from('players')
          .select('name, avatar_url')
          .eq('id', playerId)
          .single();
        
        if (playerData) {
          playerName = playerData.name || 'Player';
          avatarUrl = playerData.avatar_url;
        }

        if (eliminatedBy) {
          const { data: eliminatorData } = await this.supabase
            .from('players')
            .select('name')
            .eq('id', eliminatedBy)
            .single();
          eliminatorName = eliminatorData?.name;
        }
      } catch (err) {
        logger.warn('Failed to fetch player info for elimination', { error: String(err) });
      }
    }

    // Determine initial state
    let state: EliminationState = 'busted';
    let graceDeadline: number | undefined;

    if (rebuyAvailable) {
      state = 'rebuy_pending';
      graceDeadline = Date.now() + TOURNAMENT_ELIMINATION_TIMINGS.REBUY_GRACE_PERIOD * 1000;
    } else if (reentryAvailable) {
      state = 'reentry_pending';
      graceDeadline = Date.now() + TOURNAMENT_ELIMINATION_TIMINGS.REENTRY_GRACE_PERIOD * 1000;
    }

    // Calculate position and prize if no options left
    let position: number | undefined;
    let prizeAmount: number | undefined;
    let isInTheMoney = false;

    if (!rebuyAvailable && !reentryAvailable) {
      position = config.remainingPlayers;
      const payout = config.payoutStructure.find(p => p.position === position);
      if (payout) {
        prizeAmount = Math.round(config.prizePool * payout.percentage / 100);
        isInTheMoney = true;
      }
      state = 'eliminated';
    }

    const info: EliminationInfo = {
      playerId,
      playerName,
      avatarUrl,
      tableId,
      tournamentId,
      state,
      position,
      prizeAmount,
      isInTheMoney,
      eliminatedBy,
      eliminatorName,
      timestamp: Date.now(),
      graceDeadline,
      rebuyAvailable,
      reentryAvailable,
      lastChips,
      handNumber
    };

    // Store pending elimination
    this.pendingEliminations.set(playerId, info);

    // Start grace timer if applicable
    if (graceDeadline) {
      const graceMs = rebuyAvailable 
        ? TOURNAMENT_ELIMINATION_TIMINGS.REBUY_GRACE_PERIOD * 1000
        : TOURNAMENT_ELIMINATION_TIMINGS.REENTRY_GRACE_PERIOD * 1000;
      
      const timer = setTimeout(() => {
        this.handleGraceExpired(playerId, tournamentId);
      }, graceMs);
      
      this.graceTimers.set(playerId, timer);
      
      logger.info('Elimination grace period started', {
        playerId: playerId.substring(0, 8),
        state,
        graceMs,
        rebuyAvailable,
        reentryAvailable
      });
    }

    // Notify callback
    if (this.onEliminationCallback) {
      this.onEliminationCallback(info);
    }

    logger.info('Player bust handled', {
      playerId: playerId.substring(0, 8),
      state,
      position,
      prizeAmount,
      isInTheMoney
    });

    return info;
  }

  /**
   * Handle grace period expiration
   * PokerStars-style: Convert to final elimination
   */
  private async handleGraceExpired(playerId: string, tournamentId: string): Promise<void> {
    const info = this.pendingEliminations.get(playerId);
    if (!info) return;

    // Fetch current tournament state for position calculation
    let position = info.position;
    let prizeAmount = info.prizeAmount;
    let isInTheMoney = info.isInTheMoney;

    if (this.supabase && !position) {
      try {
        const { data: participants } = await this.supabase
          .from('online_poker_tournament_participants')
          .select('id')
          .eq('tournament_id', tournamentId)
          .eq('status', 'playing');
        
        if (participants) {
          position = participants.length + 1;
        }

        // Check for prize
        const { data: tournament } = await this.supabase
          .from('online_poker_tournaments')
          .select('prize_pool')
          .eq('id', tournamentId)
          .single();

        const { data: payouts } = await this.supabase
          .from('online_poker_tournament_payouts')
          .select('position, percentage')
          .eq('tournament_id', tournamentId)
          .eq('position', position);

        if (payouts && payouts.length > 0 && tournament) {
          prizeAmount = Math.round(tournament.prize_pool * payouts[0].percentage / 100);
          isInTheMoney = true;
        }
      } catch (err) {
        logger.warn('Failed to calculate position on grace expiry', { error: String(err) });
      }
    }

    // Update info to eliminated
    info.state = 'eliminated';
    info.position = position;
    info.prizeAmount = prizeAmount;
    info.isInTheMoney = isInTheMoney;
    info.graceDeadline = undefined;

    this.pendingEliminations.set(playerId, info);
    this.clearGraceTimer(playerId);

    // Notify callback
    if (this.onGraceExpiredCallback) {
      this.onGraceExpiredCallback(playerId, tournamentId);
    }

    if (this.onEliminationCallback) {
      this.onEliminationCallback(info);
    }

    logger.info('Grace period expired - player eliminated', {
      playerId: playerId.substring(0, 8),
      position,
      prizeAmount
    });
  }

  /**
   * Process rebuy for a player in grace period
   */
  async processRebuy(playerId: string, tournamentId: string): Promise<{ success: boolean; newChips?: number; error?: string }> {
    const info = this.pendingEliminations.get(playerId);
    
    if (!info || info.state !== 'rebuy_pending') {
      return { success: false, error: 'Rebuy not available' };
    }

    this.clearGraceTimer(playerId);
    this.pendingEliminations.delete(playerId);

    if (!this.supabase) {
      return { success: false, error: 'Database not available' };
    }

    try {
      // Process rebuy in database
      const { data, error } = await this.supabase.rpc('process_tournament_rebuy', {
        p_tournament_id: tournamentId,
        p_player_id: playerId
      });

      if (error) {
        throw error;
      }

      logger.info('Rebuy processed successfully', {
        playerId: playerId.substring(0, 8),
        tournamentId,
        newChips: data?.new_chips
      });

      return { success: true, newChips: data?.new_chips };
    } catch (err) {
      logger.error('Rebuy processing failed', { error: String(err) });
      return { success: false, error: String(err) };
    }
  }

  /**
   * Process reentry for a player in grace period
   */
  async processReentry(playerId: string, tournamentId: string): Promise<{ success: boolean; newChips?: number; tableId?: string; seatNumber?: number; error?: string }> {
    const info = this.pendingEliminations.get(playerId);
    
    if (!info || info.state !== 'reentry_pending') {
      return { success: false, error: 'Reentry not available' };
    }

    this.clearGraceTimer(playerId);
    this.pendingEliminations.delete(playerId);

    if (!this.supabase) {
      return { success: false, error: 'Database not available' };
    }

    try {
      // Process reentry in database
      const { data, error } = await this.supabase.rpc('process_tournament_reentry', {
        p_tournament_id: tournamentId,
        p_player_id: playerId
      });

      if (error) {
        throw error;
      }

      logger.info('Reentry processed successfully', {
        playerId: playerId.substring(0, 8),
        tournamentId,
        result: data
      });

      return { 
        success: true, 
        newChips: data?.new_chips,
        tableId: data?.table_id,
        seatNumber: data?.seat_number
      };
    } catch (err) {
      logger.error('Reentry processing failed', { error: String(err) });
      return { success: false, error: String(err) };
    }
  }

  /**
   * Decline rebuy/reentry and finalize elimination
   */
  async declineAndEliminate(playerId: string, tournamentId: string): Promise<EliminationInfo | null> {
    const info = this.pendingEliminations.get(playerId);
    if (!info) return null;

    this.clearGraceTimer(playerId);
    
    // Force immediate elimination
    await this.handleGraceExpired(playerId, tournamentId);
    
    return this.pendingEliminations.get(playerId) || null;
  }

  /**
   * Get pending elimination info
   */
  getPendingElimination(playerId: string): EliminationInfo | null {
    return this.pendingEliminations.get(playerId) || null;
  }

  /**
   * Check if player has pending elimination
   */
  hasPendingElimination(playerId: string): boolean {
    return this.pendingEliminations.has(playerId);
  }

  /**
   * Clear grace timer for a player
   */
  private clearGraceTimer(playerId: string): void {
    const timer = this.graceTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.graceTimers.delete(playerId);
    }
  }

  /**
   * Calculate animation timing based on context
   */
  getAnimationTiming(info: EliminationInfo, isFinalTable: boolean): {
    bustOutDuration: number;
    rankAnnouncementDuration: number;
    prizeAnnouncementDuration: number;
    totalDuration: number;
  } {
    const bustOutDuration = isFinalTable 
      ? TOURNAMENT_ELIMINATION_TIMINGS.FINAL_TABLE_ELIMINATION 
      : TOURNAMENT_ELIMINATION_TIMINGS.BUST_OUT_ANIMATION;
    
    const rankAnnouncementDuration = TOURNAMENT_ELIMINATION_TIMINGS.RANK_ANNOUNCEMENT;
    
    const prizeAnnouncementDuration = info.isInTheMoney 
      ? TOURNAMENT_ELIMINATION_TIMINGS.PRIZE_ANNOUNCEMENT 
      : 0;
    
    return {
      bustOutDuration,
      rankAnnouncementDuration,
      prizeAnnouncementDuration,
      totalDuration: bustOutDuration + rankAnnouncementDuration + prizeAnnouncementDuration
    };
  }

  /**
   * Cleanup - clear all timers
   */
  cleanup(): void {
    for (const timer of this.graceTimers.values()) {
      clearTimeout(timer);
    }
    this.graceTimers.clear();
    this.pendingEliminations.clear();
  }
}

// Singleton instance
export const tournamentEliminationManager = new TournamentEliminationManager();
