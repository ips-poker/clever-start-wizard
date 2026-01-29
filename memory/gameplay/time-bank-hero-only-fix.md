# Memory: Time Bank Hero-Only Fix
Updated: 2026-01-29

## Problem
Time Bank alarm badge was appearing for ALL clients when ANY player entered time bank phase. This caused:
1. Opponent seeing alarm badge when Hero entered time bank (wrong!)
2. Hero seeing alarm badge when Opponent entered time bank (wrong!)
3. Timer desynchronization due to all clients updating `isTimeBankPhase: true`

## Root Cause
1. Server emitted `time_bank_activated` event with `playerId` but NO `seat` field initially
2. Server's subsequent `state_update` with `isTimeBankPhase: true` was broadcast to ALL clients
3. Client handlers did NOT check if the event/state was for the current player (hero) before updating
4. All clients received the broadcast and blindly set `isTimeBankPhase: true`

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

#### 1. `time_bank_activated` handler
- Checks if event is for hero: `eventSeat === mySeatRef.current`
- Only sets `isTimeBankPhase: true` if it's the hero's turn
- For opponents: updates timing values (actionStartTime, actionTimeTotal) but NOT isTimeBankPhase

#### 2. `state_update` handler (NEW FIX)
- Server broadcasts `isTimeBankPhase: true` to all clients after time bank activation
- Now checks `currentPlayerSeat === mySeat` before setting `isTimeBankPhase: true`
- For opponents: timing values are updated, but `isTimeBankPhase` stays `false`

```typescript
// Extract current player seat from state
const stateCurrentPlayerSeat = toNumberOrUndef(stateData.currentPlayerSeat);

// Determine if time bank is for hero
const heroSeat = mySeatRef.current;
const currentTurnSeat = stateCurrentPlayerSeat ?? incomingState.currentPlayerSeat;
const isTimeBankForHero = heroSeat !== null && currentTurnSeat === heroSeat;

// Only set isTimeBankPhase = true for the hero
const effectiveTimeBankPhase = directTimeBankPhase && isTimeBankForHero;
```

### Client (useTimeBankFallback.ts)
- Reinforced `isMyTurn` check with early return
- Added explicit logging for hero-only activation
- Fallback ONLY activates when `isMyTurn === true`

### Client (FullscreenPokerTable.tsx)
- `TimeBankAlarmBadge` has strict `isHero` guard to prevent rendering on opponent seats

## Timer Flow Diagram

```
Server: time_bank_activated { seat, playerId, timeUsed, actionStartTime }
         ↓
Client: Check seat === mySeat?
         ├─ YES (Hero) → isTimeBankPhase = true, show alarm
         └─ NO (Opponent) → update timing only, NO alarm
         
Server: state_update { isTimeBankPhase: true, currentPlayerSeat, ... }
         ↓
Client: Check currentPlayerSeat === mySeat?
         ├─ YES (Hero) → isTimeBankPhase = true
         └─ NO (Opponent) → isTimeBankPhase = false (ignore server's true)
```

## Key Files Modified
1. `server/src/game/PokerTable.ts` - Added seat to time_bank_activated event
2. `src/hooks/useNodePokerTable.ts` - Hero-only state update on BOTH events
3. `src/hooks/useTimeBankFallback.ts` - Stronger isMyTurn enforcement
4. `src/components/poker/FullscreenPokerTable.tsx` - isHero guard on alarm badge

## Rebuild Required
```bash
cd /var/www/poker-server && git pull origin main && cd server && npm run build && pm2 restart poker-server
```
