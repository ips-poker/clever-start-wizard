/**
 * Performance Monitor for Professional Poker Server
 * Tracks metrics, memory usage, and provides health endpoints
 */

import { logger } from './logger.js';

// ==========================================
// METRICS TYPES
// ==========================================
export interface GameMetrics {
  handsDealt: number;
  handsCompleted: number;
  actionsProcessed: number;
  averageHandDurationMs: number;
  averageActionLatencyMs: number;
  peakConcurrentHands: number;
  errors: number;
}

export interface WebSocketMetrics {
  messagesReceived: number;
  messagesSent: number;
  bytesReceived: number;
  bytesSent: number;
  connectionAttempts: number;
  connectionRejections: number;
  averageMessageLatencyMs: number;
}

export interface TournamentMetrics {
  activeTournaments: number;
  totalPlayersInTournaments: number;
  tournamentsStarted: number;
  tournamentsCompleted: number;
  eliminationsProcessed: number;
  tableBalancingOperations: number;
}

export interface SystemMetrics {
  uptime: number;
  memoryUsedMB: number;
  memoryTotalMB: number;
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
  cpuUsagePercent: number;
  eventLoopLagMs: number;
  gcPauseMs: number;
}

export interface FullMetrics {
  timestamp: number;
  system: SystemMetrics;
  game: GameMetrics;
  websocket: WebSocketMetrics;
  tournament: TournamentMetrics;
  health: 'healthy' | 'degraded' | 'critical';
}

// ==========================================
// METRICS COLLECTOR
// ==========================================
class MetricsCollector {
  private startTime: number = Date.now();
  private lastCpuUsage: NodeJS.CpuUsage | null = null;
  private lastCpuTime: number = 0;
  
  // Game metrics
  private handsDealt: number = 0;
  private handsCompleted: number = 0;
  private actionsProcessed: number = 0;
  private handDurations: number[] = [];
  private actionLatencies: number[] = [];
  private peakConcurrentHands: number = 0;
  private currentConcurrentHands: number = 0;
  private errors: number = 0;
  
  // WebSocket metrics
  private messagesReceived: number = 0;
  private messagesSent: number = 0;
  private bytesReceived: number = 0;
  private bytesSent: number = 0;
  private connectionAttempts: number = 0;
  private connectionRejections: number = 0;
  private messageLatencies: number[] = [];
  
  // Tournament metrics
  private activeTournaments: number = 0;
  private totalPlayersInTournaments: number = 0;
  private tournamentsStarted: number = 0;
  private tournamentsCompleted: number = 0;
  private eliminationsProcessed: number = 0;
  private tableBalancingOperations: number = 0;
  
  // Event loop lag measurement
  private lastEventLoopCheck: number = Date.now();
  private eventLoopLag: number = 0;
  private lagCheckInterval: NodeJS.Timeout | null = null;
  
  // Rolling window size for averages
  private static readonly WINDOW_SIZE = 1000;
  
  constructor() {
    this.startEventLoopMonitor();
  }
  
  // ==========================================
  // GAME METRICS
  // ==========================================
  
  recordHandDealt(): void {
    this.handsDealt++;
    this.currentConcurrentHands++;
    if (this.currentConcurrentHands > this.peakConcurrentHands) {
      this.peakConcurrentHands = this.currentConcurrentHands;
    }
  }
  
  recordHandCompleted(durationMs: number): void {
    this.handsCompleted++;
    this.currentConcurrentHands = Math.max(0, this.currentConcurrentHands - 1);
    this.addToWindow(this.handDurations, durationMs);
  }
  
  recordAction(latencyMs: number): void {
    this.actionsProcessed++;
    this.addToWindow(this.actionLatencies, latencyMs);
  }
  
  recordError(): void {
    this.errors++;
  }
  
  // ==========================================
  // WEBSOCKET METRICS
  // ==========================================
  
  recordMessageReceived(bytes: number): void {
    this.messagesReceived++;
    this.bytesReceived += bytes;
  }
  
  recordMessageSent(bytes: number): void {
    this.messagesSent++;
    this.bytesSent += bytes;
  }
  
  recordConnectionAttempt(rejected: boolean = false): void {
    this.connectionAttempts++;
    if (rejected) this.connectionRejections++;
  }
  
  recordMessageLatency(latencyMs: number): void {
    this.addToWindow(this.messageLatencies, latencyMs);
  }
  
  // ==========================================
  // TOURNAMENT METRICS
  // ==========================================
  
  setActiveTournaments(count: number, totalPlayers: number): void {
    this.activeTournaments = count;
    this.totalPlayersInTournaments = totalPlayers;
  }
  
  recordTournamentStarted(): void {
    this.tournamentsStarted++;
  }
  
  recordTournamentCompleted(): void {
    this.tournamentsCompleted++;
  }
  
  recordElimination(): void {
    this.eliminationsProcessed++;
  }
  
  recordTableBalancing(): void {
    this.tableBalancingOperations++;
  }
  
  // ==========================================
  // SYSTEM METRICS
  // ==========================================
  
  private startEventLoopMonitor(): void {
    this.lagCheckInterval = setInterval(() => {
      const now = Date.now();
      const expectedDelay = 100;
      const actualDelay = now - this.lastEventLoopCheck;
      this.eventLoopLag = Math.max(0, actualDelay - expectedDelay);
      this.lastEventLoopCheck = now;
    }, 100);
  }
  
