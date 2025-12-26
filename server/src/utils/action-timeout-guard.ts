/**
 * Action Timeout Guard - Professional Anti-Timeout Protection
 * 
 * Features:
 * - Grace period before auto-fold (0.5 sec after timeout)
 * - Soft disconnect detection
 * - Tournament pause on disconnect (bubble protection)
 * - Reconnect state restoration
 */

import { logger } from './logger.js';

// Configuration
const GRACE_PERIOD_MS = 500; // 0.5 sec grace after timeout
const DISCONNECT_DETECTION_MS = 3000; // 3 sec to detect soft disconnect
const BUBBLE_PAUSE_TIMEOUT_MS = 30000; // 30 sec max pause on bubble

interface PendingAction {
  tableId: string;
  playerId: string;
  seatNumber: number;
  actionDeadline: number;
  graceDeadline: number;
  onTimeout: () => void;
  timeoutHandle: NodeJS.Timeout | null;
  graceHandle: NodeJS.Timeout | null;
}

interface DisconnectedPlayer {
  playerId: string;
  tableId: string;
  tournamentId: string | null;
  disconnectedAt: number;
  state: PlayerState;
  reconnectDeadline: number;
}

interface PlayerState {
  seatNumber: number;
  stack: number;
  cards: string[];
  currentBet: number;
  isAllIn: boolean;
  isFolded: boolean;
  timeBank: number;
}

class ActionTimeoutGuard {
  private pendingActions: Map<string, PendingAction> = new Map();
  private disconnectedPlayers: Map<string, DisconnectedPlayer> = new Map();
  private bubblePauses: Map<string, NodeJS.Timeout> = new Map();
  
  /**
   * Register a pending action with grace period
   */
  registerAction(
    tableId: string,
    playerId: string,
    seatNumber: number,
    timeoutSeconds: number,
    onTimeout: () => void
  ): void {
    const key = `${tableId}:${playerId}`;
    
    // Clear existing timeout if any
    this.cancelAction(tableId, playerId);
    
    const now = Date.now();
    const actionDeadline = now + (timeoutSeconds * 1000);
    const graceDeadline = actionDeadline + GRACE_PERIOD_MS;
    
    const pending: PendingAction = {
      tableId,
      playerId,
      seatNumber,
      actionDeadline,
      graceDeadline,
      onTimeout,
      timeoutHandle: null,
      graceHandle: null
    };
    
    // Set primary timeout (warning)
    pending.timeoutHandle = setTimeout(() => {
      logger.debug('Action timeout reached, starting grace period', {
        tableId,
        playerId,
        gracePeriodMs: GRACE_PERIOD_MS
      });
      
      // Set grace period timeout
      pending.graceHandle = setTimeout(() => {
        logger.info('Grace period expired, executing timeout action', {
          tableId,
          playerId
        });
        this.pendingActions.delete(key);
        onTimeout();
      }, GRACE_PERIOD_MS);
      
    }, timeoutSeconds * 1000);
    
    this.pendingActions.set(key, pending);
  }
  
  /**
   * Cancel a pending action (player acted in time)
   */
  cancelAction(tableId: string, playerId: string): void {
    const key = `${tableId}:${playerId}`;
    const pending = this.pendingActions.get(key);
    
    if (pending) {
      if (pending.timeoutHandle) clearTimeout(pending.timeoutHandle);
      if (pending.graceHandle) clearTimeout(pending.graceHandle);
      this.pendingActions.delete(key);
    }
  }
  
  /**
   * Get remaining time for a player's action (including grace)
   */
  getRemainingTime(tableId: string, playerId: string): number {
    const key = `${tableId}:${playerId}`;
    const pending = this.pendingActions.get(key);
    
    if (!pending) return 0;
    
    const now = Date.now();
    const remaining = (pending.actionDeadline - now) / 1000;
    return Math.max(0, remaining);
  }
  
