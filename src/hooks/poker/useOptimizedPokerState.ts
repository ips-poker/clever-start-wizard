// ==========================================
// OPTIMIZED POKER STATE - Single Source of Truth
// ==========================================
// Unified state management for poker tables
// Zero flickering, batched updates, full memoization

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ==========================================
// TYPES
// ==========================================

export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type PlayerStatus = 'active' | 'folded' | 'all-in' | 'sitting-out' | 'disconnected';
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

export interface PokerPlayer {
  id: string;
  name: string;
  avatar?: string;
  seatNumber: number;
  stack: number;
  cards: string[];
  currentBet: number;
  totalBet: number;
  status: PlayerStatus;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isTurn: boolean;
  lastAction?: string;
  handRank?: string;
  wonAmount?: number;
  timeBank: number;
  isDisconnected: boolean;
}

export interface TableConfig {
  id: string;
  name: string;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  minBuyIn: number;
  maxBuyIn: number;
  maxPlayers: number;
  gameType: 'holdem' | 'omaha' | 'short-deck';
  tableType: 'cash' | 'tournament';
  actionTime: number;
  timeBankTime: number;
}

export interface GameState {
  tableId: string;
  handId: string | null;
  handNumber: number;
  phase: GamePhase;
  pot: number;
  sidePots: { amount: number; eligiblePlayers: string[] }[];
  currentBet: number;
  minRaise: number;
  communityCards: string[];
  players: PokerPlayer[];
  dealerSeat: number | null;
  currentPlayerSeat: number | null;
  lastAggressor: string | null;
  actionStartedAt: number | null;
  config: TableConfig;
}

export interface ActionResult {
  success: boolean;
  error?: string;
  action?: ActionType;
  amount?: number;
  newPot?: number;
  newStack?: number;
  nextPlayerSeat?: number;
  phaseChanged?: boolean;
  newPhase?: GamePhase;
  newCommunityCards?: string[];
  handComplete?: boolean;
  winners?: { playerId: string; amount: number; handName?: string }[];
}

interface UseOptimizedPokerStateOptions {
  tableId: string;
  playerId: string;
  onAction?: (action: ActionType, result: ActionResult) => void;
  onPhaseChange?: (oldPhase: GamePhase, newPhase: GamePhase) => void;
  onHandComplete?: (winners: ActionResult['winners']) => void;
  onError?: (error: string) => void;
}

// ==========================================
// BATCHED STATE UPDATER
// ==========================================

interface BatchedUpdate {
  pot?: number;
  phase?: GamePhase;
  currentBet?: number;
  communityCards?: string[];
  players?: PokerPlayer[];
  currentPlayerSeat?: number | null;
}

function useBatchedGameState(initialState: GameState | null) {
  const [state, setState] = useState<GameState | null>(initialState);
  const pendingUpdatesRef = useRef<BatchedUpdate>({});
  const rafRef = useRef<number | null>(null);

  const flushUpdates = useCallback(() => {
    const updates = pendingUpdatesRef.current;
    if (Object.keys(updates).length === 0) return;
    
    setState(prev => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
    
    pendingUpdatesRef.current = {};
    rafRef.current = null;
  }, []);

  const batchUpdate = useCallback((updates: BatchedUpdate) => {
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
    
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flushUpdates);
    }
  }, [flushUpdates]);

  const immediateUpdate = useCallback((newState: GameState) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingUpdatesRef.current = {};
    setState(newState);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return { state, batchUpdate, immediateUpdate, setState };
}

// ==========================================
// STATE HASH FOR DEDUPLICATION
// ==========================================

function createStateHash(state: Partial<GameState>): string {
  return JSON.stringify({
    handId: state.handId,
    phase: state.phase,
    pot: state.pot,
    currentBet: state.currentBet,
    currentPlayerSeat: state.currentPlayerSeat,
    communityCards: state.communityCards,
    playersHash: state.players?.map(p => ({
      id: p.id,
      stack: p.stack,
      bet: p.currentBet,
      status: p.status,
      turn: p.isTurn
    }))
  });
}

// ==========================================
// MAIN HOOK
// ==========================================

