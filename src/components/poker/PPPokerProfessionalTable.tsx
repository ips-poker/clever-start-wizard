import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Volume2, VolumeX, MessageSquare, Users, Loader2, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Hooks
import { usePokerTable, PokerPlayer, TableState } from '@/hooks/usePokerTable';
import { useReconnectManager } from '@/hooks/useReconnectManager';
import { usePokerSounds } from '@/hooks/usePokerSounds';

// Error boundary and connection banner
import { PokerErrorBoundary } from './PokerErrorBoundary';
import { ConnectionStatusBanner } from './ConnectionStatusBanner';

// PPPoker-style seat positions (6-max optimized for mobile)
const SEAT_POSITIONS_6MAX = [
  { x: 50, y: 88, angle: 0 },     // Seat 1 (bottom center - hero)
  { x: 8, y: 62, angle: 45 },     // Seat 2 (left bottom)
  { x: 8, y: 28, angle: 90 },     // Seat 3 (left top)
  { x: 50, y: 8, angle: 180 },    // Seat 4 (top center)
  { x: 92, y: 28, angle: 270 },   // Seat 5 (right top)
  { x: 92, y: 62, angle: 315 },   // Seat 6 (right bottom)
];

// 9-max positions
const SEAT_POSITIONS_9MAX = [
  { x: 50, y: 92 },    // 1 - hero bottom
  { x: 15, y: 78 },    // 2
  { x: 3, y: 50 },     // 3
  { x: 15, y: 22 },    // 4
  { x: 35, y: 8 },     // 5
  { x: 65, y: 8 },     // 6
  { x: 85, y: 22 },    // 7
  { x: 97, y: 50 },    // 8
  { x: 85, y: 78 },    // 9
];

