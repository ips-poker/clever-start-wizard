// ==========================================
// STABLE POKER STATE HOOK
// ==========================================
// Prevents flickering by batching updates and deep comparison
// Optimized for PPPoker-like smooth experience

import { useState, useCallback, useRef, useMemo } from 'react';
import { PokerPlayer, TableState } from './usePokerTable';

export interface StablePlayerState {
  playerId: string;
  name: string;
  avatarUrl: string | null;
  seatNumber: number;
  stack: number;
  betAmount: number;
  holeCards: string[];
  isFolded: boolean;
  isAllIn: boolean;
  isActive: boolean;
  lastAction?: { action: string; amount?: number; timestamp: number };
}

export interface StableTableState {
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  pot: number;
  currentBet: number;
  currentPlayerSeat: number | null;
  communityCards: string[];
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  players: StablePlayerState[];
  minRaise: number;
  smallBlindAmount: number;
  bigBlindAmount: number;
  actionTimer: number;
  timeRemaining: number | null;
}

// Deep equality check for players - prevents unnecessary re-renders
function playersEqual(a: StablePlayerState[], b: StablePlayerState[]): boolean {
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; i++) {
    const pa = a[i];
    const pb = b[i];
    
    if (
      pa.playerId !== pb.playerId ||
      pa.stack !== pb.stack ||
      pa.betAmount !== pb.betAmount ||
      pa.isFolded !== pb.isFolded ||
      pa.isAllIn !== pb.isAllIn ||
      pa.isActive !== pb.isActive ||
      pa.seatNumber !== pb.seatNumber ||
      pa.holeCards.length !== pb.holeCards.length ||
      pa.holeCards.join(',') !== pb.holeCards.join(',')
    ) {
      return false;
    }
  }
  
  return true;
}

// Deep equality for table state
function stateEqual(a: StableTableState | null, b: StableTableState | null): boolean {
  if (a === null || b === null) return a === b;
  
  return (
    a.phase === b.phase &&
    a.pot === b.pot &&
    a.currentBet === b.currentBet &&
    a.currentPlayerSeat === b.currentPlayerSeat &&
    a.dealerSeat === b.dealerSeat &&
    a.smallBlindSeat === b.smallBlindSeat &&
    a.bigBlindSeat === b.bigBlindSeat &&
    a.communityCards.join(',') === b.communityCards.join(',') &&
    playersEqual(a.players, b.players)
  );
}

export function useStablePokerState() {
  const [state, setState] = useState<StableTableState | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Batch update queue
  const updateQueueRef = useRef<Partial<StableTableState>[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);
  
  // Minimum time between updates (prevents flickering)
  const MIN_UPDATE_INTERVAL = 100; // ms
  
  // Process queued updates in batch
  const processUpdates = useCallback(() => {
    if (updateQueueRef.current.length === 0) return;
    
    setIsUpdating(true);
    
    setState(prev => {
      if (!prev) {
        // First update - just apply the first complete state
        const firstComplete = updateQueueRef.current.find(u => 
          u.phase !== undefined && u.players !== undefined
        ) as StableTableState | undefined;
        
        updateQueueRef.current = [];
        return firstComplete || null;
      }
      
      // Merge all queued updates
      let merged = { ...prev };
      for (const update of updateQueueRef.current) {
        merged = { ...merged, ...update };
        
        // Special handling for players - merge by seat, don't replace
        if (update.players) {
          const playerMap = new Map(merged.players.map(p => [p.seatNumber, p]));
          for (const player of update.players) {
            playerMap.set(player.seatNumber, player);
          }
          merged.players = Array.from(playerMap.values()).sort((a, b) => a.seatNumber - b.seatNumber);
        }
      }
      
      updateQueueRef.current = [];
      
      // Skip update if nothing changed
      if (stateEqual(prev, merged)) {
        return prev;
      }
      
      return merged;
    });
    
    lastUpdateRef.current = Date.now();
    setIsUpdating(false);
  }, []);
  
  // Queue an update (batched for performance)
  const queueUpdate = useCallback((update: Partial<StableTableState>) => {
    updateQueueRef.current.push(update);
    
    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Check if we can update immediately
    const timeSinceLastUpdate = Date.now() - lastUpdateRef.current;
    
    if (timeSinceLastUpdate >= MIN_UPDATE_INTERVAL) {
      // Update immediately
      processUpdates();
    } else {
      // Schedule update after remaining time
      updateTimeoutRef.current = setTimeout(
        processUpdates,
        MIN_UPDATE_INTERVAL - timeSinceLastUpdate
      );
    }
  }, [processUpdates]);
  
  // Set full state (bypasses queue for initial load)
  const setFullState = useCallback((newState: StableTableState | null) => {
    if (newState === null) {
      setState(null);
      return;
    }
    
    setState(prev => {
      if (stateEqual(prev, newState)) {
        return prev; // No change
      }
      return newState;
    });
    
    lastUpdateRef.current = Date.now();
  }, []);
  
  // Update single player (optimized for action updates)
  const updatePlayer = useCallback((seatNumber: number, updates: Partial<StablePlayerState>) => {
    setState(prev => {
      if (!prev) return prev;
      
      const playerIndex = prev.players.findIndex(p => p.seatNumber === seatNumber);
      if (playerIndex === -1) return prev;
      
      const player = prev.players[playerIndex];
      const updated = { ...player, ...updates };
      
      // Check if actually changed
      if (
        player.stack === updated.stack &&
        player.betAmount === updated.betAmount &&
        player.isFolded === updated.isFolded &&
        player.isAllIn === updated.isAllIn
      ) {
        return prev;
      }
      
      const newPlayers = [...prev.players];
      newPlayers[playerIndex] = updated;
      
      return { ...prev, players: newPlayers };
    });
  }, []);
  
  // Get player by seat (memoized)
  const getPlayerBySeat = useCallback((seatNumber: number): StablePlayerState | undefined => {
    return state?.players.find(p => p.seatNumber === seatNumber);
  }, [state?.players]);
  
  // Get active players count
  const activePlayersCount = useMemo(() => {
    return state?.players.filter(p => p.isActive && !p.isFolded).length || 0;
  }, [state?.players]);
  
  // Is it my turn?
  const isMyTurn = useCallback((mySeat: number | null): boolean => {
    if (!state || mySeat === null) return false;
    return state.currentPlayerSeat === mySeat;
  }, [state]);
  
  return {
    state,
    isUpdating,
    queueUpdate,
    setFullState,
    updatePlayer,
    getPlayerBySeat,
    activePlayersCount,
    isMyTurn
  };
}
