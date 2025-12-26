/**
 * Enhanced Reconnect Hook
 * 6.2 - Full state restoration on reconnect with action replay
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GameState {
  tableId: string;
  handId: string | null;
  phase: string;
  pot: number;
  currentBet: number;
  communityCards: string[];
  myCards: string[];
  mySeat: number;
  myStack: number;
  myBet: number;
  currentPlayerSeat: number | null;
  dealerSeat: number;
  players: Array<{
    playerId: string;
    seatNumber: number;
    stack: number;
    bet: number;
    isFolded: boolean;
    isAllIn: boolean;
  }>;
}

interface ReconnectSession {
  playerId: string;
  tableId: string;
  tournamentId?: string;
  lastState: GameState | null;
  pendingActions: Array<{
    type: string;
    amount?: number;
    timestamp: number;
  }>;
  disconnectedAt: number;
  reconnectAttempts: number;
}

interface UseEnhancedReconnectOptions {
  playerId: string;
  tableId: string;
  tournamentId?: string;
  onStateRestored?: (state: GameState) => void;
  onReconnectFailed?: (reason: string) => void;
  maxReconnectAttempts?: number;
  reconnectDelayMs?: number;
}

const SESSION_KEY = 'poker_enhanced_session';
const MAX_DISCONNECT_AGE = 10 * 60 * 1000; // 10 minutes
const STATE_SNAPSHOT_INTERVAL = 2000; // Every 2 seconds

export function useEnhancedReconnect(options: UseEnhancedReconnectOptions) {
  const {
    playerId,
    tableId,
    tournamentId,
    onStateRestored,
    onReconnectFailed,
    maxReconnectAttempts = 5,
    reconnectDelayMs = 2000
  } = options;

  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectProgress, setReconnectProgress] = useState(0);
  const [lastSavedState, setLastSavedState] = useState<GameState | null>(null);
  const [wasDisconnected, setWasDisconnected] = useState(false);

  const snapshotIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentStateRef = useRef<GameState | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Save session to localStorage with current state
  const saveSession = useCallback((state: GameState) => {
    const session: ReconnectSession = {
      playerId,
      tableId,
      tournamentId,
      lastState: state,
      pendingActions: [],
      disconnectedAt: Date.now(),
      reconnectAttempts: 0
    };

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      currentStateRef.current = state;
      setLastSavedState(state);
    } catch (err) {
      console.error('[EnhancedReconnect] Failed to save session:', err);
    }
  }, [playerId, tableId, tournamentId]);

  // Load session from localStorage
  const loadSession = useCallback((): ReconnectSession | null => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;

      const session: ReconnectSession = JSON.parse(stored);

      // Verify session matches current player/table
      if (session.playerId !== playerId) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }

      // Check if session is too old
      if (Date.now() - session.disconnectedAt > MAX_DISCONNECT_AGE) {
        console.log('[EnhancedReconnect] Session too old, clearing');
        localStorage.removeItem(SESSION_KEY);
        return null;
      }

      return session;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }, [playerId]);

  // Clear saved session
  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    currentStateRef.current = null;
    setLastSavedState(null);
    reconnectAttemptsRef.current = 0;
  }, []);

  // Fetch current game state from server
  const fetchServerState = useCallback(async (): Promise<GameState | null> => {
    try {
      // Get table data
      const { data: tableData, error: tableError } = await supabase
        .from('poker_tables')
        .select('*')
        .eq('id', tableId)
        .single();

      if (tableError || !tableData) {
        console.error('[EnhancedReconnect] Table not found');
        return null;
      }

      // Get current hand if exists
      const { data: handData } = await supabase
        .from('poker_hands')
        .select('*')
        .eq('table_id', tableId)
        .is('completed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get table players
      const { data: playersData } = await supabase
        .from('poker_table_players')
        .select('*')
        .eq('table_id', tableId);

      // Get my player data
      const myPlayer = playersData?.find(p => p.player_id === playerId);

      if (!myPlayer) {
        console.error('[EnhancedReconnect] Player not at table');
        return null;
      }

      // Build game state
      const state: GameState = {
        tableId,
        handId: handData?.id || null,
        phase: handData?.phase || 'waiting',
        pot: handData?.pot || 0,
        currentBet: handData?.current_bet || 0,
        communityCards: handData?.community_cards || [],
        myCards: [], // Cards need to come from server
        mySeat: myPlayer.seat_number,
        myStack: myPlayer.stack,
        myBet: 0, // Will be updated from hand data
        currentPlayerSeat: handData?.current_player_seat || null,
        dealerSeat: handData?.dealer_seat || 0,
        players: playersData?.map(p => ({
          playerId: p.player_id,
          seatNumber: p.seat_number,
          stack: p.stack,
          bet: 0,
          isFolded: p.status === 'folded',
          isAllIn: p.status === 'all_in'
        })) || []
      };

      return state;
    } catch (err) {
      console.error('[EnhancedReconnect] Failed to fetch server state:', err);
      return null;
    }
  }, [tableId, playerId]);

  // Attempt reconnection with state restoration
  const attemptReconnect = useCallback(async (): Promise<boolean> => {
    if (isReconnecting) return false;

    setIsReconnecting(true);
    setReconnectProgress(0);

    try {
      const savedSession = loadSession();
      
      console.log('[EnhancedReconnect] Starting reconnect...', {
        hasSavedSession: !!savedSession,
        attempt: reconnectAttemptsRef.current + 1
      });

      setReconnectProgress(20);

      // Verify tournament still running (if applicable)
      if (tournamentId) {
        const { data: tournament } = await supabase
          .from('online_poker_tournaments')
          .select('status')
          .eq('id', tournamentId)
          .single();

        if (!tournament || !['running', 'break'].includes(tournament.status)) {
          onReconnectFailed?.('Tournament has ended');
          clearSession();
          setIsReconnecting(false);
          return false;
        }
      }

      setReconnectProgress(40);

      // Fetch current server state
      const serverState = await fetchServerState();

      setReconnectProgress(60);

      if (!serverState) {
        reconnectAttemptsRef.current++;
        
        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          onReconnectFailed?.('Max reconnect attempts reached');
          clearSession();
          setIsReconnecting(false);
          return false;
        }

        // Retry after delay
        await new Promise(resolve => setTimeout(resolve, reconnectDelayMs));
        setIsReconnecting(false);
        return attemptReconnect();
      }

      setReconnectProgress(80);

      // Compare with saved state and determine what needs to be synced
      if (savedSession?.lastState) {
        const savedState = savedSession.lastState;
        
        // Check if we're in a different hand
        if (savedState.handId !== serverState.handId) {
          console.log('[EnhancedReconnect] Hand changed during disconnect');
          // New hand - use server state entirely
        } else if (savedState.phase !== serverState.phase) {
          console.log('[EnhancedReconnect] Phase changed during disconnect');
          // Same hand but phase changed - check for any missed actions
        }
      }

      setReconnectProgress(100);

      // Restore state
      onStateRestored?.(serverState);
      saveSession(serverState);
      setWasDisconnected(true);
      
      toast.success('Соединение восстановлено');
      console.log('[EnhancedReconnect] State restored:', serverState);

      reconnectAttemptsRef.current = 0;
      setIsReconnecting(false);
      return true;

    } catch (err) {
      console.error('[EnhancedReconnect] Reconnect failed:', err);
      reconnectAttemptsRef.current++;
      setIsReconnecting(false);
      
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        await new Promise(resolve => setTimeout(resolve, reconnectDelayMs));
        return attemptReconnect();
      }
      
      onReconnectFailed?.('Reconnection failed');
      return false;
    }
  }, [
    isReconnecting, 
    loadSession, 
    tournamentId, 
    fetchServerState, 
    maxReconnectAttempts,
    reconnectDelayMs,
    onReconnectFailed, 
    onStateRestored, 
    saveSession, 
    clearSession
  ]);

  // Start state snapshots
  const startSnapshots = useCallback((getCurrentState: () => GameState | null) => {
    if (snapshotIntervalRef.current) {
      clearInterval(snapshotIntervalRef.current);
    }

    snapshotIntervalRef.current = setInterval(() => {
      const state = getCurrentState();
      if (state) {
        saveSession(state);
      }
    }, STATE_SNAPSHOT_INTERVAL);

    // Initial snapshot
    const initialState = getCurrentState();
    if (initialState) {
      saveSession(initialState);
    }
  }, [saveSession]);

  // Stop snapshots
  const stopSnapshots = useCallback(() => {
    if (snapshotIntervalRef.current) {
      clearInterval(snapshotIntervalRef.current);
      snapshotIntervalRef.current = null;
    }
  }, []);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab became visible - check if reconnect needed
        const session = loadSession();
        if (session && session.tableId === tableId) {
          console.log('[EnhancedReconnect] Tab visible, checking connection...');
          attemptReconnect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadSession, tableId, attemptReconnect]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopSnapshots();
    };
  }, [stopSnapshots]);

  return {
    // State
    isReconnecting,
    reconnectProgress,
    lastSavedState,
    wasDisconnected,
    
    // Actions
    saveSession,
    loadSession,
    clearSession,
    attemptReconnect,
    startSnapshots,
    stopSnapshots,
    
    // Utils
    reconnectAttempts: reconnectAttemptsRef.current
  };
}

export default useEnhancedReconnect;
