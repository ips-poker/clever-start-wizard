# Memory: Fixed Per-Turn Timer Model
Updated: 2026-01-29

## Model Definition

**FIXED PER-TURN** (NOT PokerStars accumulative):
- Every turn: Player gets FULL main timer + FULL time bank from **table settings**
- Timer values loaded from database (`action_time_seconds` + `time_bank_seconds`)
- Time bank does NOT accumulate or deplete between turns
- After 2 consecutive full timeouts → `sitting_out`

## Data Flow

```
Database (poker_tables)
    ↓
    action_time_seconds, time_bank_seconds
    ↓
Server (PokerTable.ts → this.config)
    ↓
    getActionTimeForPhase() → returns config.actionTimeSeconds
    ↓
Events (turn_changed, state_update, time_bank_activated)
    ↓
    actionTimeTotal = getActionTimeForPhase() (always fresh from config)
    ↓
Client (useNodePokerTable.ts)
    ↓
    tableState.actionTimeTotal → used for ring animation
```

## Example
Table settings: `action_time_seconds: 25`, `time_bank_seconds: 10`

Every player turn:
1. Main timer starts: 25 seconds (green ring)
2. If main expires → Time Bank activates: 10 seconds (blue ring + alarm for hero)
3. If Time Bank expires → Auto-action (check if possible, else fold)
4. Counter `missedTurns++`
5. If `missedTurns >= 2` → Player marked `sitting_out`

## Key Server Code (PokerTable.ts)

### getActionTimeForPhase() - Always uses DB config
```typescript
private getActionTimeForPhase(): number {
  // ALWAYS use table's configured action time (from DB / user settings)
  return this.config.actionTimeSeconds; // e.g., 25
}
```

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

### turn_changed event - Always includes full actionTimeTotal
```typescript
this.emit('turn_changed', {
  currentPlayerSeat: nextSeat,
  playerId,
  phase: this.currentHand.phase,
  actionStartTime: this.currentHand.actionStartTime,
  actionTimeTotal: this.getActionTimeForPhase(), // Always fresh from config
  isTimeBankPhase: false
});
```

## Key Client Code (useNodePokerTable.ts)

### turn_changed handler - Uses table's actionTimer as fallback
```typescript
// CRITICAL FIX: Fallback to table's base action time (actionTimer), never prev.actionTimeTotal
// prev.actionTimeTotal might be 10s from time bank, causing premature timeouts
const fallbackMainTotal = prev.actionTimer ?? 25; // Safe default from table config
const nextActionTimeTotal =
  (typeof turnData.actionTimeTotal === 'number' && Number.isFinite(turnData.actionTimeTotal))
    ? turnData.actionTimeTotal
    : fallbackMainTotal;
```

## Default Values Changed
- All hardcoded `15` fallbacks changed to `25` for safer defaults
- Affects: FullscreenPokerTableWrapper, useUnifiedPoker, useOptimizedPokerState, TableSettingsPanel

## Changes Made (2026-01-29)
1. Removed time bank depletion (`player.timeBank -= timeToUse`)
2. Removed replenishment logic (no longer needed)
3. Changed sit-out threshold from 1 to 2 timeouts
4. Simplified time bank activation to always use full config value
5. Fixed client fallbacks from 15s to 25s to prevent premature timeouts
6. Ensured all events carry actionTimeTotal from DB config

## Frontend Implications
- `isTimeBankPhase` still triggers alarm badge for hero only
- `actionTimeTotal` in time bank phase = `timeBankSeconds` from table config
- Ring animation uses server-provided values correctly
- Fallbacks use 25s (configurable via settings panel)

## Rebuild Required
```bash
cd /var/www/poker-server && git pull origin main && cd server && npm run build && pm2 restart poker-server
```
