/**
 * Extended Poker Game Types Support
 * PLO4, PLO5, PLO6, Hi/Lo Split Games, Mixed Games
 */

import { Card, createDeck, shuffleDeckSecure, evaluateHand, HandEvaluation } from './pokerEngine';

export type ExtendedGameType = 
  | 'holdem'
  | 'plo4'      // Pot Limit Omaha 4 cards
  | 'plo5'      // Pot Limit Omaha 5 cards
  | 'plo6'      // Pot Limit Omaha 6 cards
  | 'holdem_hilo'  // Hold'em Hi/Lo
  | 'omaha_hilo'   // Omaha Hi/Lo (O8)
  | 'stud'         // 7 Card Stud
  | 'stud_hilo'    // 7 Card Stud Hi/Lo
  | 'razz'         // Razz (lowball stud)
  | 'shortdeck'    // Short Deck Hold'em (6+)
  | '2-7_triple'   // 2-7 Triple Draw
  | 'badugi';      // Badugi

export interface GameTypeConfig {
  name: string;
  holeCards: number;
  communityCards: number;
  mustUseHole: number;    // How many hole cards MUST be used
  mustUseCommunity: number; // How many community cards MUST be used
  isHiLo: boolean;
  bettingType: 'no-limit' | 'pot-limit' | 'fixed-limit';
  description: string;
}

export const GAME_CONFIGS: Record<ExtendedGameType, GameTypeConfig> = {
  holdem: {
    name: "Texas Hold'em",
    holeCards: 2,
    communityCards: 5,
    mustUseHole: 0,
    mustUseCommunity: 0,
    isHiLo: false,
    bettingType: 'no-limit',
    description: 'Классический покер с 2 картами'
  },
  plo4: {
    name: 'Pot Limit Omaha',
    holeCards: 4,
    communityCards: 5,
    mustUseHole: 2,
    mustUseCommunity: 3,
    isHiLo: false,
    bettingType: 'pot-limit',
    description: '4 карты, используй ровно 2'
  },
  plo5: {
    name: 'PLO-5',
    holeCards: 5,
    communityCards: 5,
    mustUseHole: 2,
    mustUseCommunity: 3,
    isHiLo: false,
    bettingType: 'pot-limit',
    description: '5 карт на руках, используй 2'
  },
  plo6: {
    name: 'PLO-6',
    holeCards: 6,
    communityCards: 5,
    mustUseHole: 2,
    mustUseCommunity: 3,
    isHiLo: false,
    bettingType: 'pot-limit',
    description: '6 карт на руках - максимум экшена'
  },
  holdem_hilo: {
    name: "Hold'em Hi/Lo",
    holeCards: 2,
    communityCards: 5,
    mustUseHole: 0,
    mustUseCommunity: 0,
    isHiLo: true,
    bettingType: 'fixed-limit',
    description: 'Банк делится между хай и лоу'
  },
  omaha_hilo: {
    name: 'Omaha Hi/Lo (O8)',
    holeCards: 4,
    communityCards: 5,
    mustUseHole: 2,
    mustUseCommunity: 3,
    isHiLo: true,
    bettingType: 'pot-limit',
    description: 'Омаха с делением банка'
  },
  stud: {
    name: '7 Card Stud',
    holeCards: 7,
    communityCards: 0,
    mustUseHole: 5,
    mustUseCommunity: 0,
    isHiLo: false,
    bettingType: 'fixed-limit',
    description: '7 карт без общих, 3 закрытых'
  },
  stud_hilo: {
    name: 'Stud Hi/Lo',
    holeCards: 7,
    communityCards: 0,
    mustUseHole: 5,
    mustUseCommunity: 0,
    isHiLo: true,
    bettingType: 'fixed-limit',
    description: 'Стад с делением банка'
  },
  razz: {
    name: 'Razz',
    holeCards: 7,
    communityCards: 0,
    mustUseHole: 5,
    mustUseCommunity: 0,
    isHiLo: false,
    bettingType: 'fixed-limit',
    description: 'Лоуболл стад, худшая рука выигрывает'
  },
  shortdeck: {
    name: 'Short Deck 6+',
    holeCards: 2,
    communityCards: 5,
    mustUseHole: 0,
    mustUseCommunity: 0,
    isHiLo: false,
    bettingType: 'no-limit',
    description: 'Колода без 2-5, флеш бьёт фулл хаус'
  },
  '2-7_triple': {
    name: '2-7 Triple Draw',
    holeCards: 5,
    communityCards: 0,
    mustUseHole: 5,
    mustUseCommunity: 0,
    isHiLo: false,
    bettingType: 'fixed-limit',
    description: 'Лоуболл с 3 обменами'
  },
  badugi: {
    name: 'Badugi',
    holeCards: 4,
    communityCards: 0,
    mustUseHole: 4,
    mustUseCommunity: 0,
    isHiLo: false,
    bettingType: 'fixed-limit',
    description: '4 карты разных мастей и рангов'
  }
};

