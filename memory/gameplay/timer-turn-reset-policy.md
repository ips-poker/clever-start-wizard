# Memory: gameplay/timer-turn-reset-policy
Updated: just now

The poker timer now follows a **deadline-based** architecture for smooth animation:

1. **Deadline set once per turn:** `deadlineMsRef` is computed on `isGenuineNewTurn` (seat change, phase change, or actionStartTime advance) and not modified until the next turn. This eliminates mid-turn jitter caused by drift correction.

2. **Local RAF animation with forced restart:** `SmoothAvatarTimer` runs a 60fps `requestAnimationFrame` loop. On new turn (deadline jump > 2s), the animation is **forcibly restarted** — the old RAF is cancelled, `currentRemaining` is immediately set to full duration, and a fresh animation loop begins. This ensures the ring visually resets to 100%.

3. **1Hz state updates for fallback:** `FullscreenPokerTableWrapper` updates `turnTimeRemaining` at 1Hz (not 200ms) purely for the time-bank fallback hook and sound triggers—NOT for ring animation.

4. **Time bank fallback:** Threshold lowered to 0.5s (from 1.5s) since the 1Hz update is reliable. The alarm badge now triggers correctly when main timer expires.

5. **No drift correction during turn:** Removed mid-turn drift correction that was resetting `deadlineMsRef` and causing visual jumps. The deadline is authoritative until next turn.

6. **Stale packet guard:** On new turn, packets with low `timeRemaining` or old `actionStartTime` are corrected to full duration to prevent timer inheritance.
