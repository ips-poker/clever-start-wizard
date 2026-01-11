/**
 * Real-Time Sync Optimizer v1.0
 * Optimizes state synchronization for minimal latency
 * 
 * Features:
 * - Delta compression (only send changes)
 * - Priority-based message ordering
 * - Batch updates for efficiency
 * - Client state prediction validation
 */

import { logger } from './logger.js';

// ==========================================
// TYPES
// ==========================================

export interface StateSnapshot {
  version: number;
  timestamp: number;
  data: Record<string, unknown>;
  hash: string;
}

export interface StateDelta {
  fromVersion: number;
  toVersion: number;
  changes: DeltaChange[];
  timestamp: number;
}

export interface DeltaChange {
  path: string;
  operation: 'set' | 'delete' | 'increment' | 'append';
  value?: unknown;
  previousValue?: unknown;
}

export type MessagePriority = 'critical' | 'high' | 'normal' | 'low';

export interface PrioritizedMessage {
  priority: MessagePriority;
  type: string;
  data: unknown;
  timestamp: number;
  tableId?: string;
  playerId?: string;
}

// ==========================================
// DELTA CALCULATOR
// ==========================================

export class DeltaCalculator {
  private snapshots: Map<string, StateSnapshot[]> = new Map();
  private readonly MAX_SNAPSHOTS = 10;
  
  /**
   * Store a state snapshot
   */
  storeSnapshot(key: string, data: Record<string, unknown>, version: number): void {
    let history = this.snapshots.get(key);
    if (!history) {
      history = [];
      this.snapshots.set(key, history);
    }
    
    const snapshot: StateSnapshot = {
      version,
      timestamp: Date.now(),
      data: this.deepClone(data),
      hash: this.hashState(data)
    };
    
    history.push(snapshot);
    
    // Keep only recent snapshots
    while (history.length > this.MAX_SNAPSHOTS) {
      history.shift();
    }
  }
  
  /**
   * Calculate delta between two versions
   */
  calculateDelta(
    key: string, 
    fromVersion: number, 
    toVersion: number
  ): StateDelta | null {
    const history = this.snapshots.get(key);
    if (!history) return null;
    
    const fromSnapshot = history.find(s => s.version === fromVersion);
    const toSnapshot = history.find(s => s.version === toVersion);
    
    if (!fromSnapshot || !toSnapshot) return null;
    
    const changes = this.diffObjects(fromSnapshot.data, toSnapshot.data, '');
    
    return {
      fromVersion,
      toVersion,
      changes,
      timestamp: Date.now()
    };
  }
  
  /**
   * Calculate delta from current state to new state
   */
  calculateDeltaFromStates(
    previous: Record<string, unknown>,
    current: Record<string, unknown>,
    fromVersion: number,
    toVersion: number
  ): StateDelta {
    const changes = this.diffObjects(previous, current, '');
    
    return {
      fromVersion,
      toVersion,
      changes,
      timestamp: Date.now()
    };
  }
  
  /**
   * Apply delta to state
   */
  applyDelta(state: Record<string, unknown>, delta: StateDelta): Record<string, unknown> {
    const result = this.deepClone(state);
    
    for (const change of delta.changes) {
      this.applyChange(result, change);
    }
    
    return result;
  }
  
