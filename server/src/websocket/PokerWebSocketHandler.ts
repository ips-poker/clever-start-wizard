/**
 * WebSocket Handler for Poker Games
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { SupabaseClient } from '@supabase/supabase-js';
import { PokerGameManager } from '../game/PokerGameManager.js';
import { PokerTable, TableEvent } from '../game/PokerTable.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

// Message schemas
const JoinTableSchema = z.object({
  type: z.literal('join_table'),
  tableId: z.string().uuid(),
  playerId: z.string().uuid(),
  playerName: z.string().min(1).max(50),
  seatNumber: z.number().int().min(0).max(9),
  buyIn: z.number().int().min(0)
});

const ActionSchema = z.object({
  type: z.literal('action'),
  tableId: z.string().uuid(),
  playerId: z.string().uuid(),
  actionType: z.enum(['fold', 'check', 'call', 'bet', 'raise', 'allin']),
  amount: z.number().int().min(0).optional()
});

const LeaveTableSchema = z.object({
  type: z.literal('leave_table'),
  tableId: z.string().uuid(),
  playerId: z.string().uuid()
});

const SubscribeSchema = z.object({
  type: z.literal('subscribe'),
  tableId: z.string().uuid(),
  playerId: z.string().uuid().optional()
});

interface ClientConnection {
  ws: WebSocket;
  playerId: string | null;
  subscribedTables: Set<string>;
  lastPing: number;
}

export class PokerWebSocketHandler {
  private clients: Map<WebSocket, ClientConnection> = new Map();
  private tableSubscribers: Map<string, Set<WebSocket>> = new Map();
  private gameManager: PokerGameManager;
  private supabase: SupabaseClient;
  private pingInterval: NodeJS.Timeout;
  
  constructor(wss: WebSocketServer, gameManager: PokerGameManager, supabase: SupabaseClient) {
    this.gameManager = gameManager;
    this.supabase = supabase;
    
    // Start ping interval
    this.pingInterval = setInterval(() => this.pingClients(), 30000);
    
    // Setup table event listeners
    for (const table of gameManager.getAllTables()) {
      this.setupTableListeners(table);
    }
  }
  
  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const clientIp = req.socket.remoteAddress || 'unknown';
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const tableId = url.searchParams.get('tableId');
    const playerId = url.searchParams.get('playerId');
    
    logger.info('New WebSocket connection', { 
      ip: clientIp, 
      tableId, 
      playerId,
      url: req.url,
      readyState: ws.readyState
    });
    
    const connection: ClientConnection = {
      ws,
      playerId: playerId,
      subscribedTables: new Set(),
      lastPing: Date.now()
    };
    
    this.clients.set(ws, connection);
    
    // Send welcome message immediately
    const welcomeMsg = { 
      type: 'connected', 
      timestamp: Date.now(),
      tableId,
      playerId,
      serverVersion: '1.0.0'
    };
    
    logger.info('Sending welcome message', welcomeMsg);
    
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(welcomeMsg));
        logger.info('Welcome message sent successfully');
      } else {
        logger.error('WebSocket not ready', { readyState: ws.readyState });
      }
    } catch (error) {
      logger.error('Failed to send welcome message', { error: String(error) });
    }
    
    // Auto-subscribe to table if provided in URL
    if (tableId) {
      const table = this.gameManager.getTable(tableId);
      if (table) {
        this.subscribeToTable(ws, tableId);
        connection.subscribedTables.add(tableId);
        this.setupTableListeners(table);
        
        // Send current state
        const state = playerId ? table.getPlayerState(playerId) : table.getPublicState();
        this.send(ws, { type: 'state', tableId, state });
        logger.info('Sent initial state for table', { tableId });
      } else {
        logger.warn('Table not found', { tableId });
        this.send(ws, { type: 'error', error: 'Table not found', tableId });
      }
    }
    
    // Handle messages
    ws.on('message', (data) => {
      logger.info('Received message', { data: data.toString().substring(0, 200) });
      this.handleMessage(ws, data);
    });
    
    // Handle close
    ws.on('close', (code, reason) => {
      logger.info('WebSocket closed', { code, reason: reason.toString() });
      this.handleClose(ws);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket error', { error: String(error) });
    });
    
    // Handle pong
    ws.on('pong', () => {
      connection.lastPing = Date.now();
    });
  }
  
  /**
   * Handle incoming message
   */
  private async handleMessage(ws: WebSocket, data: unknown): Promise<void> {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'join_table':
          await this.handleJoinTable(ws, message);
          break;
        
        case 'action':
          await this.handleAction(ws, message);
          break;
        
        case 'leave_table':
          await this.handleLeaveTable(ws, message);
          break;
        
        case 'subscribe':
          await this.handleSubscribe(ws, message);
          break;
        
        case 'get_state':
          await this.handleGetState(ws, message);
          break;
        
        case 'ping':
          this.send(ws, { type: 'pong', timestamp: Date.now() });
          break;
        
        default:
          this.sendError(ws, 'Unknown message type');
      }
    } catch (error) {
      logger.error('Failed to process message', { error: String(error) });
      this.sendError(ws, 'Invalid message format');
    }
  }
  
  /**
   * Handle join table request
   */
  private async handleJoinTable(ws: WebSocket, message: unknown): Promise<void> {
    const result = JoinTableSchema.safeParse(message);
    if (!result.success) {
      this.sendError(ws, 'Invalid join request');
      return;
    }
    
    const { tableId, playerId, playerName, seatNumber, buyIn } = result.data;
    
    const table = this.gameManager.getTable(tableId);
    if (!table) {
      this.sendError(ws, 'Table not found');
      return;
    }
    
    // Verify player (would normally check JWT token)
    const { data: player } = await this.supabase
      .from('players')
      .select('id, name')
      .eq('id', playerId)
      .single();
    
    if (!player) {
      this.sendError(ws, 'Player not found');
      return;
    }
    
    const joinResult = await table.joinTable(playerId, playerName, seatNumber, buyIn);
    
    if (!joinResult.success) {
      this.sendError(ws, joinResult.error || 'Failed to join');
      return;
    }
    
    // Update connection
    const connection = this.clients.get(ws);
    if (connection) {
      connection.playerId = playerId;
      connection.subscribedTables.add(tableId);
    }
    
    // Add to subscribers
    this.subscribeToTable(ws, tableId);
    
    // Setup table listeners
    this.setupTableListeners(table);
    
    // Send success with state
    this.send(ws, {
      type: 'joined_table',
      tableId,
      state: table.getPlayerState(playerId)
    });
  }
  
  /**
   * Handle game action
   */
  private async handleAction(ws: WebSocket, message: unknown): Promise<void> {
    const result = ActionSchema.safeParse(message);
    if (!result.success) {
      this.sendError(ws, 'Invalid action');
      return;
    }
    
    const { tableId, playerId, actionType, amount } = result.data;
    
    const table = this.gameManager.getTable(tableId);
    if (!table) {
      this.sendError(ws, 'Table not found');
      return;
    }
    
    const actionResult = await table.action(playerId, actionType, amount);
    
    if (!actionResult.success) {
      this.sendError(ws, actionResult.error || 'Action failed');
      return;
    }
    
    // State will be broadcast via table event listener
    this.send(ws, { type: 'action_accepted', actionType, amount });
  }
  
  /**
   * Handle leave table
   */
  private async handleLeaveTable(ws: WebSocket, message: unknown): Promise<void> {
    const result = LeaveTableSchema.safeParse(message);
    if (!result.success) {
      this.sendError(ws, 'Invalid leave request');
      return;
    }
    
    const { tableId, playerId } = result.data;
    
    const table = this.gameManager.getTable(tableId);
    if (table) {
      await table.leaveTable(playerId);
    }
    
    // Remove from subscribers
    this.unsubscribeFromTable(ws, tableId);
    
    const connection = this.clients.get(ws);
    if (connection) {
      connection.subscribedTables.delete(tableId);
    }
    
    this.send(ws, { type: 'left_table', tableId });
  }
  
  /**
   * Handle subscribe (spectator mode)
   */
  private async handleSubscribe(ws: WebSocket, message: unknown): Promise<void> {
    const result = SubscribeSchema.safeParse(message);
    if (!result.success) {
      this.sendError(ws, 'Invalid subscribe request');
      return;
    }
    
    const { tableId, playerId } = result.data;
    
    const table = this.gameManager.getTable(tableId);
    if (!table) {
      this.sendError(ws, 'Table not found');
      return;
    }
    
    this.subscribeToTable(ws, tableId);
    
    const connection = this.clients.get(ws);
    if (connection && playerId) {
      connection.playerId = playerId;
    }
    
    // Send current state
    const state = playerId ? table.getPlayerState(playerId) : table.getPublicState();
    this.send(ws, { type: 'subscribed', tableId, state });
  }
  
  /**
   * Handle get state request
   */
  private async handleGetState(ws: WebSocket, message: { tableId: string; playerId?: string }): Promise<void> {
    const { tableId, playerId } = message;
    
    const table = this.gameManager.getTable(tableId);
    if (!table) {
      this.sendError(ws, 'Table not found');
      return;
    }
    
    const state = playerId ? table.getPlayerState(playerId) : table.getPublicState();
    this.send(ws, { type: 'state', tableId, state });
  }
  
  /**
   * Handle connection close
   */
  private handleClose(ws: WebSocket): void {
    const connection = this.clients.get(ws);
    
    if (connection) {
      // Unsubscribe from all tables
      for (const tableId of connection.subscribedTables) {
        this.unsubscribeFromTable(ws, tableId);
        
        // Mark player as disconnected if they were playing
        if (connection.playerId) {
          const table = this.gameManager.getTable(tableId);
          if (table) {
            // Will be handled by table
          }
        }
      }
    }
    
    this.clients.delete(ws);
    logger.info('WebSocket client disconnected');
  }
  
  /**
   * Setup table event listeners
   */
  private setupTableListeners(table: PokerTable): void {
    table.addEventListener((event: TableEvent) => {
      this.broadcastToTable(event.tableId, event);
    });
  }
  
  /**
   * Subscribe client to table updates
   */
  private subscribeToTable(ws: WebSocket, tableId: string): void {
    if (!this.tableSubscribers.has(tableId)) {
      this.tableSubscribers.set(tableId, new Set());
    }
    this.tableSubscribers.get(tableId)!.add(ws);
  }
  
  /**
   * Unsubscribe client from table
   */
  private unsubscribeFromTable(ws: WebSocket, tableId: string): void {
    const subscribers = this.tableSubscribers.get(tableId);
    if (subscribers) {
      subscribers.delete(ws);
      if (subscribers.size === 0) {
        this.tableSubscribers.delete(tableId);
      }
    }
  }
  
  /**
   * Broadcast message to all table subscribers
   */
  private broadcastToTable(tableId: string, event: TableEvent): void {
    const subscribers = this.tableSubscribers.get(tableId);
    if (!subscribers) return;
    
    const table = this.gameManager.getTable(tableId);
    
    for (const ws of subscribers) {
      const connection = this.clients.get(ws);
      
      // Send player-specific state if they're a player
      let message: object;
      if (connection?.playerId && table) {
        message = {
          ...event,
          state: table.getPlayerState(connection.playerId)
        };
      } else {
        message = {
          ...event,
          state: table?.getPublicState()
        };
      }
      
      this.send(ws, message);
    }
  }
  
  /**
   * Send message to client
   */
  private send(ws: WebSocket, message: object): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  
  /**
   * Send error to client
   */
  private sendError(ws: WebSocket, error: string): void {
    this.send(ws, { type: 'error', error, timestamp: Date.now() });
  }
  
  /**
   * Ping all clients
   */
  private pingClients(): void {
    const now = Date.now();
    
    for (const [ws, connection] of this.clients) {
      // Disconnect inactive clients
      if (now - connection.lastPing > 60000) {
        logger.warn('Disconnecting inactive client');
        ws.terminate();
        continue;
      }
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }
  }
  
  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    clearInterval(this.pingInterval);
    
    for (const ws of this.clients.keys()) {
      ws.close(1001, 'Server shutting down');
    }
    
    this.clients.clear();
    this.tableSubscribers.clear();
  }
}
