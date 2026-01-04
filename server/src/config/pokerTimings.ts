/**
 * Professional Poker Timing Configuration
 * Based on PokerStars / PPPoker / GGPoker standards
 * 
 * These delays create the polished feel of professional poker
 */

export interface PhaseTimings {
  /** Delay before dealing community cards (ms) */
  preDealDelay: number;
  /** Delay per card deal (ms) - for sequential card animation */
  perCardDelay: number;
  /** Delay after all cards dealt before action starts (ms) */
  postDealDelay: number;
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
  showdown: {
    /** Delay before revealing each player's cards */
    perPlayerReveal: number;
    /** Time to display winning hand highlight */
    winnerHighlight: number;
    /** Time for pot collection animation */
    potCollection: number;
  };
  
  /** Time between hands (ms) */
  betweenHands: number;
  
  /** Time for shuffle animation (ms) */
  shuffleAnimation: number;
  
  /** Minimum time a hand must display before next (ms) */
  minimumHandDisplay: number;
}

/**
 * Default professional timings - similar to PokerStars
 */
export const PROFESSIONAL_TIMINGS: ProfessionalTimings = {
  // 400ms after each action for UI feedback
  afterAction: 400,
  
  phases: {
    flop: {
      preDealDelay: 600,      // Pause before flop
      perCardDelay: 150,      // 3 cards: 0, 150, 300ms = 450ms total
      postDealDelay: 300,     // Pause after flop dealt
    },
    turn: {
      preDealDelay: 500,      // Burn + deal
      perCardDelay: 0,        // Single card
      postDealDelay: 250,     // Pause after turn
    },
    river: {
      preDealDelay: 500,      // Burn + deal
      perCardDelay: 0,        // Single card
      postDealDelay: 250,     // Pause after river
    },
    showdown: {
      preDealDelay: 300,      // Transition to showdown
      perCardDelay: 0,
      postDealDelay: 0,
    },
  },
  
  showdown: {
    perPlayerReveal: 500,    // Time to reveal each player's cards
    winnerHighlight: 2000,   // Time to highlight winning hand
    potCollection: 1000,     // Pot slides to winner animation
  },
  
  betweenHands: 3000,        // 3 seconds between hands
  shuffleAnimation: 500,     // Shuffle sound/animation
  minimumHandDisplay: 2000,  // Minimum time to see showdown result
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
    perPlayerReveal: 250,
    winnerHighlight: 1000,
    potCollection: 500,
  },
  
  betweenHands: 1500,
  shuffleAnimation: 250,
  minimumHandDisplay: 1000,
};

/**
 * Calculate total delay for phase transition
 */
export function calculatePhaseDelay(phase: 'flop' | 'turn' | 'river' | 'showdown', timings: ProfessionalTimings = PROFESSIONAL_TIMINGS): number {
  const phaseTimings = timings.phases[phase];
  
  let totalDelay = phaseTimings.preDealDelay + phaseTimings.postDealDelay;
  
  // Add per-card delay for flop (3 cards)
  if (phase === 'flop') {
    totalDelay += phaseTimings.perCardDelay * 3;
  }
  
  return totalDelay;
}

/**
 * Get the appropriate timings based on table type
 */
export function getTimingsForTableType(tableType: string): ProfessionalTimings {
  if (tableType === 'turbo' || tableType === 'hyper') {
    return TURBO_TIMINGS;
  }
  return PROFESSIONAL_TIMINGS;
}
