/**
 * Poker Table - Single table game logic
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { TableConfig } from './PokerGameManager.js';
import { PokerEngine, ActionResult } from './PokerEngine.js';
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
    
    const listenerCount = this.eventListeners.size;
    logger.info('Emitting event', { type, tableId: this.id, listenerCount });
    
    if (listenerCount === 0) {
      logger.warn('No event listeners registered for table', { tableId: this.id, eventType: type });
    }
    
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
    logger.info('joinTable called', { tableId: this.id, playerId, seatNumber, buyIn });
    
    // Validate seat
    if (seatNumber < 0 || seatNumber >= this.config.maxPlayers) {
      logger.warn('Invalid seat number', { seatNumber, maxPlayers: this.config.maxPlayers });
      return { success: false, error: 'Invalid seat number' };
    }
    
    if (this.seats[seatNumber] !== null) {
      logger.warn('Seat is occupied', { seatNumber, occupiedBy: this.seats[seatNumber] });
      return { success: false, error: 'Seat is occupied' };
    }
    
    // Validate buy-in
    if (buyIn < this.config.minBuyIn || buyIn > this.config.maxBuyIn) {
      logger.warn('Invalid buy-in', { buyIn, min: this.config.minBuyIn, max: this.config.maxBuyIn });
      return { success: false, error: `Buy-in must be between ${this.config.minBuyIn} and ${this.config.maxBuyIn}` };
    }
    
    // Check if player already at table
    if (this.players.has(playerId)) {
      logger.warn('Player already at table', { playerId });
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
    
    // Save to database - use service role, handle errors gracefully
    try {
      const { error: dbError } = await this.supabase.from('poker_table_players').upsert({
        table_id: this.id,
        player_id: playerId,
        seat_number: seatNumber,
        stack: buyIn,
        status: 'active'
      }, {
        onConflict: 'table_id,player_id'
      });
      
      if (dbError) {
        logger.warn('Database insert warning (continuing anyway)', { error: dbError.message });
      }
    } catch (dbErr) {
      logger.warn('Database error (continuing anyway)', { error: String(dbErr) });
    }
    
    this.emit('player_joined', { playerId, playerName, seatNumber, stack: buyIn });
    
    logger.info(`Player joined table successfully`, { tableId: this.id, playerId, seatNumber, stack: buyIn });
    
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
    const result: ActionResult = this.engine.processAction(
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
    if (result.newHandState) {
      this.currentHand = result.newHandState;
    }
    this.updatePlayerFromAction(player, result);
    
    // Emit action event
    this.emit('action', {
      playerId,
      actionType,
      amount: result.amount || 0,
      pot: this.currentHand?.pot || 0,
      phase: this.currentHand?.phase || 'preflop'
    });
    
    // Check if hand is complete
    if (result.handComplete && result.winners) {
      await this.completeHand(result.winners);
    } else if (result.phaseAdvanced && this.currentHand) {
      this.emit('phase_change', {
        phase: this.currentHand.phase,
        communityCards: this.currentHand.communityCards,
        pot: this.currentHand.pot
      });
    }
    
    // Start timer for next player
    if (!result.handComplete && this.currentHand?.currentPlayerSeat !== null) {
      this.startActionTimer();
    }
    
    return { success: true, nextState: this.getPublicState() };
  }
  
  /**
   * Update player after action
   */
  private updatePlayerFromAction(player: Player, result: ActionResult): void {
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
    if (this.currentHand) {
      this.currentHand.actionStartTime = Date.now();
    }
    
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
    
    logger.info('Player timed out', { playerId });
    
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
    logger.info('checkStartHand called', { 
      tableId: this.id, 
      hasCurrentHand: !!this.currentHand,
      totalPlayers: this.players.size
    });
    
    if (this.currentHand) {
      logger.info('checkStartHand: hand already in progress');
      return;
    }
    
    const allPlayers = Array.from(this.players.values());
    const activePlayers = allPlayers.filter(p => p.status === 'active' && p.stack > 0);
    
    logger.info('checkStartHand: player status check', {
      allPlayers: allPlayers.map(p => ({ id: p.id, status: p.status, stack: p.stack })),
      activeCount: activePlayers.length
    });
    
    if (activePlayers.length >= 2) {
      logger.info('checkStartHand: starting hand in 3 seconds...');
      setTimeout(() => this.startHand(), 3000);
    } else {
      logger.info('checkStartHand: not enough players', { need: 2, have: activePlayers.length });
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
    
    const handState = this.engine.initializeHand(
      this.id,
      this.handNumber,
      activePlayers,
      this.dealerSeat,
      this.config.smallBlind,
      this.config.bigBlind,
      this.config.ante
    );
    
    this.currentHand = handState;
    
    // Deal hole cards
    for (const player of activePlayers) {
      const numCards = this.config.gameType === 'omaha' ? 4 : 
                       this.config.gameType === 'pineapple' ? 3 : 2;
      player.holeCards = this.engine.dealCards(this.currentHand.deck, numCards);
    }
    
    this.emit('hand_started', {
      handId: this.currentHand.id,
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
    
    logger.info(`Hand started`, { tableId: this.id, handNumber: this.handNumber, players: activePlayers.length });
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
    
    logger.info('Hand complete', { tableId: this.id, handNumber: this.handNumber, winners });
    
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
    const players = Array.from(this.players.values()).map(p => ({
      playerId: p.id,
      id: p.id,
      name: p.name,
      seatNumber: p.seatNumber,
      stack: p.stack,
      status: p.status,
      betAmount: p.currentBet,
      currentBet: p.currentBet,
      isFolded: p.isFolded,
      isAllIn: p.isAllIn,
      isActive: p.status === 'active',
      hasCards: p.holeCards.length > 0,
      holeCards: [] // Hidden for public state
    }));

    return {
      tableId: this.id,
      id: this.id,
      name: this.config.name,
      gameType: this.config.gameType,
      maxPlayers: this.config.maxPlayers,
      smallBlind: this.config.smallBlind,
      bigBlind: this.config.bigBlind,
      ante: this.config.ante,
      actionTimer: this.config.actionTimeSeconds,
      players,
      // Hand state (flattened for easier client consumption)
      phase: this.currentHand?.phase || 'waiting',
      pot: this.currentHand?.pot || 0,
      communityCards: this.currentHand?.communityCards || [],
      currentBet: this.currentHand?.currentBet || 0,
      dealerSeat: this.currentHand?.dealerSeat ?? this.dealerSeat ?? 0,
      smallBlindSeat: this.currentHand?.smallBlindSeat ?? 0,
      bigBlindSeat: this.currentHand?.bigBlindSeat ?? 1,
      currentPlayerSeat: this.currentHand?.currentPlayerSeat ?? null,
      minRaise: this.currentHand?.minRaise || this.config.bigBlind,
      handNumber: this.currentHand?.handNumber || 0,
      // Countdown info
      playersNeeded: this.getPlayersNeededToStart()
    };
  }
  
  /**
   * Get player-specific state (includes hole cards)
   */
  getPlayerState(playerId: string): object {
    const publicState = this.getPublicState() as Record<string, unknown>;
    const player = this.players.get(playerId);
    
    if (!player) {
      return {
        ...publicState,
        myCards: [],
        mySeat: null,
        myStack: 0,
        myTimeBank: 0,
        isMyTurn: false
      };
    }
    
    // Update players array with hero's cards visible
    const players = (publicState.players as Array<Record<string, unknown>>).map(p => {
      if (p.playerId === playerId) {
        return { ...p, holeCards: player.holeCards };
      }
      return p;
    });
    
    return {
      ...publicState,
      players,
      myCards: player.holeCards,
      mySeat: player.seatNumber,
      myStack: player.stack,
      myTimeBank: player.timeBank,
      isMyTurn: this.currentHand?.currentPlayerSeat === player.seatNumber
    };
  }
  
  /**
   * Get number of players needed to start
   */
  private getPlayersNeededToStart(): number {
    const activePlayers = Array.from(this.players.values())
      .filter(p => p.status === 'active' && p.stack > 0);
    return Math.max(0, 2 - activePlayers.length);
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
