/**
 * Supabase Client Pool v1.0
 * Connection pooling and graceful degradation for Supabase
 * 
 * Features:
 * - Singleton client with lazy initialization
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern for 503 errors
 * - Request timeout handling
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configuration
const CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY_MS: 500,
  MAX_RETRY_DELAY_MS: 5000,
  REQUEST_TIMEOUT_MS: 30000,
  CIRCUIT_BREAKER_THRESHOLD: 5,    // Open circuit after 5 consecutive failures
  CIRCUIT_BREAKER_TIMEOUT_MS: 60000, // Reset circuit after 1 minute
};

// Circuit breaker state
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailure: 0,
  isOpen: false,
};

// Singleton client
let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client (anon key)
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'poker-engine/1.0',
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    
    console.log('[SupabasePool] ✅ Anon client initialized');
  }
  return supabaseClient;
}

/**
 * Get or create Supabase admin client (service role key)
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminClient) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    supabaseAdminClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'poker-engine-admin/1.0',
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    
    console.log('[SupabasePool] ✅ Admin client initialized');
  }
  return supabaseAdminClient;
}

/**
 * Check if circuit breaker is open
 */
function isCircuitOpen(): boolean {
  if (!circuitBreaker.isOpen) return false;
  
  // Check if timeout has passed
  const now = Date.now();
  if (now - circuitBreaker.lastFailure > CONFIG.CIRCUIT_BREAKER_TIMEOUT_MS) {
    // Reset circuit breaker
    circuitBreaker.isOpen = false;
    circuitBreaker.failures = 0;
    console.log('[SupabasePool] 🔄 Circuit breaker reset');
    return false;
  }
  
  return true;
}

/**
 * Record a failure
 */
function recordFailure(error: any): void {
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = Date.now();
  
  if (circuitBreaker.failures >= CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreaker.isOpen = true;
    console.warn(`[SupabasePool] ⚡ Circuit breaker OPEN after ${circuitBreaker.failures} failures`);
  }
  
  // Log specific error types
  if (error?.status === 503) {
    console.warn('[SupabasePool] ⚠️ 503 Service Unavailable');
  } else if (error?.code === 'PGRST301') {
    console.warn('[SupabasePool] ⚠️ Connection pool exhausted');
  }
}

/**
 * Record a success (resets failure counter)
 */
function recordSuccess(): void {
  if (circuitBreaker.failures > 0) {
    circuitBreaker.failures = 0;
    circuitBreaker.isOpen = false;
  }
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
function getRetryDelay(attempt: number): number {
  const baseDelay = CONFIG.INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * baseDelay;
  return Math.min(baseDelay + jitter, CONFIG.MAX_RETRY_DELAY_MS);
}

/**
 * Execute a database query with retry logic
 */
export async function executeWithRetry<T>(
  operation: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>,
  options: {
    useAdmin?: boolean;
    maxRetries?: number;
    operationName?: string;
  } = {}
): Promise<{ data: T | null; error: any; retries: number }> {
  const { useAdmin = true, maxRetries = CONFIG.MAX_RETRIES, operationName = 'query' } = options;
  
  // Check circuit breaker
  if (isCircuitOpen()) {
    const remainingMs = CONFIG.CIRCUIT_BREAKER_TIMEOUT_MS - (Date.now() - circuitBreaker.lastFailure);
    console.warn(`[SupabasePool] ⚡ Circuit open, ${Math.ceil(remainingMs/1000)}s remaining`);
    return {
      data: null,
      error: { 
        message: 'Service temporarily unavailable',
        code: 'CIRCUIT_OPEN',
        retryAfter: Math.ceil(remainingMs / 1000)
      },
      retries: 0,
    };
  }
  
  const client = useAdmin ? getSupabaseAdmin() : getSupabaseClient();
  let lastError: any = null;
  let retries = 0;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), CONFIG.REQUEST_TIMEOUT_MS);
      });
      
      // Race between operation and timeout
      const result = await Promise.race([
        operation(client),
        timeoutPromise,
      ]) as { data: T | null; error: any };
      
      if (result.error) {
        lastError = result.error;
        
        // Check if error is retryable
        const isRetryable = isRetryableError(result.error);
        
        if (isRetryable && attempt < maxRetries) {
          retries++;
          const delay = getRetryDelay(attempt);
          console.log(`[SupabasePool] 🔄 Retrying ${operationName} (attempt ${attempt + 1}/${maxRetries}) in ${delay}ms`);
          await sleep(delay);
          continue;
        }
        
        recordFailure(result.error);
        return { data: null, error: result.error, retries };
      }
      
      recordSuccess();
      return { data: result.data, error: null, retries };
      
    } catch (error: any) {
      lastError = error;
      
      if (attempt < maxRetries) {
        retries++;
        const delay = getRetryDelay(attempt);
        console.log(`[SupabasePool] 🔄 Retrying ${operationName} after error (attempt ${attempt + 1}/${maxRetries}) in ${delay}ms: ${error.message}`);
        await sleep(delay);
        continue;
      }
      
      recordFailure(error);
    }
  }
  
  return { data: null, error: lastError, retries };
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  // HTTP status codes that are retryable
  const retryableStatuses = [408, 429, 500, 502, 503, 504];
  if (error.status && retryableStatuses.includes(error.status)) {
    return true;
  }
  
  // PostgreSQL error codes that are retryable
  const retryableCodes = [
    'PGRST301', // Connection pool exhausted
    '40001',    // Serialization failure
    '40P01',    // Deadlock detected
    '57P03',    // Cannot connect now
  ];
  if (error.code && retryableCodes.includes(error.code)) {
    return true;
  }
  
  // Error messages that indicate retryable conditions
  const message = error.message?.toLowerCase() || '';
  if (
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('network') ||
    message.includes('unavailable')
  ) {
    return true;
  }
  
  return false;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get circuit breaker status
 */
export function getCircuitStatus(): {
  isOpen: boolean;
  failures: number;
  remainingTimeoutMs: number;
} {
  const now = Date.now();
  const remainingTimeoutMs = circuitBreaker.isOpen 
    ? Math.max(0, CONFIG.CIRCUIT_BREAKER_TIMEOUT_MS - (now - circuitBreaker.lastFailure))
    : 0;
    
  return {
    isOpen: circuitBreaker.isOpen,
    failures: circuitBreaker.failures,
    remainingTimeoutMs,
  };
}

/**
 * Reset circuit breaker manually (for testing/admin)
 */
export function resetCircuitBreaker(): void {
  circuitBreaker.failures = 0;
  circuitBreaker.lastFailure = 0;
  circuitBreaker.isOpen = false;
  console.log('[SupabasePool] 🔄 Circuit breaker manually reset');
}

/**
 * Batch multiple queries together
 */
export async function batchQueries<T extends any[]>(
  queries: Array<(client: SupabaseClient) => Promise<{ data: any; error: any }>>
): Promise<{ results: T; errors: any[] }> {
  const client = getSupabaseAdmin();
  
  const results = await Promise.allSettled(
    queries.map(query => query(client))
  );
  
  const data: any[] = [];
  const errors: any[] = [];
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      if (result.value.error) {
        errors.push(result.value.error);
        data.push(null);
      } else {
        data.push(result.value.data);
      }
    } else {
      errors.push(result.reason);
      data.push(null);
    }
  }
  
  return { results: data as T, errors };
}
