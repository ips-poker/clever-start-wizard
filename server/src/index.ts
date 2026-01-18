/**
 * Syndikatet Poker Server v3.5
 * Professional Poker Engine with tournament-grade security
 * Full integration: ConnectionPool, MessageQueue, Metrics, CircuitBreaker, LoadManager
 * Prometheus metrics, Alerting system
 * Phase 4: Prize payouts, Spectator mode, Hand-for-hand
 * Phase 5: Action timeout guard, Hand history service, HUD stats
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
import { metrics as legacyMetrics, memoryLeakDetector } from './utils/metrics.js';
import { messageQueue } from './utils/message-queue.js';
import { supabaseCircuitBreaker } from './utils/circuit-breaker.js';
import { loadManager } from './utils/load-manager.js';
import { metrics, prometheusRegistry } from './utils/prometheus-metrics.js';
import { alertManager } from './utils/alerting.js';
import { tournamentStateCache } from './utils/tournament-state-cache.js';
import { messageBatcher } from './utils/message-batcher.js';
import { showdownProcessor } from './utils/parallel-showdown.js';
import { shutdownWorkerPools, getHandEvaluatorPool } from './utils/worker-pool.js';
import { redisManager } from './utils/redis-manager.js';
import { prizePayoutSystem } from './utils/prize-payout.js';
import { handForHandManager } from './utils/hand-for-hand.js';
import { spectatorManager } from './utils/spectator-manager.js';
import { actionTimeoutGuard } from './utils/action-timeout-guard.js';
import { handHistoryService } from './utils/hand-history-service.js';
import { realtimeEventBroadcaster } from './utils/realtime-events.js';
import { tournamentLevelService } from './utils/tournament-level-service.js';
import { tournamentAutoStartService } from './utils/tournament-auto-start-service.js';
import { pkoBountyService } from './utils/pko-bounty-service.js';
import { satelliteTournamentService } from './utils/satellite-tournament-service.js';
import { rpsPrizeSystem } from './utils/rps-prize-system.js';

// Process-level error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception - keeping server alive', { error: String(error), stack: error.stack });
  legacyMetrics.recordError();
  metrics.incWsErrors();
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection - keeping server alive', { reason: String(reason) });
  legacyMetrics.recordError();
  metrics.incWsErrors();
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

// Initialize Supabase client
const supabase = createSupabaseClient();

// Initialize game manager
const gameManager = new PokerGameManager(supabase);

// Initialize tournament manager with Supabase for DB sync
const tournamentManager = new TournamentManager();
tournamentManager.setSupabase(supabase);

// Initialize tournament level service for automatic blind advancement
tournamentLevelService.setSupabase(supabase);
tournamentLevelService.start();

// Initialize tournament auto-start service
tournamentAutoStartService.setSupabase(supabase);
tournamentAutoStartService.start();

// Initialize PKO bounty service
pkoBountyService.setSupabase(supabase);

// Initialize satellite tournament service
satelliteTournamentService.setSupabase(supabase);

// Initialize RPS prize system
rpsPrizeSystem.setSupabase(supabase);

// Setup API routes
setupRoutes(app, gameManager, supabase);

// Health check with full metrics
app.get('/health', (req, res) => {
  const fullMetrics = legacyMetrics.getMetrics();
  const stats = gameManager.getStats();
  const loadStatus = loadManager.getStatus();
  const cbStatus = supabaseCircuitBreaker.getStatus();
  const queueStats = messageQueue.getStats();
  const activeAlerts = alertManager.getActiveAlerts();
  
  // Update prometheus gauges
  metrics.setActiveTables(stats.activeTables);
  metrics.setActivePlayers(stats.totalPlayers);
  
  // Map LoadLevel enum to numeric value
  const loadLevelMap: Record<string, number> = { 'NORMAL': 0, 'ELEVATED': 1, 'HIGH': 2, 'CRITICAL': 3 };
  metrics.setLoadLevel(loadLevelMap[loadStatus.level] ?? 0);
  
  // Map CircuitState from read breaker to numeric value
  const readState = cbStatus.read?.state;
  const cbStateMap: Record<string, number> = { 'CLOSED': 0, 'OPEN': 1, 'HALF_OPEN': 2 };
  metrics.setCircuitBreakerState('supabase', cbStateMap[readState] ?? 0);
  metrics.setMessageQueueSize(queueStats.size);
  
  res.json({
    status: fullMetrics.health,
    timestamp: new Date().toISOString(),
    version: '3.5.0',
    engine: 'Professional Poker Engine v3.5',
    uptime: fullMetrics.system.uptime,
    memory: { 
      heapUsedMB: fullMetrics.system.heapUsedMB, 
      heapTotalMB: fullMetrics.system.heapTotalMB 
    },
    load: loadStatus,
    circuitBreakers: {
      supabase: cbStatus
    },
    messageQueue: queueStats,
    game: { 
      activeTables: stats.activeTables, 
      totalPlayers: stats.totalPlayers, 
      activeHands: stats.activeHands,
      activeTournaments: tournamentManager.getTournamentCount?.() || 0
    },
    cache: tournamentStateCache.getStats(),
    batcher: messageBatcher.getStats(),
    showdown: showdownProcessor.getStats(),
    workerPool: getHandEvaluatorPool().getStats(),
    redis: redisManager.getStats(),
    // Phase 4-5: Professional features stats
    handForHand: handForHandManager.getStats(),
    spectators: spectatorManager.getStats(),
    timeoutGuard: actionTimeoutGuard.getStats(),
    handHistory: handHistoryService.getStats(),
    alerts: {
      active: activeAlerts.length,
      critical: activeAlerts.filter(a => a.rule.severity === 'critical').length,
      warning: activeAlerts.filter(a => a.rule.severity === 'warning').length
    },
    capacity: { 
      maxTables: 300, 
      maxPlayers: 2700, 
      maxConnections: 5000,
      maxSpectators: 5000
    }
  });
});

// Prometheus-compatible metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(metrics.export());
});

// Alerts API
app.get('/api/alerts', (req, res) => {
  res.json({
    active: alertManager.getActiveAlerts(),
    history: alertManager.getAlertHistory(50)
  });
});

// Realtime events API
app.get('/api/events', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  res.json({
    success: true,
    events: realtimeEventBroadcaster.getRecentEvents(limit),
    stats: realtimeEventBroadcaster.getStats()
  });
});

// WebSocket server
const wss = new WebSocketServer({ 
  server,
  path: '/ws/poker',
  maxPayload: 1024 * 1024 // 1MB max message size
});

// Initialize WebSocket handler with tournament manager
const wsHandler = new PokerWebSocketHandler(wss, gameManager, supabase, tournamentManager);

// Connect tournament level service to broadcast break events via WebSocket
tournamentLevelService.setBreakEventCallback((tournamentId, event) => {
  wsHandler.broadcastBreakEvent(tournamentId, event);
});
// WebSocket connection rate limiting (increased for tournaments)
const wsRateLimiter = new RateLimiterMemory({
  points: 300, // connections per minute per IP (increased for tournaments)
  duration: 60,
});

wss.on('connection', async (ws, req) => {
  const ip = req.socket.remoteAddress || 'unknown';
  
  metrics.incWsConnections();
  
  try {
    await wsRateLimiter.consume(ip);
    wsHandler.handleConnection(ws, req);
  } catch (rateLimitError) {
    logger.warn(`WebSocket rate limit exceeded for IP: ${ip}`);
    ws.close(1008, 'Rate limit exceeded');
    metrics.incWsErrors();
  }
});

// Event loop lag monitoring
let lastCheck = process.hrtime.bigint();
setInterval(() => {
  const now = process.hrtime.bigint();
  const expected = 1000; // 1 second interval
  const actual = Number(now - lastCheck) / 1e6; // Convert to ms
  const lag = Math.max(0, actual - expected);
  
  metrics.setEventLoopLag(lag / 1000); // Convert to seconds
  lastCheck = now;
}, 1000);

// Log connection count and update metrics periodically
setInterval(() => {
  const stats = gameManager.getStats();
  
  // Update prometheus metrics
  metrics.setActiveTables(stats.activeTables);
  metrics.setActivePlayers(stats.totalPlayers);
  metrics.setActiveTournaments(tournamentManager.getTournamentCount?.() || 0);
  
  logger.info('Server stats', {
    activeConnections: wss.clients.size,
    activeTables: stats.activeTables,
    totalPlayers: stats.totalPlayers,
    memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    activeAlerts: alertManager.getActiveAlerts().length
  });
}, 30000);

// Initialize alert webhooks from environment
if (process.env.SLACK_WEBHOOK_URL) {
  alertManager.addWebhook({
    url: process.env.SLACK_WEBHOOK_URL,
    type: 'slack',
    enabled: true
  });
}

if (process.env.DISCORD_WEBHOOK_URL) {
  alertManager.addWebhook({
    url: process.env.DISCORD_WEBHOOK_URL,
    type: 'discord',
    enabled: true
  });
}

if (process.env.PAGERDUTY_ROUTING_KEY) {
  alertManager.addWebhook({
    url: `https://events.pagerduty.com/v2/enqueue`,
    type: 'pagerduty',
    enabled: true
  });
}

// Start alert manager
alertManager.start(10000); // Check every 10 seconds

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...');
  
  // Stop tournament level service
  tournamentLevelService.stop();
  
  // Stop tournament auto-start service
  tournamentAutoStartService.stop();
  
  // Stop alert manager
  alertManager.stop();
  
  // Shutdown spectator manager
  spectatorManager.shutdown();
  
  // Shutdown hand-for-hand manager
  handForHandManager.shutdown();
  
  // Shutdown message queue
  messageQueue.shutdown();
  
  // Shutdown message batcher
  messageBatcher.shutdown();
  
  // Shutdown tournament state cache
  tournamentStateCache.shutdown();
  
  // Shutdown redis manager
  redisManager.shutdown();
  
  // Shutdown worker pools
  await shutdownWorkerPools();
  
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

// 404 handler - MUST be LAST middleware after all routes are defined
// This was previously in routes/index.ts but it was catching /health, /metrics, etc.
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Start server
server.listen(config.port, () => {
  // Initialize hand history service with supabase
  handHistoryService.initialize(supabase);

  // Build marker (helps verify PM2 is running the latest compiled dist)
  // CRITICAL: Update this on every deploy to verify new code is running!
  const BUILD_TAG = process.env.BUILD_TAG || 'lovable-build-2026-01-18-fix-orphaned-hands';
  logger.info(`🧩 Build tag: ${BUILD_TAG}`);
  
  logger.info(`🚀 Poker Server v3.5 running on port ${config.port}`);
  logger.info(`📡 WebSocket endpoint: ws://localhost:${config.port}/ws/poker`);
  logger.info(`📊 Metrics endpoint: http://localhost:${config.port}/metrics`);
  logger.info(`❤️ Health endpoint: http://localhost:${config.port}/health`);
  logger.info(`🔔 Alert manager started with ${alertManager.getActiveAlerts().length} active alerts`);
  logger.info(`⚙️ Environment: ${config.nodeEnv}`);
  logger.info(`🎰 Tournament manager initialized`);
  logger.info(`👁️ Spectator mode enabled (30s card delay)`);
  logger.info(`🃏 Hand-for-hand system ready`);
  logger.info(`💎 Prize payout system ready`);
  logger.info(`⏱️ Action timeout guard active (0.5s grace period)`);
  logger.info(`📜 Hand history service ready (HUD stats enabled)`);
  logger.info(`🎯 Tournament level service running (5s check interval)`);
  logger.info(`🚀 Tournament auto-start service running (10s check interval)`);
  logger.info(`💰 PKO Bounty service ready`);
  logger.info(`🎫 Satellite tournament service ready`);
  logger.info(`🏆 RPS Prize system ready (auto RPS payouts)`);
  logger.info(`✅ Server ready for 300+ tables, 2700+ players, 5000+ spectators`);
  
  // Send PM2 ready signal
  if (process.send) {
    process.send('ready');
  }
});

export { app, server, wss, tournamentManager, prizePayoutSystem, handForHandManager, spectatorManager, actionTimeoutGuard, handHistoryService, tournamentLevelService, tournamentAutoStartService, pkoBountyService, satelliteTournamentService, rpsPrizeSystem };
