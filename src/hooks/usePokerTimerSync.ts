/**
 * POKERSTARS-STYLE TIMER SYNCHRONIZATION
 * 
 * Professional, clean implementation:
 * - Timer resets 100% on EVERY turn change (seat/phase change)
 * - Deadline is calculated ONCE per turn, then countdown runs locally
 * - No mid-turn drift correction (causes visual jumps)
 * - Time Bank is a separate phase but uses same deadline mechanism
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

interface TimerSyncConfig {
  /** Server-reported action start time (epoch ms) */
  actionStartTime: number | null | undefined;
  /** Server-reported remaining seconds */
  timeRemaining: number | null | undefined;
  /** Total action time for this turn (from server or settings) */
  actionTimeTotal: number;
  /** Current player's seat number */
  currentPlayerSeat: number | null | undefined;
  /** Current game phase */
  phase: string;
  /** Current hand ID */
  handId: string | null | undefined;
  /** Is time bank phase active (server flag) */
  isTimeBankPhase: boolean;
  /** Time bank slice duration (seconds) */
  timeBankSliceSeconds: number;
}

interface TimerSyncResult {
  /** Deadline timestamp in ms for countdown timer */
  deadlineMs: number;
  /** Current time remaining (computed locally at 1Hz for UI) */
  timeRemaining: number | null;
  /** Total time for this turn (for progress calculation) */
  timeTotal: number;
  /** Is time bank phase active (filtered for stale data) */
  isTimeBankActive: boolean;
  /** Unique key that changes on every turn (for animation reset) */
  turnKey: string;
}

/**
 * Professional timer sync hook - PokerStars standard
 * 
 * Key principles:
 * 1. Deadline set ONCE per turn, counts down locally via RAF
 * 2. Turn change = new deadline (phase, seat, or actionStartTime change)
 * 3. Time Bank transition: same deadline, different visual (no reset)
 * 4. No mid-turn adjustments (causes visual jitter)
 */
