/**
 * Hand History Export Utility
 * 7.2 - Export hand history in multiple formats (JSON, PokerStars, text)
 */

export interface HandHistoryAction {
  playerId: string;
  playerName: string;
  seatNumber: number;
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin' | 'post_sb' | 'post_bb' | 'post_ante';
  amount?: number;
  allInAmount?: number;
  phase: 'preflop' | 'flop' | 'turn' | 'river';
}

export interface HandHistoryPlayer {
  playerId: string;
  playerName: string;
  seatNumber: number;
  stackStart: number;
  stackEnd: number;
  holeCards?: string[];
  handRank?: string;
  wonAmount: number;
  contribution: number;
}

export interface HandHistoryData {
  // Hand identification
  handId: string;
  handNumber: number;
  tableId: string;
  tableName: string;
  
  // Game info
  gameType: 'NL Hold\'em' | 'PL Omaha' | 'FL Hold\'em';
  stakes: {
    smallBlind: number;
    bigBlind: number;
    ante?: number;
  };
  
  // Tournament info (optional)
  tournament?: {
    id: string;
    name: string;
    buyIn: number;
    level: number;
  };
  
  // Timing
  startedAt: Date;
  completedAt: Date;
  
  // Positions
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  
  // Cards
  communityCards: string[];
  
  // Players
  players: HandHistoryPlayer[];
  
  // Actions by phase
  actions: HandHistoryAction[];
  
  // Result
  pot: number;
  rake?: number;
  sidePots?: Array<{
    amount: number;
    eligiblePlayers: string[];
  }>;
  winners: Array<{
    playerId: string;
    playerName: string;
    amount: number;
    handRank?: string;
  }>;
}

// Convert card format (e.g., "Ah" -> "Ah", "2c" -> "2c")
const formatCard = (card: string): string => {
  if (!card || card.length < 2) return card;
  
  const rank = card.slice(0, -1).toUpperCase();
  const suit = card.slice(-1).toLowerCase();
  
  const suitMap: Record<string, string> = {
    'h': 'h',
    'd': 'd', 
    'c': 'c',
    's': 's',
    '♥': 'h',
    '♦': 'd',
    '♣': 'c',
    '♠': 's'
  };
  
  return `${rank}${suitMap[suit] || suit}`;
};

// Format cards array
const formatCards = (cards: string[]): string[] => {
  return cards.map(formatCard);
};

