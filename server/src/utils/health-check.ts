/**
 * Advanced Health Check System v1.0
 * Comprehensive health monitoring for production deployments
 * - Deep health checks for all subsystems
 * - Readiness/liveness probes for Kubernetes
 * - Detailed diagnostics endpoint
 */

import { logger } from './logger.js';
import { prometheusRegistry } from './prometheus-metrics.js';
import { redisManager } from './redis-manager.js';
import { loadManager } from './load-manager.js';
import { supabaseCircuitBreaker } from './circuit-breaker.js';
import { messageQueue } from './message-queue.js';
import { antiCheatSystem } from './anti-cheat.js';

// Health status types
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface SubsystemHealth {
  name: string;
  status: HealthStatus;
  latencyMs?: number;
  details?: Record<string, unknown>;
  lastCheck: number;
}

export interface HealthCheckResult {
  status: HealthStatus;
  version: string;
  timestamp: string;
  uptime: number;
  subsystems: SubsystemHealth[];
  metrics: {
    memory: {
      heapUsedMB: number;
      heapTotalMB: number;
      rssMB: number;
      externalMB: number;
    };
    cpu: {
      usagePercent: number;
    };
    connections: {
      active: number;
      peak: number;
    };
    game: {
      activeTables: number;
      activePlayers: number;
      activeHands: number;
      activeTournaments: number;
    };
  };
}

export interface ReadinessResult {
  ready: boolean;
  checks: {
    database: boolean;
    memory: boolean;
    connections: boolean;
  };
}

export interface LivenessResult {
  alive: boolean;
  pid: number;
  uptime: number;
}

class HealthCheckSystem {
  private startTime: number = Date.now();
  private lastHealthCheck: HealthCheckResult | null = null;
  private peakConnections: number = 0;
  private currentConnections: number = 0;
  
  private readonly VERSION = '3.2.0';
  private readonly MEMORY_THRESHOLD_MB = 1800;
  private readonly CPU_THRESHOLD_PERCENT = 85;
  
  constructor() {
    logger.info('HealthCheckSystem initialized');
  }
  
  /**
   * Update current connection count
   */
  updateConnectionCount(count: number): void {
    this.currentConnections = count;
    if (count > this.peakConnections) {
      this.peakConnections = count;
    }
  }
  
  /**
   * Full health check - comprehensive system analysis
   */
  async getFullHealth(gameStats?: { activeTables: number; totalPlayers: number; activeHands: number }): Promise<HealthCheckResult> {
    const subsystems: SubsystemHealth[] = [];
    
    // Check memory
    const memoryHealth = this.checkMemoryHealth();
    subsystems.push(memoryHealth);
    
    // Check circuit breakers
    const cbHealth = this.checkCircuitBreakers();
    subsystems.push(cbHealth);
    
    // Check load manager
    const loadHealth = this.checkLoadManager();
    subsystems.push(loadHealth);
    
    // Check message queue
    const mqHealth = this.checkMessageQueue();
    subsystems.push(mqHealth);
    
    // Check anti-cheat
    const acHealth = this.checkAntiCheat();
    subsystems.push(acHealth);
    
    // Check Redis/session manager
    const redisHealth = this.checkRedis();
    subsystems.push(redisHealth);
    
    // Determine overall status
    const hasUnhealthy = subsystems.some(s => s.status === 'unhealthy');
    const hasDegraded = subsystems.some(s => s.status === 'degraded');
    
    let overallStatus: HealthStatus = 'healthy';
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    }
    
    const mem = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000;
    
    const result: HealthCheckResult = {
      status: overallStatus,
      version: this.VERSION,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      subsystems,
      metrics: {
        memory: {
          heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
          rssMB: Math.round(mem.rss / 1024 / 1024),
          externalMB: Math.round(mem.external / 1024 / 1024)
        },
        cpu: {
          usagePercent: Math.round(cpuPercent * 100) / 100
        },
        connections: {
          active: this.currentConnections,
          peak: this.peakConnections
        },
        game: {
          activeTables: gameStats?.activeTables || 0,
          activePlayers: gameStats?.totalPlayers || 0,
          activeHands: gameStats?.activeHands || 0,
          activeTournaments: 0
        }
      }
    };
    
    this.lastHealthCheck = result;
    
    // Update prometheus metrics
    prometheusRegistry.setGauge('poker_health_status', 
      overallStatus === 'healthy' ? 0 : overallStatus === 'degraded' ? 1 : 2
    );
    