/**
 * Evaluate hand for Hi/Lo games
 */
export interface HiLoEvaluation {
  high: HandEvaluation;
  low: HandEvaluation | null;
  qualifiesForLow: boolean;
}

/**
 * Evaluate low hand (8 or better qualifier)
 */
export function evaluateLowHand(cards: Card[]): HandEvaluation | null {
  // For low hand, we need 5 cards 8 or lower, no pairs
  const lowCards = cards.filter(c => {
    const rankValue = getRankValue(c.rank);
    return rankValue <= 8 || c.rank === 'A'; // Ace counts as 1 for low
  });
  
  if (lowCards.length < 5) {
    return null; // Doesn't qualify for low
  }
  
  // Get unique ranks (no pairs)
  const uniqueRanks = new Map<string, Card>();
  for (const card of lowCards) {
    const value = card.rank === 'A' ? '1' : card.rank;
    if (!uniqueRanks.has(value)) {
      uniqueRanks.set(value, card);
    }
  }
  
  if (uniqueRanks.size < 5) {
    return null; // Has pairs, doesn't qualify
  }
  
  // Sort by rank value (low to high)
  const sortedCards = Array.from(uniqueRanks.values())
    .sort((a, b) => {
      const aVal = a.rank === 'A' ? 1 : getRankValue(a.rank);
      const bVal = b.rank === 'A' ? 1 : getRankValue(b.rank);
      return aVal - bVal;
    })
    .slice(0, 5);
  
  // Create tiebreakers (highest cards first for low comparison)
  const tiebreakers = sortedCards
    .map(c => c.rank === 'A' ? 1 : getRankValue(c.rank))
    .reverse();
  
  const handName = `${tiebreakers[0]}-low`;
  
  return {
    rank: 1, // Low hands
    name: handName,
    cards: sortedCards,
    tiebreakers,
    description: `Low: ${sortedCards.map(c => c.rank).join('-')}`
  };
}

/**
 * Evaluate Badugi hand
 */
export function evaluateBadugiHand(cards: Card[]): HandEvaluation {
  // Badugi: 4 cards of different suits and different ranks
  const suits = new Set<string>();
  const ranks = new Set<string>();
  const validCards: Card[] = [];
  
  const sortedCards = [...cards].sort((a, b) => {
    const aVal = a.rank === 'A' ? 1 : getRankValue(a.rank);
    const bVal = b.rank === 'A' ? 1 : getRankValue(b.rank);
    return aVal - bVal;
  });
  
  for (const card of sortedCards) {
    if (!suits.has(card.suit) && !ranks.has(card.rank)) {
      suits.add(card.suit);
      ranks.add(card.rank);
      validCards.push(card);
    }
    if (validCards.length === 4) break;
  }
  
  const numCards = validCards.length;
  const tiebreakers = validCards.map(c => c.rank === 'A' ? 1 : getRankValue(c.rank)).reverse();
  
  const name = numCards === 4 ? `${tiebreakers[0]}-high Badugi` : `${numCards}-card`;
  
  return {
    rank: numCards,
    name,
    cards: validCards,
    tiebreakers: [numCards, ...tiebreakers],
    description: `Badugi: ${validCards.map(c => `${c.rank}${getSuitSymbol(c.suit)}`).join(' ')}`
  };
}

