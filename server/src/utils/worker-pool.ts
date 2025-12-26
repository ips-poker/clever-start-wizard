/**
 * Worker Pool Manager
 * Manages pool of worker threads for parallel processing
 * Essential for 300+ table scalability
 */

import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import path from 'path';
import os from 'os';
import { logger } from './logger.js';

interface PendingTask {
  id: string;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  startTime: number;
}

interface WorkerInfo {
  worker: Worker;
  busy: boolean;
  taskCount: number;
  lastActiveTime: number;
  errors: number;
}

interface WorkerPoolConfig {
  workerPath: string;
  minWorkers?: number;
  maxWorkers?: number;
  taskTimeout?: number;
  idleTimeout?: number;
}

export class WorkerPool extends EventEmitter {
  private workers: Map<number, WorkerInfo> = new Map();
  private taskQueue: Array<{
    id: string;
    message: unknown;
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
  }> = [];
  private pendingTasks: Map<string, PendingTask> = new Map();
  private taskIdCounter: number = 0;
  
  private readonly config: Required<WorkerPoolConfig>;
  private readonly cpuCount: number;
  
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isShuttingDown: boolean = false;
  
  // Metrics
  private tasksCompleted: number = 0;
  private tasksFailed: number = 0;
  private totalProcessingTime: number = 0;
  
