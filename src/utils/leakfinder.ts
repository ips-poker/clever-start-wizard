/**
 * Leakfinder Analysis Utility
 * 7.4 - Identifies leaks in poker play based on stats patterns
 */

interface PlayerStats {
  playerId: string;
  playerName: string;
  handsPlayed: number;
  handsWon: number;
  winRate: number;
  vpip: number;
  pfr: number;
  threeBet: number;
  foldTo3Bet: number;
  af: number;
  afq: number;
  cbet: number;
  foldToCbet: number;
  wtsd: number;
  wsd: number;
  wwsf: number;
  attemptToSteal: number;
  foldBBtoSteal: number;
  foldSBtoSteal: number;
  allInEV: number;
  allInAdjustedWinnings: number;
  sessionStartTime: number;
  bigBlindsWon: number;
  bigBlindsPerHour: number;
}

export interface LeakCategory {
  id: string;
  name: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  recommendation: string;
  relatedStats: string[];
}

export interface IdentifiedLeak {
  category: LeakCategory;
  currentValue: number;
  optimalRange: { min: number; max: number };
  deviationPercent: number;
  impact: 'low' | 'medium' | 'high';
  specificAdvice: string;
}

export interface LeakfinderReport {
  playerId: string;
  playerName: string;
  analyzedHands: number;
  generatedAt: Date;
  overallScore: number; // 0-100
  leaks: IdentifiedLeak[];
  strengths: string[];
  priorityFixes: string[];
}

