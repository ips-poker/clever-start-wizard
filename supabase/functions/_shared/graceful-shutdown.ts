/**
 * Graceful Shutdown Handler v1.0
 * Ensures clean shutdown of edge functions
 * 
 * Features:
 * - Cleanup callbacks on shutdown
 * - Connection draining
 * - Health check endpoint support
 */

export interface ShutdownHandler {
  name: string;
  priority: number; // Lower = earlier (0-100)
  handler: () => Promise<void> | void;
}

const shutdownHandlers: ShutdownHandler[] = [];
let isShuttingDown = false;
let shutdownStartTime = 0;

/**
 * Register a shutdown handler
 */
export function onShutdown(
  name: string,
  handler: () => Promise<void> | void,
  priority: number = 50
): void {
  shutdownHandlers.push({ name, handler, priority });
  // Sort by priority (lower first)
  shutdownHandlers.sort((a, b) => a.priority - b.priority);
}

/**
 * Check if we're shutting down
 */
export function isShuttingDownFlag(): boolean {
  return isShuttingDown;
}

/**
 * Get shutdown duration in ms
 */
export function getShutdownDuration(): number {
  if (!isShuttingDown) return 0;
  return Date.now() - shutdownStartTime;
}

/**
 * Execute graceful shutdown
 */
export async function executeShutdown(): Promise<void> {
  if (isShuttingDown) return;
  
  isShuttingDown = true;
  shutdownStartTime = Date.now();
  
  console.log('[Shutdown] 🛑 Starting graceful shutdown...');
  
  for (const handler of shutdownHandlers) {
    try {
      console.log(`[Shutdown] Executing: ${handler.name}`);
      await handler.handler();
    } catch (error) {
      console.error(`[Shutdown] Error in ${handler.name}:`, error);
    }
  }
  
  const duration = Date.now() - shutdownStartTime;
  console.log(`[Shutdown] ✅ Shutdown complete in ${duration}ms`);
}

/**
 * Create health check response
 */
export function createHealthResponse(
  corsHeaders: Record<string, string>,
  additionalInfo: Record<string, any> = {}
): Response {
  const status = isShuttingDown ? 'shutting_down' : 'healthy';
  const statusCode = isShuttingDown ? 503 : 200;
  
  return new Response(
    JSON.stringify({
      status,
      timestamp: Date.now(),
      uptime: process.uptime?.() || 0,
      shutdownDuration: getShutdownDuration(),
      ...additionalInfo,
    }),
    {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Wrap a request handler with shutdown check
 */
export function withShutdownCheck<T>(
  handler: () => Promise<T>,
  fallbackResponse: Response
): Promise<T | Response> {
  if (isShuttingDown) {
    return Promise.resolve(fallbackResponse);
  }
  return handler();
}

// Register default SIGTERM handler (if supported)
try {
  // Deno doesn't have process.on, but we can use Deno.addSignalListener
  if (typeof Deno !== 'undefined' && Deno.addSignalListener) {
    Deno.addSignalListener('SIGTERM', () => {
      executeShutdown().catch(console.error);
    });
    Deno.addSignalListener('SIGINT', () => {
      executeShutdown().catch(console.error);
    });
  }
} catch (e) {
  // Signal listeners not supported in this environment
}
