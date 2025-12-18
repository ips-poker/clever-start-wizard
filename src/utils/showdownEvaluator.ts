// =====================================================
// SHOWDOWN EVALUATOR - Determines which cards form the winning hand
// =====================================================
// Used to highlight winning cards during showdown (like PPPoker)

interface Card {
  rank: number;  // 2-14 (14 = Ace)
  suit: string;
}

interface ShowdownResult {
  handName: string;
  handNameRu: string;
  winningCardIndices: number[];      // Indices of hole cards used in winning combo
  communityCardIndices: number[];    // Indices of community cards used
  bestFiveCards: string[];           // The 5 cards forming the best hand
}

const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

const RANK_CHARS: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
  9: '9', 10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

const HAND_NAMES: Record<string, { en: string; ru: string }> = {
  'ROYAL_FLUSH': { en: 'Royal Flush', ru: 'Роял-флеш' },
  'STRAIGHT_FLUSH': { en: 'Straight Flush', ru: 'Стрит-флеш' },
  'FOUR_OF_A_KIND': { en: 'Four of a Kind', ru: 'Каре' },
  'FULL_HOUSE': { en: 'Full House', ru: 'Фулл-хаус' },
  'FLUSH': { en: 'Flush', ru: 'Флеш' },
  'STRAIGHT': { en: 'Straight', ru: 'Стрит' },
  'THREE_OF_A_KIND': { en: 'Three of a Kind', ru: 'Тройка' },
  'TWO_PAIR': { en: 'Two Pair', ru: 'Две пары' },
  'PAIR': { en: 'Pair', ru: 'Пара' },
  'HIGH_CARD': { en: 'High Card', ru: 'Старшая карта' }
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

function cardToString(card: Card): string {
  return `${RANK_CHARS[card.rank]}${card.suit}`;
}

function countRanks(cards: Card[]): Map<number, Card[]> {
  const counts = new Map<number, Card[]>();
  cards.forEach(c => {
    if (!counts.has(c.rank)) counts.set(c.rank, []);
    counts.get(c.rank)!.push(c);
  });
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

// Generate all combinations of k elements from array
function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  
  const result: T[][] = [];
  
  function combine(start: number, combo: T[]) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }
  
  combine(0, []);
  return result;
}

// Check for flush (5+ cards of same suit)
function findFlush(cards: Card[]): Card[] | null {
  const suits = countSuits(cards);
  for (const [, suitCards] of suits) {
    if (suitCards.length >= 5) {
      return suitCards.sort((a, b) => b.rank - a.rank).slice(0, 5);
    }
  }
  return null;
}

// Check for straight
function findStraight(cards: Card[]): Card[] | null {
  // Get unique ranks, sorted high to low
  const uniqueRanks = [...new Set(cards.map(c => c.rank))].sort((a, b) => b - a);
  
  // Check for regular straights (high to low)
  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    const high = uniqueRanks[i];
    const straightRanks = [high, high - 1, high - 2, high - 3, high - 4];
    
    if (straightRanks.every(r => uniqueRanks.includes(r))) {
      return straightRanks.map(r => cards.find(c => c.rank === r)!);
    }
  }
  
  // Check for wheel (A-2-3-4-5)
  if ([14, 5, 4, 3, 2].every(r => uniqueRanks.includes(r))) {
    return [5, 4, 3, 2, 14].map(r => cards.find(c => c.rank === r)!);
  }
  
  return null;
}

// Check for straight flush
function findStraightFlush(cards: Card[]): { cards: Card[]; isRoyal: boolean } | null {
  const suits = countSuits(cards);
  
  for (const [, suitCards] of suits) {
    if (suitCards.length >= 5) {
      const straight = findStraight(suitCards);
      if (straight) {
        const highCard = Math.max(...straight.map(c => c.rank));
        const isRoyal = highCard === 14 && straight.some(c => c.rank === 10);
        return { cards: straight, isRoyal };
      }
    }
  }
  return null;
}

interface HandValue {
  rank: number;       // 1-10 (higher is better)
  handType: string;   // Key for HAND_NAMES
  cards: Card[];      // The 5 cards forming the hand
  tiebreakers: number[];
}

