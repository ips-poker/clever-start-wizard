/**
 * State Delta Compression
 * Sends only changed fields instead of full game state
 * Critical for reducing bandwidth with 300+ tables
 */

import { logger } from './logger.js';

interface GameStateSnapshot {
  handId: string | null;
  phase: string;
  pot: number;
  currentBet: number;
  currentPlayerSeat: number | null;
  communityCards: string[];
  dealerSeat: number;
  players: Map<string, PlayerSnapshot>;
  sidePots: SidePotSnapshot[];
  minRaise: number;
  isComplete: boolean;
}

interface PlayerSnapshot {
  stack: number;
  betAmount: number;
  isFolded: boolean;
  isAllIn: boolean;
  status: string;
}

interface SidePotSnapshot {
  amount: number;
  eligiblePlayers: string[];
}

export interface StateDelta {
  type: 'delta';
  version: number;
  changes: Record<string, unknown>;
  playerChanges?: Record<string, Partial<PlayerSnapshot>>;
  timestamp: number;
}

export interface FullState {
  type: 'full';
  version: number;
  state: Record<string, unknown>;
  timestamp: number;
}

export class StateDeltaCompressor {
  private tableSnapshots: Map<string, {
    snapshot: GameStateSnapshot;
    version: number;
    lastFullSyncTime: number;
  }> = new Map();
  
  private readonly fullSyncIntervalMs: number;
  private readonly maxDeltaCount: number;
  
  private deltasGenerated: number = 0;
  private fullSyncsGenerated: number = 0;
  private bytesSaved: number = 0;
  
  constructor(options: {
    fullSyncIntervalMs?: number;
    maxDeltaCount?: number;
  } = {}) {
    this.fullSyncIntervalMs = options.fullSyncIntervalMs ?? 60000;
    this.maxDeltaCount = options.maxDeltaCount ?? 50;
  }
  
  /**
   * Generate delta or full state based on changes
   */
  generateUpdate(
    tableId: string,
    currentState: Record<string, unknown>,
    forceFullSync: boolean = false
  ): StateDelta | FullState {
    const existing = this.tableSnapshots.get(tableId);
    const now = Date.now();
    
    // Force full sync conditions
    const needsFullSync = forceFullSync ||
      !existing ||
      (now - existing.lastFullSyncTime > this.fullSyncIntervalMs) ||
      currentState.handId !== existing.snapshot.handId;
    
    if (needsFullSync) {
      return this.generateFullState(tableId, currentState);
    }
    
    // Generate delta
    return this.generateDelta(tableId, existing, currentState);
  }
  
  /**
   * Generate full state update
   */
  private generateFullState(
    tableId: string,
    state: Record<string, unknown>
  ): FullState {
    const now = Date.now();
    const version = (this.tableSnapshots.get(tableId)?.version || 0) + 1;
    
    // Create snapshot for future deltas
    const snapshot = this.createSnapshot(state);
    this.tableSnapshots.set(tableId, {
      snapshot,
      version,
      lastFullSyncTime: now
    });
    
    this.fullSyncsGenerated++;
    
    return {
      type: 'full',
      version,
      state,
      timestamp: now
    };
  }
  
  /**
   * Generate delta update
   */
  private generateDelta(
    tableId: string,
    existing: { snapshot: GameStateSnapshot; version: number; lastFullSyncTime: number },
    currentState: Record<string, unknown>
  ): StateDelta | FullState {
    const now = Date.now();
    const changes: Record<string, unknown> = {};
    const playerChanges: Record<string, Partial<PlayerSnapshot>> = {};
    
    const oldSnapshot = existing.snapshot;
    const newSnapshot = this.createSnapshot(currentState);
    
    // Compare top-level fields
    if (newSnapshot.phase !== oldSnapshot.phase) changes.phase = newSnapshot.phase;
    if (newSnapshot.pot !== oldSnapshot.pot) changes.pot = newSnapshot.pot;
    if (newSnapshot.currentBet !== oldSnapshot.currentBet) changes.currentBet = newSnapshot.currentBet;
    if (newSnapshot.currentPlayerSeat !== oldSnapshot.currentPlayerSeat) changes.currentPlayerSeat = newSnapshot.currentPlayerSeat;
    if (newSnapshot.minRaise !== oldSnapshot.minRaise) changes.minRaise = newSnapshot.minRaise;
    if (newSnapshot.isComplete !== oldSnapshot.isComplete) changes.isComplete = newSnapshot.isComplete;
    if (newSnapshot.dealerSeat !== oldSnapshot.dealerSeat) changes.dealerSeat = newSnapshot.dealerSeat;
    
    // Compare community cards
    if (!this.arraysEqual(newSnapshot.communityCards, oldSnapshot.communityCards)) {
      changes.communityCards = newSnapshot.communityCards;
    }
    
    // Compare side pots
    if (!this.sidePotsEqual(newSnapshot.sidePots, oldSnapshot.sidePots)) {
      changes.sidePots = newSnapshot.sidePots;
    }
    
    // Compare players
    for (const [playerId, newPlayer] of newSnapshot.players) {
      const oldPlayer = oldSnapshot.players.get(playerId);
      
      if (!oldPlayer) {
        // New player
        playerChanges[playerId] = newPlayer;
      } else {
        // Compare fields
        const diff: Partial<PlayerSnapshot> = {};
        if (newPlayer.stack !== oldPlayer.stack) diff.stack = newPlayer.stack;
        if (newPlayer.betAmount !== oldPlayer.betAmount) diff.betAmount = newPlayer.betAmount;
        if (newPlayer.isFolded !== oldPlayer.isFolded) diff.isFolded = newPlayer.isFolded;
        if (newPlayer.isAllIn !== oldPlayer.isAllIn) diff.isAllIn = newPlayer.isAllIn;
        if (newPlayer.status !== oldPlayer.status) diff.status = newPlayer.status;
        
        if (Object.keys(diff).length > 0) {
          playerChanges[playerId] = diff;
        }
      }
    }
    
    // Check for removed players
    for (const playerId of oldSnapshot.players.keys()) {
      if (!newSnapshot.players.has(playerId)) {
        playerChanges[playerId] = { status: 'removed' } as Partial<PlayerSnapshot>;
      }
    }
    
    // If delta is too large, send full state
    const deltaSize = JSON.stringify({ changes, playerChanges }).length;
    const fullSize = JSON.stringify(currentState).length;
    
    if (deltaSize > fullSize * 0.7) {
      return this.generateFullState(tableId, currentState);
    }
    
    // Update snapshot
    const version = existing.version + 1;
    this.tableSnapshots.set(tableId, {
      snapshot: newSnapshot,
      version,
      lastFullSyncTime: existing.lastFullSyncTime
    });
    
    this.deltasGenerated++;
    this.bytesSaved += fullSize - deltaSize;
    
    return {
      type: 'delta',
      version,
      changes,
      playerChanges: Object.keys(playerChanges).length > 0 ? playerChanges : undefined,
      timestamp: now
    };
  }
  
