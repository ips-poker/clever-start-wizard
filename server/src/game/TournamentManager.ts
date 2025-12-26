/**
 * Tournament Management Engine
 * Full-featured tournament support with:
 * - Blind structure management
 * - ICM calculations
 * - Multi-table balancing
 * - Rebuy/Addon support
 * - Sit-N-Go presets
 */

import { PokerGameType, TournamentBlindLevel } from './PokerEngineV3.js';
import { logger } from '../utils/logger.js';

// Re-export TournamentBlindLevel for external use
export { TournamentBlindLevel };

// ==========================================
// TOURNAMENT TYPES
// ==========================================
export interface TournamentConfig {
  id: string;
  name: string;
  gameType: PokerGameType;
  startingChips: number;
  maxPlayers: number;
  minPlayers: number;
  buyIn: number;
  // Rebuy settings
  rebuyAllowed: boolean;
  rebuyEndLevel: number;
  rebuyChips: number;
  rebuyCost: number;
  // Addon settings
  addonAllowed: boolean;
  addonLevel: number;
  addonChips: number;
  addonCost: number;
  // Tournament structure
  blindStructure: TournamentBlindLevel[];
  payoutStructure: { position: number; percentage: number }[];
  lateRegistrationLevel: number;
  actionTimeSeconds: number;
  timeBankSeconds: number;
  timeBankPerLevel: number;
  tablesCount: number;
  playersPerTable: number;
  // Extended settings (new fields from database)
  tournamentFormat: 'freezeout' | 'rebuy' | 'knockout' | 'bounty';
  ticketsForTop: number;
  ticketValue: number;
  breakInterval: number;
  breakDuration: number;
  guaranteedPrizePool: number;
  scheduledStartAt: string | null;
  autoStart: boolean;
}

export interface TournamentState {
  config: TournamentConfig;
  status: TournamentStatus;
  currentLevel: number;
  levelStartTime: number;
  timeRemaining: number;
  players: TournamentPlayer[];
  tables: TournamentTable[];
  prizePool: number;
  totalRebuys: number;
  totalAddons: number;
  startedAt: number | null;
  pausedAt: number | null;
  finishedAt: number | null;
  handsPlayed: number;
}

export type TournamentStatus = 
  | 'registering' 
  | 'running' 
  | 'paused' 
  | 'break' 
  | 'final_table' 
  | 'heads_up' 
  | 'completed';

export interface TournamentPlayer {
  playerId: string;
  name: string;
  chips: number;
  tableId: string | null;
  seatNumber: number | null;
  status: 'registered' | 'playing' | 'eliminated' | 'winner';
  rebuys: number;
  addons: number;
  finishPosition: number | null;
  eliminatedAt: number | null;
  prize: number;
}

export interface TournamentTable {
  id: string;
  tableNumber: number;
  seats: (string | null)[]; // Player IDs
  currentHandId: string | null;
  status: 'waiting' | 'playing' | 'breaking';
}

// ==========================================
// BLIND STRUCTURE GENERATORS
// ==========================================

/**
 * Generate standard tournament blind structure
 */
export function generateBlindStructure(
  startingBB: number = 50,
  levels: number = 20,
  levelDuration: number = 900,
  includeAntes: boolean = true,
  breakEvery: number = 4
): TournamentBlindLevel[] {
  const structure: TournamentBlindLevel[] = [];
  let bb = startingBB;
  
  for (let i = 1; i <= levels; i++) {
    // Add break every N levels
    if (breakEvery > 0 && i > 1 && (i - 1) % breakEvery === 0) {
      structure.push({
        level: structure.length + 1,
        smallBlind: 0,
        bigBlind: 0,
        ante: 0,
        duration: 300, // 5 min break
        isBreak: true
      });
    }
    
    const sb = Math.round(bb / 2);
    const ante = includeAntes && i >= 4 ? Math.round(bb / 8) : 0;
    
    structure.push({
      level: structure.length + 1,
      smallBlind: sb,
      bigBlind: bb,
      ante,
      duration: levelDuration,
      isBreak: false
    });
    
    // Increase blinds progressively
    if (i <= 4) bb = Math.round(bb * 2);
    else if (i <= 8) bb = Math.round(bb * 1.5);
    else bb = Math.round(bb * 1.33);
    
    // Round to nice numbers
    if (bb >= 100) bb = Math.round(bb / 25) * 25;
    if (bb >= 1000) bb = Math.round(bb / 100) * 100;
    if (bb >= 10000) bb = Math.round(bb / 500) * 500;
  }
  
  return structure;
}

/**
 * Generate turbo blind structure (faster)
 */
export function generateTurboBlindStructure(): TournamentBlindLevel[] {
  return generateBlindStructure(50, 15, 300, true, 5);
}

/**
 * Generate hyper turbo structure
 */
export function generateHyperTurboBlindStructure(): TournamentBlindLevel[] {
  return generateBlindStructure(100, 12, 180, true, 0);
}

/**
 * Generate deep stack structure
 */
export function generateDeepStackBlindStructure(): TournamentBlindLevel[] {
  return generateBlindStructure(25, 25, 1800, true, 3);
}

// ==========================================
// ICM CALCULATOR
// ==========================================

