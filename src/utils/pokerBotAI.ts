/**
 * Professional Poker Bot AI
 * No access to hidden information - plays based only on visible data
 */

// Hand strength categories
type HandCategory = 'premium' | 'strong' | 'medium' | 'speculative' | 'trash';
export type Position = 'early' | 'middle' | 'late' | 'blinds' | 'button';
type Action = 'fold' | 'check' | 'call' | 'raise' | 'allin';

export interface BotDecision {
  action: Action;
  amount?: number;
  reasoning: string;
  confidence: number; // 0-100
}

interface HandAnalysis {
  category: HandCategory;
  strength: number; // 0-100
  suitedness: boolean;
  connected: boolean;
  paired: boolean;
  highCard: number;
}

interface BoardAnalysis {
  paired: boolean;
  suited: boolean; // 3+ same suit
  flushDraw: boolean;
  straightDraw: boolean;
  connected: boolean;
  highCards: number; // cards >= 10
  texture: 'dry' | 'wet' | 'dangerous';
}

interface MadeHand {
  rank: number; // 1-10 (high card to royal flush)
  name: string;
  strength: number; // 0-100 relative strength
}

// Card rank values
const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// Premium hands (top 5%)
const PREMIUM_HANDS = ['AA', 'KK', 'QQ', 'AKs', 'AKo', 'JJ'];
const STRONG_HANDS = ['TT', '99', 'AQs', 'AQo', 'AJs', 'KQs', '88'];
const MEDIUM_HANDS = ['ATs', 'KJs', 'QJs', 'JTs', 'AJo', 'KQo', '77', '66', 'A9s', 'A8s'];
const SPECULATIVE_HANDS = ['55', '44', '33', '22', 'T9s', '98s', '87s', '76s', 'A5s', 'A4s', 'A3s', 'A2s', 'KTs', 'QTs'];

/**
 * Parse card string to rank and suit
 */
function parseCard(card: string): { rank: string; suit: string; value: number } | null {
  if (!card || card.length < 2) return null;
  const rank = card[0].toUpperCase();
  const suit = card[1].toLowerCase();
  return { rank, suit, value: RANK_VALUES[rank] || 0 };
}

/**
 * Get standardized hand notation (e.g., "AKs", "QQo")
 */
function getHandNotation(cards: string[]): string {
  if (cards.length !== 2) return '';
  
  const card1 = parseCard(cards[0]);
  const card2 = parseCard(cards[1]);
  if (!card1 || !card2) return '';
  
  const [high, low] = card1.value >= card2.value 
    ? [card1, card2] 
    : [card2, card1];
  
  const suited = card1.suit === card2.suit;
  const paired = card1.rank === card2.rank;
  
  if (paired) {
    return `${high.rank}${low.rank}`;
  }
  return `${high.rank}${low.rank}${suited ? 's' : 'o'}`;
}

/**
 * Analyze preflop hand strength
 */
export function analyzeHand(holeCards: string[]): HandAnalysis {
  if (holeCards.length !== 2) {
    return { category: 'trash', strength: 0, suitedness: false, connected: false, paired: false, highCard: 0 };
  }
  
  const card1 = parseCard(holeCards[0]);
  const card2 = parseCard(holeCards[1]);
  if (!card1 || !card2) {
    return { category: 'trash', strength: 0, suitedness: false, connected: false, paired: false, highCard: 0 };
  }
  
  const notation = getHandNotation(holeCards);
  const suited = card1.suit === card2.suit;
  const paired = card1.value === card2.value;
  const gap = Math.abs(card1.value - card2.value);
  const connected = gap <= 1;
  const highCard = Math.max(card1.value, card2.value);
  
  let category: HandCategory = 'trash';
  let strength = 10;
  
  if (PREMIUM_HANDS.includes(notation)) {
    category = 'premium';
    strength = 90 + (highCard - 10) * 2;
  } else if (STRONG_HANDS.includes(notation)) {
    category = 'strong';
    strength = 75 + (highCard - 8) * 2;
  } else if (MEDIUM_HANDS.includes(notation)) {
    category = 'medium';
    strength = 55 + (highCard - 6) * 2;
  } else if (SPECULATIVE_HANDS.includes(notation)) {
    category = 'speculative';
    strength = 35 + (suited ? 10 : 0) + (connected ? 5 : 0);
  } else {
    // Calculate for non-listed hands
    strength = Math.min(highCard * 2, 30);
    if (suited) strength += 8;
    if (connected) strength += 5;
    if (paired) strength += 15;
    if (highCard >= 10) strength += 10;
    
    if (strength >= 45) category = 'speculative';
    else category = 'trash';
  }
  
  return { category, strength, suitedness: suited, connected, paired, highCard };
}

