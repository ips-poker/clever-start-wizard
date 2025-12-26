/**
 * Action Validator
 * Validates all player actions before processing
 * Prevents invalid actions and cheating attempts
 */

import { logger } from './logger.js';

export interface ValidationContext {
  playerId: string;
  tableId: string;
  currentBet: number;
  minRaise: number;
  potSize: number;
  playerStack: number;
  playerBet: number;
  isPlayerTurn: boolean;
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  bigBlind: number;
  activePlayers: number;
  allInPlayers: number;
}

export interface ActionValidation {
  valid: boolean;
  error?: string;
  adjustedAmount?: number;
  warnings?: string[];
}

export type PokerAction = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in';

class ActionValidator {
  /**
   * Validate a player action
   */
  validate(
    action: PokerAction,
    amount: number | undefined,
    context: ValidationContext
  ): ActionValidation {
    const warnings: string[] = [];

    // 1. Basic turn check
    if (!context.isPlayerTurn) {
      return { valid: false, error: 'Not your turn' };
    }

    // 2. Validate action type and amount
    switch (action) {
      case 'fold':
        return this.validateFold(context);
        
      case 'check':
        return this.validateCheck(context);
        
      case 'call':
        return this.validateCall(context, warnings);
        
      case 'bet':
        return this.validateBet(amount, context, warnings);
        
      case 'raise':
        return this.validateRaise(amount, context, warnings);
        
      case 'all_in':
        return this.validateAllIn(context, warnings);
        
      default:
        return { valid: false, error: `Unknown action: ${action}` };
    }
  }

  private validateFold(context: ValidationContext): ActionValidation {
    // Folding is always valid when it's your turn
    // But warn if player can check for free
    if (context.currentBet === context.playerBet) {
      return { 
        valid: true, 
        warnings: ['You can check for free instead of folding']
      };
    }
    return { valid: true };
  }

  private validateCheck(context: ValidationContext): ActionValidation {
    // Can only check if no bet to call
    if (context.currentBet > context.playerBet) {
      const toCall = context.currentBet - context.playerBet;
      return { 
        valid: false, 
        error: `Cannot check, must call ${toCall} or fold`
      };
    }
    return { valid: true };
  }

  private validateCall(context: ValidationContext, warnings: string[]): ActionValidation {
    const toCall = context.currentBet - context.playerBet;
    
    // Nothing to call
    if (toCall <= 0) {
      return { valid: false, error: 'Nothing to call, use check instead' };
    }

    // All-in call
    if (toCall >= context.playerStack) {
      warnings.push('Call requires all-in');
      return { 
        valid: true, 
        adjustedAmount: context.playerStack,
        warnings 
      };
    }

    return { valid: true, adjustedAmount: toCall, warnings };
  }

  private validateBet(
    amount: number | undefined,
    context: ValidationContext,
    warnings: string[]
  ): ActionValidation {
    // Can't bet if there's already a bet
    if (context.currentBet > 0) {
      return { valid: false, error: 'Cannot bet, there is already a bet. Use raise instead' };
    }

    if (amount === undefined || amount <= 0) {
      return { valid: false, error: 'Bet amount required' };
    }

    // Minimum bet is big blind
    const minBet = context.bigBlind;
    if (amount < minBet && amount < context.playerStack) {
      return { valid: false, error: `Minimum bet is ${minBet}` };
    }

    // All-in bet
    if (amount >= context.playerStack) {
      warnings.push('Betting all-in');
      return { 
        valid: true, 
        adjustedAmount: context.playerStack,
        warnings 
      };
    }

    return { valid: true, adjustedAmount: amount, warnings };
  }

