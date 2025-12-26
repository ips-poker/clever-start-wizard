/**
 * Performance Profiler v1.0
 * Advanced performance monitoring and profiling
 * - Function execution timing
 * - Memory allocation tracking
 * - CPU profiling
 * - Slow query detection
 */

import { logger } from './logger.js';
import { prometheusRegistry } from './prometheus-metrics.js';

interface ProfileEntry {
  name: string;
  startTime: bigint;
  endTime?: bigint;
  durationMs?: number;
  memoryStart: number;
  memoryEnd?: number;
  memoryDelta?: number;
  metadata?: Record<string, unknown>;
}

interface SlowOperation {
  name: string;
  durationMs: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface ProfileStats {
  name: string;
  count: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
  p99Ms: number;
}

class PerformanceProfiler {
  private activeProfiles: Map<string, ProfileEntry> = new Map();
  private completedProfiles: Map<string, number[]> = new Map();
  private slowOperations: SlowOperation[] = [];
  
  private readonly MAX_HISTORY = 1000;
  private readonly SLOW_THRESHOLD_MS = 100;
  private readonly MAX_SLOW_OPS = 100;
  
  private profileIdCounter = 0;
  
  constructor() {
    logger.info('PerformanceProfiler initialized');
  }
  
  /**
   * Start profiling a function/operation
   */
  startProfile(name: string, metadata?: Record<string, unknown>): string {
    const id = `${name}_${++this.profileIdCounter}`;
    
    this.activeProfiles.set(id, {
      name,
      startTime: process.hrtime.bigint(),
      memoryStart: process.memoryUsage().heapUsed,
      metadata
    });
    
    return id;
  }
  
  /**
   * End profiling and record results
   */
  endProfile(id: string): number {
    const profile = this.activeProfiles.get(id);
    if (!profile) {
      logger.warn('Profile not found', { id });
      return 0;
    }
    
    profile.endTime = process.hrtime.bigint();
    profile.memoryEnd = process.memoryUsage().heapUsed;
    
    const durationNs = Number(profile.endTime - profile.startTime);
    const durationMs = durationNs / 1e6;
    profile.durationMs = durationMs;
    profile.memoryDelta = profile.memoryEnd - profile.memoryStart;
    
    this.activeProfiles.delete(id);
    
    // Record in history
    if (!this.completedProfiles.has(profile.name)) {
      this.completedProfiles.set(profile.name, []);
    }
    
    const history = this.completedProfiles.get(profile.name)!;
    history.push(durationMs);
    
    if (history.length > this.MAX_HISTORY) {
      history.shift();
    }
    
    // Check for slow operation
    if (durationMs > this.SLOW_THRESHOLD_MS) {
      this.recordSlowOperation(profile.name, durationMs, profile.metadata);
    }
    
    // Record in prometheus
    prometheusRegistry.observeHistogram(
      'poker_operation_duration_seconds',
      durationMs / 1000,
      { operation: profile.name }
    );
    
    return durationMs;
  }
  
  /**
   * Profile an async function
   */
  async profileAsync<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> {
    const id = this.startProfile(name, metadata);
    try {
      const result = await fn();
      this.endProfile(id);
      return result;
    } catch (error) {
      this.endProfile(id);
      throw error;
    }
  }
  
  /**
   * Profile a sync function
   */
  profileSync<T>(name: string, fn: () => T, metadata?: Record<string, unknown>): T {
    const id = this.startProfile(name, metadata);
    try {
      const result = fn();
      this.endProfile(id);
      return result;
    } catch (error) {
      this.endProfile(id);
      throw error;
    }
  }
  
  /**
   * Create a timer for manual measurement
   */
  createTimer(): () => number {
    const start = process.hrtime.bigint();
    return () => {
      const end = process.hrtime.bigint();
      return Number(end - start) / 1e6;
    };
  }
  
  /**
   * Record a slow operation
   */
  private recordSlowOperation(name: string, durationMs: number, metadata?: Record<string, unknown>): void {
    this.slowOperations.push({
      name,
      durationMs,
      timestamp: Date.now(),
      metadata
    });
    
    if (this.slowOperations.length > this.MAX_SLOW_OPS) {
      this.slowOperations.shift();
    }
    
    logger.warn('Slow operation detected', { name, durationMs, metadata });
    prometheusRegistry.incCounter('poker_slow_operations_total', 1, { operation: name });
  }
  
  /**
   * Get statistics for a profiled operation
   */
  getStats(name: string): ProfileStats | null {
    const history = this.completedProfiles.get(name);
    if (!history || history.length === 0) {
      return null;
    }
    
    const sorted = [...history].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    
    return {
      name,
      count: sorted.length,
      totalMs: Math.round(sum),
      avgMs: Math.round(sum / sorted.length * 100) / 100,
      minMs: Math.round(sorted[0] * 100) / 100,
      maxMs: Math.round(sorted[sorted.length - 1] * 100) / 100,
      p95Ms: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 100) / 100,
      p99Ms: Math.round(sorted[Math.floor(sorted.length * 0.99)] * 100) / 100
    };
  }
  
  /**
   * Get all profiled operations stats
   */
  getAllStats(): ProfileStats[] {
    const stats: ProfileStats[] = [];
    
    for (const name of this.completedProfiles.keys()) {
      const stat = this.getStats(name);
      if (stat) {
        stats.push(stat);
      }
    }
    
    return stats.sort((a, b) => b.avgMs - a.avgMs);
  }
  
  /**
   * Get slow operations
   */
  getSlowOperations(limit: number = 20): SlowOperation[] {
    return this.slowOperations.slice(-limit);
  }
  
  /**
   * Clear all history
   */
  clear(): void {
    this.completedProfiles.clear();
    this.slowOperations = [];
    logger.info('PerformanceProfiler cleared');
  }
  
  /**
   * Get memory snapshot
   */
  getMemorySnapshot(): {
    heapUsedMB: number;
    heapTotalMB: number;
    externalMB: number;
    rssMB: number;
    arrayBuffersMB: number;
  } {
    const mem = process.memoryUsage();
    return {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
      externalMB: Math.round(mem.external / 1024 / 1024 * 100) / 100,
      rssMB: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
      arrayBuffersMB: Math.round((mem.arrayBuffers || 0) / 1024 / 1024 * 100) / 100
    };
  }
}

// Singleton instance
export const profiler = new PerformanceProfiler();

/**
 * Decorator for profiling class methods
 */
export function Profile(name?: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const profileName = name || `${(target as object).constructor.name}.${propertyKey}`;
    
    descriptor.value = async function (...args: unknown[]) {
      return profiler.profileAsync(profileName, () => originalMethod.apply(this, args));
    };
    
    return descriptor;
  };
}
