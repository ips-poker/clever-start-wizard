/**
 * POKERSTARS-STYLE IMPROVEMENTS PATCH FILE
 * ==========================================
 * 
 * This file contains the code changes needed for server/src/game/PokerTable.ts
 * to implement professional-level timer improvements.
 * 
 * INSTRUCTIONS:
 * 1. Copy these changes to your server code
 * 2. Run: npm run build
 * 3. Run: pm2 restart poker-server
 * 
 * CHANGES OVERVIEW:
 * 1. getActionTimeForPhase() - Different times for preflop raised/unraised
 * 2. TIME_BANK_MAX limit - Cannot accumulate infinitely
 * 3. Sit-out orbit tracking - Auto-remove after max orbits
 * 4. Enhanced state sync - Send phase info for client-side action time calculation
 */

// ============================================
// CHANGE 1: Add to Player interface (around line 41)
// ============================================
/*
Add these fields to the Player interface:

  // Sit-out tracking
  sitOutOrbits: number;         // Count of orbits sitting out
  lastOrbitDealer: number;      // Dealer position when sit-out started
*/

// ============================================
// CHANGE 2: Add new method - getActionTimeForPhase()
// Add this method to PokerTable class (around line 1540)
// ============================================
export const getActionTimeForPhaseCode = `
  /**
   * POKERSTARS-STYLE: Get action time based on phase and pot state
   * Different times for:
   * - Preflop unraised pot (limped) = more time
   * - Preflop raised pot = less time (decision is simpler)
   * - Postflop = standard time
   */
  private getActionTimeForPhase(): number {
    if (!this.currentHand) {
      return this.config.actionTimeSeconds;
    }
    
    const phase = this.currentHand.phase;
    
    // Use timing config from imported pokerTimings
    const timingConfig = this.timings.actionTiming;
    
    if (phase === 'preflop') {
      // Check if there's been a raise (pot is "raised")
      // A raised pot means currentBet > bigBlind
      const isRaisedPot = this.currentHand.currentBet > this.config.bigBlind;
      
      return isRaisedPot 
        ? timingConfig.preflopRaised 
        : timingConfig.preflopUnraised;
    }
    
    if (phase === 'flop' || phase === 'turn' || phase === 'river') {
      return timingConfig.postflop;
    }
    
    // Showdown or unknown - no timer needed
    return this.config.actionTimeSeconds;
  }
`;

// ============================================
// CHANGE 3: Update startActionTimer() to use getActionTimeForPhase()
// Modify line ~1624 in startActionTimer()
// ============================================
export const startActionTimerPatch = `
// BEFORE (line ~1624):
// const duration = Math.max(0, durationSeconds ?? this.config.actionTimeSeconds);

// AFTER:
const duration = Math.max(0, durationSeconds ?? this.getActionTimeForPhase());
`;

// ============================================
// CHANGE 4: Update time bank replenishment with MAX limit
// Modify lines ~2179-2191 in startHand()
// ============================================
export const timeBankReplenishPatch = `
// POKERSTARS-STYLE: Reset per-action time bank tracking and replenish if eligible
for (const player of activePlayers) {
  player.timeBankUsedThisAction = 0;
  player.handsPlayedSinceLastTimeBank++;
  
  // Get time bank config from timings
  const timeBankConfig = this.timings.timeBank;
  
  // Replenish time bank with MAX LIMIT enforcement
  if (player.handsPlayedSinceLastTimeBank >= timeBankConfig.replenishEveryNHands) {
    const newTimeBank = Math.min(
      player.timeBank + timeBankConfig.replenishAmount,
      timeBankConfig.max  // CRITICAL: Cannot exceed MAX
    );
    
    if (newTimeBank > player.timeBank) {
      logger.info('POKERSTARS: Time bank replenished (with MAX limit)', {
        playerId: player.id.substring(0, 8),
        previousTimeBank: player.timeBank,
        newTimeBank: newTimeBank,
        maxTimeBank: timeBankConfig.max,
        replenishAmount: timeBankConfig.replenishAmount
      });
      player.timeBank = newTimeBank;
    }
    
    player.handsPlayedSinceLastTimeBank = 0;
  }
}
`;

