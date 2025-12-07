import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useReconnectManager, ConnectionStatus } from '@/hooks/useReconnectManager';
export interface Spectator {
  id: string;
  name?: string;
}

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
  // Disconnect protection
  isDisconnected?: boolean;
  timeBankRemaining?: number;
}

export interface SidePotInfo {
  amount: number;
  eligiblePlayers: string[];
  contributors: string[];
}

export interface SidePotsDisplay {
  mainPot: SidePotInfo;
  sidePots: SidePotInfo[];
  totalPot: number;
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
  sidePots?: SidePotsDisplay;
  // Betting info
  minRaise?: number;
  smallBlindAmount?: number;
  bigBlindAmount?: number;
  anteAmount?: number;
  actionTimer?: number;
  timeRemaining?: number | null;
  lastRaiserSeat?: number | null;
  runItTwiceEnabled?: boolean;
  // Rake configuration
  rakePercent?: number;
  rakeCap?: number;
  totalRakeCollected?: number;
  // Straddle & Advanced Blinds
  straddleEnabled?: boolean;
  straddleSeat?: number | null;
  straddleAmount?: number;
  buttonAnteEnabled?: boolean;
  buttonAnteAmount?: number;
  bigBlindAnteEnabled?: boolean;
  bigBlindAnteAmount?: number;
  mississippiStraddleEnabled?: boolean;
  pendingStraddles?: Array<{ seat: number; amount: number }>;
  // Bomb Pot
  bombPotEnabled?: boolean;
  bombPotMultiplier?: number;
  bombPotCurrentHand?: boolean;
  bombPotDoubleBoard?: boolean;
  // Chat
  chatEnabled?: boolean;
  chatSlowMode?: boolean;
  chatSlowModeInterval?: number;
  // Auto-start (PPPoker style)
  gameStartingCountdown?: number;
  nextHandCountdown?: number;
  playersNeeded?: number;
}

interface UsePokerTableOptions {
  tableId: string;
  playerId: string;
  buyIn?: number;
  seatNumber?: number;
}

interface ChatMessage {
  id?: string;
  playerId: string;
  playerName?: string;
  text?: string;
  message?: string;
  timestamp: number;
  type?: 'chat' | 'system' | 'dealer' | 'action';
  isModerated?: boolean;
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
  const channelRef = useRef<any>(null);
  const autoStartAttemptedRef = useRef<boolean>(false);
  const autoStartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadPlayersFromDBRef = useRef<() => Promise<void>>();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLoadTimeRef = useRef<number>(0);

  // Auto-start hand via edge function (stateless, reliable, PPPoker-style)
  const autoStartViaEngine = useCallback(async () => {
    if (!tableId || !playerId) {
      console.log('❌ Auto-start blocked: missing tableId or playerId');
      return;
    }
    if (autoStartAttemptedRef.current) {
      console.log('⏸️ Auto-start already in progress, skipping...');
      return;
    }
    
    autoStartAttemptedRef.current = true;
    console.log('🎯 [PPPoker] Calling start_hand...');
    
    try {
      const { data, error } = await supabase.functions.invoke('poker-game-engine', {
        body: {
          action: 'start_hand',
          tableId,
          playerId
        }
      });
      
      if (error) {
        console.error('❌ Auto-start network error:', error);
        // Reset after short delay to allow retry
        setTimeout(() => { autoStartAttemptedRef.current = false; }, 2000);
        return;
      }
      
      if (data?.success) {
        console.log('✅ Hand started! Reloading state in 500ms...');
        // Reload state after short delay to let DB propagate
        setTimeout(() => {
          loadPlayersFromDBRef.current?.();
        }, 500);
        // Reset flag for next hand after longer delay (hand must complete first)
        setTimeout(() => {
          autoStartAttemptedRef.current = false;
        }, 5000);
      } else if (data?.error?.includes('2 players')) {
        console.log('⏸️ Need more players, resetting...');
        setTableState(prev => prev ? {
          ...prev,
          gameStartingCountdown: 0,
          playersNeeded: 2
        } : null);
        autoStartAttemptedRef.current = false;
      } else if (data?.error?.includes('in progress')) {
        console.log('🎴 Hand already running (age: ' + (data?.handAge || '?') + 's), syncing...');
        // Just reload current state
        setTimeout(() => {
          loadPlayersFromDBRef.current?.();
        }, 300);
        // Reset flag quickly since we're not starting a new hand
        setTimeout(() => { autoStartAttemptedRef.current = false; }, 1500);
      } else {
        console.log('ℹ️ Engine response:', data);
        autoStartAttemptedRef.current = false;
      }
    } catch (err) {
      console.error('❌ Auto-start exception:', err);
      setTimeout(() => { autoStartAttemptedRef.current = false; }, 2000);
    }
  }, [tableId, playerId]);

