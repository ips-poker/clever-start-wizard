import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StablePokerCard } from './StablePokerCard';
import { StableChipStack } from './StableChipStack';

interface Player {
  id: string;
  name: string;
  avatar?: string;
  stack: number;
  cards?: string[];
  isDealer?: boolean;
  isFolded?: boolean;
  isAllIn?: boolean;
  isTurn?: boolean;
  currentBet?: number;
  lastAction?: string;
}

interface StablePlayerSeatProps {
  player: Player | null;
  position: { x: number; y: number };
  isHero?: boolean;
  showCards?: boolean;
  timeRemaining?: number;
  timeDuration?: number;
  seatIndex: number;
}

// Stable timer ring - PPPoker style with pulse animation
const TimerRing = memo(function TimerRing({ 
  remaining, 
  duration, 
  size 
}: { 
  remaining: number; 
  duration: number; 
  size: number;
}) {
  const progress = remaining / duration;
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.max(0, Math.min(1, progress)));
  
  const isWarning = progress < 0.25;
  const isCritical = progress < 0.1;
  
  const color = isCritical 
    ? '#ef4444' 
    : isWarning 
      ? '#f59e0b' 
      : '#22c55e';

  return (
    <svg 
      className="absolute -inset-1.5 -rotate-90 pointer-events-none"
      width={size + 6} 
      height={size + 6}
    >
      {/* Background track */}
      <circle
        cx={(size + 6) / 2}
        cy={(size + 6) / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="3"
      />
      {/* Progress ring */}
      <circle
        cx={(size + 6) / 2}
        cy={(size + 6) / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={cn(
          'transition-all duration-200',
          isCritical && 'animate-pulse'
        )}
        style={{
          filter: isCritical ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.6))' : 
                 isWarning ? 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.4))' : 
                 'drop-shadow(0 0 3px rgba(34, 197, 94, 0.3))'
        }}
      />
      {/* Center glow when critical */}
      {isCritical && (
        <circle
          cx={(size + 6) / 2}
          cy={(size + 6) / 2}
          r={r - 8}
          fill="rgba(239, 68, 68, 0.15)"
          className="animate-pulse"
        />
      )}
    </svg>
  );
}, (prev, next) => 
  Math.abs(prev.remaining - next.remaining) < 0.5 && 
  prev.duration === next.duration && 
  prev.size === next.size
);

// Empty seat placeholder
const EmptySeat = memo(function EmptySeat({ 
  position 
}: { 
  position: { x: number; y: number };
}) {
  return (
    <div
      className="absolute w-14 h-14 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      <div className="w-full h-full rounded-full border-2 border-dashed border-white/20 flex items-center justify-center bg-black/20">
        <span className="text-white/40 text-xs font-medium">Sit</span>
      </div>
    </div>
  );
});

// Action badge component
const ActionBadge = memo(function ActionBadge({ action }: { action: string }) {
  const actionLower = action.toLowerCase();
  
  const bgColor = useMemo(() => {
    if (actionLower.includes('fold')) return 'bg-gray-600';
    if (actionLower.includes('check')) return 'bg-blue-600';
    if (actionLower.includes('call')) return 'bg-green-600';
    if (actionLower.includes('raise') || actionLower.includes('bet')) return 'bg-amber-600';
    if (actionLower.includes('all')) return 'bg-red-600';
    return 'bg-gray-600';
  }, [actionLower]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.8 }}
      className="absolute -top-7 left-1/2 -translate-x-1/2 z-20"
    >
      <div className={cn(
        'px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-lg',
        bgColor
      )}>
        {action}
      </div>
    </motion.div>
  );
}, (prev, next) => prev.action === next.action);

