/**
 * Tournament State Cache
 * High-performance caching for tournament states with pub/sub synchronization
 * Designed for 300+ simultaneous tables
 */

import { logger } from './logger.js';
import { redisManager, CHANNELS } from './redis-manager.js';

// ==========================================
// TYPES
// ==========================================

export interface CachedTournamentState {
  id: string;
  status: 'pending' | 'running' | 'final_table' | 'completed' | 'cancelled';
  currentLevel: number;
  levelEndAt: string | null;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  prizePool: number;
  playersRemaining: number;
  tablesActive: number;
  averageStack: number;
  lastUpdate: number;
}

export interface CachedTableState {
  id: string;
  tournamentId: string | null;
  status: 'waiting' | 'playing' | 'paused' | 'closed';
  currentHandId: string | null;
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'waiting';
  pot: number;
  currentBet: number;
  currentPlayerSeat: number | null;
  actionStartedAt: string | null;
  dealerSeat: number;
  playersCount: number;
  lastUpdate: number;
}

export interface CachedPlayerState {
  id: string;
  tableId: string | null;
  tournamentId: string | null;
  stack: number;
  seatNumber: number | null;
  status: 'active' | 'folded' | 'all_in' | 'eliminated' | 'sitting_out';
  isConnected: boolean;
  lastAction: string | null;
  timeBank: number;
  lastUpdate: number;
}

interface CacheStats {
  tournaments: number;
  tables: number;
  players: number;
  hitRate: number;
  memoryUsageMB: number;
}

// ==========================================
// TOURNAMENT STATE CACHE CLASS
// ==========================================

class TournamentStateCache {
  private tournamentCache: Map<string, CachedTournamentState> = new Map();
  private tableCache: Map<string, CachedTableState> = new Map();
  private playerCache: Map<string, CachedPlayerState> = new Map();
  
  // Indexing for fast lookups
  private tournamentTables: Map<string, Set<string>> = new Map(); // tournamentId -> tableIds
  private tournamentPlayers: Map<string, Set<string>> = new Map(); // tournamentId -> playerIds
  private tablePlayers: Map<string, Set<string>> = new Map(); // tableId -> playerIds
  
  // Cache statistics
  private hits: number = 0;
  private misses: number = 0;
  
  // Dirty tracking for batch updates
  private dirtyTournaments: Set<string> = new Set();
  private dirtyTables: Set<string> = new Set();
  private dirtyPlayers: Set<string> = new Set();
  
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL_MS = 1000; // Flush dirty states every second
  private readonly MAX_CACHE_AGE_MS = 60000; // Maximum cache age before refresh
  
  constructor() {
    this.startFlushLoop();
    this.subscribeToUpdates();
    logger.info('TournamentStateCache initialized');
  }
  
  // ==========================================
  // TOURNAMENT STATE MANAGEMENT
  // ==========================================
  
  setTournamentState(state: CachedTournamentState): void {
    state.lastUpdate = Date.now();
    this.tournamentCache.set(state.id, state);
    this.dirtyTournaments.add(state.id);
  }
  
  getTournamentState(id: string): CachedTournamentState | null {
    const state = this.tournamentCache.get(id);
    if (state) {
      this.hits++;
      return state;
    }
    this.misses++;
    return null;
  }
  
  updateTournamentLevel(
    tournamentId: string,
    level: number,
    smallBlind: number,
    bigBlind: number,
    ante: number,
    levelEndAt: string | null
  ): void {
    const state = this.tournamentCache.get(tournamentId);
    if (state) {
      state.currentLevel = level;
      state.smallBlind = smallBlind;
      state.bigBlind = bigBlind;
      state.ante = ante;
      state.levelEndAt = levelEndAt;
      state.lastUpdate = Date.now();
      this.dirtyTournaments.add(tournamentId);
      
      // Publish update via pub/sub
      redisManager.publish(CHANNELS.TOURNAMENT_UPDATE, {
        type: 'level_change',
        payload: {
          tournamentId,
          level,
          smallBlind,
          bigBlind,
          ante,
          levelEndAt
        }
      });
    }
  }
  
  updateTournamentStats(
    tournamentId: string,
    playersRemaining: number,
    tablesActive: number,
    averageStack: number
  ): void {
    const state = this.tournamentCache.get(tournamentId);
    if (state) {
      state.playersRemaining = playersRemaining;
      state.tablesActive = tablesActive;
      state.averageStack = averageStack;
      state.lastUpdate = Date.now();
      this.dirtyTournaments.add(tournamentId);
    }
  }
  
  deleteTournament(tournamentId: string): void {
    this.tournamentCache.delete(tournamentId);
    
    // Clean up related tables and players
    const tableIds = this.tournamentTables.get(tournamentId);
    if (tableIds) {
      for (const tableId of tableIds) {
        this.deleteTable(tableId);
      }
      this.tournamentTables.delete(tournamentId);
    }
    
    const playerIds = this.tournamentPlayers.get(tournamentId);
    if (playerIds) {
      for (const playerId of playerIds) {
        this.deletePlayer(playerId);
      }
      this.tournamentPlayers.delete(tournamentId);
    }
  }
  