/**
 * Calculate ICM equity for each player
 */
export function calculateICM(stacks: number[], payouts: number[]): number[] {
  const totalChips = stacks.reduce((a, b) => a + b, 0);
  const n = stacks.length;
  const equities = new Array(n).fill(0);
  
  function calculateEquity(
    remainingPlayers: number[],
    remainingPayouts: number[],
    probability: number
  ): void {
    if (remainingPayouts.length === 0 || remainingPlayers.length === 0) return;
    
    const totalRemainingChips = remainingPlayers.reduce(
      (sum, idx) => sum + stacks[idx], 0
    );
    
    for (let i = 0; i < remainingPlayers.length; i++) {
      const playerIdx = remainingPlayers[i];
      const finishProb = (stacks[playerIdx] / totalRemainingChips) * probability;
      
      equities[playerIdx] += finishProb * remainingPayouts[0];
      
      if (remainingPayouts.length > 1) {
        const newRemaining = remainingPlayers.filter((_, j) => j !== i);
        calculateEquity(newRemaining, remainingPayouts.slice(1), finishProb);
      }
    }
  }
  
  const playerIndices = stacks.map((_, i) => i);
  calculateEquity(playerIndices, payouts, 1);
  
  return equities;
}

/**
 * Calculate ICM deal equity
 */
export function calculateICMDeal(
  stacks: number[],
  payouts: number[],
  remainingPrize: number = 0
): { playerId: number; chips: number; equity: number; dealAmount: number }[] {
  const icmEquities = calculateICM(stacks, payouts);
  const totalChips = stacks.reduce((a, b) => a + b, 0);
  
  return stacks.map((chips, i) => ({
    playerId: i,
    chips,
    equity: icmEquities[i],
    dealAmount: Math.round(icmEquities[i] + (remainingPrize * (chips / totalChips)))
  }));
}

/**
 * Calculate chip chop deal
 */
export function calculateChipChop(
  stacks: number[],
  prizePool: number,
  alreadyPaid: number[] = []
): { playerId: number; chips: number; dealAmount: number }[] {
  const totalChips = stacks.reduce((a, b) => a + b, 0);
  const totalAlreadyPaid = alreadyPaid.reduce((a, b) => a + b, 0);
  const remainingPrize = prizePool - totalAlreadyPaid;
  
  return stacks.map((chips, i) => ({
    playerId: i,
    chips,
    dealAmount: Math.round((chips / totalChips) * remainingPrize) + (alreadyPaid[i] || 0)
  }));
}

/**
 * Calculate weighted deal (ICM + chip chop)
 */
export function calculateWeightedDeal(
  stacks: number[],
  payouts: number[],
  icmWeight: number = 0.5
): { playerId: number; icmAmount: number; chipChopAmount: number; dealAmount: number }[] {
  const prizePool = payouts.reduce((a, b) => a + b, 0);
  const icmResult = calculateICMDeal(stacks, payouts);
  const chipChopResult = calculateChipChop(stacks, prizePool);
  
  return stacks.map((_, i) => ({
    playerId: i,
    icmAmount: icmResult[i].dealAmount,
    chipChopAmount: chipChopResult[i].dealAmount,
    dealAmount: Math.round(
      icmResult[i].dealAmount * icmWeight + 
      chipChopResult[i].dealAmount * (1 - icmWeight)
    )
  }));
}

// ==========================================
// MULTI-TABLE BALANCING
// ==========================================

export interface TableBalance {
  tableId: string;
  playerCount: number;
  players: { playerId: string; chips: number; seatNumber: number }[];
}

/**
 * Calculate optimal player moves for table balancing
 */
export function calculateTableBalancing(
  tables: TableBalance[]
): { fromTable: string; toTable: string; playerId: string; toSeat: number }[] {
  const moves: { fromTable: string; toTable: string; playerId: string; toSeat: number }[] = [];
  
  const sortedTables = [...tables].sort((a, b) => b.playerCount - a.playerCount);
  const totalPlayers = tables.reduce((sum, t) => sum + t.playerCount, 0);
  const avgPlayers = Math.ceil(totalPlayers / tables.length);
  
  const overloadedTables = sortedTables.filter(t => t.playerCount > avgPlayers);
  const underloadedTables = sortedTables.filter(t => t.playerCount < avgPlayers);
  
  for (const fromTable of overloadedTables) {
    while (fromTable.playerCount > avgPlayers && underloadedTables.length > 0) {
      const toTable = underloadedTables.find(t => t.playerCount < avgPlayers);
      if (!toTable) break;
      
      const playerToMove = fromTable.players.find(p => 
        p.seatNumber === Math.max(...fromTable.players.map(pl => pl.seatNumber))
      );
      if (!playerToMove) break;
      
      const occupiedSeats = new Set(toTable.players.map(p => p.seatNumber));
      let toSeat = 1;
      while (occupiedSeats.has(toSeat)) toSeat++;
      
      moves.push({
        fromTable: fromTable.tableId,
        toTable: toTable.tableId,
        playerId: playerToMove.playerId,
        toSeat
      });
      
      fromTable.playerCount--;
      toTable.playerCount++;
      fromTable.players = fromTable.players.filter(p => p.playerId !== playerToMove.playerId);
      toTable.players.push({ ...playerToMove, seatNumber: toSeat });
    }
  }
  
  return moves;
}