// Define leak categories with optimal ranges
const LEAK_DEFINITIONS: Array<{
  category: LeakCategory;
  stat: string;
  optimalRange: { min: number; max: number };
  checkFn: (value: number, range: { min: number; max: number }) => boolean;
  getAdvice: (value: number, range: { min: number; max: number }) => string;
  impactLevel: 'low' | 'medium' | 'high';
}> = [
  // VPIP Leaks
  {
    category: {
      id: 'vpip_too_high',
      name: 'Too Loose Preflop',
      severity: 'critical',
      description: 'Playing too many hands preflop leads to difficult postflop situations with weak holdings.',
      recommendation: 'Tighten your preflop range, especially from early positions.',
      relatedStats: ['vpip', 'pfr']
    },
    stat: 'vpip',
    optimalRange: { min: 18, max: 28 },
    checkFn: (value, range) => value > range.max,
    getAdvice: (value, range) => 
      `Your VPIP of ${value.toFixed(1)}% is ${(value - range.max).toFixed(1)}% higher than optimal. Consider folding hands like suited connectors from early position and weak broadway hands.`,
    impactLevel: 'high'
  },
  {
    category: {
      id: 'vpip_too_low',
      name: 'Too Tight Preflop',
      severity: 'warning',
      description: 'Playing too few hands makes you predictable and you miss value from speculative hands.',
      recommendation: 'Open up your range in position, especially with suited connectors and small pairs.',
      relatedStats: ['vpip', 'pfr']
    },
    stat: 'vpip',
    optimalRange: { min: 18, max: 28 },
    checkFn: (value, range) => value < range.min,
    getAdvice: (value, range) => 
      `Your VPIP of ${value.toFixed(1)}% is ${(range.min - value).toFixed(1)}% lower than optimal. Add more suited connectors and small pairs to your range when in position.`,
    impactLevel: 'medium'
  },
  
  // PFR Leaks
  {
    category: {
      id: 'pfr_gap',
      name: 'Large VPIP-PFR Gap',
      severity: 'critical',
      description: 'A large gap between VPIP and PFR indicates too much calling preflop, which is exploitable.',
      recommendation: 'Raise more of the hands you play, or fold the hands you would just call with.',
      relatedStats: ['vpip', 'pfr']
    },
    stat: 'vpip_pfr_gap',
    optimalRange: { min: 0, max: 6 },
    checkFn: (value, range) => value > range.max,
    getAdvice: (value, range) => 
      `Your VPIP-PFR gap of ${value.toFixed(1)}% is too large. This means you're calling too much preflop. Either raise these hands or fold them.`,
    impactLevel: 'high'
  },
  
  // Aggression Leaks
  {
    category: {
      id: 'af_too_passive',
      name: 'Postflop Passivity',
      severity: 'critical',
      description: 'Low aggression factor means you\'re not betting/raising enough postflop.',
      recommendation: 'Bet and raise more when you have equity, and use more semi-bluffs.',
      relatedStats: ['af', 'afq']
    },
    stat: 'af',
    optimalRange: { min: 2.0, max: 4.0 },
    checkFn: (value, range) => value < range.min,
    getAdvice: (value, range) => 
      `Your AF of ${value.toFixed(2)} is too passive. Consider betting your draws more and value betting thinner.`,
    impactLevel: 'high'
  },
  {
    category: {
      id: 'af_too_aggressive',
      name: 'Excessive Aggression',
      severity: 'warning',
      description: 'Extremely high aggression can be exploitable through calls and check-raises.',
      recommendation: 'Mix in more calls and slowplays to balance your range.',
      relatedStats: ['af', 'afq']
    },
    stat: 'af',
    optimalRange: { min: 2.0, max: 4.0 },
    checkFn: (value, range) => value > range.max,
    getAdvice: (value, range) => 
      `Your AF of ${value.toFixed(2)} is very high. While aggression is good, consider calling more with medium strength hands and slowplaying some strong hands.`,
    impactLevel: 'medium'
  },
  
  // 3-Bet Leaks
  {
    category: {
      id: 'threebet_too_low',
      name: 'Insufficient 3-Betting',
      severity: 'warning',
      description: 'Not 3-betting enough lets opponents play too many hands profitably.',
      recommendation: 'Add more 3-bets for value with strong hands and as bluffs with suited aces.',
      relatedStats: ['threeBet', 'foldTo3Bet']
    },
    stat: 'threeBet',
    optimalRange: { min: 5, max: 10 },
    checkFn: (value, range) => value < range.min,
    getAdvice: (value, range) => 
      `Your 3-bet of ${value.toFixed(1)}% is too low. Add 3-bets with hands like AKo, QQ+, and bluff 3-bets with A5s, A4s.`,
    impactLevel: 'medium'
  },
  
  // Fold to 3-Bet Leaks
  {
    category: {
      id: 'fold_to_3bet_too_high',
      name: 'Folding Too Much to 3-Bets',
      severity: 'warning',
      description: 'Folding too often to 3-bets makes you exploitable by light 3-bettors.',
      recommendation: 'Defend more hands by calling or 4-betting, especially in position.',
      relatedStats: ['foldTo3Bet', 'threeBet']
    },
    stat: 'foldTo3Bet',
    optimalRange: { min: 50, max: 65 },
    checkFn: (value, range) => value > range.max,
    getAdvice: (value, range) => 
      `Your fold to 3-bet of ${value.toFixed(1)}% is too high. Call more in position with hands like AQs, JJ, and 4-bet bluff occasionally.`,
    impactLevel: 'medium'
  },
  
  // C-Bet Leaks
  {
    category: {
      id: 'cbet_too_high',
      name: 'Excessive C-Betting',
      severity: 'warning',
      description: 'C-betting too frequently makes you exploitable through check-raises and floats.',
      recommendation: 'Check back more on wet boards and when you have showdown value.',
      relatedStats: ['cbet', 'foldToCbet']
    },
    stat: 'cbet',
    optimalRange: { min: 55, max: 75 },
    checkFn: (value, range) => value > range.max,
    getAdvice: (value, range) => 
      `Your C-bet of ${value.toFixed(1)}% is too high. Check back more on connected boards and with hands that have showdown value.`,
    impactLevel: 'medium'
  },
  {
    category: {
      id: 'cbet_too_low',
      name: 'Insufficient C-Betting',
      severity: 'warning',
      description: 'Not c-betting enough lets opponents realize their equity too cheaply.',
      recommendation: 'C-bet more frequently on dry boards and with hands that need protection.',
      relatedStats: ['cbet', 'foldToCbet']
    },
    stat: 'cbet',
    optimalRange: { min: 55, max: 75 },
    checkFn: (value, range) => value < range.min,
    getAdvice: (value, range) => 
      `Your C-bet of ${value.toFixed(1)}% is too low. Bet more on dry boards like K72r and with hands that need protection.`,
    impactLevel: 'medium'
  },
  
  // WTSD Leaks
  {
    category: {
      id: 'wtsd_too_high',
      name: 'Going to Showdown Too Often',
      severity: 'warning',
      description: 'High WTSD can indicate calling too much on later streets.',
      recommendation: 'Fold more to multi-barrel aggression with marginal hands.',
      relatedStats: ['wtsd', 'wsd']
    },
    stat: 'wtsd',
    optimalRange: { min: 22, max: 28 },
    checkFn: (value, range) => value > range.max,
    getAdvice: (value, range) => 
      `Your WTSD of ${value.toFixed(1)}% suggests you're calling too much. Fold more to river aggression with bluff catchers.`,
    impactLevel: 'medium'
  },
  
  // WSD Leaks
  {
    category: {
      id: 'wsd_too_low',
      name: 'Losing at Showdown',
      severity: 'critical',
      description: 'Low WSD means you\'re often showing up with the losing hand.',
      recommendation: 'Be more selective about which hands you take to showdown.',
      relatedStats: ['wtsd', 'wsd']
    },
    stat: 'wsd',
    optimalRange: { min: 48, max: 55 },
    checkFn: (value, range) => value < range.min,
    getAdvice: (value, range) => 
      `Your WSD of ${value.toFixed(1)}% is too low. You're losing too often at showdown. Be more selective about calling down.`,
    impactLevel: 'high'
  }
];

