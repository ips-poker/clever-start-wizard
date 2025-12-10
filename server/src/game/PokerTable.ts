/**
 * Poker Table - Single table game logic
 * Uses Professional Poker Engine v3.0
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { TableConfig } from './PokerGameManager.js';
import { PokerEngineV3, ActionResult, GameType, GameConfig } from './PokerEngineV3.js';
import { logger } from '../utils/logger.js';

export interface Player {
  id: string;
  name: string;
  avatarUrl?: string; // Player avatar from profile
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
  bigBlind: number; // Store BB for min bet calculations
  sidePots: { amount: number; eligiblePlayers: string[] }[];
  deck: string[];
  actionStartTime: number | null;
  playersActedThisRound: Set<string>; // Track who has acted in current betting round
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
  private engine: PokerEngineV3;
  
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
    
    // Initialize Professional Poker Engine v3.0
    const gameType = this.mapGameType(config.gameType);
    const engineConfig: GameConfig = {
      smallBlind: config.smallBlind,
      bigBlind: config.bigBlind,
      ante: config.ante || 0,
      maxPlayers: config.maxPlayers,
      minBuyIn: config.minBuyIn,
      maxBuyIn: config.maxBuyIn,
      actionTimeSeconds: config.actionTimeSeconds,
      timeBankSeconds: config.timeBankSeconds,
      runItTwiceEnabled: false,
      bombPotEnabled: false,
      straddleEnabled: false
    };
    
    this.engine = new PokerEngineV3(gameType, engineConfig);
    this.seats = new Array(config.maxPlayers).fill(null);
    
    logger.info('PokerTable initialized with Engine v3.0', {
      tableId: this.id,
      gameType,
      config: engineConfig
    });
  }
  
  /**
   * Map config game type to engine GameType
   */
  private mapGameType(configType: string): GameType {
    const typeMap: Record<string, GameType> = {
      'texas_holdem': GameType.TEXAS_HOLDEM,
      'holdem': GameType.TEXAS_HOLDEM,
      'omaha': GameType.OMAHA,
      'omaha_hi_lo': GameType.OMAHA_HI_LO,
      'short_deck': GameType.SHORT_DECK,
      'pineapple': GameType.PINEAPPLE,
      'chinese': GameType.CHINESE_POKER
    };
    return typeMap[configType] || GameType.TEXAS_HOLDEM;
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
  async joinTable(playerId: string, playerName: string, seatNumber: number, buyIn: number, avatarUrl?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    logger.info('joinTable called', { tableId: this.id, playerId, seatNumber, buyIn, avatarUrl });
    
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
    
    // Try to fetch avatar from database if not provided
    let resolvedAvatarUrl = avatarUrl;
    if (!resolvedAvatarUrl) {
      try {
        const { data: playerData } = await this.supabase
          .from('players')
          .select('avatar_url')
          .eq('id', playerId)
          .single();
        
        if (playerData?.avatar_url) {
          resolvedAvatarUrl = playerData.avatar_url;
          logger.info('Fetched avatar from DB', { playerId, avatarUrl: resolvedAvatarUrl });
        }
      } catch (err) {
        logger.warn('Failed to fetch avatar', { playerId, error: String(err) });
      }
    }
    
    const player: Player = {
      id: playerId,
      name: playerName,
      avatarUrl: resolvedAvatarUrl,
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
    
    this.emit('player_joined', { playerId, playerName, seatNumber, stack: buyIn, avatarUrl: resolvedAvatarUrl });
    
    logger.info(`Player joined table successfully`, { tableId: this.id, playerId, seatNumber, stack: buyIn, avatarUrl: resolvedAvatarUrl });
    
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
   * Perform action using Engine v3.0
   * PROFESSIONAL: Full validation with race condition protection
   */
  async action(playerId: string, actionType: string, amount?: number): Promise<{
    success: boolean;
    error?: string;
    nextState?: object;
  }> {
    // Validation 1: Check active hand
    if (!this.currentHand) {
      logger.warn('Action rejected - no active hand', { playerId, actionType });
      return { success: false, error: 'No active hand' };
    }
    
    // Validation 2: Check player exists
    const player = this.players.get(playerId);
    if (!player) {
      logger.warn('Action rejected - player not at table', { playerId });
      return { success: false, error: 'Player not at table' };
    }
    
    // Validation 3: Check player is not folded or all-in
    if (player.isFolded) {
      logger.warn('Action rejected - player already folded', { playerId });
      return { success: false, error: 'You have already folded' };
    }
    
    if (player.isAllIn) {
      logger.warn('Action rejected - player already all-in', { playerId });
      return { success: false, error: 'You are already all-in' };
    }
    
    // Validation 4: Check player has chips (unless folding)
    if (player.stack <= 0 && actionType.toLowerCase() !== 'fold') {
      logger.warn('Action rejected - no chips', { playerId, stack: player.stack });
      return { success: false, error: 'No chips to bet' };
    }
    
    // Validation 5: Check it's player's turn (critical for race conditions)
    const currentPlayerSeat = this.currentHand.currentPlayerSeat;
    if (player.seatNumber !== currentPlayerSeat) {
      logger.warn('Action rejected - not player turn', {
        playerId: playerId.substring(0, 8),
        playerSeat: player.seatNumber,
        currentPlayerSeat,
        phase: this.currentHand.phase
      });
      return { success: false, error: 'Not your turn' };
    }
    
    // Clear action timer before processing
    this.clearActionTimer();
    
    logger.info('=== ACTION PROCESSING ===', {
      playerId: playerId.substring(0, 8),
      playerName: player.name,
      actionType,
      amount,
      phase: this.currentHand.phase,
      currentBet: this.currentHand.currentBet,
      playerBet: player.currentBet,
      playerStack: player.stack
    });
    
    // Process action with Engine v3.0
    const result: ActionResult = this.engine.processAction(
      playerId,
      actionType,
      amount
    );
    
    logger.info('Engine result', {
      success: result.success,
      error: result.error,
      phaseAdvanced: result.phaseAdvanced,
      handComplete: result.handComplete,
      nextPlayerSeat: result.nextPlayerSeat,
      newPhase: result.phase,
      pot: result.pot
    });
    
    if (!result.success) {
      // Restart timer for retry
      this.startActionTimer();
      return { success: false, error: result.error };
    }
    
    // CRITICAL: Sync ALL player state from engine (engine is source of truth)
    // Do NOT call updatePlayerFromAction - it causes double subtraction!
    const engineState = this.engine.getState();
    if (engineState) {
      const prevPhase = this.currentHand.phase;
      this.currentHand.phase = this.mapPhase(engineState.phase);
      this.currentHand.pot = engineState.pot;
      this.currentHand.communityCards = engineState.communityCards;
      this.currentHand.currentBet = engineState.currentBet;
      this.currentHand.currentPlayerSeat = engineState.currentPlayerSeat;
      this.currentHand.minRaise = engineState.minRaise;
      this.currentHand.sidePots = engineState.sidePots || [];
      
      // CRITICAL: ALWAYS sync player state from engine - not just on phase change
      // Engine is authoritative for all player data (stack, bet, fold, all-in, totalBetThisHand)
      for (const enginePlayer of engineState.players) {
        const tablePlayer = this.players.get(enginePlayer.id);
        if (tablePlayer) {
          const prevStack = tablePlayer.stack;
          
          tablePlayer.currentBet = enginePlayer.betAmount;
          tablePlayer.stack = enginePlayer.stack;
          tablePlayer.isFolded = enginePlayer.isFolded;
          tablePlayer.isAllIn = enginePlayer.isAllIn;
          
          // PROFESSIONAL: Safety check - log any negative stacks
          if (tablePlayer.stack < 0) {
            logger.error('CRITICAL: Negative stack synced from engine!', {
              playerId: enginePlayer.id.substring(0, 8),
              engineStack: enginePlayer.stack,
              prevStack
            });
            tablePlayer.stack = 0;
          }
          
          // Log significant changes for debugging
          if (prevStack !== tablePlayer.stack) {
            logger.info('Player stack updated from engine', {
              playerId: enginePlayer.id.substring(0, 8),
              prevStack,
              newStack: tablePlayer.stack,
              bet: enginePlayer.betAmount,
              totalBetThisHand: enginePlayer.totalBetThisHand,
              isAllIn: enginePlayer.isAllIn
            });
          }
        }
      }
    }
    
    // Emit action event with player bet info
    this.emit('action', {
      playerId,
      actionType,
      amount: result.amount || 0,
      pot: this.currentHand?.pot || 0,
      phase: this.currentHand?.phase || 'preflop',
      playerBet: player.currentBet
    });
    
    // CRITICAL: Always emit state update so all clients see updated bets
    this.emit('state_update', {
      pot: this.currentHand?.pot || 0,
      currentBet: this.currentHand?.currentBet || 0,
      currentPlayerSeat: this.currentHand?.currentPlayerSeat,
      phase: this.currentHand?.phase || 'preflop'
    });
    
    // Check if hand is complete
    if (result.handComplete && result.winners) {
      logger.info('Hand complete - distributing winnings', { 
        winners: result.winners,
        pot: this.currentHand?.pot
      });
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
   * Update player after action - DEPRECATED
   * Engine state is now authoritative - do not use this method
   * Left for reference only
   */
  private updatePlayerFromAction(player: Player, result: ActionResult): void {
    // REMOVED: Double subtraction bug - engine already updates player stack
    // The engine is now the source of truth for all player state
    // We sync from engine state instead of manually updating here
    
    // Only update timestamp
    player.lastActionTime = Date.now();
    
    // Log for debugging - don't modify values
    logger.info('updatePlayerFromAction called (deprecated)', {
      playerId: player.id,
      actionAmount: result.amount,
      engineStack: player.stack, // Already synced from engine
      isAllIn: result.isAllIn,
      isFolded: result.isFolded
    });
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
    
    // Auto fold/check - PROFESSIONAL: prefer check when possible
    const canCheck = player.currentBet >= this.currentHand.currentBet;
    const autoAction = canCheck ? 'check' : 'fold';
    
    logger.warn('Player auto-action due to timeout', { 
      playerId: playerId.substring(0, 8), 
      action: autoAction,
      timeBankRemaining: player.timeBank
    });
    
    await this.action(playerId, autoAction);
    
    this.emit('timeout', { playerId, action: autoAction });
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
   * Start a new hand using Engine v3.0
   * PROFESSIONAL: Full error handling with graceful recovery
   */
  async startHand(): Promise<void> {
    try {
      this.handNumber++;
      
      // Move dealer button
      this.dealerSeat = this.getNextActiveSeat(this.dealerSeat);
      
      // Reset players and VALIDATE stacks
      for (const player of this.players.values()) {
        player.holeCards = [];
        player.currentBet = 0;
        player.isAllIn = false;
        
        // CRITICAL: Ensure no negative stacks (safety net)
        if (player.stack < 0) {
          logger.error('CRITICAL: Negative stack detected at hand start! Resetting to 0', {
            playerId: player.id.substring(0, 8),
            name: player.name,
            negativeStack: player.stack
          });
          player.stack = 0;
        }
        
        player.isFolded = player.status !== 'active' || player.stack <= 0;
      }
      
      // Get active players for engine v3
      const activePlayers = Array.from(this.players.values())
        .filter(p => !p.isFolded && p.stack > 0);
      
      // Verify we have enough players
      if (activePlayers.length < 2) {
        logger.warn('Not enough active players to start hand', { 
          count: activePlayers.length,
          required: 2
        });
        return;
      }
      
      logger.info('=== STARTING NEW HAND ===', {
        tableId: this.id,
        handNumber: this.handNumber,
        dealerSeat: this.dealerSeat,
        activePlayers: activePlayers.map(p => ({
          id: p.id.substring(0, 8),
          name: p.name,
          seat: p.seatNumber,
          stack: p.stack
        }))
      });
      
      // Convert to engine player format
      const enginePlayers = activePlayers.map(p => ({
        id: p.id,
        name: p.name,
        seatNumber: p.seatNumber,
        stack: p.stack,
        status: p.status as 'active' | 'sitting_out' | 'disconnected',
        isDealer: p.seatNumber === this.dealerSeat
      }));
      
      // Start new hand with engine v3 (may throw if validation fails)
      const engineState = this.engine.startNewHand(enginePlayers, this.dealerSeat);
      
      // Map engine state to our HandState
      this.currentHand = {
        id: engineState.handId,
        handNumber: this.handNumber,
        phase: this.mapPhase(engineState.phase),
        pot: engineState.pot,
        communityCards: engineState.communityCards,
        currentBet: engineState.currentBet,
        dealerSeat: engineState.dealerSeat,
        smallBlindSeat: engineState.smallBlindSeat,
        bigBlindSeat: engineState.bigBlindSeat,
        currentPlayerSeat: engineState.currentPlayerSeat,
        lastAggressor: null,
        minRaise: engineState.minRaise,
        bigBlind: this.config.bigBlind,
        sidePots: [],
        deck: [], // Deck is managed internally by engine v3
        actionStartTime: Date.now(),
        playersActedThisRound: new Set()
      };
      
      // Get dealt hole cards from engine state
      for (const player of activePlayers) {
        const enginePlayer = engineState.players.find(ep => ep.id === player.id);
        if (enginePlayer) {
          player.holeCards = enginePlayer.holeCards || [];
          player.currentBet = enginePlayer.currentBet || 0;
        }
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
      
      logger.info('Hand started successfully', { 
        tableId: this.id, 
        handNumber: this.handNumber, 
        players: activePlayers.length,
        pot: this.currentHand.pot,
        currentBet: this.currentHand.currentBet,
        firstToAct: this.currentHand.currentPlayerSeat
      });
      
    } catch (error) {
      logger.error('Failed to start hand', { 
        tableId: this.id, 
        error: String(error) 
      });
      
      // Reset hand state on error
      this.currentHand = null;
      
      // Try again later with fewer players
      setTimeout(() => this.checkStartHand(), 10000);
    }
  }
  
  /**
   * Map engine phase to our phase type
   */
  private mapPhase(enginePhase: string): 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' {
    const phaseMap: Record<string, 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'> = {
      'preflop': 'preflop',
      'flop': 'flop',
      'turn': 'turn',
      'river': 'river',
      'showdown': 'showdown'
    };
    return phaseMap[enginePhase] || 'preflop';
  }
  
  /**
   * Complete hand and distribute winnings
   * CRITICAL: Ensures stacks never go negative and properly awards pot
   */
  private async completeHand(winners: { playerId: string; amount: number; handName: string }[]): Promise<void> {
    logger.info('=== HAND COMPLETION START ===', {
      tableId: this.id,
      handNumber: this.handNumber,
      pot: this.currentHand?.pot,
      winnersCount: winners.length,
      winners: winners.map(w => ({
        id: w.playerId.substring(0, 8),
        amount: w.amount,
        hand: w.handName
      }))
    });
    
    // Calculate total winnings to verify pot distribution
    const totalWinnings = winners.reduce((sum, w) => sum + w.amount, 0);
    logger.info('Total winnings to distribute:', { totalWinnings, pot: this.currentHand?.pot });
    
    // Log player states before distribution
    for (const [pid, p] of this.players) {
      logger.info('Player state BEFORE payout', {
        playerId: pid.substring(0, 8),
        name: p.name,
        stack: p.stack,
        currentBet: p.currentBet,
        isFolded: p.isFolded,
        isAllIn: p.isAllIn
      });
    }
    
    // Distribute winnings
    for (const winner of winners) {
      const player = this.players.get(winner.playerId);
      if (player) {
        const oldStack = player.stack;
        player.stack += winner.amount;
        
        // SAFETY: Ensure stack is never negative (should never happen, but safety check)
        if (player.stack < 0) {
          logger.error('CRITICAL: Negative stack detected after payout! Resetting to winning amount', {
            playerId: player.id,
            name: player.name,
            oldStack,
            winAmount: winner.amount,
            newStack: player.stack
          });
          player.stack = winner.amount;
        }
        
        logger.info('Winner payout SUCCESS', {
          playerId: player.id.substring(0, 8),
          name: player.name,
          handName: winner.handName,
          amount: winner.amount,
          oldStack,
          newStack: player.stack
        });
      } else {
        logger.error('CRITICAL: Winner not found in players map!', { 
          winnerId: winner.playerId,
          winAmount: winner.amount 
        });
      }
    }
    
    // Log final player states
    for (const [pid, p] of this.players) {
      logger.info('Player state AFTER payout', {
        playerId: pid.substring(0, 8),
        name: p.name,
        stack: p.stack
      });
    }
    
    this.emit('hand_complete', {
      handNumber: this.handNumber,
      winners,
      showdown: this.currentHand?.phase === 'showdown',
      communityCards: this.currentHand?.communityCards
    });
    
    logger.info('=== HAND COMPLETION END ===', { 
      tableId: this.id, 
      handNumber: this.handNumber,
      winnersInfo: winners.map(w => `${w.playerId.substring(0,8)}:${w.amount}`)
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
    const players = Array.from(this.players.values()).map(p => ({
      playerId: p.id,
      id: p.id,
      name: p.name,
      avatarUrl: p.avatarUrl || null, // Include avatar URL from DB
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
