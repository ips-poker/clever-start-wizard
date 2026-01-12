/**
 * Poker Table - Single table game logic
 * Uses Professional Poker Engine v3.0
 * With Professional Timings (PokerStars/PPPoker style)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { TableConfig } from './PokerGameManager.js';
import { PokerEngineV3, ActionResult, GameType, GameConfig, evaluateHand } from './PokerEngineV3.js';
import { logger } from '../utils/logger.js';
import { makeBotDecision, getBotAggression, BotDecision } from './PokerBotAI.js';
import { 
  PROFESSIONAL_TIMINGS, 
  ProfessionalTimings, 
  calculatePhaseDelay,
  calculateBetCollectionDelay,
  calculateShowdownDelay,
  getTimingsForTableType
} from '../config/pokerTimings.js';

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
  missedTurns: number; // Count of consecutive missed turns (timeouts)
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
  private pendingHandStart: boolean = false; // Prevent concurrent checkStartHand calls
  
  private actionTimer: NodeJS.Timeout | null = null;
  private eventListeners: Set<TableEventCallback> = new Set();
  
  // Professional timing settings
  private timings: ProfessionalTimings = PROFESSIONAL_TIMINGS;
  
  /**
   * Utility: Promise-based delay for professional timing
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  constructor(config: TableConfig, supabase: SupabaseClient) {
    this.id = config.id;
    this.config = config;
    this.supabase = supabase;
    
    // Initialize Professional Poker Engine v3.0
    const gameType = this.mapGameType(config.gameType);
    
    // POKERSTARS RULE: Detect if this is a tournament table
    // Tournament tables force sitting out players to pay blinds/antes
    const isTournament = config.tableType === 'tournament' || config.tableType === 'sitgo';
    
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
      straddleEnabled: false,
      isTournament  // POKERSTARS: Tournament mode forces sitting out to pay blinds
    };
    
    this.engine = new PokerEngineV3(gameType, engineConfig);
    this.seats = new Array(config.maxPlayers).fill(null);
    
    // PROFESSIONAL: Set timings based on table type (turbo/hyper/standard)
    this.timings = getTimingsForTableType(config.tableType || 'standard');
    
    // CRITICAL: Load existing players from database and sync state
    this.loadPlayersFromDatabase();
    
    logger.info('PokerTable initialized with Engine v3.0', {
      tableId: this.id,
      gameType,
      config: engineConfig
    });
  }
  
  /**
   * Load existing players from database on table initialization
   * CRITICAL: This ensures server state matches database after restart
   * Made PUBLIC so loadTableIfNeeded can await it after construction
   */
  public async loadPlayersFromDatabase(): Promise<void> {
    try {
      const { data: dbPlayers, error } = await this.supabase
        .from('poker_table_players')
        .select('player_id, seat_number, stack, status')
        .eq('table_id', this.id);
      
      if (error) {
        logger.warn('Failed to load players from DB', { tableId: this.id, error: error.message });
        return;
      }
      
      if (!dbPlayers || dbPlayers.length === 0) {
        logger.info('No existing players for table', { tableId: this.id });
        return;
      }
      
      // Fetch player names and avatars
      const playerIds = dbPlayers.map(p => p.player_id);
      const { data: playerProfiles } = await this.supabase
        .from('players')
        .select('id, name, avatar_url')
        .in('id', playerIds);
      
      const profileMap = new Map(playerProfiles?.map(p => [p.id, p]) || []);

      // Some older data sets stored seats as 1..maxPlayers (1-based).
      // Engine + table logic requires 0..maxPlayers-1 (0-based).
      const seatNumbers = dbPlayers.map(p => p.seat_number);
      const hasZeroBased = seatNumbers.some(n => n === 0);
      const isOneBased = !hasZeroBased && seatNumbers.every(n => n >= 1 && n <= this.config.maxPlayers);
      const seatOffset = isOneBased ? 1 : 0;

      if (seatOffset === 1) {
        logger.warn('Detected 1-based seat numbers in DB; normalizing to 0-based', {
          tableId: this.id,
          maxPlayers: this.config.maxPlayers,
          seatNumbers
        });
      }

      const seatFixPromises: PromiseLike<unknown>[] = [];
      
      for (const dbPlayer of dbPlayers) {
        // CRITICAL: Skip players with zero stack - they are eliminated
        // This prevents dealing cards to eliminated players who haven't been cleaned up yet
        if (dbPlayer.stack <= 0) {
          logger.info('Skipping eliminated player with zero stack', {
            tableId: this.id,
            playerId: dbPlayer.player_id.substring(0, 8),
            stack: dbPlayer.stack
          });
          // Clean up this orphaned record
          this.supabase
            .from('poker_table_players')
            .delete()
            .eq('table_id', this.id)
            .eq('player_id', dbPlayer.player_id)
            .then(() => { logger.info('Cleaned up orphaned zero-stack player', { playerId: dbPlayer.player_id.substring(0, 8) }); })
            .then(undefined, (err: unknown) => { logger.warn('Failed to clean up orphaned player', { error: String(err) }); });
          continue;
        }
        
        const normalizedSeat = dbPlayer.seat_number - seatOffset;

        if (normalizedSeat < 0 || normalizedSeat >= this.config.maxPlayers) {
          logger.warn('Skipping player with invalid seat number from DB', {
            tableId: this.id,
            playerId: dbPlayer.player_id.substring(0, 8),
            dbSeatNumber: dbPlayer.seat_number,
            normalizedSeat,
            maxPlayers: this.config.maxPlayers
          });
          continue;
        }

        const profile = profileMap.get(dbPlayer.player_id);
        
        const playerName = profile?.name || 'Player';
        const isBot = this.isBotName(playerName);

        const player: Player = {
          id: dbPlayer.player_id,
          name: playerName,
          avatarUrl: profile?.avatar_url || undefined,
          seatNumber: normalizedSeat,
          stack: dbPlayer.stack,
          status: dbPlayer.status === 'sitting_out' ? 'sitting_out' : 'active',
          holeCards: [], // CRITICAL: No cards until hand starts
          currentBet: 0, // CRITICAL: No bet until hand starts
          isFolded: false,
          isAllIn: false,
          timeBank: isBot ? 0 : this.config.timeBankSeconds,
          lastActionTime: null,
          missedTurns: 0
        };
        
        this.players.set(dbPlayer.player_id, player);
        this.seats[normalizedSeat] = dbPlayer.player_id;

        // Persist normalization so future loads + clients are consistent
        if (seatOffset === 1 && normalizedSeat !== dbPlayer.seat_number) {
          seatFixPromises.push(
            (async () => {
              const { error } = await this.supabase
                .from('poker_table_players')
                .update({ seat_number: normalizedSeat })
                .eq('table_id', this.id)
                .eq('player_id', dbPlayer.player_id);
              if (error) {
                logger.warn('Failed to persist normalized seat number', {
                  tableId: this.id,
                  playerId: dbPlayer.player_id.substring(0, 8),
                  error: error.message
                });
              }
            })()
          );
        }
        
        logger.info('Loaded player from DB', {
          tableId: this.id,
          playerId: dbPlayer.player_id.substring(0, 8),
          name: player.name,
          seatNumber: player.seatNumber,
          stack: dbPlayer.stack
        });
      }

      if (seatFixPromises.length > 0) {
        await Promise.all(seatFixPromises);
        logger.info('Seat number normalization persisted to DB', {
          tableId: this.id,
          updatedPlayers: seatFixPromises.length
        });
      }
      
      logger.info('Players loaded from database', { 
        tableId: this.id, 
        count: dbPlayers.length 
      });
      
      // CRITICAL: Auto-start hand if we have enough players loaded from DB
      // Use setTimeout to let constructor complete first
      const tableId = this.id;
      const playerCount = this.players.size;
      
      logger.info('Setting up auto-start timer', { 
        tableId, 
        playerCount,
        hasCurrentHand: !!this.currentHand
      });
      
      setTimeout(() => {
        const currentPlayerCount = this.players.size;
        const activePlayers = Array.from(this.players.values()).filter(p => p.status === 'active' && p.stack > 0);
        
        logger.info('Auto-start timer fired', { 
          tableId: this.id, 
          playerCount: currentPlayerCount,
          activePlayerCount: activePlayers.length,
          hasCurrentHand: !!this.currentHand,
          pendingHandStart: this.pendingHandStart,
          players: activePlayers.map(p => ({ id: p.id.substring(0, 8), name: p.name, seat: p.seatNumber, stack: p.stack }))
        });
        
        if (!this.currentHand && currentPlayerCount >= 2) {
          logger.info('Auto-starting hand after loading players from DB', { 
            tableId: this.id, 
            playerCount: currentPlayerCount,
            activePlayerCount: activePlayers.length
          });
          this.checkStartHand();
        } else {
          logger.info('Auto-start skipped', { 
            tableId: this.id,
            reason: this.currentHand ? 'hand_in_progress' : 'not_enough_players',
            playerCount: currentPlayerCount,
            hasCurrentHand: !!this.currentHand
          });
        }
      }, 2000); // 2 second delay to ensure table is fully initialized
      
    } catch (err) {
      logger.error('Error loading players from DB', { tableId: this.id, error: String(err) });
    }
  }

  /**
   * Ensure a player that is already seated in DB is loaded into memory.
   * Used for tournament seating where the DB may be updated outside the WebSocket flow.
   */
  public async ensurePlayerLoadedFromDatabase(playerId: string): Promise<boolean> {
    if (this.players.has(playerId)) return true;

    try {
      const { data: dbPlayer, error } = await this.supabase
        .from('poker_table_players')
        .select('player_id, seat_number, stack, status')
        .eq('table_id', this.id)
        .eq('player_id', playerId)
        .maybeSingle();

      if (error) {
        logger.warn('ensurePlayerLoadedFromDatabase: failed to read poker_table_players', {
          tableId: this.id,
          playerId: playerId.substring(0, 8),
          error: error.message
        });
        return false;
      }

      if (!dbPlayer) return false;

      // Seat numbers in DB can be either 0-based or 1-based depending on where they were created.
      // Prefer 1-based -> 0-based conversion when it doesn't conflict with an occupied seat.
      const candidateOneBased = dbPlayer.seat_number - 1;
      const candidateZeroBased = dbPlayer.seat_number;

      const inRange = (n: number) => n >= 0 && n < this.config.maxPlayers;

      let seatNumber: number;
      if (dbPlayer.seat_number === 0) {
        seatNumber = 0;
      } else if (inRange(candidateOneBased) && this.seats[candidateOneBased] === null) {
        seatNumber = candidateOneBased;
      } else if (inRange(candidateZeroBased) && this.seats[candidateZeroBased] === null) {
        seatNumber = candidateZeroBased;
      } else {
        logger.warn('ensurePlayerLoadedFromDatabase: seat already occupied', {
          tableId: this.id,
          playerId: playerId.substring(0, 8),
          dbSeatNumber: dbPlayer.seat_number,
          candidateOneBased,
          candidateZeroBased
        });
        return false;
      }

      const { data: profile } = await this.supabase
        .from('players')
        .select('id, name, avatar_url')
        .eq('id', playerId)
        .maybeSingle();

      const playerName = profile?.name || 'Player';
      const isBot = this.isBotName(playerName);

      const player: Player = {
        id: playerId,
        name: playerName,
        avatarUrl: profile?.avatar_url || undefined,
        seatNumber,
        stack: dbPlayer.stack,
        status: dbPlayer.status === 'sitting_out' ? 'sitting_out' : 'active',
        holeCards: [],
        currentBet: 0,
        isFolded: false,
        isAllIn: false,
        timeBank: isBot ? 0 : this.config.timeBankSeconds,
        lastActionTime: null,
        missedTurns: 0
      };

      this.players.set(playerId, player);
      this.seats[seatNumber] = playerId;

      this.emit('player_joined', {
        playerId,
        playerName: player.name,
        seatNumber,
        stack: player.stack,
        avatarUrl: player.avatarUrl || null
      });

      logger.info('ensurePlayerLoadedFromDatabase: player loaded into memory', {
        tableId: this.id,
        playerId: playerId.substring(0, 8),
        seatNumber,
        stack: player.stack
      });

      // If table is idle, attempt to start a hand.
      if (!this.currentHand) {
        this.checkStartHand();
      }

      return true;
    } catch (err) {
      logger.error('ensurePlayerLoadedFromDatabase: unexpected error', {
        tableId: this.id,
        playerId: playerId.substring(0, 8),
        error: String(err)
      });
      return false;
    }
  }

  /**
   * Check if a player exists in memory
   */
  public hasPlayer(playerId: string): boolean {
    return this.players.has(playerId);
  }

  /**
   * Get table type (cash, tournament, sitgo)
   */
  public getTableType(): string {
    return this.config.tableType || 'cash';
  }

  /**
   * Get tournament ID if this is a tournament table
   */
  public getTournamentId(): string | null {
    return this.config.tournamentId || null;
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
    
    // Seat numbers are 0-based across the Syndicate web client and server (0..maxPlayers-1).
    // NOTE: 1-based normalization is handled when loading legacy DB rows in loadPlayersFromDatabase().


    // Validate seat
    if (seatNumber < 0 || seatNumber >= this.config.maxPlayers) {
      logger.warn('Invalid seat number', { seatNumber, maxPlayers: this.config.maxPlayers });
      return { success: false, error: 'Invalid seat number' };
    }

    // If requested seat is occupied, try to find a free seat; if table is full of bots, evict one bot
    if (this.seats[seatNumber] !== null) {
      const requestedSeat = seatNumber;

      const emptySeat = this.seats.findIndex(s => s === null);
      if (emptySeat !== -1) {
        seatNumber = emptySeat;
        logger.info('Requested seat occupied; assigned first free seat', {
          tableId: this.id,
          playerId: playerId.substring(0, 8),
          requestedSeat,
          assignedSeat: seatNumber
        });
      } else if (!this.currentHand) {
        const botSeat = this.seats.findIndex((pid) => {
          if (!pid) return false;
          const p = this.players.get(pid);
          return !!p && /bot/i.test(p.name);
        });

        if (botSeat !== -1) {
          const botId = this.seats[botSeat]!;
          logger.warn('Table full - evicting bot to make room', {
            tableId: this.id,
            botId: botId.substring(0, 8),
            botSeat,
            joiningPlayerId: playerId.substring(0, 8)
          });

          // Remove bot locally
          this.players.delete(botId);
          this.seats[botSeat] = null;

          // Best-effort DB cleanup (do not block join on RLS)
          try {
            await this.supabase
              .from('poker_table_players')
              .delete()
              .eq('table_id', this.id)
              .eq('player_id', botId);
          } catch (err) {
            logger.warn('Failed to delete bot from DB (continuing anyway)', {
              tableId: this.id,
              botId: botId.substring(0, 8),
              error: String(err)
            });
          }

          seatNumber = botSeat;
        }
      }

      if (this.seats[seatNumber] !== null) {
        logger.warn('No seats available for join', { tableId: this.id, requestedSeat, maxPlayers: this.config.maxPlayers });
        return { success: false, error: 'No seats available' };
      }
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
    
    const isBot = this.isBotName(playerName);

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
      timeBank: isBot ? 0 : this.config.timeBankSeconds,
      lastActionTime: null,
      missedTurns: 0
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
    
    // Start hand if we have enough players AND no hand is in progress
    // CRITICAL: Only start new hand if table is idle
    if (!this.currentHand) {
      this.checkStartHand();
    } else {
      logger.info('Player joined during active hand - will wait for hand to complete', { 
        playerId: playerId.substring(0, 8), 
        handNumber: this.handNumber 
      });
    }
    
    return { success: true };
  }
  
  /**
   * Leave table
   * If player is in a hand, they fold first then leave
   */
  async leaveTable(playerId: string): Promise<{ success: boolean; error?: string }> {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not at table' };
    }
    
    // If in active hand and not folded, fold first
    if (this.currentHand && !player.isFolded && player.status === 'active') {
      // If it's this player's turn, fold them
      if (this.currentHand.currentPlayerSeat === player.seatNumber) {
        await this.action(playerId, 'fold');
      } else {
        // Mark as folded for this hand
        player.isFolded = true;
      }
      // Mark as sitting out - will be removed after hand
      player.status = 'sitting_out';
      this.emit('player_sitting_out', { playerId, reason: 'leaving' });
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
   * Update player's stack (for rebuy/addon sync)
   */
  updatePlayerStack(playerId: string, newStack: number): boolean {
    const player = this.players.get(playerId);
    if (!player) {
      logger.warn('updatePlayerStack: player not found', { playerId: playerId.substring(0, 8), newStack });
      return false;
    }
    
    const oldStack = player.stack;
    player.stack = newStack;
    
    logger.info('Player stack updated (rebuy/addon)', { 
      playerId: playerId.substring(0, 8), 
      oldStack, 
      newStack 
    });
    
    this.emit('player_stack_updated', { playerId, oldStack, newStack });
    
    return true;
  }

  /**
   * Remove eliminated player from in-memory state (DB already updated)
   * Used after tournament elimination RPC call
   */
  removeEliminatedPlayer(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) {
      logger.warn('removeEliminatedPlayer: player not found', { playerId: playerId.substring(0, 8) });
      return false;
    }
    
    // Clear seat
    if (player.seatNumber >= 0 && player.seatNumber < this.seats.length) {
      this.seats[player.seatNumber] = null;
    }
    
    // Remove from players map
    this.players.delete(playerId);
    
    logger.info('Eliminated player removed from in-memory table', { 
      playerId: playerId.substring(0, 8),
      tableId: this.id
    });
    
    this.emit('player_eliminated_removed', { playerId });
    
    return true;
  }

  /**
   * Sit out - player will auto-fold when it's their turn
   */
  async sitOut(playerId: string): Promise<{ success: boolean; error?: string }> {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not at table' };
    }
    
    if (player.status === 'sitting_out') {
      return { success: false, error: 'Already sitting out' };
    }
    
    player.status = 'sitting_out';
    logger.info('Player sitting out', { playerId: playerId.substring(0, 8) });
    
    // Update database
    await this.supabase
      .from('poker_table_players')
      .update({ status: 'sitting_out' })
      .eq('table_id', this.id)
      .eq('player_id', playerId);
    
    this.emit('player_sitting_out', { playerId, reason: 'manual' });
    
    return { success: true };
  }

  /**
   * Sit in - return to active play
   */
  async sitIn(playerId: string): Promise<{ success: boolean; error?: string }> {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not at table' };
    }
    
    if (player.status === 'active') {
      return { success: false, error: 'Already active' };
    }
    
    if (player.stack <= 0) {
      return { success: false, error: 'No chips to play' };
    }
    
    player.status = 'active';
    player.missedTurns = 0; // Reset missed turns counter
    logger.info('Player sitting in', { playerId: playerId.substring(0, 8) });
    
    // Update database
    await this.supabase
      .from('poker_table_players')
      .update({ status: 'active' })
      .eq('table_id', this.id)
      .eq('player_id', playerId);
    
    this.emit('player_sitting_in', { playerId });
    
    // Check if we can start a hand now
    if (!this.currentHand) {
      this.checkStartHand();
    }
    
    return { success: true };
  }
  
  // ==========================================
  // DISCONNECT / RECONNECT HANDLING
  // Player's seat is preserved for 60 seconds after disconnect
  // ==========================================
  
  private disconnectedPlayers: Map<string, { 
    disconnectedAt: number; 
    seatNumber: number;
    stack: number;
    holeCards: string[];
    currentBet: number;
    isFolded: boolean;
    isAllIn: boolean;
    wasInHand: boolean;
  }> = new Map();
  
  private readonly RECONNECT_WINDOW_MS = 60000; // 60 seconds to reconnect
  
  /**
   * Mark player as disconnected - preserve seat for reconnect
   * Called when WebSocket connection closes
   */
  markPlayerDisconnected(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) {
      logger.warn('Cannot mark disconnect - player not found', { playerId: playerId.substring(0, 8) });
      return;
    }
    
    // Save player state for reconnection
    this.disconnectedPlayers.set(playerId, {
      disconnectedAt: Date.now(),
      seatNumber: player.seatNumber,
      stack: player.stack,
      holeCards: [...player.holeCards],
      currentBet: player.currentBet,
      isFolded: player.isFolded,
      isAllIn: player.isAllIn,
      wasInHand: !!this.currentHand && !player.isFolded
    });
    
    // Mark as disconnected (NOT sitting_out - different status)
    player.status = 'disconnected';
    
    logger.info('Player marked as disconnected', {
      playerId: playerId.substring(0, 8),
      seatNumber: player.seatNumber,
      wasInHand: !!this.currentHand && !player.isFolded,
      reconnectWindowMs: this.RECONNECT_WINDOW_MS
    });
    
    // Emit event so other players see disconnected status
    this.emit('player_disconnected', { 
      playerId, 
      seatNumber: player.seatNumber,
      reconnectWindowSeconds: this.RECONNECT_WINDOW_MS / 1000
    });
    
    // Set timeout to auto-fold/remove if player doesn't reconnect
    setTimeout(() => {
      this.checkDisconnectTimeout(playerId);
    }, this.RECONNECT_WINDOW_MS);
  }
  
  /**
   * Restore a disconnected player when they reconnect
   * Returns true if successfully restored
   */
  restoreDisconnectedPlayer(playerId: string): boolean {
    const player = this.players.get(playerId);
    const disconnectInfo = this.disconnectedPlayers.get(playerId);
    
    // Check if player still has a seat
    if (!player) {
      logger.warn('Cannot restore - player not at table', { playerId: playerId.substring(0, 8) });
      return false;
    }
    
    // Check if we're within reconnect window
    if (disconnectInfo) {
      const elapsed = Date.now() - disconnectInfo.disconnectedAt;
      if (elapsed > this.RECONNECT_WINDOW_MS) {
        logger.warn('Reconnect window expired', { 
          playerId: playerId.substring(0, 8), 
          elapsedMs: elapsed 
        });
        return false;
      }
    }
    
    // Restore player status
    player.status = 'active';
    player.missedTurns = 0;
    
    // Clean up disconnect tracking
    this.disconnectedPlayers.delete(playerId);
    
    logger.info('Player restored from disconnect', {
      playerId: playerId.substring(0, 8),
      seatNumber: player.seatNumber,
      stack: player.stack,
      inHand: !!this.currentHand && !player.isFolded
    });
    
    // Emit reconnect event
    this.emit('player_reconnected', { 
      playerId, 
      seatNumber: player.seatNumber,
      stack: player.stack
    });
    
    return true;
  }
  
  /**
   * Check if disconnected player should be auto-folded/removed
   * Called after RECONNECT_WINDOW_MS timeout
   */
  private checkDisconnectTimeout(playerId: string): void {
    const disconnectInfo = this.disconnectedPlayers.get(playerId);
    const player = this.players.get(playerId);
    
    // Player already reconnected or left
    if (!disconnectInfo || !player || player.status !== 'disconnected') {
      return;
    }
    
    logger.info('Disconnect timeout - handling abandoned player', {
      playerId: playerId.substring(0, 8),
      wasInHand: disconnectInfo.wasInHand
    });
    
    // If in active hand, fold them
    if (this.currentHand && !player.isFolded) {
      player.isFolded = true;
      this.emit('player_folded', { 
        playerId, 
        reason: 'disconnect_timeout',
        seatNumber: player.seatNumber
      });
      
      // If it was their turn, advance to next player
      if (this.currentHand.currentPlayerSeat === player.seatNumber) {
        this.advanceToNextPlayer();
      }
    }
    
    // Mark as sitting out (not removed from table yet)
    player.status = 'sitting_out';
    player.missedTurns = 3; // Mark as if they missed 3 turns
    
    // Update database
    this.supabase
      .from('poker_table_players')
      .update({ status: 'sitting_out' })
      .eq('table_id', this.id)
      .eq('player_id', playerId)
      .then(() => {});
    
    // Clean up disconnect tracking
    this.disconnectedPlayers.delete(playerId);
    
    this.emit('player_sitting_out', { 
      playerId, 
      reason: 'disconnect_timeout' 
    });
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
    
    // Reset missed turns counter on successful action (player is active)
    player.missedTurns = 0;
    
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
    
    // PROFESSIONAL TIMING: Add delay after action for visual feedback (pot/bet animation)
    const afterActionDelay = PROFESSIONAL_TIMINGS.afterAction;
    
    // Check if hand is complete
    if (result.handComplete && result.winners) {
      logger.info('Hand complete - distributing winnings', { 
        winners: result.winners,
        pot: this.currentHand?.pot
      });
      
      // Delay before showing showdown result
      await this.delay(afterActionDelay);
      await this.completeHand(result.winners);
      
    } else if (result.phaseAdvanced && this.currentHand) {
      // PROFESSIONAL TIMING: Phase transition with delays
      const newPhase = this.currentHand.phase as 'flop' | 'turn' | 'river' | 'showdown';
      const phaseDelay = calculatePhaseDelay(newPhase);
      
      logger.info('Phase advancing with professional delay', {
        newPhase,
        delayMs: afterActionDelay + phaseDelay,
        communityCardsCount: this.currentHand.communityCards.length,
        isAllInRunout: result.isAllInRunout
      });
      
      // PROFESSIONAL: Collect bets with positions for animation
      const betPositions: { seatNumber: number; amount: number }[] = [];
      for (const player of this.players.values()) {
        if (player.currentBet > 0) {
          betPositions.push({
            seatNumber: player.seatNumber,
            amount: player.currentBet
          });
        }
      }
      
      // Emit enhanced bets_collected with positions
      this.emit('bets_collected', {
        pot: this.currentHand.pot,
        phase: newPhase,
        betPositions,
        collectionDelay: this.timings.betCollection.slideToCenter,
        staggerDelay: this.timings.betCollection.staggerPerPlayer
      });
      
      // POKERSTARS TIMING: Wait for chip collection animation to COMPLETE on client
      const collectionTime = calculateBetCollectionDelay(betPositions.length, this.timings);
      await this.delay(collectionTime);
      
      // POKERSTARS TIMING: Additional pause AFTER bets collected, BEFORE dealing cards
      // This creates the natural "settle" moment players expect
      const postCollectPause = 400; // 400ms pause for bets to visually settle in pot
      await this.delay(postCollectPause);
      
      // Emit phase change with dealing delay for client animation
      // IMPORTANT: Include handId for animation uniqueness
      this.emit('phase_change', {
        handId: this.currentHand.id, // Unique hand identifier
        phase: newPhase,
        communityCards: this.currentHand.communityCards,
        pot: this.currentHand.pot,
        dealDelay: this.timings.phases[newPhase]?.perCardDelay || 120,
        preDealDelay: this.timings.phases[newPhase]?.preDealDelay || 300,
        postDealDelay: this.timings.phases[newPhase]?.postDealDelay || 200,
        isAllInRunout: result.isAllInRunout || false
      });
      
      // POKERSTARS TIMING: Wait for cards to be dealt visually before starting next action timer
      await this.delay(phaseDelay);
      
      // Now emit state update after cards are visually dealt
      // POKERSTARS: Include handId for animation uniqueness
      this.emit('state_update', {
        handId: this.currentHand.id,
        pot: this.currentHand.pot,
        currentBet: 0, // Bets reset after phase
        currentPlayerSeat: this.currentHand.currentPlayerSeat,
        phase: newPhase
      });
      
      // PROFESSIONAL ALL-IN RUNOUT: Handle remaining phases with delays
      if (result.isAllInRunout && this.currentHand) {
        logger.info('=== ALL-IN RUNOUT: Dealing remaining cards with delays ===', {
          currentPhase: newPhase
        });
        
        await this.handleAllInRunout();
        return { success: true, nextState: this.getPublicState() };
      }
      
      // Normal state update without phase change - minimal delay
      await this.delay(Math.min(afterActionDelay, 200));
      
      // POKERSTARS: Include handId for animation uniqueness
      this.emit('state_update', {
        handId: this.currentHand?.id,
        pot: this.currentHand?.pot || 0,
        currentBet: this.currentHand?.currentBet || 0,
        currentPlayerSeat: this.currentHand?.currentPlayerSeat,
        phase: this.currentHand?.phase || 'preflop'
      });
      
      // Check if engine has marked all-in runout (can happen when no one could act this round)
      const engineState = this.engine.getState();
      if (engineState?.isAllInRunout && this.currentHand) {
        logger.info('=== ALL-IN RUNOUT detected (no phase advance): Dealing remaining cards ===');
        await this.handleAllInRunout();
        return { success: true, nextState: this.getPublicState() };
      }
    }
    
    // Start timer for next player
    if (!result.handComplete && this.currentHand?.currentPlayerSeat !== null) {
      this.startActionTimer();
    }
    
    return { success: true, nextState: this.getPublicState() };
  }
  
  /**
   * PROFESSIONAL: Handle all-in runout with delays between phases
   * Deals remaining community cards one phase at a time with proper animations
   */
  private async handleAllInRunout(): Promise<void> {
    if (!this.currentHand) return;
    
    const phaseOrder = ['preflop', 'flop', 'turn', 'river', 'showdown'] as const;
    let currentPhaseIndex = phaseOrder.indexOf(this.currentHand.phase as typeof phaseOrder[number]);
    
    logger.info('All-in runout starting', {
      currentPhase: this.currentHand.phase,
      currentPhaseIndex,
      communityCards: this.currentHand.communityCards.length
    });
    
    // CRITICAL: Safety check - if already at showdown or invalid phase, just complete
    if (currentPhaseIndex < 0 || currentPhaseIndex >= phaseOrder.length - 1) {
      logger.info('All-in runout: already at or past showdown, completing hand');
      const engineState = this.engine.getState();
      if (engineState?.winners && engineState.winners.length > 0) {
        await this.completeHand(engineState.winners);
      } else {
        // Force determine winners if not already done
        const winners = (this.engine as any).determineWinners?.() || [];
        if (winners.length > 0) {
          await this.completeHand(winners);
        }
      }
      return;
    }
    
    // CRITICAL: Track iterations to prevent infinite loops
    let iterations = 0;
    const maxIterations = 5; // preflop -> flop -> turn -> river -> showdown = max 4 transitions
    
    // Deal remaining phases with delays
    while (currentPhaseIndex < phaseOrder.length - 1 && iterations < maxIterations) {
      iterations++;
      
      // Add delay between phases (like PokerStars all-in runout)
      await this.delay(800); // 800ms pause between cards
      
      // Advance to next phase via engine
      const advanceResult = this.engine.advanceToNextPhase();
      
      // CRITICAL: Safety check - ensure we actually advanced
      const newPhase = advanceResult.phase as typeof phaseOrder[number];
      const newPhaseIndex = phaseOrder.indexOf(newPhase);
      
      if (newPhaseIndex <= currentPhaseIndex && !advanceResult.isComplete) {
        logger.error('All-in runout: phase did not advance! Breaking to prevent infinite loop', {
          expectedNextPhase: phaseOrder[currentPhaseIndex + 1],
          actualPhase: newPhase,
          iteration: iterations
        });
        break;
      }
      
      // Sync state from engine
      this.currentHand.phase = this.mapPhase(advanceResult.phase);
      this.currentHand.communityCards = advanceResult.communityCards;
      currentPhaseIndex = newPhaseIndex;
      
      logger.info('All-in runout: dealt phase', {
        phase: newPhase,
        communityCards: advanceResult.communityCards.length,
        iteration: iterations
      });
      
      // Emit phase change for animation with handId for uniqueness
      this.emit('phase_change', {
        handId: this.currentHand.id, // Unique hand identifier
        phase: newPhase,
        communityCards: this.currentHand.communityCards,
        pot: this.currentHand.pot,
        isAllInRunout: true,
        dealDelay: this.timings.phases[newPhase as 'flop' | 'turn' | 'river' | 'showdown']?.perCardDelay || 120,
        preDealDelay: 200, // Shorter pre-delay for runout
        postDealDelay: 100
      });
      
      // POKERSTARS TIMING: Wait for card animation in all-in runout
      await this.delay(calculatePhaseDelay(newPhase as 'flop' | 'turn' | 'river' | 'showdown', this.timings));
      
      // Check if we reached showdown
      if (advanceResult.isComplete && advanceResult.winners) {
        logger.info('All-in runout complete - showdown', {
          winnersCount: advanceResult.winners.length
        });
        await this.completeHand(advanceResult.winners);
        return;
      }
    }
    
    // Fallback: if loop exited without completing, force completion
    if (this.currentHand) {
      logger.warn('All-in runout ended without completion - forcing hand complete');
      const engineState = this.engine.getState();
      if (engineState?.winners && engineState.winners.length > 0) {
        await this.completeHand(engineState.winners);
      }
    }
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
   * Bot detection: keep it consistent across the table code.
   * We intentionally treat bots as "no time bank" and let them act quickly.
   */
  private isBotName(name: unknown): boolean {
    return typeof name === 'string' && name.toLowerCase().includes('bot');
  }

  private isBotPlayer(player: Player | null | undefined): boolean {
    return this.isBotName(player?.name);
  }

  /**
   * Calculate human-like thinking time for bots
   * Varies based on game phase, stack size, and decision complexity
   */
  private calculateBotThinkTime(player: Player): number {
    if (!this.currentHand) return 1500;
    
    const phase = this.currentHand.phase;
    const callAmount = Math.max(0, this.currentHand.currentBet - player.currentBet);
    const potSize = this.currentHand.pot;
    const stack = player.stack;
    
    // Base think time varies by phase (preflop is faster, river slower)
    let baseTime: number;
    switch (phase) {
      case 'preflop':
        baseTime = 1200 + Math.random() * 1500; // 1.2-2.7s
        break;
      case 'flop':
        baseTime = 1500 + Math.random() * 2000; // 1.5-3.5s
        break;
      case 'turn':
        baseTime = 1800 + Math.random() * 2500; // 1.8-4.3s
        break;
      case 'river':
        baseTime = 2000 + Math.random() * 3000; // 2.0-5.0s
        break;
      default:
        baseTime = 1500;
    }
    
    // Add time for big decisions (facing large bets)
    if (callAmount > 0) {
      const potOddsPressure = callAmount / Math.max(potSize, 1);
      if (potOddsPressure > 0.5) {
        baseTime += 800 + Math.random() * 1200; // Big decision
      } else if (potOddsPressure > 0.25) {
        baseTime += 400 + Math.random() * 800; // Medium decision
      }
    }
    
    // All-in decisions take longer
    if (callAmount >= stack * 0.5) {
      baseTime += 1000 + Math.random() * 1500;
    }
    
    // Add random personality variation per bot
    const personalityFactor = 0.7 + (getBotAggression(player.name) / 100) * 0.6; // 0.7-1.3x
    baseTime *= personalityFactor;
    
    // Clamp between 1-6 seconds
    return Math.min(6000, Math.max(1000, Math.floor(baseTime)));
  }

  /**
   * Execute professional bot AI decision
   */
  private async executeBotDecision(player: Player): Promise<void> {
    if (!this.currentHand) return;

    const aggression = getBotAggression(player.name);
    
    // Count active players in hand
    const playersInHand = Array.from(this.players.values()).filter(
      p => !p.isFolded && p.status === 'active'
    ).length;

    // Make AI decision - pass bot name for personality-based decisions
    const decision = makeBotDecision(
      player.holeCards,
      this.currentHand.communityCards,
      this.currentHand.pot,
      this.currentHand.currentBet,
      player.currentBet,
      player.stack,
      this.currentHand.phase,
      player.seatNumber,
      this.currentHand.dealerSeat,
      this.config.maxPlayers,
      playersInHand,
      this.config.bigBlind,
      aggression,
      player.name, // Pass bot name for personality
      this.currentHand.bigBlindSeat // Pass actual BB seat
    );

    const isBigBlind = player.seatNumber === this.currentHand.bigBlindSeat;
    const canCheck = Math.max(0, this.currentHand.currentBet - player.currentBet) === 0;

    logger.info('Bot AI decision', {
      tableId: this.id,
      playerId: player.id.substring(0, 8),
      name: player.name,
      seatNumber: player.seatNumber,
      isBigBlind,
      bigBlindSeat: this.currentHand.bigBlindSeat,
      holeCards: player.holeCards,
      phase: this.currentHand.phase,
      pot: this.currentHand.pot,
      currentBet: this.currentHand.currentBet,
      playerBet: player.currentBet,
      canCheck,
      stack: player.stack,
      action: decision.action,
      amount: decision.amount,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
      aggression
    });

    // Execute the decision
    try {
      if (decision.action === 'allin') {
        await this.action(player.id, 'allin');
      } else if (decision.action === 'raise' && decision.amount) {
        await this.action(player.id, 'raise', decision.amount);
      } else {
        await this.action(player.id, decision.action);
      }
    } catch (err) {
      // Fallback: if action fails, try simpler actions
      logger.warn('Bot action failed, trying fallback', {
        playerId: player.id.substring(0, 8),
        action: decision.action,
        error: err instanceof Error ? err.message : 'unknown'
      });
      
      const callAmount = Math.max(0, this.currentHand.currentBet - player.currentBet);
      const canCheck = callAmount === 0;
      const fallbackAction = canCheck ? 'check' : (callAmount <= player.stack ? 'call' : 'fold');
      
      await this.action(player.id, fallbackAction);
    }
  }

  /**
   * Start action timer
   */
  private startActionTimer(): void {
    if (this.currentHand) {
      this.currentHand.actionStartTime = Date.now();
    }

    // Always clear any existing timer before starting a new one
    this.clearActionTimer();

    const seat = this.currentHand?.currentPlayerSeat ?? null;
    const playerId = seat !== null ? this.seats[seat] : null;

    if (seat === null || !playerId) return;

    const player = this.players.get(playerId) ?? null;

    // Avoid "30s stalls" if the seat is known but player state isn't loaded yet.
    // We'll retry soon and schedule the correct (bot vs human) delay once we have the player.
    if (!player) {
      logger.warn('startActionTimer: player state missing, retrying soon', {
        tableId: this.id,
        playerId: playerId.substring(0, 8),
        seat
      });

      this.actionTimer = setTimeout(() => this.startActionTimer(), 500);
      return;
    }

    const isBot = this.isBotPlayer(player);

    // Calculate bot think time - varies by situation to seem more human
    let delayMs: number;
    if (isBot) {
      delayMs = this.calculateBotThinkTime(player);
      
      logger.info('Bot turn scheduled', {
        tableId: this.id,
        playerId: playerId.substring(0, 8),
        seat,
        name: player.name,
        delayMs
      });
      
      // CRITICAL: For bots, execute their decision after think delay (not timeout)
      this.actionTimer = setTimeout(async () => {
        await this.executeBotDecision(player);
      }, delayMs);
    } else {
      delayMs = this.config.actionTimeSeconds * 1000;
      
      // For humans, use standard timeout
      this.actionTimer = setTimeout(() => {
        this.handleTimeout();
      }, delayMs);
    }
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
   * After 2 consecutive timeouts, player is set to sitting_out
   */
  private async handleTimeout(): Promise<void> {
    if (!this.currentHand || this.currentHand.currentPlayerSeat === null) return;

    const seat = this.currentHand.currentPlayerSeat;
    const playerId = this.seats[seat];
    if (!playerId) return;

    const player = this.players.get(playerId) ?? null;

    // If we somehow have a seat mapping but no player state yet, retry soon.
    // This prevents tables from "freezing" at the start of a hand.
    if (!player) {
      logger.warn('handleTimeout: missing player state, retrying', {
        tableId: this.id,
        playerId: playerId.substring(0, 8),
        seat
      });
      this.startActionTimer();
      return;
    }

    const isBot = this.isBotPlayer(player);

    // Bots: use professional AI to make decisions
    if (isBot) {
      await this.executeBotDecision(player);
      return;
    }

    logger.info('Player timed out', { playerId, missedTurns: player.missedTurns });

    // Use time bank if available
    if (player.timeBank > 0) {
      player.timeBank -= this.config.actionTimeSeconds;
      this.emit('time_bank_used', { playerId, remaining: player.timeBank });
      this.startActionTimer();
      return;
    }

    // Increment missed turns counter
    player.missedTurns++;

    // Auto fold/check - PROFESSIONAL: prefer check when possible
    const canCheck = player.currentBet >= this.currentHand.currentBet;
    const autoAction = canCheck ? 'check' : 'fold';

    logger.warn('Player auto-action due to timeout', {
      playerId: playerId.substring(0, 8),
      action: autoAction,
      timeBankRemaining: player.timeBank,
      missedTurns: player.missedTurns
    });

    await this.action(playerId, autoAction);

    // After 2 consecutive missed turns, set player to sitting_out
    if (player.missedTurns >= 2) {
      logger.info('Player auto sitting out after 2 missed turns', {
        playerId: playerId.substring(0, 8),
        missedTurns: player.missedTurns
      });
      player.status = 'sitting_out';
      this.emit('player_sitting_out', {
        playerId,
        reason: 'missed_turns',
        missedTurns: player.missedTurns
      });
    }

    this.emit('timeout', { playerId, action: autoAction, missedTurns: player.missedTurns });
  }
  
  /**
   * Check if hand should start
   * CRITICAL: Uses pendingHandStart flag to prevent race conditions
   * CRITICAL: Also checks if tournament is on break - no new hands during break
   */
  private checkStartHand(): void {
    logger.info('checkStartHand called', { 
      tableId: this.id, 
      hasCurrentHand: !!this.currentHand,
      pendingHandStart: this.pendingHandStart,
      totalPlayers: this.players.size
    });
    
    // CRITICAL: Prevent concurrent hand starts
    if (this.currentHand) {
      logger.info('checkStartHand: hand already in progress');
      return;
    }
    
    if (this.pendingHandStart) {
      logger.info('checkStartHand: hand start already pending, skipping');
      return;
    }
    
    const allPlayers = Array.from(this.players.values());
    const activePlayers = allPlayers.filter(p => p.status === 'active' && p.stack > 0);
    
    logger.info('checkStartHand: player status check', {
      allPlayers: allPlayers.map(p => ({ id: p.id.substring(0, 8), status: p.status, stack: p.stack })),
      activeCount: activePlayers.length
    });
    
     if (activePlayers.length >= 2) {
       // CRITICAL: Check if this is a tournament table on break
       this.pendingHandStart = true;
       
       void this.checkTournamentBreakAndStart()
         .catch((err) => {
           logger.error('checkTournamentBreakAndStart rejected', { tableId: this.id, error: String(err) });
         })
         .finally(() => {
           this.pendingHandStart = false;
           logger.info('checkStartHand: pending cleared', { tableId: this.id });
         });
     } else {
       logger.info('checkStartHand: not enough players', { need: 2, have: activePlayers.length });
     }
  }
  
  /**
   * Check if tournament is on break before starting hand
   * If on break, retry after 10 seconds
   */
  private async checkTournamentBreakAndStart(): Promise<void> {
    try {
      // Check if this is a tournament table AND if table itself is on break
      const { data: tableData, error: tableError } = await this.supabase
        .from('poker_tables')
        .select('tournament_id, table_type, status')
        .eq('id', this.id)
        .single();

      if (tableError) {
        throw tableError;
      }

      // PROFESSIONAL TIMING: Check table status first - if table is on break, don't start
      if (tableData?.status === 'break') {
        logger.info('checkStartHand: table is on BREAK status - delaying hand start', {
          tableId: this.id,
          tableStatus: tableData.status
        });

        // Emit break event to notify players
        this.emit('tournament_break', {
          tableId: this.id,
          message: 'Перерыв. Раздачи возобновятся автоматически.'
        });

        // Retry after 5 seconds (faster polling for break end)
        setTimeout(() => {
          if (!this.currentHand) {
            this.checkStartHand();
          }
        }, 5000);
        return;
      }

      if (tableData?.table_type === 'tournament' && tableData?.tournament_id) {
        // Check tournament status + current level
        const { data: tournament, error: tournamentError } = await this.supabase
          .from('online_poker_tournaments')
          .select('status, name, current_level')
          .eq('id', tableData.tournament_id)
          .single();

        if (tournamentError) {
          throw tournamentError;
        }

        // Extra safety: treat current level marked as break as a break (even if status is wrong)
        let isBreakLevel = false;
        if (tournament?.current_level) {
          const { data: levelRow } = await this.supabase
            .from('online_poker_tournament_levels')
            .select('is_break')
            .eq('tournament_id', tableData.tournament_id)
            .eq('level', tournament.current_level)
            .single();
          isBreakLevel = levelRow?.is_break === true;
        }

        const isTournamentBreak = tournament?.status === 'break' || isBreakLevel;

        if (isTournamentBreak) {
          logger.info('checkStartHand: tournament is on BREAK - delaying hand start', {
            tableId: this.id,
            tournamentId: tableData.tournament_id,
            tournamentName: tournament?.name
          });

          // Emit break event to notify players
          this.emit('tournament_break', {
            tournamentId: tableData.tournament_id,
            tournamentName: tournament?.name,
            message: 'Турнир на перерыве. Раздачи возобновятся после перерыва.'
          });

          // Retry after 5 seconds (faster polling)
          setTimeout(() => {
            if (!this.currentHand) {
              this.checkStartHand();
            }
          }, 5000);
          return;
        }
      }

      // Not a tournament or not on break - start hand
      const BUILD_TAG = process.env.BUILD_TAG || 'lovable-build-2026-01-04-pro-timings';
      logger.info('checkStartHand: starting hand immediately', { build: BUILD_TAG });

      await this.startHand();
    } catch (err) {
      logger.error('Error checking tournament break status - delaying hand start', { tableId: this.id, error: String(err) });
      // Safer behavior: if we can't verify tournament state, do NOT start a new hand.
      setTimeout(() => {
        if (!this.currentHand) {
          this.checkStartHand();
        }
      }, 10000);
    }
  }
  
  /**
   * Start a new hand using Engine v3.0
   * PROFESSIONAL: Full error handling with graceful recovery
   */
  async startHand(): Promise<void> {
    // CRITICAL: Safety check - don't start if hand already in progress
    if (this.currentHand) {
      logger.warn('startHand called but hand already in progress - ignoring', {
        handNumber: this.handNumber,
        phase: this.currentHand.phase
      });
      return;
    }
    
    try {
      this.handNumber++;
      
      // NOTE: Do NOT move dealer button here!
      // The engine's calculatePositions() handles dealer rotation internally
      // Passing current dealerSeat and engine will find next active dealer
      const previousDealerSeat = this.dealerSeat;
      
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
        isDealer: false // Engine will calculate dealer position
      }));
      
      // Start new hand with engine v3 (may throw if validation fails)
      // Pass PREVIOUS dealer seat - engine will calculate next dealer
      const engineState = this.engine.startNewHand(enginePlayers, previousDealerSeat);
      
      // Update local dealerSeat from engine calculation
      this.dealerSeat = engineState.dealerSeat;
      
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
      
      // CRITICAL: Emit hand_started with hole cards for each player
      // Cards are sent player-specific via getPlayerState() in WebSocket handler
      this.emit('hand_started', {
        handId: this.currentHand.id,
        handNumber: this.handNumber,
        dealerSeat: this.dealerSeat,
        smallBlindSeat: this.currentHand.smallBlindSeat,
        bigBlindSeat: this.currentHand.bigBlindSeat,
        pot: this.currentHand.pot,
        currentBet: this.currentHand.currentBet,
        currentPlayerSeat: this.currentHand.currentPlayerSeat,
        phase: 'preflop',
        players: activePlayers.map(p => ({
          id: p.id,
          name: p.name,
          seatNumber: p.seatNumber,
          stack: p.stack,
          currentBet: p.currentBet,
          // IMPORTANT: holeCards are sent via getPlayerState() - each player sees only their own
          hasCards: p.holeCards.length > 0
        }))
      });
      
      // Also emit cards_dealt event with individual cards for each subscribed player
      // This will be handled by WebSocket to send personalized card data
      logger.info('Hand started - cards dealt', {
        tableId: this.id,
        handNumber: this.handNumber,
        playersWithCards: activePlayers.filter(p => p.holeCards.length > 0).map(p => ({
          id: p.id.substring(0, 8),
          cardCount: p.holeCards.length
        }))
      });
      
      // CRITICAL: Save hand to database at START (not just at completion)
      // This ensures current_hand_id always points to existing record
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
          current_bet: this.currentHand.currentBet,
          current_player_seat: this.currentHand.currentPlayerSeat,
          action_started_at: new Date().toISOString()
          // completed_at is NULL - hand is in progress
        });
        
        // Also update poker_tables.current_hand_id
        await this.supabase
          .from('poker_tables')
          .update({
            current_hand_id: this.currentHand.id,
            status: 'playing',
            updated_at: new Date().toISOString()
          })
          .eq('id', this.id);
          
        logger.info('Hand saved to database at start', {
          tableId: this.id,
          handId: this.currentHand.id
        });
      } catch (dbErr) {
        logger.warn('Failed to save hand at start (continuing anyway)', { error: String(dbErr) });
      }
      
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
    // POKERSTARS FIX: Store actual winners for saveHandHistory
    this.setLastHandWinners(winners);
    
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
    
    // Get showdown data including all players' cards
    const isShowdown = this.currentHand?.phase === 'showdown' || 
                       (winners.length > 0 && winners[0].handName !== 'Last Standing');
    
    // Build showdown players with hole cards revealed
    const showdownPlayers: Array<{
      playerId: string;
      name: string;
      seatNumber: number;
      holeCards: string[];
      isFolded: boolean;
      handName?: string;
      bestCards?: string[];
    }> = [];
    
    const engineState = this.engine.getState();
    
    // DEBUG: Log engine state for showdown debugging
    logger.info('=== SHOWDOWN DATA DEBUG ===', {
      isShowdown,
      engineStateExists: !!engineState,
      enginePlayersCount: engineState?.players?.length || 0,
      winnersHandName: winners[0]?.handName,
      currentPhase: this.currentHand?.phase,
      communityCardsCount: this.currentHand?.communityCards?.length || 0
    });
    
    if (engineState) {
      // Log all engine players for debugging
      for (const ep of engineState.players) {
        logger.info('Engine player state:', {
          playerId: ep.id.substring(0, 8),
          seatNumber: ep.seatNumber,
          isFolded: ep.isFolded,
          holeCardsLength: ep.holeCards?.length || 0,
          holeCards: ep.holeCards || []
        });
      }
    }
    
    // Build showdownPlayers if we have actual showdown or multiple non-folded players
    // CRITICAL: Use this.players for hole cards as engine might have cleared them
    const nonFoldedTablePlayers = Array.from(this.players.values()).filter(p => !p.isFolded);
    const hasMultiplePlayersAtEnd = nonFoldedTablePlayers.length > 1;
    
    logger.info('Showdown eligibility check:', {
      isShowdown,
      hasMultiplePlayersAtEnd,
      nonFoldedCount: nonFoldedTablePlayers.length,
      tablePlayers: nonFoldedTablePlayers.map(p => ({
        id: p.id.substring(0, 8),
        holeCardsLength: p.holeCards?.length || 0
      }))
    });
    
    // Include players if it's a real showdown OR if there are multiple non-folded players
    if (isShowdown || hasMultiplePlayersAtEnd) {
      for (const tablePlayer of nonFoldedTablePlayers) {
        // CRITICAL: Get hole cards from this.players, NOT from engine
        const holeCards = tablePlayer.holeCards || [];
        
        if (holeCards.length >= 2) {
          const winnerInfo = winners.find(w => w.playerId === tablePlayer.id);
          
          // Evaluate hand for non-winners too
          let handName = winnerInfo?.handName;
          let bestCards: string[] = [];
          
          if (this.currentHand?.communityCards && this.currentHand.communityCards.length >= 3) {
            try {
              const result = evaluateHand(holeCards, this.currentHand.communityCards);
              handName = handName || result.handName;
              bestCards = result.bestCards || [];
            } catch (e) {
              logger.warn('evaluateHand failed:', { playerId: tablePlayer.id.substring(0,8), error: String(e) });
              handName = handName || undefined;
              bestCards = [];
            }
          }
          
          showdownPlayers.push({
            playerId: tablePlayer.id,
            name: tablePlayer.name || 'Unknown',
            seatNumber: tablePlayer.seatNumber,
            holeCards: holeCards,
            isFolded: tablePlayer.isFolded,
            handName: handName,
            bestCards: bestCards
          });
          
          logger.info('Added to showdownPlayers:', {
            playerId: tablePlayer.id.substring(0, 8),
            seatNumber: tablePlayer.seatNumber,
            holeCards: holeCards,
            handName
          });
        } else {
          logger.warn('Player has no hole cards for showdown:', {
            playerId: tablePlayer.id.substring(0, 8),
            holeCardsLength: holeCards.length
          });
        }
      }
    }
    
    // PROFESSIONAL: Sequential showdown reveal with timing
    if (isShowdown && showdownPlayers.length > 0) {
      // Emit showdown_reveal for each player sequentially with delay info
      this.emit('showdown_start', {
        handNumber: this.handNumber,
        playerCount: showdownPlayers.length,
        totalRevealTime: showdownPlayers.length * this.timings.showdown.perPlayerReveal,
        communityCards: this.currentHand?.communityCards
      });
      
      // Emit each player reveal with staggered timing
      for (let i = 0; i < showdownPlayers.length; i++) {
        const sp = showdownPlayers[i];
        this.emit('showdown_reveal', {
          playerId: sp.playerId,
          playerName: sp.name,
          seatNumber: sp.seatNumber,
          holeCards: sp.holeCards,
          handName: sp.handName,
          bestCards: sp.bestCards,
          revealIndex: i,
          revealDelay: i * this.timings.showdown.perPlayerReveal,
          isWinner: winners.some(w => w.playerId === sp.playerId)
        });
      }
      
      // Wait for all reveals
      await this.delay(showdownPlayers.length * this.timings.showdown.perPlayerReveal);
    }
    
    // Log what we're about to send
    logger.info('=== EMITTING hand_complete EVENT ===', {
      tableId: this.id,
      handNumber: this.handNumber,
      isShowdown,
      showdownPlayersCount: showdownPlayers.length,
      showdownPlayers: showdownPlayers.map(sp => ({
        playerId: sp.playerId.substring(0, 8),
        seatNumber: sp.seatNumber,
        holeCards: sp.holeCards,
        handName: sp.handName
      })),
      winnersCount: winners.length,
      pot: this.currentHand?.pot,
      communityCards: this.currentHand?.communityCards
    });
    
    // PROFESSIONAL: Winner announcement with pot slide animation
    const winnerAnnouncements = winners.map(w => {
      const player = this.players.get(w.playerId);
      return {
        playerId: w.playerId,
        playerName: player?.name || 'Unknown',
        seatNumber: player?.seatNumber ?? 0,
        amount: w.amount,
        handName: w.handName,
        newStack: player?.stack || 0
      };
    });
    
    this.emit('winner_announcement', {
      handNumber: this.handNumber,
      winners: winnerAnnouncements,
      pot: this.currentHand?.pot,
      isSplitPot: winners.length > 1,
      potSlideDelay: this.timings.showdown.potSlideToWinner,
      highlightDuration: this.timings.showdown.winnerHighlight,
      celebrationDuration: this.timings.showdown.winnerCelebration
    });
    
    // Wait for winner highlight animation
    await this.delay(this.timings.showdown.winnerHighlight);
    
    this.emit('hand_complete', {
      handNumber: this.handNumber,
      winners,
      showdown: isShowdown,
      communityCards: this.currentHand?.communityCards,
      showdownPlayers,
      pot: this.currentHand?.pot
    });
    
    logger.info('=== HAND COMPLETION END ===');
    
    // Save hand history
    await this.saveHandHistory();
    
    // CRITICAL: Check for players with zero chips (tournament elimination candidates)
    // Emit event for each player with stack <= 0 for tournament handling
    const eliminatedPlayers: { playerId: string; seatNumber: number; name: string }[] = [];
    for (const player of this.players.values()) {
      if (player.stack <= 0) {
        eliminatedPlayers.push({
          playerId: player.id,
          seatNumber: player.seatNumber,
          name: player.name
        });
        logger.info('Player eliminated (zero stack)', {
          playerId: player.id.substring(0, 8),
          name: player.name,
          seatNumber: player.seatNumber
        });
      }
    }
    
    // Emit elimination event if any players busted
    if (eliminatedPlayers.length > 0) {
      this.emit('players_eliminated', {
        tableId: this.id,
        players: eliminatedPlayers
      });
    }
    
    // Wait for winner celebration before resetting
    await this.delay(this.timings.showdown.winnerCelebration);
    
    // CRITICAL: Reset all player states for clean slate before next hand
    // This prevents cards/bets from previous hand showing for new players
    for (const player of this.players.values()) {
      player.holeCards = [];
      player.currentBet = 0;
      player.isFolded = false;
      player.isAllIn = false;
    }
    
    this.currentHand = null;
    
    // Emit state update to clear client displays
    // POKERSTARS: handId is null when hand ends
    this.emit('state_update', {
      handId: null,
      pot: 0,
      currentBet: 0,
      currentPlayerSeat: null,
      phase: 'waiting',
      isHandActive: false
    });
    
    // Check for next hand after professional between-hands delay
    setTimeout(() => this.checkStartHand(), this.timings.betweenHands);
  }
  
  /**
   * Save hand history to database
   * FIXED: Now stores actual winners (with amount > 0) instead of all non-folded players
   */
  private lastHandWinners: { playerId: string; amount: number; handName: string }[] = [];
  
  setLastHandWinners(winners: { playerId: string; amount: number; handName: string }[]): void {
    this.lastHandWinners = winners;
  }
  
  private async saveHandHistory(): Promise<void> {
    if (!this.currentHand) return;
    
    try {
      const engineState = this.engine.getState();
      
      // POKERSTARS FIX: Only include ACTUAL winners (those who won chips)
      // Not all non-folded players
      const actualWinners = this.lastHandWinners || [];
      
      // Build winners data with hand evaluations
      const winnersForDb = actualWinners.map(w => {
        const player = this.players.get(w.playerId);
        const holeCards = player?.holeCards || [];
        
        // Evaluate hand for display
        const handResult = engineState?.communityCards && 
          engineState.communityCards.length >= 3 && 
          holeCards.length >= 2
          ? evaluateHand(holeCards, engineState.communityCards)
          : null;
        
        return {
          playerId: w.playerId,
          name: player?.name || 'Unknown',
          holeCards: holeCards,
          stack: player?.stack || 0,
          amount: w.amount,
          handName: w.handName || handResult?.handName,
          handRank: handResult?.handRank,
          bestCards: handResult?.bestCards
        };
      });
      
      // Use upsert since hand was already created at start
      await this.supabase.from('poker_hands').upsert({
        id: this.currentHand.id,
        table_id: this.id,
        hand_number: this.currentHand.handNumber,
        dealer_seat: this.currentHand.dealerSeat,
        small_blind_seat: this.currentHand.smallBlindSeat,
        big_blind_seat: this.currentHand.bigBlindSeat,
        community_cards: this.currentHand.communityCards,
        pot: this.currentHand.pot,
        phase: this.currentHand.phase,
        current_bet: this.currentHand.currentBet,
        current_player_seat: null, // Hand is complete
        completed_at: new Date().toISOString(),
        winners: winnersForDb
      }, { onConflict: 'id' });
      
      // Clear current_hand_id from poker_tables
      await this.supabase
        .from('poker_tables')
        .update({
          current_hand_id: null,
          status: 'waiting',
          current_dealer_seat: this.dealerSeat,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.id);
      
      logger.info('Hand history saved with actual winners', {
        tableId: this.id,
        handId: this.currentHand.id,
        winnersCount: winnersForDb.length,
        winners: winnersForDb.map(w => ({ id: w.playerId.substring(0, 8), amount: w.amount, hand: w.handName }))
      });
      
      // Clear lastHandWinners for next hand
      this.lastHandWinners = [];
      
      // Sync all player stacks to database after each hand
      await this.syncPlayerStacksToDatabase();
    } catch (err) {
      logger.error('Failed to save hand history', { error: String(err) });
    }
  }
  
  /**
   * Sync all player stacks to database after hand completion
   * Updates both poker_table_players and online_poker_tournament_participants
   */
  private async syncPlayerStacksToDatabase(): Promise<void> {
    try {
      // Get tournament_id if this is a tournament table
      const { data: tableData } = await this.supabase
        .from('poker_tables')
        .select('tournament_id, table_type')
        .eq('id', this.id)
        .single();
      
      const isTournament = tableData?.table_type === 'tournament' && tableData?.tournament_id;
      const tournamentId = tableData?.tournament_id;
      
      // Update all player stacks in parallel
      const updates: Promise<any>[] = [];
      
      for (const player of this.players.values()) {
        // Update poker_table_players
        updates.push(
          Promise.resolve(
            this.supabase
              .from('poker_table_players')
              .update({
                stack: player.stack,
                status: player.status,
                last_action_at: new Date().toISOString(),
              })
              .eq('table_id', this.id)
              .eq('player_id', player.id)
          )
        );

        // If tournament, also update participant chips
        if (isTournament && tournamentId) {
          updates.push(
            Promise.resolve(
              this.supabase
                .from('online_poker_tournament_participants')
                .update({ chips: player.stack })
                .eq('tournament_id', tournamentId)
                .eq('player_id', player.id)
            )
          );
        }
      }
      
      await Promise.all(updates);
      
      logger.info('Synced player stacks to database', {
        tableId: this.id,
        playerCount: this.players.size,
        isTournament,
        tournamentId
      });
    } catch (err) {
      logger.error('Failed to sync player stacks', { tableId: this.id, error: String(err) });
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
   * Advance to next player when current player is disconnected/timed out
   * Used after marking player as folded due to disconnect timeout
   */
  private advanceToNextPlayer(): void {
    if (!this.currentHand) return;
    
    const activePlayers = this.getActivePlayersInHand();
    
    // Check if hand should end (only 1 player left)
    if (activePlayers.length <= 1) {
      logger.info('Only one player left after disconnect timeout, ending hand');
      this.endHandWithWinner(activePlayers[0]?.id);
      return;
    }
    
    // Find next player who can act
    const currentSeat = this.currentHand.currentPlayerSeat;
    if (currentSeat === null) return;
    
    let nextSeat = this.getNextActiveSeat(currentSeat);
    let attempts = 0;
    
    while (attempts < this.config.maxPlayers) {
      const playerId = this.seats[nextSeat];
      if (playerId) {
        const player = this.players.get(playerId);
        if (player && !player.isFolded && !player.isAllIn && player.status === 'active') {
          this.currentHand.currentPlayerSeat = nextSeat;
          this.currentHand.actionStartTime = Date.now();
          
          this.emit('turn_changed', {
            currentPlayerSeat: nextSeat,
            playerId,
            phase: this.currentHand.phase
          });
          
          // Start new action timer
          this.startActionTimer();
          return;
        }
      }
      nextSeat = (nextSeat + 1) % this.config.maxPlayers;
      attempts++;
    }
    
    // No one can act - check if we should advance phase or end hand
    logger.info('No active players can act, checking phase transition');
    this.checkPhaseTransition();
  }
  
  /**
   * Get active players still in hand (not folded)
   */
  private getActivePlayersInHand(): Player[] {
    if (!this.currentHand) return [];
    
    return Array.from(this.players.values())
      .filter(p => !p.isFolded && p.holeCards.length > 0);
  }
  
  /**
   * End hand with a winner (when all others folded/disconnected)
   */
  private endHandWithWinner(winnerId?: string): void {
    if (!this.currentHand || !winnerId) return;
    
    const winner = this.players.get(winnerId);
    if (!winner) return;
    
    const pot = this.currentHand.pot;
    winner.stack += pot;
    
    this.emit('hand_complete', {
      winners: [{
        playerId: winnerId,
        name: winner.name,
        seatNumber: winner.seatNumber,
        amount: pot
      }],
      pot,
      reason: 'all_folded'
    });
    
    // Clear hand state
    this.currentHand = null;
    
    // Check for new hand
    setTimeout(() => {
      this.checkStartHand();
    }, 1000);
  }
  
  /**
   * Check if phase should transition (all active players acted)
   */
  private checkPhaseTransition(): void {
    // This will be called if the normal action flow is broken
    // For now, just log and let the normal flow handle it
    logger.info('Phase transition check triggered');
  }
  
  /**
   * Get public table state (visible to all players)
   * CRITICAL: Only show cards when player is actually seated and hand is in progress
   */
  getPublicState(): object {
    // Map players for display - be careful about what we show
    const players = Array.from(this.players.values()).map(p => {
      // CRITICAL: Only mark hasCards=true if there's an ACTIVE hand AND player has cards
      const isInActiveHand = this.currentHand !== null && p.holeCards.length > 0;
      
      return {
        playerId: p.id,
        id: p.id,
        name: p.name,
        avatarUrl: p.avatarUrl || null,
        seatNumber: p.seatNumber,
        stack: p.stack,
        status: p.status,
        betAmount: p.currentBet,
        // POKERSTARS: Remove duplicate currentBet field
        isFolded: p.isFolded,
        isAllIn: p.isAllIn,
        isActive: p.status === 'active',
        isSittingOut: p.status === 'sitting_out',
        missedTurns: p.missedTurns || 0,
        // POKERSTARS: Ensure timeBank is never negative
        timeBankRemaining: Math.max(0, p.timeBank || 0),
        // CRITICAL: hasCards should ONLY be true when in active hand
        hasCards: isInActiveHand && !p.isFolded,
        // POKERSTARS SECURITY: holeCards NEVER sent in public state
        holeCards: []
      };
    });

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
      // Hand state - CRITICAL: only show pot/bet when hand is active
      phase: this.currentHand?.phase || 'waiting',
      pot: this.currentHand ? this.currentHand.pot : 0,
      communityCards: this.currentHand?.communityCards || [],
      currentBet: this.currentHand ? this.currentHand.currentBet : 0,
      dealerSeat: this.currentHand?.dealerSeat ?? this.dealerSeat ?? 0,
      smallBlindSeat: this.currentHand?.smallBlindSeat ?? 0,
      bigBlindSeat: this.currentHand?.bigBlindSeat ?? 1,
      currentPlayerSeat: this.currentHand?.currentPlayerSeat ?? null,
      minRaise: this.currentHand?.minRaise || this.config.bigBlind,
      handNumber: this.currentHand?.handNumber || 0,
      // Countdown info
      playersNeeded: this.getPlayersNeededToStart(),
      // CRITICAL: Explicitly indicate if hand is active for client
      isHandActive: this.currentHand !== null
    };
  }
  
  /**
   * Get player-specific state (includes hole cards)
   * CRITICAL: At showdown, reveal all non-folded players' cards
   */
  getPlayerState(playerId: string): object {
    const publicState = this.getPublicState() as Record<string, unknown>;
    const player = this.players.get(playerId);
    const isShowdown = this.currentHand?.phase === 'showdown';
    
    // Get engine state for hole cards at showdown
    const engineState = this.engine.getState();
    
    // Debug: log player cards
    if (player) {
      logger.info('getPlayerState: returning cards', {
        playerId: playerId.substring(0, 8),
        holeCards: player.holeCards,
        cardCount: player.holeCards?.length || 0,
        phase: this.currentHand?.phase || 'no_hand'
      });
    }
    
    if (!player) {
      // This is a common case for spectators or users who opened a table without joining yet.
      // Keep it as debug to avoid noisy logs.
      logger.debug('getPlayerState: player not found', { playerId: playerId.substring(0, 8) });
      return {

        ...publicState,
        myCards: [],
        mySeat: null,
        myStack: 0,
        myTimeBank: 0,
        isMyTurn: false
      };
    }
    
    // Update players array with cards visible
    const players = (publicState.players as Array<Record<string, unknown>>).map(p => {
      const pid = p.playerId as string;
      const tablePlayer = this.players.get(pid);
      
      // Always show hero's cards
      if (pid === playerId) {
        return { ...p, holeCards: tablePlayer?.holeCards || [] };
      }
      
      // At showdown, show all non-folded players' cards
      if (isShowdown) {
        // Try engine state first, fallback to tablePlayer
        const enginePlayer = engineState?.players.find(ep => ep.id === pid);
        const isFolded = enginePlayer?.isFolded ?? tablePlayer?.isFolded ?? false;
        
        if (!isFolded) {
          // Get cards from engine or tablePlayer (both should have them)
          const engineCards = enginePlayer?.holeCards;
          const tableCards = tablePlayer?.holeCards;
          const holeCards = (engineCards && engineCards.length >= 2) 
            ? engineCards 
            : (tableCards && tableCards.length >= 2 ? tableCards : []);
          
          if (holeCards.length >= 2) {
            logger.debug('Showdown reveal cards', { pid: pid.substring(0,8), holeCards });
            return { ...p, holeCards };
          }
        }
      }
      
      return p;
    });
    
    return {
      ...publicState,
      players,
      myCards: player.holeCards,
      mySeat: player.seatNumber,
      myStack: player.stack,
      // POKERSTARS FIX: Ensure timeBank is never negative
      myTimeBank: Math.max(0, player.timeBank || 0),
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
   * Save table state to database
   * CRITICAL: Also updates player stacks and clears stale data
   */
  async saveState(): Promise<void> {
    try {
      // Update table state
      await this.supabase
        .from('poker_tables')
        .update({
          current_hand_id: this.currentHand?.id || null,
          current_dealer_seat: this.dealerSeat,
          status: this.currentHand ? 'playing' : 'waiting',
          updated_at: new Date().toISOString()
        })
        .eq('id', this.id);
      
      // Update all player stacks in database
      for (const player of this.players.values()) {
        await this.supabase
          .from('poker_table_players')
          .update({
            stack: player.stack,
            status: player.status,
            last_action_at: new Date().toISOString()
          })
          .eq('table_id', this.id)
          .eq('player_id', player.id);
      }
    } catch (err) {
      logger.error('Failed to save table state', { tableId: this.id, error: String(err) });
    }
  }
  
  // ==========================================
  // TOURNAMENT TABLE BALANCING
  // ==========================================
  
  /**
   * PROFESSIONAL: Remove player for table rebalancing
   * Used when player is moved to another table by tournament balancer
   * Returns player state for transfer to new table
   */
  async removePlayerForRebalancing(playerId: string): Promise<{
    success: boolean;
    player?: {
      id: string;
      name: string;
      stack: number;
      avatarUrl?: string;
    };
    error?: string;
  }> {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not at table' };
    }
    
    // Cannot move player who is in active hand
    if (this.currentHand && !player.isFolded && player.status === 'active') {
      return { success: false, error: 'Player is in active hand' };
    }
    
    const playerData = {
      id: player.id,
      name: player.name,
      stack: player.stack,
      avatarUrl: player.avatarUrl
    };
    
    // Remove from local state
    this.seats[player.seatNumber] = null;
    this.players.delete(playerId);
    
    // Remove from database (will be added to new table)
    try {
      await this.supabase
        .from('poker_table_players')
        .delete()
        .eq('table_id', this.id)
        .eq('player_id', playerId);
    } catch (err) {
      logger.warn('DB error removing player for rebalancing', { 
        playerId: playerId.substring(0, 8), 
        error: String(err) 
      });
    }
    
    this.emit('player_moved_to_other_table', { 
      playerId, 
      playerName: player.name,
      stack: player.stack 
    });
    
    logger.info('Player removed for table rebalancing', {
      tableId: this.id,
      playerId: playerId.substring(0, 8),
      playerName: player.name,
      stack: player.stack
    });
    
    return { success: true, player: playerData };
  }
  
  /**
   * PROFESSIONAL: Add player from another table (rebalancing)
   * Player is immediately added without buy-in validation
   */
  async addPlayerFromRebalancing(
    playerId: string,
    playerName: string,
    stack: number,
    seatNumber: number,
    avatarUrl?: string
  ): Promise<{ success: boolean; error?: string }> {
    // Validate seat
    if (seatNumber < 0 || seatNumber >= this.config.maxPlayers) {
      return { success: false, error: 'Invalid seat number' };
    }
    
    if (this.seats[seatNumber] !== null) {
      // Find any available seat
      const availableSeat = this.seats.findIndex(s => s === null);
      if (availableSeat === -1) {
        return { success: false, error: 'No available seats' };
      }
      seatNumber = availableSeat;
    }
    
    // Check if player already at table
    if (this.players.has(playerId)) {
      return { success: false, error: 'Player already at table' };
    }
    
    const isBot = this.isBotName(playerName);
    
    const player: Player = {
      id: playerId,
      name: playerName,
      avatarUrl: avatarUrl,
      seatNumber,
      stack,
      status: 'active',
      holeCards: [],
      currentBet: 0,
      isFolded: false,
      isAllIn: false,
      timeBank: isBot ? 0 : this.config.timeBankSeconds,
      lastActionTime: null,
      missedTurns: 0
    };
    
    this.players.set(playerId, player);
    this.seats[seatNumber] = playerId;
    
    // Save to database
    try {
      await this.supabase.from('poker_table_players').upsert({
        table_id: this.id,
        player_id: playerId,
        seat_number: seatNumber,
        stack: stack,
        status: 'active'
      }, {
        onConflict: 'table_id,player_id'
      });
    } catch (err) {
      logger.warn('DB error adding rebalanced player', { 
        playerId: playerId.substring(0, 8), 
        error: String(err) 
      });
    }
    
    this.emit('player_joined_from_other_table', { 
      playerId, 
      playerName, 
      seatNumber, 
      stack,
      avatarUrl 
    });
    
    logger.info('Player added from table rebalancing', {
      tableId: this.id,
      playerId: playerId.substring(0, 8),
      playerName,
      seatNumber,
      stack
    });
    
    // Check if we can start a hand now
    if (!this.currentHand) {
      this.checkStartHand();
    }
    
    return { success: true };
  }
  
  /**
   * Get player info for balancing calculations
   */
  getPlayersForBalancing(): Array<{
    playerId: string;
    chips: number;
    seatNumber: number;
    isInHand: boolean;
  }> {
    return Array.from(this.players.values())
      .filter(p => p.status === 'active' || p.status === 'disconnected')
      .map(p => ({
        playerId: p.id,
        chips: p.stack,
        seatNumber: p.seatNumber,
        isInHand: !!this.currentHand && !p.isFolded
      }));
  }
  
  /**
   * Get current dealer seat for balancing calculations
   */
  getCurrentDealerSeat(): number {
    return this.dealerSeat;
  }
  
  // Utility methods
  getPlayerCount(): number {
    return this.players.size;
  }
  
  isHandInProgress(): boolean {
    return this.currentHand !== null;
  }
  
  /**
   * Force recovery for stuck table
   * Called by PokerGameManager when table is detected as stuck
   */
  forceRecovery(): void {
    logger.warn('Force recovery initiated for stuck table', {
      tableId: this.id,
      hasCurrentHand: !!this.currentHand,
      currentPlayerSeat: this.currentHand?.currentPlayerSeat
    });
    
    // Clear any existing timer
    this.clearActionTimer();
    
    if (this.currentHand && this.currentHand.currentPlayerSeat !== null) {
      // Force timeout for current player
      this.handleTimeout();
    } else if (this.currentHand) {
      // Hand exists but no current player - complete the hand
      logger.warn('Force completing stuck hand (no current player)', { 
        tableId: this.id, 
        handId: this.currentHand.id 
      });
      
      // Find any remaining active players
      const activePlayers = Array.from(this.players.values())
        .filter(p => !p.isFolded && p.stack > 0);
      
      if (activePlayers.length === 1) {
        // Award pot to last remaining player
        const winner = activePlayers[0];
        this.completeHand([{
          playerId: winner.id,
          amount: this.currentHand.pot,
          handName: 'Last standing'
        }]);
      } else if (activePlayers.length === 0) {
        // No active players - just reset
        this.currentHand = null;
        this.checkStartHand();
      } else {
        // Multiple players but stuck - force fold everyone except first
        logger.warn('Force folding to recover stuck hand', { tableId: this.id });
        for (let i = 1; i < activePlayers.length; i++) {
          activePlayers[i].isFolded = true;
        }
        this.completeHand([{
          playerId: activePlayers[0].id,
          amount: this.currentHand.pot,
          handName: 'Recovery win'
        }]);
      }
    } else {
      // No current hand - try to start one
      this.checkStartHand();
    }
  }
}