  // Load players from DB and sync via Realtime
  const loadPlayersFromDB = useCallback(async () => {
    if (!tableId) return;
    
    try {
      const { data: tablePlayers, error: playersError } = await supabase
        .from('poker_table_players')
        .select(`
          *,
          player:players(id, name, avatar_url)
        `)
        .eq('table_id', tableId)
        .in('status', ['active', 'sitting_out']);

      if (playersError) {
        console.error('Error loading players:', playersError);
        return;
      }

      const { data: tableData, error: tableError } = await supabase
        .from('poker_tables')
        .select('*')
        .eq('id', tableId)
        .single();

      if (tableError) {
        console.error('Error loading table:', tableError);
        return;
      }

      // Load current hand if any
      let communityCards: string[] = [];
      let pot = 0;
      let currentBet = 0;
      let phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' = 'waiting';
      let dealerSeat = tableData.current_dealer_seat || 1;
      let currentPlayerSeat: number | null = null;
      let handPlayersMap = new Map<string, any>();

      if (tableData.current_hand_id) {
        const { data: handData } = await supabase
          .from('poker_hands')
          .select('*')
          .eq('id', tableData.current_hand_id)
          .single();

        if (handData) {
          communityCards = handData.community_cards || [];
          pot = handData.pot || 0;
          currentBet = handData.current_bet || 0;
          phase = handData.phase as any || 'waiting';
          dealerSeat = handData.dealer_seat || 1;
          currentPlayerSeat = handData.current_player_seat;

          // Load all hand players for bet info
          const { data: handPlayers } = await supabase
            .from('poker_hand_players')
            .select('*')
            .eq('hand_id', tableData.current_hand_id);

          if (handPlayers) {
            handPlayers.forEach(hp => {
              handPlayersMap.set(hp.player_id, hp);
            });
          }

          // Load my cards
          if (playerId) {
            const myHandPlayer = handPlayersMap.get(playerId);
            if (myHandPlayer) {
              setMyCards(myHandPlayer.hole_cards || []);
              setMySeat(myHandPlayer.seat_number);
            }
          }
        }
      }

      // Convert to TableState format with hand player data
      // Stack calculation: use actual table_player stack (which gets updated by engine)
      const players: PokerPlayer[] = (tablePlayers || []).map(p => {
        const handPlayer = handPlayersMap.get(p.player_id);
        return {
          playerId: p.player_id,
          name: p.player?.name || 'Player',
          avatarUrl: p.player?.avatar_url,
          seatNumber: handPlayer?.seat_number || p.seat_number,
          // Use the actual stack from poker_table_players (engine updates this)
          stack: p.stack,
          betAmount: handPlayer?.bet_amount || 0,
          totalBetInHand: handPlayer?.bet_amount || 0,
          holeCards: p.player_id === playerId ? (handPlayer?.hole_cards || []) : 
                     (phase === 'showdown' && !handPlayer?.is_folded ? (handPlayer?.hole_cards || []) : []),
          isFolded: handPlayer?.is_folded || false,
          isAllIn: handPlayer?.is_all_in || false,
          isActive: p.status === 'active',
          isDisconnected: false,
          timeBankRemaining: 60
        };
      });

      // Find my seat from players
      const myPlayerData = players.find(p => p.playerId === playerId);
      if (myPlayerData) {
        setMySeat(myPlayerData.seatNumber);
      }

      // Calculate blinds seats
      const activePlayers = players.filter(p => p.isActive).sort((a, b) => a.seatNumber - b.seatNumber);
      let smallBlindSeat = dealerSeat;
      let bigBlindSeat = dealerSeat;
      
      if (activePlayers.length >= 2) {
        const dealerIndex = activePlayers.findIndex(p => p.seatNumber === dealerSeat);
        if (dealerIndex !== -1) {
          smallBlindSeat = activePlayers[(dealerIndex + 1) % activePlayers.length].seatNumber;
          bigBlindSeat = activePlayers[(dealerIndex + 2) % activePlayers.length].seatNumber;
        } else if (activePlayers.length >= 2) {
          smallBlindSeat = activePlayers[0].seatNumber;
          bigBlindSeat = activePlayers[1].seatNumber;
        }
      }

      const newPhase = phase;
      const playersCount = activePlayers.length;

      // Only update state if data actually changed (PPPoker-level stability - no JSON.stringify)
      setTableState(prev => {
        const newState: TableState = {
          ...(prev || {}),
          tableId,
          phase: newPhase,
          pot,
          currentBet,
          currentPlayerSeat,
          communityCards,
          dealerSeat,
          smallBlindSeat,
          bigBlindSeat,
          players,
          smallBlindAmount: tableData.small_blind,
          bigBlindAmount: tableData.big_blind,
          minRaise: currentBet > 0 ? currentBet : tableData.big_blind,
          actionTimer: 30,
          playersNeeded: playersCount < 2 ? 2 - playersCount : 0
        };
        
        // Fast deep compare - avoid JSON.stringify which causes GC pressure
        if (prev) {
          // Compare primitives first (fastest)
          if (prev.phase !== newState.phase) return newState;
          if (prev.pot !== newState.pot) return newState;
          if (prev.currentBet !== newState.currentBet) return newState;
          if (prev.currentPlayerSeat !== newState.currentPlayerSeat) return newState;
          if (prev.dealerSeat !== newState.dealerSeat) return newState;
          if (prev.players.length !== newState.players.length) return newState;
          
          // Compare community cards
          if (prev.communityCards.length !== newState.communityCards.length) return newState;
          for (let i = 0; i < prev.communityCards.length; i++) {
            if (prev.communityCards[i] !== newState.communityCards[i]) return newState;
          }
          
          // Compare players (key fields only)
          for (let i = 0; i < prev.players.length; i++) {
            const prevP = prev.players[i];
            const newP = newState.players[i];
            if (!prevP || !newP) return newState;
            if (prevP.playerId !== newP.playerId) return newState;
            if (prevP.stack !== newP.stack) return newState;
            if (prevP.betAmount !== newP.betAmount) return newState;
            if (prevP.isFolded !== newP.isFolded) return newState;
            if (prevP.isAllIn !== newP.isAllIn) return newState;
          }
          
          // No meaningful changes detected - keep previous state to prevent re-render
          return prev;
        }
        
        return newState;
      });

      console.log('📊 Loaded', players.length, 'players from DB for table', tableId, 
        'phase:', newPhase, 'currentPlayerSeat:', currentPlayerSeat, 'mySeat:', mySeat,
        'current_hand_id:', tableData.current_hand_id);

      // AUTO-START LOGIC: If phase is 'waiting' and we have 2+ active players, start IMMEDIATELY
      if (newPhase === 'waiting' && playersCount >= 2 && !tableData.current_hand_id) {
        console.log('🎮 AUTO-START: Starting hand immediately', { 
          phase: newPhase, 
          players: playersCount, 
          hasHand: !!tableData.current_hand_id,
          alreadyAttempted: autoStartAttemptedRef.current
        });
        
        // Clear any existing timeouts/intervals
        if (autoStartTimeoutRef.current) {
          clearTimeout(autoStartTimeoutRef.current);
        }
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        
        // Start immediately - no countdown delay
        autoStartViaEngine();
      } else {
        // Clear countdown if conditions not met
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        console.log('⏸️ Auto-start conditions NOT met:', { 
          phase: newPhase, 
          players: playersCount, 
          hasHand: !!tableData.current_hand_id 
        });
      }
    } catch (err) {
      console.error('Error in loadPlayersFromDB:', err);
    }
  }, [tableId, playerId, autoStartViaEngine]);

