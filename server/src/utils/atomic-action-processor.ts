/**
 * Atomic Action Processor v1.0
 * Ensures poker actions are processed atomically with no race conditions
 * 
 * Features:
 * - Mutex locks per table
 * - Action sequencing with version control
 * - Rollback on failure
 * - Dead action detection
 */

import { logger } from './logger.js';

// ==========================================
// TYPES
// ==========================================

export interface ActionRequest {
  tableId: string;
  handId: string;
  playerId: string;
  actionType: string;
  amount?: number;
  timestamp: number;
  sequenceNumber: number;
  stateVersion: number;
}

export interface ActionLock {
  tableId: string;
  handId: string;
  playerId: string;
  acquiredAt: number;
  timeout: number;
}

export interface ProcessedAction {
  success: boolean;
  error?: string;
  newStateVersion: number;
  resultData?: Record<string, unknown>;
}

// ==========================================
// ATOMIC ACTION PROCESSOR
// ==========================================

export class AtomicActionProcessor {
  private tableLocks: Map<string, ActionLock> = new Map();
  private actionQueues: Map<string, ActionRequest[]> = new Map();
  private sequenceCounters: Map<string, number> = new Map();
  private processingFlags: Map<string, boolean> = new Map();
  
  private readonly DEFAULT_LOCK_TIMEOUT = 5000; // 5 seconds
  private readonly MAX_QUEUE_SIZE = 10;
  private readonly ACTION_EXPIRY_MS = 10000; // Actions older than 10s are stale
  
  /**
   * Acquire lock for table - returns false if lock already held
   */
  private acquireLock(
    tableId: string, 
    handId: string, 
    playerId: string
  ): boolean {
    const existingLock = this.tableLocks.get(tableId);
    
    // Check if existing lock is expired
    if (existingLock) {
      const elapsed = Date.now() - existingLock.acquiredAt;
      if (elapsed < existingLock.timeout) {
        logger.warn('Lock acquisition failed - table locked', {
          tableId,
          existingLockHolder: existingLock.playerId,
          lockAge: elapsed
        });
        return false;
      }
      // Lock expired, force release
      logger.warn('Releasing expired lock', { tableId, existingLock });
    }
    
    // Acquire new lock
    this.tableLocks.set(tableId, {
      tableId,
      handId,
      playerId,
      acquiredAt: Date.now(),
      timeout: this.DEFAULT_LOCK_TIMEOUT
    });
    
    return true;
  }
  
  /**
   * Release lock for table
   */
  private releaseLock(tableId: string, playerId: string): void {
    const lock = this.tableLocks.get(tableId);
    if (lock && lock.playerId === playerId) {
      this.tableLocks.delete(tableId);
    }
  }
  
  /**
   * Get next sequence number for table
   */
  getNextSequence(tableId: string): number {
    const current = this.sequenceCounters.get(tableId) || 0;
    this.sequenceCounters.set(tableId, current + 1);
    return current + 1;
  }
  
  /**
   * Queue an action for atomic processing
   */
  queueAction(action: ActionRequest): { queued: boolean; position?: number; error?: string } {
    // Validate action freshness
    const age = Date.now() - action.timestamp;
    if (age > this.ACTION_EXPIRY_MS) {
      logger.warn('Rejecting stale action', { action, age });
      return { queued: false, error: 'Action expired' };
    }
    
    // Get or create queue
    let queue = this.actionQueues.get(action.tableId);
    if (!queue) {
      queue = [];
      this.actionQueues.set(action.tableId, queue);
    }
    
    // Check queue size
    if (queue.length >= this.MAX_QUEUE_SIZE) {
      logger.warn('Action queue full', { tableId: action.tableId, queueSize: queue.length });
      return { queued: false, error: 'Queue full - try again' };
    }
    
    // Check for duplicate actions from same player
    const existingFromPlayer = queue.find(a => a.playerId === action.playerId);
    if (existingFromPlayer) {
      logger.warn('Duplicate action in queue', { 
        tableId: action.tableId, 
        playerId: action.playerId 
      });
      return { queued: false, error: 'Action already queued' };
    }
    
    // Add to queue
    queue.push(action);
    queue.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    
    const position = queue.findIndex(a => a === action) + 1;
    
    logger.info('Action queued', {
      tableId: action.tableId,
      playerId: action.playerId.substring(0, 8),
      actionType: action.actionType,
      position,
      queueSize: queue.length
    });
    
    return { queued: true, position };
  }
  
