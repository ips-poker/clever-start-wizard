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
        
        this.tables.set(tableData.id, new PokerTable(config, this.supabase));
        logger.info(`Loaded table: ${tableData.name}`, { tableId: tableData.id });
      }
      
      logger.info(`Loaded ${this.tables.size} active tables`);
    } catch (err) {
      logger.error('Error loading tables', { error: String(err) });
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
