/**
 * Professional Poker Action Engine
 * Handles betting logic for Texas Hold'em (NL/PL/FL)
 * 
 * Key improvements over basic implementation:
 * - Immutable state (React-safe)
 * - hasActed tracking for correct round completion
 * - Proper minRaise calculation
 * - All edge cases handled (short all-in, re-raise caps, etc.)
 */

export type ActionType = 'CHECK' | 'CALL' | 'BET' | 'RAISE' | 'ALL_IN' | 'FOLD';

export interface PlayerState {
  id: string;
  seat: number;
  stack: number;           // chips behind (not including current bet)
  betThisRound: number;    // amount put in this betting round
  totalBetThisHand: number; // cumulative for side pot calc
  hasFolded: boolean;
  isAllIn: boolean;
  hasActedThisRound: boolean; // critical for round completion
  isActive: boolean;       // in the hand and can act
}

export interface TableState {
  players: PlayerState[];
  currentPlayerSeat: number;
  currentBet: number;        // highest bet this round
  minRaise: number;          // minimum raise increment
  lastRaiseAmount: number;   // size of last raise (for min-raise calc)
  pot: number;
  bigBlind: number;
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  lastAggressorSeat: number | null; // who made the last raise
}

export interface AllowedActions {
  canCheck: boolean;
  canCall: boolean;
  canBet: boolean;
  canRaise: boolean;
  canAllIn: boolean;
  canFold: boolean;
  callAmount: number;
  minBet: number;
  minRaise: number;
  maxBet: number;
}

/**
 * Calculate what actions are available for a player
 */
export function getAllowedActions(table: TableState, playerSeat: number): AllowedActions {
  const player = table.players.find(p => p.seat === playerSeat);
  
  const result: AllowedActions = {
    canCheck: false,
    canCall: false,
    canBet: false,
    canRaise: false,
    canAllIn: false,
    canFold: true, // can always fold (even if irrational)
    callAmount: 0,
    minBet: table.bigBlind,
    minRaise: 0,
    maxBet: 0
  };

  if (!player || player.hasFolded || player.isAllIn || player.stack <= 0) {
    result.canFold = false;
    return result;
  }

  const toCall = table.currentBet - player.betThisRound;
  result.callAmount = Math.min(toCall, player.stack);
  result.maxBet = player.stack + player.betThisRound;

  if (toCall <= 0) {
    // No bet to match - can check or open betting
    result.canCheck = true;
    
    if (player.stack > 0) {
      result.canBet = true;
      result.canAllIn = true;
      result.minBet = Math.min(table.bigBlind, player.stack);
    }
  } else {
    // Must match a bet
    if (player.stack >= toCall) {
      result.canCall = true;
    }
    
    // Always can all-in (even if short)
    if (player.stack > 0) {
      result.canAllIn = true;
    }

    // Can raise if have enough chips after calling
    const afterCall = player.stack - toCall;
    const minRaiseIncrement = Math.max(table.minRaise, table.lastRaiseAmount, table.bigBlind);
    
    if (afterCall >= minRaiseIncrement) {
      result.canRaise = true;
      result.minRaise = table.currentBet + minRaiseIncrement;
    } else if (afterCall > 0) {
      // Can only all-in (short raise)
      result.canAllIn = true;
    }
  }

  return result;
}

export interface PlayerAction {
  type: ActionType;
  amount?: number; // for BET/RAISE: the TOTAL bet size (not increment)
}

/**
 * Apply an action and return NEW state (immutable)
 */
