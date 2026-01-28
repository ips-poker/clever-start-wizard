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
  TOURNAMENT_TIMINGS,
  ProfessionalTimings, 
  calculatePhaseDelay,
  calculateBetCollectionDelay,
  calculateShowdownDelay,
  getTimingsForTableType,
  getActionTimeForPhase as getActionTimeFromConfig
} from '../config/pokerTimings.js';

export interface Player {
  id: string;
  name: string;
  avatarUrl?: string; // Player avatar from profile
  userId?: string | null; // Auth user ID - null means bot
  seatNumber: number;
  stack: number;
  status: 'active' | 'sitting_out' | 'disconnected';
  holeCards: string[];
  currentBet: number;
  isFolded: boolean;
  isAllIn: boolean;
  // POKERSTARS-STYLE TIME BANK:
  // - Persists across hands (NOT reset every hand)
  // - Activates ONLY when main timer expires
  // - Slowly replenishes (+5 sec every N hands, configurable)
  timeBank: number;
  timeBankUsedThisAction: number; // Track how much time bank used in current action
  lastActionTime: number | null;
  missedTurns: number; // Count of consecutive missed turns (timeouts)
  handsPlayedSinceLastTimeBank: number; // For time bank replenishment
  // POKERSTARS-STYLE SIT-OUT TRACKING:
  sitOutAt?: number; // Timestamp when sit-out started
  sitOutOrbits: number; // Number of orbits spent sitting out
  lastOrbitDealer?: number; // Dealer seat when last orbit was counted
  missedBB: boolean; // Missed big blind while sitting out (cash games)
  missedSB: boolean; // Missed small blind while sitting out (cash games)
  autoPostBlinds: boolean; // Auto-post blinds setting
  waitForBB: boolean; // Wait for big blind before playing
  isPostingDead: boolean; // Currently posting dead money
  // LEAVE-DURING-HAND FLAG:
  // Set when player clicks "Leave Table" during active hand
  // Player will be fully removed after hand completes
  pendingLeave?: boolean;
}

// POKERSTARS-STYLE: Action log entry for hand history
export interface ActionLogEntry {
  playerId: string;
  playerName: string;
  seatNumber: number;
  phase: 'preflop' | 'flop' | 'turn' | 'river';
  actionType: string; // fold, check, call, raise, bet, all-in, posts_sb, posts_bb, posts_ante
  amount: number;
  timestamp: number;
  actionOrder: number;
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
  // POKERSTARS-STYLE TIMING:
  // Server tracks exact start time for each action
  // Client syncs via: remaining = actionTime - (now - actionStartTime)
  actionStartTime: number | null;
  isTimeBankPhase: boolean; // True when main timer expired, now using time bank
  actionTimeTotal: number | null; // Cached action time for current turn (for consistency)
  playersActedThisRound: Set<string>; // Track who has acted in current betting round
  // POKERSTARS-STYLE HAND HISTORY: Log all actions for export
  actionLog: ActionLogEntry[];
  
  // ========== PRO FEATURES ==========
  // Run It Twice
  isRunItTwice?: boolean;
  secondBoard?: string[];
  
  // Bomb Pot
  isBombPot?: boolean;
  straddleSeat?: number;
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
  private lastDealerSeat: number = 0; // Track previous dealer for orbit counting
  private pendingHandStart: boolean = false; // Prevent concurrent checkStartHand calls
  
  private actionTimer: NodeJS.Timeout | null = null;
  // Tracks the last "logical" timer context (hand+phase+seat+mode) so we can
  // safely reset actionStartTime even during ultra-fast phase transitions.
  // This prevents turn time from carrying over across streets in heads-up / short-handed.
  private lastActionTimerKey: string | null = null;
  private eventListeners: Set<TableEventCallback> = new Set();
  
  // Professional timing settings
  private timings: ProfessionalTimings = PROFESSIONAL_TIMINGS;
  
  // ========== PRO FEATURES STATE ==========
  // Bomb Pot tracking (Industry-style: automatic, no voting)
  private handsSinceLastBombPot: number = 0;
  private nextHandIsBombPot: boolean = false;
  
  // Straddle tracking
  private pendingStraddle: { playerId: string; seat: number; amount: number } | null = null;
  private straddlePromptTimeout: NodeJS.Timeout | null = null;
  
  // Run It Twice tracking
  private runItTwiceVoting: boolean = false;
  private runItTwiceVotes: Map<string, boolean> = new Map();
  private runItTwiceTimeout: NodeJS.Timeout | null = null;
  private allInPlayersForRIT: string[] = []; // Players eligible for RIT decision
  
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
   * Update table settings dynamically
   * Settings apply from the next hand (not current hand)
   */
  public updateSettings(settings: {
    actionTimeSeconds?: number;
    timeBankSeconds?: number;
    smallBlind?: number;
    bigBlind?: number;
    ante?: number;
    straddleEnabled?: boolean;
    mississippiStraddleEnabled?: boolean;
    maxStraddleCount?: number;
    buttonAnteEnabled?: boolean;
    buttonAnteAmount?: number;
    bigBlindAnteEnabled?: boolean;
    bigBlindAnteAmount?: number;
    bombPotEnabled?: boolean;
    bombPotMultiplier?: number;
    bombPotInterval?: number;
    bombPotDoubleBoard?: boolean;
    chatEnabled?: boolean;
    chatSlowMode?: boolean;
    chatSlowModeInterval?: number;
    runItTwiceEnabled?: boolean;
    rakePercent?: number;
    rakeCap?: number;
    autoStartEnabled?: boolean;
    autoStartDelaySeconds?: number;
  }): void {
    // Core timing
    if (settings.actionTimeSeconds !== undefined) {
      this.config.actionTimeSeconds = settings.actionTimeSeconds;
    }
    if (settings.timeBankSeconds !== undefined) {
      this.config.timeBankSeconds = settings.timeBankSeconds;
    }
    
    // Blinds & Ante
    if (settings.smallBlind !== undefined) {
      this.config.smallBlind = settings.smallBlind;
    }
    if (settings.bigBlind !== undefined) {
      this.config.bigBlind = settings.bigBlind;
    }
    if (settings.ante !== undefined) {
      this.config.ante = settings.ante;
    }
    
    // Straddle
    if (settings.straddleEnabled !== undefined) {
      this.config.straddleEnabled = settings.straddleEnabled;
    }
    if (settings.mississippiStraddleEnabled !== undefined) {
      this.config.mississippiStraddleEnabled = settings.mississippiStraddleEnabled;
    }
    if (settings.maxStraddleCount !== undefined) {
      this.config.maxStraddleCount = settings.maxStraddleCount;
    }
    
    // Advanced Ante
    if (settings.buttonAnteEnabled !== undefined) {
      this.config.buttonAnteEnabled = settings.buttonAnteEnabled;
    }
    if (settings.buttonAnteAmount !== undefined) {
      this.config.buttonAnteAmount = settings.buttonAnteAmount;
    }
    if (settings.bigBlindAnteEnabled !== undefined) {
      this.config.bigBlindAnteEnabled = settings.bigBlindAnteEnabled;
    }
    if (settings.bigBlindAnteAmount !== undefined) {
      this.config.bigBlindAnteAmount = settings.bigBlindAnteAmount;
    }
    
    // Bomb Pot
    if (settings.bombPotEnabled !== undefined) {
      this.config.bombPotEnabled = settings.bombPotEnabled;
    }
    if (settings.bombPotMultiplier !== undefined) {
      this.config.bombPotMultiplier = settings.bombPotMultiplier;
    }
    if (settings.bombPotInterval !== undefined) {
      this.config.bombPotInterval = settings.bombPotInterval;
    }
    if (settings.bombPotDoubleBoard !== undefined) {
      this.config.bombPotDoubleBoard = settings.bombPotDoubleBoard;
    }
    
    // Chat settings
    if (settings.chatEnabled !== undefined) {
      this.config.chatEnabled = settings.chatEnabled;
    }
    if (settings.chatSlowMode !== undefined) {
      this.config.chatSlowMode = settings.chatSlowMode;
    }
    if (settings.chatSlowModeInterval !== undefined) {
      this.config.chatSlowModeInterval = settings.chatSlowModeInterval;
    }
    
    // Run it twice
    if (settings.runItTwiceEnabled !== undefined) {
      this.config.runItTwiceEnabled = settings.runItTwiceEnabled;
    }
    
    // Rake settings
    if (settings.rakePercent !== undefined) {
      this.config.rakePercent = settings.rakePercent;
    }
    if (settings.rakeCap !== undefined) {
      this.config.rakeCap = settings.rakeCap;
    }
    
    // Auto-start
    if (settings.autoStartEnabled !== undefined) {
      this.config.autoStartEnabled = settings.autoStartEnabled;
    }
    if (settings.autoStartDelaySeconds !== undefined) {
      this.config.autoStartDelaySeconds = settings.autoStartDelaySeconds;
    }
    
    logger.info('Table settings updated in memory', {
      tableId: this.id,
      newSettings: settings
    });
  }

