/**
 * Connection Pool Manager for 100-300 Tournament Tables
 * Professional-grade connection management with:
 * - Memory-efficient connection tracking
 * - Automatic cleanup of stale connections
 * - Load limiting and backpressure
 * - Per-table and per-tournament connection limits
 */

import { WebSocket } from 'ws';
import { logger } from './logger.js';

// ==========================================
// CONFIGURATION
// ==========================================
export const POOL_CONFIG = {
  // Global limits
  MAX_TOTAL_CONNECTIONS: 5000,        // Maximum total WebSocket connections
  MAX_CONNECTIONS_PER_IP: 20,         // Per-IP limit (prevent abuse)
  
  // Table limits
  MAX_TABLES: 300,                    // Maximum concurrent tables
  MAX_PLAYERS_PER_TABLE: 9,           // Texas Hold'em max
  MAX_SPECTATORS_PER_TABLE: 50,       // Spectators watching
  
  // Tournament limits
  MAX_TOURNAMENTS: 50,                // Maximum concurrent tournaments
  MAX_PLAYERS_PER_TOURNAMENT: 1000,   // Large tournament support
  
  // Cleanup
  STALE_CONNECTION_TIMEOUT_MS: 120000,  // 2 minutes without activity
  CLEANUP_INTERVAL_MS: 30000,           // Run cleanup every 30 seconds
  PING_INTERVAL_MS: 30000,              // Ping clients every 30 seconds
  MAX_MISSED_PINGS: 3,                  // Disconnect after 3 missed pings
  
  // Backpressure
  HIGH_LOAD_THRESHOLD: 0.8,           // 80% capacity = high load
  CRITICAL_LOAD_THRESHOLD: 0.95,      // 95% capacity = critical
};

// ==========================================
// TYPES
// ==========================================
export interface PooledConnection {
  ws: WebSocket;
  id: string;
  playerId: string | null;
  ipAddress: string;
  subscribedTables: Set<string>;
  subscribedTournaments: Set<string>;
  connectedAt: number;
  lastActivityAt: number;
  lastPingAt: number;
  missedPings: number;
  isAuthenticated: boolean;
  metadata: Record<string, unknown>;
}

export interface PoolStats {
  totalConnections: number;
  authenticatedConnections: number;
  totalTables: number;
  totalTournaments: number;
  connectionsByTable: Map<string, number>;
  connectionsByTournament: Map<string, number>;
  connectionsByIP: Map<string, number>;
  loadFactor: number;
  isHighLoad: boolean;
  isCriticalLoad: boolean;
  memoryUsageMB: number;
  uptimeSeconds: number;
}

// ==========================================
// CONNECTION POOL CLASS
// ==========================================
export class ConnectionPool {
  private connections: Map<WebSocket, PooledConnection> = new Map();
  private tableConnections: Map<string, Set<WebSocket>> = new Map();
  private tournamentConnections: Map<string, Set<WebSocket>> = new Map();
  private ipConnections: Map<string, Set<WebSocket>> = new Map();
  private playerConnections: Map<string, WebSocket> = new Map();
  
  private cleanupInterval: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();
  private connectionIdCounter: number = 0;
  
  constructor() {
    this.startCleanupLoop();
    this.startPingLoop();
    logger.info('ConnectionPool initialized', {
      maxConnections: POOL_CONFIG.MAX_TOTAL_CONNECTIONS,
      maxTables: POOL_CONFIG.MAX_TABLES
    });
  }
  
  // ==========================================
  // CONNECTION LIFECYCLE
  // ==========================================
  
