/**
 * Poker Table - Single table game logic
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { TableConfig } from './PokerGameManager.js';
import { PokerEngine } from './PokerEngine.js';
import { logger } from '../utils/logger.js';

export interface Player {
  id: string;
  name: string;
  seatNumber: number;
  stack: number;
  status: 'active' | 'sitting_out' | 'disconnected';
  holeCards: string[];
  currentBet: number;
  isFolded: boolean;
  isAllIn: boolean;
  timeBank: number;
  lastActionTime: number | null;
}

export interface HandState {
  id: string;
  handNumber: number;
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  pot: number;
  communityCards: string[];
  currentBet: number;
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  currentPlayerSeat: number | null;
  lastAggressor: string | null;
  minRaise: number;
  sidePots: { amount: number; eligiblePlayers: string[] }[];
  deck: string[];
  actionStartTime: number | null;
}

type TableEventCallback = (event: TableEvent) => void;

export interface TableEvent {
  type: string;
  tableId: string;
  data: unknown;
  timestamp: number;
}

export class PokerTable {
  public readonly id: string;
  private config: TableConfig;
  private supabase: SupabaseClient;
  private engine: PokerEngine;
  
  private players: Map<string, Player> = new Map();
  private seats: (string | null)[] = [];
  private currentHand: HandState | null = null;
  private handNumber: number = 0;
  private dealerSeat: number = 0;
  
  private actionTimer: NodeJS.Timeout | null = null;
  private eventListeners: Set<TableEventCallback> = new Set();
  
  constructor(config: TableConfig, supabase: SupabaseClient) {
    this.id = config.id;
    this.config = config;
    this.supabase = supabase;
    this.engine = new PokerEngine();
    this.seats = new Array(config.maxPlayers).fill(null);
  }
  
  /**
   * Add event listener
   */
  addEventListener(callback: TableEventCallback): void {
    this.eventListeners.add(callback);
  }
  
  /**
   * Remove event listener
   */
  removeEventListener(callback: TableEventCallback): void {
    this.eventListeners.delete(callback);
  }
  
  /**
   * Emit event to all listeners
   */
  private emit(type: string, data: unknown): void {
    const event: TableEvent = {
      type,
      tableId: this.id,
      data,
      timestamp: Date.now()
    };
    
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        logger.error('Event listener error', { error: String(err) });
      }
    }
  }
  
  /**
   * Join table
   */
  async joinTable(playerId: string, playerName: string, seatNumber: number, buyIn: number): Promise<{
    success: boolean;
    error?: string;
  }> {
    // Validate seat
    if (seatNumber < 0 || seatNumber >= this.config.maxPlayers) {
      return { success: false, error: 'Invalid seat number' };
    }
    
    if (this.seats[seatNumber] !== null) {
      return { success: false, error: 'Seat is occupied' };
    }
    
    // Validate buy-in
    if (buyIn < this.config.minBuyIn || buyIn > this.config.maxBuyIn) {
      return { success: false, error: `Buy-in must be between ${this.config.minBuyIn} and ${this.config.maxBuyIn}` };
    }
    
    // Check if player already at table
    if (this.players.has(playerId)) {
      return { success: false, error: 'Player already at table' };
    }
    
    const player: Player = {
      id: playerId,
      name: playerName,
      seatNumber,
      stack: buyIn,
      status: 'active',
      holeCards: [],
      currentBet: 0,
      isFolded: false,
      isAllIn: false,
      timeBank: this.config.timeBankSeconds,
      lastActionTime: null
    };
    
    this.players.set(playerId, player);
    this.seats[seatNumber] = playerId;
    
    // Save to database
    await this.supabase.from('poker_table_players').insert({
      table_id: this.id,
      player_id: playerId,
      seat_number: seatNumber,
      stack: buyIn,
      status: 'active'
    });
    
    this.emit('player_joined', { playerId, playerName, seatNumber, stack: buyIn });
    
    logger.info(`Player joined table`, { tableId: this.id, playerId, seatNumber });
    
    // Start hand if we have enough players
    this.checkStartHand();
    
    return { success: true };
  }
  
  /**
   * Leave table
   */
  async leaveTable(playerId: string): Promise<{ success: boolean; error?: string }> {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not at table' };
    }
    
    // Can't leave during hand
    if (this.currentHand && !player.isFolded && player.status === 'active') {
      // Mark as sitting out instead
      player.status = 'sitting_out';
      this.emit('player_sitting_out', { playerId });
      return { success: true };
    }
    
    this.seats[player.seatNumber] = null;
    this.players.delete(playerId);
    
    // Remove from database
    await this.supabase
      .from('poker_table_players')
      .delete()
      .eq('table_id', this.id)
      .eq('player_id', playerId);
    
    this.emit('player_left', { playerId, stack: player.stack });
    
    return { success: true };
  }
  
  /**
   * Perform action
   */
  async action(playerId: string, actionType: string, amount?: number): Promise<{
    success: boolean;
    error?: string;
    nextState?: object;
  }> {
    if (!this.currentHand) {
      return { success: false, error: 'No active hand' };
    }
    
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not at table' };
    }
    
    // Validate it's player's turn
    const currentPlayerSeat = this.currentHand.currentPlayerSeat;
    if (player.seatNumber !== currentPlayerSeat) {
      return { success: false, error: 'Not your turn' };
    }
    
    // Clear action timer
    this.clearActionTimer();
    
    // Process action
    const result = this.engine.processAction(
      this.currentHand,
      Array.from(this.players.values()),
      playerId,
      actionType,
      amount
    );
    
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    // Update state
    this.currentHand = result.newHandState!;
    this.updatePlayerFromAction(player, result);
    
    // Emit action event
    this.emit('action', {
      playerId,
      actionType,
      amount: result.amount,
      pot: this.currentHand.pot,
      phase: this.currentHand.phase
    });
    
    // Check if hand is complete
    if (result.handComplete) {
      await this.completeHand(result.winners!);
    } else if (result.phaseAdvanced) {
      this.emit('phase_change', {
        phase: this.currentHand.phase,
        communityCards: this.currentHand.communityCards,
        pot: this.currentHand.pot
      });
    }
    
    // Start timer for next player
    if (!result.handComplete && this.currentHand.currentPlayerSeat !== null) {
      this.startActionTimer();
    }
    
    return { success: true, nextState: this.getPublicState() };
  }
  
  /**
   * Update player after action
   */
  private updatePlayerFromAction(player: Player, result: {
    success: boolean;
    amount?: number;
    isAllIn?: boolean;
    isFolded?: boolean;
  }): void {
    if (result.amount) {
      player.currentBet += result.amount;
      player.stack -= result.amount;
    }
    if (result.isAllIn) player.isAllIn = true;
    if (result.isFolded) player.isFolded = true;
    player.lastActionTime = Date.now();
  }
  
  /**
   * Start action timer
   */
  private startActionTimer(): void {
    this.currentHand!.actionStartTime = Date.now();
    
    this.actionTimer = setTimeout(() => {
      this.handleTimeout();
    }, this.config.actionTimeSeconds * 1000);
  }
  
  /**
   * Clear action timer
   */
  private clearActionTimer(): void {
    if (this.actionTimer) {
      clearTimeout(this.actionTimer);
      this.actionTimer = null;
    }
  }
  
  /**
   * Handle player timeout
   */
  private async handleTimeout(): Promise<void> {
    if (!this.currentHand || this.currentHand.currentPlayerSeat === null) return;
    
    const playerId = this.seats[this.currentHand.currentPlayerSeat];
    if (!playerId) return;
    
    const player = this.players.get(playerId);
    if (!player) return;
    
    // Use time bank if available
    if (player.timeBank > 0) {
      player.timeBank -= this.config.actionTimeSeconds;
      this.emit('time_bank_used', { playerId, remaining: player.timeBank });
      this.startActionTimer();
      return;
    }
    
    // Auto fold/check
    const canCheck = player.currentBet >= this.currentHand.currentBet;
    await this.action(playerId, canCheck ? 'check' : 'fold');
    
    this.emit('timeout', { playerId, action: canCheck ? 'check' : 'fold' });
  }
  
  /**
   * Check if hand should start
   */
  private checkStartHand(): void {
    if (this.currentHand) return;
    
    const activePlayers = Array.from(this.players.values())
      .filter(p => p.status === 'active' && p.stack > 0);
    
    if (activePlayers.length >= 2) {
      setTimeout(() => this.startHand(), 3000);
    }
  }
  
  /**
   * Start a new hand
   */
  async startHand(): Promise<void> {
    this.handNumber++;
    
    // Move dealer button
    this.dealerSeat = this.getNextActiveSeat(this.dealerSeat);
    
    // Reset players
    for (const player of this.players.values()) {
      player.holeCards = [];
      player.currentBet = 0;
      player.isFolded = player.status !== 'active' || player.stack <= 0;
      player.isAllIn = false;
    }
    
    // Initialize hand state
    const activePlayers = Array.from(this.players.values())
      .filter(p => !p.isFolded);
    
    this.currentHand = this.engine.initializeHand(
      this.id,
      this.handNumber,
      activePlayers,
      this.dealerSeat,
      this.config.smallBlind,
      this.config.bigBlind,
      this.config.ante
    );
    
    // Deal hole cards
    for (const player of activePlayers) {
      const numCards = this.config.gameType === 'omaha' ? 4 : 
                       this.config.gameType === 'pineapple' ? 3 : 2;
      player.holeCards = this.engine.dealCards(this.currentHand.deck, numCards);
    }
    
    this.emit('hand_started', {
      handNumber: this.handNumber,
      dealerSeat: this.dealerSeat,
      smallBlindSeat: this.currentHand.smallBlindSeat,
      bigBlindSeat: this.currentHand.bigBlindSeat,
      players: activePlayers.map(p => ({
        id: p.id,
        name: p.name,
        seatNumber: p.seatNumber,
        stack: p.stack
      }))
    });
    
    // Start action timer
    this.startActionTimer();
    
    logger.info(`Hand started`, { tableId: this.id, handNumber: this.handNumber });
  }
  
  /**
   * Complete hand and distribute winnings
   */
  private async completeHand(winners: { playerId: string; amount: number; handName: string }[]): Promise<void> {
    // Distribute winnings
    for (const winner of winners) {
      const player = this.players.get(winner.playerId);
      if (player) {
        player.stack += winner.amount;
      }
    }
    
    this.emit('hand_complete', {
      handNumber: this.handNumber,
      winners,
      showdown: this.currentHand?.phase === 'showdown',
      communityCards: this.currentHand?.communityCards
    });
    
    // Save hand history
    await this.saveHandHistory();
    
    this.currentHand = null;
    
    // Check for next hand
    setTimeout(() => this.checkStartHand(), 5000);
  }
  
  /**
   * Save hand history to database
   */
  private async saveHandHistory(): Promise<void> {
    if (!this.currentHand) return;
    
    try {
      await this.supabase.from('poker_hands').insert({
        id: this.currentHand.id,
        table_id: this.id,
        hand_number: this.currentHand.handNumber,
        dealer_seat: this.currentHand.dealerSeat,
        small_blind_seat: this.currentHand.smallBlindSeat,
        big_blind_seat: this.currentHand.bigBlindSeat,
        community_cards: this.currentHand.communityCards,
        pot: this.currentHand.pot,
        phase: this.currentHand.phase,
        completed_at: new Date().toISOString()
      });
    } catch (err) {
      logger.error('Failed to save hand history', { error: String(err) });
    }
  }
  
  /**
   * Get next active seat
   */
  private getNextActiveSeat(fromSeat: number): number {
    let seat = (fromSeat + 1) % this.config.maxPlayers;
    let attempts = 0;
    
    while (attempts < this.config.maxPlayers) {
      const playerId = this.seats[seat];
      if (playerId) {
        const player = this.players.get(playerId);
        if (player && player.status === 'active' && player.stack > 0) {
          return seat;
        }
      }
      seat = (seat + 1) % this.config.maxPlayers;
      attempts++;
    }
    
    return fromSeat;
  }
  
  /**
   * Get public table state (visible to all players)
   */
  getPublicState(): object {
    return {
      id: this.id,
      name: this.config.name,
      gameType: this.config.gameType,
      maxPlayers: this.config.maxPlayers,
      smallBlind: this.config.smallBlind,
      bigBlind: this.config.bigBlind,
      ante: this.config.ante,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        seatNumber: p.seatNumber,
        stack: p.stack,
        status: p.status,
        currentBet: p.currentBet,
        isFolded: p.isFolded,
        isAllIn: p.isAllIn,
        hasCards: p.holeCards.length > 0
      })),
      hand: this.currentHand ? {
        handNumber: this.currentHand.handNumber,
        phase: this.currentHand.phase,
        pot: this.currentHand.pot,
        communityCards: this.currentHand.communityCards,
        currentBet: this.currentHand.currentBet,
        dealerSeat: this.currentHand.dealerSeat,
        currentPlayerSeat: this.currentHand.currentPlayerSeat,
        minRaise: this.currentHand.minRaise
      } : null
    };
  }
  
  /**
   * Get player-specific state (includes hole cards)
   */
  getPlayerState(playerId: string): object | null {
    const player = this.players.get(playerId);
    if (!player) return null;
    
    return {
      ...this.getPublicState(),
      myCards: player.holeCards,
      myStack: player.stack,
      myTimeBank: player.timeBank,
      isMyTurn: this.currentHand?.currentPlayerSeat === player.seatNumber
    };
  }
  
  /**
   * Save table state
   */
  async saveState(): Promise<void> {
    await this.supabase
      .from('poker_tables')
      .update({
        current_hand_id: this.currentHand?.id || null,
        current_dealer_seat: this.dealerSeat,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.id);
  }
  
  // Utility methods
  getPlayerCount(): number {
    return this.players.size;
  }
  
  isHandInProgress(): boolean {
    return this.currentHand !== null;
  }
}
