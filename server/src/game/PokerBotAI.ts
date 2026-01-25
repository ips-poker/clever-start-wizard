/**
 * Professional Poker Bot AI v2.0 - Tournament & Cash Game Expert
 * 
 * Features:
 * - ICM awareness for tournament play
 * - Blocker/card removal effects
 * - Multi-street planning
 * - GTO-influenced ranges with exploitative adjustments
 * - Position-aware 3bet/4bet ranges
 * - Polarized vs linear betting strategies
 * - Stack-depth aware play (SPR, M-ratio)
 */

import { logger } from '../utils/logger.js';

// Hand strength categories
type HandCategory = 'premium' | 'strong' | 'medium' | 'speculative' | 'trash';
type Position = 'early' | 'middle' | 'late' | 'blinds' | 'button';
type Action = 'fold' | 'check' | 'call' | 'raise' | 'allin';
type BotStyle = 'LAG' | 'TAG' | 'loose_passive' | 'tight_passive' | 'GTO' | 'maniac';
type TournamentStage = 'early' | 'middle' | 'bubble' | 'itm' | 'final_table';

export interface BotDecision {
  action: Action;
  amount?: number;
  reasoning: string;
  confidence: number; // 0-100
}

interface BotPersonality {
  style: BotStyle;
  aggression: number; // 20-95
  looseness: number; // How many hands they play 20-80
  bluffFrequency: number; // 5-45
  slowplayFrequency: number; // 10-40
  threeBetFrequency: number; // 5-30
  foldToThreeBet: number; // 40-80
  cBetFrequency: number; // 50-85
  checkRaiseFrequency: number; // 5-25
  floatFrequency: number; // 10-35
}

interface HandAnalysis {
  category: HandCategory;
  strength: number; // 0-100
  suitedness: boolean;
  connected: boolean;
  paired: boolean;
  highCard: number;
  lowCard: number;
  gap: number;
  hasBlockers: boolean; // Blocks premium hands (A, K)
  nutPotential: boolean; // Can make nuts
  pair?: boolean; // Alias for paired
}

interface BoardAnalysis {
  paired: boolean;
  suited: boolean; // 3+ same suit
  flushDraw: boolean;
  straightDraw: boolean;
  connected: boolean;
  highCards: number; // cards >= 10
  texture: 'dry' | 'wet' | 'dangerous';
  monotone: boolean;
  rainbow: boolean;
  broadway: number; // T+ cards count
  lowCards: number; // 2-6 cards count
}

interface MadeHand {
  rank: number; // 1-10 (high card to royal flush)
  name: string;
  strength: number; // 0-100 relative strength
  draws: DrawAnalysis;
  kicker: number;
}

interface DrawAnalysis {
  hasFlushDraw: boolean;
  hasStraightDraw: boolean;
  hasGutshot: boolean;
  hasOvercards: boolean;
  outs: number;
  equity: number; // Estimated equity 0-100
}

// Card rank values
const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// GTO-influenced hand ranges by position
const RANGES = {
  // UTG: ~15% of hands
  early: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', 'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'KQs', '88', '77'],
  // MP: ~18% of hands  
  middle: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', 'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'AJo', 'ATs', 'KQs', 'KQo', 'KJs', 'QJs'],
  // CO/BTN: ~25-35% of hands
  late: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', 'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'AJo', 'ATs', 'ATo', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'KQs', 'KQo', 'KJs', 'KJo', 'KTs', 'QJs', 'QJo', 'QTs', 'JTs', 'T9s', '98s', '87s', '76s'],
  // Button steal range: ~40%+
  button: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22', 'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'AJo', 'ATs', 'ATo', 'A9s', 'A9o', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'KQs', 'KQo', 'KJs', 'KJo', 'KTs', 'KTo', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'QJs', 'QJo', 'QTs', 'QTo', 'Q9s', 'JTs', 'JTo', 'J9s', 'T9s', 'T8s', '98s', '97s', '87s', '86s', '76s', '75s', '65s', '64s', '54s', '53s', '43s'],
  // 3bet value range
  threeBetValue: ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AKo', 'AQs'],
  // 3bet bluff range (blockers + playability)
  threeBetBluff: ['A5s', 'A4s', 'A3s', 'A2s', 'KTs', 'K9s', 'QTs', 'JTs', 'T9s', '98s', '87s', '76s'],
  // 4bet value
  fourBetValue: ['AA', 'KK', 'QQ', 'AKs', 'AKo'],
  // 4bet bluff  
  fourBetBluff: ['AQo', 'AJs', 'A5s', 'A4s']
};