/**
 * Check if tables should be consolidated
 */
export function shouldConsolidateTables(
  tables: TableBalance[],
  maxPlayersPerTable: number
): { consolidate: boolean; tablesToBreak: string[] } {
  const totalPlayers = tables.reduce((sum, t) => sum + t.playerCount, 0);
  const minTablesNeeded = Math.ceil(totalPlayers / maxPlayersPerTable);
  
  if (tables.length > minTablesNeeded) {
    const sortedTables = [...tables].sort((a, b) => a.playerCount - b.playerCount);
    const tablesToBreak = sortedTables
      .slice(0, tables.length - minTablesNeeded)
      .map(t => t.tableId);
    
    return { consolidate: true, tablesToBreak };
  }
  
  return { consolidate: false, tablesToBreak: [] };
}

// ==========================================
// PAYOUT STRUCTURE GENERATOR
// ==========================================

export function generatePayoutStructure(
  playerCount: number,
  prizePool: number
): { position: number; percentage: number; amount: number }[] {
  const payoutPercentages: Record<string, number[]> = {
    '2': [65, 35],
    '3': [50, 30, 20],
    '4': [45, 27, 18, 10],
    '5': [40, 25, 18, 10, 7],
    '6': [38, 23, 16, 11, 7, 5],
    '7-9': [35, 22, 15, 10, 7, 6, 5],
    '10-18': [30, 20, 14, 10, 8, 6, 5, 4, 3],
    '19-27': [28, 18, 12, 9, 7, 6, 5, 4, 3.5, 3, 2.5, 2],
    '28-45': [25, 16, 11, 8, 6, 5, 4.5, 4, 3.5, 3, 2.5, 2.5, 2, 2, 2, 1.5, 1.5],
    '46+': [22, 14, 10, 7, 5.5, 4.5, 4, 3.5, 3, 2.8, 2.6, 2.4, 2.2, 2, 1.8, 1.6, 1.5, 1.4, 1.3, 1.2, 1.1, 1, 1, 1, 0.9, 0.8, 0.8]
  };
  
  let percentages: number[];
  if (playerCount <= 2) percentages = payoutPercentages['2'];
  else if (playerCount <= 3) percentages = payoutPercentages['3'];
  else if (playerCount <= 4) percentages = payoutPercentages['4'];
  else if (playerCount <= 5) percentages = payoutPercentages['5'];
  else if (playerCount <= 6) percentages = payoutPercentages['6'];
  else if (playerCount <= 9) percentages = payoutPercentages['7-9'];
  else if (playerCount <= 18) percentages = payoutPercentages['10-18'];
  else if (playerCount <= 27) percentages = payoutPercentages['19-27'];
  else if (playerCount <= 45) percentages = payoutPercentages['28-45'];
  else percentages = payoutPercentages['46+'];
  
  const paidPositions = Math.min(
    Math.max(1, Math.floor(playerCount * 0.15)),
    percentages.length
  );
  
  const usedPercentages = percentages.slice(0, paidPositions);
  const sum = usedPercentages.reduce((a, b) => a + b, 0);
  const normalizedPercentages = usedPercentages.map(p => (p / sum) * 100);
  
  return normalizedPercentages.map((percentage, i) => ({
    position: i + 1,
    percentage,
    amount: Math.round(prizePool * percentage / 100)
  }));
}

// ==========================================
// RPS POOL CALCULATION
// ==========================================

/**
 * Calculate RPS pool from tournament entries
 * Formula: 1000₽ = 100 RPS points
 * Same as offline tournaments
 */
export function calculateRPSPool(
  participantCount: number,
  buyIn: number,
  totalRebuys: number = 0,
  rebuyCost: number = 0,
  totalAddons: number = 0,
  addonCost: number = 0
): number {
  const basePool = participantCount * buyIn;
  const rebuyPool = totalRebuys * rebuyCost;
  const addonPool = totalAddons * addonCost;
  const totalPool = basePool + rebuyPool + addonPool;
  
  // 1000₽ = 100 RPS points (divide by 10)
  return Math.round(totalPool / 10);
}

/**
 * Calculate prize pool with guaranteed minimum
 */
export function calculatePrizePool(
  participantCount: number,
  buyIn: number,
  totalRebuys: number = 0,
  rebuyCost: number = 0,
  totalAddons: number = 0,
  addonCost: number = 0,
  guaranteedPrizePool: number = 0
): number {
  const basePool = participantCount * buyIn;
  const rebuyPool = totalRebuys * rebuyCost;
  const addonPool = totalAddons * addonCost;
  const collectedPool = basePool + rebuyPool + addonPool;
  
  // Use guaranteed if it's higher
  return Math.max(collectedPool, guaranteedPrizePool);
}

/**
 * Generate RPS payout structure based on player count
 */