  /**
   * Add a new connection to the pool
   * Returns null if connection is rejected (limits exceeded)
   */
  addConnection(ws: WebSocket, ipAddress: string, playerId?: string): PooledConnection | null {
    // Check global limit
    if (this.connections.size >= POOL_CONFIG.MAX_TOTAL_CONNECTIONS) {
      logger.warn('Connection rejected - global limit reached', {
        current: this.connections.size,
        max: POOL_CONFIG.MAX_TOTAL_CONNECTIONS
      });
      return null;
    }
    
    // Check IP limit
    const ipConns = this.ipConnections.get(ipAddress);
    if (ipConns && ipConns.size >= POOL_CONFIG.MAX_CONNECTIONS_PER_IP) {
      logger.warn('Connection rejected - IP limit reached', {
        ip: ipAddress,
        current: ipConns.size,
        max: POOL_CONFIG.MAX_CONNECTIONS_PER_IP
      });
      return null;
    }
    
    // Check if player already has a connection (reconnection case)
    if (playerId) {
      const existingWs = this.playerConnections.get(playerId);
      if (existingWs) {
        // Close old connection, replace with new
        this.removeConnection(existingWs, 'reconnection');
        logger.info('Replaced existing connection for player', { playerId });
      }
    }
    
    const connection: PooledConnection = {
      ws,
      id: `conn_${++this.connectionIdCounter}_${Date.now()}`,
      playerId: playerId || null,
      ipAddress,
      subscribedTables: new Set(),
      subscribedTournaments: new Set(),
      connectedAt: Date.now(),
      lastActivityAt: Date.now(),
      lastPingAt: Date.now(),
      missedPings: 0,
      isAuthenticated: !!playerId,
      metadata: {}
    };
    
    this.connections.set(ws, connection);
    
    // Track by IP
    if (!this.ipConnections.has(ipAddress)) {
      this.ipConnections.set(ipAddress, new Set());
    }
    this.ipConnections.get(ipAddress)!.add(ws);
    
    // Track by player
    if (playerId) {
      this.playerConnections.set(playerId, ws);
    }
    
    logger.debug('Connection added', {
      id: connection.id,
      playerId,
      ip: ipAddress,
      totalConnections: this.connections.size
    });
    
    return connection;
  }
  
  /**
   * Remove a connection from the pool
   */
  removeConnection(ws: WebSocket, reason: string = 'unknown'): void {
    const connection = this.connections.get(ws);
    if (!connection) return;
    
    // Remove from table subscriptions
    for (const tableId of connection.subscribedTables) {
      this.unsubscribeFromTable(ws, tableId);
    }
    
    // Remove from tournament subscriptions
    for (const tournamentId of connection.subscribedTournaments) {
      this.unsubscribeFromTournament(ws, tournamentId);
    }
    
    // Remove from IP tracking
    const ipConns = this.ipConnections.get(connection.ipAddress);
    if (ipConns) {
      ipConns.delete(ws);
      if (ipConns.size === 0) {
        this.ipConnections.delete(connection.ipAddress);
      }
    }
    
    // Remove from player tracking
    if (connection.playerId) {
      this.playerConnections.delete(connection.playerId);
    }
    
    this.connections.delete(ws);
    
    logger.debug('Connection removed', {
      id: connection.id,
      playerId: connection.playerId,
      reason,
      totalConnections: this.connections.size
    });
  }
  
  /**
   * Get connection by WebSocket
   */
  getConnection(ws: WebSocket): PooledConnection | undefined {
    return this.connections.get(ws);
  }
  
  /**
   * Get connection by player ID
   */
  getPlayerConnection(playerId: string): PooledConnection | undefined {
    const ws = this.playerConnections.get(playerId);
    return ws ? this.connections.get(ws) : undefined;
  }
  
  /**
   * Update connection activity timestamp
   */
  updateActivity(ws: WebSocket): void {
    const connection = this.connections.get(ws);
    if (connection) {
      connection.lastActivityAt = Date.now();
      connection.missedPings = 0;
    }
  }
  
  /**
   * Authenticate a connection
   */
  authenticateConnection(ws: WebSocket, playerId: string): boolean {
    const connection = this.connections.get(ws);
    if (!connection) return false;
    
    // Remove old player mapping if exists
    if (connection.playerId && connection.playerId !== playerId) {
      this.playerConnections.delete(connection.playerId);
    }
    
    connection.playerId = playerId;
    connection.isAuthenticated = true;
    this.playerConnections.set(playerId, ws);
    
    return true;
  }
  
  // ==========================================
  // TABLE SUBSCRIPTIONS
  // ==========================================
  
