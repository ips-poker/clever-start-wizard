import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Volume2, VolumeX, MessageSquare, Settings, LogOut, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Stable components
import { StablePokerCard } from './stable/StablePokerCard';
import { StableChipStack } from './stable/StableChipStack';

// Animations
import { PhaseTransition, ActionBubble } from './animations';
import { useAnimationQueue } from '@/hooks/useAnimationQueue';
import { usePokerSounds } from '@/hooks/usePokerSounds';

// Hooks
import { usePokerTable, PokerPlayer, TableState } from '@/hooks/usePokerTable';
import { useReconnectManager, ConnectionStatus } from '@/hooks/useReconnectManager';

// Error boundary and connection banner
import { PokerErrorBoundary } from './PokerErrorBoundary';
import { ConnectionStatusBanner } from './ConnectionStatusBanner';

// Seat positions for 9-max table (PPPoker layout)
const SEAT_POSITIONS = [
  { x: 50, y: 90, angle: 0 },     // Seat 1 (bottom center - hero)
  { x: 12, y: 75, angle: 30 },    // Seat 2
  { x: 3, y: 45, angle: 60 },     // Seat 3
  { x: 12, y: 18, angle: 90 },    // Seat 4
  { x: 35, y: 5, angle: 120 },    // Seat 5
  { x: 65, y: 5, angle: 150 },    // Seat 6
  { x: 88, y: 18, angle: 180 },   // Seat 7
  { x: 97, y: 45, angle: 210 },   // Seat 8
  { x: 88, y: 75, angle: 240 },   // Seat 9
];

// ============= STABLE MEMOIZED COMPONENTS =============

// Table felt with PPPoker-style design
const TableFelt = memo(function TableFelt() {
  return (
    <div className="absolute inset-0">
      {/* Outer frame */}
      <div 
        className="absolute inset-0 rounded-[50%]"
        style={{
          background: 'linear-gradient(180deg, #2d1810 0%, #1a0f0a 50%, #2d1810 100%)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
        }}
      />
      {/* Inner felt */}
      <div 
        className="absolute inset-[3%] rounded-[50%]"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, #2d7a4a 0%, #1a5a3a 40%, #0d3d28 100%)',
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5), inset 0 4px 20px rgba(255,255,255,0.05)'
        }}
      >
        {/* Felt texture */}
        <div 
          className="absolute inset-0 rounded-[50%] opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }}
        />
        {/* Center line decoration */}
        <div className="absolute inset-[15%] rounded-[50%] border border-white/5" />
        <div className="absolute inset-[25%] rounded-[50%] border border-white/3" />
      </div>
    </div>
  );
});

// Animated value display
const AnimatedValue = memo(function AnimatedValue({ value }: { value: number }) {
  return <span className="tabular-nums">{value.toLocaleString()}</span>;
});

// Timer ring component
const TimerRing = memo(function TimerRing({ 
  duration, 
  remaining, 
  size 
}: { 
  duration: number;
  remaining: number;
  size: number;
}) {
  const progress = remaining / duration;
  const circumference = 2 * Math.PI * (size / 2 - 4);
  const strokeDashoffset = circumference * (1 - progress);
  const isWarning = progress < 0.3;

  return (
    <svg 
      className="absolute inset-0 -rotate-90"
      width={size}
      height={size}
      style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 4}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="3"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 4}
        fill="none"
        stroke={isWarning ? "#ef4444" : "#22c55e"}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        className={cn(
          "transition-all duration-1000",
          isWarning && "animate-pulse"
        )}
      />
    </svg>
  );
});

