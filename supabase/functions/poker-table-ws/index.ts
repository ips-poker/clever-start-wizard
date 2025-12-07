import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Store active connections per table
const tableConnections = new Map<string, Map<string, WebSocket>>();

// Store game state per table
const tableStates = new Map<string, TableState>();

// ==========================================
// POKER HAND EVALUATION (встроенный движок)
// ==========================================

type Suit = 'h' | 'd' | 'c' | 's';
type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

interface PokerCard {
  rank: Rank;
  suit: Suit;
}

enum HandRank {
  HIGH_CARD = 1, PAIR = 2, TWO_PAIR = 3, THREE_OF_A_KIND = 4,
  STRAIGHT = 5, FLUSH = 6, FULL_HOUSE = 7, FOUR_OF_A_KIND = 8,
  STRAIGHT_FLUSH = 9, ROYAL_FLUSH = 10
}

const HAND_RANK_NAMES: Record<HandRank, string> = {
  [HandRank.HIGH_CARD]: 'High Card', [HandRank.PAIR]: 'Pair',
  [HandRank.TWO_PAIR]: 'Two Pair', [HandRank.THREE_OF_A_KIND]: 'Three of a Kind',
  [HandRank.STRAIGHT]: 'Straight', [HandRank.FLUSH]: 'Flush',
  [HandRank.FULL_HOUSE]: 'Full House', [HandRank.FOUR_OF_A_KIND]: 'Four of a Kind',
  [HandRank.STRAIGHT_FLUSH]: 'Straight Flush', [HandRank.ROYAL_FLUSH]: 'Royal Flush'
};

interface HandEvaluation {
  rank: HandRank;
  name: string;
  value: number;
}

function parseCardString(str: string): PokerCard | null {
  const rankMap: Record<string, Rank> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };
  const suitMap: Record<string, Suit> = { 'h': 'h', 'd': 'd', 'c': 'c', 's': 's' };
  if (str.length < 2) return null;
  const rank = rankMap[str[0].toUpperCase()];
  const suit = suitMap[str[1].toLowerCase()];
  if (!rank || !suit) return null;
  return { rank, suit };
}

function getCombinations(cards: PokerCard[], n: number): PokerCard[][] {
  if (n === 0) return [[]];
  if (cards.length < n) return [];
  const [first, ...rest] = cards;
  return [...getCombinations(rest, n - 1).map(c => [first, ...c]), ...getCombinations(rest, n)];
}

function isFlush(cards: PokerCard[]): boolean {
  return cards.every(c => c.suit === cards[0].suit);
}

function isStraight(cards: PokerCard[]): boolean {
  const ranks = cards.map(c => c.rank).sort((a, b) => a - b);
  // Wheel straight: A-2-3-4-5
  if (ranks[4] === 14 && ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 4 && ranks[3] === 5) return true;
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) return false;
  }
  return true;
}

// Get high card for straight (handles wheel)
function getStraightHighCard(cards: PokerCard[]): number {
  const ranks = cards.map(c => c.rank).sort((a, b) => a - b);
  // Wheel straight: A-2-3-4-5 - high card is 5, not Ace
  if (ranks[4] === 14 && ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 4 && ranks[3] === 5) {
    return 5;
  }
  return Math.max(...ranks);
}

function evaluateFiveCards(cards: PokerCard[]): HandEvaluation {
  const flush = isFlush(cards);
  const straight = isStraight(cards);
  const sortedCards = [...cards].sort((a, b) => b.rank - a.rank);
  
  const groups = new Map<Rank, number>();
  for (const c of cards) groups.set(c.rank, (groups.get(c.rank) || 0) + 1);
  const sizes = Array.from(groups.values()).sort((a, b) => b - a);
  
  let rank: HandRank;
  let value = 0;
  
  if (flush && straight) {
    const ranks = cards.map(c => c.rank).sort((a, b) => a - b);
    rank = (ranks[0] === 10 && ranks[4] === 14) ? HandRank.ROYAL_FLUSH : HandRank.STRAIGHT_FLUSH;
    // For straight flush, use high card value (wheel = 5)
    const highCard = getStraightHighCard(cards);
    value = rank * 1000000000 + highCard * 10000;
  } else if (sizes[0] === 4) {
    rank = HandRank.FOUR_OF_A_KIND;
    value = rank * 1000000000;
    for (let i = 0; i < sortedCards.length; i++) {
      value += sortedCards[i].rank * Math.pow(15, 4 - i);
    }
  } else if (sizes[0] === 3 && sizes[1] === 2) {
    rank = HandRank.FULL_HOUSE;
    value = rank * 1000000000;
    for (let i = 0; i < sortedCards.length; i++) {
      value += sortedCards[i].rank * Math.pow(15, 4 - i);
    }
  } else if (flush) {
    rank = HandRank.FLUSH;
    value = rank * 1000000000;
    for (let i = 0; i < sortedCards.length; i++) {
      value += sortedCards[i].rank * Math.pow(15, 4 - i);
    }
  } else if (straight) {
    rank = HandRank.STRAIGHT;
    // For straight, use high card value (wheel = 5)
    const highCard = getStraightHighCard(cards);
    value = rank * 1000000000 + highCard * 10000;
  } else if (sizes[0] === 3) {
    rank = HandRank.THREE_OF_A_KIND;
    value = rank * 1000000000;
    for (let i = 0; i < sortedCards.length; i++) {
      value += sortedCards[i].rank * Math.pow(15, 4 - i);
    }
  } else if (sizes[0] === 2 && sizes[1] === 2) {
    rank = HandRank.TWO_PAIR;
    value = rank * 1000000000;
    for (let i = 0; i < sortedCards.length; i++) {
      value += sortedCards[i].rank * Math.pow(15, 4 - i);
    }
  } else if (sizes[0] === 2) {
    rank = HandRank.PAIR;
    value = rank * 1000000000;
    for (let i = 0; i < sortedCards.length; i++) {
      value += sortedCards[i].rank * Math.pow(15, 4 - i);
    }
  } else {
    rank = HandRank.HIGH_CARD;
    value = rank * 1000000000;
    for (let i = 0; i < sortedCards.length; i++) {
      value += sortedCards[i].rank * Math.pow(15, 4 - i);
    }
  }
  
  return { rank, name: HAND_RANK_NAMES[rank], value };
}

function evaluateHand(cardStrings: string[]): HandEvaluation {
  const cards = cardStrings.map(parseCardString).filter((c): c is PokerCard => c !== null);
  if (cards.length < 5) return { rank: HandRank.HIGH_CARD, name: 'Invalid', value: 0 };
  
  if (cards.length === 5) return evaluateFiveCards(cards);
  
  const combinations = getCombinations(cards, 5);
  let best: HandEvaluation = { rank: HandRank.HIGH_CARD, name: '', value: 0 };
  
  for (const combo of combinations) {
    const eval_ = evaluateFiveCards(combo);
    if (eval_.value > best.value) best = eval_;
  }
  
  return best;
}

// ==========================================
// SIDE POT TYPES AND CALCULATOR
// ==========================================

interface SidePot {
  amount: number;
  eligiblePlayers: string[];
  contributors: string[];
}

interface PlayerContribution {
  playerId: string;
  totalBet: number;
  isFolded: boolean;
  isAllIn: boolean;
}

function calculateSidePots(contributions: PlayerContribution[]): { mainPot: SidePot; sidePots: SidePot[]; totalPot: number } {
  if (contributions.length === 0) {
    return {
      mainPot: { amount: 0, eligiblePlayers: [], contributors: [] },
      sidePots: [],
      totalPot: 0
    };
  }

  const sortedContributions = [...contributions]
    .filter(c => c.totalBet > 0)
    .sort((a, b) => a.totalBet - b.totalBet);

  if (sortedContributions.length === 0) {
    return {
      mainPot: { amount: 0, eligiblePlayers: [], contributors: [] },
      sidePots: [],
      totalPot: 0
    };
  }

  const pots: SidePot[] = [];
  let previousLevel = 0;

  const allInLevels = sortedContributions
    .filter(c => c.isAllIn)
    .map(c => c.totalBet);
  
  const maxBet = Math.max(...sortedContributions.map(c => c.totalBet));
  const uniqueLevels = [...new Set([...allInLevels, maxBet])].sort((a, b) => a - b);

  for (const level of uniqueLevels) {
    const increment = level - previousLevel;
    if (increment <= 0) continue;

    let potAmount = 0;
    const contributors: string[] = [];

    for (const contribution of sortedContributions) {
      if (contribution.totalBet >= previousLevel + 1) {
        const contributionAtLevel = Math.min(contribution.totalBet - previousLevel, increment);
        potAmount += contributionAtLevel;
        contributors.push(contribution.playerId);
      }
    }

    const eligiblePlayers = sortedContributions
      .filter(c => !c.isFolded && c.totalBet >= level)
      .map(c => c.playerId);

    // Add all-in players at their level
    for (const contribution of sortedContributions) {
      if (contribution.isAllIn && contribution.totalBet === level && !contribution.isFolded) {
        if (!eligiblePlayers.includes(contribution.playerId)) {
          eligiblePlayers.push(contribution.playerId);
        }
      }
    }

    if (potAmount > 0) {
      pots.push({ amount: potAmount, eligiblePlayers, contributors });
    }

    previousLevel = level;
  }

  const [mainPot, ...sidePots] = pots;
  const totalPot = pots.reduce((sum, pot) => sum + pot.amount, 0);

  return {
    mainPot: mainPot || { amount: 0, eligiblePlayers: [], contributors: [] },
    sidePots,
    totalPot
  };
}

// ==========================================
// TABLE STATE TYPES
// ==========================================

interface TableState {
  tableId: string;
  currentHandId: string | null;
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  pot: number;
  currentBet: number;
  currentPlayerSeat: number | null;
  communityCards: string[];
  players: Map<string, PlayerState>;
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  deck: string[];
  sidePots: SidePot[];
  totalBetsPerPlayer: Map<string, number>;
  // Betting configuration
  smallBlindAmount: number;
  bigBlindAmount: number;
  anteAmount: number; // Ante for all players
  minRaise: number; // Minimum raise amount
  lastRaiserSeat: number | null; // Track who made last raise
  lastRaiseAmount: number; // Track last raise size
  actionTimer: number; // Seconds for player to act
  turnStartTime: number | null; // When current player's turn started
  // BB option tracking
  bbHasActed: boolean; // Has BB used their option (check/raise)?
  // Run it twice
  runItTwiceEnabled: boolean; // Allow running board twice when all-in
  // Rake configuration
  rakePercent: number; // Rake percentage (e.g., 5 for 5%)
  rakeCap: number; // Maximum rake per hand
  totalRakeCollected: number; // Accumulated rake for this hand
  // ===== STRADDLE & ADVANCED BLINDS =====
  straddleEnabled: boolean; // Allow straddle bets
  straddleSeat: number | null; // Seat that posted straddle
  straddleAmount: number; // Straddle amount (typically 2x BB)
  buttonAnteEnabled: boolean; // Button pays ante for all (speeds up game)
  buttonAnteAmount: number; // Button ante amount
  bigBlindAnteEnabled: boolean; // BB pays ante for all (common in tournaments)
  bigBlindAnteAmount: number; // BB ante amount (usually = 1 BB per player)
  mississippiStraddleEnabled: boolean; // Allow straddle from any position
  pendingStraddles: Map<number, number>; // seat -> straddle amount (for multiple straddles)
  maxStraddleCount: number; // Maximum number of straddles allowed
}