  /**
   * Diff two objects recursively
   */
  private diffObjects(
    from: Record<string, unknown>, 
    to: Record<string, unknown>, 
    path: string
  ): DeltaChange[] {
    const changes: DeltaChange[] = [];
    const allKeys = new Set([...Object.keys(from), ...Object.keys(to)]);
    
    for (const key of allKeys) {
      const fullPath = path ? `${path}.${key}` : key;
      const fromVal = from[key];
      const toVal = to[key];
      
      if (toVal === undefined && fromVal !== undefined) {
        changes.push({ path: fullPath, operation: 'delete', previousValue: fromVal });
      } else if (fromVal === undefined && toVal !== undefined) {
        changes.push({ path: fullPath, operation: 'set', value: toVal });
      } else if (typeof fromVal !== typeof toVal) {
        changes.push({ path: fullPath, operation: 'set', value: toVal, previousValue: fromVal });
      } else if (typeof toVal === 'object' && toVal !== null && !Array.isArray(toVal)) {
        const nestedChanges = this.diffObjects(
          fromVal as Record<string, unknown>,
          toVal as Record<string, unknown>,
          fullPath
        );
        changes.push(...nestedChanges);
      } else if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
        // Check if it's a simple increment
        if (typeof fromVal === 'number' && typeof toVal === 'number') {
          changes.push({ 
            path: fullPath, 
            operation: 'increment', 
            value: toVal - fromVal,
            previousValue: fromVal
          });
        } else {
          changes.push({ path: fullPath, operation: 'set', value: toVal, previousValue: fromVal });
        }
      }
    }
    
    return changes;
  }
  
  /**
   * Apply a single change to state
   */
  private applyChange(state: Record<string, unknown>, change: DeltaChange): void {
    const parts = change.path.split('.');
    let current: Record<string, unknown> = state;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    
    const lastKey = parts[parts.length - 1];
    
    switch (change.operation) {
      case 'set':
        current[lastKey] = change.value;
        break;
      case 'delete':
        delete current[lastKey];
        break;
      case 'increment':
        current[lastKey] = (current[lastKey] as number || 0) + (change.value as number);
        break;
      case 'append':
        if (Array.isArray(current[lastKey])) {
          (current[lastKey] as unknown[]).push(change.value);
        }
        break;
    }
  }
  
  /**
   * Deep clone object
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
  
  /**
   * Simple hash for state comparison
   */
  private hashState(data: Record<string, unknown>): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
  
  /**
   * Clear old snapshots
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 60000; // 1 minute
    
    for (const [key, history] of this.snapshots) {
      const filtered = history.filter(s => (now - s.timestamp) < maxAge);
      if (filtered.length === 0) {
        this.snapshots.delete(key);
      } else {
        this.snapshots.set(key, filtered);
      }
    }
  }
}

// ==========================================
// MESSAGE PRIORITIZER
// ==========================================

export class MessagePrioritizer {
  private queues: Map<MessagePriority, PrioritizedMessage[]> = new Map([
    ['critical', []],
    ['high', []],
    ['normal', []],
    ['low', []]
  ]);
  
  private readonly PRIORITY_ORDER: MessagePriority[] = ['critical', 'high', 'normal', 'low'];
  
  /**
   * Add message to appropriate queue
   */
  enqueue(message: PrioritizedMessage): void {
    const queue = this.queues.get(message.priority);
    if (queue) {
      queue.push(message);
    }
  }
  
  /**
   * Get next message by priority
   */
  dequeue(): PrioritizedMessage | undefined {
    for (const priority of this.PRIORITY_ORDER) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        return queue.shift();
      }
    }
    return undefined;
  }
  
  /**
   * Get all messages in priority order
   */
  dequeueAll(): PrioritizedMessage[] {
    const result: PrioritizedMessage[] = [];
    
    for (const priority of this.PRIORITY_ORDER) {
      const queue = this.queues.get(priority);
      if (queue) {
        result.push(...queue);
        queue.length = 0;
      }
    }
    
    return result;
  }
  
  /**
   * Get batch of messages up to limit
   */
  dequeueBatch(limit: number): PrioritizedMessage[] {
    const result: PrioritizedMessage[] = [];
    
    while (result.length < limit) {
      const message = this.dequeue();
      if (!message) break;
      result.push(message);
    }
    
    return result;
  }
  
  /**
   * Get total pending messages
   */
  getPendingCount(): number {
    let count = 0;
    for (const queue of this.queues.values()) {
      count += queue.length;
    }
    return count;
  }
  
  /**
   * Clear all queues
   */
  clear(): void {
    for (const queue of this.queues.values()) {
      queue.length = 0;
    }
  }
}

// ==========================================
// SYNC OPTIMIZER
// ==========================================