/**
 * Analyze board texture
 */
export function analyzeBoard(communityCards: string[]): BoardAnalysis {
  if (!communityCards || communityCards.length === 0) {
    return { paired: false, suited: false, flushDraw: false, straightDraw: false, connected: false, highCards: 0, texture: 'dry' };
  }
  
  const cards = communityCards.map(parseCard).filter(Boolean) as Array<{ rank: string; suit: string; value: number }>;
  
  // Count suits
  const suitCounts = new Map<string, number>();
  cards.forEach(c => suitCounts.set(c.suit, (suitCounts.get(c.suit) || 0) + 1));
  const maxSuit = Math.max(...suitCounts.values());
  
  // Count ranks
  const rankCounts = new Map<number, number>();
  cards.forEach(c => rankCounts.set(c.value, (rankCounts.get(c.value) || 0) + 1));
  const paired = Math.max(...rankCounts.values()) >= 2;
  
  // Check connectivity
  const values = cards.map(c => c.value).sort((a, b) => a - b);
  let maxConnected = 1;
  let currentConnected = 1;
  for (let i = 1; i < values.length; i++) {
    if (values[i] - values[i-1] <= 2) {
      currentConnected++;
      maxConnected = Math.max(maxConnected, currentConnected);
    } else {
      currentConnected = 1;
    }
  }
  
  const highCards = cards.filter(c => c.value >= 10).length;
  
  // Determine texture
  let texture: 'dry' | 'wet' | 'dangerous' = 'dry';
  if (maxSuit >= 3 || maxConnected >= 3) {
    texture = 'dangerous';
  } else if (maxSuit >= 2 || maxConnected >= 2 || paired) {
    texture = 'wet';
  }
  
  return {
    paired,
    suited: maxSuit >= 3,
    flushDraw: maxSuit === 2,
    straightDraw: maxConnected >= 2 && maxConnected < 4,
    connected: maxConnected >= 2,
    highCards,
    texture
  };
}

/**
 * Evaluate made hand strength (simplified)
 */
export function evaluateMadeHand(holeCards: string[], communityCards: string[]): MadeHand {
  const allCards = [...holeCards, ...communityCards].map(parseCard).filter(Boolean) as Array<{ rank: string; suit: string; value: number }>;
  
  if (allCards.length < 2) {
    return { rank: 1, name: 'High Card', strength: 10 };
  }
  
  // Count suits and ranks
  const suitCounts = new Map<string, number>();
  const rankCounts = new Map<number, number>();
  allCards.forEach(c => {
    suitCounts.set(c.suit, (suitCounts.get(c.suit) || 0) + 1);
    rankCounts.set(c.value, (rankCounts.get(c.value) || 0) + 1);
  });
  
  const maxSuit = Math.max(...suitCounts.values());
  const rankCountsArr = Array.from(rankCounts.values()).sort((a, b) => b - a);
  const values = Array.from(rankCounts.keys()).sort((a, b) => b - a);
  
  // Check for flush
  const hasFlush = maxSuit >= 5;
  
  // Check for straight
  const uniqueValues = [...new Set(allCards.map(c => c.value))].sort((a, b) => b - a);
  let hasStraight = false;
  for (let i = 0; i <= uniqueValues.length - 5; i++) {
    if (uniqueValues[i] - uniqueValues[i + 4] === 4) {
      hasStraight = true;
      break;
    }
  }
  // Check wheel (A-2-3-4-5)
  if (uniqueValues.includes(14) && uniqueValues.includes(2) && uniqueValues.includes(3) && uniqueValues.includes(4) && uniqueValues.includes(5)) {
    hasStraight = true;
  }
  
  // Determine hand rank
  if (hasFlush && hasStraight) {
    const highValue = Math.max(...values);
    if (highValue === 14) return { rank: 10, name: 'Royal Flush', strength: 100 };
    return { rank: 9, name: 'Straight Flush', strength: 98 };
  }
  
  if (rankCountsArr[0] === 4) {
    return { rank: 8, name: 'Four of a Kind', strength: 95 };
  }
  
  if (rankCountsArr[0] === 3 && rankCountsArr[1] >= 2) {
    return { rank: 7, name: 'Full House', strength: 90 };
  }
  
  if (hasFlush) {
    return { rank: 6, name: 'Flush', strength: 82 };
  }
  
  if (hasStraight) {
    return { rank: 5, name: 'Straight', strength: 75 };
  }
  
  if (rankCountsArr[0] === 3) {
    return { rank: 4, name: 'Three of a Kind', strength: 65 };
  }
  
  if (rankCountsArr[0] === 2 && rankCountsArr[1] === 2) {
    return { rank: 3, name: 'Two Pair', strength: 55 };
  }
  
  if (rankCountsArr[0] === 2) {
    const pairValue = values.find(v => rankCounts.get(v) === 2) || 0;
    return { rank: 2, name: 'One Pair', strength: 30 + pairValue * 2 };
  }
  
  const highCard = Math.max(...values);
  return { rank: 1, name: 'High Card', strength: 10 + highCard };
}

