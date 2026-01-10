/**
 * Table Session Persistence Hook
 * PokerStars-style reconnect: игрок автоматически возвращается на стол после обновления/сбоя
 * Работает для обоих типов столов: кэш и турнирных
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TableSession {
  tableId: string;
  playerId: string;
  seatNumber: number;
  stack: number;
  buyIn: number;
  isTournament: boolean;
  tournamentId?: string;
  lastHandId?: string;
  timestamp: number;
}

interface TableSessionState {
  isReconnecting: boolean;
  hasActiveSession: boolean;
  session: TableSession | null;
  error: string | null;
}

const SESSION_KEY = 'poker_active_table_session';
const CASH_SESSION_EXPIRY_MS = 60 * 60 * 1000; // 1 hour for cash games
const TOURNAMENT_SESSION_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours for tournaments

/**
 * Check if player is still seated at a table on the server
 */
async function verifyPlayerAtTable(
  playerId: string, 
  tableId: string
): Promise<{ isSeated: boolean; stack?: number; seatNumber?: number }> {
  try {
    const { data, error } = await supabase
      .from('poker_table_players')
      .select('id, stack, seat_number, status')
      .eq('player_id', playerId)
      .eq('table_id', tableId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.warn('[TableSession] Error checking seat:', error);
      return { isSeated: false };
    }

    if (data) {
      return { 
        isSeated: true, 
        stack: data.stack, 
        seatNumber: data.seat_number 
      };
    }

    return { isSeated: false };
  } catch (err) {
    console.error('[TableSession] Verify failed:', err);
    return { isSeated: false };
  }
}

/**
 * Check if table exists and is still active
 */
async function verifyTableActive(tableId: string): Promise<{ 
  isActive: boolean; 
  isTournament: boolean;
  tournamentId?: string;
  tableName?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('poker_tables')
      .select('id, name, status, tournament_id')
      .eq('id', tableId)
      .maybeSingle();

    if (error || !data) {
      return { isActive: false, isTournament: false };
    }

    // For tournament tables - check tournament status
    if (data.tournament_id) {
      const { data: tournament } = await supabase
        .from('online_poker_tournaments')
        .select('status')
        .eq('id', data.tournament_id)
        .maybeSingle();

      const tournamentActive = tournament && ['running', 'break', 'hand_for_hand', 'final_table'].includes(tournament.status);
      
      return {
        isActive: tournamentActive || false,
        isTournament: true,
        tournamentId: data.tournament_id,
        tableName: data.name
      };
    }

    // For cash tables - check table status
    const cashActive = ['waiting', 'playing'].includes(data.status);
    return {
      isActive: cashActive,
      isTournament: false,
      tableName: data.name
    };
  } catch (err) {
    console.error('[TableSession] Table verify failed:', err);
    return { isActive: false, isTournament: false };
  }
}