  private getCpuUsage(): number {
    const cpuUsage = process.cpuUsage(this.lastCpuUsage || undefined);
    const now = Date.now();
    
    if (this.lastCpuUsage && this.lastCpuTime) {
      const elapsedMs = now - this.lastCpuTime;
      const totalCpuMs = (cpuUsage.user + cpuUsage.system) / 1000;
      const cpuPercent = (totalCpuMs / elapsedMs) * 100;
      
      this.lastCpuUsage = process.cpuUsage();
      this.lastCpuTime = now;
      
      return Math.min(100, Math.round(cpuPercent * 10) / 10);
    }
    
    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuTime = now;
    return 0;
  }
  
  private getSystemMetrics(): SystemMetrics {
    const mem = process.memoryUsage();
    
    return {
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      memoryUsedMB: Math.round(mem.rss / 1024 / 1024),
      memoryTotalMB: Math.round((process.memoryUsage().rss + (process.memoryUsage() as any).arrayBuffers || 0) / 1024 / 1024),
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      externalMB: Math.round(mem.external / 1024 / 1024),
      cpuUsagePercent: this.getCpuUsage(),
      eventLoopLagMs: this.eventLoopLag,
      gcPauseMs: 0 // Would need gc-stats package for this
    };
  }
  
  // ==========================================
  // HELPERS
  // ==========================================
  
  private addToWindow(arr: number[], value: number): void {
    arr.push(value);
    if (arr.length > MetricsCollector.WINDOW_SIZE) {
      arr.shift();
    }
  }
  
  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }
  
  // ==========================================
  // GET FULL METRICS
  // ==========================================
  
  getMetrics(): FullMetrics {
    const system = this.getSystemMetrics();
    
    // Determine health status
    let health: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (system.heapUsedMB > 1500 || system.eventLoopLagMs > 100 || this.errors > 100) {
      health = 'degraded';
    }
    
    if (system.heapUsedMB > 2000 || system.eventLoopLagMs > 500 || this.errors > 1000) {
      health = 'critical';
    }
    
    return {
      timestamp: Date.now(),
      system,
      game: {
        handsDealt: this.handsDealt,
        handsCompleted: this.handsCompleted,
        actionsProcessed: this.actionsProcessed,
        averageHandDurationMs: this.average(this.handDurations),
        averageActionLatencyMs: this.average(this.actionLatencies),
        peakConcurrentHands: this.peakConcurrentHands,
        errors: this.errors
      },
      websocket: {
        messagesReceived: this.messagesReceived,
        messagesSent: this.messagesSent,
        bytesReceived: this.bytesReceived,
        bytesSent: this.bytesSent,
        connectionAttempts: this.connectionAttempts,
        connectionRejections: this.connectionRejections,
        averageMessageLatencyMs: this.average(this.messageLatencies)
      },
      tournament: {
        activeTournaments: this.activeTournaments,
        totalPlayersInTournaments: this.totalPlayersInTournaments,
        tournamentsStarted: this.tournamentsStarted,
        tournamentsCompleted: this.tournamentsCompleted,
        eliminationsProcessed: this.eliminationsProcessed,
        tableBalancingOperations: this.tableBalancingOperations
      },
      health
    };
  }
  
  // ==========================================
  // RESET & SHUTDOWN
  // ==========================================
  
  reset(): void {
    this.handsDealt = 0;
    this.handsCompleted = 0;
    this.actionsProcessed = 0;
    this.handDurations = [];
    this.actionLatencies = [];
    this.errors = 0;
    this.messagesReceived = 0;
    this.messagesSent = 0;
    this.bytesReceived = 0;
    this.bytesSent = 0;
    this.connectionAttempts = 0;
    this.connectionRejections = 0;
    this.messageLatencies = [];
    this.tournamentsStarted = 0;
    this.tournamentsCompleted = 0;
    this.eliminationsProcessed = 0;
    this.tableBalancingOperations = 0;
    
    logger.info('Metrics reset');
  }
  
  shutdown(): void {
    if (this.lagCheckInterval) {
      clearInterval(this.lagCheckInterval);
    }
    logger.info('MetricsCollector shutdown complete');
  }
}

// Singleton instance
export const metrics = new MetricsCollector();

// ==========================================
// MEMORY LEAK DETECTOR
// ==========================================
export class MemoryLeakDetector {
  private samples: { timestamp: number; heapUsed: number }[] = [];
  private checkInterval: NodeJS.Timeout | null = null;
  private alertThresholdMB: number = 100; // Alert if growth > 100MB in window
  private windowMinutes: number = 10;
  
  constructor() {
    this.startMonitoring();
  }
  
  private startMonitoring(): void {
    this.checkInterval = setInterval(() => {
      this.checkForLeaks();
    }, 60000); // Check every minute
  }
  
  private checkForLeaks(): void {
    const mem = process.memoryUsage();
    const now = Date.now();
    
    // Add sample
    this.samples.push({
      timestamp: now,
      heapUsed: mem.heapUsed
    });
    
    // Remove samples older than window
    const windowStart = now - this.windowMinutes * 60 * 1000;
    this.samples = this.samples.filter(s => s.timestamp >= windowStart);
    
    if (this.samples.length < 2) return;
    
    // Calculate growth rate
    const oldest = this.samples[0];
    const newest = this.samples[this.samples.length - 1];
    const growthMB = (newest.heapUsed - oldest.heapUsed) / 1024 / 1024;
    
    if (growthMB > this.alertThresholdMB) {
      logger.warn('MEMORY LEAK DETECTED', {
        growthMB: Math.round(growthMB),
        windowMinutes: this.windowMinutes,
        currentHeapMB: Math.round(mem.heapUsed / 1024 / 1024),
        samples: this.samples.length
      });
      
      // Force garbage collection if available
      if (global.gc) {
        logger.info('Forcing garbage collection');
        global.gc();
      }
    }
  }
  
  shutdown(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

// Singleton
export const memoryLeakDetector = new MemoryLeakDetector();
