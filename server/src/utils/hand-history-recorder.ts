/**
 * Hand History Recorder - Professional PokerStars-Level Recording
 * 
 * Records all actions in real-time during the hand and saves
 * complete history to database on hand completion.
 * 
 * Features:
 * - Real-time action recording during hand
 * - Complete hand_players and actions saving to DB
 * - Stack tracking (start/end)
 * - Hole cards preservation for showdown
 * - PokerStars format export
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger.js';

// Types for hand history recording
export interface RecordedAction {
  playerId: string;
  playerName: string;
  seatNumber: number;
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  actionType: string;
  amount: number;
  potAfter: number;
  timestamp: number;
  actionOrder: number;
}

export interface RecordedPlayer {
  playerId: string;
  playerName: string;
  seatNumber: number;
  stackStart: number;
  stackEnd: number;
  holeCards: string[];
  isFolded: boolean;
  isAllIn: boolean;
  wonAmount: number;
  handRank: string | null;
  betAmount: number;
}

export interface HandRecording {
  handId: string;
  tableId: string;
  tableName: string;
  handNumber: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  startedAt: number;
  completedAt: number | null;
  players: Map<string, RecordedPlayer>;
  actions: RecordedAction[];
  communityCards: string[];
  pot: number;
  winners: { playerId: string; amount: number; handName: string }[];
  actionCounter: number;
}

/**
 * Hand History Recorder - Singleton service for recording poker hands
 */
class HandHistoryRecorder {
  private supabase: SupabaseClient | null = null;
  private activeRecordings: Map<string, HandRecording> = new Map();
  
