/**
 * Cash Game Sit-Out Management System
 * Professional implementation based on PokerStars/GGPoker logic
 * 
 * Features:
 * - Sit-out tracking with timestamps
 * - Auto-removal after timeout (15min with queue, 2hr without)
 * - Waiting list integration
 * - Missed blinds tracking
 * - Leave Next BB functionality
 * - Session tracking for analytics
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger.js';

// ==========================================
// CONSTANTS - PokerStars-style timings
// ==========================================
export const CASH_GAME_TIMEOUTS = {
  // Time limits
  ACTION_TIME_SECONDS: 15,
  TIME_BANK_SECONDS: 30,
  
  // Sit-out limits
  SIT_OUT_NO_QUEUE_MS: 2 * 60 * 60 * 1000,       // 2 hours without queue
  SIT_OUT_WITH_QUEUE_MS: 15 * 60 * 1000,         // 15 minutes with queue
  SIT_OUT_WARNING_BEFORE_MS: 2 * 60 * 1000,      // Warning 2 minutes before removal
  
  // Waiting list
  SEAT_RESERVATION_MS: 60 * 1000,                // 60 seconds to take offered seat
  WAITING_LIST_EXPIRY_MS: 30 * 60 * 1000,        // 30 minutes max in queue
  
  // Disconnect
  DISCONNECT_GRACE_MS: 60 * 1000,                // 60 seconds to reconnect
  
  // Auto sit-out after X missed turns
  MISSED_TURNS_FOR_SIT_OUT: 2,
  
  // Check interval
  CHECK_INTERVAL_MS: 30 * 1000,                  // Check every 30 seconds
};

// ==========================================
// TYPES
// ==========================================
export type SitOutReason = 
  | 'manual'           // Player clicked sit out
  | 'timeout'          // Missed action timeout
  | 'disconnect'       // Connection lost
  | 'away'             // Marked as away
  | 'leave_next_bb';   // Waiting to leave on BB

export type PlayerRemovalReason =
  | 'leave'            // Voluntary leave
  | 'sit_out_timeout'  // Sat out too long
  | 'disconnect_timeout' // Disconnected too long
  | 'busted'           // Lost all chips
  | 'table_closed';    // Table closed

export interface SitOutState {
  playerId: string;
  tableId: string;
  sitOutAt: Date;
  reason: SitOutReason;
  missedBlinds: number;
  warningsSent: number;
  leaveNextBB: boolean;
  autoPostBlinds: boolean;
}

export interface WaitingListEntry {
  id: string;
  tableId: string;
  playerId: string;
  playerName: string;
  requestedSeat: number | null;
  minBuyIn: number;
  maxBuyIn: number;
  joinedAt: Date;
  expiresAt: Date;
  position: number;
}

export interface PlayerSession {
  id: string;
  tableId: string;
  playerId: string;
  seatNumber: number;
  buyInAmount: number;
  cashOutAmount: number | null;
  handsPlayed: number;
  startedAt: Date;
  endedAt: Date | null;
  endReason: PlayerRemovalReason | null;
  peakStack: number;
  lowestStack: number;
}

// ==========================================
// CASH GAME SIT-OUT MANAGER
// ==========================================
export class CashGameSitOutManager {
  private supabase: SupabaseClient | null = null;
  private sitOutPlayers: Map<string, SitOutState> = new Map(); // key: tableId:playerId
  private checkInterval: NodeJS.Timeout | null = null;
  private onPlayerRemoved: ((tableId: string, playerId: string, reason: PlayerRemovalReason, stack: number) => void) | null = null;
  private onSeatAvailable: ((tableId: string, seatNumber: number) => void) | null = null;
  
  constructor(supabase?: SupabaseClient) {
    if (supabase) {
      this.supabase = supabase;
    }
    this.startPeriodicCheck();
    logger.info('CashGameSitOutManager initialized');
  }
  
  /**
   * Get supabase client, throws if not set
   */
  private getSupabase(): SupabaseClient {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }
    return this.supabase;
  }
  }
  
  /**
   * Set supabase client (for lazy initialization)
   */
  setSupabase(client: SupabaseClient): void {
    this.supabase = client;
  }
  
  /**
   * Set callback for when a player is removed from table
   */
  setOnPlayerRemoved(callback: (tableId: string, playerId: string, reason: PlayerRemovalReason, stack: number) => void): void {
    this.onPlayerRemoved = callback;
  }
  
  /**
   * Set callback for when a seat becomes available
   */
  setOnSeatAvailable(callback: (tableId: string, seatNumber: number) => void): void {
    this.onSeatAvailable = callback;
  }
  
  // ==========================================
  // SIT-OUT MANAGEMENT
  // ==========================================
  
  /**
   * Mark player as sitting out
   */
  async sitOut(
    tableId: string, 
    playerId: string, 
    reason: SitOutReason = 'manual'
  ): Promise<{ success: boolean; error?: string }> {
    const key = `${tableId}:${playerId}`;
    
    // Check if already sitting out
    if (this.sitOutPlayers.has(key)) {
      return { success: false, error: 'Already sitting out' };
    }
    
    const now = new Date();
    
    const state: SitOutState = {
      playerId,
      tableId,
      sitOutAt: now,
      reason,
      missedBlinds: 0,
      warningsSent: 0,
      leaveNextBB: false,
      autoPostBlinds: true,
    };
    
    this.sitOutPlayers.set(key, state);
    
    // Update database
    const { error } = await this.getSupabase()
      .from('poker_table_players')
      .update({
        status: 'sitting_out',
        sit_out_at: now.toISOString(),
        sit_out_reason: reason,
      })
      .eq('table_id', tableId)
      .eq('player_id', playerId);
    
    if (error) {
      logger.warn('Failed to update sit-out in DB', { error: error.message });
    }
    
    logger.info('Player sat out', {
      tableId,
      playerId: playerId.substring(0, 8),
      reason,
    });
    
    return { success: true };
  }
  
  /**
   * Return player to active play
   */
  async sitIn(tableId: string, playerId: string): Promise<{ success: boolean; error?: string }> {
    const key = `${tableId}:${playerId}`;
    
    // Remove from sit-out tracking
    this.sitOutPlayers.delete(key);
    
    // Update database
    const { error } = await this.getSupabase()
      .from('poker_table_players')
      .update({
        status: 'active',
        sit_out_at: null,
        sit_out_reason: null,
        missed_blinds: 0,
        return_warning_sent_at: null,
      })
      .eq('table_id', tableId)
      .eq('player_id', playerId);
    
    if (error) {
      logger.warn('Failed to update sit-in in DB', { error: error.message });
    }
    
    logger.info('Player sat in', {
      tableId,
      playerId: playerId.substring(0, 8),
    });
    
    return { success: true };
  }
  
  /**
   * Set "Leave Next BB" - player will leave when they post BB
   */
  async setLeaveNextBB(tableId: string, playerId: string, leave: boolean): Promise<{ success: boolean }> {
    const key = `${tableId}:${playerId}`;
    const state = this.sitOutPlayers.get(key);
    
    if (state) {
      state.leaveNextBB = leave;
    }
    
    await this.getSupabase()
      .from('poker_table_players')
      .update({ leave_next_bb: leave })
      .eq('table_id', tableId)
      .eq('player_id', playerId);
    
    logger.info('Leave Next BB set', {
      tableId,
      playerId: playerId.substring(0, 8),
      leave,
    });
    
    return { success: true };
  }
  
  /**
   * Increment missed blinds counter
   */
  async incrementMissedBlinds(tableId: string, playerId: string): Promise<number> {
    const key = `${tableId}:${playerId}`;
    const state = this.sitOutPlayers.get(key);
    
    if (state) {
      state.missedBlinds++;
    }
    
    const { data } = await this.getSupabase()
      .from('poker_table_players')
      .select('missed_blinds')
      .eq('table_id', tableId)
      .eq('player_id', playerId)
      .single();
    
    const newCount = (data?.missed_blinds || 0) + 1;
    
    await this.getSupabase()
      .from('poker_table_players')
      .update({ missed_blinds: newCount })
      .eq('table_id', tableId)
      .eq('player_id', playerId);
    
    return newCount;
  }
  
  /**
   * Get sit-out duration in milliseconds
   */
  getSitOutDuration(tableId: string, playerId: string): number {
    const key = `${tableId}:${playerId}`;
    const state = this.sitOutPlayers.get(key);
    
    if (!state) return 0;
    
    return Date.now() - state.sitOutAt.getTime();
  }
  
  // ==========================================
  // WAITING LIST MANAGEMENT
  // ==========================================
  
  /**
   * Join waiting list for a table
   */
  async joinWaitingList(
    tableId: string,
    playerId: string,
    minBuyIn: number,
    maxBuyIn: number,
    requestedSeat?: number
  ): Promise<{ success: boolean; position?: number; error?: string }> {
    // Check if already in queue
    const { data: existing } = await this.getSupabase()
      .from('poker_waiting_list')
      .select('id')
      .eq('table_id', tableId)
      .eq('player_id', playerId)
      .eq('status', 'waiting')
      .maybeSingle();
    
    if (existing) {
      return { success: false, error: 'Already in waiting list' };
    }
    
    // Check if already at table
    const { data: atTable } = await this.getSupabase()
      .from('poker_table_players')
      .select('id')
      .eq('table_id', tableId)
      .eq('player_id', playerId)
      .maybeSingle();
    
    if (atTable) {
      return { success: false, error: 'Already at table' };
    }
    
    // Add to waiting list
    const { error } = await this.getSupabase()
      .from('poker_waiting_list')
      .insert({
        table_id: tableId,
        player_id: playerId,
        requested_seat: requestedSeat || null,
        min_buy_in: minBuyIn,
        max_buy_in: maxBuyIn,
      });
    
    if (error) {
      logger.error('Failed to join waiting list', { error: error.message });
      return { success: false, error: 'Failed to join waiting list' };
    }
    
    // Get position
    const { data: position } = await this.getSupabase()
      .rpc('get_waiting_list_position', {
        p_table_id: tableId,
        p_player_id: playerId,
      });
    
    logger.info('Player joined waiting list', {
      tableId,
      playerId: playerId.substring(0, 8),
      position,
    });
    
    return { success: true, position: position || 1 };
  }
  
  /**
   * Leave waiting list
   */
  async leaveWaitingList(tableId: string, playerId: string): Promise<{ success: boolean }> {
    await this.getSupabase()
      .from('poker_waiting_list')
      .update({ status: 'cancelled' })
      .eq('table_id', tableId)
      .eq('player_id', playerId)
      .eq('status', 'waiting');
    
    logger.info('Player left waiting list', {
      tableId,
      playerId: playerId.substring(0, 8),
    });
    
    return { success: true };
  }
  
  /**
   * Get waiting list for a table
   */
  async getWaitingList(tableId: string): Promise<WaitingListEntry[]> {
    const { data, error } = await this.getSupabase()
      .from('poker_waiting_list')
      .select(`
        id,
        table_id,
        player_id,
        requested_seat,
        min_buy_in,
        max_buy_in,
        joined_at,
        expires_at,
        players(name)
      `)
      .eq('table_id', tableId)
      .eq('status', 'waiting')
      .order('priority', { ascending: false })
      .order('joined_at', { ascending: true });
    
    if (error || !data) return [];
    
    return data.map((entry, index) => ({
      id: entry.id,
      tableId: entry.table_id,
      playerId: entry.player_id,
      playerName: (entry.players as any)?.name || 'Player',
      requestedSeat: entry.requested_seat,
      minBuyIn: entry.min_buy_in,
      maxBuyIn: entry.max_buy_in,
      joinedAt: new Date(entry.joined_at),
      expiresAt: new Date(entry.expires_at),
      position: index + 1,
    }));
  }
  
  /**
   * Check if there's a waiting list for a table
   */
  async hasWaitingList(tableId: string): Promise<boolean> {
    const { count } = await this.getSupabase()
      .from('poker_waiting_list')
      .select('id', { count: 'exact', head: true })
      .eq('table_id', tableId)
      .eq('status', 'waiting');
    
    return (count || 0) > 0;
  }
  
  /**
   * Notify next player in queue that seat is available
   */
  async notifyNextInQueue(tableId: string, seatNumber: number): Promise<string | null> {
    const { data } = await this.getSupabase().rpc('seat_from_waiting_list', {
      p_table_id: tableId,
      p_seat_number: seatNumber,
    });
    
    if (!data?.success) {
      return null;
    }
    
    logger.info('Notified next player in queue', {
      tableId,
      playerId: data.player_id.substring(0, 8),
      seatNumber,
    });
    
    return data.player_id;
  }
  
  // ==========================================
  // SESSION TRACKING
  // ==========================================
  
  /**
   * Start a new player session
   */
  async startSession(
    tableId: string,
    playerId: string,
    seatNumber: number,
    buyInAmount: number
  ): Promise<string | null> {
    const { data, error } = await this.getSupabase()
      .from('poker_player_sessions')
      .insert({
        table_id: tableId,
        player_id: playerId,
        seat_number: seatNumber,
        buy_in_amount: buyInAmount,
        peak_stack: buyInAmount,
        lowest_stack: buyInAmount,
      })
      .select('id')
      .single();
    
    if (error) {
      logger.warn('Failed to start session', { error: error.message });
      return null;
    }
    
    logger.info('Session started', {
      tableId,
      playerId: playerId.substring(0, 8),
      buyIn: buyInAmount,
    });
    
    return data.id;
  }
  
  /**
   * End a player session
   */
  async endSession(
    tableId: string,
    playerId: string,
    cashOutAmount: number,
    reason: PlayerRemovalReason
  ): Promise<void> {
    const now = new Date().toISOString();
    
    await this.getSupabase()
      .from('poker_player_sessions')
      .update({
        cash_out_amount: cashOutAmount,
        ended_at: now,
        end_reason: reason,
      })
      .eq('table_id', tableId)
      .eq('player_id', playerId)
      .is('ended_at', null);
    
    logger.info('Session ended', {
      tableId,
      playerId: playerId.substring(0, 8),
      cashOut: cashOutAmount,
      reason,
    });
  }
  
  /**
   * Update session stats (called after each hand)
   */
  async updateSessionStats(
    tableId: string,
    playerId: string,
    currentStack: number
  ): Promise<void> {
    // Get current session
    const { data: session } = await this.getSupabase()
      .from('poker_player_sessions')
      .select('id, peak_stack, lowest_stack, hands_played')
      .eq('table_id', tableId)
      .eq('player_id', playerId)
      .is('ended_at', null)
      .maybeSingle();
    
    if (!session) return;
    
    const updates: any = {
      hands_played: (session.hands_played || 0) + 1,
    };
    
    if (currentStack > (session.peak_stack || 0)) {
      updates.peak_stack = currentStack;
    }
    
    if (currentStack < (session.lowest_stack || currentStack)) {
      updates.lowest_stack = currentStack;
    }
    
    await this.getSupabase()
      .from('poker_player_sessions')
      .update(updates)
      .eq('id', session.id);
  }
  
  // ==========================================
  // PERIODIC CHECKS
  // ==========================================
  
  /**
   * Start periodic check for sit-out timeouts
   */
  private startPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.checkInterval = setInterval(() => {
      this.checkSitOutTimeouts();
    }, CASH_GAME_TIMEOUTS.CHECK_INTERVAL_MS);
    
    logger.info('Sit-out periodic check started');
  }
  
  /**
   * Check all sitting-out players for timeouts
   */
  private async checkSitOutTimeouts(): Promise<void> {
    const now = Date.now();
    
    for (const [key, state] of this.sitOutPlayers) {
      const duration = now - state.sitOutAt.getTime();
      const hasQueue = await this.hasWaitingList(state.tableId);
      
      const maxDuration = hasQueue 
        ? CASH_GAME_TIMEOUTS.SIT_OUT_WITH_QUEUE_MS 
        : CASH_GAME_TIMEOUTS.SIT_OUT_NO_QUEUE_MS;
      
      const warningThreshold = maxDuration - CASH_GAME_TIMEOUTS.SIT_OUT_WARNING_BEFORE_MS;
      
      // Send warning before removal
      if (duration >= warningThreshold && state.warningsSent === 0) {
        state.warningsSent = 1;
        
        await this.getSupabase()
          .from('poker_table_players')
          .update({ return_warning_sent_at: new Date().toISOString() })
          .eq('table_id', state.tableId)
          .eq('player_id', state.playerId);
        
        logger.info('Sit-out warning sent', {
          tableId: state.tableId,
          playerId: state.playerId.substring(0, 8),
          remainingMs: maxDuration - duration,
        });
      }
      
      // Remove player if timeout exceeded
      if (duration >= maxDuration) {
        logger.info('Removing player due to sit-out timeout', {
          tableId: state.tableId,
          playerId: state.playerId.substring(0, 8),
          durationMinutes: Math.floor(duration / 60000),
          hadQueue: hasQueue,
        });
        
        // Get current stack before removal
        const { data: playerData } = await this.getSupabase()
          .from('poker_table_players')
          .select('stack, seat_number')
          .eq('table_id', state.tableId)
          .eq('player_id', state.playerId)
          .single();
        
        const stack = playerData?.stack || 0;
        const seatNumber = playerData?.seat_number;
        
        // End session
        await this.endSession(state.tableId, state.playerId, stack, 'sit_out_timeout');
        
        // Remove from table
        await this.getSupabase()
          .from('poker_table_players')
          .delete()
          .eq('table_id', state.tableId)
          .eq('player_id', state.playerId);
        
        // Remove from tracking
        this.sitOutPlayers.delete(key);
        
        // Notify callbacks
        if (this.onPlayerRemoved) {
          this.onPlayerRemoved(state.tableId, state.playerId, 'sit_out_timeout', stack);
        }
        
        if (seatNumber !== undefined && this.onSeatAvailable) {
          this.onSeatAvailable(state.tableId, seatNumber);
        }
      }
    }
  }
  
  /**
   * Load sit-out players from database on startup
   */
  async loadFromDatabase(): Promise<void> {
    const { data: sittingOut } = await this.getSupabase()
      .from('poker_table_players')
      .select('table_id, player_id, sit_out_at, sit_out_reason, missed_blinds, leave_next_bb, auto_post_blinds')
      .eq('status', 'sitting_out')
      .not('sit_out_at', 'is', null);
    
    if (!sittingOut) return;
    
    for (const row of sittingOut) {
      const key = `${row.table_id}:${row.player_id}`;
      this.sitOutPlayers.set(key, {
        tableId: row.table_id,
        playerId: row.player_id,
        sitOutAt: new Date(row.sit_out_at),
        reason: row.sit_out_reason as SitOutReason || 'manual',
        missedBlinds: row.missed_blinds || 0,
        warningsSent: 0,
        leaveNextBB: row.leave_next_bb || false,
        autoPostBlinds: row.auto_post_blinds ?? true,
      });
    }
    
    logger.info('Loaded sit-out players from database', { count: sittingOut.length });
  }
  
  /**
   * Cleanup and shutdown
   */
  shutdown(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    this.sitOutPlayers.clear();
    logger.info('CashGameSitOutManager shutdown');
  }
}

// Export singleton factory
let instance: CashGameSitOutManager | null = null;

export function getCashGameSitOutManager(supabase: SupabaseClient): CashGameSitOutManager {
  if (!instance) {
    instance = new CashGameSitOutManager(supabase);
  }
  return instance;
}