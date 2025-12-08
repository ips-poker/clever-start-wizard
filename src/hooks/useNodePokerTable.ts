/**
 * Hook for connecting to Node.js Poker WebSocket Server
 * Production-ready with reconnection, ping/pong, and state management
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

export interface PokerPlayer {
  playerId: string;
  name?: string;
  avatarUrl?: string;
  seatNumber: number;
  stack: number;
  betAmount: number;
  totalBetInHand?: number;
  holeCards: string[];
  isFolded: boolean;
  isAllIn: boolean;
  isActive: boolean;
  isDisconnected?: boolean;
  timeBankRemaining?: number;
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
  minRaise?: number;
  smallBlindAmount?: number;
  bigBlindAmount?: number;
  anteAmount?: number;
  actionTimer?: number;
  timeRemaining?: number | null;
  lastRaiserSeat?: number | null;
  playersNeeded?: number;
  gameStartingCountdown?: number;
  nextHandCountdown?: number;
}

export interface ShowdownResult {
  winners: Array<{
    playerId: string;
    name?: string;
    seatNumber: number;
    amount: number;
    handRank?: string;
    cards?: string[];
  }>;
  pot: number;
}

export interface ChatMessage {
  id?: string;
  playerId: string;
  playerName?: string;
  text?: string;
  message?: string;
  timestamp: number;
  type?: 'chat' | 'system' | 'dealer' | 'action';
}

interface UseNodePokerTableOptions {
  tableId: string;
  playerId: string;
  playerName?: string;
  buyIn?: number;
  seatNumber?: number;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

const WS_URL = 'wss://poker.syndicate-poker.ru/ws/poker';
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];
const PING_INTERVAL = 25000;

export function useNodePokerTable(options: UseNodePokerTableOptions | null) {
  const { tableId, playerId, playerName = 'Player', buyIn = 10000, seatNumber } = options || {};

  // State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [tableState, setTableState] = useState<TableState | null>(null);
  const [myCards, setMyCards] = useState<string[]>([]);
  const [mySeat, setMySeat] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showdownResult, setShowdownResult] = useState<ShowdownResult | null>(null);
  const [lastAction, setLastAction] = useState<{ playerId: string; action: string; amount?: number } | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  // Send message to server
  const sendMessage = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      console.log('📤 WS Send:', message);
      return true;
    }
    console.warn('⚠️ WebSocket not connected');
    return false;
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📥 WS Recv:', data.type, data);

      switch (data.type) {
        case 'connected':
          console.log('✅ Server connected');
          break;

        case 'subscribed':
        case 'joined_table':
        case 'state':
          if (data.state) {
            setTableState(prev => {
              const newState = transformServerState(data.state, tableId!);
              // Fast comparison to avoid unnecessary re-renders
              if (prev && JSON.stringify(prev) === JSON.stringify(newState)) {
                return prev;
              }
              return newState;
            });

            // Extract my cards
            if (data.state.players && playerId) {
              const myPlayer = data.state.players.find((p: any) => p.playerId === playerId || p.id === playerId);
              if (myPlayer?.holeCards) {
                setMyCards(myPlayer.holeCards);
                setMySeat(myPlayer.seatNumber);
              }
            }
          }
          if (data.type === 'joined_table') {
            console.log('✅ Joined table:', tableId);
          }
          break;

        case 'action_accepted':
          console.log('✅ Action accepted:', data.actionType, data.amount);
          break;

        case 'player_action':
          setLastAction({
            playerId: data.playerId,
            action: data.actionType,
            amount: data.amount
          });
          // Clear after animation
          setTimeout(() => setLastAction(null), 2000);
          break;

        case 'showdown':
          setShowdownResult(data.result);
          break;

        case 'hand_complete':
        case 'hand_end':
          // Hand finished, showdown data might be in winners
          if (data.winners) {
            setShowdownResult({
              winners: data.winners,
              pot: data.pot || 0
            });
          }
          // Clear after delay
          setTimeout(() => setShowdownResult(null), 5000);
          break;

        case 'chat':
          setChatMessages(prev => [...prev.slice(-49), {
            id: crypto.randomUUID(),
            playerId: data.playerId,
            playerName: data.playerName,
            text: data.message,
            timestamp: Date.now(),
            type: 'chat'
          }]);
          break;

        case 'left_table':
          console.log('👋 Left table:', data.tableId);
          setTableState(null);
          setMyCards([]);
          setMySeat(null);
          break;

        case 'error':
          console.error('❌ Server error:', data.error);
          setError(data.error);
          setTimeout(() => setError(null), 5000);
          break;

        case 'pong':
          // Server responded to ping
          break;

        default:
          console.log('📨 Unknown message type:', data.type);
      }
    } catch (err) {
      console.error('Failed to parse message:', err);
    }
  }, [tableId, playerId]);

  // Transform server state to client format
  const transformServerState = (serverState: any, tableId: string): TableState => {
    const players: PokerPlayer[] = (serverState.players || []).map((p: any) => ({
      playerId: p.playerId || p.id,
      name: p.name || p.playerName || 'Player',
      avatarUrl: p.avatarUrl,
      seatNumber: p.seatNumber || p.seat,
      stack: p.stack || p.chips || 0,
      betAmount: p.betAmount || p.bet || 0,
      totalBetInHand: p.totalBetInHand || p.betAmount || 0,
      holeCards: p.holeCards || p.cards || [],
      isFolded: p.isFolded || p.folded || false,
      isAllIn: p.isAllIn || p.allIn || false,
      isActive: p.isActive !== false,
      isDisconnected: p.isDisconnected || false,
      timeBankRemaining: p.timeBankRemaining || 60
    }));

    return {
      tableId,
      phase: serverState.phase || 'waiting',
      pot: serverState.pot || 0,
      currentBet: serverState.currentBet || 0,
      currentPlayerSeat: serverState.currentPlayerSeat ?? serverState.activePlayerSeat ?? null,
      communityCards: serverState.communityCards || serverState.board || [],
      dealerSeat: serverState.dealerSeat || serverState.buttonSeat || 1,
      smallBlindSeat: serverState.smallBlindSeat || 1,
      bigBlindSeat: serverState.bigBlindSeat || 2,
      players,
      minRaise: serverState.minRaise || serverState.currentBet || 20,
      smallBlindAmount: serverState.smallBlind || 10,
      bigBlindAmount: serverState.bigBlind || 20,
      anteAmount: serverState.ante || 0,
      actionTimer: serverState.actionTimer || 30,
      timeRemaining: serverState.timeRemaining,
      playersNeeded: players.filter(p => p.isActive).length < 2 ? 2 - players.filter(p => p.isActive).length : 0
    };
  };

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!tableId || !playerId) {
      console.log('❌ Cannot connect: missing tableId or playerId');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('⚠️ Already connected');
      return;
    }

    clearTimers();
    setConnectionStatus('connecting');

    const url = `${WS_URL}?tableId=${tableId}&playerId=${playerId}`;
    console.log('🔌 Connecting to:', url);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      console.log('✅ WebSocket connected');
      setConnectionStatus('connected');
      setError(null);
      reconnectAttemptRef.current = 0;

      // Subscribe to table
      sendMessage({
        type: 'subscribe',
        tableId,
        playerId
      });

      // Start ping interval
      pingIntervalRef.current = setInterval(() => {
        sendMessage({ type: 'ping' });
      }, PING_INTERVAL);
    };

    ws.onmessage = handleMessage;

    ws.onclose = (event) => {
      if (!mountedRef.current) return;
      console.log('🔴 WebSocket closed:', event.code, event.reason);
      clearTimers();
      setConnectionStatus('disconnected');

      // Reconnect if not intentional close
      if (event.code !== 1000 && event.code !== 1001) {
        const delay = RECONNECT_DELAYS[Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)];
        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current + 1})`);
        setConnectionStatus('reconnecting');
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptRef.current++;
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setError('Connection error');
    };
  }, [tableId, playerId, clearTimers, sendMessage, handleMessage]);

  // Disconnect
  const disconnect = useCallback(() => {
    clearTimers();
    if (wsRef.current) {
      if (tableId && playerId) {
        sendMessage({
          type: 'leave_table',
          tableId,
          playerId
        });
      }
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, [tableId, playerId, clearTimers, sendMessage]);

  // Join table
  const joinTable = useCallback((seat: number) => {
    if (!tableId || !playerId) return;

    sendMessage({
      type: 'join_table',
      tableId,
      playerId,
      playerName,
      seatNumber: seat,
      buyIn
    });
  }, [tableId, playerId, playerName, buyIn, sendMessage]);

  // Leave table
  const leaveTable = useCallback(() => {
    if (!tableId || !playerId) return;

    sendMessage({
      type: 'leave_table',
      tableId,
      playerId
    });
  }, [tableId, playerId, sendMessage]);

  // Game actions
  const fold = useCallback(() => {
    if (!tableId || !playerId) return;
    sendMessage({
      type: 'action',
      tableId,
      playerId,
      actionType: 'fold'
    });
  }, [tableId, playerId, sendMessage]);

  const check = useCallback(() => {
    if (!tableId || !playerId) return;
    sendMessage({
      type: 'action',
      tableId,
      playerId,
      actionType: 'check'
    });
  }, [tableId, playerId, sendMessage]);

  const call = useCallback(() => {
    if (!tableId || !playerId) return;
    sendMessage({
      type: 'action',
      tableId,
      playerId,
      actionType: 'call'
    });
  }, [tableId, playerId, sendMessage]);

  const bet = useCallback((amount: number) => {
    if (!tableId || !playerId) return;
    sendMessage({
      type: 'action',
      tableId,
      playerId,
      actionType: 'bet',
      amount
    });
  }, [tableId, playerId, sendMessage]);

  const raise = useCallback((amount: number) => {
    if (!tableId || !playerId) return;
    sendMessage({
      type: 'action',
      tableId,
      playerId,
      actionType: 'raise',
      amount
    });
  }, [tableId, playerId, sendMessage]);

  const allIn = useCallback(() => {
    if (!tableId || !playerId) return;
    sendMessage({
      type: 'action',
      tableId,
      playerId,
      actionType: 'allin'
    });
  }, [tableId, playerId, sendMessage]);

  // Send chat message
  const sendChatMessage = useCallback((text: string) => {
    if (!tableId || !playerId) return;
    sendMessage({
      type: 'chat',
      tableId,
      playerId,
      message: text
    });
  }, [tableId, playerId, sendMessage]);

  // Check if it's my turn
  const isMyTurn = useMemo(() => {
    if (!tableState || mySeat === null) return false;
    return tableState.currentPlayerSeat === mySeat;
  }, [tableState, mySeat]);

  // Get my player data
  const myPlayer = useMemo(() => {
    if (!tableState || !playerId) return null;
    return tableState.players.find(p => p.playerId === playerId);
  }, [tableState, playerId]);

  // Calculate call amount
  const callAmount = useMemo(() => {
    if (!tableState || !myPlayer) return 0;
    return Math.max(0, tableState.currentBet - myPlayer.betAmount);
  }, [tableState, myPlayer]);

  // Can check?
  const canCheck = useMemo(() => {
    return callAmount === 0;
  }, [callAmount]);

  // Effect: Connect on mount
  useEffect(() => {
    mountedRef.current = true;

    if (tableId && playerId) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [tableId, playerId]);

  return {
    // Connection
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    connect,
    disconnect,

    // State
    tableState,
    myCards,
    mySeat,
    error,
    chatMessages,
    showdownResult,
    lastAction,

    // Computed
    isMyTurn,
    myPlayer,
    callAmount,
    canCheck,

    // Actions
    joinTable,
    leaveTable,
    fold,
    check,
    call,
    bet,
    raise,
    allIn,
    sendChatMessage
  };
}
