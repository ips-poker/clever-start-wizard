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

// Production WebSocket URL - with fallback detection
const WS_URL = 'wss://poker.syndicate-poker.ru/ws/poker';
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];
const PING_INTERVAL = 25000;
const CONNECTION_TIMEOUT = 5000; // 5 seconds to receive 'connected' message

// Debug logging
const DEBUG = true;
const log = (...args: unknown[]) => DEBUG && console.log('[NodePoker]', ...args);

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
      log('📤 Send:', message);
      return true;
    }
    log('⚠️ WebSocket not connected, readyState:', wsRef.current?.readyState);
    return false;
  }, []);

  // Transform server state to client format
  const transformServerState = useCallback((serverState: unknown, tblId: string): TableState => {
    const state = serverState as Record<string, unknown>;
    const playersArr = (state.players || []) as Record<string, unknown>[];
    
    const players: PokerPlayer[] = playersArr.map((p) => ({
      playerId: (p.playerId || p.id) as string,
      name: (p.name || p.playerName || 'Player') as string,
      avatarUrl: p.avatarUrl as string | undefined,
      seatNumber: (p.seatNumber || p.seat || 0) as number,
      stack: (p.stack || p.chips || 0) as number,
      betAmount: (p.betAmount || p.bet || 0) as number,
      totalBetInHand: (p.totalBetInHand || p.betAmount || 0) as number,
      holeCards: (p.holeCards || p.cards || []) as string[],
      isFolded: (p.isFolded || p.folded || false) as boolean,
      isAllIn: (p.isAllIn || p.allIn || false) as boolean,
      isActive: p.isActive !== false,
      isDisconnected: (p.isDisconnected || false) as boolean,
      timeBankRemaining: (p.timeBankRemaining || 60) as number
    }));

    return {
      tableId: tblId,
      phase: (state.phase || 'waiting') as TableState['phase'],
      pot: (state.pot || 0) as number,
      currentBet: (state.currentBet || 0) as number,
      currentPlayerSeat: (state.currentPlayerSeat ?? state.activePlayerSeat ?? null) as number | null,
      communityCards: (state.communityCards || state.board || []) as string[],
      dealerSeat: (state.dealerSeat || state.buttonSeat || 1) as number,
      smallBlindSeat: (state.smallBlindSeat || 1) as number,
      bigBlindSeat: (state.bigBlindSeat || 2) as number,
      players,
      minRaise: (state.minRaise || state.currentBet || 20) as number,
      smallBlindAmount: (state.smallBlind || 10) as number,
      bigBlindAmount: (state.bigBlind || 20) as number,
      anteAmount: (state.ante || 0) as number,
      actionTimer: (state.actionTimer || 30) as number,
      timeRemaining: state.timeRemaining as number | null | undefined,
      playersNeeded: players.filter(p => p.isActive).length < 2 ? 2 - players.filter(p => p.isActive).length : 0
    };
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as Record<string, unknown>;
      log('📥 Recv:', data.type, data);

      switch (data.type) {
        case 'connected':
          log('✅ Server connected, timestamp:', data.timestamp);
          break;

        case 'subscribed':
        case 'joined_table':
        case 'state':
          if (data.state && tableId) {
            setTableState(prev => {
              const newState = transformServerState(data.state, tableId);
              if (prev && JSON.stringify(prev) === JSON.stringify(newState)) {
                return prev;
              }
              return newState;
            });

            // Extract my cards and seat from server state
            const stateData = data.state as Record<string, unknown>;
            
            // Check for myCards and mySeat in root state (from getPlayerState)
            if (stateData.myCards) {
              setMyCards(stateData.myCards as string[]);
            }
            if (stateData.mySeat !== undefined && stateData.mySeat !== null) {
              setMySeat(stateData.mySeat as number);
            }
            
            // Also check players array
            const playersData = stateData.players as Record<string, unknown>[] | undefined;
            if (playersData && playerId) {
              const myPlayerData = playersData.find((p) => p.playerId === playerId || p.id === playerId);
              if (myPlayerData) {
                const cards = myPlayerData.holeCards as string[] | undefined;
                if (cards && cards.length > 0) {
                  setMyCards(cards);
                }
                if (myPlayerData.seatNumber !== undefined) {
                  setMySeat(myPlayerData.seatNumber as number);
                }
              }
            }
          }
          if (data.type === 'joined_table') {
            log('✅ Joined table:', tableId);
          }
          if (data.type === 'subscribed') {
            log('✅ Subscribed to table:', tableId);
          }
          break;

        case 'player_joined':
        case 'player_left':
        case 'hand_started':
        case 'phase_change':
          // These events include updated state - process it
          if (data.state && tableId) {
            setTableState(prev => {
              const newState = transformServerState(data.state, tableId);
              return newState;
            });
            
            // Update my cards if included
            const stateData = data.state as Record<string, unknown>;
            if (stateData.myCards) {
              setMyCards(stateData.myCards as string[]);
            }
          }
          break;

        case 'action_accepted':
          log('✅ Action accepted:', data.actionType, data.amount);
          break;

        case 'action':
        case 'player_action':
          setLastAction({
            playerId: data.playerId as string,
            action: (data.actionType || data.action) as string,
            amount: data.amount as number | undefined
          });
          setTimeout(() => setLastAction(null), 2000);
          
          // Update state if included
          if (data.state && tableId) {
            setTableState(transformServerState(data.state, tableId));
          }
          break;

        case 'showdown':
          setShowdownResult(data.result as ShowdownResult);
          break;

        case 'hand_complete':
        case 'hand_end':
          if (data.winners) {
            setShowdownResult({
              winners: data.winners as ShowdownResult['winners'],
              pot: (data.pot || 0) as number
            });
          }
          setTimeout(() => setShowdownResult(null), 5000);
          
          // Update state
          if (data.state && tableId) {
            setTableState(transformServerState(data.state, tableId));
          }
          break;

        case 'chat':
          setChatMessages(prev => [...prev.slice(-49), {
            id: crypto.randomUUID(),
            playerId: data.playerId as string,
            playerName: data.playerName as string | undefined,
            text: data.message as string | undefined,
            timestamp: Date.now(),
            type: 'chat'
          }]);
          break;

        case 'left_table':
          log('👋 Left table:', data.tableId);
          setTableState(null);
          setMyCards([]);
          setMySeat(null);
          break;

        case 'error':
          log('❌ Server error:', data.error);
          setError(data.error as string);
          setTimeout(() => setError(null), 5000);
          break;

        case 'pong':
          break;

        default:
          log('📨 Unknown message type:', data.type, data);
      }
    } catch (err) {
      log('❌ Failed to parse message:', err, event.data);
    }
  }, [tableId, playerId, transformServerState]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!tableId || !playerId) {
      log('❌ Cannot connect: missing tableId or playerId', { tableId, playerId });
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      log('⚠️ Already connected');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      log('⚠️ Already connecting...');
      return;
    }

    clearTimers();
    setConnectionStatus('connecting');

    const url = `${WS_URL}?tableId=${tableId}&playerId=${playerId}`;
    log('🔌 Connecting to:', url);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      log('✅ WebSocket connected to', url);
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
      log('🔴 WebSocket closed:', event.code, event.reason, 'wasClean:', event.wasClean);
      clearTimers();
      setConnectionStatus('disconnected');

      // Reconnect if not intentional close
      if (event.code !== 1000 && event.code !== 1001) {
        const delay = RECONNECT_DELAYS[Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)];
        log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current + 1})`);
        setConnectionStatus('reconnecting');
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptRef.current++;
          connect();
        }, delay);
      }
    };

    ws.onerror = (wsError) => {
      log('❌ WebSocket error:', wsError);
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
      // Small delay to ensure component is mounted
      const timeoutId = setTimeout(() => {
        connect();
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        mountedRef.current = false;
        disconnect();
      };
    }
    
    return () => {
      mountedRef.current = false;
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
