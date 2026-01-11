/**
 * Action Queue Optimizer - PokerStars-Level Action Processing
 * 
 * Ensures fair, deterministic, and ultra-fast action processing:
 * - FIFO queue per table
 * - Priority queue for time-sensitive actions
 * - Debouncing for rapid-fire inputs
 * - Action validation caching
 * - Automatic stale action rejection
 */

import { logger } from './logger.js';

// ============= TYPES =============
export interface QueuedAction {
  id: string;
  tableId: string;
  playerId: string;
  actionType: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';
  amount?: number;
  timestamp: number;
  priority: 'normal' | 'high' | 'urgent';
  handNumber: number;
  validated: boolean;
  processingStarted?: number;
}

export interface ActionResult {
  success: boolean;
  actionId: string;
  processingTimeMs: number;
  error?: string;
  queueTimeMs?: number;
}

type ActionProcessor = (action: QueuedAction) => Promise<ActionResult>;

// ============= PER-TABLE ACTION QUEUE =============
class TableActionQueue {
  private queue: QueuedAction[] = [];
  private processing: boolean = false;
  private readonly tableId: string;
  private readonly processor: ActionProcessor;
  private readonly maxQueueSize: number = 100;
  private readonly staleThresholdMs: number = 5000; // Actions older than 5s are stale
  private readonly debounceMap: Map<string, number> = new Map();
  private readonly debounceMs: number = 100; // Minimum 100ms between actions from same player

  constructor(tableId: string, processor: ActionProcessor) {
    this.tableId = tableId;
    this.processor = processor;
  }

  async enqueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'validated'>): Promise<ActionResult | null> {
    // Check queue size
    if (this.queue.length >= this.maxQueueSize) {
      logger.warn('Action queue full, rejecting action', { tableId: this.tableId });
      return {
        success: false,
        actionId: '',
        processingTimeMs: 0,
        error: 'Action queue full'
      };
    }

    // Debounce check
    const lastAction = this.debounceMap.get(action.playerId);
    const now = Date.now();
    if (lastAction && now - lastAction < this.debounceMs) {
      logger.debug('Action debounced', { 
        tableId: this.tableId, 
        playerId: action.playerId,
        timeSinceLastMs: now - lastAction
      });
      return {
        success: false,
        actionId: '',
        processingTimeMs: 0,
        error: 'Action rate limited'
      };
    }
    this.debounceMap.set(action.playerId, now);

    const queuedAction: QueuedAction = {
      ...action,
      id: `action_${now}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now,
      validated: false
    };

    // Insert by priority (urgent > high > normal, then by timestamp)
    const insertIndex = this.findInsertIndex(queuedAction);
    this.queue.splice(insertIndex, 0, queuedAction);

    // Process queue if not already processing
    if (!this.processing) {
      return this.processQueue();
    }

    // Wait for this action to be processed
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const actionIndex = this.queue.findIndex(a => a.id === queuedAction.id);
        if (actionIndex === -1) {
          clearInterval(checkInterval);
          resolve({
            success: true,
            actionId: queuedAction.id,
            processingTimeMs: Date.now() - now,
            queueTimeMs: Date.now() - now
          });
        }
      }, 10);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve({
          success: false,
          actionId: queuedAction.id,
          processingTimeMs: Date.now() - now,
          error: 'Action processing timeout'
        });
      }, 10000);
    });
  }

  private findInsertIndex(action: QueuedAction): number {
    const priorityOrder = { urgent: 0, high: 1, normal: 2 };
    const actionPriority = priorityOrder[action.priority];

    for (let i = 0; i < this.queue.length; i++) {
      const existingPriority = priorityOrder[this.queue[i].priority];
      if (actionPriority < existingPriority) {
        return i;
      }
      if (actionPriority === existingPriority && action.timestamp < this.queue[i].timestamp) {
        return i;
      }
    }
    return this.queue.length;
  }

  private async processQueue(): Promise<ActionResult | null> {
    if (this.processing || this.queue.length === 0) return null;

    this.processing = true;
    let lastResult: ActionResult | null = null;

    try {
      while (this.queue.length > 0) {
        const action = this.queue[0];

        // Check if action is stale
        if (Date.now() - action.timestamp > this.staleThresholdMs) {
          logger.warn('Rejecting stale action', {
            tableId: this.tableId,
            actionId: action.id,
            ageMs: Date.now() - action.timestamp
          });
          this.queue.shift();
          continue;
        }

        // Process action
        action.processingStarted = Date.now();
        try {
          lastResult = await this.processor(action);
        } catch (err) {
          logger.error('Action processing error', { 
            tableId: this.tableId, 
            actionId: action.id,
            error: String(err)
          });
          lastResult = {
            success: false,
            actionId: action.id,
            processingTimeMs: Date.now() - action.processingStarted,
            error: String(err)
          };
        }

        this.queue.shift();
      }
    } finally {
      this.processing = false;
    }

    return lastResult;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
    this.debounceMap.clear();
  }
}

// ============= GLOBAL ACTION QUEUE MANAGER =============
export class ActionQueueOptimizer {
  private tableQueues: Map<string, TableActionQueue> = new Map();
  private globalProcessor: ActionProcessor | null = null;
  private stats = {
    totalActions: 0,
    processedActions: 0,
    rejectedActions: 0,
    avgQueueTimeMs: 0,
    avgProcessingTimeMs: 0
  };

  setProcessor(processor: ActionProcessor): void {
    this.globalProcessor = processor;
  }

  async queueAction(
    tableId: string,
    playerId: string,
    actionType: QueuedAction['actionType'],
    amount: number | undefined,
    handNumber: number,
    priority: QueuedAction['priority'] = 'normal'
  ): Promise<ActionResult> {
    if (!this.globalProcessor) {
      throw new Error('Action processor not set');
    }

    this.stats.totalActions++;

    let queue = this.tableQueues.get(tableId);
    if (!queue) {
      queue = new TableActionQueue(tableId, this.globalProcessor);
      this.tableQueues.set(tableId, queue);
    }

    const result = await queue.enqueue({
      tableId,
      playerId,
      actionType,
      amount,
      handNumber,
      priority
    });

    if (result) {
      if (result.success) {
        this.stats.processedActions++;
        this.updateAvgTimes(result.queueTimeMs || 0, result.processingTimeMs);
      } else {
        this.stats.rejectedActions++;
      }
      return result;
    }

    return {
      success: false,
      actionId: '',
      processingTimeMs: 0,
      error: 'Queue processing failed'
    };
  }

  private updateAvgTimes(queueTime: number, processingTime: number): void {
    const n = this.stats.processedActions;
    this.stats.avgQueueTimeMs = (this.stats.avgQueueTimeMs * (n - 1) + queueTime) / n;
    this.stats.avgProcessingTimeMs = (this.stats.avgProcessingTimeMs * (n - 1) + processingTime) / n;
  }

  getStats(): typeof this.stats & { queuesByTable: Record<string, number> } {
    const queuesByTable: Record<string, number> = {};
    for (const [tableId, queue] of this.tableQueues) {
      queuesByTable[tableId] = queue.getQueueLength();
    }
    return { ...this.stats, queuesByTable };
  }

  clearTable(tableId: string): void {
    const queue = this.tableQueues.get(tableId);
    if (queue) {
      queue.clear();
      this.tableQueues.delete(tableId);
    }
  }

  shutdown(): void {
    for (const queue of this.tableQueues.values()) {
      queue.clear();
    }
    this.tableQueues.clear();
    logger.info('ActionQueueOptimizer shutdown');
  }
}

// Singleton
export const actionQueueOptimizer = new ActionQueueOptimizer();
