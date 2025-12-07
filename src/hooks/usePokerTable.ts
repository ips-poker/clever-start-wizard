import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Spectator {
  id: string;
  name?: string;
}

export interface PokerPlayer {
  oderId: string;
  name?: string;
  avatarUrl?: string;
  seatNumber: number;
  stack: number;
  betAmount: number;
  holeCards: string[];
  isFolded: boolean;
  isAllIn: boolean;
  isActive: boolean;
}

export interface TableState {
  tableId: string;
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  pot: number;
  currentBet: number;
  currentPlayerSeat: number | null;
  communityCards: string[];
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  players: PokerPlayer[];
}

interface UsePokerTableOptions {
  tableId: string;
  playerId: string;
  buyIn?: number;
  seatNumber?: number;
}

interface ChatMessage {
  playerId: string;
  text: string;
  timestamp: number;
}

export interface ShowdownResult {
  winners: Array<{
    oderId: string;
    name?: string;
    seatNumber: number;
    amount: number;
    handRank?: string;
    cards?: string[];
  }>;
  pot: number;
}

export interface HandHistoryItem {
  handNumber: number;
  timestamp: number;
  pot: number;
  winners: Array<{
    playerId: string;
    playerName?: string;
    amount: number;
    handRank?: string;
  }>;
  communityCards: string[];
  myCards?: string[];
  myResult?: 'win' | 'lose' | 'fold';
  actions: Array<{
    playerId: string;
    action: string;
    amount?: number;
    phase: string;
  }>;
}

