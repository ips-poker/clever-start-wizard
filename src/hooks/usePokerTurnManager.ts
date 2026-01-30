/**
 * POKERSTARS-STYLE TURN MANAGER
 * 
 * Professional, clean implementation:
 * - Instant isMyTurn calculation
 * - Clean state transitions
 * - No race conditions
 */
import { useMemo, useRef, useEffect, useCallback } from 'react';

interface TurnManagerConfig {
  /** Table state from WebSocket */
  tableState: {
    currentPlayerSeat: number | null;
    phase: string;
    handId?: string | null;
    isTimeBankPhase?: boolean;
    currentBet?: number;
    pot?: number;
    players?: Array<{
      playerId: string;
      seatNumber: number;
      betAmount: number;
      stack: number;
      isFolded: boolean;
      isAllIn: boolean;
    }>;
  } | null;
  /** Current player's seat */
  mySeat: number | null;
  /** Current player's ID */
  playerId: string;
}

interface TurnManagerResult {
  /** Is it my turn to act? */
  isMyTurn: boolean;
  /** Can I check (no additional bet required)? */
  canCheck: boolean;
  /** Amount needed to call */
  callAmount: number;
  /** My current player data */
  myPlayer: TurnManagerConfig['tableState'] extends { players: (infer P)[] } ? P : null;
  /** Minimum raise amount */
  minRaise: number;
  /** Maximum raise amount (all-in) */
  maxRaise: number;
  /** Current bet on the table */
  currentBet: number;
  /** Current pot size */
  pot: number;
}

/**
 * Professional turn manager - PokerStars standard
 * 
 * Provides instant, accurate turn information without race conditions.
 */
export function usePokerTurnManager(config: TurnManagerConfig): TurnManagerResult {
  const { tableState, mySeat, playerId } = config;

  // Find my player from table state
  const myPlayer = useMemo(() => {
    if (!tableState?.players || !playerId) return null;
    return tableState.players.find(p => p.playerId === playerId) || null;
  }, [tableState?.players, playerId]);

  // Effective seat (use mySeat or find from players)
  const effectiveSeat = useMemo(() => {
    if (mySeat !== null) return mySeat;
    return myPlayer?.seatNumber ?? null;
  }, [mySeat, myPlayer]);

  // Is it my turn? Simple, clean check
  const isMyTurn = useMemo(() => {
    if (!tableState) return false;
    if (effectiveSeat === null) return false;
    if (tableState.currentPlayerSeat === null || tableState.currentPlayerSeat === undefined) return false;
    
    // Active phases only
    const activePhases = ['preflop', 'flop', 'turn', 'river'];
    if (!activePhases.includes(tableState.phase)) return false;
    
    return tableState.currentPlayerSeat === effectiveSeat;
  }, [tableState, effectiveSeat]);

  // Current bet from table
  const currentBet = useMemo(() => {
    return tableState?.currentBet ?? 0;
  }, [tableState?.currentBet]);

  // Pot size
  const pot = useMemo(() => {
    return tableState?.pot ?? 0;
  }, [tableState?.pot]);

  // Call amount (how much more to match current bet)
  const callAmount = useMemo(() => {
    if (!myPlayer) return 0;
    return Math.max(0, currentBet - myPlayer.betAmount);
  }, [currentBet, myPlayer]);

  // Can check? (already matched current bet)
  const canCheck = useMemo(() => {
    return callAmount === 0;
  }, [callAmount]);

  // Min raise (current bet + BB, or 2x current bet in practice)
  const minRaise = useMemo(() => {
    if (!myPlayer) return currentBet * 2 || 1;
    
    // Minimum raise is typically current bet + last raise amount
    // Simplified: 2x current bet or current bet + BB
    const minRaiseTotal = Math.max(currentBet * 2, currentBet + 1);
    return Math.min(minRaiseTotal, myPlayer.stack + myPlayer.betAmount);
  }, [currentBet, myPlayer]);

  // Max raise (all-in)
  const maxRaise = useMemo(() => {
    if (!myPlayer) return 0;
    return myPlayer.stack + myPlayer.betAmount;
  }, [myPlayer]);

  return {
    isMyTurn,
    canCheck,
    callAmount,
    myPlayer: myPlayer as any,
    minRaise,
    maxRaise,
    currentBet,
    pot,
  };
}

export default usePokerTurnManager;
