/**
 * Redis Manager for Horizontal Scaling
 * Provides pub/sub, session storage, and distributed state
 */

import { logger } from './logger.js';

// Redis event types for pub/sub
export interface RedisEvent {
  type: string;
  payload: unknown;
  timestamp: number;
  serverId: string;
}

export interface PlayerSession {
  playerId: string;
  tableId: string | null;
  tournamentId: string | null;
  serverId: string;
  connectedAt: number;
  lastActivity: number;
  ip: string;
}

/**
 * In-memory Redis mock for single-server deployment
 * Replace with actual Redis client for horizontal scaling
 */
class InMemoryRedisManager {
  private sessions: Map<string, PlayerSession> = new Map();
  private tableStates: Map<string, string> = new Map();
  private pubsubChannels: Map<string, Set<(event: RedisEvent) => void>> = new Map();
  private locks: Map<string, { owner: string; expiresAt: number }> = new Map();
  private rateLimits: Map<string, { count: number; resetAt: number }> = new Map();
  
  private readonly serverId: string;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.serverId = `server-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.startCleanup();
    logger.info('InMemoryRedisManager initialized (single-server mode)', { serverId: this.serverId });
  }

  // ==========================================
  // SESSION MANAGEMENT
  // ==========================================

  async setSession(playerId: string, session: Omit<PlayerSession, 'serverId'>): Promise<void> {
    this.sessions.set(playerId, {
      ...session,
      serverId: this.serverId
    });
  }

  async getSession(playerId: string): Promise<PlayerSession | null> {
    return this.sessions.get(playerId) || null;
  }

  async deleteSession(playerId: string): Promise<void> {
    this.sessions.delete(playerId);
  }

  async updateSessionActivity(playerId: string): Promise<void> {
    const session = this.sessions.get(playerId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  async getActiveSessions(): Promise<PlayerSession[]> {
    return Array.from(this.sessions.values());
  }

  async isPlayerOnline(playerId: string): Promise<boolean> {
    const session = this.sessions.get(playerId);
    if (!session) return false;
    
    // Consider online if activity within last 60 seconds
    return (Date.now() - session.lastActivity) < 60000;
  }

  // ==========================================
  // TABLE STATE (for multi-server sync)
  // ==========================================

  async setTableState(tableId: string, state: object): Promise<void> {
    this.tableStates.set(tableId, JSON.stringify(state));
  }

  async getTableState<T = object>(tableId: string): Promise<T | null> {
    const state = this.tableStates.get(tableId);
    return state ? JSON.parse(state) : null;
  }

  async deleteTableState(tableId: string): Promise<void> {
    this.tableStates.delete(tableId);
  }

  // ==========================================
  // PUB/SUB
  // ==========================================

  async publish(channel: string, event: Omit<RedisEvent, 'serverId' | 'timestamp'>): Promise<void> {
    const fullEvent: RedisEvent = {
      ...event,
      serverId: this.serverId,
      timestamp: Date.now()
    };

    const subscribers = this.pubsubChannels.get(channel);
    if (subscribers) {
      for (const callback of subscribers) {
        try {
          callback(fullEvent);
        } catch (err) {
          logger.error('Pub/Sub callback error', { channel, error: String(err) });
        }
      }
    }
  }

  subscribe(channel: string, callback: (event: RedisEvent) => void): () => void {
    if (!this.pubsubChannels.has(channel)) {
      this.pubsubChannels.set(channel, new Set());
    }
    this.pubsubChannels.get(channel)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.pubsubChannels.get(channel);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.pubsubChannels.delete(channel);
        }
      }
    };
  }

  // ==========================================
  // DISTRIBUTED LOCKS
  // ==========================================

  async acquireLock(key: string, ttlMs: number = 5000): Promise<string | null> {
    const lockId = `${this.serverId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    // Check if lock exists and is still valid
    const existing = this.locks.get(key);
    if (existing && existing.expiresAt > now) {
      return null; // Lock is held by someone else
    }

    // Acquire the lock
    this.locks.set(key, { owner: lockId, expiresAt: now + ttlMs });
    return lockId;
  }

  async releaseLock(key: string, lockId: string): Promise<boolean> {
    const lock = this.locks.get(key);
    if (lock && lock.owner === lockId) {
      this.locks.delete(key);
      return true;
    }
    return false;
  }

  async extendLock(key: string, lockId: string, ttlMs: number): Promise<boolean> {
    const lock = this.locks.get(key);
    if (lock && lock.owner === lockId) {
      lock.expiresAt = Date.now() + ttlMs;
      return true;
    }
    return false;
  }

  // ==========================================
  // RATE LIMITING
  // ==========================================

  async checkRateLimit(key: string, maxRequests: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const now = Date.now();
    const limit = this.rateLimits.get(key);

    if (!limit || limit.resetAt <= now) {
      // New window
      this.rateLimits.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
    }

    if (limit.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetIn: limit.resetAt - now };
    }

    limit.count++;
    return { allowed: true, remaining: maxRequests - limit.count, resetIn: limit.resetAt - now };
  }

  // ==========================================
  // CLEANUP
  // ==========================================

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      
      // Clean expired locks
      for (const [key, lock] of this.locks) {
        if (lock.expiresAt <= now) {
          this.locks.delete(key);
        }
      }

      // Clean expired rate limits
      for (const [key, limit] of this.rateLimits) {
        if (limit.resetAt <= now) {
          this.rateLimits.delete(key);
        }
      }

      // Clean stale sessions (inactive > 5 minutes)
      const staleThreshold = now - 5 * 60 * 1000;
      for (const [playerId, session] of this.sessions) {
        if (session.lastActivity < staleThreshold) {
          this.sessions.delete(playerId);
          logger.debug('Cleaned stale session', { playerId });
        }
      }
    }, 30000); // Every 30 seconds
  }

  getStats(): {
    sessions: number;
    tables: number;
    channels: number;
    locks: number;
    serverId: string;
  } {
    return {
      sessions: this.sessions.size,
      tables: this.tableStates.size,
      channels: this.pubsubChannels.size,
      locks: this.locks.size,
      serverId: this.serverId
    };
  }

  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.clear();
    this.tableStates.clear();
    this.pubsubChannels.clear();
    this.locks.clear();
    this.rateLimits.clear();
    logger.info('RedisManager shutdown complete');
  }
}

// Singleton instance
export const redisManager = new InMemoryRedisManager();

// Pub/Sub channels
export const CHANNELS = {
  TABLE_UPDATE: 'table:update',
  TOURNAMENT_UPDATE: 'tournament:update',
  PLAYER_ACTION: 'player:action',
  CHAT_MESSAGE: 'chat:message',
  SYSTEM_ALERT: 'system:alert'
} as const;