// Evaluate exactly 5 cards
function evaluateFiveCards(cards: Card[]): HandValue {
  const rankCounts = countRanks(cards);
  const suits = countSuits(cards);
  
  // Sort rank groups by count, then by rank
  const groups = [...rankCounts.entries()]
    .sort((a, b) => {
      if (b[1].length !== a[1].length) return b[1].length - a[1].length;
      return b[0] - a[0];
    });
  
  const isFlush = [...suits.values()].some(s => s.length === 5);
  const straight = findStraight(cards);
  const isStraight = straight !== null;
  
  // Royal Flush / Straight Flush
  if (isFlush && isStraight) {
    const highRank = Math.max(...cards.map(c => c.rank));
    if (highRank === 14 && cards.some(c => c.rank === 10)) {
      return { rank: 10, handType: 'ROYAL_FLUSH', cards, tiebreakers: [14] };
    }
    return { rank: 9, handType: 'STRAIGHT_FLUSH', cards, tiebreakers: [highRank] };
  }
  
  // Four of a Kind
  if (groups[0][1].length === 4) {
    return { 
      rank: 8, 
      handType: 'FOUR_OF_A_KIND', 
      cards, 
      tiebreakers: [groups[0][0], groups[1][0]] 
    };
  }
  
  // Full House
  if (groups[0][1].length === 3 && groups[1][1].length === 2) {
    return { 
      rank: 7, 
      handType: 'FULL_HOUSE', 
      cards, 
      tiebreakers: [groups[0][0], groups[1][0]] 
    };
  }
  
  // Flush
  if (isFlush) {
    const sorted = cards.sort((a, b) => b.rank - a.rank);
    return { 
      rank: 6, 
      handType: 'FLUSH', 
      cards, 
      tiebreakers: sorted.map(c => c.rank) 
    };
  }
  
  // Straight
  if (isStraight) {
    const highRank = straight[0].rank === 5 ? 5 : Math.max(...cards.map(c => c.rank));
    return { rank: 5, handType: 'STRAIGHT', cards, tiebreakers: [highRank] };
  }
  
  // Three of a Kind
  if (groups[0][1].length === 3) {
    const kickers = groups.slice(1).map(g => g[0]).sort((a, b) => b - a);
    return { 
      rank: 4, 
      handType: 'THREE_OF_A_KIND', 
      cards, 
      tiebreakers: [groups[0][0], ...kickers] 
    };
  }
  
  // Two Pair
  if (groups[0][1].length === 2 && groups[1][1].length === 2) {
    const pairs = [groups[0][0], groups[1][0]].sort((a, b) => b - a);
    return { 
      rank: 3, 
      handType: 'TWO_PAIR', 
      cards, 
      tiebreakers: [...pairs, groups[2][0]] 
    };
  }
  
  // One Pair
  if (groups[0][1].length === 2) {
    const kickers = groups.slice(1).map(g => g[0]).sort((a, b) => b - a);
    return { 
      rank: 2, 
      handType: 'PAIR', 
      cards, 
      tiebreakers: [groups[0][0], ...kickers] 
    };
  }
  
  // High Card
  const sorted = cards.sort((a, b) => b.rank - a.rank);
  return { 
    rank: 1, 
    handType: 'HIGH_CARD', 
    cards, 
    tiebreakers: sorted.map(c => c.rank) 
  };
}

// Find best 5-card hand from 7 cards (Texas Hold'em)
function findBestHand(allCards: Card[]): HandValue {
  const combinations = getCombinations(allCards, 5);
  let best: HandValue | null = null;
  
  for (const combo of combinations) {
    const value = evaluateFiveCards(combo);
    
    if (!best || value.rank > best.rank) {
      best = value;
    } else if (value.rank === best.rank) {
      // Compare tiebreakers
      for (let i = 0; i < value.tiebreakers.length; i++) {
        if (value.tiebreakers[i] > (best.tiebreakers[i] || 0)) {
          best = value;
          break;
        } else if (value.tiebreakers[i] < (best.tiebreakers[i] || 0)) {
          break;
        }
      }
    }
  }
  
  return best!;
}