export function generateRPSPayoutStructure(
  playerCount: number,
  totalRPSPool: number
): { position: number; percentage: number; rpsPoints: number }[] {
  let percentages: number[];
  
  if (playerCount <= 6) {
    percentages = [65, 35];
  } else if (playerCount <= 18) {
    percentages = [50, 30, 20];
  } else if (playerCount <= 30) {
    percentages = [40, 25, 15, 12, 8];
  } else if (playerCount <= 50) {
    percentages = [34, 23, 16.5, 11.9, 8, 6.6];
  } else {
    percentages = [31.7, 20.7, 15.3, 10.8, 7.2, 5.8, 4.6, 3.9];
  }
  
  return percentages.map((percentage, i) => ({
    position: i + 1,
    percentage,
    rpsPoints: Math.round(totalRPSPool * percentage / 100)
  }));
}

// ==========================================
// REBUY/ADDON MANAGEMENT
// ==========================================

export interface RebuyRequest {
  playerId: string;
  currentChips: number;
  rebuyNumber: number;
}

export function canPlayerRebuy(
  request: RebuyRequest,
  config: TournamentConfig,
  currentLevel: number
): { allowed: boolean; reason?: string } {
  if (!config.rebuyAllowed) {
    return { allowed: false, reason: 'Rebuys not allowed in this tournament' };
  }
  
  if (currentLevel > config.rebuyEndLevel) {
    return { allowed: false, reason: `Rebuy period ended at level ${config.rebuyEndLevel}` };
  }
  
  if (request.currentChips > config.startingChips) {
    return { allowed: false, reason: 'Chips above starting stack' };
  }
  
  return { allowed: true };
}

export function canPlayerAddon(
  playerId: string,
  hasAddedOn: boolean,
  config: TournamentConfig,
  currentLevel: number
): { allowed: boolean; reason?: string } {
  if (!config.addonAllowed) {
    return { allowed: false, reason: 'Add-ons not allowed in this tournament' };
  }
  
  if (currentLevel !== config.addonLevel) {
    return { allowed: false, reason: `Add-on available only at level ${config.addonLevel}` };
  }
  
  if (hasAddedOn) {
    return { allowed: false, reason: 'Already used add-on' };
  }
  
  return { allowed: true };
}

// ==========================================
// TOURNAMENT CLOCK
// ==========================================

export interface TournamentClock {
  currentLevel: number;
  timeRemaining: number;
  isPaused: boolean;
  isBreak: boolean;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  nextLevelInfo: {
    smallBlind: number;
    bigBlind: number;
    ante: number;
    timeUntilNext: number;
  } | null;
}

export function getTournamentClock(state: TournamentState): TournamentClock {
  const currentBlindLevel = state.config.blindStructure.find(
    l => l.level === state.currentLevel && !l.isBreak
  ) || state.config.blindStructure[0];
  
  const nextLevel = state.config.blindStructure.find(
    l => l.level === state.currentLevel + 1 && !l.isBreak
  );
  
  return {
    currentLevel: state.currentLevel,
    timeRemaining: state.timeRemaining,
    isPaused: state.status === 'paused',
    isBreak: state.status === 'break',
    smallBlind: currentBlindLevel.smallBlind,
    bigBlind: currentBlindLevel.bigBlind,
    ante: currentBlindLevel.ante,
    nextLevelInfo: nextLevel ? {
      smallBlind: nextLevel.smallBlind,
      bigBlind: nextLevel.bigBlind,
      ante: nextLevel.ante,
      timeUntilNext: state.timeRemaining
    } : null
  };
}

export function advanceLevel(state: TournamentState): TournamentState {
  const nextLevelNum = state.currentLevel + 1;
  const nextLevel = state.config.blindStructure.find(l => l.level === nextLevelNum);
  
  if (!nextLevel) {
    return state;
  }
  
  return {
    ...state,
    currentLevel: nextLevelNum,
    timeRemaining: nextLevel.duration,
    levelStartTime: Date.now(),
    status: nextLevel.isBreak ? 'break' : state.status === 'break' ? 'running' : state.status
  };
}

// ==========================================
// SIT-N-GO PRESETS
// ==========================================

export type SitNGoType = 'regular' | 'turbo' | 'hyper' | 'heads_up' | 'triple_up' | 'fifty_fifty';

export interface SitNGoConfig {
  type: SitNGoType;
  playerCount: 2 | 3 | 6 | 9 | 10;
  buyIn: number;
  startingChips: number;
  blindStructure: TournamentBlindLevel[];
  payoutPercentages: number[];
}

export function getSitNGoPresets(): Record<SitNGoType, Partial<SitNGoConfig>> {
  return {
    regular: {
      type: 'regular',
      startingChips: 1500,
      blindStructure: generateBlindStructure(20, 15, 600),
      payoutPercentages: [50, 30, 20]
    },
    turbo: {
      type: 'turbo',
      startingChips: 1500,
      blindStructure: generateTurboBlindStructure(),
      payoutPercentages: [50, 30, 20]
    },
    hyper: {
      type: 'hyper',
      startingChips: 500,
      blindStructure: generateHyperTurboBlindStructure(),
      payoutPercentages: [65, 35]
    },
    heads_up: {
      type: 'heads_up',
      playerCount: 2,
      startingChips: 1500,
      blindStructure: generateHyperTurboBlindStructure(),
      payoutPercentages: [100]
    },
    triple_up: {
      type: 'triple_up',
      playerCount: 9,
      startingChips: 1500,
      blindStructure: generateTurboBlindStructure(),
      payoutPercentages: [33.33, 33.33, 33.33]
    },
    fifty_fifty: {
      type: 'fifty_fifty',
      playerCount: 10,
      startingChips: 1500,
      blindStructure: generateTurboBlindStructure(),
      payoutPercentages: [20, 20, 20, 20, 20]
    }
  };
}