// ============================================
// CHANGE 5: Add sit-out orbit tracking
// Add this to checkStartHand() or a new method
// ============================================
export const sitOutOrbitTrackingCode = `
  /**
   * POKERSTARS-STYLE: Track sit-out orbits and auto-remove players
   * Call this at the start of each new hand
   */
  private checkSitOutOrbits(): void {
    const sitOutConfig = this.timings.sitOut;
    
    for (const [playerId, player] of this.players) {
      if (player.status !== 'sitting_out') {
        // Reset orbit counter for active players
        player.sitOutOrbits = 0;
        continue;
      }
      
      // Check if dealer has passed this player (one orbit)
      // This is a simplified check - full implementation would track dealer position
      if (this.dealerSeat === player.seatNumber) {
        player.sitOutOrbits++;
        
        // Check if should warn or remove
        const orbitsRemaining = sitOutConfig.maxOrbits - player.sitOutOrbits;
        
        if (orbitsRemaining <= 0) {
          // MAX ORBITS REACHED - Remove player from table
          logger.warn('POKERSTARS: Removing player for excessive sit-out', {
            playerId: playerId.substring(0, 8),
            sitOutOrbits: player.sitOutOrbits,
            maxOrbits: sitOutConfig.maxOrbits
          });
          
          this.emit('player_removed_sitout', {
            playerId,
            seatNumber: player.seatNumber,
            reason: 'max_sitout_orbits',
            orbits: player.sitOutOrbits
          });
          
          // Return chips to balance and remove
          this.removePlayerFromTable(playerId, 'sitout_limit');
          
        } else if (orbitsRemaining <= sitOutConfig.warningOrbits) {
          // WARNING - Close to removal
          logger.info('POKERSTARS: Warning player about sit-out removal', {
            playerId: playerId.substring(0, 8),
            sitOutOrbits: player.sitOutOrbits,
            orbitsRemaining
          });
          
          this.emit('sitout_warning', {
            playerId,
            orbitsRemaining,
            gracePeriodSeconds: sitOutConfig.gracePeriodSeconds
          });
        }
      }
    }
  }
`;

// ============================================
// CHANGE 6: Update getPublicState() to include phase for action time calc
// Modify getPublicState() around line 3094
// ============================================
export const getPublicStatePatch = `
// Add these fields to the returned object in getPublicState():

// POKERSTARS-STYLE: Send phase info for client-side action time calculation
phase: this.currentHand?.phase || 'waiting',
isRaisedPot: this.currentHand 
  ? this.currentHand.currentBet > this.config.bigBlind 
  : false,
// Action time used for this turn (so client knows the total)
actionTimeTotal: this.getActionTimeForPhase(),
`;

// ============================================
// CHANGE 7: Update handleTimeout() to use phase-aware action time
// Modify line ~1769 in handleTimeout()
// ============================================
export const handleTimeoutPatch = `
// BEFORE (line ~1769):
// const timeToUse = Math.min(player.timeBank, this.config.actionTimeSeconds);

// AFTER - use phase-aware action time:
const actionTime = this.getActionTimeForPhase();
const timeToUse = Math.min(player.timeBank, actionTime);
`;

// ============================================
// CHANGE 8: Initialize new Player fields
// Update addPlayer() or wherever new players are created
// ============================================
export const playerInitPatch = `
// When creating a new Player object, initialize these fields:
{
  // ... existing fields ...
  
  // Time bank with MAX limit from config
  timeBank: Math.min(
    this.config.timeBankSeconds, 
    this.timings.timeBank.max
  ),
  
  // New sit-out tracking fields
  sitOutOrbits: 0,
  lastOrbitDealer: this.dealerSeat,
}
`;

console.log('PokerStars-style improvements patch loaded');
console.log('Apply these changes to server/src/game/PokerTable.ts');
