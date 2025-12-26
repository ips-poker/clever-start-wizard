/**
 * Session Tracking Hook
 * 7.3 - Tracks player session metrics, profit/loss, and time at table
 */
import { useState, useEffect, useCallback, useRef } from 'react';

interface SessionMetrics {
  // Time metrics
  sessionId: string;
  startTime: number;
  endTime: number | null;
  durationMs: number;
  activeTimeMs: number;
  idleTimeMs: number;
  
  // Financial metrics
  buyInTotal: number;
  cashOutTotal: number;
  netProfit: number;
  bigBlindsWon: number;
  bigBlindsPerHour: number;
  
  // Hand metrics
  handsPlayed: number;
  handsWon: number;
  handsLost: number;
  biggestPotWon: number;
  biggestPotLost: number;
  
  // Action metrics
  folds: number;
  checks: number;
  calls: number;
  bets: number;
  raises: number;
  allIns: number;
  
  // Tournament specific
  tournamentId?: string;
  startingChips?: number;
  currentChips?: number;
  peakChips?: number;
  finishPosition?: number;
  prizeWon?: number;
}

interface SessionEvent {
  type: 'buy_in' | 'cash_out' | 'hand_won' | 'hand_lost' | 'action' | 'rebuy' | 'addon';
  amount?: number;
  details?: Record<string, any>;
  timestamp: number;
}

interface UseSessionTrackingOptions {
  tableId: string;
  playerId: string;
  bigBlind: number;
  isTournament?: boolean;
  tournamentId?: string;
  startingChips?: number;
  onSessionEnd?: (metrics: SessionMetrics) => void;
}

const SESSION_STORAGE_KEY = 'poker_session_history';
const MAX_STORED_SESSIONS = 100;

