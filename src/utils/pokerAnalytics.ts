/**
 * Professional Poker Analytics System
 * PokerCraft-style statistics and analysis
 */

export interface HandAction {
  phase: 'preflop' | 'flop' | 'turn' | 'river';
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';
  amount?: number;
  potSize: number;
  position: string;
  timestamp: number;
}

export interface HandResult {
  handId: string;
  playerId: string;
  holeCards: string[];
  communityCards: string[];
  position: string;
  actions: HandAction[];
  result: 'won' | 'lost' | 'split';
  profit: number;
  potSize: number;
  showdown: boolean;
  handStrength?: string;
  timestamp: number;
  tableType: 'cash' | 'tournament';
  stakes: string;
  gameType: 'holdem' | 'omaha' | 'shortdeck';
}

export interface PlayerStats {
  // Basic stats
  handsPlayed: number;
  handsWon: number;
  totalProfit: number;
  bigBlindsWon: number;
  
  // VPIP - Voluntarily Put money In Pot
  vpip: number;
  vpipHands: number;
  
  // PFR - Pre-Flop Raise
  pfr: number;
  pfrHands: number;
  
  // 3-Bet percentage
  threeBet: number;
  threeBetOpportunities: number;
  threeBetHands: number;
  
  // 4-Bet percentage
  fourBet: number;
  fourBetOpportunities: number;
  
  // Aggression Factor (Bet + Raise) / Call
  afPostflop: number;
  totalBets: number;
  totalRaises: number;
  totalCalls: number;
  
  // Continuation Bet
  cbet: number;
  cbetOpportunities: number;
  cbetHands: number;
  
  // Fold to C-Bet
  foldToCbet: number;
  foldToCbetOpportunities: number;
  
  // WTSD - Went To ShowDown
  wtsd: number;
  wtsdHands: number;
  
  // W$SD - Won money at ShowDown
  wsd: number;
  wsdHands: number;
  
  // Steal percentages
  attemptToSteal: number;
  stealOpportunities: number;
  
  // Blind defense
  foldBBToSteal: number;
  foldSBToSteal: number;
  
  // Position stats
  positionStats: Record<string, PositionStats>;
  
  // Session data
  sessions: SessionStats[];
  
  // Hand history
  recentHands: HandResult[];
}

export interface PositionStats {
  position: string;
  handsPlayed: number;
  vpip: number;
  pfr: number;
  winRate: number;
  profit: number;
}

export interface SessionStats {
  sessionId: string;
  startTime: number;
  endTime: number;
  handsPlayed: number;
  profit: number;
  bigBlindsWon: number;
  peakProfit: number;
  worstDrawdown: number;
  tableType: 'cash' | 'tournament';
  stakes: string;
}

export interface LeakAnalysis {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
  impactBB: number;
}

// Initialize empty player stats
export function createEmptyStats(): PlayerStats {
  return {
    handsPlayed: 0,
    handsWon: 0,
    totalProfit: 0,
    bigBlindsWon: 0,
    vpip: 0,
    vpipHands: 0,
    pfr: 0,
    pfrHands: 0,
    threeBet: 0,
    threeBetOpportunities: 0,
    threeBetHands: 0,
    fourBet: 0,
    fourBetOpportunities: 0,
    afPostflop: 0,
    totalBets: 0,
    totalRaises: 0,
    totalCalls: 0,
    cbet: 0,
    cbetOpportunities: 0,
    cbetHands: 0,
    foldToCbet: 0,
    foldToCbetOpportunities: 0,
    wtsd: 0,
    wtsdHands: 0,
    wsd: 0,
    wsdHands: 0,
    attemptToSteal: 0,
    stealOpportunities: 0,
    foldBBToSteal: 0,
    foldSBToSteal: 0,
    positionStats: {},
    sessions: [],
    recentHands: []
  };
}

/**
 * Update player stats with a new hand result
 */
