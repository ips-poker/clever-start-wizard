// ==========================================
// SIDE POT CALCULATOR - Professional Grade
// ==========================================

export interface PlayerContribution {
  playerId: string;
  totalBet: number;
  isFolded: boolean;
  isAllIn: boolean;
  stack: number; // Remaining stack after all bets
  seatNumber?: number;
  playerName?: string;
}

export interface SidePot {
  amount: number;
  eligiblePlayers: string[]; // Player IDs who can win this pot
  contributors: string[]; // Player IDs who contributed to this pot
  isMain?: boolean;
  cappedAt?: number; // The bet level this pot is capped at
}

export interface PotResult {
  mainPot: SidePot;
  sidePots: SidePot[];
  totalPot: number;
  deadMoney: number; // Money from folded players
}

/**
 * Рассчитывает основной и побочные банки - Professional implementation
 * 
 * Algorithm:
 * 1. Sort players by bet amount
 * 2. For each unique bet level from all-in players, create a pot
 * 3. Folded players contribute but cannot win
 * 4. Handle edge cases like multiple all-ins at different levels
 */
export function calculateSidePots(contributions: PlayerContribution[]): PotResult {
  if (contributions.length === 0) {
    return {
      mainPot: { amount: 0, eligiblePlayers: [], contributors: [], isMain: true },
      sidePots: [],
      totalPot: 0,
      deadMoney: 0
    };
  }

  // Filter out players with no bets
  const activeBettors = contributions.filter(c => c.totalBet > 0);
  
  if (activeBettors.length === 0) {
    return {
      mainPot: { amount: 0, eligiblePlayers: [], contributors: [], isMain: true },
      sidePots: [],
      totalPot: 0,
      deadMoney: 0
    };
  }

  // Sort by bet amount (ascending)
  const sortedContributions = [...activeBettors].sort((a, b) => a.totalBet - b.totalBet);
  
  // Get all-in levels (unique bet amounts from all-in players)
  const allInLevels = new Set<number>();
  for (const c of sortedContributions) {
    if (c.isAllIn && c.totalBet > 0) {
      allInLevels.add(c.totalBet);
    }
  }
  
  // Add the max bet as a level
  const maxBet = Math.max(...sortedContributions.map(c => c.totalBet));
  allInLevels.add(maxBet);
  
  // Sort levels
  const levels = Array.from(allInLevels).sort((a, b) => a - b);
  
  const pots: SidePot[] = [];
  let previousLevel = 0;
  let deadMoney = 0;
  
  for (const level of levels) {
    const increment = level - previousLevel;
    if (increment <= 0) continue;
    
    let potAmount = 0;
    const contributors: string[] = [];
    const eligiblePlayers: string[] = [];
    
    for (const contribution of sortedContributions) {
      // Check if player contributed at this level
      if (contribution.totalBet > previousLevel) {
        const contributionAtLevel = Math.min(
          contribution.totalBet - previousLevel,
          increment
        );
        potAmount += contributionAtLevel;
        contributors.push(contribution.playerId);
        
        // Only non-folded players with enough bet can win
        // Player can win if they bet at least up to this level OR they're all-in at exactly this level
        const canWin = !contribution.isFolded && (
          contribution.totalBet >= level ||
          (contribution.isAllIn && contribution.totalBet === level)
        );
        
        if (canWin && !eligiblePlayers.includes(contribution.playerId)) {
          eligiblePlayers.push(contribution.playerId);
        }
        
        // Track dead money from folded players
        if (contribution.isFolded) {
          deadMoney += contributionAtLevel;
        }
      }
    }
    
    if (potAmount > 0) {
      pots.push({
        amount: potAmount,
        eligiblePlayers,
        contributors,
        isMain: pots.length === 0,
        cappedAt: level
      });
    }
    
    previousLevel = level;
  }
  
  // First pot is main, rest are side pots
  const [mainPot, ...sidePots] = pots;
  const totalPot = pots.reduce((sum, pot) => sum + pot.amount, 0);
  
  // Mark main pot
  if (mainPot) {
    mainPot.isMain = true;
  }
  
  return {
    mainPot: mainPot || { amount: 0, eligiblePlayers: [], contributors: [], isMain: true },
    sidePots,
    totalPot,
    deadMoney
  };
}

