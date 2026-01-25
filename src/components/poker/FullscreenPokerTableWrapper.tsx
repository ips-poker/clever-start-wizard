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
  const [turnTimeTotal, setTurnTimeTotal] = useState<number>(15); // Total for current timer slice
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
    tournamentRebuy
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

  // POKERSTARS-STYLE TIMER: Server-authoritative timing
  // Server sends: timeRemaining, actionStartTime, isTimeBankPhase
  // Client syncs from server and counts down locally
  // Include actionStartTime in key to detect timer resets even for same seat
  const timerResetKey = useMemo(() => {
    return `${tableState?.handId || 'no-hand'}-${tableState?.phase || 'waiting'}-${tableState?.currentPlayerSeat ?? 'none'}-${tableState?.isTimeBankPhase ? 'tb' : 'main'}-${tableState?.actionStartTime || 0}`;
  }, [tableState?.handId, tableState?.phase, tableState?.currentPlayerSeat, tableState?.isTimeBankPhase, tableState?.actionStartTime]);

  // Track previous timerResetKey to detect new turn/phase
  const prevTimerResetKeyRef = useRef<string>('');

  // Store the deadline in a ref so it persists across re-renders
  // Only recalculate when turn/phase actually changes
  const deadlineMsRef = useRef<number>(0);
  
  useEffect(() => {
    // POKERSTARS-STYLE: Use server's actionTimeTotal (phase-aware) or fallback
    const actionTimer = tableState?.actionTimeTotal || tableState?.actionTimer || 15;

    // No active player = no timer
    if (tableState?.currentPlayerSeat === null || tableState?.currentPlayerSeat === undefined) {
      setTurnTimeRemaining(null);
      setIsTimeBankActive(false);
      return;
    }

    // Update time bank phase indicator
    const isTimeBankPhase = Boolean(tableState?.isTimeBankPhase);
    setIsTimeBankActive(isTimeBankPhase);

    const now = Date.now();
    const serverRemaining = tableState?.timeRemaining;
    const actionStartTime = tableState?.actionStartTime;

    // Detect if this is a NEW turn/phase (timerResetKey changed)
    const isNewTurn = timerResetKey !== prevTimerResetKeyRef.current;
    prevTimerResetKeyRef.current = timerResetKey;

    // POKERSTARS-STYLE SYNC:
    // 1. On NEW turn: calculate deadline from actionStartTime (server's authoritative start)
    // 2. During turn: only adjust if server's remaining differs significantly (drift correction)
    
    if (isNewTurn) {
      // NEW TURN: Set up fresh timer
      if (isTimeBankPhase) {
        // Time bank: server gives a specific slice as the new "total"
        const tbSlice = serverRemaining ?? actionTimer;
        setTurnTimeTotal(tbSlice);
        // Deadline: now + time bank slice
        deadlineMsRef.current = now + tbSlice * 1000;
      } else {
        // Main timer: always starts at full actionTimer
        setTurnTimeTotal(actionTimer);
        // Prefer actionStartTime from server for precise sync
        if (actionStartTime && actionStartTime > 0) {
          deadlineMsRef.current = actionStartTime + actionTimer * 1000;
        } else if (serverRemaining !== null && serverRemaining !== undefined) {
          deadlineMsRef.current = now + serverRemaining * 1000;
        } else {
          deadlineMsRef.current = now + actionTimer * 1000;
        }
      }
    } else {
      // SAME TURN: Check for drift from server
      // Only resync if server's remaining differs by more than 2 seconds
      if (serverRemaining !== null && serverRemaining !== undefined) {
        const localRemaining = Math.max(0, (deadlineMsRef.current - now) / 1000);
        const drift = Math.abs(serverRemaining - localRemaining);
        
        if (drift > 2) {
          // Significant drift - resync to server
          deadlineMsRef.current = now + serverRemaining * 1000;
        }
      }
    }

    const getRemaining = () => Math.max(0, (deadlineMsRef.current - Date.now()) / 1000);

    // Store as integer seconds for UI/sounds; SmoothAvatarTimer keeps sub-second smoothness internally.
    setTurnTimeRemaining(Math.ceil(getRemaining()));

    const interval = setInterval(() => {
      setTurnTimeRemaining(Math.ceil(getRemaining()));
    }, 500);

    return () => clearInterval(interval);
  }, [
    timerResetKey,
    tableState?.actionTimer,
    tableState?.actionTimeTotal, // POKERSTARS-STYLE: Phase-aware timing
    tableState?.timeRemaining,
    tableState?.actionStartTime,
    tableState?.isTimeBankPhase
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
  const hasAutoSitInRef = useRef(false);
  useEffect(() => {
    // Only for tournaments, when player is connected, seated but sitting out
    if (!isTournament || !isConnected || !myPlayer || isSpectator) {
      return;
    }
    
    // If player is sitting out, auto-activate them (one time per session)
    if (myPlayer.isSittingOut && !hasAutoSitInRef.current) {
      hasAutoSitInRef.current = true;
      console.log('[Tournament AutoSitIn] Player returning from sit-out, auto-activating');
      
      // Small delay to ensure connection is stable
      setTimeout(() => {
        sitIn();
        toast.success('Добро пожаловать обратно! Вы снова в игре.', {
          icon: '🎮',
          duration: 3000
        });
      }, 500);
    }
    
    // Reset flag if player goes back to active (allow future returns)
    if (!myPlayer.isSittingOut) {
      hasAutoSitInRef.current = false;
    }
  }, [isTournament, isConnected, myPlayer, isSpectator, sitIn]);
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
        setTimeout(() => sounds.playDeal(), 150);  // First hole card
        setTimeout(() => sounds.playDeal(), 250);  // Second hole card
      } else if (phase === 'flop') {
        // Flop - 3 cards quickly
        setTimeout(() => sounds.playDeal(), 50);   // First flop card
        setTimeout(() => sounds.playDeal(), 150);  // Second flop card  
        setTimeout(() => sounds.playDeal(), 250);  // Third flop card
      } else if (phase === 'turn') {
        // Turn - 1 card
        setTimeout(() => sounds.playDeal(), 100);
      } else if (phase === 'river') {
        // River - 1 card
        setTimeout(() => sounds.playDeal(), 100);
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
    setShowSettings(false);
  }, []);
  
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
            turnTimeRemaining={turnTimeRemaining ?? undefined}
            turnTimeTotal={turnTimeTotal}
            isTimeBankActive={isTimeBankActive}
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
            onFold={fold}
            onCheck={check}
            onCall={call}
            onRaise={raise}
            onAllIn={allIn}
          />
        )}
        
        {/* Buy-in Dialog */}
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
          settings={{
            smallBlind: tableState?.smallBlindAmount || 10,
            bigBlind: tableState?.bigBlindAmount || 20,
            actionTimeSeconds: tableState?.actionTimer || 15,  // POKERSTARS: Cash = 15s
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