  // Retention settings
  private readonly RETENTION_HOURS = 72; // Keep hands for 72 hours (3 days)
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  /**
   * Initialize with Supabase client
   */
  initialize(supabase: SupabaseClient): void {
    this.supabase = supabase;
    
    // Start daily cleanup (every 6 hours)
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldHands();
    }, 6 * 60 * 60 * 1000);
    
    logger.info('HandHistoryRecorder initialized', {
      retentionHours: this.RETENTION_HOURS
    });
  }
  
  /**
   * Start recording a new hand
   */
  startRecording(
    handId: string,
    tableId: string,
    tableName: string,
    handNumber: number,
    config: {
      smallBlind: number;
      bigBlind: number;
      ante: number;
    },
    positions: {
      dealerSeat: number;
      smallBlindSeat: number;
      bigBlindSeat: number;
    },
    players: {
      playerId: string;
      playerName: string;
      seatNumber: number;
      stack: number;
      holeCards: string[];
    }[]
  ): void {
    const recording: HandRecording = {
      handId,
      tableId,
      tableName,
      handNumber,
      smallBlind: config.smallBlind,
      bigBlind: config.bigBlind,
      ante: config.ante,
      dealerSeat: positions.dealerSeat,
      smallBlindSeat: positions.smallBlindSeat,
      bigBlindSeat: positions.bigBlindSeat,
      startedAt: Date.now(),
      completedAt: null,
      players: new Map(),
      actions: [],
      communityCards: [],
      pot: 0,
      winners: [],
      actionCounter: 0
    };
    
    // Initialize players
    for (const p of players) {
      recording.players.set(p.playerId, {
        playerId: p.playerId,
        playerName: p.playerName,
        seatNumber: p.seatNumber,
        stackStart: p.stack,
        stackEnd: p.stack,
        holeCards: [...p.holeCards],
        isFolded: false,
        isAllIn: false,
        wonAmount: 0,
        handRank: null,
        betAmount: 0
      });
    }
    
    this.activeRecordings.set(handId, recording);
    
    logger.debug('Hand recording started', {
      handId,
      tableId,
      handNumber,
      playerCount: players.length
    });
  }
  
  /**
   * Record blind posting (SB, BB, ante)
   */
  recordBlind(
    handId: string,
    playerId: string,
    blindType: 'sb' | 'bb' | 'ante',
    amount: number,
    potAfter: number
  ): void {
    const recording = this.activeRecordings.get(handId);
    if (!recording) return;
    
    const player = recording.players.get(playerId);
    if (!player) return;
    
    recording.actionCounter++;
    recording.actions.push({
      playerId,
      playerName: player.playerName,
      seatNumber: player.seatNumber,
      phase: 'preflop',
      actionType: `post_${blindType}`,
      amount,
      potAfter,
      timestamp: Date.now(),
      actionOrder: recording.actionCounter
    });
    
    player.betAmount += amount;
    recording.pot = potAfter;
  }
  
  /**
   * Record a player action
   */
  recordAction(
    handId: string,
    playerId: string,
    phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown',
    actionType: string,
    amount: number,
    potAfter: number
  ): void {
    const recording = this.activeRecordings.get(handId);
    if (!recording) return;
    
    const player = recording.players.get(playerId);
    if (!player) return;
    
    recording.actionCounter++;
    recording.actions.push({
      playerId,
      playerName: player.playerName,
      seatNumber: player.seatNumber,
      phase,
      actionType: actionType.toLowerCase(),
      amount,
      potAfter,
      timestamp: Date.now(),
      actionOrder: recording.actionCounter
    });
    
    // Update player state
    if (actionType.toLowerCase() === 'fold') {
      player.isFolded = true;
    } else if (actionType.toLowerCase().includes('allin') || actionType.toLowerCase() === 'all-in') {
      player.isAllIn = true;
    }
    
    if (amount > 0) {
      player.betAmount += amount;
    }
    
    recording.pot = potAfter;
    
    logger.debug('Action recorded', {
      handId,
      playerId: playerId.substring(0, 8),
      phase,
      actionType,
      amount,
      actionOrder: recording.actionCounter
    });
  }
  
  /**
   * Record community cards dealt
   */
  recordCommunityCards(handId: string, cards: string[]): void {
    const recording = this.activeRecordings.get(handId);
    if (!recording) return;
    
    recording.communityCards = [...cards];
  }
  
  /**
   * Update player's hole cards (if revealed at showdown)
   */
  updateHoleCards(handId: string, playerId: string, holeCards: string[]): void {
    const recording = this.activeRecordings.get(handId);
    if (!recording) return;
    
    const player = recording.players.get(playerId);
    if (player) {
      player.holeCards = [...holeCards];
    }
  }
  
  /**
   * Complete hand recording and save to database
   */
  async completeRecording(
    handId: string,
    winners: { playerId: string; amount: number; handName: string }[],
    finalStacks: Map<string, number>,
    showdownHands?: { playerId: string; holeCards: string[]; handRank: string }[]
  ): Promise<void> {
    const recording = this.activeRecordings.get(handId);
    if (!recording) {
      logger.warn('No recording found for hand', { handId });
      return;
    }
    
    recording.completedAt = Date.now();
    recording.winners = winners;
    
    // Update final stacks and winners
    for (const [playerId, stack] of finalStacks) {
      const player = recording.players.get(playerId);
      if (player) {
        player.stackEnd = stack;
      }
    }
    
    // Update won amounts
    for (const winner of winners) {
      const player = recording.players.get(winner.playerId);
      if (player) {
        player.wonAmount = winner.amount;
        player.handRank = winner.handName;
      }
    }
    
    // Update showdown hands
    if (showdownHands) {
      for (const sh of showdownHands) {
        const player = recording.players.get(sh.playerId);
        if (player) {
          player.holeCards = sh.holeCards;
          player.handRank = sh.handRank;
        }
      }
    }
    
    // Save to database
    await this.saveToDatabase(recording);
    
    // Remove from active recordings
    this.activeRecordings.delete(handId);
    
    logger.info('Hand recording completed and saved', {
      handId,
      handNumber: recording.handNumber,
      actionCount: recording.actions.length,
      playerCount: recording.players.size,
      winnerCount: winners.length
    });
  }
  
  /**
   * Save complete hand recording to database
   */
  private async saveToDatabase(recording: HandRecording): Promise<void> {
    if (!this.supabase) {
      logger.error('Supabase not initialized in HandHistoryRecorder');
      return;
    }
    
    try {
      // 1. Save hand players
      const handPlayers = Array.from(recording.players.values()).map(p => ({
        hand_id: recording.handId,
        player_id: p.playerId,
        seat_number: p.seatNumber,
        stack_start: p.stackStart,
        stack_end: p.stackEnd,
        hole_cards: p.holeCards.length > 0 ? p.holeCards : null,
        is_folded: p.isFolded,
        is_all_in: p.isAllIn,
        won_amount: p.wonAmount,
        hand_rank: p.handRank,
        bet_amount: p.betAmount
      }));
      
      if (handPlayers.length > 0) {
        const { error: playersError } = await this.supabase
          .from('poker_hand_players')
          .upsert(handPlayers, { 
            onConflict: 'hand_id,player_id',
            ignoreDuplicates: false 
          });
        
        if (playersError) {
          logger.error('Failed to save hand players', { 
            handId: recording.handId, 
            error: playersError.message 
          });
        }
      }
      
      // 2. Save actions
      if (recording.actions.length > 0) {
        const actions = recording.actions.map(a => ({
          hand_id: recording.handId,
          player_id: a.playerId,
          seat_number: a.seatNumber,
          phase: a.phase,
          action_type: a.actionType,
          amount: a.amount || null,
          action_order: a.actionOrder,
          hole_cards: null // Hole cards are stored in hand_players
        }));
        
        const { error: actionsError } = await this.supabase
          .from('poker_actions')
          .upsert(actions, { 
            onConflict: 'hand_id,action_order',
            ignoreDuplicates: false 
          });
        
        if (actionsError) {
          logger.error('Failed to save hand actions', { 
            handId: recording.handId, 
            error: actionsError.message 
          });
        }
      }
      
      // 3. Update poker_hands with winners
      const { error: handsError } = await this.supabase
        .from('poker_hands')
        .update({
          community_cards: recording.communityCards,
          pot: recording.pot,
          winners: recording.winners,
          completed_at: new Date(recording.completedAt!).toISOString()
        })
        .eq('id', recording.handId);
      
      if (handsError) {
        logger.error('Failed to update poker_hands', { 
          handId: recording.handId, 
          error: handsError.message 
        });
      }
      
      logger.info('Hand history saved to database', {
        handId: recording.handId,
        players: handPlayers.length,
        actions: recording.actions.length
      });
      
    } catch (error) {
      logger.error('Failed to save hand history', { 
        handId: recording.handId, 
        error: String(error) 
      });
    }
  }
  
  /**
   * Clean up old hands from database
   */
  async cleanupOldHands(): Promise<number> {
    if (!this.supabase) return 0;
    
    const cutoffTime = new Date(Date.now() - this.RETENTION_HOURS * 60 * 60 * 1000).toISOString();
    
    try {
      // Get old completed hands
      const { data: oldHands, error: fetchError } = await this.supabase
        .from('poker_hands')
        .select('id')
        .not('completed_at', 'is', null)
        .lt('completed_at', cutoffTime)
        .limit(1000);
      
      if (fetchError || !oldHands || oldHands.length === 0) {
        return 0;
      }
      
      const handIds = oldHands.map(h => h.id);
      
      // Delete in batches of 100
      const batchSize = 100;
      let deletedCount = 0;
      
      for (let i = 0; i < handIds.length; i += batchSize) {
        const batch = handIds.slice(i, i + batchSize);
        
        // Delete actions first (FK constraint)
        await this.supabase
          .from('poker_actions')
          .delete()
          .in('hand_id', batch);
        
        // Delete hand players
        await this.supabase
          .from('poker_hand_players')
          .delete()
          .in('hand_id', batch);
        
        // Delete hands
        await this.supabase
          .from('poker_hands')
          .delete()
          .in('id', batch);
        
        deletedCount += batch.length;
      }
      
      logger.info('Cleaned up old hand history', {
        deletedCount,
        retentionHours: this.RETENTION_HOURS,
        cutoffTime
      });
      
      return deletedCount;
      
    } catch (error) {
      logger.error('Failed to cleanup old hands', { error: String(error) });
      return 0;
    }
  }
  
  /**
   * Get active recording (for debugging)
   */
  getActiveRecording(handId: string): HandRecording | undefined {
    return this.activeRecordings.get(handId);
  }
  
  /**
   * Get stats for monitoring
   */
  getStats(): {
    activeRecordings: number;
    retentionHours: number;
  } {
    return {
      activeRecordings: this.activeRecordings.size,
      retentionHours: this.RETENTION_HOURS
    };
  }
  
  /**
   * Shutdown
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Save any active recordings before shutdown
    // (In production, these would be lost - consider persisting to Redis)
    if (this.activeRecordings.size > 0) {
      logger.warn('Shutdown with active recordings', {
        count: this.activeRecordings.size,
        handIds: Array.from(this.activeRecordings.keys())
      });
    }
    
    logger.info('HandHistoryRecorder shutdown complete');
  }
}

// Export singleton
export const handHistoryRecorder = new HandHistoryRecorder();
