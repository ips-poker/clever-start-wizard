/**
 * Parallel Showdown Processor
 * Offloads hand evaluation to worker pool for 300+ table scalability
 */

import { getHandEvaluatorPool } from './worker-pool.js';
import { logger } from './logger.js';

// ==========================================
// TYPES
// ==========================================

export interface ShowdownPlayer {
  playerId: string;
  holeCards: [string, string];
  isAllIn: boolean;
  contribution: number; // Amount contributed to pot
}

export interface ShowdownResult {
  playerId: string;
  rank: number;
  handName: string;
  bestCards: string[];
  tiebreakers: number[];
  winAmount: number;
  isWinner: boolean;
  isSplit: boolean;
}

export interface PotWinner {
  playerId: string;
  amount: number;
}

export interface ShowdownOutcome {
  results: ShowdownResult[];
  potDistribution: PotWinner[];
  processingTimeMs: number;
}

// ==========================================
// PARALLEL SHOWDOWN PROCESSOR
// ==========================================

class ParallelShowdownProcessor {
  private processingCount: number = 0;
  private totalProcessed: number = 0;
  private totalTimeMs: number = 0;
  
  /**
   * Process showdown for multiple players in parallel
   */
  async processShowdown(
    players: ShowdownPlayer[],
    communityCards: string[],
    mainPot: number,
    sidePots: Array<{ amount: number; eligiblePlayers: string[] }> = []
  ): Promise<ShowdownOutcome> {
    const startTime = performance.now();
    this.processingCount++;
    
    try {
      // Prepare hands for batch evaluation
      const hands = players.map(player => ({
        playerId: player.playerId,
        holeCards: player.holeCards,
        communityCards
      }));
      
      // Use worker pool for parallel evaluation
      const pool = getHandEvaluatorPool();
      const evaluationResults = await pool.execute<Array<{
        playerId: string;
        rank: number;
        name: string;
        tiebreakers: number[];
        bestCards: string[];
      }>>('evaluate_batch', { hands });
      
      // Calculate pot distribution
      const potDistribution = this.calculatePotDistribution(
        evaluationResults,
        players,
        mainPot,
        sidePots
      );
      
      // Build final results
      const results: ShowdownResult[] = evaluationResults.map(eval => {
        const winnings = potDistribution.filter(w => w.playerId === eval.playerId);
        const totalWin = winnings.reduce((sum, w) => sum + w.amount, 0);
        
        return {
          playerId: eval.playerId,
          rank: eval.rank,
          handName: eval.name,
          bestCards: eval.bestCards,
          tiebreakers: eval.tiebreakers,
          winAmount: totalWin,
          isWinner: totalWin > 0,
          isSplit: winnings.length > 1 || 
            potDistribution.filter(w => w.amount === totalWin).length > 1
        };
      });
      
      const processingTime = performance.now() - startTime;
      this.totalTimeMs += processingTime;
      this.totalProcessed++;
      
      return {
        results,
        potDistribution,
        processingTimeMs: processingTime
      };
    } finally {
      this.processingCount--;
    }
  }
  
  /**
   * Calculate pot distribution including side pots
   */
  private calculatePotDistribution(
    evaluations: Array<{
      playerId: string;
      rank: number;
      tiebreakers: number[];
    }>,
    players: ShowdownPlayer[],
    mainPot: number,
    sidePots: Array<{ amount: number; eligiblePlayers: string[] }>
  ): PotWinner[] {
    const distribution: PotWinner[] = [];
    
    // Process main pot
    const mainPotWinners = this.findWinners(evaluations, players.map(p => p.playerId));
    const mainShare = Math.floor(mainPot / mainPotWinners.length);
    const mainRemainder = mainPot % mainPotWinners.length;
    
    mainPotWinners.forEach((winnerId, index) => {
      distribution.push({
        playerId: winnerId,
        amount: mainShare + (index === 0 ? mainRemainder : 0)
      });
    });
    
    // Process side pots
    for (const sidePot of sidePots) {
      const eligibleEvals = evaluations.filter(e => 
        sidePot.eligiblePlayers.includes(e.playerId)
      );
      
      if (eligibleEvals.length === 0) continue;
      
      const sidePotWinners = this.findWinners(eligibleEvals, sidePot.eligiblePlayers);
      const sideShare = Math.floor(sidePot.amount / sidePotWinners.length);
      const sideRemainder = sidePot.amount % sidePotWinners.length;
      
      sidePotWinners.forEach((winnerId, index) => {
        const existing = distribution.find(d => d.playerId === winnerId);
        const amount = sideShare + (index === 0 ? sideRemainder : 0);
        
        if (existing) {
          existing.amount += amount;
        } else {
          distribution.push({ playerId: winnerId, amount });
        }
      });
    }
    
    return distribution;
  }
  
