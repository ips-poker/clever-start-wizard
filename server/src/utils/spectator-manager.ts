/**
 * Spectator Manager
 * Handles spectators watching games without playing
 */

import { WebSocket } from 'ws';
import { logger } from './logger.js';
import { loadManager, LoadLevel } from './load-manager.js';
import { messageQueue } from './message-queue.js';

interface Spectator {
  id: string;
  ws: WebSocket;
  tableId: string;
  tournamentId: string | null;
  joinedAt: number;
  lastActivity: number;
  ip: string;
}

interface SpectatorMessage {
  type: 'table_update' | 'hand_result' | 'player_action' | 'tournament_update' | 'chat';
  payload: object;
}

class SpectatorManager {
  private spectators: Map<string, Spectator> = new Map();
  private tableSpectators: Map<string, Set<string>> = new Map();
  private tournamentSpectators: Map<string, Set<string>> = new Map();
  
  private readonly MAX_SPECTATORS_PER_TABLE = 100;
  private readonly MAX_SPECTATORS_TOTAL = 2000;
  private readonly INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
    logger.info('SpectatorManager initialized');
  }

  /**
   * Add a spectator to watch a table
   */
  addSpectator(
    spectatorId: string,
    ws: WebSocket,
    tableId: string,
    tournamentId: string | null,
    ip: string
  ): { success: boolean; error?: string } {
    // Check load level
    if (!loadManager.canAcceptSpectator()) {
      return { success: false, error: 'Server under high load, spectating disabled' };
    }

    // Check total limit
    if (this.spectators.size >= this.MAX_SPECTATORS_TOTAL) {
      return { success: false, error: 'Maximum spectators reached' };
    }

    // Check table limit
    const tableSpecs = this.tableSpectators.get(tableId);
    if (tableSpecs && tableSpecs.size >= this.MAX_SPECTATORS_PER_TABLE) {
      return { success: false, error: 'Table spectator limit reached' };
    }

    // Remove existing spectator entry if exists
    this.removeSpectator(spectatorId);

    // Add spectator
    const spectator: Spectator = {
      id: spectatorId,
      ws,
      tableId,
      tournamentId,
      joinedAt: Date.now(),
      lastActivity: Date.now(),
      ip
    };

    this.spectators.set(spectatorId, spectator);

    // Add to table set
    if (!this.tableSpectators.has(tableId)) {
      this.tableSpectators.set(tableId, new Set());
    }
    this.tableSpectators.get(tableId)!.add(spectatorId);

    // Add to tournament set if applicable
    if (tournamentId) {
      if (!this.tournamentSpectators.has(tournamentId)) {
        this.tournamentSpectators.set(tournamentId, new Set());
      }
      this.tournamentSpectators.get(tournamentId)!.add(spectatorId);
    }

    logger.debug('Spectator added', { spectatorId, tableId, tournamentId });
    return { success: true };
  }

  /**
   * Remove a spectator
   */
  removeSpectator(spectatorId: string): boolean {
    const spectator = this.spectators.get(spectatorId);
    if (!spectator) return false;

    // Remove from table set
    const tableSpecs = this.tableSpectators.get(spectator.tableId);
    if (tableSpecs) {
      tableSpecs.delete(spectatorId);
      if (tableSpecs.size === 0) {
        this.tableSpectators.delete(spectator.tableId);
      }
    }

    // Remove from tournament set
    if (spectator.tournamentId) {
      const tourneySpecs = this.tournamentSpectators.get(spectator.tournamentId);
      if (tourneySpecs) {
        tourneySpecs.delete(spectatorId);
        if (tourneySpecs.size === 0) {
          this.tournamentSpectators.delete(spectator.tournamentId);
        }
      }
    }

    this.spectators.delete(spectatorId);
    logger.debug('Spectator removed', { spectatorId });
    return true;
  }

  /**
   * Switch spectator to different table
   */
  switchTable(spectatorId: string, newTableId: string, newTournamentId: string | null): boolean {
    const spectator = this.spectators.get(spectatorId);
    if (!spectator) return false;

    // Check new table limit
    const tableSpecs = this.tableSpectators.get(newTableId);
    if (tableSpecs && tableSpecs.size >= this.MAX_SPECTATORS_PER_TABLE) {
      return false;
    }

    // Remove from old table
    const oldTableSpecs = this.tableSpectators.get(spectator.tableId);
    if (oldTableSpecs) {
      oldTableSpecs.delete(spectatorId);
    }

    // Add to new table
    if (!this.tableSpectators.has(newTableId)) {
      this.tableSpectators.set(newTableId, new Set());
    }
    this.tableSpectators.get(newTableId)!.add(spectatorId);

    spectator.tableId = newTableId;
    spectator.tournamentId = newTournamentId;
    spectator.lastActivity = Date.now();

    return true;
  }

  /**
   * Broadcast to table spectators
   */
  broadcastToTableSpectators(tableId: string, message: SpectatorMessage): number {
    const spectatorIds = this.tableSpectators.get(tableId);
    if (!spectatorIds || spectatorIds.size === 0) return 0;

    let sent = 0;
    const payload = JSON.stringify(message);

    for (const spectatorId of spectatorIds) {
      const spectator = this.spectators.get(spectatorId);
      if (spectator?.ws.readyState === WebSocket.OPEN) {
        try {
          spectator.ws.send(payload);
          sent++;
        } catch {
          // Handle send error
        }
      }
    }

    return sent;
  }

  /**
   * Broadcast to tournament spectators
   */
  broadcastToTournamentSpectators(tournamentId: string, message: SpectatorMessage): number {
    const spectatorIds = this.tournamentSpectators.get(tournamentId);
    if (!spectatorIds || spectatorIds.size === 0) return 0;

    let sent = 0;
    const recipients: Set<WebSocket> = new Set();

    for (const spectatorId of spectatorIds) {
      const spectator = this.spectators.get(spectatorId);
      if (spectator?.ws.readyState === WebSocket.OPEN) {
        recipients.add(spectator.ws);
      }
    }

    // Use message queue for tournament broadcasts
    if (recipients.size > 0) {
      sent = messageQueue.enqueueBroadcast(recipients, message, 'low');
    }

    return sent;
  }

  /**
   * Get spectator counts
   */
  getTableSpectatorCount(tableId: string): number {
    return this.tableSpectators.get(tableId)?.size || 0;
  }

  getTournamentSpectatorCount(tournamentId: string): number {
    return this.tournamentSpectators.get(tournamentId)?.size || 0;
  }

  /**
   * Update spectator activity
   */
  updateActivity(spectatorId: string): void {
    const spectator = this.spectators.get(spectatorId);
    if (spectator) {
      spectator.lastActivity = Date.now();
    }
  }

  /**
   * Disconnect all spectators (for load shedding)
   */
  disconnectAllSpectators(reason: string = 'Server load'): number {
    let disconnected = 0;

    for (const spectator of this.spectators.values()) {
      if (spectator.ws.readyState === WebSocket.OPEN) {
        spectator.ws.close(1000, reason);
        disconnected++;
      }
    }

    this.spectators.clear();
    this.tableSpectators.clear();
    this.tournamentSpectators.clear();

    logger.info('All spectators disconnected', { disconnected, reason });
    return disconnected;
  }

  /**
   * Disconnect spectators from specific table
   */
  disconnectTableSpectators(tableId: string, reason: string = 'Table closed'): number {
    const spectatorIds = this.tableSpectators.get(tableId);
    if (!spectatorIds) return 0;

    let disconnected = 0;
    for (const spectatorId of spectatorIds) {
      const spectator = this.spectators.get(spectatorId);
      if (spectator?.ws.readyState === WebSocket.OPEN) {
        spectator.ws.close(1000, reason);
        disconnected++;
      }
      this.spectators.delete(spectatorId);
    }

    this.tableSpectators.delete(tableId);
    return disconnected;
  }

  // ==========================================
  // CLEANUP
  // ==========================================

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const toRemove: string[] = [];

      for (const [spectatorId, spectator] of this.spectators) {
        // Check for closed connections
        if (spectator.ws.readyState !== WebSocket.OPEN) {
          toRemove.push(spectatorId);
          continue;
        }

        // Check for inactivity
        if (now - spectator.lastActivity > this.INACTIVITY_TIMEOUT) {
          spectator.ws.close(1000, 'Inactivity timeout');
          toRemove.push(spectatorId);
        }
      }

      for (const id of toRemove) {
        this.removeSpectator(id);
      }

      if (toRemove.length > 0) {
        logger.debug('Cleaned inactive spectators', { count: toRemove.length });
      }
    }, 60000); // Every minute
  }

  getStats(): {
    totalSpectators: number;
    tablesWithSpectators: number;
    tournamentsWithSpectators: number;
  } {
    return {
      totalSpectators: this.spectators.size,
      tablesWithSpectators: this.tableSpectators.size,
      tournamentsWithSpectators: this.tournamentSpectators.size
    };
  }

  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.disconnectAllSpectators('Server shutdown');
    logger.info('SpectatorManager shutdown complete');
  }
}

// Singleton instance
export const spectatorManager = new SpectatorManager();