// Find best Omaha hand (must use exactly 2 hole cards + 3 community)
function findBestOmahaHand(holeCards: Card[], communityCards: Card[]): { hand: HandValue; holeUsed: number[]; commUsed: number[] } {
  const holeCombos = getCombinations(holeCards.map((c, i) => ({ card: c, idx: i })), 2);
  const commCombos = getCombinations(communityCards.map((c, i) => ({ card: c, idx: i })), 3);
  
  let best: { hand: HandValue; holeUsed: number[]; commUsed: number[] } | null = null;
  
  for (const hole of holeCombos) {
    for (const comm of commCombos) {
      const fiveCards = [...hole.map(h => h.card), ...comm.map(c => c.card)];
      const hand = evaluateFiveCards(fiveCards);
      
      if (!best || hand.rank > best.hand.rank) {
        best = { 
          hand, 
          holeUsed: hole.map(h => h.idx), 
          commUsed: comm.map(c => c.idx) 
        };
      } else if (hand.rank === best.hand.rank) {
        // Compare tiebreakers
        for (let i = 0; i < hand.tiebreakers.length; i++) {
          if (hand.tiebreakers[i] > (best.hand.tiebreakers[i] || 0)) {
            best = { 
              hand, 
              holeUsed: hole.map(h => h.idx), 
              commUsed: comm.map(c => c.idx) 
            };
            break;
          } else if (hand.tiebreakers[i] < (best.hand.tiebreakers[i] || 0)) {
            break;
          }
        }
      }
    }
  }
  
  return best!;
}

/**
 * Evaluate a player's hand at showdown and determine which cards form the winning combination
 * 
 * @param holeCards - Player's hole cards as strings (e.g., ["Ah", "Kd"] or ["Ah", "Kd", "Qs", "Jc"] for PLO)
 * @param communityCards - Community cards as strings (e.g., ["Tc", "9h", "8d", "2s", "3c"])
 * @param isOmaha - Whether this is an Omaha game (must use exactly 2 hole cards)
 * @returns ShowdownResult with hand name and indices of cards used
 */
export function evaluateShowdown(
  holeCards: string[],
  communityCards: string[],
  isOmaha: boolean = false
): ShowdownResult | null {
  const parsedHole = holeCards.map(parseCard).filter((c): c is Card => c !== null);
  const parsedComm = communityCards.map(parseCard).filter((c): c is Card => c !== null);
  
  console.log('[evaluateShowdown] Input:', { 
    holeCards, 
    communityCards,
    parsedHole: parsedHole.map(cardToString),
    parsedComm: parsedComm.map(cardToString)
  });
  
  if (parsedHole.length < 2 || parsedComm.length < 3) {
    console.log('[evaluateShowdown] Not enough cards, returning null');
    return null;
  }
  
  let bestHand: HandValue;
  let holeUsedIndices: number[];
  let commUsedIndices: number[];
  
  if (isOmaha && parsedHole.length === 4 && parsedComm.length === 5) {
    // Omaha: must use exactly 2 hole cards + 3 community
    const result = findBestOmahaHand(parsedHole, parsedComm);
    bestHand = result.hand;
    holeUsedIndices = result.holeUsed;
    commUsedIndices = result.commUsed;
  } else {
    // Texas Hold'em: best 5 from 7
    const allCards = [...parsedHole, ...parsedComm];
    bestHand = findBestHand(allCards);
    
    console.log('[evaluateShowdown] Best hand found:', {
      handType: bestHand.handType,
      rank: bestHand.rank,
      cards: bestHand.cards.map(cardToString),
      tiebreakers: bestHand.tiebreakers
    });
    
    // Determine which cards were used - need to find each of the 5 best cards
    // in either hole cards or community cards
    holeUsedIndices = [];
    commUsedIndices = [];
    
    // Create working copies to track which cards we've already matched
    const holeMatched = new Array(parsedHole.length).fill(false);
    const commMatched = new Array(parsedComm.length).fill(false);
    
    for (const usedCard of bestHand.cards) {
      let found = false;
      
      // First try to find in hole cards (player's own cards take priority)
      for (let i = 0; i < parsedHole.length; i++) {
        if (!holeMatched[i] && parsedHole[i].rank === usedCard.rank && parsedHole[i].suit === usedCard.suit) {
          holeUsedIndices.push(i);
          holeMatched[i] = true;
          found = true;
          console.log(`[evaluateShowdown] Card ${cardToString(usedCard)} matched to HOLE index ${i}`);
          break;
        }
      }
      
      // If not found in hole, look in community
      if (!found) {
        for (let i = 0; i < parsedComm.length; i++) {
          if (!commMatched[i] && parsedComm[i].rank === usedCard.rank && parsedComm[i].suit === usedCard.suit) {
            commUsedIndices.push(i);
            commMatched[i] = true;
            found = true;
            console.log(`[evaluateShowdown] Card ${cardToString(usedCard)} matched to COMM index ${i}`);
            break;
          }
        }
      }
      
      if (!found) {
        console.warn(`[evaluateShowdown] Card ${cardToString(usedCard)} NOT FOUND in hole or community!`);
      }
    }
  }
  
  const handInfo = HAND_NAMES[bestHand.handType];
  
  const result = {
    handName: handInfo.en,
    handNameRu: handInfo.ru,
    winningCardIndices: holeUsedIndices.sort((a, b) => a - b),
    communityCardIndices: commUsedIndices.sort((a, b) => a - b),
    bestFiveCards: bestHand.cards.map(cardToString)
  };
  
  console.log('[evaluateShowdown] RESULT:', result);
  
  return result;
}