    return result;
  }
  
  /**
   * Kubernetes readiness probe
   */
  async getReadiness(): Promise<ReadinessResult> {
    const mem = process.memoryUsage();
    const heapUsedMB = mem.heapUsed / 1024 / 1024;
    
    const memoryOk = heapUsedMB < this.MEMORY_THRESHOLD_MB;
    const connectionsOk = this.currentConnections < 4500; // Below max
    
    // Check if database circuit breaker is closed
    const cbStatus = supabaseCircuitBreaker.getStatus();
    const databaseOk = cbStatus.read?.state === 'CLOSED' || cbStatus.read?.state === 'HALF_OPEN';
    
    return {
      ready: memoryOk && connectionsOk && databaseOk,
      checks: {
        database: databaseOk,
        memory: memoryOk,
        connections: connectionsOk
      }
    };
  }
  
  /**
   * Kubernetes liveness probe
   */
  getLiveness(): LivenessResult {
    return {
      alive: true,
      pid: process.pid,
      uptime: Math.floor((Date.now() - this.startTime) / 1000)
    };
  }
  
  /**
   * Get last cached health check
   */
  getCachedHealth(): HealthCheckResult | null {
    return this.lastHealthCheck;
  }
  
  // ==========================================
  // SUBSYSTEM CHECKS
  // ==========================================
  
  private checkMemoryHealth(): SubsystemHealth {
    const mem = process.memoryUsage();
    const heapUsedMB = mem.heapUsed / 1024 / 1024;
    const heapTotalMB = mem.heapTotal / 1024 / 1024;
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;
    
    let status: HealthStatus = 'healthy';
    if (heapUsedMB > 1500 || usagePercent > 85) {
      status = 'degraded';
    }
    if (heapUsedMB > 2000 || usagePercent > 95) {
      status = 'unhealthy';
    }
    
    return {
      name: 'memory',
      status,
      details: {
        heapUsedMB: Math.round(heapUsedMB),
        heapTotalMB: Math.round(heapTotalMB),
        usagePercent: Math.round(usagePercent)
      },
      lastCheck: Date.now()
    };
  }
  
  private checkCircuitBreakers(): SubsystemHealth {
    const cbStatus = supabaseCircuitBreaker.getStatus();
    
    let status: HealthStatus = 'healthy';
    if (cbStatus.read?.state === 'HALF_OPEN' || cbStatus.write?.state === 'HALF_OPEN') {
      status = 'degraded';
    }
    if (cbStatus.read?.state === 'OPEN' || cbStatus.write?.state === 'OPEN') {
      status = 'unhealthy';
    }
    
    return {
      name: 'circuit_breakers',
      status,
      details: {
        read: cbStatus.read?.state,
        write: cbStatus.write?.state
      },
      lastCheck: Date.now()
    };
  }
  
  private checkLoadManager(): SubsystemHealth {
    const loadStatus = loadManager.getStatus();
    
    let status: HealthStatus = 'healthy';
    if (loadStatus.level === 'ELEVATED' || loadStatus.level === 'HIGH') {
      status = 'degraded';
    }
    if (loadStatus.level === 'CRITICAL') {
      status = 'unhealthy';
    }
    
    return {
      name: 'load_manager',
      status,
      details: {
        level: loadStatus.level,
        cpuLoad: loadStatus.cpuLoad,
        memoryUsage: loadStatus.memoryUsage
      },
      lastCheck: Date.now()
    };
  }
  
  private checkMessageQueue(): SubsystemHealth {
    const mqStats = messageQueue.getStats();
    
    let status: HealthStatus = 'healthy';
    if (mqStats.size > 1000) {
      status = 'degraded';
    }
    if (mqStats.size > 5000) {
      status = 'unhealthy';
    }
    
    return {
      name: 'message_queue',
      status,
      details: {
        queueSize: mqStats.size,
        processed: mqStats.processed,
        dropped: mqStats.dropped
      },
      lastCheck: Date.now()
    };
  }
  
  private checkAntiCheat(): SubsystemHealth {
    const acStats = antiCheatSystem.getStats();
    
    return {
      name: 'anti_cheat',
      status: 'healthy',
      details: {
        trackedPlayers: acStats.trackedPlayers,
        flaggedPlayers: acStats.flaggedPlayers,
        collusionPairs: acStats.collusionPairs
      },
      lastCheck: Date.now()
    };
  }
  
  private checkRedis(): SubsystemHealth {
    const redisStats = redisManager.getStats();
    
    return {
      name: 'session_manager',
      status: 'healthy',
      details: {
        sessions: redisStats.sessions,
        tables: redisStats.tables,
        channels: redisStats.channels
      },
      lastCheck: Date.now()
    };
  }
}

// Singleton instance
export const healthCheck = new HealthCheckSystem();