// Premium hands (top 5%)
const PREMIUM_HANDS = ['AA', 'KK', 'QQ', 'AKs', 'AKo', 'JJ'];
const STRONG_HANDS = ['TT', '99', 'AQs', 'AQo', 'AJs', 'KQs', '88'];
const MEDIUM_HANDS = ['ATs', 'KJs', 'QJs', 'JTs', 'AJo', 'KQo', '77', '66', 'A9s', 'A8s'];
const SPECULATIVE_HANDS = ['55', '44', '33', '22', 'T9s', '98s', '87s', '76s', 'A5s', 'A4s', 'A3s', 'A2s', 'KTs', 'QTs'];
// Extended hands for loose players
const LOOSE_HANDS = ['K9s', 'Q9s', 'J9s', 'T8s', '97s', '86s', '75s', '65s', '54s', 'K8s', 'K7s', 'Q8s', 'J8s', 'T7s'];
// Blocker hands (good for bluffing)
const BLOCKER_HANDS = ['Ax', 'Kx', 'AxKx']; // Conceptual

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
 * Analyze preflop hand strength with professional metrics
 */
function analyzeHand(holeCards: string[]): HandAnalysis {
  if (holeCards.length !== 2) {
    return { category: 'trash', strength: 0, suitedness: false, connected: false, paired: false, highCard: 0, lowCard: 0, gap: 0, hasBlockers: false, nutPotential: false };
  }
  
  const card1 = parseCard(holeCards[0]);
  const card2 = parseCard(holeCards[1]);
  if (!card1 || !card2) {
    return { category: 'trash', strength: 0, suitedness: false, connected: false, paired: false, highCard: 0, lowCard: 0, gap: 0, hasBlockers: false, nutPotential: false };
  }
  
  const notation = getHandNotation(holeCards);
  const suited = card1.suit === card2.suit;
  const paired = card1.value === card2.value;
  const gap = Math.abs(card1.value - card2.value);
  const connected = gap <= 1;
  const highCard = Math.max(card1.value, card2.value);
  const lowCard = Math.min(card1.value, card2.value);
  
  // PROFESSIONAL: Blocker analysis - having A or K blocks premium hands
  const hasBlockers = highCard >= 13; // A or K
  
  // PROFESSIONAL: Nut potential - can make the nuts
  // Suited Aces, broadway suited, high pairs
  const nutPotential = (highCard === 14 && suited) || // Suited Ace = nut flush potential
                       (suited && highCard >= 10 && lowCard >= 10) || // Broadway suited
                       (paired && highCard >= 10) || // High pair = set potential
                       (suited && connected && highCard >= 9); // Suited connectors
  
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
    // Blocker bonus for bluff potential
    if (hasBlockers) strength += 5;
    
    if (strength >= 45) category = 'speculative';
    else category = 'trash';
  }
  
  return { 
    category, 
    strength, 
    suitedness: suited, 
    connected, 
    paired, 
    highCard,
    lowCard,
    gap,
    hasBlockers,
    nutPotential,
    pair: paired
  };
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
 * PROFESSIONAL: Calculate M-ratio for tournament play
 * M = Stack / (SB + BB + Antes)
 * Critical for push/fold decisions
 */
function calculateMRatio(stack: number, smallBlind: number, bigBlind: number, ante: number = 0, playersAtTable: number = 6): number {
  const totalBlinds = smallBlind + bigBlind + (ante * playersAtTable);
  if (totalBlinds <= 0) return 100;
  return stack / totalBlinds;
}

/**
 * PROFESSIONAL: Get tournament stage based on M-ratio
 * Determines optimal strategy adjustments
 */
