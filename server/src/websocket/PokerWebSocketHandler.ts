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
  private tablesWithListeners: Set<string> = new Set();
  private gameManager: PokerGameManager;
  private supabase: SupabaseClient;
  private pingInterval: NodeJS.Timeout;
  
  constructor(wss: WebSocketServer, gameManager: PokerGameManager, supabase: SupabaseClient) {
    this.gameManager = gameManager;
    this.supabase = supabase;
    
    // Start ping interval
    this.pingInterval = setInterval(() => this.pingClients(), 30000);
    
    // Setup table event listeners for existing tables
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
      url: req.url
    });
    
    const connection: ClientConnection = {
      ws,
      playerId: playerId,
      subscribedTables: new Set(),
      lastPing: Date.now()
    };
    
    this.clients.set(ws, connection);
    
    // Send welcome message
    this.send(ws, { 
      type: 'connected', 
      timestamp: Date.now(),
      tableId,
      playerId,
      serverVersion: '1.0.0'
    });
    
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
    ws.on('message', (data: Buffer | string) => {
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
  private async handleMessage(ws: WebSocket, data: Buffer | string): Promise<void> {
    try {
      const message = JSON.parse(data.toString());
      logger.info('Processing message', { type: message.type });
      
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
          logger.warn('Unknown message type', { type: message.type });
          this.sendError(ws, `Unknown message type: ${message.type}`);
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
    logger.info('=== JOIN_TABLE START ===');
    logger.info('handleJoinTable ENTRY', { message: JSON.stringify(message) });
    
    const result = JoinTableSchema.safeParse(message);
    if (!result.success) {
      logger.warn('Invalid join request schema', { issues: result.error.issues });
      this.sendError(ws, 'Invalid join request');
      return;
    }
    logger.info('Schema OK');
    
    const { tableId, playerId, playerName, seatNumber, buyIn } = result.data;
    logger.info('Parsed', { tableId, playerId, playerName, seatNumber, buyIn });
    
    const table = this.gameManager.getTable(tableId);
    if (!table) {
      logger.warn('Table not found for join', { tableId });
      this.sendError(ws, 'Table not found');
      return;
    }
    logger.info('Table OK', { tableId });
    
    // Verify player exists
    logger.info('Checking player in DB...');
    try {
      const { data: player, error: playerError } = await this.supabase
        .from('players')
        .select('id, name')
        .eq('id', playerId)
        .single();
      
      logger.info('DB result', { player: JSON.stringify(player) });
      
      if (playerError) {
        logger.warn('Player lookup error', { error: playerError.message });
      }
      
      if (!player) {
        logger.warn('Player not found in DB', { playerId });
        this.sendError(ws, 'Player not found');
        return;
      }
      logger.info('Player OK', { playerId, name: player.name });
    } catch (err) {
      logger.error('Player verification error', { error: String(err) });
    }
    
    logger.info('Calling table.joinTable...');
    const joinResult = await table.joinTable(playerId, playerName, seatNumber, buyIn);
    logger.info('joinTable result', { success: joinResult.success, error: joinResult.error });
    
    if (!joinResult.success) {
      logger.error('Join FAILED', { error: joinResult.error });
      logger.error('Sending error', { error: joinResult.error });
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
    const state = table.getPlayerState(playerId);
    logger.info('Sending joined_table...', { tableId, playerId });
    this.send(ws, {
      type: 'joined_table',
      tableId,
      state
    });
    logger.info('handleJoinTable SUCCESS');
    logger.info('=== JOIN_TABLE END ===');
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
      }
    }
    
    this.clients.delete(ws);
    logger.info('Client disconnected');
  }
  
  /**
   * Setup table event listeners (only once per table)
   */
  private setupTableListeners(table: PokerTable): void {
    // Avoid adding duplicate listeners
    if (this.tablesWithListeners.has(table.id)) {
      return;
    }
    this.tablesWithListeners.add(table.id);
    
    logger.info('Setting up event listener for table', { tableId: table.id });
    
    table.addEventListener((event: TableEvent) => {
      logger.info('Table event received', { tableId: event.tableId, eventType: event.type });
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
    if (!subscribers) {
      logger.warn('No subscribers for table', { tableId, eventType: event.type });
      return;
    }
    
    const table = this.gameManager.getTable(tableId);
    logger.info('Broadcasting to table', { 
      tableId, 
      eventType: event.type, 
      subscriberCount: subscribers.size,
      hasTable: !!table
    });
    
    for (const ws of subscribers) {
      const connection = this.clients.get(ws);
      
      // Send player-specific state if they're a player
      let message: object;
      
      if (connection?.playerId && table) {
        const playerState = table.getPlayerState(connection.playerId);
        
        // Log what we're sending
        const stateObj = playerState as Record<string, unknown>;
        logger.info('Broadcasting player state', { 
          playerId: connection.playerId,
          eventType: event.type,
          phase: stateObj.phase,
          myCards: stateObj.myCards,
          mySeat: stateObj.mySeat,
          currentPlayerSeat: stateObj.currentPlayerSeat
        });
        
        message = {
          ...event,
          state: playerState
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
