/**
 * Professional Poker Timing Configuration v3.0
 * Based on PokerStars / PPPoker / GGPoker standards
 * 
 * POKERSTARS-STYLE PROFESSIONAL FEATURES:
 * 1. Separate action times: preflop unraised vs raised pot
 * 2. Different postflop timing
 * 3. Time Bank with MAX LIMIT (cannot accumulate infinitely)
 * 4. Time Bank replenishment with proper capping
 * 5. Sit-out orbit limits
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

// ============================================
// POKERSTARS-STYLE ACTION TIMING CONFIG
// ============================================
export interface ActionTimingConfig {
  /** Action time when preflop and NO raise yet (limped pot) */
  preflopUnraised: number;
  /** Action time when preflop and FACING a raise */
  preflopRaised: number;
  /** Action time for all postflop streets (flop, turn, river) */
  postflop: number;
  /** Default fallback if phase cannot be determined */
  default: number;
}

// ============================================
// POKERSTARS-STYLE TIME BANK CONFIG
// ============================================
export interface TimeBankConfig {
  /** Initial time bank when player joins (seconds) */
  initial: number;
  /** MAXIMUM time bank limit - cannot exceed this (seconds) */
  max: number;
  /** Amount to replenish (seconds) */
  replenishAmount: number;
  /** How many hands between replenishments */
  replenishEveryNHands: number;
  /** Per-level bonus for tournaments (seconds) */
  perLevelBonus: number;
}

// ============================================
// SIT-OUT LIMITS CONFIG
// ============================================
export interface SitOutConfig {
  /** Maximum orbits a player can sit out before being removed */
  maxOrbits: number;
  /** Warning at this many orbits remaining */
  warningOrbits: number;
  /** Grace period after warning before removal (seconds) */
  gracePeriodSeconds: number;
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
  
  // ============================================
  // NEW: POKERSTARS-STYLE ACTION TIMING
  // ============================================
  /** Action timing configuration for different phases */
  actionTiming: ActionTimingConfig;
  
  /** Time bank configuration */
  timeBank: TimeBankConfig;
  
  /** Sit-out limits */
  sitOut: SitOutConfig;
}

// ============================================
// CASH GAME TIMINGS (STANDARD)
// ============================================
export const PROFESSIONAL_TIMINGS: ProfessionalTimings = {
  // 350ms after each action - slightly faster for snappier feel
  afterAction: 350,
  
  phases: {
    flop: {
      preDealDelay: 500,      // Pause before flop (PokerStars: ~500ms)
      perCardDelay: 120,      // 3 cards: 0, 120, 240ms = 360ms total (faster)
      postDealDelay: 250,     // Pause after flop dealt
    },
    turn: {
      preDealDelay: 400,      // Burn + deal (PokerStars: ~400ms)
      perCardDelay: 0,        // Single card
      postDealDelay: 200,     // Pause after turn
    },
    river: {
      preDealDelay: 400,      // Burn + deal (PokerStars: ~400ms)
      perCardDelay: 0,        // Single card
      postDealDelay: 200,     // Pause after river
    },
    showdown: {
      preDealDelay: 250,      // Quick transition to showdown
      perCardDelay: 0,
      postDealDelay: 0,
    },
  },
  
  showdown: {
    perPlayerReveal: 500,    // Faster reveal (PokerStars: ~500ms)
    winnerHighlight: 2000,   // Time to highlight winning hand
    potCollection: 600,      // Pot slides from center
    potSlideToWinner: 500,   // Chips slide to winner
    winnerCelebration: 1500, // Winner overlay display (shorter)
  },
  
  betCollection: {
    slideToCenter: 400,      // Chips slide to pot center
    staggerPerPlayer: 60,    // Stagger for realistic collection
    pauseAfterCollection: 200, // Brief pause before next phase
  },
  
  betweenHands: 2500,        // 2.5 seconds between hands (PokerStars standard)
  shuffleAnimation: 400,     // Shuffle sound/animation
  minimumHandDisplay: 1800,  // Minimum time to see showdown result
  preDealHoleCards: 250,     // Pause before dealing hole cards
  perHoleCard: 80,           // Time per hole card dealt
  
  // POKERSTARS-STYLE: Cash game action timing (seconds)
  actionTiming: {
    preflopUnraised: 15,     // 15s when limped pot
    preflopRaised: 15,       // 15s when facing raise (cash games same)
    postflop: 15,            // 15s for all postflop streets
    default: 15,             // Fallback
  },
  
  // POKERSTARS-STYLE: Cash game time bank (seconds)
  timeBank: {
    initial: 30,             // 30 seconds initial
    max: 60,                 // MAX 60 seconds (cannot exceed)
    replenishAmount: 5,      // +5 seconds
    replenishEveryNHands: 10, // Every 10 hands
    perLevelBonus: 0,        // No level bonus in cash games
  },
  
  // Sit-out limits for cash games
  sitOut: {
    maxOrbits: 4,            // Max 4 orbits sitting out
    warningOrbits: 1,        // Warning at 1 orbit remaining
    gracePeriodSeconds: 60,  // 60 second grace period
  },
};

