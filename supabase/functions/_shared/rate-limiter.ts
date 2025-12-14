/**
 * Simple in-memory rate limiter for Edge Functions
 * Uses a sliding window algorithm
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (resets when function cold starts)
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxRequests: number;  // Maximum requests allowed
  windowMs: number;     // Time window in milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;  // Seconds until rate limit resets
}

/**
 * Check if request is allowed under rate limit
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    cleanupExpiredEntries(now);
  }

  // If no entry or entry expired, create new one
  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(identifier, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt
  };
}

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header or falls back to a hash
 */
export function getClientIdentifier(req: Request, prefix: string = ''): string {
  // Try to get real IP from headers (set by Supabase/load balancer)
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0]?.trim() || 'unknown';
  
  return `${prefix}:${ip}`;
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
    ...(result.retryAfter ? { 'Retry-After': result.retryAfter.toString() } : {})
  };
}

/**
 * Create 429 Too Many Requests response
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      retryAfter: result.retryAfter,
      message: `Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        ...createRateLimitHeaders(result)
      }
    }
  );
}

/**
 * Cleanup expired entries to prevent memory leaks
 */
function cleanupExpiredEntries(now: number): void {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Preset configurations for common use cases
export const RATE_LIMIT_PRESETS = {
  // Auth endpoints - stricter limits
  auth: {
    maxRequests: 5,
    windowMs: 60 * 1000  // 5 requests per minute
  },
  // Financial operations - very strict
  financial: {
    maxRequests: 10,
    windowMs: 60 * 1000  // 10 requests per minute
  },
  // General API - moderate limits
  api: {
    maxRequests: 60,
    windowMs: 60 * 1000  // 60 requests per minute
  },
  // Webhook endpoints - higher limits
  webhook: {
    maxRequests: 100,
    windowMs: 60 * 1000  // 100 requests per minute
  }
} as const;
