/**
 * Professional Poker Timing Configuration v2.0
 * Based on PokerStars / PPPoker / GGPoker standards
 * 
 * These delays create the polished feel of professional poker
 * with synchronized animations between server and client
 */

export interface PhaseTimings {
  /** Delay before dealing community cards (ms) */
  preDealDelay: number;
  /** Delay per card deal (ms) - for sequential card animation */
  perCardDelay: number;
  /** Delay after all cards dealt before action starts (ms) */
  postDealDelay: number;
}

export interface ShowdownTimings {
  /** Delay before revealing each player's cards */
  perPlayerReveal: number;
  /** Time to display winning hand highlight */
  winnerHighlight: number;
  /** Time for pot collection animation */
  potCollection: number;
  /** Time for chips sliding to winner */
  potSlideToWinner: number;
  /** Time for winner celebration overlay */
  winnerCelebration: number;
}

export interface BetCollectionTimings {
  /** Time for chip stacks to slide to pot center */
  slideToCenter: number;
  /** Stagger delay per player for collection animation */
  staggerPerPlayer: number;
  /** Pause after all chips collected before next phase */
  pauseAfterCollection: number;
}

export interface ProfessionalTimings {
  /** Delay after each player action (ms) - for pot/bet animation */
  afterAction: number;
  
  /** Phase-specific timings */
  phases: {
    flop: PhaseTimings;
    turn: PhaseTimings;
    river: PhaseTimings;
    showdown: PhaseTimings;
  };
  
  /** Showdown timing (ms) */
  showdown: ShowdownTimings;
  
  /** Bet collection timing (ms) */
  betCollection: BetCollectionTimings;
  
  /** Time between hands (ms) */
  betweenHands: number;
  
  /** Time for shuffle animation (ms) */
  shuffleAnimation: number;
  
  /** Minimum time a hand must display before next (ms) */
  minimumHandDisplay: number;
  
  /** Delay before dealing hole cards (ms) */
  preDealHoleCards: number;
  
  /** Delay per hole card dealt (ms) */
  perHoleCard: number;
}

/**
 * Default professional timings - based on PokerStars/GGPoker actual measurements
 * Total phase transition times:
 * - Flop: ~400ms (was 1050ms)
 * - Turn: ~300ms (was 750ms)  
 * - River: ~300ms (was 750ms)
 * - Showdown: ~2000ms total (was 6000ms+)
 * - Between hands: 1500ms (was 3000ms)
 */
export const PROFESSIONAL_TIMINGS: ProfessionalTimings = {
  // 200ms after each action for UI feedback (PokerStars: ~150-250ms)
  afterAction: 200,
  
  phases: {
    flop: {
      preDealDelay: 200,      // Quick pause before flop
      perCardDelay: 80,       // 3 cards: 0, 80, 160ms = 240ms total
      postDealDelay: 150,     // Brief pause after flop dealt
    },
    turn: {
      preDealDelay: 200,      // Burn + deal
      perCardDelay: 0,        // Single card
      postDealDelay: 100,     // Quick pause after turn
    },
    river: {
      preDealDelay: 200,      // Burn + deal
      perCardDelay: 0,        // Single card
      postDealDelay: 100,     // Quick pause after river
    },
    showdown: {
      preDealDelay: 150,      // Quick transition to showdown
      perCardDelay: 0,
      postDealDelay: 0,
    },
  },
  
  showdown: {
    perPlayerReveal: 300,    // Fast card flip (PokerStars: ~250-350ms)
    winnerHighlight: 1200,   // Highlight winning hand (PokerStars: ~1000-1500ms)
    potCollection: 400,      // Pot slides from center
    potSlideToWinner: 300,   // Chips slide to winner
    winnerCelebration: 800,  // Brief winner overlay
  },
  
  betCollection: {
    slideToCenter: 300,      // Chips slide to pot center (PokerStars: ~300ms)
    staggerPerPlayer: 50,    // Minimal stagger
    pauseAfterCollection: 150, // Brief pause before next phase
  },
  
  betweenHands: 1500,        // 1.5 seconds between hands (PokerStars: ~1.5-2s)
  shuffleAnimation: 200,     // Quick shuffle
  minimumHandDisplay: 1000,  // Minimum time to see showdown result
  preDealHoleCards: 150,     // Quick pause before dealing hole cards
  perHoleCard: 60,           // Fast hole card dealing
};