// ==========================================
// TOURNAMENT STATISTICS
// ==========================================

export interface TournamentStats {
  totalPlayers: number;
  remainingPlayers: number;
  eliminatedPlayers: number;
  averageStack: number;
  medianStack: number;
  biggestStack: { playerId: string; chips: number };
  smallestStack: { playerId: string; chips: number };
  prizePool: number;
  totalRebuys: number;
  totalAddons: number;
  handsPlayed: number;
  duration: number;
  currentLevel: number;
  avgBBs: number;
}

export function calculateTournamentStats(state: TournamentState): TournamentStats {
  const activePlayers = state.players.filter(p => p.status === 'playing');
  const stacks = activePlayers.map(p => p.chips).sort((a, b) => b - a);
  
  const totalChips = stacks.reduce((a, b) => a + b, 0);
  const avgStack = stacks.length > 0 ? Math.round(totalChips / stacks.length) : 0;
  const medianStack = stacks.length > 0 
    ? stacks[Math.floor(stacks.length / 2)] 
    : 0;
  
  const currentBlind = state.config.blindStructure.find(
    l => l.level === state.currentLevel
  );
  const currentBB = currentBlind?.bigBlind || 1;
  
  const biggest = activePlayers.reduce(
    (max, p) => p.chips > max.chips ? p : max,
    { playerId: '', chips: 0, name: '' }
  );
  
  const smallest = activePlayers.reduce(
    (min, p) => p.chips < min.chips || min.chips === 0 ? p : min,
    { playerId: '', chips: Infinity, name: '' }
  );
  
  const duration = state.startedAt 
    ? (state.finishedAt || Date.now()) - state.startedAt 
    : 0;
  
  return {
    totalPlayers: state.players.length,
    remainingPlayers: activePlayers.length,
    eliminatedPlayers: state.players.filter(p => p.status === 'eliminated').length,
    averageStack: avgStack,
    medianStack,
    biggestStack: { playerId: biggest.playerId, chips: biggest.chips },
    smallestStack: { playerId: smallest.playerId, chips: smallest.chips === Infinity ? 0 : smallest.chips },
    prizePool: state.prizePool,
    totalRebuys: state.totalRebuys,
    totalAddons: state.totalAddons,
    handsPlayed: state.handsPlayed,
    duration: Math.round(duration / 1000),
    currentLevel: state.currentLevel,
    avgBBs: Math.round(avgStack / currentBB)
  };
}

// ==========================================
// DATABASE TO CONFIG CONVERTER
// ==========================================

/**
 * Create TournamentConfig from database record
 */
export function createConfigFromDatabase(dbTournament: {
  id: string;
  name: string;
  buy_in: number;
  starting_chips: number;
  max_players: number;
  min_players: number;
  level_duration: number | null;
  tournament_format?: string;
  rebuy_enabled?: boolean;
  rebuy_cost?: number;
  rebuy_chips?: number;
  rebuy_end_level?: number;
  addon_enabled?: boolean;
  addon_cost?: number;
  addon_chips?: number;
  addon_level?: number;
  late_registration_enabled?: boolean;
  late_registration_level?: number;
  tickets_for_top?: number;
  ticket_value?: number;
  break_interval?: number;
  break_duration?: number;
  guaranteed_prize_pool?: number;
  time_bank_initial?: number;
  time_bank_per_level?: number;
  action_time_seconds?: number;
  scheduled_start_at?: string | null;
  auto_start?: boolean;
}): TournamentConfig {
  const levelDuration = dbTournament.level_duration || 300;
  const breakInterval = dbTournament.break_interval || 0;
  
  return {
    id: dbTournament.id,
    name: dbTournament.name,
    gameType: 'texas_holdem' as PokerGameType,
    startingChips: dbTournament.starting_chips,
    maxPlayers: dbTournament.max_players,
    minPlayers: dbTournament.min_players,
    buyIn: dbTournament.buy_in,
    // Rebuy settings
    rebuyAllowed: dbTournament.rebuy_enabled || false,
    rebuyEndLevel: dbTournament.rebuy_end_level || 0,
    rebuyChips: dbTournament.rebuy_chips || 0,
    rebuyCost: dbTournament.rebuy_cost || 0,
    // Addon settings
    addonAllowed: dbTournament.addon_enabled || false,
    addonLevel: dbTournament.addon_level || 0,
    addonChips: dbTournament.addon_chips || 0,
    addonCost: dbTournament.addon_cost || 0,
    // Structure
    blindStructure: generateBlindStructure(50, 20, levelDuration, true, breakInterval),
    payoutStructure: [],
    lateRegistrationLevel: dbTournament.late_registration_level || 6,
    actionTimeSeconds: dbTournament.action_time_seconds || 30,
    timeBankSeconds: dbTournament.time_bank_initial || 30,
    timeBankPerLevel: dbTournament.time_bank_per_level || 5,
    tablesCount: Math.ceil(dbTournament.max_players / 9),
    playersPerTable: Math.min(9, dbTournament.max_players),
    // Extended
    tournamentFormat: (dbTournament.tournament_format || 'freezeout') as 'freezeout' | 'rebuy' | 'knockout' | 'bounty',
    ticketsForTop: dbTournament.tickets_for_top || 3,
    ticketValue: dbTournament.ticket_value || 1000,
    breakInterval: dbTournament.break_interval || 0,
    breakDuration: dbTournament.break_duration || 300,
    guaranteedPrizePool: dbTournament.guaranteed_prize_pool || 0,
    scheduledStartAt: dbTournament.scheduled_start_at || null,
    autoStart: dbTournament.auto_start || false
  };
}

