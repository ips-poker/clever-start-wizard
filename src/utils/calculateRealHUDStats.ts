/**
 * Real HUD Statistics Calculator
 * Calculates actual poker HUD stats from hand history data
 */

export interface RealHUDStats {
  // Core Stats
  handsPlayed: number;
  handsWon: number;
  
  // Preflop Stats
  vpip: number;           // Voluntarily Put In Pot %
  pfr: number;            // Pre-Flop Raise %
  threeBet: number;       // 3-Bet %
  foldToThreeBet: number; // Fold to 3-Bet %
  fourBet: number;        // 4-Bet %
  squeeze: number;        // Squeeze %
  
  // Postflop Stats
  afTotal: number;        // Aggression Factor Total
  afFlop: number;         // AF Flop
  afTurn: number;         // AF Turn
  afRiver: number;        // AF River
  
  // Continuation Bet
  cbet: number;           // C-Bet %
  cbetFold: number;       // Fold to C-Bet %
  cbetTurn: number;       // Turn C-Bet %
  cbetRiver: number;      // River C-Bet %
  
  // Showdown Stats
  wtsd: number;           // Went To ShowDown %
  wsd: number;            // Won $ at ShowDown %
  wwsf: number;           // Won When Saw Flop %
  
  // Position Stats
  positionStats: Record<string, PositionStats>;
  
  // Session Data
  profitBB: number;       // Profit in Big Blinds
  bbPer100: number;       // BB/100
  biggestWin: number;
  biggestLoss: number;
  
  // Time-based
  handsPerHour: number;
  sessionDuration: number;
  
  // Advanced
  limp: number;           // Limp %
  limpcall: number;       // Limp-Call %
  steal: number;          // Steal %
  foldToSteal: number;    // Fold to Steal %
  checkRaise: number;     // Check-Raise %
  donkBet: number;        // Donk Bet %
}

export interface PositionStats {
  handsPlayed: number;
  vpip: number;
  pfr: number;
  threeBet: number;
  profit: number;
  bbWon: number;
}

interface HandAction {
  phase: string;
  playerId: string;
  playerName?: string;
  seatNumber: number;
  actionType: string;
  amount?: number;
}

interface HandRecord {
  id: string;
  handNumber: number;
  pot: number;
  phase: string;
  communityCards: string[];
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  actions: HandAction[];
  players: {
    playerId: string;
    playerName?: string;
    seatNumber: number;
    stackStart: number;
    stackEnd?: number;
    holeCards?: string[];
    isFolded: boolean;
    isAllIn: boolean;
    wonAmount?: number;
    betAmount: number;
  }[];
  winners: {
    playerId: string;
    amount: number;
    handName?: string;
  }[];
  bigBlind: number;
  smallBlind: number;
}