// Export to PokerStars format
export const exportToPokerStarsFormat = (hand: HandHistoryData): string => {
  const lines: string[] = [];
  
  // Header
  const gameInfo = hand.tournament 
    ? `Tournament #${hand.tournament.id}, ${hand.stakes.smallBlind}/${hand.stakes.bigBlind} (${hand.tournament.level}) - Level ${hand.tournament.level}`
    : `${hand.stakes.smallBlind}/${hand.stakes.bigBlind} NL Hold'em`;
    
  lines.push(`PokerStars Hand #${hand.handNumber}: ${gameInfo}`);
  lines.push(`Table '${hand.tableName}' ${hand.players.length}-max Seat #${hand.dealerSeat + 1} is the button`);
  
  // Player seats
  hand.players
    .sort((a, b) => a.seatNumber - b.seatNumber)
    .forEach(player => {
      lines.push(`Seat ${player.seatNumber + 1}: ${player.playerName} (${player.stackStart} in chips)`);
    });
  
  // Blinds
  const sbPlayer = hand.players.find(p => p.seatNumber === hand.smallBlindSeat);
  const bbPlayer = hand.players.find(p => p.seatNumber === hand.bigBlindSeat);
  
  if (sbPlayer) {
    lines.push(`${sbPlayer.playerName}: posts small blind ${hand.stakes.smallBlind}`);
  }
  if (bbPlayer) {
    lines.push(`${bbPlayer.playerName}: posts big blind ${hand.stakes.bigBlind}`);
  }
  if (hand.stakes.ante) {
    hand.players.forEach(p => {
      lines.push(`${p.playerName}: posts the ante ${hand.stakes.ante}`);
    });
  }
  
  lines.push('*** HOLE CARDS ***');
  
  // Find hero (player with visible hole cards)
  const hero = hand.players.find(p => p.holeCards && p.holeCards.length === 2);
  if (hero) {
    lines.push(`Dealt to ${hero.playerName} [${formatCards(hero.holeCards!).join(' ')}]`);
  }
  
  // Actions by phase
  const phases = ['preflop', 'flop', 'turn', 'river'];
  let currentPhase = 'preflop';
  
  hand.actions.forEach(action => {
    // Phase header
    if (action.phase !== currentPhase) {
      currentPhase = action.phase;
      
      if (currentPhase === 'flop' && hand.communityCards.length >= 3) {
        lines.push(`*** FLOP *** [${formatCards(hand.communityCards.slice(0, 3)).join(' ')}]`);
      } else if (currentPhase === 'turn' && hand.communityCards.length >= 4) {
        lines.push(`*** TURN *** [${formatCards(hand.communityCards.slice(0, 3)).join(' ')}] [${formatCard(hand.communityCards[3])}]`);
      } else if (currentPhase === 'river' && hand.communityCards.length >= 5) {
        lines.push(`*** RIVER *** [${formatCards(hand.communityCards.slice(0, 4)).join(' ')}] [${formatCard(hand.communityCards[4])}]`);
      }
    }
    
    // Format action
    let actionStr = `${action.playerName}: `;
    
    switch (action.action) {
      case 'fold':
        actionStr += 'folds';
        break;
      case 'check':
        actionStr += 'checks';
        break;
      case 'call':
        actionStr += `calls ${action.amount}`;
        break;
      case 'bet':
        actionStr += `bets ${action.amount}`;
        break;
      case 'raise':
        actionStr += `raises to ${action.amount}`;
        break;
      case 'allin':
        actionStr += `raises to ${action.allInAmount || action.amount} and is all-in`;
        break;
      default:
        return;
    }
    
    lines.push(actionStr);
  });
  
  // Showdown
  if (hand.winners.length > 0) {
    lines.push('*** SHOWDOWN ***');
    
    // Show cards
    hand.players
      .filter(p => p.holeCards && p.holeCards.length === 2 && p.stackEnd > p.stackStart - p.contribution)
      .forEach(p => {
        lines.push(`${p.playerName}: shows [${formatCards(p.holeCards!).join(' ')}] (${p.handRank || 'a hand'})`);
      });
    
    // Winners
    hand.winners.forEach(winner => {
      lines.push(`${winner.playerName} collected ${winner.amount} from pot`);
    });
  }
  
  // Summary
  lines.push('*** SUMMARY ***');
  lines.push(`Total pot ${hand.pot}${hand.rake ? ` | Rake ${hand.rake}` : ''}`);
  
  if (hand.communityCards.length > 0) {
    lines.push(`Board [${formatCards(hand.communityCards).join(' ')}]`);
  }
  
  hand.players
    .sort((a, b) => a.seatNumber - b.seatNumber)
    .forEach(player => {
      let summary = `Seat ${player.seatNumber + 1}: ${player.playerName}`;
      
      if (player.seatNumber === hand.dealerSeat) summary += ' (button)';
      else if (player.seatNumber === hand.smallBlindSeat) summary += ' (small blind)';
      else if (player.seatNumber === hand.bigBlindSeat) summary += ' (big blind)';
      
      if (player.wonAmount > 0) {
        summary += ` showed [${formatCards(player.holeCards || []).join(' ')}] and won (${player.wonAmount})`;
      } else if (player.contribution === 0) {
        summary += ' folded before Flop (didn\'t bet)';
      } else {
        summary += ' folded';
      }
      
      lines.push(summary);
    });
  
  lines.push('');
  lines.push('');
  
  return lines.join('\n');
};

// Export to JSON format
export const exportToJSON = (hands: HandHistoryData[]): string => {
  return JSON.stringify(hands, null, 2);
};

