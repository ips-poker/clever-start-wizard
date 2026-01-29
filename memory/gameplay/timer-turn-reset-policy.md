# Memory: gameplay/timer-turn-reset-policy
Updated: just now

The poker timer logic enforces a 'Clean State Reset' on every turn and action (check, bet, call, raise). To prevent visual desync where a player 'inherits' the previous player's timer progress or phase:

1. **useNodePokerTable.ts (turn_changed handler):** Every turn change resets 'isTimeBankPhase' to false. 'actionTimeTotal' is reset to the table's base 'actionTimer' (e.g., 25s) rather than the previous player's 10s time bank duration. If the server doesn't provide a new 'actionStartTime', the UI defaults to Date.now() to ensure the ring animation starts fresh from the beginning.

2. **FullscreenPokerTableWrapper.tsx (Sticky Time Bank + Timer Deadline):** Uses a unified `isGenuineNewTurn` flag (combining seat change, phase change, and timerResetKey change) to BOTH:
   - Reset sticky time bank refs and ignore stale `isTimeBankPhase=true` from server
   - Reset `deadlineMsRef` to a fresh deadline based on full action time
   
   Previously, time bank used `isGenuineNewTurn` but deadline used `isNewTurn`, causing desync where time bank would reset but timer ring would show stale remaining time.

3. **timeBankUiActive uses filtered state:** The `timeBankUiActive` variable now uses `isTimeBankActive` state (filtered for stale data) instead of raw `serverIsTimeBankPhase`, preventing the alarm badge from appearing on stale data.

This triple-layer protection ensures:
- Ring timer always starts at full duration on new turn
- Time bank alarm badge NEVER appears immediately on new turn
- Only explicit 'time_bank_activated' event for the CURRENT player can trigger time bank visuals