export function calculateRealHUDStats(
  hands: HandRecord[],
  playerId: string
): RealHUDStats {
  const stats: RealHUDStats = {
    handsPlayed: 0,
    handsWon: 0,
    vpip: 0,
    pfr: 0,
    threeBet: 0,
    foldToThreeBet: 0,
    fourBet: 0,
    squeeze: 0,
    afTotal: 0,
    afFlop: 0,
    afTurn: 0,
    afRiver: 0,
    cbet: 0,
    cbetFold: 0,
    cbetTurn: 0,
    cbetRiver: 0,
    wtsd: 0,
    wsd: 0,
    wwsf: 0,
    positionStats: {},
    profitBB: 0,
    bbPer100: 0,
    biggestWin: 0,
    biggestLoss: 0,
    handsPerHour: 0,
    sessionDuration: 0,
    limp: 0,
    limpcall: 0,
    steal: 0,
    foldToSteal: 0,
    checkRaise: 0,
    donkBet: 0
  };

  if (hands.length === 0) return stats;

  // Counters
  let vpipHands = 0;
  let pfrHands = 0;
  let threeBetOpportunities = 0;
  let threeBetMade = 0;
  let foldToThreeBetOpportunities = 0;
  let foldToThreeBetMade = 0;
  let cbetOpportunities = 0;
  let cbetMade = 0;
  let cbetFoldOpportunities = 0;
  let cbetFolded = 0;
  let wentToShowdown = 0;
  let wonAtShowdown = 0;
  let sawFlop = 0;
  let wonWhenSawFlop = 0;
  
  // Aggression counters by street
  let aggressiveActionsFlop = 0;
  let passiveActionsFlop = 0;
  let aggressiveActionsTurn = 0;
  let passiveActionsTurn = 0;
  let aggressiveActionsRiver = 0;
  let passiveActionsRiver = 0;
  
  let limpHands = 0;
  let stealOpportunities = 0;
  let stealMade = 0;
  let checkRaiseOpportunities = 0;
  let checkRaiseMade = 0;

  let totalProfitBB = 0;

  // Position mapping based on seat relative to dealer
  const getPosition = (
    seatNumber: number,
    dealerSeat: number,
    numPlayers: number
  ): string => {
    const positions = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'MP+1', 'HJ', 'CO'];
    const relativePos = (seatNumber - dealerSeat + numPlayers) % numPlayers;
    
    if (numPlayers <= 3) {
      return ['BTN', 'SB', 'BB'][relativePos] || 'BTN';
    }
    if (numPlayers <= 6) {
      const pos6 = ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'];
      return pos6[relativePos] || 'MP';
    }
    return positions[relativePos] || 'MP';
  };

  // Initialize position stats
  ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'HJ', 'CO'].forEach(pos => {
    stats.positionStats[pos] = {
      handsPlayed: 0,
      vpip: 0,
      pfr: 0,
      threeBet: 0,
      profit: 0,
      bbWon: 0
    };
  });

  hands.forEach(hand => {
    const myPlayer = hand.players.find(p => p.playerId === playerId);
    if (!myPlayer) return;

    stats.handsPlayed++;
    
    const bigBlind = hand.bigBlind || 20;
    const position = getPosition(myPlayer.seatNumber, hand.dealerSeat, hand.players.length);
    
    // Update position stats
    if (!stats.positionStats[position]) {
      stats.positionStats[position] = { handsPlayed: 0, vpip: 0, pfr: 0, threeBet: 0, profit: 0, bbWon: 0 };
    }
    stats.positionStats[position].handsPlayed++;

    const myActions = hand.actions.filter(a => a.playerId === playerId);
    const preflopActions = myActions.filter(a => a.phase.toLowerCase() === 'preflop');
    const flopActions = myActions.filter(a => a.phase.toLowerCase() === 'flop');
    const turnActions = myActions.filter(a => a.phase.toLowerCase() === 'turn');
    const riverActions = myActions.filter(a => a.phase.toLowerCase() === 'river');

    // Check for winner
    const isWinner = hand.winners.some(w => w.playerId === playerId);
    if (isWinner) {
      stats.handsWon++;
    }

    // Calculate profit
    const wonAmount = myPlayer.wonAmount || 0;
    const invested = myPlayer.betAmount || 0;
    const handProfit = wonAmount - invested;
    const handProfitBB = handProfit / bigBlind;
    totalProfitBB += handProfitBB;

    stats.positionStats[position].profit += handProfit;
    stats.positionStats[position].bbWon += handProfitBB;

    if (handProfit > stats.biggestWin) stats.biggestWin = handProfit;
    if (handProfit < stats.biggestLoss) stats.biggestLoss = handProfit;

    // --- PREFLOP ANALYSIS ---
    let vpipThisHand = false;
    let pfrThisHand = false;
    let threeBetThisHand = false;
    let limpThisHand = false;

    // Track raises in preflop to detect 3-bets
    let raiseCount = 0;
    let playerRaisedAt = -1;

    preflopActions.forEach((action, idx) => {
      const actionType = action.actionType.toLowerCase();
      
      // VPIP - voluntary put in pot (not blinds)
      if (['call', 'raise', 'bet', 'all-in'].includes(actionType)) {
        vpipThisHand = true;
      }
      
      // PFR - preflop raise
      if (['raise', 'all-in'].includes(actionType)) {
        pfrThisHand = true;
        raiseCount++;
        playerRaisedAt = idx;
      }
      
      // Limp detection
      if (actionType === 'call' && idx === 0 && position !== 'SB' && position !== 'BB') {
        limpThisHand = true;
      }
    });

    // 3-Bet detection - if player raised and there was already a raise before them
    const allPreflopActions = hand.actions.filter(a => a.phase.toLowerCase() === 'preflop');
    let raisesBefore = 0;
    for (const action of allPreflopActions) {
      if (action.playerId === playerId) {
        if (raisesBefore > 0 && ['raise', 'all-in'].includes(action.actionType.toLowerCase())) {
          threeBetThisHand = true;
          threeBetMade++;
        }
        break;
      }
      if (['raise', 'all-in'].includes(action.actionType.toLowerCase())) {
        raisesBefore++;
      }
    }
    if (raisesBefore > 0) threeBetOpportunities++;

    if (vpipThisHand) {
      vpipHands++;
      stats.positionStats[position].vpip++;
    }
    if (pfrThisHand) {
      pfrHands++;
      stats.positionStats[position].pfr++;
    }
    if (limpThisHand) limpHands++;
    if (threeBetThisHand) stats.positionStats[position].threeBet++;

    // Steal attempts (BTN, CO, SB open raises)
    if (['BTN', 'CO', 'SB'].includes(position) && pfrThisHand) {
      stealOpportunities++;
      stealMade++;
    }

    // --- POSTFLOP ANALYSIS ---
    const reachedFlop = hand.communityCards.length >= 3 && !myPlayer.isFolded;
    
    if (reachedFlop) {
      sawFlop++;
      if (isWinner) wonWhenSawFlop++;
      
      // C-Bet analysis - if player was preflop raiser
      if (pfrThisHand) {
        cbetOpportunities++;
        if (flopActions.some(a => ['bet', 'raise', 'all-in'].includes(a.actionType.toLowerCase()))) {
          cbetMade++;
        }
      }
      
      // Check-raise detection
      let checkedFirst = false;
      for (const action of flopActions) {
        if (action.actionType.toLowerCase() === 'check') {
          checkedFirst = true;
        } else if (checkedFirst && ['raise', 'all-in'].includes(action.actionType.toLowerCase())) {
          checkRaiseMade++;
          break;
        }
      }
      if (checkedFirst) checkRaiseOpportunities++;
    }

    // Aggression Factor calculation
    const countAggression = (actions: HandAction[]) => {
      let agg = 0, passive = 0;
      actions.forEach(a => {
        const t = a.actionType.toLowerCase();
        if (['bet', 'raise', 'all-in'].includes(t)) agg++;
        else if (['call', 'check'].includes(t)) passive++;
      });
      return { agg, passive };
    };

    const flopAF = countAggression(flopActions);
    aggressiveActionsFlop += flopAF.agg;
    passiveActionsFlop += flopAF.passive;

    const turnAF = countAggression(turnActions);
    aggressiveActionsTurn += turnAF.agg;
    passiveActionsTurn += turnAF.passive;

    const riverAF = countAggression(riverActions);
    aggressiveActionsRiver += riverAF.agg;
    passiveActionsRiver += riverAF.passive;

    // WTSD and WSD
    const reachedShowdown = hand.communityCards.length === 5 && 
      !myPlayer.isFolded && 
      hand.winners.length > 0;

    if (reachedShowdown) {
      wentToShowdown++;
      if (isWinner) wonAtShowdown++;
    }
  });

  // Calculate percentages
  const safeDivide = (a: number, b: number) => b > 0 ? (a / b) * 100 : 0;

  stats.vpip = safeDivide(vpipHands, stats.handsPlayed);
  stats.pfr = safeDivide(pfrHands, stats.handsPlayed);
  stats.threeBet = safeDivide(threeBetMade, threeBetOpportunities);
  stats.cbet = safeDivide(cbetMade, cbetOpportunities);
  stats.wtsd = safeDivide(wentToShowdown, sawFlop);
  stats.wsd = safeDivide(wonAtShowdown, wentToShowdown);
  stats.wwsf = safeDivide(wonWhenSawFlop, sawFlop);
  stats.limp = safeDivide(limpHands, stats.handsPlayed);
  stats.steal = safeDivide(stealMade, stealOpportunities);
  stats.checkRaise = safeDivide(checkRaiseMade, checkRaiseOpportunities);

  // Aggression Factor
  stats.afFlop = passiveActionsFlop > 0 ? aggressiveActionsFlop / passiveActionsFlop : aggressiveActionsFlop;
  stats.afTurn = passiveActionsTurn > 0 ? aggressiveActionsTurn / passiveActionsTurn : aggressiveActionsTurn;
  stats.afRiver = passiveActionsRiver > 0 ? aggressiveActionsRiver / passiveActionsRiver : aggressiveActionsRiver;
  
  const totalAgg = aggressiveActionsFlop + aggressiveActionsTurn + aggressiveActionsRiver;
  const totalPass = passiveActionsFlop + passiveActionsTurn + passiveActionsRiver;
  stats.afTotal = totalPass > 0 ? totalAgg / totalPass : totalAgg;

  // Position stats percentages
  Object.keys(stats.positionStats).forEach(pos => {
    const ps = stats.positionStats[pos];
    if (ps.handsPlayed > 0) {
      ps.vpip = (ps.vpip / ps.handsPlayed) * 100;
      ps.pfr = (ps.pfr / ps.handsPlayed) * 100;
      ps.threeBet = (ps.threeBet / ps.handsPlayed) * 100;
    }
  });

  // Profit stats
  stats.profitBB = totalProfitBB;
  stats.bbPer100 = stats.handsPlayed > 0 ? (totalProfitBB / stats.handsPlayed) * 100 : 0;

  return stats;
}