  // Store loadPlayersFromDB in ref for use in autoStartViaEngine
  loadPlayersFromDBRef.current = loadPlayersFromDB;

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

  // Debounced load - prevents rapid reloads (3000ms for maximum stability like PPPoker)
  const debouncedLoadPlayers = useCallback(() => {
    const now = Date.now();
    const MIN_INTERVAL = 3000; // 3 seconds - PPPoker-level stability
    
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    
    if (timeSinceLastLoad < MIN_INTERVAL) {
      // Schedule load after remaining time - but only if no pending load
      const delay = MIN_INTERVAL - timeSinceLastLoad;
      debounceTimerRef.current = setTimeout(() => {
        lastLoadTimeRef.current = Date.now();
        loadPlayersFromDB();
      }, delay);
      return;
    }
    
    lastLoadTimeRef.current = now;
    loadPlayersFromDB();
  }, [loadPlayersFromDB]);

  // Setup Supabase Realtime for player sync
  const setupRealtimeSync = useCallback(() => {
    if (!tableId || channelRef.current) return;

    console.log('📡 Setting up Realtime sync for table:', tableId);

    const channel = supabase
      .channel(`poker-table-${tableId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poker_table_players',
          filter: `table_id=eq.${tableId}`
        },
        (payload) => {
          console.log('🔄 Player change:', payload.eventType);
          debouncedLoadPlayers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poker_tables',
          filter: `id=eq.${tableId}`
        },
        (payload) => {
          console.log('🎲 Table change:', payload.eventType);
          debouncedLoadPlayers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poker_hands',
          filter: `table_id=eq.${tableId}`
        },
        (payload) => {
          console.log('🎴 Hand change:', payload.eventType);
          debouncedLoadPlayers();
        }
      )
      .on('broadcast', { event: 'game_action' }, (payload) => {
        console.log('📢 Broadcast received:', payload);
        handleMessage(payload.payload);
      })
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          loadPlayersFromDB();
        }
      });

    channelRef.current = channel;
  }, [tableId, loadPlayersFromDB, debouncedLoadPlayers]);

  // Connect to table
  const connect = useCallback(() => {
    if (!tableId || !playerId) return;
    if (isConnected || isConnecting) return;

    setIsConnecting(true);
    setError(null);
    
    // Reset auto-start flag on new connection
    autoStartAttemptedRef.current = false;

    // Setup Realtime sync first
    setupRealtimeSync();

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
          console.log('📨 Received:', data.type);
          handleMessage(data);
          
          // Only reload for critical events, with debounce
          if (['joined_table', 'hand_started', 'showdown'].includes(data.type)) {
            debouncedLoadPlayers();
          }
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
  }, [tableId, playerId, buyIn, seatNumber, getWsUrl, sendMessage, setupRealtimeSync, debouncedLoadPlayers, isConnected, isConnecting]);

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
        // Update with showdown results - normalize playerId
        const normalizedWinners = (data.winners || []).map((w: any) => ({
          playerId: w.playerId || w.oderId,
          name: w.name,
          seatNumber: w.seatNumber,
          amount: w.amount,
          handRank: w.handRank,
          cards: w.cards
        }));
        const result: ShowdownResult = {
          winners: normalizedWinners,
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
          id: data.id,
          playerId: data.playerId,
          playerName: data.playerName,
          text: data.text || data.message,
          message: data.message || data.text,
          timestamp: data.timestamp,
          type: data.type || 'chat',
          isModerated: data.isModerated
        }]);
        break;

      case 'chat_history':
        setChatMessages(data.messages || []);
        break;

      case 'bomb_pot_announced':
      case 'bomb_pot_started':
        console.log(`💣 Bomb Pot: ${data.multiplier}x BB, doubleBoard: ${data.doubleBoard}`);
        break;

      case 'player_muted':
      case 'player_unmuted':
        console.log(`🔇 Player ${data.playerId} ${data.type === 'player_muted' ? 'muted' : 'unmuted'}`);
        break;

      case 'timeout_fold':
        // Player timed out and auto-folded
        console.log(`⏰ Player at seat ${data.seatNumber} timed out and folded`);
        break;

      case 'run_it_twice':
        // All-in equity run - board dealt twice
        console.log(`🎲 Run It Twice:`, data.runs);
        const ritWinners = (data.combinedWinners || []).map((w: any) => ({
          playerId: w.playerId || w.oderId,
          name: w.name,
          seatNumber: w.seatNumber,
          amount: w.amount,
          handRank: w.handRank,
          cards: w.cards
        }));
        setShowdownResult({
          winners: ritWinners,
          pot: tableState?.pot || 0
        });
        break;

      // ===== AUTO-START EVENTS (PPPoker Style) =====
      case 'game_starting':
        console.log(`🚀 Game starting in ${data.countdown}s with ${data.playerCount} players`);
        setTableState(prev => prev ? {
          ...prev,
          phase: 'waiting',
          gameStartingCountdown: data.countdown
        } : null);
        break;

      case 'next_hand_countdown':
        console.log(`⏱️ Next hand in ${data.countdown}s`);
        setTableState(prev => prev ? {
          ...prev,
          nextHandCountdown: data.countdown
        } : null);
        break;

      case 'waiting_for_players':
        console.log(`⏸️ Waiting for ${data.playersNeeded} more player(s)`);
        setTableState(prev => prev ? {
          ...prev,
          phase: 'waiting',
          playersNeeded: data.playersNeeded
        } : null);
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
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (autoStartTimeoutRef.current) {
      clearTimeout(autoStartTimeoutRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setIsConnected(false);
    setTableState(null);
    setMySeat(null);
    setMyCards([]);
  }, [tableId, playerId, sendMessage]);

  // Player actions - send directly to poker-game-engine for reliability
  const executeAction = useCallback(async (action: string, amount?: number) => {
    if (!tableId || !playerId) {
      console.warn('⚠️ Cannot execute action: missing tableId or playerId');
      return;
    }

    console.log(`🎯 Executing action: ${action}, amount: ${amount}`);
    
    try {
      const { data, error } = await supabase.functions.invoke('poker-game-engine', {
        body: {
          action,
          tableId,
          playerId,
          amount
        }
      });

      console.log(`📨 Action result:`, { data, error });

      if (error) {
        console.error('❌ Action error:', error);
        return;
      }

      if (data?.success) {
        console.log('✅ Action successful');
        // Reload state immediately
        loadPlayersFromDBRef.current?.();
      } else {
        console.log('⚠️ Action failed:', data?.error);
      }
    } catch (err) {
      console.error('❌ Action exception:', err);
    }
  }, [tableId, playerId]);

  const fold = useCallback(() => executeAction('fold'), [executeAction]);
  const check = useCallback(() => executeAction('check'), [executeAction]);
  const call = useCallback(() => executeAction('call'), [executeAction]);
  const raise = useCallback((amount: number) => executeAction('raise', amount), [executeAction]);
  const allIn = useCallback(() => executeAction('all_in'), [executeAction]);
  
  // Check if opponent has timed out - any client can call this
  const checkTimeout = useCallback(async () => {
    if (!tableId || !playerId) return;
    
    console.log('⏰ Checking timeout for current player...');
    try {
      const { data, error } = await supabase.functions.invoke('poker-game-engine', {
        body: {
          action: 'check_timeout',
          tableId,
          playerId
        }
      });
      console.log('📨 Timeout check result:', { data, error });
      if (data?.success) {
        console.log('✅ Timeout fold executed, reloading...');
        loadPlayersFromDBRef.current?.();
      }
    } catch (err) {
      console.error('❌ Timeout check error:', err);
    }
  }, [tableId, playerId]);
  
  const startHand = useCallback(async () => {
    console.log('🚀 Starting hand via engine...');
    try {
      const { data, error } = await supabase.functions.invoke('poker-game-engine', {
        body: {
          action: 'start_hand',
          tableId,
          playerId
        }
      });
      console.log('📨 Start hand result:', { data, error });
      if (data?.success) {
        setTimeout(() => {
          loadPlayersFromDBRef.current?.();
        }, 500);
      }
    } catch (err) {
      console.error('❌ Start hand error:', err);
    }
  }, [tableId, playerId]);

  const sendChat = useCallback((text: string) => {
    sendMessage({
      type: 'chat',
      tableId,
      playerId,
      data: { text }
    });
  }, [tableId, playerId, sendMessage]);

  // Post straddle for next hand
  const postStraddle = useCallback((amount?: number) => {
    sendMessage({
      type: 'post_straddle',
      tableId,
      playerId,
      data: { amount: amount || (tableState?.bigBlindAmount || 100) * 2 }
    });
  }, [tableId, playerId, sendMessage, tableState?.bigBlindAmount]);

  // Configure table settings
  const configureTable = useCallback((config: {
    smallBlindAmount?: number;
    bigBlindAmount?: number;
    anteAmount?: number;
    straddleEnabled?: boolean;
    mississippiStraddleEnabled?: boolean;
    maxStraddleCount?: number;
    buttonAnteEnabled?: boolean;
    buttonAnteAmount?: number;
    bigBlindAnteEnabled?: boolean;
    bigBlindAnteAmount?: number;
    actionTimer?: number;
    runItTwiceEnabled?: boolean;
    rakePercent?: number;
    rakeCap?: number;
  }) => {
    sendMessage({
      type: 'configure_table',
      tableId,
      playerId,
      data: config
    });
  }, [tableId, playerId, sendMessage]);

  // Use time bank
  const useTimeBank = useCallback((seconds: number = 30) => {
    sendMessage({
      type: 'use_time_bank',
      tableId,
      playerId,
      data: { seconds }
    });
  }, [tableId, playerId, sendMessage]);

  // Send ping (for connection health)
  const sendPing = useCallback(() => {
    sendMessage({
      type: 'ping',
      tableId,
      playerId
    });
  }, [tableId, playerId, sendMessage]);

  // Reconnect after disconnect
  const reconnect = useCallback(() => {
    sendMessage({
      type: 'reconnect',
      tableId,
      playerId
    });
  }, [tableId, playerId, sendMessage]);

  // Trigger bomb pot for next hand
  const triggerBombPot = useCallback(() => {
    sendMessage({
      type: 'bomb_pot',
      tableId,
      playerId
    });
  }, [tableId, playerId, sendMessage]);

  // Mute/unmute player in chat
  const mutePlayer = useCallback((targetPlayerId: string, mute: boolean) => {
    sendMessage({
      type: 'mute_player',
      tableId,
      playerId,
      data: { targetPlayerId, mute }
    });
  }, [tableId, playerId, sendMessage]);

  // Get chat history
  const getChatHistory = useCallback(() => {
    sendMessage({
      type: 'get_chat_history',
      tableId,
      playerId
    });
  }, [tableId, playerId, sendMessage]);

  // Get current player info
  const myPlayer = tableState?.players.find(p => p.playerId === playerId);
  // Use myPlayer.seatNumber for isMyTurn check - more reliable than mySeat state
  const isMyTurn = tableState?.phase !== 'waiting' && 
                   tableState?.phase !== 'showdown' && 
                   tableState?.currentPlayerSeat !== null &&
                   tableState?.currentPlayerSeat === (myPlayer?.seatNumber || mySeat);
  const canCheck = tableState?.currentBet === (myPlayer?.betAmount || 0);
  const callAmount = (tableState?.currentBet || 0) - (myPlayer?.betAmount || 0);
  const minRaiseAmount = tableState?.minRaise || tableState?.bigBlindAmount || 100;
  const minRaiseTotal = (tableState?.currentBet || 0) + minRaiseAmount;

  // Straddle info
  const canPostStraddle = tableState?.phase === 'waiting' && tableState?.straddleEnabled;
  const straddleAmount = (tableState?.bigBlindAmount || 100) * 2;
  const hasPostedStraddle = tableState?.pendingStraddles?.some(s => {
    const myPlayerObj = tableState?.players.find(p => p.playerId === playerId);
    return myPlayerObj && s.seat === myPlayerObj.seatNumber;
  });

  // Time bank info
  const timeBankRemaining = myPlayer?.timeBankRemaining || 0;
  const isDisconnected = myPlayer?.isDisconnected || false;

  // Auto-connect when options are provided
  useEffect(() => {
    if (tableId && playerId && !isConnected && !isConnecting) {
      connect();
    }
  }, [tableId, playerId, isConnected, isConnecting, connect]);

  // Auto-ping for connection health
  useEffect(() => {
    if (!isConnected) return;
    
    const pingInterval = setInterval(() => {
      sendPing();
    }, 5000); // Ping every 5 seconds
    
    return () => clearInterval(pingInterval);
  }, [isConnected, sendPing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (autoStartTimeoutRef.current) {
        clearTimeout(autoStartTimeoutRef.current);
      }
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
    
    // Reconnect state (from reconnect manager, will be added later if needed)
    connectionStatus: isConnected ? 'connected' as ConnectionStatus : 
                      isConnecting ? 'connecting' as ConnectionStatus : 
                      error ? 'failed' as ConnectionStatus : 'disconnected' as ConnectionStatus,
    retryCount: 0,
    nextRetryIn: null as number | null,
    reconnectNow: connect,
    cancelReconnect: disconnect,
    
    // Table state
    tableState,
    myCards,
    mySeat,
    myPlayer,
    isMyTurn,
    canCheck,
    callAmount,
    minRaiseAmount,
    minRaiseTotal,
    chatMessages,
    lastAction,
    showdownResult,
    handHistory,
    
    // Straddle info
    canPostStraddle,
    straddleAmount,
    hasPostedStraddle,
    
    // Time bank & disconnect info
    timeBankRemaining,
    isDisconnected,
    
    // Bomb pot info
    isBombPot: tableState?.bombPotCurrentHand || false,
    bombPotEnabled: tableState?.bombPotEnabled || false,
    bombPotMultiplier: tableState?.bombPotMultiplier || 2,
    
    // Chat info
    chatEnabled: tableState?.chatEnabled !== false,
    chatSlowMode: tableState?.chatSlowMode || false,
    chatSlowModeInterval: tableState?.chatSlowModeInterval || 5,
    
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
    clearShowdown,
    postStraddle,
    configureTable,
    useTimeBank,
    sendPing,
    reconnect,
    triggerBombPot,
    mutePlayer,
    getChatHistory,
    checkTimeout,
    refreshPlayers: loadPlayersFromDB
  };
}
