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
  isSittingOut?: boolean;  // Player is sitting out (auto-fold mode)
  missedTurns?: number;    // Number of consecutive missed turns
  timeBankRemaining?: number;
  // PokerStars-style sit-out tracking
  sitOutOrbits?: number;   // Number of orbits spent sitting out
  missedBB?: boolean;      // Missed big blind while sitting out
  missedSB?: boolean;      // Missed small blind while sitting out
  waitForBB?: boolean;     // Waiting for BB position to rejoin
  autoPostBlinds?: boolean; // Auto-post blinds setting
  // Showdown fields
  handName?: string;
  bestCards?: string[];
  isWinner?: boolean;
  winningCardIndices?: number[];      // Indices of hole cards used in winning combo
  communityCardIndices?: number[];    // Indices of community cards used in winning combo
}

export interface TableState {
  tableId: string;
  handId?: string; // Unique hand identifier for animation keys
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
  timeBankSeconds?: number;            // Table setting for time bank total
  // POKERSTARS-STYLE: Server-authoritative timing
  // Server sends all timing info - client just displays
  timeRemaining?: number | null;       // Computed remaining seconds (for simple clients)
  actionStartTime?: number | null;     // When turn started (Unix ms) for precise sync
  isTimeBankPhase?: boolean;           // True when main timer expired, using time bank
  currentPlayerTimeBank?: number;      // Time bank available for current player
  // NEW: Phase-aware action timing (PokerStars-style)
  isRaisedPot?: boolean;               // Whether preflop has been raised
  actionTimeTotal?: number;            // Total action time for this turn (server-calculated)
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

// Debug logging: OFF by default even in dev (can cause UI jank).
// Enable manually: localStorage.setItem('POKER_DEBUG','1')
const DEBUG = localStorage.getItem('POKER_DEBUG') === '1';
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
  
  // Tournament rebuy state
  const [rebuyAvailable, setRebuyAvailable] = useState<{
    tournamentId: string;
    timeoutSeconds: number;
    timestamp: number;
  } | null>(null);

  // Tournament break state
  const [tournamentBreak, setTournamentBreak] = useState<{
    type: 'break_starting' | 'break_started' | 'break_ended';
    tournamentId: string;
    tournamentName: string;
    durationMinutes: number;
    durationSeconds: number;
    timestamp: number;
  } | null>(null);

  // Professional timing: bets being collected animation
  const [betsBeingCollected, setBetsBeingCollected] = useState<{
    bets: Array<{ playerId: string; seatNumber: number; amount: number }>;
    timestamp: number;
    isBombPot?: boolean;
  } | null>(null);

  // Professional timing: phase transition delays from server
  const [phaseTimings, setPhaseTimings] = useState<{
    dealDelay?: number;
    preDealDelay?: number;
    postDealDelay?: number;
    phase?: string;
  } | null>(null);

  // Professional: showdown reveal sequence
  const [showdownReveals, setShowdownReveals] = useState<Array<{
    playerId: string;
    playerName: string;
    seatNumber: number;
    holeCards: string[];
    handName?: string;
    bestCards?: string[];
    revealIndex: number;
    revealDelay: number;
    isWinner: boolean;
  }>>([]);

  // Professional: winner announcement with pot slide
  const [winnerAnnouncement, setWinnerAnnouncement] = useState<{
    winners: Array<{
      playerId: string;
      playerName: string;
      seatNumber: number;
      amount: number;
      handName?: string;
      newStack: number;
    }>;
    pot: number;
    isSplitPot: boolean;
    potSlideDelay: number;
    highlightDuration: number;
    celebrationDuration: number;
    timestamp: number;
  } | null>(null);
  
  // PRO FEATURES: Bomb Pot state (Industry-style: automatic, no voting)
  // Legacy bombPotProposal kept for backwards compatibility but not used
  const [bombPotProposal, setBombPotProposal] = useState<{
    multiplier: number;
    amount: number;
    timeoutSeconds: number;
    players: { playerId: string; name: string; seatNumber: number }[];
  } | null>(null);
  
  // NEW: Active bomb pot indicator (industry-style automatic trigger)
  const [bombPotActive, setBombPotActive] = useState<{
    multiplier: number;
    amount: number;
    isDoubleBoard: boolean;
    playerCount: number;
  } | null>(null);
  
  // PRO FEATURES: Run It Twice state
  const [runItTwiceProposal, setRunItTwiceProposal] = useState<{
    players: string[];
    timeoutSeconds: number;
  } | null>(null);
  
  // PRO FEATURES: Run It Twice boards (when approved)
  const [runItTwiceBoards, setRunItTwiceBoards] = useState<{
    currentCommunity: string[];
    board1: string[];
    board2: string[];
  } | null>(null);
  
  // PRO FEATURES: Straddle state
  const [straddlePosted, setStraddlePosted] = useState<{
    playerId: string;
    playerName: string;
    seatNumber: number;
    amount: number;
    isMississippi: boolean;
  } | null>(null);

  // POKERSTARS-STYLE: Burn card animation state
  const [activeBurnCard, setActiveBurnCard] = useState<{
    phase: 'flop' | 'turn' | 'river';
    timestamp: number;
  } | null>(null);

  // TOURNAMENT: Player moved to another table event
  const [playerMovedToTable, setPlayerMovedToTable] = useState<{
    newTableId: string;
    newSeat: number;
    tournamentId: string;
    timestamp: number;
  } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Prevent duplicate hand_started resets that cause repeated card re-animations
  const lastHandStartedAtRef = useRef<number>(0);
  const lastHandStartedHandIdRef = useRef<string | null>(null);

  // Showdown token to ensure timers don't clear a newer hand/showdown
  const showdownTokenRef = useRef(0);
  // Timestamp when showdown started - used to ensure minimum display
  const showdownStartTimeRef = useRef<number>(0);
  const SHOWDOWN_DISPLAY_MS = 2000; // PokerStars-fast: 2 seconds (was 3s)
  const FOLD_WIN_DISPLAY_MS = 400; // 0.4 second for fold wins (was 0.5s)

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
      // Bet amount: accept multiple server shapes
      const betAmount = Number(
        (p as any).betAmount ??
          (p as any).currentBet ??
          (p as any).bet_amount ??
          (p as any).roundBet ??
          (p as any).round_bet ??
          (p as any).streetBet ??
          (p as any).street_bet ??
          0
      );

      // Debug: log player bets
      if (betAmount > 0) {
        log('💰 Player bet:', {
          name: (p as any).name,
          betAmount,
          stack: (p as any).stack,
          isFolded: (p as any).isFolded
        });
      }