  /**
   * Subscribe connection to table updates
   */
  subscribeToTable(ws: WebSocket, tableId: string): boolean {
    const connection = this.connections.get(ws);
    if (!connection) return false;
    
    // Check table subscriber limit
    const tableConns = this.tableConnections.get(tableId);
    const maxSubscribers = POOL_CONFIG.MAX_PLAYERS_PER_TABLE + POOL_CONFIG.MAX_SPECTATORS_PER_TABLE;
    
    if (tableConns && tableConns.size >= maxSubscribers) {
      logger.warn('Table subscription rejected - limit reached', {
        tableId,
        current: tableConns.size,
        max: maxSubscribers
      });
      return false;
    }
    
    // Add to table connections
    if (!this.tableConnections.has(tableId)) {
      this.tableConnections.set(tableId, new Set());
    }
    this.tableConnections.get(tableId)!.add(ws);
    
    // Add to connection's subscribed tables
    connection.subscribedTables.add(tableId);
    
    return true;
  }
  
  /**
   * Unsubscribe connection from table
   */
  unsubscribeFromTable(ws: WebSocket, tableId: string): void {
    const connection = this.connections.get(ws);
    if (connection) {
      connection.subscribedTables.delete(tableId);
    }
    
    const tableConns = this.tableConnections.get(tableId);
    if (tableConns) {
      tableConns.delete(ws);
      if (tableConns.size === 0) {
        this.tableConnections.delete(tableId);
      }
    }
  }
  
  /**
   * Get all connections subscribed to a table
   */
  getTableSubscribers(tableId: string): Set<WebSocket> {
    return this.tableConnections.get(tableId) || new Set();
  }
  
  // ==========================================
  // TOURNAMENT SUBSCRIPTIONS
  // ==========================================
  
  subscribeToTournament(ws: WebSocket, tournamentId: string): boolean {
    const connection = this.connections.get(ws);
    if (!connection) return false;
    
    if (!this.tournamentConnections.has(tournamentId)) {
      this.tournamentConnections.set(tournamentId, new Set());
    }
    this.tournamentConnections.get(tournamentId)!.add(ws);
    connection.subscribedTournaments.add(tournamentId);
    
    return true;
  }
  
  unsubscribeFromTournament(ws: WebSocket, tournamentId: string): void {
    const connection = this.connections.get(ws);
    if (connection) {
      connection.subscribedTournaments.delete(tournamentId);
    }
    
    const tournamentConns = this.tournamentConnections.get(tournamentId);
    if (tournamentConns) {
      tournamentConns.delete(ws);
      if (tournamentConns.size === 0) {
        this.tournamentConnections.delete(tournamentId);
      }
    }
  }
  
  getTournamentSubscribers(tournamentId: string): Set<WebSocket> {
    return this.tournamentConnections.get(tournamentId) || new Set();
  }
  
  // ==========================================
  // BROADCAST UTILITIES
  // ==========================================
  