/**
 * Evaluate 2-7 Lowball hand
 */
export function evaluate27Lowball(cards: Card[]): HandEvaluation {
  const regularEval = evaluateHand(cards);
  const isStraight = regularEval.rank === 4;
  const isFlush = regularEval.rank === 5;
  
  if (isStraight || isFlush) {
    return {
      rank: 0,
      name: `${regularEval.name} (не подходит)`,
      cards: regularEval.cards,
      tiebreakers: regularEval.tiebreakers.map(t => -t),
      description: `2-7: не подходит для лоу`
    };
  }
  
  const lowRank = 100 - regularEval.rank;
  const invertedTiebreakers = regularEval.tiebreakers.map(t => 14 - t);
  
  return {
    rank: lowRank,
    name: `${regularEval.tiebreakers[0]}-high`,
    cards: regularEval.cards,
    tiebreakers: invertedTiebreakers,
    description: `2-7 Low: ${regularEval.cards.map(c => c.rank).join('-')}`
  };
}

/**
 * Get all possible Omaha hand combinations
 */
export function getOmahaCombinations(
  holeCards: Card[],
  communityCards: Card[],
  mustUseHole: number = 2,
  mustUseCommunity: number = 3
): Card[][] {
  const holeCombos = getCombinations(holeCards, mustUseHole);
  const communityCombos = getCombinations(communityCards, mustUseCommunity);
  
  const allHands: Card[][] = [];
  
  for (const hole of holeCombos) {
    for (const community of communityCombos) {
      allHands.push([...hole, ...community]);
    }
  }
  
  return allHands;
}

/**
 * Evaluate Omaha hand (PLO4, PLO5, PLO6)
 */
export function evaluateOmahaHand(
  holeCards: Card[],
  communityCards: Card[]
): HandEvaluation {
  const allCombinations = getOmahaCombinations(holeCards, communityCards);
  
  let bestEval: HandEvaluation | null = null;
  
  for (const hand of allCombinations) {
    const eval_ = evaluateHand(hand);
    
    if (!bestEval || eval_.rank > bestEval.rank) {
      bestEval = eval_;
    } else if (eval_.rank === bestEval.rank) {
      // Compare tiebreakers
      for (let i = 0; i < eval_.tiebreakers.length; i++) {
        if (eval_.tiebreakers[i] > (bestEval.tiebreakers[i] || 0)) {
          bestEval = eval_;
          break;
        } else if (eval_.tiebreakers[i] < (bestEval.tiebreakers[i] || 0)) {
          break;
        }
      }
    }
  }
  
  return bestEval!;
}

/**
 * Evaluate Hi/Lo hand
 */
export function evaluateHiLoHand(
  holeCards: Card[],
  communityCards: Card[],
  gameType: ExtendedGameType
): HiLoEvaluation {
  const config = GAME_CONFIGS[gameType];
  
  let highEval: HandEvaluation;
  
  if (config.mustUseHole > 0) {
    // Omaha-style
    highEval = evaluateOmahaHand(holeCards, communityCards);
  } else {
    // Hold'em style
    highEval = evaluateHand([...holeCards, ...communityCards]);
  }
  
  // Evaluate low hand
  const allCards = [...holeCards, ...communityCards];
  const lowEval = evaluateLowHand(allCards);
  
  return {
    high: highEval,
    low: lowEval,
    qualifiesForLow: lowEval !== null
  };
}

