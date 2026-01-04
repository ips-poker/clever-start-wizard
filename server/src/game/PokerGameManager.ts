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
}

export class PokerGameManager {
  private tables: Map<string, PokerTable> = new Map();
  private supabase: SupabaseClient;
  private saveInterval: NodeJS.Timeout | null = null;
  
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.startAutoSave();
    this.loadActiveTables();
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
          actionTimeSeconds: tableData.action_time_seconds || 30,
          timeBankSeconds: tableData.time_bank_seconds || 60
        };
        
        const table = new PokerTable(config, this.supabase);
        this.tables.set(tableData.id, table);
        
        // CRITICAL: Wait for players to load before continuing
        await table.loadPlayersFromDatabase();
        
        logger.info(`Loaded table: ${tableData.name}`, { tableId: tableData.id, players: table.getPlayerCount() });
      }
      
      logger.info(`Loaded ${this.tables.size} active tables`);
    } catch (err) {
      logger.error('Error loading tables', { error: String(err) });
    }
  }
  
  /**
   * CRITICAL: Clean up stale/phantom hands on startup
   * This fixes issues with orphaned current_hand_id references
   */
  private async cleanupStaleHands(): Promise<void> {
    try {
      logger.info('Cleaning up stale hands on startup...');
      
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
          .select('id, completed_at')
          .eq('id', table.current_hand_id)
          .maybeSingle();
        
        // If hand doesn't exist OR is completed, reset the table
        if (!hand || hand.completed_at !== null) {
          logger.warn('Cleaning up stale hand reference', {
            tableId: table.id,
            tableName: table.name,
            phantomHandId: table.current_hand_id,
            handExists: !!hand,
            handCompleted: hand?.completed_at !== null
          });
          
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
      
      // 2. Delete old completed hands (older than 1 hour) to prevent database bloat
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { error: deleteError } = await this.supabase
        .from('poker_hands')
        .delete()
        .not('completed_at', 'is', null)
        .lt('completed_at', oneHourAgo);
      
      if (deleteError) {
        logger.warn('Failed to delete old hands', { error: deleteError.message });
      } else {
        logger.info('Cleaned up old completed hands');
      }
      
      logger.info('Stale hands cleanup complete');
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
        actionTimeSeconds: tableData.action_time_seconds || 30,
        timeBankSeconds: tableData.time_bank_seconds || 60
      };
      
      const table = new PokerTable(config, this.supabase);
      this.tables.set(tableId, table);
      
      // CRITICAL: Wait for players to load from database before returning
      // Constructor calls loadPlayersFromDatabase without await, so we need to call it again
      await table.loadPlayersFromDatabase();
      
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
   */
  private startAutoSave(): void {
    this.saveInterval = setInterval(() => {
      this.saveAllGames();
    }, 30000); // Save every 30 seconds
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
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    await this.saveAllGames();
    logger.info('Game manager shutdown complete');
  }
}