export function usePokerTimerSync(config: TimerSyncConfig): TimerSyncResult {
  const {
    actionStartTime,
    timeRemaining: serverTimeRemaining,
    actionTimeTotal,
    currentPlayerSeat,
    phase,
    handId,
    isTimeBankPhase: serverIsTimeBankPhase,
    timeBankSliceSeconds,
  } = config;

  // Core state
  const [deadlineMs, setDeadlineMs] = useState<number>(0);
  const [localTimeRemaining, setLocalTimeRemaining] = useState<number | null>(null);
  const [timeTotal, setTimeTotal] = useState<number>(actionTimeTotal);
  const [isTimeBankActive, setIsTimeBankActive] = useState<boolean>(false);

  // Refs for turn change detection
  const prevTurnIdRef = useRef<string>('');
  const prevActionStartTimeRef = useRef<number>(0);
  const timeBankStickyRef = useRef<boolean>(false);
  const timeBankTurnIdRef = useRef<string>('');

  // Generate unique turn ID
  const turnId = useMemo(() => {
    return `${handId || 'no-hand'}-${phase}-${currentPlayerSeat ?? 'none'}`;
  }, [handId, phase, currentPlayerSeat]);

  // Detect turn change
  const isNewTurn = useMemo(() => {
    const turnChanged = turnId !== prevTurnIdRef.current;
    const actionStartChanged = 
      typeof actionStartTime === 'number' && 
      actionStartTime !== prevActionStartTimeRef.current &&
      Math.abs(actionStartTime - prevActionStartTimeRef.current) > 100; // 100ms tolerance
    
    return turnChanged || actionStartChanged;
  }, [turnId, actionStartTime]);

  // POKERSTARS-STYLE: Set deadline on turn change
  useEffect(() => {
    // No active player = no timer
    if (currentPlayerSeat === null || currentPlayerSeat === undefined) {
      setDeadlineMs(0);
      setLocalTimeRemaining(null);
      setIsTimeBankActive(false);
      prevTurnIdRef.current = turnId;
      return;
    }

    // Only recalculate deadline on NEW turn
    if (!isNewTurn) {
      return;
    }

    // Update refs
    prevTurnIdRef.current = turnId;
    prevActionStartTimeRef.current = typeof actionStartTime === 'number' ? actionStartTime : 0;

    // Reset time bank on new turn
    timeBankStickyRef.current = false;
    timeBankTurnIdRef.current = turnId;
    setIsTimeBankActive(false);

    const now = Date.now();
    
    // Determine effective total time
    const effectiveTotal = serverIsTimeBankPhase ? timeBankSliceSeconds : actionTimeTotal;
    setTimeTotal(effectiveTotal);

    // Calculate deadline from server data
    let calculatedDeadline: number;

    const hasServerRemaining = typeof serverTimeRemaining === 'number' && Number.isFinite(serverTimeRemaining);
    const hasActionStart = typeof actionStartTime === 'number' && Number.isFinite(actionStartTime) && actionStartTime > 0;

    if (hasServerRemaining && hasActionStart) {
      // Both available: check for clock skew
      const deadlineFromRemaining = now + serverTimeRemaining * 1000;
      const deadlineFromStart = actionStartTime + effectiveTotal * 1000;
      
      // Estimate clock skew
      const impliedServerNow = actionStartTime + (effectiveTotal - serverTimeRemaining) * 1000;
      const clockSkewMs = now - impliedServerNow;
      const startInFutureMs = actionStartTime - now;
      
      // Use remaining if significant skew detected
      if (Math.abs(clockSkewMs) > 1500 || startInFutureMs > 1500) {
        calculatedDeadline = deadlineFromRemaining;
      } else {
        calculatedDeadline = deadlineFromStart;
      }
    } else if (hasServerRemaining) {
      calculatedDeadline = now + serverTimeRemaining * 1000;
    } else if (hasActionStart && actionStartTime <= now + 1000) {
      calculatedDeadline = actionStartTime + effectiveTotal * 1000;
    } else {
      // Fallback: start fresh timer now
      calculatedDeadline = now + effectiveTotal * 1000;
    }

    // STALE PACKET PROTECTION: If deadline is in the past or very soon, this is stale
    const remainingFromDeadline = (calculatedDeadline - now) / 1000;
    if (remainingFromDeadline < 1) {
      // New turn shouldn't have <1s remaining - use full time
      calculatedDeadline = now + effectiveTotal * 1000;
    }

    setDeadlineMs(calculatedDeadline);
    setLocalTimeRemaining(Math.max(0, (calculatedDeadline - now) / 1000));

    console.log('[TIMER] New turn - deadline set:', {
      turnId,
      effectiveTotal,
      remainingSeconds: (calculatedDeadline - now) / 1000,
      serverTimeRemaining,
      actionStartTime,
      isTimeBankPhase: serverIsTimeBankPhase,
    });
  }, [
    isNewTurn,
    turnId,
    currentPlayerSeat,
    actionStartTime,
    serverTimeRemaining,
    actionTimeTotal,
    serverIsTimeBankPhase,
    timeBankSliceSeconds,
  ]);

  // TIME BANK TRANSITION (sticky, no deadline reset)
  useEffect(() => {
    // Only apply to current turn
    if (timeBankTurnIdRef.current !== turnId) {
      timeBankTurnIdRef.current = turnId;
      timeBankStickyRef.current = false;
      setIsTimeBankActive(false);
      return;
    }

    // Sticky: once true for this turn, stays true
    if (serverIsTimeBankPhase && !timeBankStickyRef.current) {
      timeBankStickyRef.current = true;
      setIsTimeBankActive(true);
      
      // Update total for progress calc (but NOT deadline!)
      setTimeTotal(timeBankSliceSeconds);
      
      console.log('[TIMER] Time bank activated (sticky):', {
        turnId,
        timeBankSliceSeconds,
      });
    }
  }, [serverIsTimeBankPhase, turnId, timeBankSliceSeconds]);

  // 1Hz local countdown (for fallback UI, sounds, etc.)
  useEffect(() => {
    if (deadlineMs === 0) {
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, (deadlineMs - Date.now()) / 1000);
      setLocalTimeRemaining(remaining);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [deadlineMs]);

  // Generate turn key for animation components
  const turnKey = useMemo(() => {
    // Include deadlineMs to force animation restart on deadline change
    return `${turnId}-${Math.floor(deadlineMs / 1000)}`;
  }, [turnId, deadlineMs]);

  return {
    deadlineMs,
    timeRemaining: localTimeRemaining,
    timeTotal,
    isTimeBankActive,
    turnKey,
  };
}

export default usePokerTimerSync;
