/**
 * All-In Equity Calculator v1.0
 * Monte Carlo simulation for real-time equity display
 * 
 * Features:
 * - Fast equity calculation during all-in situations
 * - Progressive refinement (quick estimate -> precise)
 * - Hand vs hand equity
 * - Range vs range (future)
 */

import { evaluateHand, shuffleDeck, SUITS, RANKS } from '../game/PokerEngineV3.js';
import { logger } from './logger.js';

// ==========================================
// TYPES
// ==========================================

export interface EquityResult {
  playerId: string;
  equity: number;           // 0-100 percentage
  winProbability: number;   // Win outright
  tieProbability: number;   // Split pot
  handName?: string;        // Current best hand
  outs?: number;            // Cards that improve hand
}

export interface AllInEquityResult {
  players: EquityResult[];
  simulationCount: number;
  confidence: number;       // 0-1 confidence level
  calculationTimeMs: number;
}

// ==========================================
// EQUITY CALCULATOR
// ==========================================

export class AllInEquityCalculator {
  private readonly MIN_SIMULATIONS = 500;
  private readonly MAX_SIMULATIONS = 10000;
  private readonly TARGET_CONFIDENCE = 0.95;
  private readonly TIME_LIMIT_MS = 500; // Max 500ms for calculation
  
  /**
   * Calculate equity for all-in situation
   */
  calculateEquity(
    players: { playerId: string; holeCards: string[] }[],
    communityCards: string[],
    deadCards: string[] = []
  ): AllInEquityResult {
    const startTime = Date.now();
    
    // Create deck without used cards
    const usedCards = new Set([
      ...communityCards,
      ...deadCards,
      ...players.flatMap(p => p.holeCards)
    ]);
    
    const deck = this.createDeck().filter(card => !usedCards.has(card));
    const cardsNeeded = 5 - communityCards.length;
    
    // If no cards needed, calculate exact equity
    if (cardsNeeded === 0) {
      return this.calculateExactEquity(players, communityCards, startTime);
    }
    
    // Monte Carlo simulation
    const wins = new Map<string, number>();
    const ties = new Map<string, number>();
    
    for (const p of players) {
      wins.set(p.playerId, 0);
      ties.set(p.playerId, 0);
    }
    
    let simulations = 0;
    let lastEquities: number[] = [];
    
    while (simulations < this.MAX_SIMULATIONS) {
      // Check time limit
      if (Date.now() - startTime > this.TIME_LIMIT_MS && simulations >= this.MIN_SIMULATIONS) {
        break;
      }
      
      // Shuffle remaining deck and draw cards
      const shuffled = shuffleDeck(deck, 1);
      const runout = shuffled.slice(0, cardsNeeded);
      const fullBoard = [...communityCards, ...runout];
      
      // Evaluate all hands
      const handResults = players.map(p => ({
        playerId: p.playerId,
        result: evaluateHand(p.holeCards, fullBoard)
      }));
      
      // Find winner(s)
      handResults.sort((a, b) => b.result.value - a.result.value);
      const bestValue = handResults[0].result.value;
      const winners = handResults.filter(h => h.result.value === bestValue);
      
      if (winners.length === 1) {
        wins.set(winners[0].playerId, (wins.get(winners[0].playerId) || 0) + 1);
      } else {
        for (const winner of winners) {
          ties.set(winner.playerId, (ties.get(winner.playerId) || 0) + 1);
        }
      }
      
      simulations++;
      
      // Check convergence every 100 simulations
      if (simulations % 100 === 0 && simulations >= this.MIN_SIMULATIONS) {
        const currentEquities = players.map(p => {
          const w = wins.get(p.playerId) || 0;
          const t = ties.get(p.playerId) || 0;
          return ((w + t * 0.5) / simulations) * 100;
        });
        
        if (lastEquities.length > 0) {
          const maxDelta = Math.max(...currentEquities.map((e, i) => 
            Math.abs(e - lastEquities[i])
          ));
          
          // Converged if max delta < 0.5%
          if (maxDelta < 0.5) {
            break;
          }
        }
        
        lastEquities = currentEquities;
      }
    }
    
    // Calculate final equities
    const results: EquityResult[] = players.map(p => {
      const w = wins.get(p.playerId) || 0;
      const t = ties.get(p.playerId) || 0;
      
      return {
        playerId: p.playerId,
        equity: ((w + t * 0.5) / simulations) * 100,
        winProbability: (w / simulations) * 100,
        tieProbability: (t / simulations) * 100,
        handName: evaluateHand(p.holeCards, communityCards).handName
      };
    });
    
    // Calculate confidence based on sample size
    const confidence = Math.min(1, simulations / this.MAX_SIMULATIONS);
    
    logger.info('Equity calculation complete', {
      players: players.length,
      simulations,
      timeMs: Date.now() - startTime,
      equities: results.map(r => ({ 
        id: r.playerId.substring(0, 8), 
        equity: r.equity.toFixed(1) + '%' 
      }))
    });
    
    return {
      players: results,
      simulationCount: simulations,
      confidence,
      calculationTimeMs: Date.now() - startTime
    };
  }
  
