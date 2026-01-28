// ============================================
// FULLSCREEN POKER TABLE WRAPPER - Integration with Game Logic
// ============================================
import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Volume2, VolumeX, Settings2, Menu, X, LogOut, Palette, RotateCcw, RotateCw, Eye, Plus, Diamond, History, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNodePokerTable, PokerPlayer, TableState } from '@/hooks/useNodePokerTable';
import { usePokerSounds } from '@/hooks/usePokerSounds';
import { usePokerPreferences } from '@/hooks/usePokerPreferences';
import { useCalibrationSync } from '@/hooks/useCalibrationSync';
import { PokerErrorBoundary } from './PokerErrorBoundary';
import { ConnectionStatusBanner } from './ConnectionStatusBanner';
import { TableSettingsPanel } from './TableSettingsPanel';
import { PersonalSettingsPanel } from './PersonalSettingsPanel';
import { FullscreenPokerTable } from './FullscreenPokerTable';
import { ProActionPanel } from './ProActionPanel';
import { TournamentHUD } from './TournamentHUD';
import { BuyInDialog } from './BuyInDialog';
import { BountyDisplay } from './BountyDisplay';
import { KnockoutNotification, KnockoutEvent } from './KnockoutNotification';
import { BountyLeaderboard } from './BountyLeaderboard';
import { RebuyDialog } from './RebuyDialog';
import { TournamentRebuyDialog } from './TournamentRebuyDialog';
import { SeatRotationControl, getVisualPosition } from './SeatRotationControl';
import { ProTournamentLobby } from './tournament-lobby';
import { TimeBankIndicator } from './TimeBankIndicator';
import { TournamentBreakBanner } from './TournamentBreakBanner';
import { POKERSTARS_TIMER } from '@/constants/pokerTimerConfig';
import { FullHandHistory } from './FullHandHistory';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ThemePageBackground } from './ThemePageBackground';
import { CASH_ACTION_TIMING, TIME_BANK_CONFIG } from '@/config/pokerTimings';
import { ProFeaturesOverlay } from './ProFeaturesOverlay';
import { BombPotIndicator } from './BombPotIndicator';
import { useTimeBankFallback } from '@/hooks/useTimeBankFallback';


// Syndikate branding
import syndikateLogo from '@/assets/syndikate-logo-main.png';

interface FullscreenPokerTableWrapperProps {
  tableId: string;
  playerId: string;
  buyIn: number;
  minBuyIn?: number;
  maxBuyIn?: number;
  playerBalance?: number;
  isSpectator?: boolean;
  isTournament?: boolean;
  tournamentId?: string;
  onLeave?: () => void;
  onBalanceUpdate?: () => void;
  maxSeats?: number;
  wideMode?: boolean; // For Telegram Mini App - wider table
}

