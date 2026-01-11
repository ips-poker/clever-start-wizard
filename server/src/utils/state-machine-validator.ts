/**
 * Professional Poker State Machine Validator v1.0
 * PokerStars-level state validation with deterministic transitions
 * 
 * Ensures:
 * - No invalid state transitions
 * - Action validation before execution
 * - Race condition prevention
 * - Audit trail for all state changes
 */

import { logger } from './logger.js';

// ==========================================
// STATE DEFINITIONS
// ==========================================

export type TableState = 
  | 'idle'           // No hand, waiting for players
  | 'starting'       // Hand is being initialized
  | 'dealing'        // Cards being dealt
  | 'preflop'        // Preflop betting
  | 'flop_dealing'   // Dealing flop cards
  | 'flop'           // Flop betting
  | 'turn_dealing'   // Dealing turn card
  | 'turn'           // Turn betting
  | 'river_dealing'  // Dealing river card
  | 'river'          // River betting
  | 'showdown'       // Revealing cards
  | 'awarding'       // Distributing pot
  | 'completing'     // Hand completion
  | 'paused'         // Tournament break
  | 'error';         // Error state

export type PlayerActionState =
  | 'waiting'        // Not player's turn
  | 'action_pending' // Player must act
  | 'acted'          // Player has acted this round
  | 'folded'         // Player folded
  | 'all_in'         // Player all-in
  | 'sitting_out'    // Player sitting out
  | 'disconnected';  // Player disconnected

export interface StateTransition {
  from: TableState;
  to: TableState;
  trigger: string;
  timestamp: number;
  handId?: string;
  playerId?: string;
  metadata?: Record<string, unknown>;
}

// ==========================================
// VALID TRANSITION MAP
// ==========================================

const VALID_TRANSITIONS: Record<TableState, TableState[]> = {
  'idle': ['starting', 'paused'],
  'starting': ['dealing', 'idle', 'error'],
  'dealing': ['preflop', 'error', 'completing'], // completing if < 2 players
  'preflop': ['flop_dealing', 'showdown', 'awarding', 'completing', 'preflop'], // stay in preflop for next action
  'flop_dealing': ['flop', 'error'],
  'flop': ['turn_dealing', 'showdown', 'awarding', 'completing', 'flop'],
  'turn_dealing': ['turn', 'error'],
  'turn': ['river_dealing', 'showdown', 'awarding', 'completing', 'turn'],
  'river_dealing': ['river', 'error'],
  'river': ['showdown', 'awarding', 'completing', 'river'],
  'showdown': ['awarding', 'completing', 'error'],
  'awarding': ['completing', 'error'],
  'completing': ['idle', 'starting', 'paused'], // Can start new hand immediately
  'paused': ['idle', 'starting'],
  'error': ['idle', 'starting', 'paused']
};

// ==========================================
// STATE MACHINE VALIDATOR CLASS
// ==========================================

export class StateMachineValidator {
  private currentState: TableState = 'idle';
  private tableId: string;
  private transitionHistory: StateTransition[] = [];
  private readonly maxHistorySize = 100;
  private stateVersion: number = 0;
  private lastTransitionTime: number = Date.now();
  
  constructor(tableId: string, initialState: TableState = 'idle') {
    this.tableId = tableId;
    this.currentState = initialState;
  }
  
  /**
   * Get current state
   */
  getState(): TableState {
    return this.currentState;
  }
  
  /**
   * Get state version for optimistic concurrency control
   */
  getVersion(): number {
    return this.stateVersion;
  }
  
  /**
   * Check if transition is valid WITHOUT performing it
   */
  canTransition(to: TableState): boolean {
    const validTargets = VALID_TRANSITIONS[this.currentState];
    return validTargets?.includes(to) ?? false;
  }
  
  /**
   * Validate and execute state transition
   * Returns false if transition is invalid
   */
  transition(
    to: TableState, 
    trigger: string,
    handId?: string,
    playerId?: string,
    metadata?: Record<string, unknown>
  ): { success: boolean; error?: string; previousState?: TableState } {
    const previousState = this.currentState;
    
    // Check if transition is valid
    if (!this.canTransition(to)) {
      const error = `Invalid state transition: ${this.currentState} -> ${to} (trigger: ${trigger})`;
      logger.error('State machine validation failed', {
        tableId: this.tableId,
        from: this.currentState,
        to,
        trigger,
        validTransitions: VALID_TRANSITIONS[this.currentState]
      });
      
      return { success: false, error, previousState };
    }
    
    // Perform transition
    const transition: StateTransition = {
      from: this.currentState,
      to,
      trigger,
      timestamp: Date.now(),
      handId,
      playerId,
      metadata
    };
    
    this.currentState = to;
    this.stateVersion++;
    this.lastTransitionTime = Date.now();
    
    // Store in history
    this.transitionHistory.push(transition);
    if (this.transitionHistory.length > this.maxHistorySize) {
      this.transitionHistory.shift();
    }
    
    logger.info('State transition executed', {
      tableId: this.tableId,
      transition: `${previousState} -> ${to}`,
      trigger,
      version: this.stateVersion
    });
    
    return { success: true, previousState };
  }
  
  /**
   * Force state (for recovery only)
   */
  forceState(state: TableState, reason: string): void {
    logger.warn('Forcing state machine state', {
      tableId: this.tableId,
      from: this.currentState,
      to: state,
      reason
    });
    
    const transition: StateTransition = {
      from: this.currentState,
      to: state,
      trigger: `FORCED: ${reason}`,
      timestamp: Date.now()
    };
    
    this.currentState = state;
    this.stateVersion++;
    this.transitionHistory.push(transition);
  }
  