  /**
   * Find winners from evaluation results
   */
  private findWinners(
    evaluations: Array<{
      playerId: string;
      rank: number;
      tiebreakers: number[];
    }>,
    eligiblePlayers: string[]
  ): string[] {
    const eligible = evaluations.filter(e => eligiblePlayers.includes(e.playerId));
    if (eligible.length === 0) return [];
    
    // Sort by hand strength (already sorted from worker)
    eligible.sort((a, b) => {
      if (b.rank !== a.rank) return b.rank - a.rank;
      for (let i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
        const diff = (b.tiebreakers[i] || 0) - (a.tiebreakers[i] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });
    
    // Find all players with the best hand
    const best = eligible[0];
    const winners: string[] = [best.playerId];
    
    for (let i = 1; i < eligible.length; i++) {
      const player = eligible[i];
      if (player.rank !== best.rank) break;
      
      // Check tiebreakers
      let isTied = true;
      for (let j = 0; j < best.tiebreakers.length; j++) {
        if ((player.tiebreakers[j] || 0) !== (best.tiebreakers[j] || 0)) {
          isTied = false;
          break;
        }
      }
      
      if (isTied) {
        winners.push(player.playerId);
      } else {
        break;
      }
    }
    
    return winners;
  }
  
  /**
   * Quick compare two hands (for single comparison)
   */
  async compareHands(
    hand1: [string, string],
    hand2: [string, string],
    communityCards: string[]
  ): Promise<{ winner: 1 | 2 | 0; hand1Name: string; hand2Name: string }> {
    const pool = getHandEvaluatorPool();
    
    const result = await pool.execute<{
      winner: 1 | 2 | 0;
      hand1: { name: string };
      hand2: { name: string };
    }>('compare_hands', {
      hand1,
      hand2,
      communityCards
    });
    
    return {
      winner: result.winner,
      hand1Name: result.hand1.name,
      hand2Name: result.hand2.name
    };
  }
  
  /**
   * Get processor statistics
   */
  getStats(): {
    currentlyProcessing: number;
    totalProcessed: number;
    avgProcessingTimeMs: number;
  } {
    return {
      currentlyProcessing: this.processingCount,
      totalProcessed: this.totalProcessed,
      avgProcessingTimeMs: this.totalProcessed > 0 
        ? Math.round(this.totalTimeMs / this.totalProcessed) 
        : 0
    };
  }
}

// Singleton instance
export const showdownProcessor = new ParallelShowdownProcessor();

/**
 * Process multiple showdowns in parallel (for tournament batch processing)
 */
export async function processMultipleShowdowns(
  showdowns: Array<{
    tableId: string;
    players: ShowdownPlayer[];
    communityCards: string[];
    mainPot: number;
    sidePots?: Array<{ amount: number; eligiblePlayers: string[] }>;
  }>
): Promise<Map<string, ShowdownOutcome>> {
  const startTime = performance.now();
  
  // Process all showdowns in parallel
  const results = await Promise.all(
    showdowns.map(async (showdown) => {
      const outcome = await showdownProcessor.processShowdown(
        showdown.players,
        showdown.communityCards,
        showdown.mainPot,
        showdown.sidePots || []
      );
      return { tableId: showdown.tableId, outcome };
    })
  );
  
  // Build result map
  const resultMap = new Map<string, ShowdownOutcome>();
  for (const { tableId, outcome } of results) {
    resultMap.set(tableId, outcome);
  }
  
  logger.debug('Batch showdown processing complete', {
    tablesProcessed: showdowns.length,
    totalTimeMs: performance.now() - startTime
  });
  
  return resultMap;
}