/**
 * Распределяет выигрыши по банкам
 */
export interface WinnerInfo {
  playerId: string;
  handValue: number; // Числовое значение комбинации для сравнения
  handRank?: string; // Optional hand name
  seatNumber?: number;
}

export interface PotWinner {
  potType: 'main' | 'side';
  potIndex: number;
  potAmount: number;
  winners: string[];
  amountPerWinner: number;
  remainder: number; // Odd chips
  handRank?: string;
}

export interface DistributionResult {
  potWinners: PotWinner[];
  playerWinnings: Map<string, number>;
  totalDistributed: number;
}

export function distributePots(
  potResult: PotResult,
  winners: WinnerInfo[]
): DistributionResult {
  const potWinners: PotWinner[] = [];
  const playerWinnings = new Map<string, number>();
  let totalDistributed = 0;
  
  // Initialize all eligible players with 0 winnings
  const allEligible = new Set([
    ...potResult.mainPot.eligiblePlayers,
    ...potResult.sidePots.flatMap(sp => sp.eligiblePlayers)
  ]);
  allEligible.forEach(id => playerWinnings.set(id, 0));
  
  // Function to determine winners for a pot
  const determineWinnersForPot = (pot: SidePot): WinnerInfo[] => {
    // Filter to only eligible players
    const eligibleWinners = winners.filter(w => pot.eligiblePlayers.includes(w.playerId));
    
    if (eligibleWinners.length === 0) return [];
    
    // Find maximum hand value
    const maxValue = Math.max(...eligibleWinners.map(w => w.handValue));
    
    // Return all with max value (for split pot)
    return eligibleWinners.filter(w => w.handValue === maxValue);
  };
  
  // Distribute main pot
  if (potResult.mainPot.amount > 0) {
    const mainWinners = determineWinnersForPot(potResult.mainPot);
    if (mainWinners.length > 0) {
      const amountPerWinner = Math.floor(potResult.mainPot.amount / mainWinners.length);
      const remainder = potResult.mainPot.amount % mainWinners.length;
      
      potWinners.push({
        potType: 'main',
        potIndex: 0,
        potAmount: potResult.mainPot.amount,
        winners: mainWinners.map(w => w.playerId),
        amountPerWinner,
        remainder,
        handRank: mainWinners[0]?.handRank
      });
      
      // Track individual winnings
      mainWinners.forEach((w, i) => {
        // First player gets odd chips
        const extra = i === 0 ? remainder : 0;
        const current = playerWinnings.get(w.playerId) || 0;
        playerWinnings.set(w.playerId, current + amountPerWinner + extra);
      });
      
      totalDistributed += potResult.mainPot.amount;
    }
  }
  
  // Distribute side pots
  potResult.sidePots.forEach((pot, index) => {
    if (pot.amount > 0) {
      const sideWinners = determineWinnersForPot(pot);
      if (sideWinners.length > 0) {
        const amountPerWinner = Math.floor(pot.amount / sideWinners.length);
        const remainder = pot.amount % sideWinners.length;
        
        potWinners.push({
          potType: 'side',
          potIndex: index + 1,
          potAmount: pot.amount,
          winners: sideWinners.map(w => w.playerId),
          amountPerWinner,
          remainder,
          handRank: sideWinners[0]?.handRank
        });
        
        // Track individual winnings
        sideWinners.forEach((w, i) => {
          const extra = i === 0 ? remainder : 0;
          const current = playerWinnings.get(w.playerId) || 0;
          playerWinnings.set(w.playerId, current + amountPerWinner + extra);
        });
        
        totalDistributed += pot.amount;
      }
    }
  });
  
  return {
    potWinners,
    playerWinnings,
    totalDistributed
  };
}

