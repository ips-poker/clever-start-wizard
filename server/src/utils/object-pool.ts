/**
 * Object Pool - Memory optimization for high-frequency objects
 * Reduces GC pressure for 300+ tables with thousands of hands
 */

import { logger } from './logger.js';

/**
 * Generic object pool implementation
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;
  
  private created: number = 0;
  private acquired: number = 0;
  private released: number = 0;
  
  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    options: { initialSize?: number; maxSize?: number } = {}
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = options.maxSize ?? 1000;
    
    // Pre-populate pool
    const initialSize = options.initialSize ?? 0;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
      this.created++;
    }
  }
  
  /**
   * Acquire an object from pool or create new one
   */
  acquire(): T {
    this.acquired++;
    
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    
    this.created++;
    return this.createFn();
  }
  
  /**
   * Release object back to pool
   */
  release(obj: T): void {
    this.released++;
    
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj);
      this.pool.push(obj);
    }
    // If pool is full, object will be garbage collected
  }
  
  /**
   * Get pool statistics
   */
  getStats(): { poolSize: number; created: number; acquired: number; released: number; hitRate: number } {
    const reused = this.acquired - this.created;
    const hitRate = this.acquired > 0 ? (reused / this.acquired) * 100 : 0;
    
    return {
      poolSize: this.pool.length,
      created: this.created,
      acquired: this.acquired,
      released: this.released,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }
  
  /**
   * Clear the pool
   */
  clear(): void {
    this.pool = [];
  }
}

// ==========================================
// SPECIALIZED POOLS
// ==========================================

/**
 * Card array pool - for hole cards, community cards
 */
interface CardArray {
  cards: string[];
}

export const cardArrayPool = new ObjectPool<CardArray>(
  () => ({ cards: [] }),
  (obj) => { obj.cards.length = 0; },
  { initialSize: 100, maxSize: 500 }
);

/**
 * Player state pool - for hand player states
 */
interface PooledPlayerState {
  id: string;
  seatNumber: number;
  stack: number;
  betAmount: number;
  holeCards: string[];
  isFolded: boolean;
  isAllIn: boolean;
}

export const playerStatePool = new ObjectPool<PooledPlayerState>(
  () => ({
    id: '',
    seatNumber: 0,
    stack: 0,
    betAmount: 0,
    holeCards: [],
    isFolded: false,
    isAllIn: false
  }),
  (obj) => {
    obj.id = '';
    obj.seatNumber = 0;
    obj.stack = 0;
    obj.betAmount = 0;
    obj.holeCards.length = 0;
    obj.isFolded = false;
    obj.isAllIn = false;
  },
  { initialSize: 200, maxSize: 1000 }
);

/**
 * Action result pool
 */
interface PooledActionResult {
  success: boolean;
  error?: string;
  action?: string;
  amount?: number;
  pot?: number;
  nextPlayerSeat?: number | null;
}

export const actionResultPool = new ObjectPool<PooledActionResult>(
  () => ({ success: false }),
  (obj) => {
    obj.success = false;
    delete obj.error;
    delete obj.action;
    delete obj.amount;
    delete obj.pot;
    delete obj.nextPlayerSeat;
  },
  { initialSize: 100, maxSize: 500 }
);

/**
 * Side pot pool
 */
interface PooledSidePot {
  amount: number;
  eligiblePlayers: string[];
  cappedAt: number;
}

export const sidePotPool = new ObjectPool<PooledSidePot>(
  () => ({ amount: 0, eligiblePlayers: [], cappedAt: 0 }),
  (obj) => {
    obj.amount = 0;
    obj.eligiblePlayers.length = 0;
    obj.cappedAt = 0;
  },
  { initialSize: 50, maxSize: 200 }
);

/**
 * Deck pool - for shuffled decks
 */
interface PooledDeck {
  cards: string[];
}

export const deckPool = new ObjectPool<PooledDeck>(
  () => ({ cards: new Array(52) }),
  (obj) => {
    // Reset cards array - actual card values will be overwritten
    obj.cards.length = 52;
  },
  { initialSize: 50, maxSize: 300 }
);

/**
 * Hand history entry pool
 */
interface PooledHandHistoryEntry {
  phase: string;
  playerId: string;
  action: string;
  amount: number;
  pot: number;
  timestamp: number;
}

export const handHistoryPool = new ObjectPool<PooledHandHistoryEntry>(
  () => ({
    phase: '',
    playerId: '',
    action: '',
    amount: 0,
    pot: 0,
    timestamp: 0
  }),
  (obj) => {
    obj.phase = '';
    obj.playerId = '';
    obj.action = '';
    obj.amount = 0;
    obj.pot = 0;
    obj.timestamp = 0;
  },
  { initialSize: 500, maxSize: 2000 }
);

/**
 * WebSocket message pool
 */
interface PooledWSMessage {
  type: string;
  tableId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export const wsMessagePool = new ObjectPool<PooledWSMessage>(
  () => ({
    type: '',
    tableId: '',
    data: {},
    timestamp: 0
  }),
  (obj) => {
    obj.type = '';
    obj.tableId = '';
    // Clear data object without creating new reference
    for (const key in obj.data) {
      delete obj.data[key];
    }
    obj.timestamp = 0;
  },
  { initialSize: 200, maxSize: 1000 }
);

/**
 * Get all pool statistics
 */
export function getAllPoolStats(): Record<string, ReturnType<ObjectPool<unknown>['getStats']>> {
  return {
    cardArrayPool: cardArrayPool.getStats(),
    playerStatePool: playerStatePool.getStats(),
    actionResultPool: actionResultPool.getStats(),
    sidePotPool: sidePotPool.getStats(),
    deckPool: deckPool.getStats(),
    handHistoryPool: handHistoryPool.getStats(),
    wsMessagePool: wsMessagePool.getStats()
  };
}

/**
 * Clear all pools (useful for testing or memory cleanup)
 */
export function clearAllPools(): void {
  cardArrayPool.clear();
  playerStatePool.clear();
  actionResultPool.clear();
  sidePotPool.clear();
  deckPool.clear();
  handHistoryPool.clear();
  wsMessagePool.clear();
  
  logger.info('All object pools cleared');
}