export function useOptimizedPokerState({
  tableId,
  playerId,
  onAction,
  onPhaseChange,
  onHandComplete,
  onError
}: UseOptimizedPokerStateOptions) {
  // Batched state management
  const { state: gameState, batchUpdate, immediateUpdate, setState: setGameState } = useBatchedGameState(null);
  
  // Local state
  const [myCards, setMyCards] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  // Refs for optimization
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastStateHashRef = useRef<string>('');
  const pendingActionsRef = useRef<Map<string, { action: ActionType; timestamp: number }>>(new Map());
  const syncDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(0);

  // ==========================================
  // OPTIMISTIC UPDATE
  // ==========================================
  
  const applyOptimisticUpdate = useCallback((
    action: ActionType,
    amount?: number
  ): string => {
    const actionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    pendingActionsRef.current.set(actionId, { action, timestamp: Date.now() });
    
    setGameState(prev => {
      if (!prev) return prev;
      
      const myPlayer = prev.players.find(p => p.id === playerId);
      if (!myPlayer) return prev;
      
      const updatedPlayers = prev.players.map(p => {
        if (p.id !== playerId) return { ...p, isTurn: false };
        
        switch (action) {
          case 'fold':
            return { ...p, status: 'folded' as PlayerStatus, lastAction: 'FOLD', isTurn: false };
          case 'check':
            return { ...p, lastAction: 'CHECK', isTurn: false };
          case 'call': {
            const callAmount = Math.min(prev.currentBet - p.currentBet, p.stack);
            return { 
              ...p, 
              stack: p.stack - callAmount,
              currentBet: prev.currentBet,
              totalBet: p.totalBet + callAmount,
              lastAction: 'CALL',
              isTurn: false 
            };
          }
          case 'raise':
          case 'bet': {
            const raiseAmount = amount || prev.minRaise;
            return {
              ...p,
              stack: p.stack - raiseAmount,
              currentBet: raiseAmount,
              totalBet: p.totalBet + raiseAmount,
              lastAction: `${action.toUpperCase()} ${raiseAmount}`,
              isTurn: false
            };
          }
          case 'allin':
            return {
              ...p,
              currentBet: p.currentBet + p.stack,
              totalBet: p.totalBet + p.stack,
              stack: 0,
              status: 'all-in' as PlayerStatus,
              lastAction: 'ALL-IN',
              isTurn: false
            };
          default:
            return p;
        }
      });
      
      // Calculate new pot
      const additionalPot = action === 'call' 
        ? prev.currentBet - myPlayer.currentBet
        : action === 'allin'
        ? myPlayer.stack
        : action === 'raise' || action === 'bet'
        ? (amount || prev.minRaise)
        : 0;
      
      return {
        ...prev,
        players: updatedPlayers,
        pot: prev.pot + additionalPot
      };
    });
    
    return actionId;
  }, [playerId, setGameState]);

  const confirmOptimisticUpdate = useCallback((actionId: string) => {
    pendingActionsRef.current.delete(actionId);
  }, []);

  const rollbackOptimisticUpdate = useCallback((actionId: string) => {
    pendingActionsRef.current.delete(actionId);
    // Force resync from server
    lastStateHashRef.current = '';
  }, []);

  // ==========================================
  // SERVER COMMUNICATION
  // ==========================================
  
  const callServer = useCallback(async (
    action: string,
    amount?: number,
    seatNumber?: number
  ): Promise<ActionResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await supabase.functions.invoke('poker-game-engine', {
        body: { action, tableId, playerId, amount, seatNumber }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data as ActionResult;
      
      if (!result.success && result.error) {
        setError(result.error);
        onError?.(result.error);
      }

      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Unknown error';
      setError(errorMsg);
      onError?.(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [tableId, playerId, onError]);

  // ==========================================
  // STATE SYNCHRONIZATION (Debounced)
  // ==========================================
  
  const syncGameState = useCallback(async () => {
    const now = Date.now();
    const MIN_SYNC_INTERVAL = 500; // Minimum 500ms between syncs
    
    if (now - lastSyncRef.current < MIN_SYNC_INTERVAL) {
      // Schedule a delayed sync
      if (syncDebounceRef.current) {
        clearTimeout(syncDebounceRef.current);
      }
      syncDebounceRef.current = setTimeout(syncGameState, MIN_SYNC_INTERVAL);
      return;
    }
    
    lastSyncRef.current = now;
    
    try {
      // Fetch all required data in parallel
      const [tableResult, playersResult] = await Promise.all([
        supabase.from('poker_tables').select('*').eq('id', tableId).single(),
        supabase.from('poker_table_players')
          .select('*, players(name, avatar_url)')
          .eq('table_id', tableId)
          .in('status', ['active', 'sitting_out'])
      ]);

      if (tableResult.error || !tableResult.data) return;
      const table = tableResult.data;

      let handData = null;
      let handPlayers: any[] = [];

      if (table.current_hand_id) {
        const [handResult, handPlayersResult] = await Promise.all([
          supabase.from('poker_hands').select('*').eq('id', table.current_hand_id).single(),
          supabase.from('poker_hand_players').select('*').eq('hand_id', table.current_hand_id)
        ]);
        
        handData = handResult.data;
        handPlayers = handPlayersResult.data || [];
      }

      // Build unified player state
      const players: PokerPlayer[] = (playersResult.data || []).map((tp: any) => {
        const hp = handPlayers.find(h => h.player_id === tp.player_id);
        const playerInfo = tp.players as any;
        const isHero = tp.player_id === playerId;
        
        return {
          id: tp.player_id,
          name: playerInfo?.name || 'Player',
          avatar: playerInfo?.avatar_url,
          seatNumber: hp?.seat_number || tp.seat_number,
          stack: tp.stack,
          cards: isHero && hp?.hole_cards ? hp.hole_cards : [],
          currentBet: hp?.bet_amount || 0,
          totalBet: hp?.bet_amount || 0,
          status: hp?.is_folded ? 'folded' : hp?.is_all_in ? 'all-in' : 'active',
          isDealer: tp.seat_number === table.current_dealer_seat,
          isSmallBlind: handData ? tp.seat_number === handData.small_blind_seat : false,
          isBigBlind: handData ? tp.seat_number === handData.big_blind_seat : false,
          isTurn: handData ? tp.seat_number === handData.current_player_seat : false,
          lastAction: undefined,
          handRank: hp?.hand_rank,
          wonAmount: hp?.won_amount,
          timeBank: 30,
          isDisconnected: tp.status === 'disconnected'
        };
      });

      // Update hero cards
      const heroHandPlayer = handPlayers.find(hp => hp.player_id === playerId);
      if (heroHandPlayer?.hole_cards) {
        setMyCards(heroHandPlayer.hole_cards);
      }

      const newState: GameState = {
        tableId,
        handId: table.current_hand_id,
        handNumber: handData?.hand_number || 0,
        phase: (handData?.phase || 'waiting') as GamePhase,
        pot: handData?.pot || 0,
        sidePots: handData?.side_pots ? JSON.parse(JSON.stringify(handData.side_pots)) : [],
        currentBet: handData?.current_bet || 0,
        minRaise: (handData?.current_bet || table.big_blind) * 2,
        communityCards: handData?.community_cards || [],
        players,
        dealerSeat: table.current_dealer_seat,
        currentPlayerSeat: handData?.current_player_seat,
        lastAggressor: null,
        actionStartedAt: handData?.action_started_at ? new Date(handData.action_started_at).getTime() : null,
        config: {
          id: table.id,
          name: table.name,
          smallBlind: table.small_blind,
          bigBlind: table.big_blind,
          ante: 0,
          minBuyIn: table.min_buy_in,
          maxBuyIn: table.max_buy_in,
          maxPlayers: table.max_players,
          gameType: 'holdem',
          tableType: table.table_type as 'cash' | 'tournament',
          actionTime: 15,
          timeBankTime: 30
        }
      };

      // Check if state actually changed
      const newHash = createStateHash(newState);
      if (newHash === lastStateHashRef.current) {
        return; // No change, skip update
      }
      lastStateHashRef.current = newHash;

      // Check for phase change
      if (gameState && gameState.phase !== newState.phase) {
        onPhaseChange?.(gameState.phase, newState.phase);
      }

      // Use immediate update for significant changes
      immediateUpdate(newState);
      setIsConnected(true);

    } catch (err) {
      console.error('Error syncing game state:', err);
      setError('Failed to sync game state');
    }
  }, [tableId, playerId, gameState, immediateUpdate, onPhaseChange]);

  // ==========================================
  // REALTIME SUBSCRIPTION
  // ==========================================
  
  useEffect(() => {
    syncGameState();

    // Subscribe to relevant tables with debouncing
    channelRef.current = supabase
      .channel(`optimized-poker-${tableId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'poker_tables', 
        filter: `id=eq.${tableId}` 
      }, () => {
        // Debounced sync on table changes
        if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
        syncDebounceRef.current = setTimeout(syncGameState, 100);
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'poker_table_players', 
        filter: `table_id=eq.${tableId}` 
      }, () => {
        if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
        syncDebounceRef.current = setTimeout(syncGameState, 100);
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'poker_hands'
      }, (payload) => {
        if (payload.new && (payload.new as any).table_id === tableId) {
          if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
          syncDebounceRef.current = setTimeout(syncGameState, 50);
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'poker_hand_players' 
      }, () => {
        if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
        syncDebounceRef.current = setTimeout(syncGameState, 100);
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (syncDebounceRef.current) {
        clearTimeout(syncDebounceRef.current);
      }
    };
  }, [tableId, syncGameState]);

  // ==========================================
  // ACTION TIMER
  // ==========================================
  
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (gameState?.actionStartedAt && gameState?.currentPlayerSeat) {
      const updateTimer = () => {
        const elapsed = (Date.now() - gameState.actionStartedAt!) / 1000;
        const remaining = Math.max(0, gameState.config.actionTime - elapsed);
        setTimeRemaining(Math.ceil(remaining));
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 250); // Update every 250ms
    } else {
      setTimeRemaining(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.actionStartedAt, gameState?.currentPlayerSeat, gameState?.config.actionTime]);

  // ==========================================
  // PLAYER ACTIONS
  // ==========================================
  
  const executeAction = useCallback(async (
    action: ActionType,
    amount?: number
  ): Promise<ActionResult> => {
    // Apply optimistic update first
    const actionId = applyOptimisticUpdate(action, amount);
    
    // Execute server action
    const result = await callServer(action, amount);
    
    if (!result.success) {
      rollbackOptimisticUpdate(actionId);
    } else {
      confirmOptimisticUpdate(actionId);
      onAction?.(action, result);
      
      if (result.handComplete && result.winners) {
        onHandComplete?.(result.winners);
      }
    }
    
    return result;
  }, [applyOptimisticUpdate, callServer, rollbackOptimisticUpdate, confirmOptimisticUpdate, onAction, onHandComplete]);

  // Action methods
  const fold = useCallback(() => executeAction('fold'), [executeAction]);
  const check = useCallback(() => executeAction('check'), [executeAction]);
  const call = useCallback(() => executeAction('call'), [executeAction]);
  const bet = useCallback((amount: number) => executeAction('bet', amount), [executeAction]);
  const raise = useCallback((amount: number) => executeAction('raise', amount), [executeAction]);
  const allIn = useCallback(() => executeAction('allin'), [executeAction]);

  // Table actions
  const join = useCallback((seatNumber?: number) => callServer('join', undefined, seatNumber), [callServer]);
  const leave = useCallback(() => callServer('leave'), [callServer]);
  const startHand = useCallback(() => callServer('start_hand'), [callServer]);
  const sitOut = useCallback(() => callServer('sit_out'), [callServer]);
  const sitIn = useCallback(() => callServer('sit_in'), [callServer]);

  // ==========================================
  // COMPUTED VALUES
  // ==========================================
  
  const computedValues = useMemo(() => {
    if (!gameState) {
      return {
        myPlayer: null,
        isMyTurn: false,
        canCheck: false,
        canCall: false,
        callAmount: 0,
        minBetAmount: 0,
        maxBetAmount: 0,
        activePlayers: [],
        isWaiting: true,
        isShowdown: false
      };
    }

    const myPlayer = gameState.players.find(p => p.id === playerId);
    const isMyTurn = myPlayer?.isTurn ?? false;
    const callAmount = myPlayer ? gameState.currentBet - myPlayer.currentBet : 0;
    const canCheck = callAmount <= 0;
    const canCall = callAmount > 0 && myPlayer && myPlayer.stack >= callAmount;
    const minBetAmount = gameState.minRaise;
    const maxBetAmount = myPlayer?.stack ?? 0;
    const activePlayers = gameState.players.filter(p => p.status === 'active' || p.status === 'all-in');

    return {
      myPlayer,
      isMyTurn,
      canCheck,
      canCall,
      callAmount,
      minBetAmount,
      maxBetAmount,
      activePlayers,
      isWaiting: gameState.phase === 'waiting',
      isShowdown: gameState.phase === 'showdown'
    };
  }, [gameState, playerId]);

  return {
    // State
    gameState,
    myCards,
    isConnected,
    isLoading,
    error,
    timeRemaining,
    
    // Computed
    ...computedValues,
    
    // Actions
    fold,
    check,
    call,
    bet,
    raise,
    allIn,
    
    // Table actions
    join,
    leave,
    startHand,
    sitOut,
    sitIn,
    
    // Manual sync
    syncGameState
  };
}
