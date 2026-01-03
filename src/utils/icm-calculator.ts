/**
 * ICM (Independent Chip Model) Calculator
 * 
 * Calculates equity distribution based on chip stacks and payout structure.
 * Supports multiple deal types: ICM, Chip Chop, and Equal Deal.
 */

export interface PlayerStack {
  playerId: string;
  playerName: string;
  chips: number;
}

export interface PayoutPosition {
  position: number;
  amount: number;
  percentage: number;
}

export interface ICMResult {
  playerId: string;
  playerName: string;
  chips: number;
  chipPercentage: number;
  icmEquity: number;
  icmAmount: number;
  chipChopAmount: number;
  equalAmount: number;
  currentPrize: number; // If they finished in their current position
}

export interface DealResult {
  players: ICMResult[];
  totalPrizePool: number;
  remainingPrizePool: number; // Excluding already paid positions
  dealType: 'icm' | 'chip_chop' | 'equal';
  savedForWinner: number; // Amount saved for 1st place incentive
}

/**
 * Calculate ICM equity for all players
 * Uses Malmuth-Harville formula
 */
function calculateICMEquity(
  stacks: number[],
  payouts: number[]
): number[] {
  const n = stacks.length;
  const totalChips = stacks.reduce((sum, s) => sum + s, 0);
  
  if (totalChips === 0 || n === 0) {
    return stacks.map(() => 0);
  }

  // Normalize stacks to probabilities
  const probs = stacks.map(s => s / totalChips);
  
  // ICM recursive calculation
  const equity = new Array(n).fill(0);
  
  // For each payout position
  const maxPositions = Math.min(n, payouts.length);
  
  function calculatePositionEquity(
    remainingPlayers: Set<number>,
    remainingProbs: number[],
    position: number
  ): Map<number, number> {
    const result = new Map<number, number>();
    
    if (position > maxPositions || remainingPlayers.size === 0) {
      return result;
    }

    const payout = payouts[position - 1] || 0;
    const totalRemainingProb = Array.from(remainingPlayers)
      .reduce((sum, i) => sum + remainingProbs[i], 0);

    if (totalRemainingProb === 0) {
      return result;
    }

    for (const playerIndex of remainingPlayers) {
      const probWinPosition = remainingProbs[playerIndex] / totalRemainingProb;
      
      // Add equity for winning this position
      result.set(playerIndex, (result.get(playerIndex) || 0) + probWinPosition * payout);
      
      // Calculate equity for lower positions
      if (position < maxPositions) {
        const newRemaining = new Set(remainingPlayers);
        newRemaining.delete(playerIndex);
        
        const newProbs = [...remainingProbs];
        newProbs[playerIndex] = 0;
        
        const lowerEquity = calculatePositionEquity(newRemaining, newProbs, position + 1);
        
        for (const [pi, eq] of lowerEquity) {
          result.set(pi, (result.get(pi) || 0) + probWinPosition * eq);
        }
      }
    }

    return result;
  }

  // Start calculation from position 1
  const allPlayers = new Set(Array.from({ length: n }, (_, i) => i));
  const equityMap = calculatePositionEquity(allPlayers, probs, 1);

  for (const [index, eq] of equityMap) {
    equity[index] = eq;
  }

  return equity;
}

/**
 * Calculate ICM equity using Monte Carlo simulation for larger fields
 * More accurate for 7+ players
 */
function calculateICMMonteCarloEquity(
  stacks: number[],
  payouts: number[],
  iterations: number = 10000
): number[] {
  const n = stacks.length;
  const totalChips = stacks.reduce((sum, s) => sum + s, 0);
  
  if (totalChips === 0 || n === 0) {
    return stacks.map(() => 0);
  }

  const probs = stacks.map(s => s / totalChips);
  const equity = new Array(n).fill(0);
  const maxPositions = Math.min(n, payouts.length);

  for (let iter = 0; iter < iterations; iter++) {
    // Simulate one tournament outcome
    const remaining = new Set(Array.from({ length: n }, (_, i) => i));
    const currentProbs = [...probs];
    
    for (let pos = 0; pos < maxPositions && remaining.size > 0; pos++) {
      // Pick winner of this position based on chip probability
      const totalProb = Array.from(remaining)
        .reduce((sum, i) => sum + currentProbs[i], 0);
      
      let random = Math.random() * totalProb;
      let winner = -1;
      
      for (const i of remaining) {
        random -= currentProbs[i];
        if (random <= 0) {
          winner = i;
          break;
        }
      }
      
      if (winner === -1) {
        winner = Array.from(remaining)[0];
      }
      
      // Award payout to winner
      equity[winner] += payouts[pos] || 0;
      
      // Remove from remaining
      remaining.delete(winner);
      currentProbs[winner] = 0;
    }
  }

  // Average over iterations
  return equity.map(e => e / iterations);
}

