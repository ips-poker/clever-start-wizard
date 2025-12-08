import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Store active connections per table
const tableConnections = new Map<string, Map<string, WebSocket>>();

interface WSMessage {
  type: string;
  tableId?: string;
  playerId?: string;
  playerName?: string;
  buyIn?: number;
  data?: any;
}

// Broadcast message to all players at a table
function broadcastToTable(tableId: string, message: any, excludePlayerId?: string) {
  const connections = tableConnections.get(tableId);
  if (!connections) return;

  const payload = JSON.stringify(message);
  for (const [playerId, socket] of connections) {
    if (playerId !== excludePlayerId && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(payload);
      } catch (e) {
        console.error(`Error sending to ${playerId}:`, e);
      }
    }
  }
}

// Send message to specific player
function sendToPlayer(tableId: string, playerId: string, message: any) {
  const connections = tableConnections.get(tableId);
  if (!connections) return;

  const socket = connections.get(playerId);
  if (socket && socket.readyState === WebSocket.OPEN) {
    try {
      socket.send(JSON.stringify(message));
    } catch (e) {
      console.error(`Error sending to ${playerId}:`, e);
    }
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
      status: 426, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  // Upgrade to WebSocket
  const { socket, response } = Deno.upgradeWebSocket(req);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let currentTableId: string | null = null;
  let currentPlayerId: string | null = null;

  socket.onopen = () => {
    console.log('🎰 New poker WebSocket connection established');
  };

  socket.onmessage = async (event) => {
    try {
      const message: WSMessage = JSON.parse(event.data);
      console.log(`📨 Received message: ${message.type}`);

      switch (message.type) {
        case 'join_table': {
          const { tableId, playerId, playerName, buyIn } = message;
          if (!tableId || !playerId) {
            socket.send(JSON.stringify({ type: 'error', message: 'Missing tableId or playerId' }));
            return;
          }

          currentTableId = tableId;
          currentPlayerId = playerId;

          // Add to connections map
          if (!tableConnections.has(tableId)) {
            tableConnections.set(tableId, new Map());
          }
          tableConnections.get(tableId)!.set(playerId, socket);

          // Call poker-game-engine to join
          const { data: joinResult, error: joinError } = await supabase.functions.invoke('poker-game-engine', {
            body: { action: 'join', tableId, playerId, amount: buyIn }
          });

          if (joinError) {
            console.error('Join error:', joinError);
            socket.send(JSON.stringify({ type: 'error', message: 'Failed to join table' }));
            return;
          }

          // Fetch full table state
          let tableState = await fetchTableState(supabase, tableId, playerId);

          // Send state to joining player
          socket.send(JSON.stringify({
            type: 'table_state',
            ...tableState,
            joinResult
          }));

          // Notify other players
          broadcastToTable(tableId, {
            type: 'player_joined',
            playerId,
            playerName,
            seatNumber: joinResult?.seatNumber,
            stack: joinResult?.stack
          }, playerId);

          console.log(`✅ Player ${playerName} (${playerId}) joined table ${tableId} at seat ${joinResult?.seatNumber}`);
          
          // Auto-start hand if conditions met
          if (joinResult?.autoStarting) {
            console.log(`🎲 Auto-starting hand for table ${tableId}`);
            
            // Small delay for other clients to receive join notification
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const { data: startResult, error: startError } = await supabase.functions.invoke('poker-game-engine', {
              body: { action: 'start_hand', tableId, playerId }
            });
            
            if (startResult?.success) {
              console.log(`🃏 Auto-started hand at table ${tableId}`);
              await broadcastTableState(supabase, tableId);
            } else {
              console.log(`⚠️ Auto-start failed: ${startError?.message || startResult?.error}`);
            }
          }
          
          break;
        }

        case 'leave_table': {
          const { tableId, playerId } = message;
          if (!tableId || !playerId) return;

          // Call engine to leave
          await supabase.functions.invoke('poker-game-engine', {
            body: { action: 'leave', tableId, playerId }
          });

          // Remove from connections
          tableConnections.get(tableId)?.delete(playerId);
          if (tableConnections.get(tableId)?.size === 0) {
            tableConnections.delete(tableId);
          }

          // Notify others
          broadcastToTable(tableId, {
            type: 'player_left',
            playerId
          });

          console.log(`🚪 Player ${playerId} left table ${tableId}`);
          break;
        }

        case 'start_hand': {
          const { tableId, playerId } = message;
          if (!tableId || !playerId) return;

          // Call engine to start hand
          const { data: startResult, error } = await supabase.functions.invoke('poker-game-engine', {
            body: { action: 'start_hand', tableId, playerId }
          });

          if (error || !startResult?.success) {
            socket.send(JSON.stringify({ 
              type: 'error', 
              message: startResult?.error || 'Failed to start hand' 
            }));
            return;
          }

          // Fetch updated state and broadcast to all
          await broadcastTableState(supabase, tableId);

          console.log(`🃏 Hand started at table ${tableId}`);
          break;
        }

        case 'action': {
          const { tableId, playerId, data } = message;
          if (!tableId || !playerId || !data?.action) return;

          // Map action to engine format
          const actionMap: Record<string, string> = {
            'fold': 'fold',
            'check': 'check',
            'call': 'call',
            'raise': 'raise',
            'bet': 'raise',
            'all_in': 'all_in',
            'allin': 'all_in'
          };

          const engineAction = actionMap[data.action] || data.action;

          // Call engine
          const { data: actionResult, error } = await supabase.functions.invoke('poker-game-engine', {
            body: { 
              action: engineAction, 
              tableId, 
              playerId, 
              amount: data.amount 
            }
          });

          if (error || !actionResult?.success) {
            socket.send(JSON.stringify({ 
              type: 'error', 
              message: actionResult?.error || 'Action failed' 
            }));
            return;
          }

          // Broadcast action to all players
          broadcastToTable(tableId, {
            type: 'player_action',
            playerId,
            action: data.action,
            amount: data.amount,
            result: actionResult
          });

          // Fetch and broadcast updated state
          await broadcastTableState(supabase, tableId);
          break;
        }

        case 'chat': {
          const { tableId, playerId, data } = message;
          if (!tableId || !playerId || !data?.message) return;

          // Broadcast chat to all at table
          broadcastToTable(tableId, {
            type: 'chat',
            playerId,
            message: data.message.slice(0, 200), // Limit length
            timestamp: Date.now()
          });
          break;
        }

        case 'ping': {
          socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        }

        case 'get_state':
        case 'subscribe': {
          const { tableId, playerId } = message;
          if (!tableId || !playerId) {
            socket.send(JSON.stringify({ type: 'error', message: 'Missing tableId or playerId' }));
            return;
          }

          currentTableId = tableId;
          currentPlayerId = playerId;

          // Add to connections map for subscribe
          if (message.type === 'subscribe') {
            if (!tableConnections.has(tableId)) {
              tableConnections.set(tableId, new Map());
            }
            tableConnections.get(tableId)!.set(playerId, socket);
            console.log(`📡 Player ${playerId} subscribed to table ${tableId}`);
          }

          const tableState = await fetchTableState(supabase, tableId, playerId);
          
          // Send state with appropriate type
          socket.send(JSON.stringify({
            type: message.type === 'subscribe' ? 'subscribed' : 'state',
            tableId,
            state: tableState
          }));
          break;
        }

        default:
          console.log(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Message handling error:', error);
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  };

  socket.onclose = async () => {
    console.log('🔌 WebSocket connection closed');
    
    if (currentTableId && currentPlayerId) {
      // Remove from connections
      tableConnections.get(currentTableId)?.delete(currentPlayerId);
      if (tableConnections.get(currentTableId)?.size === 0) {
        tableConnections.delete(currentTableId);
      }

      // Notify others (player might reconnect)
      broadcastToTable(currentTableId, {
        type: 'player_disconnected',
        playerId: currentPlayerId
      });
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return response;
});

// Fetch current table state from database
async function fetchTableState(supabase: any, tableId: string, playerId: string) {
  // Get table info
  const { data: table } = await supabase
    .from('poker_tables')
    .select('*')
    .eq('id', tableId)
    .single();

  if (!table) {
    return { error: 'Table not found' };
  }

  // Get players at table
  const { data: players } = await supabase
    .from('poker_table_players')
    .select('*, players(name, avatar_url)')
    .eq('table_id', tableId);

  // Get current hand if exists
  let handData = null;
  let myCards: string[] = [];

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
      const myHandPlayer = handPlayers?.find((hp: any) => hp.player_id === playerId);
      myCards = myHandPlayer?.hole_cards || [];

      handData = {
        id: hand.id,
        phase: hand.phase,
        pot: hand.pot,
        currentBet: hand.current_bet,
        communityCards: hand.community_cards || [],
        dealerSeat: hand.dealer_seat,
        smallBlindSeat: hand.small_blind_seat,
        bigBlindSeat: hand.big_blind_seat,
        currentPlayerSeat: hand.current_player_seat,
        sidePots: hand.side_pots,
        winners: hand.winners,
        players: handPlayers?.map((hp: any) => ({
          playerId: hp.player_id,
          seatNumber: hp.seat_number,
          betAmount: hp.bet_amount,
          isFolded: hp.is_folded,
          isAllIn: hp.is_all_in,
          // Only show cards if showdown or own cards
          cards: hp.player_id === playerId || hand.phase === 'showdown' 
            ? hp.hole_cards 
            : null
        }))
      };
    }
  }

  return {
    table: {
      id: table.id,
      name: table.name,
      smallBlind: table.small_blind,
      bigBlind: table.big_blind,
      minBuyIn: table.min_buy_in,
      maxBuyIn: table.max_buy_in,
      maxPlayers: table.max_players,
      status: table.status,
      currentDealerSeat: table.current_dealer_seat
    },
    players: players?.map((p: any) => ({
      id: p.player_id,
      name: p.players?.name || 'Player',
      avatar: p.players?.avatar_url,
      seatNumber: p.seat_number,
      stack: p.stack,
      status: p.status,
      isDealer: p.is_dealer
    })) || [],
    hand: handData,
    myCards
  };
}

// Broadcast table state to all connected players
async function broadcastTableState(supabase: any, tableId: string) {
  const connections = tableConnections.get(tableId);
  if (!connections) return;

  for (const [playerId, socket] of connections) {
    if (socket.readyState === WebSocket.OPEN) {
      const state = await fetchTableState(supabase, tableId, playerId);
      try {
        socket.send(JSON.stringify({
          type: 'table_state',
          ...state
        }));
      } catch (e) {
        console.error(`Error broadcasting to ${playerId}:`, e);
      }
    }
  }
}
