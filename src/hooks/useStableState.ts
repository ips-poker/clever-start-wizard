import { useState, useRef, useCallback, useMemo } from 'react';

/**
 * Hook for managing stable state that prevents flickering
 * Uses debouncing and optimistic updates
 */
export function useStableState<T>(
  initialValue: T,
  debounceMs: number = 50
) {
  const [state, setState] = useState<T>(initialValue);
  const pendingRef = useRef<T>(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const setStableState = useCallback((newValue: T | ((prev: T) => T)) => {
    const now = Date.now();
    const resolvedValue = typeof newValue === 'function'
      ? (newValue as (prev: T) => T)(pendingRef.current)
      : newValue;
    
    pendingRef.current = resolvedValue;

    // Immediate update if enough time has passed
    if (now - lastUpdateRef.current > debounceMs) {
      lastUpdateRef.current = now;
      setState(resolvedValue);
      return;
    }

    // Debounced update
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      lastUpdateRef.current = Date.now();
      setState(pendingRef.current);
    }, debounceMs);
  }, [debounceMs]);

  const setImmediateState = useCallback((newValue: T) => {
    pendingRef.current = newValue;
    lastUpdateRef.current = Date.now();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setState(newValue);
  }, []);

  return [state, setStableState, setImmediateState] as const;
}

/**
 * Hook for caching computed values with intelligent invalidation
 */
export function useCachedValue<T, D extends readonly unknown[]>(
  compute: () => T,
  deps: D,
  cacheTimeMs: number = 100
): T {
  const cacheRef = useRef<{ value: T; timestamp: number; depsHash: string } | null>(null);
  
  const depsHash = useMemo(() => JSON.stringify(deps), [deps]);
  
  return useMemo(() => {
    const now = Date.now();
    const cached = cacheRef.current;
    
    if (
      cached &&
      cached.depsHash === depsHash &&
      now - cached.timestamp < cacheTimeMs
    ) {
      return cached.value;
    }
    
    const newValue = compute();
    cacheRef.current = { value: newValue, timestamp: now, depsHash };
    return newValue;
  }, [compute, depsHash, cacheTimeMs]);
}

/**
 * Optimistic update manager for instant UI feedback
 */
export function useOptimisticUpdate<T>() {
  const [optimisticValue, setOptimisticValue] = useState<T | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const applyOptimistic = useCallback((value: T, rollbackAfterMs: number = 5000) => {
    setOptimisticValue(value);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setOptimisticValue(null);
    }, rollbackAfterMs);
  }, []);

  const confirm = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setOptimisticValue(null);
  }, []);

  const rollback = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setOptimisticValue(null);
  }, []);

  return { optimisticValue, applyOptimistic, confirm, rollback };
}

/**
 * Batch state updates to prevent multiple re-renders
 */
export function useBatchedState<T extends Record<string, unknown>>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const pendingUpdatesRef = useRef<Partial<T>>({});
  const frameRef = useRef<number | null>(null);

  const batchUpdate = useCallback((updates: Partial<T>) => {
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };

    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(() => {
        setState(prev => ({ ...prev, ...pendingUpdatesRef.current }));
        pendingUpdatesRef.current = {};
        frameRef.current = null;
      });
    }
  }, []);

  const immediateUpdate = useCallback((updates: Partial<T>) => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    pendingUpdatesRef.current = {};
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  return { state, batchUpdate, immediateUpdate };
}
