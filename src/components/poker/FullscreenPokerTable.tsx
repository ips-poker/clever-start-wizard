// ============================================
// FULLSCREEN POKER TABLE - PPPoker Premium Style
// ============================================
// Полноэкранный овальный стол как в PPPoker

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PokerPlayer } from '@/hooks/useNodePokerTable';
import { resolveAvatarUrl } from '@/utils/avatarResolver';
import syndikateLogo from '@/assets/syndikate-logo-main.png';

// ============= SUIT CONFIGURATION =============
const SUITS = {
  h: { symbol: '♥', color: '#ef4444', name: 'hearts' },
  d: { symbol: '♦', color: '#3b82f6', name: 'diamonds' },
  c: { symbol: '♣', color: '#22c55e', name: 'clubs' },
  s: { symbol: '♠', color: '#1e293b', name: 'spades' }
} as const;

// ============= SEAT POSITIONS FOR OVAL TABLE =============
// Позиции для 9-max стола вокруг овала (проценты от контейнера)
// Hero всегда внизу по центру
const SEAT_POSITIONS_9MAX = [
  { x: 50, y: 88 },   // Seat 0 - Hero (bottom center)
  { x: 15, y: 75 },   // Seat 1 - Bottom left
  { x: 3, y: 50 },    // Seat 2 - Left middle
  { x: 10, y: 25 },   // Seat 3 - Top left
  { x: 35, y: 8 },    // Seat 4 - Top left-center
  { x: 65, y: 8 },    // Seat 5 - Top right-center
  { x: 90, y: 25 },   // Seat 6 - Top right
  { x: 97, y: 50 },   // Seat 7 - Right middle
  { x: 85, y: 75 },   // Seat 8 - Bottom right
];

const SEAT_POSITIONS_6MAX = [
  { x: 50, y: 88 },   // Seat 0 - Hero (bottom center)
  { x: 5, y: 55 },    // Seat 1 - Left middle
  { x: 15, y: 15 },   // Seat 2 - Top left
  { x: 50, y: 5 },    // Seat 3 - Top center
  { x: 85, y: 15 },   // Seat 4 - Top right
  { x: 95, y: 55 },   // Seat 5 - Right middle
];

