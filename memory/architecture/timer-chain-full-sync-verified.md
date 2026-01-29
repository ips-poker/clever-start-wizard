# Memory: Timer Chain Full Synchronization - VERIFIED
Updated: 2026-01-29

## Overview
Complete timer synchronization chain from Database → Server → Frontend has been verified and confirmed working correctly.

## Database (poker_tables)
- **action_time_seconds**: Main timer duration (e.g., 25 seconds)
- **time_bank_seconds**: Time bank duration (e.g., 10 seconds)
- These values are the SOURCE OF TRUTH for table settings

Example: NL400 table has `action_time_seconds: 25`, `time_bank_seconds: 10`

## Server (PokerGameManager.ts → PokerTable.ts)

### 1. Loading from Database
- `PokerGameManager.loadActiveTables()` reads from `poker_tables`:
  ```typescript
  actionTimeSeconds: tableData.action_time_seconds || 15,
  timeBankSeconds: tableData.time_bank_seconds || 30,
  ```

### 2. Using in Game Logic
- `PokerTable.getActionTimeForPhase()` returns `this.config.actionTimeSeconds`
- This ensures user-configured time is ALWAYS used (not hardcoded defaults)

### 3. Emitting to Frontend
All timer-related events include complete timing data:

#### a) `phase_change` event (lines 2203-2216):
```typescript
this.emit('phase_change', {
  phase: newPhase,
  communityCards: this.currentHand.communityCards,
  currentPlayerSeat: this.currentHand.currentPlayerSeat,
  actionStartTime: newActionStartTime,       // Fresh timestamp
  actionTimeTotal: actionTimeTotal,           // Full 25s
  timeRemaining: actionTimeTotal,             // Full 25s
  isTimeBankPhase: false                      // Always false on new street
});
```

#### b) `state_update` after action (lines 2309-2322):
```typescript
this.emit('state_update', {
  handId: this.currentHand?.id,
  pot: this.currentHand?.pot || 0,
  currentPlayerSeat: this.currentHand?.currentPlayerSeat,
  phase: this.currentHand?.phase,
  actionStartTime: newActionStartTime,
  actionTimeTotal: actionTimeTotal,
  timeRemaining: actionTimeTotal,
  isTimeBankPhase: false
});
```

#### c) `turn_changed` event (lines 4841-4849):
```typescript
this.emit('turn_changed', {
  currentPlayerSeat: nextSeat,
  playerId,
  phase: this.currentHand.phase,
  actionStartTime: this.currentHand.actionStartTime,
  actionTimeTotal: this.getActionTimeForPhase(),
  isTimeBankPhase: false
});
```

#### d) `getPublicState()` (lines 5080-5141):
```typescript
return {
  actionTimer: this.config.actionTimeSeconds,      // 25s from DB
  timeBankSeconds: this.config.timeBankSeconds,    // 10s from DB
  actionStartTime: this.currentHand?.actionStartTime,
  actionTimeTotal: this.currentHand?.actionTimeTotal || this.getActionTimeForPhase(),
  timeRemaining: this.calculateTimeRemaining(),
  isTimeBankPhase: this.currentHand?.isTimeBankPhase || false,
  // ...
};
```

## Frontend (useNodePokerTable.ts)

### 1. Parsing Initial State
`transformServerState()` (lines 466-606):
```typescript
const actionTimer = Number(
  state.actionTimer ?? config?.actionTimeSeconds ?? 15
);
const parsedTimeBankSeconds = toNumberOrNull(
  state.timeBankSeconds ?? config?.timeBankSeconds
) ?? 30;
const parsedActionTimeTotal = toNumberOrNull(
  state.actionTimeTotal
) ?? actionTimer;
```

### 2. Handling `turn_changed` (lines 1280-1342):
```typescript
const fallbackMainTotal = prev.actionTimer ?? 15;
const nextActionTimeTotal =
  (typeof turnData.actionTimeTotal === 'number')
    ? turnData.actionTimeTotal
    : fallbackMainTotal;  // Falls back to table's configured 25s

return {
  ...prev,
  actionStartTime: parsedActionStartTime ?? prev.actionStartTime,
  actionTimeTotal: nextActionTimeTotal,
  timeRemaining: nextTimeRemaining,
  isTimeBankPhase: false,  // Always false on new turn
};
```

### 3. Handling `phase_change` (lines 1176-1201):
```typescript
actionTimeTotal:
  (typeof eventActionTimeTotal === 'number')
    ? eventActionTimeTotal
    : (prev.actionTimer ?? prev.actionTimeTotal),  // Falls back to 25s
```

### 4. Handling `time_bank_activated` (lines 1350-1434):
- Only sets `isTimeBankPhase: true` for HERO (verified via `mySeatRef.current === eventSeat`)
- Opponents update timing values but NOT `isTimeBankPhase`

### 5. Handling `state_update` (lines 1436-1568):
- Hero-only check for `isTimeBankPhase`:
  ```typescript
  const isTimeBankForHero = heroSeat !== null && currentTurnSeat === heroSeat;
  const effectiveTimeBankPhase = directTimeBankPhase && isTimeBankForHero;
  ```

## Timer Reset Points

| Event | Action | Timer Resets To |
|-------|--------|-----------------|
| `phase_change` | New street (flop/turn/river) | Full `actionTimeTotal` (25s) |
| `turn_changed` | Player made action | Full `actionTimeTotal` (25s) |
| `state_update` | General state sync | Uses server values |
| `time_bank_activated` | Main timer expired | Time bank slice (10s max) |
| New hand starts | Cards dealt | Full `actionTimeTotal` (25s) |

## Key Invariants

1. **Every turn change**: Timer resets to full `actionTimeSeconds` from DB
2. **Every street change**: Timer resets to full `actionTimeSeconds` from DB  
3. **Time Bank**: Only activates AFTER main timer expires, uses `timeBankSeconds` from DB
4. **Hero-only Time Bank UI**: Alarm badge only shows for the player whose turn it is
5. **Fresh timestamp**: `actionStartTime` is set to `Date.now()` on every turn/phase change

## Files Verified
- `server/src/game/PokerGameManager.ts` - DB loading ✅
- `server/src/game/PokerTable.ts` - Timer logic ✅
- `server/src/config/pokerTimings.ts` - Config structure ✅
- `src/hooks/useNodePokerTable.ts` - Frontend handling ✅

## No Changes Required
The timer synchronization chain is fully operational. If issues occur:
1. Check server logs for `getActionTimeForPhase` output
2. Verify `poker_tables` row has correct `action_time_seconds` and `time_bank_seconds`
3. Check client console for `actionTimeTotal` in state updates
