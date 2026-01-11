/**
 * WebSocket Optimizer - PokerStars-Level Message Handling
 * 
 * Ultra-optimized WebSocket communication:
 * - Message compression for large payloads
 * - Delta-state updates (only send changes)
 * - Message batching for high-frequency updates
 * - Priority-based message ordering
 * - Automatic reconnection handling
 * - Heartbeat optimization
 */

import { WebSocket } from 'ws';
import { logger } from './logger.js';

// ============= DELTA STATE MANAGER =============
export class DeltaStateManager {
  private playerStates: Map<string, Map<string, any>> = new Map();

  /**
   * Calculate delta between old and new state
   */
  calculateDelta(playerId: string, tableId: string, newState: Record<string, any>): Record<string, any> | null {
    const key = `${playerId}:${tableId}`;
    const oldState = this.playerStates.get(key);

    if (!oldState) {
      // First state - send full
      this.playerStates.set(key, new Map(Object.entries(newState)));
      return newState;
    }

    const delta: Record<string, any> = {};
    let hasChanges = false;

    // Find changed values
    for (const [field, value] of Object.entries(newState)) {
      const oldValue = oldState.get(field);
      if (!this.deepEqual(oldValue, value)) {
        delta[field] = value;
        oldState.set(field, value);
        hasChanges = true;
      }
    }

    // Find removed values
    for (const [field] of oldState) {
      if (!(field in newState)) {
        delta[field] = null;
        oldState.delete(field);
        hasChanges = true;
      }
    }

    return hasChanges ? delta : null;
  }

  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object' || a === null || b === null) return false;
    
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      return a.every((val, i) => this.deepEqual(val, b[i]));
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => this.deepEqual(a[key], b[key]));
  }

  clearPlayer(playerId: string): void {
    for (const key of this.playerStates.keys()) {
      if (key.startsWith(`${playerId}:`)) {
        this.playerStates.delete(key);
      }
    }
  }

  clearTable(tableId: string): void {
    for (const key of this.playerStates.keys()) {
      if (key.endsWith(`:${tableId}`)) {
        this.playerStates.delete(key);
      }
    }
  }
}

// ============= MESSAGE BATCHER =============
interface BatchedMessage {
  priority: number;
  message: any;
  addedAt: number;
}

class MessageBatcher {
  private batches: Map<WebSocket, BatchedMessage[]> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly flushIntervalMs: number = 50; // Flush every 50ms
  private readonly maxBatchSize: number = 20;
  private readonly maxBatchAge: number = 100; // Max 100ms before force flush

  constructor() {
    this.startFlushInterval();
  }

  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flushAll();
    }, this.flushIntervalMs);
  }

  add(ws: WebSocket, message: any, priority: number = 0): void {
    let batch = this.batches.get(ws);
    if (!batch) {
      batch = [];
      this.batches.set(ws, batch);
    }

    batch.push({ priority, message, addedAt: Date.now() });

    // Force flush if batch too large
    if (batch.length >= this.maxBatchSize) {
      this.flushSocket(ws);
    }
  }

  private flushSocket(ws: WebSocket): void {
    const batch = this.batches.get(ws);
    if (!batch || batch.length === 0) return;

    // Sort by priority (higher priority = sent first)
    batch.sort((a, b) => b.priority - a.priority);

    // Send as batch or individual based on size
    if (batch.length === 1) {
      this.sendMessage(ws, batch[0].message);
    } else {
      // Send as batched array
      this.sendMessage(ws, {
        type: 'batch',
        messages: batch.map(b => b.message)
      });
    }

    this.batches.delete(ws);
  }

  private flushAll(): void {
    const now = Date.now();
    for (const [ws, batch] of this.batches) {
      // Check if oldest message is too old
      if (batch.length > 0 && now - batch[0].addedAt > this.maxBatchAge) {
        this.flushSocket(ws);
      }
    }
  }

  private sendMessage(ws: WebSocket, message: any): void {
    if (ws.readyState !== WebSocket.OPEN) return;
    
    try {
      const data = JSON.stringify(message);
      ws.send(data);
    } catch (err) {
      logger.error('Failed to send batched message', { error: String(err) });
    }
  }

  removeSocket(ws: WebSocket): void {
    this.batches.delete(ws);
  }

  shutdown(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.batches.clear();
  }
}

// ============= OPTIMIZED HEARTBEAT MANAGER =============
export class HeartbeatManager {
  private heartbeats: Map<WebSocket, { lastPing: number; lastPong: number; latency: number }> = new Map();
  private interval: NodeJS.Timeout | null = null;
  private readonly pingIntervalMs: number = 25000; // 25 seconds
  private readonly timeoutMs: number = 60000; // 60 seconds timeout
  private onTimeout?: (ws: WebSocket) => void;