// ============= PREMIUM POKER CARD =============
const PremiumCard = memo(function PremiumCard({
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
  const sizeConfig = {
    xs: { w: 32, h: 44, rank: 'text-[11px]', suit: 'text-[9px]', center: 'text-base' },
    sm: { w: 40, h: 56, rank: 'text-sm', suit: 'text-xs', center: 'text-lg' },
    md: { w: 52, h: 72, rank: 'text-base', suit: 'text-sm', center: 'text-2xl' },
    lg: { w: 64, h: 88, rank: 'text-lg', suit: 'text-base', center: 'text-3xl' },
  };
  
  const cfg = sizeConfig[size];
  const rank = card?.[0] === 'T' ? '10' : card?.[0] || '?';
  const suit = (card?.[1]?.toLowerCase() || 's') as keyof typeof SUITS;
  const suitInfo = SUITS[suit] || SUITS.s;

  if (faceDown) {
    return (
      <motion.div
        initial={{ rotateY: 180, scale: 0.3, opacity: 0 }}
        animate={{ rotateY: 0, scale: 1, opacity: 1 }}
        transition={{ delay: delay * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
        className="rounded-lg shadow-xl relative overflow-hidden"
        style={{
          width: cfg.w,
          height: cfg.h,
          background: 'linear-gradient(145deg, #1e40af 0%, #1e3a8a 50%, #172554 100%)',
          border: '2px solid #3b82f6',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)'
        }}
      >
        {/* Diamond pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 40 40">
          <defs>
            <pattern id="cardPatternBack" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="1" fill="white" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cardPatternBack)"/>
        </svg>
        {/* Center emblem */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1/2 h-1/2 rounded-full border border-white/20"/>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ rotateY: 180, scale: 0.3, opacity: 0 }}
      animate={{ rotateY: 0, scale: 1, opacity: 1 }}
      transition={{ delay: delay * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
      className="rounded-lg shadow-xl relative flex flex-col"
      style={{
        width: cfg.w,
        height: cfg.h,
        background: 'linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%)',
        border: isWinning ? '3px solid #fbbf24' : '2px solid #e2e8f0',
        boxShadow: isWinning 
          ? '0 0 30px rgba(251,191,36,0.6), 0 8px 24px rgba(0,0,0,0.3)'
          : '0 8px 24px rgba(0,0,0,0.25)'
      }}
    >
      {/* Top-left corner */}
      <div className="absolute top-1 left-1.5 flex flex-col items-center leading-none">
        <span className={cn(cfg.rank, 'font-bold')} style={{ color: suitInfo.color }}>{rank}</span>
        <span className={cfg.suit} style={{ color: suitInfo.color }}>{suitInfo.symbol}</span>
      </div>
      
      {/* Center suit */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cfg.center} style={{ color: suitInfo.color, opacity: 0.15 }}>{suitInfo.symbol}</span>
      </div>
      
      {/* Bottom-right corner (rotated) */}
      <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180">
        <span className={cn(cfg.rank, 'font-bold')} style={{ color: suitInfo.color }}>{rank}</span>
        <span className={cfg.suit} style={{ color: suitInfo.color }}>{suitInfo.symbol}</span>
      </div>
      
      {/* Glossy effect */}
      <div className="absolute inset-0 pointer-events-none rounded-lg"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%)' }}
      />
    </motion.div>
  );
});

// ============= TIMER RING =============
const TimerRing = memo(function TimerRing({ 
  remaining, 
  total,
  size = 72
}: { 
  remaining: number; 
  total: number;
  size?: number;
}) {
  const progress = Math.max(0, Math.min(1, remaining / total));
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const isWarning = progress < 0.3;
  const isCritical = progress < 0.15;
  const strokeColor = isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#22c55e";

  return (
    <svg 
      className="absolute pointer-events-none"
      width={size}
      height={size}
      style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}
    >
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="4"/>
      <circle
        cx={size/2} cy={size/2} r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        className={cn("transition-all duration-200", isCritical && "animate-pulse")}
        style={{ filter: `drop-shadow(0 0 8px ${strokeColor})` }}
      />
    </svg>
  );
});

// ============= PLAYER SEAT =============
interface PlayerSeatProps {
  player: PokerPlayer | null;
  position: { x: number; y: number };
  seatNumber: number;
  isHero: boolean;
  isDealer: boolean;
  isSB: boolean;
  isBB: boolean;
  isCurrentTurn: boolean;
  turnTimeRemaining?: number;
  heroCards?: string[];
  gamePhase?: string;
  canJoin?: boolean;
  onSeatClick?: (seatNumber: number) => void;
}

const PlayerSeat = memo(function PlayerSeat({
  player,
  position,
  seatNumber,
  isHero,
  isDealer,
  isSB,
  isBB,
  isCurrentTurn,
  turnTimeRemaining,
  heroCards,
  gamePhase = 'waiting',
  canJoin = false,
  onSeatClick
}: PlayerSeatProps) {
  const avatarSize = isHero ? 64 : 52;
  
  // Empty seat
  if (!player) {
    return (
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${position.x}%`, top: `${position.y}%` }}
      >
        <motion.div 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => canJoin && onSeatClick?.(seatNumber)}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-all",
            canJoin ? "cursor-pointer" : "cursor-default"
          )}
          style={{
            background: canJoin 
              ? 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(0,0,0,0.6) 100%)'
              : 'rgba(0,0,0,0.3)',
            border: canJoin ? '2px dashed rgba(34,197,94,0.5)' : '2px dashed rgba(255,255,255,0.15)',
          }}
        >
          <span className={cn(
            "text-xs font-medium",
            canJoin ? "text-emerald-400/80" : "text-white/30"
          )}>
            {canJoin ? 'Сесть' : ''}
          </span>
        </motion.div>
      </div>
    );
  }

  const resolvedAvatar = resolveAvatarUrl(player.avatarUrl, player.playerId);

  return (
    <motion.div
      className={cn("absolute -translate-x-1/2 -translate-y-1/2", isHero ? "z-20" : "z-10")}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      {/* Timer ring */}
      {isCurrentTurn && turnTimeRemaining !== undefined && !player.isFolded && (
        <TimerRing remaining={turnTimeRemaining} total={30} size={avatarSize + 16}/>
      )}
      
      {/* Avatar with status border */}
      <div className="relative">
        <div 
          className={cn(
            "rounded-full overflow-hidden transition-all",
            player.isFolded && "opacity-50 grayscale"
          )}
          style={{
            width: avatarSize,
            height: avatarSize,
            border: isCurrentTurn && !player.isFolded
              ? '3px solid #22c55e'
              : player.isAllIn
                ? '3px solid #ef4444'
                : '2px solid rgba(255,255,255,0.3)',
            boxShadow: isCurrentTurn && !player.isFolded
              ? '0 0 25px rgba(34,197,94,0.6)'
              : player.isAllIn
                ? '0 0 20px rgba(239,68,68,0.5)'
                : '0 6px 20px rgba(0,0,0,0.5)'
          }}
        >
          <img 
            src={resolvedAvatar}
            alt={player.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = resolveAvatarUrl(null, player.playerId); }}
          />
          
          {/* Fold overlay */}
          {player.isFolded && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white/80 text-[10px] font-bold">Fold</span>
            </div>
          )}
        </div>
        
        {/* Dealer button */}
        {isDealer && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-1 -top-1 w-7 h-7 rounded-full flex items-center justify-center z-20"
            style={{
              background: 'linear-gradient(145deg, #fef3c7 0%, #fbbf24 50%, #f59e0b 100%)',
              border: '2px solid #92400e',
              boxShadow: '0 2px 8px rgba(251,191,36,0.5)'
            }}
          >
            <span className="font-black text-[11px] text-amber-900">D</span>
          </motion.div>
        )}
        
        {/* SB/BB indicator */}
        {(isSB || isBB) && !isDealer && (
          <div 
            className="absolute -left-1 -top-1 w-6 h-6 rounded-full flex items-center justify-center z-20"
            style={{
              background: isBB 
                ? 'linear-gradient(145deg, #3b82f6, #1d4ed8)'
                : 'linear-gradient(145deg, #64748b, #475569)',
              border: '1px solid rgba(255,255,255,0.3)'
            }}
          >
            <span className="font-bold text-[8px] text-white">{isBB ? 'BB' : 'SB'}</span>
          </div>
        )}
      </div>
      
      {/* Name and stack panel */}
      <div 
        className="mt-1 px-3 py-1 rounded-lg text-center min-w-[70px]"
        style={{
          background: player.isAllIn 
            ? 'linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)'
            : 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(20,20,20,0.95) 100%)',
          borderBottom: `2px solid ${player.isAllIn ? '#ef4444' : '#22c55e'}`
        }}
      >
        <p className="text-[10px] text-white/80 font-medium truncate max-w-[80px]">
          {player.name}
        </p>
        <p className={cn(
          "text-xs font-bold",
          player.isAllIn ? "text-white" : "text-emerald-400"
        )}>
          {player.isAllIn ? 'ALL-IN' : player.stack.toLocaleString()}
        </p>
      </div>
      
      {/* Player cards */}
      {isHero && heroCards && heroCards.length > 0 && !player.isFolded && (
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 flex">
          {heroCards.map((card, idx) => (
            <div key={idx} style={{ marginLeft: idx > 0 ? '-12px' : 0 }}>
              <PremiumCard card={card} size="md" delay={idx} isWinning={gamePhase === 'showdown'}/>
            </div>
          ))}
        </div>
      )}
      
      {/* Opponent cards (face down) */}
      {!isHero && !player.isFolded && gamePhase !== 'waiting' && (
        <div className={cn("absolute flex",
          position.x < 30 ? "left-full ml-2" : position.x > 70 ? "right-full mr-2" : "top-full mt-2",
          "top-1/2 -translate-y-1/2"
        )}>
          {[0, 1].map((idx) => (
            <div key={idx} style={{ marginLeft: idx > 0 ? '-10px' : 0 }}>
              <PremiumCard card="XX" faceDown size="xs" delay={idx}/>
            </div>
          ))}
        </div>
      )}
      
      {/* Bet amount */}
      {player.betAmount > 0 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: isHero ? '-40px' : '100%', marginTop: isHero ? 0 : '8px' }}
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(30,30,30,0.9) 100%)',
              border: '1.5px solid rgba(251,191,36,0.6)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.4)'
            }}
          >
            {/* Chip stack */}
            <div className="relative flex items-end h-4">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i}
                  className="absolute rounded-full w-3 h-3"
                  style={{ 
                    background: i === 0 ? '#ef4444' : i === 1 ? '#22c55e' : '#3b82f6',
                    border: '1px solid rgba(255,255,255,0.3)',
                    left: i * 4,
                    bottom: i * 2
                  }}
                />
              ))}
            </div>
            <span className="font-bold text-xs ml-2"
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              {player.betAmount}
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
});

// ============= OVAL TABLE FELT =============
const OvalTableFelt = memo(function OvalTableFelt() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Dark space background */}
      <div className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, #1a2d4a 0%, #0f1a2a 25%, #080d15 50%, #030508 100%)'
        }}
      />
      
      {/* Outer metallic rail */}
      <div 
        className="absolute"
        style={{
          top: '12%',
          left: '5%',
          right: '5%',
          bottom: '25%',
          borderRadius: '50%',
          background: 'linear-gradient(180deg, #4a5568 0%, #2d3748 30%, #1a202c 60%, #2d3748 80%, #4a5568 100%)',
          boxShadow: '0 0 60px rgba(0,0,0,0.8), inset 0 2px 20px rgba(255,255,255,0.1)'
        }}
      />
      
      {/* Inner rail */}
      <div 
        className="absolute"
        style={{
          top: '14%',
          left: '6%',
          right: '6%',
          bottom: '27%',
          borderRadius: '50%',
          background: 'linear-gradient(180deg, #2d3748 0%, #1a202c 50%, #0f141c 100%)',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6)'
        }}
      />
      
      {/* Green felt */}
      <div 
        className="absolute"
        style={{
          top: '16%',
          left: '7%',
          right: '7%',
          bottom: '29%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at 50% 40%, #22803a 0%, #1a7035 25%, #156530 45%, #105828 65%, #0a4a20 85%, #053515 100%)',
          boxShadow: 'inset 0 0 80px rgba(0,0,0,0.3), inset 0 -40px 80px rgba(0,0,0,0.2)'
        }}
      >
        {/* Felt texture */}
        <div className="absolute inset-0 opacity-[0.04] rounded-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
          }}
        />
        
        {/* Center logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img src={syndikateLogo} alt="" className="w-28 h-auto opacity-[0.06]"/>
        </div>
        
        {/* NLH watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-white/[0.02] font-black text-5xl tracking-[0.4em]">NLH</span>
        </div>
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
  const visibleCount = phase === 'flop' ? 3 : phase === 'turn' ? 4 : (phase === 'river' || phase === 'showdown') ? 5 : 0;

  return (
    <div className="flex items-center justify-center gap-2">
      {[0, 1, 2, 3, 4].map((idx) => {
        const isVisible = idx < visibleCount;
        const card = cards[idx];
        
        return (
          <AnimatePresence key={idx}>
            {isVisible && card ? (
              <motion.div
                initial={{ y: -80, opacity: 0, rotateX: 90 }}
                animate={{ y: 0, opacity: 1, rotateX: 0 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ delay: idx * 0.15, type: 'spring', stiffness: 200, damping: 20 }}
              >
                <PremiumCard card={card} size="lg" delay={0} isWinning={phase === 'showdown'}/>
              </motion.div>
            ) : (
              <div 
                key={`empty-${idx}`}
                className="rounded-lg border-2 border-dashed border-white/10"
                style={{ width: 64, height: 88 }}
              />
            )}
          </AnimatePresence>
        );
      })}
    </div>
  );
});

// ============= POT DISPLAY =============
const PotDisplay = memo(function PotDisplay({ pot, blinds }: { pot: number; blinds: string }) {
  if (pot === 0) return null;
  
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex flex-col items-center gap-1"
    >
      {/* Pot amount */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full"
        style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(20,20,20,0.9) 100%)',
          border: '1px solid rgba(251,191,36,0.4)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}
      >
        {/* Chip icon */}
        <div className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(145deg, #fbbf24, #f59e0b)',
            border: '2px solid #92400e',
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
          }}
        >
          <span className="text-amber-900 text-[9px] font-black">$</span>
        </div>
        <span className="font-bold text-lg"
          style={{
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          {pot.toLocaleString()}
        </span>
      </div>
      
      {/* Blinds info */}
      <span className="text-white/50 text-xs">Blinds: {blinds}</span>
    </motion.div>
  );
});

// ============= MAIN TABLE COMPONENT =============
export interface FullscreenPokerTableProps {
  tableState: any;
  players: PokerPlayer[];
  heroSeat: number | null;
  heroCards: string[];
  communityCards: string[];
  pot: number;
  phase: string;
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  currentPlayerSeat: number | null;
  turnTimeRemaining?: number;
  smallBlind: number;
  bigBlind: number;
  canJoinTable: boolean;
  onSeatClick: (seatNumber: number) => void;
}

export const FullscreenPokerTable = memo(function FullscreenPokerTable({
  players,
  heroSeat,
  heroCards,
  communityCards,
  pot,
  phase,
  dealerSeat,
  smallBlindSeat,
  bigBlindSeat,
  currentPlayerSeat,
  turnTimeRemaining,
  smallBlind,
  bigBlind,
  canJoinTable,
  onSeatClick
}: FullscreenPokerTableProps) {
  const maxPlayers = 6;
  const positions = SEAT_POSITIONS_6MAX;
  
  // Build players array positioned relative to hero
  const positionedPlayers = useMemo(() => {
    const result: (PokerPlayer | null)[] = new Array(maxPlayers).fill(null);
    
    players.forEach(player => {
      let visualPosition: number;
      if (heroSeat !== null) {
        // Rotate so hero is always at position 0
        visualPosition = (player.seatNumber - heroSeat + maxPlayers) % maxPlayers;
      } else {
        visualPosition = player.seatNumber;
      }
      result[visualPosition] = player;
    });
    
    return result;
  }, [players, heroSeat, maxPlayers]);

  return (
    <div className="relative w-full h-full">
      {/* Table background */}
      <OvalTableFelt />
      
      {/* Center area - pot and community cards */}
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-10"
        style={{ top: '38%' }}
      >
        <PotDisplay pot={pot} blinds={`${smallBlind}/${bigBlind}`} />
        <CommunityCards cards={communityCards} phase={phase} />
      </div>
      
      {/* Player seats */}
      {positions.map((pos, idx) => {
        const player = positionedPlayers[idx];
        const actualSeatNumber = heroSeat !== null 
          ? (idx + heroSeat) % maxPlayers 
          : idx;
        
        return (
          <PlayerSeat
            key={`seat-${idx}`}
            player={player}
            position={pos}
            seatNumber={actualSeatNumber}
            isHero={idx === 0 && heroSeat !== null}
            isDealer={player?.seatNumber === dealerSeat}
            isSB={player?.seatNumber === smallBlindSeat}
            isBB={player?.seatNumber === bigBlindSeat}
            isCurrentTurn={player?.seatNumber === currentPlayerSeat}
            turnTimeRemaining={player?.seatNumber === currentPlayerSeat ? turnTimeRemaining : undefined}
            heroCards={idx === 0 ? heroCards : undefined}
            gamePhase={phase}
            canJoin={canJoinTable && !player}
            onSeatClick={onSeatClick}
          />
        );
      })}
    </div>
  );
});

export default FullscreenPokerTable;