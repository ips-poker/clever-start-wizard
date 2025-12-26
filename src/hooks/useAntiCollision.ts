/**
 * Anti-Collision Hook
 * 6.3 - Prevents conflicting actions and race conditions
 */
import { useState, useCallback, useRef, useEffect } from 'react';

interface ActionLock {
  actionId: string;
  actionType: string;
  lockedAt: number;
  expiresAt: number;
  handId: string;
}

interface CollisionState {
  isLocked: boolean;
  currentLock: ActionLock | null;
  lastConfirmedAction: string | null;
  handSequenceNumber: number;
  serverSequenceNumber: number;
}

interface UseAntiCollisionOptions {
  handId: string;
  currentPhase: string;
  currentPlayerSeat: number | null;
  mySeat: number | null;
  onCollisionDetected?: (conflictingAction: string) => void;
  lockDurationMs?: number;
}

const DEFAULT_LOCK_DURATION = 2000; // 2 seconds

export function useAntiCollision(options: UseAntiCollisionOptions) {
  const {
    handId,
    currentPhase,
    currentPlayerSeat,
    mySeat,
    onCollisionDetected,
    lockDurationMs = DEFAULT_LOCK_DURATION
  } = options;

  const [state, setState] = useState<CollisionState>({
    isLocked: false,
    currentLock: null,
    lastConfirmedAction: null,
    handSequenceNumber: 0,
    serverSequenceNumber: 0
  });

  const lockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const actionHistoryRef = useRef<Map<string, number>>(new Map());
  const lastHandIdRef = useRef<string>('');

  // Clear lock timeout
  const clearLockTimeout = useCallback(() => {
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }
  }, []);

  // Generate unique action ID
  const generateActionId = useCallback(() => {
    return `${handId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }, [handId]);

  // Reset state on new hand
  useEffect(() => {
    if (handId !== lastHandIdRef.current) {
      lastHandIdRef.current = handId;
      clearLockTimeout();
      actionHistoryRef.current.clear();
      setState({
        isLocked: false,
        currentLock: null,
        lastConfirmedAction: null,
        handSequenceNumber: 0,
        serverSequenceNumber: 0
      });
      console.log('[AntiCollision] Reset for new hand:', handId);
    }
  }, [handId, clearLockTimeout]);

  // Check if action is valid (it's my turn)
  const canPerformAction = useCallback((): boolean => {
    // Must be my turn
    if (currentPlayerSeat !== mySeat) {
      console.log('[AntiCollision] Not my turn:', { currentPlayerSeat, mySeat });
      return false;
    }

    // Must not be locked
    if (state.isLocked && state.currentLock) {
      // Check if lock expired
      if (Date.now() > state.currentLock.expiresAt) {
        // Lock expired, allow action
        return true;
      }
      console.log('[AntiCollision] Action locked:', state.currentLock);
      return false;
    }

    // Must be in an actionable phase
    const actionablePhases = ['preflop', 'flop', 'turn', 'river'];
    if (!actionablePhases.includes(currentPhase)) {
      console.log('[AntiCollision] Not in actionable phase:', currentPhase);
      return false;
    }

    return true;
  }, [currentPlayerSeat, mySeat, state.isLocked, state.currentLock, currentPhase]);

  // Acquire lock for action
  const acquireLock = useCallback((actionType: string): ActionLock | null => {
    if (!canPerformAction()) {
      return null;
    }

    const now = Date.now();
    const actionId = generateActionId();

    // Check for duplicate action (same type within short window)
    const lastSameAction = actionHistoryRef.current.get(actionType);
    if (lastSameAction && now - lastSameAction < 500) {
      console.log('[AntiCollision] Duplicate action detected:', actionType);
      onCollisionDetected?.(actionType);
      return null;
    }

    clearLockTimeout();

    const lock: ActionLock = {
      actionId,
      actionType,
      lockedAt: now,
      expiresAt: now + lockDurationMs,
      handId
    };

    actionHistoryRef.current.set(actionType, now);

    setState(prev => ({
      ...prev,
      isLocked: true,
      currentLock: lock,
      handSequenceNumber: prev.handSequenceNumber + 1
    }));

    // Auto-release lock after timeout
    lockTimeoutRef.current = setTimeout(() => {
      setState(prev => {
        if (prev.currentLock?.actionId === actionId) {
          console.log('[AntiCollision] Lock expired:', actionId);
          return {
            ...prev,
            isLocked: false,
            currentLock: null
          };
        }
        return prev;
      });
    }, lockDurationMs);

    console.log('[AntiCollision] Lock acquired:', lock);
    return lock;
  }, [canPerformAction, generateActionId, clearLockTimeout, lockDurationMs, handId, onCollisionDetected]);

  // Release lock after server confirmation
  const releaseLock = useCallback((actionId: string, wasSuccessful: boolean = true) => {
    clearLockTimeout();

    setState(prev => {
      if (prev.currentLock?.actionId === actionId) {
        console.log('[AntiCollision] Lock released:', actionId, { success: wasSuccessful });
        return {
          ...prev,
          isLocked: false,
          currentLock: null,
          lastConfirmedAction: wasSuccessful ? prev.currentLock.actionType : prev.lastConfirmedAction,
          serverSequenceNumber: wasSuccessful ? prev.serverSequenceNumber + 1 : prev.serverSequenceNumber
        };
      }
      return prev;
    });
  }, [clearLockTimeout]);

  // Force release (e.g., on error or timeout)
  const forceRelease = useCallback(() => {
    clearLockTimeout();
    setState(prev => ({
      ...prev,
      isLocked: false,
      currentLock: null
    }));
    console.log('[AntiCollision] Forced lock release');
  }, [clearLockTimeout]);

  // Check sequence number mismatch (indicates missed server updates)
  const checkSequenceMismatch = useCallback((serverSeq: number): boolean => {
    if (serverSeq > state.serverSequenceNumber + 1) {
      console.warn('[AntiCollision] Sequence mismatch detected:', {
        expected: state.serverSequenceNumber + 1,
        received: serverSeq
      });
      return true;
    }
    return false;
  }, [state.serverSequenceNumber]);

  // Validate action before sending
  const validateAction = useCallback((
    actionType: string,
    amount?: number,
    minBet?: number,
    maxBet?: number
  ): { valid: boolean; reason?: string } => {
    // Check turn
    if (!canPerformAction()) {
      return { valid: false, reason: 'Not your turn' };
    }

    // Validate bet amounts
    if ((actionType === 'bet' || actionType === 'raise') && amount !== undefined) {
      if (minBet !== undefined && amount < minBet) {
        return { valid: false, reason: `Minimum bet is ${minBet}` };
      }
      if (maxBet !== undefined && amount > maxBet) {
        return { valid: false, reason: `Maximum bet is ${maxBet}` };
      }
    }

    return { valid: true };
  }, [canPerformAction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLockTimeout();
    };
  }, [clearLockTimeout]);

  return {
    // State
    isLocked: state.isLocked,
    currentLock: state.currentLock,
    handSequenceNumber: state.handSequenceNumber,
    
    // Checks
    canPerformAction,
    validateAction,
    checkSequenceMismatch,
    
    // Actions
    acquireLock,
    releaseLock,
    forceRelease,
    
    // Computed
    isMyTurn: currentPlayerSeat === mySeat
  };
}

export default useAntiCollision;
