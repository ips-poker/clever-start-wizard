/**
 * Circuit Breaker Pattern for Database Protection
 * Prevents cascading failures when Supabase is unavailable
 */

import { logger } from './logger.js';

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject all requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Failures before opening
  successThreshold: number;      // Successes in half-open to close
  timeout: number;               // Time in OPEN state before half-open (ms)
  monitorInterval: number;       // Health check interval (ms)
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number = 0;
  private nextAttempt: number = 0;
  private readonly config: CircuitBreakerConfig;
  private readonly name: string;

  constructor(name: string, config?: Partial<CircuitBreakerConfig>) {
    this.name = name;
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      successThreshold: config?.successThreshold ?? 3,
      timeout: config?.timeout ?? 30000, // 30 seconds
      monitorInterval: config?.monitorInterval ?? 5000
    };

    logger.info(`CircuitBreaker [${name}] initialized`, { config: this.config });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        logger.warn(`CircuitBreaker [${this.name}] is OPEN - rejecting request`);
        if (fallback) return fallback();
        throw new Error(`Circuit breaker [${this.name}] is OPEN`);
      }
      // Try to transition to half-open
      this.toHalfOpen();
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      if (fallback) return fallback();
      throw error;
    }
  }

  /**
   * Check if circuit allows requests
   */
  isAvailable(): boolean {
    if (this.state === CircuitState.CLOSED) return true;
    if (this.state === CircuitState.HALF_OPEN) return true;
    if (this.state === CircuitState.OPEN && Date.now() >= this.nextAttempt) {
      this.toHalfOpen();
      return true;
    }
    return false;
  }

  /**
   * Record a successful operation
   */
  private onSuccess(): void {
    this.failures = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.toClose();
      }
    }
  }

  /**
   * Record a failed operation
   */
  private onFailure(error: unknown): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.successes = 0;

    logger.warn(`CircuitBreaker [${this.name}] failure #${this.failures}`, {
      error: String(error),
      state: this.state
    });

    if (this.failures >= this.config.failureThreshold) {
      this.toOpen();
    }
  }

  /**
   * Transition to CLOSED state
   */
  private toClose(): void {
    logger.info(`CircuitBreaker [${this.name}] transitioning to CLOSED`);
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
  }

  /**
   * Transition to OPEN state
   */
  private toOpen(): void {
    logger.warn(`CircuitBreaker [${this.name}] transitioning to OPEN`);
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.config.timeout;
  }

  /**
   * Transition to HALF_OPEN state
   */
  private toHalfOpen(): void {
    logger.info(`CircuitBreaker [${this.name}] transitioning to HALF_OPEN`);
    this.state = CircuitState.HALF_OPEN;
    this.successes = 0;
  }

  /**
   * Get current state info
   */
  getState(): { state: CircuitState; failures: number; lastFailure: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailureTime
    };
  }

  /**
   * Force reset to closed state
   */
  reset(): void {
    logger.info(`CircuitBreaker [${this.name}] forced reset`);
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = 0;
  }
}

// ==========================================
// SUPABASE-SPECIFIC CIRCUIT BREAKER
// ==========================================

export class SupabaseCircuitBreaker {
  private readonly readBreaker: CircuitBreaker;
  private readonly writeBreaker: CircuitBreaker;
  private readonly rpcBreaker: CircuitBreaker;

  constructor() {
    this.readBreaker = new CircuitBreaker('supabase-read', {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 15000
    });

    this.writeBreaker = new CircuitBreaker('supabase-write', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 30000
    });

    this.rpcBreaker = new CircuitBreaker('supabase-rpc', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 30000
    });
  }

  async read<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    return this.readBreaker.execute(fn, fallback);
  }

  async write<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    return this.writeBreaker.execute(fn, fallback);
  }

  async rpc<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    return this.rpcBreaker.execute(fn, fallback);
  }

  isReadAvailable(): boolean {
    return this.readBreaker.isAvailable();
  }

  isWriteAvailable(): boolean {
    return this.writeBreaker.isAvailable();
  }

  getStatus(): Record<string, { state: CircuitState; failures: number }> {
    return {
      read: this.readBreaker.getState(),
      write: this.writeBreaker.getState(),
      rpc: this.rpcBreaker.getState()
    };
  }

  resetAll(): void {
    this.readBreaker.reset();
    this.writeBreaker.reset();
    this.rpcBreaker.reset();
  }
}

// Singleton instance
export const supabaseCircuitBreaker = new SupabaseCircuitBreaker();