// Player seat component - heavily memoized
const PlayerSeat = memo(function PlayerSeat({
  player,
  position,
  isHero,
  showCards,
  isDealer,
  isSB,
  isBB,
  turnTimeRemaining,
  turnDuration = 30
}: {
  player: PokerPlayer | null;
  position: { x: number; y: number; angle: number };
  isHero: boolean;
  showCards: boolean;
  isDealer: boolean;
  isSB: boolean;
  isBB: boolean;
  turnTimeRemaining?: number;
  turnDuration?: number;
}) {
  if (!player) {
    // Empty seat
    return (
      <motion.div
        className="absolute w-14 h-14 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${position.x}%`, top: `${position.y}%` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
      >
        <div className="w-full h-full rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
          <span className="text-white/30 text-[10px]">Sit</span>
        </div>
      </motion.div>
    );
  }

  const isTurn = !player.isFolded && !player.isAllIn && turnTimeRemaining !== undefined;

  return (
    <motion.div
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 z-10",
        isHero ? "w-16 h-16" : "w-14 h-14"
      )}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Turn timer ring */}
      {isTurn && turnTimeRemaining !== undefined && (
        <TimerRing 
          duration={turnDuration} 
          remaining={turnTimeRemaining} 
          size={isHero ? 72 : 60}
        />
      )}

      {/* Avatar container */}
      <div 
        className={cn(
          "relative w-full h-full rounded-full overflow-hidden",
          "border-2 transition-all duration-300",
          player.isFolded && "opacity-50 grayscale",
          player.isAllIn && "ring-2 ring-red-500 ring-offset-1 ring-offset-transparent",
          isTurn ? "border-amber-400 shadow-lg shadow-amber-400/30" : "border-white/30"
        )}
        style={{
          background: player.avatarUrl 
            ? `url(${player.avatarUrl}) center/cover` 
            : `linear-gradient(135deg, hsl(${(player.seatNumber * 40) % 360}, 60%, 40%), hsl(${(player.seatNumber * 40 + 30) % 360}, 60%, 30%))`
        }}
      >
        {!player.avatarUrl && (
          <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
            {(player.name || 'P').charAt(0).toUpperCase()}
          </div>
        )}
        
        {/* Dealer button */}
        {isDealer && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-gray-900 text-[8px] font-black flex items-center justify-center shadow-md">
            D
          </div>
        )}
        
        {/* SB/BB badges */}
        {isSB && (
          <div className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-blue-500 text-white text-[7px] font-bold flex items-center justify-center">
            SB
          </div>
        )}
        {isBB && (
          <div className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[7px] font-bold flex items-center justify-center">
            BB
          </div>
        )}
      </div>

      {/* Player info */}
      <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-center min-w-[70px]">
        <div className="text-white text-[10px] font-medium truncate max-w-[70px]">
          {isHero ? 'Вы' : player.name || 'Player'}
        </div>
        <div className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5",
          player.isAllIn 
            ? "bg-red-600 text-white" 
            : "bg-black/60 text-amber-400"
        )}>
          {player.isAllIn ? 'ALL-IN' : <AnimatedValue value={player.stack} />}
        </div>
      </div>

      {/* Player cards */}
      {player.holeCards && player.holeCards.length > 0 && (
        <div 
          className={cn(
            "absolute flex gap-0.5",
            isHero ? "-top-10 left-1/2 -translate-x-1/2" : "-top-8 left-1/2 -translate-x-1/2"
          )}
        >
          {player.holeCards.map((card, idx) => (
            <StablePokerCard
              key={`${card}-${idx}`}
              card={card}
              faceDown={!showCards && !isHero}
              size={isHero ? "sm" : "xs"}
              dealDelay={idx}
            />
          ))}
        </div>
      )}

      {/* Current bet */}
      {player.betAmount > 0 && (
        <div className="absolute top-full mt-8 left-1/2 -translate-x-1/2">
          <StableChipStack amount={player.betAmount} size="sm" showLabel={true} />
        </div>
      )}
    </motion.div>
  );
}, (prev, next) => {
  return (
    prev.player?.playerId === next.player?.playerId &&
    prev.player?.stack === next.player?.stack &&
    prev.player?.isFolded === next.player?.isFolded &&
    prev.player?.isAllIn === next.player?.isAllIn &&
    prev.player?.betAmount === next.player?.betAmount &&
    JSON.stringify(prev.player?.holeCards) === JSON.stringify(next.player?.holeCards) &&
    prev.showCards === next.showCards &&
    prev.isDealer === next.isDealer &&
    prev.isSB === next.isSB &&
    prev.isBB === next.isBB &&
    prev.turnTimeRemaining === next.turnTimeRemaining
  );
});

