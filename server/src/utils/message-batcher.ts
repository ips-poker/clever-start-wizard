/**
 * WebSocket Message Batcher
 * Batches multiple messages together for efficient network transmission
 * Critical for 300+ table performance
 */

import { WebSocket } from 'ws';
import { logger } from './logger.js';

// ==========================================
// TYPES
// ==========================================

interface QueuedMessage {
  ws: WebSocket;
  message: object;
  priority: 'high' | 'normal' | 'low';
  timestamp: number;
}

interface BatchedPayload {
  batch: true;
  messages: object[];
  timestamp: number;
}

interface BatcherStats {
  messagesSent: number;
  batchesSent: number;
  avgBatchSize: number;
  messagesDropped: number;
  avgLatencyMs: number;
}

// ==========================================
// CONFIGURATION
// ==========================================

const BATCHER_CONFIG = {
  // Batch timing
  BATCH_INTERVAL_MS: 50, // Flush every 50ms (20 batches/sec)
  MAX_BATCH_DELAY_MS: 100, // Maximum delay for any message
  
  // Batch sizing
  MAX_BATCH_SIZE: 50, // Maximum messages per batch per connection
  MAX_PAYLOAD_BYTES: 64 * 1024, // 64KB max payload size
  
  // Priority handling
  HIGH_PRIORITY_IMMEDIATE: true, // Send high priority immediately
  
  // Memory limits
  MAX_QUEUE_SIZE: 10000, // Maximum queued messages
  MAX_QUEUE_PER_CONNECTION: 100, // Maximum queued per connection
};

// ==========================================
// MESSAGE BATCHER CLASS
// ==========================================

class MessageBatcher {
  private messageQueue: Map<WebSocket, QueuedMessage[]> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;
  private isShuttingDown: boolean = false;
  
  // Statistics
  private messagesSent: number = 0;
  private batchesSent: number = 0;
  private totalBatchedMessages: number = 0;
  private messagesDropped: number = 0;
  private totalLatency: number = 0;
  private latencyCount: number = 0;
  
  constructor() {
    this.startFlushLoop();
    logger.info('MessageBatcher initialized', {
      batchInterval: BATCHER_CONFIG.BATCH_INTERVAL_MS,
      maxBatchSize: BATCHER_CONFIG.MAX_BATCH_SIZE
    });
  }
  
  // ==========================================
  // MESSAGE QUEUEING
  // ==========================================
  
  /**
   * Queue a message for batched sending
   */
  queue(ws: WebSocket, message: object, priority: 'high' | 'normal' | 'low' = 'normal'): void {
    if (this.isShuttingDown) return;
    if (ws.readyState !== WebSocket.OPEN) return;
    
    // High priority messages are sent immediately
    if (priority === 'high' && BATCHER_CONFIG.HIGH_PRIORITY_IMMEDIATE) {
      this.sendImmediate(ws, message);
      return;
    }
    
    // Get or create queue for this connection
    if (!this.messageQueue.has(ws)) {
      this.messageQueue.set(ws, []);
    }
    
    const queue = this.messageQueue.get(ws)!;
    
    // Check queue limits
    if (queue.length >= BATCHER_CONFIG.MAX_QUEUE_PER_CONNECTION) {
      // Drop lowest priority messages
      const lowPriorityIndex = queue.findIndex(m => m.priority === 'low');
      if (lowPriorityIndex !== -1) {
        queue.splice(lowPriorityIndex, 1);
        this.messagesDropped++;
      } else if (priority !== 'low') {
        // Drop oldest normal priority if no low priority to drop
        const normalIndex = queue.findIndex(m => m.priority === 'normal');
        if (normalIndex !== -1) {
          queue.splice(normalIndex, 1);
          this.messagesDropped++;
        }
      } else {
        this.messagesDropped++;
        return; // Drop this message
      }
    }
    
    queue.push({
      ws,
      message,
      priority,
      timestamp: Date.now()
    });
  }
  
  /**
   * Send a message immediately without batching
   */
  sendImmediate(ws: WebSocket, message: object): void {
    if (ws.readyState !== WebSocket.OPEN) return;
    
    try {
      ws.send(JSON.stringify(message));
      this.messagesSent++;
    } catch (error) {
      logger.warn('Immediate send failed', { error: String(error) });
    }
  }
  
  /**
   * Broadcast to multiple connections with batching
   */
  broadcast(connections: Set<WebSocket> | WebSocket[], message: object, priority: 'high' | 'normal' | 'low' = 'normal'): void {
    const wsArray = Array.isArray(connections) ? connections : Array.from(connections);
    
    for (const ws of wsArray) {
      this.queue(ws, message, priority);
    }
  }
  
  /**
   * Broadcast different messages to different players (e.g., private cards)
   */
  broadcastPersonalized(
    messages: Array<{ ws: WebSocket; message: object; priority?: 'high' | 'normal' | 'low' }>
  ): void {
    for (const { ws, message, priority = 'normal' } of messages) {
      this.queue(ws, message, priority);
    }
  }
  
