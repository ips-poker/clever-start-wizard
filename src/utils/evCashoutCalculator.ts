/**
 * Professional EV Cashout Calculator
 * Similar to GGPoker/PokerOK All-In Insurance system
 */

import { calculateEquityFast } from './equityCalculator';

export interface CashoutOffer {
  playerId: string;
  playerName: string;
  currentEquity: number;
  potShare: number;
  cashoutAmount: number;
  insurancePremium: number;
  expectedValue: number;
  riskReduction: number;
  recommendation: 'accept' | 'decline' | 'neutral';
  confidence: number;
}

export interface InsuranceOption {
  coverage: number; // 50%, 75%, 100%
  premium: number;
  payout: number;
  ev: number;
  breakEvenEquity: number;
}

export interface AllInScenario {
  players: Array<{
    playerId: string;
    playerName: string;
    cards: string[];
    stack: number;
    contribution: number;
  }>;
  communityCards: string[];
  pot: number;
  phase: 'preflop' | 'flop' | 'turn' | 'river';
}

// House edge for cashout (typically 1-3%)
const HOUSE_EDGE = 0.02;

// Insurance premium rates based on equity
const INSURANCE_RATES: Record<string, number> = {
  'very_low': 0.15,    // <20% equity - high premium
  'low': 0.10,         // 20-35% equity
  'medium': 0.07,      // 35-50% equity  
  'high': 0.05,        // 50-65% equity
  'very_high': 0.03,   // >65% equity - low premium
};

/**
 * Calculate EV Cashout offers for all players in an all-in situation
 */
export function calculateCashoutOffers(scenario: AllInScenario): CashoutOffer[] {
  const { players, communityCards, pot } = scenario;
  
  if (players.length < 2) {
    return [];
  }

  // Calculate equity for all players
  const playerHands = players.map(p => ({
    playerId: p.playerId,
    cards: p.cards
  }));

  const equityResult = calculateEquityFast(playerHands, communityCards);
  
  const offers: CashoutOffer[] = [];

  for (const player of players) {
    const playerEquity = equityResult.players.find(p => p.playerId === player.playerId);
    if (!playerEquity) continue;

    const equity = playerEquity.equity / 100;
    const potShare = pot * equity;
    
    // Apply house edge to cashout amount
    const cashoutAmount = Math.floor(potShare * (1 - HOUSE_EDGE));
    
    // Calculate insurance premium based on equity
    const premiumRate = getInsurancePremiumRate(equity);
    const insurancePremium = Math.floor(potShare * premiumRate);
    
    // Expected value comparison
    const expectedValue = potShare;
    const riskReduction = calculateRiskReduction(equity, players.length);
    
    // Recommendation based on EV and variance
    const recommendation = getRecommendation(equity, cashoutAmount, expectedValue, riskReduction);
    
    offers.push({
      playerId: player.playerId,
      playerName: player.playerName,
      currentEquity: equity * 100,
      potShare,
      cashoutAmount,
      insurancePremium,
      expectedValue,
      riskReduction,
      recommendation,
      confidence: 95 // Default confidence
    });
  }

  return offers;
}

/**
 * Calculate all-in insurance options
 */
export function calculateInsuranceOptions(
  equity: number,
  potSize: number,
  playerContribution: number
): InsuranceOption[] {
  const coverageLevels = [0.5, 0.75, 1.0];
  const options: InsuranceOption[] = [];

  for (const coverage of coverageLevels) {
    const maxPayout = potSize * equity * coverage;
    const premiumRate = getInsurancePremiumRate(equity) * (1 + (coverage - 0.5));
    const premium = Math.floor(maxPayout * premiumRate);
    
    // EV calculation: expected loss from insurance vs protection gained
    const lossEquity = 1 - equity;
    const expectedLoss = potSize * lossEquity;
    const protectedAmount = Math.min(maxPayout, expectedLoss * coverage);
    const ev = protectedAmount - premium;
    
    // Break-even equity: at what equity does insurance become +EV
    const breakEvenEquity = premium / (potSize * coverage);

    options.push({
      coverage: coverage * 100,
      premium,
      payout: Math.floor(maxPayout),
      ev: Math.floor(ev),
      breakEvenEquity: breakEvenEquity * 100
    });
  }

  return options;
}

/**
 * Calculate rabbit hunt cost (showing remaining cards)
 */
