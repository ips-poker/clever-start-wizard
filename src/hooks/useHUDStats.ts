/**
 * Real-time HUD Stats Hook
 * 7.1 - Provides live player statistics (VPIP, PFR, AF, 3-Bet, etc.)
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface PlayerStats {
  playerId: string;
  playerName: string;
  
  // Basic stats
  handsPlayed: number;
  handsWon: number;
  winRate: number;
  
  // Preflop stats
  vpip: number;           // Voluntarily Put $ In Pot (%)
  pfr: number;            // Pre-Flop Raise (%)
  threeBet: number;       // 3-Bet (%)
  foldTo3Bet: number;     // Fold to 3-Bet (%)
  
  // Postflop stats
  af: number;             // Aggression Factor (bet+raise / call)
  afq: number;            // Aggression Frequency (%)
  cbet: number;           // Continuation Bet (%)
  foldToCbet: number;     // Fold to C-Bet (%)
  
  // Showdown stats
  wtsd: number;           // Went To Showdown (%)
  wsd: number;            // Won at Showdown (%)
  wwsf: number;           // Won When Saw Flop (%)
  
  // Position stats
  attemptToSteal: number;  // Attempt to steal (%)
  foldBBtoSteal: number;   // Fold BB to steal (%)
  foldSBtoSteal: number;   // Fold SB to steal (%)
  
  // All-in stats
  allInEV: number;        // All-in Expected Value
  allInAdjustedWinnings: number;
  
  // Session info
  sessionStartTime: number;
  bigBlindsWon: number;
  bigBlindsPerHour: number;
}

interface HandAction {
  playerId: string;
  phase: 'preflop' | 'flop' | 'turn' | 'river';
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';
  amount?: number;
  isVoluntary?: boolean;
  is3Bet?: boolean;
  isCbet?: boolean;
  isStealAttempt?: boolean;
}

interface HandResult {
  handId: string;
  winners: string[];
  pot: number;
  wentToShowdown: boolean;
  sawFlop: string[];
  communityCards: string[];
  playerCards: Record<string, string[]>;
}

interface UseHUDStatsOptions {
  tableId: string;
  playerId: string;
  bigBlind: number;
  onStatsUpdate?: (stats: Map<string, PlayerStats>) => void;
}

// Initialize empty stats
const createEmptyStats = (playerId: string, playerName: string): PlayerStats => ({
  playerId,
  playerName,
  handsPlayed: 0,
  handsWon: 0,
  winRate: 0,
  vpip: 0,
  pfr: 0,
  threeBet: 0,
  foldTo3Bet: 0,
  af: 0,
  afq: 0,
  cbet: 0,
  foldToCbet: 0,
  wtsd: 0,
  wsd: 0,
  wwsf: 0,
  attemptToSteal: 0,
  foldBBtoSteal: 0,
  foldSBtoSteal: 0,
  allInEV: 0,
  allInAdjustedWinnings: 0,
  sessionStartTime: Date.now(),
  bigBlindsWon: 0,
  bigBlindsPerHour: 0
});

export function useHUDStats(options: UseHUDStatsOptions) {
  const { tableId, playerId, bigBlind, onStatsUpdate } = options;

  // Stats for all players at table
  const [playerStats, setPlayerStats] = useState<Map<string, PlayerStats>>(new Map());
  
  // Raw action tracking for calculations
  const actionsRef = useRef<Map<string, {
    preflopActions: HandAction[];
    postflopActions: HandAction[];
    handsPlayed: number;
    handsWon: number;
    vpipHands: number;
    pfrHands: number;
    threeBetHands: number;
    threeBetOpportunities: number;
    foldTo3BetCount: number;
    threeBetFacedCount: number;
    cbetCount: number;
    cbetOpportunities: number;
    foldToCbetCount: number;
    facedCbetCount: number;
    betsAndRaises: number;
    calls: number;
    showdownCount: number;
    showdownWins: number;
    sawFlopCount: number;
    wwsfCount: number;
    stealAttempts: number;
    stealOpportunities: number;
    bbStealsfaced: number;
    bbStealsFolded: number;
    sbStealsLaced: number;
    sbStealsFolded: number;
    totalWinnings: number;
  }>>(new Map());

  const sessionStartRef = useRef(Date.now());
  const currentHandRef = useRef<string | null>(null);
  const currentHandActionsRef = useRef<HandAction[]>([]);

  // Record an action
  const recordAction = useCallback((action: HandAction) => {
    const { playerId: pid, phase, action: actionType } = action;
    
    // Initialize player data if needed
    if (!actionsRef.current.has(pid)) {
      actionsRef.current.set(pid, {
        preflopActions: [],
        postflopActions: [],
        handsPlayed: 0,
        handsWon: 0,
        vpipHands: 0,
        pfrHands: 0,
        threeBetHands: 0,
        threeBetOpportunities: 0,
        foldTo3BetCount: 0,
        threeBetFacedCount: 0,
        cbetCount: 0,
        cbetOpportunities: 0,
        foldToCbetCount: 0,
        facedCbetCount: 0,
        betsAndRaises: 0,
        calls: 0,
        showdownCount: 0,
        showdownWins: 0,
        sawFlopCount: 0,
        wwsfCount: 0,
        stealAttempts: 0,
        stealOpportunities: 0,
        bbStealsface: 0,
        bbStealsFolded: 0,
        sbStealsFaced: 0,
        sbStealsFolded: 0,
        totalWinnings: 0
      } as any);
    }

    const data = actionsRef.current.get(pid)!;
    
    // Track preflop/postflop actions
    if (phase === 'preflop') {
      data.preflopActions.push(action);
      
      // VPIP: call, bet, raise, or allin (voluntary)
      if (['call', 'bet', 'raise', 'allin'].includes(actionType) && action.isVoluntary !== false) {
        // Will be counted per hand
      }
      
      // PFR: raise or bet preflop
      if (['raise', 'bet'].includes(actionType)) {
        // Will be counted per hand
      }
      
      // 3-Bet tracking
      if (action.is3Bet) {
        data.threeBetHands++;
      }
      
      // Steal attempt
      if (action.isStealAttempt) {
        data.stealAttempts++;
      }
    } else {
      data.postflopActions.push(action);
      
      // C-bet tracking
      if (action.isCbet) {
        data.cbetCount++;
      }
    }
    
    // Aggression tracking
    if (['bet', 'raise'].includes(actionType)) {
      data.betsAndRaises++;
    } else if (actionType === 'call') {
      data.calls++;
    }

    currentHandActionsRef.current.push(action);
    
    console.log('[HUD] Action recorded:', action);
  }, []);

  // Start a new hand
  const startNewHand = useCallback((handId: string, playerIds: string[], playerNames: Record<string, string>) => {
    currentHandRef.current = handId;
    currentHandActionsRef.current = [];
    
    // Initialize stats for new players
    playerIds.forEach(pid => {
      if (!playerStats.has(pid)) {
        const name = playerNames[pid] || 'Player';
        setPlayerStats(prev => {
          const next = new Map(prev);
          next.set(pid, createEmptyStats(pid, name));
          return next;
        });
      }
    });
    
    console.log('[HUD] New hand started:', handId);
  }, [playerStats]);

  // Complete a hand and calculate stats
  const completeHand = useCallback((result: HandResult) => {
    const { winners, pot, wentToShowdown, sawFlop } = result;
    
    // Update stats for each player involved in the hand
    actionsRef.current.forEach((data, pid) => {
      // Check if player participated in this hand
      const playerActions = currentHandActionsRef.current.filter(a => a.playerId === pid);
      if (playerActions.length === 0) return;
      
      data.handsPlayed++;
      
      // Check if won
      if (winners.includes(pid)) {
        data.handsWon++;
        data.totalWinnings += pot / winners.length;
      }
      
      // VPIP check
      const hadVoluntaryAction = playerActions.some(a => 
        a.phase === 'preflop' && 
        ['call', 'bet', 'raise', 'allin'].includes(a.action) &&
        a.isVoluntary !== false
      );
      if (hadVoluntaryAction) {
        data.vpipHands++;
      }
      
      // PFR check
      const hadPreflopRaise = playerActions.some(a => 
        a.phase === 'preflop' && 
        ['raise', 'bet'].includes(a.action)
      );
      if (hadPreflopRaise) {
        data.pfrHands++;
      }
      
      // Showdown stats
      if (wentToShowdown && sawFlop.includes(pid)) {
        data.showdownCount++;
        if (winners.includes(pid)) {
          data.showdownWins++;
        }
      }
      
      // Saw flop stats
      if (sawFlop.includes(pid)) {
        data.sawFlopCount++;
        if (winners.includes(pid)) {
          data.wwsfCount++;
        }
      }
    });
    
    // Recalculate all player stats
    recalculateStats();
    
    console.log('[HUD] Hand completed:', result);
  }, []);

  // Recalculate derived stats
  const recalculateStats = useCallback(() => {
    const newStats = new Map<string, PlayerStats>();
    const sessionHours = (Date.now() - sessionStartRef.current) / (1000 * 60 * 60);
    
    actionsRef.current.forEach((data, pid) => {
      const existing = playerStats.get(pid) || createEmptyStats(pid, 'Player');
      
      const hands = data.handsPlayed || 1;
      
      // Calculate percentages
      const vpip = (data.vpipHands / hands) * 100;
      const pfr = (data.pfrHands / hands) * 100;
      const threeBet = data.threeBetOpportunities > 0 
        ? (data.threeBetHands / data.threeBetOpportunities) * 100 
        : 0;
      const foldTo3Bet = data.threeBetFacedCount > 0
        ? (data.foldTo3BetCount / data.threeBetFacedCount) * 100
        : 0;
      
      // Aggression
      const af = data.calls > 0 ? data.betsAndRaises / data.calls : data.betsAndRaises;
      const totalPostflopActions = data.betsAndRaises + data.calls;
      const afq = totalPostflopActions > 0 
        ? (data.betsAndRaises / totalPostflopActions) * 100 
        : 0;
      
      // C-bet
      const cbet = data.cbetOpportunities > 0 
        ? (data.cbetCount / data.cbetOpportunities) * 100 
        : 0;
      const foldToCbet = data.facedCbetCount > 0
        ? (data.foldToCbetCount / data.facedCbetCount) * 100
        : 0;
      
      // Showdown
      const wtsd = data.sawFlopCount > 0 
        ? (data.showdownCount / data.sawFlopCount) * 100 
        : 0;
      const wsd = data.showdownCount > 0 
        ? (data.showdownWins / data.showdownCount) * 100 
        : 0;
      const wwsf = data.sawFlopCount > 0 
        ? (data.wwsfCount / data.sawFlopCount) * 100 
        : 0;
      
      // Steal stats
      const attemptToSteal = data.stealOpportunities > 0
        ? (data.stealAttempts / data.stealOpportunities) * 100
        : 0;
      
      // BB/hour
      const bbWon = data.totalWinnings / bigBlind;
      const bbPerHour = sessionHours > 0 ? bbWon / sessionHours : 0;
      
      newStats.set(pid, {
        ...existing,
        handsPlayed: data.handsPlayed,
        handsWon: data.handsWon,
        winRate: hands > 0 ? (data.handsWon / hands) * 100 : 0,
        vpip: Math.round(vpip * 10) / 10,
        pfr: Math.round(pfr * 10) / 10,
        threeBet: Math.round(threeBet * 10) / 10,
        foldTo3Bet: Math.round(foldTo3Bet * 10) / 10,
        af: Math.round(af * 100) / 100,
        afq: Math.round(afq * 10) / 10,
        cbet: Math.round(cbet * 10) / 10,
        foldToCbet: Math.round(foldToCbet * 10) / 10,
        wtsd: Math.round(wtsd * 10) / 10,
        wsd: Math.round(wsd * 10) / 10,
        wwsf: Math.round(wwsf * 10) / 10,
        attemptToSteal: Math.round(attemptToSteal * 10) / 10,
        bigBlindsWon: Math.round(bbWon * 100) / 100,
        bigBlindsPerHour: Math.round(bbPerHour * 100) / 100
      });
    });
    
    setPlayerStats(newStats);
    onStatsUpdate?.(newStats);
  }, [playerStats, bigBlind, onStatsUpdate]);

  // Get stats for specific player
  const getPlayerStats = useCallback((pid: string): PlayerStats | null => {
    return playerStats.get(pid) || null;
  }, [playerStats]);

  // Get my stats
  const myStats = useMemo(() => {
    return playerStats.get(playerId) || null;
  }, [playerStats, playerId]);

  // Reset all stats
  const resetStats = useCallback(() => {
    actionsRef.current.clear();
    setPlayerStats(new Map());
    sessionStartRef.current = Date.now();
    console.log('[HUD] Stats reset');
  }, []);

  return {
    // Stats
    playerStats,
    myStats,
    getPlayerStats,
    
    // Actions
    recordAction,
    startNewHand,
    completeHand,
    resetStats,
    
    // Session info
    sessionDuration: Date.now() - sessionStartRef.current
  };
}

export default useHUDStats;