/**
 * Main ICM deal calculator
 */
export function calculateDeal(
  players: PlayerStack[],
  payouts: PayoutPosition[],
  dealType: 'icm' | 'chip_chop' | 'equal' = 'icm',
  saveForWinnerPercent: number = 0 // Percentage of 1st place to save for incentive
): DealResult {
  const totalPrizePool = payouts.reduce((sum, p) => sum + p.amount, 0);
  const totalChips = players.reduce((sum, p) => sum + p.chips, 0);
  const n = players.length;

  if (n === 0 || totalPrizePool === 0) {
    return {
      players: [],
      totalPrizePool,
      remainingPrizePool: totalPrizePool,
      dealType,
      savedForWinner: 0
    };
  }

  // Calculate saved for winner incentive
  const firstPlacePayout = payouts.find(p => p.position === 1)?.amount || 0;
  const savedForWinner = Math.floor(firstPlacePayout * (saveForWinnerPercent / 100));
  const distributablePool = totalPrizePool - savedForWinner;

  // Sort players by chips (descending)
  const sortedPlayers = [...players].sort((a, b) => b.chips - a.chips);
  
  // Get payout amounts (sorted by position)
  const sortedPayouts = [...payouts]
    .sort((a, b) => a.position - b.position)
    .map(p => p.amount);

  // Adjust first place payout for saved amount
  if (sortedPayouts.length > 0 && saveForWinnerPercent > 0) {
    sortedPayouts[0] = sortedPayouts[0] - savedForWinner;
  }

  // Calculate ICM equity
  const stacks = sortedPlayers.map(p => p.chips);
  const icmEquity = n <= 6
    ? calculateICMEquity(stacks, sortedPayouts)
    : calculateICMMonteCarloEquity(stacks, sortedPayouts);

  // Calculate chip chop amounts
  const chipChopAmounts = sortedPlayers.map(p => 
    Math.floor((p.chips / totalChips) * distributablePool)
  );

  // Calculate equal amounts
  const equalAmount = Math.floor(distributablePool / n);
  const equalAmounts = new Array(n).fill(equalAmount);

  // Build results
  const results: ICMResult[] = sortedPlayers.map((player, index) => {
    const chipPercentage = (player.chips / totalChips) * 100;
    const icmAmount = Math.floor(icmEquity[index]);
    
    // Current prize if they finished in position index + 1
    const currentPrize = sortedPayouts[index] || 0;

    return {
      playerId: player.playerId,
      playerName: player.playerName,
      chips: player.chips,
      chipPercentage,
      icmEquity: (icmEquity[index] / distributablePool) * 100,
      icmAmount,
      chipChopAmount: chipChopAmounts[index],
      equalAmount: equalAmounts[index],
      currentPrize
    };
  });

  return {
    players: results,
    totalPrizePool,
    remainingPrizePool: distributablePool,
    dealType,
    savedForWinner
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Calculate minimum guaranteed amount for each player
 * This is the worst-case scenario if they bust immediately
 */
export function calculateMinGuaranteed(
  players: PlayerStack[],
  payouts: PayoutPosition[]
): Map<string, number> {
  const result = new Map<string, number>();
  const n = players.length;
  
  // Sort by chips descending
  const sorted = [...players].sort((a, b) => b.chips - a.chips);
  
  // Last position gets last place money
  const sortedPayouts = [...payouts]
    .sort((a, b) => a.position - b.position)
    .map(p => p.amount);

  sorted.forEach((player, index) => {
    // Worst case is if everyone above them stays and they bust
    // Their minimum is the Nth place payout
    const worstPosition = n;
    const minPayout = sortedPayouts[worstPosition - 1] || 0;
    result.set(player.playerId, minPayout);
  });

  return result;
}

/**
 * Validate deal amounts
 */
export function validateDeal(
  results: ICMResult[],
  totalPool: number
): { valid: boolean; error?: string } {
  const totalDistributed = results.reduce((sum, r) => sum + r.icmAmount, 0);
  
  // Allow small rounding error
  if (Math.abs(totalDistributed - totalPool) > results.length) {
    return {
      valid: false,
      error: `Сумма выплат (${formatCurrency(totalDistributed)}) не совпадает с призовым фондом (${formatCurrency(totalPool)})`
    };
  }

  // Check no negative amounts
  for (const r of results) {
    if (r.icmAmount < 0) {
      return {
        valid: false,
        error: `Отрицательная выплата для ${r.playerName}`
      };
    }
  }

  return { valid: true };
}