export function usePokerTable(options: UsePokerTableOptions | null) {
  const { tableId, playerId, buyIn = 10000, seatNumber } = options || {};
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [tableState, setTableState] = useState<TableState | null>(null);
  const [myCards, setMyCards] = useState<string[]>([]);
  const [mySeat, setMySeat] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [lastAction, setLastAction] = useState<any>(null);
  const [showdownResult, setShowdownResult] = useState<ShowdownResult | null>(null);
  const [handHistory, setHandHistory] = useState<HandHistoryItem[]>([]);
  const [currentHandActions, setCurrentHandActions] = useState<any[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get WebSocket URL
  const getWsUrl = useCallback(() => {
    return `wss://mokhssmnorrhohrowxvu.functions.supabase.co/poker-table-ws`;
  }, []);

  // Send message to WebSocket
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      console.log('📤 Sent:', message.type);
    } else {
      console.warn('⚠️ WebSocket not connected');
    }
  }, []);

  // Connect to table
  const connect = useCallback(() => {
    if (!tableId || !playerId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setIsConnecting(true);
    setError(null);

    try {
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🎰 WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        
        // Join table
        sendMessage({
          type: 'join_table',
          tableId,
          playerId,
          data: { buyIn, seatNumber }
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received:', data.type, data);
          handleMessage(data);
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      };

      ws.onerror = (event) => {
        console.error('❌ WebSocket error:', event);
        setError('Connection error');
        setIsConnecting(false);
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;

        // Auto-reconnect after 3 seconds
        if (!event.wasClean) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            connect();
          }, 3000);
        }
      };
    } catch (e) {
      console.error('Failed to create WebSocket:', e);
      setError('Failed to connect');
      setIsConnecting(false);
    }
  }, [tableId, playerId, buyIn, seatNumber, getWsUrl, sendMessage]);

  // Handle incoming messages
  const handleMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'joined_table':
        setMySeat(data.seatNumber);
        if (data.state) {
          setTableState(data.state);
        }
        break;

      case 'left_table':
        setTableState(null);
        setMySeat(null);
        setMyCards([]);
        break;

      case 'player_joined':
      case 'player_left':
        // Request updated state
        sendMessage({ type: 'get_state', tableId, playerId });
        break;

      case 'state':
        setTableState(data.state);
        break;

      case 'hand_started':
        setMyCards(data.yourCards || []);
        setShowdownResult(null);
        setCurrentHandActions([]);
        if (data.state) {
          setTableState(data.state);
        }
        break;

      case 'player_action':
        setLastAction(data);
        // Track action for history
        setCurrentHandActions(prev => [...prev, {
          playerId: data.playerId,
          action: data.action,
          amount: data.amount,
          phase: tableState?.phase || 'unknown'
        }]);
        if (data.state) {
          setTableState(data.state);
        }
        break;

      case 'phase_change':
        setTableState(prev => prev ? {
          ...prev,
          phase: data.phase,
          communityCards: data.communityCards,
          pot: data.pot,
          currentPlayerSeat: data.currentPlayerSeat
        } : null);
        break;

      case 'showdown':
      case 'hand_complete':
        // Update with showdown results
        const result: ShowdownResult = {
          winners: data.winners || [],
          pot: data.pot || tableState?.pot || 0
        };
        setShowdownResult(result);
        
        // Add to history
        if (data.handNumber || tableState) {
          const historyEntry: HandHistoryItem = {
            handNumber: data.handNumber || Date.now(),
            timestamp: Date.now(),
            pot: data.pot || tableState?.pot || 0,
            winners: (data.winners || []).map((w: any) => ({
              playerId: w.oderId || w.playerId,
              playerName: w.name,
              amount: w.amount,
              handRank: w.handRank
            })),
            communityCards: tableState?.communityCards || [],
            myCards: myCards,
            myResult: data.winners?.some((w: any) => (w.oderId || w.playerId) === playerId) 
              ? 'win' 
              : myCards.length > 0 ? 'lose' : 'fold',
            actions: currentHandActions
          };
          setHandHistory(prev => [...prev, historyEntry]);
        }
        
        setTableState(prev => prev ? {
          ...prev,
          phase: 'showdown'
        } : null);
        break;

      case 'chat':
        setChatMessages(prev => [...prev, {
          playerId: data.playerId,
          text: data.text,
          timestamp: data.timestamp
        }]);
        break;

      case 'error':
        setError(data.message);
        break;
    }
  }, [tableId, playerId, sendMessage]);

  // Disconnect from table
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      sendMessage({ type: 'leave_table', tableId, playerId });
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setIsConnected(false);
    setTableState(null);
    setMySeat(null);
    setMyCards([]);
  }, [tableId, playerId, sendMessage]);

  // Player actions
  const fold = useCallback(() => {
    sendMessage({
      type: 'player_action',
      tableId,
      playerId,
      data: { action: 'fold' }
    });
  }, [tableId, playerId, sendMessage]);

  const check = useCallback(() => {
    sendMessage({
      type: 'player_action',
      tableId,
      playerId,
      data: { action: 'check' }
    });
  }, [tableId, playerId, sendMessage]);

  const call = useCallback(() => {
    sendMessage({
      type: 'player_action',
      tableId,
      playerId,
      data: { action: 'call' }
    });
  }, [tableId, playerId, sendMessage]);

  const raise = useCallback((amount: number) => {
    sendMessage({
      type: 'player_action',
      tableId,
      playerId,
      data: { action: 'raise', amount }
    });
  }, [tableId, playerId, sendMessage]);

  const allIn = useCallback(() => {
    sendMessage({
      type: 'player_action',
      tableId,
      playerId,
      data: { action: 'all-in' }
    });
  }, [tableId, playerId, sendMessage]);

  const startHand = useCallback(() => {
    sendMessage({
      type: 'start_hand',
      tableId,
      playerId
    });
  }, [tableId, playerId, sendMessage]);

  const sendChat = useCallback((text: string) => {
    sendMessage({
      type: 'chat',
      tableId,
      playerId,
      data: { text }
    });
  }, [tableId, playerId, sendMessage]);

  // Get current player info
  const myPlayer = tableState?.players.find(p => p.oderId === playerId);
  const isMyTurn = tableState?.currentPlayerSeat === mySeat;
  const canCheck = tableState?.currentBet === (myPlayer?.betAmount || 0);
  const callAmount = (tableState?.currentBet || 0) - (myPlayer?.betAmount || 0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Clear showdown result
  const clearShowdown = useCallback(() => {
    setShowdownResult(null);
  }, []);

  return {
    // Connection state
    isConnected,
    isConnecting,
    error,
    
    // Table state
    tableState,
    myCards,
    mySeat,
    myPlayer,
    isMyTurn,
    canCheck,
    callAmount,
    chatMessages,
    lastAction,
    showdownResult,
    handHistory,
    
    // Actions
    connect,
    disconnect,
    fold,
    check,
    call,
    raise,
    allIn,
    startHand,
    sendChat,
    clearShowdown
  };
}