// ==========================================
// TOURNAMENT MANAGER CLASS
// ==========================================

export class TournamentManager {
  private tournaments: Map<string, TournamentState> = new Map();
  private timerIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  /**
   * Create tournament from database record
   */
  createFromDatabase(dbTournament: Parameters<typeof createConfigFromDatabase>[0]): TournamentState {
    const config = createConfigFromDatabase(dbTournament);
    return this.createTournament(config);
  }
  
  /**
   * Create tournament from database record with custom blind levels from DB
   */
  createFromDatabaseWithLevels(
    dbTournament: Parameters<typeof createConfigFromDatabase>[0],
    blindLevels?: TournamentBlindLevel[]
  ): TournamentState {
    const config = createConfigFromDatabase(dbTournament);
    
    // Override blind structure if provided from database
    if (blindLevels && blindLevels.length > 0) {
      config.blindStructure = blindLevels;
      logger.info('Using custom blind structure from DB', {
        tournamentId: config.id,
        levels: blindLevels.length,
        firstLevel: blindLevels[0]
      });
    }
    
    return this.createTournament(config);
  }
  
  createTournament(config: TournamentConfig): TournamentState {
    // Apply guaranteed prize pool if set
    const initialPrizePool = config.guaranteedPrizePool || 0;
    
    const state: TournamentState = {
      config,
      status: 'registering',
      currentLevel: 1,
      levelStartTime: 0,
      timeRemaining: config.blindStructure[0]?.duration || 900,
      players: [],
      tables: [],
      prizePool: initialPrizePool,
      totalRebuys: 0,
      totalAddons: 0,
      startedAt: null,
      pausedAt: null,
      finishedAt: null,
      handsPlayed: 0
    };
    
    this.tournaments.set(config.id, state);
    logger.info('Tournament created', { 
      tournamentId: config.id, 
      name: config.name,
      format: config.tournamentFormat,
      ticketsForTop: config.ticketsForTop,
      ticketValue: config.ticketValue,
      guaranteedPool: config.guaranteedPrizePool
    });
    
    return state;
  }
  
  registerPlayer(tournamentId: string, playerId: string, name: string): { success: boolean; error?: string } {
    const state = this.tournaments.get(tournamentId);
    if (!state) return { success: false, error: 'Tournament not found' };
    
    if (state.status !== 'registering') {
      const canLateReg = state.currentLevel <= state.config.lateRegistrationLevel;
      if (!canLateReg) {
        return { success: false, error: 'Registration closed' };
      }
    }
    
    if (state.players.length >= state.config.maxPlayers) {
      return { success: false, error: 'Tournament is full' };
    }
    
    if (state.players.some(p => p.playerId === playerId)) {
      return { success: false, error: 'Already registered' };
    }
    
    const player: TournamentPlayer = {
      playerId,
      name,
      chips: state.config.startingChips,
      tableId: null,
      seatNumber: null,
      status: 'registered',
      rebuys: 0,
      addons: 0,
      finishPosition: null,
      eliminatedAt: null,
      prize: 0
    };
    
    state.players.push(player);
    state.prizePool += state.config.buyIn;
    
    logger.info('Player registered', { tournamentId, playerId, name });
    
    return { success: true };
  }
  
  startTournament(tournamentId: string): { success: boolean; error?: string } {
    const state = this.tournaments.get(tournamentId);
    if (!state) return { success: false, error: 'Tournament not found' };
    
    if (state.players.length < state.config.minPlayers) {
      return { success: false, error: `Need at least ${state.config.minPlayers} players` };
    }
    
    // Assign players to tables
    this.assignPlayersToTables(state);
    
    state.status = 'running';
    state.startedAt = Date.now();
    state.levelStartTime = Date.now();
    state.players.forEach(p => p.status = 'playing');
    
    // Start timer
    this.startTimer(tournamentId);
    
    logger.info('Tournament started', { tournamentId, players: state.players.length });
    
    return { success: true };
  }
  
