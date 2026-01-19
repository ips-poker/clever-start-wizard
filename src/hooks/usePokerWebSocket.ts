import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useReconnectManager } from './useReconnectManager';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

export interface WebSocketMessage {
  type: string;
  payload?: any;
  data?: any;
  playerId?: string;
  tableId?: string;
  timestamp: number;
  actionId?: string; // For action confirmation
}

export interface GameState {
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
    status?: string;
    betAmount?: number;
  }>;
  hand: {
    id: string;
    phase: string;
    pot: number;
    currentBet: number;
    communityCards: string[];
    currentPlayerSeat: number | null;
    handNumber?: number;
  } | null;
  myCards: string[];
  serverTime?: number; // For sync validation
}

// Disconnect action timeout state
export interface DisconnectActionTimeout {
  playerId: string;
  seatNumber: number;
  remainingMs: number;
  willAutoAction: 'fold' | 'check';
}

export interface UsePokerWebSocketOptions {
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
  onActionConfirmed?: (actionId: string) => void;
  onActionRejected?: (actionId: string, reason: string) => void;
  onDisconnectTimeout?: (data: DisconnectActionTimeout) => void;
  onReconnected?: () => void;
}

/**
 * Optimized WebSocket manager for poker tables
 * Features: auto-reconnection, message queuing, heartbeat, game state sync, state reconciliation
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
  onError,
  onActionConfirmed,
  onActionRejected,
  onDisconnectTimeout,
  onReconnected
}: UsePokerWebSocketOptions) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [latency, setLatency] = useState<number>(0);
  const [disconnectTimeout, setDisconnectTimeout] = useState<DisconnectActionTimeout | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);
  const lastPingRef = useRef<number>(0);
  const lastHandIdRef = useRef<string | null>(null);
  const reconnectCountRef = useRef<number>(0);
  const pendingActionsRef = useRef<Map<string, { type: string; timestamp: number }>>(new Map());

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

  // Build WebSocket URL - Production Node.js server on VPS cv5500219
  const wsUrl = useMemo(() => {
    // VPS Server: 89.104.74.121 (cv5500219) - poker-server running on /var/www/poker-server
    // Use ws:// for HTTP, wss:// for HTTPS
    const isLocalhost = window.location.hostname === 'localhost';
    const base = isLocalhost 
      ? 'ws://89.104.74.121:3001'  // Direct connection for local dev
      : 'wss://89.104.74.121';      // Via Nginx with SSL for production
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

  // Validate and reconcile state after reconnect
  const reconcileState = useCallback((serverState: GameState) => {
    setIsReconciling(true);
    
    const localHandId = lastHandIdRef.current;
    const serverHandId = serverState.hand?.id;
    
    // Check if we missed a hand transition
    if (localHandId && serverHandId && localHandId !== serverHandId) {
      console.log('[WS] Hand changed during reconnect:', localHandId, '->', serverHandId);
    }
    
    // Update tracking
    lastHandIdRef.current = serverHandId || null;
    
    // Clear any stale pending actions
    const now = Date.now();
    pendingActionsRef.current.forEach((action, actionId) => {
      if (now - action.timestamp > 10000) {
        console.log('[WS] Clearing stale pending action:', actionId);
        pendingActionsRef.current.delete(actionId);
        onActionRejected?.(actionId, 'Connection lost during action');
      }
    });
    
    setIsReconciling(false);
  }, [onActionRejected]);

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

        case 'game_state': {
          const state = message.data as GameState;
          
          // If this is after reconnect, reconcile
          if (reconnectCountRef.current > 0) {
            reconcileState(state);
            reconnectCountRef.current = 0;
          }
          
          lastHandIdRef.current = state.hand?.id || null;
          setGameState(state);
          onGameStateUpdate?.(state);
          break;
        }

        case 'player_action':
          onPlayerAction?.(message.data);
          // Optimistic update for pot and player state
          if (message.data) {
            setGameState(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                hand: prev.hand && message.data.pot !== undefined
                  ? { ...prev.hand, pot: message.data.pot }
                  : prev.hand,
                players: prev.players.map(p => 
                  p.seatNumber === message.data.seatNumber
                    ? { ...p, stack: message.data.stack ?? p.stack, betAmount: message.data.betAmount ?? p.betAmount }
                    : p
                )
              };
            });
          }
          break;

        case 'action_confirmed':
          // Server confirmed our action
          if (message.actionId) {
            pendingActionsRef.current.delete(message.actionId);
            onActionConfirmed?.(message.actionId);
            console.log('[WS] Action confirmed:', message.actionId);
          }
          break;

        case 'action_rejected':
          // Server rejected our action
          if (message.actionId) {
            pendingActionsRef.current.delete(message.actionId);
            const reason = message.data?.reason || 'Unknown error';
            onActionRejected?.(message.actionId, reason);
            console.warn('[WS] Action rejected:', message.actionId, reason);
          }
          break;

        case 'disconnect_action_timeout':
          // Another player is disconnected and will auto-action
          const timeoutData: DisconnectActionTimeout = {
            playerId: message.data?.playerId || '',
            seatNumber: message.data?.seatNumber || 0,
            remainingMs: message.data?.remainingMs || 2000,
            willAutoAction: message.data?.willAutoAction || 'fold'
          };
          setDisconnectTimeout(timeoutData);
          onDisconnectTimeout?.(timeoutData);
          
          // Clear after timeout
          setTimeout(() => {
            setDisconnectTimeout(prev => 
              prev?.playerId === timeoutData.playerId ? null : prev
            );
          }, timeoutData.remainingMs + 500);
          break;

        case 'hand_update':
          onHandUpdate?.(message.data);
          // Update local state with new hand data
          setGameState(prev => {
            if (!prev?.hand) return prev;
            
            const newHandId = message.data?.handId;
            if (newHandId) {
              lastHandIdRef.current = newHandId;
            }
            
            return {
              ...prev,
              hand: {
                ...prev.hand,
                id: newHandId ?? prev.hand.id,
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
          // Clear disconnect timeout if turn changes
          setDisconnectTimeout(null);
          break;

        case 'player_joined':
          onPlayerJoined?.(message.playerId || '');
          break;

        case 'player_left':
          onPlayerLeft?.(message.playerId || '');
          break;

        case 'player_disconnected':
          // Update player status to show disconnected
          setGameState(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              players: prev.players.map(p =>
                p.id === message.data?.playerId
                  ? { ...p, status: 'disconnected' }
                  : p
              )
            };
          });
          break;

        case 'player_reconnected':
          // Update player status to active
          setGameState(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              players: prev.players.map(p =>
                p.id === message.data?.playerId
                  ? { ...p, status: 'active' }
                  : p
              )
            };
          });
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
  }, [onMessage, onGameStateUpdate, onPlayerAction, onHandUpdate, onTurnUpdate, onPlayerJoined, onPlayerLeft, onError, onActionConfirmed, onActionRejected, onDisconnectTimeout, reconcileState]);

  // Request full state from server (used after reconnection)
  const requestFullState = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'request_state', 
        tableId, 
        playerId,
        timestamp: Date.now() 
      }));
      console.log('[WS] Requesting full state after reconnect');
    }
  }, [tableId, playerId]);

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

        // Track if this is a reconnect
        if (reconnectCountRef.current > 0) {
          console.log('[WS] Reconnected after', reconnectCountRef.current, 'attempts');
          onReconnected?.();
          // Request full state to reconcile
          setTimeout(() => requestFullState(), 100);
        }
        reconnectCountRef.current++;

        // Start heartbeat (every 20 seconds - faster than server's 30s cleanup)
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            lastPingRef.current = Date.now();
            ws.send(JSON.stringify({ type: 'ping', timestamp: lastPingRef.current }));
          }
        }, 20000);
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
  }, [wsUrl, handleMessage, clearTimers, processMessageQueue, reconnect, onError, onReconnected, requestFullState]);

  const disconnect = useCallback(() => {
    clearTimers();
    reconnect.cancelReconnect();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    
    setGameState(null);
    setDisconnectTimeout(null);
    messageQueueRef.current = [];
    pendingActionsRef.current.clear();
    lastHandIdRef.current = null;
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

  // Generate unique action ID
  const generateActionId = useCallback(() => {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Send action with tracking for confirmation
  const sendTrackedAction = useCallback((action: string, amount?: number) => {
    const actionId = generateActionId();
    const message: WebSocketMessage = {
      type: 'action',
      payload: { action, amount },
      data: { action, amount },
      tableId,
      playerId,
      timestamp: Date.now(),
      actionId
    };

    pendingActionsRef.current.set(actionId, { type: action, timestamp: Date.now() });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return { sent: true, actionId };
    } else {
      messageQueueRef.current.push(message);
      return { sent: false, actionId };
    }
  }, [tableId, playerId, generateActionId]);

  // Game action shortcuts
  const sendAction = useCallback((action: string, amount?: number) => {
    return send('action', { action, amount });
  }, [send]);

  const fold = useCallback(() => sendTrackedAction('fold'), [sendTrackedAction]);
  const check = useCallback(() => sendTrackedAction('check'), [sendTrackedAction]);
  const call = useCallback(() => sendTrackedAction('call'), [sendTrackedAction]);
  const raise = useCallback((amount: number) => sendTrackedAction('raise', amount), [sendTrackedAction]);
  const allIn = useCallback(() => sendTrackedAction('all_in'), [sendTrackedAction]);
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
    isPausedDueToOverload: reconnect.isPausedDueToOverload,
    retryCount: reconnect.retryCount,
    nextRetryIn: reconnect.nextRetryIn,
    latency,
    isReconciling,
    
    // Game state
    gameState,
    lastMessage,
    disconnectTimeout,
    
    // Connection methods
    connect,
    disconnect,
    reconnectNow: reconnect.reconnectNow,
    requestFullState,
    
    // Raw send
    send,
    
    // Tracked actions (return actionId for confirmation tracking)
    sendTrackedAction,
    
    // Legacy action shortcuts (for compatibility)
    sendAction,
    fold,
    check,
    call,
    raise,
    allIn,
    sendChat,
    sendEmoji,
    
    // Pending action management
    hasPendingActions: pendingActionsRef.current.size > 0,
    getPendingActionCount: () => pendingActionsRef.current.size
  };
}