/**
 * Calculate pot distribution for Hi/Lo
 */
export function calculateHiLoPotSplit(
  pot: number,
  players: Array<{
    playerId: string;
    hiLoEval: HiLoEvaluation;
  }>
): Map<string, number> {
  const distribution = new Map<string, number>();
  
  // Find best high hand
  let bestHigh: HiLoEvaluation | null = null;
  let highWinners: string[] = [];
  
  for (const player of players) {
    if (!bestHigh || player.hiLoEval.high.rank > bestHigh.high.rank) {
      bestHigh = player.hiLoEval;
      highWinners = [player.playerId];
    } else if (player.hiLoEval.high.rank === bestHigh.high.rank) {
      // Check tiebreakers
      let isBetter = false;
      let isTie = true;
      
      for (let i = 0; i < player.hiLoEval.high.tiebreakers.length; i++) {
        if (player.hiLoEval.high.tiebreakers[i] > (bestHigh.high.tiebreakers[i] || 0)) {
          isBetter = true;
          isTie = false;
          break;
        } else if (player.hiLoEval.high.tiebreakers[i] < (bestHigh.high.tiebreakers[i] || 0)) {
          isTie = false;
          break;
        }
      }
      
      if (isBetter) {
        bestHigh = player.hiLoEval;
        highWinners = [player.playerId];
      } else if (isTie) {
        highWinners.push(player.playerId);
      }
    }
  }
  
  // Find best low hand
  const lowQualifiers = players.filter(p => p.hiLoEval.qualifiesForLow);
  let lowWinners: string[] = [];
  
  if (lowQualifiers.length > 0) {
    let bestLow = lowQualifiers[0].hiLoEval.low!;
    lowWinners = [lowQualifiers[0].playerId];
    
    for (let i = 1; i < lowQualifiers.length; i++) {
      const currentLow = lowQualifiers[i].hiLoEval.low!;
      
      // Compare low hands (lower tiebreakers = better)
      let isBetter = false;
      let isTie = true;
      
      for (let j = 0; j < currentLow.tiebreakers.length; j++) {
        if (currentLow.tiebreakers[j] < (bestLow.tiebreakers[j] || 99)) {
          isBetter = true;
          isTie = false;
          break;
        } else if (currentLow.tiebreakers[j] > (bestLow.tiebreakers[j] || 0)) {
          isTie = false;
          break;
        }
      }
      
      if (isBetter) {
        bestLow = currentLow;
        lowWinners = [lowQualifiers[i].playerId];
      } else if (isTie) {
        lowWinners.push(lowQualifiers[i].playerId);
      }
    }
  }
  
  // Distribute pot
  const highPot = lowWinners.length > 0 ? Math.floor(pot / 2) : pot;
  const lowPot = lowWinners.length > 0 ? pot - highPot : 0;
  
  const highShare = Math.floor(highPot / highWinners.length);
  const lowShare = lowWinners.length > 0 ? Math.floor(lowPot / lowWinners.length) : 0;
  
  for (const winner of highWinners) {
    distribution.set(winner, (distribution.get(winner) || 0) + highShare);
  }
  
  for (const winner of lowWinners) {
    distribution.set(winner, (distribution.get(winner) || 0) + lowShare);
  }
  
  return distribution;
}

// Helper functions
function getRankValue(rank: string): number {
  const values: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
    '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };
  return values[rank] || 0;
}

function getSuitSymbol(suit: string): string {
  const symbols: Record<string, string> = {
    'spades': '♠',
    'hearts': '♥',
    'diamonds': '♦',
    'clubs': '♣'
  };
  return symbols[suit] || suit;
}

function getCombinations<T>(array: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (array.length < size) return [];
  
  const result: T[][] = [];
  
  function combine(start: number, combo: T[]) {
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }
    
    for (let i = start; i <= array.length - (size - combo.length); i++) {
      combo.push(array[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }
  
  combine(0, []);
  return result;
}
