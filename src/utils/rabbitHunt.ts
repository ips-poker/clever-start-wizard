/**
 * Rabbit Hunt & Run It Multiple Times
 * Professional poker feature implementation
 */

import { Card, createDeck, shuffleDeckSecure, evaluateHand, formatCard } from './pokerEngine';

export interface RabbitHuntResult {
  remainingCards: Card[];
  wouldHaveWon: boolean;
  bestHand: string;
  handRank: number;
  description: string;
}

export interface RunItTwiceResult {
  run1: {
    communityCards: Card[];
    winners: string[];
    bestHand: string;
  };
  run2: {
    communityCards: Card[];
    winners: string[];
    bestHand: string;
  };
  combinedResult: {
    splitPot: boolean;
    run1Winner: string;
    run2Winner: string;
  };
}

export interface RunItThreeResult extends RunItTwiceResult {
  run3: {
    communityCards: Card[];
    winners: string[];
    bestHand: string;
  };
}

/**
 * Perform rabbit hunt - reveal what cards would have come
 */
export function rabbitHunt(
  foldedPlayerCards: Card[],
  communityCards: Card[],
  usedCards: Card[], // All cards that were dealt (to players still in hand)
  cardsToReveal: number = 5 - communityCards.length
): RabbitHuntResult {
  // Create deck without used cards
  const deck = createDeck();
  const usedCardIds = new Set([
    ...foldedPlayerCards.map(c => c.id),
    ...communityCards.map(c => c.id),
    ...usedCards.map(c => c.id)
  ]);
  
  const remainingDeck = deck.filter(c => !usedCardIds.has(c.id));
  const shuffled = shuffleDeckSecure(remainingDeck);
  
  // Draw remaining community cards
  const remainingCards = shuffled.slice(0, cardsToReveal);
  const fullBoard = [...communityCards, ...remainingCards];
  
  // Evaluate what hand the folded player would have made
  const fullHand = [...foldedPlayerCards, ...fullBoard];
  const evaluation = evaluateHand(fullHand);
  
  // Determine if they would have won (simplified - assumes they beat median hand)
  const wouldHaveWon = evaluation.rank >= 3; // At least trips or better
  
  return {
    remainingCards,
    wouldHaveWon,
    bestHand: evaluation.name,
    handRank: evaluation.rank,
    description: `${evaluation.name}: ${evaluation.cards.map(formatCard).join(' ')}`
  };
}

/**
 * Run it twice - deal two complete boards
 */
export function runItTwice(
  playersCards: Map<string, Card[]>,
  currentCommunityCards: Card[],
  pot: number
): RunItTwiceResult {
  // Create deck without used cards
  const deck = createDeck();
  const usedCardIds = new Set<string>();
  
  for (const [, cards] of playersCards) {
    cards.forEach(c => usedCardIds.add(c.id));
  }
  currentCommunityCards.forEach(c => usedCardIds.add(c.id));
  
  const remainingDeck = deck.filter(c => !usedCardIds.has(c.id));
  const shuffled = shuffleDeckSecure(remainingDeck);
  
  const cardsNeeded = 5 - currentCommunityCards.length;
  
  // Run 1
  const run1Cards = shuffled.slice(0, cardsNeeded);
  const run1Board = [...currentCommunityCards, ...run1Cards];
  const run1Result = evaluateAllPlayers(playersCards, run1Board);
  
  // Run 2 - use different cards
  const run2Cards = shuffled.slice(cardsNeeded, cardsNeeded * 2);
  const run2Board = [...currentCommunityCards, ...run2Cards];
  const run2Result = evaluateAllPlayers(playersCards, run2Board);
  
  const splitPot = run1Result.winners[0] !== run2Result.winners[0];
  
  return {
    run1: {
      communityCards: run1Board,
      winners: run1Result.winners,
      bestHand: run1Result.bestHand
    },
    run2: {
      communityCards: run2Board,
      winners: run2Result.winners,
      bestHand: run2Result.bestHand
    },
    combinedResult: {
      splitPot,
      run1Winner: run1Result.winners[0],
      run2Winner: run2Result.winners[0]
    }
  };
}

/**
 * Run it three times - deal three complete boards (for big pots)
 */
