/**
 * Load Manager for Graceful Degradation
 * Manages system load and enables/disables features based on capacity
 */

import { logger } from './logger.js';

export enum LoadLevel {
  NORMAL = 'NORMAL',
  ELEVATED = 'ELEVATED',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface LoadThresholds {
  elevated: number;   // 60% - start monitoring
  high: number;       // 80% - disable non-essential features
  critical: number;   // 95% - emergency mode
}

export interface SystemLoad {
  connections: number;
  maxConnections: number;
  tables: number;
  maxTables: number;
  heapUsedMB: number;
  maxHeapMB: number;
  eventLoopLagMs: number;
  maxLagMs: number;
}

export class LoadManager {
  private currentLevel: LoadLevel = LoadLevel.NORMAL;
  private readonly thresholds: LoadThresholds;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly listeners: Set<(level: LoadLevel) => void> = new Set();
  
  // Feature flags based on load
  private spectatorModeEnabled: boolean = true;
  private newTournamentsEnabled: boolean = true;
  private chatEnabled: boolean = true;
  private handHistoryEnabled: boolean = true;
  private detailedLoggingEnabled: boolean = true;
  
  // Current metrics
  private currentLoad: SystemLoad = {
    connections: 0,
    maxConnections: 5000,
    tables: 0,
    maxTables: 300,
    heapUsedMB: 0,
    maxHeapMB: 2048,
    eventLoopLagMs: 0,
    maxLagMs: 100
  };

  constructor(thresholds?: Partial<LoadThresholds>) {
    this.thresholds = {
      elevated: thresholds?.elevated ?? 0.6,
      high: thresholds?.high ?? 0.8,
      critical: thresholds?.critical ?? 0.95
    };

    this.startMonitoring();
    logger.info('LoadManager initialized', { thresholds: this.thresholds });
  }

  /**
   * Start load monitoring
   */
  private startMonitoring(): void {
    this.checkInterval = setInterval(() => {
      this.checkLoad();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Update current load metrics
   */
  updateMetrics(metrics: Partial<SystemLoad>): void {
    this.currentLoad = { ...this.currentLoad, ...metrics };
  }

  /**
   * Calculate overall load factor (0-1)
   */
  private calculateLoadFactor(): number {
    const connectionLoad = this.currentLoad.connections / this.currentLoad.maxConnections;
    const tableLoad = this.currentLoad.tables / this.currentLoad.maxTables;
    const memoryLoad = this.currentLoad.heapUsedMB / this.currentLoad.maxHeapMB;
    const lagLoad = Math.min(this.currentLoad.eventLoopLagMs / this.currentLoad.maxLagMs, 1);
    
    // Weighted average - memory and lag are most important
    return (connectionLoad * 0.2 + tableLoad * 0.2 + memoryLoad * 0.35 + lagLoad * 0.25);
  }

  /**
   * Check current load and adjust level
   */
  private checkLoad(): void {
    const loadFactor = this.calculateLoadFactor();
    let newLevel: LoadLevel;

    if (loadFactor >= this.thresholds.critical) {
      newLevel = LoadLevel.CRITICAL;
    } else if (loadFactor >= this.thresholds.high) {
      newLevel = LoadLevel.HIGH;
    } else if (loadFactor >= this.thresholds.elevated) {
      newLevel = LoadLevel.ELEVATED;
    } else {
      newLevel = LoadLevel.NORMAL;
    }

    if (newLevel !== this.currentLevel) {
      this.transitionLevel(newLevel);
    }
  }

  /**
   * Transition to new load level
   */
  private transitionLevel(newLevel: LoadLevel): void {
    const oldLevel = this.currentLevel;
    this.currentLevel = newLevel;

    logger.warn(`Load level changed: ${oldLevel} -> ${newLevel}`, {
      loadFactor: this.calculateLoadFactor(),
      metrics: this.currentLoad
    });

    // Adjust features based on load level
    switch (newLevel) {
      case LoadLevel.NORMAL:
        this.spectatorModeEnabled = true;
        this.newTournamentsEnabled = true;
        this.chatEnabled = true;
        this.handHistoryEnabled = true;
        this.detailedLoggingEnabled = true;
        break;

      case LoadLevel.ELEVATED:
        this.spectatorModeEnabled = true;
        this.newTournamentsEnabled = true;
        this.chatEnabled = true;
        this.handHistoryEnabled = true;
        this.detailedLoggingEnabled = false; // Reduce logging
        break;

      case LoadLevel.HIGH:
        this.spectatorModeEnabled = false; // Disconnect spectators
        this.newTournamentsEnabled = false; // Don't start new tournaments
        this.chatEnabled = false; // Disable chat
        this.handHistoryEnabled = true;
        this.detailedLoggingEnabled = false;
        break;

      case LoadLevel.CRITICAL:
        this.spectatorModeEnabled = false;
        this.newTournamentsEnabled = false;
        this.chatEnabled = false;
        this.handHistoryEnabled = false; // Don't save hand history
        this.detailedLoggingEnabled = false;
        // Force GC if available
        if (global.gc) {
          logger.info('Forcing garbage collection due to CRITICAL load');
          global.gc();
        }
        break;
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(newLevel);
      } catch (err) {
        logger.error('Load level listener error', { error: String(err) });
      }
    }
  }

  /**
   * Add load level change listener
   */
  onLoadChange(callback: (level: LoadLevel) => void): void {
    this.listeners.add(callback);
  }

  /**
   * Remove load level change listener
   */
  removeLoadListener(callback: (level: LoadLevel) => void): void {
    this.listeners.delete(callback);
  }

  // ==========================================
  // FEATURE FLAGS
  // ==========================================

  canAcceptSpectator(): boolean {
    return this.spectatorModeEnabled;
  }

  canStartNewTournament(): boolean {
    return this.newTournamentsEnabled;
  }

  isChatEnabled(): boolean {
    return this.chatEnabled;
  }

  shouldSaveHandHistory(): boolean {
    return this.handHistoryEnabled;
  }

  shouldLogDetailed(): boolean {
    return this.detailedLoggingEnabled;
  }

  // ==========================================
  // STATUS
  // ==========================================

  getLevel(): LoadLevel {
    return this.currentLevel;
  }

  getLoadFactor(): number {
    return this.calculateLoadFactor();
  }

  getStatus(): {
    level: LoadLevel;
    loadFactor: number;
    metrics: SystemLoad;
    features: Record<string, boolean>;
  } {
    return {
      level: this.currentLevel,
      loadFactor: this.calculateLoadFactor(),
      metrics: this.currentLoad,
      features: {
        spectators: this.spectatorModeEnabled,
        newTournaments: this.newTournamentsEnabled,
        chat: this.chatEnabled,
        handHistory: this.handHistoryEnabled,
        detailedLogging: this.detailedLoggingEnabled
      }
    };
  }

  /**
   * Check if system can handle a new connection
   */
  canAcceptConnection(): boolean {
    return this.currentLevel !== LoadLevel.CRITICAL;
  }

  /**
   * Check if system can create a new table
   */
  canCreateTable(): boolean {
    return this.currentLevel === LoadLevel.NORMAL || this.currentLevel === LoadLevel.ELEVATED;
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.listeners.clear();
    logger.info('LoadManager shutdown complete');
  }
}

// Singleton instance
export const loadManager = new LoadManager();
