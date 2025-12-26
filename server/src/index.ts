/**
 * Syndikatet Poker Server v3.1
 * Professional Poker Engine with tournament-grade security
 * Full integration: ConnectionPool, MessageQueue, Metrics, CircuitBreaker, LoadManager
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
import { metrics, memoryLeakDetector } from './utils/metrics.js';
import { messageQueue } from './utils/message-queue.js';
import { supabaseCircuitBreaker } from './utils/circuit-breaker.js';
import { loadManager } from './utils/load-manager.js';

// Process-level error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception - keeping server alive', { error: String(error), stack: error.stack });
  metrics.recordError();
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection - keeping server alive', { reason: String(reason) });
  metrics.recordError();
});

const app = express();
const server = createServer(app);

server.maxConnections = 5000;
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const rateLimiter = new RateLimiterMemory({ points: 100, duration: 60 });

app.use(async (req, res, next) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    await rateLimiter.consume(ip);
    next();
  } catch {
    res.status(429).json({ error: 'Too many requests' });
  }
});

// Health check with full metrics
app.get('/health', (req, res) => {
  const fullMetrics = metrics.getMetrics();
  const stats = gameManager.getStats();
  const loadStatus = loadManager.getStatus();
  const cbStatus = supabaseCircuitBreaker.getStatus();
  const queueStats = messageQueue.getStats();
  
  res.json({
    status: fullMetrics.health,
    timestamp: new Date().toISOString(),
    version: '3.1.0',
    engine: 'Professional Poker Engine v3.1',
    uptime: fullMetrics.system.uptime,
    memory: { heapUsedMB: fullMetrics.system.heapUsedMB, heapTotalMB: fullMetrics.system.heapTotalMB },
    load: loadStatus,
    circuitBreakers: cbStatus,
    messageQueue: queueStats,
    game: { activeTables: stats.activeTables, totalPlayers: stats.totalPlayers, activeHands: stats.activeHands },
    capacity: { maxTables: 300, maxPlayers: 2700, maxConnections: 5000 }
  });
});

// Prometheus-compatible metrics endpoint
app.get('/metrics', (req, res) => {
  const m = metrics.getMetrics();
  const lines = [
    `# HELP poker_hands_dealt_total Total hands dealt`,
    `poker_hands_dealt_total ${m.game.handsDealt}`,
    `# HELP poker_actions_processed_total Total actions processed`,
    `poker_actions_processed_total ${m.game.actionsProcessed}`,
    `# HELP poker_websocket_connections Active WebSocket connections`,
    `poker_websocket_connections ${m.websocket.connectionAttempts - m.websocket.connectionRejections}`,
    `# HELP poker_heap_used_mb Heap memory used in MB`,
    `poker_heap_used_mb ${m.system.heapUsedMB}`,
    `# HELP poker_event_loop_lag_ms Event loop lag in ms`,
    `poker_event_loop_lag_ms ${m.system.eventLoopLagMs}`,
  ];
  res.set('Content-Type', 'text/plain');
  res.send(lines.join('\n'));
});

const supabase = createSupabaseClient();
const gameManager = new PokerGameManager(supabase);
const tournamentManager = new TournamentManager();

setupRoutes(app, gameManager, supabase);

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