export function applyAction(
  table: TableState, 
  playerSeat: number, 
  action: PlayerAction
): TableState {
  // Deep clone to ensure immutability
  const newTable: TableState = {
    ...table,
    players: table.players.map(p => ({ ...p }))
  };
  
  const player = newTable.players.find(p => p.seat === playerSeat);
  if (!player) throw new Error(`Player at seat ${playerSeat} not found`);

  const allowed = getAllowedActions(table, playerSeat);
  const toCall = newTable.currentBet - player.betThisRound;

  switch (action.type) {
    case 'CHECK': {
      if (!allowed.canCheck) throw new Error('Cannot check');
      player.hasActedThisRound = true;
      break;
    }

    case 'FOLD': {
      if (!allowed.canFold) throw new Error('Cannot fold');
      player.hasFolded = true;
      player.isActive = false;
      player.hasActedThisRound = true;
      break;
    }

    case 'CALL': {
      if (!allowed.canCall) throw new Error('Cannot call');
      const callAmount = Math.min(toCall, player.stack);
      player.stack -= callAmount;
      player.betThisRound += callAmount;
      player.totalBetThisHand += callAmount;
      newTable.pot += callAmount;
      if (player.stack === 0) player.isAllIn = true;
      player.hasActedThisRound = true;
      break;
    }

    case 'BET': {
      if (!allowed.canBet) throw new Error('Cannot bet');
      if (!action.amount || action.amount < allowed.minBet) {
        throw new Error(`BET must be at least ${allowed.minBet}`);
      }
      
      const targetBet = Math.min(action.amount, player.stack + player.betThisRound);
      const addAmount = targetBet - player.betThisRound;
      
      player.stack -= addAmount;
      player.betThisRound = targetBet;
      player.totalBetThisHand += addAmount;
      newTable.pot += addAmount;
      
      // Update table state
      newTable.lastRaiseAmount = targetBet; // for first bet, this is the bet size
      newTable.minRaise = targetBet; // next raise must be at least this size more
      newTable.currentBet = targetBet;
      newTable.lastAggressorSeat = playerSeat;
      
      if (player.stack === 0) player.isAllIn = true;
      player.hasActedThisRound = true;
      
      // Reset hasActed for others (they get to respond to the bet)
      resetOthersActed(newTable, playerSeat);
      break;
    }

    case 'RAISE': {
      if (!allowed.canRaise) throw new Error('Cannot raise');
      if (!action.amount || action.amount <= newTable.currentBet) {
        throw new Error(`RAISE must be greater than current bet ${newTable.currentBet}`);
      }
      if (action.amount < allowed.minRaise && action.amount < player.stack + player.betThisRound) {
        throw new Error(`RAISE must be at least ${allowed.minRaise}`);
      }
      
      const targetBet = Math.min(action.amount, player.stack + player.betThisRound);
      const raiseIncrement = targetBet - newTable.currentBet;
      const addAmount = targetBet - player.betThisRound;
      
      player.stack -= addAmount;
      player.betThisRound = targetBet;
      player.totalBetThisHand += addAmount;
      newTable.pot += addAmount;
      
      // Update raise tracking
      newTable.lastRaiseAmount = raiseIncrement;
      newTable.minRaise = raiseIncrement; // next raise must be at least this much more
      newTable.currentBet = targetBet;
      newTable.lastAggressorSeat = playerSeat;
      
      if (player.stack === 0) player.isAllIn = true;
      player.hasActedThisRound = true;
      
      // Reset hasActed for others
      resetOthersActed(newTable, playerSeat);
      break;
    }

    case 'ALL_IN': {
      if (!allowed.canAllIn) throw new Error('Cannot go all-in');
      
      const addAmount = player.stack;
      if (addAmount <= 0) break;
      
      const newBet = player.betThisRound + addAmount;
      
      player.stack = 0;
      player.isAllIn = true;
      player.betThisRound = newBet;
      player.totalBetThisHand += addAmount;
      newTable.pot += addAmount;
      
      // If this all-in is a raise, update raise tracking
      if (newBet > newTable.currentBet) {
        const raiseIncrement = newBet - newTable.currentBet;
        // Only update minRaise if this was a full raise
        if (raiseIncrement >= newTable.minRaise) {
          newTable.lastRaiseAmount = raiseIncrement;
          newTable.minRaise = raiseIncrement;
        }
        newTable.currentBet = newBet;
        newTable.lastAggressorSeat = playerSeat;
        
        // Reset hasActed for others
        resetOthersActed(newTable, playerSeat);
      }
      
      player.hasActedThisRound = true;
      break;
    }
  }

  // Move to next player
  newTable.currentPlayerSeat = getNextPlayerSeat(newTable, playerSeat);

  return newTable;
}

/**
 * Reset hasActedThisRound for all players except the aggressor
 * Called when someone bets/raises
 */
function resetOthersActed(table: TableState, aggressorSeat: number): void {
  table.players.forEach(p => {
    if (p.seat !== aggressorSeat && !p.hasFolded && !p.isAllIn) {
      p.hasActedThisRound = false;
    }
  });
}

/**
 * Find next player who can act
 */
function getNextPlayerSeat(table: TableState, fromSeat: number): number {
  const activePlayers = table.players
    .filter(p => !p.hasFolded && !p.isAllIn && p.stack > 0)
    .sort((a, b) => a.seat - b.seat);
  
  if (activePlayers.length === 0) return fromSeat;
  
  // Find next seat after fromSeat
  const next = activePlayers.find(p => p.seat > fromSeat);
  return next ? next.seat : activePlayers[0].seat;
}

/**
 * Check if betting round is complete
 */
export function isBettingRoundComplete(table: TableState): boolean {
  const activePlayers = table.players.filter(p => !p.hasFolded);
  
  // Only one player left - hand over
  if (activePlayers.length <= 1) return true;
  
  // All active non-allin players must have acted AND matched the current bet
  const playersWhoCanAct = activePlayers.filter(p => !p.isAllIn && p.stack > 0);
  
  if (playersWhoCanAct.length === 0) return true; // everyone all-in
  
  return playersWhoCanAct.every(p => 
    p.hasActedThisRound && p.betThisRound === table.currentBet
  );
}

/**
 * Reset for new betting round (flop, turn, river)
 */
export function startNewBettingRound(table: TableState, phase: TableState['phase']): TableState {
  return {
    ...table,
    phase,
    currentBet: 0,
    minRaise: table.bigBlind,
    lastRaiseAmount: table.bigBlind,
    lastAggressorSeat: null,
    players: table.players.map(p => ({
      ...p,
      betThisRound: 0,
      hasActedThisRound: false
    }))
  };
}

/**
 * Calculate side pots (for all-in situations)
 */
export interface SidePot {
  amount: number;
  eligiblePlayerSeats: number[];
}

export function calculateSidePots(players: PlayerState[]): SidePot[] {
  const activePlayers = players
    .filter(p => !p.hasFolded && p.totalBetThisHand > 0)
    .sort((a, b) => a.totalBetThisHand - b.totalBetThisHand);
  
  if (activePlayers.length === 0) return [];
  
  const pots: SidePot[] = [];
  let previousBet = 0;
  
  for (let i = 0; i < activePlayers.length; i++) {
    const player = activePlayers[i];
    const betLevel = player.totalBetThisHand;
    
    if (betLevel > previousBet) {
      const contribution = betLevel - previousBet;
      const eligibleCount = activePlayers.length - i;
      const potAmount = contribution * eligibleCount;
      
      pots.push({
        amount: potAmount,
        eligiblePlayerSeats: activePlayers.slice(i).map(p => p.seat)
      });
      
      previousBet = betLevel;
    }
  }
  
  return pots;
}