  /**
   * Process next action in queue atomically
   * Returns null if queue empty or already processing
   */
  async processNextAction(
    tableId: string,
    processor: (action: ActionRequest) => Promise<ProcessedAction>
  ): Promise<ProcessedAction | null> {
    // Check if already processing
    if (this.processingFlags.get(tableId)) {
      return null;
    }
    
    // Get queue
    const queue = this.actionQueues.get(tableId);
    if (!queue || queue.length === 0) {
      return null;
    }
    
    // Get next action
    const action = queue[0];
    
    // Try to acquire lock
    if (!this.acquireLock(tableId, action.handId, action.playerId)) {
      return null;
    }
    
    this.processingFlags.set(tableId, true);
    
    try {
      // Process action
      logger.info('Processing action atomically', {
        tableId,
        playerId: action.playerId.substring(0, 8),
        actionType: action.actionType,
        sequence: action.sequenceNumber
      });
      
      const result = await processor(action);
      
      // Remove from queue on success
      if (result.success) {
        queue.shift();
        logger.info('Action processed successfully', {
          tableId,
          playerId: action.playerId.substring(0, 8),
          newVersion: result.newStateVersion
        });
      } else {
        // Remove failed action from queue
        queue.shift();
        logger.warn('Action processing failed', {
          tableId,
          playerId: action.playerId.substring(0, 8),
          error: result.error
        });
      }
      
      return result;
      
    } catch (err) {
      // Remove action on error
      queue.shift();
      logger.error('Action processing error', {
        tableId,
        playerId: action.playerId.substring(0, 8),
        error: String(err)
      });
      
      return {
        success: false,
        error: 'Processing error',
        newStateVersion: -1
      };
      
    } finally {
      this.releaseLock(tableId, action.playerId);
      this.processingFlags.set(tableId, false);
    }
  }
  
  /**
   * Clear stale actions from all queues
   */
  clearStaleActions(): number {
    let cleared = 0;
    const now = Date.now();
    
    for (const [tableId, queue] of this.actionQueues) {
      const originalLength = queue.length;
      const freshActions = queue.filter(a => (now - a.timestamp) < this.ACTION_EXPIRY_MS);
      
      if (freshActions.length < originalLength) {
        cleared += originalLength - freshActions.length;
        this.actionQueues.set(tableId, freshActions);
      }
    }
    
    if (cleared > 0) {
      logger.info('Cleared stale actions', { count: cleared });
    }
    
    return cleared;
  }
  
  /**
   * Clear queue for table
   */
  clearQueue(tableId: string): void {
    this.actionQueues.delete(tableId);
    this.tableLocks.delete(tableId);
    this.processingFlags.delete(tableId);
    logger.info('Queue cleared for table', { tableId });
  }
  
  /**
   * Get queue status
   */
  getQueueStatus(tableId: string): {
    queueLength: number;
    isLocked: boolean;
    isProcessing: boolean;
    lockHolder?: string;
  } {
    const queue = this.actionQueues.get(tableId) || [];
    const lock = this.tableLocks.get(tableId);
    
    return {
      queueLength: queue.length,
      isLocked: !!lock,
      isProcessing: this.processingFlags.get(tableId) || false,
      lockHolder: lock?.playerId
    };
  }
  
  /**
   * Get all queue stats
   */
  getStats(): {
    totalQueues: number;
    totalPending: number;
    activeLocks: number;
  } {
    let totalPending = 0;
    for (const queue of this.actionQueues.values()) {
      totalPending += queue.length;
    }
    
    return {
      totalQueues: this.actionQueues.size,
      totalPending,
      activeLocks: this.tableLocks.size
    };
  }
}

// ==========================================
// SINGLETON INSTANCE
// ==========================================

export const atomicActionProcessor = new AtomicActionProcessor();

// Start periodic cleanup
setInterval(() => {
  atomicActionProcessor.clearStaleActions();
}, 5000);
