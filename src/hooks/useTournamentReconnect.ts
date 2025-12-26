/**
 * Tournament Reconnect Hook
 * Handles session persistence and recovery for tournament games
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TournamentSession {
  tournamentId: string;
  tableId: string;
  playerId: string;
  seatNumber: number;
  stack: number;
  lastHandId?: string;
  timestamp: number;
}

interface ReconnectState {
  isReconnecting: boolean;
  wasDisconnected: boolean;
  recoveredSession: TournamentSession | null;
  error: string | null;
}

const SESSION_KEY = 'poker_tournament_session';
const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export function useTournamentReconnect(playerId: string | null) {
  const [state, setState] = useState<ReconnectState>({
    isReconnecting: false,
    wasDisconnected: false,
    recoveredSession: null,
    error: null,
  });
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Save session to localStorage
  const saveSession = useCallback((session: Omit<TournamentSession, 'timestamp'>) => {
    const sessionData: TournamentSession = {
      ...session,
      timestamp: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    console.log('[Reconnect] Session saved:', session.tableId);
  }, []);

  // Load session from localStorage
  const loadSession = useCallback((): TournamentSession | null => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;

      const session: TournamentSession = JSON.parse(stored);
      
      // Check if session expired
      if (Date.now() - session.timestamp > SESSION_EXPIRY_MS) {
        localStorage.removeItem(SESSION_KEY);
        console.log('[Reconnect] Session expired');
        return null;
      }

      // Verify it's for the same player
      if (playerId && session.playerId !== playerId) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }

      return session;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }, [playerId]);

  // Clear session
  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setState(prev => ({ ...prev, recoveredSession: null }));
    console.log('[Reconnect] Session cleared');
  }, []);

  // Attempt reconnection
  const attemptReconnect = useCallback(async (): Promise<TournamentSession | null> => {
    if (!playerId) return null;

    const savedSession = loadSession();
    if (!savedSession) return null;

    setState(prev => ({ ...prev, isReconnecting: true, error: null }));

    try {
      // 1. Verify tournament is still running
      const { data: tournament, error: tournamentError } = await supabase
        .from('online_poker_tournaments')
        .select('status')
        .eq('id', savedSession.tournamentId)
        .single();

      if (tournamentError || !tournament || !['running', 'break'].includes(tournament.status)) {
        clearSession();
        setState(prev => ({ 
          ...prev, 
          isReconnecting: false, 
          error: 'Турнир завершён' 
        }));
        return null;
      }

      // 2. Verify player is still in tournament
      const { data: participant, error: participantError } = await supabase
        .from('online_poker_tournament_participants')
        .select('status, table_id, seat_number, chips')
        .eq('player_id', playerId)
        .eq('tournament_id', savedSession.tournamentId)
        .single();

      if (participantError || !participant || participant.status === 'eliminated') {
        clearSession();
        setState(prev => ({ 
          ...prev, 
          isReconnecting: false, 
          error: 'Вы выбыли из турнира' 
        }));
        return null;
      }

      // 3. Get current table (might have changed during balancing)
      const currentTableId = participant.table_id || savedSession.tableId;
      const currentSeat = participant.seat_number || savedSession.seatNumber;
      const currentStack = participant.chips || savedSession.stack;

      // 4. Verify table player entry exists
      const { data: tablePlayer } = await supabase
        .from('poker_table_players')
        .select('id, stack, seat_number')
        .eq('player_id', playerId)
        .eq('table_id', currentTableId)
        .single();

      if (!tablePlayer) {
        // Player not at table - need to rejoin
        const { error: joinError } = await supabase
          .from('poker_table_players')
          .insert({
            player_id: playerId,
            table_id: currentTableId,
            seat_number: currentSeat,
            stack: currentStack,
            status: 'active',
          });

        if (joinError) {
          console.error('[Reconnect] Failed to rejoin table:', joinError);
          // Try to find any available seat
        }
      }

      // 5. Update session with current data
      const recoveredSession: TournamentSession = {
        ...savedSession,
        tableId: currentTableId,
        seatNumber: currentSeat,
        stack: currentStack,
        timestamp: Date.now(),
      };

      saveSession(recoveredSession);

      setState({
        isReconnecting: false,
        wasDisconnected: true,
        recoveredSession,
        error: null,
      });

      console.log('[Reconnect] Session recovered:', recoveredSession);
      return recoveredSession;

    } catch (err) {
      console.error('[Reconnect] Recovery failed:', err);
      setState(prev => ({ 
        ...prev, 
        isReconnecting: false, 
        error: 'Ошибка восстановления сессии' 
      }));
      return null;
    }
  }, [playerId, loadSession, saveSession, clearSession]);

  // Start heartbeat to keep session alive
  const startHeartbeat = useCallback((session: Omit<TournamentSession, 'timestamp'>) => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    // Update session every 30 seconds
    heartbeatRef.current = setInterval(() => {
      saveSession(session);
    }, 30000);

    // Initial save
    saveSession(session);
  }, [saveSession]);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // Update session stack (call when stack changes)
  const updateSessionStack = useCallback((newStack: number) => {
    const session = loadSession();
    if (session) {
      saveSession({ ...session, stack: newStack });
    }
  }, [loadSession, saveSession]);

  // Handle visibility change (tab focus)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab became visible - check if we need to reconnect
        const session = loadSession();
        if (session && playerId === session.playerId) {
          console.log('[Reconnect] Tab focused, checking session...');
          attemptReconnect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadSession, playerId, attemptReconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  return {
    ...state,
    saveSession,
    loadSession,
    clearSession,
    attemptReconnect,
    startHeartbeat,
    stopHeartbeat,
    updateSessionStack,
  };
}

export default useTournamentReconnect;
