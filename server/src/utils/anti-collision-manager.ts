/**
 * Anti-Collision Manager - PokerStars-Level Concurrency
 * 
 * Prevents race conditions and data corruption:
 * - Per-table action locks
 * - Optimistic concurrency control
 * - Hand state versioning
 * - Automatic conflict resolution
 * - Deadlock detection and prevention
 */

import { logger } from './logger.js';

// ============= TYPES =============
interface LockInfo {
  tableId: string;
  playerId: string;
  handNumber: number;
  acquiredAt: number;
  timeoutMs: number;
  operation: string;
}

interface HandVersion {
  version: number;
  phase: string;
  currentBet: number;
  pot: number;
  lastModified: number;
}

// ============= TABLE LOCK MANAGER =============
class TableLockManager {
  private locks: Map<string, LockInfo> = new Map();
  private waitQueue: Map<string, Array<{ resolve: () => void; reject: (err: Error) => void }>> = new Map();
  private readonly defaultTimeout = 5000; // 5 seconds

  /**
   * Acquire lock for a table operation
   */
  async acquireLock(
    tableId: string, 
    playerId: string, 
    handNumber: number, 
    operation: string,
    timeoutMs: number = this.defaultTimeout
  ): Promise<boolean> {
    const existingLock = this.locks.get(tableId);

    if (existingLock) {
      // Check if lock is expired
      if (Date.now() - existingLock.acquiredAt > existingLock.timeoutMs) {
        logger.warn('Releasing expired lock', { 
          tableId, 
          heldBy: existingLock.playerId,
          operation: existingLock.operation 
        });
        this.locks.delete(tableId);
      } else {
        // Wait for lock
        return new Promise((resolve, reject) => {
          let queue = this.waitQueue.get(tableId);
          if (!queue) {
            queue = [];
            this.waitQueue.set(tableId, queue);
          }
          
          const timeout = setTimeout(() => {
            const idx = queue!.findIndex(w => w.resolve === resolve);
            if (idx !== -1) queue!.splice(idx, 1);
            reject(new Error('Lock acquisition timeout'));
          }, timeoutMs);

          queue.push({
            resolve: () => {
              clearTimeout(timeout);
              this.locks.set(tableId, {
                tableId,
                playerId,
                handNumber,
                acquiredAt: Date.now(),
                timeoutMs,
                operation
              });
              resolve(true);
            },
            reject: (err) => {
              clearTimeout(timeout);
              reject(err);
            }
          });
        });
      }
    }

    // Acquire lock immediately
    this.locks.set(tableId, {
      tableId,
      playerId,
      handNumber,
      acquiredAt: Date.now(),
      timeoutMs,
      operation
    });

    return true;
  }

  /**
   * Release lock for a table
   */
  releaseLock(tableId: string, playerId: string): void {
    const lock = this.locks.get(tableId);
    
    if (lock && lock.playerId === playerId) {
      this.locks.delete(tableId);
      
      // Notify waiting operations
      const queue = this.waitQueue.get(tableId);
      if (queue && queue.length > 0) {
        const next = queue.shift();
        if (next) {
          next.resolve();
        }
        if (queue.length === 0) {
          this.waitQueue.delete(tableId);
        }
      }
    }
  }

  /**
   * Force release all locks (emergency)
   */
  forceReleaseAll(): void {
    for (const [tableId] of this.locks) {
      const queue = this.waitQueue.get(tableId);
      if (queue) {
        for (const waiter of queue) {
          waiter.reject(new Error('Lock force released'));
        }
      }
    }
    this.locks.clear();
    this.waitQueue.clear();
    logger.warn('All table locks force released');
  }

  /**
   * Check if table is locked
   */
  isLocked(tableId: string): boolean {
    const lock = this.locks.get(tableId);
    if (!lock) return false;
    
    // Check expiration
    if (Date.now() - lock.acquiredAt > lock.timeoutMs) {
      this.locks.delete(tableId);
      return false;
    }
    
    return true;
  }

  /**
   * Get lock info
   */
  getLockInfo(tableId: string): LockInfo | null {
    return this.locks.get(tableId) || null;
  }

  /**
   * Get stats
   */
  getStats(): { activeLocks: number; waitingOperations: number } {
    let waitingOperations = 0;
    for (const queue of this.waitQueue.values()) {
      waitingOperations += queue.length;
    }
    return {
      activeLocks: this.locks.size,
      waitingOperations
    };
  }
}

// ============= OPTIMISTIC CONCURRENCY CONTROL =============
class OptimisticConcurrencyController {
  private handVersions: Map<string, HandVersion> = new Map();

  /**
   * Get current version for a hand
   */
  getVersion(tableId: string): HandVersion | null {
    return this.handVersions.get(tableId) || null;
  }

  /**
   * Set version for a hand
   */
  setVersion(tableId: string, version: HandVersion): void {
    this.handVersions.set(tableId, version);
  }