  // ==========================================
  // FLUSH LOGIC
  // ==========================================
  
  private startFlushLoop(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, BATCHER_CONFIG.BATCH_INTERVAL_MS);
  }
  
  /**
   * Flush all queued messages
   */
  flush(): void {
    const now = Date.now();
    
    for (const [ws, queue] of this.messageQueue) {
      if (queue.length === 0) continue;
      if (ws.readyState !== WebSocket.OPEN) {
        this.messageQueue.delete(ws);
        continue;
      }
      
      // Sort by priority (high first) then by timestamp
      queue.sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.timestamp - b.timestamp;
      });
      
      // Take up to MAX_BATCH_SIZE messages
      const batch = queue.splice(0, BATCHER_CONFIG.MAX_BATCH_SIZE);
      
      if (batch.length === 0) continue;
      
      // Calculate latency
      for (const msg of batch) {
        this.totalLatency += now - msg.timestamp;
        this.latencyCount++;
      }
      
      // Send batch
      try {
        if (batch.length === 1) {
          // Single message - don't wrap in batch
          ws.send(JSON.stringify(batch[0].message));
        } else {
          // Multiple messages - send as batch
          const payload: BatchedPayload = {
            batch: true,
            messages: batch.map(m => m.message),
            timestamp: now
          };
          ws.send(JSON.stringify(payload));
        }
        
        this.messagesSent += batch.length;
        this.totalBatchedMessages += batch.length;
        this.batchesSent++;
      } catch (error) {
        logger.warn('Batch send failed', { 
          error: String(error), 
          batchSize: batch.length 
        });
      }
      
      // Clean up empty queue
      if (queue.length === 0) {
        this.messageQueue.delete(ws);
      }
    }
  }
  
  /**
   * Force flush for a specific connection (e.g., before disconnect)
   */
  flushConnection(ws: WebSocket): void {
    const queue = this.messageQueue.get(ws);
    if (!queue || queue.length === 0) return;
    
    if (ws.readyState === WebSocket.OPEN) {
      try {
        const payload: BatchedPayload = {
          batch: true,
          messages: queue.map(m => m.message),
          timestamp: Date.now()
        };
        ws.send(JSON.stringify(payload));
        this.messagesSent += queue.length;
        this.batchesSent++;
      } catch (error) {
        logger.warn('Connection flush failed', { error: String(error) });
      }
    }
    
    this.messageQueue.delete(ws);
  }
  
  // ==========================================
  // CONNECTION MANAGEMENT
  // ==========================================
  
  /**
   * Remove a connection from the batcher
   */
  removeConnection(ws: WebSocket): void {
    this.messageQueue.delete(ws);
  }
  
  /**
   * Get queue size for a connection
   */
  getQueueSize(ws: WebSocket): number {
    return this.messageQueue.get(ws)?.length || 0;
  }
  
  /**
   * Get total queue size
   */
  getTotalQueueSize(): number {
    let total = 0;
    for (const queue of this.messageQueue.values()) {
      total += queue.length;
    }
    return total;
  }
  
  // ==========================================
  // STATISTICS
  // ==========================================
  
  getStats(): BatcherStats {
    return {
      messagesSent: this.messagesSent,
      batchesSent: this.batchesSent,
      avgBatchSize: this.batchesSent > 0 
        ? Math.round((this.totalBatchedMessages / this.batchesSent) * 100) / 100 
        : 0,
      messagesDropped: this.messagesDropped,
      avgLatencyMs: this.latencyCount > 0 
        ? Math.round(this.totalLatency / this.latencyCount) 
        : 0
    };
  }
  
  resetStats(): void {
    this.messagesSent = 0;
    this.batchesSent = 0;
    this.totalBatchedMessages = 0;
    this.messagesDropped = 0;
    this.totalLatency = 0;
    this.latencyCount = 0;
  }
  
  // ==========================================
  // SHUTDOWN
  // ==========================================
  
  shutdown(): void {
    this.isShuttingDown = true;
    
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Final flush
    this.flush();
    
    this.messageQueue.clear();
    
    logger.info('MessageBatcher shutdown complete', this.getStats());
  }
}

// Singleton instance
export const messageBatcher = new MessageBatcher();

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Create a game state update message
 */
export function createGameStateMessage(tableId: string, state: object): object {
  return {
    type: 'game_state',
    tableId,
    ...state,
    timestamp: Date.now()
  };
}

/**
 * Create a player action message
 */
export function createActionMessage(
  tableId: string,
  playerId: string,
  action: string,
  amount?: number
): object {
  return {
    type: 'player_action',
    tableId,
    playerId,
    action,
    amount,
    timestamp: Date.now()
  };
}

/**
 * Create a tournament update message
 */
export function createTournamentMessage(tournamentId: string, update: object): object {
  return {
    type: 'tournament_update',
    tournamentId,
    ...update,
    timestamp: Date.now()
  };
}