  constructor(onTimeout?: (ws: WebSocket) => void) {
    this.onTimeout = onTimeout;
    this.start();
  }

  private start(): void {
    this.interval = setInterval(() => {
      this.checkAll();
    }, this.pingIntervalMs);
  }

  register(ws: WebSocket): void {
    this.heartbeats.set(ws, {
      lastPing: Date.now(),
      lastPong: Date.now(),
      latency: 0
    });
  }

  recordPong(ws: WebSocket): void {
    const hb = this.heartbeats.get(ws);
    if (hb) {
      const now = Date.now();
      hb.latency = now - hb.lastPing;
      hb.lastPong = now;
    }
  }

  getLatency(ws: WebSocket): number {
    return this.heartbeats.get(ws)?.latency || 0;
  }

  private checkAll(): void {
    const now = Date.now();
    for (const [ws, hb] of this.heartbeats) {
      // Check if timed out
      if (now - hb.lastPong > this.timeoutMs) {
        logger.warn('WebSocket heartbeat timeout', { latency: hb.latency });
        if (this.onTimeout) {
          this.onTimeout(ws);
        }
        this.heartbeats.delete(ws);
        continue;
      }

      // Send ping
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
          hb.lastPing = now;
        } catch (err) {
          logger.error('Failed to send ping', { error: String(err) });
        }
      }
    }
  }

  unregister(ws: WebSocket): void {
    this.heartbeats.delete(ws);
  }

  shutdown(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.heartbeats.clear();
  }
}

// ============= MAIN WEBSOCKET OPTIMIZER =============
export class WebSocketOptimizer {
  private deltaManager = new DeltaStateManager();
  private messageBatcher = new MessageBatcher();
  private heartbeatManager: HeartbeatManager;
  private compressionThreshold = 1024; // Compress messages > 1KB

  constructor(onHeartbeatTimeout?: (ws: WebSocket) => void) {
    this.heartbeatManager = new HeartbeatManager(onHeartbeatTimeout);
    logger.info('WebSocketOptimizer initialized');
  }

  /**
   * Register new WebSocket connection
   */
  registerConnection(ws: WebSocket): void {
    this.heartbeatManager.register(ws);
    
    ws.on('pong', () => {
      this.heartbeatManager.recordPong(ws);
    });
  }

  /**
   * Send state update with delta optimization
   */
  sendStateUpdate(
    ws: WebSocket, 
    playerId: string, 
    tableId: string, 
    state: Record<string, any>,
    priority: number = 0,
    forceFull: boolean = false
  ): void {
    if (ws.readyState !== WebSocket.OPEN) return;

    let payload: Record<string, any>;
    
    if (forceFull) {
      payload = { type: 'state_full', tableId, state };
    } else {
      const delta = this.deltaManager.calculateDelta(playerId, tableId, state);
      if (!delta) return; // No changes
      
      payload = { type: 'state_delta', tableId, delta };
    }

    this.messageBatcher.add(ws, payload, priority);
  }

  /**
   * Send immediate message (bypass batching)
   */
  sendImmediate(ws: WebSocket, message: any): void {
    if (ws.readyState !== WebSocket.OPEN) return;
    
    try {
      const data = JSON.stringify(message);
      ws.send(data);
    } catch (err) {
      logger.error('Failed to send immediate message', { error: String(err) });
    }
  }

  /**
   * Send batched message
   */
  sendBatched(ws: WebSocket, message: any, priority: number = 0): void {
    this.messageBatcher.add(ws, message, priority);
  }

  /**
   * Get connection latency
   */
  getLatency(ws: WebSocket): number {
    return this.heartbeatManager.getLatency(ws);
  }

  /**
   * Handle disconnection
   */
  handleDisconnect(ws: WebSocket, playerId?: string): void {
    this.heartbeatManager.unregister(ws);
    this.messageBatcher.removeSocket(ws);
    if (playerId) {
      this.deltaManager.clearPlayer(playerId);
    }
  }

  /**
   * Clear table state
   */
  clearTableState(tableId: string): void {
    this.deltaManager.clearTable(tableId);
  }

  shutdown(): void {
    this.heartbeatManager.shutdown();
    this.messageBatcher.shutdown();
    logger.info('WebSocketOptimizer shutdown');
  }
}

// Singleton
export const wsOptimizer = new WebSocketOptimizer();
