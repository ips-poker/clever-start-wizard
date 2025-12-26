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
    this.tournamentManager = tournamentManager || new TournamentManager();
    
    // Initialize ConnectionPool
    this.connectionPool = new ConnectionPool();
    
    // Start ping interval
    this.pingInterval = setInterval(() => this.pingClients(), 30000);
    
    // Start tournament timer broadcast (every second)
    this.tournamentTimerInterval = setInterval(() => this.broadcastTournamentTimers(), 1000);
    
    // Start metrics collection (every 10 seconds)
    this.metricsInterval = setInterval(() => this.collectMetrics(), 10000);
    
    // Setup table event listeners for existing tables
    for (const table of gameManager.getAllTables()) {
      this.setupTableListeners(table);
    }
    
    // Listen for load level changes
    loadManager.onLoadChange((level) => {
      this.handleLoadLevelChange(level);
    });
    
    // Load active tournaments from database
    this.loadActiveTournaments();
    
    logger.info('PokerWebSocketHandler v3.1 initialized with full utility integration');
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
      const table = this.gameManager.getTable(tableId);
      if (table) {
        this.connectionPool.subscribeToTable(ws, tableId);
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
        
        // Chat message (controlled by load level)
        case 'chat':
          if (loadManager.isChatEnabled()) {
            await this.handleChat(ws, message);
          } else {
            this.send(ws, { type: 'chat_disabled', reason: 'High server load' });
          }
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
    
    const table = this.gameManager.getTable(tableId);
    if (!table) {
      logger.warn('Table not found for join', { tableId });
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
    
    const table = this.gameManager.getTable(tableId);
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
    
    const table = this.gameManager.getTable(tableId);
    if (table) {
      await table.leaveTable(playerId);
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
    
    const table = this.gameManager.getTable(tableId);
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
    
    const table = this.gameManager.getTable(tableId);
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
    
    const table = this.gameManager.getTable(tableId);
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
    
    const table = this.gameManager.getTable(tableId);
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
   * Handle connection close
   */
  private handleClose(ws: WebSocket): void {
    this.connectionPool.removeConnection(ws, 'closed');
    logger.info('Client disconnected');
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
      this.broadcastTableEvent(event);
    });
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
    const tournamentCount = this.tournamentManager.getActiveTournamentCount?.() || 0;
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
            actionResult = this.tournamentManager.processRebuy(tournamentId, playerId);
          } else {
            actionResult = { success: false, error: 'Player ID required' };
          }
          break;
        
        case 'tournament_addon':
          if (playerId) {
            actionResult = this.tournamentManager.processAddon(tournamentId, playerId);
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
    for (const tournamentId of this.tournamentManager.getActiveTournamentIds?.() || []) {
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
      
      // Broadcast elimination event
      const subscribers = this.connectionPool.getTournamentSubscribers(tournamentId);
      if (subscribers.size > 0) {
        const message = {
          type: 'tournament_elimination',
          tournamentId,
          playerId,
          position: result.position,
          prize: result.prize_amount || 0,
          remainingPlayers: result.remaining_players,
          tournamentCompleted: result.tournament_completed,
          timestamp: Date.now()
        };
        
        messageQueue.enqueueBroadcast(subscribers, message, 'high');
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
    
    logger.info('PokerWebSocketHandler shutdown complete');
  }
}