  private validateRaise(
    amount: number | undefined,
    context: ValidationContext,
    warnings: string[]
  ): ActionValidation {
    // Must have a bet to raise
    if (context.currentBet === 0) {
      return { valid: false, error: 'Nothing to raise, use bet instead' };
    }

    if (amount === undefined || amount <= 0) {
      return { valid: false, error: 'Raise amount required' };
    }

    const toCall = context.currentBet - context.playerBet;
    const totalRaise = amount; // Amount is total raise TO
    const raiseAmount = totalRaise - context.currentBet;
    
    // Validate minimum raise
    if (raiseAmount < context.minRaise && totalRaise < context.playerStack + context.playerBet) {
      // Allow all-in even if less than min raise
      if (totalRaise < context.playerStack + context.playerBet) {
        return { 
          valid: false, 
          error: `Minimum raise is ${context.minRaise}. Raise TO at least ${context.currentBet + context.minRaise}`
        };
      }
    }

    // Calculate actual amount needed from player
    const amountNeeded = totalRaise - context.playerBet;

    // All-in raise
    if (amountNeeded >= context.playerStack) {
      warnings.push('Raising all-in');
      return { 
        valid: true, 
        adjustedAmount: context.playerStack,
        warnings 
      };
    }

    return { valid: true, adjustedAmount: amountNeeded, warnings };
  }

  private validateAllIn(context: ValidationContext, warnings: string[]): ActionValidation {
    if (context.playerStack <= 0) {
      return { valid: false, error: 'No chips to go all-in with' };
    }

    const toCall = context.currentBet - context.playerBet;
    
    if (context.playerStack <= toCall) {
      warnings.push('All-in as call');
    } else {
      warnings.push('All-in as raise');
    }

    return { valid: true, adjustedAmount: context.playerStack, warnings };
  }

  /**
   * Validate bet sizing for reasonable play (anti-bot check)
   */
  validateBetSizing(
    amount: number,
    context: ValidationContext
  ): { reasonable: boolean; reason?: string } {
    // Minimum pot bet
    const minPotBet = context.bigBlind;
    
    // Common suspicious patterns:
    
    // 1. Exact same bet every time (tracked externally)
    
    // 2. Bet less than 1% of pot (unless it's minimum)
    if (amount < context.potSize * 0.01 && amount > minPotBet) {
      return { reasonable: false, reason: 'Suspiciously small bet' };
    }

    // 3. Unusual precise amounts (like 1337, 6969)
    // This is mainly for detection, not blocking
    const suspiciousNumbers = [1337, 6969, 4200, 69, 420];
    if (suspiciousNumbers.includes(amount)) {
      logger.debug('Unusual bet amount detected', { amount, playerId: context.playerId });
    }

    return { reasonable: true };
  }

  /**
   * Validate action timing
   */
  validateTiming(
    actionTimeMs: number,
    timeLimit: number
  ): { valid: boolean; usedTimeBank: boolean; timeUsed: number } {
    const timeLimitMs = timeLimit * 1000;
    
    if (actionTimeMs > timeLimitMs * 2) {
      // Exceeded even with time bank
      return { valid: false, usedTimeBank: true, timeUsed: actionTimeMs };
    }

    if (actionTimeMs > timeLimitMs) {
      return { valid: true, usedTimeBank: true, timeUsed: actionTimeMs };
    }

    return { valid: true, usedTimeBank: false, timeUsed: actionTimeMs };
  }

  /**
   * Validate state consistency
   */
  validateStateConsistency(
    playerId: string,
    tableId: string,
    expectedPhase: string,
    actualPhase: string,
    expectedPot: number,
    actualPot: number
  ): { consistent: boolean; errors: string[] } {
    const errors: string[] = [];

    if (expectedPhase !== actualPhase) {
      errors.push(`Phase mismatch: expected ${expectedPhase}, got ${actualPhase}`);
    }

    // Allow small rounding errors in pot
    if (Math.abs(expectedPot - actualPot) > 1) {
      errors.push(`Pot mismatch: expected ${expectedPot}, got ${actualPot}`);
    }

    if (errors.length > 0) {
      logger.warn('State consistency error', { playerId, tableId, errors });
    }

    return { consistent: errors.length === 0, errors };
  }
}

// Singleton instance
export const actionValidator = new ActionValidator();

// Utility function for quick validation
export function validatePokerAction(
  action: PokerAction,
  amount: number | undefined,
  context: ValidationContext
): ActionValidation {
  return actionValidator.validate(action, amount, context);
}
