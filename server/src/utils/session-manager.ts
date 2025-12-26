/**
 * Session Manager
 * Handles player sessions, reconnection, and multi-device support
 */

import { WebSocket } from 'ws';
import { logger } from './logger.js';
import { redisManager, PlayerSession } from './redis-manager.js';

interface ExtendedSession extends PlayerSession {
  ws: WebSocket | null;
  pendingMessages: object[];
  reconnectToken: string;
  deviceId: string | null;
}

interface ReconnectData {
  playerId: string;
  token: string;
  gameState: object | null;
  pendingMessages: object[];
}

class SessionManager {
  private sessions: Map<string, ExtendedSession> = new Map();
  private wsToPlayer: Map<WebSocket, string> = new Map();
  private reconnectTokens: Map<string, { playerId: string; expiresAt: number }> = new Map();
  
  private readonly RECONNECT_WINDOW_MS = 60000; // 1 minute to reconnect
  private readonly MAX_PENDING_MESSAGES = 100;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
    logger.info('SessionManager initialized');
  }

  /**
   * Create or update a session when player connects
   */
  async createSession(
    playerId: string,
    ws: WebSocket,
    ip: string,
    deviceId?: string
  ): Promise<{ isReconnect: boolean; pendingMessages: object[] }> {
    const existingSession = this.sessions.get(playerId);
    let isReconnect = false;
    let pendingMessages: object[] = [];

    if (existingSession) {
      // Player reconnecting
      isReconnect = true;
      pendingMessages = existingSession.pendingMessages;
      
      // Close old connection if still open
      if (existingSession.ws && existingSession.ws.readyState === WebSocket.OPEN) {
        existingSession.ws.close(1000, 'Replaced by new connection');
      }

      // Update session
      existingSession.ws = ws;
      existingSession.lastActivity = Date.now();
      existingSession.ip = ip;
      existingSession.deviceId = deviceId || existingSession.deviceId;
      existingSession.pendingMessages = [];
      
      logger.info('Player reconnected', { playerId, hadPendingMessages: pendingMessages.length });
    } else {
      // New session
      const session: ExtendedSession = {
        playerId,
        ws,
        tableId: null,
        tournamentId: null,
        serverId: 'main',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        ip,
        pendingMessages: [],
        reconnectToken: this.generateToken(),
        deviceId: deviceId || null
      };
      
      this.sessions.set(playerId, session);
      logger.info('New session created', { playerId });
    }

    // Map WebSocket to player
    this.wsToPlayer.set(ws, playerId);

    // Sync to Redis for multi-server
    const session = this.sessions.get(playerId)!;
    await redisManager.setSession(playerId, {
      playerId: session.playerId,
      tableId: session.tableId,
      tournamentId: session.tournamentId,
      connectedAt: session.connectedAt,
      lastActivity: session.lastActivity,
      ip: session.ip
    });

    return { isReconnect, pendingMessages };
  }

  /**
   * Handle disconnection
   */
  async handleDisconnect(ws: WebSocket): Promise<{ 
    playerId: string | null; 
    reconnectToken: string | null;
    tableId: string | null;
    tournamentId: string | null;
  }> {
    const playerId = this.wsToPlayer.get(ws);
    if (!playerId) {
      return { playerId: null, reconnectToken: null, tableId: null, tournamentId: null };
    }

    this.wsToPlayer.delete(ws);
    const session = this.sessions.get(playerId);
    
    if (!session) {
      return { playerId, reconnectToken: null, tableId: null, tournamentId: null };
    }

    // Generate reconnect token
    const reconnectToken = this.generateToken();
    session.reconnectToken = reconnectToken;
    session.ws = null;

    // Store token for reconnection
    this.reconnectTokens.set(reconnectToken, {
      playerId,
      expiresAt: Date.now() + this.RECONNECT_WINDOW_MS
    });

    logger.info('Player disconnected, reconnect window open', { 
      playerId, 
      tableId: session.tableId,
      windowMs: this.RECONNECT_WINDOW_MS 
    });

    return {
      playerId,
      reconnectToken,
      tableId: session.tableId,
      tournamentId: session.tournamentId
    };
  }

  /**
   * Attempt reconnection with token
   */
  async attemptReconnect(
    reconnectToken: string,
    ws: WebSocket,
    ip: string
  ): Promise<ReconnectData | null> {
    const tokenData = this.reconnectTokens.get(reconnectToken);
    
    if (!tokenData) {
      logger.debug('Invalid reconnect token');
      return null;
    }

    if (Date.now() > tokenData.expiresAt) {
      this.reconnectTokens.delete(reconnectToken);
      logger.debug('Reconnect token expired', { playerId: tokenData.playerId });
      return null;
    }

    const session = this.sessions.get(tokenData.playerId);
    if (!session) {
      this.reconnectTokens.delete(reconnectToken);
      return null;
    }

    // Successful reconnection
    this.reconnectTokens.delete(reconnectToken);
    
    // Update session
    session.ws = ws;
    session.lastActivity = Date.now();
    session.ip = ip;
    session.reconnectToken = this.generateToken();

    // Map new WebSocket
    this.wsToPlayer.set(ws, tokenData.playerId);

    // Get pending messages and clear
    const pendingMessages = session.pendingMessages;
    session.pendingMessages = [];

    logger.info('Player reconnected via token', { 
      playerId: tokenData.playerId,
      pendingMessages: pendingMessages.length 
    });

    return {
      playerId: tokenData.playerId,
      token: session.reconnectToken,
      gameState: null, // Would be populated by game manager
      pendingMessages
    };
  }

  /**
   * Queue message for disconnected player
   */
  queueMessage(playerId: string, message: object): boolean {
    const session = this.sessions.get(playerId);
    if (!session) return false;

    // Only queue if disconnected and within reconnect window
    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      return false; // Player is connected, send directly
    }

    if (session.pendingMessages.length >= this.MAX_PENDING_MESSAGES) {
      session.pendingMessages.shift(); // Remove oldest
    }
    session.pendingMessages.push(message);
    return true;
  }

  /**
   * Update player's table/tournament assignment
   */
  updatePlayerLocation(playerId: string, tableId: string | null, tournamentId: string | null): void {
    const session = this.sessions.get(playerId);
    if (session) {
      session.tableId = tableId;
      session.tournamentId = tournamentId;
      redisManager.updateSessionActivity(playerId);
    }
  }

  /**
   * Get WebSocket for player
   */
  getPlayerWebSocket(playerId: string): WebSocket | null {
    const session = this.sessions.get(playerId);
    if (session?.ws?.readyState === WebSocket.OPEN) {
      return session.ws;
    }
    return null;
  }

  /**
   * Get player ID from WebSocket
   */
  getPlayerId(ws: WebSocket): string | null {
    return this.wsToPlayer.get(ws) || null;
  }

  /**
   * Get session info
   */
  getSession(playerId: string): ExtendedSession | null {
    return this.sessions.get(playerId) || null;
  }

  /**
   * Check if player is online
   */
  isPlayerOnline(playerId: string): boolean {
    const session = this.sessions.get(playerId);
    return session?.ws?.readyState === WebSocket.OPEN || false;
  }

  /**
   * Get all players at a table
   */
  getTablePlayers(tableId: string): string[] {
    const players: string[] = [];
    for (const [playerId, session] of this.sessions) {
      if (session.tableId === tableId && session.ws?.readyState === WebSocket.OPEN) {
        players.push(playerId);
      }
    }
    return players;
  }

  /**
   * Get all players in a tournament
   */
  getTournamentPlayers(tournamentId: string): string[] {
    const players: string[] = [];
    for (const [playerId, session] of this.sessions) {
      if (session.tournamentId === tournamentId && session.ws?.readyState === WebSocket.OPEN) {
        players.push(playerId);
      }
    }
    return players;
  }

  /**
   * Update activity timestamp
   */
  updateActivity(playerId: string): void {
    const session = this.sessions.get(playerId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  /**
   * Force disconnect a player
   */
  forceDisconnect(playerId: string, reason: string = 'Forced disconnect'): void {
    const session = this.sessions.get(playerId);
    if (session?.ws) {
      session.ws.close(1000, reason);
    }
    this.sessions.delete(playerId);
    logger.info('Player force disconnected', { playerId, reason });
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  private generateToken(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();

      // Clean expired reconnect tokens
      for (const [token, data] of this.reconnectTokens) {
        if (now > data.expiresAt) {
          this.reconnectTokens.delete(token);
          
          // Also clean session if player didn't reconnect
          const session = this.sessions.get(data.playerId);
          if (session && !session.ws) {
            this.sessions.delete(data.playerId);
            redisManager.deleteSession(data.playerId);
            logger.debug('Session expired, player did not reconnect', { playerId: data.playerId });
          }
        }
      }

      // Clean stale sessions (inactive > 30 minutes with no table/tournament)
      const staleThreshold = 30 * 60 * 1000;
      for (const [playerId, session] of this.sessions) {
        if (!session.tableId && !session.tournamentId) {
          if (now - session.lastActivity > staleThreshold) {
            if (session.ws) {
              session.ws.close(1000, 'Session timeout');
            }
            this.sessions.delete(playerId);
            redisManager.deleteSession(playerId);
            logger.debug('Stale session cleaned', { playerId });
          }
        }
      }
    }, 30000); // Every 30 seconds
  }

  getStats(): {
    activeSessions: number;
    connectedPlayers: number;
    pendingReconnects: number;
    playersInGame: number;
  } {
    let connectedPlayers = 0;
    let playersInGame = 0;

    for (const session of this.sessions.values()) {
      if (session.ws?.readyState === WebSocket.OPEN) {
        connectedPlayers++;
        if (session.tableId) {
          playersInGame++;
        }
      }
    }

    return {
      activeSessions: this.sessions.size,
      connectedPlayers,
      pendingReconnects: this.reconnectTokens.size,
      playersInGame
    };
  }

  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all connections
    for (const session of this.sessions.values()) {
      if (session.ws) {
        session.ws.close(1001, 'Server shutdown');
      }
    }

    this.sessions.clear();
    this.wsToPlayer.clear();
    this.reconnectTokens.clear();
    logger.info('SessionManager shutdown complete');
  }
}

// Singleton instance
export const sessionManager = new SessionManager();