export function FullscreenPokerTableWrapper({
  tableId,
  playerId,
  buyIn,
  minBuyIn = 200,
  maxBuyIn = 2000,
  playerBalance = 10000,
  isSpectator = false,
  isTournament = false,
  tournamentId,
  onLeave,
  onBalanceUpdate,
  maxSeats = 6,
  wideMode = false
}: FullscreenPokerTableWrapperProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [turnTimeRemaining, setTurnTimeRemaining] = useState<number | null>(null);
  const [turnTimeTotal, setTurnTimeTotal] = useState<number>(CASH_ACTION_TIMING.default);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPersonalSettings, setShowPersonalSettings] = useState(false);
  const [showBuyInDialog, setShowBuyInDialog] = useState(false);
  const [showRebuyDialog, setShowRebuyDialog] = useState(false);
  const [showTournamentLobby, setShowTournamentLobby] = useState(false);
  const [showBountyLeaderboard, setShowBountyLeaderboard] = useState(false);
  const [showHandHistory, setShowHandHistory] = useState(false);
  const [knockoutEvent, setKnockoutEvent] = useState<KnockoutEvent | null>(null);
  const [selectedSeatForJoin, setSelectedSeatForJoin] = useState<number | null>(null);
  const [isProcessingCashout, setIsProcessingCashout] = useState(false);
  const [actualBuyIn, setActualBuyIn] = useState<number>(buyIn);
  const [isTimeBankActive, setIsTimeBankActive] = useState(false);
  const [autoStraddleEnabled, setAutoStraddleEnabled] = useState(false);
  
  // Full table settings fetched from DB for the settings panel
  const [fullTableSettings, setFullTableSettings] = useState<Record<string, unknown> | null>(null);
  
  // Tournament blinds can desync in WS state; DB poker_tables is authoritative for current SB/BB/ante.
  const [dbBlinds, setDbBlinds] = useState<{ sb: number; bb: number; ante: number } | null>(null);
  
  const { preferences, currentTableTheme, updatePreference } = usePokerPreferences();
  
  // Синхронизация калибровки позиций с Supabase (для Telegram mini-app)
  useCalibrationSync();
  
  const sounds = usePokerSounds();

  // Keep tournament blinds in sync with DB (realtime + polling fallback)
  useEffect(() => {
    const enabled = Boolean(isTournament);
    if (!enabled) {
      setDbBlinds(null);
      return;
    }

    let cancelled = false;

    const fetch = async () => {
      const { data, error } = await supabase
        .from('poker_tables')
        .select('small_blind, big_blind, ante')
        .eq('id', tableId)
        .single();

      if (cancelled) return;
      if (error) return;

      if (data && typeof data.small_blind === 'number' && typeof data.big_blind === 'number') {
        setDbBlinds({
          sb: data.small_blind,
          bb: data.big_blind,
          ante: typeof data.ante === 'number' ? data.ante : 0,
        });
      }
    };

    fetch();

    const channel = supabase
      .channel(`table-blinds-${tableId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'poker_tables',
          filter: `id=eq.${tableId}`,
        },
        () => {
          fetch();
        }
      )
      .subscribe();

    const poll = setInterval(fetch, 15000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [isTournament, tableId]);

  // Fetch full table settings on mount and when settings panel is opened
  // Need to fetch on mount for straddle controls visibility
  useEffect(() => {
    // Fetch immediately on mount, and again if settings panel is opened
    const fetchFullSettings = async () => {
      const { data, error } = await supabase
        .from('poker_tables')
        .select(`
          small_blind, big_blind, ante,
          action_time_seconds, time_bank_seconds,
          straddle_enabled, mississippi_straddle_enabled, max_straddle_count,
          button_ante_enabled, button_ante_amount,
          big_blind_ante_enabled, big_blind_ante_amount,
          bomb_pot_enabled, bomb_pot_multiplier, bomb_pot_interval, bomb_pot_double_board,
          chat_enabled, chat_slow_mode, chat_slow_mode_interval,
          run_it_twice_enabled,
          rake_percent, rake_cap,
          auto_start_enabled, auto_start_delay_seconds
        `)
        .eq('id', tableId)
        .single();
      
      if (error) {
        console.error('[Settings] Failed to fetch table settings:', error);
        return;
      }
      
      if (data) {
        // Map DB snake_case to camelCase for frontend
        setFullTableSettings({
          smallBlind: data.small_blind,
          bigBlind: data.big_blind,
          ante: data.ante ?? 0,
          actionTimeSeconds: data.action_time_seconds ?? 15,
          timeBankSeconds: data.time_bank_seconds ?? 30,
          straddleEnabled: data.straddle_enabled ?? false,
          mississippiStraddleEnabled: data.mississippi_straddle_enabled ?? false,
          maxStraddleCount: data.max_straddle_count ?? 1,
          buttonAnteEnabled: data.button_ante_enabled ?? false,
          buttonAnteAmount: data.button_ante_amount ?? 0,
          bigBlindAnteEnabled: data.big_blind_ante_enabled ?? false,
          bigBlindAnteAmount: data.big_blind_ante_amount ?? 0,
          bombPotEnabled: data.bomb_pot_enabled ?? false,
          bombPotMultiplier: data.bomb_pot_multiplier ?? 2,
          bombPotInterval: data.bomb_pot_interval ?? 10,
          bombPotDoubleBoard: data.bomb_pot_double_board ?? false,
          chatEnabled: data.chat_enabled ?? true,
          chatSlowMode: data.chat_slow_mode ?? false,
          chatSlowModeInterval: data.chat_slow_mode_interval ?? 5,
          runItTwiceEnabled: data.run_it_twice_enabled ?? false,
          rakePercent: data.rake_percent ?? 0,
          rakeCap: data.rake_cap ?? 0,
          autoStartEnabled: data.auto_start_enabled ?? true,
          autoStartDelaySeconds: data.auto_start_delay_seconds ?? 3,
        });
      }
    };
    
    // Fetch on mount
    if (!fullTableSettings) {
      fetchFullSettings();
    }
    
    // Also refetch when settings panel opens (to get latest values)
    if (showSettings) {
      fetchFullSettings();
    }
  }, [showSettings, tableId, fullTableSettings]);

  // Connection is auto-managed by useNodePokerTable (connects when tableId/playerId present)

  // Use Node.js WebSocket server
  const pokerTable = useNodePokerTable({ tableId, playerId, buyIn: actualBuyIn });
  
  const {
    isConnected, isConnecting, error, tableState, myCards, mySeat, myPlayer, isMyTurn, canCheck, callAmount, lastAction, showdownResult,
    connect, disconnect, joinTable, fold, check, call, raise, allIn, addChips, sitOut, sitIn, setAutoPostBlinds,
    rebuyAvailable, clearRebuyAvailable,
    tournamentBreak, clearTournamentBreak,
    // Professional timing data
    betsBeingCollected, phaseTimings,
    // Professional showdown and winner announcement
    showdownReveals, winnerAnnouncement, clearWinnerAnnouncement,
    // Tournament rebuy
    tournamentRebuy,
    // Burn card animation
    activeBurnCard,
    // Tournament table movement
    playerMovedToTable, clearPlayerMovedToTable,
    // Table settings
    updateTableSettings,
    // PRO FEATURES: Bomb Pot (Industry-style automatic), Straddle, Run It Twice
    bombPotProposal, // Legacy
    bombPotActive,   // NEW: Industry-style automatic
    runItTwiceProposal,
    straddlePosted,
    voteBombPot, // Legacy - no-op
    voteRunItTwice,
    requestStraddle
  } = pokerTable;

  const effectiveSmallBlind = (isTournament ? dbBlinds?.sb : undefined) ?? tableState?.smallBlindAmount ?? 10;
  const effectiveBigBlind = (isTournament ? dbBlinds?.bb : undefined) ?? tableState?.bigBlindAmount ?? 20;
  const effectiveAnte = (isTournament ? dbBlinds?.ante : undefined) ?? tableState?.anteAmount ?? 0;

  // Check if player can join (not yet seated) - only for cash games
  // Tournaments use auto-seating from participant data
  // Spectators cannot join
  const canJoinTable = useMemo(() => {
    return isConnected && !myPlayer && mySeat === null && !isTournament && !isSpectator;
  }, [isConnected, myPlayer, mySeat, isTournament, isSpectator]);

  // Table readiness hint (why hand isn't starting)
  const startHandHint = useMemo(() => {
    const players = tableState?.players ?? [];
    const activePlayers = players.filter((p) => p.isActive && !p.isSittingOut && !p.isDisconnected);
    const sittingOutPlayers = players.filter((p) => p.isSittingOut);
    const required = 2;

    return {
      required,
      activeCount: activePlayers.length,
      canStart: activePlayers.length >= required,
      sittingOutPlayers
    };
  }, [tableState?.players]);

  // Get occupied seats
  const occupiedSeats = useMemo(() => {
    return tableState?.players.map(p => p.seatNumber) || [];
  }, [tableState?.players]);

  useEffect(() => { sounds.setEnabled(soundEnabled); }, [soundEnabled]);

  // Show straddle notification when posted
  useEffect(() => {
    if (straddlePosted) {
      const msg = straddlePosted.isMississippi 
        ? `⚡ ${straddlePosted.playerName} делает Mississippi Straddle: ${straddlePosted.amount}`
        : `⚡ ${straddlePosted.playerName} делает Straddle: ${straddlePosted.amount}`;
      toast.info(msg, { duration: 3000 });
    }
  }, [straddlePosted]);

  // POKERSTARS-STYLE TIMER: Server-authoritative timing
  // Server sends: timeRemaining, actionStartTime, isTimeBankPhase
  // Client syncs from server and counts down locally
  // CRITICAL FIX: actionStartTime is the PRIMARY reset signal
  // Server sets actionStartTime = Date.now() for EVERY new turn/phase
  const timerResetKey = useMemo(() => {
    // actionStartTime changes on every turn - this is the key reset signal
    // If server sends same actionStartTime, timer continues from current position
    // If server sends new actionStartTime, timer MUST reset
    const actionTs = tableState?.actionStartTime || 0;
    const phase = tableState?.phase || 'waiting';
    const seat = tableState?.currentPlayerSeat ?? 'none';
    const handId = tableState?.handId || 'no-hand';
    const isTimeBank = tableState?.isTimeBankPhase ? 'tb' : 'main';
    
    // Use full precision for actionStartTime to catch every change
    return `${handId}-${phase}-${seat}-${isTimeBank}-${actionTs}`;
  }, [tableState?.handId, tableState?.phase, tableState?.currentPlayerSeat, tableState?.isTimeBankPhase, tableState?.actionStartTime]);

  // --- TIME BANK UI FALLBACK (UI-only) ---
  const timeBankSliceSeconds = useMemo(() => {
    const rawSettings: any = fullTableSettings as any;
    const fromDb =
      (typeof rawSettings?.timeBankSeconds === 'number' ? rawSettings.timeBankSeconds : undefined) ??
      (typeof rawSettings?.time_bank_seconds === 'number' ? rawSettings.time_bank_seconds : undefined);
    const fromWs = typeof tableState?.timeBankSeconds === 'number' ? tableState.timeBankSeconds : undefined;
    const fromConfig = isTournament ? TIME_BANK_CONFIG.tournament.initial : TIME_BANK_CONFIG.cash.initial;
    return (fromWs ?? fromDb ?? fromConfig ?? 30) as number;
  }, [fullTableSettings, tableState?.timeBankSeconds, isTournament]);

  const serverIsTimeBankPhase = Boolean(tableState?.isTimeBankPhase);
  const currentTurnPlayerTimeBank =
    (tableState?.currentPlayerTimeBank ?? myPlayer?.timeBankRemaining ?? 0) as number;

  const tbFallback = useTimeBankFallback({
    serverIsTimeBankPhase,
    mainTurnRemaining: turnTimeRemaining,
    currentPlayerTimeBank: currentTurnPlayerTimeBank,
    timeBankSliceSeconds,
    handId: tableState?.handId,
    currentPlayerSeat: tableState?.currentPlayerSeat,
    currentPhase: tableState?.phase,
    isMyTurn,
  });

  const timeBankUiActive = serverIsTimeBankPhase || tbFallback.isActive;
  const displayTurnTimeRemaining = serverIsTimeBankPhase
    ? turnTimeRemaining
    : tbFallback.isActive
      ? tbFallback.remainingSeconds
      : turnTimeRemaining;
  const displayTurnTimeTotal = serverIsTimeBankPhase
    ? turnTimeTotal
    : tbFallback.isActive
      ? tbFallback.totalSeconds
      : turnTimeTotal;

  // Track previous phase for phase-change detection
  const prevPhaseRef = useRef<string>('');
  const prevSeatRef = useRef<number | null>(null);

  // Track previous timerResetKey to detect new turn/phase
  const prevTimerResetKeyRef = useRef<string>('');
  // CRITICAL FIX: Track actionStartTime separately for reliable turn change detection
  const prevActionStartTimeRef = useRef<number>(0);

  // Store the deadline in a ref so it persists across re-renders
  // Only recalculate when turn/phase actually changes
  const deadlineMsRef = useRef<number>(0);
  
  // FIX: Track MAXIMUM actionStartTime seen for this turn to ignore stale updates
  // When server broadcasts redundant state_updates, older ones may arrive after newer ones.
  // We ignore any update where actionStartTime < maxActionStartTime for the same turn.
  const maxActionStartTimeForTurnRef = useRef<number>(0);
  
  // FIX: "Sticky" time bank - once we enter time bank phase, don't exit until turn/seat changes
  const stickyTimeBankActiveRef = useRef<boolean>(false);
  const stickyTimeBankTurnIdRef = useRef<string>('');
  
  useEffect(() => {
    // POKERSTARS-STYLE: Use server's actionTimeTotal (phase-aware) or fallback to table settings from DB.
    // This prevents rare ticks where WS snapshot omits timing fields and UI falls back to 15s.
    const toNumberOrUndef = (v: unknown): number | undefined => {
      if (v === null || v === undefined) return undefined;
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    // DB settings can be camelCase (frontend) or snake_case (raw row / older code paths)
    const rawSettings = fullTableSettings as any;
    const dbActionTime =
      toNumberOrUndef(rawSettings?.actionTimeSeconds) ??
      toNumberOrUndef(rawSettings?.action_time_seconds);
    const dbTimeBank =
      toNumberOrUndef(rawSettings?.timeBankSeconds) ??
      toNumberOrUndef(rawSettings?.time_bank_seconds);

    const actionTimer = tableState?.actionTimeTotal || tableState?.actionTimer || dbActionTime || 15;
    
    // DIAGNOSTIC: Log where action time comes from
    console.log('[TIMER CONFIG]', {
      actionTimeTotal: tableState?.actionTimeTotal,
      actionTimer: tableState?.actionTimer,
      dbActionTime,
      dbTimeBank,
      finalActionTimer: actionTimer,
      phase: tableState?.phase,
      seat: tableState?.currentPlayerSeat
    });
    if (tableState?.currentPlayerSeat === null || tableState?.currentPlayerSeat === undefined) {
      setTurnTimeRemaining(null);
      setIsTimeBankActive(false);
      prevPhaseRef.current = tableState?.phase || 'waiting';
      prevSeatRef.current = null;
      return;
    }

    // Parse time bank phase from server (will be made "sticky" below)
    const isTimeBankPhase = Boolean(tableState?.isTimeBankPhase);

    const now = Date.now();
    const serverRemaining = tableState?.timeRemaining;
    const actionStartTime = tableState?.actionStartTime;

    // CRITICAL FIX: Detect phase change or seat change separately from timerResetKey
    // This ensures timer ALWAYS resets on flop→turn→river transitions
    const currentPhase = tableState?.phase || 'waiting';
    const currentSeat = tableState?.currentPlayerSeat;
    const phaseChanged = prevPhaseRef.current !== currentPhase;
    const seatChanged = prevSeatRef.current !== currentSeat;

    // ============================================
    // FIX #1: Ignore stale (outdated) state updates
    // ============================================
    // Server can broadcast redundant state_updates out of order.
    // If this update has an OLDER actionStartTime than we've already seen for this turn,
    // skip processing to avoid "jumping back" the timer or resetting time bank.
    const turnId = `${tableState?.handId}-${currentPhase}-${currentSeat}`;
    const prevTurnId = `${tableState?.handId}-${prevPhaseRef.current}-${prevSeatRef.current}`;
    const isSameTurn = turnId === prevTurnId && !phaseChanged && !seatChanged;

    if (isSameTurn && actionStartTime && maxActionStartTimeForTurnRef.current > 0) {
      // Same turn - check if this update is stale
      if (actionStartTime < maxActionStartTimeForTurnRef.current) {
        console.log('[TIMER SYNC] Ignoring STALE update:', {
          receivedActionStartTime: actionStartTime,
          maxSeenActionStartTime: maxActionStartTimeForTurnRef.current,
          turnId,
        });
        return; // Skip this stale update entirely
      }
    }
    
    // Track the maximum actionStartTime we've seen for this turn
    if (actionStartTime && actionStartTime > 0) {
      if (!isSameTurn) {
        // New turn - reset tracking
        maxActionStartTimeForTurnRef.current = actionStartTime;
      } else if (actionStartTime > maxActionStartTimeForTurnRef.current) {
        maxActionStartTimeForTurnRef.current = actionStartTime;
      }
    }

    prevPhaseRef.current = currentPhase;
    prevSeatRef.current = currentSeat ?? null;

    // Detect if this is a NEW turn/phase
    // CRITICAL FIX: actionStartTime change is the PRIMARY indicator of a new turn
    // Phase/seat change are SECONDARY indicators (catch edge cases)
    const actionStartTimeChanged = actionStartTime && actionStartTime !== (prevActionStartTimeRef.current || 0);
    const isNewTurn = timerResetKey !== prevTimerResetKeyRef.current || phaseChanged || seatChanged || actionStartTimeChanged;
    prevTimerResetKeyRef.current = timerResetKey;
    prevActionStartTimeRef.current = actionStartTime || 0;

    // ============================================
    // FIX #2: Sticky Time Bank
    // ============================================
    // Once we enter time bank phase for this turn, DON'T exit it even if
    // server sends updates with isTimeBankPhase=false (stale/redundant broadcasts).
    // Only reset when turn/seat changes.
    if (!isSameTurn || isNewTurn) {
      stickyTimeBankActiveRef.current = false;
      stickyTimeBankTurnIdRef.current = turnId;
    }
    
    if (isTimeBankPhase) {
      stickyTimeBankActiveRef.current = true;
    }
    
    // Use sticky time bank: if we ever saw isTimeBankPhase=true for this turn, stay in it
    const effectiveIsTimeBankPhase = stickyTimeBankActiveRef.current || isTimeBankPhase;
    
    // Update UI state with sticky logic
    if (effectiveIsTimeBankPhase !== isTimeBankActive) {
      console.log('[TIME BANK STICKY]', {
        serverIsTimeBankPhase: isTimeBankPhase,
        stickyActive: stickyTimeBankActiveRef.current,
        effectiveIsTimeBankPhase,
        turnId,
      });
    }
    setIsTimeBankActive(effectiveIsTimeBankPhase);

    // POKERSTARS-STYLE SYNC:
    // 1. On NEW turn: calculate deadline from actionStartTime (server's authoritative start)
    // 2. During turn: only adjust if server's remaining differs significantly (drift correction)
    
    if (isNewTurn) {
      // DEBUG: Log timer reset details
      console.log('[TIMER SYNC] New turn detected:', {
        phase: currentPhase,
        seat: currentSeat,
        actionTimer,
        actionStartTime,
        serverRemaining,
        phaseChanged,
        seatChanged,
        isTimeBankPhase,
        // Extra debug info
        tableStateActionTimeTotal: tableState?.actionTimeTotal,
        tableStateActionTimer: tableState?.actionTimer,
        dbActionTime,
      });
      
      // NEW TURN: Set up fresh timer
      // CRITICAL FIX: Use server's actionTimeTotal (which is ALWAYS fresh per-turn)
      // rather than cached actionTimer or DB fallback
      const effectiveActionTime = tableState?.actionTimeTotal ?? actionTimer;
      
      if (effectiveIsTimeBankPhase) {
        // Time bank: DO NOT use `serverRemaining` as the *total* (it changes every tick).
        // Use server-provided `actionTimeTotal` (time bank slice total) when available.
        const tbTotal =
          (typeof tableState?.actionTimeTotal === 'number' && Number.isFinite(tableState.actionTimeTotal)
            ? tableState.actionTimeTotal
            : (typeof dbTimeBank === 'number' && Number.isFinite(dbTimeBank)
              ? dbTimeBank
              : effectiveActionTime));

        setTurnTimeTotal(tbTotal);

        // IMPORTANT: actionStartTime is an absolute epoch ms from the server.
        // If the client's clock is skewed (ahead/behind), using it directly can show extra seconds and cause
        // "early sit-out" while UI still shows 6–7s. So we prefer serverRemaining when skew is detected.
        const hasServerRemaining = typeof serverRemaining === 'number' && Number.isFinite(serverRemaining);
        const hasActionStartTime = typeof actionStartTime === 'number' && Number.isFinite(actionStartTime) && actionStartTime > 0;

        const deadlineFromRemaining = hasServerRemaining ? (now + Math.max(0, serverRemaining) * 1000) : null;
        const deadlineFromStart = hasActionStartTime ? (actionStartTime + tbTotal * 1000) : null;

        let chosen: number | null = null;
        let chosenSource: 'start' | 'remaining' | 'now' = 'now';

        if (deadlineFromStart !== null && deadlineFromRemaining !== null) {
          const sr = serverRemaining as number;
          const ast = actionStartTime as number;
          // Estimate skew: serverNow ~= actionStartTime + (total - remaining)
          const impliedServerNow = ast + (tbTotal - sr) * 1000;
          const clockSkewMs = now - impliedServerNow;
          const startInFutureMs = ast - now;

          // If start timestamp is in the future (client clock behind) OR skew is noticeable, trust remaining.
          const skewTooHigh = Math.abs(clockSkewMs) > 1500;
          const startTooFuture = startInFutureMs > 1500;

          chosen = (skewTooHigh || startTooFuture) ? deadlineFromRemaining : deadlineFromStart;
          chosenSource = (skewTooHigh || startTooFuture) ? 'remaining' : 'start';

          console.log('[TIMER SYNC] Time bank clock skew estimate:', {
            clockSkewMs,
            startInFutureMs,
            chosenSource,
            tbTotal,
            serverRemaining: sr,
          });
        } else if (deadlineFromRemaining !== null) {
          chosen = deadlineFromRemaining;
          chosenSource = 'remaining';
        } else if (deadlineFromStart !== null) {
          // Only trust absolute start if it's not in the future by a noticeable margin.
          if (actionStartTime <= now + 1500 && (now - actionStartTime) < 120000) {
            chosen = deadlineFromStart;
            chosenSource = 'start';
          }
        }

        if (chosen === null) {
          chosen = now + tbTotal * 1000;
          chosenSource = 'now';
        }

        deadlineMsRef.current = chosen;
        console.log('[TIMER SYNC] Time bank deadline chosen:', {
          chosenSource,
          deadline: deadlineMsRef.current,
          remainingSeconds: (deadlineMsRef.current - now) / 1000,
          tbTotal,
          serverRemaining,
          actionStartTime,
        });
      } else {
        // Main timer: always starts at full actionTime (server's per-turn value)
        setTurnTimeTotal(effectiveActionTime);
        
        // FIX: For NEW turn, if serverRemaining is 0 or very low (< 1s), this is a stale/race update.
        // The server just started the turn, so serverRemaining should be ~effectiveActionTime.
        // Trust actionStartTime in this case, or fallback to full effectiveActionTime.
        const rawServerRemaining = serverRemaining;
        let correctedServerRemaining = rawServerRemaining;
        
        // If it's a genuinely new turn and serverRemaining is suspiciously low, correct it
        if (typeof rawServerRemaining === 'number' && rawServerRemaining < 1 && isNewTurn) {
          console.log('[TIMER SYNC] CORRECTING suspiciously low serverRemaining on new turn:', {
            rawServerRemaining,
            correctedTo: effectiveActionTime,
            reason: 'serverRemaining < 1s on brand new turn indicates stale update',
          });
          correctedServerRemaining = effectiveActionTime;
        }
        
        const hasServerRemaining = typeof correctedServerRemaining === 'number' && Number.isFinite(correctedServerRemaining);
        const hasActionStartTime = typeof actionStartTime === 'number' && Number.isFinite(actionStartTime) && actionStartTime > 0;

        const deadlineFromRemaining = hasServerRemaining ? (now + Math.max(0, correctedServerRemaining) * 1000) : null;
        const deadlineFromStart = hasActionStartTime ? (actionStartTime + effectiveActionTime * 1000) : null;

        let chosen: number | null = null;
        let chosenSource: 'start' | 'remaining' | 'now' = 'now';

        if (deadlineFromStart !== null && deadlineFromRemaining !== null) {
          const sr = correctedServerRemaining as number;
          const ast = actionStartTime as number;
          const impliedServerNow = ast + (effectiveActionTime - sr) * 1000;
          const clockSkewMs = now - impliedServerNow;
          const startInFutureMs = ast - now;

          const skewTooHigh = Math.abs(clockSkewMs) > 1500;
          const startTooFuture = startInFutureMs > 1500;

          chosen = (skewTooHigh || startTooFuture) ? deadlineFromRemaining : deadlineFromStart;
          chosenSource = (skewTooHigh || startTooFuture) ? 'remaining' : 'start';

          console.log('[TIMER SYNC] Main clock skew estimate:', {
            clockSkewMs,
            startInFutureMs,
            chosenSource,
            effectiveActionTime,
            serverRemaining: sr,
            rawServerRemaining,
          });
        } else if (deadlineFromRemaining !== null) {
          chosen = deadlineFromRemaining;
          chosenSource = 'remaining';
        } else if (deadlineFromStart !== null) {
          if (actionStartTime <= now + 1500 && (now - actionStartTime) < 120000) {
            chosen = deadlineFromStart;
            chosenSource = 'start';
          }
        }

        if (chosen === null) {
          chosen = now + effectiveActionTime * 1000;
          chosenSource = 'now';
        }

        deadlineMsRef.current = chosen;
        console.log('[TIMER SYNC] Main deadline chosen:', {
          chosenSource,
          deadline: deadlineMsRef.current,
          remainingSeconds: (deadlineMsRef.current - now) / 1000,
          effectiveActionTime,
          serverRemaining: correctedServerRemaining,
          rawServerRemaining,
          actionStartTime,
        });
      }
    } else {
      // SAME TURN: Check for drift from server
      // Only resync if server's remaining differs by more than 2 seconds
      if (serverRemaining !== null && serverRemaining !== undefined) {
        const localRemaining = Math.max(0, (deadlineMsRef.current - now) / 1000);
        const drift = Math.abs(serverRemaining - localRemaining);
        
        if (drift > 2) {
          // Significant drift - resync to server
          console.log('[TIMER SYNC] Drift correction:', { drift, serverRemaining, localRemaining });
          deadlineMsRef.current = now + serverRemaining * 1000;
        }
      }
    }

    const getRemaining = () => Math.max(0, (deadlineMsRef.current - Date.now()) / 1000);

    // Store as precise seconds for SmoothAvatarTimer to maintain 60fps animation
    // Using fractional seconds allows timer ring to animate smoothly
    setTurnTimeRemaining(getRemaining());

    // Update frequently for smooth UI - SmoothAvatarTimer handles interpolation
    // 200ms gives good balance between smoothness and performance
    const interval = setInterval(() => {
      setTurnTimeRemaining(getRemaining());
    }, 200);

    return () => clearInterval(interval);
  }, [
    timerResetKey,
    tableState?.actionTimer,
    tableState?.actionTimeTotal, // POKERSTARS-STYLE: Phase-aware timing
    tableState?.timeRemaining,
    tableState?.actionStartTime,
    tableState?.isTimeBankPhase,
    // If settings are edited, fallbacks (dbActionTime/dbTimeBank) must refresh too.
    fullTableSettings
  ]);

  // Auto-connect handled inside useNodePokerTable

  // Auto-join for tournament players - they already have assigned seats
  // Skip for spectators - they just watch
  const hasAutoJoinedRef = useRef(false);
  useEffect(() => {
    if (!isTournament || !tournamentId || !isConnected || myPlayer || hasAutoJoinedRef.current || isSpectator) {
      return;
    }

    // Fetch player's assigned seat from tournament participants
    const autoJoinTournament = async () => {
      try {
        const { data, error } = await supabase.rpc('get_player_tournament_table', {
          p_tournament_id: tournamentId,
          p_player_id: playerId
        });

        if (error) {
          console.error('[Tournament AutoJoin] Error fetching seat:', error);
          return;
        }

        const assignment = data as any;
        if (assignment?.success && assignment?.table_assigned && assignment?.seat_number !== undefined) {
          hasAutoJoinedRef.current = true;
          console.log('[Tournament AutoJoin] Joining seat', assignment.seat_number, 'with chips', assignment.chips);
          
          // Join at assigned seat with tournament chips
          setActualBuyIn(assignment.chips || 0);
          joinTable(assignment.seat_number);
          toast.success(`Вы за столом: место ${assignment.seat_number + 1}`);
        }
      } catch (err) {
        console.error('[Tournament AutoJoin] Failed:', err);
      }
    };

    autoJoinTournament();
  }, [isTournament, tournamentId, isConnected, myPlayer, playerId, joinTable]);

  // POKERSTARS-STYLE: Auto sit-in for tournament players returning to table
  // When player opens their tournament table and they're sitting_out, automatically activate them
  // CRITICAL: Do NOT auto sit-in during an active hand to prevent race conditions with auto-fold
  const hasAutoSitInRef = useRef(false);
  const lastSitInTimeRef = useRef(0);
  
  useEffect(() => {
    // Only for tournaments, when player is connected, seated but sitting out
    if (!isTournament || !isConnected || !myPlayer || isSpectator) {
      return;
    }
    
    // POKERSTARS-STYLE: Determine if a hand is in progress
    const handInProgress = tableState?.phase && 
      ['preflop', 'flop', 'turn', 'river', 'showdown'].includes(tableState.phase);
    
    // CRITICAL: Do NOT auto sit-in if:
    // 1. Already auto-sat-in recently (within 5 seconds) - prevent spamming
    // 2. A hand is in progress - let the current hand complete first
    // 3. It's the player's turn - they timed out and should stay out until hand ends
    const now = Date.now();
    const recentlySatIn = (now - lastSitInTimeRef.current) < 5000;
    const isPlayersTurn = isMyTurn;
    
    // If player is sitting out, auto-activate them ONLY between hands
    if (myPlayer.isSittingOut && !hasAutoSitInRef.current && !recentlySatIn) {
      // If hand is in progress, wait for it to end
      if (handInProgress) {
        console.log('[Tournament AutoSitIn] Waiting for hand to complete before auto-activating');
        return;
      }
      
      // If it's somehow the player's turn, don't interrupt
      if (isPlayersTurn) {
        console.log('[Tournament AutoSitIn] Player has turn - skipping auto sit-in');
        return;
      }
      
      hasAutoSitInRef.current = true;
      lastSitInTimeRef.current = now;
      console.log('[Tournament AutoSitIn] Player returning from sit-out, auto-activating (between hands)');
      
      // Small delay to ensure connection is stable
      setTimeout(() => {
        sitIn();
        toast.success('Добро пожаловать обратно! Вы снова в игре.', {
          icon: '🎮',
          duration: 3000
        });
      }, 500);
    }
    
    // Reset flag only when player becomes active AND hand is not in progress
    // This prevents the loop: timeout → sitting_out → auto sit-in → active → ref reset → timeout...
    if (!myPlayer.isSittingOut && !handInProgress) {
      hasAutoSitInRef.current = false;
    }
  }, [isTournament, isConnected, myPlayer, isSpectator, sitIn, tableState?.phase, isMyTurn]);

  // TOURNAMENT: Auto-redirect when player is moved to another table
  useEffect(() => {
    if (!playerMovedToTable || !isTournament) return;
    
    const { newTableId, newSeat, tournamentId: eventTournamentId } = playerMovedToTable;
    
    console.log('[Tournament Move] Player moved to new table:', {
      newTableId,
      newSeat,
      currentTableId: tableId,
      tournamentId: eventTournamentId || tournamentId
    });
    
    // Show notification
    toast.info('Вас пересадили за другой стол', {
      icon: '🔄',
      duration: 3000
    });
    
    // Clear the event to prevent multiple redirects
    clearPlayerMovedToTable();
    
    // Small delay to allow animation/notification to show
    setTimeout(() => {
      // Construct the new URL for the new table
      const effectiveTournamentId = eventTournamentId || tournamentId;
      
      // For wideMode (Telegram Mini App), navigate within the app
      // For desktop, use window.location or router
      if (wideMode) {
        // Telegram Mini App - update URL/state to new table
        const newUrl = `/tournament/${effectiveTournamentId}/table/${newTableId}`;
        console.log('[Tournament Move] Redirecting to:', newUrl);
        window.location.href = newUrl;
      } else {
        // Desktop - redirect to new table
        const newUrl = `/tournament/${effectiveTournamentId}/table/${newTableId}`;
        console.log('[Tournament Move] Redirecting to:', newUrl);
        window.location.href = newUrl;
      }
    }, 500);
    
  }, [playerMovedToTable, isTournament, tableId, tournamentId, wideMode, clearPlayerMovedToTable]);

  const previousPhaseRef = useRef<string | null>(null);
  
  // Play sounds for actions
  useEffect(() => {
    if (lastAction) {
      switch (lastAction.action) {
        case 'check': 
          sounds.playCheck(); 
          break;
        case 'call': 
          sounds.playCall();
          break;
        case 'bet':
          sounds.playBet();
          break;
        case 'raise': 
          sounds.playRaise(); 
          break;
        case 'fold': 
          sounds.playFold(); 
          break;
        case 'allin': 
          sounds.playAllIn(); 
          break;
      }
    }
  }, [lastAction, sounds]);

  // Phase change sounds - synchronized with card animations
  // Animation delays from OptimizedCommunityCards.tsx and HeroCards:
  // - Community cards (flop): delay = index * 0.15s (0ms, 150ms, 300ms)
  // - Hero cards (preflop): delay = idx * 0.1s (0ms, 100ms) 
  // - Spring animation duration ~200-300ms
  useEffect(() => {
    const phase = tableState?.phase;
    if (phase && phase !== previousPhaseRef.current) {
      const prevPhase = previousPhaseRef.current;
      previousPhaseRef.current = phase;
      
      // Play sounds based on phase transitions
      if (phase === 'preflop' && prevPhase !== 'preflop') {
        // New hand - shuffle first, then deal cards quickly
        sounds.playShuffle();
        // Deal sounds synced with faster animations
        setTimeout(() => sounds.playDeal(), 90);   // First hole card
        setTimeout(() => sounds.playDeal(), 150);  // Second hole card
      } else if (phase === 'flop') {
        // Flop - 3 cards quickly
        setTimeout(() => sounds.playDeal(), 30);   // First flop card
        setTimeout(() => sounds.playDeal(), 110);  // Second flop card  
        setTimeout(() => sounds.playDeal(), 190);  // Third flop card
      } else if (phase === 'turn') {
        // Turn - 1 card
        setTimeout(() => sounds.playDeal(), 70);
      } else if (phase === 'river') {
        // River - 1 card
        setTimeout(() => sounds.playDeal(), 70);
      }
      // Showdown is silent - win sound plays when pot is collected
    }
  }, [tableState?.phase, sounds]);

  // Winner sounds - only one chip slide sound per showdown
  const lastShowdownIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (showdownResult && showdownResult.winners.length > 0) {
      // Use handId or pot+winners as unique key to prevent duplicate sounds
      const showdownKey = `${tableState?.handId || ''}_${showdownResult.pot}_${showdownResult.winners.map(w => w.playerId).join(',')}`;
      if (lastShowdownIdRef.current !== showdownKey) {
        lastShowdownIdRef.current = showdownKey;
        sounds.playChipSlide();
      }
    }
  }, [showdownResult, tableState?.handId, sounds]);

  // Timer warning sounds when it's my turn - only play once at specific thresholds
  const timerSoundPlayedRef = useRef<Set<number>>(new Set());
  
  useEffect(() => {
    // Reset when it's not my turn
    if (!isMyTurn) {
      timerSoundPlayedRef.current.clear();
      return;
    }
    
    if (turnTimeRemaining === null) return;
    
    // Only play at specific thresholds, once per threshold
    const threshold = turnTimeRemaining;
    if (timerSoundPlayedRef.current.has(threshold)) return;
    
    if (threshold === 10) {
      timerSoundPlayedRef.current.add(10);
      sounds.playTimerWarning();
    } else if (threshold === 5) {
      // Single critical warning at 5 seconds, not every second
      timerSoundPlayedRef.current.add(5);
      sounds.playTimerCritical();
    } else if (threshold === 0) {
      timerSoundPlayedRef.current.add(0);
      sounds.playTimerExpired();
    }
  }, [turnTimeRemaining, isMyTurn, sounds]);
  
  // Play sound when it becomes my turn - track to prevent duplicates
  const prevIsMyTurnRef = useRef(false);
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurnRef.current) {
      sounds.playMyTurn();
    }
    prevIsMyTurnRef.current = isMyTurn;
  }, [isMyTurn, sounds]);

  // Auto-show rebuy dialog when tournament rebuy is available
  useEffect(() => {
    if (rebuyAvailable && isTournament) {
      setShowRebuyDialog(true);
      toast.info(`Ребай доступен! Осталось ${rebuyAvailable.timeoutSeconds} сек`, {
        duration: 5000
      });
    }
  }, [rebuyAvailable, isTournament]);

  // Cashout - return diamonds when leaving table
  const performCashout = useCallback(async () => {
    if (!myPlayer || isProcessingCashout) return;
    
    setIsProcessingCashout(true);
    try {
      const stackToReturn = myPlayer.stack;
      
      if (stackToReturn > 0) {
        const { data, error: cashoutError } = await supabase.functions.invoke('poker-cashout', {
          body: {
            playerId,
            tableId,
            amount: stackToReturn,
            action: 'cashout'
          }
        });

        if (cashoutError) {
          console.error('Cashout error:', cashoutError);
          toast.error('Ошибка возврата алмазов');
        } else {
          toast.success(`Возвращено ${stackToReturn.toLocaleString()} 💎`);
          onBalanceUpdate?.();
        }
      }
    } catch (err) {
      console.error('Cashout failed:', err);
    } finally {
      setIsProcessingCashout(false);
    }
  }, [myPlayer, playerId, tableId, isProcessingCashout, onBalanceUpdate]);

  const handleLeave = useCallback(async () => {
    // Return diamonds first
    await performCashout();
    
    disconnect();
    onLeave?.();
  }, [disconnect, onLeave, performCashout]);

  // Handle seat click - show buy-in dialog for seat selection
  const handleSeatClick = useCallback((seatNumber: number) => {
    if (canJoinTable) {
      setSelectedSeatForJoin(seatNumber);
      setShowBuyInDialog(true);
    }
  }, [canJoinTable]);
  
  // Handle buy-in confirmation
  const handleBuyInConfirm = useCallback(async (seatNumber: number, buyInAmount: number) => {
    setShowBuyInDialog(false);
    
    // Deduct diamonds from wallet
    try {
      const { data, error: buyInError } = await supabase.functions.invoke('poker-cashout', {
        body: {
          playerId,
          tableId,
          amount: buyInAmount,
          action: 'buy_in'
        }
      });

      if (buyInError || data?.error) {
        toast.error(data?.error || 'Ошибка списания алмазов');
        return;
      }
      
      // Update actual buy-in for WebSocket
      setActualBuyIn(buyInAmount);
      
      // Join table with selected seat
      joinTable(seatNumber);
      toast.success(`Вход за ${buyInAmount.toLocaleString()} 💎`);
      onBalanceUpdate?.();
    } catch (err) {
      console.error('Buy-in failed:', err);
      toast.error('Ошибка входа за стол');
    }
  }, [playerId, tableId, joinTable, onBalanceUpdate]);

  // Handle rebuy - add chips when not in active hand
  const handleRebuyConfirm = useCallback(async (seatNumber: number, rebuyAmount: number) => {
    setShowRebuyDialog(false);
    
    // Can only rebuy when not in active hand
    const phase = tableState?.phase;
    if (phase && phase !== 'waiting' && phase !== 'showdown') {
      toast.error('Докупка доступна только между раздачами');
      return;
    }
    
    try {
      // Deduct diamonds from wallet first
      const { data, error: rebuyError } = await supabase.functions.invoke('poker-cashout', {
        body: {
          playerId,
          tableId,
          amount: rebuyAmount,
          action: 'buy_in' // Same action as buy_in for wallet deduction
        }
      });

      if (rebuyError || data?.error) {
        toast.error(data?.error || 'Недостаточно алмазов');
        return;
      }
      
      // Send add_chips to server
      const success = addChips(rebuyAmount);
      if (success) {
        toast.success(`Докупка +${rebuyAmount.toLocaleString()} 💎`);
        onBalanceUpdate?.();
      } else {
        toast.error('Докупка недоступна во время раздачи');
      }
    } catch (err) {
      console.error('Rebuy failed:', err);
      toast.error('Ошибка докупки');
    }
  }, [playerId, tableId, tableState?.phase, addChips, onBalanceUpdate]);

  // Check if rebuy is available (not in active hand)
  const canRebuy = useMemo(() => {
    if (!myPlayer) return false;
    const phase = tableState?.phase;
    return !phase || phase === 'waiting' || phase === 'showdown';
  }, [myPlayer, tableState?.phase]);

  const handleSettingsSave = useCallback((settings: any) => {
    console.log('Saving settings:', settings);
    
    // Send ALL settings to server via WebSocket
    const success = updateTableSettings({
      // Core timing
      actionTimeSeconds: settings.actionTimeSeconds,
      timeBankSeconds: settings.timeBankSeconds,
      // Blinds & Ante
      smallBlind: settings.smallBlind,
      bigBlind: settings.bigBlind,
      ante: settings.ante,
      // Straddle
      straddleEnabled: settings.straddleEnabled,
      mississippiStraddleEnabled: settings.mississippiStraddleEnabled,
      maxStraddleCount: settings.maxStraddleCount,
      // Advanced Ante
      buttonAnteEnabled: settings.buttonAnteEnabled,
      buttonAnteAmount: settings.buttonAnteAmount,
      bigBlindAnteEnabled: settings.bigBlindAnteEnabled,
      bigBlindAnteAmount: settings.bigBlindAnteAmount,
      // Bomb Pot
      bombPotEnabled: settings.bombPotEnabled,
      bombPotMultiplier: settings.bombPotMultiplier,
      bombPotInterval: settings.bombPotInterval,
      bombPotDoubleBoard: settings.bombPotDoubleBoard,
      // Chat
      chatEnabled: settings.chatEnabled,
      chatSlowMode: settings.chatSlowMode,
      chatSlowModeInterval: settings.chatSlowModeInterval,
      // Run it twice
      runItTwiceEnabled: settings.runItTwiceEnabled,
      // Rake
      rakePercent: settings.rakePercent,
      rakeCap: settings.rakeCap,
      // Auto-start
      autoStartEnabled: settings.autoStartEnabled,
      autoStartDelaySeconds: settings.autoStartDelaySeconds,
    });
    
    if (success) {
      // Update local fullTableSettings state to reflect saved values
      setFullTableSettings(settings);
      toast.success('Настройки сохранены', {
        description: 'Изменения применятся со следующей раздачи'
      });
    } else {
      toast.error('Не удалось сохранить настройки');
    }
    
    setShowSettings(false);
  }, [updateTableSettings]);
  
  // Handle seat rotation change
  const handleRotationChange = useCallback((rotation: number) => {
    updatePreference('preferredSeatRotation', rotation);
  }, [updatePreference]);

  // Convert players for FullscreenPokerTable format - annotate winners
  // IMPORTANT: winningCardIndices is calculated in the hook and stored in tableState.players
  // Do NOT try to read it from showdownResult.showdownPlayers (it won't be there)
  const formattedPlayers: PokerPlayer[] = useMemo(() => {
    const players = tableState?.players || [];
    
    // If we have showdown result, annotate with winner info
    // Note: tableState.players already has winningCardIndices calculated by the hook
    if (showdownResult && showdownResult.winners.length > 0) {
      return players.map((p: PokerPlayer) => {
        const isWinner = showdownResult.winners.some(w => w.playerId === p.playerId);
        const showdownData = showdownResult.showdownPlayers?.find(sp => sp.playerId === p.playerId);
        // Use winningCardIndices from player (already calculated by hook), not from showdownData
        return {
          ...p,
          isWinner: isWinner || (p as any).isWinner,
          handName: (p as any).handName || showdownData?.handName,
          // These are already calculated in tableState.players by the hook
          winningCardIndices: (p as any).winningCardIndices || [],
          communityCardIndices: (p as any).communityCardIndices || [],
        };
      });
    }
    return players;
  }, [tableState?.players, showdownResult]);

  // Preserve community cards during showdown (don't reset them)
  const displayCommunityCards = useMemo(() => {
    if (showdownResult?.communityCards?.length) {
      return showdownResult.communityCards;
    }
    return tableState?.communityCards || [];
  }, [tableState?.communityCards, showdownResult?.communityCards]);

  // Effective phase - keep showdown visible longer
  const displayPhase = useMemo(() => {
    if (showdownResult && showdownResult.winners.length > 0) {
      return 'showdown';
    }
    return tableState?.phase || 'waiting';
  }, [tableState?.phase, showdownResult]);

  // Find dealer/blind seats
  const dealerSeat = tableState?.dealerSeat ?? 0;
  const smallBlindSeat = tableState?.smallBlindSeat ?? 1;
  const bigBlindSeat = tableState?.bigBlindSeat ?? 2;
  const currentPlayerSeat = tableState?.currentPlayerSeat ?? null;

  // Robust hero seat detection (Telegram Mini App sometimes gets wrong mySeat)
  const heroSeatForUI = useMemo(() => {
    const pid = String(playerId);
    const seatFromPlayers = tableState?.players?.find((p) => String(p.playerId) === pid)?.seatNumber;
    return typeof seatFromPlayers === 'number' ? seatFromPlayers : mySeat;
  }, [tableState?.players, playerId, mySeat]);

  // Betting info
  // Server sends minRaise as TOTAL bet amount (not delta)
  const serverMinRaise = tableState?.minRaise || tableState?.bigBlindAmount || 20;
  const bigBlind = tableState?.bigBlindAmount || 20;
  const currentBetValue = tableState?.currentBet || 0;
  const myBetAmount = (myPlayer as any)?.betAmount || 0;
  
  // minRaise should be at least currentBet + BB for a valid raise
  // If server says minRaise=0 or less than currentBet, calculate ourselves
  const minRaiseAmount = serverMinRaise > currentBetValue 
    ? serverMinRaise 
    : currentBetValue + bigBlind;
  
  const maxRaiseAmount = myPlayer?.stack ? myPlayer.stack + myBetAmount : 10000;
  const potValue = tableState?.pot || showdownResult?.pot || 0;

  // Connection status for banner
  const connectionStatus = isConnecting ? 'connecting' : (isConnected ? 'connected' : 'disconnected');

  // Apply preferences to sound
  useEffect(() => {
    setSoundEnabled(preferences.soundEnabled);
  }, [preferences.soundEnabled]);

  return (
    <PokerErrorBoundary>
      {/* Full-page theme background - fills entire viewport including safe areas */}
      <ThemePageBackground 
        glowStyleId={preferences.tableGlowStyle} 
        themeColor={currentTableTheme.color}
      />
      
      {/* Main container - NO padding, theme fills entire screen */}
      <div className="fixed inset-0 overflow-hidden">
        {/* Connection status */}
        <ConnectionStatusBanner 
          status={connectionStatus as any}
          lastError={error || undefined}
          onReconnectNow={() => connect()}
        />

        {/* Tournament Break Banner */}
        {isTournament && tournamentBreak && (
          <TournamentBreakBanner 
            breakInfo={tournamentBreak}
            onDismiss={clearTournamentBreak}
          />
        )}

        {/* Header - with safe area inset for Telegram fullscreen */}
        <div 
          className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-3"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + var(--tg-safe-area-inset-top, 0px) + 48px)'
          }}
        >
          {/* Seamless top scrim (NO blur; lighter so cards remain readable) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 top-0 -z-0"
            style={{
              bottom: '-64px',
              WebkitMaskImage:
                'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)',
              maskImage:
                'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/25 to-transparent" />
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-background/20 backdrop-blur-md border border-border/30 text-foreground/80 hover:bg-background/30"
              onClick={() => setShowMenu(!showMenu)}
            >
              {showMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            
            <img src={syndikateLogo} alt="Syndikate" className="h-8 drop-shadow-lg" />
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-background/20 backdrop-blur-md border border-border/30 text-foreground/80 hover:bg-background/30"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-background/20 backdrop-blur-md border border-border/30 text-amber-400 hover:bg-background/30"
              onClick={() => setShowPersonalSettings(true)}
            >
              <Palette className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-background/20 backdrop-blur-md border border-border/30 text-foreground/80 hover:bg-background/30"
              onClick={() => setShowSettings(true)}
            >
              <Settings2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Tournament HUD - only show for tournament tables */}
        {isTournament && tournamentId && (
          <>
            <TournamentHUD 
              tournamentId={tournamentId}
              currentPlayerId={playerId}
              compact={true}
              className="!top-16"
              onOpenLobby={() => setShowTournamentLobby(true)}
            />
            
            {/* PKO Bounty Display - shows player's current bounty */}
            <BountyDisplay
              tournamentId={tournamentId}
              playerId={playerId}
              compact={true}
              className="absolute top-16 right-2 z-40"
            />
            
            {/* Knockout notification for PKO tournaments */}
            <KnockoutNotification
              event={knockoutEvent}
              currentPlayerId={playerId}
              onComplete={() => setKnockoutEvent(null)}
            />
            
            {/* Time Bank Indicator for tournaments */}
            {myPlayer && (
              <TimeBankIndicator
                timeBankRemaining={myPlayer.timeBankRemaining ?? POKERSTARS_TIMER.TOURNAMENT.TIME_BANK_INITIAL}
                timeBankInitial={POKERSTARS_TIMER.TOURNAMENT.TIME_BANK_INITIAL}
                timeBankPerLevel={POKERSTARS_TIMER.TOURNAMENT.TIME_BANK_PER_LEVEL}
                isMyTurn={isMyTurn}
                isTimeBankActive={isTimeBankActive}
                actionTimeRemaining={turnTimeRemaining ?? undefined}
                onUseTimeBank={() => setIsTimeBankActive(true)}
                size="md"
              />
            )}
          </>
        )}
        
        {/* Fallback Blinds Display - shows when TournamentHUD is not available */}
        {tableState && !tournamentId && (
          <div className="absolute top-16 left-2 z-40">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 text-white text-xs font-medium">
              <span className="text-white/60">Блайнды:</span>
              <span className="text-amber-400 font-bold">
                {(tableState.smallBlindAmount || 10).toLocaleString()}/{(tableState.bigBlindAmount || 20).toLocaleString()}
              </span>
              {(tableState.anteAmount ?? 0) > 0 && (
                <span className="text-white/50">анте {tableState.anteAmount}</span>
              )}
            </div>
          </div>
        )}

        {/* Main poker table - fills entire screen, safe areas handled by individual elements */}
        {/* pb-36: space for action panel which floats at bottom */}
        <div 
          className="absolute inset-0"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + var(--tg-safe-area-inset-top, 0px) + 92px)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--tg-safe-area-inset-bottom, 0px) + 140px)'
          }}
        >
          {/* Why there is no hand yet */}
          {tableState?.phase === 'waiting' && !startHandHint.canStart && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-20 w-[min(520px,calc(100%-24px))] -translate-x-1/2">
              <div className="rounded-xl bg-black/60 backdrop-blur-md border border-white/10 px-4 py-3 shadow-lg">
                <div className="text-sm text-white/90 font-medium">
                  Ожидание раздачи: нужно {startHandHint.required} активных игрока (сейчас {startHandHint.activeCount}).
                </div>
                {startHandHint.sittingOutPlayers.length > 0 && (
                  <div className="mt-1 text-xs text-white/70">
                    Вне игры (Sit Out): {startHandHint.sittingOutPlayers.map(p => p.name || p.playerId.slice(0, 8)).join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* If YOU are sitting out OR disconnected - show a prominent "Return" button */}
          {(myPlayer?.isSittingOut || myPlayer?.isDisconnected) && (
            <div className="pointer-events-auto absolute left-1/2 bottom-44 z-30 -translate-x-1/2">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="text-white/70 text-sm bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                  {myPlayer?.isDisconnected 
                    ? 'Соединение потеряно' 
                    : isTournament 
                      ? 'Вы вне игры (блайнды списываются автоматически)'
                      : 'Вы вне игры'
                  }
                </div>
                <Button
                  variant="default"
                  size="lg"
                  className="rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3 shadow-lg shadow-emerald-500/30"
                  onClick={() => {
                    sitIn();
                    toast.success('Вы вернулись в игру');
                  }}
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Вернуться в игру
                </Button>
              </motion.div>
            </div>
          )}

          <FullscreenPokerTable
            tableState={tableState}
            players={formattedPlayers}
            heroSeat={heroSeatForUI}
            heroCards={myCards}
            communityCards={displayCommunityCards}
            pot={potValue}
            phase={displayPhase}
            dealerSeat={dealerSeat}
            smallBlindSeat={smallBlindSeat}
            bigBlindSeat={bigBlindSeat}
            currentPlayerSeat={currentPlayerSeat}
            turnTimeRemaining={displayTurnTimeRemaining ?? undefined}
            turnTimeTotal={displayTurnTimeTotal}
            isTimeBankActive={timeBankUiActive}
            timeBankRemaining={timeBankUiActive ? (displayTurnTimeRemaining ?? timeBankSliceSeconds) : (currentTurnPlayerTimeBank || timeBankSliceSeconds)}
            timeBankTotalSeconds={timeBankUiActive ? displayTurnTimeTotal : timeBankSliceSeconds}
            smallBlind={effectiveSmallBlind}
            bigBlind={effectiveBigBlind}
            ante={effectiveAnte}
            canJoinTable={canJoinTable}
            onSeatClick={handleSeatClick}
            maxSeats={maxSeats}
            wideMode={wideMode}
            showdownPlayers={showdownResult?.showdownPlayers}
            winners={showdownResult?.winners}
            betsBeingCollected={betsBeingCollected}
            phaseTimings={phaseTimings}
            showdownReveals={showdownReveals}
            winnerAnnouncement={winnerAnnouncement}
            activeBurnCard={activeBurnCard}
          />
        </div>

        {/* Seat rotation control - when not playing */}
        {!myPlayer && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
            <SeatRotationControl
              currentRotation={preferences.preferredSeatRotation}
              maxSeats={maxSeats}
              onChange={handleRotationChange}
            />
          </div>
        )}

        {/* Action buttons - Professional Panel (hidden for spectators) */}
        {myPlayer && !isSpectator && (
          <ProActionPanel
            isMyTurn={isMyTurn}
            canCheck={canCheck}
            callAmount={callAmount}
            minRaise={minRaiseAmount}
            maxRaise={maxRaiseAmount}
            currentBet={currentBetValue}
            pot={potValue}
            myStack={myPlayer.stack}
            smallBlind={tableState?.smallBlindAmount || Math.floor(bigBlind / 2) || 5}
            onFold={fold}
            onCheck={check}
            onCall={call}
            onRaise={raise}
            onAllIn={allIn}
            // Straddle props (PokerStars/PPPoker standard)
            straddleEnabled={fullTableSettings?.straddleEnabled as boolean ?? false}
            mississippiStraddleEnabled={fullTableSettings?.mississippiStraddleEnabled as boolean ?? false}
            bigBlind={effectiveBigBlind}
            phase={tableState?.phase || 'waiting'}
            handId={tableState?.handId || null}
            currentPlayerSeat={tableState?.currentPlayerSeat ?? null}
            mySeat={mySeat}
            dealerSeat={tableState?.dealerSeat ?? null}
            // Position info for straddle validation (industry standard: UTG/Button only)
            smallBlindSeat={tableState?.smallBlindSeat ?? null}
            bigBlindSeat={tableState?.bigBlindSeat ?? null}
            players={(tableState?.players || []).map(p => ({ 
              seatNumber: p.seatNumber, 
              status: p.isActive ? 'active' : p.isSittingOut ? 'sitting_out' : 'disconnected' 
            }))}
            onStraddleRequest={requestStraddle}
            autoStraddleEnabled={autoStraddleEnabled}
            onAutoStraddleChange={setAutoStraddleEnabled}
          />
        )}
        
        {/* PRO FEATURES: Bomb Pot Indicator (Industry-style automatic) */}
        <BombPotIndicator
          isActive={!!bombPotActive}
          multiplier={bombPotActive?.multiplier ?? 2}
          isDoubleBoard={bombPotActive?.isDoubleBoard ?? false}
        />
        
        {/* PRO FEATURES: Run It Twice modal (still requires voting) */}
        {/* Bomb Pot is now automatic - no voting modal */}
        {myPlayer && !isSpectator && (
          <ProFeaturesOverlay
            tableId={tableId}
            playerId={playerId}
            playerStack={myPlayer.stack}
            bombPotProposal={null} // Legacy - not used in industry mode
            runItTwiceProposal={runItTwiceProposal}
            bigBlind={effectiveBigBlind}
            onBombPotVote={voteBombPot} // Legacy - no-op
            onRunItTwiceVote={voteRunItTwice}
          />
        )}
        
        <BuyInDialog
          isOpen={showBuyInDialog}
          onClose={() => setShowBuyInDialog(false)}
          onConfirm={handleBuyInConfirm}
          selectedSeat={selectedSeatForJoin}
          minBuyIn={minBuyIn}
          maxBuyIn={maxBuyIn}
          playerBalance={playerBalance}
            bigBlind={effectiveBigBlind}
          occupiedSeats={occupiedSeats}
          maxSeats={maxSeats}
        />

        {/* Rebuy Dialog (Cash Game) */}
        {!isTournament && (
          <RebuyDialog
            isOpen={showRebuyDialog}
            onClose={() => setShowRebuyDialog(false)}
            onConfirm={handleRebuyConfirm}
            currentSeat={mySeat ?? 0}
            currentStack={myPlayer?.stack ?? 0}
            minBuyIn={minBuyIn}
            maxBuyIn={maxBuyIn}
            playerBalance={playerBalance}
            bigBlind={tableState?.bigBlindAmount || 20}
          />
        )}

        {/* Tournament Rebuy Dialog */}
        {isTournament && rebuyAvailable && (
          <TournamentRebuyDialog
            isOpen={showRebuyDialog || !!rebuyAvailable}
            onClose={() => {
              setShowRebuyDialog(false);
              clearRebuyAvailable();
            }}
            tournamentId={rebuyAvailable.tournamentId}
            playerId={playerId}
            tableId={tableId}
            timeoutSeconds={rebuyAvailable.timeoutSeconds}
            timestamp={rebuyAvailable.timestamp}
            onRebuySuccess={(newChips) => {
              setActualBuyIn(newChips);
              clearRebuyAvailable();
            }}
            onLeave={handleLeave}
            notifyServer={(newChips) => {
              // CRITICAL: Notify WebSocket server to sync stack and cancel elimination timeout
              tournamentRebuy(rebuyAvailable.tournamentId, newChips);
            }}
          />
        )}

        {/* Side menu - transparent with blur for immersive theme */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="absolute left-0 top-0 bottom-0 w-64 z-40 border-r border-white/10"
              style={{
                paddingTop: 'calc(env(safe-area-inset-top, 0px) + var(--tg-safe-area-inset-top, 0px) + 80px)',
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--tg-safe-area-inset-bottom, 0px) + 16px)'
              }}
            >
              {/* Blur background layer */}
              <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />
              
              <div className="relative p-4 space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-foreground/80 hover:text-foreground hover:bg-foreground/10"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                >
                  {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                  Звук {soundEnabled ? 'вкл' : 'выкл'}
                </Button>
                
                {/* Rebuy button - only when seated and not in active hand */}
                {myPlayer && canRebuy && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                    onClick={() => { setShowMenu(false); setShowRebuyDialog(true); }}
                  >
                    <Plus className="h-5 w-5" />
                    Докупить фишки
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                  onClick={() => { setShowMenu(false); setShowPersonalSettings(true); }}
                >
                  <Palette className="h-5 w-5" />
                  Персонализация
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-foreground/80 hover:text-foreground hover:bg-foreground/10"
                  onClick={() => { setShowMenu(false); setShowSettings(true); }}
                >
                  <Settings2 className="h-5 w-5" />
                  Настройки стола
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                  onClick={() => { setShowMenu(false); setShowHandHistory(true); }}
                >
                  <History className="h-5 w-5" />
                  История рук
                </Button>
                
                <div className="h-px bg-border/30 my-4" />
                
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={handleLeave}
                >
                  <LogOut className="h-5 w-5" />
                  Покинуть стол
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings panel */}
        <TableSettingsPanel
          isOpen={showSettings}
          settings={fullTableSettings ? {
            // Use full settings from DB when available
            smallBlind: fullTableSettings.smallBlind as number,
            bigBlind: fullTableSettings.bigBlind as number,
            ante: fullTableSettings.ante as number,
            actionTimeSeconds: fullTableSettings.actionTimeSeconds as number,
            timeBankSeconds: fullTableSettings.timeBankSeconds as number,
            straddleEnabled: fullTableSettings.straddleEnabled as boolean,
            mississippiStraddleEnabled: fullTableSettings.mississippiStraddleEnabled as boolean,
            maxStraddleCount: fullTableSettings.maxStraddleCount as number,
            buttonAnteEnabled: fullTableSettings.buttonAnteEnabled as boolean,
            buttonAnteAmount: fullTableSettings.buttonAnteAmount as number,
            bigBlindAnteEnabled: fullTableSettings.bigBlindAnteEnabled as boolean,
            bigBlindAnteAmount: fullTableSettings.bigBlindAnteAmount as number,
            bombPotEnabled: fullTableSettings.bombPotEnabled as boolean,
            bombPotMultiplier: fullTableSettings.bombPotMultiplier as number,
            bombPotInterval: fullTableSettings.bombPotInterval as number,
            bombPotDoubleBoard: fullTableSettings.bombPotDoubleBoard as boolean,
            chatEnabled: fullTableSettings.chatEnabled as boolean,
            chatSlowMode: fullTableSettings.chatSlowMode as boolean,
            chatSlowModeInterval: fullTableSettings.chatSlowModeInterval as number,
            runItTwiceEnabled: fullTableSettings.runItTwiceEnabled as boolean,
            rakePercent: fullTableSettings.rakePercent as number,
            rakeCap: fullTableSettings.rakeCap as number,
            autoStartEnabled: fullTableSettings.autoStartEnabled as boolean,
            autoStartDelaySeconds: fullTableSettings.autoStartDelaySeconds as number,
          } : {
            // Fallback to tableState values if DB fetch hasn't completed yet
            smallBlind: tableState?.smallBlindAmount || 10,
            bigBlind: tableState?.bigBlindAmount || 20,
            ante: tableState?.anteAmount || 0,
            actionTimeSeconds: tableState?.actionTimer || turnTimeTotal || 15,
            timeBankSeconds: tableState?.timeBankSeconds || 30,
          }}
          onSave={handleSettingsSave}
          onClose={() => setShowSettings(false)}
          isHost={true}
        />

        {/* Personal settings panel */}
        <PersonalSettingsPanel
          isOpen={showPersonalSettings}
          onClose={() => setShowPersonalSettings(false)}
          maxSeats={maxSeats}
        />

        {/* Tournament Lobby Modal */}
        {isTournament && tournamentId && (
          <ProTournamentLobby
            tournamentId={tournamentId}
            playerId={playerId}
            playerBalance={playerBalance}
            isRegistered={!!myPlayer}
            open={showTournamentLobby}
            onClose={() => setShowTournamentLobby(false)}
            onRegister={() => {}}
            onUnregister={() => {}}
            onJoin={() => setShowTournamentLobby(false)}
          />
        )}

        {/* Hand History Dialog */}
        <Dialog open={showHandHistory} onOpenChange={setShowHandHistory}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-zinc-900/95 border-zinc-700 p-0">
            <FullHandHistory 
              tableId={tableId} 
              playerId={playerId}
              className="h-[80vh]"
            />
          </DialogContent>
        </Dialog>

        {/* Winner info shown directly on player cards during showdown - no popup */}
      </div>
    </PokerErrorBoundary>
  );
}

export default FullscreenPokerTableWrapper;
