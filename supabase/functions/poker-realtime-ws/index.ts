import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, upgrade, connection, sec-websocket-key, sec-websocket-version, sec-websocket-extensions',
};

// Connection state management
const connections = new Map<string, Set<WebSocket>>();
const playerConnections = new Map<string, WebSocket>();
const heartbeatIntervals = new Map<WebSocket, number>();

// Message types for type safety
type MessageType = 
  | 'join' | 'leave' | 'action' | 'chat' | 'ping' | 'pong'
  | 'game_state' | 'player_action' | 'hand_update' | 'error'
  | 'player_joined' | 'player_left' | 'turn_update';

interface WSMessage {
  type: MessageType;
  tableId?: string;
  playerId?: string;
  data?: any;
  timestamp?: number;
}

// Broadcast to all connections on a table
function broadcast(tableId: string, message: WSMessage, excludeSocket?: WebSocket) {
  const tableConnections = connections.get(tableId);
  if (!tableConnections) return;

  const payload = JSON.stringify({ ...message, timestamp: Date.now() });
  
  for (const socket of tableConnections) {
    if (socket !== excludeSocket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(payload);
      } catch (e) {
        console.error('[WS] Broadcast error:', e);
      }
    }
  }
}

// Send to specific player
function sendToPlayer(playerId: string, message: WSMessage) {
  const socket = playerConnections.get(playerId);
  if (socket && socket.readyState === WebSocket.OPEN) {
    try {
      socket.send(JSON.stringify({ ...message, timestamp: Date.now() }));
    } catch (e) {
      console.error('[WS] Send to player error:', e);
    }
  }
}

// Clean up connection
function cleanupConnection(socket: WebSocket, tableId?: string, playerId?: string) {
  // Clear heartbeat
  const interval = heartbeatIntervals.get(socket);
  if (interval) {
    clearInterval(interval);
    heartbeatIntervals.delete(socket);
  }

  // Remove from table connections
  if (tableId) {
    const tableConns = connections.get(tableId);
    if (tableConns) {
      tableConns.delete(socket);
      if (tableConns.size === 0) {
        connections.delete(tableId);
      }
    }
  }

  // Remove player connection
  if (playerId) {
    playerConnections.delete(playerId);
  }
}

