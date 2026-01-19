/**
 * PokerStars-Style Timer Configuration
 * ===========================================
 * 
 * OFFICIAL POKERSTARS TIMER VALUES:
 * 
 * | Parameter            | Cash Game  | Tournament    |
 * |----------------------|------------|---------------|
 * | Base Time (no raise) | 15 sec     | 20-30 sec     |
 * | Base Time (raised)   | 15 sec     | 15-20 sec     |
 * | Postflop Time        | 15 sec     | 15-25 sec     |
 * | Time Bank Initial    | 30 sec     | 30-60 sec     |
 * | Time Bank Max        | 60 sec     | 120 sec       |
 * | Time Bank Replenish  | +5s/10hands| +5s/level     |
 * | Warning (yellow)     | < 10 sec   | < 10 sec      |
 * | Critical (red+pulse) | < 5 sec    | < 5 sec       |
 * | Disconnect Protect   | 60 sec     | 60-120 sec    |
 * 
 * KEY PRINCIPLES:
 * 1. Server-Authoritative Time - Server is the ONLY source of truth
 * 2. Client NEVER triggers auto-fold - only displays countdown
 * 3. timeRemaining sent with every state update
 * 4. Time Bank activates ONLY when main timer = 0
 * 5. Time Bank persists across hands (NOT reset each hand)
 * 6. Time Bank replenishes slowly (+5s every N hands)
 * 7. Time Bank has MAX LIMIT - cannot accumulate infinitely
 * 8. Graceful Timeout: check if possible, otherwise fold
 * 9. Different action times for preflop (unraised vs raised)
 */

