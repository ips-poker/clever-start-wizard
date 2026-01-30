# Memory: gameplay/time-bank-monotonic-guard-fix
Updated: just now

## Problem
Timer inheritance and stuck `isMyTurn` occurred because `time_bank_activated` event was updating `actionStartTime` to a value that could be >= the next player's `actionStartTime`. The monotonic guard in `applyIncomingState` then rejected the next player's `turn_changed`/`state_update` packets, causing:
1. Timer to show previous player's remaining time
2. `isMyTurn` to stay false (blocking action buttons)
3. Visual desync between server state and UI

## Solution
**Do NOT update `actionStartTime` in `time_bank_activated` handler.** Only update:
- `isTimeBankPhase` (visual flag for hero only)
- `actionTimeTotal` (time bank slice duration)
- `timeRemaining` (for visual countdown)

The original `actionStartTime` from turn start is preserved, ensuring the monotonic guard correctly accepts the next player's turn packets.

## Key Code Location
- `src/hooks/useNodePokerTable.ts` - `time_bank_activated` case handler
- `src/hooks/useNodePokerTable.ts` - `applyIncomingState` monotonic guard (lines 690-716)