/**
 * Fast/Turbo timings for quick games
 */
export const TURBO_TIMINGS: ProfessionalTimings = {
  afterAction: 200,
  
  phases: {
    flop: {
      preDealDelay: 300,
      perCardDelay: 75,
      postDealDelay: 150,
    },
    turn: {
      preDealDelay: 250,
      perCardDelay: 0,
      postDealDelay: 125,
    },
    river: {
      preDealDelay: 250,
      perCardDelay: 0,
      postDealDelay: 125,
    },
    showdown: {
      preDealDelay: 150,
      perCardDelay: 0,
      postDealDelay: 0,
    },
  },
  
  showdown: {
    perPlayerReveal: 300,
    winnerHighlight: 1200,
    potCollection: 400,
    potSlideToWinner: 300,
    winnerCelebration: 1000,
  },
  
  betCollection: {
    slideToCenter: 250,
    staggerPerPlayer: 40,
    pauseAfterCollection: 150,
  },
  
  betweenHands: 1500,
  shuffleAnimation: 250,
  minimumHandDisplay: 1000,
  preDealHoleCards: 150,
  perHoleCard: 50,
};

/**
 * Hyper-turbo for satellites and fast SNGs
 */
export const HYPER_TURBO_TIMINGS: ProfessionalTimings = {
  afterAction: 100,
  
  phases: {
    flop: {
      preDealDelay: 150,
      perCardDelay: 50,
      postDealDelay: 100,
    },
    turn: {
      preDealDelay: 150,
      perCardDelay: 0,
      postDealDelay: 75,
    },
    river: {
      preDealDelay: 150,
      perCardDelay: 0,
      postDealDelay: 75,
    },
    showdown: {
      preDealDelay: 100,
      perCardDelay: 0,
      postDealDelay: 0,
    },
  },
  
  showdown: {
    perPlayerReveal: 200,
    winnerHighlight: 800,
    potCollection: 250,
    potSlideToWinner: 200,
    winnerCelebration: 600,
  },
  
  betCollection: {
    slideToCenter: 150,
    staggerPerPlayer: 25,
    pauseAfterCollection: 100,
  },
  
  betweenHands: 1000,
  shuffleAnimation: 150,
  minimumHandDisplay: 600,
  preDealHoleCards: 100,
  perHoleCard: 30,
};

/**
 * Calculate total delay for phase transition
 */
export function calculatePhaseDelay(
  phase: 'flop' | 'turn' | 'river' | 'showdown', 
  timings: ProfessionalTimings = PROFESSIONAL_TIMINGS
): number {
  const phaseTimings = timings.phases[phase];
  
  let totalDelay = phaseTimings.preDealDelay + phaseTimings.postDealDelay;
  
  // Add per-card delay for flop (3 cards)
  if (phase === 'flop') {
    totalDelay += phaseTimings.perCardDelay * 3;
  }
  
  return totalDelay;
}

/**
 * Calculate total showdown delay based on number of players
 */
export function calculateShowdownDelay(
  playerCount: number,
  timings: ProfessionalTimings = PROFESSIONAL_TIMINGS
): number {
  const revealTime = playerCount * timings.showdown.perPlayerReveal;
  const highlightTime = timings.showdown.winnerHighlight;
  const potTime = timings.showdown.potCollection + timings.showdown.potSlideToWinner;
  const celebrationTime = timings.showdown.winnerCelebration;
  
  return revealTime + highlightTime + potTime + celebrationTime;
}

/**
 * Calculate bet collection delay based on number of active players
 */
export function calculateBetCollectionDelay(
  playerCount: number,
  timings: ProfessionalTimings = PROFESSIONAL_TIMINGS
): number {
  const slideTime = timings.betCollection.slideToCenter;
  const staggerTime = playerCount * timings.betCollection.staggerPerPlayer;
  const pauseTime = timings.betCollection.pauseAfterCollection;
  
  return slideTime + staggerTime + pauseTime;
}

/**
 * Get the appropriate timings based on table type
 */
export function getTimingsForTableType(tableType: string): ProfessionalTimings {
  if (tableType === 'hyper' || tableType === 'hyper_turbo') {
    return HYPER_TURBO_TIMINGS;
  }
  if (tableType === 'turbo') {
    return TURBO_TIMINGS;
  }
  return PROFESSIONAL_TIMINGS;
}