// ============================================
// TIMER THRESHOLDS (in seconds)
// ============================================
export const POKERSTARS_TIMER = {
  // Visual warning thresholds
  WARNING_SECONDS: 10,    // Yellow warning starts at 10 seconds
  CRITICAL_SECONDS: 5,    // Red pulsing starts at 5 seconds
  
  // Default action times (server-side, these are just for reference/fallback)
  CASH_GAME: {
    // POKERSTARS-STYLE: Separate preflop times
    ACTION_TIME_PREFLOP_UNRAISED: 15,  // 15s when no raise (limped pot)
    ACTION_TIME_PREFLOP_RAISED: 15,    // 15s when facing raise
    ACTION_TIME_POSTFLOP: 15,          // 15s for all postflop streets
    
    // Legacy/simple (fallback)
    BASE_TIME: 15,
    
    // Time Bank with MAX LIMIT
    TIME_BANK_INITIAL: 30,     // 30 seconds initial time bank
    TIME_BANK_MAX: 60,         // Maximum 60 seconds (can't exceed this)
    TIME_BANK_REPLENISH: 5,    // +5 seconds
    TIME_BANK_REPLENISH_HANDS: 10, // Every 10 hands
    
    DISCONNECT_PROTECTION: 60, // 60 seconds
  },
  
  TOURNAMENT: {
    // POKERSTARS-STYLE: Separate preflop times (tournaments have longer times)
    ACTION_TIME_PREFLOP_UNRAISED: 25,  // 25s when no raise
    ACTION_TIME_PREFLOP_RAISED: 20,    // 20s when facing raise (need less time)
    ACTION_TIME_POSTFLOP: 20,          // 20s for postflop
    
    // Legacy/simple (fallback)
    BASE_TIME: 25,
    
    // Time Bank with MAX LIMIT (more generous for tournaments)
    TIME_BANK_INITIAL: 60,     // 60 seconds initial
    TIME_BANK_MAX: 120,        // Maximum 2 minutes
    TIME_BANK_PER_LEVEL: 5,    // +5 seconds per level
    
    DISCONNECT_PROTECTION: 120, // 120 seconds
  },
  
  // Animation durations (in milliseconds)
  ANIMATIONS: {
    PULSE_DURATION: 400,    // Critical state pulse
    COLOR_TRANSITION: 300,  // Smooth color transitions
    COUNTDOWN_INTERVAL: 1000, // 1 second countdown
    TIME_BANK_ACTIVATE: 500,  // Time bank activation flash
  },
  
  // Time Bank Phase colors (different from main timer)
  TIME_BANK_COLORS: {
    ACTIVE: '#3b82f6',        // Blue-500 when time bank is active
    WARNING: '#f59e0b',       // Amber when time bank running low
    CRITICAL: '#ef4444',      // Red when time bank almost gone
    GLOW: 'rgba(59, 130, 246, 0.6)' // Blue glow
  }
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get timer color based on remaining seconds
 * @param remainingSeconds - Remaining time in seconds
 * @param isTimeBankPhase - Whether we're in time bank phase
 */
export function getTimerColor(remainingSeconds: number, isTimeBankPhase: boolean = false): 'green' | 'yellow' | 'red' | 'blue' {
  if (isTimeBankPhase) {
    // Time bank phase uses blue as base, then transitions
    if (remainingSeconds <= POKERSTARS_TIMER.CRITICAL_SECONDS) {
      return 'red';
    }
    if (remainingSeconds <= POKERSTARS_TIMER.WARNING_SECONDS) {
      return 'yellow';
    }
    return 'blue';
  }
  
  // Main timer phase
  if (remainingSeconds <= POKERSTARS_TIMER.CRITICAL_SECONDS) {
    return 'red';
  }
  if (remainingSeconds <= POKERSTARS_TIMER.WARNING_SECONDS) {
    return 'yellow';
  }
  return 'green';
}

/**
 * Get CSS color values for timer
 * @param remainingSeconds - Remaining time in seconds
 * @param isTimeBankPhase - Whether we're in time bank phase
 */
export function getTimerColorHex(remainingSeconds: number, isTimeBankPhase: boolean = false): string {
  const color = getTimerColor(remainingSeconds, isTimeBankPhase);
  switch (color) {
    case 'red': return '#ef4444';     // Red-500
    case 'yellow': return '#f59e0b';  // Amber-500
    case 'blue': return '#3b82f6';    // Blue-500 (time bank active)
    case 'green': return '#22c55e';   // Green-500
    default: return '#22c55e';
  }
}

/**
 * Get glow color for timer ring
 * @param remainingSeconds - Remaining time in seconds
 * @param isTimeBankPhase - Whether we're in time bank phase
 */
export function getTimerGlowColor(remainingSeconds: number, isTimeBankPhase: boolean = false): string {
  const color = getTimerColor(remainingSeconds, isTimeBankPhase);
  switch (color) {
    case 'red': return 'rgba(239, 68, 68, 0.8)';
    case 'yellow': return 'rgba(245, 158, 11, 0.6)';
    case 'blue': return 'rgba(59, 130, 246, 0.6)';   // Blue glow for time bank
    case 'green': return 'rgba(34, 197, 94, 0.4)';
    default: return 'rgba(34, 197, 94, 0.4)';
  }
}

/**
 * Check if timer is in critical state
 */
export function isTimerCritical(remainingSeconds: number): boolean {
  return remainingSeconds <= POKERSTARS_TIMER.CRITICAL_SECONDS;
}

/**
 * Check if timer is in warning state
 */
export function isTimerWarning(remainingSeconds: number): boolean {
  return remainingSeconds <= POKERSTARS_TIMER.WARNING_SECONDS && 
         remainingSeconds > POKERSTARS_TIMER.CRITICAL_SECONDS;
}

/**
 * Calculate remaining time from action start (for client sync)
 * This compensates for network latency
 */
export function calculateRemainingTime(
  actionStartTime: number | null | undefined,
  totalActionTime: number
): number {
  if (!actionStartTime) return totalActionTime;
  
  const elapsed = (Date.now() - actionStartTime) / 1000;
  return Math.max(0, totalActionTime - elapsed);
}

/**
 * Get action time based on phase and pot status
 * @param phase - Current hand phase (preflop, flop, turn, river)
 * @param isRaisedPot - Whether there's been a raise (for preflop)
 * @param isTournament - Cash game or tournament
 */
export function getActionTime(
  phase: string,
  isRaisedPot: boolean = false,
  isTournament: boolean = false
): number {
  const config = isTournament ? POKERSTARS_TIMER.TOURNAMENT : POKERSTARS_TIMER.CASH_GAME;
  
  if (phase === 'preflop') {
    return isRaisedPot 
      ? config.ACTION_TIME_PREFLOP_RAISED 
      : config.ACTION_TIME_PREFLOP_UNRAISED;
  }
  
  return config.ACTION_TIME_POSTFLOP;
}

/**
 * Calculate time bank replenishment with max limit
 * @param currentTimeBank - Current time bank value
 * @param replenishAmount - Amount to add
 * @param isTournament - Cash game or tournament
 */
export function calculateTimeBankReplenish(
  currentTimeBank: number,
  replenishAmount: number,
  isTournament: boolean = false
): number {
  const maxTimeBank = isTournament 
    ? POKERSTARS_TIMER.TOURNAMENT.TIME_BANK_MAX 
    : POKERSTARS_TIMER.CASH_GAME.TIME_BANK_MAX;
    
  return Math.min(currentTimeBank + replenishAmount, maxTimeBank);
}

export default POKERSTARS_TIMER;
