/**
 * Poker Engine Core - Pure game logic without database dependencies
 * Can be used in Edge Functions, Node.js server, or browser
 */

// ==========================================
// CONSTANTS
// ==========================================
export const SUITS = ['h', 'd', 'c', 's'] as const;
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;
export const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export const PHASES = ['preflop', 'flop', 'turn', 'river', 'showdown'] as const;
export type GamePhase = typeof PHASES[number];

export const DEFAULT_ACTION_TIME_SECONDS = 30;

// ==========================================
// TYPES
// ==========================================
export interface PlayerContribution {
  playerId: string;
  totalBet: number;
  isFolded: boolean;
  isAllIn: boolean;
}

export interface SidePot {
  amount: number;
  eligiblePlayers: string[];
  cappedAt: number;
}

export interface PotResult {
  mainPot: SidePot;
  sidePots: SidePot[];
  totalPot: number;
}

export interface HandResult {
  playerId: string;
  handRank: number;
  handName: string;
  bestCards: string[];
  kickers: number[];
}

export interface GamePlayer {
  id: string;
  seatNumber: number;
  stack: number;
  betAmount: number;
  holeCards: string[];
  isFolded: boolean;
  isAllIn: boolean;
  isSittingOut: boolean;
}

export interface GameState {
  tableId: string;
  handId: string | null;
  phase: GamePhase;
  pot: number;
  currentBet: number;
  communityCards: string[];
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  currentPlayerSeat: number | null;
  players: GamePlayer[];
  deck: string[];
  smallBlind: number;
  bigBlind: number;
  sidePots: SidePot[];
  winners: { playerId: string; amount: number; handName: string }[];
  isComplete: boolean;
}

export interface ActionResult {
  success: boolean;
  error?: string;
  action?: string;
  amount?: number;
  pot?: number;
  currentBet?: number;
  nextPlayerSeat?: number | null;
  phase?: GamePhase;
  communityCards?: string[];
  handComplete?: boolean;
  winners?: { playerId: string; amount: number; handName: string }[];
  sidePots?: SidePot[];
  showdownOrder?: string[];
  handResults?: { playerId: string; handName: string; bestCards: string[] }[];
}

