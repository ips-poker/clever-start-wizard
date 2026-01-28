import { useEffect, useMemo, useState } from 'react';

interface UseTimeBankFallbackParams {
  /** Server-reported time bank phase (authoritative when present) */
  serverIsTimeBankPhase: boolean;
  /** Main turn countdown remaining seconds (UI) */
  mainTurnRemaining: number | null | undefined;
  /** Current player's available time bank (if server exposes it) */
  currentPlayerTimeBank: number | null | undefined;
  /** Configured slice length for time bank (e.g. 10s/30s) */
  timeBankSliceSeconds: number;
  /** Changes on new turn/phase/seat/hand (used to reset fallback state) */
  resetKey: string;
}

/**
 * UI-only fallback for Time Bank visuals.
 * If server doesn't send `isTimeBankPhase` / `time_bank_activated`, we start a local time bank
 * countdown when the main timer hits zero AND there is time bank available.
 */
export function useTimeBankFallback({
  serverIsTimeBankPhase,
  mainTurnRemaining,
  currentPlayerTimeBank,
  timeBankSliceSeconds,
  resetKey,
}: UseTimeBankFallbackParams) {
  const [fallback, setFallback] = useState<{ startedAt: number; duration: number } | null>(null);
  const [tick, setTick] = useState(0);

  // Force periodic re-render while fallback time bank is active.
  useEffect(() => {
    if (!fallback) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 200);
    return () => window.clearInterval(id);
  }, [fallback]);

  // Reset fallback whenever server confirms TB phase, or a new turn starts.
  useEffect(() => {
    if (serverIsTimeBankPhase) setFallback(null);
    else setFallback(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, serverIsTimeBankPhase]);

  useEffect(() => {
    if (serverIsTimeBankPhase) return;

    const remaining = mainTurnRemaining ?? null;
    const tb = Number(currentPlayerTimeBank ?? 0);
    const slice = Number(timeBankSliceSeconds ?? 0);

    // Only enable fallback if time bank exists.
    if (!Number.isFinite(slice) || slice <= 0 || !Number.isFinite(tb) || tb <= 0) {
      setFallback(null);
      return;
    }

    const mainExpired = remaining !== null && remaining <= 0.05;

    if (mainExpired && !fallback) {
      const duration = Math.max(0, Math.min(slice, tb || slice));
      if (duration > 0) {
        setFallback({ startedAt: Date.now(), duration });
      }
    }

    // If main timer restarted (new turn), stop fallback.
    if (!mainExpired && fallback) {
      setFallback(null);
    }
  }, [serverIsTimeBankPhase, mainTurnRemaining, currentPlayerTimeBank, timeBankSliceSeconds, fallback]);

  const remainingSeconds = useMemo(() => {
    if (!fallback) return null;
    // Use tick to re-evaluate.
    void tick;
    const elapsed = (Date.now() - fallback.startedAt) / 1000;
    return Math.max(0, fallback.duration - elapsed);
  }, [fallback, tick]);

  return {
    isActive: Boolean(fallback),
    remainingSeconds: remainingSeconds ?? 0,
    totalSeconds: fallback?.duration ?? timeBankSliceSeconds,
  };
}