  /**
   * Calculate exact equity when board is complete
   */
  private calculateExactEquity(
    players: { playerId: string; holeCards: string[] }[],
    communityCards: string[],
    startTime: number
  ): AllInEquityResult {
    const handResults = players.map(p => ({
      playerId: p.playerId,
      result: evaluateHand(p.holeCards, communityCards)
    }));
    
    handResults.sort((a, b) => b.result.value - a.result.value);
    const bestValue = handResults[0].result.value;
    const winners = handResults.filter(h => h.result.value === bestValue);
    
    const results: EquityResult[] = players.map(p => {
      const isWinner = winners.some(w => w.playerId === p.playerId);
      const equity = isWinner ? (100 / winners.length) : 0;
      const hand = handResults.find(h => h.playerId === p.playerId);
      
      return {
        playerId: p.playerId,
        equity,
        winProbability: winners.length === 1 && isWinner ? 100 : 0,
        tieProbability: winners.length > 1 && isWinner ? 100 : 0,
        handName: hand?.result.handName
      };
    });
    
    return {
      players: results,
      simulationCount: 1,
      confidence: 1,
      calculationTimeMs: Date.now() - startTime
    };
  }
  
  /**
   * Calculate outs for a player
   */
  calculateOuts(
    holeCards: string[],
    communityCards: string[],
    deadCards: string[] = []
  ): { outs: number; outCards: string[]; improvedHands: string[] } {
    const currentHand = evaluateHand(holeCards, communityCards);
    const currentValue = currentHand.value;
    
    const usedCards = new Set([...holeCards, ...communityCards, ...deadCards]);
    const deck = this.createDeck().filter(card => !usedCards.has(card));
    
    const outCards: string[] = [];
    const improvedHands = new Set<string>();
    
    for (const card of deck) {
      const newBoard = [...communityCards, card];
      const newHand = evaluateHand(holeCards, newBoard);
      
      if (newHand.value > currentValue) {
        outCards.push(card);
        improvedHands.add(newHand.handName);
      }
    }
    
    return {
      outs: outCards.length,
      outCards,
      improvedHands: Array.from(improvedHands)
    };
  }
  
  /**
   * Create standard deck
   */
  private createDeck(): string[] {
    const deck: string[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push(`${rank}${suit}`);
      }
    }
    return deck;
  }
  
  /**
   * Quick heads-up equity calculation
   */
  headsUpEquity(
    hand1: string[],
    hand2: string[],
    board: string[] = []
  ): { hand1Equity: number; hand2Equity: number } {
    const result = this.calculateEquity(
      [
        { playerId: '1', holeCards: hand1 },
        { playerId: '2', holeCards: hand2 }
      ],
      board
    );
    
    return {
      hand1Equity: result.players.find(p => p.playerId === '1')?.equity || 0,
      hand2Equity: result.players.find(p => p.playerId === '2')?.equity || 0
    };
  }
}

// ==========================================
// SINGLETON
// ==========================================

export const allInEquityCalculator = new AllInEquityCalculator();

// ==========================================
// PREFLOP EQUITY LOOKUP TABLE
// ==========================================

// Common preflop matchups for instant lookup
export const PREFLOP_EQUITY_LOOKUP: Record<string, number> = {
  // Pocket pairs vs overcards
  'AA_vs_KK': 81.95,
  'KK_vs_QQ': 81.07,
  'QQ_vs_JJ': 80.78,
  'AA_vs_AKs': 87.23,
  'AA_vs_AKo': 87.44,
  'KK_vs_AKs': 65.98,
  'KK_vs_AKo': 69.17,
  
  // Coin flips
  'AKs_vs_QQ': 46.33,
  'AKo_vs_QQ': 43.12,
  'AKs_vs_JJ': 46.85,
  
  // Dominated hands
  'AKs_vs_AQs': 69.94,
  'AKo_vs_AQo': 73.57,
  'KQs_vs_AKs': 28.23,
  
  // Small pairs vs overcards
  '22_vs_AKs': 52.15,
  '22_vs_AKo': 52.75,
};

/**
 * Get preflop equity from lookup or calculate
 */
export function getPreflopEquity(
  hand1: string[], 
  hand2: string[]
): number | null {
  // Normalize hands for lookup
  const h1 = normalizeHand(hand1);
  const h2 = normalizeHand(hand2);
  
  const key = `${h1}_vs_${h2}`;
  const reverseKey = `${h2}_vs_${h1}`;
  
  if (PREFLOP_EQUITY_LOOKUP[key]) {
    return PREFLOP_EQUITY_LOOKUP[key];
  }
  if (PREFLOP_EQUITY_LOOKUP[reverseKey]) {
    return 100 - PREFLOP_EQUITY_LOOKUP[reverseKey];
  }
  
  return null;
}

function normalizeHand(cards: string[]): string {
  const r1 = cards[0][0];
  const r2 = cards[1][0];
  const suited = cards[0][1] === cards[1][1];
  
  const ranks = 'AKQJT98765432';
  const idx1 = ranks.indexOf(r1);
  const idx2 = ranks.indexOf(r2);
  
  const high = idx1 < idx2 ? r1 : r2;
  const low = idx1 < idx2 ? r2 : r1;
  
  if (high === low) {
    return `${high}${low}`;
  }
  
  return `${high}${low}${suited ? 's' : 'o'}`;
}