interface PlayerState {
  oderId: string;
  name?: string;
  avatarUrl?: string;
  seatNumber: number;
  stack: number;
  holeCards: string[];
  betAmount: number; // Current round bet
  totalBetInHand: number; // Total bet across all rounds
  isFolded: boolean;
  isAllIn: boolean;
  isActive: boolean;
  // ===== DISCONNECT PROTECTION =====
  isDisconnected: boolean; // Player has disconnected
  disconnectedAt: number | null; // Timestamp when player disconnected
  reconnectGracePeriod: number; // Seconds to wait before auto-folding
  timeBank: number; // Extra time bank in seconds
  timeBankUsed: number; // Time bank used this hand
  lastPingAt: number; // Last ping timestamp
}

interface WSMessage {
  type: string;
  tableId?: string;
  playerId?: string;
  data?: any;
}

// ==========================================
// TIMER MANAGEMENT FOR AUTO-FOLD
// ==========================================
const tableTimers: Map<string, number> = new Map(); // tableId -> timer ID
const disconnectTimers: Map<string, number> = new Map(); // playerId -> disconnect timer ID
const DEFAULT_TIME_BANK = 60; // 60 seconds time bank per player
const DEFAULT_RECONNECT_GRACE = 30; // 30 seconds to reconnect
const PING_INTERVAL = 5000; // 5 seconds ping interval
const PING_TIMEOUT = 15000; // 15 seconds without ping = disconnected

function clearTableTimer(tableId: string) {
  const existingTimer = tableTimers.get(tableId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    tableTimers.delete(tableId);
    console.log(`⏱️ Timer cleared for table ${tableId}`);
  }
}

function clearDisconnectTimer(playerId: string) {
  const existingTimer = disconnectTimers.get(playerId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    disconnectTimers.delete(playerId);
    console.log(`🔌 Disconnect timer cleared for player ${playerId}`);
  }
}

function startActionTimer(tableId: string, supabase: any) {
  // Clear any existing timer
  clearTableTimer(tableId);
  
  const tableState = tableStates.get(tableId);
  if (!tableState || tableState.phase === 'waiting' || tableState.phase === 'showdown') {
    return;
  }
  
  // Don't start timer if no current player
  if (tableState.currentPlayerSeat === null) {
    return;
  }
  
  // Get current player
  const currentPlayer = getPlayerBySeat(tableState, tableState.currentPlayerSeat);
  if (!currentPlayer) return;
  
  // Set turn start time
  tableState.turnStartTime = Date.now();
  
  // Calculate total time: base timer + available time bank (if disconnected, use time bank automatically)
  let totalTime = tableState.actionTimer;
  
  // If player is disconnected, start using time bank immediately
  if (currentPlayer.isDisconnected) {
    const remainingTimeBank = currentPlayer.timeBank - currentPlayer.timeBankUsed;
    if (remainingTimeBank > 0) {
      totalTime += remainingTimeBank;
      console.log(`⏱️ Disconnected player using time bank: ${remainingTimeBank}s added`);
    }
  }
  
  const timerDuration = totalTime * 1000; // Convert to ms
  
  console.log(`⏱️ Starting ${totalTime}s timer for seat ${tableState.currentPlayerSeat} on table ${tableId} (disconnected: ${currentPlayer.isDisconnected})`);
  
  const timerId = setTimeout(async () => {
    await handleAutoFold(tableId, supabase);
  }, timerDuration);
  
  tableTimers.set(tableId, timerId);
}

// Start time bank timer (when base timer expires)
function startTimeBankTimer(tableId: string, playerId: string, supabase: any) {
  const tableState = tableStates.get(tableId);
  if (!tableState) return;
  
  const player = tableState.players.get(playerId);
  if (!player) return;
  
  const remainingTimeBank = player.timeBank - player.timeBankUsed;
  
  if (remainingTimeBank <= 0) {
    // No time bank left, auto-fold
    handleAutoFold(tableId, supabase);
    return;
  }
  
  console.log(`⏳ Time bank activated for player ${playerId}: ${remainingTimeBank}s remaining`);
  
  // Notify players about time bank usage
  broadcastToTable(tableId, {
    type: "time_bank_started",
    playerId,
    seatNumber: player.seatNumber,
    remainingTimeBank
  });
}

async function handleAutoFold(tableId: string, supabase: any) {
  const tableState = tableStates.get(tableId);
  if (!tableState) return;
  
  const currentSeat = tableState.currentPlayerSeat;
  if (currentSeat === null) return;
  
  // Find the player who timed out
  const player = getPlayerBySeat(tableState, currentSeat);
  if (!player || player.isFolded || player.isAllIn) {
    return;
  }
  
  // Find player ID
  let timedOutPlayerId: string | null = null;
  for (const [pid, p] of tableState.players.entries()) {
    if (p.seatNumber === currentSeat) {
      timedOutPlayerId = pid;
      break;
    }
  }
  
  // Check if player has time bank remaining and is disconnected
  if (player.isDisconnected) {
    const remainingTimeBank = player.timeBank - player.timeBankUsed;
    if (remainingTimeBank > 0) {
      // Use all remaining time bank
      player.timeBankUsed = player.timeBank;
    }
  }
  
  console.log(`⏰ AUTO-FOLD: Player at seat ${currentSeat} timed out on table ${tableId}`);
  
  // Execute fold
  player.isFolded = true;
  
  // Log action to database
  try {
    if (tableState.currentHandId && timedOutPlayerId) {
      await supabase.from('poker_actions').insert({
        hand_id: tableState.currentHandId,
        player_id: timedOutPlayerId,
        seat_number: player.seatNumber,
        action_type: 'fold',
        amount: 0,
        phase: tableState.phase,
        action_order: Date.now()
      });
    }
  } catch (error) {
    console.error("DB error logging auto-fold:", error);
  }
  
  // Move to next player or next phase
  const nextResult = moveToNextPlayer(tableState);
  
  if (nextResult.phaseComplete) {
    await advancePhase(tableState, supabase);
  } else {
    // Start timer for next player
    startActionTimer(tableId, supabase);
  }
  
  // Broadcast to all players
  broadcastToTable(tableId, {
    type: "player_action",
    playerId: timedOutPlayerId,
    seatNumber: currentSeat,
    action: "fold",
    isAutoFold: true,
    isDisconnectFold: player.isDisconnected,
    state: serializeTableState(tableState)
  });
  
  broadcastToTable(tableId, {
    type: "timeout_fold",
    seatNumber: currentSeat,
    playerId: timedOutPlayerId,
    message: `Player at seat ${currentSeat} timed out and folded`,
    wasDisconnected: player.isDisconnected
  });
}

// Handle player disconnect
function handlePlayerDisconnect(tableId: string, playerId: string, supabase: any) {
  const tableState = tableStates.get(tableId);
  if (!tableState) return;
  
  const player = tableState.players.get(playerId);
  if (!player) return;
  
  // Mark player as disconnected
  player.isDisconnected = true;
  player.disconnectedAt = Date.now();
  
  console.log(`🔌 Player ${playerId} disconnected from table ${tableId}`);
  
  // Notify other players
  broadcastToTable(tableId, {
    type: "player_disconnected",
    playerId,
    seatNumber: player.seatNumber,
    gracePeriod: player.reconnectGracePeriod
  }, playerId);
  
  // Start disconnect timer
  const timerId = setTimeout(() => {
    handleDisconnectTimeout(tableId, playerId, supabase);
  }, player.reconnectGracePeriod * 1000);
  
  disconnectTimers.set(playerId, timerId);
}

// Handle disconnect timeout (player didn't reconnect)
async function handleDisconnectTimeout(tableId: string, playerId: string, supabase: any) {
  const tableState = tableStates.get(tableId);
  if (!tableState) return;
  
  const player = tableState.players.get(playerId);
  if (!player || !player.isDisconnected) return;
  
  console.log(`⏰ Disconnect timeout for player ${playerId} on table ${tableId}`);
  
  // If it's this player's turn, they'll fold when their action timer expires
  // If they're waiting, mark them as sitting out
  if (tableState.currentPlayerSeat !== player.seatNumber) {
    // Player is not acting, just keep them marked as disconnected
    // They will auto-fold when it's their turn
    broadcastToTable(tableId, {
      type: "player_sitting_out",
      playerId,
      seatNumber: player.seatNumber,
      reason: "disconnect_timeout"
    });
  }
  
  clearDisconnectTimer(playerId);
}

// Handle player reconnect
function handlePlayerReconnect(tableId: string, playerId: string, socket: WebSocket) {
  const tableState = tableStates.get(tableId);
  if (!tableState) return;
  
  const player = tableState.players.get(playerId);
  if (!player) return;
  
  // Clear disconnect timer
  clearDisconnectTimer(playerId);
  
  // Calculate time spent disconnected
  const disconnectDuration = player.disconnectedAt 
    ? Math.floor((Date.now() - player.disconnectedAt) / 1000) 
    : 0;
  
  // Mark player as reconnected
  player.isDisconnected = false;
  player.disconnectedAt = null;
  player.lastPingAt = Date.now();
  
  console.log(`🔄 Player ${playerId} reconnected to table ${tableId} (was disconnected for ${disconnectDuration}s)`);
  
  // Notify other players
  broadcastToTable(tableId, {
    type: "player_reconnected",
    playerId,
    seatNumber: player.seatNumber,
    disconnectDuration,
    timeBankRemaining: player.timeBank - player.timeBankUsed
  }, playerId);
  
  // Send full state to reconnected player
  sendToSocket(socket, {
    type: "reconnected",
    tableId,
    seatNumber: player.seatNumber,
    disconnectDuration,
    timeBankRemaining: player.timeBank - player.timeBankUsed,
    yourCards: player.holeCards,
    state: serializeTableState(tableState, playerId)
  });
  
  // If it's this player's turn, restart their timer with remaining time
  if (tableState.currentPlayerSeat === player.seatNumber && tableState.turnStartTime) {
    const elapsed = Math.floor((Date.now() - tableState.turnStartTime) / 1000);
    const remaining = tableState.actionTimer - elapsed;
    
    if (remaining > 0) {
      // Restart timer with remaining time
      clearTableTimer(tableId);
      const timerId = setTimeout(async () => {
        await handleAutoFold(tableId, null); // No supabase needed for this call
      }, remaining * 1000);
      tableTimers.set(tableId, timerId);
      
      sendToSocket(socket, {
        type: "your_turn",
        timeRemaining: remaining,
        timeBankRemaining: player.timeBank - player.timeBankUsed
      });
    }
  }
}

