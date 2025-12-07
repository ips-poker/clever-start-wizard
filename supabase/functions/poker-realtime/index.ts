import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const connections = new Map<string, Map<string, WebSocket>>(); // tableId -> (playerId -> ws)

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const url = new URL(req.url);
  const tableId = url.searchParams.get("tableId");
  const playerId = url.searchParams.get("playerId");

  if (!tableId || !playerId) {
    return new Response("Missing tableId or playerId", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  socket.onopen = () => {
    console.log(`[WS] Player ${playerId} connected to table ${tableId}`);
    
    // Добавляем в map соединений
    if (!connections.has(tableId)) {
      connections.set(tableId, new Map());
    }
    connections.get(tableId)!.set(playerId, socket);

    // Отправляем текущее состояние
    sendGameState(tableId, playerId, socket, supabase);
    
    // Уведомляем других игроков
    broadcastToTable(tableId, playerId, {
      type: 'player_connected',
      playerId,
      timestamp: Date.now()
    });
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log(`[WS] Message from ${playerId}:`, message.type);

      switch (message.type) {
        case 'ping':
          socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        case 'action':
          await handlePlayerAction(tableId, playerId, message, supabase);
          break;

        case 'chat':
          broadcastToTable(tableId, null, {
            type: 'chat',
            playerId,
            message: message.text,
            timestamp: Date.now()
          });
          break;

        case 'emoji':
          broadcastToTable(tableId, null, {
            type: 'emoji',
            playerId,
            emoji: message.emoji,
            timestamp: Date.now()
          });
          break;

        case 'get_state':
          await sendGameState(tableId, playerId, socket, supabase);
          break;
      }
    } catch (error) {
      console.error(`[WS] Error processing message:`, error);
      socket.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  };

  socket.onclose = () => {
    console.log(`[WS] Player ${playerId} disconnected from table ${tableId}`);
    
    // Удаляем из map соединений
    const tableConnections = connections.get(tableId);
    if (tableConnections) {
      tableConnections.delete(playerId);
      if (tableConnections.size === 0) {
        connections.delete(tableId);
      }
    }

    // Уведомляем других
    broadcastToTable(tableId, playerId, {
      type: 'player_disconnected',
      playerId,
      timestamp: Date.now()
    });
  };

  socket.onerror = (error) => {
    console.error(`[WS] Socket error for ${playerId}:`, error);
  };

  return response;
});

// Отправка состояния игры
async function sendGameState(tableId: string, playerId: string, socket: WebSocket, supabase: any) {
  try {
    // Получаем стол
    const { data: table } = await supabase
      .from('poker_tables')
      .select('*')
      .eq('id', tableId)
      .single();

    if (!table) {
      socket.send(JSON.stringify({ type: 'error', message: 'Table not found' }));
      return;
    }

    // Получаем игроков
    const { data: tablePlayers } = await supabase
      .from('poker_table_players')
      .select('*, players(name, avatar_url)')
      .eq('table_id', tableId);

    // Получаем текущую раздачу
    let hand = null;
    let handPlayers: any[] = [];
    
    if (table.current_hand_id) {
      const { data: handData } = await supabase
        .from('poker_hands')
        .select('*')
        .eq('id', table.current_hand_id)
        .single();
      hand = handData;

      if (hand) {
        const { data: hp } = await supabase
          .from('poker_hand_players')
          .select('*')
          .eq('hand_id', hand.id);
        handPlayers = hp || [];
      }
    }

    // Формируем состояние для игрока
    const players = (tablePlayers || []).map((tp: any) => {
      const hp = handPlayers.find(h => h.player_id === tp.player_id);
      const isHero = tp.player_id === playerId;
      
      return {
        playerId: tp.player_id,
        playerName: tp.players?.name || 'Player',
        avatarUrl: tp.players?.avatar_url,
        seatNumber: tp.seat_number,
        stack: tp.stack,
        // Карты показываем только свои
        holeCards: isHero ? (hp?.hole_cards || []) : (hp?.hole_cards ? ['??', '??'] : []),
        currentBet: hp?.bet_amount || 0,
        isFolded: hp?.is_folded || false,
        isAllIn: hp?.is_all_in || false,
        isDealer: tp.seat_number === table.current_dealer_seat,
        isSmallBlind: hand ? tp.seat_number === hand.small_blind_seat : false,
        isBigBlind: hand ? tp.seat_number === hand.big_blind_seat : false,
      };
    });

    const state = {
      type: 'game_state',
      tableId,
      handId: table.current_hand_id,
      phase: hand?.phase || 'waiting',
      pot: hand?.pot || 0,
      currentBet: hand?.current_bet || 0,
      communityCards: hand?.community_cards || [],
      dealerSeat: table.current_dealer_seat,
      currentPlayerSeat: hand?.current_player_seat,
      players,
      smallBlind: table.small_blind,
      bigBlind: table.big_blind,
      timestamp: Date.now()
    };

    socket.send(JSON.stringify(state));
  } catch (error) {
    console.error('[WS] Error sending game state:', error);
    socket.send(JSON.stringify({ type: 'error', message: 'Failed to get game state' }));
  }
}

// Обработка действий игрока
async function handlePlayerAction(tableId: string, playerId: string, message: any, supabase: any) {
  const { action, amount } = message;
  
  console.log(`[WS] Processing action: ${action} from ${playerId}`);

  // Вызываем Edge Function poker-game-engine
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/poker-game-engine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({
      action,
      tableId,
      playerId,
      amount
    }),
  });

  const result = await response.json();
  console.log(`[WS] Action result:`, result);

  // Рассылаем обновление всем игрокам за столом
  broadcastToTable(tableId, null, {
    type: 'action_result',
    playerId,
    action,
    amount,
    result,
    timestamp: Date.now()
  });

  // Отправляем обновленное состояние всем
  const tableConnections = connections.get(tableId);
  if (tableConnections) {
    for (const [pid, ws] of tableConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        await sendGameState(tableId, pid, ws, supabase);
      }
    }
  }
}

// Рассылка сообщения всем игрокам за столом
function broadcastToTable(tableId: string, excludePlayerId: string | null, message: any) {
  const tableConnections = connections.get(tableId);
  if (!tableConnections) return;

  const messageStr = JSON.stringify(message);
  
  for (const [playerId, ws] of tableConnections) {
    if (playerId !== excludePlayerId && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error(`[WS] Error sending to ${playerId}:`, error);
      }
    }
  }
}
