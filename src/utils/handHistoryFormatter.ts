// ==========================================
// HAND HISTORY FORMATTER - PokerStars Compatible Format
// ==========================================

export interface HandHistoryAction {
  playerName: string;
  seatNumber: number;
  action: string;
  amount?: number;
  phase: string;
  timestamp: number;
}

export interface HandHistoryPlayer {
  playerId: string;
  name: string;
  seatNumber: number;
  stackStart: number;
  stackEnd: number;
  holeCards?: string[];
  isWinner: boolean;
  amountWon: number;
  handRank?: string;
}

export interface HandHistoryData {
  handId: string;
  tableId: string;
  tableName: string;
  gameType: string;
  stakes: { smallBlind: number; bigBlind: number; ante?: number };
  timestamp: Date;
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  players: HandHistoryPlayer[];
  communityCards: string[];
  pot: number;
  rake: number;
  actions: HandHistoryAction[];
  winners: { playerId: string; name: string; amount: number; handRank: string }[];
}

// Convert card format: "Ah" -> "Ah", "Ts" -> "Ts"
function formatCard(card: string): string {
  if (!card || card.length < 2) return card;
  const rank = card[0].toUpperCase();
  const suit = card[1].toLowerCase();
  return `${rank}${suit}`;
}

// Convert cards array to display format
function formatCards(cards: string[]): string {
  return cards.map(formatCard).join(' ');
}

// Format currency amount
function formatAmount(amount: number): string {
  return amount.toLocaleString('en-US');
}

// Convert action to PokerStars format
function formatAction(action: HandHistoryAction, bigBlind: number): string {
  const { playerName, action: actionType, amount } = action;
  
  switch (actionType.toLowerCase()) {
    case 'fold':
      return `${playerName}: folds`;
    case 'check':
      return `${playerName}: checks`;
    case 'call':
      return `${playerName}: calls ${formatAmount(amount || 0)}`;
    case 'bet':
      return `${playerName}: bets ${formatAmount(amount || 0)}`;
    case 'raise':
      return `${playerName}: raises to ${formatAmount(amount || 0)}`;
    case 'all-in':
    case 'allin':
      return `${playerName}: raises to ${formatAmount(amount || 0)} and is all-in`;
    case 'posts_sb':
      return `${playerName}: posts small blind ${formatAmount(amount || 0)}`;
    case 'posts_bb':
      return `${playerName}: posts big blind ${formatAmount(amount || 0)}`;
    case 'posts_ante':
      return `${playerName}: posts the ante ${formatAmount(amount || 0)}`;
    case 'posts_straddle':
      return `${playerName}: posts straddle ${formatAmount(amount || 0)}`;
    default:
      return `${playerName}: ${actionType} ${amount ? formatAmount(amount) : ''}`.trim();
  }
}

// Get phase header in PokerStars format
function getPhaseHeader(phase: string, communityCards: string[], cardsInPhase: number): string {
  switch (phase.toLowerCase()) {
    case 'preflop':
      return '*** HOLE CARDS ***';
    case 'flop':
      const flopCards = communityCards.slice(0, 3);
      return `*** FLOP *** [${formatCards(flopCards)}]`;
    case 'turn':
      const turnCards = communityCards.slice(0, 4);
      return `*** TURN *** [${formatCards(turnCards.slice(0, 3))}] [${formatCard(turnCards[3])}]`;
    case 'river':
      const riverCards = communityCards.slice(0, 5);
      return `*** RIVER *** [${formatCards(riverCards.slice(0, 4))}] [${formatCard(riverCards[4])}]`;
    case 'showdown':
      return '*** SHOWDOWN ***';
    default:
      return `*** ${phase.toUpperCase()} ***`;
  }
}

/**
 * Export hand history in PokerStars compatible format
 */
