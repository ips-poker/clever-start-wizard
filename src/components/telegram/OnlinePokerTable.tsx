import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Volume2, VolumeX, MessageSquare, Send,
  Coins, Timer, Users, Crown, Zap, X, RotateCcw, Wifi, WifiOff,
  Shield, Rabbit, Clock, Bomb, Layers, Settings, AlertTriangle, Loader2,
  Plus, ChevronUp, ChevronDown, Sparkles, Settings2
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePokerTable, PokerPlayer, TableState } from '@/hooks/usePokerTable';

// Import chat, emoji reactions and settings components
import { TableChat } from '@/components/poker/TableChat';
import { TableReactions, QuickReactionButton, useTableReactions, ReactionType } from '@/components/poker/TableEmojis';
import { TableSettingsPanel, TableSettings } from '@/components/poker/TableSettingsPanel';

// Import pro features components
import { EquityDisplay } from '@/components/poker/EquityDisplay';
import { EVCashoutPanel } from '@/components/poker/EVCashoutPanel';
import { AllInInsurance } from '@/components/poker/AllInInsurance';
import { SqueezeHand } from '@/components/poker/SqueezeCard';
import { RabbitHuntPanel } from '@/components/poker/RabbitHuntPanel';
import { SidePotsDisplay } from '@/components/poker/SidePotsDisplay';
import { PPPokerTable } from '@/components/poker/PPPokerTable';
import { PPPokerActionButtons } from '@/components/poker/PPPokerActionButtons';
import { PokerErrorBoundary } from '@/components/poker/PokerErrorBoundary';
import { ConnectionStatusBanner } from '@/components/poker/ConnectionStatusBanner';

// Import stable optimized components - PPPoker quality
import { StablePokerCard, StablePlayerSeat, StableChipStack } from '@/components/poker/stable';

interface OnlinePokerTableProps {
  tableId: string;
  playerId?: string;
  playerName?: string;
  playerAvatar?: string;
  buyIn?: number;
  onLeave: () => void;
}


// Seat positions for 6-max table - PPPoker authentic layout
const SEAT_POSITIONS_6MAX = [
  { x: 50, y: 88 },  // Seat 0 - Hero (bottom center)
  { x: 10, y: 60 },  // Seat 1 - Left middle
  { x: 10, y: 28 },  // Seat 2 - Left top
  { x: 50, y: 10 },  // Seat 3 - Top center
  { x: 90, y: 28 },  // Seat 4 - Right top
  { x: 90, y: 60 },  // Seat 5 - Right middle
];