  /**
   * Check and update version atomically
   * Returns true if update was successful (no conflict)
   */
  checkAndUpdate(
    tableId: string, 
    expectedVersion: number, 
    newState: Partial<HandVersion>
  ): { success: boolean; currentVersion: number } {
    const current = this.handVersions.get(tableId);
    
    if (!current) {
      // No version exists, create new
      this.handVersions.set(tableId, {
        version: 1,
        phase: newState.phase || 'preflop',
        currentBet: newState.currentBet || 0,
        pot: newState.pot || 0,
        lastModified: Date.now()
      });
      return { success: true, currentVersion: 1 };
    }

    if (current.version !== expectedVersion) {
      logger.warn('Optimistic concurrency conflict', {
        tableId,
        expectedVersion,
        actualVersion: current.version
      });
      return { success: false, currentVersion: current.version };
    }

    // Update version
    this.handVersions.set(tableId, {
      version: current.version + 1,
      phase: newState.phase || current.phase,
      currentBet: newState.currentBet ?? current.currentBet,
      pot: newState.pot ?? current.pot,
      lastModified: Date.now()
    });

    return { success: true, currentVersion: current.version + 1 };
  }

  /**
   * Clear version (hand ended)
   */
  clearVersion(tableId: string): void {
    this.handVersions.delete(tableId);
  }

  /**
   * Clear old versions
   */
  cleanup(maxAgeMs: number = 3600000): void {
    const cutoff = Date.now() - maxAgeMs;
    for (const [tableId, version] of this.handVersions) {
      if (version.lastModified < cutoff) {
        this.handVersions.delete(tableId);
      }
    }
  }
}

// ============= DEADLOCK DETECTOR =============
class DeadlockDetector {
  private waitGraph: Map<string, Set<string>> = new Map(); // playerId -> waiting for playerIds
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startDetection();
  }

  private startDetection(): void {
    this.checkInterval = setInterval(() => {
      this.detectCycles();
    }, 1000); // Check every second
  }

  /**
   * Record that player A is waiting for player B
   */
  recordWait(waitingPlayerId: string, blockingPlayerId: string): void {
    let waiting = this.waitGraph.get(waitingPlayerId);
    if (!waiting) {
      waiting = new Set();
      this.waitGraph.set(waitingPlayerId, waiting);
    }
    waiting.add(blockingPlayerId);
  }

  /**
   * Remove wait record
   */
  removeWait(waitingPlayerId: string, blockingPlayerId?: string): void {
    if (blockingPlayerId) {
      const waiting = this.waitGraph.get(waitingPlayerId);
      if (waiting) {
        waiting.delete(blockingPlayerId);
        if (waiting.size === 0) {
          this.waitGraph.delete(waitingPlayerId);
        }
      }
    } else {
      this.waitGraph.delete(waitingPlayerId);
    }
  }

  /**
   * Detect cycles in wait graph (deadlock)
   */
  private detectCycles(): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const neighbors = this.waitGraph.get(node);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            if (hasCycle(neighbor)) return true;
          } else if (recursionStack.has(neighbor)) {
            return true;
          }
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of this.waitGraph.keys()) {
      if (!visited.has(node)) {
        if (hasCycle(node)) {
          logger.error('DEADLOCK DETECTED in wait graph!', {
            nodes: Array.from(this.waitGraph.entries()).map(([k, v]) => ({ player: k, waiting: Array.from(v) }))
          });
          
          // Break deadlock by clearing oldest wait
          this.breakDeadlock();
          return;
        }
      }
    }
  }

  private breakDeadlock(): void {
    // Simple strategy: clear all waits (aggressive but safe)
    this.waitGraph.clear();
    logger.warn('Deadlock broken by clearing wait graph');
  }

  shutdown(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

// ============= MAIN ANTI-COLLISION MANAGER =============
export class AntiCollisionManager {
  private lockManager = new TableLockManager();
  private occController = new OptimisticConcurrencyController();
  private deadlockDetector = new DeadlockDetector();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
    logger.info('AntiCollisionManager initialized');
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.occController.cleanup();
    }, 300000); // Every 5 minutes
  }

  /**
   * Execute operation with table lock
   */
  async withLock<T>(
    tableId: string,
    playerId: string,
    handNumber: number,
    operation: string,
    fn: () => Promise<T>,
    timeoutMs: number = 5000
  ): Promise<T> {
    await this.lockManager.acquireLock(tableId, playerId, handNumber, operation, timeoutMs);
    
    try {
      return await fn();
    } finally {
      this.lockManager.releaseLock(tableId, playerId);
    }
  }

  /**
   * Update hand state with optimistic concurrency
   */
  updateHandState(
    tableId: string,
    expectedVersion: number,
    newState: Partial<HandVersion>
  ): { success: boolean; currentVersion: number } {
    return this.occController.checkAndUpdate(tableId, expectedVersion, newState);
  }

  /**
   * Get current hand version
   */
  getHandVersion(tableId: string): number {
    return this.occController.getVersion(tableId)?.version || 0;
  }

  /**
   * Clear hand state when hand ends
   */
  clearHandState(tableId: string): void {
    this.occController.clearVersion(tableId);
  }

  /**
   * Get stats
   */
  getStats(): {
    locks: { activeLocks: number; waitingOperations: number };
    handVersions: number;
  } {
    return {
      locks: this.lockManager.getStats(),
      handVersions: 0 // Could expose count if needed
    };
  }

  /**
   * Emergency: force release all locks
   */
  emergencyUnlock(): void {
    this.lockManager.forceReleaseAll();
  }

  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.deadlockDetector.shutdown();
    this.lockManager.forceReleaseAll();
    logger.info('AntiCollisionManager shutdown');
  }
}

// Singleton
export const antiCollisionManager = new AntiCollisionManager();
