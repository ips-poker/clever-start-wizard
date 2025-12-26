/**
 * Hand Evaluator Worker Thread
 * Offloads heavy computation from main thread for 300+ tables
 */

import { parentPort, workerData } from 'worker_threads';

// ==========================================
// CONSTANTS
// ==========================================
const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

const RANK_BITS: Record<string, number> = {
  '2': 0x1, '3': 0x2, '4': 0x4, '5': 0x8, '6': 0x10, '7': 0x20, '8': 0x40, '9': 0x80,
  'T': 0x100, 'J': 0x200, 'Q': 0x400, 'K': 0x800, 'A': 0x1000
};

const STRAIGHT_PATTERNS = [
  { pattern: 0x1F00, highCard: 14 },
  { pattern: 0x0F80, highCard: 13 },
  { pattern: 0x07C0, highCard: 12 },
  { pattern: 0x03E0, highCard: 11 },
  { pattern: 0x01F0, highCard: 10 },
  { pattern: 0x00F8, highCard: 9 },
  { pattern: 0x007C, highCard: 8 },
  { pattern: 0x003E, highCard: 7 },
  { pattern: 0x001F, highCard: 6 },
  { pattern: 0x100F, highCard: 5 },
];

// Hand ranks
const HAND_RANKS = {
  HIGH_CARD: 1,
  PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_A_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9,
  ROYAL_FLUSH: 10
};

interface CardData {
  rank: string;
  suit: string;
}

interface EvaluationRequest {
  id: string;
  type: 'evaluate_hand' | 'evaluate_batch' | 'compare_hands';
  data: unknown;
}

interface EvaluationResult {
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
  processingTimeMs: number;
}

/**
 * Parse card string to CardData
 */
function parseCard(cardStr: string): CardData {
  return {
    rank: cardStr[0],
    suit: cardStr[1]
  };
}

/**
 * Generate all 5-card combinations from 7 cards
 */
function* combinations(cards: CardData[], choose: number): Generator<CardData[]> {
  if (choose === 0) {
    yield [];
    return;
  }
  if (cards.length < choose) return;
  
  const [first, ...rest] = cards;
  for (const combo of combinations(rest, choose - 1)) {
    yield [first, ...combo];
  }
  for (const combo of combinations(rest, choose)) {
    yield combo;
  }
}

/**
 * Get rank counts
 */
function getRankCounts(cards: CardData[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
  }
  return counts;
}

/**
 * Get suit counts
 */
function getSuitCounts(cards: CardData[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    counts.set(card.suit, (counts.get(card.suit) || 0) + 1);
  }
  return counts;
}

/**
 * Check for straight using bit patterns
 */
function checkStraight(cards: CardData[]): { isStraight: boolean; highCard: number } {
  let bits = 0;
  for (const card of cards) {
    bits |= RANK_BITS[card.rank] || 0;
  }
  
  for (const { pattern, highCard } of STRAIGHT_PATTERNS) {
    if ((bits & pattern) === pattern) {
      return { isStraight: true, highCard };
    }
  }
  
  return { isStraight: false, highCard: 0 };
}

/**
 * Check for flush
 */
function checkFlush(cards: CardData[]): { isFlush: boolean; suit: string | null; flushCards: CardData[] } {
  const suitCounts = getSuitCounts(cards);
  
  for (const [suit, count] of suitCounts) {
    if (count >= 5) {
      const flushCards = cards.filter(c => c.suit === suit);
      return { isFlush: true, suit, flushCards };
    }
  }
  
  return { isFlush: false, suit: null, flushCards: [] };
}

/**
 * Evaluate a 5-card hand
 */
function evaluate5Cards(cards: CardData[]): { rank: number; tiebreakers: number[]; name: string } {
  const rankCounts = getRankCounts(cards);
  const sortedRanks = [...rankCounts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return RANK_VALUES[b[0]] - RANK_VALUES[a[0]];
    });
  
  const isFlush = new Set(cards.map(c => c.suit)).size === 1;
  const { isStraight, highCard } = checkStraight(cards);
  
  // Royal Flush
  if (isFlush && isStraight && highCard === 14) {
    return { rank: HAND_RANKS.ROYAL_FLUSH, tiebreakers: [14], name: 'Royal Flush' };
  }
  
  // Straight Flush
  if (isFlush && isStraight) {
    return { rank: HAND_RANKS.STRAIGHT_FLUSH, tiebreakers: [highCard], name: 'Straight Flush' };
  }
  
  // Four of a Kind
  if (sortedRanks[0][1] === 4) {
    const quadRank = RANK_VALUES[sortedRanks[0][0]];
    const kicker = RANK_VALUES[sortedRanks[1][0]];
    return { rank: HAND_RANKS.FOUR_OF_A_KIND, tiebreakers: [quadRank, kicker], name: 'Four of a Kind' };
  }
  
  // Full House
  if (sortedRanks[0][1] === 3 && sortedRanks[1]?.[1] >= 2) {
    return {
      rank: HAND_RANKS.FULL_HOUSE,
      tiebreakers: [RANK_VALUES[sortedRanks[0][0]], RANK_VALUES[sortedRanks[1][0]]],
      name: 'Full House'
    };
  }
  
  // Flush
  if (isFlush) {
    const tiebreakers = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
    return { rank: HAND_RANKS.FLUSH, tiebreakers, name: 'Flush' };
  }
  
  // Straight
  if (isStraight) {
    return { rank: HAND_RANKS.STRAIGHT, tiebreakers: [highCard], name: 'Straight' };
  }
  
  // Three of a Kind
  if (sortedRanks[0][1] === 3) {
    const tripRank = RANK_VALUES[sortedRanks[0][0]];
    const kickers = sortedRanks.slice(1).map(r => RANK_VALUES[r[0]]).slice(0, 2);
    return { rank: HAND_RANKS.THREE_OF_A_KIND, tiebreakers: [tripRank, ...kickers], name: 'Three of a Kind' };
  }
  
  // Two Pair
  if (sortedRanks[0][1] === 2 && sortedRanks[1]?.[1] === 2) {
    const highPair = RANK_VALUES[sortedRanks[0][0]];
    const lowPair = RANK_VALUES[sortedRanks[1][0]];
    const kicker = RANK_VALUES[sortedRanks[2][0]];
    return { rank: HAND_RANKS.TWO_PAIR, tiebreakers: [highPair, lowPair, kicker], name: 'Two Pair' };
  }
  
  // One Pair
  if (sortedRanks[0][1] === 2) {
    const pairRank = RANK_VALUES[sortedRanks[0][0]];
    const kickers = sortedRanks.slice(1).map(r => RANK_VALUES[r[0]]).slice(0, 3);
    return { rank: HAND_RANKS.PAIR, tiebreakers: [pairRank, ...kickers], name: 'Pair' };
  }
  
  // High Card
  const tiebreakers = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
  return { rank: HAND_RANKS.HIGH_CARD, tiebreakers, name: 'High Card' };
}

