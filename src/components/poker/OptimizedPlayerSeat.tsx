import React, { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MemoizedPokerCard } from './MemoizedPokerCard';
import { resolveAvatarUrl } from '@/utils/avatarResolver';

// HUD Stats interface for player statistics
export interface PlayerHUDStats {
  vpip: number;      // Voluntarily Put $ In Pot (%)
  pfr: number;       // Pre-Flop Raise (%)
  af: number;        // Aggression Factor
  threeBet?: number; // 3-Bet (%)
  handsPlayed: number;
}

// Seat positions for 6-max table (PPPoker style)
const SEAT_POSITIONS_6MAX = [
  { top: '75%', left: '50%' },   // Seat 1 - Bottom center (Hero)
  { top: '55%', left: '8%' },    // Seat 2 - Left bottom
  { top: '20%', left: '12%' },   // Seat 3 - Left top
  { top: '5%', left: '50%' },    // Seat 4 - Top center
  { top: '20%', left: '88%' },   // Seat 5 - Right top
  { top: '55%', left: '92%' },   // Seat 6 - Right bottom
];

export interface PlayerData {
  id: string;
  name: string;
  avatar?: string;
  avatarUrl?: string; // Support both avatar and avatarUrl
  stack: number;
  seatNumber: number;
  cards?: string[];
  isFolded?: boolean;
  isAllIn?: boolean;
  isTurn?: boolean;
  isDealer?: boolean;
  currentBet?: number;
  lastAction?: string;
  isWinner?: boolean;
  isDisconnected?: boolean;
}

interface OptimizedPlayerSeatProps {
  seatNumber: number;
  player?: PlayerData;
  isHero?: boolean;
  isWinner?: boolean;
  showCards?: boolean;
  timeRemaining?: number;
  maxTime?: number;
  hudStats?: PlayerHUDStats;
}

// Timer ring component - memoized separately for performance
// Uses POKERSTARS-STYLE thresholds: warning < 10s, critical < 5s
const TimerRing = memo(function TimerRing({ 
  timeRemaining, 
  maxTime = 15  // POKERSTARS: Cash = 15s default
}: { 
  timeRemaining: number; 
  maxTime?: number;
}) {
  const progress = timeRemaining / maxTime;
  const strokeDashoffset = 283 - (283 * progress);
  // POKERSTARS-STYLE: Green > 10s, Yellow 5-10s, Red < 5s
  const isCritical = timeRemaining <= 5;
  const isWarning = timeRemaining <= 10 && !isCritical;
  const color = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e';

  return (
    <svg 
      className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] pointer-events-none" 
      viewBox="0 0 100 100"
    >
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke="rgba(255,200,0,0.2)"
        strokeWidth="3"
      />
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={283}
        strokeDashoffset={strokeDashoffset}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.3s linear, stroke 0.3s ease' }}
      />
    </svg>
  );
});

// Action badge component
const ActionBadge = memo(function ActionBadge({ action }: { action: string }) {
  const bgColor = useMemo(() => {
    if (action.includes('FOLD')) return 'bg-red-600';
    if (action.includes('ALL-IN')) return 'bg-purple-600';
    if (action.includes('RAISE')) return 'bg-green-600';
    if (action.includes('BET')) return 'bg-green-600';
    return 'bg-blue-600';
  }, [action]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn(
        "mt-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase shadow-lg",
        bgColor, "text-white"
      )}
    >
      {action}
    </motion.div>
  );
});

// Player cards display
const PlayerCards = memo(function PlayerCards({ 
  cards, 
  hidden = false 
}: { 
  cards: string[]; 
  hidden?: boolean;
}) {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-0.5">
      {cards.map((card, idx) => (
        <MemoizedPokerCard
          key={`${card}-${idx}`}
          card={hidden ? '??' : card}
          faceDown={hidden}
          size="sm"
          animate={false}
        />
      ))}
    </div>
  );
});