export function formatHandHistoryPokerStars(data: HandHistoryData): string {
  const lines: string[] = [];
  const { stakes, timestamp, tableName, gameType, players, actions, winners, communityCards, pot, rake, dealerSeat } = data;
  
  // Header
  const dateStr = timestamp.toISOString().replace('T', ' ').split('.')[0];
  lines.push(`PokerStars Hand #${data.handId}: ${gameType} (${formatAmount(stakes.smallBlind)}/${formatAmount(stakes.bigBlind)}${stakes.ante ? ` - Ante ${formatAmount(stakes.ante)}` : ''}) - ${dateStr}`);
  lines.push(`Table '${tableName}' 9-max Seat #${dealerSeat} is the button`);
  
  // Player seats
  players.forEach(player => {
    lines.push(`Seat ${player.seatNumber}: ${player.name} (${formatAmount(player.stackStart)} in chips)`);
  });
  
  // Ante posts (if any)
  if (stakes.ante && stakes.ante > 0) {
    players.forEach(player => {
      lines.push(`${player.name}: posts the ante ${formatAmount(stakes.ante!)}`);
    });
  }
  
  // Blind posts
  const sbPlayer = players.find(p => p.seatNumber === data.smallBlindSeat);
  const bbPlayer = players.find(p => p.seatNumber === data.bigBlindSeat);
  
  if (sbPlayer) {
    lines.push(`${sbPlayer.name}: posts small blind ${formatAmount(stakes.smallBlind)}`);
  }
  if (bbPlayer) {
    lines.push(`${bbPlayer.name}: posts big blind ${formatAmount(stakes.bigBlind)}`);
  }
  
  // Group actions by phase
  const phases = ['preflop', 'flop', 'turn', 'river', 'showdown'];
  let currentPhase = '';
  
  actions.forEach(action => {
    if (action.phase !== currentPhase) {
      currentPhase = action.phase;
      if (currentPhase === 'preflop') {
        lines.push('*** HOLE CARDS ***');
        // Show dealt cards for the hero (current player)
        const hero = players.find(p => p.holeCards && p.holeCards.length > 0);
        if (hero && hero.holeCards) {
          lines.push(`Dealt to ${hero.name} [${formatCards(hero.holeCards)}]`);
        }
      } else {
        lines.push(getPhaseHeader(currentPhase, communityCards, 0));
      }
    }
    
    // Skip blind posting actions as they're handled above
    if (!action.action.includes('posts_')) {
      lines.push(formatAction(action, stakes.bigBlind));
    }
  });
  
  // Showdown
  if (winners.length > 0 && communityCards.length === 5) {
    lines.push('*** SHOWDOWN ***');
    
    // Show all players' hands at showdown
    players.filter(p => p.holeCards && p.holeCards.length > 0 && p.isWinner).forEach(player => {
      lines.push(`${player.name}: shows [${formatCards(player.holeCards!)}] (${player.handRank || 'a hand'})`);
    });
    
    winners.forEach(winner => {
      lines.push(`${winner.name} collected ${formatAmount(winner.amount)} from pot`);
    });
  } else if (winners.length > 0) {
    // Uncontested pot
    lines.push('*** SUMMARY ***');
    winners.forEach(winner => {
      lines.push(`${winner.name} collected ${formatAmount(winner.amount)} from pot`);
    });
  }
  
  // Summary
  lines.push('*** SUMMARY ***');
  lines.push(`Total pot ${formatAmount(pot)}${rake > 0 ? ` | Rake ${formatAmount(rake)}` : ''}`);
  
  if (communityCards.length > 0) {
    lines.push(`Board [${formatCards(communityCards)}]`);
  }
  
  // Player summaries
  players.forEach(player => {
    let summary = `Seat ${player.seatNumber}: ${player.name}`;
    
    if (player.seatNumber === dealerSeat) summary += ' (button)';
    if (player.seatNumber === data.smallBlindSeat) summary += ' (small blind)';
    if (player.seatNumber === data.bigBlindSeat) summary += ' (big blind)';
    
    if (player.isWinner && player.amountWon > 0) {
      if (player.holeCards && player.holeCards.length > 0) {
        summary += ` showed [${formatCards(player.holeCards)}] and won (${formatAmount(player.amountWon)})`;
        if (player.handRank) summary += ` with ${player.handRank}`;
      } else {
        summary += ` collected (${formatAmount(player.amountWon)})`;
      }
    } else if (player.holeCards && player.holeCards.length > 0) {
      summary += ` showed [${formatCards(player.holeCards)}]`;
      if (player.handRank) summary += ` and lost with ${player.handRank}`;
    } else {
      summary += ' folded';
    }
    
    lines.push(summary);
  });
  
  lines.push('');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Export hand history in JSON format (for import/analysis tools)
 */
export function formatHandHistoryJSON(data: HandHistoryData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Export multiple hands in PokerStars format
 */
export function formatMultipleHandsPokerStars(hands: HandHistoryData[]): string {
  return hands.map(hand => formatHandHistoryPokerStars(hand)).join('\n\n');
}

/**
 * Download hand history as file
 */
export function downloadHandHistory(data: HandHistoryData | HandHistoryData[], format: 'pokerstars' | 'json' = 'pokerstars'): void {
  const isArray = Array.isArray(data);
  const content = format === 'json' 
    ? JSON.stringify(isArray ? data : [data], null, 2)
    : isArray 
      ? formatMultipleHandsPokerStars(data as HandHistoryData[])
      : formatHandHistoryPokerStars(data as HandHistoryData);
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const filename = format === 'json'
    ? `hand_history_${Date.now()}.json`
    : `hand_history_${Date.now()}.txt`;
  
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse timestamp from string or number
 */
export function parseTimestamp(timestamp: string | number | Date): Date {
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'number') return new Date(timestamp);
  return new Date(timestamp);
}

/**
 * Build HandHistoryData from raw data
 */
export function buildHandHistoryData(
  rawData: {
    handId: string;
    tableId: string;
    tableName?: string;
    gameType?: string;
    smallBlind: number;
    bigBlind: number;
    ante?: number;
    timestamp: string | number | Date;
    dealerSeat: number;
    smallBlindSeat: number;
    bigBlindSeat: number;
    players: {
      playerId: string;
      name: string;
      seatNumber: number;
      stackStart: number;
      stackEnd?: number;
      holeCards?: string[];
      isWinner?: boolean;
      amountWon?: number;
      handRank?: string;
    }[];
    communityCards: string[];
    pot: number;
    rake?: number;
    actions: {
      playerName: string;
      seatNumber: number;
      action: string;
      amount?: number;
      phase: string;
      timestamp?: number;
    }[];
    winners: {
      playerId: string;
      name: string;
      amount: number;
      handRank?: string;
    }[];
  }
): HandHistoryData {
  return {
    handId: rawData.handId,
    tableId: rawData.tableId,
    tableName: rawData.tableName || `Table ${rawData.tableId.slice(0, 8)}`,
    gameType: rawData.gameType || "Hold'em No Limit",
    stakes: {
      smallBlind: rawData.smallBlind,
      bigBlind: rawData.bigBlind,
      ante: rawData.ante
    },
    timestamp: parseTimestamp(rawData.timestamp),
    dealerSeat: rawData.dealerSeat,
    smallBlindSeat: rawData.smallBlindSeat,
    bigBlindSeat: rawData.bigBlindSeat,
    players: rawData.players.map(p => ({
      ...p,
      stackEnd: p.stackEnd ?? p.stackStart,
      isWinner: p.isWinner ?? false,
      amountWon: p.amountWon ?? 0
    })),
    communityCards: rawData.communityCards,
    pot: rawData.pot,
    rake: rawData.rake ?? 0,
    actions: rawData.actions.map(a => ({
      ...a,
      timestamp: a.timestamp ?? Date.now()
    })),
    winners: rawData.winners.map(w => ({
      ...w,
      handRank: w.handRank || ''
    }))
  };
}
