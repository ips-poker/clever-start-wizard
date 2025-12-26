/**
 * Anti-Cheat System
 * Detects suspicious behavior, collusion, and bot activity
 */

import { logger } from './logger.js';
import { metrics } from './prometheus-metrics.js';

// Detection thresholds
const THRESHOLDS = {
  // Timing analysis
  MIN_ACTION_TIME_MS: 100,        // Actions faster than this are suspicious
  MAX_CONSISTENT_TIMING: 0.85,    // >85% same timing = possible bot
  
  // Collusion detection
  FOLD_TO_SAME_PLAYER_THRESHOLD: 0.7,  // >70% fold rate to same player
  CHIP_TRANSFER_DETECTION: 0.8,         // >80% chip flow direction
  
  // Session anomalies
  MAX_TABLES_PER_PLAYER: 12,      // Multi-tabling limit
  IP_COLLISION_THRESHOLD: 3,      // Same IP at same table
  
  // Pattern detection
  MIN_SAMPLE_SIZE: 20,            // Minimum hands for statistical analysis
  BOT_PATTERN_CONFIDENCE: 0.9,    // Confidence threshold
};

interface PlayerAction {
  playerId: string;
  tableId: string;
  action: string;
  amount?: number;
  timing: number;        // Time to act in ms
  position: number;      // Seat position
  timestamp: number;
  phase: string;
  potOdds?: number;
  stackBBs?: number;
}

interface PlayerStats {
  playerId: string;
  actions: PlayerAction[];
  foldsByOpponent: Map<string, number>;
  chipFlowTo: Map<string, number>;
  chipFlowFrom: Map<string, number>;
  averageTiming: number;
  timingStdDev: number;
  vpip: number;           // Voluntarily Put $ In Pot
  pfr: number;            // Pre-Flop Raise %
  aggressionFactor: number;
  lastChecked: number;
  suspicionScore: number;
  flags: string[];
}

interface CollusionPair {
  player1: string;
  player2: string;
  confidence: number;
  indicators: string[];
  evidence: {
    foldRate: number;
    chipFlow: number;
    ipCollision: boolean;
    timingCorrelation: number;
  };
}

interface BotSuspicion {
  playerId: string;
  confidence: number;
  indicators: string[];
  evidence: {
    timingConsistency: number;
    patternScore: number;
    inhumnResponseTimes: number;
  };
}

class AntiCheatSystem {
  private playerStats: Map<string, PlayerStats> = new Map();
  private tablePlayerIPs: Map<string, Map<string, string>> = new Map(); // tableId -> playerId -> IP
  private flaggedPlayers: Set<string> = new Set();
  private collusionPairs: CollusionPair[] = [];
  private botSuspicions: BotSuspicion[] = [];
  private readonly MAX_HISTORY = 1000;

  constructor() {
    logger.info('AntiCheat system initialized');
  }

  /**
   * Record a player action for analysis
   */
  recordAction(action: PlayerAction): void {
    const stats = this.getOrCreateStats(action.playerId);
    
    // Keep limited history
    if (stats.actions.length >= this.MAX_HISTORY) {
      stats.actions.shift();
    }
    stats.actions.push(action);

    // Update timing stats
    this.updateTimingStats(stats);

    // Quick checks on every action
    this.checkInhumanTiming(action, stats);
  }

  /**
   * Record chip transfer (for collusion detection)
   */
  recordChipTransfer(
    fromPlayerId: string,
    toPlayerId: string,
    amount: number,
    tableId: string
  ): void {
    const fromStats = this.getOrCreateStats(fromPlayerId);
    const toStats = this.getOrCreateStats(toPlayerId);

    fromStats.chipFlowTo.set(
      toPlayerId,
      (fromStats.chipFlowTo.get(toPlayerId) || 0) + amount
    );
    toStats.chipFlowFrom.set(
      fromPlayerId,
      (toStats.chipFlowFrom.get(fromPlayerId) || 0) + amount
    );
  }