export function getPlayerStyle(stats: RealHUDStats): {
  type: string;
  description: string;
  color: string;
} {
  const { vpip, pfr, afTotal } = stats;
  
  if (vpip < 15 && afTotal < 2) {
    return { type: 'Rock', description: 'Очень тайтовый и пассивный', color: 'gray' };
  }
  if (vpip < 20 && pfr > 15 && afTotal >= 2) {
    return { type: 'Nit', description: 'Тайтовый и агрессивный на префлопе', color: 'blue' };
  }
  if (vpip >= 20 && vpip <= 28 && pfr >= 15 && pfr <= 22 && afTotal >= 2) {
    return { type: 'TAG', description: 'Tight-Aggressive - оптимальный стиль', color: 'green' };
  }
  if (vpip > 28 && afTotal >= 2.5) {
    return { type: 'LAG', description: 'Loose-Aggressive - много рук, агрессивно', color: 'orange' };
  }
  if (vpip > 35 && afTotal < 2) {
    return { type: 'Fish', description: 'Слишком много рук, пассивно', color: 'red' };
  }
  if (vpip > 25 && afTotal < 1.5) {
    return { type: 'Calling Station', description: 'Много колов, мало рейзов', color: 'yellow' };
  }
  if (afTotal > 3.5) {
    return { type: 'Maniac', description: 'Сверхагрессивный стиль', color: 'purple' };
  }
  
  return { type: 'Regular', description: 'Стандартный стиль игры', color: 'slate' };
}

