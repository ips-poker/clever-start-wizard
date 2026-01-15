// ==========================================
// OPTIMIZED PLAYER SEAT - Zero Flicker
// ==========================================
// Deep memoization, stable references, batched updates

import React, { memo, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StablePokerCard } from './StablePokerCard';
import { StableChipStack } from './StableChipStack';
import { resolveAvatarUrl } from '@/utils/avatarResolver';

interface Player {
  id: string;
  name: string;
  avatar?: string;
  avatarUrl?: string; // Support both avatar and avatarUrl
  stack: number;
  cards?: string[];
  isDealer?: boolean;
  isFolded?: boolean;
  isAllIn?: boolean;
  isTurn?: boolean;
  currentBet?: number;
  lastAction?: string;
}

interface OptimizedPlayerSeatProps {
  player: Player | null;
  position: { x: number; y: number };
  isHero?: boolean;
  showCards?: boolean;
  timeRemaining?: number;
  timeDuration?: number;
  seatIndex: number;
}

// ==========================================
// TIMER RING - Separate component for time updates
// ==========================================
const TimerRing = memo(function TimerRing({ 
  remaining, 
  duration, 
  size 
}: { 
  remaining: number; 
  duration: number; 
  size: number;
}) {
  const progress = duration > 0 ? remaining / duration : 0;
  const circumference = (size - 4) * Math.PI;
  const offset = circumference * (1 - progress);
  
  const color = progress > 0.5 
    ? '#22c55e' 
    : progress > 0.25 
      ? '#f59e0b' 
      : '#ef4444';

  return (
    <svg 
      className="absolute -inset-1 -rotate-90 pointer-events-none z-20"
      width={size} 
      height={size}
      style={{ transform: 'rotate(-90deg)' }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={(size - 4) / 2}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="2"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={(size - 4) / 2}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-200 ease-linear"
      />
    </svg>
  );
}, (prev, next) => 
  prev.remaining === next.remaining && 
  prev.duration === next.duration
);

// ==========================================
// EMPTY SEAT
// ==========================================
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
      <div className="w-full h-full rounded-full border-2 border-dashed border-white/20 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <span className="text-white/40 text-xs font-medium">Sit</span>
      </div>
    </div>
  );
});

// ==========================================
// ACTION BADGE - Animated action display
// ==========================================
const ActionBadge = memo(function ActionBadge({ action }: { action: string }) {
  const actionLower = action.toLowerCase();
  
  const bgColor = useMemo(() => {
    if (actionLower.includes('fold')) return 'bg-gray-600';
    if (actionLower.includes('check')) return 'bg-blue-600';
    if (actionLower.includes('call')) return 'bg-green-600';
    if (actionLower.includes('raise') || actionLower.includes('bet')) return 'bg-amber-600';
    if (actionLower.includes('all') || actionLower.includes('allin')) return 'bg-red-600';
    if (actionLower.includes('sb') || actionLower.includes('bb')) return 'bg-purple-600';
    return 'bg-gray-600';
  }, [actionLower]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className="absolute -top-8 left-1/2 -translate-x-1/2 z-30"
    >
      <div className={cn(
        'px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-lg whitespace-nowrap',
        bgColor
      )}>
        {action}
      </div>
    </motion.div>
  );
}, (prev, next) => prev.action === next.action);

// ==========================================
// STACK DISPLAY - Stable stack value
// ==========================================
const StackDisplay = memo(function StackDisplay({ 
  stack, 
  isAllIn 
}: { 
  stack: number; 
  isAllIn: boolean;
}) {
  return (
    <div className={cn(
      'text-xs font-bold px-2.5 py-1 rounded-full mt-0.5 shadow-md',
      isAllIn 
        ? 'bg-red-600 text-white animate-pulse' 
        : 'bg-black/80 text-amber-400'
    )}>
      {isAllIn ? 'ALL-IN' : stack.toLocaleString()}
    </div>
  );
}, (prev, next) => prev.stack === next.stack && prev.isAllIn === next.isAllIn);

// ==========================================
// DEALER BUTTON
// ==========================================
const DealerButton = memo(function DealerButton() {
  return (
    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-white to-gray-200 text-gray-900 text-[10px] font-black flex items-center justify-center shadow-lg border border-gray-300 z-20">
      D
    </div>
  );
});

// ==========================================
// PLAYER CARDS DISPLAY
// ==========================================
const PlayerCards = memo(function PlayerCards({
  cards,
  playerId,
  isHero,
  showCards
}: {
  cards: string[];
  playerId: string;
  isHero: boolean;
  showCards: boolean;
}) {
  if (!cards || cards.length === 0) return null;
  
  return (
    <div className={cn(
      'absolute flex gap-0.5',
      isHero ? '-top-[72px] left-1/2 -translate-x-1/2' : '-top-12 left-1/2 -translate-x-1/2'
    )}>
      {cards.map((card, idx) => (
        <StablePokerCard
          key={`${playerId}-${idx}-${card}`}
          card={card}
          faceDown={!showCards && !isHero}
          size={isHero ? 'md' : 'sm'}
          dealDelay={idx}
        />
      ))}
    </div>
  );
}, (prev, next) => 
  JSON.stringify(prev.cards) === JSON.stringify(next.cards) &&
  prev.showCards === next.showCards &&
  prev.isHero === next.isHero
);

