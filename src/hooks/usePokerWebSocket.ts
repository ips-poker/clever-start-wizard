import { useState, useEffect, useCallback, useRef } from 'react';

export interface WsSidePot {
  amount: number;
  eligiblePlayers: string[];
  cappedAt: number;
}

export interface WsGameState {
  tableId: string;
  handId: string | null;
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  pot: number;
  currentBet: number;
  communityCards: string[];
  dealerSeat: number | null;
  currentPlayerSeat: number | null;
  players: WsPlayerState[];
  smallBlind: number;
  bigBlind: number;
  sidePots?: WsSidePot[];
}

export interface WsPlayerState {
  playerId: string;
  playerName: string;
  avatarUrl: string | null;
  seatNumber: number;
  stack: number;
  holeCards: string[];
  currentBet: number;
  isFolded: boolean;
  isAllIn: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
}

interface ActionResult {
  success: boolean;
  error?: string;
  handComplete?: boolean;
  winner?: string;
  winners?: { playerId: string; amount: number; handName?: string }[];
}

interface UsePokerWebSocketOptions {
  tableId: string;
  playerId: string;
  onGameState?: (state: WsGameState) => void;
  onAction?: (data: any) => void;
  onChat?: (data: { playerId: string; message: string }) => void;
  onEmoji?: (data: { playerId: string; emoji: string }) => void;
  onPlayerConnected?: (playerId: string) => void;
  onPlayerDisconnected?: (playerId: string) => void;
}

export function usePokerWebSocket({
  tableId,
  playerId,
  onGameState,
  onAction,
  onChat,
  onEmoji,
  onPlayerConnected,
  onPlayerDisconnected,
}: UsePokerWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<WsGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastActionResult, setLastActionResult] = useState<ActionResult | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = `wss://mokhssmnorrhohrowxvu.functions.supabase.co/functions/v1/poker-realtime?tableId=${tableId}&playerId=${playerId}`;
    
    console.log('[WS] Connecting to:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected');
      setIsConnected(true);
      setError(null);

      // Пинг каждые 30 секунд
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WS] Received:', data.type);

        switch (data.type) {
          case 'game_state':
            setGameState(data);
            onGameState?.(data);
            break;

          case 'action_result':
            setLastActionResult(data.result);
            onAction?.(data);
            // Обновляем состояние после действия
            break;

          case 'chat':
            onChat?.({ playerId: data.playerId, message: data.message });
            break;

          case 'emoji':
            onEmoji?.({ playerId: data.playerId, emoji: data.emoji });
            break;

          case 'player_connected':
            onPlayerConnected?.(data.playerId);
            break;

          case 'player_disconnected':
            onPlayerDisconnected?.(data.playerId);
            break;

          case 'error':
            setError(data.message);
            break;

          case 'pong':
            // Heartbeat response
            break;
        }
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
      setIsConnected(false);
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }

      // Автореконнект через 3 секунды
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('[WS] Reconnecting...');
        connect();
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      setError('Connection error');
    };
  }, [tableId, playerId, onGameState, onAction, onChat, onEmoji, onPlayerConnected, onPlayerDisconnected]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendAction = useCallback((action: string, amount?: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'action',
        action,
        amount
      }));
    } else {
      setError('Not connected');
    }
  }, []);

  const sendChat = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        text
      }));
    }
  }, []);

  const sendEmoji = useCallback((emoji: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'emoji',
        emoji
      }));
    }
  }, []);

  const requestState = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'get_state' }));
    }
  }, []);

  // Подключаемся при монтировании
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Вычисляемые значения
  const myPlayer = gameState?.players.find(p => p.playerId === playerId);
  const isMyTurn = gameState?.currentPlayerSeat === myPlayer?.seatNumber;
  const canCheck = isMyTurn && (gameState?.currentBet || 0) <= (myPlayer?.currentBet || 0);
  const callAmount = Math.max(0, (gameState?.currentBet || 0) - (myPlayer?.currentBet || 0));
  const minRaise = (gameState?.currentBet || 0) * 2 || gameState?.bigBlind || 20;

  return {
    isConnected,
    gameState,
    myPlayer,
    isMyTurn,
    canCheck,
    callAmount,
    minRaise,
    error,
    lastActionResult,

    // Действия
    connect,
    disconnect,
    sendAction,
    sendChat,
    sendEmoji,
    requestState,

    // Удобные методы
    fold: () => sendAction('fold'),
    check: () => sendAction('check'),
    call: () => sendAction('call'),
    raise: (amount: number) => sendAction('raise', amount),
    allIn: () => sendAction('all_in'),
    startHand: () => sendAction('start_hand'),
  };
}