/**
 * Calculate pot odds
 */
export function calculatePotOdds(callAmount: number, pot: number): number {
  if (callAmount <= 0) return 100;
  return (callAmount / (pot + callAmount)) * 100;
}

/**
 * Determine position category
 */
export function getPosition(seatNumber: number, dealerSeat: number, totalPlayers: number): Position {
  const relativePosition = (seatNumber - dealerSeat + totalPlayers) % totalPlayers;
  
  if (relativePosition === 0) return 'button';
  if (relativePosition === 1 || relativePosition === 2) return 'blinds';
  if (relativePosition <= totalPlayers / 3) return 'early';
  if (relativePosition <= (totalPlayers * 2) / 3) return 'middle';
  return 'late';
}

/**
 * Calculate effective stack to pot ratio
 */
export function calculateSPR(stack: number, pot: number): number {
  if (pot <= 0) return 100;
  return stack / pot;
}

/**
 * Main decision-making function
 */
export function makeProDecision(
  holeCards: string[],
  communityCards: string[],
  pot: number,
  currentBet: number,
  myBet: number,
  stack: number,
  phase: string,
  position: Position,
  playersInHand: number,
  isRaised: boolean,
  aggression: number = 50 // 0-100, higher = more aggressive
): BotDecision {
  const callAmount = Math.max(0, currentBet - myBet);
  const canCheck = callAmount === 0;
  const potOdds = calculatePotOdds(callAmount, pot);
  const spr = calculateSPR(stack, pot);
  
  // Analyze hand
  const handAnalysis = analyzeHand(holeCards);
  const boardAnalysis = communityCards.length > 0 ? analyzeBoard(communityCards) : null;
  const madeHand = communityCards.length > 0 ? evaluateMadeHand(holeCards, communityCards) : null;
  
  // Preflop strategy
  if (phase === 'preflop' || communityCards.length === 0) {
    return preflopStrategy(handAnalysis, position, callAmount, pot, stack, isRaised, playersInHand, aggression);
  }
  
  // Postflop strategy
  return postflopStrategy(
    handAnalysis,
    boardAnalysis!,
    madeHand!,
    position,
    callAmount,
    pot,
    stack,
    phase,
    canCheck,
    potOdds,
    spr,
    playersInHand,
    isRaised,
    aggression
  );
}

/**
 * Preflop strategy
 */