  /**
   * Broadcast message to all table subscribers
   * Returns number of messages sent
   */
  broadcastToTable(tableId: string, message: object): number {
    const subscribers = this.tableConnections.get(tableId);
    if (!subscribers || subscribers.size === 0) return 0;
    
    const messageStr = JSON.stringify(message);
    let sent = 0;
    
    for (const ws of subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr);
          sent++;
        } catch (err) {
          logger.warn('Broadcast send failed', { tableId, error: String(err) });
        }
      }
    }
    
    return sent;
  }
  
  /**
   * Broadcast message to all tournament subscribers
   */
  broadcastToTournament(tournamentId: string, message: object): number {
    const subscribers = this.tournamentConnections.get(tournamentId);
    if (!subscribers || subscribers.size === 0) return 0;
    
    const messageStr = JSON.stringify(message);
    let sent = 0;
    
    for (const ws of subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr);
          sent++;
        } catch (err) {
          logger.warn('Tournament broadcast send failed', { tournamentId, error: String(err) });
        }
      }
    }
    
    return sent;
  }
  
  // ==========================================
  // CLEANUP & MAINTENANCE
  // ==========================================
  
  private startCleanupLoop(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, POOL_CONFIG.CLEANUP_INTERVAL_MS);
  }
  
  private startPingLoop(): void {
    this.pingInterval = setInterval(() => {
      this.pingAllConnections();
    }, POOL_CONFIG.PING_INTERVAL_MS);
  }
  
  private cleanupStaleConnections(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [ws, connection] of this.connections) {
      const inactiveTime = now - connection.lastActivityAt;
      
      // Check for stale connections
      if (inactiveTime > POOL_CONFIG.STALE_CONNECTION_TIMEOUT_MS) {
        logger.info('Cleaning stale connection', {
          id: connection.id,
          playerId: connection.playerId,
          inactiveMs: inactiveTime
        });
        
        try {
          ws.close(4000, 'Connection timeout');
        } catch (e) {
          // Ignore close errors
        }
        
        this.removeConnection(ws, 'stale');
        cleaned++;
      }
      
      // Check for too many missed pings
      if (connection.missedPings >= POOL_CONFIG.MAX_MISSED_PINGS) {
        logger.info('Cleaning connection due to missed pings', {
          id: connection.id,
          playerId: connection.playerId,
          missedPings: connection.missedPings
        });
        
        try {
          ws.terminate();
        } catch (e) {
          // Ignore terminate errors
        }
        
        this.removeConnection(ws, 'missed_pings');
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info('Cleanup completed', {
        cleanedConnections: cleaned,
        remainingConnections: this.connections.size
      });
    }
  }
  
  private pingAllConnections(): void {
    for (const [ws, connection] of this.connections) {
      if (ws.readyState === WebSocket.OPEN) {
        connection.missedPings++;
        connection.lastPingAt = Date.now();
        
        try {
          ws.ping();
        } catch (e) {
          // Ignore ping errors
        }
      }
    }
  }
  
  /**
   * Handle pong response from client
   */
  handlePong(ws: WebSocket): void {
    const connection = this.connections.get(ws);
    if (connection) {
      connection.missedPings = 0;
      connection.lastActivityAt = Date.now();
    }
  }
  
  // ==========================================
  // STATISTICS
  // ==========================================
  
  getStats(): PoolStats {
    const memUsage = process.memoryUsage();
    const loadFactor = this.connections.size / POOL_CONFIG.MAX_TOTAL_CONNECTIONS;
    
    return {
      totalConnections: this.connections.size,
      authenticatedConnections: Array.from(this.connections.values()).filter(c => c.isAuthenticated).length,
      totalTables: this.tableConnections.size,
      totalTournaments: this.tournamentConnections.size,
      connectionsByTable: new Map(
        Array.from(this.tableConnections.entries()).map(([id, set]) => [id, set.size])
      ),
      connectionsByTournament: new Map(
        Array.from(this.tournamentConnections.entries()).map(([id, set]) => [id, set.size])
      ),
      connectionsByIP: new Map(
        Array.from(this.ipConnections.entries()).map(([ip, set]) => [ip, set.size])
      ),
      loadFactor,
      isHighLoad: loadFactor >= POOL_CONFIG.HIGH_LOAD_THRESHOLD,
      isCriticalLoad: loadFactor >= POOL_CONFIG.CRITICAL_LOAD_THRESHOLD,
      memoryUsageMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      uptimeSeconds: Math.round((Date.now() - this.startTime) / 1000)
    };
  }
  
  /**
   * Check if accepting new connections
   */
  canAcceptConnection(): boolean {
    return this.connections.size < POOL_CONFIG.MAX_TOTAL_CONNECTIONS;
  }
  
  /**
   * Check load status
   */
  isOverloaded(): boolean {
    return this.connections.size >= POOL_CONFIG.MAX_TOTAL_CONNECTIONS * POOL_CONFIG.CRITICAL_LOAD_THRESHOLD;
  }
  
  // ==========================================
  // SHUTDOWN
  // ==========================================
  
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    // Close all connections gracefully
    for (const [ws, connection] of this.connections) {
      try {
        ws.close(1001, 'Server shutting down');
      } catch (e) {
        // Ignore errors
      }
    }
    
    this.connections.clear();
    this.tableConnections.clear();
    this.tournamentConnections.clear();
    this.ipConnections.clear();
    this.playerConnections.clear();
    
    logger.info('ConnectionPool shutdown complete');
  }
}

// Singleton instance
export const connectionPool = new ConnectionPool();