      return {
        playerId: ((p as any).playerId || (p as any).id) as string,
        name: ((p as any).name || 'Player') as string,
        avatarUrl: ((p as any).avatarUrl || (p as any).avatar) as string | undefined,
        seatNumber: ((p as any).seatNumber ?? (p as any).seat_number ?? 0) as number,
        stack: ((p as any).stack || 0) as number,
        betAmount,
        totalBetInHand: (((p as any).totalBetInHand ?? (p as any).total_bet_in_hand) ?? betAmount ?? 0) as number,
        holeCards: (((p as any).holeCards || (p as any).cards) ?? []) as string[],
        isFolded: (((p as any).isFolded ?? (p as any).is_folded) || false) as boolean,
        isAllIn: (((p as any).isAllIn ?? (p as any).is_all_in) || false) as boolean,
        isActive: ((p as any).isActive !== false && (p as any).status !== 'disconnected' && (p as any).status !== 'folded' && (p as any).status !== 'sitting_out') as boolean,
        isDisconnected: ((p as any).status === 'disconnected') as boolean,
        isSittingOut: (((p as any).isSittingOut ?? (p as any).is_sitting_out) || (p as any).status === 'sitting_out') as boolean,
        missedTurns: (((p as any).missedTurns ?? (p as any).missed_turns) || 0) as number,
        timeBankRemaining: (((p as any).timeBank ?? (p as any).time_bank_remaining) || 60) as number,
        // PokerStars-style sit-out tracking fields
        sitOutOrbits: (((p as any).sitOutOrbits ?? (p as any).sit_out_orbits) || 0) as number,
        missedBB: (((p as any).missedBB ?? (p as any).missed_bb) || false) as boolean,
        missedSB: (((p as any).missedSB ?? (p as any).missed_sb) || false) as boolean,
        waitForBB: (((p as any).waitForBB ?? (p as any).wait_for_bb) || false) as boolean,
        autoPostBlinds: (((p as any).autoPostBlinds ?? (p as any).auto_post_blinds) ?? true) as boolean,
        // Showdown fields
        handName: ((p as any).handName || (p as any).handRank || (p as any).hand_rank) as string | undefined,
        isWinner: Boolean((p as any).isWinner || ((p as any).wonAmount as number) > 0 || ((p as any).won_amount as number) > 0),
        bestCards: (((p as any).bestCards ?? (p as any).best_cards) || []) as string[]
      };
    });

    // Server sends phase at root level after rebuilding
    // Also check config for old format fallback
    const rawPhase = (state.phase || config?.phase || 'waiting') as string;
    const normalizedPhase = (() => {
      const p0 = String(rawPhase).toLowerCase().trim();
      const p = p0.replace(/[\s-]+/g, '_');

      if (p === 'no_hand' || p === 'nohand' || p === 'idle' || p === 'lobby') return 'waiting';
      if (p === 'pre_flop' || p === 'preflop') return 'preflop';

      if (p === 'waiting' || p === 'flop' || p === 'turn' || p === 'river' || p === 'showdown') {
        return p as TableState['phase'];
      }

      // Unknown phase from server -> treat as waiting (safe default)
      return 'waiting';
    })();

    const pot = (state.pot ?? 0) as number;
    const currentBet = (state.currentBet ?? 0) as number;
    const currentPlayerSeat = (state.currentPlayerSeat ?? (state as any).current_player_seat ?? null) as number | null;
    const communityCards = (state.communityCards || (state as any).community_cards || []) as string[];

    // Get handId from server state (may be handId, hand_id, currentHandId, etc.)
    const handId = (state.handId || (state as any).hand_id || (state as any).currentHandId || (state as any).current_hand_id) as string | undefined;

    // Seats: accept both camelCase and snake_case from server
    const dealerSeat = Number(state.dealerSeat ?? (state as any).dealer_seat ?? (state as any).buttonSeat ?? (state as any).button_seat ?? 0);

    const rawSmallBlindSeat = (state as any).smallBlindSeat ?? (state as any).small_blind_seat ?? (state as any).sbSeat ?? (state as any).sb_seat;
    const rawBigBlindSeat = (state as any).bigBlindSeat ?? (state as any).big_blind_seat ?? (state as any).bbSeat ?? (state as any).bb_seat;

    // Compute SB/BB seats when server doesn't provide them (common cause of missing SB/BB badges)
    const occupiedSeats = mappedPlayers
      .map((p) => p.seatNumber)
      .filter((n) => Number.isFinite(n)) as number[];

    const seatCount = Math.max(2, Math.min(9, Math.max(dealerSeat, ...occupiedSeats, 0) + 1));

    const occupied = new Set<number>(occupiedSeats);

    const findNextOccupied = (start: number): number | null => {
      for (let step = 1; step <= seatCount; step++) {
        const seat = (start + step) % seatCount;
        if (occupied.has(seat)) return seat;
      }
      return null;
    };

    let computedSBSeat: number | null = null;
    let computedBBSeat: number | null = null;

    if (occupiedSeats.length >= 2) {
      const nextAfterDealer = findNextOccupied(dealerSeat);
      // Heads-up: button is the small blind
      if (occupiedSeats.length === 2) {
        computedSBSeat = dealerSeat;
        computedBBSeat = nextAfterDealer;
      } else {
        computedSBSeat = nextAfterDealer;
        computedBBSeat = computedSBSeat !== null ? findNextOccupied(computedSBSeat) : null;
      }
    }

    const smallBlindSeat = Number(rawSmallBlindSeat ?? computedSBSeat ?? 1);
    const bigBlindSeat = Number(rawBigBlindSeat ?? computedBBSeat ?? 2);

    // Blinds from root state or nested config
    const smallBlind = Number(
      (state as any).smallBlind ?? (state as any).small_blind ?? (state as any).sb ?? config?.smallBlind ?? 10
    );
    const bigBlind = Number(
      (state as any).bigBlind ?? (state as any).big_blind ?? (state as any).bb ?? config?.bigBlind ?? 20
    );
    const ante = Number((state as any).ante ?? (state as any).ante_amount ?? config?.ante ?? 0);
    // POKERSTARS-STYLE: server provides the authoritative base action time (table setting)
    // Harden parsing for old/new server shapes (camelCase + snake_case config).
    const actionTimer = Number(
      (state as any).actionTimer ??
        (state as any).action_timer ??
        config?.actionTimeSeconds ??
        (config as any)?.action_time_seconds ??
        15
    );

    // --- Timing parsing hardening (handles old servers / different shapes) ---
    const toMsTimestamp = (v: unknown): number | null => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'number' && Number.isFinite(v)) {
        // If it's seconds (10 digits-ish), convert to ms.
        return v < 1e12 ? v * 1000 : v;
      }
      if (typeof v === 'string') {
        const trimmed = v.trim();
        // ISO timestamp
        const parsed = Date.parse(trimmed);
        if (!Number.isNaN(parsed)) return parsed;
        // numeric string
        const num = Number(trimmed);
        if (Number.isFinite(num)) return num < 1e12 ? num * 1000 : num;
      }
      return null;
    };

    const toNumberOrNull = (v: unknown): number | null => {
      if (v === null || v === undefined) return null;
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const toBooleanOrNull = (v: unknown): boolean | null => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'boolean') return v;
      if (typeof v === 'number') return v === 1;
      if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        if (s === 'true' || s === '1') return true;
        if (s === 'false' || s === '0') return false;
      }
      return null;
    };

    const parsedTimeBankSeconds =
      toNumberOrNull(
        (state as any).timeBankSeconds ??
          (state as any).time_bank_seconds ??
          config?.timeBankSeconds ??
          (config as any)?.time_bank_seconds
      ) ??
      30;

    const parsedTimeRemaining =
      toNumberOrNull((state as any).timeRemaining ?? (state as any).time_remaining ?? (state as any).remaining) ??
      null;

    const parsedActionStartTime =
      toMsTimestamp(
        (state as any).actionStartTime ??
          (state as any).action_start_time ??
          // Some servers send ISO `action_started_at`
          (state as any).action_started_at
      ) ??
      null;

    const parsedActionTimeTotal =
      toNumberOrNull((state as any).actionTimeTotal ?? (state as any).action_time_total) ??
      actionTimer;

    const parsedIsTimeBankPhase =
      toBooleanOrNull((state as any).isTimeBankPhase ?? (state as any).is_time_bank_phase) ?? false;

    // If server doesn't include blinds as per-player bets, show them client-side on preflop.
    // IMPORTANT: Some servers can briefly send phase='waiting' mid-preflop (e.g. right after first action)
    // while STILL including handId. Treat that as preflop-like so SB/BB bets remain visible and the
    // stability layer can detect "active" signals reliably (prevents one-time mini-card fan replay).
    const isPreflopLike =
      normalizedPhase === 'preflop' ||
      (normalizedPhase === 'waiting' && communityCards.length === 0 && (pot > 0 || currentBet > 0 || Boolean(handId)));

    const players = mappedPlayers.map((p) => {
      if (!isPreflopLike) return p;
      if (p.isFolded || p.isSittingOut || p.isDisconnected) return p;
      if (p.betAmount > 0) return p;

      if (p.seatNumber === smallBlindSeat && smallBlind > 0) {
        return {
          ...p,
          betAmount: smallBlind,
          totalBetInHand: Math.max(p.totalBetInHand ?? 0, smallBlind)
        };
      }
      if (p.seatNumber === bigBlindSeat && bigBlind > 0) {
        return {
          ...p,
          betAmount: bigBlind,
          totalBetInHand: Math.max(p.totalBetInHand ?? 0, bigBlind)
        };
      }
      return p;
    });

    return {
      tableId: tblId,
      handId,
      phase: normalizedPhase,
      pot,
      currentBet,
      currentPlayerSeat,
      communityCards,
      dealerSeat,
      smallBlindSeat,
      bigBlindSeat,
      players,
      minRaise: ((state as any).minRaise || bigBlind * 2) as number,
      smallBlindAmount: smallBlind,
      bigBlindAmount: bigBlind,
      anteAmount: ante,
      actionTimer,
      timeBankSeconds: parsedTimeBankSeconds,
      // POKERSTARS-STYLE: Server-authoritative timing
      timeRemaining: parsedTimeRemaining,
      actionStartTime: parsedActionStartTime,
      // Avoid Boolean("false") === true bugs if server sends strings.
      isTimeBankPhase: parsedIsTimeBankPhase,
      // Server-authoritative time bank for the CURRENT TURN player.
      // Accept a few common shapes to avoid silently falling back to 0.
      currentPlayerTimeBank: Number(
        (state as any).currentPlayerTimeBank ??
          (state as any).current_player_time_bank ??
          (state as any).current_player_timebank ??
          0
      ),
      // NEW: Phase-aware action timing
      isRaisedPot: Boolean((state as any).isRaisedPot),
      actionTimeTotal: parsedActionTimeTotal,
      playersNeeded: ((state as any).playersNeeded || 0) as number
    };
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as Record<string, unknown>;
      log('📥 Recv:', data.type, data);
      
      // DEBUG: Log ALL events for all-in debugging
      if (data.type?.toString().includes('all_in') || 
          data.type?.toString().includes('burn') || 
          data.type?.toString().includes('community')) {
        console.log('🔍 [ALL-IN DEBUG] Event received:', {
          type: data.type,
          hasData: !!data.data,
          dataKeys: data.data ? Object.keys(data.data as object) : [],
          fullData: JSON.stringify(data, null, 2)
        });
      }

      // Extra verbose showdown logs only when debug is enabled
      if (
        DEBUG &&
        (data.type?.toString().includes('hand') ||
          data.type?.toString().includes('showdown') ||
          data.type?.toString().includes('winner'))
      ) {
        console.log('[SHOWDOWN DEBUG] Event received:', data.type, JSON.stringify(data, null, 2));
      }

      // ------------------------------
      // Unified state application (PokerStars stability)
      // ------------------------------
      // IMPORTANT: Many event types carry `data.state`. If we apply those snapshots
      // without the stability layer, `phase` can briefly flicker to 'waiting' and
      // `handId` can be omitted for a tick, causing compact cards to unmount/remount
      // and replay their entrance animation.
      const applyIncomingState = (incomingState: unknown) => {
        if (!incomingState || !tableId) return;

        setTableState((prev) => {
          let newState = transformServerState(incomingState as any, tableId);

          // ------------------------------
          // SERVER-AUTH TIMER CONSISTENCY GUARD (STRICT)
          // ------------------------------
          // Goal:
          // Make the client strictly follow the server's turn boundary.
          // A NEW turn must come with a NEW actionStartTime.
          //
          // IMPORTANT:
          // Previously we used a 50ms tolerance. In practice, server timestamps can advance by only
          // a few milliseconds (or be very tight under load), and the tolerance caused us to ignore
          // legitimate turn changes, which then:
          // - kept isMyTurn=false (blocking actions), and
          // - caused timer inheritance/pulse artifacts.
          if (prev?.handId && newState.handId && prev.handId === newState.handId) {
            const prevAst = typeof prev.actionStartTime === 'number' && Number.isFinite(prev.actionStartTime)
              ? prev.actionStartTime
              : null;
            const nextAst = typeof newState.actionStartTime === 'number' && Number.isFinite(newState.actionStartTime)
              ? newState.actionStartTime
              : null;

            // Global monotonic guard (same hand): never allow a real backwards jump.
            if (prevAst !== null && nextAst !== null) {
              const BACKWARDS_TOL_MS = 50;
              if (nextAst < prevAst - BACKWARDS_TOL_MS) {
                log('[TimerGuard] Ignoring stale snapshot: actionStartTime went backwards', {
                  handId: prev.handId,
                  prevActionStartTime: prevAst,
                  nextActionStartTime: nextAst,
                  prevSeat: prev.currentPlayerSeat,
                  nextSeat: newState.currentPlayerSeat,
                  prevPhase: prev.phase,
                  nextPhase: newState.phase,
                });
                return prev;
              }
            }

            // Seat-change must be accompanied by a fresh actionStartTime.
            // If not, this snapshot is stale and must not be allowed to move the UI turn.
            const prevSeat = prev.currentPlayerSeat;
            const nextSeat = newState.currentPlayerSeat;
            const seatChanged =
              prevSeat !== null && prevSeat !== undefined &&
              nextSeat !== null && nextSeat !== undefined &&
              prevSeat !== nextSeat;

            if (seatChanged) {
              // STRICT: A seat change without an increased actionStartTime is considered a stale/out-of-order snapshot.
              // No tolerance here — if server advanced by 1ms, we must accept it.
              if (prevAst !== null && nextAst !== null && nextAst <= prevAst) {
                log('[TimerGuard] Ignoring stale seat-change snapshot (actionStartTime did not advance)', {
                  handId: prev.handId,
                  prevSeat,
                  nextSeat,
                  prevActionStartTime: prevAst,
                  nextActionStartTime: nextAst,
                  prevTimeRemaining: prev.timeRemaining,
                  nextTimeRemaining: newState.timeRemaining,
                  prevIsTimeBankPhase: prev.isTimeBankPhase,
                  nextIsTimeBankPhase: newState.isTimeBankPhase,
                });
                return prev;
              }
            }
          }

          // ------------------------------
          // POKERSTARS-STYLE STABILITY LAYER
          // ------------------------------
          if (prev) {
            const RECENT_HAND_START_GUARD_MS = 8000;
            const now = Date.now();
            const prevBoardCount = prev.communityCards?.length ?? 0;
            const prevHasAnyBets = (prev.players || []).some((p) => (p.betAmount ?? 0) > 0);
            const newHasAnyBets = (newState.players || []).some((p) => (p.betAmount ?? 0) > 0);
            const isWithinRecentHandStart = now - lastHandStartedAtRef.current < RECENT_HAND_START_GUARD_MS;
            // IMPORTANT:
            // We should not treat *any* non-waiting phase as an "active hand" signal.
            // Otherwise, a late "waiting" snapshot between hands can be ignored forever
            // (client gets stuck in preflop), which makes opponent mini-cards stay visible
            // and causes deal animations to behave incorrectly.
            //
            // Active hand signals must be *data-driven* (pot/board/turn), not phase-driven.
            const prevLooksActive =
              Boolean(prev.handId) &&
              (
                prev.phase === 'showdown' ||
                prevBoardCount > 0 ||
                (prev.pot ?? 0) > 0 ||
                (prev.currentBet ?? 0) > 0 ||
                (prev.currentPlayerSeat !== null && prev.currentPlayerSeat !== undefined) ||
                // Extra guard: during preflop, server snapshots can temporarily omit pot/currentBet/turn,
                // but SB/BB bets are still present. Treat that as active ONLY if we weren't already waiting.
                (prev.phase !== 'waiting' && prevHasAnyBets) ||
                // Temporal guard: right after hand start, some servers emit a "blank" tick (no bets/pot/turn)
                // during the first action after BB. Still treat it as active so we don't drop handId/phase.
                (prev.phase !== 'waiting' && prevBoardCount === 0 && isWithinRecentHandStart)
              );

            // 1) Preserve handId during an active hand if the snapshot omitted it.
            if (!newState.handId && prev.handId && prevLooksActive) {
              newState.handId = prev.handId;
            }

            // 2) If server claims 'waiting' but the snapshot likely represents an active hand,
            //    infer the phase from the board like PokerStars clients do.
            if (newState.phase === 'waiting') {
              const boardCount = newState.communityCards?.length ?? 0;
              const effectiveHandId = newState.handId || prev.handId;
              const sameHandAsPrev = Boolean(effectiveHandId && prev.handId && effectiveHandId === prev.handId);

              // Anti-flicker: some servers can emit a single-frame `waiting` on the SAME hand
              // right after the first action (especially after BB). That resets the UI and can
              // replay opponent mini-card fan animation. If this happens shortly after hand start,
              // keep the previous phase.
              const isRecentSameHandWaitingFlicker =
                sameHandAsPrev &&
                prev.phase !== 'waiting' &&
                now - lastHandStartedAtRef.current < RECENT_HAND_START_GUARD_MS &&
                boardCount === 0;

              if (isRecentSameHandWaitingFlicker) {
                newState.phase = prev.phase;
              }

              const hasActiveSignals =
                Boolean(newState.handId || prev.handId) &&
                (
                  prevLooksActive ||
                  boardCount > 0 ||
                  (newState.pot ?? 0) > 0 ||
                  (newState.currentBet ?? 0) > 0 ||
                  (newState.currentPlayerSeat !== null && newState.currentPlayerSeat !== undefined) ||
                  // Same as above: if we see bets, we are almost certainly mid-hand.
                  // This prevents a 1-tick waiting flicker right after the first action.
                  newHasAnyBets
                );

              if (hasActiveSignals) {
                if (boardCount >= 5) newState.phase = 'river';
                else if (boardCount === 4) newState.phase = 'turn';
                else if (boardCount === 3) newState.phase = 'flop';
                else newState.phase = 'preflop';
              }

              // 3) Conservative guard: if we were mid-hand previously, never allow a
              //    single-frame "waiting" to replace the phase.
              if (newState.phase === 'waiting' && prevLooksActive) {
                newState.phase = prev.phase;
              }
            }
          }

          // ------------------------------
          // Showdown annotations stability
          // ------------------------------
          const showdownElapsed = Date.now() - showdownStartTimeRef.current;
          const isWithinShowdownWindow = showdownElapsed < SHOWDOWN_DISPLAY_MS;

          if (prev?.phase === 'showdown' && isWithinShowdownWindow) {
            const prevById = new Map(prev.players.map((p) => [p.playerId, p] as const));
            newState.phase = 'showdown';
            newState.players = newState.players.map((p) => {
              const old = prevById.get(p.playerId);
              if (!old) return p;
              return {
                ...p,
                holeCards: (old.holeCards?.length ?? 0) >= 2 ? old.holeCards : p.holeCards,
                handName: old.handName ?? p.handName,
                isWinner: old.isWinner ?? p.isWinner ?? false,
                winningCardIndices:
                  old.winningCardIndices && old.winningCardIndices.length > 0
                    ? old.winningCardIndices
                    : p.winningCardIndices,
                communityCardIndices:
                  old.communityCardIndices && old.communityCardIndices.length > 0
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
      };


      switch (data.type) {
        case 'connected':
          // Log server version for deployment verification
          console.log('✅ Server connected:', {
            serverVersion: data.serverVersion,
            buildTag: data.buildTag,
            engine: data.engine,
            timestamp: data.timestamp
          });
          // Server may auto-subscribe based on URL params
          break;

        case 'subscribed':
        case 'state':
        case 'table_state':
          if (data.state && tableId) {
            applyIncomingState(data.state);

            // Extract my cards and seat from server state (from getPlayerState)
            const stateData = data.state as Record<string, unknown>;
            if (stateData.myCards) {
              setMyCards(stateData.myCards as string[]);
            }
            
            // Try to get mySeat from direct field first
            let foundMySeat = false;
            if (stateData.mySeat !== undefined && stateData.mySeat !== null) {
              setMySeat(stateData.mySeat as number);
              log('🎯 My seat set from state.mySeat:', stateData.mySeat);
              foundMySeat = true;
            }
            
            // ALWAYS check players array for cards and seat (fallback for mySeat)
            const playersData = stateData.players as Record<string, unknown>[] | undefined;
            if (playersData && playerId) {
              const myPlayerData = playersData.find((p) => 
                p.playerId === playerId || p.id === playerId
              );
              if (myPlayerData) {
                // Get cards from player data
                const cards = myPlayerData.holeCards as string[] | undefined;
                if (cards && cards.length > 0) {
                  setMyCards(cards);
                  log('🃏 My cards from player data:', cards);
                }
                // IMPORTANT: Set seat from player data if not found in mySeat field
                const seatNum = (myPlayerData.seatNumber ?? myPlayerData.seat_number ?? myPlayerData.seat) as number | undefined;
                if (seatNum !== undefined && seatNum !== null) {
                  if (!foundMySeat) {
                    setMySeat(seatNum);
                    log('🎯 My seat set from players array (fallback):', seatNum);
                  }
                } else {
                  log('⚠️ Player found but no seatNumber:', myPlayerData);
                }
              } else {
                log('⚠️ My player not found in players array, playerId:', playerId, 'players:', playersData.map(p => p.playerId || p.id));
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
            
            applyIncomingState(data.state);
            
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
          // Just state update, no special handling
          if (data.state && tableId) {
            applyIncomingState(data.state);
          }
          break;

        case 'hand_started':
        case 'handStarted':  // Server sends camelCase
          // Deduplicate: servers may emit hand_started multiple times during reconciliation.
          // Without this guard we briefly reset phase to 'waiting' repeatedly, which unmounts
          // compact cards and replays their deal animation 2-3 times.
          {
            const now = Date.now();
            // Some servers nest the snapshot under `data.data.state` instead of `data.state`.
            const stateData = ((data.state as Record<string, unknown> | undefined) ??
              ((data.data as any)?.state as Record<string, unknown> | undefined));
            const incomingHandId = (
              stateData?.handId ||
              (stateData as any)?.hand_id ||
              (stateData as any)?.currentHandId ||
              (stateData as any)?.current_hand_id
            ) as string | undefined;

            // EXTRA HARD GUARD:
            // Some servers can incorrectly emit `hand_started` mid-hand (e.g. after an action)
            // with missing/unchanged handId. If we honor it, we reset phase to 'waiting'
            // which makes opponent mini-cards replay their fan animation.
            const cur = tableStateRef.current;
            const curBoardCount = cur?.communityCards?.length ?? 0;
            const curHasAnyBets = (cur?.players || []).some((p) => (p.betAmount ?? 0) > 0);
            const curHasAnyHoleCards = (cur?.players || []).some((p) => (p.holeCards?.length ?? 0) > 0);
            const curLooksActive =
              Boolean(cur?.handId) &&
              (
                cur?.phase === 'showdown' ||
                curBoardCount > 0 ||
                (cur?.pot ?? 0) > 0 ||
                (cur?.currentBet ?? 0) > 0 ||
                (cur?.currentPlayerSeat !== null && cur?.currentPlayerSeat !== undefined) ||
                // Extra signals: after BB + first action, some servers temporarily report pot/currentBet/turn as 0/null.
                // Bets and/or already-dealt hole cards are still strong evidence we're mid-hand.
                (cur?.phase !== 'waiting' && (curHasAnyBets || curHasAnyHoleCards))
              );

            // If the event carries the same handId as the currently active hand -> always ignore.
            if (incomingHandId && cur?.handId && incomingHandId === cur.handId) {
              log('🧯 Duplicate hand_started ignored (matches current active handId):', incomingHandId);
              break;
            }

            // If handId is missing BUT we already look mid-hand -> ignore.
            if (!incomingHandId && curLooksActive) {
              log('🧯 Duplicate/invalid hand_started ignored (no handId during active hand)');
              break;
            }

            // If we already processed this exact hand id, ignore.
            if (incomingHandId && incomingHandId === lastHandStartedHandIdRef.current) {
              log('🧯 Duplicate hand_started ignored (same handId):', incomingHandId);
              break;
            }

            // If we just processed a hand start very recently, ignore (covers missing handId).
            if (!incomingHandId && now - lastHandStartedAtRef.current < 1200) {
              log('🧯 Duplicate hand_started ignored (time window)');
              break;
            }

            lastHandStartedAtRef.current = now;
            if (incomingHandId) lastHandStartedHandIdRef.current = incomingHandId;
          }

          // Clear showdown and ALL player cards when new hand starts
          log('🎴 New hand started - clearing showdown and player cards');
          showdownTokenRef.current += 1;
          showdownStartTimeRef.current = 0;  // Reset showdown timestamp
          setShowdownResult(null);
          // Clear all player hole cards immediately
          setTableState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              phase: 'waiting', // Reset phase
              communityCards: [], // Clear community cards
              players: prev.players.map((p) => ({
                ...p,
                holeCards: [], // Clear hole cards
                isWinner: false,
                handName: undefined,
                winningCardIndices: [],
                communityCardIndices: [],
                betAmount: 0, // Reset bets
                isFolded: false, // Reset fold status
              })),
            };
          });
          setMyCards([]); // Clear my cards
          
          // Process state if included
          if (data.state && tableId) {
            const stateData = data.state as Record<string, unknown>;
            log('🎴 Hand started state:', JSON.stringify(stateData).substring(0, 500));
            applyIncomingState(data.state);
            
            if (stateData.myCards) {
              setMyCards(stateData.myCards as string[]);
            }
            if (stateData.mySeat !== undefined && stateData.mySeat !== null) {
              setMySeat(stateData.mySeat as number);
            }
          }
          break;

        case 'bets_collected':
          // PROFESSIONAL TIMING: Bets being collected before phase change
          // BOMB POT SUPPORT: Also triggered before bomb pot hand starts
          log('💰 Bets collected - chips moving to pot:', data);
          // Extract bet positions from event data
          {
            const eventData = (data.data || data) as Record<string, unknown>;
            // Server sends betPositions for bomb pot and normal phase transitions
            const betPositions = eventData.betPositions as Array<{
              playerId?: string;
              seatNumber: number;
              amount: number;
            }> | undefined;
            // Legacy format fallback
            const bets = (eventData.bets || eventData.collectedBets) as Array<{
              playerId?: string;
              seatNumber?: number;
              amount?: number;
            }> | undefined;
            const isBombPot = eventData.isBombPot as boolean | undefined;
            
            // Prefer betPositions (new format), fallback to bets (legacy)
            const effectiveBets = betPositions || bets;
            
            if (effectiveBets && effectiveBets.length > 0) {
              setBetsBeingCollected({
                bets: effectiveBets.map(b => ({
                  playerId: b.playerId || '',
                  seatNumber: b.seatNumber ?? 0,
                  amount: b.amount ?? 0
                })),
                timestamp: Date.now(),
                isBombPot
              });
              
              // Auto-clear after animation completes
              const collectionDelay = (eventData.collectionDelay as number || 500) + 
                (effectiveBets.length * ((eventData.staggerDelay as number) || 80));
              setTimeout(() => {
                setBetsBeingCollected(null);
              }, collectionDelay + 200);
            } else {
              // Fallback: use current player bets from table state
              const currentPlayers = tableStateRef.current?.players || [];
              const currentBets = currentPlayers
                .filter(p => p.betAmount > 0)
                .map(p => ({
                  playerId: p.playerId,
                  seatNumber: p.seatNumber,
                  amount: p.betAmount
                }));
              
              if (currentBets.length > 0) {
                setBetsBeingCollected({
                  bets: currentBets,
                  timestamp: Date.now()
                });
                
                const collectionDelay = (eventData.collectionDelay as number || 500) + 
                  (currentBets.length * ((eventData.staggerDelay as number) || 80));
                setTimeout(() => {
                  setBetsBeingCollected(null);
                }, collectionDelay + 200);
              }
            }
          }
          break;

        case 'phase_change':
        case 'phaseChange':
          // PROFESSIONAL TIMING: These events now include dealDelay and preDealDelay from server
          // CRITICAL FIX: Also update timer fields to reset countdown on new street
          log(`📡 ${data.type} event received (TIMER RESET):`, {
            hasState: !!data.state,
            stateKeys: data.state ? Object.keys(data.state as object) : [],
            dealDelay: (data as any).dealDelay,
            preDealDelay: (data as any).preDealDelay,
            phase: (data as any).phase,
            actionStartTime: (data as any).actionStartTime,
            actionTimeTotal: (data as any).actionTimeTotal
          });
          
          // Extract professional timings from server
          {
            const dealDelay = (data as any).dealDelay as number | undefined;
            const preDealDelay = (data as any).preDealDelay as number | undefined;
            const eventPhase = ((data as any).phase || (data.state as any)?.phase) as string | undefined;
            
            if (dealDelay !== undefined || preDealDelay !== undefined) {
              setPhaseTimings({
                dealDelay,
                preDealDelay,
                phase: eventPhase
              });
              
              // Clear timings after use
              const totalDelay = (preDealDelay || 0) + (dealDelay || 0) + 500;
              setTimeout(() => {
                setPhaseTimings(null);
              }, totalDelay);
            }
          }
          
          {
            // IMPORTANT: Some server implementations send timing fields on the EVENT ROOT
            // (phase_change.actionStartTime/actionTimeTotal/timeRemaining) and may omit `data.state`.
            // If we only apply `data.state`, the client may stay on the previous street while the
            // server timer is already running, causing "turn starts with 1-2s left".

            const toMs = (v: unknown): number | undefined => {
              if (v === null || v === undefined) return undefined;
              if (typeof v === 'number' && Number.isFinite(v)) return v < 1e12 ? v * 1000 : v;
              if (typeof v === 'string') {
                const trimmed = v.trim();
                const parsed = Date.parse(trimmed);
                if (!Number.isNaN(parsed)) return parsed;
                const num = Number(trimmed);
                if (Number.isFinite(num)) return num < 1e12 ? num * 1000 : num;
              }
              return undefined;
            };

            const eventData = (data as any) ?? {};
            const stateData = (data.state as any) ?? (eventData.state as any) ?? null;

            const eventPhase = (eventData.phase ?? stateData?.phase) as string | undefined;
            const eventCommunityCards = (eventData.communityCards ?? eventData.community_cards ?? stateData?.communityCards ?? stateData?.community_cards) as unknown;
            const eventCurrentPlayerSeat = (eventData.currentPlayerSeat ?? eventData.current_player_seat ?? stateData?.currentPlayerSeat ?? stateData?.current_player_seat) as unknown;

            const eventActionStartTime = toMs(eventData.actionStartTime ?? eventData.action_start_time ?? stateData?.actionStartTime ?? stateData?.action_start_time);
            const eventActionTimeTotal = eventData.actionTimeTotal ?? eventData.action_time_total ?? stateData?.actionTimeTotal ?? stateData?.action_time_total;
            const eventTimeRemaining = eventData.timeRemaining ?? eventData.time_remaining ?? stateData?.timeRemaining ?? stateData?.time_remaining;
            const eventIsTimeBankPhase = eventData.isTimeBankPhase ?? eventData.is_time_bank_phase ?? stateData?.isTimeBankPhase ?? stateData?.is_time_bank_phase;

            // If we have a state snapshot, enrich it with event-root timing fields and apply through stability layer.
            if (stateData && tableId) {
              const enriched = {
                ...(stateData as Record<string, unknown>),
                // Ensure these exist for immediate timer reset
                phase: eventPhase ?? (stateData as any).phase,
                communityCards: eventCommunityCards ?? (stateData as any).communityCards,
                currentPlayerSeat: eventCurrentPlayerSeat ?? (stateData as any).currentPlayerSeat,
                actionStartTime: eventActionStartTime ?? (stateData as any).actionStartTime,
                actionTimeTotal: eventActionTimeTotal ?? (stateData as any).actionTimeTotal,
                timeRemaining: eventTimeRemaining ?? (stateData as any).timeRemaining,
                isTimeBankPhase: eventIsTimeBankPhase ?? (stateData as any).isTimeBankPhase,
              };

              // Log specific fields
              log(`📊 phase_change enriched fields:`, {
                phase: (enriched as any).phase,
                currentPlayerSeat: (enriched as any).currentPlayerSeat,
                actionStartTime: (enriched as any).actionStartTime,
                actionTimeTotal: (enriched as any).actionTimeTotal,
                timeRemaining: (enriched as any).timeRemaining,
                isTimeBankPhase: (enriched as any).isTimeBankPhase,
              });

              applyIncomingState(enriched);

              // Extract myCards from state - server sends at root level
              if ((stateData as any).myCards) {
                const cards = (stateData as any).myCards as string[];
                log('🃏 Setting my cards from myCards:', cards);
                setMyCards(cards);
              }

              if ((stateData as any).mySeat !== undefined && (stateData as any).mySeat !== null) {
                setMySeat((stateData as any).mySeat as number);
              }
            } else {
              // No snapshot included - still do an IMMEDIATE minimal update so UI switches street + resets timer.
              setTableState((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  phase: (eventPhase as any) ?? prev.phase,
                  communityCards: Array.isArray(eventCommunityCards)
                    ? (eventCommunityCards as any)
                    : prev.communityCards,
                  currentPlayerSeat:
                    (typeof eventCurrentPlayerSeat === 'number'
                      ? (eventCurrentPlayerSeat as number)
                      : prev.currentPlayerSeat),
                  actionStartTime: (eventActionStartTime ?? prev.actionStartTime) as any,
                  actionTimeTotal:
                    (typeof eventActionTimeTotal === 'number' && Number.isFinite(eventActionTimeTotal)
                      ? (eventActionTimeTotal as number)
                       : (prev.actionTimer ?? prev.actionTimeTotal)),
                  timeRemaining:
                    (typeof eventTimeRemaining === 'number' && Number.isFinite(eventTimeRemaining)
                      ? (eventTimeRemaining as number)
                      : prev.timeRemaining),
                  isTimeBankPhase: (typeof eventIsTimeBankPhase === 'boolean'
                    ? eventIsTimeBankPhase
                    : prev.isTimeBankPhase),
                };
              });
            }
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
              applyIncomingState(data.state);
              
              if (stateData.myCards) {
                setMyCards(stateData.myCards as string[]);
              }
            }
          }
          break;

        case 'action_accepted':
          log('✅ Action accepted:', data.actionType, data.amount);
          break;

        case 'chips_added':
          // Handle chips added response
          log('💎 Chips added:', data);
          {
            const chipsData = data as Record<string, unknown>;
            // Update player stack in table state
            if (chipsData.playerId === playerId && chipsData.newStack !== undefined) {
              setTableState(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  players: prev.players.map(p => 
                    p.playerId === playerId 
                      ? { ...p, stack: chipsData.newStack as number }
                      : p
                  )
                };
              });
              log('💎 Updated my stack to:', chipsData.newStack);
            }
          }
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
            applyIncomingState(data.state);
          }
          break;

        // POKERSTARS-STYLE: Handle turn change with immediate timer reset
        case 'turn_changed':
          log('🔄 Turn changed event:', data);
          {
            const toMs = (v: unknown): number | undefined => {
              if (v === null || v === undefined) return undefined;
              if (typeof v === 'number' && Number.isFinite(v)) return v < 1e12 ? v * 1000 : v;
              if (typeof v === 'string') {
                const trimmed = v.trim();
                const parsed = Date.parse(trimmed);
                if (!Number.isNaN(parsed)) return parsed;
                const num = Number(trimmed);
                if (Number.isFinite(num)) return num < 1e12 ? num * 1000 : num;
              }
              return undefined;
            };

            // Update only the timing-critical fields for instant timer reset
            const turnData = data as {
              currentPlayerSeat: number;
              phase: string;
              actionStartTime?: number;
              actionTimeTotal?: number;
              timeRemaining?: number;
              isTimeBankPhase?: boolean;
            };
            
            setTableState((prev) => {
              if (!prev) return prev;

              // IMPORTANT: turn_changed means a NEW TURN is starting for a different player.
              // 
              // KEY FIXES for visual transition issues:
              // 1. actionTimeTotal: Use server's value OR table's base action time (never prev which could be 10s TB)
              // 2. actionStartTime: If server doesn't send it, use Date.now() - this is a NEW turn, not continuation
              // 3. isTimeBankPhase: ALWAYS reset to false - new turn always starts with main timer
              // 4. timeRemaining: Reset to full action time for clean ring animation

              const parsedActionStartTime = toMs(turnData.actionStartTime);
              
              // CRITICAL FIX: Fallback to table's base action time (actionTimer), never prev.actionTimeTotal
              const fallbackMainTotal = prev.actionTimer ?? 25;
              const nextActionTimeTotal =
                (typeof turnData.actionTimeTotal === 'number' && Number.isFinite(turnData.actionTimeTotal))
                  ? turnData.actionTimeTotal
                  : fallbackMainTotal;

              // CRITICAL FIX: For turn_changed, if server didn't send actionStartTime, 
              // use Date.now() because this is a NEW turn starting NOW.
              // Previously we kept prev.actionStartTime which could be from the previous player's time bank,
              // causing the new player to "inherit" an already-elapsed timer.
              const nextActionStartTime = parsedActionStartTime ?? Date.now();

              const nextTimeRemaining =
                (typeof turnData.timeRemaining === 'number' && Number.isFinite(turnData.timeRemaining))
                  ? turnData.timeRemaining
                  : nextActionTimeTotal;

              log('🔄 Turn changed - CLEAN RESET:', {
                prevSeat: prev.currentPlayerSeat,
                newSeat: turnData.currentPlayerSeat,
                prevIsTimeBankPhase: prev.isTimeBankPhase,
                prevActionStartTime: prev.actionStartTime,
                newActionStartTime: nextActionStartTime,
                actionTimeTotal: nextActionTimeTotal,
                serverSentActionStartTime: !!parsedActionStartTime,
              });

              return {
                ...prev,
                currentPlayerSeat: turnData.currentPlayerSeat,
                phase: turnData.phase as any,
                // NEW: Always set fresh actionStartTime for new turn
                actionStartTime: nextActionStartTime,
                // Per-turn total for ring animation
                actionTimeTotal: nextActionTimeTotal,
                // Reset to full time for clean ring animation
                timeRemaining: nextTimeRemaining,
                // ALWAYS reset to false on turn change - new turn starts with main timer
                isTimeBankPhase: false,
              };
            });
          }
          break;

        // POKERSTARS-STYLE: Time Bank activated - immediate visual feedback
        // CRITICAL FIX: Do NOT override actionStartTime with Date.now() - this causes
        // the global monotonic guard to reject subsequent state_update packets from server,
        // leading to desync. Only set the visual flag; let the subsequent state_update
        // provide the authoritative actionStartTime.
        case 'time_bank_activated':
          log('⏱️ Time Bank ACTIVATED:', data);
          {
            // Handle both wrapped and unwrapped data formats
            const rawData = (data as any)?.data ?? data;
            const tbData = rawData as {
              playerId: string;
              seat?: number; // Server now sends seat for hero check
              timeUsed: number;
              remaining: number;
              actionStartTime?: number;
              actionTimeTotal?: number;
            };
            
            const timeUsed = tbData?.timeUsed ?? 0;
            const remaining = tbData?.remaining ?? 0;
            const serverActionStartTime = tbData?.actionStartTime;
            const serverActionTimeTotal = tbData?.actionTimeTotal ?? timeUsed;
            const eventSeat = tbData?.seat;
            const eventPlayerId = tbData?.playerId;
            
            // CRITICAL FIX (v2): Only set isTimeBankPhase=true if this event is for the HERO.
            // All clients receive this broadcast. The old check `eventSeat === currentPlayerSeat`
            // was wrong because currentPlayerSeat is the same on all clients.
            // We need to check if `eventSeat === mySeat` (the player viewing the table).
            //
            // For the HERO: show time bank alarm + blue ring + update state
            // For OPPONENTS: just update timer timing values (actionStartTime/Total) but NOT isTimeBankPhase
            //
            // mySeatRef is defined at hook level, use it here.
            const heroSeat = mySeatRef.current;
            const isEventForHero = (heroSeat !== null && eventSeat !== undefined && eventSeat === heroSeat);
            
            setTableState((prev) => {
              if (!prev) return prev;
              
              // First check: is this event for the current player at all?
              const isForCurrentTurn = 
                (eventSeat !== undefined && eventSeat === prev.currentPlayerSeat) ||
                (eventPlayerId && prev.players?.some(p => 
                  p.playerId === eventPlayerId && p.seatNumber === prev.currentPlayerSeat
                ));
              
              if (!isForCurrentTurn) {
                // Time bank is for a different player entirely - ignore
                log('⏱️ Time Bank event for different player, ignoring state update', { 
                  eventSeat, 
                  eventPlayerId, 
                  currentPlayerSeat: prev.currentPlayerSeat 
                });
                return prev;
              }
              
              // CRITICAL: Only set isTimeBankPhase for the HERO (the client whose seat matches eventSeat)
              // For other clients, just update timing values but keep isTimeBankPhase = false
              if (isEventForHero) {
                log('⏱️ Time Bank activated for HERO', { eventSeat, heroSeat });
                return {
                  ...prev,
                  isTimeBankPhase: true,
                  // Use server's authoritative timestamps
                  actionStartTime: serverActionStartTime ?? prev.actionStartTime,
                  // Use server's actionTimeTotal for consistent ring animation
                  actionTimeTotal: serverActionTimeTotal > 0 ? serverActionTimeTotal : (prev.timeBankSeconds ?? 30),
                  // Initial remaining = full slice
                  timeRemaining: serverActionTimeTotal > 0 ? serverActionTimeTotal : prev.timeBankSeconds
                };
              } else {
                // Opponent entered time bank - update timer values but NOT isTimeBankPhase
                // This ensures opponent's ring still counts down correctly
                log('⏱️ Time Bank activated for OPPONENT (not hero)', { eventSeat, heroSeat });
                return {
                  ...prev,
                  // DON'T set isTimeBankPhase: true for opponents!
                  // Update timing so ring animation is correct
                  actionStartTime: serverActionStartTime ?? prev.actionStartTime,
                  actionTimeTotal: serverActionTimeTotal > 0 ? serverActionTimeTotal : (prev.actionTimeTotal ?? 30),
                  timeRemaining: serverActionTimeTotal > 0 ? serverActionTimeTotal : prev.timeRemaining
                };
              }
            });
            
            log(`⏱️ Time Bank активирован: ${timeUsed}s (осталось: ${remaining}s), isHero: ${isEventForHero}`);
          }
          break;

        case 'state_update':
          // State update after action - contains latest bets and player states
          log('📊 State update received:', data);
          {
            // The server broadcasts with full state attached
            const stateData = (data.state || data.data || data) as Record<string, unknown>;
            
            // POKERSTARS-STYLE: Check for time bank phase in direct state_update
            // Server sends isTimeBankPhase and timeRemaining when entering time bank
            const toBooleanOrUndef = (v: unknown): boolean | undefined => {
              if (typeof v === 'boolean') return v;
              if (typeof v === 'number') return v === 1;
              if (typeof v === 'string') {
                const s = v.trim().toLowerCase();
                if (s === 'true' || s === '1') return true;
                if (s === 'false' || s === '0') return false;
              }
              return undefined;
            };

            const toNumberOrUndef = (v: unknown): number | undefined => {
              if (v === null || v === undefined) return undefined;
              const n = typeof v === 'number' ? v : Number(v);
              return Number.isFinite(n) ? n : undefined;
            };

            const directTimeBankPhase = toBooleanOrUndef(
              (stateData as any).isTimeBankPhase ?? (stateData as any).is_time_bank_phase
            );
            const directTimeRemaining = toNumberOrUndef(
              (stateData as any).timeRemaining ?? (stateData as any).time_remaining
            );
            
            // CRITICAL FIX: Get current player seat from state to determine if time bank is for hero
            const stateCurrentPlayerSeat = toNumberOrUndef(
              (stateData as any).currentPlayerSeat ?? (stateData as any).current_player_seat
            );
            
            if (directTimeBankPhase !== undefined) {
              log('⏱️ Time Bank phase update from state_update:', { 
                isTimeBankPhase: directTimeBankPhase, 
                timeRemaining: directTimeRemaining,
                currentPlayerSeat: stateCurrentPlayerSeat,
                mySeat: mySeatRef.current
              });
            }
            
            if (tableId && (stateData.players || stateData.phase)) {
              const incomingState = transformServerState(stateData, tableId);
              const keepShowdown = tableStateRef.current?.phase === 'showdown';

              setTableState((prev) => {
                if (!prev) return keepShowdown ? { ...incomingState, phase: 'showdown' } : incomingState;
                if (!keepShowdown) {
                  // CRITICAL FIX: Only set isTimeBankPhase = true if this is for the HERO
                  // Server broadcasts time bank state to all clients, but only the hero should see it as their turn
                  const heroSeat = mySeatRef.current;
                  const currentTurnSeat = stateCurrentPlayerSeat ?? incomingState.currentPlayerSeat ?? prev.currentPlayerSeat;
                  const isTimeBankForHero = heroSeat !== null && currentTurnSeat === heroSeat;
                  
                  // POKERSTARS-STYLE: Preserve time bank state from direct update
                  if (directTimeBankPhase !== undefined) {
                    // Only set isTimeBankPhase = true for the hero, never for opponents
                    const effectiveTimeBankPhase = directTimeBankPhase && isTimeBankForHero;
                    
                    if (directTimeBankPhase && !isTimeBankForHero) {
                      log('⏱️ Time Bank from state_update - NOT for hero, keeping timing only', {
                        heroSeat,
                        currentTurnSeat,
                        directTimeBankPhase
                      });
                    }
                    
                    return {
                      ...incomingState,
                      // CRITICAL: Only set true if it's for the hero
                      isTimeBankPhase: effectiveTimeBankPhase,
                      // CRITICAL: Never synthesize actionStartTime on client.
                      // If server omitted it in a snapshot, keep the previous one.
                      actionStartTime: directTimeBankPhase
                        ? (incomingState.actionStartTime ?? prev.actionStartTime ?? null)
                        : incomingState.actionStartTime,
                      // CRITICAL: timeRemaining is NOT the total duration.
                      // Keep per-turn total from server; if missing, keep previous known total.
                      actionTimeTotal: directTimeBankPhase
                        ? (incomingState.actionTimeTotal ?? prev.actionTimeTotal ?? prev.timeBankSeconds ?? null)
                        : incomingState.actionTimeTotal,
                      // If server explicitly sent timeRemaining alongside TB flag, keep it in timeRemaining.
                      timeRemaining: directTimeRemaining ?? incomingState.timeRemaining
                    };
                  }
                  return incomingState;
                }

                const prevById = new Map(prev.players.map((p) => [p.playerId, p] as const));

                return {
                  ...incomingState,
                  phase: 'showdown',
                  // Preserve time bank state during showdown too
                  isTimeBankPhase: directTimeBankPhase ?? prev.isTimeBankPhase,
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
          
          // Check if this is a fold win (all others folded) - use shorter display time
          const reason = (eventData.reason || (data as any).reason || nestedResult?.reason || rootResult?.reason) as string | undefined;
          const isFoldWin = reason === 'all_folded' || reason === 'fold';

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
            // Start / refresh showdown token and timestamp
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

            // Apply pot payout locally so UI always reflects winner stack even if server state snapshot lags.
            // (Server should still eventually send corrected stacks; this is a visual correctness patch.)
            if (winners.length > 0) {
              const winByPlayerId = new Map(winners.map((w) => [w.playerId, w.amount] as const));
              setTableState((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  pot: 0,
                  currentBet: 0,
                  currentPlayerSeat: null,
                  players: prev.players.map((p) => {
                    const won = winByPlayerId.get(p.playerId) || 0;
                    return {
                      ...p,
                      stack: p.stack + won,
                      betAmount: 0,
                      totalBetInHand: 0,
                    };
                  }),
                };
              });
            }

            // Use shorter display time for fold wins, longer for real showdowns
            const displayTime = isFoldWin ? FOLD_WIN_DISPLAY_MS : SHOWDOWN_DISPLAY_MS;

            // Keep showdown highlight visible, then clear IF still the same showdown
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
            }, displayTime);
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

        case 'player_sitting_out':
          // Player started sitting out (manually or due to disconnect timeout)
          log('💤 Player sitting out:', data.data);
          setTableState((prev) => {
            if (!prev) return prev;
            const eventData = data.data as Record<string, unknown> | undefined;
            const sittingOutPlayerId = eventData?.playerId as string | undefined;
            if (!sittingOutPlayerId) return prev;
            
            return {
              ...prev,
              players: prev.players.map(p => 
                p.playerId === sittingOutPlayerId 
                  ? { ...p, isSittingOut: true, isActive: false }
                  : p
              )
            };
          });
          break;
        
        case 'player_sitting_in':
          // Player returned to active play
          log('🎮 Player sitting in:', data.data);
          setTableState((prev) => {
            if (!prev) return prev;
            const eventData = data.data as Record<string, unknown> | undefined;
            const sittingInPlayerId = eventData?.playerId as string | undefined;
            if (!sittingInPlayerId) return prev;
            
            return {
              ...prev,
              players: prev.players.map(p => 
                p.playerId === sittingInPlayerId 
                  ? { ...p, isSittingOut: false, isDisconnected: false, isActive: true }
                  : p
              )
            };
          });
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

        case 'settings_updated':
          // Confirmation that our settings update was saved - also update local state
          log('✅ Settings updated:', data.settings);
          // CRITICAL: Host also needs to update their local state
          setTableState((prev) => {
            if (!prev) return prev;
            const settings = data.settings as Record<string, unknown> | undefined;
            if (!settings) return prev;
            
            const newActionTime = (settings.actionTimeSeconds as number) ?? prev.actionTimer;
            
            return {
              ...prev,
              actionTimer: newActionTime,
              actionTimeTotal: newActionTime,
              timeBankSeconds: (settings.timeBankSeconds as number) ?? prev.timeBankSeconds,
              smallBlindAmount: (settings.smallBlind as number) ?? prev.smallBlindAmount,
              bigBlindAmount: (settings.bigBlind as number) ?? prev.bigBlindAmount,
              anteAmount: (settings.ante as number) ?? prev.anteAmount,
            };
          });
          break;
        
        // PRO FEATURES: Bomb Pot (Industry-style: automatic, no voting)
        case 'bomb_pot_triggered':
          log('💣 BOMB POT triggered (automatic):', data);
          setBombPotActive(data as any);
          // Clear after hand starts (will be handled by hand_started)
          break;
        
        // Legacy events - kept for backwards compatibility
        case 'bomb_pot_proposal':
          log('💣 Bomb Pot proposal (legacy):', data);
          setBombPotProposal(data as any);
          break;
        
        case 'bomb_pot_confirmed':
        case 'bomb_pot_declined':
          log('💣 Bomb Pot result:', data.type);
          setBombPotProposal(null);
          setBombPotActive(null);
          break;
        
        // PRO FEATURES: Run It Twice
        case 'run_it_twice_proposal':
          log('🔄 Run It Twice proposal:', data);
          setRunItTwiceProposal(data as any);
          break;
        
        case 'run_it_twice_confirmed':
        case 'run_it_twice_declined':
          log('🔄 Run It Twice result:', data.type);
          setRunItTwiceProposal(null);
          break;
        
        case 'run_it_twice_boards':
          log('🔄 Run It Twice boards dealt:', data);
          setRunItTwiceBoards(data as any);
          // Clear after hand completes
          setTimeout(() => setRunItTwiceBoards(null), 10000);
          break;
        
        // PRO FEATURES: Straddle
        case 'straddle_posted':
          log('⚡ Straddle posted:', data);
          setStraddlePosted(data as any);
          setTimeout(() => setStraddlePosted(null), 3000);
          break;

        case 'table_settings_changed':
          // Another player (host) changed table settings
          log('⚙️ Table settings changed:', data.settings);
          // Update local tableState with new settings
          // CRITICAL: Must update BOTH actionTimer AND actionTimeTotal for timer sync
          setTableState((prev) => {
            if (!prev) return prev;
            const settings = data.settings as Record<string, unknown> | undefined;
            if (!settings) return prev;
            
            const newActionTime = (settings.actionTimeSeconds as number) ?? prev.actionTimer;
            
            return {
              ...prev,
              // Update all timing-related fields for immediate sync
              actionTimer: newActionTime,
              actionTimeTotal: newActionTime, // CRITICAL: This is used by timer UI
              timeBankSeconds: (settings.timeBankSeconds as number) ?? prev.timeBankSeconds,
              smallBlindAmount: (settings.smallBlind as number) ?? prev.smallBlindAmount,
              bigBlindAmount: (settings.bigBlind as number) ?? prev.bigBlindAmount,
              anteAmount: (settings.ante as number) ?? prev.anteAmount,
            };
          });
          break;

        case 'time_bank_used':
          // Time bank notification - update state if included
          log('⏱️ Time bank used:', data.data);
          if (data.state && tableId) {
            applyIncomingState(data.state);
          }
          break;

        case 'timeout_warning':
          // Timeout warning - player is running low on time
          log('⚠️ Timeout warning');
          break;

        case 'timeout':
          // Player timed out - update state if included
          log('⏱️ Player timeout:', data.data);
          // Always log critical timing snapshot for diagnosis of "early timeout" reports.
          console.warn('[POKER TIMEOUT DIAG]', {
            tableId,
            data: data.data,
            timing: tableStateRef.current
              ? {
                  handId: tableStateRef.current.handId,
                  phase: tableStateRef.current.phase,
                  currentPlayerSeat: tableStateRef.current.currentPlayerSeat,
                  actionTimer: tableStateRef.current.actionTimer,
                  actionTimeTotal: tableStateRef.current.actionTimeTotal,
                  isTimeBankPhase: tableStateRef.current.isTimeBankPhase,
                  timeBankSeconds: tableStateRef.current.timeBankSeconds,
                  timeRemaining: tableStateRef.current.timeRemaining,
                  actionStartTime: tableStateRef.current.actionStartTime,
                }
              : null,
            now: Date.now(),
          });
          if (data.state && tableId) {
            applyIncomingState(data.state);
            
            // Extract my cards from state if present
            const timeoutStateData = data.state as Record<string, unknown>;
            if (timeoutStateData.myCards) {
              setMyCards(timeoutStateData.myCards as string[]);
            }
          }
          break;
        
        // RECONNECT HANDLING - restore player after page reload
        case 'reconnect_success':
          log('✅ Reconnect successful!', data);
          if (data.state && tableId) {
            applyIncomingState(data.state);
            
            const stateData = data.state as Record<string, unknown>;
            if (stateData.myCards) {
              setMyCards(stateData.myCards as string[]);
            }
            if (stateData.mySeat !== undefined) {
              setMySeat(stateData.mySeat as number);
            }
            
            // Find my seat from players if not in root
            const playersData = stateData.players as Record<string, unknown>[] | undefined;
            if (playersData && playerId) {
              const myPlayer = playersData.find(p => p.playerId === playerId || p.id === playerId);
              if (myPlayer) {
                const seatNum = (myPlayer.seatNumber ?? myPlayer.seat_number) as number | undefined;
                if (seatNum !== undefined) setMySeat(seatNum);
                const cards = myPlayer.holeCards as string[] | undefined;
                if (cards && cards.length > 0) setMyCards(cards);
              }
            }
          }
          break;
        
        case 'reconnect_failed':
          log('❌ Reconnect failed:', data.reason, data.message);
          // Clear session marker since seat is gone
          if (tableId) {
            sessionStorage.removeItem(`poker_session_${tableId}`);
          }
          // Show error to user
          setError(data.message as string || 'Не удалось восстановить сессию');
          setTimeout(() => setError(null), 5000);
          break;
        
        case 'player_disconnected':
          // Another player disconnected - update their status in UI
          log('👤 Player disconnected:', data.data);
          setTableState((prev) => {
            if (!prev) return prev;
            const eventData = data.data as Record<string, unknown> | undefined;
            const disconnectedPlayerId = eventData?.playerId as string | undefined;
            if (!disconnectedPlayerId) return prev;
            
            return {
              ...prev,
              players: prev.players.map(p => 
                p.playerId === disconnectedPlayerId 
                  ? { ...p, isDisconnected: true, isActive: false }
                  : p
              )
            };
          });
          break;
        
        case 'player_reconnected':
          // Player came back
          log('👤 Player reconnected:', data.data);
          setTableState((prev) => {
            if (!prev) return prev;
            const eventData = data.data as Record<string, unknown> | undefined;
            const reconnectedPlayerId = eventData?.playerId as string | undefined;
            if (!reconnectedPlayerId) return prev;
            
            return {
              ...prev,
              players: prev.players.map(p => 
                p.playerId === reconnectedPlayerId 
                  ? { ...p, isDisconnected: false, isActive: true }
                  : p
              )
            };
          });
          break;
        
        case 'rebuy_available':
          // Tournament rebuy opportunity - player has limited time to rebuy or be eliminated
          log('💰 Rebuy available:', data);
          {
            const rebuyData = data as Record<string, unknown>;
            const targetPlayerId = rebuyData.playerId as string;
            
            // Only show rebuy UI if this is for us
            if (targetPlayerId === playerId) {
              setRebuyAvailable({
                tournamentId: rebuyData.tournamentId as string,
                timeoutSeconds: rebuyData.timeoutSeconds as number || 30,
                timestamp: Date.now()
              });
            }
          }
          break;
        
        case 'player_eliminated':
          // Player was eliminated from tournament
          log('💀 Player eliminated:', data);
          {
            const elimData = data as Record<string, unknown>;
            const eliminatedPlayerId = elimData.playerId as string;
            
            // If we were eliminated, clear rebuy state
            if (eliminatedPlayerId === playerId) {
              setRebuyAvailable(null);
            }
            
            // Update player in state
            setTableState((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                players: prev.players.filter(p => p.playerId !== eliminatedPlayerId)
              };
            });
          }
          break;

        // TOURNAMENT BREAK EVENTS
        case 'tournament_break':
          {
            const breakData = data as Record<string, unknown>;
            const eventType = breakData.event as 'break_starting' | 'break_started' | 'break_ended';
            
            log('☕ Tournament break event:', eventType, breakData);
            
            if (eventType === 'break_ended') {
              // Clear break state
              setTournamentBreak(null);
            } else {
              // Set break state (starting or started)
              setTournamentBreak({
                type: eventType,
                tournamentId: breakData.tournamentId as string,
                tournamentName: breakData.tournamentName as string,
                durationMinutes: (breakData.durationMinutes as number) || Math.floor((breakData.durationSeconds as number || 0) / 60),
                durationSeconds: breakData.durationSeconds as number || 0,
                timestamp: Date.now()
              });
            }
          }
          break;

        // PROFESSIONAL TIMING: Enhanced bet collection with positions
        case 'bets_collected':
          {
            const betsData = data as Record<string, unknown>;
            const betPositions = betsData.betPositions as Array<{ seatNumber: number; amount: number }> | undefined;
            
            log('💰 Bets collected:', betsData);
            
            if (betPositions && betPositions.length > 0) {
              setBetsBeingCollected({
                bets: betPositions.map(bp => ({
                  playerId: '',  // Not needed, we use seatNumber
                  seatNumber: bp.seatNumber,
                  amount: bp.amount
                })),
                timestamp: Date.now()
              });
              
              // Auto-clear after collection animation
              const collectionDelay = (betsData.collectionDelay as number || 500) + 
                (betPositions.length * ((betsData.staggerDelay as number) || 80));
              setTimeout(() => {
                setBetsBeingCollected(null);
              }, collectionDelay + 200);
            }
          }
          break;

        // POKERSTARS-STYLE: Community cards dealt (especially during all-in showdown)
        case 'community_cards':
          {
            console.log('🎴 [COMMUNITY CARDS] Handler triggered!', data);
            
            // Server sends TableEvent: { type, tableId, data: { phase, cards, handNumber, isAllInShowdown }, timestamp }
            const rawData = data as Record<string, unknown>;
            const cardsData = (rawData.data || rawData) as Record<string, unknown>;
            const cards = cardsData.cards as string[];
            const phase = cardsData.phase as string;
            const isAllInShowdown = cardsData.isAllInShowdown as boolean;
            
            console.log('🎴 [COMMUNITY CARDS] Parsed:', { 
              cards, 
              phase, 
              isAllInShowdown,
              hasCards: !!(cards && cards.length > 0),
              cardsData 
            });
            
            if (cards && cards.length > 0 && tableId) {
              setTableState(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  phase: (phase as TableState['phase']) || prev.phase,
                  communityCards: cards,
                  pot: (cardsData.pot as number) ?? prev.pot
                };
              });
              
              // Update showdownResult communityCards for hand evaluation
              if (isAllInShowdown) {
                setShowdownResult(prev => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    communityCards: cards
                  };
                });
              }
            }
          }
          break;

        // PROFESSIONAL TIMING: Phase change with card dealing delays
        // CRITICAL FIX: Also update timer fields to reset countdown on new street
        case 'phase_change':
          {
            const phaseData = data as Record<string, unknown>;
            log('🎴 Phase change (TIMER RESET):', {
              phase: phaseData.phase,
              actionStartTime: phaseData.actionStartTime,
              actionTimeTotal: phaseData.actionTimeTotal,
              timeRemaining: phaseData.timeRemaining,
              currentPlayerSeat: phaseData.currentPlayerSeat
            });
            
            setPhaseTimings({
              dealDelay: phaseData.dealDelay as number | undefined,
              preDealDelay: phaseData.preDealDelay as number | undefined,
              postDealDelay: phaseData.postDealDelay as number | undefined,
              phase: phaseData.phase as string | undefined
            });
            
            // Helper to parse actionStartTime (supports ms, seconds, ISO)
            const toMsTimestamp = (v: unknown): number | null => {
              if (v === null || v === undefined) return null;
              if (typeof v === 'number' && Number.isFinite(v)) {
                return v < 1e12 ? v * 1000 : v;
              }
              if (typeof v === 'string') {
                const parsed = Date.parse(v.trim());
                if (!Number.isNaN(parsed)) return parsed;
                const num = Number(v.trim());
                if (Number.isFinite(num)) return num < 1e12 ? num * 1000 : num;
              }
              return null;
            };
            
            // Update community cards AND timer fields
            if (tableId) {
              const newActionStartTime = toMsTimestamp(phaseData.actionStartTime);
              const newActionTimeTotal = typeof phaseData.actionTimeTotal === 'number' 
                ? phaseData.actionTimeTotal 
                : (typeof phaseData.timeRemaining === 'number' ? phaseData.timeRemaining : null);
              
              // CRITICAL DEBUG: Log what we received from server
              console.log('🎴 [PHASE CHANGE] Timer data received:', {
                phase: phaseData.phase,
                rawActionStartTime: phaseData.actionStartTime,
                parsedActionStartTime: newActionStartTime,
                rawActionTimeTotal: phaseData.actionTimeTotal,
                rawTimeRemaining: phaseData.timeRemaining,
                parsedActionTimeTotal: newActionTimeTotal,
                currentPlayerSeat: phaseData.currentPlayerSeat,
                now: Date.now()
              });
              
              setTableState(prev => {
                if (!prev) return prev;
                
                const updatedState: TableState = {
                  ...prev,
                  phase: phaseData.phase as TableState['phase'] || prev.phase,
                  pot: (phaseData.pot as number) ?? prev.pot,
                  // CRITICAL: Reset timer state on phase change
                  isTimeBankPhase: false, // New street always starts with main timer
                };
                
                // Update community cards if provided
                if (phaseData.communityCards) {
                  updatedState.communityCards = phaseData.communityCards as string[];
                }
                
                // Update currentPlayerSeat if provided
                if (phaseData.currentPlayerSeat !== undefined) {
                  updatedState.currentPlayerSeat = phaseData.currentPlayerSeat as number | null;
                }
                
                // CRITICAL: Update timer fields - this is what resets the countdown
                if (newActionStartTime !== null) {
                  updatedState.actionStartTime = newActionStartTime;
                  log('🎴 Phase change: Updated actionStartTime to', newActionStartTime);
                } else {
                  // No actionStartTime from server - use now as fallback
                  updatedState.actionStartTime = Date.now();
                  log('🎴 Phase change: Using Date.now() as actionStartTime fallback');
                }
                
                if (newActionTimeTotal !== null) {
                  updatedState.actionTimeTotal = newActionTimeTotal;
                  updatedState.timeRemaining = newActionTimeTotal;
                  log('🎴 Phase change: Updated actionTimeTotal to', newActionTimeTotal);
                }
                
                return updatedState;
              });
            }
          }
          break;

        // POKERSTARS-STYLE: Burn card animation before community cards
        case 'burn_card':
          {
            console.log('🔥 [BURN CARD] Handler triggered!', data);
            
            // Server sends TableEvent: { type, tableId, data: { phase, handNumber, isAllInShowdown }, timestamp }
            const rawData = data as Record<string, unknown>;
            const burnData = (rawData.data || rawData) as Record<string, unknown>;
            const burnPhase = burnData.phase as 'flop' | 'turn' | 'river';
            const isAllInShowdown = burnData.isAllInShowdown as boolean;
            
            console.log('🔥 [BURN CARD] Parsed:', { 
              phase: burnPhase, 
              isAllInShowdown,
              hasPhase: !!burnPhase,
              burnData 
            });
            
            if (burnPhase) {
              setActiveBurnCard({
                phase: burnPhase,
                timestamp: Date.now()
              });
              
              // Auto-clear after animation completes (~500ms for PokerStars-style all-in)
              const clearDelay = isAllInShowdown ? 500 : 400;
              setTimeout(() => {
                setActiveBurnCard(null);
              }, clearDelay);
            }
          }
          break;

        // POKERSTARS-STYLE: All-in showdown - cards revealed immediately (TDA Rule 16)
        case 'all_in_showdown':
          {
            console.log('🃏 [ALL-IN SHOWDOWN] Handler triggered!', data);
            
            const rawData = data as Record<string, unknown>;
            const allInData = (rawData.data || rawData) as Record<string, unknown>;
            console.log('🃏 [ALL-IN SHOWDOWN] Parsed data:', {
              hasPlayers: !!(allInData.players),
              playersCount: Array.isArray(allInData.players) ? allInData.players.length : 0,
              pot: allInData.pot,
              fullData: JSON.stringify(allInData, null, 2)
            });
            
            const players = (allInData.players || []) as Array<{
              playerId: string;
              name: string;
              seatNumber: number;
              holeCards: string[];
              stack: number;
              isAllIn: boolean;
            }>;
            const pot = (allInData.pot as number) || 0;
            
            // Immediately set phase to showdown and reveal all cards
            setTableState(prev => {
              if (!prev) return prev;
              
              // Update each player's hole cards with the revealed cards
              const updatedPlayers = prev.players.map(p => {
                const allInPlayer = players.find(ap => ap.playerId === p.playerId);
                if (allInPlayer && allInPlayer.holeCards && allInPlayer.holeCards.length >= 2) {
                  return {
                    ...p,
                    holeCards: allInPlayer.holeCards,
                    isAllIn: allInPlayer.isAllIn ?? p.isAllIn
                  };
                }
                return p;
              });
              
              return {
                ...prev,
                phase: 'showdown',
                pot: pot || prev.pot,
                players: updatedPlayers
              };
            });
            
            // Also populate showdownReveals for animation effects
            setShowdownReveals(players.map((p, index) => ({
              playerId: p.playerId,
              playerName: p.name,
              seatNumber: p.seatNumber,
              holeCards: p.holeCards,
              handName: undefined, // Will be calculated after community cards
              bestCards: undefined,
              revealIndex: index,
              revealDelay: 0, // Immediate reveal in all-in showdown
              isWinner: false // Will be updated after hand evaluation
            })));
            
            // Update showdownResult with revealed players for FullscreenPokerTable compatibility
            setShowdownResult({
              winners: [], // Winners determined later after hand evaluation
              pot: pot,
              showdownPlayers: players.map(p => ({
                playerId: p.playerId,
                name: p.name,
                seatNumber: p.seatNumber,
                holeCards: p.holeCards,
                isFolded: false,
                handName: undefined,
                bestCards: undefined
              })),
              communityCards: tableStateRef.current?.communityCards || []
            });
          }
          break;

        // PROFESSIONAL: Showdown start event
        case 'showdown_start':
          {
            const showdownData = data as Record<string, unknown>;
            log('🎭 Showdown starting:', showdownData);
            
            // Clear previous reveals
            setShowdownReveals([]);
            
            // Set showdown phase
            setTableState(prev => {
              if (!prev) return prev;
              return { ...prev, phase: 'showdown' };
            });
          }
          break;

        // PROFESSIONAL: Sequential card reveal for each player
        case 'showdown_reveal':
          {
            // Server sends data in data.data field
            const rawData = data as Record<string, unknown>;
            const revealData = (rawData.data || rawData) as Record<string, unknown>;
            log('🃏 Showdown reveal:', revealData);
            
            // Validate required fields
            const revealPlayerId = revealData.playerId as string;
            const revealHoleCards = revealData.holeCards as string[] | undefined;
            
            if (!revealPlayerId || !revealHoleCards || revealHoleCards.length < 2) {
              log('⚠️ Invalid showdown_reveal data, missing playerId or holeCards:', revealData);
              break;
            }
            
            setShowdownReveals(prev => [
              ...prev,
              {
                playerId: revealPlayerId,
                playerName: revealData.playerName as string || 'Unknown',
                seatNumber: revealData.seatNumber as number ?? 0,
                holeCards: revealHoleCards,
                handName: revealData.handName as string | undefined,
                bestCards: revealData.bestCards as string[] | undefined,
                revealIndex: revealData.revealIndex as number ?? prev.length,
                revealDelay: revealData.revealDelay as number ?? 0,
                isWinner: revealData.isWinner as boolean ?? false
              }
            ]);
            
            // Update player's hole cards in table state
            setTableState(prev => {
              if (!prev) return prev;
              
              return {
                ...prev,
                players: prev.players.map(p => 
                  p.playerId === revealPlayerId
                    ? {
                        ...p,
                        holeCards: revealHoleCards,
                        handName: revealData.handName as string | undefined,
                        bestCards: revealData.bestCards as string[] | undefined,
                        isWinner: revealData.isWinner as boolean ?? false
                      }
                    : p
                )
              };
            });
          }
          break;

        // PROFESSIONAL: Winner announcement with pot slide animation
        case 'winner_announcement':
          {
            // Server sends data in data.data field
            const rawData = data as Record<string, unknown>;
            const winnerData = (rawData.data || rawData) as Record<string, unknown>;
            log('🏆 Winner announcement:', winnerData);
            
            const winners = (winnerData.winners || []) as Array<{
              playerId: string;
              playerName: string;
              seatNumber: number;
              amount: number;
              handName?: string;
              newStack: number;
            }>;
            
            setWinnerAnnouncement({
              winners,
              pot: winnerData.pot as number || 0,
              isSplitPot: winnerData.isSplitPot as boolean || winners.length > 1,
              potSlideDelay: winnerData.potSlideDelay as number || 600,
              highlightDuration: winnerData.highlightDuration as number || 2500,
              celebrationDuration: winnerData.celebrationDuration as number || 2000,
              timestamp: Date.now()
            });
            
            // Mark winners in table state
            setTableState(prev => {
              if (!prev) return prev;
              const winnerIds = new Set(winners.map(w => w.playerId));
              
              return {
                ...prev,
                players: prev.players.map(p => 
                  winnerIds.has(p.playerId)
                    ? { ...p, isWinner: true }
                    : p
                )
              };
            });
            
            // Auto-clear winner announcement after celebration
            const totalDuration = 
              (winnerData.potSlideDelay as number || 600) +
              (winnerData.highlightDuration as number || 2500) +
              (winnerData.celebrationDuration as number || 2000);
            
            setTimeout(() => {
              setWinnerAnnouncement(null);
              setShowdownReveals([]);
            }, totalDuration);
          }
          break;

        // TOURNAMENT: Player moved to another table (balancing/consolidation)
        case 'player_moved':
        case 'player_moved_to_other_table':
          {
            const moveData = data as Record<string, unknown>;
            const movedPlayerId = (moveData.playerId || moveData.player_id) as string;
            const newTableId = (moveData.newTableId || moveData.new_table_id) as string;
            const newSeat = (moveData.newSeat ?? moveData.new_seat ?? moveData.seatNumber) as number;
            const tournamentIdFromEvent = (moveData.tournamentId || moveData.tournament_id) as string;
            
            log('🔄 Player moved event:', { movedPlayerId, newTableId, newSeat, currentPlayerId: playerId });
            
            // Only redirect if it's the current player being moved
            if (movedPlayerId === playerId && newTableId && newTableId !== tableId) {
              log('🚀 Current player moved to new table - triggering redirect');
              
              setPlayerMovedToTable({
                newTableId,
                newSeat: newSeat ?? 0,
                tournamentId: tournamentIdFromEvent || '',
                timestamp: Date.now()
              });
            }
          }
          break;

        // Table closed/disbanded event
        case 'table_closed':
        case 'table_disbanded':
          {
            const closeData = data as Record<string, unknown>;
            const newTableIdFromClose = (closeData.newTableId || closeData.new_table_id) as string | undefined;
            
            log('🚪 Table closed event:', closeData);
            
            if (newTableIdFromClose) {
              // Players should move to another table
              setPlayerMovedToTable({
                newTableId: newTableIdFromClose,
                newSeat: 0,
                tournamentId: (closeData.tournamentId || closeData.tournament_id) as string || '',
                timestamp: Date.now()
              });
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

      // CRITICAL: On reconnect, try to restore session first
      // This handles page reload scenario - player may still have a seat
      const wasReconnect = reconnectAttemptRef.current > 0 || sessionStorage.getItem(`poker_session_${tableId}`);
      
      if (wasReconnect || sessionStorage.getItem(`poker_session_${tableId}`)) {
        log('🔄 Attempting session restore after reconnect...');
        sendMessage({
          type: 'reconnect_request',
          tableId,
          playerId
        });
        // Save session marker
        sessionStorage.setItem(`poker_session_${tableId}`, JSON.stringify({
          playerId,
          timestamp: Date.now()
        }));
      } else {
        // First connection - save session marker for future reconnects
        sessionStorage.setItem(`poker_session_${tableId}`, JSON.stringify({
          playerId,
          timestamp: Date.now()
        }));
        log('📡 Waiting for server state...');
      }

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
    
    // Engine v3 expects TOTAL raise amount (what we want our total bet to be)
    // If currentBet=0, it's a "bet", otherwise it's a "raise"
    // Engine will auto-convert raise to bet if needed
    const actionType = currentBetAmount === 0 ? 'bet' : 'raise';
    
    console.log('[NodePoker] 💰 Raise/Bet action (v2):', { 
      tableId, playerId, 
      totalAmount,
      actionType, 
      currentBet: currentBetAmount,
      myCurrentBet,
      sendingAmount: totalAmount
    });
    
    sendMessage({
      type: 'action',
      tableId,
      playerId,
      actionType,
      amount: totalAmount  // TOTAL bet amount - server expects total, not delta
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

  // Sit out - player will auto-fold when it's their turn
  const sitOut = useCallback(() => {
    if (!tableId || !playerId) return;
    log('💤 Sitting out');
    sendMessage({
      type: 'sit_out',
      tableId,
      playerId
    });
  }, [tableId, playerId, sendMessage]);

  // Sit in - return to active play with optional dead blind posting or wait for BB
  const sitIn = useCallback((options?: { postDead?: boolean; waitForBB?: boolean }) => {
    if (!tableId || !playerId) return;
    log('🎮 Returning to game', options);
    sendMessage({
      type: 'sit_in',
      tableId,
      playerId,
      data: { 
        postDead: options?.postDead ?? false,
        waitForBB: options?.waitForBB ?? false
      }
    });
  }, [tableId, playerId, sendMessage]);

  // Set auto-post blinds preference
  const setAutoPostBlinds = useCallback((enabled: boolean) => {
    if (!tableId || !playerId) return;
    log('⚙️ Setting auto-post blinds:', enabled);
    sendMessage({
      type: 'set_auto_post_blinds',
      tableId,
      playerId,
      data: { enabled }
    });
  }, [tableId, playerId, sendMessage]);

  // Add chips (rebuy) - only when not in active hand
  const addChips = useCallback((amount: number) => {
    if (!tableId || !playerId) return false;
    
    // Check if we're in an active hand
    const phase = tableStateRef.current?.phase;
    if (phase && phase !== 'waiting' && phase !== 'showdown') {
      log('⚠️ Cannot add chips during active hand, phase:', phase);
      return false;
    }
    
    log('💎 Adding chips:', amount);
    sendMessage({
      type: 'add_chips',
      tableId,
      playerId,
      data: { amount }  // Server expects data.amount format
    });
    return true;
  }, [tableId, playerId, sendMessage]);

  // Tournament rebuy - notify server after RPC succeeds
  const tournamentRebuy = useCallback((tournamentId: string, newChips: number) => {
    if (!playerId) return false;
    
    log('💎 Tournament rebuy notification:', { tournamentId, newChips });
    sendMessage({
      type: 'tournament_rebuy',
      tournamentId,
      playerId,
      data: { newChips }
    });
    return true;
  }, [playerId, sendMessage]);

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

  // Check if it's my turn - also try to find seat from players if mySeat is null
  const isMyTurn = useMemo(() => {
    if (!tableState) {
      log('⚠️ isMyTurn: false (no tableState)');
      return false;
    }
    
    // If mySeat is null, try to find it from players array
    let effectiveSeat = mySeat;
    if (effectiveSeat === null && playerId && tableState.players) {
      const myPlayerFromState = tableState.players.find(p => p.playerId === playerId);
      if (myPlayerFromState) {
        effectiveSeat = myPlayerFromState.seatNumber;
        log('🔍 Found my seat from players array:', effectiveSeat);
        // Also update mySeat state for future use
        setMySeat(effectiveSeat);
      }
    }
    
    if (effectiveSeat === null) {
      log('⚠️ isMyTurn: false (mySeat is null)', { 
        playerId, 
        playersInState: tableState.players?.map(p => ({ id: p.playerId, seat: p.seatNumber }))
      });
      return false;
    }
    
    const result = tableState.currentPlayerSeat === effectiveSeat;
    log('🎯 isMyTurn check:', { 
      result, 
      currentPlayerSeat: tableState.currentPlayerSeat, 
      mySeat: effectiveSeat,
      phase: tableState.phase
    });
    return result;
  }, [tableState, mySeat, playerId]);

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

      // Handle window close/refresh - DO NOT send leave_table!
      // Player should stay at table with 'disconnected' status for 60 seconds
      // They can reconnect if it was a network issue or accidental close
      // Player only leaves when explicitly clicking "Покинуть стол" button
      const handleBeforeUnload = () => {
        log('🚨 Window closing - keeping seat reserved for reconnect');
        // Just close WebSocket cleanly - server will mark as disconnected
        // DO NOT send leave_table - player should stay at table!
        if (wsRef.current) {
          wsRef.current.close(1001, 'Window closing');
          wsRef.current = null;
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        mountedRef.current = false;
        disconnect();
      };
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [tableId, playerId]);

  // PRO FEATURES: Action callbacks
  const voteBombPot = useCallback((accept: boolean) => {
    return sendMessage({
      type: 'bomb_pot_vote',
      tableId,
      playerId,
      accept
    });
  }, [sendMessage, tableId, playerId]);

  const voteRunItTwice = useCallback((accept: boolean) => {
    return sendMessage({
      type: 'run_it_twice_vote',
      tableId,
      playerId,
      accept
    });
  }, [sendMessage, tableId, playerId]);

  const requestStraddle = useCallback(() => {
    return sendMessage({
      type: 'straddle_request',
      tableId,
      playerId
    });
  }, [sendMessage, tableId, playerId]);

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
    rebuyAvailable,
    clearRebuyAvailable: () => setRebuyAvailable(null),
    tournamentBreak,
    clearTournamentBreak: () => setTournamentBreak(null),
    
    // Professional timing
    betsBeingCollected,
    phaseTimings,
    showdownReveals,
    winnerAnnouncement,
    clearWinnerAnnouncement: () => setWinnerAnnouncement(null),
    activeBurnCard, // POKERSTARS-STYLE: Burn card animation state

    // PRO FEATURES: Bomb Pot (Industry-style automatic), Straddle, Run It Twice
    bombPotProposal, // Legacy - kept for backwards compatibility
    bombPotActive,   // NEW: Industry-style automatic bomb pot indicator
    runItTwiceProposal,
    runItTwiceBoards,
    straddlePosted,
    voteBombPot, // Legacy - no-op in industry mode
    voteRunItTwice,
    requestStraddle,

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
    sitOut,
    sitIn,
    setAutoPostBlinds,
    addChips,
    sendChatMessage,
    tournamentRebuy,
    
    // Settings
    updateTableSettings: useCallback((settings: {
      // Core timing
      actionTimeSeconds?: number;
      timeBankSeconds?: number;
      // Blinds & Ante
      smallBlind?: number;
      bigBlind?: number;
      ante?: number;
      // Straddle
      straddleEnabled?: boolean;
      mississippiStraddleEnabled?: boolean;
      maxStraddleCount?: number;
      // Advanced Ante
      buttonAnteEnabled?: boolean;
      buttonAnteAmount?: number;
      bigBlindAnteEnabled?: boolean;
      bigBlindAnteAmount?: number;
      // Bomb Pot
      bombPotEnabled?: boolean;
      bombPotMultiplier?: number;
      bombPotInterval?: number;
      bombPotDoubleBoard?: boolean;
      // Chat
      chatEnabled?: boolean;
      chatSlowMode?: boolean;
      chatSlowModeInterval?: number;
      // Run it twice
      runItTwiceEnabled?: boolean;
      // Rake
      rakePercent?: number;
      rakeCap?: number;
      // Auto-start
      autoStartEnabled?: boolean;
      autoStartDelaySeconds?: number;
    }) => {
      return sendMessage({
        type: 'update_table_settings',
        tableId,
        playerId,
        settings
      });
    }, [sendMessage, tableId, playerId]),
    
    // Tournament table movement
    playerMovedToTable,
    clearPlayerMovedToTable: () => setPlayerMovedToTable(null)
  };
}