// Community cards display
const CommunityCards = memo(function CommunityCards({
  cards,
  phase
}: {
  cards: string[];
  phase: string;
}) {
  const placeholders = [0, 1, 2, 3, 4];

  return (
    <div className="flex items-center justify-center gap-1">
      {placeholders.map((idx) => {
        const card = cards[idx];

        return (
          <div key={idx} className="relative">
            {card ? (
              <StablePokerCard
                card={card}
                size="md"
                dealDelay={idx}
              />
            ) : (
              <div 
                className="w-10 h-14 rounded-md border border-white/10 bg-white/5"
                style={{
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});

// Action panel
const ActionPanel = memo(function ActionPanel({
  isVisible,
  canCheck,
  callAmount,
  minRaise,
  playerStack,
  onAction
}: {
  isVisible: boolean;
  canCheck: boolean;
  callAmount: number;
  minRaise: number;
  playerStack: number;
  onAction: (action: 'fold' | 'check' | 'call' | 'raise' | 'allin', amount?: number) => void;
}) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);

  useEffect(() => {
    setRaiseAmount(minRaise);
  }, [minRaise]);

  if (!isVisible) return null;

  const presets = [
    { label: '2x', amount: minRaise * 2 },
    { label: '3x', amount: minRaise * 3 },
    { label: 'Pot', amount: minRaise * 4 },
  ].filter(p => p.amount <= playerStack && p.amount >= minRaise);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent"
    >
      {/* Raise presets */}
      <div className="flex justify-center gap-2 mb-2">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => setRaiseAmount(preset.amount)}
            className={cn(
              "text-xs px-3 py-1 border-white/20 bg-white/5 text-white/80 hover:bg-white/10",
              raiseAmount === preset.amount && "bg-amber-600/30 border-amber-500"
            )}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Raise slider */}
      <div className="mx-auto max-w-xs mb-2">
        <input
          type="range"
          min={minRaise}
          max={playerStack}
          value={raiseAmount}
          onChange={(e) => setRaiseAmount(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none bg-white/20 cursor-pointer"
        />
        <div className="text-center text-amber-400 font-bold text-sm mt-1">
          {raiseAmount.toLocaleString()}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-2">
        <Button
          onClick={() => onAction('fold')}
          className="flex-1 max-w-[80px] h-11 bg-gradient-to-b from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold rounded-xl"
        >
          Fold
        </Button>
        
        {canCheck ? (
          <Button
            onClick={() => onAction('check')}
            className="flex-1 max-w-[80px] h-11 bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-xl"
          >
            Check
          </Button>
        ) : (
          <Button
            onClick={() => onAction('call')}
            className="flex-1 max-w-[80px] h-11 bg-gradient-to-b from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold rounded-xl"
          >
            <div className="flex flex-col items-center">
              <span className="text-xs">Call</span>
              <span className="text-[9px] opacity-80">{callAmount.toLocaleString()}</span>
            </div>
          </Button>
        )}

        <Button
          onClick={() => onAction('raise', raiseAmount)}
          className="flex-1 max-w-[80px] h-11 bg-gradient-to-b from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-xl"
        >
          <div className="flex flex-col items-center">
            <span className="text-xs">Raise</span>
            <span className="text-[9px] opacity-80">{raiseAmount.toLocaleString()}</span>
          </div>
        </Button>

        <Button
          onClick={() => onAction('allin')}
          className="flex-1 max-w-[80px] h-11 bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold rounded-xl"
        >
          <div className="flex flex-col items-center">
            <span className="text-xs">All-in</span>
            <span className="text-[9px] opacity-80">{playerStack.toLocaleString()}</span>
          </div>
        </Button>
      </div>
    </motion.div>
  );
});

// ============= MAIN COMPONENT =============

interface ProductionPokerTableProps {
  tableId: string;
  playerId: string;
  buyIn: number;
  isTournament?: boolean;
  tournamentId?: string;
  onLeave: () => void;
}

export function ProductionPokerTable({
  tableId,
  playerId,
  buyIn,
  isTournament = false,
  tournamentId,
  onLeave
}: ProductionPokerTableProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [previousPhase, setPreviousPhase] = useState<string | null>(null);
  const [turnTimeRemaining, setTurnTimeRemaining] = useState<number | null>(null);
  
  const sounds = usePokerSounds();
  const animationQueue = useAnimationQueue();

  // Poker table hook with real WebSocket/Realtime connection
  const pokerTable = usePokerTable({ tableId, playerId, buyIn });
  
  const {
    isConnected,
    isConnecting,
    error,
    tableState,
    myCards,
    mySeat,
    myPlayer,
    isMyTurn,
    canCheck,
    callAmount,
    lastAction,
    showdownResult,
    connect,
    disconnect,
    fold,
    check,
    call,
    raise,
    allIn,
    startHand,
    clearShowdown
  } = pokerTable;

  // Reconnection manager
  const reconnectManager = useReconnectManager({
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    onReconnect: connect,
    onMaxRetriesReached: () => {
      console.log('[ProductionPokerTable] Max retries reached');
    }
  });

  // Connect on mount
  useEffect(() => {
    connect();
    reconnectManager.markConnected();
    return () => {
      disconnect();
      reconnectManager.reset();
    };
  }, []);

  // Track connection status
  useEffect(() => {
    if (isConnected) {
      reconnectManager.markConnected();
    } else if (!isConnecting && error) {
      reconnectManager.markDisconnected(error);
    }
  }, [isConnected, isConnecting, error]);

  // Sound effects
  useEffect(() => {
    sounds.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Phase change sounds
  useEffect(() => {
    if (tableState?.phase && tableState.phase !== previousPhase) {
      if (previousPhase !== null) {
        sounds.playDeal();
      }
      setPreviousPhase(tableState.phase);
    }
  }, [tableState?.phase]);

  // Turn sound
  useEffect(() => {
    if (isMyTurn) {
      sounds.playTurn();
    }
  }, [isMyTurn]);

  // Action sounds
  useEffect(() => {
    if (lastAction) {
      switch (lastAction.action) {
        case 'fold': sounds.playFold(); break;
        case 'check': sounds.playCheck(); break;
        case 'call': sounds.playCall(); break;
        case 'raise': sounds.playRaise(); break;
        case 'all-in': sounds.playAllIn(); break;
      }
    }
  }, [lastAction]);

  // Turn timer countdown
  useEffect(() => {
    if (isMyTurn && tableState?.actionTimer) {
      setTurnTimeRemaining(tableState.actionTimer);
      const interval = setInterval(() => {
        setTurnTimeRemaining(prev => {
          if (prev === null || prev <= 0) return null;
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTurnTimeRemaining(null);
    }
  }, [isMyTurn, tableState?.currentPlayerSeat]);

  // Handle actions
  const handleAction = useCallback((action: 'fold' | 'check' | 'call' | 'raise' | 'allin', amount?: number) => {
    switch (action) {
      case 'fold': fold(); break;
      case 'check': check(); break;
      case 'call': call(); break;
      case 'raise': raise(amount || 0); break;
      case 'allin': allIn(); break;
    }
  }, [fold, check, call, raise, allIn]);

  const handleLeave = useCallback(() => {
    disconnect();
    onLeave();
  }, [disconnect, onLeave]);

  // Memoized player positions
  const players = useMemo(() => {
    if (!tableState) return [];
    return SEAT_POSITIONS.map((pos, idx) => {
      const seatNumber = idx + 1;
      const player = tableState.players.find(p => p.seatNumber === seatNumber);
      return { position: pos, seatNumber, player };
    });
  }, [tableState?.players]);

  // Loading state
  if (isConnecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-muted-foreground mt-4">Подключение к столу...</p>
      </div>
    );
  }

  // Error state
  if (error && !isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl p-6">
        <p className="text-destructive mb-4">{error}</p>
        <div className="flex gap-2">
          <Button onClick={connect}>Переподключиться</Button>
          <Button variant="outline" onClick={onLeave}>Выйти</Button>
        </div>
      </div>
    );
  }

  return (
    <PokerErrorBoundary onReset={connect} onGoHome={handleLeave}>
      <div className="relative w-full h-full min-h-[500px] bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl overflow-hidden">
        {/* Connection status banner */}
        <ConnectionStatusBanner
          status={reconnectManager.status}
          retryCount={reconnectManager.retryCount}
          nextRetryIn={reconnectManager.nextRetryIn}
          onReconnectNow={reconnectManager.reconnectNow}
          onCancel={reconnectManager.cancelReconnect}
        />

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-gray-900/95 to-transparent">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLeave}
            className="h-8 text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Выйти
          </Button>
          
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500" : "bg-red-500")} />
            <span>{tableState?.smallBlindAmount}/{tableState?.bigBlindAmount}</span>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </div>

        {/* Table area */}
        <div className="relative w-full aspect-[16/10] max-h-[60vh]">
          <TableFelt />

          {/* Pot display */}
          {tableState && tableState.pot > 0 && (
            <div className="absolute left-1/2 top-[35%] -translate-x-1/2 -translate-y-1/2 z-10">
              <StableChipStack amount={tableState.pot} size="md" showLabel={true} />
            </div>
          )}

          {/* Community cards */}
          {tableState && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <CommunityCards 
                cards={tableState.communityCards}
                phase={tableState.phase}
              />
            </div>
          )}

          {/* Player seats */}
          {players.map(({ position, seatNumber, player }) => (
            <PlayerSeat
              key={seatNumber}
              player={player || null}
              position={position}
              isHero={player?.playerId === playerId}
              showCards={tableState?.phase === 'showdown'}
              isDealer={tableState?.dealerSeat === seatNumber}
              isSB={tableState?.smallBlindSeat === seatNumber}
              isBB={tableState?.bigBlindSeat === seatNumber}
              turnTimeRemaining={
                tableState?.currentPlayerSeat === seatNumber && player?.playerId === playerId 
                  ? turnTimeRemaining || undefined 
                  : undefined
              }
              turnDuration={tableState?.actionTimer || 30}
            />
          ))}

          {/* Phase indicator */}
          {tableState && tableState.phase !== 'waiting' && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10">
              <span className="px-3 py-1 rounded-full bg-black/50 text-white/80 text-xs uppercase tracking-wider">
                {tableState.phase}
              </span>
            </div>
          )}
        </div>

        {/* Start hand button (waiting phase) */}
        {tableState?.phase === 'waiting' && (
          <div className="flex justify-center px-4 py-4">
            <Button onClick={startHand} className="gap-2">
              Начать раздачу
            </Button>
          </div>
        )}

        {/* Action panel */}
        <AnimatePresence>
          {isMyTurn && tableState && tableState.phase !== 'waiting' && (
            <ActionPanel
              isVisible={true}
              canCheck={canCheck}
              callAmount={callAmount}
              minRaise={tableState.minRaise || tableState.bigBlindAmount || 40}
              playerStack={myPlayer?.stack || 0}
              onAction={handleAction}
            />
          )}
        </AnimatePresence>
      </div>
    </PokerErrorBoundary>
  );
}

export default ProductionPokerTable;