export function updateStatsWithHand(stats: PlayerStats, hand: HandResult, bigBlind: number): PlayerStats {
  const newStats = { ...stats };
  
  newStats.handsPlayed++;
  if (hand.result === 'won') {
    newStats.handsWon++;
  }
  
  newStats.totalProfit += hand.profit;
  newStats.bigBlindsWon += hand.profit / bigBlind;
  
  // Track recent hands (keep last 100)
  newStats.recentHands = [hand, ...newStats.recentHands].slice(0, 100);
  
  // Analyze preflop actions
  const preflopActions = hand.actions.filter(a => a.phase === 'preflop');
  const postflopActions = hand.actions.filter(a => a.phase !== 'preflop');
  
  // VPIP calculation
  const voluntaryAction = preflopActions.find(a => 
    a.action === 'call' || a.action === 'bet' || a.action === 'raise' || a.action === 'all-in'
  );
  if (voluntaryAction) {
    newStats.vpipHands++;
  }
  newStats.vpip = (newStats.vpipHands / newStats.handsPlayed) * 100;
  
  // PFR calculation
  const raiseAction = preflopActions.find(a => 
    a.action === 'bet' || a.action === 'raise' || a.action === 'all-in'
  );
  if (raiseAction) {
    newStats.pfrHands++;
  }
  newStats.pfr = (newStats.pfrHands / newStats.handsPlayed) * 100;
  
  // Aggression factor
  for (const action of postflopActions) {
    if (action.action === 'bet') newStats.totalBets++;
    if (action.action === 'raise') newStats.totalRaises++;
    if (action.action === 'call') newStats.totalCalls++;
  }
  
  if (newStats.totalCalls > 0) {
    newStats.afPostflop = (newStats.totalBets + newStats.totalRaises) / newStats.totalCalls;
  }
  
  // WTSD and W$SD
  if (hand.showdown) {
    newStats.wtsdHands++;
    if (hand.result === 'won') {
      newStats.wsdHands++;
    }
  }
  newStats.wtsd = newStats.handsPlayed > 0 ? (newStats.wtsdHands / newStats.handsPlayed) * 100 : 0;
  newStats.wsd = newStats.wtsdHands > 0 ? (newStats.wsdHands / newStats.wtsdHands) * 100 : 0;
  
  // Position stats
  updatePositionStats(newStats, hand);
  
  return newStats;
}

function updatePositionStats(stats: PlayerStats, hand: HandResult): void {
  const pos = hand.position;
  
  if (!stats.positionStats[pos]) {
    stats.positionStats[pos] = {
      position: pos,
      handsPlayed: 0,
      vpip: 0,
      pfr: 0,
      winRate: 0,
      profit: 0
    };
  }
  
  const posStats = stats.positionStats[pos];
  posStats.handsPlayed++;
  posStats.profit += hand.profit;
  posStats.winRate = (posStats.profit / posStats.handsPlayed);
  
  // Update VPIP/PFR per position
  const preflopActions = hand.actions.filter(a => a.phase === 'preflop');
  const voluntaryAction = preflopActions.find(a => 
    ['call', 'bet', 'raise', 'all-in'].includes(a.action)
  );
  if (voluntaryAction) {
    // Recalculate VPIP for this position
    const vpipCount = (posStats.vpip * (posStats.handsPlayed - 1) / 100) + 1;
    posStats.vpip = (vpipCount / posStats.handsPlayed) * 100;
  }
}

/**
 * Analyze player leaks based on their stats
 */
