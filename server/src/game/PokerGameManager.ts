/**
 * Poker Game Manager
 * Manages all active poker games and tournaments
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { PokerTable } from './PokerTable.js';
import { logger } from '../utils/logger.js';

export interface TableConfig {
  id: string;
  name: string;
  gameType: 'holdem' | 'omaha' | 'shortdeck' | 'pineapple' | 'ofc';
  tableType: 'cash' | 'tournament' | 'sitgo';
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  minBuyIn: number;
  maxBuyIn: number;
  actionTimeSeconds: number;
  timeBankSeconds: number;
  tournamentId?: string; // Tournament ID if this is a tournament table
  
  // ========== PRO FEATURES ==========
  // Straddle settings
  straddleEnabled?: boolean;
  mississippiStraddleEnabled?: boolean;
  maxStraddleCount?: number;
  
  // Ante options
  buttonAnteEnabled?: boolean;
  buttonAnteAmount?: number;
  bigBlindAnteEnabled?: boolean;
  bigBlindAnteAmount?: number;
  
  // Bomb pot settings
  bombPotEnabled?: boolean;
  bombPotMultiplier?: number;
  bombPotInterval?: number;
  bombPotDoubleBoard?: boolean;
  
  // Chat settings
  chatEnabled?: boolean;
  chatSlowMode?: boolean;
  chatSlowModeInterval?: number;
  
  // Run It Twice
  runItTwiceEnabled?: boolean;
  
  // Rake settings
  rakePercent?: number;
  rakeCap?: number;
  
  // Auto-start settings
  autoStartEnabled?: boolean;
  autoStartDelaySeconds?: number;
}

export class PokerGameManager {
  private tables: Map<string, PokerTable> = new Map();
  private supabase: SupabaseClient;
  private saveInterval: NodeJS.Timeout | null = null;
  private onTableLoadedCallbacks: Set<(table: PokerTable) => void> = new Set();
  private blindsSyncSubscription: any = null;
  private lastTournamentBalanceSyncAt = 0;
  
  // Callback for player movement notifications (to WebSocket handler)
  private onPlayerMovedCallback: ((playerId: string, newTableId: string, newSeat: number, tournamentId: string) => void) | null = null;
  
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.startAutoSave();
    this.loadActiveTables();
    this.setupBlindsSyncSubscription();
  }
  
  /**
   * Register callback to be notified when a player is moved between tables
   * Used by WebSocketHandler to send redirect events to clients
   */
  onPlayerMoved(callback: (playerId: string, newTableId: string, newSeat: number, tournamentId: string) => void): void {
    this.onPlayerMovedCallback = callback;
  }
  
  /**
   * Register callback to be called when a new table is loaded
   * Used by WebSocketHandler to setup event listeners
   */
  onTableLoaded(callback: (table: PokerTable) => void): void {
    this.onTableLoadedCallbacks.add(callback);
    // Also call for existing tables
    for (const table of this.tables.values()) {
      callback(table);
    }
  }
  
  /**
   * Notify all callbacks when a table is loaded
   */
  private notifyTableLoaded(table: PokerTable): void {
    for (const callback of this.onTableLoadedCallbacks) {
      try {
        callback(table);
      } catch (err) {
        logger.error('Error in onTableLoaded callback', { error: String(err) });
      }
    }
  }
  
  /**
   * Load active tables from database on startup
   */
  private async loadActiveTables(): Promise<void> {
    try {
      // CLEANUP: First, clean up any stale/phantom hands and reset table states
      await this.cleanupStaleHands();
      
      const { data: tables, error } = await this.supabase
        .from('poker_tables')
        .select('*')
        .in('status', ['waiting', 'playing']);
      
      if (error) {
        logger.error('Failed to load tables from database', { error: error.message });
        return;
      }
      
      for (const tableData of tables || []) {
        const config: TableConfig = {
          id: tableData.id,
          name: tableData.name,
          gameType: tableData.game_type,
          tableType: tableData.table_type,
          maxPlayers: tableData.max_players,
          smallBlind: tableData.small_blind,
          bigBlind: tableData.big_blind,
          ante: tableData.ante || 0,
          minBuyIn: tableData.min_buy_in,
          maxBuyIn: tableData.max_buy_in,
          // POKERSTARS-STYLE: Cash Game = 15s base, 30s time bank
          actionTimeSeconds: tableData.action_time_seconds || 15,
          timeBankSeconds: tableData.time_bank_seconds || 30,
          tournamentId: tableData.tournament_id || undefined,
          
          // ========== PRO FEATURES FROM DB ==========
          // Straddle settings
          straddleEnabled: tableData.straddle_enabled || false,
          mississippiStraddleEnabled: tableData.mississippi_straddle_enabled || false,
          maxStraddleCount: tableData.max_straddle_count || 1,
          
          // Ante options
          buttonAnteEnabled: tableData.button_ante_enabled || false,
          buttonAnteAmount: tableData.button_ante_amount || 0,
          bigBlindAnteEnabled: tableData.big_blind_ante_enabled || false,
          bigBlindAnteAmount: tableData.big_blind_ante_amount || 0,
          
          // BOMB POT SETTINGS - Critical for auto-trigger!
          bombPotEnabled: tableData.bomb_pot_enabled || false,
          bombPotMultiplier: tableData.bomb_pot_multiplier || 2,
          bombPotInterval: tableData.bomb_pot_interval || 10,
          bombPotDoubleBoard: tableData.bomb_pot_double_board || false,
          
          // Chat settings
          chatEnabled: tableData.chat_enabled !== false, // Default true
          chatSlowMode: tableData.chat_slow_mode || false,
          chatSlowModeInterval: tableData.chat_slow_mode_interval || 5,
          
          // Run It Twice
          runItTwiceEnabled: tableData.run_it_twice_enabled || false,
          
          // Rake settings
          rakePercent: tableData.rake_percent || 0,
          rakeCap: tableData.rake_cap || 0,
          
          // Auto-start settings
          autoStartEnabled: tableData.auto_start_enabled !== false, // Default true
          autoStartDelaySeconds: tableData.auto_start_delay_seconds || 3,
        };
        
        const table = new PokerTable(config, this.supabase);
        this.tables.set(tableData.id, table);
        
        // CRITICAL: Wait for players to load before continuing
        await table.loadPlayersFromDatabase();
        
        // Notify listeners about newly loaded table (for event subscriptions)
        this.notifyTableLoaded(table);
        
        logger.info(`Loaded table: ${tableData.name}`, { tableId: tableData.id, players: table.getPlayerCount() });
      }
      
      logger.info(`Loaded ${this.tables.size} active tables`);
    } catch (err) {
      logger.error('Error loading tables', { error: String(err) });
    }
  }
  
  /**
   * CRITICAL: Clean up stale/phantom hands on startup
   * POKERSTARS-STYLE: Aggressive cleanup - abort ALL uncompleted hands older than 5 minutes
   * This fixes issues with orphaned current_hand_id references
   */
  private async cleanupStaleHands(): Promise<void> {
    try {
      logger.info('POKERSTARS: Cleaning up stale hands on startup...');
      
      // POKERSTARS-STYLE: Abort ALL uncompleted hands older than 5 minutes
      // This is aggressive but ensures clean state on server restart
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      // Use atomic RPC for cleanup
      try {
        const { data: watchdogResult, error: watchdogError } = await this.supabase.rpc('cleanup_stuck_hands_watchdog', {
          p_timeout_seconds: 300 // 5 minutes
        });
        
        if (watchdogError) {
          logger.warn('Watchdog RPC failed on startup', { error: watchdogError.message });
        } else if (watchdogResult?.cleaned_count > 0) {
          logger.info('POKERSTARS: Startup watchdog cleaned stuck hands', { 
            cleanedCount: watchdogResult.cleaned_count,
            cleanedHands: watchdogResult.cleaned_hands
          });
        }
      } catch (rpcErr) {
        logger.warn('Watchdog RPC exception on startup', { error: String(rpcErr) });
      }
      
      // 1. Find tables with current_hand_id pointing to non-existent or completed hands
      const { data: tables } = await this.supabase
        .from('poker_tables')
        .select('id, name, current_hand_id')
        .not('current_hand_id', 'is', null);
      
      if (!tables || tables.length === 0) {
        logger.info('No tables with current_hand_id to check');
        return;
      }
      
      for (const table of tables) {
        // Check if the hand exists and is active
        const { data: hand } = await this.supabase
          .from('poker_hands')
          .select('id, completed_at, action_started_at')
          .eq('id', table.current_hand_id)
          .maybeSingle();
        
        // If hand doesn't exist OR is completed OR is too old, reset the table
        const handTooOld = hand?.action_started_at && 
          new Date(hand.action_started_at).getTime() < Date.now() - 5 * 60 * 1000;
        
        if (!hand || hand.completed_at !== null || handTooOld) {
          logger.warn('POKERSTARS: Cleaning up stale hand reference', {
            tableId: table.id,
            tableName: table.name,
            phantomHandId: table.current_hand_id,
            handExists: !!hand,
            handCompleted: hand?.completed_at !== null,
            handTooOld
          });
          
          // If hand exists but is too old, abort it
          if (hand && !hand.completed_at) {
            await this.supabase
              .from('poker_hands')
              .update({ 
                completed_at: new Date().toISOString(),
                phase: 'aborted'
              })
              .eq('id', table.current_hand_id);
          }
          
          await this.supabase
            .from('poker_tables')
            .update({ 
              current_hand_id: null, 
              status: 'waiting',
              updated_at: new Date().toISOString()
            })
            .eq('id', table.id);
        }
      }
      
      // 2. Delete old completed hands (older than 24 hours) to prevent database bloat
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { error: deleteError, count } = await this.supabase
        .from('poker_hands')
        .delete()
        .not('completed_at', 'is', null)
        .lt('completed_at', oneDayAgo);
      
      if (deleteError) {
        logger.warn('Failed to delete old hands', { error: deleteError.message });
      } else {
        logger.info('POKERSTARS: Cleaned up old completed hands', { deletedCount: count });
      }
      
      logger.info('POKERSTARS: Stale hands cleanup complete');
    } catch (err) {
      logger.error('Error during stale hands cleanup', { error: String(err) });
    }
  }
  
  /**
   * Create a new poker table
   */
  async createTable(config: TableConfig): Promise<PokerTable> {
    // Save to database
    const { data, error } = await this.supabase
      .from('poker_tables')
      .insert({
        id: config.id,
        name: config.name,
        game_type: config.gameType,
        table_type: config.tableType,
        max_players: config.maxPlayers,
        small_blind: config.smallBlind,
        big_blind: config.bigBlind,
        ante: config.ante,
        min_buy_in: config.minBuyIn,
        max_buy_in: config.maxBuyIn,
        action_time_seconds: config.actionTimeSeconds,
        time_bank_seconds: config.timeBankSeconds,
        tournament_id: config.tournamentId ?? null,
        status: 'waiting'
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create table: ${error.message}`);
    }
    
    const table = new PokerTable(config, this.supabase);
    this.tables.set(config.id, table);
    
    logger.info(`Created new table: ${config.name}`, { tableId: config.id });
    return table;
  }
  
  /**
   * Get a table by ID
   */
  getTable(tableId: string): PokerTable | undefined {
    return this.tables.get(tableId);
  }
  
  /**
   * Load a table dynamically from database if not already in memory
   */
  async loadTableIfNeeded(tableId: string): Promise<PokerTable | undefined> {
    // Check if already loaded
    if (this.tables.has(tableId)) {
      return this.tables.get(tableId);
    }
    
    try {
      const { data: tableData, error } = await this.supabase
        .from('poker_tables')
        .select('*')
        .eq('id', tableId)
        .in('status', ['waiting', 'playing'])
        .single();
      
      if (error || !tableData) {
        logger.warn('Table not found in database for dynamic load', { tableId });
        return undefined;
      }
      
      const config: TableConfig = {
        id: tableData.id,
        name: tableData.name,
        gameType: tableData.game_type,
        tableType: tableData.table_type,
        maxPlayers: tableData.max_players,
        smallBlind: tableData.small_blind,
        bigBlind: tableData.big_blind,
        ante: tableData.ante || 0,
        minBuyIn: tableData.min_buy_in,
        maxBuyIn: tableData.max_buy_in,
        // POKERSTARS-STYLE: Cash Game = 15s base, 30s time bank
        actionTimeSeconds: tableData.action_time_seconds || 15,
        timeBankSeconds: tableData.time_bank_seconds || 30,
        tournamentId: tableData.tournament_id || undefined,
      };
      
      const table = new PokerTable(config, this.supabase);
      this.tables.set(tableId, table);
      
      // CRITICAL: Wait for players to load from database before returning
      // Constructor calls loadPlayersFromDatabase without await, so we need to call it again
      await table.loadPlayersFromDatabase();
      
      // CRITICAL: Notify listeners about newly loaded table (for event subscriptions)
      // This ensures elimination events are handled even if no human player connected yet
      this.notifyTableLoaded(table);
      
      logger.info(`Dynamically loaded table: ${tableData.name}`, { tableId });
      return table;
    } catch (err) {
      logger.error('Error dynamically loading table', { tableId, error: String(err) });
      return undefined;
    }
  }
  
  /**
   * Get all active tables
   */
  getAllTables(): PokerTable[] {
    return Array.from(this.tables.values());
  }
  
  /**
   * Remove a table
   */
  async removeTable(tableId: string): Promise<boolean> {
    const table = this.tables.get(tableId);
    if (!table) return false;
    
    // Save final state
    await table.saveState();
    
    // Update status in database
    await this.supabase
      .from('poker_tables')
      .update({ status: 'closed' })
      .eq('id', tableId);
    
    this.tables.delete(tableId);
    logger.info(`Removed table`, { tableId });
    return true;
  }
  
  /**
   * Start auto-save interval
   * POKERSTARS-STYLE: More aggressive stuck hand detection
   */
  private startAutoSave(): void {
    this.saveInterval = setInterval(() => {
      this.saveAllGames();
      // POKERSTARS: Check for stuck tables every 15 seconds (was 30)
      this.checkStuckTables();

      // Tournament table balancing sync: keep in-memory player lists aligned with DB moves
      // (DB RPCs can rebalance tables without going through WebSocket flow)
      this.syncAllTournamentBalancing().catch(err => {
        logger.warn('Tournament balancing sync failed', { error: String(err) });
      });
    }, 15000); // Check every 15 seconds for faster recovery
  }

  /**
   * Keep VPS in-memory tables aligned with DB rebalancing.
   * Runs on an interval (throttled) and calls syncTableBalancing per tournament.
   */
  private async syncAllTournamentBalancing(): Promise<void> {
    const now = Date.now();
    // Throttle to once per 15s (same as autosave interval)
    if (now - this.lastTournamentBalanceSyncAt < 14000) return;
    this.lastTournamentBalanceSyncAt = now;

    const tournamentIds = new Set<string>();
    for (const table of this.tables.values()) {
      const tid = table.getTournamentId?.();
      if (tid) tournamentIds.add(tid);
    }

    if (tournamentIds.size === 0) return;

    for (const tournamentId of tournamentIds) {
      const res = await this.syncTableBalancing(tournamentId);
      if (!res.success) {
        logger.warn('syncTableBalancing reported failure', { tournamentId, error: res.error });
      }
    }
  }
  
  /**
   * Check for stuck tables and restart them
   * POKERSTARS-STYLE: Reduced threshold from 2 minutes to 45 seconds
   * A table is considered stuck if action_started_at is more than 45 seconds old
   */
  private async checkStuckTables(): Promise<void> {
    try {
      // IMPORTANT:
      // We MUST NOT treat a hand as "stuck" sooner than the table's configured
      // (action_time_seconds + time_bank_seconds), otherwise tables configured
      // with long action times (e.g., 60s) will be force-timed-out at 45s.
      //
      // We still keep a base candidate threshold of 45s for query efficiency,
      // but we apply per-table dynamic thresholds in code.
      const candidateThresholdIso = new Date(Date.now() - 45 * 1000).toISOString();

      const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

      const computeStuckThresholdsSeconds = (actionTimeSeconds: number, timeBankSeconds: number) => {
        // Add a small buffer for server-side animation delays / scheduling jitter.
        const bufferSeconds = 10;
        const baseSoft = actionTimeSeconds + timeBankSeconds + bufferSeconds;

        // Soft threshold: never below 45s; never above DB watchdog (120s) minus headroom.
        const soft = clamp(baseSoft, 45, 110);

        // Hard threshold: allow a bit more time before aggressive recovery, but never exceed DB watchdog.
        const hard = clamp(soft + 30, 90, 120);

        return { soft, hard };
      };
      
      // CRITICAL FIX: First, use the DB watchdog function to cleanup very old hands
      try {
        const { data: watchdogResult } = await this.supabase.rpc('cleanup_stuck_hands_watchdog', {
          p_timeout_seconds: 120 // 2 minutes is hard limit for DB cleanup
        });
        
        if (watchdogResult?.cleaned_count > 0) {
          logger.info('POKERSTARS: DB watchdog cleaned stuck hands', { 
            result: watchdogResult 
          });
        }
      } catch (watchdogErr) {
        logger.warn('Watchdog RPC failed', { error: String(watchdogErr) });
      }
      
      // Find candidate hands that are older than the *minimum* detection window.
      // We then apply per-table thresholds based on (action_time_seconds + time_bank_seconds).
      // Exclude 'complete', 'showdown', and 'aborted' phases.
      const { data: stuckHands, error } = await this.supabase
        .from('poker_hands')
        .select('id, table_id, action_started_at, phase, poker_tables(action_time_seconds, time_bank_seconds)')
        .lt('action_started_at', candidateThresholdIso)
        .is('completed_at', null)
        .not('phase', 'in', '("complete","showdown","aborted")');
      
      if (error || !stuckHands || stuckHands.length === 0) {
        return;
      }
      
      for (const hand of stuckHands as Array<any>) {
        // Calculate how long the hand has been stuck
        const actionStartedAt = new Date(hand.action_started_at).getTime();
        const stuckDuration = Date.now() - actionStartedAt;

        const actionTimeSeconds = Number(hand?.poker_tables?.action_time_seconds ?? 15);
        const timeBankSeconds = Number(hand?.poker_tables?.time_bank_seconds ?? 30);
        const { soft: softThresholdSeconds, hard: hardThresholdSeconds } = computeStuckThresholdsSeconds(
          Number.isFinite(actionTimeSeconds) ? actionTimeSeconds : 15,
          Number.isFinite(timeBankSeconds) ? timeBankSeconds : 30
        );

        // If the hand isn't actually past its configured action+timebank window, do nothing.
        if (stuckDuration < softThresholdSeconds * 1000) {
          continue;
        }

        const isHardTimeout = stuckDuration > hardThresholdSeconds * 1000;
        
        // CRITICAL: Check if hand has any players - if not, it's orphaned
        const { data: handPlayers } = await this.supabase
          .from('poker_hand_players')
          .select('id')
          .eq('hand_id', hand.id)
          .limit(1);
        
        if (!handPlayers || handPlayers.length === 0) {
          // Orphaned hand - abort it immediately
          logger.warn('POKERSTARS: Found orphaned hand (no players) - aborting', {
            handId: hand.id,
            tableId: hand.table_id,
            phase: hand.phase,
            stuckDurationMs: stuckDuration
          });
          
          await this.supabase
            .from('poker_hands')
            .update({ 
              completed_at: new Date().toISOString(),
              phase: 'aborted'
            })
            .eq('id', hand.id);
          
          await this.supabase
            .from('poker_tables')
            .update({ 
              current_hand_id: null, 
              status: 'waiting',
              updated_at: new Date().toISOString()
            })
            .eq('id', hand.table_id);
          
          continue;
        }
        
        logger.warn('POKERSTARS: Found stuck hand - attempting recovery', {
          handId: hand.id,
          tableId: hand.table_id,
          phase: hand.phase,
          actionStartedAt: hand.action_started_at,
          stuckDurationMs: stuckDuration,
          isHardTimeout,
          actionTimeSeconds,
          timeBankSeconds,
          softThresholdSeconds,
          hardThresholdSeconds
        });
        
        // Check if table is in memory
        const table = this.tables.get(hand.table_id);
        if (table) {
          // POKERSTARS-STYLE: Check if table has a DIFFERENT hand in memory
          // This prevents forceRecovery from conflicting with active games
          const tableHandId = table.isHandInProgress() ? table.getCurrentHandId?.() : null;
          
          if (tableHandId && tableHandId !== hand.id) {
            // Table has a different active hand - the DB hand is orphaned
            logger.warn('POKERSTARS: Table has different active hand - aborting DB hand', {
              tableId: hand.table_id,
              dbHandId: hand.id,
              memoryHandId: tableHandId
            });
            
            await this.supabase
              .from('poker_hands')
              .update({ 
                completed_at: new Date().toISOString(),
                phase: 'aborted'
              })
              .eq('id', hand.id);
            
            continue;
          }
          
          // Table exists and hand matches - trigger recovery
          logger.info('POKERSTARS: Triggering timeout recovery for stuck table', { 
            tableId: hand.table_id,
            isHardTimeout 
          });
          
          if (isHardTimeout) {
            // Hard timeout - use aggressive recovery
            table.hardTimeoutRecovery();
          } else {
            // Soft timeout - use normal recovery
            table.forceRecovery();
          }
        } else {
          // Table not in memory - mark hand as aborted
          logger.warn('POKERSTARS: Table not in memory - marking stuck hand as aborted', { 
            tableId: hand.table_id, 
            handId: hand.id 
          });
          
          await this.supabase
            .from('poker_hands')
            .update({ 
              completed_at: new Date().toISOString(),
              phase: 'aborted'
            })
            .eq('id', hand.id);
          
          // Reset table status
          await this.supabase
            .from('poker_tables')
            .update({ 
              current_hand_id: null, 
              status: 'waiting',
              updated_at: new Date().toISOString()
            })
            .eq('id', hand.table_id);
          
          // CRITICAL FIX: Reload table into memory and trigger new hand
          // This ensures tables don't stay stuck after recovery
          logger.info('POKERSTARS: Reloading table after stuck hand cleanup', { 
            tableId: hand.table_id 
          });
          
          const reloadedTable = await this.loadTableIfNeeded(hand.table_id);
          if (reloadedTable) {
            // loadTableIfNeeded calls loadPlayersFromDatabase which has setTimeout for checkStartHand
            logger.info('POKERSTARS: Table reloaded successfully - hand should auto-start', { 
              tableId: hand.table_id,
              playerCount: reloadedTable.getPlayerCount()
            });
          }
        }
      }
    } catch (err) {
      logger.error('Error checking stuck tables', { error: String(err) });
    }
  }
  
  /**
   * Save all active game states
   */
  async saveAllGames(): Promise<void> {
    const savePromises = Array.from(this.tables.values()).map(table => 
      table.saveState().catch(err => {
        logger.error(`Failed to save table state`, { tableId: table.id, error: String(err) });
      })
    );
    
    await Promise.all(savePromises);
    logger.debug(`Saved ${this.tables.size} table states`);
  }
  
  /**
   * Get statistics
   */
  getStats(): {
    activeTables: number;
    totalPlayers: number;
    activeHands: number;
  } {
    let totalPlayers = 0;
    let activeHands = 0;
    
    for (const table of this.tables.values()) {
      totalPlayers += table.getPlayerCount();
      if (table.isHandInProgress()) {
        activeHands++;
      }
    }
    
    return {
      activeTables: this.tables.size,
      totalPlayers,
      activeHands
    };
  }
  
  // ==========================================
  // PROFESSIONAL TABLE BALANCING
  // ==========================================
  
  /**
   * PROFESSIONAL: Balance tournament tables in memory
   * Called after database RPC balances the tables
   * Syncs server state with database changes
   */
  async syncTableBalancing(tournamentId: string): Promise<{
    success: boolean;
    moves: number;
    error?: string;
  }> {
    try {
      // Get all tournament tables from database
      const { data: dbTables, error: tablesError } = await this.supabase
        .from('poker_tables')
        .select('id, name')
        .eq('tournament_id', tournamentId)
        .in('status', ['waiting', 'playing']);
      
      if (tablesError || !dbTables) {
        return { success: false, moves: 0, error: tablesError?.message || 'No tables found' };
      }
      
      let totalMoves = 0;
      
      for (const dbTable of dbTables) {
        // Load or get table
        let table = this.tables.get(dbTable.id);
        if (!table) {
          table = await this.loadTableIfNeeded(dbTable.id);
        }
        
        if (!table) continue;
        
        // Get current players from database
        const { data: dbPlayers } = await this.supabase
          .from('poker_table_players')
          .select('player_id, seat_number, stack, status')
          .eq('table_id', dbTable.id);
        
        if (!dbPlayers) continue;
        
        // Find players that need to be removed (no longer in DB)
        const dbPlayerIds = new Set(dbPlayers.map(p => p.player_id));
        const currentPlayers = table.getPlayersForBalancing();
        
        for (const player of currentPlayers) {
          if (!dbPlayerIds.has(player.playerId)) {
            // Player was moved to another table by DB balancing
            await table.removePlayerForRebalancing(player.playerId);
            totalMoves++;
            logger.info('Synced player removal after DB balance', {
              tableId: dbTable.id,
              playerId: player.playerId.substring(0, 8)
            });
          }
        }
        
        // Find players that need to be added (in DB but not in memory)
        const memoryPlayerIds = new Set(currentPlayers.map(p => p.playerId));
        
        for (const dbPlayer of dbPlayers) {
          if (!memoryPlayerIds.has(dbPlayer.player_id)) {
            // Player was moved to this table by DB balancing
            // Fetch player name
            const { data: playerData } = await this.supabase
              .from('players')
              .select('name, avatar_url')
              .eq('id', dbPlayer.player_id)
              .single();
            
            if (playerData) {
              await table.addPlayerFromRebalancing(
                dbPlayer.player_id,
                playerData.name,
                dbPlayer.stack,
                dbPlayer.seat_number,
                playerData.avatar_url
              );
              totalMoves++;
              
              // CRITICAL: Notify WebSocket handler to redirect player to new table
              if (this.onPlayerMovedCallback) {
                this.onPlayerMovedCallback(
                  dbPlayer.player_id,
                  dbTable.id,
                  dbPlayer.seat_number,
                  tournamentId
                );
              }
              
              logger.info('Synced player addition after DB balance', {
                tableId: dbTable.id,
                playerId: dbPlayer.player_id.substring(0, 8)
              });
            }
          }
        }
      }
      
      logger.info('Table balancing sync complete', {
        tournamentId,
        tables: dbTables.length,
        moves: totalMoves
      });
      
      return { success: true, moves: totalMoves };
    } catch (err) {
      logger.error('Error syncing table balancing', { 
        tournamentId, 
        error: String(err) 
      });
      return { success: false, moves: 0, error: String(err) };
    }
  }
  
  /**
   * PROFESSIONAL: Move single player between tables
   * Used for immediate balancing during late registration
   */
  async movePlayerBetweenTables(
    playerId: string,
    fromTableId: string,
    toTableId: string,
    toSeat: number
  ): Promise<{ success: boolean; error?: string }> {
    const fromTable = this.tables.get(fromTableId);
    let toTable = this.tables.get(toTableId);
    
    if (!fromTable) {
      return { success: false, error: 'Source table not found' };
    }
    
    // Load target table if needed
    if (!toTable) {
      toTable = await this.loadTableIfNeeded(toTableId);
      if (!toTable) {
        return { success: false, error: 'Target table not found' };
      }
    }
    
    // Remove from source table
    const removeResult = await fromTable.removePlayerForRebalancing(playerId);
    if (!removeResult.success || !removeResult.player) {
      return { success: false, error: removeResult.error || 'Failed to remove from source table' };
    }
    
    // Add to target table
    const addResult = await toTable.addPlayerFromRebalancing(
      removeResult.player.id,
      removeResult.player.name,
      removeResult.player.stack,
      toSeat,
      removeResult.player.avatarUrl
    );
    
    if (!addResult.success) {
      // Rollback - add back to source table
      await fromTable.addPlayerFromRebalancing(
        removeResult.player.id,
        removeResult.player.name,
        removeResult.player.stack,
        0, // Will find available seat
        removeResult.player.avatarUrl
      );
      return { success: false, error: addResult.error || 'Failed to add to target table' };
    }
    
    logger.info('Player moved between tables', {
      playerId: playerId.substring(0, 8),
      fromTableId,
      toTableId,
      toSeat
    });
    
    return { success: true };
  }
  
  /**
   * TOURNAMENT LEVEL SYNC: Subscribe to poker_tables changes
   * When tournament-level-manager updates blinds, refresh all affected tables
   */
  private setupBlindsSyncSubscription(): void {
    try {
      this.blindsSyncSubscription = this.supabase
        .channel('poker-tables-blinds-sync')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'poker_tables'
          },
          async (payload: any) => {
            const tableId = payload.new?.id;
            const newSmallBlind = payload.new?.small_blind;
            const newBigBlind = payload.new?.big_blind;
            const newAnte = payload.new?.ante;
            const oldSmallBlind = payload.old?.small_blind;
            const oldBigBlind = payload.old?.big_blind;
            
            // Only process if blinds changed
            if (tableId && 
                (newSmallBlind !== oldSmallBlind || newBigBlind !== oldBigBlind)) {
              
              logger.info('TOURNAMENT LEVEL SYNC: Detected blind change in DB', {
                tableId,
                oldBlinds: { smallBlind: oldSmallBlind, bigBlind: oldBigBlind },
                newBlinds: { smallBlind: newSmallBlind, bigBlind: newBigBlind, ante: newAnte }
              });
              
              // Find and update the table in memory
              const table = this.tables.get(tableId);
              if (table) {
                await table.refreshBlindsFromDatabase();
                logger.info('TOURNAMENT LEVEL SYNC: Updated table blinds from realtime event', {
                  tableId
                });
              }
            }
          }
        )
        .subscribe((status: string) => {
          logger.info('Blinds sync subscription status', { status });
        });
      
      logger.info('TOURNAMENT LEVEL SYNC: Subscribed to poker_tables changes');
    } catch (err) {
      logger.error('Failed to setup blinds sync subscription', { error: String(err) });
    }
  }
  
  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    
    // Cleanup realtime subscription
    if (this.blindsSyncSubscription) {
      await this.supabase.removeChannel(this.blindsSyncSubscription);
    }
    
    await this.saveAllGames();
    logger.info('Game manager shutdown complete');
  }
}