export function OnlinePokerTable({
  tableId,
  playerId,
  playerName = 'Player',
  playerAvatar,
  buyIn = 10000,
  onLeave
}: OnlinePokerTableProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [betAmount, setBetAmount] = useState(40);
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [nextHandCountdown, setNextHandCountdown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nextHandTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Pro features state
  const [showEVCashout, setShowEVCashout] = useState(false);
  const [showInsurance, setShowInsurance] = useState(false);
  const [showRabbitHunt, setShowRabbitHunt] = useState(false);
  const [useSqueeze, setUseSqueeze] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [mutedPlayers, setMutedPlayers] = useState<Set<string>>(new Set());
  const [tableSettings, setTableSettings] = useState<Partial<TableSettings>>({
    smallBlind: 10,
    bigBlind: 20,
    ante: 0,
    actionTimeSeconds: 15,
    timeBankSeconds: 30,
    chatEnabled: true,
    bombPotEnabled: false,
    autoStartEnabled: true
  });
  
  // Emoji reactions hook
  const { reactions, addReaction, removeReaction } = useTableReactions();

  // Use the main poker table hook
  const pokerTable = usePokerTable(playerId ? { tableId, playerId, buyIn } : null);
  
  const {
    isConnected,
    isConnecting,
    tableState,
    myCards,
    mySeat,
    myPlayer,
    isMyTurn,
    canCheck,
    callAmount,
    minRaiseAmount,
    error,
    chatMessages,
    showdownResult,
    lastAction,
    fold,
    check,
    call,
    raise,
    allIn,
    startHand,
    sendChat: sendTableChat,
    disconnect,
    postStraddle,
    useTimeBank,
    triggerBombPot,
    isBombPot,
    bombPotEnabled,
    timeBankRemaining,
    canPostStraddle,
    straddleAmount,
    hasPostedStraddle,
    configureTable,
    refreshPlayers,
    checkTimeout,
    // New reconnect features
    connectionStatus,
    retryCount,
    nextRetryIn,
    reconnectNow,
    cancelReconnect,
  } = pokerTable;

  const players = tableState?.players || [];
  const minRaise = tableState?.minRaise || minRaiseAmount || 40;

  // Update bet amount when minRaise changes
  useEffect(() => {
    setBetAmount(minRaise);
  }, [minRaise]);

  // Detect all-in situation for showing equity/insurance
  const isAllInSituation = useMemo(() => {
    if (!tableState || tableState.phase === 'waiting' || tableState.phase === 'preflop') return false;
    const activePlayers = players.filter(p => !p.isFolded);
    const allInPlayers = activePlayers.filter(p => p.isAllIn);
    return allInPlayers.length >= 1 && activePlayers.length >= 2;
  }, [tableState, players]);

  // Convert players for EquityDisplay
  const pokerPlayersForEquity = useMemo((): PokerPlayer[] => {
    return players
      .filter(p => !p.isFolded && p.holeCards && p.holeCards.length === 2 && p.holeCards[0] !== '??')
      .map(p => ({
        playerId: p.playerId,
        seatNumber: p.seatNumber,
        name: p.name,
        stack: p.stack,
        holeCards: p.holeCards || [],
        betAmount: p.betAmount || 0,
        isFolded: p.isFolded,
        isAllIn: p.isAllIn,
        isActive: !p.isFolded && p.stack > 0,
      }));
  }, [players]);

  // My equity for insurance/cashout
  const myEquity = useMemo(() => {
    if (!isAllInSituation || !myPlayer || myPlayer.isFolded) return 0;
    const activePlayers = players.filter(p => !p.isFolded);
    return 100 / Math.max(1, activePlayers.length);
  }, [isAllInSituation, myPlayer, players]);

  // PPPoker-style action timer (15 seconds default)
  const ACTION_TIME = 15;
  const opponentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Stable fold callback to avoid re-triggering effect
  const stableFold = useCallback(() => {
    fold();
  }, [fold]);
  
  const stableCheckTimeout = useCallback(() => {
    checkTimeout();
  }, [checkTimeout]);

  useEffect(() => {
    // Clear existing timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (opponentTimeoutRef.current) {
      clearTimeout(opponentTimeoutRef.current);
      opponentTimeoutRef.current = null;
    }
    
    const phase = tableState?.phase;
    const currentPlayerSeat = tableState?.currentPlayerSeat;
    
    if (phase === 'waiting' || phase === 'showdown' || !currentPlayerSeat) {
      setTimeRemaining(ACTION_TIME);
      return;
    }
    
    setTimeRemaining(ACTION_TIME);
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          if (isMyTurn) {
            console.log('⏰ Time expired, auto-folding...');
            stableFold();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Opponent timeout check (only if not my turn)
    if (!isMyTurn) {
      opponentTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Opponent timeout - calling server check_timeout...');
        stableCheckTimeout();
      }, (ACTION_TIME + 2) * 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (opponentTimeoutRef.current) {
        clearTimeout(opponentTimeoutRef.current);
        opponentTimeoutRef.current = null;
      }
    };
  }, [isMyTurn, tableState?.phase, tableState?.currentPlayerSeat, stableFold, stableCheckTimeout]);

  // Auto-start next hand after showdown (PPPoker style - 5 second countdown)
  const NEXT_HAND_DELAY = 5;
  
  useEffect(() => {
    if (tableState?.phase === 'showdown' || (tableState?.phase === 'waiting' && showdownResult)) {
      // Start countdown for next hand
      setNextHandCountdown(NEXT_HAND_DELAY);
      
      nextHandTimerRef.current = setInterval(() => {
        setNextHandCountdown(prev => {
          if (prev <= 1) {
            // Auto-start next hand
            console.log('🎲 Auto-starting next hand...');
            startHand();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (nextHandTimerRef.current) {
        clearInterval(nextHandTimerRef.current);
        nextHandTimerRef.current = null;
      }
      setNextHandCountdown(0);
    }
    
    return () => {
      if (nextHandTimerRef.current) {
        clearInterval(nextHandTimerRef.current);
        nextHandTimerRef.current = null;
      }
    };
  }, [tableState?.phase, showdownResult, startHand]);

  // Show winner toast
  useEffect(() => {
    if (showdownResult?.winners && showdownResult.winners.length > 0) {
      const myWin = showdownResult.winners.find(w => w.playerId === playerId);
      if (myWin) {
        toast.success(`Вы выиграли ${myWin.amount}! ${myWin.handRank || ''}`);
      }
    }
  }, [showdownResult, playerId]);

  // Handle leave
  const handleLeave = () => {
    disconnect();
    onLeave();
  };

  // Memoized player data for seats
  const seatPlayers = useMemo(() => {
    const seatMap: Record<number, PokerPlayer | undefined> = {};
    for (let i = 1; i <= 6; i++) {
      seatMap[i] = players.find(p => p.seatNumber === i);
    }
    return seatMap;
  }, [players]);

  // Check winners for each seat
  const seatWinners = useMemo(() => {
    const winners: Record<number, boolean> = {};
    for (let i = 1; i <= 6; i++) {
      winners[i] = showdownResult?.winners?.some(w => w.seatNumber === i) || false;
    }
    return winners;
  }, [showdownResult]);


  // Handle use time bank
  const handleUseTimeBank = () => {
    if (timeBankRemaining > 0) {
      useTimeBank(30);
      toast.info('Time bank activated: +30s');
    }
  };

  // Render states
  if (!playerId) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
          <p>Player ID required to join table</p>
          <Button onClick={onLeave} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  if (!isConnected && isConnecting) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-green-500" />
          <p className="text-lg font-semibold">Подключение к столу...</p>
          <p className="text-sm text-white/60 mt-2">Пожалуйста, подождите</p>
          <Button onClick={onLeave} variant="ghost" className="mt-6 text-white/70">
            Отмена
          </Button>
        </div>
      </div>
    );
  }

  if (!isConnected && !isConnecting && error) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <WifiOff className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <p className="text-lg font-semibold">Ошибка подключения</p>
          <p className="text-sm text-white/60 mt-2">{error}</p>
          <div className="flex gap-2 mt-6 justify-center">
            <Button onClick={() => window.location.reload()} className="bg-green-600">
              Повторить
            </Button>
            <Button onClick={onLeave} variant="ghost" className="text-white/70">
              Назад
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PokerErrorBoundary onReset={() => reconnectNow()} onGoHome={onLeave}>
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden">
      {/* Connection Status Banner */}
      <ConnectionStatusBanner
        status={connectionStatus}
        retryCount={retryCount}
        maxRetries={5}
        nextRetryIn={nextRetryIn}
        lastError={error}
        onReconnectNow={reconnectNow}
        onCancel={cancelReconnect}
      />
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 z-20 border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={handleLeave} className="h-9 w-9 text-white/70 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="text-center flex-1">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-sm font-bold text-white">No Limit Hold'em</h1>
            {isConnected ? <Wifi className="w-3 h-3 text-green-400" /> : 
             isConnecting ? <Wifi className="w-3 h-3 text-yellow-400 animate-pulse" /> : 
             <WifiOff className="w-3 h-3 text-red-400" />}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-white/60">
            <span className="px-1.5 py-0.5 bg-white/10 rounded">
              {tableState?.smallBlindAmount || 10}/{tableState?.bigBlindAmount || 20}
            </span>
            <span className="text-white/40">•</span>
            <span>{players.length}/6</span>
            {tableState?.phase && tableState.phase !== 'waiting' && (
              <>
                <span className="text-white/40">•</span>
                <span className="capitalize text-amber-400">{tableState.phase}</span>
              </>
            )}
            {isBombPot && (
              <>
                <span className="text-white/40">•</span>
                <span className="text-orange-400 flex items-center gap-0.5">
                  <Bomb className="w-2.5 h-2.5" /> Bomb
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-0.5">
          {/* Emoji reactions button */}
          <QuickReactionButton 
            onReact={(type: ReactionType) => {
              const heroSeat = mySeat ?? 0;
              addReaction(playerId || 'hero', playerName, heroSeat, type);
            }} 
          />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => refreshPlayers()} 
            className="h-8 w-8 text-white/70"
            title="Обновить игроков"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="h-8 w-8 text-white/70">
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowChat(!showChat)} className={cn("h-8 w-8 text-white/70 relative", showChat && "text-orange-400")}>
            <MessageSquare className="h-4 w-4" />
            {chatMessages.length > 0 && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} className="h-8 w-8 text-white/70">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Enhanced Chat with TableChat component */}
      {showChat && (
        <TableChat
          messages={chatMessages.map(msg => ({
            id: `${msg.playerId}-${Date.now()}-${Math.random()}`,
            playerId: msg.playerId || '',
            playerName: msg.playerName || 'Player',
            message: msg.text || msg.message || '',
            timestamp: Date.now(),
            type: 'chat' as const
          }))}
          onSendMessage={(text) => sendTableChat(text)}
          onMutePlayer={(pid, mute) => {
            setMutedPlayers(prev => {
              const next = new Set(prev);
              if (mute) next.add(pid);
              else next.delete(pid);
              return next;
            });
          }}
          mutedPlayers={mutedPlayers}
          isChatEnabled={tableSettings.chatEnabled}
          isSlowMode={tableSettings.chatSlowMode}
          slowModeInterval={tableSettings.chatSlowModeInterval}
          currentPlayerId={playerId || ''}
          bombPotEnabled={tableSettings.bombPotEnabled}
          onTriggerBombPot={triggerBombPot}
        />
      )}

      {/* Emoji Reactions display */}
      <TableReactions
        reactions={reactions}
        seatPositions={SEAT_POSITIONS_6MAX.map(p => ({ x: p.x, y: p.y }))}
        onReactionComplete={removeReaction}
      />

      {/* Table Settings Panel */}
      <TableSettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={tableSettings}
        onSave={(newSettings) => setTableSettings(prev => ({ ...prev, ...newSettings }))}
        isHost={true}
      />

      {/* Poker Table Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* PPPoker-style felt table */}
        <PPPokerTable
          communityCards={tableState?.communityCards || []}
          pot={tableState?.pot || 0}
          phase={tableState?.phase || 'waiting'}
          isBombPot={isBombPot}
          winners={showdownResult?.winners}
          nextHandCountdown={nextHandCountdown}
        />

        {/* Game Status Overlay - Waiting/Starting */}
        {tableState?.phase === 'waiting' && (
          <div className="absolute top-[25%] left-1/2 -translate-x-1/2 z-20">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center"
            >
              {/* Waiting for players */}
              {(tableState?.playersNeeded ?? 0) > 0 && (
                <div className="bg-black/70 backdrop-blur-sm px-6 py-3 rounded-xl border border-amber-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-amber-400" />
                    <span className="text-white font-semibold">Ожидание игроков</span>
                  </div>
                  <p className="text-amber-400/80 text-sm text-center">
                    Нужно ещё {tableState.playersNeeded} игрок(а)
                  </p>
                </div>
              )}

              {/* Game starting countdown */}
              {(tableState?.gameStartingCountdown ?? 0) > 0 && (
                <div className="bg-black/70 backdrop-blur-sm px-8 py-4 rounded-xl border border-green-500/50">
                  <div className="flex flex-col items-center">
                    <p className="text-green-400 text-sm font-semibold mb-1">Игра начинается</p>
                    <motion.div
                      key={tableState.gameStartingCountdown}
                      initial={{ scale: 1.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-4xl font-bold text-white"
                    >
                      {tableState.gameStartingCountdown}
                    </motion.div>
                  </div>
                </div>
              )}

              {/* Next hand countdown - using local state */}
              {nextHandCountdown > 0 && (
                <div className="bg-black/70 backdrop-blur-sm px-6 py-3 rounded-xl border border-blue-500/30">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-blue-400" />
                    <span className="text-white text-sm">
                      Следующая раздача через <span className="font-bold text-blue-400">{nextHandCountdown}s</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Ready to play - waiting for game start */}
              {players.length >= 2 && !tableState?.playersNeeded && !tableState?.gameStartingCountdown && nextHandCountdown === 0 && tableState?.phase === 'waiting' && (
                <div className="bg-black/70 backdrop-blur-sm px-6 py-3 rounded-xl border border-green-500/30">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                    <span className="text-green-400 text-sm font-medium">Запуск раздачи...</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Side Pots - shown above table center */}
        {tableState?.sidePots && (
          <div className="absolute top-[20%] left-1/2 -translate-x-1/2 z-10">
            <SidePotsDisplay sidePots={tableState.sidePots} />
          </div>
        )}

        {/* Blinds info - below community cards */}
        <div className="absolute top-[58%] left-1/2 -translate-x-1/2 z-10">
          <div className="text-[10px] text-white/40 text-center bg-black/30 px-3 py-0.5 rounded-full">
            Blinds: {tableState?.smallBlindAmount || 10}/{tableState?.bigBlindAmount || 20}
            {tableState?.anteAmount ? ` • Ante: ${tableState.anteAmount}` : ''}
          </div>
        </div>

        {/* Player Seats - using stable optimized component */}
        {[1, 2, 3, 4, 5, 6].map(seat => {
          const player = seatPlayers[seat];
          const isMyPlayerSeat = mySeat === seat;
          const isCurrentTurn = tableState?.currentPlayerSeat === seat;
          
          return (
            <StablePlayerSeat 
              key={seat} 
              player={player ? {
                id: player.playerId,
                name: player.name,
                avatar: undefined,
                stack: player.stack,
                cards: player.holeCards,
                isDealer: tableState?.dealerSeat === seat,
                isFolded: player.isFolded,
                isAllIn: player.isAllIn,
                isTurn: isCurrentTurn,
                currentBet: player.betAmount,
                lastAction: undefined
              } : null}
              position={SEAT_POSITIONS_6MAX[seat - 1] || { x: 50, y: 50 }}
              isHero={isMyPlayerSeat}
              showCards={tableState?.phase === 'showdown'}
              timeRemaining={isCurrentTurn ? timeRemaining : undefined}
              timeDuration={ACTION_TIME}
              seatIndex={seat - 1}
            />
          );
        })}

        {/* Hero Cards - Large display at bottom */}
        {myCards && myCards.length > 0 && myCards[0] !== '??' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
            {useSqueeze && tableState?.phase === 'preflop' ? (
              <SqueezeHand 
                cards={myCards} 
                size="lg"
                onRevealComplete={() => setUseSqueeze(false)}
              />
            ) : (
              <div className="flex gap-2">
                {myCards.map((card, idx) => (
                  <StablePokerCard key={idx} card={card} size="lg" dealDelay={idx} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Equity Display */}
        {isAllInSituation && pokerPlayersForEquity.length >= 2 && (
          <EquityDisplay
            players={pokerPlayersForEquity}
            communityCards={tableState?.communityCards || []}
            phase={tableState?.phase || 'waiting'}
            showAlways={true}
          />
        )}

        {/* EV Cashout Panel */}
        {showEVCashout && myPlayer?.isAllIn && tableState && (
          <div className="absolute top-20 left-4 z-40">
            <EVCashoutPanel
              scenario={{
                pot: tableState.pot,
                phase: tableState.phase as 'flop' | 'turn' | 'river',
                communityCards: tableState.communityCards,
                players: players.filter(p => !p.isFolded).map(p => ({
                  playerId: p.playerId,
                  playerName: p.name || '',
                  cards: p.holeCards || [],
                  stack: p.stack,
                  contribution: p.betAmount || 0,
                }))
              }}
              playerId={playerId}
              onAcceptCashout={(amount) => {
                toast.success(`Cashout: ${amount}`);
                setShowEVCashout(false);
              }}
              onDeclineCashout={() => setShowEVCashout(false)}
            />
          </div>
        )}

        {/* All-In Insurance */}
        <AllInInsurance
          isOpen={showInsurance}
          onClose={() => setShowInsurance(false)}
          onPurchase={(coverage) => {
            toast.success(`Страховка: ${coverage}`);
            setShowInsurance(false);
          }}
          potAmount={tableState?.pot || 0}
          playerEquity={myEquity}
          maxInsurable={Math.floor((tableState?.pot || 0) * (myEquity / 100))}
          playerStack={myPlayer?.stack || 0}
          communityCards={tableState?.communityCards || []}
          holeCards={myCards || []}
        />

        {/* Pro Features Panel - right side */}
        {isAllInSituation && myPlayer && !myPlayer.isFolded && (
          <div className="absolute top-16 right-2 z-30 flex flex-col gap-1.5">
            <Button
              size="sm"
              onClick={() => setShowEVCashout(!showEVCashout)}
              className="h-7 px-2 bg-amber-600/80 hover:bg-amber-600 text-white text-[10px]"
            >
              <Shield className="w-3 h-3 mr-1" />
              Cashout
            </Button>
            <Button
              size="sm"
              onClick={() => setShowInsurance(true)}
              className="h-7 px-2 bg-blue-600/80 hover:bg-blue-600 text-white text-[10px]"
            >
              <Shield className="w-3 h-3 mr-1" />
              Insurance
            </Button>
          </div>
        )}

        {/* Special Actions - left side */}
        {tableState?.phase === 'waiting' && (
          <div className="absolute top-16 left-2 z-30 flex flex-col gap-1.5">
            {canPostStraddle && !hasPostedStraddle && (
              <Button
                size="sm"
                onClick={() => postStraddle(straddleAmount)}
                className="h-7 px-2 bg-green-600/80 hover:bg-green-600 text-white text-[10px]"
              >
                <Layers className="w-3 h-3 mr-1" />
                Straddle
              </Button>
            )}
            {bombPotEnabled && (
              <Button
                size="sm"
                onClick={triggerBombPot}
                className="h-7 px-2 bg-orange-600/80 hover:bg-orange-600 text-white text-[10px]"
              >
                <Bomb className="w-3 h-3 mr-1" />
                Bomb Pot
              </Button>
            )}
          </div>
        )}

        {/* Time Bank Button - shows when less than 5 seconds remaining */}
        {isMyTurn && timeBankRemaining > 0 && timeRemaining <= 5 && (
          <div className="absolute top-16 left-2 z-30">
            <Button
              size="sm"
              onClick={handleUseTimeBank}
              className="h-7 px-2 bg-blue-600/80 hover:bg-blue-600 text-white text-[10px] animate-pulse"
            >
              <Clock className="w-3 h-3 mr-1" />
              +30s ({timeBankRemaining}s)
            </Button>
          </div>
        )}

        {/* Rabbit Hunt */}
        {myPlayer?.isFolded && tableState?.phase !== 'showdown' && tableState?.phase !== 'waiting' && (
          <div className="absolute top-16 left-2 z-30">
            <Button
              size="sm"
              onClick={() => setShowRabbitHunt(!showRabbitHunt)}
              className="h-7 px-2 bg-purple-600/80 hover:bg-purple-600 text-white text-[10px]"
            >
              <Rabbit className="w-3 h-3 mr-1" />
              Rabbit Hunt
            </Button>
            {showRabbitHunt && (
              <RabbitHuntPanel
                foldedPlayerCards={myCards || []}
                communityCards={tableState?.communityCards || []}
                usedCards={players.flatMap(p => p.holeCards || [])}
                potSize={tableState?.pot || 0}
                onPurchase={(cost) => toast.info(`Rabbit: -${cost}`)}
                className="mt-2"
              />
            )}
          </div>
        )}
      </div>

      {/* Action Panel - PPPoker style */}
      <div className="z-20">
        {error && <p className="text-red-400 text-xs mb-2 text-center bg-black/50 py-1">{error}</p>}
        
        {!isConnected && !isConnecting ? (
          <div className="flex items-center justify-center py-4 bg-black/90 text-red-400">
            <WifiOff className="h-4 w-4 mr-2" />
            Переподключение...
          </div>
        ) : isConnecting ? (
          <div className="flex items-center justify-center py-4 bg-black/90 text-white/50">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Подключение...
          </div>
        ) : tableState?.phase === 'waiting' ? (
          <div className="flex gap-2 p-3 bg-gradient-to-t from-black to-black/90">
            <Button
              onClick={startHand}
              disabled={players.length < 2}
              className="flex-1 h-14 bg-gradient-to-b from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 border-t border-green-400/50"
            >
              <Zap className="h-5 w-5 mr-2" />
              {players.length < 2 ? `Нужно 2+ игрока (${players.length}/2)` : 'Начать игру'}
            </Button>
            <Button 
              onClick={handleLeave} 
              className="h-14 px-5 bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white rounded-xl border-t border-slate-500/50"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : tableState?.phase === 'showdown' ? (
          <div className="p-3 bg-gradient-to-t from-black to-black/90">
            <Button 
              onClick={startHand} 
              className="w-full h-14 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 border-t border-blue-400/50"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Новая раздача {nextHandCountdown > 0 ? `(${nextHandCountdown}s)` : ''}
            </Button>
          </div>
        ) : (
          <PPPokerActionButtons
            isMyTurn={isMyTurn}
            canCheck={canCheck}
            callAmount={callAmount}
            minRaise={minRaise}
            maxRaise={myPlayer?.stack || 1000}
            currentBet={tableState?.currentBet || 0}
            pot={tableState?.pot || 0}
            myStack={myPlayer?.stack || 0}
            onFold={fold}
            onCheck={check}
            onCall={call}
            onRaise={raise}
            onAllIn={allIn}
            disabled={!isConnected}
          />
        )}
      </div>
    </div>
    </PokerErrorBoundary>
  );
}
