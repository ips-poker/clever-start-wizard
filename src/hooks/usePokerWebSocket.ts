import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useReconnectManager } from './useReconnectManager';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

interface WebSocketMessage {
  type: string;
  payload?: any;
  data?: any;
  playerId?: string;
  tableId?: string;
  timestamp: number;
}

interface GameState {
  table: {
    id: string;
    name: string;
    smallBlind: number;
    bigBlind: number;
    status: string;
  };
  players: Array<{
    id: string;
    name: string;
    avatar?: string;
    seatNumber: number;
    stack: number;
    isDealer: boolean;
  }>;
  hand: {
    id: string;
    phase: string;
    pot: number;
    currentBet: number;
    communityCards: string[];
    currentPlayerSeat: number | null;
  } | null;
  myCards: string[];
}

interface UsePokerWebSocketOptions {
  tableId: string;
  playerId: string;
  onMessage?: (message: WebSocketMessage) => void;
  onGameStateUpdate?: (state: GameState) => void;
  onPlayerAction?: (data: any) => void;
  onHandUpdate?: (data: any) => void;
  onTurnUpdate?: (seatNumber: number) => void;
  onPlayerJoined?: (playerId: string) => void;
  onPlayerLeft?: (playerId: string) => void;
  onError?: (error: Error | string) => void;
}

/**
 * Optimized WebSocket manager for poker tables
 * Features: auto-reconnection, message queuing, heartbeat, game state sync
 */
