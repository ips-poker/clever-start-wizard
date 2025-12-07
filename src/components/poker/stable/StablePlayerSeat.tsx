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

// Empty seat placeholder - PPPoker style
const EmptySeat = memo(function EmptySeat({ 
  position 
}: { 
  position: { x: number; y: number };
}) {
  return (
    <div
      className="absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      <div 
        className="w-full h-full rounded-full flex items-center justify-center"
        style={{
          background: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.08), rgba(0,0,0,0.3))',
          border: '2px dashed rgba(255,255,255,0.2)'
        }}
      >
        <span className="text-white/30 text-[10px] font-medium">+</span>
      </div>
    </div>
  );
});

// Action badge component - PPPoker style
const ActionBadge = memo(function ActionBadge({ action }: { action: string }) {
  const actionLower = action.toLowerCase();
  
  const badgeStyle = useMemo(() => {
    if (actionLower.includes('fold')) return { bg: 'rgba(75, 85, 99, 0.9)', text: 'Fold' };
    if (actionLower.includes('check')) return { bg: 'rgba(59, 130, 246, 0.9)', text: 'Check' };
    if (actionLower.includes('call')) return { bg: 'rgba(34, 197, 94, 0.9)', text: 'Call' };
    if (actionLower.includes('raise')) return { bg: 'rgba(245, 158, 11, 0.9)', text: action };
    if (actionLower.includes('bet')) return { bg: 'rgba(245, 158, 11, 0.9)', text: action };
    if (actionLower.includes('all')) return { bg: 'rgba(220, 38, 38, 0.95)', text: 'ALL IN' };
    return { bg: 'rgba(75, 85, 99, 0.9)', text: action };
  }, [actionLower, action]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="absolute -top-8 left-1/2 -translate-x-1/2 z-30"
    >
      <div 
        className="px-2.5 py-1 rounded text-[11px] font-bold text-white shadow-lg"
        style={{ 
          background: badgeStyle.bg,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
        }}
      >
        {badgeStyle.text}
      </div>
    </motion.div>
  );
}, (prev, next) => prev.action === next.action);

// Main player seat component - PPPoker authentic style
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
  const avatarSize = isHero ? 'w-16 h-16' : 'w-14 h-14';
  const ringSize = isHero ? 72 : 62;

  // Generate stable avatar color based on seat
  const avatarBg = useMemo(() => {
    const colors = [
      'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    ];
    return colors[seatIndex % colors.length];
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

      {/* Avatar with PPPoker style frame */}
      <div className="relative">
        <div 
          className={cn(
            'relative rounded-full overflow-hidden transition-all duration-200',
            avatarSize,
            player.isFolded && 'opacity-40 grayscale',
          )}
          style={{
            border: isTurn ? '3px solid #fbbf24' : '3px solid rgba(255,255,255,0.3)',
            boxShadow: isTurn 
              ? '0 0 20px rgba(251, 191, 36, 0.5), 0 4px 12px rgba(0,0,0,0.4)' 
              : '0 4px 12px rgba(0,0,0,0.4)',
            background: player.avatar 
              ? `url(${player.avatar}) center/cover` 
              : avatarBg
          }}
        >
          {!player.avatar && (
            <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl drop-shadow-lg">
              {player.name.charAt(0).toUpperCase()}
            </div>
          )}
          
          {/* Folded overlay */}
          {player.isFolded && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white/80 text-[10px] font-bold">Fold</span>
            </div>
          )}
        </div>
        
        {/* Dealer button - PPPoker style positioned to the side */}
        {player.isDealer && (
          <div 
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              color: '#1e293b',
              border: '2px solid #94a3b8',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
          >
            D
          </div>
        )}
        
        {/* All-in badge */}
        {player.isAllIn && !player.isFolded && (
          <div 
            className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[9px] font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.5)'
            }}
          >
            ALL IN
          </div>
        )}
      </div>

      {/* Player info plate - PPPoker style dark bar */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 mt-1"
        style={{ top: '100%' }}
      >
        <div 
          className="flex flex-col items-center min-w-[70px] rounded overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.98) 100%)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
          }}
        >
          {/* Name */}
          <div className="w-full px-2 py-1 text-center border-b border-white/10">
            <span className="text-white text-[11px] font-medium truncate block max-w-[80px]">
              {player.name}
            </span>
          </div>
          {/* Stack */}
          <div className="w-full px-2 py-1 text-center">
            <span 
              className={cn(
                'text-[12px] font-bold',
                player.isAllIn ? 'text-red-400' : 'text-amber-400'
              )}
            >
              {player.stack.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Action badge */}
      <AnimatePresence mode="wait">
        {player.lastAction && !player.isFolded && (
          <ActionBadge key={player.lastAction} action={player.lastAction} />
        )}
      </AnimatePresence>

      {/* Player cards - positioned above avatar */}
      {player.cards && player.cards.length > 0 && !player.isFolded && (
        <div className={cn(
          'absolute flex gap-1',
          isHero ? '-top-[85px] left-1/2 -translate-x-1/2' : '-top-14 left-1/2 -translate-x-1/2'
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

      {/* Current bet chip stack */}
      {player.currentBet && player.currentBet > 0 && (
        <div className="absolute top-full mt-16 left-1/2 -translate-x-1/2">
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