// Main player seat component
export const StablePlayerSeat = memo(function StablePlayerSeat({
  player,
  position,
  isHero = false,
  showCards = false,
  timeRemaining,
  timeDuration = 30,
  seatIndex
}: StablePlayerSeatProps) {
  if (!player) {
    return <EmptySeat position={position} />;
  }

  const isTurn = player.isTurn && !player.isFolded && !player.isAllIn;
  const avatarSize = isHero ? 'w-16 h-16' : 'w-12 h-12';
  const ringSize = isHero ? 72 : 56;

  // Generate stable avatar color based on seat
  const avatarBg = useMemo(() => {
    const hue = (seatIndex * 45) % 360;
    return `linear-gradient(135deg, hsl(${hue}, 60%, 45%), hsl(${hue + 30}, 60%, 35%))`;
  }, [seatIndex]);

  return (
    <div
      className={cn(
        'absolute -translate-x-1/2 -translate-y-1/2 z-10',
        isHero ? 'scale-110' : ''
      )}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      {/* Timer ring */}
      {isTurn && timeRemaining !== undefined && (
        <TimerRing 
          remaining={timeRemaining} 
          duration={timeDuration} 
          size={ringSize}
        />
      )}

      {/* Avatar */}
      <div 
        className={cn(
          'relative rounded-full overflow-hidden border-2 transition-all duration-200',
          avatarSize,
          player.isFolded && 'opacity-50 grayscale',
          player.isAllIn && 'ring-2 ring-red-500 ring-offset-1 ring-offset-black',
          isTurn ? 'border-amber-400 shadow-lg shadow-amber-400/40' : 'border-white/40'
        )}
        style={{
          background: player.avatar 
            ? `url(${player.avatar}) center/cover` 
            : avatarBg
        }}
      >
        {!player.avatar && (
          <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">
            {player.name.charAt(0).toUpperCase()}
          </div>
        )}
        
        {/* Dealer button */}
        {player.isDealer && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-gray-900 text-[9px] font-black flex items-center justify-center shadow-md border border-gray-200">
            D
          </div>
        )}
      </div>

      {/* Player info */}
      <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 text-center min-w-[70px]">
        <div className="text-white text-xs font-medium truncate max-w-[80px]">
          {player.name}
        </div>
        <div className={cn(
          'text-xs font-bold px-2 py-0.5 rounded-full mt-0.5',
          player.isAllIn 
            ? 'bg-red-600 text-white' 
            : 'bg-black/70 text-amber-400'
        )}>
          {player.isAllIn ? 'ALL-IN' : player.stack.toLocaleString()}
        </div>
      </div>

      {/* Action badge */}
      <AnimatePresence mode="wait">
        {player.lastAction && (
          <ActionBadge key={player.lastAction} action={player.lastAction} />
        )}
      </AnimatePresence>

      {/* Player cards */}
      {player.cards && player.cards.length > 0 && (
        <div className={cn(
          'absolute flex gap-0.5',
          isHero ? '-top-[70px] left-1/2 -translate-x-1/2' : '-top-12 left-1/2 -translate-x-1/2'
        )}>
          {player.cards.map((card, idx) => (
            <StablePokerCard
              key={`${player.id}-${idx}-${card}`}
              card={card}
              faceDown={!showCards && !isHero}
              size={isHero ? 'md' : 'sm'}
              dealDelay={idx}
            />
          ))}
        </div>
      )}

      {/* Current bet */}
      {player.currentBet && player.currentBet > 0 && (
        <div className="absolute top-full mt-8 left-1/2 -translate-x-1/2">
          <StableChipStack 
            amount={player.currentBet} 
            size="sm" 
            showLabel={true}
          />
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  const p1 = prev.player;
  const p2 = next.player;
  
  if (!p1 && !p2) return true;
  if (!p1 || !p2) return false;
  
  return (
    p1.id === p2.id &&
    p1.stack === p2.stack &&
    p1.isFolded === p2.isFolded &&
    p1.isAllIn === p2.isAllIn &&
    p1.isTurn === p2.isTurn &&
    p1.isDealer === p2.isDealer &&
    p1.currentBet === p2.currentBet &&
    p1.lastAction === p2.lastAction &&
    JSON.stringify(p1.cards) === JSON.stringify(p2.cards) &&
    prev.showCards === next.showCards &&
    prev.timeRemaining === next.timeRemaining &&
    prev.isHero === next.isHero
  );
});

export default StablePlayerSeat;
