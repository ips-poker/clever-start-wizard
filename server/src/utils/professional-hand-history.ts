/**
 * Professional Hand History Service v1.0
 * PokerStars-compatible hand history generation
 * 
 * Features:
 * - Complete action log
 * - All-in equity snapshots
 * - Multi-currency support
 * - Export formats (text, JSON, PokerStars format)
 */

import { logger } from './logger.js';

// ==========================================
// TYPES
// ==========================================

export interface HandHistoryPlayer {
  playerId: string;
  name: string;
  seatNumber: number;
  stackStart: number;
  stackEnd: number;
  holeCards?: string[];
  position: 'BTN' | 'SB' | 'BB' | 'UTG' | 'MP' | 'CO' | 'HJ' | 'LJ' | string;
  isWinner: boolean;
  winAmount: number;
  handName?: string;
}

export interface HandHistoryAction {
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  playerId: string;
  playerName: string;
  actionType: string;
  amount?: number;
  potAfter: number;
  timestamp: number;
  allInEquity?: number;
}

export interface HandHistoryPot {
  type: 'main' | 'side';
  amount: number;
  eligiblePlayers: string[];
  winners: { playerId: string; amount: number }[];
}

export interface HandHistory {
  handId: string;
  handNumber: number;
  tableId: string;
  tableName: string;
  gameType: string;
  stakes: { smallBlind: number; bigBlind: number; ante: number };
  startedAt: number;
  finishedAt: number;
  players: HandHistoryPlayer[];
  actions: HandHistoryAction[];
  communityCards: {
    flop?: string[];
    turn?: string;
    river?: string;
  };
  pots: HandHistoryPot[];
  rake?: number;
  tournamentId?: string;
  tournamentName?: string;
  level?: number;
}

// ==========================================
// HAND HISTORY BUILDER
// ==========================================

export class HandHistoryBuilder {
  private history: Partial<HandHistory> = {};
  private actions: HandHistoryAction[] = [];
  private players: Map<string, Partial<HandHistoryPlayer>> = new Map();
  
  /**
   * Start building a new hand history
   */
  startHand(
    handId: string,
    handNumber: number,
    tableId: string,
    tableName: string,
    gameType: string,
    stakes: { smallBlind: number; bigBlind: number; ante: number }
  ): this {
    this.history = {
      handId,
      handNumber,
      tableId,
      tableName,
      gameType,
      stakes,
      startedAt: Date.now(),
      communityCards: {},
      pots: []
    };
    this.actions = [];
    this.players.clear();
    return this;
  }
  
  /**
   * Add tournament info
   */
  setTournamentInfo(tournamentId: string, tournamentName: string, level: number): this {
    this.history.tournamentId = tournamentId;
    this.history.tournamentName = tournamentName;
    this.history.level = level;
    return this;
  }
  
  /**
   * Add player to hand
   */
  addPlayer(
    playerId: string,
    name: string,
    seatNumber: number,
    stackStart: number,
    position: string
  ): this {
    this.players.set(playerId, {
      playerId,
      name,
      seatNumber,
      stackStart,
      stackEnd: stackStart,
      position,
      isWinner: false,
      winAmount: 0
    });
    return this;
  }
  
  /**
   * Set player hole cards
   */
  setHoleCards(playerId: string, cards: string[]): this {
    const player = this.players.get(playerId);
    if (player) {
      player.holeCards = cards;
    }
    return this;
  }
  
  /**
   * Record an action
   */
  recordAction(
    phase: HandHistoryAction['phase'],
    playerId: string,
    playerName: string,
    actionType: string,
    amount: number | undefined,
    potAfter: number,
    allInEquity?: number
  ): this {
    this.actions.push({
      phase,
      playerId,
      playerName,
      actionType,
      amount,
      potAfter,
      timestamp: Date.now(),
      allInEquity
    });
    return this;
  }
  
  /**
   * Set community cards
   */
  setCommunityCards(
    flop?: string[],
    turn?: string,
    river?: string
  ): this {
    this.history.communityCards = { flop, turn, river };
    return this;
  }
  
  /**
   * Add pot result
   */
  addPot(
    type: 'main' | 'side',
    amount: number,
    eligiblePlayers: string[],
    winners: { playerId: string; amount: number }[]
  ): this {
    this.history.pots = this.history.pots || [];
    this.history.pots.push({ type, amount, eligiblePlayers, winners });
    
    // Update player win amounts
    for (const winner of winners) {
      const player = this.players.get(winner.playerId);
      if (player) {
        player.isWinner = true;
        player.winAmount = (player.winAmount || 0) + winner.amount;
      }
    }
    
    return this;
  }
  
