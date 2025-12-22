import React, { memo, useMemo } from 'react';
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

// Bet display component - positioned between player and table center
const BetDisplay = memo(function BetDisplay({ 
  amount, 
  seatIndex
}: { 
  amount: number;
  seatIndex: number;
}) {
  // Calculate bet position based on seat - move towards table center
  const getBetOffset = () => {
    switch (seatIndex) {
      case 0: return { x: 0, y: -45 };     // Hero (bottom) - bet above
      case 1: return { x: 35, y: -15 };    // Left middle - bet right & up
      case 2: return { x: 35, y: 15 };     // Left top - bet right & down
      case 3: return { x: 0, y: 35 };      // Top center - bet below
      case 4: return { x: -35, y: 15 };    // Right top - bet left & down
      case 5: return { x: -35, y: -15 };   // Right middle - bet left & up
      default: return { x: 0, y: -35 };
    }
  };

  const offset = getBetOffset();

  return (
    <motion.div
      className="absolute z-20"
      style={{
        left: `${offset.x}px`,
        top: `${offset.y}px`,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div 
        className="flex items-center gap-1.5 px-2 py-1"
        style={{
          background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(10,10,10,0.95) 100%)',
          border: '1px solid rgba(255, 122, 0, 0.3)',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
        }}
      >
        {/* Chip icon */}
        <div 
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #ff7a00 0%, #cc5500 100%)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
          }}
        >
          <div className="w-full h-full rounded-full border border-black/20" />
        </div>
        {/* Amount */}
        <span 
          className="text-orange-400 text-xs font-bold"
          style={{ textShadow: '0 0 5px rgba(255, 122, 0, 0.3)' }}
        >
          {amount.toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
});


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

// Main player seat component - SYNDIKATE Brutal Industrial Style
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

  // Resolve avatar URL - handles Vite hashed paths
  const resolvedAvatar = resolveAvatarUrl(player.avatarUrl || player.avatar, player.id);

  // Syndikate themed avatar backgrounds (fallback only)
  const avatarBg = useMemo(() => {
    const syndikatePalette = [
      'linear-gradient(135deg, #ff7a00 0%, #cc5500 100%)', // Syndikate orange
      'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)', // Syndikate red
      'linear-gradient(135deg, #374151 0%, #1f2937 100%)', // Metal gray
      'linear-gradient(135deg, #854d0e 0%, #451a03 100%)', // Rust
      'linear-gradient(135deg, #166534 0%, #052e16 100%)', // Dark green
      'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', // Dark metal
    ];
    return syndikatePalette[seatIndex % syndikatePalette.length];
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

      {/* Avatar with Syndikate brutal frame */}
      <div className="relative">
        <div 
          className={cn(
            'relative rounded-lg overflow-hidden transition-all duration-200',
            avatarSize,
            player.isFolded && 'opacity-40 grayscale',
          )}
          style={{
            border: isTurn 
              ? '3px solid #ff7a00' 
              : '2px solid rgba(255, 122, 0, 0.3)',
            boxShadow: isTurn 
              ? '0 0 25px rgba(255, 122, 0, 0.6), 0 4px 15px rgba(0,0,0,0.5), inset 0 0 20px rgba(255, 122, 0, 0.2)' 
              : '0 4px 15px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.3)'
          }}
        >
          {/* Avatar image - always use resolved URL */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${resolvedAvatar})` }}
          />
          
          {/* Fallback gradient overlay for non-existent images */}
          <div 
            className="absolute inset-0" 
            style={{ 
              background: avatarBg, 
              opacity: 0.3 
            }} 
          />
          
          {/* Folded overlay - Syndikate style */}
          {player.isFolded && (
            <div 
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)' }}
            >
              <span className="text-orange-500/80 text-[10px] font-bold uppercase tracking-wider">Fold</span>
            </div>
          )}
          
          {/* Industrial corner accents when active */}
          {isTurn && (
            <>
              <div className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-orange-500" />
              <div className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-orange-500" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-orange-500" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-orange-500" />
            </>
          )}
        </div>
        
        {/* Dealer button - Syndikate brutal style */}
        {player.isDealer && (
          <div 
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-[10px] font-black"
            style={{
              background: 'linear-gradient(135deg, #ff7a00 0%, #cc5500 100%)',
              color: '#000',
              boxShadow: '0 0 10px rgba(255, 122, 0, 0.5), 0 2px 6px rgba(0,0,0,0.4)',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
            }}
          >
            D
          </div>
        )}
        
        {/* All-in badge - Syndikate neon style */}
        {player.isAllIn && !player.isFolded && (
          <div 
            className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[9px] font-black text-black uppercase tracking-wider"
            style={{
              background: 'linear-gradient(135deg, #ff7a00 0%, #ff4500 100%)',
              boxShadow: '0 0 15px rgba(255, 122, 0, 0.7), 0 2px 6px rgba(0,0,0,0.4)',
              clipPath: 'polygon(5% 0%, 95% 0%, 100% 50%, 95% 100%, 5% 100%, 0% 50%)'
            }}
          >
            ALL IN
          </div>
        )}
      </div>

      {/* Player info plate - Syndikate brutal industrial bar */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 mt-1.5"
        style={{ top: '100%' }}
      >
        <div 
          className="flex flex-col items-center min-w-[75px] overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(26,26,26,0.95) 0%, rgba(10,10,10,0.98) 100%)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255, 122, 0, 0.1)',
            border: '1px solid rgba(255, 122, 0, 0.15)',
            clipPath: 'polygon(0% 0%, 100% 0%, 95% 100%, 5% 100%)'
          }}
        >
          {/* Name */}
          <div className="w-full px-3 py-1 text-center border-b border-orange-500/20">
            <span className="text-white text-[11px] font-bold truncate block max-w-[85px] uppercase tracking-wide">
              {player.name}
            </span>
          </div>
          {/* Stack */}
          <div className="w-full px-3 py-1.5 text-center">
            <span 
              className={cn(
                'text-[13px] font-black',
                player.isAllIn ? 'text-orange-400' : 'text-orange-500'
              )}
              style={{ 
                textShadow: player.isAllIn 
                  ? '0 0 10px rgba(255, 122, 0, 0.5)' 
                  : 'none'
              }}
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

      {/* Player cards - positioned above avatar - only show for opponents, hero cards shown at bottom */}
      {player.cards && player.cards.length > 0 && !player.isFolded && !isHero && (
        <div className="absolute flex gap-1 -top-14 left-1/2 -translate-x-1/2">
          {player.cards.map((card, idx) => (
            <StablePokerCard
              key={`${player.id}-${idx}-${card}`}
              card={card}
              faceDown={!showCards}
              size="sm"
              dealDelay={idx}
            />
          ))}
        </div>
      )}

      {/* Current bet chip stack - positioned towards table center */}
      {player.currentBet && player.currentBet > 0 && (
        <BetDisplay 
          amount={player.currentBet} 
          seatIndex={seatIndex}
        />
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