// ============================================
// TOURNAMENT TIMINGS (STANDARD)
// ============================================
export const TOURNAMENT_TIMINGS: ProfessionalTimings = {
  ...PROFESSIONAL_TIMINGS,
  
  // Tournament action timing - more time, different for raised pot
  actionTiming: {
    preflopUnraised: 25,     // 25s when no raise (more time to think)
    preflopRaised: 20,       // 20s when facing raise (less decision time needed)
    postflop: 20,            // 20s for postflop
    default: 20,             // Fallback
  },
  
  // Tournament time bank - more generous
  timeBank: {
    initial: 60,             // 60 seconds initial
    max: 120,                // MAX 2 minutes (cannot exceed)
    replenishAmount: 5,      // +5 seconds
    replenishEveryNHands: 15, // Every 15 hands (slower in tournaments)
    perLevelBonus: 5,        // +5 seconds per level
  },
  
  // Sit-out limits for tournaments (stricter)
  sitOut: {
    maxOrbits: 2,            // Max 2 orbits (tournaments are stricter)
    warningOrbits: 1,        // Warning at 1 orbit remaining
    gracePeriodSeconds: 30,  // 30 second grace period
  },
};

// ============================================
// TURBO TIMINGS
// ============================================
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
  
  // Turbo action timing (faster)
  actionTiming: {
    preflopUnraised: 12,
    preflopRaised: 10,
    postflop: 10,
    default: 10,
  },
  
  // Turbo time bank (smaller)
  timeBank: {
    initial: 20,
    max: 40,
    replenishAmount: 3,
    replenishEveryNHands: 15,
    perLevelBonus: 3,
  },
  
  sitOut: {
    maxOrbits: 2,
    warningOrbits: 1,
    gracePeriodSeconds: 20,
  },
};

// ============================================
// HYPER-TURBO TIMINGS
// ============================================
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
  
  // Hyper-turbo action timing (very fast)
  actionTiming: {
    preflopUnraised: 8,
    preflopRaised: 6,
    postflop: 6,
    default: 6,
  },
  
  // Hyper-turbo time bank (minimal)
  timeBank: {
    initial: 10,
    max: 20,
    replenishAmount: 2,
    replenishEveryNHands: 20,
    perLevelBonus: 2,
  },
  
  sitOut: {
    maxOrbits: 1,
    warningOrbits: 0,
    gracePeriodSeconds: 10,
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

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
  if (tableType === 'tournament') {
    return TOURNAMENT_TIMINGS;
  }
  return PROFESSIONAL_TIMINGS;
}

// ============================================
// NEW: POKERSTARS-STYLE ACTION TIME HELPERS
// ============================================

/**
 * Get action time for specific phase and pot state
 * @param phase - Current hand phase
 * @param isRaisedPot - Whether there's been a raise preflop
 * @param timings - Timing config to use
 */
export function getActionTimeForPhase(
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown',
  isRaisedPot: boolean,
  timings: ProfessionalTimings = PROFESSIONAL_TIMINGS
): number {
  if (phase === 'preflop') {
    return isRaisedPot 
      ? timings.actionTiming.preflopRaised 
      : timings.actionTiming.preflopUnraised;
  }
  
  if (phase === 'flop' || phase === 'turn' || phase === 'river') {
    return timings.actionTiming.postflop;
  }
  
  // Showdown doesn't need action time
  return 0;
}

/**
 * Calculate time bank replenishment with MAX limit enforcement
 * @param currentTimeBank - Current time bank value
 * @param replenishAmount - Amount to add
 * @param maxTimeBank - Maximum allowed time bank
 */
export function calculateTimeBankReplenish(
  currentTimeBank: number,
  replenishAmount: number,
  maxTimeBank: number
): number {
  return Math.min(currentTimeBank + replenishAmount, maxTimeBank);
}

/**
 * Check if player should be removed for excessive sit-out
 * @param sitOutOrbits - Number of orbits player has sat out
 * @param config - Sit-out configuration
 */
export function shouldRemoveForSitOut(
  sitOutOrbits: number,
  config: SitOutConfig
): { shouldRemove: boolean; shouldWarn: boolean } {
  const orbitsRemaining = config.maxOrbits - sitOutOrbits;
  
  return {
    shouldRemove: orbitsRemaining <= 0,
    shouldWarn: orbitsRemaining <= config.warningOrbits && orbitsRemaining > 0
  };
}
