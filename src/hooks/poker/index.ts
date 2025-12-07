// Unified Poker State Management
export { useUnifiedPoker } from '../useUnifiedPoker';
export type { 
  UnifiedPlayer, 
  UnifiedGameState, 
  TableConfig, 
  GamePhase, 
  PlayerStatus, 
  ActionType,
  ActionResult 
} from '../useUnifiedPoker';

// Optimized Poker State (batched updates, deduplication)
export { useOptimizedPokerState } from './useOptimizedPokerState';

// Local Poker Game (for demo/offline mode)
export { useLocalPokerGame } from './useLocalPokerGame';

// WebSocket Connection Manager
export { usePokerWebSocket } from '../usePokerWebSocket';

// Stable State Utilities
export { 
  useStableState, 
  useCachedValue, 
  useOptimisticUpdate, 
  useBatchedState 
} from '../useStableState';

// Reconnection Manager
export { useReconnectManager } from '../useReconnectManager';
export type { ConnectionStatus } from '../useReconnectManager';