export function runItThree(
  playersCards: Map<string, Card[]>,
  currentCommunityCards: Card[],
  pot: number
): RunItThreeResult {
  const deck = createDeck();
  const usedCardIds = new Set<string>();
  
  for (const [, cards] of playersCards) {
    cards.forEach(c => usedCardIds.add(c.id));
  }
  currentCommunityCards.forEach(c => usedCardIds.add(c.id));
  
  const remainingDeck = deck.filter(c => !usedCardIds.has(c.id));
  const shuffled = shuffleDeckSecure(remainingDeck);
  
  const cardsNeeded = 5 - currentCommunityCards.length;
  
  // Run 1
  const run1Cards = shuffled.slice(0, cardsNeeded);
  const run1Board = [...currentCommunityCards, ...run1Cards];
  const run1Result = evaluateAllPlayers(playersCards, run1Board);
  
  // Run 2
  const run2Cards = shuffled.slice(cardsNeeded, cardsNeeded * 2);
  const run2Board = [...currentCommunityCards, ...run2Cards];
  const run2Result = evaluateAllPlayers(playersCards, run2Board);
  
  // Run 3
  const run3Cards = shuffled.slice(cardsNeeded * 2, cardsNeeded * 3);
  const run3Board = [...currentCommunityCards, ...run3Cards];
  const run3Result = evaluateAllPlayers(playersCards, run3Board);
  
  const allSameWinner = run1Result.winners[0] === run2Result.winners[0] && 
                        run2Result.winners[0] === run3Result.winners[0];
  
  return {
    run1: {
      communityCards: run1Board,
      winners: run1Result.winners,
      bestHand: run1Result.bestHand
    },
    run2: {
      communityCards: run2Board,
      winners: run2Result.winners,
      bestHand: run2Result.bestHand
    },
    run3: {
      communityCards: run3Board,
      winners: run3Result.winners,
      bestHand: run3Result.bestHand
    },
    combinedResult: {
      splitPot: !allSameWinner,
      run1Winner: run1Result.winners[0],
      run2Winner: run2Result.winners[0]
    }
  };
}

/**
 * Helper to evaluate all players' hands
 */
function evaluateAllPlayers(
  playersCards: Map<string, Card[]>,
  communityCards: Card[]
): { winners: string[]; bestHand: string } {
  let bestEval: ReturnType<typeof evaluateHand> | null = null;
  let winners: string[] = [];
  
  for (const [playerId, holeCards] of playersCards) {
    const fullHand = [...holeCards, ...communityCards];
    const evaluation = evaluateHand(fullHand);
    
    if (!bestEval || evaluation.rank > bestEval.rank) {
      bestEval = evaluation;
      winners = [playerId];
    } else if (evaluation.rank === bestEval.rank) {
      // Compare tiebreakers
      let isBetter = false;
      let isTie = true;
      
      for (let i = 0; i < evaluation.tiebreakers.length; i++) {
        if (evaluation.tiebreakers[i] > (bestEval.tiebreakers[i] || 0)) {
          isBetter = true;
          isTie = false;
          break;
        } else if (evaluation.tiebreakers[i] < (bestEval.tiebreakers[i] || 0)) {
          isTie = false;
          break;
        }
      }
      
      if (isBetter) {
        bestEval = evaluation;
        winners = [playerId];
      } else if (isTie) {
        winners.push(playerId);
      }
    }
  }
  
  return {
    winners,
    bestHand: bestEval?.name || 'Unknown'
  };
}

/**
 * Calculate cost for rabbit hunt feature
 */
export function calculateRabbitHuntCost(potSize: number, phase: 'flop' | 'turn'): number {
  // Typically 0.5-1% of pot, minimum 1 chip
  const rate = phase === 'flop' ? 0.01 : 0.005;
  return Math.max(1, Math.floor(potSize * rate));
}

/**
 * Check if run it twice is available
 */
export function canRunItTwice(
  communityCards: Card[],
  activePlayers: number,
  allInPlayers: number
): boolean {
  // Run it twice requires:
  // 1. At least one all-in player
  // 2. At least 2 active players
  // 3. Not yet on the river
  return allInPlayers >= 1 && activePlayers >= 2 && communityCards.length < 5;
}

/**
 * Calculate variance reduction from running it multiple times
 */
export function calculateVarianceReduction(
  runs: number,
  equity: number
): { 
  singleRunVariance: number;
  multiRunVariance: number;
  reduction: number;
} {
  // Variance = p * (1-p) for binary outcome
  const singleRunVariance = equity * (1 - equity);
  
  // With multiple runs, variance is reduced by factor of runs
  const multiRunVariance = singleRunVariance / runs;
  
  const reduction = ((singleRunVariance - multiRunVariance) / singleRunVariance) * 100;
  
  return {
    singleRunVariance,
    multiRunVariance,
    reduction
  };
}

/**
 * Format cards for display
 */
export function formatCardsForDisplay(cards: Card[]): string {
  return cards.map(formatCard).join(' ');
}

/**
 * Get emoji for card suit
 */
export function getSuitEmoji(suit: string): string {
  const emojis: Record<string, string> = {
    'spades': '♠️',
    'hearts': '♥️',
    'diamonds': '♦️',
    'clubs': '♣️'
  };
  return emojis[suit] || suit;
}

/**
 * Get color for card suit
 */
export function getSuitColor(suit: string): string {
  return suit === 'hearts' || suit === 'diamonds' ? 'text-red-500' : 'text-foreground';
}
