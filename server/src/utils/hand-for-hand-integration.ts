/**
 * Hand-for-Hand Integration with Tournament System
 * Connects HandForHandManager with TournamentManager and WebSocket
 */

import { handForHandManager, HandForHandManager } from './hand-for-hand.js';
import { logger } from './logger.js';
import { SupabaseClient } from '@supabase/supabase-js';

interface TournamentBubbleInfo {
  tournamentId: string;
  playersRemaining: number;
  paidPositions: number;
  tableIds: string[];
}

export class HandForHandIntegration {
  private supabase: SupabaseClient;
  private broadcastCallback: ((tournamentId: string, message: object) => void) | null = null;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.setupEventHandlers();
  }

  /**
   * Set broadcast callback for WebSocket messages
   */
  setBroadcastCallback(callback: (tournamentId: string, message: object) => void): void {
    this.broadcastCallback = callback;
  }

  /**
   * Setup event handlers for HFH events
   */
  private setupEventHandlers(): void {
    handForHandManager.on('event', (event) => {
      logger.info('[HFH Integration] Event received', { type: event.type, tournamentId: event.tournamentId });
      
      if (this.broadcastCallback) {
        this.broadcastCallback(event.tournamentId, {
          type: event.type,
          tournamentId: event.tournamentId,
          ...event.data,
          timestamp: Date.now()
        });
      }

      // Update database on certain events
      this.handleEventSideEffects(event);
    });
  }

  /**
   * Handle side effects of HFH events (DB updates, etc.)
   */
  private async handleEventSideEffects(event: { type: string; tournamentId: string; data?: any }): Promise<void> {
    try {
      switch (event.type) {
        case 'hfh_started':
          await this.supabase
            .from('online_poker_tournaments')
            .update({ 
              status: 'hand_for_hand',
              updated_at: new Date().toISOString()
            })
            .eq('id', event.tournamentId);
          break;

        case 'hfh_bubble_burst':
          await this.supabase
            .from('online_poker_tournaments')
            .update({ 
              status: 'running',
              updated_at: new Date().toISOString()
            })
            .eq('id', event.tournamentId);
          break;

        case 'hfh_ended':
          // Revert to running status
          await this.supabase
            .from('online_poker_tournaments')
            .update({ 
              status: 'running',
              updated_at: new Date().toISOString()
            })
            .eq('id', event.tournamentId);
          break;
      }
    } catch (error) {
      logger.error('[HFH Integration] Error handling event side effects', { 
        type: event.type, 
        error: String(error) 
      });
    }
  }

  /**
   * Check if tournament should enter hand-for-hand mode
   * Called after each player elimination
   */
  async checkBubbleStatus(tournamentId: string): Promise<boolean> {
    try {
      // Get tournament info
      const { data: tournament, error: tournamentError } = await this.supabase
        .from('online_poker_tournaments')
        .select('id, status')
        .eq('id', tournamentId)
        .single();

      if (tournamentError || !tournament) {
        logger.warn('[HFH] Tournament not found', { tournamentId });
        return false;
      }

      // Already in HFH mode
      if (handForHandManager.isActive(tournamentId)) {
        return true;
      }

      // Get remaining players count
      const { data: participants, error: participantsError } = await this.supabase
        .from('online_poker_tournament_participants')
        .select('id, player_id, status, table_id')
        .eq('tournament_id', tournamentId)
        .eq('status', 'playing');

      if (participantsError) {
        logger.error('[HFH] Error fetching participants', { error: participantsError });
        return false;
      }

      const playersRemaining = participants?.length || 0;

      // Get payout positions count
      const { data: payouts, error: payoutsError } = await this.supabase
        .from('online_poker_tournament_payouts')
        .select('position')
        .eq('tournament_id', tournamentId);

      if (payoutsError) {
        logger.error('[HFH] Error fetching payouts', { error: payoutsError });
        return false;
      }

      const paidPositions = payouts?.length || 0;
      const bubblePosition = paidPositions + 1;

      // Check if we're on the bubble
      // HFH starts when players remaining = paid positions + 1 (bubble)
      // Example: 8 paid positions, HFH starts when 9 players remain
      if (playersRemaining === bubblePosition && playersRemaining > 1) {
        logger.info('[HFH] Bubble detected, starting hand-for-hand', {
          tournamentId,
          playersRemaining,
          paidPositions,
          bubblePosition
        });

        // Get unique table IDs
        const tableIds = [...new Set(
          participants
            ?.filter(p => p.table_id)
            .map(p => p.table_id as string) || []
        )];

        if (tableIds.length > 0) {
          handForHandManager.startHandForHand(tournamentId, bubblePosition, tableIds);
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('[HFH] Error checking bubble status', { tournamentId, error: String(error) });
      return false;
    }
  }

  /**
   * Notify HFH manager about player elimination
   */
  async playerEliminated(tournamentId: string, playerId: string): Promise<void> {
    try {
      // First check if we should start HFH
      await this.checkBubbleStatus(tournamentId);

      // Then notify manager about elimination (if active)
      if (handForHandManager.isActive(tournamentId)) {
        const { data: participants } = await this.supabase
          .from('online_poker_tournament_participants')
          .select('id')
          .eq('tournament_id', tournamentId)
          .eq('status', 'playing');

        const playersRemaining = participants?.length || 0;
        handForHandManager.playerEliminated(tournamentId, playersRemaining);
      }
    } catch (error) {
      logger.error('[HFH] Error in playerEliminated', { tournamentId, playerId, error: String(error) });
    }
  }

  /**
   * Notify HFH manager about hand start
   * Returns false if hand should wait
   */
  handStarted(tournamentId: string, tableId: string, handNumber: number): boolean {
    return handForHandManager.handStarted(tournamentId, tableId, handNumber);
  }

  /**
   * Notify HFH manager about hand completion
   */
  handCompleted(tournamentId: string, tableId: string, playersRemaining: number): void {
    handForHandManager.handCompleted(tournamentId, tableId, playersRemaining);
  }

  /**
   * Get current HFH status for a tournament
   */
  getStatus(tournamentId: string): ReturnType<HandForHandManager['getStatus']> {
    return handForHandManager.getStatus(tournamentId);
  }

  /**
   * Check if HFH is active for tournament
   */
  isActive(tournamentId: string): boolean {
    return handForHandManager.isActive(tournamentId);
  }

  /**
   * Add table to HFH tracking
   */
  addTable(tournamentId: string, tableId: string): void {
    handForHandManager.addTable(tournamentId, tableId);
  }

  /**
   * Remove table from HFH tracking
   */
  removeTable(tournamentId: string, tableId: string): void {
    handForHandManager.removeTable(tournamentId, tableId);
  }

  /**
   * Manually end HFH mode (admin action)
   */
  endHandForHand(tournamentId: string): void {
    handForHandManager.endHandForHand(tournamentId, 'cancelled');
  }

  /**
   * Shutdown integration
   */
  shutdown(): void {
    handForHandManager.shutdown();
  }
}

// Factory function
export function createHandForHandIntegration(supabase: SupabaseClient): HandForHandIntegration {
  return new HandForHandIntegration(supabase);
}
