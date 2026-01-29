# Memory: Time Bank Fixed Model + Hero-Only Fix
Updated: 2026-01-29

## Timer Model: FIXED PER-TURN (NOT PokerStars accumulative)

Every turn:
1. **Main timer**: Full `action_time_seconds` from table settings (e.g., 25s)
2. **Time Bank**: Full `time_bank_seconds` from table settings (e.g., 10s)
3. Time bank does NOT accumulate or deplete between turns
4. After **2 consecutive** full timeouts → `sitting_out`

## Server (PokerTable.ts)

### handleTimeout() Flow
```
Main timer expires →
  IF isTimeBankPhase === false:
    - Set isTimeBankPhase = true
    - Start timer with FULL config.timeBankSeconds
    - Emit time_bank_activated + state_update
    - RETURN (wait for time bank to expire)
  ELSE (time bank also expired):
    - player.missedTurns++
    - IF missedTurns >= 2: player.status = 'sitting_out'
    - Auto-action (check/fold)
```

### Key Code Changes
1. **Removed time bank depletion** - no more `player.timeBank -= timeToUse`
2. **Removed replenishment logic** - no longer needed in fixed model
3. **Changed sit-out threshold** from 1 to 2 timeouts

## Client (useNodePokerTable.ts)

### Hero-Only Time Bank UI
The alarm badge and blue pulsing ring only show for the Hero:

```typescript
// time_bank_activated handler
const isEventForHero = (heroSeat !== null && eventSeat === heroSeat);

// Only set isTimeBankPhase = true for hero
if (isEventForHero) {
  return { ...prev, isTimeBankPhase: true, ... };
} else {
  // Opponent: update timing values but NOT isTimeBankPhase
  return { ...prev, actionStartTime, actionTimeTotal };
}
```

### state_update handler
```typescript
const isTimeBankForHero = heroSeat !== null && currentTurnSeat === heroSeat;
const effectiveTimeBankPhase = directTimeBankPhase && isTimeBankForHero;
```

## Files Modified
1. `server/src/game/PokerTable.ts` - Fixed timer model
2. `src/hooks/useNodePokerTable.ts` - Hero-only time bank UI

## Rebuild Required
```bash
cd /var/www/poker-server && git pull origin main && cd server && npm run build && pm2 restart poker-server
```
