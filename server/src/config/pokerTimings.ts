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
 * Default professional timings - similar to PokerStars
 */
export const PROFESSIONAL_TIMINGS: ProfessionalTimings = {
  // 300ms after each action for UI feedback (PokerStars-style)
  afterAction: 300,
  
  phases: {
    flop: {
      preDealDelay: 400,      // Pause before flop
      perCardDelay: 100,      // 3 cards: 0, 100, 200ms = 300ms total
      postDealDelay: 200,     // Pause after flop dealt
    },
    turn: {
      preDealDelay: 350,      // Burn + deal
      perCardDelay: 0,        // Single card
      postDealDelay: 150,     // Pause after turn
    },
    river: {
      preDealDelay: 350,      // Burn + deal
      perCardDelay: 0,        // Single card
      postDealDelay: 150,     // Pause after river
    },
    showdown: {
      preDealDelay: 200,      // Transition to showdown
      perCardDelay: 0,
      postDealDelay: 0,
    },
  },
  
  // PokerStars-style showdown: fast and professional (~2-3 sec total)
  showdown: {
    perPlayerReveal: 300,    // Time to reveal each player's cards (quick flip)
    winnerHighlight: 1000,   // Time to highlight winning hand (1 sec)
    potCollection: 400,      // Pot slides from center
    potSlideToWinner: 300,   // Chips slide to winner
    winnerCelebration: 500,  // Winner overlay display (brief)
  },
  
  betCollection: {
    slideToCenter: 300,      // Chips slide to pot center
    staggerPerPlayer: 50,    // Stagger for realistic collection
    pauseAfterCollection: 150, // Brief pause before next phase
  },
  
  betweenHands: 1500,        // 1.5 seconds between hands (PokerStars standard)
  shuffleAnimation: 300,     // Shuffle sound/animation
  minimumHandDisplay: 800,   // Minimum time to see showdown result
  preDealHoleCards: 200,     // Pause before dealing hole cards
  perHoleCard: 80,           // Time per hole card dealt
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