// ============= PPPOKER STYLE CARD COMPONENT =============
const PPCard = memo(function PPCard({
  card,
  faceDown = false,
  size = 'md',
  delay = 0,
  isWinning = false
}: {
  card: string;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  delay?: number;
  isWinning?: boolean;
}) {
  const sizeClasses = {
    xs: 'w-6 h-9 text-[8px]',
    sm: 'w-8 h-11 text-[10px]',
    md: 'w-11 h-16 text-sm',
    lg: 'w-14 h-20 text-base'
  };

  const getSuitSymbol = (suit: string) => {
    const suits: Record<string, string> = { 
      h: '♥', d: '♦', c: '♣', s: '♠',
      H: '♥', D: '♦', C: '♣', S: '♠'
    };
    return suits[suit] || suit;
  };

  const getSuitColor = (suit: string) => {
    return ['h', 'd', 'H', 'D'].includes(suit) ? 'text-red-500' : 'text-gray-900';
  };

  if (faceDown) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -30, rotateY: 180 }}
        animate={{ opacity: 1, y: 0, rotateY: 0 }}
        transition={{ duration: 0.3, delay: delay * 0.1 }}
        className={cn(
          sizeClasses[size],
          "rounded-md bg-gradient-to-br from-blue-800 via-blue-900 to-blue-950",
          "border border-blue-600 shadow-lg",
          "flex items-center justify-center"
        )}
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 3px,
            rgba(255,255,255,0.03) 3px,
            rgba(255,255,255,0.03) 6px
          )`
        }}
      >
        <div className="w-3/5 h-3/5 rounded border border-blue-400/30" />
      </motion.div>
    );
  }

  const rank = card.slice(0, -1);
  const suit = card.slice(-1);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: -20 }}
      animate={{ 
        opacity: 1, 
        scale: isWinning ? 1.05 : 1, 
        y: 0,
        boxShadow: isWinning ? '0 0 20px rgba(255,215,0,0.6)' : '0 4px 12px rgba(0,0,0,0.4)'
      }}
      transition={{ duration: 0.25, delay: delay * 0.08 }}
      className={cn(
        sizeClasses[size],
        "rounded-md bg-white shadow-xl",
        "border border-gray-200",
        "flex flex-col items-center justify-center font-bold",
        getSuitColor(suit),
        isWinning && "ring-2 ring-yellow-400"
      )}
    >
      <span className="leading-none">{rank}</span>
      <span className="leading-none text-lg">{getSuitSymbol(suit)}</span>
    </motion.div>
  );
});

// ============= CHIP DISPLAY =============
const ChipDisplay = memo(function ChipDisplay({ 
  amount, 
  size = 'md' 
}: { 
  amount: number; 
  size?: 'sm' | 'md' | 'lg' 
}) {
  const formatAmount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        sizeClasses[size],
        "bg-black/70 rounded-full text-amber-400 font-bold",
        "flex items-center gap-1"
      )}
    >
      <div className="w-2 h-2 rounded-full bg-amber-500" />
      {formatAmount(amount)}
    </motion.div>
  );
});

// ============= TIMER RING =============
const TimerRing = memo(function TimerRing({ 
  remaining, 
  total,
  size = 64
}: { 
  remaining: number; 
  total: number;
  size?: number;
}) {
  const progress = Math.max(0, Math.min(1, remaining / total));
  const circumference = 2 * Math.PI * (size / 2 - 3);
  const strokeDashoffset = circumference * (1 - progress);
  const isWarning = progress < 0.25;
  const isCritical = progress < 0.1;

  return (
    <svg 
      className="absolute inset-0 pointer-events-none"
      width={size}
      height={size}
      style={{ 
        left: '50%', 
        top: '50%', 
        transform: 'translate(-50%, -50%) rotate(-90deg)' 
      }}
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 3}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="2.5"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 3}
        fill="none"
        stroke={isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#22c55e"}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        className={cn(
          "transition-all duration-500",
          isCritical && "animate-pulse"
        )}
      />
    </svg>
  );
});

// ============= ACTION BADGE =============
const ActionBadge = memo(function ActionBadge({ 
  action, 
  amount 
}: { 
  action: string; 
  amount?: number 
}) {
  const actionConfig: Record<string, { bg: string; text: string }> = {
    fold: { bg: 'bg-gray-600', text: 'Fold' },
    check: { bg: 'bg-blue-600', text: 'Check' },
    call: { bg: 'bg-green-600', text: amount ? `Call ${amount}` : 'Call' },
    bet: { bg: 'bg-amber-600', text: amount ? `Bet ${amount}` : 'Bet' },
    raise: { bg: 'bg-orange-600', text: amount ? `Raise ${amount}` : 'Raise' },
    allin: { bg: 'bg-red-600', text: 'All-In' },
  };

  const config = actionConfig[action.toLowerCase()] || { bg: 'bg-gray-500', text: action };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.8 }}
      className={cn(
        config.bg,
        "px-2 py-0.5 rounded-full text-white text-[9px] font-bold uppercase",
        "shadow-lg"
      )}
    >
      {config.text}
    </motion.div>
  );
});

// ============= PLAYER SEAT (PPPoker Style) =============
const PlayerSeat = memo(function PlayerSeat({
  player,
  position,
  isHero,
  showCards,
  isDealer,
  isSB,
  isBB,
  isCurrentTurn,
  turnTimeRemaining,
  turnDuration = 30,
  lastAction
}: {
  player: PokerPlayer | null;
  position: { x: number; y: number };
  isHero: boolean;
  showCards: boolean;
  isDealer: boolean;
  isSB: boolean;
  isBB: boolean;
  isCurrentTurn: boolean;
  turnTimeRemaining?: number;
  turnDuration?: number;
  lastAction?: { action: string; amount?: number } | null;
}) {
  // Empty seat
  if (!player) {
    return (
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12"
        style={{ left: `${position.x}%`, top: `${position.y}%` }}
      >
        <div className="w-full h-full rounded-full border-2 border-dashed border-white/20 
                        flex items-center justify-center text-white/30 text-[10px]">
          +
        </div>
      </div>
    );
  }

  const avatarSize = isHero ? 'w-14 h-14' : 'w-12 h-12';
  const showTurnTimer = isCurrentTurn && !player.isFolded && !player.isAllIn;

  return (
    <motion.div
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 z-10",
        isHero ? "z-20" : "z-10"
      )}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 25 }}
    >
      {/* Player cards */}
      {player.holeCards && player.holeCards.length > 0 && !player.isFolded && (
        <div className={cn(
          "absolute flex gap-0.5 z-5",
          isHero ? "-top-14 left-1/2 -translate-x-1/2" : "-top-10 left-1/2 -translate-x-1/2"
        )}>
          {player.holeCards.map((card, idx) => (
            <PPCard
              key={`${card}-${idx}`}
              card={card}
              faceDown={!showCards && !isHero}
              size={isHero ? 'sm' : 'xs'}
              delay={idx}
            />
          ))}
        </div>
      )}

      {/* Turn timer ring */}
      {showTurnTimer && turnTimeRemaining !== undefined && (
        <TimerRing 
          remaining={turnTimeRemaining} 
          total={turnDuration} 
          size={isHero ? 64 : 54}
        />
      )}

      {/* Avatar container */}
      <div className={cn(
        avatarSize,
        "relative rounded-full overflow-hidden",
        "border-2 transition-all duration-300",
        player.isFolded && "opacity-40 grayscale",
        player.isAllIn && "ring-2 ring-red-500 ring-offset-1 ring-offset-black",
        isCurrentTurn && !player.isFolded 
          ? "border-amber-400 shadow-lg shadow-amber-400/40" 
          : "border-white/30"
      )}>
        {/* Avatar background */}
        <div 
          className="absolute inset-0"
          style={{
            background: player.avatarUrl 
              ? `url(${player.avatarUrl}) center/cover` 
              : `linear-gradient(135deg, 
                  hsl(${(player.seatNumber * 45) % 360}, 50%, 35%), 
                  hsl(${(player.seatNumber * 45 + 40) % 360}, 50%, 25%))`
          }}
        />
        
        {/* Initials fallback */}
        {!player.avatarUrl && (
          <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
            {(player.name || 'P').charAt(0).toUpperCase()}
          </div>
        )}

        {/* Folded overlay */}
        {player.isFolded && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-[8px] text-white/70 font-medium">FOLD</span>
          </div>
        )}
      </div>

      {/* Dealer button */}
      {isDealer && (
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white 
                        text-gray-900 text-[8px] font-black flex items-center justify-center 
                        shadow-lg border border-gray-200">
          D
        </div>
      )}

      {/* SB/BB badge */}
      {(isSB || isBB) && (
        <div className={cn(
          "absolute -bottom-1 -left-1 w-5 h-5 rounded-full text-white text-[7px] font-bold",
          "flex items-center justify-center shadow",
          isBB ? "bg-amber-500" : "bg-blue-500"
        )}>
          {isBB ? 'BB' : 'SB'}
        </div>
      )}

      {/* Player name & stack */}
      <div className="absolute top-full mt-0.5 left-1/2 -translate-x-1/2 text-center min-w-[60px]">
        <div className="text-white text-[9px] font-medium truncate max-w-[70px]">
          {isHero ? 'Вы' : (player.name || 'Player')}
        </div>
        <div className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block",
          player.isAllIn 
            ? "bg-red-600 text-white animate-pulse" 
            : "bg-black/60 text-amber-400"
        )}>
          {player.isAllIn ? 'ALL-IN' : player.stack.toLocaleString()}
        </div>
      </div>

      {/* Current bet */}
      {player.betAmount > 0 && (
        <div className={cn(
          "absolute",
          isHero ? "top-[80%] left-1/2 -translate-x-1/2" : "top-[75%]",
          position.x > 50 ? "left-[-50%]" : "left-[150%] -translate-x-full"
        )}>
          <ChipDisplay amount={player.betAmount} size="sm" />
        </div>
      )}

      {/* Action badge */}
      <AnimatePresence>
        {lastAction && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
            <ActionBadge action={lastAction.action} amount={lastAction.amount} />
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}, (prev, next) => {
  // Deep equality check to prevent unnecessary re-renders
  return (
    prev.player?.oderId === next.player?.oderId &&
    prev.player?.stack === next.player?.stack &&
    prev.player?.isFolded === next.player?.isFolded &&
    prev.player?.isAllIn === next.player?.isAllIn &&
    prev.player?.betAmount === next.player?.betAmount &&
    JSON.stringify(prev.player?.holeCards) === JSON.stringify(next.player?.holeCards) &&
    prev.showCards === next.showCards &&
    prev.isDealer === next.isDealer &&
    prev.isSB === next.isSB &&
    prev.isBB === next.isBB &&
    prev.isCurrentTurn === next.isCurrentTurn &&
    prev.turnTimeRemaining === next.turnTimeRemaining &&
    prev.lastAction?.action === next.lastAction?.action
  );
});

// ============= PPPOKER TABLE FELT =============
const PPPokerTableFelt = memo(function PPPokerTableFelt() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      {/* Dark background */}
      <div className="absolute inset-0 bg-gray-900" />
      
      {/* Table oval */}
      <div 
        className="absolute inset-[5%] rounded-[50%]"
        style={{
          background: 'linear-gradient(180deg, #1a4a30 0%, #0d2818 50%, #1a4a30 100%)',
          boxShadow: `
            inset 0 0 80px rgba(0,0,0,0.5),
            inset 0 2px 10px rgba(255,255,255,0.05),
            0 20px 60px rgba(0,0,0,0.8)
          `
        }}
      >
        {/* Felt texture */}
        <div 
          className="absolute inset-0 rounded-[50%] opacity-40"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
          }}
        />
        
        {/* Rail highlight */}
        <div className="absolute inset-0 rounded-[50%] border-4 border-amber-900/30" />
        
        {/* Center decorative rings */}
        <div className="absolute inset-[20%] rounded-[50%] border border-white/5" />
        <div className="absolute inset-[30%] rounded-[50%] border border-white/3" />
      </div>
    </div>
  );
});

// ============= COMMUNITY CARDS =============
const CommunityCards = memo(function CommunityCards({
  cards,
  phase
}: {
  cards: string[];
  phase: string;
}) {
  const visibleCount = useMemo(() => {
    switch (phase) {
      case 'flop': return 3;
      case 'turn': return 4;
      case 'river':
      case 'showdown': return 5;
      default: return 0;
    }
  }, [phase]);

  return (
    <div className="flex items-center justify-center gap-1.5">
      {[0, 1, 2, 3, 4].map((idx) => {
        const card = cards[idx];
        const isVisible = idx < visibleCount;

        return (
          <div key={idx} className="relative">
            {isVisible && card ? (
              <PPCard card={card} size="md" delay={idx} />
            ) : (
              <div 
                className="w-11 h-16 rounded-md border border-white/10 bg-black/20"
                style={{ boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});

// ============= POT DISPLAY =============
const PotDisplay = memo(function PotDisplay({ pot }: { pot: number }) {
  if (pot <= 0) return null;

  const formatAmount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toLocaleString();
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="flex flex-col items-center gap-1"
    >
      {/* Chip stack visual */}
      <div className="relative w-10 h-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute w-6 h-6 rounded-full border-2 border-amber-400 bg-gradient-to-br from-amber-500 to-amber-700"
            style={{
              left: `${i * 6}px`,
              top: `${-i * 2}px`,
              boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
            }}
          />
        ))}
      </div>
      
      {/* Pot amount */}
      <div className="px-3 py-1 bg-black/60 rounded-full">
        <span className="text-amber-400 font-bold text-sm">
          Pot: {formatAmount(pot)}
        </span>
      </div>
    </motion.div>
  );
});

// ============= ACTION PANEL (PPPoker Style) =============
const PPPokerActionPanel = memo(function PPPokerActionPanel({
  isVisible,
  canCheck,
  callAmount,
  minRaise,
  maxBet,
  pot,
  onAction
}: {
  isVisible: boolean;
  canCheck: boolean;
  callAmount: number;
  minRaise: number;
  maxBet: number;
  pot: number;
  onAction: (action: 'fold' | 'check' | 'call' | 'raise' | 'allin', amount?: number) => void;
}) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);

  useEffect(() => {
    setRaiseAmount(Math.max(minRaise, callAmount * 2));
  }, [minRaise, callAmount]);

  if (!isVisible) return null;

  const presets = [
    { label: '½ Pot', amount: Math.floor(pot / 2) },
    { label: 'Pot', amount: pot },
    { label: '2x', amount: callAmount * 2 },
    { label: '3x', amount: callAmount * 3 },
  ].filter(p => p.amount >= minRaise && p.amount <= maxBet);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-gray-950 via-gray-900/98 to-transparent"
    >
      {/* Presets */}
      <div className="flex justify-center gap-1.5 mb-3">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => setRaiseAmount(preset.amount)}
            className={cn(
              "h-7 text-[10px] px-2 border-white/20 bg-white/5 text-white/80 hover:bg-white/10",
              raiseAmount === preset.amount && "bg-amber-600/30 border-amber-500 text-amber-400"
            )}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Slider */}
      <div className="mx-auto max-w-[280px] mb-3">
        <div className="relative">
          <input
            type="range"
            min={minRaise}
            max={maxBet}
            value={raiseAmount}
            onChange={(e) => setRaiseAmount(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-white/20 cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 
                       [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full 
                       [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:shadow-lg
                       [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
          />
        </div>
        <div className="text-center text-amber-400 font-bold text-lg mt-1">
          {raiseAmount.toLocaleString()}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-2">
        {/* Fold */}
        <Button
          onClick={() => onAction('fold')}
          className="flex-1 max-w-[72px] h-12 bg-gradient-to-b from-red-600 to-red-700 
                     hover:from-red-500 hover:to-red-600 text-white font-bold text-xs rounded-xl
                     shadow-lg active:scale-95 transition-transform"
        >
          Фолд
        </Button>

        {/* Check/Call */}
        {canCheck ? (
          <Button
            onClick={() => onAction('check')}
            className="flex-1 max-w-[72px] h-12 bg-gradient-to-b from-blue-600 to-blue-700 
                       hover:from-blue-500 hover:to-blue-600 text-white font-bold text-xs rounded-xl
                       shadow-lg active:scale-95 transition-transform"
          >
            Чек
          </Button>
        ) : (
          <Button
            onClick={() => onAction('call')}
            className="flex-1 max-w-[90px] h-12 bg-gradient-to-b from-green-600 to-green-700 
                       hover:from-green-500 hover:to-green-600 text-white font-bold text-xs rounded-xl
                       shadow-lg active:scale-95 transition-transform"
          >
            <div className="flex flex-col items-center leading-tight">
              <span>Колл</span>
              <span className="text-[9px] opacity-80">{callAmount.toLocaleString()}</span>
            </div>
          </Button>
        )}

        {/* Raise */}
        <Button
          onClick={() => onAction('raise', raiseAmount)}
          className="flex-1 max-w-[90px] h-12 bg-gradient-to-b from-amber-600 to-amber-700 
                     hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs rounded-xl
                     shadow-lg active:scale-95 transition-transform"
        >
          <div className="flex flex-col items-center leading-tight">
            <span>Рейз</span>
            <span className="text-[9px] opacity-80">{raiseAmount.toLocaleString()}</span>
          </div>
        </Button>

        {/* All-in */}
        <Button
          onClick={() => onAction('allin')}
          className="flex-1 max-w-[72px] h-12 bg-gradient-to-b from-purple-600 to-purple-700 
                     hover:from-purple-500 hover:to-purple-600 text-white font-bold text-xs rounded-xl
                     shadow-lg active:scale-95 transition-transform"
        >
          All-in
        </Button>
      </div>
    </motion.div>
  );
});

// ============= WINNER OVERLAY =============
const WinnerOverlay = memo(function WinnerOverlay({
  winners,
  onClose
}: {
  winners: Array<{ name?: string; amount: number; handRank?: string }>;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!winners.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/40"
    >
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        className="bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-600 
                   rounded-2xl p-6 shadow-2xl text-center"
      >
        <div className="text-3xl mb-2">🏆</div>
        <div className="text-gray-900 font-bold text-lg">
          {winners[0].name || 'Победитель'}
        </div>
        <div className="text-gray-800 text-xl font-bold">
          +{winners[0].amount.toLocaleString()}
        </div>
        {winners[0].handRank && (
          <div className="text-gray-700 text-sm mt-1">
            {winners[0].handRank}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
});

// ============= MAIN COMPONENT =============
interface PPPokerProfessionalTableProps {
  tableId: string;
  playerId: string;
  buyIn: number;
  isTournament?: boolean;
  tournamentId?: string;
  onLeave: () => void;
  maxSeats?: 6 | 9;
}

export function PPPokerProfessionalTable({
  tableId,
  playerId,
  buyIn,
  isTournament = false,
  tournamentId,
  onLeave,
  maxSeats = 6
}: PPPokerProfessionalTableProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [turnTimeRemaining, setTurnTimeRemaining] = useState<number | null>(null);
  const [playerActions, setPlayerActions] = useState<Record<string, { action: string; amount?: number }>>({});

  const sounds = usePokerSounds();
  const SEAT_POSITIONS = maxSeats === 6 ? SEAT_POSITIONS_6MAX : SEAT_POSITIONS_9MAX;

  // Poker table hook
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
    onMaxRetriesReached: () => console.log('[PPPokerTable] Max retries reached')
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

  // Turn sound and timer
  useEffect(() => {
    if (isMyTurn) {
      sounds.playTurn();
      setTurnTimeRemaining(tableState?.actionTimer || 30);
      
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

  // Track last actions for badges
  useEffect(() => {
    if (lastAction && lastAction.playerId) {
      setPlayerActions(prev => ({
        ...prev,
        [lastAction.playerId]: { 
          action: lastAction.action, 
          amount: lastAction.amount 
        }
      }));
      
      // Clear action after 2s
      setTimeout(() => {
        setPlayerActions(prev => {
          const next = { ...prev };
          delete next[lastAction.playerId];
          return next;
        });
      }, 2000);
      
      // Play sound
      switch (lastAction.action) {
        case 'fold': sounds.playFold(); break;
        case 'check': sounds.playCheck(); break;
        case 'call': sounds.playCall(); break;
        case 'raise':
        case 'bet': sounds.playRaise(); break;
        case 'allin': sounds.playAllIn(); break;
      }
    }
  }, [lastAction]);

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

  // Memoized players array
  const players = useMemo(() => {
    if (!tableState) return [];
    return SEAT_POSITIONS.map((pos, idx) => {
      const seatNumber = idx + 1;
      const player = tableState.players.find(p => p.seatNumber === seatNumber);
      return { position: pos, seatNumber, player };
    });
  }, [tableState?.players, SEAT_POSITIONS]);

  // Loading state
  if (isConnecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-900 rounded-2xl">
        <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
        <p className="text-white/60 mt-4">Подключение к столу...</p>
      </div>
    );
  }

  // Error state
  if (error && !isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-900 rounded-2xl p-6">
        <p className="text-red-400 mb-4">{error}</p>
        <div className="flex gap-2">
          <Button onClick={connect}>Переподключиться</Button>
          <Button variant="outline" onClick={onLeave}>Выйти</Button>
        </div>
      </div>
    );
  }

  return (
    <PokerErrorBoundary onReset={connect} onGoHome={handleLeave}>
      <div className="relative w-full min-h-[500px] bg-gray-950 rounded-2xl overflow-hidden">
        {/* Connection status */}
        <ConnectionStatusBanner
          status={reconnectManager.status}
          retryCount={reconnectManager.retryCount}
          nextRetryIn={reconnectManager.nextRetryIn}
          onReconnectNow={reconnectManager.reconnectNow}
          onCancel={reconnectManager.cancelReconnect}
        />

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2">
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
            {tableState?.smallBlindAmount}/{tableState?.bigBlindAmount}
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
        <div className="relative w-full aspect-[4/3] max-h-[65vh]">
          <PPPokerTableFelt />

          {/* Pot */}
          {tableState && (
            <div className="absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 z-10">
              <PotDisplay pot={tableState.pot} />
            </div>
          )}

          {/* Blinds info */}
          {tableState && tableState.phase !== 'waiting' && (
            <div className="absolute left-1/2 top-[58%] -translate-x-1/2 z-10">
              <div className="text-white/50 text-[10px]">
                Блайнды: {tableState.smallBlindAmount}/{tableState.bigBlindAmount}
              </div>
            </div>
          )}

          {/* Community cards */}
          {tableState && (
            <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 z-10">
              <CommunityCards cards={tableState.communityCards} phase={tableState.phase} />
            </div>
          )}

          {/* Player seats */}
          {players.map(({ position, seatNumber, player }) => (
            <PlayerSeat
              key={seatNumber}
              player={player || null}
              position={position}
              isHero={player?.oderId === playerId}
              showCards={tableState?.phase === 'showdown'}
              isDealer={tableState?.dealerSeat === seatNumber}
              isSB={tableState?.smallBlindSeat === seatNumber}
              isBB={tableState?.bigBlindSeat === seatNumber}
              isCurrentTurn={tableState?.currentPlayerSeat === seatNumber}
              turnTimeRemaining={
                tableState?.currentPlayerSeat === seatNumber && player?.oderId === playerId
                  ? turnTimeRemaining || undefined
                  : undefined
              }
              turnDuration={tableState?.actionTimer || 30}
              lastAction={player ? playerActions[player.oderId] : null}
            />
          ))}

          {/* Phase indicator */}
          {tableState && tableState.phase !== 'waiting' && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10">
              <span className="px-3 py-1 rounded-full bg-black/50 text-white/70 text-[10px] uppercase tracking-wider">
                {tableState.phase}
              </span>
            </div>
          )}

          {/* Waiting for players */}
          {tableState?.playersNeeded && tableState.playersNeeded > 0 && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="bg-black/80 rounded-xl px-6 py-4 text-center">
                <Users className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="text-white text-sm">
                  Ожидание игроков ({tableState.playersNeeded})
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Start hand button */}
        {tableState?.phase === 'waiting' && !tableState.playersNeeded && (
          <div className="flex justify-center px-4 py-4">
            <Button 
              onClick={startHand} 
              className="gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600"
            >
              Начать раздачу
            </Button>
          </div>
        )}

        {/* Action panel */}
        <AnimatePresence>
          {isMyTurn && tableState && tableState.phase !== 'waiting' && myPlayer && (
            <PPPokerActionPanel
              isVisible={true}
              canCheck={canCheck}
              callAmount={callAmount}
              minRaise={tableState.minRaise || tableState.bigBlindAmount || 40}
              maxBet={myPlayer.stack}
              pot={tableState.pot}
              onAction={handleAction}
            />
          )}
        </AnimatePresence>

        {/* Winner overlay */}
        <AnimatePresence>
          {showdownResult && showdownResult.winners.length > 0 && (
            <WinnerOverlay
              winners={showdownResult.winners.map(w => ({
                name: w.name,
                amount: w.amount,
                handRank: w.handRank
              }))}
              onClose={clearShowdown}
            />
          )}
        </AnimatePresence>
      </div>
    </PokerErrorBoundary>
  );
}

export default PPPokerProfessionalTable;