  /**
   * Record a fold (for collusion detection)
   */
  recordFold(playerId: string, foldedToPlayerId: string): void {
    const stats = this.getOrCreateStats(playerId);
    stats.foldsByOpponent.set(
      foldedToPlayerId,
      (stats.foldsByOpponent.get(foldedToPlayerId) || 0) + 1
    );
  }

  /**
   * Record player IP at table
   */
  recordPlayerIP(tableId: string, playerId: string, ip: string): void {
    if (!this.tablePlayerIPs.has(tableId)) {
      this.tablePlayerIPs.set(tableId, new Map());
    }
    this.tablePlayerIPs.get(tableId)!.set(playerId, ip);
  }

  /**
   * Run full analysis for a player
   */
  analyzePlayer(playerId: string): {
    suspicionScore: number;
    flags: string[];
    details: object;
  } {
    const stats = this.getOrCreateStats(playerId);
    
    if (stats.actions.length < THRESHOLDS.MIN_SAMPLE_SIZE) {
      return { suspicionScore: 0, flags: [], details: { reason: 'Insufficient data' } };
    }

    const flags: string[] = [];
    let suspicionScore = 0;

    // 1. Timing analysis
    const timingAnalysis = this.analyzeTimingPatterns(stats);
    if (timingAnalysis.isSuspicious) {
      flags.push(...timingAnalysis.flags);
      suspicionScore += timingAnalysis.score;
    }

    // 2. Collusion check
    const collusionAnalysis = this.analyzeCollusionPatterns(stats);
    if (collusionAnalysis.suspicious) {
      flags.push(...collusionAnalysis.flags);
      suspicionScore += collusionAnalysis.score;
    }

    // 3. Bot pattern detection
    const botAnalysis = this.analyzeBotPatterns(stats);
    if (botAnalysis.isSuspicious) {
      flags.push(...botAnalysis.flags);
      suspicionScore += botAnalysis.score;
    }

    // Update stats
    stats.suspicionScore = suspicionScore;
    stats.flags = flags;
    stats.lastChecked = Date.now();

    // Flag if score is high
    if (suspicionScore >= 70) {
      this.flaggedPlayers.add(playerId);
      logger.warn('Player flagged by anti-cheat', { playerId, suspicionScore, flags });
      metrics.incCounter('poker_anticheat_flags_total', 1, { type: 'suspicious' });
    }

    return {
      suspicionScore,
      flags,
      details: {
        timingAnalysis,
        collusionAnalysis,
        botAnalysis
      }
    };
  }

  /**
   * Check for IP collision at a table
   */
  checkIPCollision(tableId: string): { hasCollision: boolean; players: string[][] } {
    const tableIPs = this.tablePlayerIPs.get(tableId);
    if (!tableIPs || tableIPs.size < 2) {
      return { hasCollision: false, players: [] };
    }

    const ipToPlayers: Map<string, string[]> = new Map();
    for (const [playerId, ip] of tableIPs) {
      if (!ipToPlayers.has(ip)) {
        ipToPlayers.set(ip, []);
      }
      ipToPlayers.get(ip)!.push(playerId);
    }

    const collisions: string[][] = [];
    for (const [ip, players] of ipToPlayers) {
      if (players.length >= THRESHOLDS.IP_COLLISION_THRESHOLD) {
        collisions.push(players);
        logger.warn('IP collision detected', { tableId, ip: ip.substring(0, 8) + '***', playerCount: players.length });
      }
    }

    return { hasCollision: collisions.length > 0, players: collisions };
  }

  /**
   * Get all flagged players
   */
  getFlaggedPlayers(): Array<{ playerId: string; stats: PlayerStats }> {
    const result: Array<{ playerId: string; stats: PlayerStats }> = [];
    for (const playerId of this.flaggedPlayers) {
      const stats = this.playerStats.get(playerId);
      if (stats) {
        result.push({ playerId, stats });
      }
    }
    return result;
  }

