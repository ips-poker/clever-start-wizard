/**
 * Message Queue for High-Load Scenarios
 * Implements buffered broadcasting to prevent WebSocket backpressure
 */

import { WebSocket } from 'ws';
import { logger } from './logger.js';

export interface QueuedMessage {
  ws: WebSocket;
  message: string;
  priority: 'high' | 'normal' | 'low';
  timestamp: number;
  retries: number;
}

export class MessageQueue {
  private queue: QueuedMessage[] = [];
  private processing: boolean = false;
  private processInterval: NodeJS.Timeout | null = null;
  
  // Configuration
  private readonly MAX_QUEUE_SIZE = 10000;
  private readonly BATCH_SIZE = 100;
  private readonly PROCESS_INTERVAL_MS = 10;
  private readonly MAX_RETRIES = 3;
  private readonly HIGH_PRIORITY_FIRST = true;
  
  constructor() {
    this.startProcessing();
  }
  
  /**
   * Enqueue a message for sending
   */
  enqueue(ws: WebSocket, message: object, priority: 'high' | 'normal' | 'low' = 'normal'): boolean {
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      logger.warn('Message queue full - dropping message', {
        queueSize: this.queue.length,
        priority
      });
      return false;
    }
    
    this.queue.push({
      ws,
      message: JSON.stringify(message),
      priority,
      timestamp: Date.now(),
      retries: 0
    });
    
    return true;
  }
  
  /**
   * Enqueue messages for multiple recipients
   */
  enqueueBroadcast(recipients: Set<WebSocket>, message: object, priority: 'high' | 'normal' | 'low' = 'normal'): number {
    const messageStr = JSON.stringify(message);
    const timestamp = Date.now();
    let enqueued = 0;
    
    for (const ws of recipients) {
      if (this.queue.length >= this.MAX_QUEUE_SIZE) {
        logger.warn('Queue full during broadcast', { remaining: recipients.size - enqueued });
        break;
      }
      
      this.queue.push({
        ws,
        message: messageStr,
        priority,
        timestamp,
        retries: 0
      });
      enqueued++;
    }
    
    return enqueued;
  }
  
  /**
   * Start processing loop
   */
  private startProcessing(): void {
    this.processInterval = setInterval(() => {
      this.processBatch();
    }, this.PROCESS_INTERVAL_MS);
  }
  
  /**
   * Process a batch of messages
   */
  private processBatch(): void {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    try {
      // Sort by priority if enabled
      if (this.HIGH_PRIORITY_FIRST && this.queue.length > this.BATCH_SIZE) {
        this.queue.sort((a, b) => {
          const priorityOrder = { high: 0, normal: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
      }
      
      // Process batch
      const batch = this.queue.splice(0, this.BATCH_SIZE);
      const retryQueue: QueuedMessage[] = [];
      
      for (const item of batch) {
        try {
          if (item.ws.readyState === WebSocket.OPEN) {
            item.ws.send(item.message);
          }
        } catch (err) {
          if (item.retries < this.MAX_RETRIES) {
            item.retries++;
            retryQueue.push(item);
          } else {
            logger.warn('Message dropped after max retries', {
              retries: item.retries
            });
          }
        }
      }
      
      // Re-queue failed messages at the front
      if (retryQueue.length > 0) {
        this.queue.unshift(...retryQueue);
      }
      
    } finally {
      this.processing = false;
    }
  }
  
  /**
   * Get queue statistics
   */
  getStats(): { size: number; byPriority: Record<string, number> } {
    const byPriority = { high: 0, normal: 0, low: 0 };
    
    for (const item of this.queue) {
      byPriority[item.priority]++;
    }
    
    return {
      size: this.queue.length,
      byPriority
    };
  }
  
  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    logger.info('Message queue cleared');
  }
  
  /**
   * Shutdown
   */
  shutdown(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }
    
    // Process remaining messages synchronously
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      try {
        if (item.ws.readyState === WebSocket.OPEN) {
          item.ws.send(item.message);
        }
      } catch (e) {
        // Ignore errors during shutdown
      }
    }
    
    logger.info('MessageQueue shutdown complete');
  }
}

// Singleton
export const messageQueue = new MessageQueue();