  /**
   * Get transition history for debugging
   */
  getHistory(): StateTransition[] {
    return [...this.transitionHistory];
  }
  
  /**
   * Check if currently in betting phase
   */
  isInBettingPhase(): boolean {
    return ['preflop', 'flop', 'turn', 'river'].includes(this.currentState);
  }
  
  /**
   * Check if hand is active
   */
  isHandActive(): boolean {
    return !['idle', 'paused', 'error', 'completing'].includes(this.currentState);
  }
  
  /**
   * Check for stuck state (no transition for too long)
   */
  isStuck(timeoutMs: number = 120000): boolean {
    if (!this.isHandActive()) return false;
    return (Date.now() - this.lastTransitionTime) > timeoutMs;
  }
  
  /**
   * Reset to idle state
   */
  reset(): void {
    this.currentState = 'idle';
    this.stateVersion++;
    this.transitionHistory = [];
    logger.info('State machine reset', { tableId: this.tableId });
  }
}

// ==========================================
// PLAYER STATE MACHINE
// ==========================================

export class PlayerStateMachine {
  private state: PlayerActionState = 'waiting';
  private playerId: string;
  private tableId: string;
  private actedInPhases: Set<string> = new Set();
  
  constructor(tableId: string, playerId: string, initialState: PlayerActionState = 'waiting') {
    this.tableId = tableId;
    this.playerId = playerId;
    this.state = initialState;
  }
  
  getState(): PlayerActionState {
    return this.state;
  }
  
  /**
   * Mark player as needing to act
   */
  setActionPending(): void {
    if (this.state === 'folded' || this.state === 'all_in') return;
    this.state = 'action_pending';
  }
  
  /**
   * Record player action
   */
  recordAction(actionType: string, phase: string): void {
    if (actionType === 'fold') {
      this.state = 'folded';
    } else if (actionType === 'allin') {
      this.state = 'all_in';
    } else {
      this.state = 'acted';
    }
    this.actedInPhases.add(phase);
  }
  
  /**
   * Check if player has acted in current phase
   */
  hasActedInPhase(phase: string): boolean {
    return this.actedInPhases.has(phase);
  }
  
  /**
   * Reset for new betting round
   */
  resetForNewRound(): void {
    if (this.state !== 'folded' && this.state !== 'all_in') {
      this.state = 'waiting';
    }
    this.actedInPhases.clear();
  }
  
  /**
   * Reset for new hand
   */
  resetForNewHand(): void {
    this.state = 'waiting';
    this.actedInPhases.clear();
  }
  
  /**
   * Can player act?
   */
  canAct(): boolean {
    return this.state === 'action_pending';
  }
  
  /**
   * Is player still in hand?
   */
  isInHand(): boolean {
    return this.state !== 'folded' && this.state !== 'sitting_out';
  }
}

// ==========================================
// ACTION VALIDATION
// ==========================================

export interface ActionValidationResult {
  valid: boolean;
  error?: string;
  adjustedAmount?: number;
}

export function validateAction(
  actionType: string,
  amount: number | undefined,
  playerStack: number,
  playerCurrentBet: number,
  tableCurrentBet: number,
  minRaise: number,
  bigBlind: number,
  phase: string
): ActionValidationResult {
  const toCall = Math.max(0, tableCurrentBet - playerCurrentBet);
  
  switch (actionType.toLowerCase()) {
    case 'fold':
      return { valid: true };
      
    case 'check':
      if (toCall > 0) {
        return { valid: false, error: `Cannot check - must call ${toCall}` };
      }
      return { valid: true };
      
    case 'call':
      if (toCall === 0) {
        return { valid: false, error: 'Nothing to call - use check' };
      }
      return { valid: true, adjustedAmount: Math.min(toCall, playerStack) };
      
    case 'bet':
      if (tableCurrentBet > 0) {
        return { valid: false, error: 'Cannot bet when there is a current bet - use raise' };
      }
      if (amount === undefined || amount < bigBlind) {
        return { valid: false, error: `Minimum bet is ${bigBlind}` };
      }
      if (amount > playerStack) {
        return { valid: true, adjustedAmount: playerStack }; // All-in
      }
      return { valid: true, adjustedAmount: amount };
      
    case 'raise':
      if (tableCurrentBet === 0) {
        return { valid: false, error: 'Cannot raise when there is no bet - use bet' };
      }
      const minRaiseTotal = tableCurrentBet + minRaise;
      if (amount === undefined) {
        return { valid: false, error: 'Raise amount required' };
      }
      if (amount < minRaiseTotal && amount < playerStack + playerCurrentBet) {
        return { valid: false, error: `Minimum raise to ${minRaiseTotal}` };
      }
      if (amount > playerStack + playerCurrentBet) {
        return { valid: true, adjustedAmount: playerStack + playerCurrentBet }; // All-in
      }
      return { valid: true, adjustedAmount: amount };
      
    case 'allin':
      return { valid: true, adjustedAmount: playerStack + playerCurrentBet };
      
    default:
      return { valid: false, error: `Unknown action: ${actionType}` };
  }
}

// ==========================================
// EXPORTS
// ==========================================

export const stateMachineValidators = new Map<string, StateMachineValidator>();

export function getOrCreateValidator(tableId: string): StateMachineValidator {
  let validator = stateMachineValidators.get(tableId);
  if (!validator) {
    validator = new StateMachineValidator(tableId);
    stateMachineValidators.set(tableId, validator);
  }
  return validator;
}

export function removeValidator(tableId: string): void {
  stateMachineValidators.delete(tableId);
}