  constructor(config: WorkerPoolConfig) {
    super();
    this.cpuCount = os.cpus().length;
    
    this.config = {
      workerPath: config.workerPath,
      minWorkers: config.minWorkers ?? Math.max(2, Math.floor(this.cpuCount / 2)),
      maxWorkers: config.maxWorkers ?? this.cpuCount,
      taskTimeout: config.taskTimeout ?? 5000,
      idleTimeout: config.idleTimeout ?? 60000
    };
    
    logger.info('WorkerPool initializing', {
      minWorkers: this.config.minWorkers,
      maxWorkers: this.config.maxWorkers,
      cpuCount: this.cpuCount
    });
    
    // Start minimum workers
    for (let i = 0; i < this.config.minWorkers; i++) {
      this.spawnWorker();
    }
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanupIdleWorkers(), 30000);
  }
  
  /**
   * Spawn a new worker
   */
  private spawnWorker(): Worker | null {
    if (this.workers.size >= this.config.maxWorkers || this.isShuttingDown) {
      return null;
    }
    
    try {
      const worker = new Worker(this.config.workerPath);
      const workerId = worker.threadId;
      
      const workerInfo: WorkerInfo = {
        worker,
        busy: false,
        taskCount: 0,
        lastActiveTime: Date.now(),
        errors: 0
      };
      
      worker.on('message', (message) => {
        if (message.type === 'ready') {
          logger.info('Worker ready', { workerId });
          return;
        }
        
        this.handleWorkerMessage(workerId, message);
      });
      
      worker.on('error', (error) => {
        logger.error('Worker error', { workerId, error: String(error) });
        workerInfo.errors++;
        
        // Respawn if too many errors
        if (workerInfo.errors > 5) {
          this.removeWorker(workerId);
          if (this.workers.size < this.config.minWorkers) {
            this.spawnWorker();
          }
        }
      });
      
      worker.on('exit', (code) => {
        logger.warn('Worker exited', { workerId, code });
        this.removeWorker(workerId);
        
        // Respawn if needed
        if (!this.isShuttingDown && this.workers.size < this.config.minWorkers) {
          setTimeout(() => this.spawnWorker(), 1000);
        }
      });
      
      this.workers.set(workerId, workerInfo);
      logger.info('Worker spawned', { workerId, totalWorkers: this.workers.size });
      
      return worker;
    } catch (error) {
      logger.error('Failed to spawn worker', { error: String(error) });
      return null;
    }
  }
  
  /**
   * Remove a worker
   */
  private removeWorker(workerId: number): void {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo) return;
    
    try {
      workerInfo.worker.terminate();
    } catch (e) {
      // Ignore termination errors
    }
    
    this.workers.delete(workerId);
  }
  
  /**
   * Handle message from worker
   */
  private handleWorkerMessage(workerId: number, message: { id: string; success: boolean; result?: unknown; error?: string; processingTimeMs?: number }): void {
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.busy = false;
      workerInfo.lastActiveTime = Date.now();
    }
    
    const pendingTask = this.pendingTasks.get(message.id);
    if (!pendingTask) {
      logger.warn('Received response for unknown task', { taskId: message.id });
      return;
    }
    
    clearTimeout(pendingTask.timeout);
    this.pendingTasks.delete(message.id);
    
    const processingTime = Date.now() - pendingTask.startTime;
    this.totalProcessingTime += processingTime;
    
    if (message.success) {
      this.tasksCompleted++;
      pendingTask.resolve(message.result);
    } else {
      this.tasksFailed++;
      pendingTask.reject(new Error(message.error || 'Unknown error'));
    }
    
    // Process next task in queue
    this.processQueue();
  }
  
  /**
   * Execute a task on a worker
   */
  async execute<T>(type: string, data: unknown): Promise<T> {
    if (this.isShuttingDown) {
      throw new Error('Worker pool is shutting down');
    }
    
    const taskId = `task_${++this.taskIdCounter}`;
    const message = { id: taskId, type, data };
    
    return new Promise<T>((resolve, reject) => {
      // Find available worker
      const worker = this.getAvailableWorker();
      
      if (worker) {
        this.sendToWorker(worker, taskId, message, resolve as (result: unknown) => void, reject);
      } else {
        // Queue the task
        this.taskQueue.push({
          id: taskId,
          message,
          resolve: resolve as (result: unknown) => void,
          reject
        });
        
        // Try to spawn more workers if needed
        if (this.workers.size < this.config.maxWorkers) {
          this.spawnWorker();
        }
      }
    });
  }
  
  /**
   * Get an available worker
   */
  private getAvailableWorker(): WorkerInfo | null {
    for (const workerInfo of this.workers.values()) {
      if (!workerInfo.busy) {
        return workerInfo;
      }
    }
    return null;
  }
  
  /**
   * Send task to worker
   */
  private sendToWorker(
    workerInfo: WorkerInfo,
    taskId: string,
    message: unknown,
    resolve: (result: unknown) => void,
    reject: (error: Error) => void
  ): void {
    workerInfo.busy = true;
    workerInfo.taskCount++;
    
    const timeout = setTimeout(() => {
      this.pendingTasks.delete(taskId);
      this.tasksFailed++;
      reject(new Error('Task timeout'));
      workerInfo.busy = false;
      workerInfo.errors++;
    }, this.config.taskTimeout);
    
    this.pendingTasks.set(taskId, {
      id: taskId,
      resolve,
      reject,
      timeout,
      startTime: Date.now()
    });
    
    workerInfo.worker.postMessage(message);
  }
  
  /**
   * Process queued tasks
   */
  private processQueue(): void {
    while (this.taskQueue.length > 0) {
      const worker = this.getAvailableWorker();
      if (!worker) break;
      
      const task = this.taskQueue.shift()!;
      this.sendToWorker(worker, task.id, task.message, task.resolve, task.reject);
    }
  }
  
  /**
   * Cleanup idle workers beyond minimum
   */
  private cleanupIdleWorkers(): void {
    const now = Date.now();
    
    for (const [workerId, workerInfo] of this.workers) {
      if (
        this.workers.size > this.config.minWorkers &&
        !workerInfo.busy &&
        now - workerInfo.lastActiveTime > this.config.idleTimeout
      ) {
        logger.info('Terminating idle worker', { workerId });
        this.removeWorker(workerId);
      }
    }
  }
  
  /**
   * Get pool statistics
   */
  getStats(): {
    activeWorkers: number;
    busyWorkers: number;
    queuedTasks: number;
    pendingTasks: number;
    tasksCompleted: number;
    tasksFailed: number;
    avgProcessingTime: number;
  } {
    let busyWorkers = 0;
    for (const workerInfo of this.workers.values()) {
      if (workerInfo.busy) busyWorkers++;
    }
    
    return {
      activeWorkers: this.workers.size,
      busyWorkers,
      queuedTasks: this.taskQueue.length,
      pendingTasks: this.pendingTasks.size,
      tasksCompleted: this.tasksCompleted,
      tasksFailed: this.tasksFailed,
      avgProcessingTime: this.tasksCompleted > 0 
        ? Math.round(this.totalProcessingTime / this.tasksCompleted)
        : 0
    };
  }
  
  /**
   * Shutdown pool
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Reject queued tasks
    for (const task of this.taskQueue) {
      task.reject(new Error('Worker pool shutting down'));
    }
    this.taskQueue = [];
    
    // Clear pending timeouts
    for (const pending of this.pendingTasks.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Worker pool shutting down'));
    }
    this.pendingTasks.clear();
    
    // Terminate all workers
    const terminations = [];
    for (const [workerId, workerInfo] of this.workers) {
      terminations.push(
        new Promise<void>((resolve) => {
          workerInfo.worker.once('exit', () => resolve());
          workerInfo.worker.terminate();
        })
      );
    }
    
    await Promise.all(terminations);
    this.workers.clear();
    
    logger.info('Worker pool shutdown complete');
  }
}

// Singleton instance for hand evaluation
let handEvaluatorPool: WorkerPool | null = null;

export function getHandEvaluatorPool(): WorkerPool {
  if (!handEvaluatorPool) {
    const workerPath = path.join(process.cwd(), 'dist', 'workers', 'hand-evaluator.worker.js');
    handEvaluatorPool = new WorkerPool({
      workerPath,
      minWorkers: 2,
      maxWorkers: Math.max(4, os.cpus().length),
      taskTimeout: 3000
    });
  }
  return handEvaluatorPool;
}

export async function shutdownWorkerPools(): Promise<void> {
  if (handEvaluatorPool) {
    await handEvaluatorPool.shutdown();
    handEvaluatorPool = null;
  }
}