export function usePokerWebSocket({
  tableId,
  playerId,
  onMessage,
  onGameStateUpdate,
  onPlayerAction,
  onHandUpdate,
  onTurnUpdate,
  onPlayerJoined,
  onPlayerLeft,
  onError
}: UsePokerWebSocketOptions) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [latency, setLatency] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);
  const lastPingRef = useRef<number>(0);

  // Use reconnect manager for robust connection handling
  const reconnect = useReconnectManager({
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 15000,
    onReconnect: async () => {
      await connect();
    },
    onMaxRetriesReached: () => {
      onError?.('Connection failed after maximum retries');
    }
  });

  // Build WebSocket URL - Production Node.js server on VPS
  const wsUrl = useMemo(() => {
    // VPS Server: 89.111.155.224
    // Use ws:// for HTTP, wss:// for HTTPS
    const isLocalhost = window.location.hostname === 'localhost';
    const base = isLocalhost 
      ? 'ws://89.111.155.224:3001'  // Direct connection for local dev
      : 'wss://89.111.155.224';      // Via Nginx with SSL for production
    return `${base}/ws/poker?tableId=${tableId}&playerId=${playerId}`;
  }, [tableId, playerId]);

  const clearTimers = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const processMessageQueue = useCallback(() => {
    while (messageQueueRef.current.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      const message = messageQueueRef.current.shift();
      if (message) {
        wsRef.current.send(JSON.stringify(message));
      }
    }
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      setLastMessage(message);
      onMessage?.(message);

      // Calculate latency from pong
      if (message.type === 'pong' && lastPingRef.current) {
        setLatency(Date.now() - lastPingRef.current);
      }

      switch (message.type) {
        case 'ping':
          // Respond to server ping
          wsRef.current?.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        case 'game_state':
          const state = message.data as GameState;
          setGameState(state);
          onGameStateUpdate?.(state);
          break;

        case 'player_action':
          onPlayerAction?.(message.data);
          // Optimistic update for pot
          if (message.data?.pot !== undefined) {
            setGameState(prev => prev ? {
              ...prev,
              hand: prev.hand ? { ...prev.hand, pot: message.data.pot } : null
            } : null);
          }
          break;

        case 'hand_update':
          onHandUpdate?.(message.data);
          // Update local state
          setGameState(prev => {
            if (!prev?.hand) return prev;
            return {
              ...prev,
              hand: {
                ...prev.hand,
                phase: message.data.phase ?? prev.hand.phase,
                communityCards: message.data.communityCards ?? prev.hand.communityCards,
                pot: message.data.pot ?? prev.hand.pot,
                currentBet: message.data.currentBet ?? prev.hand.currentBet,
                currentPlayerSeat: message.data.currentPlayerSeat ?? prev.hand.currentPlayerSeat
              }
            };
          });
          break;

        case 'turn_update':
          const seat = message.data?.currentPlayerSeat;
          if (seat !== undefined) {
            onTurnUpdate?.(seat);
            setGameState(prev => prev?.hand ? {
              ...prev,
              hand: { ...prev.hand, currentPlayerSeat: seat }
            } : prev);
          }
          break;

        case 'player_joined':
          onPlayerJoined?.(message.playerId || '');
          break;

        case 'player_left':
          onPlayerLeft?.(message.playerId || '');
          break;

        case 'error':
          const errorMsg = message.data?.message || 'Unknown error';
          console.error('[WS] Server error:', errorMsg);
          onError?.(errorMsg);
          break;
      }
    } catch (err) {
      console.error('[WS] Message parse error:', err);
    }
  }, [onMessage, onGameStateUpdate, onPlayerAction, onHandUpdate, onTurnUpdate, onPlayerJoined, onPlayerLeft, onError]);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      console.log('[WS] Connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
        reconnect.markConnected();
        processMessageQueue();

        // Start heartbeat (every 25 seconds)
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            lastPingRef.current = Date.now();
            ws.send(JSON.stringify({ type: 'ping', timestamp: lastPingRef.current }));
          }
        }, 25000);
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        clearTimers();
        console.log('[WS] Closed:', event.code, event.reason);
        
        if (!event.wasClean) {
          reconnect.markDisconnected('Connection lost unexpectedly');
        }
      };

      ws.onerror = (event) => {
        console.error('[WS] Error:', event);
        onError?.(new Error('WebSocket connection error'));
      };

    } catch (err) {
      console.error('[WS] Connection error:', err);
      reconnect.markDisconnected('Failed to connect');
    }
  }, [wsUrl, handleMessage, clearTimers, processMessageQueue, reconnect, onError]);

  const disconnect = useCallback(() => {
    clearTimers();
    reconnect.cancelReconnect();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    
    setGameState(null);
    messageQueueRef.current = [];
  }, [clearTimers, reconnect]);

  const send = useCallback((type: string, payload: any = {}) => {
    const message: WebSocketMessage = {
      type,
      payload,
      data: payload,
      tableId,
      playerId,
      timestamp: Date.now()
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      messageQueueRef.current.push(message);
      return false;
    }
  }, [tableId, playerId]);

  // Game action shortcuts
  const sendAction = useCallback((action: string, amount?: number) => {
    return send('action', { action, amount });
  }, [send]);

  const fold = useCallback(() => sendAction('fold'), [sendAction]);
  const check = useCallback(() => sendAction('check'), [sendAction]);
  const call = useCallback(() => sendAction('call'), [sendAction]);
  const raise = useCallback((amount: number) => sendAction('raise', amount), [sendAction]);
  const allIn = useCallback(() => sendAction('all_in'), [sendAction]);
  const sendChat = useCallback((message: string) => send('chat', { message }), [send]);
  const sendEmoji = useCallback((emoji: string) => send('emoji', { emoji }), [send]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Auto-connect when tableId/playerId change
  useEffect(() => {
    if (tableId && playerId) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [tableId, playerId]);

  return {
    // Connection state
    status: reconnect.status,
    isConnected: reconnect.isConnected,
    isReconnecting: reconnect.isReconnecting,
    retryCount: reconnect.retryCount,
    nextRetryIn: reconnect.nextRetryIn,
    latency,
    
    // Game state
    gameState,
    lastMessage,
    
    // Connection methods
    connect,
    disconnect,
    reconnectNow: reconnect.reconnectNow,
    
    // Raw send
    send,
    
    // Action shortcuts
    sendAction,
    fold,
    check,
    call,
    raise,
    allIn,
    sendChat,
    sendEmoji
  };
}