serve(async (req) => {
  const url = new URL(req.url);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check for WebSocket upgrade
  const upgradeHeader = req.headers.get('upgrade') || '';
  
  if (upgradeHeader.toLowerCase() !== 'websocket') {
    return new Response(JSON.stringify({ 
      error: 'Expected WebSocket connection',
      hint: 'Use WebSocket protocol to connect'
    }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  // Extract table and player from URL params
  const tableId = url.searchParams.get('tableId');
  const playerId = url.searchParams.get('playerId');

  if (!tableId || !playerId) {
    return new Response(JSON.stringify({ 
      error: 'Missing tableId or playerId' 
    }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  // Upgrade to WebSocket
  const { socket, response } = Deno.upgradeWebSocket(req);

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Connection opened
  socket.onopen = () => {
    console.log(`[WS] Connection opened: table=${tableId?.slice(0,8)} player=${playerId?.slice(0,8)}`);

    // Add to table connections
    if (!connections.has(tableId)) {
      connections.set(tableId, new Set());
    }
    connections.get(tableId)!.add(socket);

    // Track player connection
    playerConnections.set(playerId, socket);

    // Setup heartbeat (every 30 seconds)
    const heartbeat = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, 30000);
    heartbeatIntervals.set(socket, heartbeat as unknown as number);

    // Notify others that player joined
    broadcast(tableId, {
      type: 'player_joined',
      playerId,
      tableId,
      data: { timestamp: Date.now() }
    }, socket);

    // Send current game state to new player
    fetchAndSendGameState(supabase, tableId, playerId, socket);
  };

  // Handle messages
  socket.onmessage = async (event) => {
    try {
      const message: WSMessage = JSON.parse(event.data);
      console.log(`[WS] Message: ${message.type} from ${playerId?.slice(0,8)}`);

      switch (message.type) {
        case 'pong':
          // Client responded to ping, connection is alive
          break;

        case 'action':
          // Handle game action (fold, check, call, raise, all-in)
          const actionResult = await handleGameAction(supabase, tableId, playerId, message.data);
          
          if (actionResult.success) {
            // Broadcast action to all players
            broadcast(tableId, {
              type: 'player_action',
              playerId,
              tableId,
              data: actionResult
            });

            // If hand state changed, broadcast update
            if (actionResult.handUpdate) {
              broadcast(tableId, {
                type: 'hand_update',
                tableId,
                data: actionResult.handUpdate
              });
            }

            // If turn changed, notify next player
            if (actionResult.nextPlayer) {
              broadcast(tableId, {
                type: 'turn_update',
                tableId,
                data: {
                  currentPlayerSeat: actionResult.nextPlayer,
                  timeRemaining: 30
                }
              });
            }
          } else {
            // Send error to acting player only
            socket.send(JSON.stringify({
              type: 'error',
              data: { message: actionResult.error }
            }));
          }
          break;

        case 'chat':
          // Broadcast chat message to table
          broadcast(tableId, {
            type: 'chat',
            playerId,
            tableId,
            data: {
              message: message.data?.message?.slice(0, 200), // Limit message length
              timestamp: Date.now()
            }
          });
          break;

        default:
          console.log(`[WS] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('[WS] Message handling error:', error);
      socket.send(JSON.stringify({
        type: 'error',
        data: { message: 'Invalid message format' }
      }));
    }
  };

  // Connection closed
  socket.onclose = () => {
    console.log(`[WS] Connection closed: player=${playerId?.slice(0,8)}`);
    
    cleanupConnection(socket, tableId, playerId);

    // Notify others that player left
    broadcast(tableId, {
      type: 'player_left',
      playerId,
      tableId,
      data: { timestamp: Date.now() }
    });
  };

  // Connection error
  socket.onerror = (error) => {
    console.error('[WS] Socket error:', error);
    cleanupConnection(socket, tableId, playerId);
  };

  return response;
});

// Fetch and send current game state
async function fetchAndSendGameState(
  supabase: any, 
  tableId: string, 
  playerId: string, 
  socket: WebSocket
) {
  try {
    // Get table info
    const { data: table } = await supabase
      .from('poker_tables')
      .select('*')
      .eq('id', tableId)
      .single();

    if (!table) {
      socket.send(JSON.stringify({ type: 'error', data: { message: 'Table not found' } }));
      return;
    }

    // Get players at table
    const { data: players } = await supabase
      .from('poker_table_players')
      .select('*, players(name, avatar_url)')
      .eq('table_id', tableId);

    // Get current hand if exists
    let handData = null;
    let playerHand = null;
    
    if (table.current_hand_id) {
      const { data: hand } = await supabase
        .from('poker_hands')
        .select('*')
        .eq('id', table.current_hand_id)
        .single();

      if (hand) {
        // Get hand players
        const { data: handPlayers } = await supabase
          .from('poker_hand_players')
          .select('*')
          .eq('hand_id', hand.id);

        // Find this player's cards
        playerHand = handPlayers?.find((hp: any) => hp.player_id === playerId);

        handData = {
          id: hand.id,
          phase: hand.phase,
          pot: hand.pot,
          currentBet: hand.current_bet,
          communityCards: hand.community_cards || [],
          dealerSeat: hand.dealer_seat,
          currentPlayerSeat: hand.current_player_seat,
          sidePots: hand.side_pots ? JSON.parse(hand.side_pots) : [],
          players: handPlayers?.map((hp: any) => ({
            playerId: hp.player_id,
            seatNumber: hp.seat_number,
            betAmount: hp.bet_amount,
            isFolded: hp.is_folded,
            isAllIn: hp.is_all_in,
            // Only include cards if it's this player or showdown
            cards: hp.player_id === playerId || hand.phase === 'showdown' 
              ? hp.hole_cards 
              : null
          }))
        };
      }
    }

    // Send complete game state
    socket.send(JSON.stringify({
      type: 'game_state',
      tableId,
      data: {
        table: {
          id: table.id,
          name: table.name,
          smallBlind: table.small_blind,
          bigBlind: table.big_blind,
          minBuyIn: table.min_buy_in,
          maxBuyIn: table.max_buy_in,
          maxPlayers: table.max_players,
          status: table.status
        },
        players: players?.map((p: any) => ({
          id: p.player_id,
          name: p.players?.name || 'Unknown',
          avatar: p.players?.avatar_url,
          seatNumber: p.seat_number,
          stack: p.stack,
          status: p.status,
          isDealer: p.seat_number === table.current_dealer_seat
        })),
        hand: handData,
        myCards: playerHand?.hole_cards || []
      },
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('[WS] Error fetching game state:', error);
    socket.send(JSON.stringify({
      type: 'error',
      data: { message: 'Failed to fetch game state' }
    }));
  }
}

// Handle game action
async function handleGameAction(
  supabase: any,
  tableId: string,
  playerId: string,
  actionData: any
): Promise<any> {
  const { action, amount } = actionData;

  try {
    // Get current hand
    const { data: table } = await supabase
      .from('poker_tables')
      .select('current_hand_id')
      .eq('id', tableId)
      .single();

    if (!table?.current_hand_id) {
      return { success: false, error: 'No active hand' };
    }

    const { data: hand } = await supabase
      .from('poker_hands')
      .select('*')
      .eq('id', table.current_hand_id)
      .single();

    if (!hand) {
      return { success: false, error: 'Hand not found' };
    }

    // Get player in hand
    const { data: handPlayer } = await supabase
      .from('poker_hand_players')
      .select('*')
      .eq('hand_id', hand.id)
      .eq('player_id', playerId)
      .single();

    if (!handPlayer) {
      return { success: false, error: 'Player not in hand' };
    }

    // Verify it's player's turn
    if (hand.current_player_seat !== handPlayer.seat_number) {
      return { success: false, error: 'Not your turn' };
    }

    // Get table player for stack
    const { data: tablePlayer } = await supabase
      .from('poker_table_players')
      .select('*')
      .eq('table_id', tableId)
      .eq('player_id', playerId)
      .single();

    if (!tablePlayer) {
      return { success: false, error: 'Player not at table' };
    }

    // Process action
    let newBet = handPlayer.bet_amount;
    let newStack = tablePlayer.stack;
    let newPot = hand.pot;
    let isFolded = handPlayer.is_folded;
    let isAllIn = handPlayer.is_all_in;
    let actionText = '';

    switch (action) {
      case 'fold':
        isFolded = true;
        actionText = 'FOLD';
        break;

      case 'check':
        if (hand.current_bet > handPlayer.bet_amount) {
          return { success: false, error: 'Cannot check, must call or fold' };
        }
        actionText = 'CHECK';
        break;

      case 'call':
        const callAmount = Math.min(hand.current_bet - handPlayer.bet_amount, tablePlayer.stack);
        newBet = handPlayer.bet_amount + callAmount;
        newStack = tablePlayer.stack - callAmount;
        newPot = hand.pot + callAmount;
        isAllIn = newStack === 0;
        actionText = isAllIn ? 'ALL-IN (CALL)' : `CALL ${callAmount}`;
        break;

      case 'raise':
        if (!amount || amount < hand.current_bet * 2) {
          return { success: false, error: 'Raise must be at least 2x current bet' };
        }
        const raiseAmount = Math.min(amount, tablePlayer.stack + handPlayer.bet_amount);
        const additionalBet = raiseAmount - handPlayer.bet_amount;
        newBet = raiseAmount;
        newStack = tablePlayer.stack - additionalBet;
        newPot = hand.pot + additionalBet;
        isAllIn = newStack === 0;
        actionText = isAllIn ? `ALL-IN ${raiseAmount}` : `RAISE ${raiseAmount}`;
        break;

      case 'all_in':
        const allInAmount = tablePlayer.stack + handPlayer.bet_amount;
        newBet = allInAmount;
        newStack = 0;
        newPot = hand.pot + tablePlayer.stack;
        isAllIn = true;
        actionText = `ALL-IN ${allInAmount}`;
        break;

      default:
        return { success: false, error: 'Invalid action' };
    }

    // Update hand player
    await supabase
      .from('poker_hand_players')
      .update({
        bet_amount: newBet,
        is_folded: isFolded,
        is_all_in: isAllIn
      })
      .eq('id', handPlayer.id);

    // Update table player stack
    await supabase
      .from('poker_table_players')
      .update({ stack: newStack })
      .eq('id', tablePlayer.id);

    // Record action
    await supabase
      .from('poker_actions')
      .insert({
        hand_id: hand.id,
        player_id: playerId,
        seat_number: handPlayer.seat_number,
        action_type: action,
        amount: newBet,
        phase: hand.phase,
        action_order: Date.now()
      });

    // Determine next player
    const { data: allHandPlayers } = await supabase
      .from('poker_hand_players')
      .select('*')
      .eq('hand_id', hand.id)
      .order('seat_number');

    const activePlayers = allHandPlayers?.filter((p: any) => 
      !p.is_folded && (!p.is_all_in || p.player_id === playerId)
    ) || [];

    // Find next player to act
    const currentIndex = activePlayers.findIndex((p: any) => p.seat_number === handPlayer.seat_number);
    const nextIndex = (currentIndex + 1) % activePlayers.length;
    const nextPlayer = activePlayers[nextIndex];

    // Check if betting round is complete
    const allMatched = activePlayers.every((p: any) => 
      p.bet_amount === (newBet > hand.current_bet ? newBet : hand.current_bet) || p.is_all_in
    );

    let handUpdate = null;
    let nextPlayerSeat = nextPlayer?.seat_number;

    if (allMatched && nextPlayer?.seat_number === activePlayers[0]?.seat_number) {
      // Advance to next phase
      handUpdate = await advancePhase(supabase, hand, allHandPlayers, newPot);
      nextPlayerSeat = handUpdate?.currentPlayerSeat;
    } else {
      // Update current bet if raised
      if (newBet > hand.current_bet) {
        await supabase
          .from('poker_hands')
          .update({ 
            current_bet: newBet,
            pot: newPot,
            current_player_seat: nextPlayerSeat
          })
          .eq('id', hand.id);
      } else {
        await supabase
          .from('poker_hands')
          .update({ 
            pot: newPot,
            current_player_seat: nextPlayerSeat
          })
          .eq('id', hand.id);
      }
    }

    return {
      success: true,
      action,
      actionText,
      playerId,
      seatNumber: handPlayer.seat_number,
      amount: newBet,
      newStack,
      pot: handUpdate?.pot || newPot,
      nextPlayer: nextPlayerSeat,
      handUpdate
    };
  } catch (error) {
    console.error('[WS] Action error:', error);
    return { success: false, error: 'Server error processing action' };
  }
}

// Advance game phase
async function advancePhase(
  supabase: any,
  hand: any,
  handPlayers: any[],
  currentPot: number
): Promise<any> {
  const phases = ['preflop', 'flop', 'turn', 'river', 'showdown'];
  const currentIndex = phases.indexOf(hand.phase);
  const nextPhase = phases[currentIndex + 1] || 'showdown';

  const deck = JSON.parse(hand.deck_state || '[]');
  let communityCards = hand.community_cards || [];
  let deckIndex = communityCards.length + (handPlayers.length * 2);

  // Deal community cards
  if (nextPhase === 'flop' && communityCards.length === 0) {
    communityCards = [deck[deckIndex], deck[deckIndex + 1], deck[deckIndex + 2]];
  } else if (nextPhase === 'turn' && communityCards.length === 3) {
    communityCards = [...communityCards, deck[deckIndex + 3]];
  } else if (nextPhase === 'river' && communityCards.length === 4) {
    communityCards = [...communityCards, deck[deckIndex + 4]];
  }

  // Reset bets for new round
  for (const player of handPlayers) {
    if (!player.is_folded) {
      await supabase
        .from('poker_hand_players')
        .update({ bet_amount: 0 })
        .eq('id', player.id);
    }
  }

  // Find first active player after dealer for new round
  const activePlayers = handPlayers
    .filter(p => !p.is_folded && !p.is_all_in)
    .sort((a, b) => a.seat_number - b.seat_number);
  
  const firstToAct = activePlayers[0]?.seat_number;

  // Update hand
  await supabase
    .from('poker_hands')
    .update({
      phase: nextPhase,
      community_cards: communityCards,
      current_bet: 0,
      pot: currentPot,
      current_player_seat: nextPhase === 'showdown' ? null : firstToAct
    })
    .eq('id', hand.id);

  return {
    phase: nextPhase,
    communityCards,
    pot: currentPot,
    currentBet: 0,
    currentPlayerSeat: firstToAct
  };
}