// ==========================================
// DECK MANAGEMENT
// ==========================================
export function createDeck(): string[] {
  const deck: string[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`);
    }
  }
  // Cryptographically secure shuffle
  const array = new Uint32Array(deck.length);
  crypto.getRandomValues(array);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = array[i] % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function shuffleDeck(deck: string[]): string[] {
  const shuffled = [...deck];
  const array = new Uint32Array(shuffled.length);
  crypto.getRandomValues(array);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = array[i] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ==========================================
// SIDE POT CALCULATION
// ==========================================
export function calculateSidePots(contributions: PlayerContribution[]): PotResult {
  const empty: PotResult = { 
    mainPot: { amount: 0, eligiblePlayers: [], cappedAt: 0 }, 
    sidePots: [], 
    totalPot: 0 
  };
  
  if (contributions.length === 0) return empty;

  const activeBettors = contributions.filter(c => c.totalBet > 0);
  if (activeBettors.length === 0) return empty;

  // Get unique bet levels from all-in players
  const allInLevels = new Set<number>();
  for (const c of activeBettors) {
    if (c.isAllIn && c.totalBet > 0) allInLevels.add(c.totalBet);
  }
  allInLevels.add(Math.max(...activeBettors.map(c => c.totalBet)));

  const levels = Array.from(allInLevels).sort((a, b) => a - b);
  const pots: SidePot[] = [];
  let previousLevel = 0;

  for (const level of levels) {
    const increment = level - previousLevel;
    if (increment <= 0) continue;

    let potAmount = 0;
    const eligiblePlayers: string[] = [];

    for (const c of activeBettors) {
      if (c.totalBet > previousLevel) {
        potAmount += Math.min(c.totalBet - previousLevel, increment);
        if (!c.isFolded && c.totalBet >= level && !eligiblePlayers.includes(c.playerId)) {
          eligiblePlayers.push(c.playerId);
        }
      }
    }

    if (potAmount > 0) pots.push({ amount: potAmount, eligiblePlayers, cappedAt: level });
    previousLevel = level;
  }

  const [mainPot, ...sidePots] = pots;
  return {
    mainPot: mainPot || { amount: 0, eligiblePlayers: [], cappedAt: 0 },
    sidePots,
    totalPot: pots.reduce((sum, pot) => sum + pot.amount, 0)
  };
}

// ==========================================
// HAND EVALUATION
// ==========================================
function getSortedValues(cards: string[]): number[] {
  return cards.map(c => RANK_VALUES[c[0]]).sort((a, b) => b - a);
}

function isFlush(cards: string[]): boolean {
  const suit = cards[0][1];
  return cards.every(c => c[1] === suit);
}

function isStraight(values: number[]): { isStraight: boolean; highCard: number } {
  const sorted = [...new Set(values)].sort((a, b) => b - a);
  
  for (let i = 0; i <= sorted.length - 5; i++) {
    if (sorted[i] - sorted[i + 4] === 4) {
      return { isStraight: true, highCard: sorted[i] };
    }
  }
  
  // Wheel (A-5-4-3-2)
  if (sorted.includes(14) && sorted.includes(5) && sorted.includes(4) && 
      sorted.includes(3) && sorted.includes(2)) {
    return { isStraight: true, highCard: 5 };
  }
  
  return { isStraight: false, highCard: 0 };
}

function getRankCounts(cards: string[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const card of cards) {
    const value = RANK_VALUES[card[0]];
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

export function compareKickers(a: number[], b: number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function evaluateFiveCards(cards: string[]): HandResult {
  const values = getSortedValues(cards);
  const flush = isFlush(cards);
  const straightResult = isStraight(values);
  const rankCounts = getRankCounts(cards);
  
  const countsArray = Array.from(rankCounts.entries()).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const counts = countsArray.map(c => c[1]);
  const rankedValues = countsArray.map(c => c[0]);

  if (flush && straightResult.isStraight && straightResult.highCard === 14) {
    return { playerId: '', handRank: 10, handName: 'Royal Flush', bestCards: cards, kickers: [14] };
  }
  if (flush && straightResult.isStraight) {
    return { playerId: '', handRank: 9, handName: 'Straight Flush', bestCards: cards, kickers: [straightResult.highCard] };
  }
  if (counts[0] === 4) {
    return { playerId: '', handRank: 8, handName: 'Four of a Kind', bestCards: cards, kickers: rankedValues };
  }
  if (counts[0] === 3 && counts[1] >= 2) {
    return { playerId: '', handRank: 7, handName: 'Full House', bestCards: cards, kickers: rankedValues.slice(0, 2) };
  }
  if (flush) {
    return { playerId: '', handRank: 6, handName: 'Flush', bestCards: cards, kickers: values.slice(0, 5) };
  }
  if (straightResult.isStraight) {
    return { playerId: '', handRank: 5, handName: 'Straight', bestCards: cards, kickers: [straightResult.highCard] };
  }
  if (counts[0] === 3) {
    return { playerId: '', handRank: 4, handName: 'Three of a Kind', bestCards: cards, kickers: rankedValues };
  }
  if (counts[0] === 2 && counts[1] === 2) {
    return { playerId: '', handRank: 3, handName: 'Two Pair', bestCards: cards, kickers: rankedValues };
  }
  if (counts[0] === 2) {
    return { playerId: '', handRank: 2, handName: 'One Pair', bestCards: cards, kickers: rankedValues };
  }
  return { playerId: '', handRank: 1, handName: 'High Card', bestCards: cards, kickers: values.slice(0, 5) };
}

export function evaluateHand(holeCards: string[], communityCards: string[]): HandResult {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 5) {
    return { playerId: '', handRank: 0, handName: 'Unknown', bestCards: [], kickers: [] };
  }

  // Generate all 5-card combinations
  const combinations: string[][] = [];
  for (let i = 0; i < allCards.length - 4; i++) {
    for (let j = i + 1; j < allCards.length - 3; j++) {
      for (let k = j + 1; k < allCards.length - 2; k++) {
        for (let l = k + 1; l < allCards.length - 1; l++) {
          for (let m = l + 1; m < allCards.length; m++) {
            combinations.push([allCards[i], allCards[j], allCards[k], allCards[l], allCards[m]]);
          }
        }
      }
    }
  }

  let bestResult: HandResult = { playerId: '', handRank: 0, handName: 'High Card', bestCards: [], kickers: [] };

  for (const combo of combinations) {
    const result = evaluateFiveCards(combo);
    if (result.handRank > bestResult.handRank || 
       (result.handRank === bestResult.handRank && compareKickers(result.kickers, bestResult.kickers) > 0)) {
      bestResult = result;
    }
  }

  return bestResult;
}

export function compareHands(a: HandResult, b: HandResult): number {
  if (a.handRank !== b.handRank) return a.handRank - b.handRank;
  return compareKickers(a.kickers, b.kickers);
}

// ==========================================
// GAME LOGIC HELPERS
// ==========================================
export function getNextPhase(current: string): GamePhase {
  const idx = PHASES.indexOf(current as GamePhase);
  return idx < PHASES.length - 1 ? PHASES[idx + 1] : 'showdown';
}

export function findNextActivePlayer(
  players: GamePlayer[], 
  currentSeat: number, 
  excludePlayerId?: string
): GamePlayer | undefined {
  const sorted = [...players].sort((a, b) => a.seatNumber - b.seatNumber);
  
  // First try to find player after current seat
  let next = sorted.find(p => 
    p.seatNumber > currentSeat && 
    !p.isFolded && 
    !p.isAllIn && 
    p.id !== excludePlayerId &&
    !p.isSittingOut
  );
  
  // If not found, wrap around to beginning
  if (!next) {
    next = sorted.find(p => 
      !p.isFolded && 
      !p.isAllIn && 
      p.id !== excludePlayerId &&
      !p.isSittingOut
    );
  }
  
  return next;
}

export function findFirstToActPostflop(
  players: GamePlayer[],
  dealerSeat: number
): GamePlayer | undefined {
  const active = players.filter(p => !p.isFolded && !p.isAllIn && !p.isSittingOut);
  const sorted = [...active].sort((a, b) => a.seatNumber - b.seatNumber);
  
  // First active player after dealer
  return sorted.find(p => p.seatNumber > dealerSeat) || sorted[0];
}

// ==========================================
// DEALING HELPERS
// ==========================================
export function dealHoleCards(deck: string[], playerCount: number): { cards: string[][]; remainingDeck: string[] } {
  const cards: string[][] = [];
  let deckIndex = 0;
  
  for (let i = 0; i < playerCount; i++) {
    cards.push([deck[deckIndex++], deck[deckIndex++]]);
  }
  
  return { cards, remainingDeck: deck.slice(deckIndex) };
}

export function dealCommunityCards(
  deck: string[], 
  playerCount: number, 
  currentCards: string[], 
  targetPhase: GamePhase
): string[] {
  const deckStart = playerCount * 2;
  
  if (targetPhase === 'flop' && currentCards.length === 0) {
    // Burn 1, deal 3
    return [deck[deckStart + 1], deck[deckStart + 2], deck[deckStart + 3]];
  }
  if (targetPhase === 'turn' && currentCards.length === 3) {
    // Burn 1, deal 1
    return [...currentCards, deck[deckStart + 5]];
  }
  if (targetPhase === 'river' && currentCards.length === 4) {
    // Burn 1, deal 1
    return [...currentCards, deck[deckStart + 7]];
  }
  
  return currentCards;
}

export function dealRemainingCards(
  deck: string[],
  playerCount: number,
  currentCards: string[]
): string[] {
  const deckStart = playerCount * 2;
  let cards = [...currentCards];
  
  while (cards.length < 5) {
    if (cards.length === 0) {
      cards = [deck[deckStart + 1], deck[deckStart + 2], deck[deckStart + 3]];
    } else if (cards.length === 3) {
      cards.push(deck[deckStart + 5]);
    } else if (cards.length === 4) {
      cards.push(deck[deckStart + 7]);
    }
  }
  
  return cards;
}

// ==========================================
// POSITION HELPERS
// ==========================================
export function calculatePositions(
  players: GamePlayer[],
  previousDealerSeat: number | null
): { dealerSeat: number; sbSeat: number; bbSeat: number; firstToActSeat: number } {
  const sorted = [...players]
    .filter(p => p.stack > 0 && !p.isSittingOut)
    .sort((a, b) => a.seatNumber - b.seatNumber);
  
  if (sorted.length < 2) {
    throw new Error('Need at least 2 active players');
  }
  
  // Determine dealer (rotate from previous)
  let dealerIndex = 0;
  if (previousDealerSeat !== null) {
    const prevIdx = sorted.findIndex(p => p.seatNumber === previousDealerSeat);
    dealerIndex = prevIdx >= 0 ? (prevIdx + 1) % sorted.length : 0;
  }
  
  const dealerSeat = sorted[dealerIndex].seatNumber;
  const isHeadsUp = sorted.length === 2;
  
  // Heads-up: dealer is SB
  const sbIndex = isHeadsUp ? dealerIndex : (dealerIndex + 1) % sorted.length;
  const bbIndex = isHeadsUp ? (dealerIndex + 1) % sorted.length : (dealerIndex + 2) % sorted.length;
  
  // First to act preflop: after BB (or SB in heads-up)
  const firstToActIndex = isHeadsUp ? sbIndex : (bbIndex + 1) % sorted.length;
  
  return {
    dealerSeat,
    sbSeat: sorted[sbIndex].seatNumber,
    bbSeat: sorted[bbIndex].seatNumber,
    firstToActSeat: sorted[firstToActIndex].seatNumber
  };
}

// ==========================================
// BETTING LOGIC
// ==========================================
export interface BettingAction {
  type: 'fold' | 'check' | 'call' | 'raise' | 'all_in';
  amount?: number;
}

export interface BettingResult {
  valid: boolean;
  error?: string;
  newBet: number;
  newStack: number;
  actionAmount: number;
  isFolded: boolean;
  isAllIn: boolean;
}

export function validateAndProcessAction(
  action: BettingAction,
  player: GamePlayer,
  currentBet: number,
  bigBlind: number
): BettingResult {
  let actionAmount = 0;
  let newBet = player.betAmount;
  let newStack = player.stack;
  let isFolded = player.isFolded;
  let isAllIn = player.isAllIn;
  
  switch (action.type) {
    case 'fold':
      isFolded = true;
      break;
      
    case 'check':
      if (currentBet > player.betAmount) {
        return { valid: false, error: 'Cannot check, must call or raise', newBet, newStack, actionAmount, isFolded, isAllIn };
      }
      break;
      
    case 'call':
      const toCall = currentBet - player.betAmount;
      actionAmount = Math.min(toCall, player.stack);
      newBet = player.betAmount + actionAmount;
      newStack = player.stack - actionAmount;
      if (newStack === 0) isAllIn = true;
      break;
      
    case 'raise':
      const totalRaise = action.amount || (currentBet * 2);
      const minRaise = currentBet + bigBlind;
      
      actionAmount = totalRaise - player.betAmount;
      
      if (actionAmount > player.stack) {
        actionAmount = player.stack;
        isAllIn = true;
      } else if (totalRaise < minRaise && player.stack > minRaise - player.betAmount) {
        actionAmount = minRaise - player.betAmount;
      }
      
      newBet = player.betAmount + actionAmount;
      newStack = player.stack - actionAmount;
      if (newStack === 0) isAllIn = true;
      break;
      
    case 'all_in':
      actionAmount = player.stack;
      newBet = player.betAmount + actionAmount;
      newStack = 0;
      isAllIn = true;
      break;
  }
  
  return { valid: true, newBet, newStack, actionAmount, isFolded, isAllIn };
}

// ==========================================
// SHOWDOWN LOGIC
// ==========================================
export interface ShowdownPlayer {
  playerId: string;
  seatNumber: number;
  holeCards: string[];
  allInPhase: number;
  allInOrder: number;
  isLastAggressor: boolean;
}

export interface ShowdownResult {
  winners: { playerId: string; amount: number; handName: string }[];
  handResults: HandResult[];
  showdownOrder: string[];
  sidePots: SidePot[];
}

export function determineShowdownOrder(
  players: GamePlayer[],
  actions: { playerId: string; type: string; phase: string }[],
  dealerSeat: number
): string[] {
  const phaseOrder: Record<string, number> = { 'preflop': 0, 'flop': 1, 'turn': 2, 'river': 3 };
  
  // Find all-in actions per player
  const playerAllIns = new Map<string, { phase: number; order: number }>();
  actions.forEach((a, idx) => {
    if (a.type === 'all_in' && !playerAllIns.has(a.playerId)) {
      playerAllIns.set(a.playerId, { 
        phase: phaseOrder[a.phase] ?? 99, 
        order: idx 
      });
    }
  });
  
  // Find last aggressor
  let lastAggressor: string | null = null;
  const phases = ['river', 'turn', 'flop', 'preflop'];
  for (const phase of phases) {
    const phaseActions = actions.filter(a => a.phase === phase);
    const aggressiveActions = phaseActions.filter(a => 
      a.type === 'raise' || a.type === 'bet' || a.type === 'all_in'
    );
    if (aggressiveActions.length > 0) {
      lastAggressor = aggressiveActions[aggressiveActions.length - 1].playerId;
      break;
    }
  }
  
  // Build showdown order
  const showdownPlayers = players
    .filter(p => !p.isFolded)
    .map(p => {
      const allInInfo = playerAllIns.get(p.id);
      return {
        playerId: p.id,
        seatNumber: p.seatNumber,
        allInPhase: allInInfo?.phase ?? 99,
        allInOrder: allInInfo?.order ?? 999,
        isLastAggressor: p.id === lastAggressor
      };
    });
  
  // Sort: all-in (earliest first) -> last aggressor -> clockwise from dealer
  showdownPlayers.sort((a, b) => {
    if (a.allInPhase !== b.allInPhase) return a.allInPhase - b.allInPhase;
    if (a.allInPhase < 99 && a.allInOrder !== b.allInOrder) return a.allInOrder - b.allInOrder;
    if (a.isLastAggressor && !b.isLastAggressor) return -1;
    if (!a.isLastAggressor && b.isLastAggressor) return 1;
    
    const aAfterDealer = a.seatNumber > dealerSeat ? 0 : 1;
    const bAfterDealer = b.seatNumber > dealerSeat ? 0 : 1;
    if (aAfterDealer !== bAfterDealer) return aAfterDealer - bAfterDealer;
    
    return a.seatNumber - b.seatNumber;
  });
  
  return showdownPlayers.map(sp => sp.playerId);
}

export function distributeWinnings(
  players: GamePlayer[],
  communityCards: string[],
  showdownOrder: string[]
): ShowdownResult {
  const remaining = players.filter(p => !p.isFolded);
  
  // Calculate contributions
  const contributions: PlayerContribution[] = players.map(p => ({
    playerId: p.id,
    totalBet: p.betAmount,
    isFolded: p.isFolded,
    isAllIn: p.isAllIn
  }));
  
  const potResult = calculateSidePots(contributions);
  
  // Evaluate hands in showdown order
  const handResults: HandResult[] = [];
  for (const pid of showdownOrder) {
    const player = remaining.find(r => r.id === pid);
    if (player) {
      const ev = evaluateHand(player.holeCards, communityCards);
      handResults.push({ ...ev, playerId: player.id });
    }
  }
  
  // Distribute pots
  const winnings = new Map<string, number>();
  const winnersInfo: { playerId: string; amount: number; handName: string }[] = [];
  const allPots = [potResult.mainPot, ...potResult.sidePots];
  
  for (const pot of allPots) {
    if (pot.amount === 0) continue;
    const eligible = handResults.filter(hr => pot.eligiblePlayers.includes(hr.playerId));
    if (eligible.length === 0) continue;
    
    eligible.sort((a, b) => compareHands(b, a));
    const best = eligible[0];
    const winners = eligible.filter(hr => 
      hr.handRank === best.handRank && compareKickers(hr.kickers, best.kickers) === 0
    );
    
    const share = Math.floor(pot.amount / winners.length);
    const rem = pot.amount % winners.length;
    
    winners.forEach((w, i) => {
      const amt = share + (i === 0 ? rem : 0);
      winnings.set(w.playerId, (winnings.get(w.playerId) || 0) + amt);
      winnersInfo.push({ playerId: w.playerId, amount: amt, handName: w.handName });
    });
  }
  
  return {
    winners: winnersInfo,
    handResults,
    showdownOrder,
    sidePots: allPots
  };
}

// ==========================================
// BETTING ROUND COMPLETION CHECK
// ==========================================
export function isBettingRoundComplete(
  players: GamePlayer[],
  currentBet: number,
  phase: GamePhase,
  bigBlindSeat: number,
  actions: { playerId: string; type: string; phase: string }[]
): boolean {
  const remaining = players.filter(p => !p.isFolded);
  const active = remaining.filter(p => !p.isAllIn);
  
  // If only all-in players remain, round is complete
  if (active.length === 0 && remaining.length > 1) {
    return true;
  }
  
  // Check if all remaining players have matched the bet
  for (const p of remaining) {
    if (p.isAllIn) continue;
    if (p.betAmount < currentBet) {
      return false;
    }
  }
  
  // Preflop: BB gets option if no raise
  if (phase === 'preflop') {
    const bbPlayer = remaining.find(p => p.seatNumber === bigBlindSeat);
    if (bbPlayer && !bbPlayer.isAllIn) {
      const phaseActions = actions.filter(a => a.phase === 'preflop');
      const hasRaise = phaseActions.some(a => a.type === 'raise' || a.type === 'all_in');
      const bbHasActed = phaseActions.some(a => {
        const player = players.find(p => p.id === a.playerId);
        return player?.seatNumber === bigBlindSeat && 
          ['check', 'raise', 'call', 'fold'].includes(a.type);
      });
      
      if (!hasRaise && !bbHasActed) {
        return false;
      }
    }
  }
  
  return true;
}

// ==========================================
// HAND RANKING DISPLAY
// ==========================================
export const HAND_RANK_NAMES: Record<number, string> = {
  10: 'Royal Flush',
  9: 'Straight Flush',
  8: 'Four of a Kind',
  7: 'Full House',
  6: 'Flush',
  5: 'Straight',
  4: 'Three of a Kind',
  3: 'Two Pair',
  2: 'One Pair',
  1: 'High Card',
  0: 'Unknown'
};

export const HAND_RANK_NAMES_RU: Record<number, string> = {
  10: 'Роял Флэш',
  9: 'Стрит Флэш',
  8: 'Каре',
  7: 'Фулл Хаус',
  6: 'Флэш',
  5: 'Стрит',
  4: 'Тройка',
  3: 'Две Пары',
  2: 'Пара',
  1: 'Старшая Карта',
  0: 'Неизвестно'
};