function preflopStrategy(
  hand: HandAnalysis,
  position: Position,
  callAmount: number,
  pot: number,
  stack: number,
  isRaised: boolean,
  players: number,
  aggression: number
): BotDecision {
  const bigBlind = pot / 1.5; // Approximate
  const raiseSize = Math.floor(pot * 2.5 + callAmount);
  const threeeBetSize = Math.floor(callAmount * 3);
  
  // Premium hands - always raise/3bet
  if (hand.category === 'premium') {
    if (isRaised) {
      // 3-bet or 4-bet
      if (stack < threeeBetSize * 3) {
        return { action: 'allin', reasoning: 'Premium hand, short stack - all in', confidence: 95 };
      }
      return { action: 'raise', amount: threeeBetSize, reasoning: 'Premium hand - 3-bet', confidence: 90 };
    }
    return { action: 'raise', amount: raiseSize, reasoning: 'Premium hand - open raise', confidence: 92 };
  }
  
  // Strong hands
  if (hand.category === 'strong') {
    if (isRaised) {
      // Call or 3-bet depending on position and aggression
      if (position === 'late' || position === 'button') {
        if (Math.random() * 100 < aggression) {
          return { action: 'raise', amount: threeeBetSize, reasoning: 'Strong hand in position - 3-bet', confidence: 75 };
        }
      }
      if (callAmount < stack * 0.15) {
        return { action: 'call', reasoning: 'Strong hand - flat call raise', confidence: 70 };
      }
      if (callAmount > stack * 0.3) {
        return { action: 'fold', reasoning: 'Strong hand but facing large raise', confidence: 55 };
      }
      return { action: 'call', reasoning: 'Strong hand - call', confidence: 65 };
    }
    return { action: 'raise', amount: raiseSize, reasoning: 'Strong hand - open raise', confidence: 80 };
  }
  
  // Medium hands
  if (hand.category === 'medium') {
    if (isRaised) {
      // Only call in position with good pot odds
      if ((position === 'late' || position === 'button') && callAmount < stack * 0.1) {
        return { action: 'call', reasoning: 'Medium hand in position - call', confidence: 55 };
      }
      return { action: 'fold', reasoning: 'Medium hand facing raise out of position', confidence: 60 };
    }
    // Open from middle or late position
    if (position === 'middle' || position === 'late' || position === 'button') {
      return { action: 'raise', amount: raiseSize, reasoning: 'Medium hand - positional open', confidence: 65 };
    }
    if (callAmount === 0) {
      return { action: 'check', reasoning: 'Medium hand early position - check', confidence: 50 };
    }
    return { action: 'fold', reasoning: 'Medium hand early position facing action', confidence: 55 };
  }
  
  // Speculative hands (suited connectors, small pairs)
  if (hand.category === 'speculative') {
    // Only play in position or blinds with good implied odds
    if (isRaised) {
      if (callAmount < stack * 0.05 && players >= 3) {
        return { action: 'call', reasoning: 'Speculative hand - set mining / implied odds', confidence: 45 };
      }
      return { action: 'fold', reasoning: 'Speculative hand - fold to raise', confidence: 60 };
    }
    if (position === 'late' || position === 'button') {
      if (Math.random() * 100 < aggression * 0.6) {
        return { action: 'raise', amount: raiseSize, reasoning: 'Speculative hand - steal attempt', confidence: 50 };
      }
    }
    if (callAmount === 0) {
      return { action: 'check', reasoning: 'Speculative hand - limp', confidence: 45 };
    }
    return { action: 'fold', reasoning: 'Speculative hand - fold', confidence: 55 };
  }
  
  // Trash hands
  if (callAmount === 0) {
    // Random bluff from button occasionally
    if (position === 'button' && Math.random() * 100 < aggression * 0.3) {
      return { action: 'raise', amount: raiseSize, reasoning: 'Button steal attempt', confidence: 35 };
    }
    return { action: 'check', reasoning: 'Weak hand - check', confidence: 60 };
  }
  
  return { action: 'fold', reasoning: 'Weak hand - fold', confidence: 75 };
}

/**
 * Postflop strategy
 */
