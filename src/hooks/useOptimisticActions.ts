/**
 * Optimistic UI Actions Hook
 * 6.4 - Provides instant UI feedback while waiting for server confirmation
 */
import { useState, useCallback, useRef, useEffect } from 'react';

interface PendingAction {
  id: string;
  type: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';
  amount?: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'timeout';
  retryCount: number;
}

interface OptimisticState {
  pendingAction: PendingAction | null;
  optimisticStack: number | null;
  optimisticBet: number | null;
  optimisticPhase: string | null;
  isProcessing: boolean;
}

interface UseOptimisticActionsOptions {
  currentStack: number;
  currentBet: number;
  onActionTimeout?: (action: PendingAction) => void;
  onActionRejected?: (action: PendingAction, reason: string) => void;
  timeoutMs?: number;
  maxRetries?: number;
}

const ACTION_TIMEOUT = 5000; // 5 seconds default
const MAX_RETRIES = 2;

export function useOptimisticActions(options: UseOptimisticActionsOptions) {
  const {
    currentStack,
    currentBet,
    onActionTimeout,
    onActionRejected,
    timeoutMs = ACTION_TIMEOUT,
    maxRetries = MAX_RETRIES
  } = options;

  const [state, setState] = useState<OptimisticState>({
    pendingAction: null,
    optimisticStack: null,
    optimisticBet: null,
    optimisticPhase: null,
    isProcessing: false
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const actionQueueRef = useRef<PendingAction[]>([]);

  // Clear timeout
  const clearActionTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Generate unique action ID
  const generateActionId = useCallback(() => {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Calculate optimistic state changes
  const calculateOptimisticChanges = useCallback((
    actionType: PendingAction['type'],
    amount?: number
  ): { stack: number; bet: number } => {
    switch (actionType) {
      case 'fold':
      case 'check':
        return { stack: currentStack, bet: currentBet };
      
      case 'call': {
        const callAmount = amount || 0;
        return { 
          stack: currentStack - callAmount, 
          bet: currentBet + callAmount 
        };
      }
      
      case 'bet':
      case 'raise': {
        const raiseAmount = amount || 0;
        return { 
          stack: currentStack - raiseAmount, 
          bet: currentBet + raiseAmount 
        };
      }
      
      case 'allin':
        return { 
          stack: 0, 
          bet: currentBet + currentStack 
        };
      
      default:
        return { stack: currentStack, bet: currentBet };
    }
  }, [currentStack, currentBet]);

  // Start optimistic action
  const startOptimisticAction = useCallback((
    actionType: PendingAction['type'],
    amount?: number
  ): PendingAction => {
    clearActionTimeout();

    const action: PendingAction = {
      id: generateActionId(),
      type: actionType,
      amount,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    };

    const { stack, bet } = calculateOptimisticChanges(actionType, amount);

    setState({
      pendingAction: action,
      optimisticStack: stack,
      optimisticBet: bet,
      optimisticPhase: null,
      isProcessing: true
    });

    // Set timeout for action confirmation
    timeoutRef.current = setTimeout(() => {
      setState(prev => {
        if (prev.pendingAction?.id === action.id) {
          const timedOutAction = { ...action, status: 'timeout' as const };
          onActionTimeout?.(timedOutAction);
          
          // Check if we should retry
          if (action.retryCount < maxRetries) {
            actionQueueRef.current.push({
              ...action,
              retryCount: action.retryCount + 1,
              status: 'pending'
            });
          }
          
          return {
            ...prev,
            pendingAction: timedOutAction,
            isProcessing: false
          };
        }
        return prev;
      });
    }, timeoutMs);

    console.log('[OptimisticUI] Started action:', action);
    return action;
  }, [clearActionTimeout, generateActionId, calculateOptimisticChanges, timeoutMs, maxRetries, onActionTimeout]);

  // Confirm action (server acknowledged)
  const confirmAction = useCallback((actionId: string) => {
    clearActionTimeout();

    setState(prev => {
      if (prev.pendingAction?.id === actionId) {
        console.log('[OptimisticUI] Action confirmed:', actionId);
        return {
          pendingAction: null,
          optimisticStack: null,
          optimisticBet: null,
          optimisticPhase: null,
          isProcessing: false
        };
      }
      return prev;
    });
  }, [clearActionTimeout]);

  // Reject action (server rejected or error)
  const rejectAction = useCallback((actionId: string, reason?: string) => {
    clearActionTimeout();

    setState(prev => {
      if (prev.pendingAction?.id === actionId) {
        const rejectedAction = { ...prev.pendingAction, status: 'rejected' as const };
        console.log('[OptimisticUI] Action rejected:', actionId, reason);
        onActionRejected?.(rejectedAction, reason || 'Unknown error');
        
        return {
          pendingAction: rejectedAction,
          optimisticStack: null,
          optimisticBet: null,
          optimisticPhase: null,
          isProcessing: false
        };
      }
      return prev;
    });
  }, [clearActionTimeout, onActionRejected]);

  // Cancel pending action
  const cancelAction = useCallback(() => {
    clearActionTimeout();
    setState({
      pendingAction: null,
      optimisticStack: null,
      optimisticBet: null,
      optimisticPhase: null,
      isProcessing: false
    });
    console.log('[OptimisticUI] Action cancelled');
  }, [clearActionTimeout]);

  // Reset all optimistic state (e.g., when new hand starts)
  const resetOptimisticState = useCallback(() => {
    clearActionTimeout();
    actionQueueRef.current = [];
    setState({
      pendingAction: null,
      optimisticStack: null,
      optimisticBet: null,
      optimisticPhase: null,
      isProcessing: false
    });
  }, [clearActionTimeout]);

  // Get display values (optimistic or real)
  const getDisplayStack = useCallback(() => {
    return state.optimisticStack ?? currentStack;
  }, [state.optimisticStack, currentStack]);

  const getDisplayBet = useCallback(() => {
    return state.optimisticBet ?? currentBet;
  }, [state.optimisticBet, currentBet]);

  // Check if a specific action type is pending
  const isActionPending = useCallback((actionType: PendingAction['type']) => {
    return state.pendingAction?.type === actionType && state.pendingAction.status === 'pending';
  }, [state.pendingAction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearActionTimeout();
    };
  }, [clearActionTimeout]);

  return {
    // State
    pendingAction: state.pendingAction,
    isProcessing: state.isProcessing,
    
    // Display values
    displayStack: getDisplayStack(),
    displayBet: getDisplayBet(),
    
    // Actions
    startOptimisticAction,
    confirmAction,
    rejectAction,
    cancelAction,
    resetOptimisticState,
    
    // Utilities
    isActionPending,
    hasPendingAction: !!state.pendingAction && state.pendingAction.status === 'pending'
  };
}

export default useOptimisticActions;
