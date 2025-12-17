// =====================================================
// POKER HAND EVALUATOR - Determines hand strength
// =====================================================

export type HandRank = 
  | 'Royal Flush'
  | 'Straight Flush'
  | 'Four of a Kind'
  | 'Full House'
  | 'Flush'
  | 'Straight'
  | 'Three of a Kind'
  | 'Two Pair'
  | 'One Pair'
  | 'High Card';

interface Card {
  rank: number;  // 2-14 (14 = Ace)
  suit: string;
}

const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

function parseCard(cardStr: string): Card | null {
  const str = (cardStr || '').trim();
  if (!str || str.length < 2) return null;

  // Support both "Tc" and "10c"
  const isTen = /^10[cdhs]$/i.test(str);
  const rankChar = isTen ? 'T' : str[0].toUpperCase();
  const suitChar = (isTen ? str[2] : str[1]).toLowerCase();

  const rank = RANK_VALUES[rankChar];
  if (!rank) return null;
  return { rank, suit: suitChar };
}

function parseCards(cardStrings: string[]): Card[] {
  return cardStrings
    .map(parseCard)
    .filter((c): c is Card => c !== null);
}

function countRanks(cards: Card[]): Map<number, number> {
  const counts = new Map<number, number>();
  cards.forEach(c => counts.set(c.rank, (counts.get(c.rank) || 0) + 1));
  return counts;
}

function countSuits(cards: Card[]): Map<string, Card[]> {
  const suits = new Map<string, Card[]>();
  cards.forEach(c => {
    if (!suits.has(c.suit)) suits.set(c.suit, []);
    suits.get(c.suit)!.push(c);
  });
  return suits;
}

function isFlush(cards: Card[]): Card[] | null {
  const suits = countSuits(cards);
  for (const [, suitCards] of suits) {
    if (suitCards.length >= 5) {
      return suitCards.sort((a, b) => b.rank - a.rank).slice(0, 5);
    }
  }
  return null;
}

function isStraight(cards: Card[]): Card[] | null {
  const uniqueRanks = [...new Set(cards.map(c => c.rank))].sort((a, b) => b - a);
  
  // Check for regular straights
  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    const high = uniqueRanks[i];
    const straight = [high, high - 1, high - 2, high - 3, high - 4];
    if (straight.every(r => uniqueRanks.includes(r))) {
      return straight.map(r => cards.find(c => c.rank === r)!);
    }
  }
  
  // Check for wheel (A-2-3-4-5)
  if ([14, 5, 4, 3, 2].every(r => uniqueRanks.includes(r))) {
    return [5, 4, 3, 2, 14].map(r => cards.find(c => c.rank === r)!);
  }
  
  return null;
}

function isStraightFlush(cards: Card[]): { isRoyal: boolean; cards: Card[] } | null {
  const suits = countSuits(cards);
  
  for (const [, suitCards] of suits) {
    if (suitCards.length >= 5) {
      const straight = isStraight(suitCards);
      if (straight) {
        const highCard = Math.max(...straight.map(c => c.rank));
        return { 
          isRoyal: highCard === 14 && straight.some(c => c.rank === 10),
          cards: straight 
        };
      }
    }
  }
  return null;
}

export function evaluateHand(holeCards: string[], communityCards: string[]): HandRank {
  const allCards = parseCards([...holeCards, ...communityCards]);
  
  if (allCards.length < 5) {
    // Not enough cards for full evaluation
    if (allCards.length >= 2) {
      const ranks = countRanks(allCards);
      for (const [, count] of ranks) {
        if (count >= 2) return 'One Pair';
      }
    }
    return 'High Card';
  }
  
  const rankCounts = countRanks(allCards);
  const counts = [...rankCounts.values()].sort((a, b) => b - a);
  
  // Check for straight flush / royal flush
  const straightFlush = isStraightFlush(allCards);
  if (straightFlush) {
    return straightFlush.isRoyal ? 'Royal Flush' : 'Straight Flush';
  }
  
  // Four of a kind
  if (counts[0] === 4) {
    return 'Four of a Kind';
  }
  
  // Full house
  if (counts[0] === 3 && counts[1] >= 2) {
    return 'Full House';
  }
  
  // Flush
  if (isFlush(allCards)) {
    return 'Flush';
  }
  
  // Straight
  if (isStraight(allCards)) {
    return 'Straight';
  }
  
  // Three of a kind
  if (counts[0] === 3) {
    return 'Three of a Kind';
  }
  
  // Two pair
  if (counts[0] === 2 && counts[1] === 2) {
    return 'Two Pair';
  }
  
  // One pair
  if (counts[0] === 2) {
    return 'One Pair';
  }
  
  return 'High Card';
}

// Quick evaluation for display purposes
export function getHandStrengthName(holeCards: string[], communityCards: string[]): string | undefined {
  if (!holeCards || holeCards.length < 2) return undefined;
  if (!communityCards || communityCards.length < 3) return undefined;
  
  try {
    return evaluateHand(holeCards, communityCards);
  } catch {
    return undefined;
  }
}