// ==========================================
// BET DISPLAY
// ==========================================
const BetDisplay = memo(function BetDisplay({
  amount,
  position
}: {
  amount: number;
  position: { x: number; y: number };
}) {
  if (!amount || amount <= 0) return null;
  
  // Calculate bet chip position relative to player (towards center)
  const centerX = 50;
  const centerY = 45;
  const dx = centerX - position.x;
  const dy = centerY - position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const normalizedDx = distance > 0 ? (dx / distance) * 18 : 0;
  const normalizedDy = distance > 0 ? (dy / distance) * 18 : 0;
  
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="absolute z-15"
      style={{
        left: `${position.x + normalizedDx}%`,
        top: `${position.y + normalizedDy}%`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <StableChipStack 
        amount={amount} 
        size="xs" 
        showLabel={true}
      />
    </motion.div>
  );
}, (prev, next) => 
  prev.amount === next.amount &&
  prev.position.x === next.position.x &&
  prev.position.y === next.position.y
);

// ==========================================
// MAIN PLAYER SEAT COMPONENT
// ==========================================
export const OptimizedPlayerSeat = memo(function OptimizedPlayerSeat({
  player,
  position,
  isHero = false,
  showCards = false,
  timeRemaining,
  timeDuration = 30,
  seatIndex
}: OptimizedPlayerSeatProps) {
  // Track previous player for comparison
  const prevPlayerRef = useRef(player);
  
  useEffect(() => {
    prevPlayerRef.current = player;
  }, [player]);

  // Empty seat
  if (!player) {
    return <EmptySeat position={position} />;
  }

  const isTurn = player.isTurn && !player.isFolded && !player.isAllIn;
  const avatarSize = isHero ? 'w-16 h-16' : 'w-13 h-13';
  const ringSize = isHero ? 72 : 60;

  // Resolve avatar URL - handles DB URLs and Vite hashed paths
  const resolvedAvatar = resolveAvatarUrl(player.avatarUrl || player.avatar, player.id);
  
  // Stable avatar background (fallback only)
  const avatarBg = useMemo(() => {
    const hue = (seatIndex * 50) % 360;
    return `linear-gradient(135deg, hsl(${hue}, 55%, 45%), hsl(${hue + 30}, 55%, 35%))`;
  }, [seatIndex]);

  return (
    <>
      {/* Bet display (rendered outside player container for proper positioning) */}
      {player.currentBet && player.currentBet > 0 && (
        <BetDisplay amount={player.currentBet} position={position} />
      )}
      
      {/* Player container */}
      <div
        className={cn(
          'absolute -translate-x-1/2 -translate-y-1/2 z-10',
          isHero && 'scale-105'
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
            player.isFolded && 'opacity-40 grayscale',
            player.isAllIn && 'ring-2 ring-red-500 ring-offset-2 ring-offset-transparent',
            isTurn ? 'border-amber-400 shadow-lg shadow-amber-500/40' : 'border-white/30'
          )}
          style={{
            background: resolvedAvatar 
              ? `url(${resolvedAvatar}) center/cover` 
              : avatarBg,
            width: isHero ? '64px' : '52px',
            height: isHero ? '64px' : '52px'
          }}
        >
          {!resolvedAvatar && (
            <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg drop-shadow-md">
              {player.name.charAt(0).toUpperCase()}
            </div>
          )}
          
          {/* Dealer button */}
          {player.isDealer && <DealerButton />}
        </div>

        {/* Player info */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-center min-w-[75px]">
          <div className="text-white text-xs font-medium truncate max-w-[85px] drop-shadow-md">
            {player.name}
          </div>
          <StackDisplay stack={player.stack} isAllIn={!!player.isAllIn} />
        </div>

        {/* Action badge */}
        <AnimatePresence mode="wait">
          {player.lastAction && (
            <ActionBadge key={`${player.id}-${player.lastAction}`} action={player.lastAction} />
          )}
        </AnimatePresence>

        {/* Player cards */}
        <PlayerCards
          cards={player.cards || []}
          playerId={player.id}
          isHero={isHero}
          showCards={showCards}
        />
      </div>
    </>
  );
}, (prev, next) => {
  const p1 = prev.player;
  const p2 = next.player;
  
  // Both null
  if (!p1 && !p2) return true;
  // One is null
  if (!p1 || !p2) return false;
  
  // Deep comparison of relevant fields
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
    prev.isHero === next.isHero &&
    prev.position.x === next.position.x &&
    prev.position.y === next.position.y
  );
});

export default OptimizedPlayerSeat;
