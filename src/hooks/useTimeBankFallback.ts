import { useEffect, useMemo, useRef, useState } from 'react';

interface UseTimeBankFallbackParams {
  /** Server-reported time bank phase (authoritative when present) */
  serverIsTimeBankPhase: boolean;
  /** Main turn countdown remaining seconds (UI) */
  mainTurnRemaining: number | null | undefined;
  /** Current player's available time bank (if server exposes it) */
  currentPlayerTimeBank: number | null | undefined;
  /** Configured slice length for time bank (e.g. 10s/30s) */
  timeBankSliceSeconds: number;
  /** Hand ID - reset only when new hand starts */
  handId: string | null | undefined;
  /** Current player seat - reset when turn changes to different player */
  currentPlayerSeat: number | null | undefined;
  /** Current phase (preflop/flop/turn/river) - reset when street changes */
  currentPhase?: string | null | undefined;
  /** Is it MY turn? Fallback only activates when it's the hero's turn */
  isMyTurn?: boolean;
}

/**
 * UI-only fallback for Time Bank visuals.
 * CRITICAL: This hook is DECOUPLED from the ring timer animation.
 * It tracks real elapsed time since turn started, not the animated ring value.
 * 
 * When main action time expires AND player has time bank, we show the alarm badge.
 */
export function useTimeBankFallback({
  serverIsTimeBankPhase,
  mainTurnRemaining,
  currentPlayerTimeBank,
  timeBankSliceSeconds,
  handId,
  currentPlayerSeat,
  currentPhase,
  isMyTurn = true, // Default true for backward compatibility
}: UseTimeBankFallbackParams) {
  const [fallback, setFallback] = useState<{ startedAt: number; duration: number } | null>(null);
  const [tick, setTick] = useState(0);
  // Track the minimum main remaining observed within THIS turn.
  // This prevents missing time bank activation if the main remaining briefly hits 0
  // but then gets corrected/resynced upwards by the parent timer logic.
  const minMainRemainingThisTurnRef = useRef<number>(Number.POSITIVE_INFINITY);
  
  // Track the turn identity to know when a NEW turn actually starts
  // Include phase to reset on street transitions (flop→turn→river)
  const turnIdRef = useRef<string | null>(null);
  const currentTurnId = `${handId}-${currentPhase ?? 'unknown'}-${currentPlayerSeat}`;
  
  // Track if we've already activated fallback for this turn
  const activatedForTurnRef = useRef<string | null>(null);

  // Force periodic re-render while fallback time bank is active.
  useEffect(() => {
    if (!fallback) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 100);
    return () => window.clearInterval(id);
  }, [fallback]);

  // Reset fallback ONLY when turn genuinely changes (different hand, player, or phase)
  useEffect(() => {
    if (turnIdRef.current !== currentTurnId) {
      turnIdRef.current = currentTurnId;
      activatedForTurnRef.current = null;
      minMainRemainingThisTurnRef.current = Number.POSITIVE_INFINITY;
      setFallback(null);
    }
  }, [currentTurnId]);

  // If server explicitly says we're in time bank phase, trust that
  // CRITICAL FIX: Only activate for the hero's turn!
  // Otherwise ALL clients would show the alarm badge when ANY player enters time bank.
  // IMPORTANT: This is a FALLBACK visual - if server is correctly sending seat-specific
  // time_bank_activated events, this may not be needed. But we keep it for edge cases.
  useEffect(() => {
    // CRITICAL: Only activate if:
    // 1. Server says time bank phase is active
    // 2. It's the HERO's turn (isMyTurn === true)
    // 3. Hero has time bank remaining
    // 4. Fallback not already activated for this turn
    if (!isMyTurn) {
      // Not hero's turn - NEVER show time bank fallback for opponents
      return;
    }
    
    if (serverIsTimeBankPhase && !fallback && currentPlayerTimeBank && currentPlayerTimeBank > 0) {
      // Server confirmed time bank for hero - activate with server's remaining value
      const duration = Math.min(timeBankSliceSeconds, currentPlayerTimeBank);
      console.log('[TIME BANK FALLBACK] Server confirmed time bank for HERO, activating:', {
        duration,
        currentPlayerTimeBank,
        timeBankSliceSeconds,
        turnId: currentTurnId,
        isMyTurn,
      });
      setFallback({ startedAt: Date.now(), duration });
      activatedForTurnRef.current = currentTurnId;
    }
  }, [serverIsTimeBankPhase, currentPlayerTimeBank, timeBankSliceSeconds, currentTurnId, fallback, isMyTurn]);

  // Main fallback logic - activate when main timer reaches 0
  // IMPORTANT: Only activate fallback if it's the hero's turn!
  useEffect(() => {
    // Don't override if server already told us we're in time bank
    if (serverIsTimeBankPhase) return;
    // Already activated for this turn
    if (activatedForTurnRef.current === currentTurnId && fallback) return;
    // NOT the hero's turn - don't activate fallback for other players
    if (!isMyTurn) return;

    const remaining = mainTurnRemaining ?? null;
    const tb = Number(currentPlayerTimeBank ?? 0);
    const slice = Number(timeBankSliceSeconds ?? 30);

    if (remaining !== null && Number.isFinite(remaining)) {
      minMainRemainingThisTurnRef.current = Math.min(minMainRemainingThisTurnRef.current, remaining);
    }

    // Only enable fallback if time bank exists and is positive
    if (!Number.isFinite(slice) || slice <= 0) return;
    if (!Number.isFinite(tb) || tb <= 0) return;

    // FIX: Use a slightly higher threshold (0.5s) to catch near-zero states
    // since timer updates at 200ms intervals
    const mainExpired =
      (remaining !== null && remaining <= 0.5) ||
      minMainRemainingThisTurnRef.current <= 0.5;

    if (mainExpired && !fallback) {
      const duration = Math.max(0, Math.min(slice, tb));
      if (duration > 0) {
        console.log('[TIME BANK FALLBACK] Activating fallback time bank:', {
          mainRemaining: remaining,
          minMainRemainingThisTurn: minMainRemainingThisTurnRef.current,
          playerTimeBank: tb,
          slice,
          duration,
          turnId: currentTurnId,
          isMyTurn,
        });
        setFallback({ startedAt: Date.now(), duration });
        activatedForTurnRef.current = currentTurnId;
      }
    }
    
    // DON'T reset fallback based on mainTurnRemaining changing!
    // The ring timer re-animates, but we track real time.
  }, [serverIsTimeBankPhase, mainTurnRemaining, currentPlayerTimeBank, timeBankSliceSeconds, fallback, currentTurnId, isMyTurn]);

  const remainingSeconds = useMemo(() => {
    if (!fallback) return null;
    // Use tick to force re-evaluation
    void tick;
    const elapsed = (Date.now() - fallback.startedAt) / 1000;
    return Math.max(0, fallback.duration - elapsed);
  }, [fallback, tick]);

  const isActive = Boolean(fallback) && (remainingSeconds ?? 0) > 0;

  return {
    isActive,
    remainingSeconds: remainingSeconds ?? 0,
    totalSeconds: fallback?.duration ?? timeBankSliceSeconds,
  };
}
