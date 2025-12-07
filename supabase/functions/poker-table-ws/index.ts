import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Store active connections per table
const tableConnections = new Map<string, Map<string, WebSocket>>();

// Store game state per table
const tableStates = new Map<string, TableState>();

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
}

interface PlayerState {
  oderId: string;
  oderId: string;
  oderId: string;
  oderId: string;
  oderId: string;
  seatNumber: number;
  oderId: string;
  stack: number;
  holeCards: string[];
  betAmount: number;
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

  tableState.players.set(playerId, {
    oderId: playerId,
    seatNumber,
    stack: data?.buyIn || 10000,
    holeCards: [],
    betAmount: 0,
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

  console.log(`✅ Player ${playerId} joined table ${tableId} at seat ${seatNumber}`);

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
        player.betAmount += player.stack;
        tableState.pot += player.stack;
        player.stack = 0;
        player.isAllIn = true;
        actionResult.action = "all-in";
        actionResult.amount = callAmount;
      } else {
        player.betAmount = tableState.currentBet;
        player.stack -= callAmount;
        tableState.pot += callAmount;
        actionResult.action = "call";
        actionResult.amount = callAmount;
      }
      break;

    case "raise":
      const raiseAmount = amount || tableState.currentBet * 2;
      const totalBet = raiseAmount;
      const toAdd = totalBet - player.betAmount;
      
      if (toAdd > player.stack) {
        sendToSocket(socket, { type: "error", message: "Not enough chips" });
        return;
      }
      
      player.stack -= toAdd;
      player.betAmount = totalBet;
      tableState.pot += toAdd;
      tableState.currentBet = totalBet;
      actionResult.action = "raise";
      actionResult.amount = totalBet;
      break;

    case "all-in":
      const allInAmount = player.stack;
      player.betAmount += allInAmount;
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

  // Move to next player or next phase
  const nextResult = moveToNextPlayer(tableState);
  
  if (nextResult.phaseComplete) {
    await advancePhase(tableState, supabase);
  }

  // Broadcast action to all players
  broadcastToTable(tableId, {
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
    player.isFolded = false;
    player.isAllIn = false;
  });

  // Move dealer button
  tableState.dealerSeat = getNextActiveSeat(tableState, tableState.dealerSeat);
  tableState.smallBlindSeat = getNextActiveSeat(tableState, tableState.dealerSeat);
  tableState.bigBlindSeat = getNextActiveSeat(tableState, tableState.smallBlindSeat);

  // Post blinds (simplified: 50/100)
  const smallBlind = 50;
  const bigBlind = 100;

  const sbPlayer = getPlayerBySeat(tableState, tableState.smallBlindSeat);
  const bbPlayer = getPlayerBySeat(tableState, tableState.bigBlindSeat);

  if (sbPlayer) {
    sbPlayer.betAmount = Math.min(smallBlind, sbPlayer.stack);
    sbPlayer.stack -= sbPlayer.betAmount;
    tableState.pot += sbPlayer.betAmount;
  }

  if (bbPlayer) {
    bbPlayer.betAmount = Math.min(bigBlind, bbPlayer.stack);
    bbPlayer.stack -= bbPlayer.betAmount;
    tableState.pot += bbPlayer.betAmount;
    tableState.currentBet = bbPlayer.betAmount;
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
    deck: []
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
  
  if (activePlayers.length <= 1) {
    return { phaseComplete: true };
  }

  // Check if all active players have matched the current bet
  const allMatched = activePlayers.every(p => p.betAmount === tableState.currentBet);
  
  if (allMatched && tableState.currentPlayerSeat !== null) {
    // Everyone has acted and matched
    return { phaseComplete: true };
  }

  tableState.currentPlayerSeat = getNextActiveSeat(tableState, tableState.currentPlayerSeat || 0);
  return { phaseComplete: false };
}

async function advancePhase(tableState: TableState, supabase: any) {
  // Reset bets for new betting round
  tableState.players.forEach(p => {
    p.betAmount = 0;
  });
  tableState.currentBet = 0;

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
        await handleShowdown(tableState, supabase);
        return;
    }

    // First to act is small blind (or next active after dealer)
    tableState.currentPlayerSeat = getNextActiveSeat(tableState, tableState.dealerSeat);

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
  
  const activePlayers = Array.from(tableState.players.entries())
    .filter(([_, p]) => !p.isFolded);

  // For now, just pick first active player as winner (TODO: implement hand evaluation)
  const winner = activePlayers[0];
  
  if (winner) {
    const [winnerId, winnerState] = winner;
    winnerState.stack += tableState.pot;

    // Update database
    if (tableState.currentHandId) {
      await supabase.from('poker_hands')
        .update({ 
          phase: 'showdown',
          completed_at: new Date().toISOString(),
          winners: JSON.stringify([{ playerId: winnerId, amount: tableState.pot }])
        })
        .eq('id', tableState.currentHandId);

      // Update player stack
      await supabase.from('poker_table_players')
        .update({ stack: winnerState.stack })
        .eq('table_id', tableState.tableId)
        .eq('player_id', winnerId);
    }

    // Broadcast showdown result
    broadcastToTable(tableState.tableId, {
      type: "showdown",
      winners: [{ playerId: winnerId, amount: tableState.pot }],
      playerCards: Object.fromEntries(
        activePlayers.map(([id, p]) => [id, p.holeCards])
      ),
      communityCards: tableState.communityCards,
      pot: tableState.pot
    });
  }

  // Reset for next hand
  tableState.phase = 'waiting';
  tableState.currentHandId = null;
  tableState.pot = 0;
}

function removePlayerFromTable(tableId: string, playerId: string) {
  const connections = tableConnections.get(tableId);
  if (connections) {
    connections.delete(playerId);
    if (connections.size === 0) {
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
      seatNumber: player.seatNumber,
      stack: player.stack,
      betAmount: player.betAmount,
      isFolded: player.isFolded,
      isAllIn: player.isAllIn,
      isActive: player.isActive,
      // Only show hole cards to the player themselves
      holeCards: oderId === forPlayerId ? player.holeCards : 
        (tableState.phase === 'showdown' && !player.isFolded ? player.holeCards : [])
    });
  });

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
    players
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
