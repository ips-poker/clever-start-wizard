/**
 * Hand Archiver - Batch processing for completed hands
 * Reduces database writes and optimizes storage for 300+ tables
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger.js';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

interface HandData {
  handId: string;
  tableId: string;
  handNumber: number;
  startedAt: number;
  completedAt: number;
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  communityCards: string[];
  pot: number;
  sidePots: { amount: number; eligiblePlayers: string[] }[];
  winners: { playerId: string; amount: number; handName: string }[];
  players: {
    playerId: string;
    seatNumber: number;
    stackStart: number;
    stackEnd: number;
    holeCards: string[];
    isFolded: boolean;
    isAllIn: boolean;
    wonAmount: number;
  }[];
  actions: {
    phase: string;
    playerId: string;
    action: string;
    amount: number;
    timestamp: number;
  }[];
}

interface ArchivedHandsBatch {
  tableId: string;
  startTime: number;
  endTime: number;
  handCount: number;
  compressedData: Buffer;
  checksum: string;
}

export class HandArchiver {
  private pendingHands: Map<string, HandData[]> = new Map();
  private supabase: SupabaseClient;
  
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private readonly compressionEnabled: boolean;
  
  private flushInterval: NodeJS.Timeout | null = null;
  private isShuttingDown: boolean = false;
  
  // Metrics
  private handsArchived: number = 0;
  private batchesWritten: number = 0;
  private bytesWritten: number = 0;
  private bytesSaved: number = 0;
  
  constructor(
    supabase: SupabaseClient,
    options: {
      batchSize?: number;
      flushIntervalMs?: number;
      compressionEnabled?: boolean;
    } = {}
  ) {
    this.supabase = supabase;
    this.batchSize = options.batchSize ?? 50;
    this.flushIntervalMs = options.flushIntervalMs ?? 30000;
    this.compressionEnabled = options.compressionEnabled ?? true;
    
    // Start flush interval
    this.flushInterval = setInterval(() => {
      this.flushAllTables();
    }, this.flushIntervalMs);
    
    logger.info('HandArchiver initialized', {
      batchSize: this.batchSize,
      flushIntervalMs: this.flushIntervalMs,
      compressionEnabled: this.compressionEnabled
    });
  }
  
  /**
   * Add a completed hand to the archive queue
   */
  addHand(hand: HandData): void {
    if (this.isShuttingDown) {
      logger.warn('HandArchiver is shutting down, hand not queued');
      return;
    }
    
    let tableHands = this.pendingHands.get(hand.tableId);
    if (!tableHands) {
      tableHands = [];
      this.pendingHands.set(hand.tableId, tableHands);
    }
    
    tableHands.push(hand);
    
    // Auto-flush if batch size reached
    if (tableHands.length >= this.batchSize) {
      this.flushTable(hand.tableId);
    }
  }
  
  /**
   * Create hand data from game state
   */
  createHandData(
    handId: string,
    tableId: string,
    handNumber: number,
    gameState: {
      startedAt: number;
      dealerSeat: number;
      smallBlindSeat: number;
      bigBlindSeat: number;
      smallBlind: number;
      bigBlind: number;
      ante: number;
      communityCards: string[];
      pot: number;
      sidePots: { amount: number; eligiblePlayers: string[] }[];
      winners: { playerId: string; amount: number; handName: string }[];
    },
    players: {
      playerId: string;
      seatNumber: number;
      stackStart: number;
      stackEnd: number;
      holeCards: string[];
      isFolded: boolean;
      isAllIn: boolean;
      wonAmount: number;
    }[],
    actions: {
      phase: string;
      playerId: string;
      action: string;
      amount: number;
      timestamp: number;
    }[]
  ): HandData {
    return {
      handId,
      tableId,
      handNumber,
      startedAt: gameState.startedAt,
      completedAt: Date.now(),
      dealerSeat: gameState.dealerSeat,
      smallBlindSeat: gameState.smallBlindSeat,
      bigBlindSeat: gameState.bigBlindSeat,
      smallBlind: gameState.smallBlind,
      bigBlind: gameState.bigBlind,
      ante: gameState.ante,
      communityCards: gameState.communityCards,
      pot: gameState.pot,
      sidePots: gameState.sidePots,
      winners: gameState.winners,
      players,
      actions
    };
  }
  
  /**
   * Flush hands for a specific table
   */
  async flushTable(tableId: string): Promise<void> {
    const hands = this.pendingHands.get(tableId);
    if (!hands || hands.length === 0) return;
    
    // Clear the pending hands immediately
    this.pendingHands.delete(tableId);
    
    try {
      await this.writeBatch(tableId, hands);
    } catch (error) {
      logger.error('Failed to flush table hands', {
        tableId,
        handCount: hands.length,
        error: String(error)
      });
      
      // Re-queue hands on failure (with limit to prevent infinite growth)
      if (!this.isShuttingDown && hands.length < this.batchSize * 3) {
        const existing = this.pendingHands.get(tableId) || [];
        this.pendingHands.set(tableId, [...hands, ...existing]);
      }
    }
  }
  
  /**
   * Flush all tables
   */
  async flushAllTables(): Promise<void> {
    const tableIds = Array.from(this.pendingHands.keys());
    
    await Promise.all(
      tableIds.map(tableId => this.flushTable(tableId))
    );
  }
  
  /**
   * Write a batch of hands to the database
   */
  private async writeBatch(tableId: string, hands: HandData[]): Promise<void> {
    if (hands.length === 0) return;
    
    const startTime = Date.now();
    const startTimestamp = Math.min(...hands.map(h => h.startedAt));
    const endTimestamp = Math.max(...hands.map(h => h.completedAt));
    
    // Serialize hands
    const jsonData = JSON.stringify(hands);
    const originalSize = Buffer.byteLength(jsonData, 'utf8');
    
    let dataToStore: Buffer | string = jsonData;
    let isCompressed = false;
    
    // Compress if enabled
    if (this.compressionEnabled) {
      const compressed = await gzip(Buffer.from(jsonData, 'utf8'));
      if (compressed.length < originalSize * 0.9) {
        dataToStore = compressed;
        isCompressed = true;
        this.bytesSaved += originalSize - compressed.length;
      }
    }
    
    const dataSize = Buffer.isBuffer(dataToStore) ? dataToStore.length : Buffer.byteLength(dataToStore as string, 'utf8');
    
    // Calculate checksum
    const crypto = await import('crypto');
    const checksum = crypto.createHash('md5').update(dataToStore).digest('hex');
    
    // Write individual hands to poker_hands table for recent access
    for (const hand of hands) {
      try {
        // Update existing hand record with completion data
        await this.supabase
          .from('poker_hands')
          .update({
            completed_at: new Date(hand.completedAt).toISOString(),
            community_cards: hand.communityCards,
            pot: hand.pot,
            side_pots: hand.sidePots,
            winners: hand.winners
          })
          .eq('id', hand.handId);
        
        // Save hand players
        const handPlayers = hand.players.map(p => ({
          hand_id: hand.handId,
          player_id: p.playerId,
          seat_number: p.seatNumber,
          stack_start: p.stackStart,
          stack_end: p.stackEnd,
          hole_cards: p.holeCards,
          is_folded: p.isFolded,
          is_all_in: p.isAllIn,
          won_amount: p.wonAmount
        }));
        
        if (handPlayers.length > 0) {
          await this.supabase
            .from('poker_hand_players')
            .upsert(handPlayers, { onConflict: 'hand_id,player_id' });
        }
        
        // Save actions in batches
        if (hand.actions.length > 0) {
          const actions = hand.actions.map((a, idx) => ({
            hand_id: hand.handId,
            player_id: a.playerId,
            phase: a.phase,
            action_type: a.action,
            amount: a.amount,
            action_order: idx,
            seat_number: hand.players.find(p => p.playerId === a.playerId)?.seatNumber || 0
          }));
          
          await this.supabase
            .from('poker_actions')
            .upsert(actions, { onConflict: 'hand_id,action_order' });
        }
      } catch (error) {
        logger.warn('Failed to save individual hand', {
          handId: hand.handId,
          error: String(error)
        });
      }
    }
    
    // Update metrics
    this.handsArchived += hands.length;
    this.batchesWritten++;
    this.bytesWritten += dataSize;
    
    const processingTime = Date.now() - startTime;
    
    logger.info('Hand batch archived', {
      tableId,
      handCount: hands.length,
      originalSize,
      compressedSize: isCompressed ? dataSize : originalSize,
      compressionRatio: isCompressed ? Math.round((1 - dataSize / originalSize) * 100) : 0,
      processingTimeMs: processingTime
    });
  }
  
  /**
   * Decompress archived hands
   */
  async decompressHands(compressedData: Buffer): Promise<HandData[]> {
    const decompressed = await gunzip(compressedData);
    return JSON.parse(decompressed.toString('utf8'));
  }
  
  /**
   * Get archiver statistics
   */
  getStats(): {
    pendingHands: number;
    pendingTables: number;
    handsArchived: number;
    batchesWritten: number;
    bytesWritten: number;
    bytesSaved: number;
    compressionSavings: number;
  } {
    let pendingHands = 0;
    for (const hands of this.pendingHands.values()) {
      pendingHands += hands.length;
    }
    
    return {
      pendingHands,
      pendingTables: this.pendingHands.size,
      handsArchived: this.handsArchived,
      batchesWritten: this.batchesWritten,
      bytesWritten: this.bytesWritten,
      bytesSaved: this.bytesSaved,
      compressionSavings: this.bytesWritten > 0 
        ? Math.round((this.bytesSaved / (this.bytesWritten + this.bytesSaved)) * 100)
        : 0
    };
  }
  
  /**
   * Cleanup old archived hands
   */
  async cleanupOldHands(maxAgeHours: number = 24): Promise<number> {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();
    
    try {
      // Delete old actions first (FK constraint)
      const { data: oldHands } = await this.supabase
        .from('poker_hands')
        .select('id')
        .not('completed_at', 'is', null)
        .lt('completed_at', cutoffTime);
      
      if (!oldHands || oldHands.length === 0) {
        return 0;
      }
      
      const handIds = oldHands.map(h => h.id);
      
      // Delete in batches
      const batchSize = 100;
      for (let i = 0; i < handIds.length; i += batchSize) {
        const batch = handIds.slice(i, i + batchSize);
        
        await this.supabase
          .from('poker_actions')
          .delete()
          .in('hand_id', batch);
        
        await this.supabase
          .from('poker_hand_players')
          .delete()
          .in('hand_id', batch);
        
        await this.supabase
          .from('poker_hands')
          .delete()
          .in('id', batch);
      }
      
      logger.info('Cleaned up old hands', {
        deletedCount: handIds.length,
        maxAgeHours
      });
      
      return handIds.length;
    } catch (error) {
      logger.error('Failed to cleanup old hands', { error: String(error) });
      return 0;
    }
  }
  
  /**
   * Shutdown archiver gracefully
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Flush all remaining hands
    await this.flushAllTables();
    
    logger.info('HandArchiver shutdown complete', this.getStats());
  }
}

// Singleton instance
let archiverInstance: HandArchiver | null = null;

export function getHandArchiver(supabase: SupabaseClient): HandArchiver {
  if (!archiverInstance) {
    archiverInstance = new HandArchiver(supabase, {
      batchSize: 50,
      flushIntervalMs: 30000,
      compressionEnabled: true
    });
  }
  return archiverInstance;
}

export async function shutdownHandArchiver(): Promise<void> {
  if (archiverInstance) {
    await archiverInstance.shutdown();
    archiverInstance = null;
  }
}