// Export to plain text summary
export const exportToTextSummary = (hand: HandHistoryData): string => {
  const lines: string[] = [];
  
  lines.push(`=== Hand #${hand.handNumber} ===`);
  lines.push(`Table: ${hand.tableName}`);
  lines.push(`Stakes: ${hand.stakes.smallBlind}/${hand.stakes.bigBlind}`);
  lines.push(`Date: ${hand.startedAt.toLocaleString()}`);
  lines.push('');
  
  lines.push('Players:');
  hand.players.forEach(p => {
    lines.push(`  Seat ${p.seatNumber + 1}: ${p.playerName} (${p.stackStart})`);
  });
  lines.push('');
  
  if (hand.communityCards.length > 0) {
    lines.push(`Board: ${formatCards(hand.communityCards).join(' ')}`);
  }
  
  lines.push(`Pot: ${hand.pot}`);
  
  lines.push('Winners:');
  hand.winners.forEach(w => {
    lines.push(`  ${w.playerName}: ${w.amount} (${w.handRank || 'winner'})`);
  });
  
  return lines.join('\n');
};

// Download file helper
export const downloadFile = (content: string, filename: string, mimeType: string = 'text/plain'): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

// Export multiple hands
export const exportHandHistory = (
  hands: HandHistoryData[], 
  format: 'pokerstars' | 'json' | 'text' = 'pokerstars'
): string => {
  switch (format) {
    case 'pokerstars':
      return hands.map(exportToPokerStarsFormat).join('\n\n');
    case 'json':
      return exportToJSON(hands);
    case 'text':
      return hands.map(exportToTextSummary).join('\n\n---\n\n');
    default:
      return '';
  }
};

// Create hand history from raw game data
export const buildHandHistoryData = (
  rawData: {
    handId: string;
    handNumber: number;
    tableId: string;
    tableName: string;
    smallBlind: number;
    bigBlind: number;
    ante?: number;
    dealerSeat: number;
    communityCards: string[];
    pot: number;
    rake?: number;
    startedAt: string | Date;
    completedAt: string | Date;
    players: Array<{
      playerId: string;
      playerName: string;
      seatNumber: number;
      stackStart: number;
      stackEnd: number;
      holeCards?: string[];
      handRank?: string;
      wonAmount: number;
      betAmount: number;
    }>;
    actions: Array<{
      playerId: string;
      playerName: string;
      seatNumber: number;
      action: string;
      amount?: number;
      phase: string;
    }>;
    tournament?: {
      id: string;
      name: string;
      buyIn: number;
      level: number;
    };
  }
): HandHistoryData => {
  // Find SB and BB seats
  const playerCount = rawData.players.length;
  const sbSeat = (rawData.dealerSeat + 1) % playerCount;
  const bbSeat = (rawData.dealerSeat + 2) % playerCount;
  
  return {
    handId: rawData.handId,
    handNumber: rawData.handNumber,
    tableId: rawData.tableId,
    tableName: rawData.tableName,
    gameType: 'NL Hold\'em',
    stakes: {
      smallBlind: rawData.smallBlind,
      bigBlind: rawData.bigBlind,
      ante: rawData.ante
    },
    tournament: rawData.tournament,
    startedAt: new Date(rawData.startedAt),
    completedAt: new Date(rawData.completedAt),
    dealerSeat: rawData.dealerSeat,
    smallBlindSeat: sbSeat,
    bigBlindSeat: bbSeat,
    communityCards: rawData.communityCards,
    players: rawData.players.map(p => ({
      playerId: p.playerId,
      playerName: p.playerName,
      seatNumber: p.seatNumber,
      stackStart: p.stackStart,
      stackEnd: p.stackEnd,
      holeCards: p.holeCards,
      handRank: p.handRank,
      wonAmount: p.wonAmount,
      contribution: p.betAmount
    })),
    actions: rawData.actions.map(a => ({
      playerId: a.playerId,
      playerName: a.playerName,
      seatNumber: a.seatNumber,
      action: a.action as HandHistoryAction['action'],
      amount: a.amount,
      phase: a.phase as HandHistoryAction['phase']
    })),
    pot: rawData.pot,
    rake: rawData.rake,
    winners: rawData.players
      .filter(p => p.wonAmount > 0)
      .map(p => ({
        playerId: p.playerId,
        playerName: p.playerName,
        amount: p.wonAmount,
        handRank: p.handRank
      }))
  };
};

export default {
  exportToPokerStarsFormat,
  exportToJSON,
  exportToTextSummary,
  exportHandHistory,
  buildHandHistoryData,
  downloadFile
};
