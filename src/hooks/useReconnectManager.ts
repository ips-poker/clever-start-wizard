import { useCallback, useRef, useState, useEffect } from 'react';
import { shouldPauseRetries, getRemainingPauseTime } from '@/utils/apiErrorHandler';

interface ReconnectConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onReconnect?: () => Promise<void> | void;
  onMaxRetriesReached?: () => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

export type ConnectionStatus = 
  | 'connected' 
  | 'connecting' 
  | 'disconnected' 
  | 'reconnecting' 
  | 'failed'
  | 'paused'; // Новый статус для паузы при серии 503

interface ReconnectState {
  status: ConnectionStatus;
  retryCount: number;
  nextRetryIn: number | null;
  lastError: string | null;
  isPaused: boolean; // Флаг паузы из-за 503
}

export function useReconnectManager(config: ReconnectConfig = {}) {
  const {
    maxRetries = 5,
    baseDelay = 1000,
    maxDelay = 30000,
    onReconnect,
    onMaxRetriesReached,
    onStatusChange,
  } = config;

  const [state, setState] = useState<ReconnectState>({
    status: 'disconnected',
    retryCount: 0,
    nextRetryIn: null,
    lastError: null,
    isPaused: false,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);
  const mountedRef = useRef(true);

  // Calculate delay with exponential backoff and jitter
  const calculateDelay = useCallback((retryCount: number): number => {
    // Exponential backoff: baseDelay * 2^retryCount
    const exponentialDelay = baseDelay * Math.pow(2, retryCount);
    
    // Add random jitter (±25%) to prevent thundering herd
    const jitter = exponentialDelay * (0.75 + Math.random() * 0.5);
    
    // Cap at maxDelay
    return Math.min(jitter, maxDelay);
  }, [baseDelay, maxDelay]);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Update status with callback
  const updateStatus = useCallback((newStatus: ConnectionStatus, updates: Partial<ReconnectState> = {}) => {
    if (!mountedRef.current) return;
    
    setState(prev => {
      const newState = { ...prev, status: newStatus, ...updates };
      onStatusChange?.(newStatus);
      return newState;
    });
  }, [onStatusChange]);

  // Mark as connected (resets retry count)
  const markConnected = useCallback(() => {
    clearTimers();
    isReconnectingRef.current = false;
    updateStatus('connected', { 
      retryCount: 0, 
      nextRetryIn: null,
      lastError: null 
    });
    console.log('[ReconnectManager] ✅ Connected');
  }, [clearTimers, updateStatus]);

  // Mark as disconnected and start reconnection
  const markDisconnected = useCallback((error?: string, shouldReconnect = true) => {
    if (!mountedRef.current) return;
    
    const currentRetry = state.retryCount;
    updateStatus('disconnected', { lastError: error || null });
    
    // Проверяем, нужно ли приостановить реконнекты из-за серии 503
    if (shouldPauseRetries()) {
      const pauseSeconds = getRemainingPauseTime();
      console.log(`[ReconnectManager] ⏸️ Pausing reconnects for ${pauseSeconds}s due to server overload`);
      updateStatus('paused', { 
        lastError: 'Сервис перегружен. Ожидание...',
        isPaused: true,
        nextRetryIn: pauseSeconds
      });
      return;
    }
    
    if (shouldReconnect && currentRetry < maxRetries) {
      scheduleReconnect(currentRetry);
    } else if (currentRetry >= maxRetries) {
      updateStatus('failed', { lastError: 'Maximum reconnection attempts reached' });
      onMaxRetriesReached?.();
      console.log('[ReconnectManager] ❌ Max retries reached');
    }
  }, [state.retryCount, maxRetries, onMaxRetriesReached, updateStatus]);

  // Schedule a reconnection attempt
  const scheduleReconnect = useCallback((retryCount: number) => {
    if (!mountedRef.current || isReconnectingRef.current) return;
    
    // Проверяем паузу перед планированием реконнекта
    if (shouldPauseRetries()) {
      const pauseSeconds = getRemainingPauseTime();
      console.log(`[ReconnectManager] ⏸️ Reconnect paused for ${pauseSeconds}s`);
      updateStatus('paused', { isPaused: true, nextRetryIn: pauseSeconds });
      return;
    }
    
    clearTimers();
    
    const delay = calculateDelay(retryCount);
    const delaySeconds = Math.ceil(delay / 1000);
    
    console.log(`[ReconnectManager] 🔄 Scheduling reconnect in ${delaySeconds}s (attempt ${retryCount + 1}/${maxRetries})`);
    
    updateStatus('reconnecting', { 
      retryCount: retryCount + 1,
      nextRetryIn: delaySeconds 
    });

    // Countdown timer
    let countdown = delaySeconds;
    countdownRef.current = setInterval(() => {
      countdown--;
      if (mountedRef.current && countdown > 0) {
        setState(prev => ({ ...prev, nextRetryIn: countdown }));
      }
    }, 1000);

    // Actual reconnect
    timeoutRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;
      
      clearTimers();
      isReconnectingRef.current = true;
      updateStatus('connecting', { nextRetryIn: null });
      
      try {
        await onReconnect?.();
        // Connection success is handled by markConnected
      } catch (error) {
        console.error('[ReconnectManager] Reconnect failed:', error);
        isReconnectingRef.current = false;
        
        if (retryCount + 1 >= maxRetries) {
          updateStatus('failed', { 
            lastError: error instanceof Error ? error.message : 'Reconnection failed' 
          });
          onMaxRetriesReached?.();
        } else {
          markDisconnected(error instanceof Error ? error.message : 'Reconnection failed');
        }
      }
    }, delay);
  }, [calculateDelay, maxRetries, clearTimers, updateStatus, onReconnect, markDisconnected, onMaxRetriesReached]);

  // Force immediate reconnect
  const reconnectNow = useCallback(() => {
    clearTimers();
    setState(prev => ({ ...prev, retryCount: 0 }));
    scheduleReconnect(0);
  }, [clearTimers, scheduleReconnect]);

  // Cancel reconnection attempts
  const cancelReconnect = useCallback(() => {
    clearTimers();
    isReconnectingRef.current = false;
    updateStatus('disconnected', { nextRetryIn: null });
    console.log('[ReconnectManager] ⏹️ Reconnection cancelled');
  }, [clearTimers, updateStatus]);

  // Reset to initial state
  const reset = useCallback(() => {
    clearTimers();
    isReconnectingRef.current = false;
    setState({
      status: 'disconnected',
      retryCount: 0,
      nextRetryIn: null,
      lastError: null,
      isPaused: false,
    });
  }, [clearTimers]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  return {
    ...state,
    markConnected,
    markDisconnected,
    reconnectNow,
    cancelReconnect,
    reset,
    isConnected: state.status === 'connected',
    isReconnecting: state.status === 'reconnecting' || state.status === 'connecting',
    isPausedDueToOverload: state.status === 'paused',
  };
}

export default useReconnectManager;