/**
 * Evaluate best 5-card hand from 7 cards
 */
function evaluateBest5(cards: CardData[]): { rank: number; tiebreakers: number[]; name: string; bestCards: CardData[] } {
  let bestHand: { rank: number; tiebreakers: number[]; name: string; bestCards: CardData[] } | null = null;
  
  for (const combo of combinations(cards, 5)) {
    const result = evaluate5Cards(combo);
    
    if (!bestHand || result.rank > bestHand.rank) {
      bestHand = { ...result, bestCards: combo };
    } else if (result.rank === bestHand.rank) {
      // Compare tiebreakers
      for (let i = 0; i < result.tiebreakers.length; i++) {
        if (result.tiebreakers[i] > (bestHand.tiebreakers[i] || 0)) {
          bestHand = { ...result, bestCards: combo };
          break;
        } else if (result.tiebreakers[i] < (bestHand.tiebreakers[i] || 0)) {
          break;
        }
      }
    }
  }
  
  return bestHand!;
}

/**
 * Process evaluation request
 */
function processRequest(request: EvaluationRequest): EvaluationResult {
  const startTime = performance.now();
  
  try {
    switch (request.type) {
      case 'evaluate_hand': {
        const { holeCards, communityCards } = request.data as { holeCards: string[]; communityCards: string[] };
        const allCards = [...holeCards, ...communityCards].map(parseCard);
        const result = evaluateBest5(allCards);
        
        return {
          id: request.id,
          success: true,
          result: {
            rank: result.rank,
            name: result.name,
            tiebreakers: result.tiebreakers,
            bestCards: result.bestCards.map(c => `${c.rank}${c.suit}`)
          },
          processingTimeMs: performance.now() - startTime
        };
      }
      
      case 'evaluate_batch': {
        const { hands } = request.data as { hands: { playerId: string; holeCards: string[]; communityCards: string[] }[] };
        const results = hands.map(hand => {
          const allCards = [...hand.holeCards, ...hand.communityCards].map(parseCard);
          const evaluation = evaluateBest5(allCards);
          return {
            playerId: hand.playerId,
            rank: evaluation.rank,
            name: evaluation.name,
            tiebreakers: evaluation.tiebreakers,
            bestCards: evaluation.bestCards.map(c => `${c.rank}${c.suit}`)
          };
        });
        
        // Sort by hand strength
        results.sort((a, b) => {
          if (b.rank !== a.rank) return b.rank - a.rank;
          for (let i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
            const diff = (b.tiebreakers[i] || 0) - (a.tiebreakers[i] || 0);
            if (diff !== 0) return diff;
          }
          return 0;
        });
        
        return {
          id: request.id,
          success: true,
          result: results,
          processingTimeMs: performance.now() - startTime
        };
      }
      
      case 'compare_hands': {
        const { hand1, hand2, communityCards } = request.data as {
          hand1: string[];
          hand2: string[];
          communityCards: string[];
        };
        
        const cards1 = [...hand1, ...communityCards].map(parseCard);
        const cards2 = [...hand2, ...communityCards].map(parseCard);
        
        const eval1 = evaluateBest5(cards1);
        const eval2 = evaluateBest5(cards2);
        
        let winner: 1 | 2 | 0 = 0;
        if (eval1.rank > eval2.rank) winner = 1;
        else if (eval2.rank > eval1.rank) winner = 2;
        else {
          for (let i = 0; i < Math.max(eval1.tiebreakers.length, eval2.tiebreakers.length); i++) {
            const diff = (eval1.tiebreakers[i] || 0) - (eval2.tiebreakers[i] || 0);
            if (diff > 0) { winner = 1; break; }
            if (diff < 0) { winner = 2; break; }
          }
        }
        
        return {
          id: request.id,
          success: true,
          result: { winner, hand1: eval1, hand2: eval2 },
          processingTimeMs: performance.now() - startTime
        };
      }
      
      default:
        return {
          id: request.id,
          success: false,
          error: `Unknown request type: ${request.type}`,
          processingTimeMs: performance.now() - startTime
        };
    }
  } catch (error) {
    return {
      id: request.id,
      success: false,
      error: String(error),
      processingTimeMs: performance.now() - startTime
    };
  }
}

// Listen for messages from main thread
if (parentPort) {
  parentPort.on('message', (request: EvaluationRequest) => {
    const result = processRequest(request);
    parentPort!.postMessage(result);
  });
  
  // Signal ready
  parentPort.postMessage({ type: 'ready' });
}
