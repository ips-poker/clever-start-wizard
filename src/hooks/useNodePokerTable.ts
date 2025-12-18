/**
 * Hook for connecting to Node.js Poker WebSocket Server
 * Production-ready with reconnection, ping/pong, and state management
 * Connects to external poker.syndicate-poker.ru server
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { evaluateShowdown } from '@/utils/showdownEvaluator';

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
  // Showdown fields
  handName?: string;
  bestCards?: string[];
  isWinner?: boolean;
  winningCardIndices?: number[];      // Indices of hole cards used in winning combo
  communityCardIndices?: number[];    // Indices of community cards used in winning combo
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
    seatNumber?: number;
    amount: number;
    handName?: string;
    handRank?: string;
    cards?: string[];
    bestCards?: string[];
  }>;
  pot: number;
  // NEW: All players' cards at showdown
  showdownPlayers?: Array<{
    playerId: string;
    name: string;
    seatNumber: number;
    holeCards: string[];
    isFolded: boolean;
    handName?: string;
    bestCards?: string[];
  }>;
  communityCards?: string[];
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

  // Showdown token to ensure timers don't clear a newer hand/showdown
  const showdownTokenRef = useRef(0);
  // Timestamp when showdown started - used to ensure 4 sec minimum display
  const showdownStartTimeRef = useRef<number>(0);

  // Keep latest snapshots for stable WebSocket handlers (avoid stale closures)
  const tableStateRef = useRef<TableState | null>(null);
  const myCardsRef = useRef<string[]>([]);
  const mySeatRef = useRef<number | null>(null);

  useEffect(() => {
    tableStateRef.current = tableState;
  }, [tableState]);

  useEffect(() => {
    myCardsRef.current = myCards;
  }, [myCards]);

  useEffect(() => {
    mySeatRef.current = mySeat;
  }, [mySeat]);

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
  // Server sends flat structure with phase, pot, currentPlayerSeat, myCards at root level
  const transformServerState = useCallback((serverState: unknown, tblId: string): TableState => {
    const state = serverState as Record<string, unknown>;
    
    // Handle nested config if present (old server format)
    const config = state.config as Record<string, unknown> | undefined;
    
    // Detect which format we're receiving
    const isOldFormat = !!config;
    
    // Debug log the full state structure
    log('🔄 Transforming state:', {
      format: isOldFormat ? 'OLD (nested config)' : 'NEW (flat)',
      keys: Object.keys(state),
      phase: isOldFormat ? 'N/A (old format)' : state.phase,
      currentPlayerSeat: isOldFormat ? 'N/A (old format)' : state.currentPlayerSeat,
      myCards: state.myCards,
      mySeat: state.mySeat,
      isMyTurn: state.isMyTurn,
      hasPlayers: !!state.players
    });
    
    // Get players from root
    const playersRaw = (state.players || []) as Record<string, unknown>[];
    
    const mappedPlayers: PokerPlayer[] = playersRaw.map((p) => {
      const betAmount = (p.betAmount || p.currentBet || p.bet_amount || 0) as number;
      
      // Debug: log player bets
      if (betAmount > 0) {
        log('💰 Player bet:', { 
          name: p.name, 
          betAmount, 
          stack: p.stack,
          isFolded: p.isFolded
        });
      }
      
      return {
        playerId: (p.playerId || p.id) as string,
        name: (p.name || 'Player') as string,
        avatarUrl: (p.avatarUrl || p.avatar) as string | undefined,
        seatNumber: (p.seatNumber ?? p.seat_number ?? 0) as number,
        stack: (p.stack || 0) as number,
        betAmount,
        totalBetInHand: (p.totalBetInHand || betAmount || 0) as number,
        holeCards: (p.holeCards || p.cards || []) as string[],
        isFolded: (p.isFolded || p.is_folded || false) as boolean,
        isAllIn: (p.isAllIn || p.is_all_in || false) as boolean,
        isActive: (p.isActive !== false && p.status !== 'disconnected' && p.status !== 'folded') as boolean,
        isDisconnected: (p.status === 'disconnected') as boolean,
        timeBankRemaining: (p.timeBank || 60) as number,
        // Showdown fields
        handName: (p.handName || p.handRank || p.hand_rank) as string | undefined,
        isWinner: Boolean(p.isWinner || (p.wonAmount as number) > 0 || (p.won_amount as number) > 0),
        bestCards: (p.bestCards || []) as string[]
      };
    });

    // Server sends phase at root level after rebuilding
    // Also check config for old format fallback
    const phase = (state.phase || config?.phase || 'waiting') as TableState['phase'];
    const pot = (state.pot ?? 0) as number;
    const currentBet = (state.currentBet ?? 0) as number;
    const currentPlayerSeat = (state.currentPlayerSeat ?? null) as number | null;
    const communityCards = (state.communityCards || []) as string[];
    const dealerSeat = (state.dealerSeat ?? 0) as number;
    const smallBlindSeat = (state.smallBlindSeat ?? 1) as number;
    const bigBlindSeat = (state.bigBlindSeat ?? 2) as number;
    
    // Blinds from root state or nested config
    const smallBlind = (state.smallBlind || config?.smallBlind || 10) as number;
    const bigBlind = (state.bigBlind || config?.bigBlind || 20) as number;
    const ante = (state.ante || config?.ante || 0) as number;
    const actionTimer = (state.actionTimer || config?.actionTimeSeconds || 30) as number;

    return {
      tableId: tblId,
      phase,
      pot,
      currentBet,
      currentPlayerSeat,
      communityCards,
      dealerSeat,
      smallBlindSeat,
      bigBlindSeat,
      players: mappedPlayers,
      minRaise: (state.minRaise || bigBlind * 2) as number,
      smallBlindAmount: smallBlind,
      bigBlindAmount: bigBlind,
      anteAmount: ante,
      actionTimer,
      timeRemaining: state.timeRemaining as number | null | undefined,
      playersNeeded: (state.playersNeeded || 0) as number
    };
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as Record<string, unknown>;
      log('📥 Recv:', data.type, data);
      
      // Enhanced logging for debugging showdown
      if (data.type?.toString().includes('hand') || data.type?.toString().includes('showdown') || data.type?.toString().includes('winner')) {
        console.log('[SHOWDOWN DEBUG] Event received:', data.type, JSON.stringify(data, null, 2));
      }

      switch (data.type) {
        case 'connected':
          log('✅ Server connected, timestamp:', data.timestamp);
          // Server may auto-subscribe based on URL params
          break;

        case 'subscribed':
        case 'state':
        case 'table_state':
          if (data.state && tableId) {
            setTableState((prev) => {
              const newState = transformServerState(data.state, tableId);

              // If we're currently in showdown, keep showdown annotations stable even if
              // server keeps sending "state" snapshots without winner indices.
              // IMPORTANT: Keep winning data for at least 4 seconds from showdown start
              const showdownElapsed = Date.now() - showdownStartTimeRef.current;
              const isWithinShowdownWindow = showdownElapsed < 4000;
              
              if (prev?.phase === 'showdown' && isWithinShowdownWindow) {
                const prevById = new Map(prev.players.map((p) => [p.playerId, p] as const));
                newState.phase = 'showdown';
                newState.players = newState.players.map((p) => {
                  const old = prevById.get(p.playerId);
                  if (!old) return p;
                  return {
                    ...p,
                    // Preserve showdown data from prev state (don't let server overwrite)
                    holeCards: (old.holeCards?.length ?? 0) >= 2 ? old.holeCards : p.holeCards,
                    handName: old.handName ?? p.handName,
                    isWinner: old.isWinner ?? p.isWinner ?? false,
                    winningCardIndices: (old.winningCardIndices && old.winningCardIndices.length > 0)
                      ? old.winningCardIndices
                      : p.winningCardIndices,
                    communityCardIndices: (old.communityCardIndices && old.communityCardIndices.length > 0)
                      ? old.communityCardIndices
                      : p.communityCardIndices,
                  };
                });
              }

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
          // Clear showdown when new hand starts (and invalidate pending showdown timers)
          log('🎴 New hand started - clearing showdown');
          showdownTokenRef.current += 1;
          showdownStartTimeRef.current = 0;  // Reset showdown timestamp
          setShowdownResult(null);
          // Fall through to process state
          // eslint-disable-next-line no-fallthrough
        case 'phase_change':
        case 'phaseChange':
          // These events include updated tableState - process it
          log(`📡 ${data.type} event received:`, {
            hasState: !!data.state,
            stateKeys: data.state ? Object.keys(data.state as object) : []
          });
          
          if (data.state && tableId) {
            const stateData = data.state as Record<string, unknown>;
            
            // Log all state keys and values for debugging
            log(`📊 Full state dump:`, JSON.stringify(stateData).substring(0, 800));
            
            // Log specific fields
            log(`📊 State fields:`, {
              phase: stateData.phase,
              currentPlayerSeat: stateData.currentPlayerSeat,
              myCards: stateData.myCards,
              mySeat: stateData.mySeat,
              isMyTurn: stateData.isMyTurn,
              pot: stateData.pot,
              hasConfig: !!stateData.config
            });
            
            setTableState(transformServerState(data.state, tableId));
            
            // Extract myCards from state - server sends at root level
            if (stateData.myCards) {
              const cards = stateData.myCards as string[];
              log('🃏 Setting my cards from myCards:', cards);
              setMyCards(cards);
            } else {
              // Fallback: try to find my cards in players array
              const playersData = stateData.players as Array<Record<string, unknown>> | undefined;
              if (playersData && playerId) {
                const myPlayer = playersData.find(p => 
                  (p.playerId === playerId || p.id === playerId) && 
                  Array.isArray(p.holeCards) && 
                  (p.holeCards as string[]).length > 0
                );
                if (myPlayer) {
                  const cards = myPlayer.holeCards as string[];
                  log('🃏 Setting my cards from player holeCards:', cards);
                  setMyCards(cards);
                }
              }
            }
            
            if (stateData.mySeat !== undefined && stateData.mySeat !== null) {
              setMySeat(stateData.mySeat as number);
            }
          }
          
          if (data.type === 'hand_started' || data.type === 'handStarted') {
            log('🎴 Hand started event:', JSON.stringify(data).substring(0, 500));
          }
          break;

        case 'cards_dealt':
        case 'cardsDealt':
        case 'deal':
          // Handle cards being dealt - extract my cards
          log('🃏 Cards dealt event received:', data);
          {
            const dealData = (data.data || data) as Record<string, unknown>;
            
            // Cards might be at root level or in cards/holeCards field
            const cards = dealData.cards || dealData.holeCards || dealData.myCards;
            if (Array.isArray(cards) && cards.length > 0) {
              log('🃏 Setting my cards from deal event:', cards);
              setMyCards(cards as string[]);
            }
            
            // Also check for seat number
            if (dealData.seatNumber !== undefined) {
              setMySeat(dealData.seatNumber as number);
            }
            
            // Update state if included
            if (data.state && tableId) {
              const stateData = data.state as Record<string, unknown>;
              setTableState(transformServerState(data.state, tableId));
              
              if (stateData.myCards) {
                setMyCards(stateData.myCards as string[]);
              }
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

        case 'state_update':
          // State update after action - contains latest bets and player states
          log('📊 State update received:', data);
          {
            // The server broadcasts with full state attached
            const stateData = (data.state || data.data || data) as Record<string, unknown>;
            if (tableId && (stateData.players || stateData.phase)) {
              const incomingState = transformServerState(stateData, tableId);
              const keepShowdown = tableStateRef.current?.phase === 'showdown';

              setTableState((prev) => {
                if (!prev) return keepShowdown ? { ...incomingState, phase: 'showdown' } : incomingState;
                if (!keepShowdown) return incomingState;

                const prevById = new Map(prev.players.map((p) => [p.playerId, p] as const));

                return {
                  ...incomingState,
                  phase: 'showdown',
                  players: incomingState.players.map((p) => {
                    const old = prevById.get(p.playerId);
                    if (!old) return p;

                    const oldHasCards = Array.isArray(old.holeCards) && old.holeCards.length >= 2;
                    const newHasCards = Array.isArray(p.holeCards) && p.holeCards.length >= 2;

                    return {
                      ...p,
                      holeCards: !newHasCards && oldHasCards ? old.holeCards : p.holeCards,
                      handName: p.handName ?? old.handName,
                      bestCards: (p.bestCards && p.bestCards.length > 0) ? p.bestCards : old.bestCards,
                      isWinner: (p.isWinner ?? false) || (old.isWinner ?? false),
                      winningCardIndices:
                        (p.winningCardIndices && p.winningCardIndices.length > 0)
                          ? p.winningCardIndices
                          : old.winningCardIndices,
                      communityCardIndices:
                        (p.communityCardIndices && p.communityCardIndices.length > 0)
                          ? p.communityCardIndices
                          : old.communityCardIndices,
                    };
                  }),
                };
              });

              // Update my cards if present
              if (stateData.myCards) {
                setMyCards(stateData.myCards as string[]);
              }
            }
          }
          break;

        case 'showdown':
          setShowdownResult(data.result as ShowdownResult);
          break;

        case 'hand_complete':
        case 'handComplete':  // Server sends camelCase
        case 'hand_end':
        case 'handEnd': {
          log('🏆 Hand complete event:', data.type);
          log('🏆 RAW EVENT DATA:', JSON.stringify(data, null, 2));

          // Extract event data (support multiple server formats: camelCase + snake_case + nested result)
          const eventData = (data.data || data) as Record<string, unknown>;
          const nestedResult = (eventData.result || eventData.showdownResult || eventData.handResult) as Record<string, unknown> | undefined;
          const rootResult = ((data as any).result || (data as any).showdownResult || (data as any).handResult) as Record<string, unknown> | undefined;

          // Normalize card format: support both "Tc" and "10c" (server may send either)
          const normalizeCardString = (card: string): string => {
            const c = (card || '').trim();
            if (!c || c === '??' || c === 'XX' || c.includes('?')) return card;
            const m10 = /^10([cdhs])$/i.exec(c);
            if (m10) return `T${m10[1].toLowerCase()}`;
            const m = /^([2-9TJQKA])([cdhs])$/i.exec(c);
            if (m) return `${m[1].toUpperCase()}${m[2].toLowerCase()}`;
            return c;
          };

          const normalizeCardStrings = (raw: unknown): string[] | undefined => {
            if (!Array.isArray(raw)) return undefined;
            const out = (raw as unknown[])
              .filter((c): c is string => typeof c === 'string')
              .map(normalizeCardString);
            return out.length ? out : undefined;
          };

          const isRealCard = (c: unknown) =>
            typeof c === 'string' && /^(10|[2-9TJQKA])[cdhs]$/i.test(c.trim());

          const normalizeWinners = (raw: unknown): ShowdownResult['winners'] => {
            if (!raw) return [];
            const arr = Array.isArray(raw) ? raw : [raw];
            return arr
              .map((w: any) => {
                const playerId = (w?.playerId || w?.player_id || w?.id) as string | undefined;
                const amount = Number(w?.amount ?? w?.wonAmount ?? w?.won_amount ?? 0);
                if (!playerId) return null;
                return {
                  playerId,
                  name: (w?.name || w?.playerName || w?.player_name) as string | undefined,
                  seatNumber: (w?.seatNumber ?? w?.seat_number) as number | undefined,
                  amount,
                  handName: (w?.handName || w?.hand_name || w?.handRank || w?.hand_rank) as string | undefined,
                  handRank: (w?.handRank || w?.hand_rank) as string | undefined,
                  cards: normalizeCardStrings(w?.cards || w?.holeCards || w?.hole_cards),
                  bestCards: normalizeCardStrings(w?.bestCards || w?.best_cards),
                };
              })
              .filter(Boolean) as ShowdownResult['winners'];
          };

          const normalizeShowdownPlayers = (raw: unknown): ShowdownResult['showdownPlayers'] | undefined => {
            log('🃏 normalizeShowdownPlayers input:', raw);
            if (!raw) return undefined;
            const arr = Array.isArray(raw) ? raw : [raw];
            const normalized = arr
              .map((sp: any) => {
                const playerId = (sp?.playerId || sp?.player_id || sp?.id) as string | undefined;
                const seatNumber = Number(sp?.seatNumber ?? sp?.seat_number ?? 0);

                const holeCardsRaw = (sp?.holeCards || sp?.hole_cards || sp?.cards) as unknown;
                const holeCards = normalizeCardStrings(holeCardsRaw);
                log('🃏 Processing showdown player:', { playerId, seatNumber, holeCards });

                if (!playerId || !holeCards || holeCards.length < 2) return null;

                return {
                  playerId,
                  name: (sp?.name || sp?.playerName || sp?.player_name || 'Player') as string,
                  seatNumber,
                  holeCards,
                  isFolded: Boolean(sp?.isFolded || sp?.is_folded || false),
                  handName: (sp?.handName || sp?.hand_name || sp?.handRank || sp?.hand_rank) as string | undefined,
                  bestCards: normalizeCardStrings(sp?.bestCards || sp?.best_cards),
                };
              })
              .filter(Boolean) as ShowdownResult['showdownPlayers'];

            log('🃏 normalizeShowdownPlayers output:', normalized);
            return normalized.length ? normalized : undefined;
          };

          const winnersRaw = (eventData.winners || (eventData as any).winner || nestedResult?.winners || (nestedResult as any)?.winner || rootResult?.winners || (rootResult as any)?.winner || (data as any).winners || (data as any).winner) as unknown;
          const showdownPlayersRaw = (eventData.showdownPlayers || (eventData as any).showdown_players || nestedResult?.showdownPlayers || (nestedResult as any)?.showdown_players || rootResult?.showdownPlayers || (rootResult as any)?.showdown_players || (data as any).showdownPlayers || (data as any).showdown_players) as unknown;
          const communityCardsRaw = (eventData.communityCards || (eventData as any).community_cards || nestedResult?.communityCards || (nestedResult as any)?.community_cards || rootResult?.communityCards || (rootResult as any)?.community_cards || (data as any).communityCards || (data as any).community_cards) as unknown;
          const communityCards = normalizeCardStrings(communityCardsRaw);

          log('🃏 showdownPlayersRaw:', showdownPlayersRaw);

          const winners = normalizeWinners(winnersRaw);
          let showdownPlayers = normalizeShowdownPlayers(showdownPlayersRaw);

          const statePhase = (data.state as any)?.phase as string | undefined;
          const isShowdown = Boolean(
            eventData.showdown ??
              (eventData as any).is_showdown ??
              nestedResult?.showdown ??
              (nestedResult as any)?.is_showdown ??
              rootResult?.showdown ??
              (rootResult as any)?.is_showdown ??
              (eventData.phase === 'showdown' || statePhase === 'showdown')
          );

          const currentTableState = tableStateRef.current;
          const currentMyCards = myCardsRef.current.map(normalizeCardString);
          const currentMySeat = mySeatRef.current;

          // Fallback 1: if showdownPlayers is missing but state contains revealed holeCards, build showdownPlayers from it
          if (!showdownPlayers && data.state) {
            const stateData = data.state as Record<string, unknown>;
            const playersData = stateData.players as Array<Record<string, unknown>> | undefined;
            if (Array.isArray(playersData) && playersData.length > 0) {
              const revealed = playersData
                .map((p: any) => {
                  const holeCards = normalizeCardStrings(p.holeCards || p.hole_cards || p.cards);
                  const playerIdFromState = (p.playerId || p.player_id || p.id) as string | undefined;
                  const seatNum = Number(p.seatNumber ?? p.seat_number ?? 0);
                  const folded = Boolean(p.isFolded || p.is_folded || false);
                  const name = (p.name || 'Player') as string;

                  if (!playerIdFromState || !holeCards || holeCards.length < 2) return null;
                  return { playerId: playerIdFromState, name, seatNumber: seatNum, holeCards, isFolded: folded };
                })
                .filter(Boolean) as ShowdownResult['showdownPlayers'];

              if (revealed.length > 0) showdownPlayers = revealed;
            }
          }

          // Fallback 2: build showdownPlayers from current tableState + myCards (at least reveal hero)
          if (!showdownPlayers || showdownPlayers.length === 0) {
            const currentPlayers = currentTableState?.players || [];

            if (currentPlayers.length > 0) {
              log('🔄 Building showdownPlayers from current state (fallback)');
              showdownPlayers = currentPlayers
                .filter((p) => !p.isFolded)
                .map((p) => ({
                  playerId: p.playerId,
                  name: p.name || 'Player',
                  seatNumber: p.seatNumber,
                  holeCards:
                    p.seatNumber === currentMySeat && currentMyCards.length >= 2
                      ? currentMyCards
                      : (p.holeCards && p.holeCards.length >= 2 ? p.holeCards.map(normalizeCardString) : ['??', '??']),
                  isFolded: false,
                  handName: undefined,
                }));
              log('🔄 Fallback showdownPlayers:', showdownPlayers);
            }
          }

          const shouldForceShowdown =
            isShowdown ||
            winners.length > 0 ||
            Boolean(showdownPlayers?.some((sp) => sp.holeCards?.some(isRealCard)));

          log('🏆 Event data:', {
            isShowdown,
            shouldForceShowdown,
            winnersCount: winners.length,
            showdownPlayersCount: showdownPlayers?.length,
            communityCardsCount: communityCards?.length,
          });

          const potAmount = Number(eventData.pot ?? (data as any).pot ?? 0);

          if (shouldForceShowdown || winners.length > 0) {
            // Start / refresh showdown token and timestamp (used to keep highlight visible full 4 seconds)
            showdownTokenRef.current += 1;
            showdownStartTimeRef.current = Date.now();
            const thisShowdownToken = showdownTokenRef.current;

            setShowdownResult({
              winners: winners.map((w) => {
                const winnerPlayer = showdownPlayers?.find((sp) => sp.playerId === w.playerId);
                const computed = winnerPlayer && communityCards
                  ? evaluateShowdown(winnerPlayer.holeCards, communityCards, false)
                  : null;

                return {
                  ...w,
                  handName: w.handName || (w as any).handRank || computed?.handName,
                };
              }),
              pot: potAmount,
              showdownPlayers,
              communityCards,
            });

            // Keep showdown highlight visible for 4 seconds, then clear IF still the same showdown
            setTimeout(() => {
              if (showdownTokenRef.current !== thisShowdownToken) return;
              if (tableStateRef.current?.phase !== 'showdown') return;

              setShowdownResult(null);
              setTableState((prev) => {
                if (!prev) return prev;
                if (prev.phase !== 'showdown') return prev;

                return {
                  ...prev,
                  players: prev.players.map((p) => ({
                    ...p,
                    isWinner: false,
                    handName: undefined,
                    winningCardIndices: [],
                    communityCardIndices: [],
                    holeCards: [],
                  })),
                };
              });
            }, 4000);
          }

          if (shouldForceShowdown) {
            // Ensure the UI enters showdown mode so opponent cards can flip
            setTableState((prev) => (prev ? { ...prev, phase: 'showdown' } : prev));
          }

          // Update table state with showdown players' cards and winner info
          if (shouldForceShowdown && tableId) {
            setTableState((prev) => {
              if (!prev) return prev;

              const winnerIds = new Set(winners.map((w) => w.playerId));
              const commCards = (communityCards || prev.communityCards || []).map(normalizeCardString);
              const isOmaha = Boolean(showdownPlayers?.some((sp) => sp.holeCards?.length === 4));

              return {
                ...prev,
                phase: 'showdown',
                players: prev.players.map((p) => {
                  const winner = winners.find((w) => w.playerId === p.playerId);
                  const showdownPlayer = showdownPlayers?.find((sp) => sp.playerId === p.playerId);

                  if (showdownPlayer && !showdownPlayer.isFolded) {
                    let winningCardIndices: number[] = [];
                    let communityCardIndices: number[] = [];

                    if (showdownPlayer.holeCards && commCards.length >= 3) {
                      try {
                        const showdownEval = evaluateShowdown(showdownPlayer.holeCards, commCards, isOmaha);
                        log('🧮 evaluateShowdown inputs:', {
                          playerId: showdownPlayer.playerId,
                          holeCards: showdownPlayer.holeCards,
                          communityCards: commCards,
                          isOmaha,
                        });
                        log('🧮 evaluateShowdown result:', showdownEval);

                        if (showdownEval) {
                          winningCardIndices = showdownEval.winningCardIndices;
                          communityCardIndices = showdownEval.communityCardIndices;
                        }

                        return {
                          ...p,
                          holeCards: showdownPlayer.holeCards,
                          handName: showdownEval?.handName || showdownPlayer.handName || winner?.handName,
                          isWinner: winnerIds.has(p.playerId),
                          bestCards: showdownPlayer.bestCards || winner?.bestCards,
                          winningCardIndices,
                          communityCardIndices,
                        };
                      } catch (err) {
                        console.warn('Failed to evaluate showdown:', err);
                      }
                    }

                    return {
                      ...p,
                      holeCards: showdownPlayer.holeCards,
                      handName: showdownPlayer.handName || winner?.handName,
                      isWinner: winnerIds.has(p.playerId),
                      bestCards: showdownPlayer.bestCards || winner?.bestCards,
                      winningCardIndices,
                      communityCardIndices,
                    };
                  }

                  if (winnerIds.has(p.playerId)) {
                    return {
                      ...p,
                      isWinner: true,
                      handName: winner?.handName,
                    };
                  }

                  return p;
                }),
              };
            });
          }

          // Try to re-request state after showdown so server can send revealed holeCards (some servers only reveal after explicit state fetch)
          if (isShowdown && tableId && playerId) {
            setTimeout(() => {
              sendMessage({ type: 'get_state', tableId, playerId });
            }, 250);
          }

          // If server also provides a final state snapshot, apply it (but keep showdown phase when relevant)
          if (data.state && tableId) {
            const transformedState = transformServerState(data.state, tableId);

            if (shouldForceShowdown) {
              transformedState.phase = 'showdown';
              setTableState((prev) => {
                if (!prev) return transformedState;

                const prevById = new Map(prev.players.map((p) => [p.playerId, p] as const));
                return {
                  ...transformedState,
                  players: transformedState.players.map((p) => {
                    const old = prevById.get(p.playerId);
                    if (!old) return p;

                    const oldHasCards = Array.isArray(old.holeCards) && old.holeCards.length >= 2;
                    const newHasCards = Array.isArray(p.holeCards) && p.holeCards.length >= 2;

                    return {
                      ...p,
                      holeCards: !newHasCards && oldHasCards ? old.holeCards : p.holeCards,
                      handName: p.handName ?? old.handName,
                      bestCards: (p.bestCards && p.bestCards.length > 0) ? p.bestCards : old.bestCards,
                      isWinner: (p.isWinner ?? false) || (old.isWinner ?? false),
                      winningCardIndices:
                        (p.winningCardIndices && p.winningCardIndices.length > 0)
                          ? p.winningCardIndices
                          : old.winningCardIndices,
                      communityCardIndices:
                        (p.communityCardIndices && p.communityCardIndices.length > 0)
                          ? p.communityCardIndices
                          : old.communityCardIndices,
                    };
                  }),
                };
              });
            } else {
              setTableState(transformedState);
            }

            const stateData = data.state as Record<string, unknown>;
            if (stateData.myCards) setMyCards(stateData.myCards as string[]);
          }

          break;
        }

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

        case 'time_bank_used':
          // Time bank notification - update state if included
          log('⏱️ Time bank used:', data.data);
          if (data.state && tableId) {
            setTableState(transformServerState(data.state, tableId));
          }
          break;

        case 'timeout_warning':
          // Timeout warning - player is running low on time
          log('⚠️ Timeout warning');
          break;

        case 'timeout':
          // Player timed out - update state if included
          log('⏱️ Player timeout:', data.data);
          if (data.state && tableId) {
            setTableState(transformServerState(data.state, tableId));
            
            // Extract my cards from state if present
            const timeoutStateData = data.state as Record<string, unknown>;
            if (timeoutStateData.myCards) {
              setMyCards(timeoutStateData.myCards as string[]);
            }
          }
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

  // Join table - ensure buyIn is at least the table minimum
  const joinTable = useCallback((seat: number) => {
    if (!tableId || !playerId) return;

    // Get table min buy-in from state, default to 200 if not available
    // Server will also validate, but we should send a valid amount
    const tableBigBlind = tableState?.bigBlindAmount || 20;
    const estimatedMinBuyIn = tableBigBlind * 10; // Typical min is 10x BB
    const effectiveBuyIn = Math.max(buyIn, estimatedMinBuyIn, 200);
    
    log('🎰 Joining table with buyIn:', { original: buyIn, effective: effectiveBuyIn, tableBB: tableBigBlind });

    sendMessage({
      type: 'join_table',
      tableId,
      playerId,
      playerName,
      seatNumber: seat,
      buyIn: effectiveBuyIn
    });
  }, [tableId, playerId, playerName, buyIn, tableState?.bigBlindAmount, sendMessage]);

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
    console.log('[NodePoker] 💰 Bet action:', { tableId, playerId, amount });
    sendMessage({
      type: 'action',
      tableId,
      playerId,
      actionType: 'bet',
      amount
    });
  }, [tableId, playerId, sendMessage]);

  const raise = useCallback((totalAmount: number) => {
    if (!tableId || !playerId) return;
    
    const currentBetAmount = tableState?.currentBet || 0;
    const myCurrentBet = tableStateRef.current?.players.find(p => p.playerId === playerId)?.betAmount || 0;
    const actionType = currentBetAmount === 0 ? 'bet' : 'raise';
    
    // Server v3 may expect different amount formats:
    // Option 1: Total bet amount (what we want our total bet to be)
    // Option 2: Raise amount (how much to add on top of current bet)
    // 
    // From error "Min raise to 2" when trying to raise to 4 with currentBet=2,
    // it seems server expects the RAISE AMOUNT (delta), not total.
    // So if we want to raise from 2 to 4, we send amount=2 (the raise BY amount)
    
    const raiseByAmount = totalAmount - currentBetAmount;
    
    console.log('[NodePoker] 💰 Raise/Bet action:', { 
      tableId, playerId, 
      totalAmount,
      raiseByAmount,
      actionType, 
      currentBet: currentBetAmount,
      myCurrentBet 
    });
    
    sendMessage({
      type: 'action',
      tableId,
      playerId,
      actionType,
      amount: raiseByAmount  // Send raise-by amount (delta from current bet)
    });
  }, [tableId, playerId, tableState?.currentBet, sendMessage]);

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
    if (!tableState || mySeat === null) {
      log('⚠️ isMyTurn: false (no tableState or mySeat)', { tableState: !!tableState, mySeat });
      return false;
    }
    const result = tableState.currentPlayerSeat === mySeat;
    log('🎯 isMyTurn check:', { 
      result, 
      currentPlayerSeat: tableState.currentPlayerSeat, 
      mySeat,
      phase: tableState.phase
    });
    return result;
  }, [tableState, mySeat]);

  // Get my player data
  const myPlayer = useMemo(() => {
    if (!tableState || !playerId) return null;
    return tableState.players.find(p => p.playerId === playerId);
  }, [tableState, playerId]);

  // Calculate call amount - how much more we need to put in to match current bet
  const callAmount = useMemo(() => {
    if (!tableState || !myPlayer) return 0;
    const amountToCall = tableState.currentBet - myPlayer.betAmount;
    console.log('[NodePoker] callAmount calculation:', {
      currentBet: tableState.currentBet,
      myBetAmount: myPlayer.betAmount,
      callAmount: Math.max(0, amountToCall)
    });
    return Math.max(0, amountToCall);
  }, [tableState, myPlayer]);

  // Can check? Only if we've already matched the current bet
  const canCheck = useMemo(() => {
    const result = callAmount === 0;
    console.log('[NodePoker] canCheck:', result, 'callAmount:', callAmount);
    return result;
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
