/**
 * Advanced Performance Monitor - PokerStars-Level Monitoring
 * 
 * World-class poker server performance monitoring with:
 * - Sub-millisecond latency tracking
 * - Action timing percentiles (P50, P95, P99)
 * - Database query profiling
 * - WebSocket message throughput analysis
 * - Memory pressure detection
 * - Automatic bottleneck identification
 */

import { logger } from './logger.js';

// ============= PERCENTILE CALCULATOR =============
class PercentileTracker {
  private values: number[] = [];
  private readonly maxSize: number;
  private sorted: boolean = false;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  add(value: number): void {
    if (this.values.length >= this.maxSize) {
      // Remove oldest 10% when full
      this.values = this.values.slice(Math.floor(this.maxSize * 0.1));
    }
    this.values.push(value);
    this.sorted = false;
  }

  private ensureSorted(): void {
    if (!this.sorted) {
      this.values.sort((a, b) => a - b);
      this.sorted = true;
    }
  }

  getPercentile(p: number): number {
    if (this.values.length === 0) return 0;
    this.ensureSorted();
    const index = Math.ceil((p / 100) * this.values.length) - 1;
    return this.values[Math.max(0, index)];
  }

  getStats(): { min: number; max: number; avg: number; p50: number; p95: number; p99: number; count: number } {
    if (this.values.length === 0) {
      return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0, count: 0 };
    }
    this.ensureSorted();
    const sum = this.values.reduce((a, b) => a + b, 0);
    return {
      min: this.values[0],
      max: this.values[this.values.length - 1],
      avg: sum / this.values.length,
      p50: this.getPercentile(50),
      p95: this.getPercentile(95),
      p99: this.getPercentile(99),
      count: this.values.length
    };
  }

  clear(): void {
    this.values = [];
    this.sorted = false;
  }
}

// ============= SLIDING WINDOW RATE TRACKER =============
class RateTracker {
  private timestamps: number[] = [];
  private readonly windowMs: number;

  constructor(windowMs: number = 60000) {
    this.windowMs = windowMs;
  }

  record(): void {
    this.cleanup();
    this.timestamps.push(Date.now());
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0] < cutoff) {
      this.timestamps.shift();
    }
  }

  getRate(): number {
    this.cleanup();
    return this.timestamps.length / (this.windowMs / 1000); // per second
  }

  getCount(): number {
    this.cleanup();
    return this.timestamps.length;
  }
}

// ============= DATABASE QUERY PROFILER =============
interface QueryProfile {
  query: string;
  durationMs: number;
  timestamp: number;
  table?: string;
  operation?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC';
}

class QueryProfiler {
  private queries: QueryProfile[] = [];
  private readonly maxQueries: number = 1000;
  private slowQueryThreshold: number = 100; // ms
  private slowQueries: QueryProfile[] = [];

  recordQuery(profile: QueryProfile): void {
    if (this.queries.length >= this.maxQueries) {
      this.queries.shift();
    }
    this.queries.push(profile);

    if (profile.durationMs > this.slowQueryThreshold) {
      if (this.slowQueries.length >= 100) {
        this.slowQueries.shift();
      }
      this.slowQueries.push(profile);
      logger.warn('Slow database query detected', {
        query: profile.query.substring(0, 100),
        durationMs: profile.durationMs,
        table: profile.table
      });
    }
  }

  getStats(): {
    totalQueries: number;
    avgDurationMs: number;
    slowQueries: number;
    queriesByTable: Record<string, number>;
    slowestQueries: QueryProfile[];
  } {
    if (this.queries.length === 0) {
      return {
        totalQueries: 0,
        avgDurationMs: 0,
        slowQueries: this.slowQueries.length,
        queriesByTable: {},
        slowestQueries: []
      };
    }

    const sum = this.queries.reduce((a, q) => a + q.durationMs, 0);
    const byTable: Record<string, number> = {};
    
    for (const q of this.queries) {
      if (q.table) {
        byTable[q.table] = (byTable[q.table] || 0) + 1;
      }
    }

    return {
      totalQueries: this.queries.length,
      avgDurationMs: sum / this.queries.length,
      slowQueries: this.slowQueries.length,
      queriesByTable: byTable,
      slowestQueries: this.slowQueries.slice(-10).reverse()
    };
  }
}

// ============= BOTTLENECK DETECTOR =============
interface BottleneckReport {
  type: 'database' | 'websocket' | 'memory' | 'cpu' | 'event_loop';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  metrics: Record<string, number>;
  detectedAt: number;
}

class BottleneckDetector {
  private reports: BottleneckReport[] = [];
  private readonly maxReports = 100;