  /**
   * Set final player stacks
   */
  setFinalStacks(stacks: Map<string, number>): this {
    for (const [playerId, stack] of stacks) {
      const player = this.players.get(playerId);
      if (player) {
        player.stackEnd = stack;
      }
    }
    return this;
  }
  
  /**
   * Set player final hand
   */
  setPlayerHand(playerId: string, handName: string): this {
    const player = this.players.get(playerId);
    if (player) {
      player.handName = handName;
    }
    return this;
  }
  
  /**
   * Set rake
   */
  setRake(rake: number): this {
    this.history.rake = rake;
    return this;
  }
  
  /**
   * Build final hand history
   */
  build(): HandHistory {
    return {
      ...this.history,
      finishedAt: Date.now(),
      players: Array.from(this.players.values()) as HandHistoryPlayer[],
      actions: this.actions
    } as HandHistory;
  }
}

// ==========================================
// HAND HISTORY FORMATTER
// ==========================================

export class HandHistoryFormatter {
  
  /**
   * Format as PokerStars-style text
   */
  formatPokerStars(history: HandHistory): string {
    const lines: string[] = [];
    
    // Header
    if (history.tournamentId) {
      lines.push(`PokerStars Tournament #${history.tournamentId}, ${history.gameType}`);
      lines.push(`Level ${history.level} (${history.stakes.smallBlind}/${history.stakes.bigBlind})`);
    } else {
      lines.push(`PokerStars Hand #${history.handNumber}: ${history.gameType} ($${history.stakes.smallBlind}/$${history.stakes.bigBlind})`);
    }
    
    lines.push(`Table '${history.tableName}' 9-max`);
    
    // Players
    for (const player of history.players.sort((a, b) => a.seatNumber - b.seatNumber)) {
      lines.push(`Seat ${player.seatNumber + 1}: ${player.name} ($${player.stackStart} in chips)`);
    }
    
    // Positions
    const btn = history.players.find(p => p.position === 'BTN');
    const sb = history.players.find(p => p.position === 'SB');
    const bb = history.players.find(p => p.position === 'BB');
    
    if (sb) lines.push(`${sb.name}: posts small blind $${history.stakes.smallBlind}`);
    if (bb) lines.push(`${bb.name}: posts big blind $${history.stakes.bigBlind}`);
    
    // Hole cards (for hero)
    lines.push('*** HOLE CARDS ***');
    for (const player of history.players) {
      if (player.holeCards && player.holeCards.length > 0) {
        lines.push(`Dealt to ${player.name} [${player.holeCards.join(' ')}]`);
      }
    }
    
    // Actions by phase
    const phases = ['preflop', 'flop', 'turn', 'river', 'showdown'] as const;
    
    for (const phase of phases) {
      const phaseActions = history.actions.filter(a => a.phase === phase);
      if (phaseActions.length === 0) continue;
      
      if (phase === 'flop' && history.communityCards.flop) {
        lines.push(`*** FLOP *** [${history.communityCards.flop.join(' ')}]`);
      } else if (phase === 'turn' && history.communityCards.turn) {
        lines.push(`*** TURN *** [${history.communityCards.flop?.join(' ')}] [${history.communityCards.turn}]`);
      } else if (phase === 'river' && history.communityCards.river) {
        lines.push(`*** RIVER *** [${history.communityCards.flop?.join(' ')} ${history.communityCards.turn}] [${history.communityCards.river}]`);
      } else if (phase === 'showdown') {
        lines.push('*** SHOW DOWN ***');
      }
      
      for (const action of phaseActions) {
        lines.push(this.formatAction(action));
      }
    }
    
    // Summary
    lines.push('*** SUMMARY ***');
    for (const pot of history.pots) {
      const potType = pot.type === 'main' ? 'Total pot' : 'Side pot';
      lines.push(`${potType} $${pot.amount}`);
    }
    
    if (history.communityCards.flop) {
      const board = [
        ...(history.communityCards.flop || []),
        history.communityCards.turn,
        history.communityCards.river
      ].filter(Boolean);
      lines.push(`Board [${board.join(' ')}]`);
    }
    
    for (const player of history.players) {
      let summary = `Seat ${player.seatNumber + 1}: ${player.name}`;
      if (player.position === 'BTN') summary += ' (button)';
      if (player.position === 'SB') summary += ' (small blind)';
      if (player.position === 'BB') summary += ' (big blind)';
      
      if (player.isWinner) {
        summary += ` collected ($${player.winAmount})`;
        if (player.handName) {
          summary += ` with ${player.handName}`;
        }
      } else {
        const lastAction = history.actions.filter(a => a.playerId === player.playerId).pop();
        if (lastAction?.actionType === 'fold') {
          summary += ' folded';
        }
      }
      
      lines.push(summary);
    }
    
    return lines.join('\n');
  }
  