  /**
   * Create snapshot from state
   */
  private createSnapshot(state: Record<string, unknown>): GameStateSnapshot {
    const players = new Map<string, PlayerSnapshot>();
    
    const playersArray = state.players as Array<{
      id: string;
      stack: number;
      betAmount?: number;
      currentBet?: number;
      isFolded: boolean;
      isAllIn: boolean;
      status: string;
    }> || [];
    
    for (const player of playersArray) {
      players.set(player.id, {
        stack: player.stack,
        betAmount: player.betAmount ?? player.currentBet ?? 0,
        isFolded: player.isFolded,
        isAllIn: player.isAllIn,
        status: player.status
      });
    }
    
    return {
      handId: state.handId as string | null,
      phase: state.phase as string || 'waiting',
      pot: state.pot as number || 0,
      currentBet: state.currentBet as number || 0,
      currentPlayerSeat: state.currentPlayerSeat as number | null,
      communityCards: (state.communityCards as string[]) || [],
      dealerSeat: state.dealerSeat as number || 0,
      players,
      sidePots: (state.sidePots as SidePotSnapshot[]) || [],
      minRaise: state.minRaise as number || 0,
      isComplete: state.isComplete as boolean || false
    };
  }
  
  /**
   * Compare arrays
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  
  /**
   * Compare side pots
   */
  private sidePotsEqual(a: SidePotSnapshot[], b: SidePotSnapshot[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].amount !== b[i].amount) return false;
      if (!this.arraysEqual(a[i].eligiblePlayers, b[i].eligiblePlayers)) return false;
    }
    return true;
  }
  
  /**
   * Apply delta to state
   */
  applyDelta(
    currentState: Record<string, unknown>,
    delta: StateDelta
  ): Record<string, unknown> {
    const newState = { ...currentState };
    
    // Apply top-level changes
    for (const [key, value] of Object.entries(delta.changes)) {
      newState[key] = value;
    }
    
    // Apply player changes
    if (delta.playerChanges) {
      const players = [...(currentState.players as unknown[] || [])] as Record<string, unknown>[];
      
      for (const [playerId, changes] of Object.entries(delta.playerChanges)) {
        if (changes.status === 'removed') {
          const idx = players.findIndex(p => p.id === playerId);
          if (idx !== -1) players.splice(idx, 1);
        } else {
          const player = players.find(p => p.id === playerId);
          if (player) {
            Object.assign(player, changes);
          } else {
            players.push({ id: playerId, ...changes });
          }
        }
      }
      
      newState.players = players;
    }
    
    return newState;
  }
  
  /**
   * Clear table snapshot
   */
  clearTable(tableId: string): void {
    this.tableSnapshots.delete(tableId);
  }
  
  /**
   * Get statistics
   */
  getStats(): {
    tablesTracked: number;
    deltasGenerated: number;
    fullSyncsGenerated: number;
    bytesSaved: number;
    deltaRatio: number;
  } {
    const total = this.deltasGenerated + this.fullSyncsGenerated;
    return {
      tablesTracked: this.tableSnapshots.size,
      deltasGenerated: this.deltasGenerated,
      fullSyncsGenerated: this.fullSyncsGenerated,
      bytesSaved: this.bytesSaved,
      deltaRatio: total > 0 ? Math.round((this.deltasGenerated / total) * 100) : 0
    };
  }
  
  /**
   * Cleanup old snapshots
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = this.fullSyncIntervalMs * 5;
    
    for (const [tableId, data] of this.tableSnapshots) {
      if (now - data.lastFullSyncTime > maxAge) {
        this.tableSnapshots.delete(tableId);
      }
    }
  }
}

// Singleton instance
export const stateDeltaCompressor = new StateDeltaCompressor({
  fullSyncIntervalMs: 60000,
  maxDeltaCount: 50
});
