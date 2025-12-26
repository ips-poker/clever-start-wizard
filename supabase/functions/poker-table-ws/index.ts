/**
 * Poker Table WebSocket Handler v3.0
 * Production-grade with connection management and health checks
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  addConnection, 
  removeConnection, 
  getTableConnections,
  broadcastToTable,
  sendToPlayer,
  recordPong,
  recordMessage,
  pingAllConnections,
  initConnectionManager,
  stopConnectionManager,
  getStats,
  getTotalConnections,
} from "../_shared/connection-manager.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Ping interval handle
let pingIntervalId: number | null = null;

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

// Initialize connection manager and ping loop
initConnectionManager();

// Start ping loop (every 15 seconds)
pingIntervalId = setInterval(() => {
  const stale = pingAllConnections();
  if (stale.length > 0) {
    console.log(`🔌 Cleaned up ${stale.length} stale connections`);
  }
}, 15000);

// Register shutdown handlers
onShutdown('stop-ping-loop', () => {
  if (pingIntervalId) {
    clearInterval(pingIntervalId);
    pingIntervalId = null;
  }
}, 10);

onShutdown('cleanup-connections', () => {
  stopConnectionManager();
}, 20);

onShutdown('cleanup-channels', async () => {
  // Cleanup all broadcast channels
  for (const [channelKey, channel] of broadcastChannels) {
    try {
      await getSupabase().removeChannel(channel);
    } catch (e) {
      console.error(`Error removing channel ${channelKey}:`, e);
    }
  }
  broadcastChannels.clear();
}, 30);

// Subscribe to broadcast channel for a table (for cross-instance communication)
function subscribeToBroadcast(tableId: string, currentPlayerId: string) {
  const channelKey = `${tableId}_${currentPlayerId}`;
  if (broadcastChannels.has(channelKey)) return;
  
  const supabase = getSupabase();
  const channel = supabase
    .channel(`poker_table_${tableId}`)
    .on('broadcast', { event: 'table_update' }, (payload: any) => {
      console.log(`📡 Broadcast received for table ${tableId}:`, payload.payload?.type);
      
      // Send to player via connection manager
      try {
        sendToPlayer(tableId, currentPlayerId, payload.payload);
      } catch (e) {
        console.error('Error forwarding broadcast:', e);
      }
    })
    .subscribe((status: string) => {
      console.log(`📡 Broadcast subscription status for ${tableId}:`, status);
    });
  
  broadcastChannels.set(channelKey, channel);
}

// Unsubscribe from broadcast channel
function unsubscribeFromBroadcast(tableId: string, playerId: string) {
  const channelKey = `${tableId}_${playerId}`;
  const channel = broadcastChannels.get(channelKey);
  if (channel) {
    getSupabase().removeChannel(channel);
    broadcastChannels.delete(channelKey);
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
  } catch (e) {
    console.error('Broadcast error:', e);
  }
  
  // Also send to local connections directly via connection manager
  broadcastToTable(tableId, message);
}

serve(async (req) => {
  const url = new URL(req.url);
  
  // Health check endpoint
  if (url.pathname === '/health' || url.searchParams.get('health') === 'true') {
    const stats = getStats();
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: Date.now(),
      connections: getTotalConnections(),
      tables: stats.tables,
      broadcastChannels: broadcastChannels.size,
      messagesTotal: stats.totalMessagesProcessed,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check server capacity
  if (getTotalConnections() >= 1800) { // 200 tables * 9 players
    return new Response(JSON.stringify({ 
      error: 'Server at capacity',
      retryAfter: 5
    }), { 
      status: 503, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '5' } 
    });
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
      
      // Record message for connection tracking
      if (currentTableId && currentPlayerId) {
        recordMessage(currentTableId, currentPlayerId);
      }

      switch (message.type) {
        case 'join_table': {
          const { tableId, playerId, playerName, buyIn } = message;
          if (!tableId || !playerId) {
            socket.send(JSON.stringify({ type: 'error', message: 'Missing tableId or playerId' }));
            return;
          }

          currentTableId = tableId;
          currentPlayerId = playerId;

          // Add to connection manager
          const addResult = addConnection(tableId, playerId, socket, playerName);
          if (!addResult.success) {
            socket.send(JSON.stringify({ type: 'error', message: addResult.error || 'Connection failed' }));
            return;
          }
          
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

          console.log(`✅ Player ${playerName} (${playerId?.slice(0,8)}) joined table ${tableId?.slice(0,8)} at seat ${joinResult?.seatNumber}`);
          
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

          // Remove from connection manager
          removeConnection(tableId, playerId);
          
          // Unsubscribe from broadcast
          unsubscribeFromBroadcast(tableId, playerId);

          // Broadcast player left to all instances
          await broadcastToAllInstances(tableId, {
            type: 'player_left',
            playerId,
            tableState: await fetchTableState(supabase, tableId, '')
          });

          console.log(`🚪 Player ${playerId?.slice(0,8)} left table ${tableId?.slice(0,8)}`);
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

          console.log(`🃏 Hand started at table ${tableId?.slice(0,8)}`);
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
            console.log(`🏆 Hand complete, broadcasting showdown to table ${tableId?.slice(0,8)}`);
            
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

        case 'pong': {
          // Record pong response for connection health
          if (currentTableId && currentPlayerId) {
            recordPong(currentTableId, currentPlayerId);
          }
          break;
        }

        case 'add_chips': {
          const { tableId, playerId, data } = message;
          if (!tableId || !playerId || !data?.amount) {
            socket.send(JSON.stringify({ type: 'error', message: 'Missing tableId, playerId or amount' }));
            return;
          }

          // Call engine to add chips
          const { data: addResult, error } = await supabase.functions.invoke('poker-game-engine', {
            body: { action: 'add_chips', tableId, playerId, amount: data.amount }
          });

          if (error || !addResult?.success) {
            socket.send(JSON.stringify({ 
              type: 'error', 
              message: addResult?.error || 'Failed to add chips' 
            }));
            return;
          }

          // Send result to player
          socket.send(JSON.stringify({
            type: 'chips_added',
            playerId,
            amount: addResult.amount,
            newStack: addResult.newStack,
            walletBalance: addResult.walletBalance
          }));

          // Broadcast updated state to all
          await broadcastTableStateToAll(supabase, tableId);

          console.log(`💎 Player ${playerId?.slice(0,8)} added ${data.amount} chips`);
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

          // Add to connection manager
          addConnection(tableId, playerId, socket);
          
          // Subscribe to broadcast channel
          subscribeToBroadcast(tableId, playerId);
          
          console.log(`📡 Player ${playerId?.slice(0,8)} subscribed to table ${tableId?.slice(0,8)}`);

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
      // Remove from connection manager
      removeConnection(currentTableId, currentPlayerId);
      
      // Unsubscribe from broadcast
      unsubscribeFromBroadcast(currentTableId, currentPlayerId);

      // Check if player is in active hand and should auto-fold
      try {
        const { data: table } = await supabase
          .from('poker_tables')
          .select('current_hand_id')
          .eq('id', currentTableId)
          .single();

        if (table?.current_hand_id) {
          // Check if disconnected player is in the hand
          const { data: handPlayer } = await supabase
            .from('poker_hand_players')
            .select('id, is_folded, seat_number')
            .eq('hand_id', table.current_hand_id)
            .eq('player_id', currentPlayerId)
            .single();

          if (handPlayer && !handPlayer.is_folded) {
            // Get current hand to check if it's this player's turn
            const { data: hand } = await supabase
              .from('poker_hands')
              .select('current_player_seat')
              .eq('id', table.current_hand_id)
              .single();

            // If it's this player's turn, auto-fold immediately
            if (hand?.current_player_seat === handPlayer.seat_number) {
              console.log(`🚨 Disconnected player ${currentPlayerId?.slice(0,8)} is current player, auto-folding`);
              
              const { data: foldResult } = await supabase.functions.invoke('poker-game-engine', {
                body: { action: 'auto_fold_disconnected', tableId: currentTableId, playerId: currentPlayerId }
              });

              if (foldResult?.success) {
                // Broadcast the fold action
                await broadcastToAllInstances(currentTableId, {
                  type: 'player_action',
                  playerId: currentPlayerId,
                  action: 'fold',
                  amount: 0,
                  result: foldResult,
                  reason: 'disconnected'
                });

                // Broadcast updated state
                await broadcastTableStateToAll(supabase, currentTableId);

                if (foldResult.handComplete) {
                  await broadcastToAllInstances(currentTableId, {
                    type: 'hand_complete',
                    winners: [{ playerId: foldResult.winner, amount: foldResult.winAmount }],
                    reason: 'all_folded'
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error handling disconnect auto-fold:', error);
      }

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
  
  // Also send to local connections via connection manager
  const connections = getTableConnections(tableId);
  if (connections) {
    for (const [playerId] of connections) {
      const state = await fetchTableState(supabase, tableId, playerId);
      sendToPlayer(tableId, playerId, {
        type: 'table_state',
        ...state
      });
    }
  }
}

// Fetch showdown data with all players' cards
async function fetchShowdownData(supabase: any, tableId: string, actionResult: any) {
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