export function detectLeaks(stats: RealHUDStats): Array<{
  category: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  recommendation: string;
  impactBB: number;
}> {
  const leaks: Array<{
    category: string;
    severity: 'info' | 'warning' | 'critical';
    description: string;
    recommendation: string;
    impactBB: number;
  }> = [];

  // VPIP Analysis
  if (stats.vpip > 35) {
    leaks.push({
      category: 'Префлоп',
      severity: 'critical',
      description: 'VPIP слишком высокий - играете слишком много рук',
      recommendation: 'Сузьте диапазон стартовых рук, особенно с ранних позиций',
      impactBB: 3.5
    });
  } else if (stats.vpip > 30) {
    leaks.push({
      category: 'Префлоп',
      severity: 'warning',
      description: 'VPIP выше оптимального',
      recommendation: 'Уберите слабые руки из диапазона открытия',
      impactBB: 1.5
    });
  } else if (stats.vpip < 15) {
    leaks.push({
      category: 'Префлоп',
      severity: 'info',
      description: 'VPIP слишком низкий - упускаете прибыльные ситуации',
      recommendation: 'Расширьте диапазон на BTN и CO',
      impactBB: 1.0
    });
  }

  // PFR Gap
  const pfrGap = stats.vpip - stats.pfr;
  if (pfrGap > 8) {
    leaks.push({
      category: 'Агрессия',
      severity: 'warning',
      description: `Большой разрыв VPIP-PFR (${pfrGap.toFixed(1)}%) - много лимпов/коллов`,
      recommendation: 'Рейзьте больше вместо лимпа или колла',
      impactBB: 2.0
    });
  }

  // 3-Bet
  if (stats.threeBet < 5 && stats.handsPlayed > 100) {
    leaks.push({
      category: '3-Bet',
      severity: 'warning',
      description: '3-Bet слишком низкий',
      recommendation: 'Добавьте больше 3-бетов для вэлью и блефов',
      impactBB: 1.5
    });
  } else if (stats.threeBet > 12) {
    leaks.push({
      category: '3-Bet',
      severity: 'warning',
      description: '3-Bet слишком высокий - легко эксплуатировать',
      recommendation: 'Сузьте диапазон 3-бета',
      impactBB: 2.0
    });
  }

  // Aggression Factor
  if (stats.afTotal < 1.5) {
    leaks.push({
      category: 'Постфлоп',
      severity: 'warning',
      description: 'Низкий фактор агрессии - слишком пассивно постфлоп',
      recommendation: 'Ставьте и рейзьте больше с сильными руками',
      impactBB: 2.5
    });
  } else if (stats.afTotal > 4) {
    leaks.push({
      category: 'Постфлоп',
      severity: 'info',
      description: 'Очень высокая агрессия - возможен овербарлинг',
      recommendation: 'Сбалансируйте рейнджи ставок',
      impactBB: 1.0
    });
  }

  // C-Bet
  if (stats.cbet < 50 && stats.handsPlayed > 50) {
    leaks.push({
      category: 'C-Bet',
      severity: 'warning',
      description: 'Низкий C-Bet - упускаете много эквити',
      recommendation: 'C-бетьте чаще на сухих бордах',
      impactBB: 1.5
    });
  } else if (stats.cbet > 80) {
    leaks.push({
      category: 'C-Bet',
      severity: 'info',
      description: 'Слишком частый C-Bet - легко эксплуатировать чек-рейзами',
      recommendation: 'Чекайте больше слабых рук',
      impactBB: 1.0
    });
  }

  // WTSD
  if (stats.wtsd > 35) {
    leaks.push({
      category: 'Шоудаун',
      severity: 'critical',
      description: 'WTSD слишком высокий - колл-стейшн тенденция',
      recommendation: 'Фолдите больше маргинальных рук против агрессии',
      impactBB: 3.0
    });
  } else if (stats.wtsd < 22 && stats.handsPlayed > 100) {
    leaks.push({
      category: 'Шоудаун',
      severity: 'info',
      description: 'WTSD низкий - возможно, фолдите слишком много',
      recommendation: 'Защищайте сильные руки до ривера',
      impactBB: 1.0
    });
  }

  // WSD
  if (stats.wsd < 45 && stats.handsPlayed > 100) {
    leaks.push({
      category: 'Шоудаун',
      severity: 'warning',
      description: 'W$SD низкий - слабые руки доходят до шоудауна',
      recommendation: 'Улучшите выбор рук для колла на ривере',
      impactBB: 2.0
    });
  }

  // Limp
  if (stats.limp > 10) {
    leaks.push({
      category: 'Лимп',
      severity: 'warning',
      description: 'Слишком много лимпов - пассивная игра префлоп',
      recommendation: 'Открывайтесь рейзом или фолдите',
      impactBB: 1.5
    });
  }

  return leaks;
}