export function useTableSession(playerId: string | null) {
  const [state, setState] = useState<TableSessionState>({
    isReconnecting: false,
    hasActiveSession: false,
    session: null,
    error: null,
  });
  
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Save session to localStorage
  const saveSession = useCallback((sessionData: Omit<TableSession, 'timestamp'>) => {
    const session: TableSession = {
      ...sessionData,
      timestamp: Date.now(),
    };
    
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      console.log('[TableSession] Session saved:', session.tableId, session.isTournament ? '(tournament)' : '(cash)');
      
      if (mountedRef.current) {
        setState(prev => ({ ...prev, session, hasActiveSession: true }));
      }
    } catch (err) {
      console.error('[TableSession] Failed to save session:', err);
    }
  }, []);

  // Load session from localStorage
  const loadSession = useCallback((): TableSession | null => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;

      const session: TableSession = JSON.parse(stored);
      
      // Check if session expired
      const expiryMs = session.isTournament ? TOURNAMENT_SESSION_EXPIRY_MS : CASH_SESSION_EXPIRY_MS;
      if (Date.now() - session.timestamp > expiryMs) {
        localStorage.removeItem(SESSION_KEY);
        console.log('[TableSession] Session expired');
        return null;
      }

      // Verify it's for the same player
      if (playerId && session.playerId !== playerId) {
        console.log('[TableSession] Session for different player');
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
    
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    
    if (mountedRef.current) {
      setState({
        isReconnecting: false,
        hasActiveSession: false,
        session: null,
        error: null,
      });
    }
    
    console.log('[TableSession] Session cleared');
  }, []);

  // Attempt to reconnect to saved session
  const attemptReconnect = useCallback(async (): Promise<TableSession | null> => {
    if (!playerId) return null;

    const savedSession = loadSession();
    if (!savedSession) {
      console.log('[TableSession] No saved session found');
      return null;
    }

    console.log('[TableSession] Attempting reconnect to:', savedSession.tableId);
    setState(prev => ({ ...prev, isReconnecting: true, error: null }));

    try {
      // 1. Verify table is still active
      const tableStatus = await verifyTableActive(savedSession.tableId);
      
      if (!tableStatus.isActive) {
        console.log('[TableSession] Table no longer active');
        clearSession();
        setState(prev => ({
          ...prev,
          isReconnecting: false,
          error: savedSession.isTournament ? 'Турнир завершён' : 'Стол закрыт'
        }));
        return null;
      }

      // 2. Check if player is still at this table
      const seatStatus = await verifyPlayerAtTable(playerId, savedSession.tableId);
      
      if (seatStatus.isSeated) {
        // Player is still at the table - update session with current stack
        const recoveredSession: TableSession = {
          ...savedSession,
          stack: seatStatus.stack ?? savedSession.stack,
          seatNumber: seatStatus.seatNumber ?? savedSession.seatNumber,
          timestamp: Date.now(),
        };

        saveSession(recoveredSession);
        
        if (mountedRef.current) {
          setState({
            isReconnecting: false,
            hasActiveSession: true,
            session: recoveredSession,
            error: null,
          });
        }

        console.log('[TableSession] Session recovered - player still seated');
        return recoveredSession;
      }

      // 3. For tournaments - check if player was moved to a different table
      if (savedSession.isTournament && savedSession.tournamentId) {
        const { data: participant } = await supabase
          .from('online_poker_tournament_participants')
          .select('status, table_id, seat_number, chips')
          .eq('player_id', playerId)
          .eq('tournament_id', savedSession.tournamentId)
          .maybeSingle();

        if (participant) {
          if (participant.status === 'eliminated') {
            clearSession();
            setState(prev => ({
              ...prev,
              isReconnecting: false,
              error: 'Вы выбыли из турнира'
            }));
            return null;
          }

          if (participant.table_id && participant.table_id !== savedSession.tableId) {
            // Player was moved to a new table during balancing
            const movedSession: TableSession = {
              ...savedSession,
              tableId: participant.table_id,
              seatNumber: participant.seat_number || savedSession.seatNumber,
              stack: participant.chips || savedSession.stack,
              timestamp: Date.now(),
            };

            saveSession(movedSession);
            
            if (mountedRef.current) {
              setState({
                isReconnecting: false,
                hasActiveSession: true,
                session: movedSession,
                error: null,
              });
            }

            console.log('[TableSession] Session recovered - player moved to new table:', movedSession.tableId);
            return movedSession;
          }

          // Player is still in tournament but not at table - they will be seated automatically
          const recoveredSession: TableSession = {
            ...savedSession,
            tableId: participant.table_id || savedSession.tableId,
            seatNumber: participant.seat_number || savedSession.seatNumber,
            stack: participant.chips || savedSession.stack,
            timestamp: Date.now(),
          };

          saveSession(recoveredSession);
          
          if (mountedRef.current) {
            setState({
              isReconnecting: false,
              hasActiveSession: true,
              session: recoveredSession,
              error: null,
            });
          }

          return recoveredSession;
        }
      }

      // 4. For cash games - player left the table (maybe disconnected too long)
      console.log('[TableSession] Player no longer at table');
      clearSession();
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isReconnecting: false,
          error: 'Вы покинули стол'
        }));
      }
      
      return null;

    } catch (err) {
      console.error('[TableSession] Reconnect failed:', err);
      
      if (mountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          isReconnecting: false, 
          error: 'Ошибка восстановления сессии' 
        }));
      }
      
      return null;
    }
  }, [playerId, loadSession, saveSession, clearSession]);

  // Start heartbeat to keep session fresh
  const startHeartbeat = useCallback((sessionData: Omit<TableSession, 'timestamp'>) => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    // Update session every 30 seconds
    heartbeatRef.current = setInterval(() => {
      saveSession(sessionData);
    }, 30000);

    // Initial save
    saveSession(sessionData);
  }, [saveSession]);

  // Update session data (call when stack changes, etc)
  const updateSession = useCallback((updates: Partial<Omit<TableSession, 'timestamp'>>) => {
    const currentSession = loadSession();
    if (currentSession) {
      saveSession({ ...currentSession, ...updates });
    }
  }, [loadSession, saveSession]);

  // Check for active session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      if (!playerId) return;
      
      const savedSession = loadSession();
      if (savedSession) {
        console.log('[TableSession] Found saved session, attempting reconnect...');
        await attemptReconnect();
      }
    };

    checkExistingSession();
  }, [playerId, loadSession, attemptReconnect]);

  // Handle tab visibility change
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && playerId) {
        const session = loadSession();
        if (session) {
          console.log('[TableSession] Tab visible, refreshing session...');
          // Just refresh - saveSession adds timestamp automatically
          const { timestamp, ...sessionWithoutTimestamp } = session;
          saveSession(sessionWithoutTimestamp);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [playerId, loadSession, saveSession]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, []);

  return {
    ...state,
    saveSession,
    loadSession,
    clearSession,
    attemptReconnect,
    startHeartbeat,
    updateSession,
  };
}

export default useTableSession;