function getTournamentStage(mRatio: number, playersRemaining: number = 100, totalPlayers: number = 100): TournamentStage {
  const percentRemaining = (playersRemaining / totalPlayers) * 100;
  
  // Bubble detection (10-15% remaining)
  if (percentRemaining >= 10 && percentRemaining <= 18) {
    return 'bubble';
  }
  
  // Final table
  if (playersRemaining <= 9) {
    return 'final_table';
  }
  
  // ITM (in the money)
  if (percentRemaining < 10) {
    return 'itm';
  }
  
  // Early/middle based on M-ratio
  if (mRatio > 20) {
    return 'early';
  }
  
  return 'middle';
}

/**
 * PROFESSIONAL: ICM pressure adjustment
 * Modifies aggression based on tournament situation
 */
function getICMPressure(mRatio: number, stage: TournamentStage, isChipLeader: boolean = false): number {
  // Returns a multiplier for aggression (0.5 = very conservative, 1.5 = very aggressive)
  
  if (stage === 'bubble') {
    // On bubble: chip leaders can apply pressure, short stacks must tighten
    if (isChipLeader) return 1.3;
    if (mRatio < 10) return 0.6; // Very tight survival mode
    if (mRatio < 15) return 0.8;
    return 0.9;
  }
  
  if (stage === 'final_table') {
    // Final table: ICM very important
    if (mRatio < 5) return 0.7;
    if (mRatio < 10) return 0.85;
    return 1.0;
  }
  
  if (stage === 'itm') {
    // ITM: Can be more aggressive now
    if (mRatio < 8) return 0.8;
    return 1.1;
  }
  
  // Early/middle: standard play
  return 1.0;
}

/**
 * PROFESSIONAL: Calculate implied odds for drawing hands
 */
function calculateImpliedOdds(outs: number, cardsTocome: number, potSize: number, effectiveStack: number): number {
  // Approximate equity from outs
  const equity = Math.min(outs * (cardsTocome === 2 ? 4 : 2), 100);
  
  // How much we need to win to justify calling
  // Implied odds = (future wins) / (current call cost)
  const impliedMultiplier = Math.min(effectiveStack / potSize, 3); // Cap at 3x pot
  
  return equity * (1 + impliedMultiplier * 0.3); // Boost equity by implied odds factor
}

/**
 * PROFESSIONAL: Analyze draws in the hand
 */
function analyzeDraws(holeCards: string[], communityCards: string[]): DrawAnalysis {
  const allCards = [...holeCards, ...communityCards].map(parseCard).filter(Boolean) as Array<{ rank: string; suit: string; value: number }>;
  const holeCardsParsed = holeCards.map(parseCard).filter(Boolean) as Array<{ rank: string; suit: string; value: number }>;
  
  if (allCards.length < 3) {
    return { hasFlushDraw: false, hasStraightDraw: false, hasGutshot: false, hasOvercards: false, outs: 0, equity: 0 };
  }
  
  // Flush draw analysis
  const suitCounts = new Map<string, number>();
  allCards.forEach(c => suitCounts.set(c.suit, (suitCounts.get(c.suit) || 0) + 1));
  const hasFlushDraw = Array.from(suitCounts.values()).some(count => count === 4);
  
  // Check if hole cards contribute to flush draw
  const holeSuits = holeCardsParsed.map(c => c.suit);
  const flushDrawWithHoleCards = hasFlushDraw && holeSuits.some(suit => (suitCounts.get(suit) || 0) >= 4);
  
  // Straight draw analysis (simplified)
  const values = [...new Set(allCards.map(c => c.value))].sort((a, b) => a - b);
  let hasStraightDraw = false;
  let hasGutshot = false;
  
  // Check for open-ended straight draw (4 consecutive)
  for (let i = 0; i <= values.length - 4; i++) {
    if (values[i + 3] - values[i] <= 4) {
      if (values[i + 3] - values[i] === 3) {
        hasStraightDraw = true; // Open-ended
      } else if (values[i + 3] - values[i] === 4) {
        hasGutshot = true; // Gutshot
      }
    }
  }
  
  // Overcards analysis
  const boardCards = communityCards.map(parseCard).filter(Boolean) as Array<{ rank: string; suit: string; value: number }>;
  const maxBoardValue = boardCards.length > 0 ? Math.max(...boardCards.map(c => c.value)) : 0;
  const hasOvercards = holeCardsParsed.filter(c => c.value > maxBoardValue).length >= 2;
  
  // Calculate outs
  let outs = 0;
  if (flushDrawWithHoleCards) outs += 9;
  if (hasStraightDraw) outs += 8;
  if (hasGutshot && !hasStraightDraw) outs += 4;
  if (hasOvercards && outs === 0) outs += 6; // Only count overcards if no other draws
  
  // Remove duplicate outs (flush + straight combo)
  if (flushDrawWithHoleCards && hasStraightDraw) outs -= 2;
  
  // Equity approximation (rule of 2 and 4)
  const cardsTocome = 5 - communityCards.length;
  const equity = Math.min(outs * (cardsTocome === 2 ? 4 : 2), 70);
  
  return {
    hasFlushDraw: flushDrawWithHoleCards,
    hasStraightDraw,
    hasGutshot,
    hasOvercards,
    outs,
    equity
  };
}

