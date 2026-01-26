/**
 * Unified Poker Timing Configuration for Frontend
 * Single source of truth - mirrors server/src/config/pokerTimings.ts
 * 
 * ВАЖНО: Все тайминги должны соответствовать серверным настройкам
 * для синхронизации анимаций и игрового процесса
 */

// ============================================
// POKERSTARS-STYLE PHASE TIMINGS (ms)
// ============================================
export const PHASE_TIMINGS = {
  flop: {
    preDealDelay: 650,      // Pause before dealing flop
    perCardDelay: 200,      // Between each flop card
    postDealDelay: 350,     // After flop dealt
  },
  turn: {
    preDealDelay: 550,      // Burn + deal time
    perCardDelay: 0,        // Single card
    postDealDelay: 300,     // After turn
  },
  river: {
    preDealDelay: 550,      // Burn + deal time
    perCardDelay: 0,        // Single card
    postDealDelay: 300,     // After river
  },
  showdown: {
    preDealDelay: 300,      // Quick transition
    perCardDelay: 0,
    postDealDelay: 0,
  },
} as const;

// ============================================
// SHOWDOWN TIMINGS (ms)
// ============================================
export const SHOWDOWN_TIMINGS = {
  perPlayerReveal: 750,     // Delay between each player reveal
  cardFlipDuration: 350,    // Card flip animation
  winnerHighlight: 3000,    // Winner hand highlight duration
  potCollection: 800,       // Pot slides from center
  potSlideToWinner: 1500,   // Chips slide to winner
  winnerCelebration: 2000,  // Winner overlay display
  displayDuration: 4000,    // Total showdown display time
} as const;

// ============================================
// BET COLLECTION TIMINGS (ms)
// ============================================
export const BET_COLLECTION_TIMINGS = {
  slideToCenter: 500,       // Chips slide to pot center
  staggerPerPlayer: 80,     // Stagger per player
  pauseAfterCollection: 250, // Pause before next phase
  totalDuration: 700,       // Default total duration
} as const;

// ============================================
// CARD DEALING TIMINGS (ms)
// ============================================
export const CARD_DEAL_TIMINGS = {
  preDealHoleCards: 350,    // Pause before dealing hole cards
  perHoleCard: 100,         // Per hole card dealt
  cardDealDuration: 350,    // Single card deal animation
  cardFlipDuration: 350,    // Card flip animation
  burnCardDuration: 400,    // Burn card animation
} as const;

// ============================================
// HAND TRANSITION TIMINGS (ms)
// ============================================
export const HAND_TRANSITION_TIMINGS = {
  afterAction: 400,         // After each player action
  betweenHands: 3200,       // Between hands
  shuffleAnimation: 500,    // Shuffle animation
  minimumHandDisplay: 2500, // Minimum time to see showdown
} as const;

// ============================================
// ACTION TIMING (seconds) - Cash Game
// ============================================
export const CASH_ACTION_TIMING = {
  preflopUnraised: 15,
  preflopRaised: 15,
  postflop: 15,
  default: 15,
} as const;

// ============================================
// ACTION TIMING (seconds) - Tournament
// ============================================
export const TOURNAMENT_ACTION_TIMING = {
  preflopUnraised: 25,
  preflopRaised: 20,
  postflop: 20,
  default: 20,
} as const;

// ============================================
// TIME BANK (seconds)
// ============================================
export const TIME_BANK_CONFIG = {
  cash: {
    initial: 30,
    max: 60,
    replenishAmount: 5,
    replenishEveryNHands: 10,
  },
  tournament: {
    initial: 60,
    max: 120,
    replenishAmount: 5,
    replenishEveryNHands: 15,
    perLevelBonus: 5,
  },
} as const;

// ============================================
// VISUAL TIMER THRESHOLDS (seconds)
// ============================================
export const TIMER_THRESHOLDS = {
  warningSeconds: 10,       // Yellow warning
  criticalSeconds: 5,       // Red pulsing
} as const;

// ============================================
// ANIMATION DURATIONS (ms)
// ============================================
export const ANIMATION_DURATIONS = {
  pulseDuration: 400,
  colorTransition: 300,
  timeBankActivate: 500,
} as const;

// ============================================
// COMBINED TIMINGS OBJECT (for backward compatibility)
// ============================================
export const PROFESSIONAL_TIMINGS = {
  afterAction: HAND_TRANSITION_TIMINGS.afterAction,
  betCollection: BET_COLLECTION_TIMINGS.totalDuration,
  
  flop: {
    preDeal: PHASE_TIMINGS.flop.preDealDelay,
    perCard: PHASE_TIMINGS.flop.perCardDelay,
    postDeal: PHASE_TIMINGS.flop.postDealDelay,
  },
  turn: {
    preDeal: PHASE_TIMINGS.turn.preDealDelay,
    perCard: PHASE_TIMINGS.turn.perCardDelay,
    postDeal: PHASE_TIMINGS.turn.postDealDelay,
  },
  river: {
    preDeal: PHASE_TIMINGS.river.preDealDelay,
    perCard: PHASE_TIMINGS.river.perCardDelay,
    postDeal: PHASE_TIMINGS.river.postDealDelay,
  },
  
  showdown: {
    revealDelay: SHOWDOWN_TIMINGS.perPlayerReveal,
    winnerHighlight: SHOWDOWN_TIMINGS.winnerHighlight,
    potCollection: SHOWDOWN_TIMINGS.potSlideToWinner,
    displayDuration: SHOWDOWN_TIMINGS.displayDuration,
  },
  
  nextHand: {
    minDelay: HAND_TRANSITION_TIMINGS.betweenHands - 200,
    maxDelay: HAND_TRANSITION_TIMINGS.betweenHands + 300,
  },
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate total phase delay
 */
export function calculatePhaseDelay(phase: 'flop' | 'turn' | 'river' | 'showdown'): number {
  const timings = PHASE_TIMINGS[phase];
  let total = timings.preDealDelay + timings.postDealDelay;
  
  if (phase === 'flop') {
    total += timings.perCardDelay * 3;
  }
  
  return total;
}

/**
 * Calculate card deal delay for specific card index
 */
export function getCardDealDelay(cardIndex: number, phase: 'flop' | 'turn' | 'river'): number {
  if (phase === 'flop') {
    return PHASE_TIMINGS.flop.preDealDelay + (cardIndex * PHASE_TIMINGS.flop.perCardDelay);
  }
  if (phase === 'turn' && cardIndex === 3) {
    return PHASE_TIMINGS.turn.preDealDelay;
  }
  if (phase === 'river' && cardIndex === 4) {
    return PHASE_TIMINGS.river.preDealDelay;
  }
  return 0;
}

/**
 * Calculate bet collection total delay
 */
export function calculateBetCollectionDelay(playerCount: number): number {
  return BET_COLLECTION_TIMINGS.slideToCenter + 
         (playerCount * BET_COLLECTION_TIMINGS.staggerPerPlayer) + 
         BET_COLLECTION_TIMINGS.pauseAfterCollection;
}

/**
 * Calculate showdown total delay
 */
export function calculateShowdownDelay(playerCount: number): number {
  return (playerCount * SHOWDOWN_TIMINGS.perPlayerReveal) +
         SHOWDOWN_TIMINGS.winnerHighlight +
         SHOWDOWN_TIMINGS.potSlideToWinner;
}

export default PROFESSIONAL_TIMINGS;
