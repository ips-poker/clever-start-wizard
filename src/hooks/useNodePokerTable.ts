/**
 * Hook for connecting to Node.js Poker WebSocket Server
 * Production-ready with reconnection, ping/pong, and state management
 * Connects to external poker.syndicate-poker.ru server
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

// WebSocket URL - Node.js Server
const WS_URL = 'wss://poker.syndicate-poker.ru/ws/poker';
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];
const PING_INTERVAL = 25000;

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
  // Server sends flat state from PokerTable.getPlayerState()
  const transformServerState = useCallback((serverState: unknown, tblId: string): TableState => {
    const state = serverState as Record<string, unknown>;
    
    // Server sends flat format from PokerTable.getPlayerState()
    const players = (state.players || []) as Record<string, unknown>[];
    
    const mappedPlayers: PokerPlayer[] = players.map((p) => ({
      playerId: (p.playerId || p.id) as string,
      name: (p.name || 'Player') as string,
      avatarUrl: (p.avatar || p.avatarUrl) as string | undefined,
      seatNumber: (p.seatNumber || 0) as number,
      stack: (p.stack || 0) as number,
      betAmount: (p.betAmount || p.currentBet || 0) as number,
      totalBetInHand: (p.betAmount || p.currentBet || 0) as number,
      holeCards: (p.holeCards || []) as string[],
      isFolded: (p.isFolded || false) as boolean,
      isAllIn: (p.isAllIn || false) as boolean,
      isActive: (p.isActive !== false && p.status !== 'disconnected') as boolean,
      isDisconnected: (p.status === 'disconnected') as boolean,
      timeBankRemaining: (p.timeBank || 60) as number
    }));

    return {
      tableId: tblId,
      phase: (state.phase || 'waiting') as TableState['phase'],
      pot: (state.pot || 0) as number,
      currentBet: (state.currentBet || 0) as number,
      currentPlayerSeat: (state.currentPlayerSeat || null) as number | null,
      communityCards: (state.communityCards || []) as string[],
      dealerSeat: (state.dealerSeat || 1) as number,
      smallBlindSeat: (state.smallBlindSeat || 1) as number,
      bigBlindSeat: (state.bigBlindSeat || 2) as number,
      players: mappedPlayers,
      minRaise: (state.minRaise || state.bigBlind || 20) as number,
      smallBlindAmount: (state.smallBlind || 10) as number,
      bigBlindAmount: (state.bigBlind || 20) as number,
      anteAmount: (state.ante || 0) as number,
      actionTimer: (state.actionTimer || 30) as number,
      timeRemaining: state.timeRemaining as number | null | undefined,
      playersNeeded: (state.playersNeeded || 0) as number
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
          // Server may auto-subscribe based on URL params
          break;

        case 'subscribed':
        case 'state':
        case 'table_state':
          if (data.state && tableId) {
            setTableState(prev => {
              const newState = transformServerState(data.state, tableId);
              if (prev && JSON.stringify(prev) === JSON.stringify(newState)) {
                return prev;
              }
              return newState;
            });

            // Extract my cards and seat from server state (from getPlayerState)
            const stateData = data.state as Record<string, unknown>;
            if (stateData.myCards) {
              setMyCards(stateData.myCards as string[]);
            }
            if (stateData.mySeat !== undefined && stateData.mySeat !== null) {
              setMySeat(stateData.mySeat as number);
              log('🎯 My seat set from state:', stateData.mySeat);
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
                  log('🎯 My seat set from player data:', myPlayerData.seatNumber);
                }
              }
            }
          }
          if (data.type === 'subscribed') {
            log('✅ Subscribed to table:', tableId);
          }
          break;

        case 'joined_table':
          log('✅ Joined table:', tableId, 'Full data:', JSON.stringify(data));
          // Extract seat and state from join response
          // Server sends: { type: 'joined_table', tableId, state: { mySeat, myCards, players, ... } }
          if (data.state && tableId) {
            const stateData = data.state as Record<string, unknown>;
            log('🎯 State received:', JSON.stringify(stateData).substring(0, 500));
            
            setTableState(transformServerState(data.state, tableId));
            
            if (stateData.myCards) {
              setMyCards(stateData.myCards as string[]);
              log('🃏 My cards set:', stateData.myCards);
            }
            if (stateData.mySeat !== undefined && stateData.mySeat !== null) {
              const seatNum = stateData.mySeat as number;
              setMySeat(seatNum);
              log('🎯 My seat set after join:', seatNum);
            } else {
              log('⚠️ mySeat not in state, checking players...');
              // Fallback: find myself in players array
              const playersData = stateData.players as Array<Record<string, unknown>> | undefined;
              if (playersData && playerId) {
                const myPlayer = playersData.find(p => p.playerId === playerId || p.id === playerId);
                if (myPlayer && myPlayer.seatNumber !== undefined) {
                  setMySeat(myPlayer.seatNumber as number);
                  log('🎯 My seat found in players:', myPlayer.seatNumber);
                }
              }
            }
          } else {
            log('⚠️ No state in joined_table response, data keys:', Object.keys(data as object));
          }
          break;

        case 'player_joined':
          // Check if this is us joining
          {
            const eventData = data.data as Record<string, unknown> | undefined;
            const eventPlayerId = eventData?.playerId ?? (data as Record<string, unknown>).playerId;
            if (eventPlayerId === playerId) {
              const seatNum = eventData?.seatNumber ?? (data as Record<string, unknown>).seatNumber;
              if (seatNum !== undefined) {
                setMySeat(seatNum as number);
                log('🎯 I joined at seat:', seatNum);
              }
            }
          }
          // Fall through to update state
        case 'player_left':
        case 'playerLeft':
        case 'player_disconnected':
        case 'playerDisconnected':
        case 'hand_started':
        case 'handStarted':  // Server sends camelCase
        case 'phase_change':
        case 'phaseChange':
          // These events include updated tableState - process it
          log(`📡 ${data.type} event received:`, {
            hasState: !!data.state,
            stateKeys: data.state ? Object.keys(data.state as object) : []
          });
          
          if (data.state && tableId) {
            const stateData = data.state as Record<string, unknown>;
            
            // Log important state details
            log(`📊 State update:`, {
              phase: stateData.phase,
              currentPlayerSeat: stateData.currentPlayerSeat,
              myCards: stateData.myCards,
              mySeat: stateData.mySeat,
              isMyTurn: stateData.isMyTurn,
              pot: stateData.pot
            });
            
            setTableState(transformServerState(data.state, tableId));
            
            if (stateData.myCards) {
              const cards = stateData.myCards as string[];
              log('🃏 Setting my cards:', cards);
              setMyCards(cards);
            }
            if (stateData.mySeat !== undefined && stateData.mySeat !== null) {
              setMySeat(stateData.mySeat as number);
            }
          }
          
          if (data.type === 'hand_started' || data.type === 'handStarted') {
            log('🎴 Hand started event:', JSON.stringify(data).substring(0, 500));
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
        case 'handComplete':  // Server sends camelCase
        case 'hand_end':
        case 'handEnd':
          log('🏆 Hand complete event:', data.type);
          
          // Extract winners from data.data or data.winners
          const eventData = (data.data || data) as Record<string, unknown>;
          const winners = eventData.winners as ShowdownResult['winners'] | undefined;
          
          if (winners && winners.length > 0) {
            log('🏆 Winners:', winners);
            setShowdownResult({
              winners: winners,
              pot: (eventData.pot || data.pot || 0) as number
            });
          }
          setTimeout(() => setShowdownResult(null), 5000);
          
          // Update state
          if (data.state && tableId) {
            const stateData = data.state as Record<string, unknown>;
            setTableState(transformServerState(data.state, tableId));
            
            // Also update cards from state
            if (stateData.myCards) {
              setMyCards(stateData.myCards as string[]);
            }
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

      // Server auto-subscribes based on URL params, but we can explicitly subscribe
      // State will be sent by server in 'connected' or 'state' message
      log('📡 Waiting for server state...');

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

  // Game actions - use actionType format for Node.js server
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
