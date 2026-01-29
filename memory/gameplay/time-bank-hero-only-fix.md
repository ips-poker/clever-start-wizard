# Memory: Time Bank Hero-Only Fix
Updated: 2026-01-29

## Problem
Time Bank alarm badge was appearing for ALL clients when ANY player entered time bank phase. This caused:
1. Opponent seeing alarm badge when Hero entered time bank (wrong!)
2. Hero seeing alarm badge when Opponent entered time bank (wrong!)
3. Timer desynchronization due to all clients updating `isTimeBankPhase: true`

## Root Cause
1. Server emitted `time_bank_activated` event with `playerId` but NO `seat` field
2. Client handler did NOT check if the event was for the current player before updating state
3. All clients received the broadcast and blindly set `isTimeBankPhase: true`
4. `useTimeBankFallback` hook was triggered for wrong player despite `isMyTurn` check

## Solution

### Server (PokerTable.ts)
- Added `seat` field to `time_bank_activated` event payload
- Added `actionTimeTotal` for explicit ring animation duration

```typescript
this.emit('time_bank_activated', {
  playerId,
  seat, // NEW: For client-side hero verification
  timeUsed: timeToUse,
  remaining: player.timeBank,
  actionStartTime: timeBankStartTime,
  actionTimeTotal: timeToUse // NEW: Explicit total for ring animation
});
```

### Client (useNodePokerTable.ts)
- `time_bank_activated` handler now checks if event is for current turn:
  - Compare `eventSeat` with `prev.currentPlayerSeat`
  - Fallback to `eventPlayerId` lookup in players array
- If NOT for current turn → log and skip state update

### Client (useTimeBankFallback.ts)
- Reinforced `isMyTurn` check with early return
- Added explicit logging for hero-only activation

## Key Files Modified
1. `server/src/game/PokerTable.ts` - Added seat to time_bank_activated event
2. `src/hooks/useNodePokerTable.ts` - Hero-only state update on time_bank_activated
3. `src/hooks/useTimeBankFallback.ts` - Stronger isMyTurn enforcement

## Rebuild Required
```bash
cd /var/www/poker-server && git pull origin main && cd server && npm run build && pm2 restart poker-server
```
