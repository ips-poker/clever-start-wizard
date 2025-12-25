/**
 * WebSocket Handler for Poker Games
 * With Tournament Support
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { SupabaseClient } from '@supabase/supabase-js';
import { PokerGameManager } from '../game/PokerGameManager.js';
import { PokerTable, TableEvent } from '../game/PokerTable.js';
import { TournamentManager, TournamentState, TournamentClock } from '../game/TournamentManager.js';
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

interface ClientConnection {
  ws: WebSocket;
  playerId: string | null;
  subscribedTables: Set<string>;
  subscribedTournaments: Set<string>;
  lastPing: number;
}

export class PokerWebSocketHandler {
  private clients: Map<WebSocket, ClientConnection> = new Map();
  private tableSubscribers: Map<string, Set<WebSocket>> = new Map();
  private tournamentSubscribers: Map<string, Set<WebSocket>> = new Map();
  private tablesWithListeners: Set<string> = new Set();
  private gameManager: PokerGameManager;
  private tournamentManager: TournamentManager;
  private supabase: SupabaseClient;
  private pingInterval: NodeJS.Timeout;
  private tournamentTimerInterval: NodeJS.Timeout | null = null;
  
  constructor(
    wss: WebSocketServer, 
    gameManager: PokerGameManager, 
    supabase: SupabaseClient,
    tournamentManager?: TournamentManager
  ) {
    this.gameManager = gameManager;
    this.supabase = supabase;
    this.tournamentManager = tournamentManager || new TournamentManager();
    
    // Start ping interval
    this.pingInterval = setInterval(() => this.pingClients(), 30000);
    
    // Start tournament timer broadcast (every second)
    this.tournamentTimerInterval = setInterval(() => this.broadcastTournamentTimers(), 1000);
    
    // Setup table event listeners for existing tables
    for (const table of gameManager.getAllTables()) {
      this.setupTableListeners(table);
    }
    
    // Load active tournaments from database
    this.loadActiveTournaments();
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
      serverVersion: '3.0.0',
      engine: 'Professional Poker Engine v3.0'
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
    
    // Verify player exists and get name + avatar from DB
    logger.info('Checking player in DB...');
    let dbName: string = playerName; // Default to client-provided name
    let avatarUrl: string | undefined;
    try {
      const { data: player, error: playerError } = await this.supabase
        .from('players')
        .select('id, name, avatar_url')
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
      
      // Use name and avatar from database (personal cabinet)
      dbName = player.name || playerName;
      avatarUrl = player.avatar_url || undefined;
      logger.info('Player OK - using DB data', { playerId, dbName, avatarUrl });
    } catch (err) {
      logger.error('Player verification error', { error: String(err) });
    }
    
    logger.info('Calling table.joinTable with DB name...');
    const joinResult = await table.joinTable(playerId, dbName, seatNumber, buyIn, avatarUrl);
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
    
    // Send updated state
    const state = table.getPlayerState(playerId);
    this.send(ws, { type: 'sit_out_success', tableId, state });
  }
  
  /**
   * Handle sit in request (return to game)
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
    
    // Send updated state
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
   * Load active tournaments from database
   */
  private async loadActiveTournaments(): Promise<void> {
    try {
      const { data: tournaments, error } = await this.supabase
        .from('online_poker_tournaments')
        .select('*')
        .in('status', ['registration', 'running', 'paused']);
      
      if (error) {
        logger.error('Failed to load tournaments', { error: error.message });
        return;
      }
      
      logger.info(`Loaded ${tournaments?.length || 0} active tournaments from database`);
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
    
    // Add to subscribers
    if (!this.tournamentSubscribers.has(tournamentId)) {
      this.tournamentSubscribers.set(tournamentId, new Set());
    }
    this.tournamentSubscribers.get(tournamentId)!.add(ws);
    
    const connection = this.clients.get(ws);
    if (connection) {
      connection.subscribedTournaments.add(tournamentId);
    }
    
    // Get tournament state from database
    const { data: tournament } = await this.supabase
      .from('online_poker_tournaments')
      .select(`
        *,
        participants:online_poker_tournament_participants(*),
        levels:online_poker_tournament_levels(*)
      `)
      .eq('id', tournamentId)
      .single();
    
    this.send(ws, { 
      type: 'tournament_subscribed', 
      tournamentId,
      tournament,
      timestamp: Date.now()
    });
    
    logger.info('Client subscribed to tournament', { tournamentId });
  }
  
  /**
   * Handle tournament actions
   */
  private async handleTournamentAction(ws: WebSocket, message: unknown): Promise<void> {
    const result = TournamentActionSchema.safeParse(message);
    if (!result.success) {
      this.sendError(ws, 'Invalid tournament action');
      return;
    }
    
    const { type, tournamentId, playerId } = result.data;
    
    let actionResult: { success: boolean; error?: string } = { success: false };
    
    switch (type) {
      case 'tournament_start':
        actionResult = this.tournamentManager.startTournament(tournamentId);
        if (actionResult.success) {
          // Update database
          await this.supabase
            .from('online_poker_tournaments')
            .update({ 
              status: 'running', 
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', tournamentId);
        }
        break;
      
      case 'tournament_pause':
        actionResult = this.tournamentManager.pauseTournament(tournamentId);
        if (actionResult.success) {
          await this.supabase
            .from('online_poker_tournaments')
            .update({ status: 'paused', updated_at: new Date().toISOString() })
            .eq('id', tournamentId);
        }
        break;
      
      case 'tournament_resume':
        actionResult = this.tournamentManager.resumeTournament(tournamentId);
        if (actionResult.success) {
          await this.supabase
            .from('online_poker_tournaments')
            .update({ status: 'running', updated_at: new Date().toISOString() })
            .eq('id', tournamentId);
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
    
    if (actionResult.success) {
      this.send(ws, { 
        type: `${type}_success`, 
        tournamentId,
        timestamp: Date.now()
      });
      
      // Broadcast tournament update to all subscribers
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
    
    // Also get from database for full data
    const { data: dbTournament } = await this.supabase
      .from('online_poker_tournaments')
      .select(`
        *,
        participants:online_poker_tournament_participants(*),
        levels:online_poker_tournament_levels(*)
      `)
      .eq('id', tournamentId)
      .single();
    
    this.send(ws, {
      type: 'tournament_state',
      tournamentId,
      state,
      clock,
      stats,
      dbData: dbTournament,
      timestamp: Date.now()
    });
  }
  
  /**
   * Broadcast tournament update to subscribers
   */
  private broadcastTournamentUpdate(tournamentId: string): void {
    const subscribers = this.tournamentSubscribers.get(tournamentId);
    if (!subscribers || subscribers.size === 0) return;
    
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
    
    for (const ws of subscribers) {
      this.send(ws, message);
    }
  }
  
  /**
   * Broadcast tournament timers (called every second)
   */
  private broadcastTournamentTimers(): void {
    for (const [tournamentId, subscribers] of this.tournamentSubscribers) {
      if (subscribers.size === 0) continue;
      
      const clock = this.tournamentManager.getClock(tournamentId);
      if (!clock) continue;
      
      const message = {
        type: 'tournament_timer',
        tournamentId,
        clock,
        timestamp: Date.now()
      };
      
      for (const ws of subscribers) {
        this.send(ws, message);
      }
    }
  }
  
  /**
   * Handle player elimination in tournament
   */
  async handleTournamentElimination(tournamentId: string, playerId: string, eliminatedBy?: string): Promise<void> {
    const result = this.tournamentManager.eliminatePlayer(tournamentId, playerId, eliminatedBy);
    
    if (result.success) {
      // Update database
      await this.supabase
        .from('online_poker_tournament_participants')
        .update({
          status: 'eliminated',
          finish_position: result.position,
          eliminated_at: new Date().toISOString(),
          eliminated_by: eliminatedBy,
          prize_amount: result.prize || 0,
          chips: 0
        })
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId);
      
      // Call database function to record result and RPS
      await this.supabase.rpc('record_online_tournament_result', {
        p_tournament_id: tournamentId,
        p_player_id: playerId,
        p_position: result.position
      });
      
      // Broadcast elimination event
      const subscribers = this.tournamentSubscribers.get(tournamentId);
      if (subscribers) {
        const message = {
          type: 'tournament_elimination',
          tournamentId,
          playerId,
          position: result.position,
          prize: result.prize,
          timestamp: Date.now()
        };
        
        for (const ws of subscribers) {
          this.send(ws, message);
        }
      }
      
      // Broadcast updated tournament state
      this.broadcastTournamentUpdate(tournamentId);
      
      logger.info('Player eliminated from tournament', { 
        tournamentId, 
        playerId, 
        position: result.position,
        prize: result.prize
      });
    }
  }
  
  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    clearInterval(this.pingInterval);
    if (this.tournamentTimerInterval) {
      clearInterval(this.tournamentTimerInterval);
    }
    
    for (const ws of this.clients.keys()) {
      ws.close(1001, 'Server shutting down');
    }
    
    this.clients.clear();
    this.tableSubscribers.clear();
    this.tournamentSubscribers.clear();
  }
}
