import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Local connections for this Edge Function instance
const localConnections = new Map<string, Map<string, WebSocket>>();

interface WSMessage {
  type: string;
  tableId?: string;
  playerId?: string;
  playerName?: string;
  buyIn?: number;
  data?: any;
}

// Supabase client for broadcast between instances
let supabaseAdmin: any = null;
const broadcastChannels = new Map<string, any>();

function getSupabase() {
  if (!supabaseAdmin) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
  }
  return supabaseAdmin;
}

// Subscribe to broadcast channel for a table (for cross-instance communication)
function subscribeToBroadcast(tableId: string, currentPlayerId: string) {
  const channelKey = `${tableId}_${currentPlayerId}`;
  if (broadcastChannels.has(channelKey)) return;
  
  const supabase = getSupabase();
  const channel = supabase
    .channel(`poker_table_${tableId}`)
    .on('broadcast', { event: 'table_update' }, (payload: any) => {
      console.log(`📡 Broadcast received for table ${tableId}:`, payload.payload?.type);
      
      // Send to local connection for this player
      const connections = localConnections.get(tableId);
      if (connections) {
        const playerSocket = connections.get(currentPlayerId);
        if (playerSocket && playerSocket.readyState === WebSocket.OPEN) {
          try {
            playerSocket.send(JSON.stringify(payload.payload));
          } catch (e) {
            console.error('Error forwarding broadcast to local socket:', e);
          }
        }
      }
    })
    .subscribe((status: string) => {
      console.log(`📡 Broadcast subscription status for ${tableId}:`, status);
    });
  
  broadcastChannels.set(channelKey, channel);
  console.log(`📡 Subscribed to broadcast channel for table ${tableId}, player ${currentPlayerId}`);
}

// Unsubscribe from broadcast channel
function unsubscribeFromBroadcast(tableId: string, playerId: string) {
  const channelKey = `${tableId}_${playerId}`;
  const channel = broadcastChannels.get(channelKey);
  if (channel) {
    getSupabase().removeChannel(channel);
    broadcastChannels.delete(channelKey);
    console.log(`📡 Unsubscribed from broadcast channel for ${tableId}, player ${playerId}`);
  }
}

// Broadcast message to all instances via Supabase Realtime
async function broadcastToAllInstances(tableId: string, message: any) {
  const supabase = getSupabase();
  
  try {
    await supabase.channel(`poker_table_${tableId}`).send({
      type: 'broadcast',
      event: 'table_update',
      payload: message
    });
    console.log(`📢 Broadcasted to table ${tableId}:`, message.type);
  } catch (e) {
    console.error('Broadcast error:', e);
  }
  
  // Also send to local connections directly
  const connections = localConnections.get(tableId);
  if (connections) {
    const payload = JSON.stringify(message);
    for (const [, socket] of connections) {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(payload);
        } catch (e) {
          console.error('Error sending to local socket:', e);
        }
      }
    }
  }
}