function postflopStrategy(
  hand: HandAnalysis,
  board: BoardAnalysis,
  madeHand: MadeHand,
  position: Position,
  callAmount: number,
  pot: number,
  stack: number,
  phase: string,
  canCheck: boolean,
  potOdds: number,
  spr: number,
  players: number,
  isRaised: boolean,
  aggression: number
): BotDecision {
  const betSize = Math.floor(pot * 0.66); // Standard 2/3 pot bet
  const raiseSize = Math.floor(callAmount * 2.5 + pot * 0.5);
  
  // Monster hands (two pair+)
  if (madeHand.rank >= 3) {
    // Value bet/raise
    if (canCheck) {
      // Check-raise option on wet boards
      if (board.texture === 'wet' && Math.random() * 100 < aggression * 0.4) {
        return { action: 'check', reasoning: `${madeHand.name} - setting up check-raise`, confidence: 70 };
      }
      return { action: 'raise', amount: betSize, reasoning: `${madeHand.name} - value bet`, confidence: 85 };
    }
    if (isRaised && madeHand.rank >= 5) {
      return { action: 'raise', amount: raiseSize, reasoning: `${madeHand.name} - raise for value`, confidence: 88 };
    }
    if (madeHand.rank >= 7) {
      // Nuts or near-nuts
      if (spr < 2) {
        return { action: 'allin', reasoning: `${madeHand.name} - all in for value`, confidence: 92 };
      }
      return { action: 'raise', amount: raiseSize, reasoning: `${madeHand.name} - big raise`, confidence: 90 };
    }
    return { action: 'call', reasoning: `${madeHand.name} - call and evaluate`, confidence: 75 };
  }
  
  // One pair
  if (madeHand.rank === 2) {
    const isTopPair = hand.highCard >= 10;
    
    if (canCheck) {
      // Bet for value with top pair, check marginal pairs
      if (isTopPair && board.texture !== 'dangerous') {
        return { action: 'raise', amount: betSize, reasoning: 'Top pair - value bet', confidence: 65 };
      }
      return { action: 'check', reasoning: 'Marginal pair - pot control', confidence: 55 };
    }
    
    // Facing bet
    if (isTopPair) {
      if (callAmount < pot * 0.75) {
        return { action: 'call', reasoning: 'Top pair - call reasonable bet', confidence: 60 };
      }
      if (board.texture === 'dangerous') {
        return { action: 'fold', reasoning: 'Top pair on dangerous board - fold to large bet', confidence: 55 };
      }
    }
    
    // Pot odds check for draws
    if (potOdds < 25) {
      return { action: 'call', reasoning: 'Pair with good pot odds', confidence: 50 };
    }
    
    return { action: 'fold', reasoning: 'Weak pair - fold', confidence: 60 };
  }
  
  // High card (draws and air)
  // Check for draws
  const hasFlushDraw = hand.suitedness && board.flushDraw;
  const hasStraightDraw = hand.connected && board.straightDraw;
  const hasDraw = hasFlushDraw || hasStraightDraw;
  
  if (hasDraw) {
    // Semi-bluff with draws
    if (canCheck) {
      if (phase === 'flop' && Math.random() * 100 < aggression * 0.7) {
        return { action: 'raise', amount: betSize, reasoning: 'Draw - semi-bluff', confidence: 55 };
      }
      return { action: 'check', reasoning: 'Draw - free card', confidence: 50 };
    }
    
    // Call with correct odds
    const drawOdds = hasFlushDraw ? 35 : (hasStraightDraw ? 31 : 20);
    if (potOdds <= drawOdds) {
      return { action: 'call', reasoning: 'Draw with correct odds', confidence: 55 };
    }
    
    // Implied odds consideration
    if (spr > 3 && callAmount < pot * 0.5) {
      return { action: 'call', reasoning: 'Draw with implied odds', confidence: 45 };
    }
    
    return { action: 'fold', reasoning: 'Draw - insufficient odds', confidence: 55 };
  }
  
  // Air - bluff considerations
  if (canCheck) {
    // Bluff on dry boards occasionally
    if (board.texture === 'dry' && position === 'late' && Math.random() * 100 < aggression * 0.4) {
      return { action: 'raise', amount: betSize, reasoning: 'Air on dry board - bluff', confidence: 35 };
    }
    return { action: 'check', reasoning: 'Air - give up', confidence: 60 };
  }
  
  // Facing bet with air - usually fold
  // Occasional hero call or bluff raise
  if (Math.random() * 100 < aggression * 0.1 && callAmount < pot * 0.5) {
    return { action: 'call', reasoning: 'Float - planning to bluff later', confidence: 25 };
  }
  
  return { action: 'fold', reasoning: 'Air - fold to bet', confidence: 70 };
}

/**
 * Get bot personality based on aggression level
 */
export function getBotPersonality(aggression: number): string {
  if (aggression >= 80) return 'LAG (Loose-Aggressive)';
  if (aggression >= 60) return 'TAG (Tight-Aggressive)';
  if (aggression >= 40) return 'TAG-Passive';
  if (aggression >= 20) return 'Nit';
  return 'Rock';
}

/**
 * Calculate implied odds adjustment
 */
export function calculateImpliedOdds(stack: number, pot: number, drawStrength: number): number {
  // How much more we expect to win if we hit
  const impliedMultiplier = Math.min(stack / pot, 3);
  return drawStrength * impliedMultiplier;
}