  /**
   * Get the tournament ID if this is a tournament table
   */
  public getTournamentId(): string | undefined {
    return this.config.tournamentId;
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
        .select('player_id, seat_number, stack, status, sit_out_at, sit_out_orbits, last_orbit_dealer, missed_bb, missed_sb, auto_post_blinds, wait_for_bb, is_posting_dead')
        .eq('table_id', this.id);
      
      if (error) {
        logger.warn('Failed to load players from DB', { tableId: this.id, error: error.message });
        return;
      }
      
      if (!dbPlayers || dbPlayers.length === 0) {
        logger.info('No existing players for table', { tableId: this.id });
        return;
      }
      
      // Fetch player names, avatars, and user_id (for bot detection)
      const playerIds = dbPlayers.map(p => p.player_id);
      const { data: playerProfiles } = await this.supabase
        .from('players')
        .select('id, name, avatar_url, user_id')
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
          (async () => {
            try {
              await this.supabase
                .from('poker_table_players')
                .delete()
                .eq('table_id', this.id)
                .eq('player_id', dbPlayer.player_id);
              logger.info('Cleaned up orphaned zero-stack player', { playerId: dbPlayer.player_id.substring(0, 8) });
            } catch (err: unknown) {
              logger.warn('Failed to clean up orphaned player', { error: String(err) });
            }
          })();
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
        const userId = profile?.user_id || null;

        const player: Player = {
          id: dbPlayer.player_id,
          name: playerName,
          avatarUrl: profile?.avatar_url || undefined,
          userId: userId, // For bot detection
          seatNumber: normalizedSeat,
          stack: dbPlayer.stack,
          status: dbPlayer.status === 'sitting_out' ? 'sitting_out' : 'active',
          holeCards: [], // CRITICAL: No cards until hand starts
          currentBet: 0, // CRITICAL: No bet until hand starts
          isFolded: false,
          isAllIn: false,
          // POKERSTARS-STYLE: Time bank persists, replenishes slowly
          // Bots (no userId) get 0 time bank
          timeBank: !userId ? 0 : this.config.timeBankSeconds,
          timeBankUsedThisAction: 0,
          lastActionTime: null,
          missedTurns: 0,
          handsPlayedSinceLastTimeBank: 0,
          // POKERSTARS-STYLE SIT-OUT TRACKING:
          sitOutOrbits: dbPlayer.sit_out_orbits || 0,
          lastOrbitDealer: dbPlayer.last_orbit_dealer || undefined,
          missedBB: dbPlayer.missed_bb || false,
          missedSB: dbPlayer.missed_sb || false,
          autoPostBlinds: dbPlayer.auto_post_blinds ?? true,
          waitForBB: dbPlayer.wait_for_bb || false,
          isPostingDead: dbPlayer.is_posting_dead || false,
          sitOutAt: dbPlayer.sit_out_at ? new Date(dbPlayer.sit_out_at).getTime() : undefined
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
          userId: player.userId || 'null (BOT)',
          isBot: this.isBotPlayer(player),
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
   * Reload players from database - useful when bots are added via admin panel
   * IMPORTANT: Only call this when hand is NOT active to prevent state corruption
   */
  public async reloadPlayersFromDatabase(): Promise<{ success: boolean; error?: string; playerCount?: number }> {
    // Safety check: don't reload during active hand
    if (this.currentHand !== null) {
      logger.warn('Cannot reload players during active hand', { tableId: this.id });
      return { 
        success: false, 
        error: 'Cannot reload players during active hand - wait for hand to complete' 
      };
    }

    logger.info('Reloading players from database', { tableId: this.id });
    
    try {
      // Clear current players
      const oldPlayerCount = this.players.size;
      this.players.clear();
      this.seats.fill(null);
      
      // Reload from database
      await this.loadPlayersFromDatabase();
      
      const newPlayerCount = this.players.size;
      logger.info('Players reloaded successfully', { 
        tableId: this.id, 
        oldCount: oldPlayerCount,
        newCount: newPlayerCount 
      });
      
      // Emit state update to all clients
      this.emit('players_reloaded', { 
        oldCount: oldPlayerCount, 
        newCount: newPlayerCount 
      });
      
      return { 
        success: true, 
        playerCount: newPlayerCount 
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Failed to reload players', { 
        tableId: this.id, 
        error: errorMessage 
      });
      return { 
        success: false, 
        error: `Failed to reload players: ${errorMessage}` 
      };
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
        // POKERSTARS-STYLE: Time bank persists, replenishes slowly
        timeBank: isBot ? 0 : this.config.timeBankSeconds,
        timeBankUsedThisAction: 0,
        lastActionTime: null,
        missedTurns: 0,
        handsPlayedSinceLastTimeBank: 0,
        // POKERSTARS-STYLE SIT-OUT TRACKING:
        sitOutOrbits: 0,
        missedBB: false,
        missedSB: false,
        autoPostBlinds: true,
        waitForBB: false,
        isPostingDead: false
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
   * TOURNAMENT LEVEL SYNC: Refresh blinds from database
   * Called when tournament-level-manager updates poker_tables
   * This ensures the server engine uses the latest blind levels
   */
  public async refreshBlindsFromDatabase(): Promise<boolean> {
    try {
      const { data: tableData, error } = await this.supabase
        .from('poker_tables')
        .select('small_blind, big_blind, ante')
        .eq('id', this.id)
        .single();
      
      if (error || !tableData) {
        logger.warn('Failed to refresh blinds from database', { 
          tableId: this.id, 
          error: error?.message 
        });
        return false;
      }
      
      const oldBlinds = {
        smallBlind: this.config.smallBlind,
        bigBlind: this.config.bigBlind,
        ante: this.config.ante
      };
      
      // Update config
      this.config.smallBlind = tableData.small_blind;
      this.config.bigBlind = tableData.big_blind;
      this.config.ante = tableData.ante || 0;
      
      // Update engine config for next hand
      this.engine.updateBlinds(
        tableData.small_blind,
        tableData.big_blind,
        tableData.ante || 0
      );
      
      // Only log if blinds actually changed
      if (oldBlinds.smallBlind !== tableData.small_blind || 
          oldBlinds.bigBlind !== tableData.big_blind) {
        logger.info('TOURNAMENT LEVEL SYNC: Blinds updated from database', {
          tableId: this.id,
          tableName: this.config.name,
          oldBlinds,
          newBlinds: {
            smallBlind: tableData.small_blind,
            bigBlind: tableData.big_blind,
            ante: tableData.ante || 0
          }
        });
        
        // Emit event for clients to update their UI
        this.emit('blinds_changed', {
          smallBlind: tableData.small_blind,
          bigBlind: tableData.big_blind,
          ante: tableData.ante || 0
        });
      }
      
      return true;
    } catch (err) {
      logger.error('Error refreshing blinds from database', { 
        tableId: this.id, 
        error: String(err) 
      });
      return false;
    }
  }

  /**
   * Get current blinds config (for external access)
   */
  public getBlinds(): { smallBlind: number; bigBlind: number; ante: number } {
    return {
      smallBlind: this.config.smallBlind,
      bigBlind: this.config.bigBlind,
      ante: this.config.ante
    };
  }

  /**
   * Check if a player exists in memory
   */
  public hasPlayer(playerId: string): boolean {
    return this.players.has(playerId);
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
    
    // Try to fetch avatar and user_id from database
    let resolvedAvatarUrl = avatarUrl;
    let userId: string | null = null;
    
    try {
      const { data: playerData } = await this.supabase
        .from('players')
        .select('avatar_url, user_id')
        .eq('id', playerId)
        .single();
      
      if (playerData) {
        if (playerData.avatar_url && !resolvedAvatarUrl) {
          resolvedAvatarUrl = playerData.avatar_url;
          logger.info('Fetched avatar from DB', { playerId, avatarUrl: resolvedAvatarUrl });
        }
        userId = playerData.user_id || null;
      }
    } catch (err) {
      logger.warn('Failed to fetch player data', { playerId, error: String(err) });
    }

    const player: Player = {
      id: playerId,
      name: playerName,
      avatarUrl: resolvedAvatarUrl,
      userId: userId, // For bot detection - null means bot
      seatNumber,
      stack: buyIn,
      status: 'active',
      holeCards: [],
      currentBet: 0,
      isFolded: false,
      isAllIn: false,
      // POKERSTARS-STYLE: Time bank - bots (no userId) get 0
      timeBank: !userId ? 0 : this.config.timeBankSeconds,
      timeBankUsedThisAction: 0,
      lastActionTime: null,
      missedTurns: 0,
      handsPlayedSinceLastTimeBank: 0,
      // POKERSTARS-STYLE SIT-OUT TRACKING:
      sitOutAt: undefined,
      sitOutOrbits: 0,
      lastOrbitDealer: undefined,
      missedBB: false,
      missedSB: false,
      autoPostBlinds: true,
      waitForBB: false,
      isPostingDead: false
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
    
    // POKERSTARS-STYLE: Tournament players NEVER leave - they sit out and continue paying blinds
    // They can return at any time by opening the table again
    if (this.config.tournamentId) {
      // If in active hand and not folded, fold first
      if (this.currentHand && !player.isFolded && player.status === 'active') {
        if (this.currentHand.currentPlayerSeat === player.seatNumber) {
          await this.action(playerId, 'fold');
        } else {
          player.isFolded = true;
        }
      }
      
      // Just set to sitting_out - DO NOT remove from table or database
      player.status = 'sitting_out';
      player.sitOutAt = Date.now();
      player.pendingLeave = false; // CRITICAL: Do NOT mark for removal in tournaments
      
      // Update database status only
      await this.supabase
        .from('poker_table_players')
        .update({ 
          status: 'sitting_out',
          sit_out_at: new Date().toISOString()
        })
        .eq('table_id', this.id)
        .eq('player_id', playerId);
      
      logger.info('POKERSTARS: Tournament player left table - sitting out (can return anytime)', {
        playerId: playerId.substring(0, 8),
        name: player.name,
        seatNumber: player.seatNumber,
        stack: player.stack
      });
      
      this.emit('player_sitting_out', { 
        playerId, 
        reason: 'tournament_leave',
        canReturn: true 
      });
      
      return { success: true };
    }
    
    // CASH GAME LOGIC: Player actually leaves and gets chips returned
    // If in active hand and not folded, fold first
    if (this.currentHand && !player.isFolded && player.status === 'active') {
      // If it's this player's turn, fold them
      if (this.currentHand.currentPlayerSeat === player.seatNumber) {
        await this.action(playerId, 'fold');
      } else {
        // Mark as folded for this hand
        player.isFolded = true;
      }
      // Mark as sitting out - will be removed after hand completes
      player.status = 'sitting_out';
      // CRITICAL: Mark for removal after hand - prevents "ghost players"
      player.pendingLeave = true;
      logger.info('POKERSTARS: Cash game player leaving during hand - will be removed after completion', {
        playerId: playerId.substring(0, 8),
        name: player.name,
        seatNumber: player.seatNumber
      });
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
   * POKERSTARS-STYLE: Return chips to player's main balance
   * Called when player leaves table or is removed for excessive sit-out
   */
  private async returnChipsToBalance(playerId: string, amount: number): Promise<boolean> {
    if (amount <= 0) return true;
    
    // Only return chips in cash games, not tournaments
    if (this.config.tournamentId) {
      logger.info('Not returning chips - tournament table', { playerId: playerId.substring(0, 8) });
      return true;
    }
    
    try {
      const { data, error } = await this.supabase.rpc('update_player_balance', {
        p_player_id: playerId,
        p_amount: amount,
        p_is_win: false
      });
      
      if (error) {
        logger.error('Failed to return chips to balance', { 
          playerId: playerId.substring(0, 8), 
          amount, 
          error: error.message 
        });
        return false;
      }
      
      logger.info('POKERSTARS: Chips returned to player balance', {
        playerId: playerId.substring(0, 8),
        amount,
        newBalance: data
      });
      
      return true;
    } catch (err) {
      logger.error('Error returning chips to balance', { 
        playerId: playerId.substring(0, 8), 
        error: String(err) 
      });
      return false;
    }
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
   * POKERSTARS-STYLE: Sit out - player will auto-fold when it's their turn
   * Tracks sit-out timestamp and orbit counting for removal logic
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
    player.sitOutAt = Date.now();
    player.sitOutOrbits = 0;
    
    // Track current dealer for orbit counting
    const currentDealerSeat = this.currentHand?.dealerSeat ?? this.lastDealerSeat ?? 0;
    player.lastOrbitDealer = currentDealerSeat;
    
    logger.info('POKERSTARS: Player sitting out', { 
      playerId: playerId.substring(0, 8),
      dealerSeat: currentDealerSeat,
      isTournament: !!this.config.tournamentId
    });
    
    // Update database with full sit-out tracking
    await this.supabase
      .from('poker_table_players')
      .update({ 
        status: 'sitting_out',
        sit_out_at: new Date().toISOString(),
        sit_out_orbits: 0,
        last_orbit_dealer: currentDealerSeat
      })
      .eq('table_id', this.id)
      .eq('player_id', playerId);
    
    this.emit('player_sitting_out', { 
      playerId, 
      reason: 'manual',
      sitOutAt: player.sitOutAt,
      maxOrbits: this.config.tournamentId ? 2 : 4
    });
    
    return { success: true };
  }

  /**
   * POKERSTARS-STYLE: Sit in - return to active play
   * Handles missed blinds for cash games (post dead money or wait for BB)
   */
  async sitIn(playerId: string, options: { postDead?: boolean } = {}): Promise<{ 
    success: boolean; 
    error?: string;
    deadAmount?: number;
    waitForBB?: boolean;
  }> {
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
    
    // For cash games: handle missed blinds
    let deadAmount = 0;
    let waitForBB = false;
    
    if (!this.config.tournamentId && (player.missedBB || player.missedSB)) {
      if (options.postDead) {
        // Post dead money: BB + SB if both missed
        deadAmount = this.config.bigBlind;
        if (player.missedSB) {
          deadAmount += this.config.smallBlind;
        }
        player.isPostingDead = true;
        logger.info('POKERSTARS: Player posting dead money', {
          playerId: playerId.substring(0, 8),
          deadAmount,
          missedBB: player.missedBB,
          missedSB: player.missedSB
        });
      } else {
        // Wait for big blind position
        waitForBB = true;
        player.waitForBB = true;
        logger.info('POKERSTARS: Player waiting for big blind', {
          playerId: playerId.substring(0, 8)
        });
      }
    }
    
    player.status = 'active';
    player.missedTurns = 0;
    player.sitOutAt = undefined;
    player.sitOutOrbits = 0;
    player.missedBB = false;
    player.missedSB = false;
    
    logger.info('POKERSTARS: Player sitting in', { 
      playerId: playerId.substring(0, 8),
      deadAmount,
      waitForBB
    });
    
    // Use RPC for atomic update
    const { data: result } = await this.supabase.rpc('player_sit_in', {
      p_table_id: this.id,
      p_player_id: playerId,
      p_post_dead: options.postDead ?? false
    });
    
    this.emit('player_sitting_in', { 
      playerId, 
      deadAmount,
      waitForBB
    });
    
    // Check if we can start a hand now
    if (!this.currentHand) {
      this.checkStartHand();
    }
    
    return { success: true, deadAmount, waitForBB };
  }
  
  /**
   * POKERSTARS-STYLE: Set auto-post blinds preference
   * When enabled, player automatically posts blinds when returning from sit-out
   */
  async setAutoPostBlinds(playerId: string, enabled: boolean): Promise<{ 
    success: boolean; 
    error?: string;
  }> {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not at table' };
    }
    
    player.autoPostBlinds = enabled;
    
    // Update database
    const { error } = await this.supabase
      .from('poker_table_players')
      .update({ auto_post_blinds: enabled })
      .eq('table_id', this.id)
      .eq('player_id', playerId);
    
    if (error) {
      logger.warn('Failed to update auto_post_blinds in DB', { error: error.message });
    }
    
    logger.info('POKERSTARS: Auto-post blinds updated', {
      playerId: playerId.substring(0, 8),
      enabled
    });
    
    this.emit('auto_post_blinds_changed', { playerId, enabled });
    
    return { success: true };
  }
  
  /**
   * POKERSTARS-STYLE: Track sit-out orbits and missed blinds at hand start
   * Called every new hand to increment orbit counters and mark missed blind positions
   */
  private async trackSitOutOrbitsAndMissedBlinds(
    newDealerSeat: number,
    sbSeat: number,
    bbSeat: number
  ): Promise<void> {
    const isTournament = !!this.config.tournamentId;
    const sitOutPlayers = Array.from(this.players.values())
      .filter(p => p.status === 'sitting_out');
    
    if (sitOutPlayers.length === 0) return;
    
    // Track orbits via RPC for atomicity
    try {
      const { data: orbitResult } = await this.supabase.rpc('track_sit_out_orbit', {
        p_table_id: this.id,
        p_new_dealer_seat: newDealerSeat
      });
      
      if (orbitResult?.warned_players?.length > 0) {
        // Emit warning for players approaching removal limit
        for (const warnedPlayerId of orbitResult.warned_players) {
          const player = this.players.get(warnedPlayerId);
          if (player) {
            player.sitOutOrbits = (player.sitOutOrbits || 0) + 1;
            const maxOrbits = isTournament ? 2 : 4;
            const remaining = maxOrbits - player.sitOutOrbits;
            
            this.emit('sit_out_warning', {
              playerId: warnedPlayerId,
              orbitsRemaining: remaining,
              maxOrbits,
              isTournament
            });
            
            logger.info('POKERSTARS: Sit-out warning issued', {
              playerId: warnedPlayerId.substring(0, 8),
              orbits: player.sitOutOrbits,
              remaining
            });
          }
        }
      }
    } catch (err) {
      logger.warn('Failed to track sit-out orbits via RPC', { error: String(err) });
    }
    
    // For cash games only: track missed blinds
    if (!isTournament) {
      try {
        const { data: missedResult } = await this.supabase.rpc('check_missed_blinds', {
          p_table_id: this.id,
          p_bb_seat: bbSeat,
          p_sb_seat: sbSeat
        });
        
        // Update local player state
        if (missedResult?.missed_bb_player) {
          const player = this.players.get(missedResult.missed_bb_player);
          if (player) {
            player.missedBB = true;
            logger.info('POKERSTARS: Player missed BB', {
              playerId: missedResult.missed_bb_player.substring(0, 8)
            });
          }
        }
        
        if (missedResult?.missed_sb_player) {
          const player = this.players.get(missedResult.missed_sb_player);
          if (player) {
            player.missedSB = true;
            logger.info('POKERSTARS: Player missed SB', {
              playerId: missedResult.missed_sb_player.substring(0, 8)
            });
          }
        }
      } catch (err) {
        logger.warn('Failed to check missed blinds via RPC', { error: String(err) });
      }
      
      // POKERSTARS-STYLE: Check for excessive sit-out by TIME (15 minutes) or orbits (4)
      // Remove players who have been sitting out too long
      const SIT_OUT_TIME_LIMIT_MS = 15 * 60 * 1000; // 15 minutes
      const MAX_SIT_OUT_ORBITS = 4;
      const now = Date.now();
      
      const playersToRemove: string[] = [];
      
      for (const player of sitOutPlayers) {
        const sitOutDuration = player.sitOutAt ? now - player.sitOutAt : 0;
        const orbits = player.sitOutOrbits || 0;
        
        // Remove if: 15 minutes passed OR 4 orbits completed
        if (sitOutDuration >= SIT_OUT_TIME_LIMIT_MS || orbits >= MAX_SIT_OUT_ORBITS) {
          playersToRemove.push(player.id);
          
          logger.info('POKERSTARS: Player exceeded sit-out limit', {
            playerId: player.id.substring(0, 8),
            sitOutDurationMinutes: Math.round(sitOutDuration / 60000),
            orbits,
            reason: sitOutDuration >= SIT_OUT_TIME_LIMIT_MS ? 'time_limit' : 'orbit_limit'
          });
        } else if (sitOutDuration >= SIT_OUT_TIME_LIMIT_MS - 2 * 60 * 1000) {
          // Warning at 13 minutes (2 minutes before removal)
          this.emit('sit_out_time_warning', {
            playerId: player.id,
            timeRemaining: Math.round((SIT_OUT_TIME_LIMIT_MS - sitOutDuration) / 1000),
            orbits
          });
        }
      }
      
      // Remove players who exceeded limits
      for (const removedPlayerId of playersToRemove) {
        const player = this.players.get(removedPlayerId);
        if (player) {
          // Return chips to balance before removal
          await this.returnChipsToBalance(removedPlayerId, player.stack);
          
          this.seats[player.seatNumber] = null;
          this.players.delete(removedPlayerId);
          
          // Remove from database
          await this.supabase
            .from('poker_table_players')
            .delete()
            .eq('table_id', this.id)
            .eq('player_id', removedPlayerId);
          
          this.emit('player_removed_sit_out', {
            playerId: removedPlayerId,
            reason: 'exceeded_sit_out_limit',
            chipsReturned: player.stack
          });
          
          logger.info('POKERSTARS: Player removed for excessive sit-out', {
            playerId: removedPlayerId.substring(0, 8),
            chipsReturned: player.stack
          });
        }
      }
    }
    
    // For tournaments: handle blind posting for sitting-out players (blinding out)
    // POKERSTARS-STYLE: All sitting-out players pay blinds AND antes
    if (isTournament) {
      const ante = this.config.ante || 0;
      
      for (const player of sitOutPlayers) {
        let totalDeducted = 0;
        
        // POKERSTARS: Ante is deducted from ALL players, including sitting-out
        if (ante > 0 && player.stack > 0) {
          const anteAmount = Math.min(ante, player.stack);
          player.stack -= anteAmount;
          totalDeducted += anteAmount;
          logger.info('POKERSTARS TOURNAMENT: Sitting-out player posted ANTE', {
            playerId: player.id.substring(0, 8),
            amount: anteAmount,
            remainingStack: player.stack
          });
        }
        
        // Tournament players in BB/SB positions must post blinds even when sitting out
        if (player.seatNumber === bbSeat && player.stack > 0) {
          const bbAmount = Math.min(this.config.bigBlind, player.stack);
          player.stack -= bbAmount;
          player.currentBet = bbAmount;
          totalDeducted += bbAmount;
          logger.info('POKERSTARS TOURNAMENT: Sitting-out player posted BB', {
            playerId: player.id.substring(0, 8),
            amount: bbAmount,
            remainingStack: player.stack
          });
        } else if (player.seatNumber === sbSeat && player.stack > 0) {
          const sbAmount = Math.min(this.config.smallBlind, player.stack);
          player.stack -= sbAmount;
          player.currentBet = sbAmount;
          totalDeducted += sbAmount;
          logger.info('POKERSTARS TOURNAMENT: Sitting-out player posted SB', {
            playerId: player.id.substring(0, 8),
            amount: sbAmount,
            remainingStack: player.stack
          });
        }
        
        // Update stack in database if anything was deducted
        if (totalDeducted > 0) {
          this.supabase
            .from('poker_table_players')
            .update({ stack: player.stack })
            .eq('table_id', this.id)
            .eq('player_id', player.id)
            .then(({ error }) => {
              if (error) logger.warn('Failed to update sit-out player stack in DB', { error: error.message });
            });
          
          // Emit event for UI to show blinding out
          this.emit('player_blinding_out', {
            playerId: player.id,
            amountDeducted: totalDeducted,
            remainingStack: player.stack
          });
        }
        
        // If player is busted, eliminate them
        if (player.stack <= 0) {
          await this.eliminatePlayer(player.id, 'blinded_out');
        }
      }
    }
  }
  
  /**
   * Eliminate a player from the table (tournament or bust)
   */
  private async eliminatePlayer(playerId: string, reason: string): Promise<void> {
    const player = this.players.get(playerId);
    if (!player) return;
    
    logger.info('POKERSTARS: Player eliminated', {
      playerId: playerId.substring(0, 8),
      reason,
      stack: player.stack
    });
    
    this.seats[player.seatNumber] = null;
    this.players.delete(playerId);
    
    // Remove from DB
    await this.supabase
      .from('poker_table_players')
      .delete()
      .eq('table_id', this.id)
      .eq('player_id', playerId);
    
    this.emit('player_eliminated', {
      playerId,
      reason,
      finalStack: player.stack
    });
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
   * 
   * PHASE 3 IMPROVEMENT: If it's the player's turn, trigger IMMEDIATE auto-action
   * to prevent game from stalling. Other players shouldn't wait 60 seconds.
   */
  markPlayerDisconnected(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) {
      logger.warn('Cannot mark disconnect - player not found', { playerId: playerId.substring(0, 8) });
      return;
    }
    
    // Check if it's currently this player's turn
    const isPlayerTurn = this.currentHand && 
                         this.currentHand.currentPlayerSeat === player.seatNumber &&
                         !player.isFolded && 
                         !player.isAllIn;
    
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
      isPlayerTurn,
      reconnectWindowMs: this.RECONNECT_WINDOW_MS
    });
    
    // Emit event so other players see disconnected status
    this.emit('player_disconnected', { 
      playerId, 
      seatNumber: player.seatNumber,
      reconnectWindowSeconds: this.RECONNECT_WINDOW_MS / 1000
    });
    
    // PHASE 3: IMMEDIATE auto-action if it's player's turn
    // Don't make other players wait 60 seconds for disconnected player
    if (isPlayerTurn) {
      logger.warn('PHASE3: Player disconnected during their turn - triggering immediate auto-action', {
        playerId: playerId.substring(0, 8),
        seatNumber: player.seatNumber,
        phase: this.currentHand?.phase
      });
      
      // Clear existing timer
      this.clearActionTimer();
      
      // Emit special event for UI to show disconnect-caused action
      this.emit('disconnect_action_timeout', {
        playerId,
        seatNumber: player.seatNumber,
        reason: 'connection_lost'
      });
      
      // Short delay (2 seconds) to allow quick reconnect, then auto-action
      // This is much shorter than the 60 second reconnect window
      const DISCONNECT_ACTION_DELAY_MS = 2000;
      
      setTimeout(async () => {
        // Double-check player is still disconnected and it's still their turn
        const currentPlayer = this.players.get(playerId);
        if (!currentPlayer || currentPlayer.status !== 'disconnected') {
          logger.info('PHASE3: Player reconnected before auto-action', { playerId: playerId.substring(0, 8) });
          return;
        }
        
        if (!this.currentHand || this.currentHand.currentPlayerSeat !== player.seatNumber) {
          logger.info('PHASE3: No longer player turn - skipping auto-action', { playerId: playerId.substring(0, 8) });
          return;
        }
        
        // Execute auto-action: check if possible, otherwise fold
        const canCheck = currentPlayer.currentBet >= this.currentHand.currentBet;
        const autoAction = canCheck ? 'check' : 'fold';
        
        logger.info('PHASE3: Executing auto-action for disconnected player', {
          playerId: playerId.substring(0, 8),
          action: autoAction,
          canCheck,
          currentBet: this.currentHand.currentBet,
          playerBet: currentPlayer.currentBet
        });
        
        await this.action(playerId, autoAction);
      }, DISCONNECT_ACTION_DELAY_MS);
    }
    
    // Set timeout to auto-fold/remove if player doesn't reconnect (for future hands)
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
    
    // POKERSTARS-STYLE HAND HISTORY: Record action to action log
    if (this.currentHand) {
      const actionLogEntry: ActionLogEntry = {
        playerId,
        playerName: player.name,
        seatNumber: player.seatNumber,
        phase: this.currentHand.phase as 'preflop' | 'flop' | 'turn' | 'river',
        actionType: player.isAllIn ? 'all-in' : actionType,
        amount: result.amount || 0,
        timestamp: Date.now(),
        actionOrder: this.currentHand.actionLog.length
      };
      this.currentHand.actionLog.push(actionLogEntry);
      
      logger.info('HAND HISTORY: Action recorded', {
        handId: this.currentHand.id,
        action: actionType,
        player: player.name.substring(0, 10),
        amount: result.amount,
        totalActions: this.currentHand.actionLog.length
      });
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
      
    // POKERSTARS/TDA RULE 16: Check for all-in showdown BEFORE processing phase changes
    // If all remaining players are all-in (no one can act), proceed directly to showdown
    // This must come BEFORE result.phaseAdvanced check to prevent normal card dealing
    } else if (this.currentHand && engineState && !result.handComplete) {
      const remainingPlayers = engineState.players.filter(p => !p.isFolded);
      const allInPlayers = remainingPlayers.filter(p => p.isAllIn);
      const canActPlayers = remainingPlayers.filter(p => !p.isAllIn && p.stack > 0);
      
      // DIAGNOSTIC: Log player state for all-in showdown detection
      logger.info('DIAGNOSTIC: Checking all-in showdown conditions', {
        tableId: this.id,
        handNumber: this.handNumber,
        phase: this.currentHand.phase,
        currentPlayerSeat: this.currentHand.currentPlayerSeat,
        remainingCount: remainingPlayers.length,
        allInCount: allInPlayers.length,
        canActCount: canActPlayers.length,
        remainingPlayers: remainingPlayers.map(p => ({
          id: p.id.substring(0, 8),
          seat: p.seatNumber,
          stack: p.stack,
          isAllIn: p.isAllIn,
          betAmount: p.betAmount
        }))
      });
      
      // Check if we need all-in showdown:
      // 1. All remaining players are all-in (no one can act)
      // 2. OR engine set currentPlayerSeat to -1 (indicating no action possible)
      const shouldTriggerAllInShowdown = 
        (canActPlayers.length === 0 && allInPlayers.length >= 2 && remainingPlayers.length >= 2) ||
        (this.currentHand.currentPlayerSeat === -1);
      
      if (shouldTriggerAllInShowdown) {
        logger.info('POKERSTARS: All-in showdown triggered', {
          tableId: this.id,
          handNumber: this.handNumber,
          actionType,
          playerId: playerId.substring(0, 8),
          remainingCount: remainingPlayers.length,
          allInCount: allInPlayers.length,
          canActCount: canActPlayers.length,
          phase: this.currentHand.phase,
          currentPlayerSeat: this.currentHand.currentPlayerSeat,
          reason: this.currentHand.currentPlayerSeat === -1 ? 'currentPlayerSeat === -1' : 'all players all-in'
        });
        
        // Delay after action, then proceed to all-in showdown
        await this.delay(afterActionDelay);
        
        // CRITICAL: Save current phase to know where to start dealing from
        const phaseBeforeShowdown = this.currentHand.phase;
        
        // Convert to array of PokerTable.Player (match function signature)
        const tablePlayers = remainingPlayers
          .map(ep => this.players.get(ep.id))
          .filter((p): p is Player => p !== undefined);
        
        // CRITICAL: Reset community cards to current phase state if engine already dealt ahead
        // This prevents showing cards that weren't dealt yet during all-in showdown
        if (phaseBeforeShowdown === 'preflop') {
          this.currentHand.communityCards = [];
        } else if (phaseBeforeShowdown === 'flop') {
          this.currentHand.communityCards = this.currentHand.communityCards.slice(0, 3);
        } else if (phaseBeforeShowdown === 'turn') {
          this.currentHand.communityCards = this.currentHand.communityCards.slice(0, 4);
        }
        
        await this.proceedToAllInShowdown(tablePlayers);
        return { success: true };
      }
    } else if (result.phaseAdvanced && this.currentHand) {
      // PROFESSIONAL TIMING: Phase transition with delays
      const newPhase = this.currentHand.phase as 'flop' | 'turn' | 'river' | 'showdown';
      const phaseDelay = calculatePhaseDelay(newPhase);
      
      // CRITICAL FIX: Clear timer IMMEDIATELY on ANY phase change
      // This prevents stale timers from previous phase from triggering auto-actions
      // The timer will be restarted AFTER the phase animation completes (at line 1237)
      this.clearActionTimer();
      logger.info('Phase transition - timer cleared', { 
        newPhase, 
        phaseDelay,
        isShowdown: newPhase === 'showdown'
      });
      
      logger.info('Phase advancing with professional delay', {
        newPhase,
        delayMs: afterActionDelay + phaseDelay,
        communityCardsCount: this.currentHand.communityCards.length
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
      
      // Delay for chip collection animation
      const collectionTime = calculateBetCollectionDelay(betPositions.length, this.timings);
      await this.delay(collectionTime);
      
      // Emit phase change with dealing delay for client animation
      this.emit('phase_change', {
        phase: newPhase,
        communityCards: this.currentHand.communityCards,
        pot: this.currentHand.pot,
        dealDelay: this.timings.phases[newPhase]?.perCardDelay || 0,
        preDealDelay: this.timings.phases[newPhase]?.preDealDelay || 0,
        postDealDelay: this.timings.phases[newPhase]?.postDealDelay || 0
      });
      
      // Wait for cards to be dealt visually before starting next action timer
      await this.delay(phaseDelay);
      
      // Now emit state update after cards are visually dealt
      // POKERSTARS-STYLE: Include timing info for instant timer reset
      // CRITICAL FIX: Set actionStartTime BEFORE emitting state_update
      // Calculate actionTimeTotal ONCE and use it consistently
      const actionTimeTotal = this.getActionTimeForPhase();
      const newActionStartTime = Date.now();
      
      if (this.currentHand) {
        this.currentHand.actionStartTime = newActionStartTime;
        this.currentHand.isTimeBankPhase = false;
        // Store the calculated actionTimeTotal for consistency
        this.currentHand.actionTimeTotal = actionTimeTotal;
        
        // CRITICAL FIX: Sync action_started_at to DB to prevent watchdog false positives
        // This ensures DB, server memory, and client all have consistent timer state
        this.supabase
          .from('poker_hands')
          .update({
            action_started_at: new Date(newActionStartTime).toISOString(),
            current_player_seat: this.currentHand.currentPlayerSeat,
            phase: newPhase,
            current_bet: 0
          })
          .eq('id', this.currentHand.id)
          .then(({ error }) => {
            if (error) {
              logger.warn('Failed to sync action_started_at to DB (phase change)', { error: error.message });
            }
          });
      }
      
      logger.info('Emitting state_update with timer info (phase change)', {
        actionStartTime: newActionStartTime,
        actionTimeTotal,
        phase: newPhase,
        currentPlayerSeat: this.currentHand.currentPlayerSeat
      });
      
      this.emit('state_update', {
        handId: this.currentHand.id, // POKERSTARS: For card deal animation sync
        pot: this.currentHand.pot,
        currentBet: 0, // Bets reset after phase
        currentPlayerSeat: this.currentHand.currentPlayerSeat,
        phase: newPhase,
        // POKERSTARS-STYLE: Timing info for client sync - now has fresh actionStartTime
        actionStartTime: newActionStartTime,
        actionTimeTotal: actionTimeTotal,
        isTimeBankPhase: false
      });
      
    } else {
      // Normal state update without phase change - minimal delay
      // CRITICAL FIX: Clear timer before delay to prevent race conditions
      this.clearActionTimer();
      
      await this.delay(Math.min(afterActionDelay, 200));
      
      // POKERSTARS-STYLE: Include timing info in state update
      // CRITICAL FIX: Set actionStartTime BEFORE emitting state_update
      // Calculate actionTimeTotal ONCE and use it consistently
      const actionTimeTotal = this.getActionTimeForPhase();
      const newActionStartTime = Date.now();
      
      if (this.currentHand) {
        this.currentHand.actionStartTime = newActionStartTime;
        this.currentHand.isTimeBankPhase = false;
        // Store the calculated actionTimeTotal for consistency
        this.currentHand.actionTimeTotal = actionTimeTotal;
        
        // CRITICAL FIX: Sync action_started_at to DB to prevent watchdog false positives
        // This ensures DB, server memory, and client all have consistent timer state
        this.supabase
          .from('poker_hands')
          .update({
            action_started_at: new Date(newActionStartTime).toISOString(),
            current_player_seat: this.currentHand.currentPlayerSeat,
            current_bet: this.currentHand.currentBet
          })
          .eq('id', this.currentHand.id)
          .then(({ error }) => {
            if (error) {
              logger.warn('Failed to sync action_started_at to DB (normal)', { error: error.message });
            }
          });
      }
      
      logger.info('Emitting state_update with timer info (normal)', {
        actionStartTime: newActionStartTime,
        actionTimeTotal,
        currentPlayerSeat: this.currentHand?.currentPlayerSeat,
        phase: this.currentHand?.phase
      });
      
      this.emit('state_update', {
        handId: this.currentHand?.id, // POKERSTARS: For card deal animation sync
        pot: this.currentHand?.pot || 0,
        currentBet: this.currentHand?.currentBet || 0,
        currentPlayerSeat: this.currentHand?.currentPlayerSeat,
        phase: this.currentHand?.phase || 'preflop',
        // POKERSTARS-STYLE: Timing info for client sync - now has fresh actionStartTime
        actionStartTime: newActionStartTime,
        actionTimeTotal: actionTimeTotal,
        isTimeBankPhase: false
      });
    }
    
    // Start timer for next player ONLY after all delays and animations complete
    // CRITICAL: Never start timer during showdown phase
    if (!result.handComplete && 
        this.currentHand?.currentPlayerSeat !== null && 
        this.currentHand?.phase !== 'showdown') {
      logger.info('Starting action timer after action processing', {
        phase: this.currentHand?.phase,
        currentPlayerSeat: this.currentHand?.currentPlayerSeat
      });
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
   * Bot detection: A player is a bot if they have no userId (not linked to auth account)
   * OR if their name contains 'bot' (legacy detection)
   */
  private isBotName(name: unknown): boolean {
    return typeof name === 'string' && name.toLowerCase().includes('bot');
  }

  private isBotPlayer(player: Player | null | undefined): boolean {
    if (!player) return false;
    // Primary check: no userId means bot (created through admin panel)
    if (player.userId === null || player.userId === undefined) {
      return true;
    }
    // Fallback: check name for 'bot' keyword
    return this.isBotName(player.name);
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
   * POKERSTARS-STYLE: Get action time based on phase and pot state
   * Different times for:
   * - Preflop unraised pot (limped) = more time
   * - Preflop raised pot = less time (decision is simpler)
   * - Postflop = standard time
   */
  private getActionTimeForPhase(): number {
    // ALWAYS use table's configured action time (from DB / user settings)
    // This ensures user customizations are respected
    const userConfiguredTime = this.config.actionTimeSeconds;
    
    if (!this.currentHand) {
      return userConfiguredTime;
    }
    
    const phase = this.currentHand.phase;
    
    // For showdown, no action time needed
    if (phase === 'showdown') {
      return userConfiguredTime;
    }
    
    logger.info('getActionTimeForPhase: Using user-configured time', {
      phase,
      userConfiguredTime,
      tableId: this.id
    });
    
    // Return user-configured action time directly
    // This respects table settings panel changes
    return userConfiguredTime;
  }

  /**
   * Start action timer
   */
  private startActionTimer(durationSeconds?: number): void {
    // CRITICAL FIX: Never start timer during showdown or when hand is complete
    // This prevents spurious auto-fold/check during animations
    if (this.currentHand?.phase === 'showdown') {
      logger.info('startActionTimer: Skipping - in showdown phase');
      return;
    }
    
    // CRITICAL FIX: Check if hand is being processed (between phases)
    // Don't start timer if we're waiting for phase transition animations
    if (!this.currentHand || this.currentHand.currentPlayerSeat === null) {
      logger.info('startActionTimer: Skipping - no current player');
      return;
    }
    
    // NOTE: actionStartTime is usually set BEFORE state_update emission in afterAction()/advancePhase().
    // However, for direct calls (advanceTurn/startHand/retry loop), we must ensure it's reset.
    // IMPORTANT: The old "stale > 500ms" guard can break very fast street transitions,
    // especially when the same seat becomes first to act on flop/turn/river.
    // So we also reset when the *logical timer context* changes.
    if (this.currentHand) {
      const now = Date.now();

      const timerKey = `${this.currentHand.id}:${this.currentHand.phase}:${this.currentHand.currentPlayerSeat ?? 'none'}:${this.currentHand.isTimeBankPhase ? 'tb' : 'main'}`;
      const isNewContext = timerKey !== this.lastActionTimerKey;
      const isStale = !this.currentHand.actionStartTime || (now - this.currentHand.actionStartTime > 500);

      if (isNewContext || isStale) {
        this.currentHand.actionStartTime = now;
        // CRITICAL FIX: Also refresh actionTimeTotal to use current config.actionTimeSeconds
        // This ensures that if settings changed, new time is applied from next turn
        this.currentHand.actionTimeTotal = this.getActionTimeForPhase();
        
        logger.info('startActionTimer: Timer context reset', {
          tableId: this.id,
          timerKey,
          isNewContext,
          isStale,
          actionTimeTotal: this.currentHand.actionTimeTotal,
          configActionTime: this.config.actionTimeSeconds
        });
      }

      this.lastActionTimerKey = timerKey;
      this.currentHand.isTimeBankPhase = false;
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

      this.actionTimer = setTimeout(() => this.startActionTimer(durationSeconds), 500);
      return;
    }

    const isBot = this.isBotPlayer(player);
    
    // POKERSTARS-STYLE: Players who are sitting out should auto-fold immediately
    // This prevents the game from waiting for absent players
    if (player.status === 'sitting_out' && !isBot) {
      logger.info('POKERSTARS: Auto-folding sitting out player immediately', {
        playerId: playerId.substring(0, 8),
        name: player.name,
        missedTurns: player.missedTurns
      });
      
      // Use minimal delay (100ms) for visual feedback, then auto-fold
      this.actionTimer = setTimeout(async () => {
        if (this.currentHand?.currentPlayerSeat === seat && 
            this.currentHand.phase !== 'showdown') {
          player.missedTurns++;
          const canCheck = player.currentBet >= (this.currentHand?.currentBet || 0);
          await this.action(playerId, canCheck ? 'check' : 'fold');
        }
      }, 100);
      return;
    }
    
    // POKERSTARS-STYLE: Use cached actionTimeTotal if available, otherwise calculate fresh
    // This ensures consistency between timer start and state_update events
    const phaseAwareActionTime = this.currentHand?.actionTimeTotal || this.getActionTimeForPhase();

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
      // Capture hand ID at timer start to validate timer is still valid
      const botExpectedHandId = this.currentHand?.id;
      
      this.actionTimer = setTimeout(async () => {
        // CRITICAL FIX: Validate hand ID hasn't changed (new hand started)
        if (this.currentHand?.id !== botExpectedHandId) {
          logger.info('Bot timer callback: Ignoring - hand changed', {
            expectedHandId: botExpectedHandId?.substring(0, 8),
            currentHandId: this.currentHand?.id?.substring(0, 8)
          });
          return;
        }
        // Double-check we're still on this player's turn before executing
        if (this.currentHand?.currentPlayerSeat === seat && 
            this.currentHand.phase !== 'showdown') {
          await this.executeBotDecision(player);
        }
      }, delayMs);
    } else {
      // POKERSTARS-STYLE: Use phase-aware action time instead of static config
      const duration = Math.max(0, durationSeconds ?? phaseAwareActionTime);
      delayMs = duration * 1000;
      
      // CRITICAL FIX: Capture hand ID, seat, and phase at timer start for validation
      // This prevents stale timers from triggering when a new hand has the same seat/phase
      const expectedHandId = this.currentHand?.id;
      const expectedSeat = seat;
      const expectedPhase = this.currentHand?.phase;
      
      logger.info('Human turn timer started', {
        tableId: this.id,
        playerId: playerId.substring(0, 8),
        seat,
        name: player.name,
        durationSeconds: duration,
        delayMs,
        phase: this.currentHand?.phase,
        handId: expectedHandId?.substring(0, 8)
      });
      
      this.actionTimer = setTimeout(() => {
        // CRITICAL FIX: First check hand ID - this is the most reliable validation
        // If hand has changed, this timer is definitely stale
        if (this.currentHand?.id !== expectedHandId) {
          logger.info('Timer callback: Ignoring - hand changed', {
            expectedHandId: expectedHandId?.substring(0, 8),
            currentHandId: this.currentHand?.id?.substring(0, 8)
          });
          return;
        }
        
        // Additional validations for safety
        if (this.currentHand?.phase === 'showdown') {
          logger.info('Timer callback: Ignoring - now in showdown phase');
          return;
        }
        if (this.currentHand?.currentPlayerSeat !== expectedSeat) {
          logger.info('Timer callback: Ignoring - seat changed', {
            expectedSeat,
            currentSeat: this.currentHand?.currentPlayerSeat
          });
          return;
        }
        if (this.currentHand?.phase !== expectedPhase) {
          logger.info('Timer callback: Ignoring - phase changed', {
            expectedPhase,
            currentPhase: this.currentHand?.phase
          });
          return;
        }
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
   * Handle player timeout - POKERSTARS STYLE
   * 
   * Key Principles:
   * 1. Server is authoritative - client NEVER triggers auto-fold
   * 2. Time bank activates ONLY after main timer expires (not concurrent)
   * 3. Graceful timeout: auto-CHECK if possible, otherwise auto-FOLD
   * 4. After 2 missed turns, player is set to sitting_out
   * 5. Time bank is separate from main timer and persists across hands
   */
  private async handleTimeout(): Promise<void> {
    // Guard 1: Never process timeout during showdown
    if (this.currentHand?.phase === 'showdown') {
      logger.info('handleTimeout: Ignoring - in showdown phase');
      return;
    }
    
    // Guard 2: Must have active hand with current player
    if (!this.currentHand || this.currentHand.currentPlayerSeat === null) {
      logger.info('handleTimeout: Ignoring - no active hand or current player');
      return;
    }

    const seat = this.currentHand.currentPlayerSeat;
    const playerId = this.seats[seat];
    
    // Guard 3: Must have valid player ID for seat
    if (!playerId) {
      logger.warn('handleTimeout: No player ID for seat', { seat });
      return;
    }

    const player = this.players.get(playerId) ?? null;

    // Guard 4: Must have player object
    if (!player) {
      logger.warn('handleTimeout: missing player state, ignoring', {
        tableId: this.id,
        playerId: playerId.substring(0, 8),
        seat
      });
      return;
    }
    
    // Guard 5: Player must not be folded or all-in
    if (player.isFolded || player.isAllIn) {
      logger.info('handleTimeout: Ignoring - player already folded or all-in', {
        playerId: playerId.substring(0, 8),
        isFolded: player.isFolded,
        isAllIn: player.isAllIn
      });
      return;
    }

    const isBot = this.isBotPlayer(player);

    // Bots: use professional AI to make decisions
    if (isBot) {
      await this.executeBotDecision(player);
      return;
    }

    // Clamp negative time bank (safety)
    if (player.timeBank < 0) {
      logger.warn('CRITICAL: timeBank was negative, clamping', {
        playerId: playerId.substring(0, 8),
        timeBank: player.timeBank
      });
      player.timeBank = 0;
    }

    // POKERSTARS-STYLE TIME BANK ACTIVATION RULES:
    // Time Bank activates ONLY when:
    // 1. Main timer expires (this function is called)
    // 2. Player has Time Bank remaining
    // 3. Player has money invested in the pot (including blinds/antes)
    //    - If no money invested: auto-fold WITHOUT using Time Bank
    //    - This prevents abuse of Time Bank by limpers who haven't contributed
    const isTimeBankPhase = this.currentHand.isTimeBankPhase;
    
    // Check if player has money in pot (PokerStars rule)
    const hasMoneyInPot = player.currentBet > 0;
    const isBlindsPlayer = seat === this.currentHand.smallBlindSeat || 
                           seat === this.currentHand.bigBlindSeat;
    const hasAnteInvested = (this.config.ante ?? 0) > 0;
    const hasInvestment = hasMoneyInPot || isBlindsPlayer || hasAnteInvested;
    
    if (!isTimeBankPhase && player.timeBank > 0 && hasInvestment) {
      // Main timer expired AND player has investment - enter time bank phase
      this.currentHand.isTimeBankPhase = true;
      
      logger.info('POKERSTARS: Time Bank eligible - player has investment', {
        playerId: playerId.substring(0, 8),
        currentBet: player.currentBet,
        isBlindsPlayer,
        hasAnteInvested,
        timeBank: player.timeBank
      });
      
      // Use time bank for next timer slice - POKERSTARS-STYLE with phase-aware limit
      const phaseActionTime = this.getActionTimeForPhase();
      const timeToUse = Math.min(player.timeBank, phaseActionTime);
      player.timeBank = Math.max(0, player.timeBank - timeToUse);
      player.timeBankUsedThisAction = timeToUse;

      this.emit('time_bank_activated', {
        playerId,
        timeUsed: timeToUse,
        remaining: player.timeBank
      });

      logger.info('POKERSTARS: Time bank ACTIVATED', {
        playerId: playerId.substring(0, 8),
        timeUsedSeconds: timeToUse,
        remainingTimeBank: player.timeBank
      });

      // CRITICAL: Reset actionStartTime for time bank phase
      const timeBankStartTime = Date.now();
      this.currentHand.actionStartTime = timeBankStartTime;
      
      // CRITICAL FIX: Sync action_started_at to DB for time bank phase
      this.supabase
        .from('poker_hands')
        .update({
          action_started_at: new Date(timeBankStartTime).toISOString()
        })
        .eq('id', this.currentHand.id)
        .then(({ error }) => {
          if (error) {
            logger.warn('Failed to sync action_started_at to DB (time bank)', { error: error.message });
          }
        });

      // Start time bank timer
      if (timeToUse > 0) {
        this.startActionTimer(timeToUse);
        
        // Emit state update so client knows we're in time bank phase
        this.emit('state_update', {
          handId: this.currentHand.id, // POKERSTARS: For card deal animation sync
          pot: this.currentHand.pot,
          currentBet: this.currentHand.currentBet,
          currentPlayerSeat: this.currentHand.currentPlayerSeat,
          phase: this.currentHand.phase,
          isTimeBankPhase: true,
          timeRemaining: timeToUse,
          actionStartTime: timeBankStartTime
        });
        return;
      }
    }
    
    // POKERSTARS-STYLE: Player timed out without Time Bank protection
    // Two scenarios:
    // 1. No Time Bank remaining -> graceful auto-action
    // 2. Has Time Bank but NO investment in pot -> auto-fold WITHOUT using Time Bank
    
    // Log reason for no Time Bank activation
    if (!isTimeBankPhase && player.timeBank > 0 && !hasInvestment) {
      logger.info('POKERSTARS: Time Bank NOT activated - no pot investment', {
        playerId: playerId.substring(0, 8),
        timeBank: player.timeBank,
        currentBet: player.currentBet,
        phase: this.currentHand?.phase
      });
    }

    // Reset time bank phase flag
    if (this.currentHand) {
      this.currentHand.isTimeBankPhase = false;
    }
    player.timeBankUsedThisAction = 0;

    // Increment missed turns counter BEFORE any action
    player.missedTurns++;

    logger.info('POKERSTARS: Player timed out completely', { 
      playerId: playerId.substring(0, 8), 
      missedTurns: player.missedTurns,
      timeBank: player.timeBank,
      hadInvestment: hasInvestment,
      phase: this.currentHand?.phase
    });

    // POKERSTARS-STYLE: After 1 timeout, set player to sitting_out IMMEDIATELY
    // CRITICAL: Must happen BEFORE auto-action so future turns auto-fold instantly
    if (player.missedTurns >= 1) {
      logger.info('POKERSTARS: Player auto sitting out after timeout', {
        playerId: playerId.substring(0, 8),
        missedTurns: player.missedTurns
      });
      player.status = 'sitting_out';
      player.sitOutAt = Date.now();
      
      // Update database synchronously for consistency
      this.supabase
        .from('poker_table_players')
        .update({ 
          status: 'sitting_out',
          sit_out_at: new Date().toISOString(),
          missed_turns: player.missedTurns
        })
        .eq('table_id', this.id)
        .eq('player_id', playerId)
        .then(({ error }) => {
          if (error) logger.warn('Failed to update sit-out status in DB', { error: error.message });
        });
      
      this.emit('player_sitting_out', {
        playerId,
        reason: 'timeout',
        missedTurns: player.missedTurns
      });
    }

    // GRACEFUL TIMEOUT (PokerStars style):
    // 1. If check is possible -> auto-CHECK
    // 2. Otherwise -> auto-FOLD
    const canCheck = player.currentBet >= this.currentHand.currentBet;
    const autoAction = canCheck ? 'check' : 'fold';

    logger.warn('POKERSTARS: Graceful auto-action', {
      playerId: playerId.substring(0, 8),
      action: autoAction,
      canCheck,
      playerBet: player.currentBet,
      currentBet: this.currentHand.currentBet,
      missedTurns: player.missedTurns,
      isSittingOut: player.status === 'sitting_out'
    });

    await this.action(playerId, autoAction);

    this.emit('timeout', { playerId, action: autoAction, missedTurns: player.missedTurns, isSittingOut: player.status === 'sitting_out' });
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
      bombPotVotingActive: this.bombPotVotingActive,
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
    
    // Bomb Pot is now automatic (industry-style) - no voting delay
    
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
      const BUILD_TAG = process.env.BUILD_TAG || 'lovable-build-2026-01-15-pokerstars-timer-sync';
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
   * POKERSTARS-STYLE: Uses atomic_start_hand RPC for race condition protection
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
      // CRITICAL FIX: Always refresh blinds from DB before starting a hand
      // This ensures tournament blind increases are applied even if Realtime subscription missed the UPDATE
      await this.refreshBlindsFromDatabase();
      
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
        
        // Initial fold status - waitForBB will be checked after BB position is determined
        player.isFolded = player.status !== 'active' || player.stack <= 0;
      }
      
      // Get players that could potentially play (for BB position calculation)
      const potentialPlayers = Array.from(this.players.values())
        .filter(p => p.status === 'active' && p.stack > 0);
      
      // POKERSTARS-STYLE: Pre-calculate BB position to check waitForBB players
      // This determines which seat will be BB BEFORE we filter out waitForBB players
      const seatNumbers = potentialPlayers.map(p => p.seatNumber).sort((a, b) => a - b);
      let estimatedBBSeat: number | null = null;
      
      if (seatNumbers.length >= 2) {
        // Find next dealer after current
        let nextDealerIdx = 0;
        for (let i = 0; i < seatNumbers.length; i++) {
          if (seatNumbers[i] > previousDealerSeat) {
            nextDealerIdx = i;
            break;
          }
          if (i === seatNumbers.length - 1) {
            nextDealerIdx = 0; // Wrap around
          }
        }
        
        // BB is 2 positions after dealer (or 1 in heads-up)
        if (seatNumbers.length === 2) {
          estimatedBBSeat = seatNumbers[nextDealerIdx]; // Dealer is BB in heads-up
        } else {
          const bbIdx = (nextDealerIdx + 2) % seatNumbers.length;
          estimatedBBSeat = seatNumbers[bbIdx];
        }
      }
      
      // POKERSTARS-STYLE: Check waitForBB players - if they're at BB position, clear the flag
      for (const player of this.players.values()) {
        if (player.waitForBB && player.seatNumber === estimatedBBSeat) {
          // Player is now at BB position - they can play!
          player.waitForBB = false;
          player.isFolded = false;
          
          logger.info('POKERSTARS: Player waitForBB cleared - now at BB position', {
            playerId: player.id.substring(0, 8),
            seatNumber: player.seatNumber,
            estimatedBBSeat
          });
          
          // Update database to clear the flag
          this.supabase
            .from('poker_table_players')
            .update({ wait_for_bb: false })
            .eq('table_id', this.id)
            .eq('player_id', player.id)
            .then(({ error }) => {
              if (error) logger.warn('Failed to clear wait_for_bb in DB', { error: error.message });
            });
        } else if (player.waitForBB) {
          // Still waiting - mark as folded for this hand
          player.isFolded = true;
        }
      }
      
      // POKERSTARS-STYLE: Determine if this is a tournament
      const isTournament = !!this.config.tournamentId;
      
      // Get players for the hand
      // TOURNAMENT MODE: Include sitting-out players (they get cards but auto-fold)
      // CASH GAME MODE: Only active players participate
      let activePlayers: Player[];
      let sitOutAutoFoldPlayers: Player[] = [];
      
      if (isTournament) {
        // In tournaments: all players with stack > 0 participate
        // Sitting-out players get cards dealt but immediately fold
        activePlayers = Array.from(this.players.values())
          .filter(p => p.stack > 0 && !p.waitForBB);
        
        // Mark sit-out players as folded but they will receive cards for authenticity
        sitOutAutoFoldPlayers = activePlayers.filter(p => p.status === 'sitting_out');
        
        for (const sitOutPlayer of sitOutAutoFoldPlayers) {
          sitOutPlayer.isFolded = true; // They fold immediately after receiving cards
        }
        
        logger.info('POKERSTARS TOURNAMENT: Including sit-out players for card dealing', {
          activeCount: activePlayers.length,
          sitOutCount: sitOutAutoFoldPlayers.length,
          sitOutPlayers: sitOutAutoFoldPlayers.map(p => p.id.substring(0, 8))
        });
      } else {
        // Cash games: only active players (no sitting-out)
        activePlayers = Array.from(this.players.values())
          .filter(p => !p.isFolded && p.stack > 0);
      }
      
      // Verify we have enough players
      // For engine, we need at least 2 players who are NOT folded
      const nonFoldedPlayers = activePlayers.filter(p => !p.isFolded);
      if (nonFoldedPlayers.length < 2) {
        logger.warn('Not enough active players to start hand', { 
          count: nonFoldedPlayers.length,
          required: 2
        });
        return;
      }
      
      logger.info('=== STARTING NEW HAND ===', {
        tableId: this.id,
        handNumber: this.handNumber,
        dealerSeat: this.dealerSeat,
        estimatedBBSeat,
        isTournament,
        activePlayers: activePlayers.map(p => ({
          id: p.id.substring(0, 8),
          name: p.name,
          seat: p.seatNumber,
          stack: p.stack,
          status: p.status,
          isFolded: p.isFolded,
          waitForBB: p.waitForBB
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
      
      // Prepare engine options for pro features
      const engineOptions: {
        isBombPot?: boolean;
        bombPotAmount?: number;
        straddleSeat?: number;
        straddleAmount?: number;
      } = {};
      
      // BOMB POT: Check if this hand is a bomb pot
      if (this.nextHandIsBombPot) {
        const bombPotMultiplier = this.config.bombPotMultiplier || 2;
        engineOptions.isBombPot = true;
        engineOptions.bombPotAmount = this.config.bigBlind * bombPotMultiplier;
        this.nextHandIsBombPot = false;
        
        logger.info('BOMB POT: Starting bomb pot hand', {
          multiplier: bombPotMultiplier,
          amount: engineOptions.bombPotAmount
        });
      }
      
      // STRADDLE: Check if we have a pending straddle
      if (this.pendingStraddle) {
        engineOptions.straddleSeat = this.pendingStraddle.seat;
        engineOptions.straddleAmount = this.pendingStraddle.amount;
        
        logger.info('STRADDLE: Posting straddle', this.pendingStraddle);
        this.pendingStraddle = null;
      }
      
      // Start new hand with engine v3 (may throw if validation fails)
      // Pass PREVIOUS dealer seat - engine will calculate next dealer
      const engineState = this.engine.startNewHand(enginePlayers, previousDealerSeat, engineOptions);
      
      // Update local dealerSeat from engine calculation
      this.dealerSeat = engineState.dealerSeat;
      
      // POKERSTARS-STYLE: Track orbits for sit-out players and missed blinds
      await this.trackSitOutOrbitsAndMissedBlinds(
        engineState.dealerSeat, 
        engineState.smallBlindSeat, 
        engineState.bigBlindSeat
      );
      
      // Update lastDealerSeat after tracking orbits
      this.lastDealerSeat = this.dealerSeat;
      
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
        // POKERSTARS-STYLE: Track action timing precisely
        actionStartTime: Date.now(),
        isTimeBankPhase: false, // Main timer first, time bank only after it expires
        actionTimeTotal: this.getActionTimeForPhase(), // Cache the initial action time
        playersActedThisRound: new Set(),
        // POKERSTARS-STYLE HAND HISTORY: Initialize action log
        actionLog: []
      };
      
      // POKERSTARS-STYLE HAND HISTORY: Record blind posts as actions
      // These are the first entries in the action log
      let actionOrder = 0;
      
      // Find SB and BB players
      const sbPlayer = activePlayers.find(p => p.seatNumber === engineState.smallBlindSeat);
      const bbPlayer = activePlayers.find(p => p.seatNumber === engineState.bigBlindSeat);
      
      if (sbPlayer) {
        this.currentHand.actionLog.push({
          playerId: sbPlayer.id,
          playerName: sbPlayer.name,
          seatNumber: sbPlayer.seatNumber,
          phase: 'preflop',
          actionType: 'posts_sb',
          amount: this.config.smallBlind,
          timestamp: Date.now(),
          actionOrder: actionOrder++
        });
      }
      
      if (bbPlayer) {
        this.currentHand.actionLog.push({
          playerId: bbPlayer.id,
          playerName: bbPlayer.name,
          seatNumber: bbPlayer.seatNumber,
          phase: 'preflop',
          actionType: 'posts_bb',
          amount: this.config.bigBlind,
          timestamp: Date.now(),
          actionOrder: actionOrder++
        });
      }
      
      // Record antes if configured
      if (this.config.ante && this.config.ante > 0) {
        for (const player of activePlayers) {
          this.currentHand.actionLog.push({
            playerId: player.id,
            playerName: player.name,
            seatNumber: player.seatNumber,
            phase: 'preflop',
            actionType: 'posts_ante',
            amount: this.config.ante,
            timestamp: Date.now(),
            actionOrder: actionOrder++
          });
        }
      }
      
      logger.info('HAND HISTORY: Recorded blind posts', {
        handId: this.currentHand.id,
        actionCount: this.currentHand.actionLog.length,
        actions: this.currentHand.actionLog.map(a => ({ type: a.actionType, player: a.playerName, amount: a.amount }))
      });
      
      // POKERSTARS-STYLE: Reset per-action time bank tracking and replenish if eligible
      for (const player of activePlayers) {
        player.timeBankUsedThisAction = 0;
        player.handsPlayedSinceLastTimeBank++;
        
        // POKERSTARS-STYLE: Replenish time bank with MAX limit enforcement
        const timeBankConfig = this.timings.timeBank;
        if (player.handsPlayedSinceLastTimeBank >= timeBankConfig.replenishEveryNHands) {
          const newTimeBank = Math.min(
            player.timeBank + timeBankConfig.replenishAmount,
            timeBankConfig.max  // CRITICAL: Cannot exceed MAX (120s like PokerStars)
          );
          
          if (newTimeBank > player.timeBank) {
            logger.info('POKERSTARS: Time bank replenished (with MAX limit)', {
              playerId: player.id.substring(0, 8),
              previousTimeBank: player.timeBank,
              newTimeBank: newTimeBank,
              maxTimeBank: timeBankConfig.max,
              replenishAmount: timeBankConfig.replenishAmount
            });
            player.timeBank = newTimeBank;
          }
          
          player.handsPlayedSinceLastTimeBank = 0;
        }
      }
      
      // Get dealt hole cards from engine state
      for (const player of activePlayers) {
        const enginePlayer = engineState.players.find(ep => ep.id === player.id);
        if (enginePlayer) {
          player.holeCards = enginePlayer.holeCards || [];
          player.currentBet = enginePlayer.currentBet || 0;
        }
      }
      
      // POKERSTARS-STYLE: Use atomic_start_hand RPC for race condition protection
      // This atomically closes any stale hands and creates new one in single transaction
      try {
        const { data: atomicResult, error: atomicError } = await this.supabase.rpc('atomic_start_hand', {
          p_table_id: this.id,
          p_dealer_seat: this.currentHand.dealerSeat,
          p_small_blind_seat: this.currentHand.smallBlindSeat,
          p_big_blind_seat: this.currentHand.bigBlindSeat,
          p_deck_state: null
        });
        
        if (atomicError) {
          logger.error('atomic_start_hand RPC failed, falling back to direct insert', { 
            error: atomicError.message,
            tableId: this.id
          });
          // Fallback to direct insert
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
          });
          
          await this.supabase
            .from('poker_tables')
            .update({
              current_hand_id: this.currentHand.id,
              status: 'playing',
              updated_at: new Date().toISOString()
            })
            .eq('id', this.id);
        } else if (atomicResult?.success) {
          // Use the hand_id from atomic operation
          const atomicHandId = atomicResult.hand_id;
          const closedStaleHands = atomicResult.closed_stale_hands || 0;
          
          // Update our local hand ID to match DB
          this.currentHand.id = atomicHandId;
          this.currentHand.handNumber = atomicResult.hand_number || this.handNumber;
          
          if (closedStaleHands > 0) {
            logger.warn('POKERSTARS: Closed stale hands before starting new one', {
              tableId: this.id,
              closedCount: closedStaleHands,
              newHandId: atomicHandId
            });
          }
          
          // CRITICAL FIX: Update hand with engine-calculated values (pot, current_player_seat, current_bet)
          // atomic_start_hand only creates skeleton hand - we need to sync the actual game state
          // Also sync action_started_at to prevent watchdog false positives
          const { error: syncError } = await this.supabase
            .from('poker_hands')
            .update({
              pot: this.currentHand.pot,
              current_bet: this.currentHand.currentBet,
              current_player_seat: this.currentHand.currentPlayerSeat,
              action_started_at: new Date(this.currentHand.actionStartTime || Date.now()).toISOString()
            })
            .eq('id', atomicHandId);
          
          if (syncError) {
            logger.warn('Failed to sync hand state after atomic create', { 
              error: syncError.message,
              handId: atomicHandId
            });
          }
          
          logger.info('POKERSTARS: Hand created via atomic RPC', {
            tableId: this.id,
            handId: atomicHandId,
            handNumber: atomicResult.hand_number,
            pot: this.currentHand.pot,
            currentBet: this.currentHand.currentBet,
            currentPlayerSeat: this.currentHand.currentPlayerSeat
          });
        } else {
          // RPC returned error (e.g., race condition)
          logger.error('atomic_start_hand returned failure', { 
            result: atomicResult,
            tableId: this.id
          });
          throw new Error(atomicResult?.error || 'Atomic hand start failed');
        }

        // CRITICAL:
        // Emit `hand_started` ONLY AFTER atomic_start_hand finishes.
        // Otherwise, the server can change currentHand.id (atomicHandId) mid-hand,
        // and the frontend will interpret it as a brand new hand and replay deal animations
        // (exactly the “repeat once after first action after BB” symptom).
        // Cards are sent player-specific via getPlayerState() in WebSocket handler.
        this.emit('hand_started', {
          handId: this.currentHand.id,
          handNumber: this.currentHand.handNumber,
          dealerSeat: this.dealerSeat,
          smallBlindSeat: this.currentHand.smallBlindSeat,
          bigBlindSeat: this.currentHand.bigBlindSeat,
          pot: this.currentHand.pot,
          currentBet: this.currentHand.currentBet,
          currentPlayerSeat: this.currentHand.currentPlayerSeat,
          phase: this.currentHand.phase || 'preflop',
          players: activePlayers.map(p => ({
            id: p.id,
            name: p.name,
            seatNumber: p.seatNumber,
            stack: p.stack,
            currentBet: p.currentBet,
            hasCards: p.holeCards.length > 0
          }))
        });

        logger.info('Hand started - cards dealt', {
          tableId: this.id,
          handId: this.currentHand.id,
          handNumber: this.currentHand.handNumber,
          playersWithCards: activePlayers.filter(p => p.holeCards.length > 0).map(p => ({
            id: p.id.substring(0, 8),
            cardCount: p.holeCards.length
          }))
        });

        // POKERSTARS TOURNAMENT-STYLE: Emit auto-fold for sitting-out players
        // They received cards but immediately folded
        if (sitOutAutoFoldPlayers.length > 0) {
          for (const sitOutPlayer of sitOutAutoFoldPlayers) {
            // Record auto-fold in action log
            this.currentHand.actionLog.push({
              playerId: sitOutPlayer.id,
              playerName: sitOutPlayer.name,
              seatNumber: sitOutPlayer.seatNumber,
              phase: 'preflop',
              actionType: 'auto_fold_sit_out',
              amount: 0,
              timestamp: Date.now(),
              actionOrder: this.currentHand.actionLog.length
            });

            this.emit('player_auto_fold', {
              playerId: sitOutPlayer.id,
              reason: 'sitting_out',
              holeCards: sitOutPlayer.holeCards // Cards were dealt but player folded
            });

            logger.info('POKERSTARS TOURNAMENT: Sit-out player auto-folded', {
              playerId: sitOutPlayer.id.substring(0, 8),
              seatNumber: sitOutPlayer.seatNumber,
              holeCards: sitOutPlayer.holeCards
            });
          }
        }
        
        // CRITICAL FIX: Insert poker_hand_players records for each active player
        const handPlayersToInsert = activePlayers.map(p => ({
          hand_id: this.currentHand!.id,
          player_id: p.id,
          seat_number: p.seatNumber,
          stack_start: p.stack,
          hole_cards: p.holeCards,
          bet_amount: p.currentBet,
          is_folded: p.isFolded,
          is_all_in: p.isAllIn
        }));
        
        if (handPlayersToInsert.length > 0) {
          const { error: handPlayersError } = await this.supabase
            .from('poker_hand_players')
            .insert(handPlayersToInsert);
          
          if (handPlayersError) {
            logger.warn('Failed to insert hand players', { error: handPlayersError.message });
          } else {
            logger.info('Hand players saved to database', {
              handId: this.currentHand!.id,
              playerCount: handPlayersToInsert.length
            });
          }
        }
          
        logger.info('POKERSTARS: Hand saved to database atomically', {
          tableId: this.id,
          handId: this.currentHand.id
        });
      } catch (dbErr) {
        logger.error('Failed to save hand at start', { error: String(dbErr), tableId: this.id });
        // Don't continue with broken hand - reset and retry
        this.currentHand = null;
        setTimeout(() => this.checkStartHand(), 5000);
        return;
      }
      
      // POKERSTARS/TDA: Engine already detected all-in showdown case (currentPlayerSeat === -1)
      // This means no player can act - proceed directly to showdown
      if (this.currentHand.currentPlayerSeat === -1) {
        logger.info('POKERSTARS: Engine detected all-in showdown (currentPlayerSeat = -1)', {
          tableId: this.id,
          handNumber: this.handNumber,
          pot: this.currentHand.pot
        });
        
        await this.proceedToAllInShowdown(activePlayers);
        return;
      }
      
      // CRITICAL FIX: Check if all remaining players are all-in after blinds
      // This happens when short stack posted blind as all-in (e.g., stack < BB in heads-up)
      // In this case, we should immediately proceed to showdown
      const remainingPlayers = activePlayers.filter(p => !p.isFolded);
      const allInPlayers = remainingPlayers.filter(p => p.isAllIn);
      const canActPlayers = remainingPlayers.filter(p => !p.isAllIn && p.stack > 0);
      
      if (canActPlayers.length <= 1 && allInPlayers.length > 0 && remainingPlayers.length >= 2) {
        // Either everyone is all-in, or only one player can act (and others are all-in)
        // If only one can act and they are the BB with no raise to call, give them option
        const bbPlayer = remainingPlayers.find(p => p.seatNumber === this.currentHand!.bigBlindSeat);
        const hasRaiseToCall = allInPlayers.some(p => p.currentBet > this.config.bigBlind);
        
        if (canActPlayers.length === 0 || 
            (canActPlayers.length === 1 && canActPlayers[0].id !== bbPlayer?.id) ||
            (canActPlayers.length === 1 && !hasRaiseToCall && canActPlayers[0].currentBet >= this.currentHand!.currentBet)) {
          
          logger.info('POKERSTARS: All players all-in after blinds, skipping to showdown', {
            tableId: this.id,
            handNumber: this.handNumber,
            remainingCount: remainingPlayers.length,
            allInCount: allInPlayers.length,
            canActCount: canActPlayers.length
          });
          
          // Skip directly to showdown - deal all community cards and determine winner
          await this.proceedToAllInShowdown(activePlayers);
          return;
        }
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
   * POKERSTARS/TDA RULE 16: All-In Showdown
   * When all players are all-in after blinds (no further betting action possible),
   * immediately deal remaining community cards and determine winner.
   * "All hands will be tabled without delay once a player is all-in and 
   *  all betting action by all other players in the hand is complete."
   * 
   * This handles heads-up scenario where SB goes all-in while posting blind
   * (stack < SB amount) - BB has no option, proceed directly to showdown.
   */
  private async proceedToAllInShowdown(activePlayers: Player[]): Promise<void> {
    if (!this.currentHand) {
      logger.error('proceedToAllInShowdown: No current hand');
      return;
    }

    // CRITICAL FIX: Update action_started_at to prevent watchdog false positives
    // All-in showdown can take 6+ seconds with animations, need to tell DB hand is active
    const allInShowdownStartTime = Date.now();
    this.currentHand.actionStartTime = allInShowdownStartTime;
    
    // Sync to database immediately
    await this.supabase
      .from('poker_hands')
      .update({
        action_started_at: new Date(allInShowdownStartTime).toISOString(),
        phase: 'showdown', // Mark as showdown phase to exclude from stuck hand checks
        current_player_seat: null // No one to act during all-in showdown
      })
      .eq('id', this.currentHand.id);
    
    logger.info('=== POKERSTARS ALL-IN SHOWDOWN ===', {
      tableId: this.id,
      handNumber: this.handNumber,
      pot: this.currentHand.pot,
      currentBet: this.currentHand.currentBet,
      playerCount: activePlayers.length,
      players: activePlayers.map(p => ({
        id: p.id.substring(0, 8),
        name: p.name,
        stack: p.stack,
        currentBet: p.currentBet,
        isAllIn: p.isAllIn,
        holeCards: p.holeCards?.length || 0
      }))
    });

    // Step 1: Emit all-in showdown event (TDA Rule 16: cards tabled immediately)
    this.emit('all_in_showdown', {
      handNumber: this.handNumber,
      players: activePlayers.filter(p => !p.isFolded).map(p => ({
        playerId: p.id,
        name: p.name,
        seatNumber: p.seatNumber,
        holeCards: p.holeCards,
        stack: p.stack,
        isAllIn: p.isAllIn
      })),
      pot: this.currentHand.pot
    });

    // POKERSTARS-STYLE: Longer delay for card reveal animation (1 second)
    await this.delay(1000);

    // Step 2: Deal remaining community cards (flop → turn → river)
    // Get deck from engine state
    const engineState = this.engine.getState();
    if (!engineState) {
      logger.error('proceedToAllInShowdown: No engine state');
      return;
    }

    let deck = [...engineState.deck];
    const communityCards: string[] = [];
    const playerCount = activePlayers.length;

    // POKERSTARS-STYLE: All-in showdown with burn card visuals and proper delays
    
    // Deal flop (3 cards) - burn 1, deal 3
    if (deck.length >= 4) {
      const burnCard = deck.shift()!; // burn
      
      // Emit burn card event for visual animation
      this.emit('burn_card', {
        handNumber: this.handNumber,
        phase: 'flop',
        isAllInShowdown: true
      });
      
      // Delay for burn card animation (PokerStars: ~500ms for all-in showdown)
      await this.delay(500);
      
      communityCards.push(deck.shift()!, deck.shift()!, deck.shift()!);
      
      this.currentHand.communityCards = [...communityCards];
      this.currentHand.phase = 'flop';
      
      this.emit('community_cards', {
        phase: 'flop',
        cards: communityCards,
        handNumber: this.handNumber,
        isAllInShowdown: true
      });
      
      logger.info('All-in showdown: Flop dealt', { cards: communityCards });
      // POKERSTARS-STYLE: Longer pause after flop during all-in (~1.5s for dramatic effect)
      await this.delay(1500);
    }

    // Deal turn (1 card) - burn 1, deal 1
    if (deck.length >= 2) {
      const burnCard = deck.shift()!; // burn
      
      // Emit burn card event for visual animation
      this.emit('burn_card', {
        handNumber: this.handNumber,
        phase: 'turn',
        isAllInShowdown: true
      });
      
      // POKERSTARS-STYLE: Longer delay for burn card during all-in (~600ms)
      await this.delay(600);
      
      const turnCard = deck.shift()!;
      communityCards.push(turnCard);
      
      this.currentHand.communityCards = [...communityCards];
      this.currentHand.phase = 'turn';
      
      this.emit('community_cards', {
        phase: 'turn',
        cards: communityCards,
        handNumber: this.handNumber,
        isAllInShowdown: true
      });
      
      logger.info('All-in showdown: Turn dealt', { card: turnCard });
      // POKERSTARS-STYLE: Longer pause after turn during all-in (~1.2s for dramatic effect)
      await this.delay(1200);
    }

    // Deal river (1 card) - burn 1, deal 1
    if (deck.length >= 2) {
      const burnCard = deck.shift()!; // burn
      
      // Emit burn card event for visual animation
      this.emit('burn_card', {
        handNumber: this.handNumber,
        phase: 'river',
        isAllInShowdown: true
      });
      
      // POKERSTARS-STYLE: Longer delay for burn card during all-in (~600ms)
      await this.delay(600);
      
      const riverCard = deck.shift()!;
      communityCards.push(riverCard);
      
      this.currentHand.communityCards = [...communityCards];
      this.currentHand.phase = 'river';
      
      this.emit('community_cards', {
        phase: 'river',
        cards: communityCards,
        handNumber: this.handNumber,
        isAllInShowdown: true
      });
      
      logger.info('All-in showdown: River dealt', { card: riverCard });
      // POKERSTARS-STYLE: Longer pause after river during all-in (~1.2s for dramatic effect)
      await this.delay(1200);
    }

    // Step 3: Move to showdown phase
    this.currentHand.phase = 'showdown';
    this.currentHand.currentPlayerSeat = null as any; // No one to act

    // Step 4: Evaluate all hands and determine winner(s)
    const showdownPlayers = activePlayers.filter(p => !p.isFolded && p.holeCards.length >= 2);
    
    if (showdownPlayers.length === 0) {
      logger.error('proceedToAllInShowdown: No players with cards for showdown');
      return;
    }

    // Evaluate each player's hand
    const evaluatedPlayers: Array<{
      playerId: string;
      name: string;
      seatNumber: number;
      holeCards: string[];
      handRank: number;
      handName: string;
      bestCards: string[];
      contribution: number;
    }> = [];

    for (const player of showdownPlayers) {
      try {
        const result = evaluateHand(player.holeCards, communityCards);
        evaluatedPlayers.push({
          playerId: player.id,
          name: player.name,
          seatNumber: player.seatNumber,
          holeCards: player.holeCards,
          handRank: result.handRank,
          handName: result.handName,
          bestCards: result.bestCards || [],
          contribution: player.currentBet
        });
        
        logger.info('Hand evaluated:', {
          playerId: player.id.substring(0, 8),
          name: player.name,
          holeCards: player.holeCards,
          handName: result.handName,
          handRank: result.handRank
        });
      } catch (e) {
        logger.error('Failed to evaluate hand:', { 
          playerId: player.id.substring(0, 8),
          error: String(e)
        });
      }
    }

    // Sort by hand rank (higher is better)
    evaluatedPlayers.sort((a, b) => b.handRank - a.handRank);

    // Step 5: Calculate side pots and distribute winnings
    // For all-in scenarios, we need proper side pot calculation
    const pot = this.currentHand.pot;
    const winners: { playerId: string; amount: number; handName: string }[] = [];

    if (evaluatedPlayers.length > 0) {
      // Simple case: find the best hand(s)
      const bestRank = evaluatedPlayers[0].handRank;
      const winningPlayers = evaluatedPlayers.filter(p => p.handRank === bestRank);
      
      // Calculate side pots for proper distribution
      // Get all unique contribution levels
      const contributions = [...new Set(showdownPlayers.map(p => p.currentBet))].sort((a, b) => a - b);
      
      let remainingPot = pot;
      const playerWinnings = new Map<string, number>();
      
      // Process each pot level
      let previousLevel = 0;
      for (const level of contributions) {
        const levelContribution = level - previousLevel;
        
        // Find players eligible for this pot level
        const eligiblePlayers = showdownPlayers.filter(p => p.currentBet >= level);
        const levelPot = levelContribution * eligiblePlayers.length;
        
        // Find the best hand among eligible players
        const eligibleEvaluated = evaluatedPlayers.filter(ep => 
          eligiblePlayers.some(p => p.id === ep.playerId)
        );
        
        if (eligibleEvaluated.length > 0) {
          const bestInLevel = eligibleEvaluated[0].handRank;
          const levelWinners = eligibleEvaluated.filter(p => p.handRank === bestInLevel);
          
          // Split pot among winners
          const share = Math.floor(levelPot / levelWinners.length);
          const remainder = levelPot % levelWinners.length;
          
          for (let i = 0; i < levelWinners.length; i++) {
            const winAmount = share + (i === 0 ? remainder : 0); // First winner gets remainder
            const current = playerWinnings.get(levelWinners[i].playerId) || 0;
            playerWinnings.set(levelWinners[i].playerId, current + winAmount);
          }
        }
        
        previousLevel = level;
        remainingPot -= levelPot;
      }
      
      // Build final winners array
      for (const [playerId, amount] of playerWinnings) {
        const player = evaluatedPlayers.find(p => p.playerId === playerId);
        if (player && amount > 0) {
          winners.push({
            playerId,
            amount,
            handName: player.handName
          });
        }
      }
    }

    logger.info('All-in showdown winners:', {
      winnersCount: winners.length,
      totalPot: pot,
      winners: winners.map(w => ({
        playerId: w.playerId.substring(0, 8),
        amount: w.amount,
        handName: w.handName
      }))
    });

    // Step 6: Complete the hand using existing completeHand logic
    await this.completeHand(winners);
  }
  
  /**
   * Complete hand and distribute winnings
   * CRITICAL: Ensures stacks never go negative and properly awards pot
   */
  private async completeHand(winners: { playerId: string; amount: number; handName: string }[]): Promise<void> {
    // CRITICAL: Stop action timer immediately when entering showdown/completion
    // This prevents timeout events firing during winner animations
    this.clearActionTimer();
    
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
    
    // Save hand history with winners
    await this.saveHandHistory(winners, showdownPlayers);
    
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
    
    // CRITICAL FIX: Clear action timer BEFORE resetting hand state
    // This ensures no stale timers can trigger after hand is null
    this.clearActionTimer();
    
    // CRITICAL FIX: Remove players who left during the hand (sitting_out with pending leave)
    // This prevents "ghost players" from blocking table state and causing stuck hands
    // IMPORTANT: Tournament players are NEVER removed - they sit out and pay blinds
    const playersToRemove: string[] = [];
    for (const [playerId, player] of this.players) {
      // Only cash game players with pendingLeave should be removed
      if (player.status === 'sitting_out' && player.pendingLeave && !this.config.tournamentId) {
        playersToRemove.push(playerId);
        logger.info('POKERSTARS: Removing cash game player who left during hand', {
          playerId: playerId.substring(0, 8),
          name: player.name,
          seatNumber: player.seatNumber,
          stack: player.stack
        });
      }
    }
    
    // Actually remove pending-leave players (CASH GAMES ONLY)
    for (const playerId of playersToRemove) {
      const player = this.players.get(playerId);
      if (player) {
        // Clear seat
        this.seats[player.seatNumber] = null;
        
        // Return chips to balance for cash games
        if (player.stack > 0) {
          await this.returnChipsToBalance(playerId, player.stack);
        }
        
        // Remove from players map
        this.players.delete(playerId);
        
        // Remove from database
        await this.supabase
          .from('poker_table_players')
          .delete()
          .eq('table_id', this.id)
          .eq('player_id', playerId);
        
        this.emit('player_left', { playerId, stack: player.stack, reason: 'left_during_hand' });
      }
    }
    
    if (playersToRemove.length > 0) {
      logger.info('POKERSTARS: Cleaned up cash game players who left during hand', {
        tableId: this.id,
        removedCount: playersToRemove.length
      });
    }
    
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
    this.emit('state_update', {
      handId: null, // No active hand
      pot: 0,
      currentBet: 0,
      currentPlayerSeat: null,
      phase: 'waiting',
      isHandActive: false
    });
    
    // PRO FEATURE: Check if next hand should be a Bomb Pot (automatic, no voting)
    this.checkBombPotTrigger();
    
    // Check for next hand after configured auto-start delay (or default professional timing)
    const autoStartDelay = this.config.autoStartDelaySeconds;
    const delayMs = typeof autoStartDelay === 'number' 
      ? autoStartDelay * 1000 
      : this.timings.betweenHands;
    setTimeout(() => this.checkStartHand(), delayMs);
  }
  
  /**
   * HELPER: Clean up players who left during the hand
   * Extracted to avoid code duplication
   */
  private async cleanupPendingLeavePlayers(): Promise<void> {
    // POKERSTARS-STYLE: Only remove cash game players who left
    // Tournament players ALWAYS stay - they sit out and pay blinds until eliminated
    const playersToRemove: string[] = [];
    for (const [playerId, player] of this.players) {
      // Only remove cash game players with pendingLeave flag
      if (player.status === 'sitting_out' && player.pendingLeave && !this.config.tournamentId) {
        playersToRemove.push(playerId);
        logger.info('POKERSTARS: Cleaning up cash game player who left during hand', {
          playerId: playerId.substring(0, 8),
          name: player.name
        });
      }
    }
    
    for (const playerId of playersToRemove) {
      const player = this.players.get(playerId);
      if (player) {
        this.seats[player.seatNumber] = null;
        if (player.stack > 0) {
          await this.returnChipsToBalance(playerId, player.stack);
        }
        this.players.delete(playerId);
        await this.supabase
          .from('poker_table_players')
          .delete()
          .eq('table_id', this.id)
          .eq('player_id', playerId);
        this.emit('player_left', { playerId, stack: player.stack, reason: 'left_during_hand' });
      }
    }
    
    // Reset remaining player states
    for (const player of this.players.values()) {
      player.holeCards = [];
      player.currentBet = 0;
      player.isFolded = false;
      player.isAllIn = false;
    }
  }


  /**
   * Save hand history to database - POKERSTARS PROFESSIONAL LEVEL
   */
  private async saveHandHistory(
    winners: { playerId: string; amount: number; handName: string }[] = [],
    showdownPlayers: { playerId: string; holeCards: string[]; handName?: string }[] = []
  ): Promise<void> {
    if (!this.currentHand) return;
    
    const handId = this.currentHand.id;
    const actionLog = this.currentHand.actionLog;
    
    // Build winners JSON for storage
    const winnersJson = winners.map(w => {
      const player = this.players.get(w.playerId);
      return {
        playerId: w.playerId,
        playerName: player?.name || 'Unknown',
        amount: w.amount,
        handName: w.handName
      };
    });
    
    try {
      // 1. Update poker_hands with final data including winners
      await this.supabase.from('poker_hands').upsert({
        id: handId,
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
        winners: winnersJson,
        side_pots: this.currentHand.sidePots,
        completed_at: new Date().toISOString()
      }, { onConflict: 'id' });
      
      // 2. POKERSTARS-STYLE: Save ALL actions to poker_actions table
      if (actionLog.length > 0) {
        const actionsToInsert = actionLog.map(action => ({
          hand_id: handId,
          player_id: action.playerId,
          seat_number: action.seatNumber,
          phase: action.phase,
          action_type: action.actionType,
          amount: action.amount,
          action_order: action.actionOrder
        }));
        
        const { error: actionsError } = await this.supabase
          .from('poker_actions')
          .upsert(actionsToInsert, { onConflict: 'hand_id,action_order' });
        
        if (actionsError) {
          logger.warn('Failed to save actions', { error: actionsError.message, handId });
        } else {
          logger.info('HAND HISTORY: Actions saved to database', {
            handId,
            actionCount: actionsToInsert.length
          });
        }
      }
      
      // 3. Update poker_hand_players with final stacks, hole cards, won amounts, hand ranks
      for (const player of this.players.values()) {
        // Find if player is a winner
        const winnerInfo = winners.find(w => w.playerId === player.id);
        const showdownInfo = showdownPlayers.find(sp => sp.playerId === player.id);
        
        await this.supabase
          .from('poker_hand_players')
          .update({
            stack_end: player.stack,
            hole_cards: player.holeCards,
            is_folded: player.isFolded,
            is_all_in: player.isAllIn,
            bet_amount: player.currentBet,
            won_amount: winnerInfo?.amount || 0,
            hand_rank: showdownInfo?.handName || winnerInfo?.handName || null
          })
          .eq('hand_id', handId)
          .eq('player_id', player.id);
      }
      
      // 4. Clear current_hand_id from poker_tables to allow consolidation
      await this.supabase
        .from('poker_tables')
        .update({
          current_hand_id: null,
          status: 'waiting',
          current_dealer_seat: this.dealerSeat,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.id);
      
      logger.info('HAND HISTORY: Complete save finished', {
        tableId: this.id,
        handId,
        actionCount: actionLog.length,
        playerCount: this.players.size
      });
      
      // 5. Sync all player stacks to database after each hand
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
  private async advanceToNextPlayer(): Promise<void> {
    if (!this.currentHand) return;
    
    const activePlayers = this.getActivePlayersInHand();
    
    // Check if hand should end (only 1 player left)
    if (activePlayers.length <= 1) {
      logger.info('Only one player left after disconnect timeout, ending hand');
      await this.endHandWithWinner(activePlayers[0]?.id);
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
          // POKERSTARS-STYLE: Reset time bank phase for new player's turn
          this.currentHand.isTimeBankPhase = false;
          
          this.emit('turn_changed', {
            currentPlayerSeat: nextSeat,
            playerId,
            phase: this.currentHand.phase,
            // POKERSTARS-STYLE: Include timing info for instant timer reset
            actionStartTime: this.currentHand.actionStartTime,
            actionTimeTotal: this.getActionTimeForPhase(),
            isTimeBankPhase: false
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
   * CRITICAL: Must also clean up pending-leave players like completeHand does
   */
  private async endHandWithWinner(winnerId?: string): Promise<void> {
    if (!this.currentHand) return;
    
    // CRITICAL: If no winner or winner not found, still clean up properly
    if (!winnerId) {
      logger.warn('endHandWithWinner called without winnerId - aborting hand', {
        tableId: this.id,
        handId: this.currentHand.id
      });
      
      // Abort the hand and clear state
      await this.supabase
        .from('poker_hands')
        .update({ completed_at: new Date().toISOString(), phase: 'aborted' })
        .eq('id', this.currentHand.id);
      
      await this.supabase
        .from('poker_tables')
        .update({ current_hand_id: null, status: 'waiting', updated_at: new Date().toISOString() })
        .eq('id', this.id);
      
      this.clearActionTimer();
      this.currentHand = null;
      
      // Clean up pending leave players
      await this.cleanupPendingLeavePlayers();
      
      const autoStartDelay1 = this.config.autoStartDelaySeconds;
      const delayMs1 = typeof autoStartDelay1 === 'number' ? autoStartDelay1 * 1000 : this.timings.betweenHands;
      setTimeout(() => this.checkStartHand(), delayMs1);
      return;
    }
    
    const winner = this.players.get(winnerId);
    if (!winner) {
      logger.warn('endHandWithWinner: winner not found - aborting hand', {
        tableId: this.id,
        handId: this.currentHand.id,
        winnerId: winnerId.substring(0, 8)
      });
      
      // Same cleanup as above
      await this.supabase
        .from('poker_hands')
        .update({ completed_at: new Date().toISOString(), phase: 'aborted' })
        .eq('id', this.currentHand.id);
      
      await this.supabase
        .from('poker_tables')
        .update({ current_hand_id: null, status: 'waiting', updated_at: new Date().toISOString() })
        .eq('id', this.id);
      
      this.clearActionTimer();
      this.currentHand = null;
      
      await this.cleanupPendingLeavePlayers();
      
      const autoStartDelay2 = this.config.autoStartDelaySeconds;
      const delayMs2 = typeof autoStartDelay2 === 'number' ? autoStartDelay2 * 1000 : this.timings.betweenHands;
      setTimeout(() => this.checkStartHand(), delayMs2);
      return;
    }
    
    // Clear action timer
    this.clearActionTimer();
    
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
    
    // Save hand history (also clears current_hand_id in DB)
    await this.saveHandHistory([{
      playerId: winnerId,
      amount: pot,
      handName: 'Last Standing'
    }], []);
    
    // CRITICAL: Remove players who left during the hand
    const playersToRemove: string[] = [];
    for (const [playerId, player] of this.players) {
      if (player.status === 'sitting_out' && player.pendingLeave) {
        playersToRemove.push(playerId);
        logger.info('POKERSTARS: Removing player who left during hand (endHandWithWinner)', {
          playerId: playerId.substring(0, 8),
          name: player.name
        });
      }
    }
    
    for (const playerId of playersToRemove) {
      const player = this.players.get(playerId);
      if (player) {
        this.seats[player.seatNumber] = null;
        if (!this.config.tournamentId && player.stack > 0) {
          await this.returnChipsToBalance(playerId, player.stack);
        }
        this.players.delete(playerId);
        await this.supabase
          .from('poker_table_players')
          .delete()
          .eq('table_id', this.id)
          .eq('player_id', playerId);
        this.emit('player_left', { playerId, stack: player.stack, reason: 'left_during_hand' });
      }
    }
    
    // Reset player states
    for (const player of this.players.values()) {
      player.holeCards = [];
      player.currentBet = 0;
      player.isFolded = false;
      player.isAllIn = false;
    }
    
    // Clear hand state
    this.currentHand = null;
    
    // Emit state update
    this.emit('state_update', {
      handId: null, // No active hand
      pot: 0,
      currentBet: 0,
      currentPlayerSeat: null,
      phase: 'waiting',
      isHandActive: false
    });
    
    // PRO FEATURE: Check if next hand should be a Bomb Pot (automatic, no voting)
    this.checkBombPotTrigger();
    
    // Check for new hand with configured auto-start delay
    const autoStartDelay3 = this.config.autoStartDelaySeconds;
    const delayMs3 = typeof autoStartDelay3 === 'number' ? autoStartDelay3 * 1000 : this.timings.betweenHands;
    setTimeout(() => {
      this.checkStartHand();
    }, delayMs3);
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
        currentBet: p.currentBet,
        isFolded: p.isFolded,
        isAllIn: p.isAllIn,
        isActive: p.status === 'active',
        isSittingOut: p.status === 'sitting_out',
        missedTurns: p.missedTurns || 0,
        // POKERSTARS-STYLE SIT-OUT TRACKING:
        sitOutOrbits: p.sitOutOrbits || 0,
        missedBB: p.missedBB || false,
        missedSB: p.missedSB || false,
        waitForBB: p.waitForBB || false,
        autoPostBlinds: p.autoPostBlinds ?? true,
        isPostingDead: p.isPostingDead || false,
        // CRITICAL: hasCards should ONLY be true when in active hand
        hasCards: isInActiveHand && !p.isFolded,
        holeCards: [] // Hidden for public state
      };
    });

    // Get current player's time bank for display
    const currentPlayerId = this.currentHand?.currentPlayerSeat !== null 
      ? this.seats[this.currentHand?.currentPlayerSeat ?? -1] 
      : null;
    const currentPlayer = currentPlayerId ? this.players.get(currentPlayerId) : null;

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
      timeBankSeconds: this.config.timeBankSeconds, // Table setting for time bank
      players,
      // Hand state - CRITICAL: only show pot/bet when hand is active
      phase: this.currentHand?.phase || 'waiting',
      pot: this.currentHand ? this.currentHand.pot : 0,
      communityCards: this.currentHand?.communityCards || [],
      currentBet: this.currentHand ? this.currentHand.currentBet : 0,
      dealerSeat: this.currentHand?.dealerSeat ?? this.dealerSeat ?? 0,
      smallBlindSeat: this.currentHand?.smallBlindSeat ?? 0,
      bigBlindSeat: this.currentHand?.bigBlindSeat ?? 1,
      // CRITICAL: currentPlayerSeat must be null during showdown - no one is "to act"
      currentPlayerSeat: (this.currentHand?.phase === 'showdown') ? null : (this.currentHand?.currentPlayerSeat ?? null),
      minRaise: this.currentHand?.minRaise || this.config.bigBlind,
      handNumber: this.currentHand?.handNumber || 0,
      handId: this.currentHand?.id || null,  // CRITICAL: Include hand ID for timer reset detection
      // Countdown info
      playersNeeded: this.getPlayersNeededToStart(),
      // CRITICAL: Explicitly indicate if hand is active for client
      isHandActive: this.currentHand !== null,
      // POKERSTARS-STYLE TIMING: Server-authoritative time sync
      // Client receives:
      // 1. actionStartTime - when this player's turn started (Unix ms)
      // 2. timeRemaining - computed remaining seconds (for simple clients)
      // 3. isTimeBankPhase - whether time bank is active (main timer expired)
      // 4. currentPlayerTimeBank - time bank available for current player
      // Client can either use timeRemaining directly OR calculate:
      //   remaining = actionTime - (now - actionStartTime)
      actionStartTime: this.currentHand?.actionStartTime || null,
      timeRemaining: this.calculateTimeRemaining(),
      isTimeBankPhase: this.currentHand?.isTimeBankPhase || false,
      currentPlayerTimeBank: currentPlayer?.timeBank || 0,
      // POKERSTARS-STYLE: Phase-aware timing info for client
      isRaisedPot: this.currentHand ? this.currentHand.currentBet > this.config.bigBlind : false,
      // Use stored actionTimeTotal if available (for consistency), otherwise calculate fresh
      actionTimeTotal: this.currentHand?.actionTimeTotal || this.getActionTimeForPhase()
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
    
    // Safety: time bank should never be negative (can happen after older buggy deployments)
    if (player.timeBank < 0) {
      logger.warn('Player timeBank negative in getPlayerState, clamping', {
        playerId: playerId.substring(0, 8),
        timeBank: player.timeBank
      });
      player.timeBank = 0;
    }
    const safeTimeBank = Math.max(0, player.timeBank);

    return {
      ...publicState,
      players,
      myCards: player.holeCards,
      mySeat: player.seatNumber,
      myStack: player.stack,
      // POKERSTARS-STYLE: Include player's personal time bank info
      myTimeBank: safeTimeBank,
      myTimeBankUsedThisAction: player.timeBankUsedThisAction || 0,
      myMissedTurns: player.missedTurns || 0,
      // CRITICAL: isMyTurn must be false during showdown - no actions allowed
      isMyTurn: this.currentHand?.phase !== 'showdown' && this.currentHand?.currentPlayerSeat === player.seatNumber
    };
  }
  
  /**
   * POKERSTARS-STYLE: Calculate remaining time for current player's action
   * Returns null if no active timer, otherwise seconds remaining
   */
  private calculateTimeRemaining(): number | null {
    // No hand or no current player = no timer
    if (!this.currentHand || this.currentHand.currentPlayerSeat === null) {
      return null;
    }
    
    // Showdown = no timer
    if (this.currentHand.phase === 'showdown') {
      return null;
    }
    
    // No action start time recorded = timer not started yet
    if (!this.currentHand.actionStartTime) {
      return this.currentHand.actionTimeTotal || this.getActionTimeForPhase(); // Full time (phase-aware)
    }
    
    const elapsedMs = Date.now() - this.currentHand.actionStartTime;
    const elapsedSec = elapsedMs / 1000;
    // CRITICAL FIX: Use cached actionTimeTotal for consistency with startActionTimer and state_update
    const totalTime = this.currentHand.actionTimeTotal || this.getActionTimeForPhase();
    const remaining = Math.max(0, totalTime - elapsedSec);
    
    return Math.round(remaining * 10) / 10; // Round to 1 decimal
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
      missedTurns: 0,
      timeBankUsedThisAction: 0,
      handsPlayedSinceLastTimeBank: 0,
      // POKERSTARS-STYLE SIT-OUT TRACKING:
      sitOutOrbits: 0,
      missedBB: false,
      missedSB: false,
      autoPostBlinds: true,
      waitForBB: false,
      isPostingDead: false
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
   * Get current hand ID for stuck hand detection
   */
  getCurrentHandId(): string | null {
    return this.currentHand?.id || null;
  }
  
  /**
   * Force recovery for stuck table
   * Called by PokerGameManager when table is detected as stuck
   * POKERSTARS-STYLE: More aggressive recovery with proper DB sync
   */
  async forceRecovery(): Promise<void> {
    // Skip if hand is already in showdown (completed phase)
    const phase = this.currentHand?.phase;
    if (phase === 'showdown') {
      logger.info('forceRecovery: Skipping - hand is in showdown phase', {
        tableId: this.id,
        phase
      });
      return;
    }
    
    logger.warn('POKERSTARS: Force recovery initiated for stuck table', {
      tableId: this.id,
      hasCurrentHand: !!this.currentHand,
      currentHandId: this.currentHand?.id,
      currentPlayerSeat: this.currentHand?.currentPlayerSeat,
      phase
    });
    
    // Clear any existing timer
    this.clearActionTimer();
    
    // POKERSTARS-STYLE: If we have a hand in memory, check if it matches DB
    // If DB has a DIFFERENT hand marked as active, abort that one
    if (this.currentHand) {
      try {
        const { data: dbActiveHand } = await this.supabase
          .from('poker_hands')
          .select('id, phase')
          .eq('table_id', this.id)
          .is('completed_at', null)
          .single();
        
        if (dbActiveHand && dbActiveHand.id !== this.currentHand.id) {
          // DB has a different active hand - abort it
          logger.warn('POKERSTARS: Found orphaned hand in DB - aborting', {
            tableId: this.id,
            memoryHandId: this.currentHand.id,
            dbHandId: dbActiveHand.id
          });
          
          await this.supabase
            .from('poker_hands')
            .update({ completed_at: new Date().toISOString(), phase: 'aborted' })
            .eq('id', dbActiveHand.id);
          
          // CRITICAL: Clear current_hand_id to allow new hands to start
          await this.supabase
            .from('poker_tables')
            .update({ current_hand_id: null, status: 'waiting', updated_at: new Date().toISOString() })
            .eq('id', this.id);
        }
      } catch (err) {
        logger.warn('Error checking DB hand state during recovery', { error: String(err) });
      }
    }
    
    if (this.currentHand && this.currentHand.currentPlayerSeat !== null) {
      // Force timeout for current player
      await this.handleTimeout();
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
        await this.completeHand([{
          playerId: winner.id,
          amount: this.currentHand.pot,
          handName: 'Last standing'
        }]);
      } else if (activePlayers.length === 0) {
        // No active players - abort hand in DB and reset
        try {
          await this.supabase.rpc('atomic_complete_hand', {
            p_hand_id: this.currentHand.id
          });
        } catch (err) {
          logger.warn('Error aborting empty hand', { error: String(err) });
        }
        this.currentHand = null;
        this.checkStartHand();
      } else {
        // Multiple players but stuck - force fold everyone except first
        logger.warn('Force folding to recover stuck hand', { tableId: this.id });
        for (let i = 1; i < activePlayers.length; i++) {
          activePlayers[i].isFolded = true;
        }
        await this.completeHand([{
          playerId: activePlayers[0].id,
          amount: this.currentHand.pot,
          handName: 'Recovery win'
        }]);
      }
    } else {
      // No current hand in memory - check if DB has one and abort it
      try {
        const { data: orphanedHands } = await this.supabase
          .from('poker_hands')
          .select('id')
          .eq('table_id', this.id)
          .is('completed_at', null);
        
        if (orphanedHands && orphanedHands.length > 0) {
          logger.warn('POKERSTARS: Found orphaned hands in DB - aborting', {
            tableId: this.id,
            count: orphanedHands.length
          });
          
          for (const orphan of orphanedHands) {
            await this.supabase
              .from('poker_hands')
              .update({ completed_at: new Date().toISOString(), phase: 'aborted' })
              .eq('id', orphan.id);
          }
          
          // CRITICAL: Already clearing current_hand_id below, but ensure it happens
          
          // Clear table's current_hand_id
          await this.supabase
            .from('poker_tables')
            .update({ current_hand_id: null, status: 'waiting', updated_at: new Date().toISOString() })
            .eq('id', this.id);
        }
      } catch (err) {
        logger.warn('Error cleaning up orphaned hands', { error: String(err) });
      }
      
      // Try to start a new hand
      this.checkStartHand();
    }
  }
  
  /**
   * POKERSTARS-STYLE: Hard timeout handler
   * Called when a hand has been stuck for too long (60+ seconds)
   * Forces action regardless of player state
   */
  async hardTimeoutRecovery(): Promise<void> {
    if (!this.currentHand) {
      return;
    }
    
    logger.warn('POKERSTARS: Hard timeout recovery triggered', {
      tableId: this.id,
      handId: this.currentHand.id,
      phase: this.currentHand.phase,
      currentPlayerSeat: this.currentHand.currentPlayerSeat
    });
    
    // Clear timer
    this.clearActionTimer();
    
    if (this.currentHand.currentPlayerSeat !== null) {
      const playerId = this.seats[this.currentHand.currentPlayerSeat];
      if (playerId) {
        const player = this.players.get(playerId);
        if (player && !player.isFolded && !player.isAllIn) {
          // Force check if possible, otherwise fold
          const canCheck = player.currentBet >= this.currentHand.currentBet;
          await this.action(playerId, canCheck ? 'check' : 'fold');
          return;
        }
      }
    }
    
    // If we get here, something is very wrong - force complete the hand
    await this.forceRecovery();
  }
  
  // ========================================
  // PRO FEATURES: BOMB POT (Industry-style - Automatic, No Voting)
  // ========================================
  
  /**
   * Check if next hand should be a Bomb Pot
   * Industry-style: Automatic trigger every N hands, no voting/delay
   * Called at the end of each hand
   */
  private checkBombPotTrigger(): void {
    const bombPotEnabled = this.config.bombPotEnabled;
    if (!bombPotEnabled) return;
    
    this.handsSinceLastBombPot++;
    
    // Use configured interval (default 10 hands)
    const bombPotInterval = this.config.bombPotInterval || 10;
    
    if (this.handsSinceLastBombPot >= bombPotInterval) {
      this.triggerBombPot();
    }
  }
  
  /**
   * Trigger automatic Bomb Pot (industry-style)
   * No voting, no delay - just set the flag and notify players
   */
  private triggerBombPot(): void {
    const activePlayers = Array.from(this.players.values())
      .filter(p => p.status === 'active' && p.stack > 0);
    
    if (activePlayers.length < 2) return;
    
    const bombPotMultiplier = this.config.bombPotMultiplier || 2;
    const bombPotAmount = this.config.bigBlind * bombPotMultiplier;
    const isDoubleBoard = this.config.bombPotDoubleBoard || false;
    
    // Check all players have enough chips
    const eligiblePlayers = activePlayers.filter(p => p.stack >= bombPotAmount);
    if (eligiblePlayers.length < 2) return;
    
    // AUTOMATIC: Set bomb pot flag - no voting required
    this.nextHandIsBombPot = true;
    this.handsSinceLastBombPot = 0;
    
    logger.info('BOMB POT: Automatic trigger (industry-style)', {
      tableId: this.id,
      multiplier: bombPotMultiplier,
      amount: bombPotAmount,
      isDoubleBoard,
      eligiblePlayers: eligiblePlayers.length
    });
    
    // Notify all players - this is informational, not a vote request
    this.emit('bomb_pot_triggered', {
      multiplier: bombPotMultiplier,
      amount: bombPotAmount,
      isDoubleBoard,
      playerCount: eligiblePlayers.length
    });
  }
  
  /**
   * Legacy voteBombPot - kept for backwards compatibility
   * In industry-style mode, voting is disabled
   * @deprecated Use automatic trigger instead
   */
  public voteBombPot(playerId: string, accept: boolean): void {
    // Industry-style: No voting - log and ignore
    logger.info('BOMB POT: Vote ignored (industry-style automatic mode)', {
      playerId: playerId.substring(0, 8),
      accept
    });
  }
  
  // ========================================
  // PRO FEATURES: STRADDLE
  // ========================================
  
  /**
   * Player requests to straddle
   * Only UTG can regular straddle, or Button for Mississippi
   */
  public requestStraddle(playerId: string): void {
    const straddleEnabled = this.config.straddleEnabled;
    if (!straddleEnabled) {
      this.emit('straddle_rejected', { playerId, reason: 'Straddle disabled' });
      return;
    }
    
    const player = this.players.get(playerId);
    if (!player || player.status !== 'active') {
      this.emit('straddle_rejected', { playerId, reason: 'Player not active' });
      return;
    }
    
    const straddleAmount = this.config.bigBlind * 2;
    if (player.stack < straddleAmount) {
      this.emit('straddle_rejected', { playerId, reason: 'Insufficient chips' });
      return;
    }
    
    const mississippiEnabled = this.config.mississippiStraddleEnabled;
    
    // Validate position
    // For Mississippi: must be on button
    // For regular: must be UTG (first after BB)
    // We'll allow straddle request before hand starts
    
    this.pendingStraddle = {
      playerId,
      seat: player.seatNumber,
      amount: straddleAmount
    };
    
    logger.info('STRADDLE: Player requested straddle', {
      playerId: playerId.substring(0, 8),
      seat: player.seatNumber,
      amount: straddleAmount,
      isMississippi: mississippiEnabled
    });
    
    this.emit('straddle_posted', {
      playerId,
      playerName: player.name,
      seatNumber: player.seatNumber,
      amount: straddleAmount,
      isMississippi: mississippiEnabled
    });
  }
  
  // ========================================
  // PRO FEATURES: RUN IT TWICE
  // ========================================
  
  /**
   * Start Run It Twice voting when players are all-in
   * Called when we detect all-in situation and table has RIT enabled
   */
  private startRunItTwiceVoting(allInPlayers: string[]): void {
    const runItTwiceEnabled = this.config.runItTwiceEnabled;
    if (!runItTwiceEnabled) return;
    if (allInPlayers.length < 2) return;
    
    this.runItTwiceVoting = true;
    this.runItTwiceVotes.clear();
    this.allInPlayersForRIT = allInPlayers;
    
    logger.info('RUN IT TWICE: Starting voting', {
      tableId: this.id,
      players: allInPlayers
    });
    
    this.emit('run_it_twice_proposal', {
      players: allInPlayers,
      timeoutSeconds: 10
    });
    
    // 10 second timeout
    this.runItTwiceTimeout = setTimeout(() => {
      this.finalizeRunItTwiceVoting();
    }, 10000);
  }
  
  /**
   * Handle player's Run It Twice vote
   */
  public voteRunItTwice(playerId: string, accept: boolean): void {
    if (!this.runItTwiceVoting) return;
    if (!this.allInPlayersForRIT.includes(playerId)) return;
    
    this.runItTwiceVotes.set(playerId, accept);
    
    logger.info('RUN IT TWICE: Player voted', {
      playerId: playerId.substring(0, 8),
      accept,
      totalVotes: this.runItTwiceVotes.size,
      required: this.allInPlayersForRIT.length
    });
    
    this.emit('run_it_twice_vote', {
      playerId,
      accept,
      votesReceived: this.runItTwiceVotes.size
    });
    
    // Check if all all-in players voted
    if (this.runItTwiceVotes.size >= this.allInPlayersForRIT.length) {
      if (this.runItTwiceTimeout) {
        clearTimeout(this.runItTwiceTimeout);
      }
      this.finalizeRunItTwiceVoting();
    }
  }
  
  /**
   * Finalize Run It Twice voting
   */
  private finalizeRunItTwiceVoting(): void {
    if (!this.runItTwiceVoting) return;
    
    this.runItTwiceVoting = false;
    if (this.runItTwiceTimeout) {
      clearTimeout(this.runItTwiceTimeout);
      this.runItTwiceTimeout = null;
    }
    
    // All all-in players must accept
    const allAccepted = this.allInPlayersForRIT.every(id => this.runItTwiceVotes.get(id) === true);
    
    if (allAccepted) {
      logger.info('RUN IT TWICE: All players accepted!', {
        tableId: this.id
      });
      
      this.emit('run_it_twice_confirmed', { accepted: true });
      
      // Execute Run It Twice
      this.executeRunItTwice();
    } else {
      logger.info('RUN IT TWICE: Declined', {
        tableId: this.id
      });
      
      this.emit('run_it_twice_declined', { accepted: false });
      
      // Proceed with normal showdown
      this.allInPlayersForRIT = [];
    }
    
    this.runItTwiceVotes.clear();
  }
  
  /**
   * Execute Run It Twice - deal two boards
   */
  private async executeRunItTwice(): Promise<void> {
    if (!this.currentHand) return;
    
    const engineState = this.engine.getState();
    if (!engineState) return;
    
    // Get remaining cards to deal
    const currentCommunity = this.currentHand.communityCards;
    const cardsNeeded = 5 - currentCommunity.length;
    
    if (cardsNeeded <= 0) {
      // Already at river, can't run it twice
      return;
    }
    
    const deck = [...engineState.deck];
    
    // Deal two sets of remaining community cards
    const board1Cards = deck.slice(0, cardsNeeded);
    const board2Cards = deck.slice(cardsNeeded, cardsNeeded * 2);
    
    const fullBoard1 = [...currentCommunity, ...board1Cards];
    const fullBoard2 = [...currentCommunity, ...board2Cards];
    
    logger.info('RUN IT TWICE: Dealing two boards', {
      tableId: this.id,
      board1: fullBoard1,
      board2: fullBoard2
    });
    
    this.emit('run_it_twice_boards', {
      currentCommunity,
      board1: fullBoard1,
      board2: fullBoard2
    });
    
    // Animation delay
    await this.delay(3000);
    
    // Evaluate winners for both boards
    // (Using engine's runItTwice function indirectly via hand evaluation)
    // For simplicity, we'll emit both boards and let completeHand handle split pot
    
    this.currentHand.communityCards = fullBoard1;
    // Store second board for pot splitting
    this.currentHand.secondBoard = fullBoard2;
    this.currentHand.isRunItTwice = true;
    
    this.allInPlayersForRIT = [];
  }
}