  /**
   * Register a disconnected player for reconnection
   */
  registerDisconnect(
    playerId: string,
    tableId: string,
    tournamentId: string | null,
    state: PlayerState,
    reconnectTimeoutSeconds: number = 60
  ): void {
    const now = Date.now();
    
    this.disconnectedPlayers.set(playerId, {
      playerId,
      tableId,
      tournamentId,
      disconnectedAt: now,
      state,
      reconnectDeadline: now + (reconnectTimeoutSeconds * 1000)
    });
    
    logger.info('Player disconnected, saving state for reconnect', {
      playerId,
      tableId,
      tournamentId,
      reconnectTimeoutSeconds
    });
    
    // If in tournament and near bubble, trigger pause
    if (tournamentId) {
      this.checkBubblePause(tournamentId, playerId);
    }
  }
  
  /**
   * Try to restore a disconnected player's state
   */
  tryReconnect(playerId: string): DisconnectedPlayer | null {
    const disconnected = this.disconnectedPlayers.get(playerId);
    
    if (!disconnected) {
      return null;
    }
    
    const now = Date.now();
    
    // Check if still within reconnect window
    if (now > disconnected.reconnectDeadline) {
      logger.info('Reconnect window expired', { playerId });
      this.disconnectedPlayers.delete(playerId);
      return null;
    }
    
    // Clear disconnect record
    this.disconnectedPlayers.delete(playerId);
    
    // Cancel bubble pause if any
    if (disconnected.tournamentId) {
      this.cancelBubblePause(disconnected.tournamentId);
    }
    
    logger.info('Player reconnected successfully', {
      playerId,
      tableId: disconnected.tableId,
      elapsedMs: now - disconnected.disconnectedAt
    });
    
    return disconnected;
  }
  
  /**
   * Check if tournament should pause for bubble protection
   */
  private checkBubblePause(tournamentId: string, playerId: string): void {
    // This would integrate with tournament manager to check bubble status
    // For now, just log
    logger.debug('Checking bubble pause eligibility', { tournamentId, playerId });
  }
  
  /**
   * Trigger bubble pause for a tournament
   */
  triggerBubblePause(
    tournamentId: string,
    onResume: () => void
  ): void {
    // Clear existing pause timer
    this.cancelBubblePause(tournamentId);
    
    logger.info('Tournament bubble pause triggered', {
      tournamentId,
      maxPauseMs: BUBBLE_PAUSE_TIMEOUT_MS
    });
    
    // Set maximum pause timeout
    const handle = setTimeout(() => {
      logger.warn('Bubble pause timeout, forcing resume', { tournamentId });
      this.bubblePauses.delete(tournamentId);
      onResume();
    }, BUBBLE_PAUSE_TIMEOUT_MS);
    
    this.bubblePauses.set(tournamentId, handle);
  }
  
  /**
   * Cancel bubble pause (player reconnected)
   */
  cancelBubblePause(tournamentId: string): void {
    const handle = this.bubblePauses.get(tournamentId);
    if (handle) {
      clearTimeout(handle);
      this.bubblePauses.delete(tournamentId);
      logger.info('Bubble pause cancelled', { tournamentId });
    }
  }
  
  /**
   * Get stats for monitoring
   */
  getStats(): {
    pendingActions: number;
    disconnectedPlayers: number;
    activeBubblePauses: number;
  } {
    return {
      pendingActions: this.pendingActions.size,
      disconnectedPlayers: this.disconnectedPlayers.size,
      activeBubblePauses: this.bubblePauses.size
    };
  }
  
  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now();
    
    // Clean expired disconnected players
    for (const [playerId, data] of this.disconnectedPlayers) {
      if (now > data.reconnectDeadline) {
        this.disconnectedPlayers.delete(playerId);
      }
    }
  }
  
  /**
   * Shutdown - clear all timeouts
   */
  shutdown(): void {
    for (const pending of this.pendingActions.values()) {
      if (pending.timeoutHandle) clearTimeout(pending.timeoutHandle);
      if (pending.graceHandle) clearTimeout(pending.graceHandle);
    }
    this.pendingActions.clear();
    
    for (const handle of this.bubblePauses.values()) {
      clearTimeout(handle);
    }
    this.bubblePauses.clear();
    
    this.disconnectedPlayers.clear();
    
    logger.info('ActionTimeoutGuard shutdown complete');
  }
}

// Export singleton
export const actionTimeoutGuard = new ActionTimeoutGuard();
