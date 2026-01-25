/**
 * Professional Poker Bot AI for Server-Side Decisions
 * Makes intelligent decisions based on game state, position, pot odds, and hand strength
 * Features different playing styles: LAG, TAG, Loose-Passive, Tight-Passive
 */

import { logger } from '../utils/logger.js';

// Hand strength categories
type HandCategory = 'premium' | 'strong' | 'medium' | 'speculative' | 'trash';
type Position = 'early' | 'middle' | 'late' | 'blinds' | 'button';
type Action = 'fold' | 'check' | 'call' | 'raise' | 'allin';
type BotStyle = 'LAG' | 'TAG' | 'loose_passive' | 'tight_passive';

export interface BotDecision {
  action: Action;
  amount?: number;
  reasoning: string;
  confidence: number; // 0-100
}

interface BotPersonality {
  style: BotStyle;
  aggression: number; // 20-90
  looseness: number; // How many hands they play 20-80
  bluffFrequency: number; // 5-40
  slowplayFrequency: number; // 10-40
  threeBetFrequency: number; // 5-25
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
// Extended hands for loose players
const LOOSE_HANDS = ['K9s', 'Q9s', 'J9s', 'T8s', '97s', '86s', '75s', '65s', '54s', 'K8s', 'K7s', 'Q8s', 'J8s', 'T7s'];

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
function analyzeHand(holeCards: string[]): HandAnalysis {
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
  } else if (LOOSE_HANDS.includes(notation)) {
    category = 'speculative';
    strength = 30 + (suited ? 8 : 0) + (connected ? 4 : 0);
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
function analyzeBoard(communityCards: string[]): BoardAnalysis {
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
function evaluateMadeHand(holeCards: string[], communityCards: string[]): MadeHand {
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
function calculatePotOdds(callAmount: number, pot: number): number {
  if (callAmount <= 0) return 100;
  return (callAmount / (pot + callAmount)) * 100;
}

/**
 * Determine position category
 */
function getPosition(seatNumber: number, dealerSeat: number, totalPlayers: number): Position {
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
function calculateSPR(stack: number, pot: number): number {
  if (pot <= 0) return 100;
  return stack / pot;
}

/**
 * Get bot personality based on name hash
 * Different bots have different playing styles
 */
function getBotPersonality(botName: string): BotPersonality {
  // Consistent personality per bot based on name hash
  let hash = 0;
  for (let i = 0; i < botName.length; i++) {
    hash = ((hash << 5) - hash) + botName.charCodeAt(i);
    hash = hash & hash;
  }
  
  // Determine style based on hash
  const styleIndex = Math.abs(hash % 4);
  const styles: BotStyle[] = ['LAG', 'TAG', 'loose_passive', 'tight_passive'];
  const style = styles[styleIndex];
  
  let aggression: number;
  let looseness: number;
  let bluffFrequency: number;
  let slowplayFrequency: number;
  let threeBetFrequency: number;
  
  switch (style) {
    case 'LAG': // Loose Aggressive - plays many hands aggressively
      aggression = 65 + Math.abs((hash >> 4) % 25); // 65-90
      looseness = 55 + Math.abs((hash >> 8) % 25); // 55-80
      bluffFrequency = 20 + Math.abs((hash >> 12) % 20); // 20-40
      slowplayFrequency = 15 + Math.abs((hash >> 16) % 15); // 15-30
      threeBetFrequency = 12 + Math.abs((hash >> 20) % 13); // 12-25
      break;
      
    case 'TAG': // Tight Aggressive - plays few hands but aggressively
      aggression = 55 + Math.abs((hash >> 4) % 25); // 55-80
      looseness = 25 + Math.abs((hash >> 8) % 20); // 25-45
      bluffFrequency = 10 + Math.abs((hash >> 12) % 15); // 10-25
      slowplayFrequency = 20 + Math.abs((hash >> 16) % 20); // 20-40
      threeBetFrequency = 8 + Math.abs((hash >> 20) % 12); // 8-20
      break;
      
    case 'loose_passive': // Loose Passive (calling station) - calls a lot, rarely raises
      aggression = 20 + Math.abs((hash >> 4) % 20); // 20-40
      looseness = 60 + Math.abs((hash >> 8) % 20); // 60-80
      bluffFrequency = 5 + Math.abs((hash >> 12) % 10); // 5-15
      slowplayFrequency = 25 + Math.abs((hash >> 16) % 15); // 25-40
      threeBetFrequency = 3 + Math.abs((hash >> 20) % 7); // 3-10
      break;
      
    case 'tight_passive': // Tight Passive (rock) - plays few hands, mostly calls
      aggression = 25 + Math.abs((hash >> 4) % 20); // 25-45
      looseness = 20 + Math.abs((hash >> 8) % 15); // 20-35
      bluffFrequency = 5 + Math.abs((hash >> 12) % 8); // 5-13
      slowplayFrequency = 30 + Math.abs((hash >> 16) % 15); // 30-45
      threeBetFrequency = 5 + Math.abs((hash >> 20) % 8); // 5-13
      break;
  }
  
  return { style, aggression, looseness, bluffFrequency, slowplayFrequency, threeBetFrequency };
}

/**
 * Check if hand should be played based on personality looseness
 */
function shouldPlayHand(hand: HandAnalysis, personality: BotPersonality, position: Position): boolean {
  // Premium and strong hands always played
  if (hand.category === 'premium' || hand.category === 'strong') return true;
  
  // Medium hands based on position and looseness
  if (hand.category === 'medium') {
    if (position === 'late' || position === 'button') return true;
    if (personality.looseness > 40) return true;
    return Math.random() * 100 < personality.looseness;
  }
  
  // Speculative hands based on looseness
  if (hand.category === 'speculative') {
    if (position === 'button' && personality.looseness > 30) return true;
    if (position === 'late' && personality.looseness > 50) return true;
    return Math.random() * 100 < personality.looseness * 0.7;
  }
  
  // Trash hands - only very loose players play these
  if (personality.looseness > 70 && (position === 'button' || position === 'late')) {
    return Math.random() * 100 < personality.looseness * 0.3;
  }
  
  return false;
}

/**
 * Preflop strategy with personality
 */
function preflopStrategy(
  hand: HandAnalysis,
  position: Position,
  callAmount: number,
  pot: number,
  stack: number,
  isRaised: boolean,
  players: number,
  personality: BotPersonality,
  bigBlind: number,
  isBigBlind: boolean
): BotDecision {
  const raiseSize = Math.floor(pot * 2.5 + callAmount);
  const threeBetSize = Math.floor(callAmount * 3);
  
  // POKERSTARS-STYLE: Short stack survival logic
  // If stack is less than 3BB (considering antes), push all-in instead of folding
  const effectiveStackBBs = stack / bigBlind;
  if (effectiveStackBBs < 3) {
    // With < 3BB, we should push or fold based on hand strength, but NEVER fold a playable hand
    // and with < 1.5BB we always push regardless of cards (ICM considerations)
    if (effectiveStackBBs < 1.5) {
      return { action: 'allin', reasoning: `Desperate stack (${effectiveStackBBs.toFixed(1)}BB) - must push any two`, confidence: 95 };
    }
    // With 1.5-3BB, push with any decent hand (top 50% range)
    if (hand.category !== 'trash' || hand.highCard >= 10 || hand.pair) {
      return { action: 'allin', reasoning: `Short stack push (${effectiveStackBBs.toFixed(1)}BB)`, confidence: 85 };
    }
    // Even trash hands with < 2BB should push more often than fold
    if (effectiveStackBBs < 2 && Math.random() > 0.3) {
      return { action: 'allin', reasoning: `Survival push with ${effectiveStackBBs.toFixed(1)}BB`, confidence: 70 };
    }
  }
  
  // CRITICAL: On BB when not raised, always check with any cards
  if (isBigBlind && !isRaised && callAmount === 0) {
    // Premium hands might still raise for value
    if (hand.category === 'premium' && Math.random() * 100 < personality.aggression) {
      return { action: 'raise', amount: raiseSize, reasoning: 'BB premium - raise for value', confidence: 80 };
    }
    if (hand.category === 'strong' && Math.random() * 100 < personality.aggression * 0.6) {
      return { action: 'raise', amount: raiseSize, reasoning: 'BB strong hand - raise', confidence: 70 };
    }
    // Otherwise just check - free flop!
    return { action: 'check', reasoning: 'BB - free flop check', confidence: 95 };
  }
  
  // Check if we should even play this hand based on personality
  if (!shouldPlayHand(hand, personality, position)) {
    if (callAmount === 0) {
      return { action: 'check', reasoning: 'Weak hand - check', confidence: 70 };
    }
    return { action: 'fold', reasoning: 'Weak hand does not fit our range', confidence: 75 };
  }
  
  // Premium hands - always raise/3bet
  if (hand.category === 'premium') {
    if (isRaised) {
      // Sometimes slowplay AA/KK
      if ((hand.highCard === 14 || hand.highCard === 13) && hand.paired && 
          Math.random() * 100 < personality.slowplayFrequency) {
        return { action: 'call', reasoning: 'Premium slowplay', confidence: 75 };
      }
      // 3-bet or 4-bet
      if (stack < threeBetSize * 3) {
        return { action: 'allin', reasoning: 'Premium hand, short stack - all in', confidence: 95 };
      }
      return { action: 'raise', amount: threeBetSize, reasoning: 'Premium hand - 3-bet', confidence: 90 };
    }
    return { action: 'raise', amount: raiseSize, reasoning: 'Premium hand - open raise', confidence: 92 };
  }
  
  // Strong hands
  if (hand.category === 'strong') {
    if (isRaised) {
      // 3-bet based on personality
      if ((position === 'late' || position === 'button') && 
          Math.random() * 100 < personality.threeBetFrequency) {
        return { action: 'raise', amount: threeBetSize, reasoning: 'Strong hand in position - 3-bet', confidence: 75 };
      }
      if (callAmount < stack * 0.15) {
        return { action: 'call', reasoning: 'Strong hand - flat call raise', confidence: 70 };
      }
      if (callAmount > stack * 0.3) {
        // Tight players fold more often here
        if (personality.style === 'tight_passive' || personality.style === 'TAG') {
          return { action: 'fold', reasoning: 'Strong hand but facing large raise - tight fold', confidence: 55 };
        }
      }
      return { action: 'call', reasoning: 'Strong hand - call', confidence: 65 };
    }
    return { action: 'raise', amount: raiseSize, reasoning: 'Strong hand - open raise', confidence: 80 };
  }
  
  // Medium hands
  if (hand.category === 'medium') {
    if (isRaised) {
      // Loose players call more raises
      if ((position === 'late' || position === 'button') && callAmount < stack * 0.1) {
        if (personality.looseness > 40 || personality.style === 'loose_passive') {
          return { action: 'call', reasoning: 'Medium hand in position - loose call', confidence: 55 };
        }
      }
      // LAG might 3-bet bluff sometimes
      if (personality.style === 'LAG' && Math.random() * 100 < personality.bluffFrequency * 0.5) {
        return { action: 'raise', amount: threeBetSize, reasoning: 'Medium hand - LAG 3-bet', confidence: 45 };
      }
      return { action: 'fold', reasoning: 'Medium hand facing raise - fold', confidence: 60 };
    }
    // Open from middle or late position, passive players limp more
    if (position === 'middle' || position === 'late' || position === 'button') {
      if (personality.style === 'loose_passive' || personality.style === 'tight_passive') {
        if (Math.random() * 100 < (100 - personality.aggression)) {
          return { action: 'call', reasoning: 'Medium hand - passive limp', confidence: 50 };
        }
      }
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
      // Loose players call more with speculative hands
      if (callAmount < stack * 0.05 && players >= 3) {
        if (personality.looseness > 50 || personality.style === 'loose_passive') {
          return { action: 'call', reasoning: 'Speculative hand - set mining / implied odds', confidence: 45 };
        }
      }
      // LAG might 3-bet light
      if (personality.style === 'LAG' && position === 'button' && 
          Math.random() * 100 < personality.bluffFrequency * 0.3) {
        return { action: 'raise', amount: threeBetSize, reasoning: 'Button squeeze play', confidence: 35 };
      }
      return { action: 'fold', reasoning: 'Speculative hand - fold to raise', confidence: 60 };
    }
    if (position === 'late' || position === 'button') {
      if (Math.random() * 100 < personality.aggression * 0.8) {
        return { action: 'raise', amount: raiseSize, reasoning: 'Speculative hand - steal attempt', confidence: 50 };
      }
      // Passive players limp speculative hands
      if (personality.style === 'loose_passive') {
        return { action: 'call', reasoning: 'Limp speculative hand', confidence: 45 };
      }
    }
    if (callAmount === 0) {
      return { action: 'check', reasoning: 'Speculative hand - limp', confidence: 45 };
    }
    return { action: 'fold', reasoning: 'Speculative hand - fold', confidence: 55 };
  }
  
  // Trash hands
  if (callAmount === 0) {
    // Random bluff from button/late position for LAG players
    if ((position === 'button' || position === 'late') && 
        personality.style === 'LAG' && 
        Math.random() * 100 < personality.bluffFrequency) {
      return { action: 'raise', amount: raiseSize, reasoning: 'LAG button steal', confidence: 35 };
    }
    // Very loose players might limp trash
    if (personality.looseness > 70 && position === 'button') {
      return { action: 'call', reasoning: 'Very loose button limp', confidence: 25 };
    }
    return { action: 'check', reasoning: 'Weak hand - check', confidence: 60 };
  }
  
  return { action: 'fold', reasoning: 'Weak hand - fold', confidence: 75 };
}

/**
 * Postflop strategy with personality
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
  personality: BotPersonality,
  bigBlind: number
): BotDecision {
  const betSize = Math.floor(pot * (0.5 + Math.random() * 0.33)); // 50-83% pot for variety
  const raiseSize = Math.floor(callAmount * 2.5 + pot * 0.5);
  
  // Monster hands (two pair+)
  if (madeHand.rank >= 3) {
    // Slowplay consideration for passive players or on dry boards
    if (canCheck && Math.random() * 100 < personality.slowplayFrequency) {
      if (board.texture === 'dry' || madeHand.rank >= 7) {
        return { action: 'check', reasoning: `${madeHand.name} - slowplay trap`, confidence: 70 };
      }
    }
    
    // Value bet/raise
    if (canCheck) {
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
      // Aggressive players bet more with top pair
      if (isTopPair && board.texture !== 'dangerous') {
        if (Math.random() * 100 < personality.aggression) {
          return { action: 'raise', amount: betSize, reasoning: 'Top pair - value bet', confidence: 65 };
        }
      }
      // Passive players check more often
      if (personality.style === 'loose_passive' || personality.style === 'tight_passive') {
        return { action: 'check', reasoning: 'Pair - passive pot control', confidence: 55 };
      }
      return { action: 'check', reasoning: 'Marginal pair - pot control', confidence: 55 };
    }
    
    // Facing bet
    if (isTopPair) {
      // Calling stations call more
      if (personality.style === 'loose_passive') {
        if (callAmount < pot * 1.2) {
          return { action: 'call', reasoning: 'Top pair - calling station call', confidence: 55 };
        }
      }
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
    
    // Loose players call more
    if (personality.looseness > 60 && callAmount < pot * 0.6) {
      return { action: 'call', reasoning: 'Loose call with pair', confidence: 40 };
    }
    
    return { action: 'fold', reasoning: 'Weak pair - fold', confidence: 60 };
  }
  
  // High card (draws and air)
  // Check for draws
  const hasFlushDraw = hand.suitedness && board.flushDraw;
  const hasStraightDraw = hand.connected && board.straightDraw;
  const hasDraw = hasFlushDraw || hasStraightDraw;
  
  if (hasDraw) {
    // Semi-bluff with draws - aggressive players do this more
    if (canCheck) {
      if (phase === 'flop' && Math.random() * 100 < personality.aggression * 0.8) {
        return { action: 'raise', amount: betSize, reasoning: 'Draw - semi-bluff', confidence: 55 };
      }
      // Check for free card
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
    
    // LAG might raise with draws as semi-bluff
    if (personality.style === 'LAG' && Math.random() * 100 < personality.bluffFrequency * 0.6) {
      return { action: 'raise', amount: raiseSize, reasoning: 'Draw - aggressive semi-bluff raise', confidence: 40 };
    }
    
    return { action: 'fold', reasoning: 'Draw - insufficient odds', confidence: 55 };
  }
  
  // Air - bluff considerations based on personality
  if (canCheck) {
    // Bluff on dry boards for aggressive players
    if (board.texture === 'dry' && (position === 'late' || position === 'button')) {
      if (Math.random() * 100 < personality.bluffFrequency) {
        return { action: 'raise', amount: betSize, reasoning: 'Air on dry board - bluff', confidence: 35 };
      }
    }
    return { action: 'check', reasoning: 'Air - give up', confidence: 60 };
  }
  
  // Facing bet with air
  // Calling stations call with very weak hands sometimes
  if (personality.style === 'loose_passive' && callAmount < pot * 0.3) {
    if (Math.random() * 100 < personality.looseness * 0.3) {
      return { action: 'call', reasoning: 'Calling station float', confidence: 20 };
    }
  }
  
  // LAG might bluff raise
  if (personality.style === 'LAG' && Math.random() * 100 < personality.bluffFrequency * 0.3) {
    if (phase !== 'river' && callAmount < pot * 0.75) {
      return { action: 'raise', amount: raiseSize, reasoning: 'LAG bluff raise', confidence: 25 };
    }
  }
  
  // Occasional hero call for aggressive players
  if (Math.random() * 100 < personality.aggression * 0.05 && callAmount < pot * 0.5) {
    return { action: 'call', reasoning: 'Float - planning to bluff later', confidence: 25 };
  }
  
  return { action: 'fold', reasoning: 'Air - fold to bet', confidence: 70 };
}

/**
 * Get random bot aggression personality (30-80 range for variety)
 * DEPRECATED: Use getBotPersonality for full personality
 */
export function getBotAggression(botName: string): number {
  return getBotPersonality(botName).aggression;
}

/**
 * Main bot decision function - to be called from PokerTable
 */
export function makeBotDecision(
  holeCards: string[],
  communityCards: string[],
  pot: number,
  currentBet: number,
  myBet: number,
  stack: number,
  phase: string,
  seatNumber: number,
  dealerSeat: number,
  totalPlayers: number,
  playersInHand: number,
  bigBlind: number,
  aggression: number = 50,
  botName: string = 'Bot',
  bigBlindSeat: number = -1 // Actual BB seat from hand
): BotDecision {
  const callAmount = Math.max(0, currentBet - myBet);
  const canCheck = callAmount === 0;
  const potOdds = calculatePotOdds(callAmount, pot);
  const spr = calculateSPR(stack, pot);
  const position = getPosition(seatNumber, dealerSeat, totalPlayers);
  const isRaised = currentBet > bigBlind;
  
  // Get bot personality for varied play styles
  const personality = getBotPersonality(botName);
  
  // Check if we're the big blind - use actual BB seat if provided
  const isBigBlind = bigBlindSeat >= 0 ? seatNumber === bigBlindSeat : false;
  
  // Analyze hand
  const handAnalysis = analyzeHand(holeCards);
  const boardAnalysis = communityCards.length > 0 ? analyzeBoard(communityCards) : null;
  const madeHand = communityCards.length > 0 ? evaluateMadeHand(holeCards, communityCards) : null;
  
  let decision: BotDecision;
  
  // Preflop strategy
  if (phase === 'preflop' || communityCards.length === 0) {
    decision = preflopStrategy(
      handAnalysis, 
      position, 
      callAmount, 
      pot, 
      stack, 
      isRaised, 
      playersInHand, 
      personality, 
      bigBlind,
      isBigBlind
    );
  } else {
    // Postflop strategy
    decision = postflopStrategy(
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
      personality,
      bigBlind
    );
  }
  
  // Validate amounts
  if (decision.action === 'raise' && decision.amount) {
    // Min raise is usually 2x current bet
    const minRaise = Math.max(bigBlind, currentBet * 2);
    if (decision.amount < minRaise) {
      decision.amount = minRaise;
    }
    // Can't raise more than stack
    if (decision.amount > stack) {
      decision.action = 'allin';
      decision.amount = stack;
    }
  }
  
  // CRITICAL: Final check - if we can check, never fold!
  if (decision.action === 'fold' && canCheck) {
    decision = { action: 'check', reasoning: 'Can check - no need to fold', confidence: 90 };
  }
  
  logger.debug('Bot AI decision', {
    botName,
    holeCards,
    communityCards: communityCards.length,
    phase,
    position,
    isBigBlind,
    pot,
    callAmount,
    canCheck,
    stack,
    handCategory: handAnalysis.category,
    madeHand: madeHand?.name,
    personality: personality.style,
    decision: decision.action,
    amount: decision.amount,
    reasoning: decision.reasoning,
    confidence: decision.confidence
  });
  
  return decision;
}