  /**
   * Get collusion pairs
   */
  getCollusionPairs(): CollusionPair[] {
    return [...this.collusionPairs];
  }

  /**
   * Clear a player's flag (after review)
   */
  clearFlag(playerId: string): void {
    this.flaggedPlayers.delete(playerId);
    const stats = this.playerStats.get(playerId);
    if (stats) {
      stats.suspicionScore = 0;
      stats.flags = [];
    }
  }

  // ==========================================
  // PRIVATE ANALYSIS METHODS
  // ==========================================

  private getOrCreateStats(playerId: string): PlayerStats {
    if (!this.playerStats.has(playerId)) {
      this.playerStats.set(playerId, {
        playerId,
        actions: [],
        foldsByOpponent: new Map(),
        chipFlowTo: new Map(),
        chipFlowFrom: new Map(),
        averageTiming: 0,
        timingStdDev: 0,
        vpip: 0,
        pfr: 0,
        aggressionFactor: 0,
        lastChecked: 0,
        suspicionScore: 0,
        flags: []
      });
    }
    return this.playerStats.get(playerId)!;
  }

  private updateTimingStats(stats: PlayerStats): void {
    const timings = stats.actions.map(a => a.timing);
    if (timings.length < 5) return;

    const sum = timings.reduce((a, b) => a + b, 0);
    stats.averageTiming = sum / timings.length;

    const squaredDiffs = timings.map(t => Math.pow(t - stats.averageTiming, 2));
    stats.timingStdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / timings.length);
  }

  private checkInhumanTiming(action: PlayerAction, stats: PlayerStats): void {
    // Check for impossibly fast actions
    if (action.timing < THRESHOLDS.MIN_ACTION_TIME_MS) {
      stats.flags.push('INHUMAN_TIMING');
      logger.warn('Inhuman action timing detected', { 
        playerId: action.playerId, 
        timing: action.timing,
        action: action.action 
      });
    }
  }

  private analyzeTimingPatterns(stats: PlayerStats): {
    isSuspicious: boolean;
    flags: string[];
    score: number;
  } {
    const flags: string[] = [];
    let score = 0;

    const timings = stats.actions.slice(-100).map(a => a.timing);
    if (timings.length < 20) {
      return { isSuspicious: false, flags: [], score: 0 };
    }

    // Calculate coefficient of variation
    const cv = stats.timingStdDev / stats.averageTiming;

    // Very consistent timing (low variation) is suspicious
    if (cv < 0.15 && stats.averageTiming < 2000) {
      flags.push('CONSISTENT_TIMING');
      score += 30;
    }

    // Check for repetitive exact timings
    const timingCounts: Map<number, number> = new Map();
    for (const t of timings) {
      const rounded = Math.round(t / 100) * 100; // Round to nearest 100ms
      timingCounts.set(rounded, (timingCounts.get(rounded) || 0) + 1);
    }

    const maxSameTiming = Math.max(...timingCounts.values());
    if (maxSameTiming / timings.length > THRESHOLDS.MAX_CONSISTENT_TIMING) {
      flags.push('REPETITIVE_TIMING');
      score += 40;
    }

    return { isSuspicious: score > 0, flags, score };
  }

  private analyzeCollusionPatterns(stats: PlayerStats): {
    suspicious: boolean;
    flags: string[];
    score: number;
    pairs: string[];
  } {
    const flags: string[] = [];
    let score = 0;
    const suspiciousPairs: string[] = [];

    // Analyze fold patterns
    const totalFolds = Array.from(stats.foldsByOpponent.values()).reduce((a, b) => a + b, 0);
    if (totalFolds >= 10) {
      for (const [opponentId, foldCount] of stats.foldsByOpponent) {
        const foldRate = foldCount / totalFolds;
        if (foldRate > THRESHOLDS.FOLD_TO_SAME_PLAYER_THRESHOLD) {
          flags.push('HIGH_FOLD_RATE_TO_PLAYER');
          score += 25;
          suspiciousPairs.push(opponentId);
        }
      }
    }

    // Analyze chip flow (one-directional chip transfer)
    const totalChipFlowOut = Array.from(stats.chipFlowTo.values()).reduce((a, b) => a + b, 0);
    const totalChipFlowIn = Array.from(stats.chipFlowFrom.values()).reduce((a, b) => a + b, 0);

    if (totalChipFlowOut > 0 || totalChipFlowIn > 0) {
      for (const [toPlayerId, amount] of stats.chipFlowTo) {
        const reverseFlow = stats.chipFlowFrom.get(toPlayerId) || 0;
        const totalFlow = amount + reverseFlow;
        
        if (totalFlow > 0) {
          const flowRatio = amount / totalFlow;
          if (flowRatio > THRESHOLDS.CHIP_TRANSFER_DETECTION && amount > 1000) {
            flags.push('ONE_WAY_CHIP_FLOW');
            score += 35;
            if (!suspiciousPairs.includes(toPlayerId)) {
              suspiciousPairs.push(toPlayerId);
            }
          }
        }
      }
    }

    return { suspicious: score > 0, flags, score, pairs: suspiciousPairs };
  }

  private analyzeBotPatterns(stats: PlayerStats): {
    isSuspicious: boolean;
    flags: string[];
    score: number;
  } {
    const flags: string[] = [];
    let score = 0;

    const actions = stats.actions.slice(-100);
    if (actions.length < 30) {
      return { isSuspicious: false, flags: [], score: 0 };
    }

    // Check for perfect GTO-like behavior (always same action in same spot)
    const positionActionMap: Map<string, Map<string, number>> = new Map();
    
    for (const action of actions) {
      const key = `${action.position}-${action.phase}`;
      if (!positionActionMap.has(key)) {
        positionActionMap.set(key, new Map());
      }
      const actionCounts = positionActionMap.get(key)!;
      actionCounts.set(action.action, (actionCounts.get(action.action) || 0) + 1);
    }

    // Check if any position-phase combo has >90% same action
    for (const [, actionCounts] of positionActionMap) {
      const total = Array.from(actionCounts.values()).reduce((a, b) => a + b, 0);
      if (total >= 5) {
        const maxAction = Math.max(...actionCounts.values());
        if (maxAction / total > THRESHOLDS.BOT_PATTERN_CONFIDENCE) {
          flags.push('PREDICTABLE_PATTERN');
          score += 20;
        }
      }
    }

    // Check for lack of variance in bet sizing
    const betSizes = actions
      .filter(a => a.amount && a.amount > 0)
      .map(a => a.amount!);
    
    if (betSizes.length >= 10) {
      const uniqueSizes = new Set(betSizes.map(s => Math.round(s / 10) * 10));
      if (uniqueSizes.size < 3) {
        flags.push('LIMITED_BET_SIZING');
        score += 15;
      }
    }

    return { isSuspicious: score > 0, flags, score };
  }

  // ==========================================
  // CLEANUP & STATS
  // ==========================================

  getStats(): {
    trackedPlayers: number;
    flaggedPlayers: number;
    collusionPairs: number;
  } {
    return {
      trackedPlayers: this.playerStats.size,
      flaggedPlayers: this.flaggedPlayers.size,
      collusionPairs: this.collusionPairs.length
    };
  }

  cleanup(): void {
    const now = Date.now();
    const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours

    for (const [playerId, stats] of this.playerStats) {
      if (stats.actions.length === 0) continue;
      
      const lastAction = stats.actions[stats.actions.length - 1];
      if (now - lastAction.timestamp > staleThreshold) {
        this.playerStats.delete(playerId);
      }
    }

    this.tablePlayerIPs.clear();
    logger.info('AntiCheat cleanup complete', this.getStats());
  }
}

// Singleton instance
export const antiCheatSystem = new AntiCheatSystem();
