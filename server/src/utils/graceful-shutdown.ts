/**
 * Graceful Shutdown Manager v1.0
 * Professional shutdown handling for production deployments
 * - Graceful connection draining
 * - State persistence
 * - Health check updates
 * - Timeout enforcement
 */

import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from './logger.js';

export interface ShutdownHandler {
  name: string;
  priority: number; // Lower = runs first
  handler: () => Promise<void>;
}

class GracefulShutdownManager {
  private handlers: ShutdownHandler[] = [];
  private isShuttingDown = false;
  private shutdownPromise: Promise<void> | null = null;
  
  private readonly SHUTDOWN_TIMEOUT_MS = 30000;
  private readonly CONNECTION_DRAIN_TIMEOUT_MS = 10000;
  
  constructor() {
    // Register signal handlers
    process.on('SIGTERM', () => this.initiateShutdown('SIGTERM'));
    process.on('SIGINT', () => this.initiateShutdown('SIGINT'));
    
    logger.info('GracefulShutdownManager initialized');
  }
  
  /**
   * Register a shutdown handler
   */
  register(name: string, handler: () => Promise<void>, priority: number = 50): void {
    this.handlers.push({ name, handler, priority });
    this.handlers.sort((a, b) => a.priority - b.priority);
    logger.debug('Shutdown handler registered', { name, priority });
  }
  
  /**
   * Register HTTP server for graceful shutdown
   */
  registerHttpServer(server: Server, name: string = 'http_server'): void {
    this.register(name, async () => {
      return new Promise((resolve) => {
        // Stop accepting new connections
        server.close((err) => {
          if (err) {
            logger.error('Error closing HTTP server', { error: String(err) });
          }
          logger.info('HTTP server closed');
          resolve();
        });
        
        // Force close after timeout
        setTimeout(() => {
          logger.warn('Force closing HTTP server after timeout');
          resolve();
        }, this.CONNECTION_DRAIN_TIMEOUT_MS);
      });
    }, 90);
  }
  
  /**
   * Register WebSocket server for graceful shutdown
   */
  registerWebSocketServer(wss: WebSocketServer, name: string = 'websocket_server'): void {
    this.register(name, async () => {
      return new Promise((resolve) => {
        // Notify all clients
        const closeMessage = JSON.stringify({
          type: 'server_shutdown',
          message: 'Server is shutting down for maintenance',
          reconnectAfter: 30000
        });
        
        let closedCount = 0;
        const totalClients = wss.clients.size;
        
        if (totalClients === 0) {
          resolve();
          return;
        }
        
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            try {
              client.send(closeMessage);
              client.close(1001, 'Server shutting down');
            } catch (e) {
              // Ignore errors
            }
          }
          closedCount++;
          
          if (closedCount >= totalClients) {
            logger.info('All WebSocket clients notified', { count: totalClients });
          }
        });
        
        // Wait for connections to close
        setTimeout(() => {
          // Force terminate remaining connections
          wss.clients.forEach((client) => {
            try {
              client.terminate();
            } catch (e) {
              // Ignore
            }
          });
          
          wss.close(() => {
            logger.info('WebSocket server closed');
            resolve();
          });
        }, this.CONNECTION_DRAIN_TIMEOUT_MS);
      });
    }, 80);
  }
  
  /**
   * Check if shutdown is in progress
   */
  isInProgress(): boolean {
    return this.isShuttingDown;
  }
  
  /**
   * Initiate graceful shutdown
   */
  async initiateShutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return this.shutdownPromise!;
    }
    
    this.isShuttingDown = true;
    logger.info('Initiating graceful shutdown', { signal });
    
    this.shutdownPromise = this.executeShutdown();
    
    return this.shutdownPromise;
  }
  
  /**
   * Execute all shutdown handlers
   */
  private async executeShutdown(): Promise<void> {
    const startTime = Date.now();
    
    // Create timeout promise
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Shutdown timeout exceeded'));
      }, this.SHUTDOWN_TIMEOUT_MS);
    });
    
    // Execute handlers
    const handlersPromise = (async () => {
      for (const handler of this.handlers) {
        const handlerStart = Date.now();
        try {
          logger.info('Running shutdown handler', { name: handler.name });
          await handler.handler();
          logger.info('Shutdown handler completed', { 
            name: handler.name, 
            durationMs: Date.now() - handlerStart 
          });
        } catch (error) {
          logger.error('Shutdown handler failed', { 
            name: handler.name, 
            error: String(error) 
          });
        }
      }
    })();
    
    try {
      await Promise.race([handlersPromise, timeoutPromise]);
      logger.info('Graceful shutdown completed', { 
        durationMs: Date.now() - startTime 
      });
    } catch (error) {
      logger.error('Shutdown timed out, forcing exit', { 
        durationMs: Date.now() - startTime 
      });
    }
    
    // Final exit
    process.exit(0);
  }
}

// Singleton instance
export const shutdownManager = new GracefulShutdownManager();