/**
 * Get bot personality based on name hash
 * PROFESSIONAL v2.0: Added GTO and maniac styles, plus advanced metrics
 */
function getBotPersonality(botName: string): BotPersonality {
  // Consistent personality per bot based on name hash
  let hash = 0;
  for (let i = 0; i < botName.length; i++) {
    hash = ((hash << 5) - hash) + botName.charCodeAt(i);
    hash = hash & hash;
  }
  
  // Determine style based on hash - added GTO and maniac
  const styleIndex = Math.abs(hash % 6);
  const styles: BotStyle[] = ['LAG', 'TAG', 'loose_passive', 'tight_passive', 'GTO', 'maniac'];
  const style = styles[styleIndex];
  
  let aggression: number;
  let looseness: number;
  let bluffFrequency: number;
  let slowplayFrequency: number;
  let threeBetFrequency: number;
  let foldToThreeBet: number;
  let cBetFrequency: number;
  let checkRaiseFrequency: number;
  let floatFrequency: number;
  
  switch (style) {
    case 'LAG': // Loose Aggressive - plays many hands aggressively
      aggression = 65 + Math.abs((hash >> 4) % 25); // 65-90
      looseness = 55 + Math.abs((hash >> 8) % 25); // 55-80
      bluffFrequency = 20 + Math.abs((hash >> 12) % 20); // 20-40
      slowplayFrequency = 15 + Math.abs((hash >> 16) % 15); // 15-30
      threeBetFrequency = 12 + Math.abs((hash >> 20) % 13); // 12-25
      foldToThreeBet = 45 + Math.abs((hash >> 24) % 20); // 45-65
      cBetFrequency = 70 + Math.abs((hash >> 28) % 15); // 70-85
      checkRaiseFrequency = 12 + Math.abs((hash >> 32) % 13); // 12-25
      floatFrequency = 20 + Math.abs((hash >> 36) % 15); // 20-35
      break;
      
    case 'TAG': // Tight Aggressive - plays few hands but aggressively
      aggression = 55 + Math.abs((hash >> 4) % 25); // 55-80
      looseness = 25 + Math.abs((hash >> 8) % 20); // 25-45
      bluffFrequency = 10 + Math.abs((hash >> 12) % 15); // 10-25
      slowplayFrequency = 20 + Math.abs((hash >> 16) % 20); // 20-40
      threeBetFrequency = 8 + Math.abs((hash >> 20) % 12); // 8-20
      foldToThreeBet = 55 + Math.abs((hash >> 24) % 15); // 55-70
      cBetFrequency = 65 + Math.abs((hash >> 28) % 15); // 65-80
      checkRaiseFrequency = 8 + Math.abs((hash >> 32) % 10); // 8-18
      floatFrequency = 15 + Math.abs((hash >> 36) % 10); // 15-25
      break;
      
    case 'loose_passive': // Loose Passive (calling station) - calls a lot, rarely raises
      aggression = 20 + Math.abs((hash >> 4) % 20); // 20-40
      looseness = 60 + Math.abs((hash >> 8) % 20); // 60-80
      bluffFrequency = 5 + Math.abs((hash >> 12) % 10); // 5-15
      slowplayFrequency = 25 + Math.abs((hash >> 16) % 15); // 25-40
      threeBetFrequency = 3 + Math.abs((hash >> 20) % 7); // 3-10
      foldToThreeBet = 35 + Math.abs((hash >> 24) % 15); // 35-50 (calling station doesn't fold much)
      cBetFrequency = 40 + Math.abs((hash >> 28) % 15); // 40-55
      checkRaiseFrequency = 3 + Math.abs((hash >> 32) % 7); // 3-10
      floatFrequency = 25 + Math.abs((hash >> 36) % 10); // 25-35 (floats a lot)
      break;
      
    case 'tight_passive': // Tight Passive (rock) - plays few hands, mostly calls
      aggression = 25 + Math.abs((hash >> 4) % 20); // 25-45
      looseness = 20 + Math.abs((hash >> 8) % 15); // 20-35
      bluffFrequency = 5 + Math.abs((hash >> 12) % 8); // 5-13
      slowplayFrequency = 30 + Math.abs((hash >> 16) % 15); // 30-45
      threeBetFrequency = 5 + Math.abs((hash >> 20) % 8); // 5-13
      foldToThreeBet = 65 + Math.abs((hash >> 24) % 15); // 65-80 (folds a lot)
      cBetFrequency = 55 + Math.abs((hash >> 28) % 15); // 55-70
      checkRaiseFrequency = 5 + Math.abs((hash >> 32) % 8); // 5-13
      floatFrequency = 10 + Math.abs((hash >> 36) % 10); // 10-20
      break;
      
    case 'GTO': // GTO-oriented balanced play
      aggression = 50 + Math.abs((hash >> 4) % 15); // 50-65 (balanced)
      looseness = 35 + Math.abs((hash >> 8) % 15); // 35-50 (standard)
      bluffFrequency = 25 + Math.abs((hash >> 12) % 10); // 25-35 (balanced bluff:value)
      slowplayFrequency = 15 + Math.abs((hash >> 16) % 10); // 15-25
      threeBetFrequency = 10 + Math.abs((hash >> 20) % 8); // 10-18
      foldToThreeBet = 50 + Math.abs((hash >> 24) % 15); // 50-65
      cBetFrequency = 60 + Math.abs((hash >> 28) % 10); // 60-70
      checkRaiseFrequency = 10 + Math.abs((hash >> 32) % 8); // 10-18
      floatFrequency = 18 + Math.abs((hash >> 36) % 7); // 18-25
      break;
      
    case 'maniac': // Super aggressive, plays many hands, bluffs frequently
      aggression = 80 + Math.abs((hash >> 4) % 15); // 80-95
      looseness = 70 + Math.abs((hash >> 8) % 10); // 70-80
      bluffFrequency = 35 + Math.abs((hash >> 12) % 10); // 35-45
      slowplayFrequency = 5 + Math.abs((hash >> 16) % 10); // 5-15 (rarely slowplays)
      threeBetFrequency = 20 + Math.abs((hash >> 20) % 10); // 20-30
      foldToThreeBet = 30 + Math.abs((hash >> 24) % 15); // 30-45 (rarely folds)
      cBetFrequency = 80 + Math.abs((hash >> 28) % 10); // 80-90
      checkRaiseFrequency = 18 + Math.abs((hash >> 32) % 7); // 18-25
      floatFrequency = 30 + Math.abs((hash >> 36) % 5); // 30-35
      break;
      
    default:
      aggression = 50;
      looseness = 40;
      bluffFrequency = 20;
      slowplayFrequency = 20;
      threeBetFrequency = 10;
      foldToThreeBet = 55;
      cBetFrequency = 65;
      checkRaiseFrequency = 10;
      floatFrequency = 20;
  }
  
  return { 
    style, 
    aggression, 
    looseness, 
    bluffFrequency, 
    slowplayFrequency, 
    threeBetFrequency,
    foldToThreeBet,
    cBetFrequency,
    checkRaiseFrequency,
    floatFrequency
  };
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
 * PROFESSIONAL v2.0: Preflop strategy with advanced concepts
 * - M-ratio awareness for tournaments
 * - Blocker-based 3bet bluffs
 * - Position-aware ranges
 * - ICM considerations
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
  
  // PROFESSIONAL: Calculate key metrics
  const effectiveStackBBs = stack / bigBlind;
  const mRatio = calculateMRatio(stack, bigBlind / 2, bigBlind, 0, players);
  const notation = getHandNotation([]);
  
  // PROFESSIONAL: M-ratio based push/fold strategy
  // Zone classifications: Green (M>20), Yellow (10-20), Orange (5-10), Red (<5)
  if (mRatio < 10) {
    // Orange/Red zone - Push/Fold mode
    if (mRatio < 5) {
      // Red zone: Very tight push range but must push playable hands
      if (hand.category === 'premium' || hand.category === 'strong') {
        return { action: 'allin', reasoning: `Red zone M=${mRatio.toFixed(1)} - premium push`, confidence: 95 };
      }
      if (hand.category === 'medium' && (position === 'late' || position === 'button' || position === 'blinds')) {
        return { action: 'allin', reasoning: `Red zone M=${mRatio.toFixed(1)} - positional push`, confidence: 80 };
      }
      // Ace-x suited, any pair in late position
      if ((hand.highCard === 14 || hand.paired) && position !== 'early') {
        return { action: 'allin', reasoning: `Red zone push - ${hand.paired ? 'pair' : 'Ace'}`, confidence: 75 };
      }
      // Desperate push with any two from button/blinds if M < 3
      if (mRatio < 3 && (position === 'button' || position === 'blinds')) {
        if (hand.category !== 'trash' || hand.highCard >= 8) {
          return { action: 'allin', reasoning: `Desperate M=${mRatio.toFixed(1)} push`, confidence: 70 };
        }
      }
    } else {
      // Orange zone (M 5-10): Wider push range
      if (hand.category === 'premium' || hand.category === 'strong') {
        return { action: 'allin', reasoning: `Orange zone M=${mRatio.toFixed(1)} - value push`, confidence: 90 };
      }
      if (hand.category === 'medium') {
        if (position === 'late' || position === 'button') {
          return { action: 'allin', reasoning: `Orange zone positional push`, confidence: 78 };
        }
        if (!isRaised) {
          return { action: 'allin', reasoning: `Orange zone open-push`, confidence: 72 };
        }
      }
      // Speculative hands in position
      if (hand.category === 'speculative' && position === 'button' && !isRaised) {
        return { action: 'allin', reasoning: `Button steal push M=${mRatio.toFixed(1)}`, confidence: 65 };
      }
    }
    
    // Facing raise in orange/red zone - tight calling range
    if (isRaised) {
      if (hand.category === 'premium') {
        return { action: 'allin', reasoning: 'Short stack premium vs raise - shove', confidence: 92 };
      }
      if (hand.category === 'strong' && callAmount < stack * 0.4) {
        return { action: 'allin', reasoning: 'Strong hand vs raise - reshove', confidence: 75 };
      }
      return { action: 'fold', reasoning: 'Short stack fold to raise', confidence: 65 };
    }
  }
  
  // POKERSTARS-STYLE: Short stack survival logic (backup)
  if (effectiveStackBBs < 3) {
    if (effectiveStackBBs < 1.5) {
      return { action: 'allin', reasoning: `Desperate stack (${effectiveStackBBs.toFixed(1)}BB) - must push any two`, confidence: 95 };
    }
    if (hand.category !== 'trash' || hand.highCard >= 10 || hand.paired) {
      return { action: 'allin', reasoning: `Short stack push (${effectiveStackBBs.toFixed(1)}BB)`, confidence: 85 };
    }
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
      // PROFESSIONAL: 3-bet with position + personality consideration
      if ((position === 'late' || position === 'button') && 
          Math.random() * 100 < personality.threeBetFrequency) {
        return { action: 'raise', amount: threeBetSize, reasoning: 'Strong hand in position - 3-bet', confidence: 75 };
      }
      // GTO players mix calls and 3bets
      if (personality.style === 'GTO' && Math.random() > 0.6) {
        return { action: 'raise', amount: threeBetSize, reasoning: 'GTO mixed 3-bet strategy', confidence: 70 };
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
      // PROFESSIONAL: Blocker-based 3bet bluffs
      // Hands with blockers (A, K) are better for bluffing as they block premium hands
      if (hand.hasBlockers && (position === 'late' || position === 'button')) {
        const bluffThreshold = personality.bluffFrequency * (personality.style === 'GTO' ? 0.8 : 0.5);
        if (Math.random() * 100 < bluffThreshold) {
          return { action: 'raise', amount: threeBetSize, reasoning: 'Blocker-based 3-bet bluff', confidence: 50 };
        }
      }
      
      // Loose players call more raises
      if ((position === 'late' || position === 'button') && callAmount < stack * 0.1) {
        if (personality.looseness > 40 || personality.style === 'loose_passive') {
          return { action: 'call', reasoning: 'Medium hand in position - loose call', confidence: 55 };
        }
      }
      // LAG/maniac might 3-bet light
      if ((personality.style === 'LAG' || personality.style === 'maniac') && 
          Math.random() * 100 < personality.bluffFrequency * 0.5) {
        return { action: 'raise', amount: threeBetSize, reasoning: 'Aggressive 3-bet light', confidence: 45 };
      }
      return { action: 'fold', reasoning: 'Medium hand facing raise - fold', confidence: 60 };
    }
    // Open from middle or late position
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
    // PROFESSIONAL: Implied odds calculation for set mining
    const impliedOddsMultiplier = stack / (callAmount || 1);
    const hasGoodImpliedOdds = impliedOddsMultiplier >= 15; // 15:1 for set mining
    
    if (isRaised) {
      // Set mining with pairs - need 15:1 implied odds
      if (hand.paired && hasGoodImpliedOdds && players >= 2) {
        return { action: 'call', reasoning: `Set mining with ${impliedOddsMultiplier.toFixed(0)}:1 implied`, confidence: 55 };
      }
      
      // Suited connectors with good implied odds
      if (hand.suitedness && hand.connected && hasGoodImpliedOdds && callAmount < stack * 0.05) {
        return { action: 'call', reasoning: 'Suited connector - implied odds call', confidence: 48 };
      }
      
      // PROFESSIONAL: Squeeze play with suited Ax from button
      if (hand.highCard === 14 && hand.suitedness && position === 'button' && players >= 3) {
        if ((personality.style === 'LAG' || personality.style === 'maniac' || personality.style === 'GTO') &&
            Math.random() * 100 < personality.bluffFrequency * 0.4) {
          return { action: 'raise', amount: threeBetSize * 1.2, reasoning: 'Button squeeze with suited Ace', confidence: 45 };
        }
      }
      
      return { action: 'fold', reasoning: 'Speculative hand - fold to raise', confidence: 60 };
    }
    
    // Opening with speculative hands
    if (position === 'late' || position === 'button') {
      if (Math.random() * 100 < personality.aggression * 0.8) {
        return { action: 'raise', amount: raiseSize, reasoning: 'Speculative hand - steal attempt', confidence: 50 };
      }
      if (personality.style === 'loose_passive') {
        return { action: 'call', reasoning: 'Limp speculative hand', confidence: 45 };
      }
    }
    if (callAmount === 0) {
      return { action: 'check', reasoning: 'Speculative hand - check', confidence: 45 };
    }
    return { action: 'fold', reasoning: 'Speculative hand OOP - fold', confidence: 55 };
  }
  
  // Trash hands - PROFESSIONAL: Blocker-based steals
  if (callAmount === 0) {
    // Blocker-based button steal with Ace or King high
    if ((position === 'button' || position === 'late') && hand.hasBlockers) {
      if ((personality.style === 'LAG' || personality.style === 'maniac' || personality.style === 'GTO') &&
          Math.random() * 100 < personality.bluffFrequency) {
        return { action: 'raise', amount: raiseSize, reasoning: 'Blocker steal - blocks premiums', confidence: 40 };
      }
    }
    
    // Random bluff from button/late position for aggressive players
    if ((position === 'button' || position === 'late') && 
        (personality.style === 'LAG' || personality.style === 'maniac') && 
        Math.random() * 100 < personality.bluffFrequency * 0.7) {
      return { action: 'raise', amount: raiseSize, reasoning: 'Aggressive position steal', confidence: 35 };
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