/**
 * Compare two hands and determine the winner
 * Returns: 1 if hand1 wins, -1 if hand2 wins, 0 if tie
 */
export function compareShowdownHands(
  hand1HoleCards: string[],
  hand2HoleCards: string[],
  communityCards: string[],
  isOmaha: boolean = false
): number {
  const result1 = evaluateShowdown(hand1HoleCards, communityCards, isOmaha);
  const result2 = evaluateShowdown(hand2HoleCards, communityCards, isOmaha);
  
  if (!result1 || !result2) return 0;
  
  // For now, simple comparison based on hand name order
  const order = Object.keys(HAND_NAMES);
  const idx1 = order.indexOf(Object.entries(HAND_NAMES).find(([, v]) => v.en === result1.handName)?.[0] || '');
  const idx2 = order.indexOf(Object.entries(HAND_NAMES).find(([, v]) => v.en === result2.handName)?.[0] || '');
  
  return idx1 < idx2 ? 1 : idx1 > idx2 ? -1 : 0;
}

/**
 * Get showdown data for all players
 * Returns array of player results with winning card indices
 */
export function getShowdownResults(
  players: Array<{ playerId: string; holeCards: string[] }>,
  communityCards: string[],
  isOmaha: boolean = false
): Array<{
  playerId: string;
  handName: string;
  handNameRu: string;
  winningCardIndices: number[];
  communityCardIndices: number[];
  isWinner: boolean;
}> {
  const results = players.map(player => {
    const showdown = evaluateShowdown(player.holeCards, communityCards, isOmaha);
    return {
      playerId: player.playerId,
      holeCards: player.holeCards,
      showdown
    };
  }).filter(r => r.showdown !== null);
  
  if (results.length === 0) return [];
  
  // Find the best hand(s)
  let bestRank = -1;
  const handRankOrder = ['HIGH_CARD', 'PAIR', 'TWO_PAIR', 'THREE_OF_A_KIND', 'STRAIGHT', 'FLUSH', 'FULL_HOUSE', 'FOUR_OF_A_KIND', 'STRAIGHT_FLUSH', 'ROYAL_FLUSH'];
  
  for (const r of results) {
    const handKey = Object.entries(HAND_NAMES).find(([, v]) => v.en === r.showdown!.handName)?.[0] || '';
    const rank = handRankOrder.indexOf(handKey);
    if (rank > bestRank) bestRank = rank;
  }
  
  const winners = results.filter(r => {
    const handKey = Object.entries(HAND_NAMES).find(([, v]) => v.en === r.showdown!.handName)?.[0] || '';
    return handRankOrder.indexOf(handKey) === bestRank;
  });
  
  return results.map(r => ({
    playerId: r.playerId,
    handName: r.showdown!.handName,
    handNameRu: r.showdown!.handNameRu,
    winningCardIndices: r.showdown!.winningCardIndices,
    communityCardIndices: r.showdown!.communityCardIndices,
    isWinner: winners.some(w => w.playerId === r.playerId)
  }));
}

export default evaluateShowdown;
