/**
 * PokerStars-Style Timer Configuration
 * ===========================================
 * 
 * OFFICIAL POKERSTARS TIMER VALUES:
 * 
 * | Parameter          | Cash Game  | Tournament    |
 * |--------------------|------------|---------------|
 * | Base Time          | 15 sec     | 15-30 sec     |
 * | Time Bank          | 30 sec     | 30-60 sec     |
 * | Time Bank Replenish| +5s/10hands| Fixed/Level   |
 * | Warning (yellow)   | < 10 sec   | < 10 sec      |
 * | Critical (red+pulse)| < 5 sec   | < 5 sec       |
 * | Disconnect Protect | 60 sec     | 60-120 sec    |
 * 
 * KEY PRINCIPLES:
 * 1. Server-Authoritative Time - Server is the ONLY source of truth
 * 2. Client NEVER triggers auto-fold - only displays countdown
 * 3. timeRemaining sent with every state update
 * 4. Time Bank activates ONLY when main timer = 0
 * 5. Time Bank persists across hands (NOT reset each hand)
 * 6. Time Bank replenishes slowly (+5s every N hands)
 * 7. Graceful Timeout: check if possible, otherwise fold
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
    BASE_TIME: 15,        // 15 seconds base action time
    TIME_BANK_INITIAL: 30, // 30 seconds initial time bank
    TIME_BANK_REPLENISH: 5, // +5 seconds
    TIME_BANK_REPLENISH_HANDS: 10, // Every 10 hands
    DISCONNECT_PROTECTION: 60, // 60 seconds
  },
  
  TOURNAMENT: {
    BASE_TIME: 30,        // 30 seconds base action time (can be 15-30)
    TIME_BANK_INITIAL: 60, // 60 seconds initial time bank
    TIME_BANK_PER_LEVEL: 5, // +5 seconds per level
    DISCONNECT_PROTECTION: 120, // 120 seconds
  },
  
  // Animation durations (in milliseconds)
  ANIMATIONS: {
    PULSE_DURATION: 400,    // Critical state pulse
    COLOR_TRANSITION: 300,  // Smooth color transitions
    COUNTDOWN_INTERVAL: 1000, // 1 second countdown
  }
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get timer color based on remaining seconds
 */
export function getTimerColor(remainingSeconds: number): 'green' | 'yellow' | 'red' {
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
 */
export function getTimerColorHex(remainingSeconds: number): string {
  const color = getTimerColor(remainingSeconds);
  switch (color) {
    case 'red': return '#ef4444';     // Red-500
    case 'yellow': return '#f59e0b';  // Amber-500
    case 'green': return '#22c55e';   // Green-500
    default: return '#22c55e';
  }
}

/**
 * Get glow color for timer ring
 */
export function getTimerGlowColor(remainingSeconds: number): string {
  const color = getTimerColor(remainingSeconds);
  switch (color) {
    case 'red': return 'rgba(239, 68, 68, 0.8)';
    case 'yellow': return 'rgba(245, 158, 11, 0.6)';
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

export default POKERSTARS_TIMER;
