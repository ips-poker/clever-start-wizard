/**
 * Syndikatet Poker Server v3.0
 * Professional Poker Engine with tournament-grade security
 * 
 * Supported games: Texas Hold'em, Omaha, Short Deck, Pineapple, Chinese Poker
 * Features: CSPRNG with audit logs, side pots, Run It Twice, Tournament Manager
 */

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { WebSocketServer } from 'ws';
import { config } from './config.js';
import { PokerWebSocketHandler } from './websocket/PokerWebSocketHandler.js';
import { PokerGameManager } from './game/PokerGameManager.js';
import { PokerEngine } from './game/PokerEngine.js';
import { TournamentManager } from './game/TournamentManager.js';
import { createSupabaseClient } from './db/supabase.js';
import { setupRoutes } from './routes/index.js';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { logger } from './utils/logger.js';

// Process-level error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception - keeping server alive', { 
    error: String(error), 
    stack: error.stack 
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection - keeping server alive', { 
    reason: String(reason)
  });
});

// Initialize Express app
const app = express();
const server = createServer(app);

// Increase server connection limits for high load
server.maxConnections = 1000;
server.keepAliveTimeout = 120000; // 2 minutes
server.headersTimeout = 125000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: config.corsOrigins,
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  points: 100, // requests
  duration: 60, // per minute
});

app.use(async (req, res, next) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    await rateLimiter.consume(ip);
    next();
  } catch {
    res.status(429).json({ error: 'Too many requests' });
  }
});

// Health check endpoint with detailed metrics
app.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  const stats = gameManager.getStats();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      rssMB: Math.round(memUsage.rss / 1024 / 1024)
    },
    version: '3.1.0',
    engine: 'Professional Poker Engine v3.1 (Tournament-Grade)',
    features: ['texas_holdem', 'omaha', 'short_deck', 'pineapple', 'chinese_poker', 'csprng', 'side_pots', 'run_it_twice', 'tournaments'],
    capacity: {
      maxTables: 300,
      maxPlayersPerTable: 9,
      maxConcurrentTournaments: 50
    },
    stats: {
      activeTables: stats.activeTables,
      totalPlayers: stats.totalPlayers,
      activeHands: stats.activeHands
    }
  });
});

// Initialize Supabase client
const supabase = createSupabaseClient();

// Initialize game manager
const gameManager = new PokerGameManager(supabase);

// Initialize tournament manager
const tournamentManager = new TournamentManager();

// Setup API routes
setupRoutes(app, gameManager, supabase);

// WebSocket server
const wss = new WebSocketServer({ 
  server,
  path: '/ws/poker',
  maxPayload: 1024 * 1024 // 1MB max message size
});

// Initialize WebSocket handler with tournament manager
const wsHandler = new PokerWebSocketHandler(wss, gameManager, supabase, tournamentManager);

// WebSocket connection rate limiting (increased for tournaments)
const wsRateLimiter = new RateLimiterMemory({
  points: 300, // connections per minute per IP (increased for tournaments)
  duration: 60,
});

wss.on('connection', async (ws, req) => {
  const ip = req.socket.remoteAddress || 'unknown';
  
  try {
    await wsRateLimiter.consume(ip);
    wsHandler.handleConnection(ws, req);
  } catch (rateLimitError) {
    logger.warn(`WebSocket rate limit exceeded for IP: ${ip}`);
    ws.close(1008, 'Rate limit exceeded');
  }
});

// Log connection count periodically
setInterval(() => {
  logger.info('WebSocket connection stats', {
    activeConnections: wss.clients.size,
    memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
  });
}, 30000);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...');
  
  // Close WebSocket connections
  wss.clients.forEach(client => {
    client.close(1001, 'Server shutting down');
  });
  
  // Shutdown tournament manager
  tournamentManager.shutdown();
  
  // Save game states
  await gameManager.saveAllGames();
  
  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Force exit after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Validate poker engine on startup
const engine = new PokerEngine();
const validation = engine.validateHandRanking();
if (!validation.passed) {
  logger.error('CRITICAL: Poker engine validation failed!');
  validation.errors.forEach(e => logger.error(e));
  process.exit(1);
} else {
  logger.info('✅ Poker engine validation passed - all hand rankings correct');
}

// Start server
server.listen(config.port, () => {
  logger.info(`Poker server running on port ${config.port}`);
  logger.info(`WebSocket endpoint: ws://localhost:${config.port}/ws/poker`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Tournament manager initialized`);
});

export { app, server, wss, tournamentManager };