export function calculateRabbitHuntCost(
  potSize: number,
  remainingCards: number
): number {
  // Cost is typically 0.5-2% of pot, increases with more cards to reveal
  const baseRate = 0.005;
  const cardMultiplier = remainingCards === 1 ? 1 : remainingCards === 2 ? 1.5 : 2;
  return Math.max(1, Math.floor(potSize * baseRate * cardMultiplier));
}

/**
 * Calculate Deal It Twice equity split
 */
export function calculateDealItTwiceEquity(
  playerCards: string[][],
  communityCards: string[],
  pot: number
): Array<{
  run1Equity: number;
  run2Equity: number;
  combinedEquity: number;
  expectedPayout: number;
  varianceReduction: number;
}> {
  // First run with current community cards
  const run1 = calculateEquityFast(
    playerCards.map((cards, i) => ({ playerId: `p${i}`, cards })),
    communityCards
  );

  // For run 2, we simulate with remaining deck (approximation)
  const run2 = calculateEquityFast(
    playerCards.map((cards, i) => ({ playerId: `p${i}`, cards })),
    communityCards
  );

  return playerCards.map((_, index) => {
    const p1 = run1.players[index];
    const p2 = run2.players[index];
    
    const run1Equity = p1?.equity || 0;
    const run2Equity = p2?.equity || 0;
    const combinedEquity = (run1Equity + run2Equity) / 2;
    const expectedPayout = (pot / 2) * (combinedEquity / 100) * 2;
    
    // Variance reduction from running it twice
    const singleVariance = run1Equity * (100 - run1Equity);
    const doubleVariance = singleVariance / 2;
    const varianceReduction = ((singleVariance - doubleVariance) / singleVariance) * 100;

    return {
      run1Equity,
      run2Equity,
      combinedEquity,
      expectedPayout,
      varianceReduction
    };
  });
}

/**
 * Straddle EV calculation
 */
export function calculateStraddleEV(
  bigBlind: number,
  straddleAmount: number,
  averagePotMultiplier: number = 5,
  winRate: number = 0.25
): {
  ev: number;
  breakEvenWinRate: number;
  recommendation: 'profitable' | 'marginal' | 'unprofitable';
} {
  const investedExtra = straddleAmount - bigBlind;
  const averagePot = bigBlind * averagePotMultiplier;
  const expectedWin = averagePot * winRate;
  const ev = expectedWin - investedExtra;
  
  const breakEvenWinRate = investedExtra / averagePot;
  
  let recommendation: 'profitable' | 'marginal' | 'unprofitable';
  if (ev > bigBlind) {
    recommendation = 'profitable';
  } else if (ev > -bigBlind) {
    recommendation = 'marginal';
  } else {
    recommendation = 'unprofitable';
  }

  return { ev, breakEvenWinRate, recommendation };
}

// Helper functions
function getInsurancePremiumRate(equity: number): number {
  if (equity < 0.20) return INSURANCE_RATES.very_low;
  if (equity < 0.35) return INSURANCE_RATES.low;
  if (equity < 0.50) return INSURANCE_RATES.medium;
  if (equity < 0.65) return INSURANCE_RATES.high;
  return INSURANCE_RATES.very_high;
}

function calculateRiskReduction(equity: number, numPlayers: number): number {
  // Higher variance with more players and closer to 50% equity
  const varianceFactor = 4 * equity * (1 - equity); // Max at 50% equity
  const playerFactor = Math.log2(numPlayers);
  return varianceFactor * playerFactor * 100;
}

function getRecommendation(
  equity: number,
  cashoutAmount: number,
  expectedValue: number,
  riskReduction: number
): 'accept' | 'decline' | 'neutral' {
  const evDifference = expectedValue - cashoutAmount;
  const evPercentage = evDifference / expectedValue;

  // If EV loss is small (<3%) and risk reduction is high, recommend accept
  if (evPercentage < 0.03 && riskReduction > 30) {
    return 'accept';
  }
  
  // If EV loss is significant (>5%), recommend decline
  if (evPercentage > 0.05) {
    return 'decline';
  }
  
  // For medium equity (40-60%), slight preference for cashout due to variance
  if (equity >= 0.40 && equity <= 0.60 && riskReduction > 20) {
    return 'accept';
  }

  return 'neutral';
}

/**
 * Format currency for display
 */
export function formatChips(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(2)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toLocaleString();
}
