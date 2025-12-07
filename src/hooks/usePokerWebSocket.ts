import { useRef, useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

interface UsePokerWebSocketOptions {
  tableId: string;
  playerId: string;
  onMessage?: (message: WebSocketMessage) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (error: Error) => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

/**
 * Unified WebSocket manager for poker tables
 * Handles connection, reconnection, and message routing
 */
export function usePokerWebSocket({
  tableId,
  playerId,
  onMessage,
  onStatusChange,
  onError,
  autoReconnect = true,
  maxReconnectAttempts = 5,
  reconnectDelay = 2000
}: UsePokerWebSocketOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);

  const updateStatus = useCallback((newStatus: ConnectionStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
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

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    updateStatus('connecting');

    try {
      // Get Supabase session for auth
      const { data: { session } } = await supabase.auth.getSession();
      
      // Build WebSocket URL
      const wsUrl = new URL(
        `${process.env.NODE_ENV === 'production' ? 'wss' : 'wss'}://mokhssmnorrhohrowxvu.supabase.co/functions/v1/poker-table-ws`
      );
      wsUrl.searchParams.set('tableId', tableId);
      wsUrl.searchParams.set('playerId', playerId);
      if (session?.access_token) {
        wsUrl.searchParams.set('token', session.access_token);
      }

      const ws = new WebSocket(wsUrl.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        updateStatus('connected');
        setReconnectAttempt(0);
        
        // Process any queued messages
        processMessageQueue();

        // Start heartbeat
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          setLastMessage(message);
          onMessage?.(message);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        clearTimers();
        
        if (event.wasClean) {
          updateStatus('disconnected');
        } else if (autoReconnect && reconnectAttempt < maxReconnectAttempts) {
          updateStatus('reconnecting');
          setReconnectAttempt(prev => prev + 1);
          
          const delay = reconnectDelay * Math.pow(2, reconnectAttempt);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else {
          updateStatus('failed');
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        onError?.(new Error('WebSocket connection error'));
      };

    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      updateStatus('failed');
      onError?.(err as Error);
    }
  }, [
    tableId, 
    playerId, 
    updateStatus, 
    clearTimers, 
    processMessageQueue, 
    autoReconnect, 
    reconnectAttempt, 
    maxReconnectAttempts, 
    reconnectDelay, 
    onMessage, 
    onError
  ]);

  const disconnect = useCallback(() => {
    clearTimers();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    
    updateStatus('disconnected');
    setReconnectAttempt(0);
    messageQueueRef.current = [];
  }, [clearTimers, updateStatus]);

  const send = useCallback((type: string, payload: any = {}) => {
    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: Date.now()
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      messageQueueRef.current.push(message);
    }
  }, []);

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
    status,
    isConnected: status === 'connected',
    isReconnecting: status === 'reconnecting',
    lastMessage,
    reconnectAttempt,
    
    connect,
    disconnect,
    send,
    
    // Action shortcuts
    sendAction: (action: string, amount?: number) => send('action', { action, amount }),
    sendChat: (message: string) => send('chat', { message }),
    sendEmoji: (emoji: string) => send('emoji', { emoji })
  };
}