// HUD Tooltip component for showing player stats on hover
const HUDTooltip = memo(function HUDTooltip({ 
  stats,
  isVisible 
}: { 
  stats: PlayerHUDStats;
  isVisible: boolean;
}) {
  if (!isVisible || stats.handsPlayed < 5) return null;

  // Color coding based on player type
  const getVPIPColor = (vpip: number) => {
    if (vpip > 40) return 'text-red-400';
    if (vpip > 30) return 'text-orange-400';
    if (vpip > 22) return 'text-yellow-400';
    if (vpip < 15) return 'text-blue-400';
    return 'text-green-400';
  };

  const getPFRColor = (pfr: number) => {
    if (pfr > 25) return 'text-red-400';
    if (pfr > 18) return 'text-orange-400';
    if (pfr < 8) return 'text-blue-400';
    return 'text-green-400';
  };

  const getAFColor = (af: number) => {
    if (af > 4) return 'text-red-400';
    if (af > 2.5) return 'text-orange-400';
    if (af < 1) return 'text-blue-400';
    return 'text-green-400';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 5, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 5, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="absolute -top-14 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="bg-black/95 backdrop-blur-md border border-border/50 rounded-lg px-2.5 py-1.5 shadow-xl">
          <div className="flex items-center gap-2.5 text-[10px] font-mono whitespace-nowrap">
            <div className="flex flex-col items-center">
              <span className={cn("font-bold text-xs", getVPIPColor(stats.vpip))}>
                {stats.vpip.toFixed(0)}
              </span>
              <span className="text-muted-foreground text-[8px]">VPIP</span>
            </div>
            <div className="w-px h-4 bg-border/50" />
            <div className="flex flex-col items-center">
              <span className={cn("font-bold text-xs", getPFRColor(stats.pfr))}>
                {stats.pfr.toFixed(0)}
              </span>
              <span className="text-muted-foreground text-[8px]">PFR</span>
            </div>
            <div className="w-px h-4 bg-border/50" />
            <div className="flex flex-col items-center">
              <span className={cn("font-bold text-xs", getAFColor(stats.af))}>
                {stats.af.toFixed(1)}
              </span>
              <span className="text-muted-foreground text-[8px]">AF</span>
            </div>
            {stats.threeBet !== undefined && (
              <>
                <div className="w-px h-4 bg-border/50" />
                <div className="flex flex-col items-center">
                  <span className="font-bold text-xs text-purple-400">
                    {stats.threeBet.toFixed(0)}
                  </span>
                  <span className="text-muted-foreground text-[8px]">3B</span>
                </div>
              </>
            )}
          </div>
          <div className="text-center text-[8px] text-muted-foreground mt-0.5">
            {stats.handsPlayed} рук
          </div>
        </div>
        {/* Arrow pointer */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-black/95 border-r border-b border-border/50 transform rotate-45" />
      </motion.div>
    </AnimatePresence>
  );
});

// Empty seat component
const EmptySeat = memo(function EmptySeat({ position }: { position: { top: string; left: string } }) {
  return (
    <div
      className="absolute flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2"
      style={{ top: position.top, left: position.left }}
    >
      <div className="w-14 h-14 rounded-full border-2 border-dashed border-white/20 bg-white/5 flex items-center justify-center backdrop-blur-sm">
        <Users className="w-5 h-5 text-white/30" />
      </div>
      <span className="text-[10px] text-white/30 mt-1">Sit</span>
    </div>
  );
});

export const OptimizedPlayerSeat = memo(function OptimizedPlayerSeat({
  seatNumber,
  player,
  isHero = false,
  isWinner = false,
  showCards = false,
  timeRemaining = 0,
  maxTime = 15,  // POKERSTARS: Cash = 15s default
  hudStats
}: OptimizedPlayerSeatProps) {
  const position = SEAT_POSITIONS_6MAX[seatNumber - 1];
  const [isHovered, setIsHovered] = useState(false);

  if (!player) {
    return <EmptySeat position={position} />;
  }

  const shouldShowTimer = player.isTurn && isHero && timeRemaining > 0;
  const shouldShowCards = showCards && player.cards && player.cards.length > 0 && !player.isFolded;
  const shouldShowHUD = !isHero && hudStats && hudStats.handsPlayed >= 5;

  return (
    <div
      className={cn(
        "absolute flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200",
        player.isFolded && "opacity-50"
      )}
      style={{ top: position.top, left: position.left }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* HUD Tooltip on hover */}
      {shouldShowHUD && (
        <HUDTooltip stats={hudStats} isVisible={isHovered} />
      )}
      
      {/* Timer ring */}
      {shouldShowTimer && (
        <TimerRing timeRemaining={timeRemaining} maxTime={maxTime} />
      )}
      
      {/* Avatar */}
      <div className={cn(
        "relative w-14 h-14 rounded-full overflow-hidden border-2 transition-all duration-200",
        isWinner ? "border-yellow-400 ring-2 ring-yellow-400/50 scale-110" :
        player.isTurn ? "border-yellow-500 scale-105" :
        player.isFolded ? "border-gray-600" :
        isHero ? "border-blue-500" : "border-gray-500"
      )}>
        <Avatar className="w-full h-full">
          <AvatarImage src={resolveAvatarUrl(player.avatarUrl || player.avatar, player.id)} />
          <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-900 text-white text-sm">
            {player.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {/* Dealer button */}
        {player.isDealer && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold text-gray-900 shadow-lg z-10">
            D
          </div>
        )}
        
        {/* Disconnected indicator */}
        {player.isDisconnected && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-red-400 text-[10px] font-bold">AWAY</span>
          </div>
        )}
        
        {/* Winner crown */}
        {isWinner && (
          <motion.div
            initial={{ scale: 0, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
          >
            <Crown className="w-5 h-5 text-yellow-400 drop-shadow-lg" />
          </motion.div>
        )}
      </div>
      
      {/* Player info panel */}
      <div className={cn(
        "mt-1 px-2 py-1 rounded-lg min-w-[70px] text-center backdrop-blur-sm transition-colors duration-200",
        isWinner ? "bg-yellow-500/90" :
        player.isFolded ? "bg-gray-800/80" :
        "bg-gray-900/90"
      )}>
        <p className={cn(
          "text-[10px] font-medium truncate max-w-[70px]",
          isWinner ? "text-gray-900" : "text-white"
        )}>
          {isHero ? 'You' : player.name}
        </p>
        <div className={cn(
          "flex items-center justify-center gap-0.5 text-[11px] font-bold",
          isWinner ? "text-gray-900" : "text-yellow-400"
        )}>
          <span>{player.stack.toLocaleString()}</span>
        </div>
      </div>
      
      {/* Last action */}
      {player.lastAction && (
        <ActionBadge action={player.lastAction} />
      )}
      
      {/* Player cards */}
      {shouldShowCards && (
        <PlayerCards cards={player.cards!} hidden={!isHero && !isWinner} />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  if (!prevProps.player && !nextProps.player) return true;
  if (!prevProps.player || !nextProps.player) return false;
  
  // HUD stats comparison - only compare if they exist
  const prevHUD = prevProps.hudStats;
  const nextHUD = nextProps.hudStats;
  const hudEqual = (!prevHUD && !nextHUD) || (
    prevHUD && nextHUD &&
    prevHUD.vpip === nextHUD.vpip &&
    prevHUD.pfr === nextHUD.pfr &&
    prevHUD.af === nextHUD.af &&
    prevHUD.handsPlayed === nextHUD.handsPlayed
  );
  
  return (
    hudEqual &&
    prevProps.seatNumber === nextProps.seatNumber &&
    prevProps.isHero === nextProps.isHero &&
    prevProps.isWinner === nextProps.isWinner &&
    prevProps.showCards === nextProps.showCards &&
    prevProps.timeRemaining === nextProps.timeRemaining &&
    prevProps.player.id === nextProps.player.id &&
    prevProps.player.stack === nextProps.player.stack &&
    prevProps.player.isFolded === nextProps.player.isFolded &&
    prevProps.player.isAllIn === nextProps.player.isAllIn &&
    prevProps.player.isTurn === nextProps.player.isTurn &&
    prevProps.player.isDealer === nextProps.player.isDealer &&
    prevProps.player.lastAction === nextProps.player.lastAction &&
    prevProps.player.isDisconnected === nextProps.player.isDisconnected &&
    JSON.stringify(prevProps.player.cards) === JSON.stringify(nextProps.player.cards)
  );
});