export class RealTimeSyncOptimizer {
  private deltaCalculator = new DeltaCalculator();
  private messagePrioritizer = new MessagePrioritizer();
  private clientVersions: Map<string, number> = new Map();
  private pendingBatches: Map<string, PrioritizedMessage[]> = new Map();
  
  private readonly BATCH_INTERVAL_MS = 50; // Batch messages every 50ms
  private readonly MAX_BATCH_SIZE = 20;
  
  /**
   * Determine message priority based on type
   */
  getMessagePriority(type: string): MessagePriority {
    const priorities: Record<string, MessagePriority> = {
      // Critical - must be delivered immediately
      'action_result': 'critical',
      'your_turn': 'critical',
      'hand_started': 'critical',
      'cards_dealt': 'critical',
      'error': 'critical',
      
      // High - important game events
      'action': 'high',
      'phase_change': 'high',
      'showdown': 'high',
      'winner': 'high',
      'pot_update': 'high',
      
      // Normal - state updates
      'state_update': 'normal',
      'player_update': 'normal',
      'timer_update': 'normal',
      
      // Low - non-essential
      'chat': 'low',
      'spectator_count': 'low',
      'statistics': 'low'
    };
    
    return priorities[type] || 'normal';
  }
  
  /**
   * Queue message with priority
   */
  queueMessage(
    type: string,
    data: unknown,
    tableId?: string,
    playerId?: string
  ): void {
    this.messagePrioritizer.enqueue({
      priority: this.getMessagePriority(type),
      type,
      data,
      timestamp: Date.now(),
      tableId,
      playerId
    });
  }
  
  /**
   * Get batched messages for sending
   */
  getBatchedMessages(): PrioritizedMessage[] {
    return this.messagePrioritizer.dequeueBatch(this.MAX_BATCH_SIZE);
  }
  
  /**
   * Store client's known version
   */
  setClientVersion(clientId: string, version: number): void {
    this.clientVersions.set(clientId, version);
  }
  
  /**
   * Get optimal update for client (full state or delta)
   */
  getOptimalUpdate(
    clientId: string,
    tableId: string,
    currentState: Record<string, unknown>,
    currentVersion: number
  ): { type: 'full' | 'delta'; data: unknown } {
    const clientVersion = this.clientVersions.get(clientId);
    
    // If client version unknown or too old, send full state
    if (clientVersion === undefined || currentVersion - clientVersion > 5) {
      this.setClientVersion(clientId, currentVersion);
      return { type: 'full', data: currentState };
    }
    
    // Try to get delta
    const delta = this.deltaCalculator.calculateDelta(
      tableId,
      clientVersion,
      currentVersion
    );
    
    if (delta && delta.changes.length < 10) {
      // Delta is small enough, send it
      this.setClientVersion(clientId, currentVersion);
      return { type: 'delta', data: delta };
    }
    
    // Delta too large, send full state
    this.setClientVersion(clientId, currentVersion);
    return { type: 'full', data: currentState };
  }
  
  /**
   * Store state snapshot for delta calculation
   */
  storeState(tableId: string, state: Record<string, unknown>, version: number): void {
    this.deltaCalculator.storeSnapshot(tableId, state, version);
  }
  
  /**
   * Get pending message count
   */
  getPendingCount(): number {
    return this.messagePrioritizer.getPendingCount();
  }
  
  /**
   * Cleanup old data
   */
  cleanup(): void {
    this.deltaCalculator.cleanup();
    
    // Clear old client versions
    const now = Date.now();
    // We would need timestamps for this, simplified for now
  }
  
  /**
   * Get statistics
   */
  getStats(): {
    pendingMessages: number;
    trackedClients: number;
  } {
    return {
      pendingMessages: this.messagePrioritizer.getPendingCount(),
      trackedClients: this.clientVersions.size
    };
  }
}

// ==========================================
// SINGLETON
// ==========================================

export const realTimeSyncOptimizer = new RealTimeSyncOptimizer();

// Periodic cleanup
setInterval(() => {
  realTimeSyncOptimizer.cleanup();
}, 60000);
