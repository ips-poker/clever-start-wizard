# Memory: Timer Reset on Phase Change Fix
Updated: 2026-01-28

## Problem
Timers were not resetting correctly when transitioning between streets (preflop→flop, flop→turn, etc.). Players would have 45+ seconds on preflop but only 10 seconds on flop before auto-fold.

## Root Cause
The `phase_change` WebSocket event from server did NOT include timer fields (`actionStartTime`, `actionTimeTotal`, `timeRemaining`). These were only sent in the subsequent `state_update` event, causing a race condition where:
1. Client received `phase_change` → updated phase, community cards
2. Timer logic saw same `actionStartTime` → didn't reset timer
3. Timer continued counting from preflop's start time
4. `state_update` arrived too late → timer already expired

## Solution

### Server (PokerTable.ts)
- Calculate `actionTimeTotal` and `newActionStartTime` BEFORE emitting `phase_change`
- Include timer fields directly in `phase_change` event:
  - `actionStartTime`, `actionTimeTotal`, `timeRemaining`, `currentPlayerSeat`, `isTimeBankPhase`
- Update internal hand state first, then emit event

### Client (useNodePokerTable.ts)
- Updated `phase_change` handler to:
  - Parse `actionStartTime` (supports ms, seconds, ISO formats via `toMsTimestamp`)
  - Update `tableState.actionStartTime` and `tableState.actionTimeTotal`
  - Reset `isTimeBankPhase` to false for new street
  - Use `Date.now()` as fallback if server doesn't provide `actionStartTime`

### Client (FullscreenPokerTableWrapper.tsx)
- Already had correct logic: `isNewTurn` triggers when `phaseChanged` or `seatChanged`
- Timer resets to full `actionTimeTotal` on new turn detection

## Key Files Modified
1. `server/src/game/PokerTable.ts` - phase_change now includes timer data
2. `src/hooks/useNodePokerTable.ts` - phase_change handler updates timer state
3. `src/components/poker/FullscreenPokerTableWrapper.tsx` - logging added

## Rebuild Required
```bash
cd /var/www/poker-server && git pull origin main && cd server && npm run build && pm2 restart poker-server
```
