# Memory: Fixed Per-Turn Timer Model
Updated: 2026-01-29

## Model Definition

**FIXED PER-TURN** (NOT PokerStars accumulative):
- Every turn: Player gets FULL main timer + FULL time bank
- Timer values from table settings (`action_time_seconds` + `time_bank_seconds`)
- Time bank does NOT accumulate or deplete between turns
- After 2 consecutive full timeouts → `sitting_out`

## Example
Table settings: `action_time_seconds: 25`, `time_bank_seconds: 10`

Every player turn:
1. Main timer starts: 25 seconds (green ring)
2. If main expires → Time Bank activates: 10 seconds (blue ring + alarm for hero)
3. If Time Bank expires → Auto-action (check if possible, else fold)
4. Counter `missedTurns++`
5. If `missedTurns >= 2` → Player marked `sitting_out`

## Key Server Code (PokerTable.ts)

### handleTimeout() - Time Bank Activation
```typescript
// If NOT in time bank phase yet, activate it
if (!isTimeBankPhase) {
  this.currentHand.isTimeBankPhase = true;
  
  // FIXED MODEL: Always use full timeBankSeconds from table config
  const timeBankDuration = this.config.timeBankSeconds || 10;
  
  this.emit('time_bank_activated', {
    playerId,
    seat,
    timeUsed: timeBankDuration,
    remaining: timeBankDuration, // Always full in fixed model
    actionStartTime: Date.now(),
    actionTimeTotal: timeBankDuration
  });
  
  this.startActionTimer(timeBankDuration);
  return;
}

// FULL TIMEOUT: Both main + time bank expired
player.missedTurns++;

// After 2 timeouts → sitting_out (changed from 1)
if (player.missedTurns >= 2) {
  player.status = 'sitting_out';
}
```

### startActionTimer() - Main Timer Start
```typescript
// Uses this.config.actionTimeSeconds from database
const phaseAwareActionTime = this.getActionTimeForPhase(); // Returns config.actionTimeSeconds
```

### Player Initialization
```typescript
// timeBank is just a reference value (table config), not a balance
timeBank: this.config.timeBankSeconds
```

## Changes Made
1. Removed time bank depletion (`player.timeBank -= timeToUse`)
2. Removed replenishment logic (no longer needed)
3. Changed sit-out threshold from 1 to 2 timeouts
4. Simplified time bank activation to always use full config value

## Frontend Implications
- `isTimeBankPhase` still triggers alarm badge for hero
- `actionTimeTotal` in time bank phase = `timeBankSeconds` from table config
- Ring animation uses server-provided values correctly