// Send message to specific local player
function sendToLocalPlayer(tableId: string, playerId: string, message: any) {
  const connections = localConnections.get(tableId);
  if (!connections) return false;

  const socket = connections.get(playerId);
  if (socket && socket.readyState === WebSocket.OPEN) {
    try {
      socket.send(JSON.stringify(message));
      return true;
    } catch (e) {
      console.error(`Error sending to ${playerId}:`, e);
    }
  }
  return false;
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

          // Add to local connections
          if (!localConnections.has(tableId)) {
            localConnections.set(tableId, new Map());
          }
          localConnections.get(tableId)!.set(playerId, socket);
          
          // Subscribe to broadcast channel for cross-instance updates
          subscribeToBroadcast(tableId, playerId);

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
          const tableState = await fetchTableState(supabase, tableId, playerId);

          // Send state to joining player
          socket.send(JSON.stringify({
            type: 'table_state',
            ...tableState,
            joinResult
          }));

          // Broadcast player joined to ALL instances
          await broadcastToAllInstances(tableId, {
            type: 'player_joined',
            playerId,
            playerName,
            seatNumber: joinResult?.seatNumber,
            stack: joinResult?.stack,
            tableState: await fetchTableState(supabase, tableId, playerId)
          });

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
              await broadcastTableStateToAll(supabase, tableId);
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

          // Remove from local connections
          localConnections.get(tableId)?.delete(playerId);
          if (localConnections.get(tableId)?.size === 0) {
            localConnections.delete(tableId);
          }
          
          // Unsubscribe from broadcast
          unsubscribeFromBroadcast(tableId, playerId);

          // Broadcast player left to all instances
          await broadcastToAllInstances(tableId, {
            type: 'player_left',
            playerId,
            tableState: await fetchTableState(supabase, tableId, '')
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

          // Broadcast updated state to all instances
          await broadcastTableStateToAll(supabase, tableId);

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

          // Broadcast action and updated state to all instances
          await broadcastToAllInstances(tableId, {
            type: 'player_action',
            playerId,
            action: data.action,
            amount: data.amount,
            result: actionResult
          });

          // If hand complete (showdown), broadcast special event with all cards
          if (actionResult?.handComplete) {
            console.log(`🏆 Hand complete, broadcasting showdown to table ${tableId}`);
            
            // Fetch showdown data from database
            const showdownData = await fetchShowdownData(supabase, tableId, actionResult);
            
            await broadcastToAllInstances(tableId, {
              type: 'hand_complete',
              showdown: true,
              winners: actionResult.winners,
              communityCards: actionResult.communityCards,
              showdownPlayers: showdownData.players,
              handResults: actionResult.handResults,
              pot: showdownData.pot
            });
          }

          // Broadcast updated state
          await broadcastTableStateToAll(supabase, tableId);
          break;
        }

        case 'chat': {
          const { tableId, playerId, data } = message;
          if (!tableId || !playerId || !data?.message) return;

          // Broadcast chat to all instances
          await broadcastToAllInstances(tableId, {
            type: 'chat',
            playerId,
            message: data.message.slice(0, 200),
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

          // Add to local connections
          if (!localConnections.has(tableId)) {
            localConnections.set(tableId, new Map());
          }
          localConnections.get(tableId)!.set(playerId, socket);
          
          // Subscribe to broadcast channel
          subscribeToBroadcast(tableId, playerId);
          
          console.log(`📡 Player ${playerId} subscribed to table ${tableId}`);

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
      // Remove from local connections
      localConnections.get(currentTableId)?.delete(currentPlayerId);
      if (localConnections.get(currentTableId)?.size === 0) {
        localConnections.delete(currentTableId);
      }
      
      // Unsubscribe from broadcast
      unsubscribeFromBroadcast(currentTableId, currentPlayerId);

      // Notify all instances that player disconnected
      await broadcastToAllInstances(currentTableId, {
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
    .eq('table_id', tableId)
    .eq('status', 'active');

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
          handRank: hp.hand_rank,
          wonAmount: hp.won_amount,
          // Show cards at showdown for all non-folded players
          holeCards: hp.player_id === playerId || (hand.phase === 'showdown' && !hp.is_folded)
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

// Broadcast table state to all connected players across all instances
async function broadcastTableStateToAll(supabase: any, tableId: string) {
  // Get all players at this table from database
  const { data: tablePlayers } = await supabase
    .from('poker_table_players')
    .select('player_id')
    .eq('table_id', tableId)
    .eq('status', 'active');
  
  if (!tablePlayers || tablePlayers.length === 0) return;
  
  // Broadcast a refresh signal with full state for each player
  // Each player will receive their own personalized state
  for (const tp of tablePlayers) {
    const playerState = await fetchTableState(supabase, tableId, tp.player_id);
    
    await getSupabase().channel(`poker_table_${tableId}`).send({
      type: 'broadcast',
      event: 'table_update',
      payload: {
        type: 'table_state',
        targetPlayerId: tp.player_id,
        ...playerState
      }
    });
  }
  
  // Also send to local connections
  const connections = localConnections.get(tableId);
  if (connections) {
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
}

// Fetch showdown data with all players' cards
async function fetchShowdownData(supabase: any, tableId: string, actionResult: any) {
  // Get the latest completed hand
  const { data: table } = await supabase
    .from('poker_tables')
    .select('current_dealer_seat')
    .eq('id', tableId)
    .single();
    
  // Find the most recent completed hand for this table
  const { data: hand } = await supabase
    .from('poker_hands')
    .select('*')
    .eq('table_id', tableId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();
    
  if (!hand) {
    return { players: [], pot: actionResult?.pot || 0 };
  }
  
  // Get all hand players with their cards
  const { data: handPlayers } = await supabase
    .from('poker_hand_players')
    .select('*, players(name, avatar_url)')
    .eq('hand_id', hand.id);
    
  const showdownPlayers = (handPlayers || []).map((hp: any) => ({
    playerId: hp.player_id,
    name: hp.players?.name || 'Player',
    seatNumber: hp.seat_number,
    holeCards: hp.hole_cards || [],
    isFolded: hp.is_folded,
    handName: hp.hand_rank,
    wonAmount: hp.won_amount,
    isWinner: hp.won_amount > 0
  }));
  
  console.log(`📊 Showdown data: ${showdownPlayers.length} players, winners: ${showdownPlayers.filter((p: any) => p.isWinner).map((p: any) => p.name).join(', ')}`);
  
  return {
    players: showdownPlayers,
    pot: hand.pot,
    communityCards: hand.community_cards
  };
}