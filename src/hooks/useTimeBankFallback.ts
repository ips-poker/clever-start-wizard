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
}: UseTimeBankFallbackParams) {
  const [fallback, setFallback] = useState<{ startedAt: number; duration: number } | null>(null);
  const [tick, setTick] = useState(0);
  
  // Track the turn identity to know when a NEW turn actually starts
  const turnIdRef = useRef<string | null>(null);
  const currentTurnId = `${handId}-${currentPlayerSeat}`;
  
  // Track if we've already activated fallback for this turn
  const activatedForTurnRef = useRef<string | null>(null);

  // Force periodic re-render while fallback time bank is active.
  useEffect(() => {
    if (!fallback) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 100);
    return () => window.clearInterval(id);
  }, [fallback]);

  // Reset fallback ONLY when turn genuinely changes (different hand or different player)
  useEffect(() => {
    if (turnIdRef.current !== currentTurnId) {
      turnIdRef.current = currentTurnId;
      activatedForTurnRef.current = null;
      setFallback(null);
    }
  }, [currentTurnId]);

  // If server explicitly says we're in time bank phase, trust that
  useEffect(() => {
    if (serverIsTimeBankPhase && !fallback && currentPlayerTimeBank && currentPlayerTimeBank > 0) {
      // Server confirmed time bank - activate with server's remaining value
      const duration = Math.min(timeBankSliceSeconds, currentPlayerTimeBank);
      setFallback({ startedAt: Date.now(), duration });
      activatedForTurnRef.current = currentTurnId;
    }
  }, [serverIsTimeBankPhase, currentPlayerTimeBank, timeBankSliceSeconds, currentTurnId, fallback]);

  // Main fallback logic - activate when main timer reaches 0
  useEffect(() => {
    // Don't override if server already told us we're in time bank
    if (serverIsTimeBankPhase) return;
    // Already activated for this turn
    if (activatedForTurnRef.current === currentTurnId && fallback) return;

    const remaining = mainTurnRemaining ?? null;
    const tb = Number(currentPlayerTimeBank ?? 0);
    const slice = Number(timeBankSliceSeconds ?? 30);

    // Only enable fallback if time bank exists and is positive
    if (!Number.isFinite(slice) || slice <= 0) return;
    if (!Number.isFinite(tb) || tb <= 0) return;

    const mainExpired = remaining !== null && remaining <= 0.1;

    if (mainExpired && !fallback) {
      const duration = Math.max(0, Math.min(slice, tb));
      if (duration > 0) {
        console.log('[TIME BANK FALLBACK] Activating fallback time bank:', {
          mainRemaining: remaining,
          playerTimeBank: tb,
          slice,
          duration,
          turnId: currentTurnId
        });
        setFallback({ startedAt: Date.now(), duration });
        activatedForTurnRef.current = currentTurnId;
      }
    }
    
    // DON'T reset fallback based on mainTurnRemaining changing!
    // The ring timer re-animates, but we track real time.
  }, [serverIsTimeBankPhase, mainTurnRemaining, currentPlayerTimeBank, timeBankSliceSeconds, fallback, currentTurnId]);

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