  detect(metrics: {
    eventLoopLagMs: number;
    heapUsedMB: number;
    heapTotalMB: number;
    dbQueryAvgMs: number;
    wsMessageRatePerSec: number;
    actionLatencyP99Ms: number;
  }): BottleneckReport[] {
    const newReports: BottleneckReport[] = [];
    const now = Date.now();

    // Event loop lag detection
    if (metrics.eventLoopLagMs > 500) {
      newReports.push({
        type: 'event_loop',
        severity: metrics.eventLoopLagMs > 1000 ? 'critical' : 'high',
        description: `Event loop lag: ${metrics.eventLoopLagMs}ms`,
        recommendation: 'Offload CPU-intensive work to worker threads, review synchronous operations',
        metrics: { lagMs: metrics.eventLoopLagMs },
        detectedAt: now
      });
    } else if (metrics.eventLoopLagMs > 100) {
      newReports.push({
        type: 'event_loop',
        severity: 'medium',
        description: `Elevated event loop lag: ${metrics.eventLoopLagMs}ms`,
        recommendation: 'Monitor for increasing trend, consider reducing concurrent operations',
        metrics: { lagMs: metrics.eventLoopLagMs },
        detectedAt: now
      });
    }

    // Memory pressure detection
    const memoryUsageRatio = metrics.heapUsedMB / metrics.heapTotalMB;
    if (memoryUsageRatio > 0.9) {
      newReports.push({
        type: 'memory',
        severity: memoryUsageRatio > 0.95 ? 'critical' : 'high',
        description: `Memory pressure: ${Math.round(memoryUsageRatio * 100)}% heap used`,
        recommendation: 'Force GC, check for memory leaks, consider increasing heap size',
        metrics: { usedMB: metrics.heapUsedMB, totalMB: metrics.heapTotalMB, ratio: memoryUsageRatio },
        detectedAt: now
      });
    }

    // Database bottleneck
    if (metrics.dbQueryAvgMs > 50) {
      newReports.push({
        type: 'database',
        severity: metrics.dbQueryAvgMs > 100 ? 'high' : 'medium',
        description: `Slow database queries: avg ${metrics.dbQueryAvgMs.toFixed(1)}ms`,
        recommendation: 'Add indexes, optimize queries, consider connection pooling',
        metrics: { avgMs: metrics.dbQueryAvgMs },
        detectedAt: now
      });
    }

    // Action latency
    if (metrics.actionLatencyP99Ms > 200) {
      newReports.push({
        type: 'websocket',
        severity: metrics.actionLatencyP99Ms > 500 ? 'critical' : 'high',
        description: `High action latency P99: ${metrics.actionLatencyP99Ms}ms`,
        recommendation: 'Review action processing pipeline, check for blocking operations',
        metrics: { p99Ms: metrics.actionLatencyP99Ms },
        detectedAt: now
      });
    }

    // Store reports
    for (const report of newReports) {
      if (this.reports.length >= this.maxReports) {
        this.reports.shift();
      }
      this.reports.push(report);
    }

    return newReports;
  }

  getRecentReports(minutes: number = 5): BottleneckReport[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.reports.filter(r => r.detectedAt > cutoff);
  }
}

// ============= MAIN PERFORMANCE MONITOR =============
export class AdvancedPerformanceMonitor {
  // Latency trackers
  private actionLatency = new PercentileTracker(10000);
  private wsMessageLatency = new PercentileTracker(10000);
  private dbQueryLatency = new PercentileTracker(5000);
  private handDealLatency = new PercentileTracker(5000);
  private phaseTransitionLatency = new PercentileTracker(5000);

  // Rate trackers
  private actionsPerSecond = new RateTracker(60000);
  private wsMessagesPerSecond = new RateTracker(60000);
  private handsPerMinute = new RateTracker(60000);
  private errorsPerMinute = new RateTracker(60000);

  // Profilers
  private queryProfiler = new QueryProfiler();
  private bottleneckDetector = new BottleneckDetector();

  // Event loop monitoring
  private lastLoopTime = process.hrtime.bigint();
  private eventLoopLag = 0;
  private loopCheckInterval: NodeJS.Timeout | null = null;

