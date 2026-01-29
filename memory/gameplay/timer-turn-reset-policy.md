# Memory: gameplay/timer-turn-reset-policy
Updated: just now

The poker timer logic enforces a 'Clean State Reset' on every turn and action (check, bet, call, raise). To prevent visual desync where a player 'inherits' the previous player's timer progress or phase:

1. **useNodePokerTable.ts (turn_changed handler):** Every turn change resets 'isTimeBankPhase' to false. 'actionTimeTotal' is reset to the table's base 'actionTimer' (e.g., 25s) rather than the previous player's 10s time bank duration. If the server doesn't provide a new 'actionStartTime', the UI defaults to Date.now() to ensure the ring animation starts fresh from the beginning.

2. **FullscreenPokerTableWrapper.tsx (Sticky Time Bank Logic):** When a NEW turn is detected (different seat, phase change, or actionStartTime change), the sticky time bank refs are forcibly reset AND any incoming 'isTimeBankPhase=true' from server is IGNORED. This prevents the new player from inheriting the previous player's time bank visual state due to stale WebSocket broadcasts.

This dual-layer protection ensures:
- Ring timer always starts at full duration on new turn
- Time bank alarm badge NEVER appears immediately on new turn
- Only explicit 'time_bank_activated' event for the CURRENT player can trigger time bank visuals