  /**
   * Format single action
   */
  private formatAction(action: HandHistoryAction): string {
    const parts = [action.playerName + ':'];
    
    switch (action.actionType.toLowerCase()) {
      case 'fold':
        parts.push('folds');
        break;
      case 'check':
        parts.push('checks');
        break;
      case 'call':
        parts.push(`calls $${action.amount}`);
        break;
      case 'bet':
        parts.push(`bets $${action.amount}`);
        break;
      case 'raise':
        parts.push(`raises to $${action.amount}`);
        break;
      case 'allin':
        parts.push(`is all-in $${action.amount}`);
        break;
      default:
        parts.push(action.actionType);
    }
    
    return parts.join(' ');
  }
  
  /**
   * Format as JSON
   */
  formatJSON(history: HandHistory): string {
    return JSON.stringify(history, null, 2);
  }
  
  /**
   * Format as compact JSON (for storage)
   */
  formatCompactJSON(history: HandHistory): string {
    return JSON.stringify(history);
  }
}

// ==========================================
// HAND HISTORY SERVICE
// ==========================================

export class HandHistoryService {
  private builder = new HandHistoryBuilder();
  private formatter = new HandHistoryFormatter();
  private histories: Map<string, HandHistory> = new Map();
  private readonly MAX_CACHED = 1000;
  
  /**
   * Start recording a new hand
   */
  startRecording(
    handId: string,
    handNumber: number,
    tableId: string,
    tableName: string,
    gameType: string,
    stakes: { smallBlind: number; bigBlind: number; ante: number }
  ): HandHistoryBuilder {
    return this.builder.startHand(handId, handNumber, tableId, tableName, gameType, stakes);
  }
  
  /**
   * Complete and store hand history
   */
  completeHand(builder: HandHistoryBuilder): HandHistory {
    const history = builder.build();
    
    // Store
    this.histories.set(history.handId, history);
    
    // Prune old
    while (this.histories.size > this.MAX_CACHED) {
      const oldestKey = this.histories.keys().next().value;
      if (oldestKey) {
        this.histories.delete(oldestKey);
      }
    }
    
    logger.info('Hand history recorded', {
      handId: history.handId,
      players: history.players.length,
      actions: history.actions.length
    });
    
    return history;
  }
  
  /**
   * Get hand history
   */
  getHistory(handId: string): HandHistory | undefined {
    return this.histories.get(handId);
  }
  
  /**
   * Get formatted history
   */
  getFormattedHistory(handId: string, format: 'pokerstars' | 'json' | 'compact'): string | undefined {
    const history = this.histories.get(handId);
    if (!history) return undefined;
    
    switch (format) {
      case 'pokerstars':
        return this.formatter.formatPokerStars(history);
      case 'json':
        return this.formatter.formatJSON(history);
      case 'compact':
        return this.formatter.formatCompactJSON(history);
      default:
        return this.formatter.formatJSON(history);
    }
  }
  
  /**
   * Get recent hand IDs for a table
   */
  getRecentHandIds(tableId: string, count: number = 10): string[] {
    return Array.from(this.histories.values())
      .filter(h => h.tableId === tableId)
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, count)
      .map(h => h.handId);
  }
  
  /**
   * Get player's hand history
   */
  getPlayerHistory(playerId: string, count: number = 50): HandHistory[] {
    return Array.from(this.histories.values())
      .filter(h => h.players.some(p => p.playerId === playerId))
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, count);
  }
}

// ==========================================
// SINGLETON
// ==========================================

export const professionalHandHistory = new HandHistoryService();
// Alias for backward compatibility
export const handHistoryService = professionalHandHistory;