  // Analysis interval
  private analysisInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startEventLoopMonitoring();
    this.startAnalysis();
    logger.info('AdvancedPerformanceMonitor initialized');
  }

  private startEventLoopMonitoring(): void {
    this.loopCheckInterval = setInterval(() => {
      const now = process.hrtime.bigint();
      const expectedNs = 50_000_000n; // 50ms interval
      const actualNs = now - this.lastLoopTime;
      const lagNs = actualNs > expectedNs ? actualNs - expectedNs : 0n;
      this.eventLoopLag = Number(lagNs) / 1_000_000; // Convert to ms
      this.lastLoopTime = now;
    }, 50);
  }

  private startAnalysis(): void {
    this.analysisInterval = setInterval(() => {
      this.runBottleneckAnalysis();
    }, 30000); // Every 30 seconds
  }

  // ============= RECORDING METHODS =============

  recordAction(latencyMs: number): void {
    this.actionLatency.add(latencyMs);
    this.actionsPerSecond.record();
  }

  recordWsMessage(latencyMs: number): void {
    this.wsMessageLatency.add(latencyMs);
    this.wsMessagesPerSecond.record();
  }

  recordDbQuery(table: string, operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC', durationMs: number): void {
    this.dbQueryLatency.add(durationMs);
    this.queryProfiler.recordQuery({
      query: `${operation} ${table}`,
      durationMs,
      timestamp: Date.now(),
      table,
      operation
    });
  }

  recordHandDealt(latencyMs: number): void {
    this.handDealLatency.add(latencyMs);
    this.handsPerMinute.record();
  }

  recordPhaseTransition(latencyMs: number): void {
    this.phaseTransitionLatency.add(latencyMs);
  }

  recordError(): void {
    this.errorsPerMinute.record();
  }

  // ============= ANALYSIS =============

  private runBottleneckAnalysis(): void {
    const mem = process.memoryUsage();
    
    const reports = this.bottleneckDetector.detect({
      eventLoopLagMs: this.eventLoopLag,
      heapUsedMB: mem.heapUsed / 1024 / 1024,
      heapTotalMB: mem.heapTotal / 1024 / 1024,
      dbQueryAvgMs: this.dbQueryLatency.getStats().avg,
      wsMessageRatePerSec: this.wsMessagesPerSecond.getRate(),
      actionLatencyP99Ms: this.actionLatency.getStats().p99
    });

    if (reports.length > 0) {
      for (const report of reports) {
        if (report.severity === 'critical' || report.severity === 'high') {
          logger.error('Performance bottleneck detected', report);
        }
      }
    }
  }

  // ============= GETTERS =============

  getFullReport(): {
    latencies: {
      actions: ReturnType<PercentileTracker['getStats']>;
      wsMessages: ReturnType<PercentileTracker['getStats']>;
      dbQueries: ReturnType<PercentileTracker['getStats']>;
      handDealing: ReturnType<PercentileTracker['getStats']>;
      phaseTransitions: ReturnType<PercentileTracker['getStats']>;
    };
    rates: {
      actionsPerSecond: number;
      wsMessagesPerSecond: number;
      handsPerMinute: number;
      errorsPerMinute: number;
    };
    eventLoopLagMs: number;
    dbProfile: ReturnType<QueryProfiler['getStats']>;
    bottlenecks: BottleneckReport[];
    healthScore: number;
  } {
    const actionStats = this.actionLatency.getStats();
    
    // Calculate health score (0-100)
    let healthScore = 100;
    
    // Deduct for high latency
    if (actionStats.p99 > 200) healthScore -= 20;
    else if (actionStats.p99 > 100) healthScore -= 10;
    
    // Deduct for event loop lag
    if (this.eventLoopLag > 100) healthScore -= 20;
    else if (this.eventLoopLag > 50) healthScore -= 10;
    
    // Deduct for errors
    const errorRate = this.errorsPerMinute.getRate();
    if (errorRate > 1) healthScore -= 20;
    else if (errorRate > 0.1) healthScore -= 10;
    
    // Deduct for memory pressure
    const mem = process.memoryUsage();
    const memRatio = mem.heapUsed / mem.heapTotal;
    if (memRatio > 0.9) healthScore -= 20;
    else if (memRatio > 0.8) healthScore -= 10;

    return {
      latencies: {
        actions: actionStats,
        wsMessages: this.wsMessageLatency.getStats(),
        dbQueries: this.dbQueryLatency.getStats(),
        handDealing: this.handDealLatency.getStats(),
        phaseTransitions: this.phaseTransitionLatency.getStats()
      },
      rates: {
        actionsPerSecond: this.actionsPerSecond.getRate(),
        wsMessagesPerSecond: this.wsMessagesPerSecond.getRate(),
        handsPerMinute: this.handsPerMinute.getRate() * 60,
        errorsPerMinute: this.errorsPerMinute.getRate() * 60
      },
      eventLoopLagMs: this.eventLoopLag,
      dbProfile: this.queryProfiler.getStats(),
      bottlenecks: this.bottleneckDetector.getRecentReports(5),
      healthScore: Math.max(0, healthScore)
    };
  }

  getEventLoopLag(): number {
    return this.eventLoopLag;
  }

  shutdown(): void {
    if (this.loopCheckInterval) clearInterval(this.loopCheckInterval);
    if (this.analysisInterval) clearInterval(this.analysisInterval);
    logger.info('AdvancedPerformanceMonitor shutdown');
  }
}

// Singleton
export const advancedPerformanceMonitor = new AdvancedPerformanceMonitor();