  /**
   * Assign players to tables using cryptographically secure shuffle
   * PROFESSIONAL: Uses crypto.getRandomValues() equivalent for tournament integrity
   */
  private assignPlayersToTables(state: TournamentState): void {
    const playersPerTable = state.config.playersPerTable;
    const tablesNeeded = Math.ceil(state.players.length / playersPerTable);
    
    // Create tables
    for (let i = 0; i < tablesNeeded; i++) {
      state.tables.push({
        id: `table-${i + 1}`,
        tableNumber: i + 1,
        seats: new Array(playersPerTable).fill(null),
        currentHandId: null,
        status: 'waiting'
      });
    }
    
    // PROFESSIONAL: Cryptographically secure Fisher-Yates shuffle
    // Using crypto.randomBytes for tournament-grade randomness
    const shuffledPlayers = [...state.players];
    for (let i = shuffledPlayers.length - 1; i > 0; i--) {
      // Secure random number generation
      const j = this.secureRandomInt(i + 1);
      [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
    }
    
    // Balanced assignment: distribute players evenly across tables
    // This ensures no table has 2+ more players than another
    for (let i = 0; i < shuffledPlayers.length; i++) {
      const tableIndex = i % tablesNeeded;
      const seatIndex = Math.floor(i / tablesNeeded);
      
      const table = state.tables[tableIndex];
      const player = shuffledPlayers[i];
      
      table.seats[seatIndex] = player.playerId;
      player.tableId = table.id;
      player.seatNumber = seatIndex;
    }
    
    logger.info('Players assigned to tables (secure shuffle)', {
      totalPlayers: state.players.length,
      tablesCreated: tablesNeeded,
      playersPerTable: state.tables.map(t => t.seats.filter(s => s !== null).length)
    });
  }
  
  /**
   * Cryptographically secure random integer in range [0, max)
   * Uses rejection sampling to eliminate modulo bias
   */
  private secureRandomInt(max: number): number {
    if (max <= 0) return 0;
    if (max === 1) return 0;
    
    // Use Node.js crypto for secure randomness
    const crypto = require('crypto');
    const bitsNeeded = Math.ceil(Math.log2(max));
    const bytesNeeded = Math.ceil(bitsNeeded / 8);
    const mask = (1 << bitsNeeded) - 1;
    const maxValid = mask - ((mask + 1) % max);
    
    let result: number;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      const bytes = crypto.randomBytes(bytesNeeded);
      result = 0;
      for (let i = 0; i < bytesNeeded; i++) {
        result = (result << 8) | bytes[i];
      }
      result &= mask;
      attempts++;
    } while (result > maxValid && attempts < maxAttempts);
    
    return result % max;
  }
  
  private startTimer(tournamentId: string): void {
    const interval = setInterval(() => {
      const state = this.tournaments.get(tournamentId);
      if (!state || state.status !== 'running') {
        clearInterval(interval);
        return;
      }
      
      state.timeRemaining--;
      
      if (state.timeRemaining <= 0) {
        const newState = advanceLevel(state);
        this.tournaments.set(tournamentId, newState);
        logger.info('Level advanced', { tournamentId, level: newState.currentLevel });
      }
    }, 1000);
    
    this.timerIntervals.set(tournamentId, interval);
  }
  
  pauseTournament(tournamentId: string): { success: boolean } {
    const state = this.tournaments.get(tournamentId);
    if (!state) return { success: false };
    
    state.status = 'paused';
    state.pausedAt = Date.now();
    
    const interval = this.timerIntervals.get(tournamentId);
    if (interval) clearInterval(interval);
    
    return { success: true };
  }
  
  resumeTournament(tournamentId: string): { success: boolean } {
    const state = this.tournaments.get(tournamentId);
    if (!state) return { success: false };
    
    state.status = 'running';
    state.pausedAt = null;
    
    this.startTimer(tournamentId);
    
    return { success: true };
  }
  
  /**
   * Eliminate player from tournament
   * PROFESSIONAL: Handles table balancing, prize calculation, and heads-up transition
   */
  eliminatePlayer(tournamentId: string, playerId: string, eliminatedBy?: string): { 
    success: boolean; 
    position?: number;
    prize?: number;
    needsTableBalance?: boolean;
  } {
    const state = this.tournaments.get(tournamentId);
    if (!state) return { success: false };
    
    const player = state.players.find(p => p.playerId === playerId);
    if (!player) return { success: false };
    
    // Already eliminated?
    if (player.status === 'eliminated' || player.status === 'winner') {
      return { success: false };
    }
    
    const remainingPlayers = state.players.filter(p => p.status === 'playing').length;
    const position = remainingPlayers;
    
    player.status = 'eliminated';
    player.finishPosition = position;
    player.eliminatedAt = Date.now();
    player.chips = 0;
    
    // Remove from table seat
    if (player.tableId && player.seatNumber !== null) {
      const table = state.tables.find(t => t.id === player.tableId);
      if (table && table.seats[player.seatNumber] === playerId) {
        table.seats[player.seatNumber] = null;
      }
    }
    player.tableId = null;
    player.seatNumber = null;
    
    // Calculate prize if in the money
    const payout = state.config.payoutStructure.find(p => p.position === position);
    if (payout) {
      player.prize = Math.round(state.prizePool * payout.percentage / 100);
    }
    
    // Get remaining playing count
    const playingPlayers = state.players.filter(p => p.status === 'playing');
    
    // Check for various end conditions
    if (playingPlayers.length === 1) {
      // Winner!
      const winner = playingPlayers[0];
      winner.status = 'winner';
      winner.finishPosition = 1;
      const winnerPayout = state.config.payoutStructure.find(p => p.position === 1);
      if (winnerPayout) {
        winner.prize = Math.round(state.prizePool * winnerPayout.percentage / 100);
      }
      
      state.status = 'completed';
      state.finishedAt = Date.now();
      
      const interval = this.timerIntervals.get(tournamentId);
      if (interval) clearInterval(interval);
      
      logger.info('Tournament completed - winner determined', { 
        tournamentId, 
        winnerId: winner.playerId,
        winnerPrize: winner.prize
      });
    } else if (playingPlayers.length === 2) {
      // Heads up!
      state.status = 'heads_up';
      logger.info('Tournament heads-up', { tournamentId });
    } else if (playingPlayers.length <= state.config.playersPerTable && state.tables.length > 1) {
      // Final table consolidation needed
      state.status = 'final_table';
      logger.info('Final table reached', { tournamentId, players: playingPlayers.length });
    }
    
    // Check if table balancing is needed
    const needsTableBalance = this.checkTableBalance(state);
    
    logger.info('Player eliminated', { 
      tournamentId, 
      playerId, 
      position,
      prize: player.prize,
      remainingPlayers: playingPlayers.length,
      needsTableBalance
    });
    
    return { 
      success: true, 
      position,
      prize: player.prize,
      needsTableBalance
    };
  }
  