  // ==========================================
  // TABLE STATE MANAGEMENT
  // ==========================================
  
  setTableState(state: CachedTableState): void {
    state.lastUpdate = Date.now();
    this.tableCache.set(state.id, state);
    this.dirtyTables.add(state.id);
    
    // Update tournament-table index
    if (state.tournamentId) {
      if (!this.tournamentTables.has(state.tournamentId)) {
        this.tournamentTables.set(state.tournamentId, new Set());
      }
      this.tournamentTables.get(state.tournamentId)!.add(state.id);
    }
  }
  
  getTableState(id: string): CachedTableState | null {
    const state = this.tableCache.get(id);
    if (state) {
      this.hits++;
      return state;
    }
    this.misses++;
    return null;
  }
  
  updateTablePhase(
    tableId: string,
    phase: CachedTableState['phase'],
    pot: number,
    currentBet: number,
    currentPlayerSeat: number | null
  ): void {
    const state = this.tableCache.get(tableId);
    if (state) {
      state.phase = phase;
      state.pot = pot;
      state.currentBet = currentBet;
      state.currentPlayerSeat = currentPlayerSeat;
      state.actionStartedAt = currentPlayerSeat !== null ? new Date().toISOString() : null;
      state.lastUpdate = Date.now();
      this.dirtyTables.add(tableId);
    }
  }
  
  deleteTable(tableId: string): void {
    const state = this.tableCache.get(tableId);
    if (state?.tournamentId) {
      this.tournamentTables.get(state.tournamentId)?.delete(tableId);
    }
    
    this.tableCache.delete(tableId);
    
    // Clean up players at this table
    const playerIds = this.tablePlayers.get(tableId);
    if (playerIds) {
      for (const playerId of playerIds) {
        const player = this.playerCache.get(playerId);
        if (player) {
          player.tableId = null;
          player.seatNumber = null;
          this.dirtyPlayers.add(playerId);
        }
      }
      this.tablePlayers.delete(tableId);
    }
  }
  
  getTournamentTables(tournamentId: string): CachedTableState[] {
    const tableIds = this.tournamentTables.get(tournamentId);
    if (!tableIds) return [];
    
    return Array.from(tableIds)
      .map(id => this.tableCache.get(id))
      .filter((t): t is CachedTableState => t !== undefined);
  }
  
  // ==========================================
  // PLAYER STATE MANAGEMENT
  // ==========================================
  
  setPlayerState(state: CachedPlayerState): void {
    state.lastUpdate = Date.now();
    this.playerCache.set(state.id, state);
    this.dirtyPlayers.add(state.id);
    
    // Update indexes
    if (state.tournamentId) {
      if (!this.tournamentPlayers.has(state.tournamentId)) {
        this.tournamentPlayers.set(state.tournamentId, new Set());
      }
      this.tournamentPlayers.get(state.tournamentId)!.add(state.id);
    }
    
    if (state.tableId) {
      if (!this.tablePlayers.has(state.tableId)) {
        this.tablePlayers.set(state.tableId, new Set());
      }
      this.tablePlayers.get(state.tableId)!.add(state.id);
    }
  }
  
  getPlayerState(id: string): CachedPlayerState | null {
    const state = this.playerCache.get(id);
    if (state) {
      this.hits++;
      return state;
    }
    this.misses++;
    return null;
  }
  
  updatePlayerStack(playerId: string, stack: number): void {
    const state = this.playerCache.get(playerId);
    if (state) {
      state.stack = stack;
      state.lastUpdate = Date.now();
      this.dirtyPlayers.add(playerId);
    }
  }
  
  updatePlayerStatus(playerId: string, status: CachedPlayerState['status']): void {
    const state = this.playerCache.get(playerId);
    if (state) {
      state.status = status;
      state.lastUpdate = Date.now();
      this.dirtyPlayers.add(playerId);
    }
  }
  
  movePlayerToTable(playerId: string, newTableId: string, newSeat: number): void {
    const state = this.playerCache.get(playerId);
    if (!state) return;
    
    // Remove from old table index
    if (state.tableId) {
      this.tablePlayers.get(state.tableId)?.delete(playerId);
    }
    
    // Update state
    state.tableId = newTableId;
    state.seatNumber = newSeat;
    state.lastUpdate = Date.now();
    this.dirtyPlayers.add(playerId);
    
    // Add to new table index
    if (!this.tablePlayers.has(newTableId)) {
      this.tablePlayers.set(newTableId, new Set());
    }
    this.tablePlayers.get(newTableId)!.add(playerId);
    
    // Publish player move event
    redisManager.publish(CHANNELS.PLAYER_ACTION, {
      type: 'player_moved',
      payload: {
        playerId,
        newTableId,
        newSeat,
        tournamentId: state.tournamentId
      }
    });
  }
  