export function analyzeLeaks(stats: PlayerStats): LeakAnalysis[] {
  const leaks: LeakAnalysis[] = [];
  
  if (stats.handsPlayed < 100) {
    return [{
      category: 'Sample Size',
      severity: 'low',
      description: 'Недостаточно рук для точного анализа',
      suggestion: 'Сыграйте минимум 1000 рук для достоверной статистики',
      impactBB: 0
    }];
  }
  
  // VPIP too high
  if (stats.vpip > 35) {
    leaks.push({
      category: 'Слишком широкий диапазон',
      severity: stats.vpip > 45 ? 'critical' : 'high',
      description: `VPIP ${stats.vpip.toFixed(1)}% слишком высокий`,
      suggestion: 'Сузьте стартовые руки, играйте тайтовее из ранних позиций',
      impactBB: (stats.vpip - 25) * 0.5
    });
  }
  
  // VPIP too low
  if (stats.vpip < 15) {
    leaks.push({
      category: 'Слишком тайтовая игра',
      severity: 'medium',
      description: `VPIP ${stats.vpip.toFixed(1)}% слишком низкий`,
      suggestion: 'Расширьте диапазон из поздних позиций, добавьте стилы',
      impactBB: (20 - stats.vpip) * 0.3
    });
  }
  
  // PFR/VPIP ratio
  const pfrVpipRatio = stats.pfr / stats.vpip;
  if (pfrVpipRatio < 0.6 && stats.vpip > 15) {
    leaks.push({
      category: 'Пассивная игра префлоп',
      severity: 'high',
      description: `PFR/VPIP ${(pfrVpipRatio * 100).toFixed(0)}% - слишком много коллов`,
      suggestion: 'Больше рейзите вместо коллов, особенно в позиции',
      impactBB: (0.7 - pfrVpipRatio) * 10
    });
  }
  
  // Low aggression factor
  if (stats.afPostflop < 1.5 && stats.totalCalls > 50) {
    leaks.push({
      category: 'Пассивность постфлоп',
      severity: 'high',
      description: `AF ${stats.afPostflop.toFixed(2)} - слишком пассивная игра`,
      suggestion: 'Больше ставьте и рейзьте на постфлопе, меньше коллируйте',
      impactBB: (2 - stats.afPostflop) * 5
    });
  }
  
  // Too high aggression
  if (stats.afPostflop > 5 && stats.totalCalls > 20) {
    leaks.push({
      category: 'Чрезмерная агрессия',
      severity: 'medium',
      description: `AF ${stats.afPostflop.toFixed(2)} - слишком агрессивно`,
      suggestion: 'Добавьте больше коллов с медиум руками, не блефуйте каждый раз',
      impactBB: (stats.afPostflop - 4) * 2
    });
  }
  
  // Low WTSD with negative winrate
  if (stats.wtsd < 20 && stats.bigBlindsWon < 0) {
    leaks.push({
      category: 'Слишком много фолдов',
      severity: 'medium',
      description: `WTSD ${stats.wtsd.toFixed(1)}% - фолдите слишком часто`,
      suggestion: 'Доходите до шоудауна чаще с маргинальными руками',
      impactBB: (25 - stats.wtsd) * 0.3
    });
  }
  
  // High WTSD with low W$SD
  if (stats.wtsd > 35 && stats.wsd < 45) {
    leaks.push({
      category: 'Лузовые коллы',
      severity: 'high',
      description: `WTSD ${stats.wtsd.toFixed(1)}% с W$SD ${stats.wsd.toFixed(1)}%`,
      suggestion: 'Фолдите больше слабых рук, не коллстейшните без эквити',
      impactBB: (stats.wtsd - 30) * 0.5
    });
  }
  
  // Sort by impact
  leaks.sort((a, b) => b.impactBB - a.impactBB);
  
  return leaks;
}

/**
 * Calculate win rate in BB/100
 */
export function calculateWinRate(stats: PlayerStats): number {
  if (stats.handsPlayed === 0) return 0;
  return (stats.bigBlindsWon / stats.handsPlayed) * 100;
}

/**
 * Get player type based on VPIP/PFR
 */
export function getPlayerType(vpip: number, pfr: number): {
  type: string;
  description: string;
  color: string;
} {
  const pfrVpipGap = vpip - pfr;
  
  if (vpip < 15 && pfr < 10) {
    return { type: 'Nit', description: 'Очень тайтовый пассивный', color: 'blue' };
  }
  if (vpip < 22 && pfr > 15 && pfrVpipGap < 5) {
    return { type: 'TAG', description: 'Тайтово-агрессивный', color: 'green' };
  }
  if (vpip < 22 && pfrVpipGap > 8) {
    return { type: 'Weak-Tight', description: 'Тайтовый пассивный', color: 'yellow' };
  }
  if (vpip > 30 && pfr > 22 && pfrVpipGap < 10) {
    return { type: 'LAG', description: 'Лузово-агрессивный', color: 'orange' };
  }
  if (vpip > 35 && pfrVpipGap > 15) {
    return { type: 'Calling Station', description: 'Лузовый пассивный', color: 'red' };
  }
  if (vpip > 45) {
    return { type: 'Maniac', description: 'Гипер-агрессивный', color: 'purple' };
  }
  
  return { type: 'Regular', description: 'Стандартный игрок', color: 'gray' };
}

/**
 * Generate session summary
 */
export function generateSessionSummary(session: SessionStats): {
  duration: string;
  handsPerHour: number;
  bbPerHour: number;
  verdict: 'excellent' | 'good' | 'breakeven' | 'bad' | 'terrible';
} {
  const durationMs = session.endTime - session.startTime;
  const hours = durationMs / (1000 * 60 * 60);
  
  const duration = hours < 1 
    ? `${Math.round(hours * 60)} мин` 
    : `${hours.toFixed(1)} ч`;
  
  const handsPerHour = Math.round(session.handsPlayed / hours);
  const bbPerHour = session.bigBlindsWon / hours;
  
  let verdict: 'excellent' | 'good' | 'breakeven' | 'bad' | 'terrible';
  if (bbPerHour > 10) verdict = 'excellent';
  else if (bbPerHour > 3) verdict = 'good';
  else if (bbPerHour > -3) verdict = 'breakeven';
  else if (bbPerHour > -10) verdict = 'bad';
  else verdict = 'terrible';
  
  return { duration, handsPerHour, bbPerHour, verdict };
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format BB amount
 */
export function formatBB(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)} BB`;
}