// Analyze player stats and identify leaks
export const analyzeLeaks = (stats: PlayerStats): LeakfinderReport => {
  const leaks: IdentifiedLeak[] = [];
  const strengths: string[] = [];
  
  // Ensure minimum hands for meaningful analysis
  if (stats.handsPlayed < 100) {
    return {
      playerId: stats.playerId,
      playerName: stats.playerName,
      analyzedHands: stats.handsPlayed,
      generatedAt: new Date(),
      overallScore: 50,
      leaks: [],
      strengths: [],
      priorityFixes: ['Need at least 100 hands for meaningful analysis']
    };
  }
  
  // Calculate derived stats
  const vpipPfrGap = stats.vpip - stats.pfr;
  const derivedStats: Record<string, number> = {
    ...stats as any,
    vpip_pfr_gap: vpipPfrGap
  };
  
  // Check each leak definition
  LEAK_DEFINITIONS.forEach(def => {
    const value = derivedStats[def.stat];
    if (value === undefined) return;
    
    if (def.checkFn(value, def.optimalRange)) {
      const deviation = value > def.optimalRange.max 
        ? ((value - def.optimalRange.max) / def.optimalRange.max) * 100
        : ((def.optimalRange.min - value) / def.optimalRange.min) * 100;
      
      leaks.push({
        category: def.category,
        currentValue: value,
        optimalRange: def.optimalRange,
        deviationPercent: Math.abs(deviation),
        impact: def.impactLevel,
        specificAdvice: def.getAdvice(value, def.optimalRange)
      });
    } else {
      // Check if it's actually a strength
      const midpoint = (def.optimalRange.min + def.optimalRange.max) / 2;
      if (Math.abs(value - midpoint) < (def.optimalRange.max - def.optimalRange.min) * 0.2) {
        strengths.push(`Good ${def.stat}: ${value.toFixed(1)}%`);
      }
    }
  });
  
  // Sort leaks by severity and impact
  leaks.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    const impactOrder = { high: 0, medium: 1, low: 2 };
    
    const severityDiff = severityOrder[a.category.severity] - severityOrder[b.category.severity];
    if (severityDiff !== 0) return severityDiff;
    
    return impactOrder[a.impact] - impactOrder[b.impact];
  });
  
  // Calculate overall score
  let score = 100;
  leaks.forEach(leak => {
    if (leak.category.severity === 'critical') score -= 15;
    else if (leak.category.severity === 'warning') score -= 8;
    else score -= 3;
  });
  score = Math.max(0, Math.min(100, score));
  
  // Generate priority fixes
  const priorityFixes = leaks
    .filter(l => l.impact === 'high' || l.category.severity === 'critical')
    .slice(0, 3)
    .map(l => l.category.recommendation);
  
  return {
    playerId: stats.playerId,
    playerName: stats.playerName,
    analyzedHands: stats.handsPlayed,
    generatedAt: new Date(),
    overallScore: score,
    leaks,
    strengths,
    priorityFixes
  };
};

// Get leak severity color
export const getLeakColor = (severity: LeakCategory['severity']): string => {
  switch (severity) {
    case 'critical': return '#ef4444';
    case 'warning': return '#f59e0b';
    case 'info': return '#3b82f6';
    default: return '#6b7280';
  }
};

// Get impact badge
export const getImpactBadge = (impact: IdentifiedLeak['impact']): { text: string; color: string } => {
  switch (impact) {
    case 'high': return { text: 'High Impact', color: '#ef4444' };
    case 'medium': return { text: 'Medium Impact', color: '#f59e0b' };
    case 'low': return { text: 'Low Impact', color: '#22c55e' };
    default: return { text: 'Unknown', color: '#6b7280' };
  }
};

// Generate text report
export const generateTextReport = (report: LeakfinderReport): string => {
  const lines: string[] = [];
  
  lines.push('='.repeat(60));
  lines.push(`LEAKFINDER REPORT - ${report.playerName}`);
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Analyzed Hands: ${report.analyzedHands}`);
  lines.push(`Generated: ${report.generatedAt.toLocaleString()}`);
  lines.push(`Overall Score: ${report.overallScore}/100`);
  lines.push('');
  
  if (report.priorityFixes.length > 0) {
    lines.push('🔥 PRIORITY FIXES:');
    report.priorityFixes.forEach((fix, i) => {
      lines.push(`   ${i + 1}. ${fix}`);
    });
    lines.push('');
  }
  
  if (report.leaks.length > 0) {
    lines.push('⚠️ IDENTIFIED LEAKS:');
    report.leaks.forEach(leak => {
      lines.push('');
      lines.push(`   [${leak.category.severity.toUpperCase()}] ${leak.category.name}`);
      lines.push(`   Current: ${leak.currentValue.toFixed(1)} | Optimal: ${leak.optimalRange.min}-${leak.optimalRange.max}`);
      lines.push(`   ${leak.specificAdvice}`);
    });
    lines.push('');
  }
  
  if (report.strengths.length > 0) {
    lines.push('✅ STRENGTHS:');
    report.strengths.forEach(strength => {
      lines.push(`   • ${strength}`);
    });
  }
  
  return lines.join('\n');
};

export default {
  analyzeLeaks,
  getLeakColor,
  getImpactBadge,
  generateTextReport
};