  deletePlayer(playerId: string): void {
    const state = this.playerCache.get(playerId);
    if (state) {
      if (state.tournamentId) {
        this.tournamentPlayers.get(state.tournamentId)?.delete(playerId);
      }
      if (state.tableId) {
        this.tablePlayers.get(state.tableId)?.delete(playerId);
      }
    }
    this.playerCache.delete(playerId);
  }
  
  getTablePlayers(tableId: string): CachedPlayerState[] {
    const playerIds = this.tablePlayers.get(tableId);
    if (!playerIds) return [];
    
    return Array.from(playerIds)
      .map(id => this.playerCache.get(id))
      .filter((p): p is CachedPlayerState => p !== undefined);
  }
  
  getTournamentPlayers(tournamentId: string): CachedPlayerState[] {
    const playerIds = this.tournamentPlayers.get(tournamentId);
    if (!playerIds) return [];
    
    return Array.from(playerIds)
      .map(id => this.playerCache.get(id))
      .filter((p): p is CachedPlayerState => p !== undefined);
  }
  
  // ==========================================
  // BATCH OPERATIONS
  // ==========================================
  
  /**
   * Get all active tournaments with their tables
   */
  getActiveTournaments(): Array<{
    tournament: CachedTournamentState;
    tables: CachedTableState[];
  }> {
    const result: Array<{ tournament: CachedTournamentState; tables: CachedTableState[] }> = [];
    
    for (const tournament of this.tournamentCache.values()) {
      if (tournament.status === 'running' || tournament.status === 'final_table') {
        result.push({
          tournament,
          tables: this.getTournamentTables(tournament.id)
        });
      }
    }
    
    return result;
  }
  
  /**
   * Bulk update player connection status
   */
  updatePlayersConnectionStatus(playerUpdates: Array<{ playerId: string; isConnected: boolean }>): void {
    for (const update of playerUpdates) {
      const state = this.playerCache.get(update.playerId);
      if (state) {
        state.isConnected = update.isConnected;
        state.lastUpdate = Date.now();
        this.dirtyPlayers.add(update.playerId);
      }
    }
  }
  
  // ==========================================
  // PUB/SUB
  // ==========================================
  
  private subscribeToUpdates(): void {
    // Subscribe to tournament updates from other servers (for future horizontal scaling)
    redisManager.subscribe(CHANNELS.TOURNAMENT_UPDATE, (event) => {
      // Only process events from other servers
      if (event.serverId === (redisManager as any).serverId) return;
      
      logger.debug('Received tournament update from another server', {
        type: event.type,
        serverId: event.serverId
      });
      
      // Handle cross-server state sync here if needed
    });
  }
  
  // ==========================================
  // FLUSH & CLEANUP
  // ==========================================
  
  private startFlushLoop(): void {
    this.flushInterval = setInterval(() => {
      this.flushDirtyStates();
      this.cleanupStaleCache();
    }, this.FLUSH_INTERVAL_MS);
  }
  
  private flushDirtyStates(): void {
    // In a distributed setup, this would sync to Redis
    // For now, just clear dirty flags
    const tournamentCount = this.dirtyTournaments.size;
    const tableCount = this.dirtyTables.size;
    const playerCount = this.dirtyPlayers.size;
    
    if (tournamentCount > 0 || tableCount > 0 || playerCount > 0) {
      logger.debug('Flushing dirty cache states', {
        tournaments: tournamentCount,
        tables: tableCount,
        players: playerCount
      });
    }
    
    this.dirtyTournaments.clear();
    this.dirtyTables.clear();
    this.dirtyPlayers.clear();
  }
  
  private cleanupStaleCache(): void {
    const now = Date.now();
    const staleThreshold = now - this.MAX_CACHE_AGE_MS;
    
    // Remove stale entries that haven't been updated
    for (const [id, state] of this.tableCache) {
      if (state.status === 'closed' && state.lastUpdate < staleThreshold) {
        this.deleteTable(id);
      }
    }
  }
  
  // ==========================================
  // STATISTICS
  // ==========================================
  
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    
    return {
      tournaments: this.tournamentCache.size,
      tables: this.tableCache.size,
      players: this.playerCache.size,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    };
  }
  
  // ==========================================
  // SHUTDOWN
  // ==========================================
  
  shutdown(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    this.flushDirtyStates();
    
    this.tournamentCache.clear();
    this.tableCache.clear();
    this.playerCache.clear();
    this.tournamentTables.clear();
    this.tournamentPlayers.clear();
    this.tablePlayers.clear();
    
    logger.info('TournamentStateCache shutdown complete');
  }
}

// Singleton instance
export const tournamentStateCache = new TournamentStateCache();