/**
 * Quick helper to check if side pots exist
 */
export function hasSidePots(contributions: PlayerContribution[]): boolean {
  const allInPlayers = contributions.filter(c => c.isAllIn && !c.isFolded);
  if (allInPlayers.length === 0) return false;
  
  const allInBets = new Set(allInPlayers.map(c => c.totalBet));
  return allInBets.size > 0 && 
    contributions.some(c => !c.isFolded && !c.isAllIn && c.totalBet > 0);
}

/**
 * Format pot for display
 */
export function formatPot(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toString();
}

/**
 * Calculate pot odds percentage
 */
export function calculatePotOdds(callAmount: number, potSize: number): number {
  if (callAmount <= 0) return 0;
  const totalPot = potSize + callAmount;
  return Math.round((callAmount / totalPot) * 100);
}

// ==========================================
// TESTS
// ==========================================

export function testSidePots(): { passed: number; failed: number; results: string[] } {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;
  
  const runTest = (name: string, contributions: PlayerContribution[], expected: { 
    mainPotAmount: number;
    sidePotCount: number;
    totalPot: number;
  }) => {
    const result = calculateSidePots(contributions);
    const pass = 
      result.mainPot.amount === expected.mainPotAmount &&
      result.sidePots.length === expected.sidePotCount &&
      result.totalPot === expected.totalPot;
    
    if (pass) {
      passed++;
      results.push(`✓ PASS: ${name}`);
    } else {
      failed++;
      results.push(`✗ FAIL: ${name}`);
      results.push(`  Expected: main=${expected.mainPotAmount}, sides=${expected.sidePotCount}, total=${expected.totalPot}`);
      results.push(`  Got: main=${result.mainPot.amount}, sides=${result.sidePots.length}, total=${result.totalPot}`);
    }
  };
  
  // Test 1: All equal bets
  runTest('Equal bets', [
    { playerId: 'A', totalBet: 100, isFolded: false, isAllIn: false, stack: 900 },
    { playerId: 'B', totalBet: 100, isFolded: false, isAllIn: false, stack: 900 },
    { playerId: 'C', totalBet: 100, isFolded: false, isAllIn: false, stack: 900 },
  ], { mainPotAmount: 300, sidePotCount: 0, totalPot: 300 });
  
  // Test 2: One short all-in
  runTest('One short all-in', [
    { playerId: 'A', totalBet: 500, isFolded: false, isAllIn: true, stack: 0 },
    { playerId: 'B', totalBet: 1000, isFolded: false, isAllIn: false, stack: 500 },
    { playerId: 'C', totalBet: 1000, isFolded: false, isAllIn: false, stack: 500 },
  ], { mainPotAmount: 1500, sidePotCount: 1, totalPot: 2500 });
  
  // Test 3: Folded player
  runTest('Folded player', [
    { playerId: 'A', totalBet: 100, isFolded: true, isAllIn: false, stack: 800 },
    { playerId: 'B', totalBet: 200, isFolded: false, isAllIn: false, stack: 800 },
    { playerId: 'C', totalBet: 200, isFolded: false, isAllIn: false, stack: 800 },
  ], { mainPotAmount: 500, sidePotCount: 0, totalPot: 500 });
  
  // Test 4: Multiple all-ins
  runTest('Multiple all-ins', [
    { playerId: 'A', totalBet: 300, isFolded: false, isAllIn: true, stack: 0 },
    { playerId: 'B', totalBet: 600, isFolded: false, isAllIn: true, stack: 0 },
    { playerId: 'C', totalBet: 1000, isFolded: false, isAllIn: false, stack: 500 },
    { playerId: 'D', totalBet: 1000, isFolded: false, isAllIn: false, stack: 500 },
  ], { mainPotAmount: 1200, sidePotCount: 2, totalPot: 2900 });
  
  return { passed, failed, results };
}