// Generate unique session ID
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export function useSessionTracking(options: UseSessionTrackingOptions) {
  const {
    tableId,
    playerId,
    bigBlind,
    isTournament = false,
    tournamentId,
    startingChips,
    onSessionEnd
  } = options;

  const [metrics, setMetrics] = useState<SessionMetrics>(() => ({
    sessionId: generateSessionId(),
    startTime: Date.now(),
    endTime: null,
    durationMs: 0,
    activeTimeMs: 0,
    idleTimeMs: 0,
    buyInTotal: startingChips || 0,
    cashOutTotal: 0,
    netProfit: 0,
    bigBlindsWon: 0,
    bigBlindsPerHour: 0,
    handsPlayed: 0,
    handsWon: 0,
    handsLost: 0,
    biggestPotWon: 0,
    biggestPotLost: 0,
    folds: 0,
    checks: 0,
    calls: 0,
    bets: 0,
    raises: 0,
    allIns: 0,
    tournamentId,
    startingChips,
    currentChips: startingChips,
    peakChips: startingChips
  }));

  const [isActive, setIsActive] = useState(true);
  const eventsRef = useRef<SessionEvent[]>([]);
  const lastActivityRef = useRef(Date.now());
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track activity
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (!isActive) {
      setIsActive(true);
    }
  }, [isActive]);

  // Record a session event
  const recordEvent = useCallback((event: Omit<SessionEvent, 'timestamp'>) => {
    const fullEvent: SessionEvent = {
      ...event,
      timestamp: Date.now()
    };
    
    eventsRef.current.push(fullEvent);
    recordActivity();
    
    console.log('[SessionTracking] Event recorded:', fullEvent);
    
    // Update metrics based on event type
    setMetrics(prev => {
      const updated = { ...prev };
      
      switch (event.type) {
        case 'buy_in':
          updated.buyInTotal += event.amount || 0;
          break;
          
        case 'cash_out':
          updated.cashOutTotal += event.amount || 0;
          break;
          
        case 'rebuy':
        case 'addon':
          updated.buyInTotal += event.amount || 0;
          break;
          
        case 'hand_won':
          updated.handsWon++;
          updated.handsPlayed++;
          if (event.amount && event.amount > updated.biggestPotWon) {
            updated.biggestPotWon = event.amount;
          }
          break;
          
        case 'hand_lost':
          updated.handsLost++;
          updated.handsPlayed++;
          if (event.amount && event.amount > updated.biggestPotLost) {
            updated.biggestPotLost = event.amount;
          }
          break;
          
        case 'action':
          const action = event.details?.action;
          if (action === 'fold') updated.folds++;
          else if (action === 'check') updated.checks++;
          else if (action === 'call') updated.calls++;
          else if (action === 'bet') updated.bets++;
          else if (action === 'raise') updated.raises++;
          else if (action === 'allin') updated.allIns++;
          break;
      }
      
      // Recalculate derived metrics
      updated.netProfit = updated.cashOutTotal - updated.buyInTotal;
      updated.bigBlindsWon = updated.netProfit / bigBlind;
      
      const hours = updated.durationMs / (1000 * 60 * 60);
      updated.bigBlindsPerHour = hours > 0 ? updated.bigBlindsWon / hours : 0;
      
      return updated;
    });
  }, [bigBlind, recordActivity]);

  // Update chip count (for tournaments)
  const updateChips = useCallback((chips: number) => {
    setMetrics(prev => ({
      ...prev,
      currentChips: chips,
      peakChips: Math.max(prev.peakChips || 0, chips)
    }));
  }, []);

  // End the session
  const endSession = useCallback((finalChips?: number) => {
    const endTime = Date.now();
    
    setMetrics(prev => {
      const final: SessionMetrics = {
        ...prev,
        endTime,
        durationMs: endTime - prev.startTime,
        cashOutTotal: finalChips ?? prev.currentChips ?? prev.cashOutTotal,
        netProfit: (finalChips ?? prev.currentChips ?? prev.cashOutTotal) - prev.buyInTotal,
        currentChips: finalChips ?? prev.currentChips
      };
      
      // Recalculate final BB metrics
      final.bigBlindsWon = final.netProfit / bigBlind;
      const hours = final.durationMs / (1000 * 60 * 60);
      final.bigBlindsPerHour = hours > 0 ? final.bigBlindsWon / hours : 0;
      
      // Save to history
      saveSessionToHistory(final);
      
      // Callback
      onSessionEnd?.(final);
      
      console.log('[SessionTracking] Session ended:', final);
      return final;
    });
  }, [bigBlind, onSessionEnd]);

  // Set tournament result
  const setTournamentResult = useCallback((position: number, prize: number) => {
    setMetrics(prev => ({
      ...prev,
      finishPosition: position,
      prizeWon: prize,
      cashOutTotal: prize,
      netProfit: prize - prev.buyInTotal
    }));
  }, []);

  // Save session to localStorage history
  const saveSessionToHistory = useCallback((session: SessionMetrics) => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      let history: SessionMetrics[] = stored ? JSON.parse(stored) : [];
      
      history.unshift(session);
      
      // Limit history size
      if (history.length > MAX_STORED_SESSIONS) {
        history = history.slice(0, MAX_STORED_SESSIONS);
      }
      
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(history));
    } catch (err) {
      console.error('[SessionTracking] Failed to save history:', err);
    }
  }, []);

  // Get session history
  const getSessionHistory = useCallback((): SessionMetrics[] => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Get aggregate stats from history
  const getAggregateStats = useCallback(() => {
    const history = getSessionHistory();
    
    if (history.length === 0) {
      return null;
    }
    
    const totals = history.reduce((acc, session) => ({
      totalSessions: acc.totalSessions + 1,
      totalHands: acc.totalHands + session.handsPlayed,
      totalWins: acc.totalWins + session.handsWon,
      totalProfit: acc.totalProfit + session.netProfit,
      totalDuration: acc.totalDuration + session.durationMs,
      biggestWin: Math.max(acc.biggestWin, session.biggestPotWon),
      biggestLoss: Math.max(acc.biggestLoss, session.biggestPotLost)
    }), {
      totalSessions: 0,
      totalHands: 0,
      totalWins: 0,
      totalProfit: 0,
      totalDuration: 0,
      biggestWin: 0,
      biggestLoss: 0
    });
    
    return {
      ...totals,
      winRate: totals.totalHands > 0 ? (totals.totalWins / totals.totalHands) * 100 : 0,
      avgSessionLength: totals.totalDuration / totals.totalSessions,
      profitPerSession: totals.totalProfit / totals.totalSessions,
      bbPer100: totals.totalHands > 0 ? (totals.totalProfit / bigBlind) / totals.totalHands * 100 : 0
    };
  }, [getSessionHistory, bigBlind]);

  // Update duration timer
  useEffect(() => {
    updateIntervalRef.current = setInterval(() => {
      setMetrics(prev => {
        const now = Date.now();
        const duration = now - prev.startTime;
        const timeSinceActivity = now - lastActivityRef.current;
        
        // Consider idle after 2 minutes of no activity
        const isCurrentlyActive = timeSinceActivity < 120000;
        
        return {
          ...prev,
          durationMs: duration,
          activeTimeMs: isCurrentlyActive ? prev.activeTimeMs + 1000 : prev.activeTimeMs,
          idleTimeMs: isCurrentlyActive ? prev.idleTimeMs : prev.idleTimeMs + 1000
        };
      });
    }, 1000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  // Handle page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsActive(false);
      } else {
        recordActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [recordActivity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Current session metrics
    metrics,
    isActive,
    events: eventsRef.current,
    
    // Actions
    recordEvent,
    recordActivity,
    updateChips,
    endSession,
    setTournamentResult,
    
    // History
    getSessionHistory,
    getAggregateStats,
    
    // Computed
    sessionDuration: metrics.durationMs,
    profitBB: metrics.bigBlindsWon,
    bbPerHour: metrics.bigBlindsPerHour
  };
}

export default useSessionTracking;
