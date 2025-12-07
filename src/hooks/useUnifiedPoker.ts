import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStableState } from './useStableState';

// ==========================================
// UNIFIED POKER STATE TYPES
// ==========================================

export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type PlayerStatus = 'active' | 'folded' | 'all-in' | 'sitting-out' | 'disconnected';
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

export interface UnifiedPlayer {
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

export interface UnifiedGameState {
  tableId: string;
  handId: string | null;
  handNumber: number;
  phase: GamePhase;
  pot: number;
  sidePots: { amount: number; eligiblePlayers: string[] }[];
  currentBet: number;
  minRaise: number;
  communityCards: string[];
  players: UnifiedPlayer[];
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

interface UseUnifiedPokerOptions {
  tableId: string;
  playerId: string;
  onAction?: (action: ActionType, result: ActionResult) => void;
  onPhaseChange?: (oldPhase: GamePhase, newPhase: GamePhase) => void;
  onHandComplete?: (winners: ActionResult['winners']) => void;
  onError?: (error: string) => void;
}

// ==========================================
// UNIFIED POKER STATE MANAGER
// ==========================================

export function useUnifiedPoker({
  tableId,
  playerId,
  onAction,
  onPhaseChange,
  onHandComplete,
  onError
}: UseUnifiedPokerOptions) {
  // Stable state for frequently updated values
  const [pot, setPot, setPotImmediate] = useStableState(0, 30);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  // Main game state
  const [gameState, setGameState] = useState<UnifiedGameState | null>(null);
  const [myCards, setMyCards] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for timers and subscriptions
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastStateRef = useRef<string>('');
  const pendingActionsRef = useRef<Map<string, { action: ActionType; timestamp: number }>>(new Map());

  // ==========================================
  // OPTIMISTIC UPDATE HELPERS
  // ==========================================
  
  const applyOptimisticUpdate = useCallback((
    action: ActionType,
    amount?: number
  ): string => {
    const actionId = `${Date.now()}-${Math.random()}`;
    pendingActionsRef.current.set(actionId, { action, timestamp: Date.now() });
    
    setGameState(prev => {
      if (!prev) return prev;
      
      const myPlayer = prev.players.find(p => p.id === playerId);
      if (!myPlayer) return prev;
      
      const updatedPlayers = prev.players.map(p => {
        if (p.id !== playerId) return p;
        
        switch (action) {
          case 'fold':
            return { ...p, status: 'folded' as PlayerStatus, lastAction: 'FOLD', isTurn: false };
          case 'check':
            return { ...p, lastAction: 'CHECK', isTurn: false };
          case 'call':
            const callAmount = prev.currentBet - p.currentBet;
            return { 
              ...p, 
              stack: p.stack - callAmount,
              currentBet: prev.currentBet,
              totalBet: p.totalBet + callAmount,
              lastAction: 'CALL',
              isTurn: false 
            };
          case 'raise':
          case 'bet':
            const raiseAmount = amount || prev.minRaise;
            return {
              ...p,
              stack: p.stack - raiseAmount,
              currentBet: raiseAmount,
              totalBet: p.totalBet + raiseAmount,
              lastAction: `${action.toUpperCase()} ${raiseAmount}`,
              isTurn: false
            };
          case 'all-in':
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
        : action === 'all-in'
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
  }, [playerId]);

  const rollbackOptimisticUpdate = useCallback((actionId: string) => {
    pendingActionsRef.current.delete(actionId);
    // State will be restored on next server sync
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
  // STATE SYNCHRONIZATION
  // ==========================================
  
  const syncGameState = useCallback(async () => {
    try {
      // Fetch all required data in parallel
      const [tableResult, playersResult] = await Promise.all([
        supabase.from('poker_tables').select('*').eq('id', tableId).single(),
        supabase.from('poker_table_players')
          .select('*, players(name, avatar_url)')
          .eq('table_id', tableId)
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
      const players: UnifiedPlayer[] = (playersResult.data || []).map((tp: any) => {
        const hp = handPlayers.find(h => h.player_id === tp.player_id);
        const playerInfo = tp.players as any;
        const isHero = tp.player_id === playerId;
        
        return {
          id: tp.player_id,
          name: playerInfo?.name || 'Player',
          avatar: playerInfo?.avatar_url,
          seatNumber: tp.seat_number,
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

      // Create state hash for deduplication
      const stateHash = JSON.stringify({
        handId: table.current_hand_id,
        phase: handData?.phase,
        pot: handData?.pot,
        currentBet: handData?.current_bet,
        currentPlayerSeat: handData?.current_player_seat,
        communityCards: handData?.community_cards
      });

      // Skip update if state hasn't changed
      if (stateHash === lastStateRef.current) return;
      lastStateRef.current = stateHash;

      const newState: UnifiedGameState = {
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

      // Check for phase change
      if (gameState && gameState.phase !== newState.phase) {
        onPhaseChange?.(gameState.phase, newState.phase);
      }

      // Update pot with stable state
      setPot(newState.pot);
      setGameState(newState);
      setIsConnected(true);

    } catch (err) {
      console.error('Error syncing game state:', err);
      setError('Failed to sync game state');
    }
  }, [tableId, playerId, gameState, setPot, onPhaseChange]);

  // ==========================================
  // REALTIME SUBSCRIPTION
  // ==========================================
  
  useEffect(() => {
    syncGameState();

    // Subscribe to all relevant tables
    channelRef.current = supabase
      .channel(`unified-poker-${tableId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'poker_tables', 
        filter: `id=eq.${tableId}` 
      }, syncGameState)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'poker_table_players', 
        filter: `table_id=eq.${tableId}` 
      }, syncGameState)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'poker_hands' 
      }, (payload) => {
        // Only sync if this hand belongs to our table
        if (payload.new && (payload.new as any).table_id === tableId) {
          syncGameState();
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'poker_hand_players' 
      }, syncGameState)
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
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
      timerRef.current = setInterval(updateTimer, 100);
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
    // Apply optimistic update
    const actionId = applyOptimisticUpdate(action, amount);
    
    // Execute server action
    const result = await callServer(action, amount);
    
    if (!result.success) {
      // Rollback on failure
      rollbackOptimisticUpdate(actionId);
    } else {
      // Clear pending action
      pendingActionsRef.current.delete(actionId);
      onAction?.(action, result);
      
      // Handle hand completion
      if (result.handComplete && result.winners) {
        onHandComplete?.(result.winners);
      }
    }
    
    return result;
  }, [applyOptimisticUpdate, callServer, rollbackOptimisticUpdate, onAction, onHandComplete]);

  // Action methods
  const fold = useCallback(() => executeAction('fold'), [executeAction]);
  const check = useCallback(() => executeAction('check'), [executeAction]);
  const call = useCallback(() => executeAction('call'), [executeAction]);
  const bet = useCallback((amount: number) => executeAction('bet', amount), [executeAction]);
  const raise = useCallback((amount: number) => executeAction('raise', amount), [executeAction]);
  const allIn = useCallback(() => executeAction('all-in'), [executeAction]);

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
        callAmount: 0,
        minRaiseAmount: 0,
        maxRaiseAmount: 0,
        activePlayers: [],
        isHandInProgress: false
      };
    }

    const myPlayer = gameState.players.find(p => p.id === playerId);
    const isMyTurn = myPlayer?.isTurn && myPlayer.status === 'active';
    const canCheck = isMyTurn && gameState.currentBet <= (myPlayer?.currentBet || 0);
    const callAmount = Math.max(0, gameState.currentBet - (myPlayer?.currentBet || 0));
    const minRaiseAmount = gameState.minRaise;
    const maxRaiseAmount = myPlayer?.stack || 0;
    const activePlayers = gameState.players.filter(p => p.status === 'active' || p.status === 'all-in');
    const isHandInProgress = gameState.phase !== 'waiting' && gameState.phase !== 'showdown';

    return {
      myPlayer,
      isMyTurn,
      canCheck,
      callAmount,
      minRaiseAmount,
      maxRaiseAmount,
      activePlayers,
      isHandInProgress
    };
  }, [gameState, playerId]);

  return {
    // State
    gameState,
    myCards,
    pot,
    timeRemaining,
    isConnected,
    isLoading,
    error,
    
    // Computed
    ...computedValues,
    
    // Player actions
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
    
    // Utilities
    refresh: syncGameState
  };
}
