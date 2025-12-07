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
  // New fields for proper betting
  smallBlindAmount: number;
  bigBlindAmount: number;
  minRaise: number; // Minimum raise amount
  lastRaiserSeat: number | null; // Track who made last raise
  lastRaiseAmount: number; // Track last raise size
  actionTimer: number; // Seconds for player to act
  turnStartTime: number | null; // When current player's turn started
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

function clearTableTimer(tableId: string) {
  const existingTimer = tableTimers.get(tableId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    tableTimers.delete(tableId);
    console.log(`⏱️ Timer cleared for table ${tableId}`);
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
  
  // Set turn start time
  tableState.turnStartTime = Date.now();
  
  const timerDuration = tableState.actionTimer * 1000; // Convert to ms
  
  console.log(`⏱️ Starting ${tableState.actionTimer}s timer for seat ${tableState.currentPlayerSeat} on table ${tableId}`);
  
  const timerId = setTimeout(async () => {
    await handleAutoFold(tableId, supabase);
  }, timerDuration);
  
  tableTimers.set(tableId, timerId);
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
    state: serializeTableState(tableState)
  });
  
  broadcastToTable(tableId, {
    type: "timeout_fold",
    seatNumber: currentSeat,
    playerId: timedOutPlayerId,
    message: `Player at seat ${currentSeat} timed out and folded`
  });
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
      removePlayerFromTable(currentTableId, currentPlayerId);
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
    isActive: true
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

  // Move dealer button
  tableState.dealerSeat = getNextActiveSeat(tableState, tableState.dealerSeat);
  tableState.smallBlindSeat = getNextActiveSeat(tableState, tableState.dealerSeat);
  tableState.bigBlindSeat = getNextActiveSeat(tableState, tableState.smallBlindSeat);

  // Post blinds using table configuration
  const smallBlind = tableState.smallBlindAmount;
  const bigBlind = tableState.bigBlindAmount;
  
  // Reset betting state for new hand
  tableState.minRaise = bigBlind;
  tableState.lastRaiserSeat = null;
  tableState.lastRaiseAmount = bigBlind;

  const sbPlayer = getPlayerBySeat(tableState, tableState.smallBlindSeat);
  const bbPlayer = getPlayerBySeat(tableState, tableState.bigBlindSeat);

  if (sbPlayer) {
    const sbAmount = Math.min(smallBlind, sbPlayer.stack);
    sbPlayer.betAmount = sbAmount;
    sbPlayer.totalBetInHand = sbAmount;
    sbPlayer.stack -= sbAmount;
    tableState.pot += sbAmount;
    if (sbAmount < smallBlind) sbPlayer.isAllIn = true;
  }

  if (bbPlayer) {
    const bbAmount = Math.min(bigBlind, bbPlayer.stack);
    bbPlayer.betAmount = bbAmount;
    bbPlayer.totalBetInHand = bbAmount;
    bbPlayer.stack -= bbAmount;
    tableState.pot += bbAmount;
    tableState.currentBet = bbAmount;
    if (bbAmount < bigBlind) bbPlayer.isAllIn = true;
  }

  // Deal hole cards
  tableState.players.forEach(player => {
    if (player.isActive && player.stack >= 0) {
      player.holeCards = [tableState.deck.pop()!, tableState.deck.pop()!];
    }
  });

  // Set first to act (UTG - after big blind)
  tableState.currentPlayerSeat = getNextActiveSeat(tableState, tableState.bigBlindSeat);

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
    minRaise: 100, // BB is min raise initially
    lastRaiserSeat: null,
    lastRaiseAmount: 0,
    actionTimer: 30, // 30 seconds default
    turnStartTime: null
  };
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

function createShuffledDeck(): string[] {
  const suits = ['h', 'd', 'c', 's'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const deck: string[] = [];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(rank + suit);
    }
  }
  
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
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
      allMatched) {
    // BB hasn't had their option yet if this is their first action
    const bbPlayer = getPlayerBySeat(tableState, tableState.bigBlindSeat);
    if (bbPlayer && !bbPlayer.isAllIn) {
      // Give BB option to raise
      tableState.currentPlayerSeat = nextSeat;
      tableState.turnStartTime = Date.now();
      return { phaseComplete: false };
    }
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

    // First to act is small blind (or next active after dealer)
    tableState.currentPlayerSeat = getNextActiveSeat(tableState, tableState.dealerSeat);
    
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

  // If only one player left, they win by default (all pots)
  if (activePlayers.length === 1) {
    const [winnerId, winnerState] = activePlayers[0];
    winnerState.stack += tableState.pot;
    
    await finalizeHand(tableState, supabase, [{ oderId: winnerId, amount: tableState.pot }], activePlayers);
    return;
  }

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

  // Distribute each pot to winners
  const winnerResults: { oderId: string; amount: number; handName: string; potType: string }[] = [];
  const allPots = [potResult.mainPot, ...potResult.sidePots];

  allPots.forEach((pot, potIndex) => {
    if (pot.amount <= 0) return;

    // Find eligible players for this pot
    const eligibleEvaluations = playerEvaluations.filter(p => pot.eligiblePlayers.includes(p.oderId));
    
    if (eligibleEvaluations.length === 0) {
      console.log(`⚠️ No eligible players for pot ${potIndex}, returning to contributors`);
      return;
    }

    // Find best hand among eligible players
    const maxValue = Math.max(...eligibleEvaluations.map(p => p.eval.value));
    const potWinners = eligibleEvaluations.filter(p => p.eval.value === maxValue);

    // Split pot among winners
    const amountPerWinner = Math.floor(pot.amount / potWinners.length);
    const remainder = pot.amount % potWinners.length;

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

    console.log(`🏆 Pot ${potIndex} (${pot.amount}): ${potWinners.map(w => w.oderId).join(', ')}`);
  });

  console.log(`🏆 Final winners: ${winnerResults.map(w => `${w.oderId}: ${w.amount} (${w.handName})`).join(', ')}`);

  await finalizeHand(tableState, supabase, winnerResults, activePlayers);
}

async function finalizeHand(
  tableState: TableState, 
  supabase: any, 
  winnerResults: { oderId: string; amount: number; handName?: string }[],
  activePlayers: [string, PlayerState][]
) {
  // Update database
  if (tableState.currentHandId) {
    await supabase.from('poker_hands')
      .update({ 
        phase: 'showdown',
        completed_at: new Date().toISOString(),
        winners: JSON.stringify(winnerResults.map(w => ({ 
          playerId: w.oderId, 
          amount: w.amount,
          handName: w.handName 
        })))
      })
      .eq('id', tableState.currentHandId);

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

  // Broadcast showdown result
  broadcastToTable(tableState.tableId, {
    type: "showdown",
    winners: winnerResults.map(w => ({ 
      playerId: w.oderId, 
      amount: w.amount,
      handName: w.handName 
    })),
    playerCards: Object.fromEntries(
      activePlayers.map(([id, p]) => [id, p.holeCards])
    ),
    communityCards: tableState.communityCards,
    pot: tableState.pot
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
        (tableState.phase === 'showdown' && !player.isFolded ? player.holeCards : [])
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
    actionTimer: tableState.actionTimer,
    timeRemaining,
    lastRaiserSeat: tableState.lastRaiserSeat
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
