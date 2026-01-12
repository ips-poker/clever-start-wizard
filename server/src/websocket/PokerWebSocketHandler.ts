/**
 * WebSocket Handler for Poker Games v3.1
 * Professional-grade with full utility integration:
 * - ConnectionPool for connection management
 * - MessageQueue for optimized broadcasting
 * - MetricsCollector for monitoring
 * - CircuitBreaker for DB protection
 * - LoadManager for graceful degradation
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { SupabaseClient } from '@supabase/supabase-js';
import { PokerGameManager } from '../game/PokerGameManager.js';
import { PokerTable, TableEvent } from '../game/PokerTable.js';
import { TournamentManager, TournamentState, TournamentClock, createConfigFromDatabase, TournamentBlindLevel } from '../game/TournamentManager.js';
import { logger } from '../utils/logger.js';
import { ConnectionPool, PooledConnection, POOL_CONFIG } from '../utils/connection-pool.js';
import { MessageQueue, messageQueue } from '../utils/message-queue.js';
import { metrics } from '../utils/metrics.js';
import { supabaseCircuitBreaker } from '../utils/circuit-breaker.js';
import { loadManager, LoadLevel } from '../utils/load-manager.js';
import { createHandForHandIntegration, HandForHandIntegration } from '../utils/hand-for-hand-integration.js';
import { pkoBountyService } from '../utils/pko-bounty-service.js';
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

const SitOutSchema = z.object({
  type: z.literal('sit_out'),
  tableId: z.string().uuid(),
  playerId: z.string().uuid()
});

const SitInSchema = z.object({
  type: z.literal('sit_in'),
  tableId: z.string().uuid(),
  playerId: z.string().uuid()
});

// Activity ping schema - used to confirm player is still active (especially for popup windows)
const ActivityPingSchema = z.object({
  type: z.literal('activity_ping'),
  tableId: z.string().uuid(),
  playerId: z.string().uuid(),
  isPopup: z.boolean().optional()
});

const SubscribeSchema = z.object({
  type: z.literal('subscribe'),
  tableId: z.string().uuid(),
  playerId: z.string().uuid().optional()
});

// Tournament message schemas
const TournamentSubscribeSchema = z.object({
  type: z.literal('tournament_subscribe'),
  tournamentId: z.string().uuid()
});

const TournamentActionSchema = z.object({
  type: z.enum(['tournament_start', 'tournament_pause', 'tournament_resume', 'tournament_rebuy', 'tournament_addon']),
  tournamentId: z.string().uuid(),
  playerId: z.string().uuid().optional()
});

// Interface for DB blind level
interface DBBlindLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number | null;
  duration: number | null;
  is_break: boolean | null;
}

export class PokerWebSocketHandler {
  // Use ConnectionPool instead of raw Map
  private connectionPool: ConnectionPool;
  private tablesWithListeners: Set<string> = new Set();
  private gameManager: PokerGameManager;
  private tournamentManager: TournamentManager;
  private handForHandIntegration: HandForHandIntegration;
  private supabase: SupabaseClient;
  private pingInterval: NodeJS.Timeout;
  private tournamentTimerInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  
  constructor(
    wss: WebSocketServer, 
    gameManager: PokerGameManager, 
    supabase: SupabaseClient,
    tournamentManager?: TournamentManager
  ) {
    this.gameManager = gameManager;
    this.supabase = supabase;
    
    // Initialize or use provided tournament manager with Supabase for DB sync
    if (tournamentManager) {
      this.tournamentManager = tournamentManager;
    } else {
      this.tournamentManager = new TournamentManager();
    }
    this.tournamentManager.setSupabase(supabase);
    
    // Initialize Hand-for-Hand integration
    this.handForHandIntegration = createHandForHandIntegration(supabase);
    this.handForHandIntegration.setBroadcastCallback((tournamentId, message) => {
      this.broadcastToTournament(tournamentId, message);
    });
    
    // Initialize ConnectionPool
    this.connectionPool = new ConnectionPool();
    
    // Start ping interval
    this.pingInterval = setInterval(() => this.pingClients(), 30000);
    
    // Start tournament timer broadcast (every second)
    this.tournamentTimerInterval = setInterval(() => this.broadcastTournamentTimers(), 1000);
    
    // Start metrics collection (every 10 seconds)
    this.metricsInterval = setInterval(() => this.collectMetrics(), 10000);
    
    // CRITICAL: Register callback to setup event listeners when tables are loaded
    // This ensures elimination events are handled even for tables loaded dynamically
    // (e.g., tournament tables where bots play before any human connects)
    gameManager.onTableLoaded((table) => {
      this.setupTableListeners(table);
    });
    
    // Listen for load level changes
    loadManager.onLoadChange((level) => {
      this.handleLoadLevelChange(level);
    });
    
    // Load active tournaments from database
    this.loadActiveTournaments();
    
    logger.info('PokerWebSocketHandler v3.3 initialized with auto table listener setup');
  }
  
  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const clientIp = req.socket.remoteAddress || 'unknown';
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const tableId = url.searchParams.get('tableId');
    const playerId = url.searchParams.get('playerId');
    
    // Check load level before accepting
    if (!loadManager.canAcceptConnection()) {
      logger.warn('Connection rejected - system at CRITICAL load', { ip: clientIp });
      ws.close(1013, 'Server at capacity');
      metrics.recordConnectionAttempt(true);
      return;
    }
    
    // Use ConnectionPool to add connection
    const connection = this.connectionPool.addConnection(ws, clientIp, playerId || undefined);
    
    if (!connection) {
      logger.warn('Connection rejected by pool', { ip: clientIp });
      ws.close(1013, 'Connection limit reached');
      metrics.recordConnectionAttempt(true);
      return;
    }
    
    metrics.recordConnectionAttempt(false);
    
    logger.info('New WebSocket connection', { 
      id: connection.id,
      ip: clientIp, 
      tableId, 
      playerId
    });
    
    // Send welcome message
    this.send(ws, { 
      type: 'connected', 
      timestamp: Date.now(),
      tableId,
      playerId,
      serverVersion: '3.1.0',
      engine: 'Professional Poker Engine v3.1 (Tournament-Grade)',
      loadLevel: loadManager.getLevel()
    });
    
    // Auto-subscribe to table if provided in URL
    if (tableId) {
      (async () => {
        try {
          // Try to get table, or load dynamically if not in memory
          const table = await this.gameManager.loadTableIfNeeded(tableId);

          if (!table) {
            logger.warn('Table not found even after dynamic load attempt', { tableId });
            this.send(ws, { type: 'error', error: 'Table not found', tableId });
            return;
          }

          this.connectionPool.subscribeToTable(ws, tableId);
          this.setupTableListeners(table);

          // IMPORTANT: Tournament seating may update poker_table_players directly (outside WS join flow).
          // Ensure the connecting player is loaded from DB so they can see themselves immediately.
          if (playerId) {
            await table.ensurePlayerLoadedFromDatabase(playerId);
          }

          // Send current state
          const state = playerId ? table.getPlayerState(playerId) : table.getPublicState();
          this.send(ws, { type: 'state', tableId, state });
          logger.info('Sent initial state for table', { tableId });
        } catch (err) {
          logger.error('Error loading table', { tableId, error: String(err) });
          this.send(ws, { type: 'error', error: 'Failed to load table', tableId });
        }
      })();
    }
    
    // Handle messages
    ws.on('message', (data: Buffer | string) => {
      const bytes = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
      metrics.recordMessageReceived(bytes);
      this.connectionPool.updateActivity(ws);
      
      if (loadManager.shouldLogDetailed()) {
        logger.info('Received message', { data: data.toString().substring(0, 200) });
      }
      
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
      metrics.recordError();
    });
    
    // Handle pong
    ws.on('pong', () => {
      this.connectionPool.handlePong(ws);
    });
  }
  
  /**
   * Handle incoming message
   */
  private async handleMessage(ws: WebSocket, data: Buffer | string): Promise<void> {
    const startTime = Date.now();
    
    try {
      const message = JSON.parse(data.toString());
      
      if (loadManager.shouldLogDetailed()) {
        logger.info('Processing message', { type: message.type });
      }
      
      // Wrap all handlers in try-catch to prevent crashes
      await this.safeHandleMessageType(ws, message);
      
      // Record latency
      metrics.recordMessageLatency(Date.now() - startTime);
    } catch (error) {
      logger.error('Failed to process message', { error: String(error) });
      this.sendError(ws, 'Invalid message format');
      metrics.recordError();
    }
  }
  
  /**
   * Safe message type handler with error isolation
   */
  private async safeHandleMessageType(ws: WebSocket, message: any): Promise<void> {
    try {
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
        
        case 'sit_out':
          await this.handleSitOut(ws, message);
          break;
        
        case 'sit_in':
          await this.handleSitIn(ws, message);
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
        
        // Activity ping - confirm player is still active (for popup windows)
        case 'activity_ping':
          await this.handleActivityPing(ws, message);
          break;
        
        // Tournament messages
        case 'tournament_subscribe':
          await this.handleTournamentSubscribe(ws, message);
          break;
        
        case 'tournament_start':
        case 'tournament_pause':
        case 'tournament_resume':
        case 'tournament_rebuy':
        case 'tournament_addon':
          await this.handleTournamentAction(ws, message);
          break;
        
        case 'get_tournament_state':
          await this.handleGetTournamentState(ws, message);
          break;
        
        // Hand-for-Hand status request
        case 'get_hfh_status':
          await this.handleGetHFHStatus(ws, message);
          break;
        
        // Chat message (controlled by load level)
        case 'chat':
          if (loadManager.isChatEnabled()) {
            await this.handleChat(ws, message);
          } else {
            this.send(ws, { type: 'chat_disabled', reason: 'High server load' });
          }
          break;
        
        // Reconnect request - restore player after page reload
        case 'reconnect_request':
          await this.handleReconnectRequest(ws, message);
          break;
        
        default:
          logger.warn('Unknown message type', { type: message.type });
          this.sendError(ws, `Unknown message type: ${message.type}`);
      }
    } catch (handlerError) {
      logger.error('Handler error - isolated', { 
        type: message.type, 
        error: String(handlerError) 
      });
      this.sendError(ws, 'Request failed');
      metrics.recordError();
    }
  }
  
  /**
   * Handle join table request with circuit breaker protection
   */
  private async handleJoinTable(ws: WebSocket, message: unknown): Promise<void> {
    const result = JoinTableSchema.safeParse(message);
    if (!result.success) {
      logger.warn('Invalid join request schema', { issues: result.error.issues });
      this.sendError(ws, 'Invalid join request');
      return;
    }
    
    const { tableId, playerId, playerName, seatNumber, buyIn } = result.data;
    
    // Try to get table, or load dynamically if not in memory
    const table = await this.gameManager.loadTableIfNeeded(tableId);
    if (!table) {
      logger.warn('Table not found for join even after dynamic load', { tableId });
      this.sendError(ws, 'Table not found');
      return;
    }
    
    // Verify player exists with circuit breaker protection
    let dbName: string = playerName;
    let avatarUrl: string | undefined;
    
    try {
      const playerData = await supabaseCircuitBreaker.read(async () => {
        const { data: player, error } = await this.supabase
          .from('players')
          .select('id, name, avatar_url')
          .eq('id', playerId)
          .single();
        
        if (error) throw error;
        return player;
      });
      
      if (!playerData) {
        logger.warn('Player not found in DB', { playerId });
        this.sendError(ws, 'Player not found');
        return;
      }
      
      dbName = playerData.name || playerName;
      avatarUrl = playerData.avatar_url || undefined;
    } catch (err) {
      // Circuit breaker fallback - use provided name
      logger.warn('DB lookup failed, using provided name', { error: String(err) });
    }
    
    const joinResult = await table.joinTable(playerId, dbName, seatNumber, buyIn, avatarUrl);
    
    if (!joinResult.success) {
      this.sendError(ws, joinResult.error || 'Failed to join');
      return;
    }
    
    // Authenticate and subscribe connection
    this.connectionPool.authenticateConnection(ws, playerId);
    this.connectionPool.subscribeToTable(ws, tableId);
    this.setupTableListeners(table);
    
    // Send success with state
    const state = table.getPlayerState(playerId);
    this.send(ws, { type: 'joined_table', tableId, state });
    
    logger.info('Player joined table', { tableId, playerId: playerId.substring(0, 8) });
  }
  
  /**
   * Handle game action with metrics
   */
  private async handleAction(ws: WebSocket, message: unknown): Promise<void> {
    const actionStart = Date.now();
    
    const result = ActionSchema.safeParse(message);
    if (!result.success) {
      this.sendError(ws, 'Invalid action');
      return;
    }
    
    const { tableId, playerId, actionType, amount } = result.data;
    
    // Try to get table, or load dynamically if not in memory
    const table = await this.gameManager.loadTableIfNeeded(tableId);
    if (!table) {
      this.sendError(ws, 'Table not found');
      return;
    }
    
    const actionResult = await table.action(playerId, actionType, amount);
    
    // Record action metrics
    metrics.recordAction(Date.now() - actionStart);
    
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
    
    const table = await this.gameManager.loadTableIfNeeded(tableId);
    if (table) {
      await table.leaveTable(playerId);
    }
    }
    
    // Remove from subscribers
    this.connectionPool.unsubscribeFromTable(ws, tableId);
    
    this.send(ws, { type: 'left_table', tableId });
  }
  
  /**
   * Handle sit out request
   */
  private async handleSitOut(ws: WebSocket, message: unknown): Promise<void> {
    const result = SitOutSchema.safeParse(message);
    if (!result.success) {
      this.sendError(ws, 'Invalid sit out request');
      return;
    }
    
    const { tableId, playerId } = result.data;
    
    const table = await this.gameManager.loadTableIfNeeded(tableId);
    if (!table) {
      this.sendError(ws, 'Table not found');
      return;
    }
    
    const sitOutResult = await table.sitOut(playerId);
    
    if (!sitOutResult.success) {
      this.sendError(ws, sitOutResult.error || 'Failed to sit out');
      return;
    }
    
    const state = table.getPlayerState(playerId);
    this.send(ws, { type: 'sit_out_success', tableId, state });
  }
  
  /**
   * Handle sit in request
   */
  private async handleSitIn(ws: WebSocket, message: unknown): Promise<void> {
    const result = SitInSchema.safeParse(message);
    if (!result.success) {
      this.sendError(ws, 'Invalid sit in request');
      return;
    }
    
    const { tableId, playerId } = result.data;
    
    const table = await this.gameManager.loadTableIfNeeded(tableId);
    if (!table) {
      this.sendError(ws, 'Table not found');
      return;
    }
    
    const sitInResult = await table.sitIn(playerId);
    
    if (!sitInResult.success) {
      this.sendError(ws, sitInResult.error || 'Failed to sit in');
      return;
    }
    
    const state = table.getPlayerState(playerId);
    this.send(ws, { type: 'sit_in_success', tableId, state });
  }
  
  /**
   * Handle activity ping - confirms player is still active
   * CRITICAL: Popup windows may lose visibility without disconnecting
   * This prevents false sitout detection
   */
  private async handleActivityPing(ws: WebSocket, message: unknown): Promise<void> {
    const result = ActivityPingSchema.safeParse(message);
    if (!result.success) {
      // Just ignore invalid pings - don't error
      return;
    }
    
    const { tableId, playerId, isPopup } = result.data;
    
    const table = await this.gameManager.loadTableIfNeeded(tableId);
    if (!table) {
      return; // Silently ignore - table may have been closed
    }
    
    // Update player's last activity timestamp
    // This prevents the disconnect timeout from triggering sitout
    const player = table.getPlayer(playerId);
    if (player) {
      // Mark player as active and update their connection info
      player.lastActivityTime = Date.now();
      player.isDisconnected = false;
      
      // If player was sitting out due to inactivity, consider auto sit-in
      // But only if they didn't manually sit out
      if (player.isSittingOut && player.sitOutReason === 'disconnect') {
        logger.info('Activity ping received - auto sit-in from disconnect sitout', {
          tableId,
          playerId: playerId.substring(0, 8),
          isPopup
        });
        await table.sitIn(playerId);
      }
    }
    
    // Send acknowledgment
    this.send(ws, { 
      type: 'activity_pong', 
      tableId, 
      playerId,
      timestamp: Date.now()
    });
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
    
    // Check if spectators are allowed under current load
    if (!playerId && !loadManager.canAcceptSpectator()) {
      this.send(ws, { 
        type: 'subscribe_rejected', 
        reason: 'Spectator mode disabled due to high server load' 
      });
      return;
    }
    
    const table = await this.gameManager.loadTableIfNeeded(tableId);
    if (!table) {
      this.sendError(ws, 'Table not found');
      return;
    }
    
    this.connectionPool.subscribeToTable(ws, tableId);
    
    if (playerId) {
      this.connectionPool.authenticateConnection(ws, playerId);
    }
    
    const state = playerId ? table.getPlayerState(playerId) : table.getPublicState();
    this.send(ws, { type: 'subscribed', tableId, state });
  }
  
  /**
   * Handle get state request
   */
  private async handleGetState(ws: WebSocket, message: { tableId: string; playerId?: string }): Promise<void> {
    const { tableId, playerId } = message;
    
    const table = await this.gameManager.loadTableIfNeeded(tableId);
    if (!table) {
      this.sendError(ws, 'Table not found');
      return;
    }
    
    const state = playerId ? table.getPlayerState(playerId) : table.getPublicState();
    this.send(ws, { type: 'state', tableId, state });
  }
  
  /**
   * Handle chat message (load-controlled)
   */
  private async handleChat(ws: WebSocket, message: { tableId?: string; tournamentId?: string; text: string }): Promise<void> {
    const connection = this.connectionPool.getConnection(ws);
    if (!connection?.playerId) {
      this.sendError(ws, 'Authentication required for chat');
      return;
    }
    
    const chatMessage = {
      type: 'chat_message',
      playerId: connection.playerId,
      text: message.text.substring(0, 200), // Limit message length
      timestamp: Date.now()
    };
    
    if (message.tableId) {
      this.broadcastToTable(message.tableId, chatMessage);
    } else if (message.tournamentId) {
      this.broadcastToTournament(message.tournamentId, chatMessage);
    }
  }
  
  /**
   * Handle connection close - PRESERVE player state for reconnect
   * Player stays at table, just marked as disconnected temporarily
   */
  private handleClose(ws: WebSocket): void {
    const connection = this.connectionPool.getConnection(ws);
    
    if (connection?.playerId) {
      const playerId = connection.playerId;
      
      // Find which table the player was at
      for (const tableId of connection.subscribedTables) {
        const table = this.gameManager.getTable(tableId);
        if (table) {
          // Mark player as disconnected but DON'T remove from table
          // Player has 60 seconds to reconnect
          table.markPlayerDisconnected(playerId);
          
          logger.info('Player disconnected, preserving seat for reconnect', {
            playerId: playerId.substring(0, 8),
            tableId,
            reconnectWindowSeconds: 60
          });
        }
      }
    }
    
    this.connectionPool.removeConnection(ws, 'closed');
    logger.info('Client disconnected');
  }
  
  /**
   * Handle reconnect request - restore player to their seat
   */
  private async handleReconnectRequest(ws: WebSocket, message: any): Promise<void> {
    const { tableId, playerId } = message;
    
    if (!tableId || !playerId) {
      this.sendError(ws, 'Missing tableId or playerId');
      return;
    }
    
    const table = await this.gameManager.loadTableIfNeeded(tableId);
    if (!table) {
      this.sendError(ws, 'Table not found');
      return;
    }
    
    // CRITICAL: Ensure player is loaded from database (handles server restart scenario)
    // This is important when server restarts and player reconnects - they may be in DB but not in memory
    await table.ensurePlayerLoadedFromDatabase(playerId);
    
    // Try to restore the player
    const restored = table.restoreDisconnectedPlayer(playerId);
    
    if (restored) {
      // Authenticate and subscribe connection
      this.connectionPool.authenticateConnection(ws, playerId);
      this.connectionPool.subscribeToTable(ws, tableId);
      this.setupTableListeners(table);
      
      // Send full state
      const state = table.getPlayerState(playerId);
      this.send(ws, { 
        type: 'reconnect_success', 
        tableId, 
        state,
        message: 'Соединение восстановлено'
      });
      
      logger.info('Player reconnected successfully', {
        playerId: playerId.substring(0, 8),
        tableId
      });
    } else {
      // Player's seat was given up (timeout) or not found
      // FALLBACK: Check if player exists in memory and just return state
      // This handles edge case where player was never marked as disconnected
      const playerExists = table.hasPlayer(playerId);
      
      if (playerExists) {
        // Player is at table but wasn't in disconnected state - just send state
        this.connectionPool.authenticateConnection(ws, playerId);
        this.connectionPool.subscribeToTable(ws, tableId);
        this.setupTableListeners(table);
        
        const state = table.getPlayerState(playerId);
        this.send(ws, { 
          type: 'reconnect_success', 
          tableId, 
          state,
          message: 'Соединение восстановлено'
        });
        
        logger.info('Player reconnected via fallback (was never disconnected)', {
          playerId: playerId.substring(0, 8),
          tableId
        });
      } else {
        this.send(ws, {
          type: 'reconnect_failed',
          tableId,
          reason: 'seat_expired',
          message: 'Ваше место было освобождено'
        });
        
        logger.info('Player reconnect failed - seat expired', {
          playerId: playerId.substring(0, 8),
          tableId
        });
      }
    }
  }
  
  /**
   * Setup table event listeners (only once per table)
   */
  private setupTableListeners(table: PokerTable): void {
    if (this.tablesWithListeners.has(table.id)) {
      return;
    }
    this.tablesWithListeners.add(table.id);
    
    if (loadManager.shouldLogDetailed()) {
      logger.info('Setting up event listener for table', { tableId: table.id });
    }
    
    table.addEventListener((event: TableEvent) => {
      if (loadManager.shouldLogDetailed()) {
        logger.info('Table event received', { tableId: event.tableId, eventType: event.type });
      }
      
      // Handle tournament player eliminations
      if (event.type === 'players_eliminated') {
        this.handleTournamentEliminationEvent(event.tableId, event.data as { tableId: string; players: { playerId: string; seatNumber: number; name: string }[] });
      }
      
      this.broadcastTableEvent(event);
    });
  }
  
  /**
   * Handle tournament elimination event when players have zero chips
   * FIXED: Check tournament_id presence instead of table_type to correctly identify tournament tables
   */
  private async handleTournamentEliminationEvent(
    tableId: string, 
    data: { tableId: string; players: { playerId: string; seatNumber: number; name: string }[] }
  ): Promise<void> {
    try {
      // Get tournament ID for this table - check tournament_id presence, not table_type
      const { data: tableData, error } = await this.supabase
        .from('poker_tables')
        .select('tournament_id, table_type')
        .eq('id', tableId)
        .single();
      
      // FIXED: A table is a tournament table if it has tournament_id, regardless of table_type
      if (error || !tableData?.tournament_id) {
        // Not a tournament table, skip elimination logic
        if (data.players.length > 0) {
          logger.debug('Non-tournament table elimination skipped', { tableId, players: data.players.length });
        }
        return;
      }
      
      const tournamentId = tableData.tournament_id;
      
      // Check if rebuy is available for this tournament
      const { data: tournamentData } = await this.supabase
        .from('online_poker_tournaments')
        .select('rebuy_enabled, rebuy_end_level, current_level, status')
        .eq('id', tournamentId)
        .single();
      
      const rebuyAvailable = tournamentData?.rebuy_enabled && 
        tournamentData?.current_level <= (tournamentData?.rebuy_end_level || 0) &&
        ['running', 'break'].includes(tournamentData?.status || '');
      
      logger.info('Processing tournament eliminations', {
        tableId,
        tournamentId,
        tableType: tableData.table_type,
        eliminatedCount: data.players.length,
        rebuyAvailable
      });
      
      // Process each eliminated player
      for (const eliminatedPlayer of data.players) {
        if (rebuyAvailable) {
          // Mark player as awaiting rebuy decision - don't eliminate yet
          await this.handlePlayerRebuyWindow(tournamentId, tableId, eliminatedPlayer.playerId);
        } else {
          // No rebuy available - eliminate immediately
          await this.handleTournamentElimination(tournamentId, eliminatedPlayer.playerId);
          
          // Notify Hand-for-Hand integration about elimination
          await this.handForHandIntegration.playerEliminated(tournamentId, eliminatedPlayer.playerId);
        }
      }
    } catch (err) {
      logger.error('Error handling tournament elimination event', { tableId, error: String(err) });
    }
  }
  
  /**
   * Handle rebuy window for eliminated player
   * Player has limited time to rebuy or be eliminated
   */
  private async handlePlayerRebuyWindow(
    tournamentId: string, 
    tableId: string, 
    playerId: string
  ): Promise<void> {
    const REBUY_WINDOW_SECONDS = 30;
    
    try {
      // Update player status to 'rebuy_pending' in poker_table_players
      await this.supabase
        .from('poker_table_players')
        .update({ 
          status: 'sitting_out',
          stack: 0
        })
        .eq('table_id', tableId)
        .eq('player_id', playerId);
      
      // Broadcast rebuy opportunity to the player
      this.broadcastToTable(tableId, {
        type: 'rebuy_available',
        playerId,
        tournamentId,
        timeoutSeconds: REBUY_WINDOW_SECONDS,
        timestamp: Date.now()
      });
      
      logger.info('Rebuy window opened for player', { 
        tournamentId, 
        playerId, 
        timeoutSeconds: REBUY_WINDOW_SECONDS 
      });
      
      // Set timeout to eliminate if no rebuy
      setTimeout(async () => {
        try {
          // Check if player still has 0 chips (didn't rebuy)
          const { data: player } = await this.supabase
            .from('poker_table_players')
            .select('stack, status')
            .eq('table_id', tableId)
            .eq('player_id', playerId)
            .maybeSingle();
          
          if (player && player.stack === 0) {
            logger.info('Rebuy timeout - eliminating player', { tournamentId, playerId });
            await this.handleTournamentElimination(tournamentId, playerId);
            await this.handForHandIntegration.playerEliminated(tournamentId, playerId);
            
            // Broadcast elimination - main elimination handler will send full data
            // But also send table-specific event for immediate UI update
            this.broadcastToTable(tableId, {
              type: 'player_eliminated_from_table',
              playerId,
              reason: 'rebuy_timeout',
              timestamp: Date.now()
            });
          }
        } catch (err) {
          logger.error('Error in rebuy timeout handler', { error: String(err) });
        }
      }, REBUY_WINDOW_SECONDS * 1000);
      
    } catch (err) {
      logger.error('Error opening rebuy window', { tournamentId, playerId, error: String(err) });
    }
  }
  
  /**
   * Broadcast table event using MessageQueue
   */
  private broadcastTableEvent(event: TableEvent): void {
    const subscribers = this.connectionPool.getTableSubscribers(event.tableId);
    if (subscribers.size === 0) {
      return;
    }
    
    const table = this.gameManager.getTable(event.tableId);
    
    // Determine priority based on event type
    const priority = event.type === 'action' || event.type === 'hand_complete' 
      ? 'high' 
      : 'normal';
    
    for (const ws of subscribers) {
      const connection = this.connectionPool.getConnection(ws);
      
      let message: object;
      
      if (connection?.playerId && table) {
        const playerState = table.getPlayerState(connection.playerId);
        message = { ...event, state: playerState };
      } else {
        message = { ...event, state: table?.getPublicState() };
      }
      
      // Use MessageQueue for optimized sending
      messageQueue.enqueue(ws, message, priority);
      metrics.recordMessageSent(JSON.stringify(message).length);
    }
  }
  
  /**
   * Broadcast to table directly (for non-event messages)
   */
  private broadcastToTable(tableId: string, message: object): void {
    const sent = this.connectionPool.broadcastToTable(tableId, message);
    if (sent > 0) {
      metrics.recordMessageSent(JSON.stringify(message).length * sent);
    }
  }
  
  /**
   * Broadcast to tournament subscribers
   */
  private broadcastToTournament(tournamentId: string, message: object): void {
    const sent = this.connectionPool.broadcastToTournament(tournamentId, message);
    if (sent > 0) {
      metrics.recordMessageSent(JSON.stringify(message).length * sent);
    }
  }
  
  /**
   * Send message to client
   */
  private send(ws: WebSocket, message: object): void {
    if (ws.readyState === WebSocket.OPEN) {
      const str = JSON.stringify(message);
      ws.send(str);
      metrics.recordMessageSent(str.length);
    }
  }
  
  /**
   * Send error to client
   */
  private sendError(ws: WebSocket, error: string): void {
    this.send(ws, { type: 'error', error, timestamp: Date.now() });
  }
  
  /**
   * Ping all clients (uses ConnectionPool)
   */
  private pingClients(): void {
    // ConnectionPool handles ping internally via its own interval
    // This is now just for additional health checks
    const stats = this.connectionPool.getStats();
    
    if (loadManager.shouldLogDetailed()) {
      logger.info('Connection pool stats', {
        total: stats.totalConnections,
        authenticated: stats.authenticatedConnections,
        loadFactor: stats.loadFactor
      });
    }
  }
  
  /**
   * Collect metrics and update load manager
   */
  private collectMetrics(): void {
    const poolStats = this.connectionPool.getStats();
    const gameStats = this.gameManager.getStats();
    
    // Update load manager with current metrics
    loadManager.updateMetrics({
      connections: poolStats.totalConnections,
      tables: gameStats.activeTables,
      heapUsedMB: poolStats.memoryUsageMB,
      eventLoopLagMs: 0 // Would need separate measurement
    });
    
    // Update metrics for tournaments
    const tournamentCount = this.tournamentManager.getActiveTournamentCount() || 0;
    metrics.setActiveTournaments(tournamentCount, poolStats.totalConnections);
  }
  
  /**
   * Handle load level changes
   */
  private handleLoadLevelChange(level: LoadLevel): void {
    logger.warn('Load level changed', { level });
    
    // Broadcast load level to all clients
    const message = {
      type: 'server_status',
      loadLevel: level,
      features: {
        chat: loadManager.isChatEnabled(),
        spectators: loadManager.canAcceptSpectator(),
        newTournaments: loadManager.canStartNewTournament()
      },
      timestamp: Date.now()
    };
    
    // Broadcast to all connections
    for (const [ws] of this.connectionPool['connections']) {
      this.send(ws, message);
    }
    
    // In HIGH/CRITICAL, disconnect spectators
    if (level === LoadLevel.HIGH || level === LoadLevel.CRITICAL) {
      this.disconnectSpectators();
    }
  }
  
  /**
   * Disconnect spectator connections to free resources
   */
  private disconnectSpectators(): void {
    let disconnected = 0;
    
    for (const [ws, connection] of this.connectionPool['connections']) {
      // If not authenticated (spectator), disconnect
      if (!connection.isAuthenticated) {
        ws.close(1013, 'Server at capacity - spectators disconnected');
        this.connectionPool.removeConnection(ws, 'load_shedding');
        disconnected++;
      }
    }
    
    if (disconnected > 0) {
      logger.info('Disconnected spectators due to high load', { count: disconnected });
    }
  }
  
  /**
   * Load active tournaments from database with circuit breaker
   */
  private async loadActiveTournaments(): Promise<void> {
    try {
      const tournaments = await supabaseCircuitBreaker.read(async () => {
        const { data, error } = await this.supabase
          .from('online_poker_tournaments')
          .select(`
            *,
            participants:online_poker_tournament_participants(*),
            levels:online_poker_tournament_levels(*)
          `)
          .in('status', ['registration', 'running', 'paused']);
        
        if (error) throw error;
        return data;
      });
      
      if (tournaments && tournaments.length > 0) {
        for (const dbTournament of tournaments) {
          const blindLevels = (dbTournament.levels as DBBlindLevel[] || [])
            .sort((a, b) => a.level - b.level)
            .map(l => ({
              level: l.level,
              smallBlind: l.small_blind,
              bigBlind: l.big_blind,
              ante: l.ante || 0,
              duration: l.duration || 300,
              isBreak: l.is_break || false
            }));
          
          const state = this.tournamentManager.createFromDatabaseWithLevels(
            dbTournament, 
            blindLevels.length > 0 ? blindLevels : undefined
          );
          
          if (dbTournament.participants) {
            for (const p of dbTournament.participants as any[]) {
              if (p.status !== 'cancelled') {
                this.tournamentManager.registerPlayer(
                  dbTournament.id,
                  p.player_id,
                  p.player_id
                );
              }
            }
          }
          
          logger.info('Loaded tournament from DB', { 
            id: dbTournament.id, 
            name: dbTournament.name,
            status: dbTournament.status
          });
        }
      }
      
      logger.info(`Loaded ${tournaments?.length || 0} active tournaments`);
    } catch (err) {
      logger.error('Error loading tournaments', { error: String(err) });
    }
  }
  
  /**
   * Handle tournament subscribe
   */
  private async handleTournamentSubscribe(ws: WebSocket, message: unknown): Promise<void> {
    const result = TournamentSubscribeSchema.safeParse(message);
    if (!result.success) {
      this.sendError(ws, 'Invalid tournament subscribe request');
      return;
    }
    
    const { tournamentId } = result.data;
    
    this.connectionPool.subscribeToTournament(ws, tournamentId);
    
    // Get tournament state with circuit breaker
    try {
      const tournament = await supabaseCircuitBreaker.read(async () => {
        const { data, error } = await this.supabase
          .from('online_poker_tournaments')
          .select(`
            *,
            participants:online_poker_tournament_participants(*),
            levels:online_poker_tournament_levels(*)
          `)
          .eq('id', tournamentId)
          .single();
        
        if (error) throw error;
        return data;
      });
      
      this.send(ws, { 
        type: 'tournament_subscribed', 
        tournamentId,
        tournament,
        timestamp: Date.now()
      });
    } catch (err) {
      this.send(ws, { 
        type: 'tournament_subscribed', 
        tournamentId,
        tournament: null,
        error: 'Failed to load tournament data',
        timestamp: Date.now()
      });
    }
    
    logger.info('Client subscribed to tournament', { tournamentId });
  }
  
  /**
   * Handle tournament actions with circuit breaker
   */
  private async handleTournamentAction(ws: WebSocket, message: unknown): Promise<void> {
    const result = TournamentActionSchema.safeParse(message);
    if (!result.success) {
      this.sendError(ws, 'Invalid tournament action');
      return;
    }
    
    const { type, tournamentId, playerId } = result.data;
    
    // Check if new tournaments can be started
    if (type === 'tournament_start' && !loadManager.canStartNewTournament()) {
      this.sendError(ws, 'New tournaments disabled due to high server load');
      return;
    }
    
    let actionResult: { success: boolean; error?: string } = { success: false };
    
    try {
      switch (type) {
        case 'tournament_start':
          const startResult = await supabaseCircuitBreaker.rpc(async () => {
            const { data, error } = await this.supabase.rpc(
              'start_online_tournament_with_seating',
              { p_tournament_id: tournamentId }
            );
            if (error) throw error;
            return data;
          });
          
          if (startResult && (startResult as any).success) {
            this.tournamentManager.startTournament(tournamentId);
            metrics.recordTournamentStarted();
            actionResult = { success: true };
          } else {
            actionResult = { success: false, error: (startResult as any)?.error || 'Unknown error' };
          }
          break;
        
        case 'tournament_pause':
          actionResult = this.tournamentManager.pauseTournament(tournamentId);
          if (actionResult.success) {
            await supabaseCircuitBreaker.write(async () => {
              await this.supabase
                .from('online_poker_tournaments')
                .update({ status: 'paused', updated_at: new Date().toISOString() })
                .eq('id', tournamentId);
            });
          }
          break;
        
        case 'tournament_resume':
          actionResult = this.tournamentManager.resumeTournament(tournamentId);
          if (actionResult.success) {
            await supabaseCircuitBreaker.write(async () => {
              await this.supabase
                .from('online_poker_tournaments')
                .update({ status: 'running', updated_at: new Date().toISOString() })
                .eq('id', tournamentId);
            });
          }
          break;
        
        case 'tournament_rebuy':
          if (playerId) {
            // Use database RPC for rebuy to properly handle wallet and sync
            try {
              const result = await supabaseCircuitBreaker.rpc(async () => {
                const { data, error } = await this.supabase.rpc('process_online_tournament_rebuy', {
                  p_tournament_id: tournamentId,
                  p_player_id: playerId
                });
                if (error) throw error;
                return data;
              });
              
              if (result?.success) {
                // Sync to TournamentManager in-memory state
                this.tournamentManager.syncRebuyFromDb(tournamentId, playerId, result.new_chips);
                actionResult = { success: true };
                
                // Also sync to poker_table_players for the active table
                await this.syncPlayerChipsToTable(tournamentId, playerId, result.new_chips);
              } else {
                actionResult = { success: false, error: result?.error || 'Rebuy failed' };
              }
            } catch (err) {
              actionResult = { success: false, error: String(err) };
            }
          } else {
            actionResult = { success: false, error: 'Player ID required' };
          }
          break;
        
        case 'tournament_addon':
          if (playerId) {
            // Use database RPC for addon to properly handle wallet and sync
            try {
              const result = await supabaseCircuitBreaker.rpc(async () => {
                const { data, error } = await this.supabase.rpc('process_online_tournament_addon', {
                  p_tournament_id: tournamentId,
                  p_player_id: playerId
                });
                if (error) throw error;
                return data;
              });
              
              if (result?.success) {
                // Sync to TournamentManager in-memory state
                this.tournamentManager.syncAddonFromDb(tournamentId, playerId, result.new_chips);
                actionResult = { success: true };
                
                // Also sync to poker_table_players for the active table
                await this.syncPlayerChipsToTable(tournamentId, playerId, result.new_chips);
              } else {
                actionResult = { success: false, error: result?.error || 'Addon failed' };
              }
            } catch (err) {
              actionResult = { success: false, error: String(err) };
            }
          } else {
            actionResult = { success: false, error: 'Player ID required' };
          }
          break;
      }
    } catch (err) {
      logger.error('Tournament action exception', { error: String(err) });
      actionResult = { success: false, error: 'Internal error' };
    }
    
    if (actionResult.success) {
      this.send(ws, { 
        type: `${type}_success`, 
        tournamentId,
        timestamp: Date.now()
      });
      
      this.broadcastTournamentUpdate(tournamentId);
    } else {
      this.sendError(ws, actionResult.error || 'Tournament action failed');
    }
  }
  
  /**
   * Handle get tournament state
   */
  private async handleGetTournamentState(ws: WebSocket, message: { tournamentId: string }): Promise<void> {
    const { tournamentId } = message;
    
    const state = this.tournamentManager.getTournament(tournamentId);
    const clock = this.tournamentManager.getClock(tournamentId);
    const stats = this.tournamentManager.getStats(tournamentId);
    
    try {
      const dbTournament = await supabaseCircuitBreaker.read(async () => {
        const { data, error } = await this.supabase
          .from('online_poker_tournaments')
          .select(`
            *,
            participants:online_poker_tournament_participants(*),
            levels:online_poker_tournament_levels(*)
          `)
          .eq('id', tournamentId)
          .single();
        
        if (error) throw error;
        return data;
      });
      
      this.send(ws, {
        type: 'tournament_state',
        tournamentId,
        state,
        clock,
        stats,
        dbData: dbTournament,
        timestamp: Date.now()
      });
    } catch (err) {
      this.send(ws, {
        type: 'tournament_state',
        tournamentId,
        state,
        clock,
        stats,
        dbData: null,
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Broadcast tournament update to subscribers
   */
  private broadcastTournamentUpdate(tournamentId: string): void {
    const subscribers = this.connectionPool.getTournamentSubscribers(tournamentId);
    if (subscribers.size === 0) return;
    
    const state = this.tournamentManager.getTournament(tournamentId);
    const clock = this.tournamentManager.getClock(tournamentId);
    const stats = this.tournamentManager.getStats(tournamentId);
    
    const message = {
      type: 'tournament_update',
      tournamentId,
      state,
      clock,
      stats,
      timestamp: Date.now()
    };
    
    // Use MessageQueue for tournament broadcasts
    messageQueue.enqueueBroadcast(subscribers, message, 'normal');
  }
  
  /**
   * Broadcast tournament timers (called every second)
   */
  private broadcastTournamentTimers(): void {
    for (const tournamentId of this.tournamentManager.getActiveTournamentIds() || []) {
      const subscribers = this.connectionPool.getTournamentSubscribers(tournamentId);
      if (subscribers.size === 0) continue;
      
      const clock = this.tournamentManager.getClock(tournamentId);
      if (!clock) continue;
      
      const message = {
        type: 'tournament_timer',
        tournamentId,
        clock,
        timestamp: Date.now()
      };
      
      // Use low priority for timer broadcasts
      messageQueue.enqueueBroadcast(subscribers, message, 'low');
    }
  }
  
  /**
   * Handle player elimination in tournament
   */
  async handleTournamentElimination(tournamentId: string, playerId: string, eliminatedBy?: string): Promise<void> {
    try {
      const dbResult = await supabaseCircuitBreaker.rpc(async () => {
        const { data, error } = await this.supabase.rpc(
          'eliminate_online_tournament_player',
          { 
            p_tournament_id: tournamentId, 
            p_player_id: playerId,
            p_eliminated_by: eliminatedBy || null
          }
        );
        if (error) throw error;
        return data;
      });
      
      const result = dbResult as any;
      
      if (!result?.success) {
        logger.warn('Tournament elimination unsuccessful', { result });
        return;
      }
      
      this.tournamentManager.eliminatePlayer(tournamentId, playerId, eliminatedBy);
      metrics.recordElimination();
      
      // CRITICAL: Remove player from in-memory PokerTable
      // Database already updated by RPC, need to sync in-memory state
      if (result.table_id) {
        const table = this.gameManager.getTable(result.table_id);
        if (table) {
          table.removeEliminatedPlayer(playerId);
          logger.info('Removed eliminated player from in-memory table', { 
            playerId: playerId.substring(0, 8), 
            tableId: result.table_id 
          });
        }
      }
      
      // Process PKO bounty if applicable
      if (eliminatedBy) {
        try {
          const bountyResult = await pkoBountyService.processKnockout(tournamentId, playerId, eliminatedBy);
          if (bountyResult) {
            // Broadcast bounty event
            const bountyMessage = {
              type: 'pko_knockout',
              tournamentId,
              eliminatedPlayerId: playerId,
              eliminatorPlayerId: eliminatedBy,
              bountyAmount: bountyResult.bountyAmount,
              collectedAmount: bountyResult.collectedAmount,
              timestamp: Date.now()
            };
            messageQueue.enqueueBroadcast(subscribers, bountyMessage, 'high');
            logger.info('PKO knockout processed', bountyResult);
          }
        } catch (bountyErr) {
          logger.warn('PKO bounty processing failed', { error: String(bountyErr) });
        }
      }
      
      // Broadcast elimination event with full data for frontend animation
      const subscribers = this.connectionPool.getTournamentSubscribers(tournamentId);
      const tableSubscribers = result.table_id ? this.connectionPool.getTableSubscribers(result.table_id) : new Set<WebSocket>();
      
      // Get player name and avatar for animation
      let playerName = 'Player';
      let playerAvatar: string | null = null;
      let tournamentName = 'Tournament';
      let eliminatorName: string | undefined;
      let eliminatorAvatar: string | null = null;
      
      try {
        // Fetch player info
        const { data: playerData } = await this.supabase
          .from('players')
          .select('name, avatar_url')
          .eq('id', playerId)
          .single();
        if (playerData) {
          playerName = playerData.name || 'Player';
          playerAvatar = playerData.avatar_url;
        }
        
        // Fetch tournament name
        const { data: tournamentData } = await this.supabase
          .from('online_poker_tournaments')
          .select('name')
          .eq('id', tournamentId)
          .single();
        if (tournamentData) {
          tournamentName = tournamentData.name || 'Tournament';
        }
        
        // Fetch eliminator info if applicable
        if (eliminatedBy) {
          const { data: eliminatorData } = await this.supabase
            .from('players')
            .select('name, avatar_url')
            .eq('id', eliminatedBy)
            .single();
          if (eliminatorData) {
            eliminatorName = eliminatorData.name || 'Player';
            eliminatorAvatar = eliminatorData.avatar_url;
          }
        }
      } catch (infoErr) {
        logger.warn('Failed to fetch player/tournament info for elimination', { error: String(infoErr) });
      }
      
      // Combine all subscribers (tournament + table)
      const allSubscribers = new Set([...subscribers, ...tableSubscribers]);
      
      if (allSubscribers.size > 0) {
        // Professional elimination message with full data for animation
        const message = {
          type: 'player_eliminated',
          playerId,
          playerName,
          playerAvatar,
          tournamentId,
          tournamentName,
          finishPosition: result.position,
          totalPlayers: result.total_players || result.remaining_players + 1,
          prizeAmount: result.prize_amount || 0,
          prizeType: 'diamonds' as const,
          remainingPlayers: result.remaining_players,
          tournamentCompleted: result.tournament_completed,
          eliminatedBy: eliminatedBy ? {
            id: eliminatedBy,
            name: eliminatorName || 'Player',
            avatar: eliminatorAvatar
          } : undefined,
          timestamp: Date.now()
        };
        
        messageQueue.enqueueBroadcast(allSubscribers, message, 'high');
      }
      
      this.broadcastTournamentUpdate(tournamentId);
      
      if (result.tournament_completed) {
        metrics.recordTournamentCompleted();
      }
      
      logger.info('Player eliminated from tournament', { 
        tournamentId, 
        playerId, 
        position: result.position
      });
      
    } catch (err) {
      logger.error('Tournament elimination exception', { error: String(err) });
    }
  }
  
  /**
   * Sync player chips to their active table after rebuy/addon
   */
  private async syncPlayerChipsToTable(tournamentId: string, playerId: string, newChips: number): Promise<void> {
    try {
      // Find the player's current table in this tournament
      const { data: participant, error } = await this.supabase
        .from('online_poker_tournament_participants')
        .select('table_id')
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId)
        .single();
      
      if (error || !participant?.table_id) return;
      
      // Update the player's stack at the table
      await this.supabase
        .from('poker_table_players')
        .update({ stack: newChips })
        .eq('table_id', participant.table_id)
        .eq('player_id', playerId);
      
      // Also update the in-memory PokerTable if it exists
      const table = this.gameManager.getTable(participant.table_id);
      if (table) {
        table.updatePlayerStack(playerId, newChips);
      }
      
      logger.info('Synced player chips to table', { tournamentId, playerId, tableId: participant.table_id, newChips });
    } catch (err) {
      logger.error('Failed to sync player chips to table', { error: String(err) });
    }
  }
  
  /**
   * Get handler statistics
   */
  getStats(): {
    connections: number;
    tables: number;
    tournaments: number;
    loadLevel: LoadLevel;
    circuitBreakers: Record<string, any>;
    messageQueue: { size: number; byPriority: Record<string, number> };
  } {
    const poolStats = this.connectionPool.getStats();
    
    return {
      connections: poolStats.totalConnections,
      tables: poolStats.totalTables,
      tournaments: poolStats.totalTournaments,
      loadLevel: loadManager.getLevel(),
      circuitBreakers: supabaseCircuitBreaker.getStatus(),
      messageQueue: messageQueue.getStats()
    };
  }
  
  /**
   * Handle get HFH status request
   */
  private async handleGetHFHStatus(ws: WebSocket, message: unknown): Promise<void> {
    const parsed = z.object({
      type: z.literal('get_hfh_status'),
      tournamentId: z.string().uuid()
    }).safeParse(message);
    
    if (!parsed.success) {
      this.sendError(ws, 'Invalid HFH status request');
      return;
    }
    
    const status = this.handForHandIntegration.getStatus(parsed.data.tournamentId);
    
    this.send(ws, {
      type: 'hfh_status',
      tournamentId: parsed.data.tournamentId,
      active: status?.active ?? false,
      ...(status && {
        waitingTables: status.waitingTables,
        totalTables: status.totalTables,
        tablesPlaying: status.tablesPlaying,
        tablesWaiting: status.tablesWaiting
      }),
      timestamp: Date.now()
    });
  }
  
  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    clearInterval(this.pingInterval);
    if (this.tournamentTimerInterval) {
      clearInterval(this.tournamentTimerInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    // Shutdown utilities
    this.connectionPool.shutdown();
    messageQueue.shutdown();
    loadManager.shutdown();
    this.handForHandIntegration.shutdown();
    
    logger.info('PokerWebSocketHandler shutdown complete');
  }

  /**
   * Broadcast break events to all tables in a tournament
   * Called by TournamentLevelService when break starts/ends
   */
  broadcastBreakEvent(
    tournamentId: string, 
    event: {
      type: 'break_starting' | 'break_started' | 'break_ended';
      durationSeconds: number;
      level: number;
      tournamentName: string;
    }
  ): void {
    const message = {
      type: 'tournament_break',
      event: event.type,
      tournamentId,
      tournamentName: event.tournamentName,
      durationSeconds: event.durationSeconds,
      durationMinutes: Math.floor(event.durationSeconds / 60),
      level: event.level,
      timestamp: Date.now()
    };

    // Broadcast to all tournament subscribers
    const tournamentSent = this.connectionPool.broadcastToTournament(tournamentId, message);
    
    // Also get all tables for this tournament and broadcast to them
    // This ensures players at tables get the message even if not subscribed to tournament channel
    (async () => {
      try {
        const { data: tables } = await this.supabase
          .from('poker_tables')
          .select('id')
          .eq('tournament_id', tournamentId);
        
        if (tables) {
          for (const table of tables) {
            this.broadcastToTable(table.id, message);
          }
          
          logger.info('Break event broadcast complete', {
            tournamentId,
            eventType: event.type,
            tablesCount: tables.length,
            tournamentSubscribers: tournamentSent
          });
        }
      } catch (err) {
        logger.error('Error broadcasting break event to tables', { 
          tournamentId, 
          error: String(err) 
        });
      }
    })();
  }
}