// Handle ping from client
function handlePing(tableId: string, playerId: string) {
  const tableState = tableStates.get(tableId);
  if (!tableState) return;
  
  const player = tableState.players.get(playerId);
  if (!player) return;
  
  player.lastPingAt = Date.now();
}

// Use time bank action
function handleUseTimeBank(tableId: string, playerId: string, seconds: number) {
  const tableState = tableStates.get(tableId);
  if (!tableState) return { success: false, reason: "Table not found" };
  
  const player = tableState.players.get(playerId);
  if (!player) return { success: false, reason: "Player not found" };
  
  // Check if it's player's turn
  if (tableState.currentPlayerSeat !== player.seatNumber) {
    return { success: false, reason: "Not your turn" };
  }
  
  const remainingTimeBank = player.timeBank - player.timeBankUsed;
  const actualSeconds = Math.min(seconds, remainingTimeBank);
  
  if (actualSeconds <= 0) {
    return { success: false, reason: "No time bank remaining" };
  }
  
  player.timeBankUsed += actualSeconds;
  
  console.log(`⏳ Player ${playerId} using ${actualSeconds}s from time bank (${remainingTimeBank - actualSeconds}s remaining)`);
  
  // Extend the current timer
  clearTableTimer(tableId);
  
  const timerId = setTimeout(async () => {
    await handleAutoFold(tableId, null);
  }, actualSeconds * 1000);
  
  tableTimers.set(tableId, timerId);
  
  broadcastToTable(tableId, {
    type: "time_bank_used",
    playerId,
    seatNumber: player.seatNumber,
    secondsUsed: actualSeconds,
    remainingTimeBank: remainingTimeBank - actualSeconds
  });
  
  return { success: true, secondsUsed: actualSeconds, remaining: remainingTimeBank - actualSeconds };
}

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  // Handle regular HTTP requests
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response(JSON.stringify({ 
      status: "Poker WebSocket server is running",
      info: "Connect via WebSocket for real-time gameplay"
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Upgrade to WebSocket
  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let currentTableId: string | null = null;
  let currentPlayerId: string | null = null;

  const supabase = createClient(supabaseUrl, supabaseKey);

  socket.onopen = () => {
    console.log("🎰 New poker WebSocket connection established");
  };

  socket.onmessage = async (event) => {
    try {
      const message: WSMessage = JSON.parse(event.data);
      console.log("📨 Received message:", message.type);

      switch (message.type) {
        case "join_table":
          await handleJoinTable(socket, message, supabase);
          currentTableId = message.tableId || null;
          currentPlayerId = message.playerId || null;
          break;

        case "leave_table":
          await handleLeaveTable(socket, message, supabase);
          break;

        case "player_action":
          await handlePlayerAction(socket, message, supabase);
          break;

        case "start_hand":
          await handleStartHand(socket, message, supabase);
          break;

        case "get_state":
          await handleGetState(socket, message);
          break;

        case "chat":
          await handleChat(socket, message);
          break;

        case "post_straddle":
          await handlePostStraddle(socket, message);
          break;

        case "configure_table":
          await handleConfigureTable(socket, message);
          break;

        case "ping":
          // Handle heartbeat ping
          if (message.tableId && message.playerId) {
            handlePing(message.tableId, message.playerId);
            sendToSocket(socket, { type: "pong", timestamp: Date.now() });
          }
          break;

        case "use_time_bank":
          // Player wants to use time bank
          if (message.tableId && message.playerId && message.data?.seconds) {
            const result = handleUseTimeBank(message.tableId, message.playerId, message.data.seconds);
            sendToSocket(socket, { type: "time_bank_result", ...result });
          }
          break;

        case "reconnect":
          // Player is reconnecting after disconnect
          if (message.tableId && message.playerId) {
            handlePlayerReconnect(message.tableId, message.playerId, socket);
            currentTableId = message.tableId;
            currentPlayerId = message.playerId;
            
            // Re-add to connections
            if (!tableConnections.has(message.tableId)) {
              tableConnections.set(message.tableId, new Map());
            }
            tableConnections.get(message.tableId)!.set(message.playerId, socket);
          }
          break;

        default:
          sendToSocket(socket, { type: "error", message: "Unknown message type" });
      }
    } catch (error) {
      console.error("❌ Error processing message:", error);
      sendToSocket(socket, { type: "error", message: error.message });
    }
  };

  socket.onclose = () => {
    console.log("🔌 WebSocket connection closed");
    if (currentTableId && currentPlayerId) {
      // Don't remove player immediately - mark as disconnected and start grace period
      const tableState = tableStates.get(currentTableId);
      if (tableState) {
        const player = tableState.players.get(currentPlayerId);
        if (player && !player.isFolded && tableState.phase !== 'waiting') {
          // Player disconnected during a hand - start disconnect protection
          handlePlayerDisconnect(currentTableId, currentPlayerId, supabase);
        } else {
          // Player left between hands or already folded - remove them
          removePlayerFromTable(currentTableId, currentPlayerId);
        }
      } else {
        removePlayerFromTable(currentTableId, currentPlayerId);
      }
    }
  };

  socket.onerror = (error) => {
    console.error("❌ WebSocket error:", error);
  };

  return response;
});

// Handle player joining a table
async function handleJoinTable(socket: WebSocket, message: WSMessage, supabase: any) {
  const { tableId, playerId, data } = message;
  
  if (!tableId || !playerId) {
    sendToSocket(socket, { type: "error", message: "tableId and playerId required" });
    return;
  }

  // Initialize table connections if not exists
  if (!tableConnections.has(tableId)) {
    tableConnections.set(tableId, new Map());
  }

  const connections = tableConnections.get(tableId)!;
  connections.set(playerId, socket);

  // Initialize table state if not exists
  if (!tableStates.has(tableId)) {
    tableStates.set(tableId, createInitialTableState(tableId));
  }

  const tableState = tableStates.get(tableId)!;
  
  // Add player to state
  const seatNumber = data?.seatNumber || findAvailableSeat(tableState);
  
  if (seatNumber === -1) {
    sendToSocket(socket, { type: "error", message: "No available seats" });
    return;
  }

  // Fetch player name and avatar from database
  let playerName = `Player ${seatNumber}`;
  let playerAvatarUrl: string | undefined;
  
  try {
    const { data: playerData } = await supabase
      .from('players')
      .select('name, avatar_url')
      .eq('id', playerId)
      .single();
    
    if (playerData) {
      playerName = playerData.name || playerName;
      playerAvatarUrl = playerData.avatar_url || undefined;
    }
  } catch (error) {
    console.error("Error fetching player data:", error);
  }

  // Check if player is reconnecting (already exists in table)
  const existingPlayer = tableState.players.get(playerId);
  if (existingPlayer) {
    // Player is reconnecting
    handlePlayerReconnect(tableId, playerId, socket);
    return;
  }

  tableState.players.set(playerId, {
    oderId: playerId,
    name: playerName,
    avatarUrl: playerAvatarUrl,
    seatNumber,
    stack: data?.buyIn || 10000,
    holeCards: [],
    betAmount: 0,
    totalBetInHand: 0,
    isFolded: false,
    isAllIn: false,
    isActive: true,
    // Disconnect protection fields
    isDisconnected: false,
    disconnectedAt: null,
    reconnectGracePeriod: DEFAULT_RECONNECT_GRACE,
    timeBank: DEFAULT_TIME_BANK,
    timeBankUsed: 0,
    lastPingAt: Date.now()
  });

  // Update database
  try {
    await supabase.from('poker_table_players').upsert({
      table_id: tableId,
      player_id: playerId,
      seat_number: seatNumber,
      stack: data?.buyIn || 10000,
      status: 'active'
    }, { onConflict: 'table_id,player_id' });
  } catch (error) {
    console.error("DB error:", error);
  }

  console.log(`✅ Player ${playerName} (${playerId}) joined table ${tableId} at seat ${seatNumber}`);

  // Notify player of successful join
  sendToSocket(socket, {
    type: "joined_table",
    tableId,
    seatNumber,
    state: serializeTableState(tableState)
  });

  // Broadcast to other players
  broadcastToTable(tableId, {
    type: "player_joined",
    playerId,
    playerName,
    playerAvatarUrl,
    seatNumber,
    stack: data?.buyIn || 10000
  }, playerId);
}

// Handle player leaving table
async function handleLeaveTable(socket: WebSocket, message: WSMessage, supabase: any) {
  const { tableId, playerId } = message;
  
  if (!tableId || !playerId) return;

  removePlayerFromTable(tableId, playerId);

  // Update database
  try {
    await supabase.from('poker_table_players')
      .update({ status: 'left' })
      .eq('table_id', tableId)
      .eq('player_id', playerId);
  } catch (error) {
    console.error("DB error:", error);
  }

  sendToSocket(socket, { type: "left_table", tableId });
  
  broadcastToTable(tableId, {
    type: "player_left",
    playerId
  }, playerId);
}

// Handle player action (fold, check, call, raise, all-in)
async function handlePlayerAction(socket: WebSocket, message: WSMessage, supabase: any) {
  const { tableId, playerId, data } = message;
  
  if (!tableId || !playerId || !data?.action) {
    sendToSocket(socket, { type: "error", message: "Invalid action data" });
    return;
  }

  const tableState = tableStates.get(tableId);
  if (!tableState) {
    sendToSocket(socket, { type: "error", message: "Table not found" });
    return;
  }

  const player = tableState.players.get(playerId);
  if (!player) {
    sendToSocket(socket, { type: "error", message: "Player not in table" });
    return;
  }

  // Verify it's player's turn
  if (tableState.currentPlayerSeat !== player.seatNumber) {
    sendToSocket(socket, { type: "error", message: "Not your turn" });
    return;
  }

  const { action, amount } = data;
  let actionResult: any = { success: true };

  switch (action) {
    case "fold":
      player.isFolded = true;
      actionResult.action = "fold";
      break;

    case "check":
      if (tableState.currentBet > player.betAmount) {
        sendToSocket(socket, { type: "error", message: "Cannot check, there's a bet" });
        return;
      }
      actionResult.action = "check";
      // If BB checks, they've used their option
      if (tableState.phase === 'preflop' && player.seatNumber === tableState.bigBlindSeat) {
        tableState.bbHasActed = true;
        console.log(`🎯 BB used option: check`);
      }
      break;

    case "call":
      const callAmount = tableState.currentBet - player.betAmount;
      if (callAmount > player.stack) {
        // All-in
        const allInCallAmount = player.stack;
        player.betAmount += allInCallAmount;
        player.totalBetInHand += allInCallAmount;
        tableState.pot += allInCallAmount;
        player.stack = 0;
        player.isAllIn = true;
        actionResult.action = "all-in";
        actionResult.amount = allInCallAmount;
      } else {
        player.totalBetInHand += callAmount;
        player.betAmount = tableState.currentBet;
        player.stack -= callAmount;
        tableState.pot += callAmount;
        actionResult.action = "call";
        actionResult.amount = callAmount;
      }
      break;

    case "raise":
      const raiseAmount = amount || (tableState.currentBet + tableState.minRaise);
      
      // Validate minimum raise
      const actualRaise = raiseAmount - tableState.currentBet;
      if (actualRaise < tableState.minRaise && raiseAmount < player.stack + player.betAmount) {
        sendToSocket(socket, { 
          type: "error", 
          message: `Minimum raise is ${tableState.minRaise}. Current bet: ${tableState.currentBet}, min raise to: ${tableState.currentBet + tableState.minRaise}` 
        });
        return;
      }
      
      const totalBet = raiseAmount;
      const toAdd = totalBet - player.betAmount;
      
      if (toAdd > player.stack) {
        sendToSocket(socket, { type: "error", message: "Not enough chips" });
        return;
      }
      
      player.stack -= toAdd;
      player.betAmount = totalBet;
      player.totalBetInHand += toAdd;
      tableState.pot += toAdd;
      
      // Update betting state
      tableState.lastRaiserSeat = player.seatNumber;
      tableState.lastRaiseAmount = actualRaise;
      tableState.minRaise = Math.max(tableState.minRaise, actualRaise); // Min raise increases
      tableState.currentBet = totalBet;
      
      actionResult.action = "raise";
      actionResult.amount = totalBet;
      actionResult.raiseSize = actualRaise;
      break;

    case "all-in":
      const allInAmount = player.stack;
      player.betAmount += allInAmount;
      player.totalBetInHand += allInAmount;
      tableState.pot += allInAmount;
      player.stack = 0;
      player.isAllIn = true;
      if (player.betAmount > tableState.currentBet) {
        tableState.currentBet = player.betAmount;
      }
      actionResult.action = "all-in";
      actionResult.amount = allInAmount;
      break;

    default:
      sendToSocket(socket, { type: "error", message: "Unknown action" });
      return;
  }

  // Log action to database
  try {
    if (tableState.currentHandId) {
      await supabase.from('poker_actions').insert({
        hand_id: tableState.currentHandId,
        player_id: playerId,
        seat_number: player.seatNumber,
        action_type: action,
        amount: actionResult.amount || 0,
        phase: tableState.phase,
        action_order: Date.now()
      });
    }
  } catch (error) {
    console.error("DB error logging action:", error);
  }

  // Clear current timer since player acted
  clearTableTimer(tableId!);
  
  // Move to next player or next phase
  const nextResult = moveToNextPlayer(tableState);
  
  if (nextResult.phaseComplete) {
    await advancePhase(tableState, supabase);
  } else {
    // Start timer for next player
    startActionTimer(tableId!, supabase);
  }

  // Broadcast action to all players
  broadcastToTable(tableId!, {
    type: "player_action",
    playerId,
    seatNumber: player.seatNumber,
    ...actionResult,
    state: serializeTableState(tableState)
  });

  console.log(`🎯 Player ${playerId} action: ${action}`, actionResult);
}

// Handle starting a new hand
async function handleStartHand(socket: WebSocket, message: WSMessage, supabase: any) {
  const { tableId } = message;
  
  if (!tableId) {
    sendToSocket(socket, { type: "error", message: "tableId required" });
    return;
  }

  const tableState = tableStates.get(tableId);
  if (!tableState) {
    sendToSocket(socket, { type: "error", message: "Table not found" });
    return;
  }

  const activePlayers = Array.from(tableState.players.values()).filter(p => p.isActive && p.stack > 0);
  
  if (activePlayers.length < 2) {
    sendToSocket(socket, { type: "error", message: "Need at least 2 players" });
    return;
  }

  // Create new deck and shuffle
  tableState.deck = createShuffledDeck();
  tableState.phase = 'preflop';
  tableState.pot = 0;
  tableState.currentBet = 0;
  tableState.communityCards = [];
  tableState.totalRakeCollected = 0; // Reset rake for new hand

  // Reset player states
  tableState.players.forEach(player => {
    player.holeCards = [];
    player.betAmount = 0;
    player.totalBetInHand = 0;
    player.isFolded = false;
    player.isAllIn = false;
  });
  
  // Reset side pots
  tableState.sidePots = [];
  tableState.totalBetsPerPlayer = new Map();

  // Count active players for heads-up detection
  const activePlayersList = Array.from(tableState.players.values()).filter(p => p.isActive && p.stack > 0);
  const isHeadsUp = activePlayersList.length === 2;

  // Move dealer button
  tableState.dealerSeat = getNextActiveSeat(tableState, tableState.dealerSeat);
  
  if (isHeadsUp) {
    // HEADS-UP RULES: Dealer is Small Blind, other player is Big Blind
    // Dealer (SB) acts first preflop, BB acts first postflop
    tableState.smallBlindSeat = tableState.dealerSeat;
    tableState.bigBlindSeat = getNextActiveSeat(tableState, tableState.dealerSeat);
    console.log(`🎯 HEADS-UP: Dealer/SB=${tableState.smallBlindSeat}, BB=${tableState.bigBlindSeat}`);
  } else {
    // NORMAL RULES: SB is left of dealer, BB is left of SB
    tableState.smallBlindSeat = getNextActiveSeat(tableState, tableState.dealerSeat);
    tableState.bigBlindSeat = getNextActiveSeat(tableState, tableState.smallBlindSeat);
    console.log(`🎯 NORMAL: Dealer=${tableState.dealerSeat}, SB=${tableState.smallBlindSeat}, BB=${tableState.bigBlindSeat}`);
  }

  // Post blinds and antes using table configuration
  const smallBlind = tableState.smallBlindAmount;
  const bigBlind = tableState.bigBlindAmount;
  const ante = tableState.anteAmount;
  
  // Reset betting state for new hand
  tableState.minRaise = bigBlind;
  tableState.lastRaiserSeat = null;
  tableState.lastRaiseAmount = bigBlind;
  tableState.bbHasActed = false; // BB hasn't acted yet
  
  // Reset straddle state
  tableState.straddleSeat = null;
  tableState.straddleAmount = 0;
  tableState.pendingStraddles = new Map();

  // ===== BUTTON ANTE (dealer pays ante for all) =====
  if (tableState.buttonAnteEnabled && tableState.buttonAnteAmount > 0) {
    const dealerPlayer = getPlayerBySeat(tableState, tableState.dealerSeat);
    if (dealerPlayer && !dealerPlayer.isAllIn) {
      const totalButtonAnte = tableState.buttonAnteAmount * activePlayersList.length;
      const actualAnte = Math.min(totalButtonAnte, dealerPlayer.stack);
      dealerPlayer.stack -= actualAnte;
      dealerPlayer.totalBetInHand += actualAnte;
      tableState.pot += actualAnte;
      if (dealerPlayer.stack === 0) dealerPlayer.isAllIn = true;
      console.log(`🔘 Button Ante: Dealer paid ${actualAnte} for ${activePlayersList.length} players`);
    }
  }
  // ===== BIG BLIND ANTE (BB pays ante for all - tournament style) =====
  else if (tableState.bigBlindAnteEnabled && tableState.bigBlindAnteAmount > 0) {
    const bbPlayerForAnte = getPlayerBySeat(tableState, tableState.bigBlindSeat);
    if (bbPlayerForAnte && !bbPlayerForAnte.isAllIn) {
      const totalBBAnte = tableState.bigBlindAnteAmount * activePlayersList.length;
      const actualAnte = Math.min(totalBBAnte, bbPlayerForAnte.stack);
      bbPlayerForAnte.stack -= actualAnte;
      bbPlayerForAnte.totalBetInHand += actualAnte;
      tableState.pot += actualAnte;
      if (bbPlayerForAnte.stack === 0) bbPlayerForAnte.isAllIn = true;
      console.log(`🎯 BB Ante: Big Blind paid ${actualAnte} for ${activePlayersList.length} players`);
    }
  }
  // ===== STANDARD ANTES (each player pays) =====
  else if (ante > 0) {
    let totalAntes = 0;
    tableState.players.forEach(player => {
      if (player.isActive && player.stack > 0) {
        const anteAmount = Math.min(ante, player.stack);
        player.stack -= anteAmount;
        player.totalBetInHand += anteAmount;
        totalAntes += anteAmount;
        if (player.stack === 0) player.isAllIn = true;
      }
    });
    tableState.pot += totalAntes;
    console.log(`💰 Collected ${totalAntes} in antes from ${Array.from(tableState.players.values()).filter(p => p.isActive).length} players`);
  }

  const sbPlayer = getPlayerBySeat(tableState, tableState.smallBlindSeat);
  const bbPlayer = getPlayerBySeat(tableState, tableState.bigBlindSeat);

  if (sbPlayer && !sbPlayer.isAllIn) {
    const sbAmount = Math.min(smallBlind, sbPlayer.stack);
    sbPlayer.betAmount = sbAmount;
    sbPlayer.totalBetInHand += sbAmount;
    sbPlayer.stack -= sbAmount;
    tableState.pot += sbAmount;
    if (sbPlayer.stack === 0) sbPlayer.isAllIn = true;
  }

  if (bbPlayer && !bbPlayer.isAllIn) {
    const bbAmount = Math.min(bigBlind, bbPlayer.stack);
    bbPlayer.betAmount = bbAmount;
    bbPlayer.totalBetInHand += bbAmount;
    bbPlayer.stack -= bbAmount;
    tableState.pot += bbAmount;
    tableState.currentBet = bbAmount;
    if (bbPlayer.stack === 0) bbPlayer.isAllIn = true;
  }

  // ===== STRADDLE HANDLING =====
  let firstToActSeat = isHeadsUp ? tableState.smallBlindSeat : getNextActiveSeat(tableState, tableState.bigBlindSeat);
  
  if (tableState.straddleEnabled && !isHeadsUp) {
    // UTG Straddle (traditional) - player left of BB
    const utgSeat = getNextActiveSeat(tableState, tableState.bigBlindSeat);
    const utgPlayer = getPlayerBySeat(tableState, utgSeat);
    
    // Check for pending straddles (set before hand started)
    if (tableState.pendingStraddles.has(utgSeat) && utgPlayer && !utgPlayer.isAllIn) {
      const straddleAmount = tableState.pendingStraddles.get(utgSeat)!;
      const actualStraddle = Math.min(straddleAmount, utgPlayer.stack);
      
      if (actualStraddle >= bigBlind * 2) { // Valid straddle must be at least 2x BB
        utgPlayer.betAmount = actualStraddle;
        utgPlayer.totalBetInHand += actualStraddle;
        utgPlayer.stack -= actualStraddle;
        tableState.pot += actualStraddle;
        tableState.currentBet = actualStraddle;
        tableState.straddleSeat = utgSeat;
        tableState.straddleAmount = actualStraddle;
        tableState.minRaise = actualStraddle; // Min raise is now straddle amount
        
        if (utgPlayer.stack === 0) utgPlayer.isAllIn = true;
        
        // First to act is now left of straddler
        firstToActSeat = getNextActiveSeat(tableState, utgSeat);
        
        console.log(`🎰 UTG Straddle: Seat ${utgSeat} posted ${actualStraddle}`);
        
        // ===== DOUBLE/TRIPLE STRADDLE (Mississippi) =====
        if (tableState.mississippiStraddleEnabled) {
          let currentStraddleSeat = utgSeat;
          let currentStraddleAmount = actualStraddle;
          let straddleCount = 1;
          
          while (straddleCount < tableState.maxStraddleCount) {
            const nextStraddleSeat = getNextActiveSeat(tableState, currentStraddleSeat);
            
            // Don't allow straddle from blinds
            if (nextStraddleSeat === tableState.smallBlindSeat || 
                nextStraddleSeat === tableState.bigBlindSeat) {
              break;
            }
            
            if (tableState.pendingStraddles.has(nextStraddleSeat)) {
              const nextStraddleAmount = tableState.pendingStraddles.get(nextStraddleSeat)!;
              const nextPlayer = getPlayerBySeat(tableState, nextStraddleSeat);
              
              if (nextPlayer && !nextPlayer.isAllIn && nextStraddleAmount >= currentStraddleAmount * 2) {
                const actualNextStraddle = Math.min(nextStraddleAmount, nextPlayer.stack);
                
                nextPlayer.betAmount = actualNextStraddle;
                nextPlayer.totalBetInHand += actualNextStraddle;
                nextPlayer.stack -= actualNextStraddle;
                tableState.pot += actualNextStraddle;
                tableState.currentBet = actualNextStraddle;
                tableState.straddleSeat = nextStraddleSeat;
                tableState.straddleAmount = actualNextStraddle;
                tableState.minRaise = actualNextStraddle;
                
                if (nextPlayer.stack === 0) nextPlayer.isAllIn = true;
                
                firstToActSeat = getNextActiveSeat(tableState, nextStraddleSeat);
                currentStraddleSeat = nextStraddleSeat;
                currentStraddleAmount = actualNextStraddle;
                straddleCount++;
                
                console.log(`🎰 Straddle #${straddleCount + 1}: Seat ${nextStraddleSeat} posted ${actualNextStraddle}`);
              } else {
                break;
              }
            } else {
              break;
            }
          }
        }
      }
    }
    
    // Clear pending straddles
    tableState.pendingStraddles.clear();
  }

  // Deal hole cards
  tableState.players.forEach(player => {
    if (player.isActive && player.stack >= 0) {
      player.holeCards = [tableState.deck.pop()!, tableState.deck.pop()!];
    }
  });

  // Set first to act (adjusted for straddles)
  tableState.currentPlayerSeat = firstToActSeat;

  // Create hand in database
  try {
    const { data: handData } = await supabase.from('poker_hands').insert({
      table_id: tableId,
      dealer_seat: tableState.dealerSeat,
      small_blind_seat: tableState.smallBlindSeat,
      big_blind_seat: tableState.bigBlindSeat,
      pot: tableState.pot,
      phase: 'preflop'
    }).select().single();

    if (handData) {
      tableState.currentHandId = handData.id;

      // Update table with current hand
      await supabase.from('poker_tables')
        .update({ current_hand_id: handData.id, status: 'playing' })
        .eq('id', tableId);
    }
  } catch (error) {
    console.error("DB error creating hand:", error);
  }

  console.log(`🃏 New hand started on table ${tableId}`);

  // Send personalized state to each player (with their hole cards)
  const connections = tableConnections.get(tableId);
  if (connections) {
    connections.forEach((ws, oderId) => {
      const player = tableState.players.get(oderId);
      sendToSocket(ws, {
        type: "hand_started",
        handId: tableState.currentHandId,
        dealerSeat: tableState.dealerSeat,
        smallBlindSeat: tableState.smallBlindSeat,
        bigBlindSeat: tableState.bigBlindSeat,
        yourCards: player?.holeCards || [],
        pot: tableState.pot,
        currentBet: tableState.currentBet,
        currentPlayerSeat: tableState.currentPlayerSeat,
        state: serializeTableState(tableState, oderId)
      });
    });
  }
  
  // Start action timer for first player
  startActionTimer(tableId, supabase);
}

// Get current state
async function handleGetState(socket: WebSocket, message: WSMessage) {
  const { tableId, playerId } = message;
  
  if (!tableId) {
    sendToSocket(socket, { type: "error", message: "tableId required" });
    return;
  }

  const tableState = tableStates.get(tableId);
  if (!tableState) {
    sendToSocket(socket, { type: "error", message: "Table not found" });
    return;
  }

  sendToSocket(socket, {
    type: "state",
    state: serializeTableState(tableState, playerId)
  });
}

// Handle chat message
async function handleChat(socket: WebSocket, message: WSMessage) {
  const { tableId, playerId, data } = message;
  
  if (!tableId || !data?.text) return;

  broadcastToTable(tableId, {
    type: "chat",
    playerId,
    text: data.text,
    timestamp: Date.now()
  });
}

// ===== STRADDLE HANDLER =====
async function handlePostStraddle(socket: WebSocket, message: WSMessage) {
  const { tableId, playerId, data } = message;
  
  if (!tableId || !playerId) {
    sendToSocket(socket, { type: "error", message: "tableId and playerId required" });
    return;
  }

  const tableState = tableStates.get(tableId);
  if (!tableState) {
    sendToSocket(socket, { type: "error", message: "Table not found" });
    return;
  }

  // Can only post straddle during waiting phase
  if (tableState.phase !== 'waiting') {
    sendToSocket(socket, { type: "error", message: "Can only post straddle before hand starts" });
    return;
  }

  if (!tableState.straddleEnabled) {
    sendToSocket(socket, { type: "error", message: "Straddle is not enabled at this table" });
    return;
  }

  const player = tableState.players.get(playerId);
  if (!player) {
    sendToSocket(socket, { type: "error", message: "Player not found" });
    return;
  }

  const straddleAmount = data?.amount || (tableState.bigBlindAmount * 2);
  
  // Validate straddle amount (must be at least 2x BB)
  if (straddleAmount < tableState.bigBlindAmount * 2) {
    sendToSocket(socket, { type: "error", message: `Straddle must be at least ${tableState.bigBlindAmount * 2}` });
    return;
  }

  // Check if player has enough chips
  if (player.stack < straddleAmount) {
    sendToSocket(socket, { type: "error", message: "Not enough chips for straddle" });
    return;
  }

  // Check straddle count limit
  if (tableState.pendingStraddles.size >= tableState.maxStraddleCount) {
    sendToSocket(socket, { type: "error", message: `Maximum ${tableState.maxStraddleCount} straddles allowed` });
    return;
  }

  // Register pending straddle
  tableState.pendingStraddles.set(player.seatNumber, straddleAmount);

  console.log(`🎰 Straddle registered: Seat ${player.seatNumber} will post ${straddleAmount}`);

  sendToSocket(socket, {
    type: "straddle_registered",
    seatNumber: player.seatNumber,
    amount: straddleAmount
  });

  broadcastToTable(tableId, {
    type: "straddle_pending",
    playerId,
    seatNumber: player.seatNumber,
    amount: straddleAmount
  }, playerId);
}

// ===== TABLE CONFIGURATION HANDLER =====
async function handleConfigureTable(socket: WebSocket, message: WSMessage) {
  const { tableId, playerId, data } = message;
  
  if (!tableId || !data) {
    sendToSocket(socket, { type: "error", message: "tableId and data required" });
    return;
  }

  const tableState = tableStates.get(tableId);
  if (!tableState) {
    sendToSocket(socket, { type: "error", message: "Table not found" });
    return;
  }

  // Can only configure during waiting phase
  if (tableState.phase !== 'waiting') {
    sendToSocket(socket, { type: "error", message: "Can only configure table between hands" });
    return;
  }

  // Apply configuration updates
  if (data.smallBlindAmount !== undefined) {
    tableState.smallBlindAmount = data.smallBlindAmount;
  }
  if (data.bigBlindAmount !== undefined) {
    tableState.bigBlindAmount = data.bigBlindAmount;
    tableState.minRaise = data.bigBlindAmount;
  }
  if (data.anteAmount !== undefined) {
    tableState.anteAmount = data.anteAmount;
  }
  
  // Straddle settings
  if (data.straddleEnabled !== undefined) {
    tableState.straddleEnabled = data.straddleEnabled;
  }
  if (data.mississippiStraddleEnabled !== undefined) {
    tableState.mississippiStraddleEnabled = data.mississippiStraddleEnabled;
  }
  if (data.maxStraddleCount !== undefined) {
    tableState.maxStraddleCount = Math.min(5, Math.max(1, data.maxStraddleCount));
  }
  
  // Button Ante settings
  if (data.buttonAnteEnabled !== undefined) {
    tableState.buttonAnteEnabled = data.buttonAnteEnabled;
    // Disable other ante types when button ante is enabled
    if (data.buttonAnteEnabled) {
      tableState.bigBlindAnteEnabled = false;
      tableState.anteAmount = 0;
    }
  }
  if (data.buttonAnteAmount !== undefined) {
    tableState.buttonAnteAmount = data.buttonAnteAmount;
  }
  
  // Big Blind Ante settings
  if (data.bigBlindAnteEnabled !== undefined) {
    tableState.bigBlindAnteEnabled = data.bigBlindAnteEnabled;
    // Disable other ante types when BB ante is enabled
    if (data.bigBlindAnteEnabled) {
      tableState.buttonAnteEnabled = false;
      tableState.anteAmount = 0;
    }
  }
  if (data.bigBlindAnteAmount !== undefined) {
    tableState.bigBlindAnteAmount = data.bigBlindAnteAmount;
  }
  
  // Timer settings
  if (data.actionTimer !== undefined) {
    tableState.actionTimer = Math.min(120, Math.max(5, data.actionTimer));
  }
  
  // Run it twice
  if (data.runItTwiceEnabled !== undefined) {
    tableState.runItTwiceEnabled = data.runItTwiceEnabled;
  }
  
  // Rake settings
  if (data.rakePercent !== undefined) {
    tableState.rakePercent = Math.min(10, Math.max(0, data.rakePercent));
  }
  if (data.rakeCap !== undefined) {
    tableState.rakeCap = Math.max(0, data.rakeCap);
  }

  console.log(`⚙️ Table ${tableId} configured:`, {
    blinds: `${tableState.smallBlindAmount}/${tableState.bigBlindAmount}`,
    ante: tableState.anteAmount,
    buttonAnte: tableState.buttonAnteEnabled ? tableState.buttonAnteAmount : 'disabled',
    bbAnte: tableState.bigBlindAnteEnabled ? tableState.bigBlindAnteAmount : 'disabled',
    straddle: tableState.straddleEnabled,
    mississippi: tableState.mississippiStraddleEnabled
  });

  sendToSocket(socket, {
    type: "table_configured",
    config: {
      smallBlindAmount: tableState.smallBlindAmount,
      bigBlindAmount: tableState.bigBlindAmount,
      anteAmount: tableState.anteAmount,
      straddleEnabled: tableState.straddleEnabled,
      mississippiStraddleEnabled: tableState.mississippiStraddleEnabled,
      maxStraddleCount: tableState.maxStraddleCount,
      buttonAnteEnabled: tableState.buttonAnteEnabled,
      buttonAnteAmount: tableState.buttonAnteAmount,
      bigBlindAnteEnabled: tableState.bigBlindAnteEnabled,
      bigBlindAnteAmount: tableState.bigBlindAnteAmount,
      actionTimer: tableState.actionTimer,
      runItTwiceEnabled: tableState.runItTwiceEnabled,
      rakePercent: tableState.rakePercent,
      rakeCap: tableState.rakeCap
    }
  });

  broadcastToTable(tableId, {
    type: "table_settings_changed",
    config: {
      smallBlindAmount: tableState.smallBlindAmount,
      bigBlindAmount: tableState.bigBlindAmount,
      anteAmount: tableState.anteAmount,
      straddleEnabled: tableState.straddleEnabled,
      buttonAnteEnabled: tableState.buttonAnteEnabled,
      bigBlindAnteEnabled: tableState.bigBlindAnteEnabled
    }
  }, playerId);
}

// Helper functions
function createInitialTableState(tableId: string): TableState {
  return {
    tableId,
    currentHandId: null,
    phase: 'waiting',
    pot: 0,
    currentBet: 0,
    currentPlayerSeat: null,
    communityCards: [],
    players: new Map(),
    dealerSeat: 0,
    smallBlindSeat: 0,
    bigBlindSeat: 0,
    deck: [],
    sidePots: [],
    totalBetsPerPlayer: new Map(),
    // Betting configuration
    smallBlindAmount: 50,
    bigBlindAmount: 100,
    anteAmount: 0, // No ante by default
    minRaise: 100, // BB is min raise initially
    lastRaiserSeat: null,
    lastRaiseAmount: 0,
    actionTimer: 30, // 30 seconds default
    turnStartTime: null,
    bbHasActed: false, // BB hasn't had their option yet
    runItTwiceEnabled: true, // Run it twice enabled by default
    // Rake configuration
    rakePercent: 5, // 5% rake by default
    rakeCap: 500, // Max 500 chips rake per hand
    totalRakeCollected: 0, // Reset at start of each hand
    // ===== STRADDLE & ADVANCED BLINDS =====
    straddleEnabled: true, // Allow straddle bets by default
    straddleSeat: null,
    straddleAmount: 0,
    buttonAnteEnabled: false, // Button ante disabled by default
    buttonAnteAmount: 0,
    bigBlindAnteEnabled: false, // BB ante disabled by default
    bigBlindAnteAmount: 0,
    mississippiStraddleEnabled: false, // Only UTG straddle by default
    pendingStraddles: new Map(),
    maxStraddleCount: 3 // Allow up to 3 straddles (double straddle, etc.)
  };
}

// Calculate rake from a pot amount
function calculateRake(potAmount: number, rakePercent: number, rakeCap: number, alreadyCollected: number): { rake: number; netPot: number } {
  const remainingCap = Math.max(0, rakeCap - alreadyCollected);
  const calculatedRake = Math.floor(potAmount * (rakePercent / 100));
  const rake = Math.min(calculatedRake, remainingCap);
  const netPot = potAmount - rake;
  return { rake, netPot };
}

function findAvailableSeat(tableState: TableState): number {
  const occupiedSeats = new Set(
    Array.from(tableState.players.values()).map(p => p.seatNumber)
  );
  
  for (let i = 1; i <= 9; i++) {
    if (!occupiedSeats.has(i)) return i;
  }
  return -1;
}

// Cryptographically secure random number generator
function getSecureRandomInt(max: number): number {
  const randomBuffer = new Uint32Array(1);
  crypto.getRandomValues(randomBuffer);
  // Use rejection sampling to avoid modulo bias
  const maxValid = Math.floor(0xFFFFFFFF / max) * max;
  let randomValue = randomBuffer[0];
  while (randomValue >= maxValid) {
    crypto.getRandomValues(randomBuffer);
    randomValue = randomBuffer[0];
  }
  return randomValue % max;
}

function createShuffledDeck(): string[] {
  const suits = ['h', 'd', 'c', 's'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const deck: string[] = [];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(rank + suit);
    }
  }
  
  // Fisher-Yates shuffle with cryptographically secure random
  for (let i = deck.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  console.log(`🎴 Deck shuffled with crypto.getRandomValues (${deck.length} cards)`);
  
  return deck;
}

function getNextActiveSeat(tableState: TableState, currentSeat: number): number {
  const players = Array.from(tableState.players.values())
    .filter(p => p.isActive && !p.isFolded && p.stack >= 0)
    .sort((a, b) => a.seatNumber - b.seatNumber);
  
  if (players.length === 0) return currentSeat;
  
  for (const player of players) {
    if (player.seatNumber > currentSeat) return player.seatNumber;
  }
  
  return players[0].seatNumber;
}

function getPlayerBySeat(tableState: TableState, seatNumber: number): PlayerState | undefined {
  return Array.from(tableState.players.values()).find(p => p.seatNumber === seatNumber);
}

function moveToNextPlayer(tableState: TableState): { phaseComplete: boolean } {
  const activePlayers = Array.from(tableState.players.values())
    .filter(p => p.isActive && !p.isFolded && !p.isAllIn);
  
  // Only one player left who can act - they win
  if (activePlayers.length <= 1) {
    // Check if there are any all-in players
    const allInPlayers = Array.from(tableState.players.values())
      .filter(p => p.isActive && !p.isFolded && p.isAllIn);
    
    if (allInPlayers.length > 0 && activePlayers.length === 0) {
      // All remaining players are all-in, proceed to showdown
      return { phaseComplete: true };
    }
    
    if (activePlayers.length === 0 && allInPlayers.length === 0) {
      // Everyone folded except maybe one
      return { phaseComplete: true };
    }
    
    if (activePlayers.length === 1 && allInPlayers.length === 0) {
      // Only one player left, check if they matched
      const remaining = activePlayers[0];
      if (remaining.betAmount >= tableState.currentBet) {
        return { phaseComplete: true };
      }
    }
  }

  // Find next seat
  const nextSeat = getNextActiveSeat(tableState, tableState.currentPlayerSeat || 0);
  
  // If we've gone back to the last raiser, betting is complete
  if (tableState.lastRaiserSeat !== null && nextSeat === tableState.lastRaiserSeat) {
    // Check if everyone has matched
    const allMatched = activePlayers.every(p => p.betAmount === tableState.currentBet);
    if (allMatched) {
      return { phaseComplete: true };
    }
  }
  
  // Check if all active players have matched the current bet
  const allMatched = activePlayers.every(p => p.betAmount === tableState.currentBet);
  
  // Preflop special case: BB gets option if no raise and action returns to them
  if (tableState.phase === 'preflop' && 
      tableState.lastRaiserSeat === null && 
      nextSeat === tableState.bigBlindSeat &&
      allMatched &&
      !tableState.bbHasActed) { // BB hasn't used their option yet
    const bbPlayer = getPlayerBySeat(tableState, tableState.bigBlindSeat);
    if (bbPlayer && !bbPlayer.isAllIn && !bbPlayer.isFolded) {
      // Give BB option to check or raise
      console.log(`🎯 BB Option: giving seat ${tableState.bigBlindSeat} the option to check/raise`);
      tableState.currentPlayerSeat = nextSeat;
      tableState.turnStartTime = Date.now();
      return { phaseComplete: false };
    }
  }
  
  // If BB has acted (checked), and all matched, phase is complete
  if (tableState.phase === 'preflop' && 
      tableState.bbHasActed && 
      tableState.lastRaiserSeat === null && 
      allMatched) {
    return { phaseComplete: true };
  }
  
  // If all matched and we've completed a round
  if (allMatched && tableState.currentPlayerSeat !== null) {
    // Need to make sure everyone has had a chance to act after last raise
    if (tableState.lastRaiserSeat === null || nextSeat === tableState.lastRaiserSeat) {
      return { phaseComplete: true };
    }
  }

  tableState.currentPlayerSeat = nextSeat;
  tableState.turnStartTime = Date.now();
  return { phaseComplete: false };
}

async function advancePhase(tableState: TableState, supabase: any) {
  // Reset bets for new betting round
  tableState.players.forEach(p => {
    p.betAmount = 0;
  });
  tableState.currentBet = 0;
  tableState.lastRaiserSeat = null;
  tableState.lastRaiseAmount = 0;
  tableState.minRaise = tableState.bigBlindAmount; // Reset min raise to BB

  const phases: TableState['phase'][] = ['preflop', 'flop', 'turn', 'river', 'showdown'];
  const currentIndex = phases.indexOf(tableState.phase);
  
  if (currentIndex < phases.length - 1) {
    tableState.phase = phases[currentIndex + 1];
    
    // Deal community cards
    switch (tableState.phase) {
      case 'flop':
        tableState.deck.pop(); // Burn
        tableState.communityCards.push(
          tableState.deck.pop()!,
          tableState.deck.pop()!,
          tableState.deck.pop()!
        );
        break;
      case 'turn':
        tableState.deck.pop(); // Burn
        tableState.communityCards.push(tableState.deck.pop()!);
        break;
      case 'river':
        tableState.deck.pop(); // Burn
        tableState.communityCards.push(tableState.deck.pop()!);
        break;
      case 'showdown':
        // Clear timer before showdown
        clearTableTimer(tableState.tableId);
        await handleShowdown(tableState, supabase);
        return;
    }

    // Determine first to act post-flop
    // In heads-up: BB acts first (not dealer/SB)
    // Normal: First active player after dealer acts first
    const activePlayersPostflop = Array.from(tableState.players.values())
      .filter(p => p.isActive && !p.isFolded && !p.isAllIn);
    const isHeadsUpPostflop = activePlayersPostflop.length === 2 && 
      Array.from(tableState.players.values()).filter(p => p.isActive && p.stack >= 0).length === 2;
    
    if (isHeadsUpPostflop) {
      // Heads-up postflop: BB acts first
      const bbPlayer = getPlayerBySeat(tableState, tableState.bigBlindSeat);
      if (bbPlayer && !bbPlayer.isFolded && !bbPlayer.isAllIn) {
        tableState.currentPlayerSeat = tableState.bigBlindSeat;
      } else {
        tableState.currentPlayerSeat = getNextActiveSeat(tableState, tableState.dealerSeat);
      }
      console.log(`🎯 HEADS-UP postflop: First to act = seat ${tableState.currentPlayerSeat}`);
    } else {
      // Normal: First active player after dealer
      tableState.currentPlayerSeat = getNextActiveSeat(tableState, tableState.dealerSeat);
    }
    
    // Start timer for first player in new phase
    startActionTimer(tableState.tableId, supabase);

    // Update database
    if (tableState.currentHandId) {
      await supabase.from('poker_hands')
        .update({ 
          phase: tableState.phase,
          community_cards: tableState.communityCards,
          pot: tableState.pot
        })
        .eq('id', tableState.currentHandId);
    }

    // Broadcast phase change
    broadcastToTable(tableState.tableId, {
      type: "phase_change",
      phase: tableState.phase,
      communityCards: tableState.communityCards,
      pot: tableState.pot,
      currentPlayerSeat: tableState.currentPlayerSeat
    });
  }
}

async function handleShowdown(tableState: TableState, supabase: any) {
  tableState.phase = 'showdown';
  
  const allPlayers = Array.from(tableState.players.entries());
  const activePlayers = allPlayers.filter(([_, p]) => !p.isFolded);

  // If only one player left, they win by default (all pots minus rake)
  if (activePlayers.length === 1) {
    const [winnerId, winnerState] = activePlayers[0];
    
    // Calculate rake even for uncontested pots
    const { rake, netPot } = calculateRake(
      tableState.pot, 
      tableState.rakePercent, 
      tableState.rakeCap, 
      tableState.totalRakeCollected
    );
    tableState.totalRakeCollected += rake;
    
    if (rake > 0) {
      console.log(`💸 Rake from uncontested pot: ${rake} chips (${tableState.rakePercent}% of ${tableState.pot})`);
    }
    
    winnerState.stack += netPot;
    
    await finalizeHand(tableState, supabase, [{ oderId: winnerId, amount: netPot }], activePlayers, rake);
    return;
  }

  // Check if we should run it twice (all remaining players are all-in and more cards to deal)
  const allActiveAreAllIn = activePlayers.every(([_, p]) => p.isAllIn);
  const cardsRemaining = 5 - tableState.communityCards.length;
  const shouldRunItTwice = tableState.runItTwiceEnabled && allActiveAreAllIn && cardsRemaining > 0;

  if (shouldRunItTwice) {
    console.log(`🎲 RUN IT TWICE: All players all-in, ${cardsRemaining} cards remaining`);
    await handleRunItTwice(tableState, supabase, activePlayers, allPlayers, cardsRemaining);
    return;
  }

  // Standard single-board showdown
  await handleStandardShowdown(tableState, supabase, activePlayers, allPlayers);
}

// Run It Twice - deal remaining cards twice and split pot
async function handleRunItTwice(
  tableState: TableState,
  supabase: any,
  activePlayers: [string, PlayerState][],
  allPlayers: [string, PlayerState][],
  cardsRemaining: number
) {
  // Save original deck state
  const originalDeck = [...tableState.deck];
  const originalCommunityCards = [...tableState.communityCards];
  
  // Build contributions for side pot calculation
  const contributions: PlayerContribution[] = allPlayers.map(([playerId, player]) => ({
    playerId,
    totalBet: player.totalBetInHand || player.betAmount,
    isFolded: player.isFolded,
    isAllIn: player.isAllIn
  }));
  const potResult = calculateSidePots(contributions);
  const allPots = [potResult.mainPot, ...potResult.sidePots];
  
  // Calculate total rake BEFORE running boards (rake taken from full pot, not per run)
  let totalRakeThisHand = 0;
  const potsAfterRake = allPots.map(pot => {
    if (pot.amount <= 0) return { ...pot, netAmount: 0 };
    const { rake, netPot } = calculateRake(
      pot.amount, 
      tableState.rakePercent, 
      tableState.rakeCap, 
      tableState.totalRakeCollected
    );
    tableState.totalRakeCollected += rake;
    totalRakeThisHand += rake;
    return { ...pot, netAmount: netPot };
  });
  
  if (totalRakeThisHand > 0) {
    console.log(`💸 Total rake from Run It Twice pots: ${totalRakeThisHand} chips`);
  }
  
  // Results for both runs
  const runResults: { run: number; communityCards: string[]; winners: { oderId: string; amount: number; handName: string }[] }[] = [];
  
  // Run 1 - deal remaining cards
  const run1Cards = [...originalCommunityCards];
  const deck1 = [...originalDeck];
  for (let i = 0; i < cardsRemaining; i++) {
    if (i === 0 || i === 1 || i === 2) deck1.pop(); // Burn before each street
    run1Cards.push(deck1.pop()!);
  }
  
  // Evaluate hands for run 1 (use netAmount after rake, 50% each)
  const run1Winners = evaluateAndDistributePotsWithRake(activePlayers, run1Cards, potsAfterRake, 0.5);
  runResults.push({ run: 1, communityCards: run1Cards, winners: run1Winners });
  
  // Run 2 - deal remaining cards from remaining deck
  const run2Cards = [...originalCommunityCards];
  for (let i = 0; i < cardsRemaining; i++) {
    if (i === 0 || i === 1 || i === 2) deck1.pop(); // Burn
    run2Cards.push(deck1.pop()!);
  }
  
  // Evaluate hands for run 2 (use netAmount after rake, 50% each)
  const run2Winners = evaluateAndDistributePotsWithRake(activePlayers, run2Cards, potsAfterRake, 0.5);
  runResults.push({ run: 2, communityCards: run2Cards, winners: run2Winners });
  
  // Combine results and update stacks
  const combinedResults: { oderId: string; amount: number; handName: string; runs: string }[] = [];
  
  [...run1Winners, ...run2Winners].forEach(winner => {
    const existing = combinedResults.find(w => w.oderId === winner.oderId);
    if (existing) {
      existing.amount += winner.amount;
      existing.runs += `, Run ${runResults.findIndex(r => r.winners.includes(winner)) + 1}`;
    } else {
      combinedResults.push({
        ...winner,
        runs: `Run ${runResults.findIndex(r => r.winners.includes(winner)) + 1}`
      });
    }
    
    // Update player stack
    const playerState = tableState.players.get(winner.oderId);
    if (playerState) {
      playerState.stack += winner.amount;
    }
  });
  
  console.log(`🎲 RUN IT TWICE Results:`);
  console.log(`   Run 1: ${run1Cards.join(' ')} - Winners: ${run1Winners.map(w => `${w.oderId}: ${w.amount}`).join(', ')}`);
  console.log(`   Run 2: ${run2Cards.join(' ')} - Winners: ${run2Winners.map(w => `${w.oderId}: ${w.amount}`).join(', ')}`);
  console.log(`💰 Total rake collected: ${totalRakeThisHand} chips`);
  
  // Broadcast run it twice result
  broadcastToTable(tableState.tableId, {
    type: "run_it_twice",
    runs: runResults,
    combinedWinners: combinedResults,
    playerCards: Object.fromEntries(activePlayers.map(([id, p]) => [id, p.holeCards])),
    rake: totalRakeThisHand
  });
  
  await finalizeHand(tableState, supabase, combinedResults, activePlayers, totalRakeThisHand);
}

// Helper function to evaluate hands and distribute pots (with netAmount after rake)
function evaluateAndDistributePotsWithRake(
  activePlayers: [string, PlayerState][],
  communityCards: string[],
  allPots: { amount: number; eligiblePlayers: string[]; netAmount: number }[],
  potFraction: number
): { oderId: string; amount: number; handName: string }[] {
  const playerEvaluations: { oderId: string; state: PlayerState; eval: HandEvaluation }[] = [];
  
  for (const [oderId, playerState] of activePlayers) {
    const allCards = [...playerState.holeCards, ...communityCards];
    const evaluation = evaluateHand(allCards);
    playerEvaluations.push({ oderId, state: playerState, eval: evaluation });
  }
  
  const winners: { oderId: string; amount: number; handName: string }[] = [];
  
  allPots.forEach((pot) => {
    if (pot.netAmount <= 0) return;
    
    const eligibleEvaluations = playerEvaluations.filter(p => pot.eligiblePlayers.includes(p.oderId));
    if (eligibleEvaluations.length === 0) return;
    
    const maxValue = Math.max(...eligibleEvaluations.map(p => p.eval.value));
    const potWinners = eligibleEvaluations.filter(p => p.eval.value === maxValue);
    
    const potAmount = Math.floor(pot.netAmount * potFraction);
    const amountPerWinner = Math.floor(potAmount / potWinners.length);
    const remainder = potAmount % potWinners.length;
    
    potWinners.forEach((winner, idx) => {
      const amount = amountPerWinner + (idx === 0 ? remainder : 0);
      const existing = winners.find(w => w.oderId === winner.oderId);
      if (existing) {
        existing.amount += amount;
      } else {
        winners.push({ oderId: winner.oderId, amount, handName: winner.eval.name });
      }
    });
  });
  
  return winners;
}

// Standard single-board showdown
async function handleStandardShowdown(
  tableState: TableState,
  supabase: any,
  activePlayers: [string, PlayerState][],
  allPlayers: [string, PlayerState][]
) {
  // Build contributions for side pot calculation
  const contributions: PlayerContribution[] = allPlayers.map(([playerId, player]) => ({
    playerId,
    totalBet: player.totalBetInHand || player.betAmount,
    isFolded: player.isFolded,
    isAllIn: player.isAllIn
  }));

  // Calculate side pots
  const potResult = calculateSidePots(contributions);
  console.log(`💰 Pot calculation: Main=${potResult.mainPot.amount}, SidePots=${potResult.sidePots.map(p => p.amount).join(',')}`);

  // Evaluate all active hands
  const playerEvaluations: { oderId: string; state: PlayerState; eval: HandEvaluation }[] = [];
  
  for (const [oderId, playerState] of activePlayers) {
    const allCards = [...playerState.holeCards, ...tableState.communityCards];
    const evaluation = evaluateHand(allCards);
    playerEvaluations.push({ oderId, state: playerState, eval: evaluation });
    console.log(`🃏 Player ${oderId}: ${evaluation.name} (value: ${evaluation.value})`);
  }

  // Distribute each pot to winners (with rake deduction)
  const winnerResults: { oderId: string; amount: number; handName: string; potType: string }[] = [];
  const allPots = [potResult.mainPot, ...potResult.sidePots];
  let totalRakeThisHand = 0;

  allPots.forEach((pot, potIndex) => {
    if (pot.amount <= 0) return;

    // Calculate rake for this pot
    const { rake, netPot } = calculateRake(
      pot.amount, 
      tableState.rakePercent, 
      tableState.rakeCap, 
      tableState.totalRakeCollected
    );
    tableState.totalRakeCollected += rake;
    totalRakeThisHand += rake;
    
    if (rake > 0) {
      console.log(`💸 Rake from ${potIndex === 0 ? 'Main Pot' : `Side Pot ${potIndex}`}: ${rake} chips (${tableState.rakePercent}% of ${pot.amount}, cap: ${tableState.rakeCap})`);
    }

    // Find eligible players for this pot
    const eligibleEvaluations = playerEvaluations.filter(p => pot.eligiblePlayers.includes(p.oderId));
    
    if (eligibleEvaluations.length === 0) {
      console.log(`⚠️ No eligible players for pot ${potIndex}, returning to contributors`);
      return;
    }

    // Find best hand among eligible players
    const maxValue = Math.max(...eligibleEvaluations.map(p => p.eval.value));
    const potWinners = eligibleEvaluations.filter(p => p.eval.value === maxValue);

    // Split NET pot (after rake) among winners
    const amountPerWinner = Math.floor(netPot / potWinners.length);
    const remainder = netPot % potWinners.length;

    potWinners.forEach((winner, idx) => {
      const amount = amountPerWinner + (idx === 0 ? remainder : 0);
      winner.state.stack += amount;
      
      // Check if already in results (can win multiple pots)
      const existing = winnerResults.find(w => w.oderId === winner.oderId);
      if (existing) {
        existing.amount += amount;
        existing.potType += potIndex === 0 ? '' : `, Side Pot ${potIndex}`;
      } else {
        winnerResults.push({
          oderId: winner.oderId,
          amount,
          handName: winner.eval.name,
          potType: potIndex === 0 ? 'Main Pot' : `Side Pot ${potIndex}`
        });
      }
    });

    console.log(`🏆 Pot ${potIndex} (${pot.amount} - ${rake} rake = ${netPot}): ${potWinners.map(w => w.oderId).join(', ')}`);
  });

  console.log(`💰 Total rake collected: ${totalRakeThisHand} chips`);
  console.log(`🏆 Final winners: ${winnerResults.map(w => `${w.oderId}: ${w.amount} (${w.handName})`).join(', ')}`);

  await finalizeHand(tableState, supabase, winnerResults, activePlayers, totalRakeThisHand);
}

async function finalizeHand(
  tableState: TableState, 
  supabase: any, 
  winnerResults: { oderId: string; amount: number; handName?: string }[],
  activePlayers: [string, PlayerState][],
  rakeCollected: number = 0
) {
  // Update database with complete hand data
  if (tableState.currentHandId) {
    // Update hand record
    await supabase.from('poker_hands')
      .update({ 
        phase: 'showdown',
        completed_at: new Date().toISOString(),
        community_cards: tableState.communityCards,
        pot: tableState.pot,
        winners: JSON.stringify(winnerResults.map(w => ({ 
          playerId: w.oderId, 
          amount: w.amount,
          handName: w.handName 
        })))
      })
      .eq('id', tableState.currentHandId);

    // Save all player data for hand history
    const allPlayers = Array.from(tableState.players.entries());
    const handPlayersData = allPlayers.map(([playerId, player]) => {
      const winResult = winnerResults.find(w => w.oderId === playerId);
      return {
        hand_id: tableState.currentHandId,
        player_id: playerId,
        seat_number: player.seatNumber,
        stack_start: player.totalBetInHand + player.stack + (winResult?.amount || 0), // Approximate start
        stack_end: player.stack,
        hole_cards: player.holeCards,
        bet_amount: player.totalBetInHand,
        is_folded: player.isFolded,
        is_all_in: player.isAllIn,
        hand_rank: winResult?.handName || null,
        won_amount: winResult?.amount || 0
      };
    });

    // Insert player records
    try {
      await supabase.from('poker_hand_players').insert(handPlayersData);
      console.log(`📝 Saved ${handPlayersData.length} player records for hand history`);
    } catch (error) {
      console.error("DB error saving hand players:", error);
    }

    // Update player stacks in database
    for (const winner of winnerResults) {
      const playerState = tableState.players.get(winner.oderId);
      if (playerState) {
        await supabase.from('poker_table_players')
          .update({ stack: playerState.stack })
          .eq('table_id', tableState.tableId)
          .eq('player_id', winner.oderId);
      }
    }
  }

  // Broadcast showdown result with rake info
  broadcastToTable(tableState.tableId, {
    type: "showdown",
    handId: tableState.currentHandId,
    winners: winnerResults.map(w => ({ 
      playerId: w.oderId, 
      amount: w.amount,
      handName: w.handName 
    })),
    playerCards: Object.fromEntries(
      Array.from(tableState.players.entries()).map(([id, p]) => [id, p.holeCards])
    ),
    communityCards: tableState.communityCards,
    pot: tableState.pot,
    rake: rakeCollected,
    rakePercent: tableState.rakePercent,
    rakeCap: tableState.rakeCap
  });

  // Reset for next hand
  tableState.phase = 'waiting';
  tableState.currentHandId = null;
  tableState.pot = 0;
  tableState.communityCards = [];
}

function removePlayerFromTable(tableId: string, playerId: string) {
  const connections = tableConnections.get(tableId);
  if (connections) {
    connections.delete(playerId);
    if (connections.size === 0) {
      // Clear timer when table is empty
      clearTableTimer(tableId);
      tableConnections.delete(tableId);
      tableStates.delete(tableId);
    }
  }

  const tableState = tableStates.get(tableId);
  if (tableState) {
    tableState.players.delete(playerId);
  }
}

function serializeTableState(tableState: TableState, forPlayerId?: string): any {
  const players: any[] = [];
  
  tableState.players.forEach((player, oderId) => {
    players.push({
      oderId,
      name: player.name,
      avatarUrl: player.avatarUrl,
      seatNumber: player.seatNumber,
      stack: player.stack,
      betAmount: player.betAmount,
      totalBetInHand: player.totalBetInHand,
      isFolded: player.isFolded,
      isAllIn: player.isAllIn,
      isActive: player.isActive,
      // Only show hole cards to the player themselves
      holeCards: oderId === forPlayerId ? player.holeCards : 
        (tableState.phase === 'showdown' && !player.isFolded ? player.holeCards : []),
      // Disconnect protection info
      isDisconnected: player.isDisconnected,
      timeBankRemaining: player.timeBank - player.timeBankUsed
    });
  });

  // Calculate current side pots for display
  const contributions: PlayerContribution[] = Array.from(tableState.players.entries()).map(([playerId, player]) => ({
    playerId,
    totalBet: player.totalBetInHand || 0,
    isFolded: player.isFolded,
    isAllIn: player.isAllIn
  }));
  
  const potResult = calculateSidePots(contributions);

  // Calculate time remaining for current player
  let timeRemaining: number | null = null;
  if (tableState.turnStartTime && tableState.currentPlayerSeat !== null) {
    const elapsed = (Date.now() - tableState.turnStartTime) / 1000;
    timeRemaining = Math.max(0, tableState.actionTimer - elapsed);
  }

  return {
    tableId: tableState.tableId,
    phase: tableState.phase,
    pot: tableState.pot,
    currentBet: tableState.currentBet,
    currentPlayerSeat: tableState.currentPlayerSeat,
    communityCards: tableState.communityCards,
    dealerSeat: tableState.dealerSeat,
    smallBlindSeat: tableState.smallBlindSeat,
    bigBlindSeat: tableState.bigBlindSeat,
    players,
    sidePots: {
      mainPot: potResult.mainPot,
      sidePots: potResult.sidePots,
      totalPot: potResult.totalPot
    },
    // Additional betting info
    minRaise: tableState.minRaise,
    smallBlindAmount: tableState.smallBlindAmount,
    bigBlindAmount: tableState.bigBlindAmount,
    anteAmount: tableState.anteAmount,
    actionTimer: tableState.actionTimer,
    timeRemaining,
    lastRaiserSeat: tableState.lastRaiserSeat,
    // Rake configuration
    rakePercent: tableState.rakePercent,
    rakeCap: tableState.rakeCap,
    totalRakeCollected: tableState.totalRakeCollected,
    // ===== STRADDLE & ADVANCED BLINDS INFO =====
    straddleEnabled: tableState.straddleEnabled,
    straddleSeat: tableState.straddleSeat,
    straddleAmount: tableState.straddleAmount,
    buttonAnteEnabled: tableState.buttonAnteEnabled,
    buttonAnteAmount: tableState.buttonAnteAmount,
    bigBlindAnteEnabled: tableState.bigBlindAnteEnabled,
    bigBlindAnteAmount: tableState.bigBlindAnteAmount,
    mississippiStraddleEnabled: tableState.mississippiStraddleEnabled,
    pendingStraddles: Array.from(tableState.pendingStraddles.entries()).map(([seat, amount]) => ({ seat, amount })),
    runItTwiceEnabled: tableState.runItTwiceEnabled
  };
}

function sendToSocket(socket: WebSocket, data: any) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}

function broadcastToTable(tableId: string, data: any, excludePlayerId?: string) {
  const connections = tableConnections.get(tableId);
  if (!connections) return;

  connections.forEach((socket, oderId) => {
    if (oderId !== excludePlayerId) {
      sendToSocket(socket, data);
    }
  });
}