  /**
   * Check if tables need balancing
   */
  private checkTableBalance(state: TournamentState): boolean {
    if (state.tables.length <= 1) return false;
    
    const tableCounts = state.tables.map(t => 
      t.seats.filter(s => s !== null).length
    );
    
    const maxCount = Math.max(...tableCounts);
    const minCount = Math.min(...tableCounts);
    
    // Balance needed if difference > 1
    return maxCount - minCount > 1;
  }
  
  /**
   * Process rebuy for a player
   */
  processRebuy(tournamentId: string, playerId: string): { success: boolean; error?: string } {
    const state = this.tournaments.get(tournamentId);
    if (!state) return { success: false, error: 'Tournament not found' };
    
    const player = state.players.find(p => p.playerId === playerId);
    if (!player) return { success: false, error: 'Player not found' };
    
    const result = canPlayerRebuy(
      { playerId, currentChips: player.chips, rebuyNumber: player.rebuys + 1 },
      state.config,
      state.currentLevel
    );
    
    if (!result.allowed) {
      return { success: false, error: result.reason };
    }
    
    player.chips += state.config.rebuyChips;
    player.rebuys++;
    state.totalRebuys++;
    state.prizePool += state.config.rebuyCost;
    
    logger.info('Rebuy processed', { tournamentId, playerId, newChips: player.chips });
    
    return { success: true };
  }
  
  /**
   * Process addon for a player
   */
  processAddon(tournamentId: string, playerId: string): { success: boolean; error?: string } {
    const state = this.tournaments.get(tournamentId);
    if (!state) return { success: false, error: 'Tournament not found' };
    
    const player = state.players.find(p => p.playerId === playerId);
    if (!player) return { success: false, error: 'Player not found' };
    
    const result = canPlayerAddon(playerId, player.addons > 0, state.config, state.currentLevel);
    
    if (!result.allowed) {
      return { success: false, error: result.reason };
    }
    
    player.chips += state.config.addonChips;
    player.addons++;
    state.totalAddons++;
    state.prizePool += state.config.addonCost;
    
    logger.info('Addon processed', { tournamentId, playerId, newChips: player.chips });
    
    return { success: true };
  }
  
  getTournament(tournamentId: string): TournamentState | undefined {
    return this.tournaments.get(tournamentId);
  }
  
  getStats(tournamentId: string): TournamentStats | null {
    const state = this.tournaments.get(tournamentId);
    if (!state) return null;
    return calculateTournamentStats(state);
  }
  
  getClock(tournamentId: string): TournamentClock | null {
    const state = this.tournaments.get(tournamentId);
    if (!state) return null;
    return getTournamentClock(state);
  }
  
  /**
   * Get count of active tournaments
   */
  getTournamentCount(): number {
    return this.tournaments.size;
  }
  
  /**
   * Get count of active (running) tournaments
   */
  getActiveTournamentCount(): number {
    let count = 0;
    for (const state of this.tournaments.values()) {
      if (state.status === 'running' || state.status === 'break' || state.status === 'final_table' || state.status === 'heads_up') {
        count++;
      }
    }
    return count;
  }
  
  /**
   * Get IDs of active tournaments
   */
  getActiveTournamentIds(): string[] {
    const ids: string[] = [];
    for (const [id, state] of this.tournaments.entries()) {
      if (state.status === 'running' || state.status === 'break' || state.status === 'final_table' || state.status === 'heads_up') {
        ids.push(id);
      }
    }
    return ids;
  }
  
  shutdown(): void {
    for (const interval of this.timerIntervals.values()) {
      clearInterval(interval);
    }
    this.timerIntervals.clear();
    logger.info('TournamentManager shutdown complete');
  }
}
