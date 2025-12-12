// ============================================
// FULLSCREEN POKER TABLE - PPPoker Premium Style
// ============================================
// Полноэкранный овальный стол как в PPPoker

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PokerPlayer } from '@/hooks/useNodePokerTable';
import { resolveAvatarUrl } from '@/utils/avatarResolver';
import { usePokerPreferences, TABLE_THEMES, CARD_BACKS } from '@/hooks/usePokerPreferences';
import syndikateLogo from '@/assets/syndikate-logo-main.png';
import { SmoothAvatarTimer } from './SmoothAvatarTimer';
import { EnhancedPlayerBet } from './EnhancedPlayerBet';
import { getHandStrengthName } from '@/utils/handEvaluator';

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

// Вертикальные позиции для 6-max стола (портретная ориентация)
// Стол вытянут по вертикали как скругленный шестиугольник
const SEAT_POSITIONS_6MAX = [
  { x: 50, y: 92 },   // Seat 0 - Hero (bottom center)
  { x: 10, y: 65 },   // Seat 1 - Left bottom
  { x: 10, y: 35 },   // Seat 2 - Left top
  { x: 50, y: 8 },    // Seat 3 - Top center
  { x: 90, y: 35 },   // Seat 4 - Right top
  { x: 90, y: 65 },   // Seat 5 - Right bottom
];

// ============= PREMIUM POKER CARD with personalization =============
interface PremiumCardProps {
  card: string;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  delay?: number;
  isWinning?: boolean;
  cardBackColors?: { primary: string; secondary: string };
  cardStyle?: 'classic' | 'modern' | 'fourcolor' | 'jumbo';
}

const PremiumCard = memo(function PremiumCard({
  card,
  faceDown = false,
  size = 'md',
  delay = 0,
  isWinning = false,
  cardBackColors,
  cardStyle = 'classic'
}: PremiumCardProps) {
  const sizeConfig = {
    xs: { w: 32, h: 44, rank: 'text-[11px]', suit: 'text-[9px]', center: 'text-base' },
    sm: { w: 40, h: 56, rank: 'text-sm', suit: 'text-xs', center: 'text-lg' },
    md: { w: 52, h: 72, rank: 'text-base', suit: 'text-sm', center: 'text-2xl' },
    lg: { w: 64, h: 88, rank: cardStyle === 'jumbo' ? 'text-2xl' : 'text-lg', suit: cardStyle === 'jumbo' ? 'text-lg' : 'text-base', center: 'text-3xl' },
  };
  
  const cfg = sizeConfig[size];
  const rank = card?.[0] === 'T' ? '10' : card?.[0] || '?';
  const suitChar = (card?.[1]?.toLowerCase() || 's') as keyof typeof SUITS;
  
  // Four-color deck support
  const FOUR_COLOR_SUITS = {
    h: { symbol: '♥', color: '#ef4444', name: 'hearts' },   // Red
    d: { symbol: '♦', color: '#3b82f6', name: 'diamonds' }, // Blue
    c: { symbol: '♣', color: '#22c55e', name: 'clubs' },    // Green
    s: { symbol: '♠', color: '#1e293b', name: 'spades' }    // Black
  };
  
  const suitInfo = cardStyle === 'fourcolor' ? FOUR_COLOR_SUITS[suitChar] : SUITS[suitChar] || SUITS.s;
  
  // Card back colors from preferences
  const backPrimary = cardBackColors?.primary || '#3b82f6';
  const backSecondary = cardBackColors?.secondary || '#1d4ed8';

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
          background: `linear-gradient(145deg, ${backPrimary} 0%, ${backSecondary} 50%, ${backPrimary}cc 100%)`,
          border: `2px solid ${backPrimary}`,
          boxShadow: `0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 20px ${backPrimary}40`
        }}
      >
        {/* Decorative pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 40 40">
          <defs>
            <pattern id={`cardBack-${backPrimary.replace('#','')}`} x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="white" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#cardBack-${backPrimary.replace('#','')})`}/>
        </svg>
        {/* Center emblem */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="w-1/2 h-1/2 rounded-full border-2"
            style={{ borderColor: 'rgba(255,255,255,0.3)' }}
          />
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

// ============= TIMER RING (now uses SmoothAvatarTimer) =============
// Timer ring is now imported from SmoothAvatarTimer component for 60fps smooth animation

// ============= PLAYER SEAT with personalized cards =============
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
  communityCards?: string[];
  gamePhase?: string;
  canJoin?: boolean;
  onSeatClick?: (seatNumber: number) => void;
}

// Helper component that uses the preferences hook
const HeroCards = memo(function HeroCards({ 
  cards, 
  gamePhase,
  communityCards = [],
  isWinner = false
}: { 
  cards: string[]; 
  gamePhase: string;
  communityCards?: string[];
  isWinner?: boolean;
}) {
  const { currentCardBack, preferences } = usePokerPreferences();
  
  // Calculate hand strength for hero
  const handName = useMemo(() => {
    if (cards.length >= 2 && communityCards.length >= 3) {
      return getHandStrengthName(cards, communityCards);
    }
    return undefined;
  }, [cards, communityCards]);
  
  return (
    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
      <div className="flex">
        {cards.map((card, idx) => (
          <div key={idx} style={{ marginLeft: idx > 0 ? '-12px' : 0 }}>
            <PremiumCard 
              card={card} 
              size="md" 
              delay={idx} 
              isWinning={gamePhase === 'showdown' && isWinner}
              cardBackColors={{ primary: currentCardBack.primaryColor, secondary: currentCardBack.secondaryColor }}
              cardStyle={preferences.cardStyle}
            />
          </div>
        ))}
      </div>
      
      {/* Show hand name when we have community cards */}
      {handName && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap mt-1",
            isWinner 
              ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-500/30" 
              : "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white"
          )}
        >
          {handName}
        </motion.div>
      )}
    </div>
  );
});

const OpponentCards = memo(function OpponentCards({ 
  position,
  holeCards,
  isShowdown,
  handName,
  isWinner
}: { 
  position: { x: number };
  holeCards?: string[];
  isShowdown?: boolean;
  handName?: string;
  isWinner?: boolean;
}) {
  const { currentCardBack, preferences } = usePokerPreferences();
  
  // Show actual cards at showdown if available
  const showFaceUp = isShowdown && holeCards && holeCards.length >= 2;
  
  return (
    <div className={cn("absolute flex flex-col items-center gap-1",
      position.x < 30 ? "left-full ml-2" : position.x > 70 ? "right-full mr-2" : "top-full mt-2",
      "top-1/2 -translate-y-1/2"
    )}>
      <div className="flex">
        {showFaceUp ? (
          // Show actual hole cards at showdown
          holeCards.map((card, idx) => (
            <div key={idx} style={{ marginLeft: idx > 0 ? '-10px' : 0 }}>
              <PremiumCard 
                card={card} 
                size="sm" 
                delay={idx}
                isWinning={isWinner}
                cardBackColors={{ primary: currentCardBack.primaryColor, secondary: currentCardBack.secondaryColor }}
                cardStyle={preferences.cardStyle}
              />
            </div>
          ))
        ) : (
          // Show card backs
          [0, 1].map((idx) => (
            <div key={idx} style={{ marginLeft: idx > 0 ? '-10px' : 0 }}>
              <PremiumCard 
                card="XX" 
                faceDown 
                size="xs" 
                delay={idx}
                cardBackColors={{ primary: currentCardBack.primaryColor, secondary: currentCardBack.secondaryColor }}
              />
            </div>
          ))
        )}
      </div>
      
      {/* Show hand name at showdown */}
      {isShowdown && handName && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "px-2 py-0.5 rounded text-[9px] font-bold whitespace-nowrap",
            isWinner 
              ? "bg-amber-500 text-black" 
              : "bg-black/70 text-white/80"
          )}
        >
          {handName}
        </motion.div>
      )}
    </div>
  );
});

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
  communityCards = [],
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
      {/* Timer ring - smooth 60fps animation around avatar */}
      {isCurrentTurn && turnTimeRemaining !== undefined && !player.isFolded && (
        <SmoothAvatarTimer 
          remaining={turnTimeRemaining} 
          total={30} 
          size={avatarSize + 20}
          strokeWidth={4}
        />
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
        <HeroCards 
          cards={heroCards} 
          gamePhase={gamePhase} 
          communityCards={communityCards}
          isWinner={(player as any).isWinner}
        />
      )}
      
      {/* Opponent cards - show face up at showdown */}
      {!isHero && !player.isFolded && gamePhase !== 'waiting' && (
        <OpponentCards 
          position={position} 
          holeCards={player.holeCards}
          isShowdown={gamePhase === 'showdown'}
          handName={(player as any).handName}
          isWinner={(player as any).isWinner}
        />
      )}
      
      {/* Bet amount - Enhanced with realistic chips */}
      {player.betAmount > 0 && (
        <EnhancedPlayerBet
          amount={player.betAmount}
          position={isHero ? 'top' : position.y < 50 ? 'bottom' : 'top'}
          isHero={isHero}
        />
      )}
    </motion.div>
  );
});

// ============= SYNDIKATE TABLE FELT - Unique hexagonal stadium shape =============
interface SyndikateTableFeltProps {
  themeColor?: string;
  themeGradient?: string;
}

const SyndikateTableFelt = memo(function SyndikateTableFelt({ 
  themeColor = '#0d5c2e',
  themeGradient
}: SyndikateTableFeltProps) {
  // Generate felt gradient from theme color
  const feltGradient = themeGradient || `radial-gradient(ellipse at 50% 40%, ${themeColor} 0%, ${themeColor}dd 25%, ${themeColor}bb 45%, ${themeColor}99 65%, ${themeColor}77 85%, ${themeColor}55 100%)`;
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Transparent background - uses parent's mafia theme */}
      
      {/* Glowing ambient effect behind table - horizontal ellipse */}
      <div 
        className="absolute"
        style={{
          top: '12%',
          left: '5%',
          right: '5%',
          bottom: '20%',
          borderRadius: '50%',
          background: `radial-gradient(ellipse at 50% 50%, ${themeColor}40 0%, transparent 70%)`,
          filter: 'blur(40px)'
        }}
      />
      
      {/* Outer metallic rail - vertical hexagonal shape */}
      <div 
        className="absolute"
        style={{
          top: '5%',
          left: '12%',
          right: '12%',
          bottom: '5%',
          borderRadius: '45% 45% 45% 45% / 20% 20% 20% 20%',
          background: 'linear-gradient(180deg, #5a6a7a 0%, #3d4a5a 20%, #2a3440 50%, #3d4a5a 80%, #5a6a7a 100%)',
          boxShadow: '0 10px 60px rgba(0,0,0,0.9), 0 0 100px rgba(0,0,0,0.5), inset 0 2px 30px rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      />
      
      {/* Leather padding rail */}
      <div 
        className="absolute"
        style={{
          top: '6%',
          left: '13%',
          right: '13%',
          bottom: '6%',
          borderRadius: '44% 44% 44% 44% / 19% 19% 19% 19%',
          background: 'linear-gradient(180deg, #3a2820 0%, #2a1a14 30%, #1a0f0a 60%, #2a1a14 85%, #3a2820 100%)',
          boxShadow: 'inset 0 5px 30px rgba(0,0,0,0.8), inset 0 -5px 20px rgba(0,0,0,0.4)'
        }}
      />
      
      {/* Inner metal trim */}
      <div 
        className="absolute"
        style={{
          top: '8%',
          left: '15%',
          right: '15%',
          bottom: '8%',
          borderRadius: '42% 42% 42% 42% / 17% 17% 17% 17%',
          background: 'linear-gradient(180deg, #4a5568 0%, #2d3748 50%, #1a202c 100%)',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
          border: '1px solid rgba(212,175,55,0.2)'
        }}
      />
      
      {/* Main felt surface - vertical hexagonal shape */}
      <div 
        className="absolute"
        style={{
          top: '9%',
          left: '16%',
          right: '16%',
          bottom: '9%',
          borderRadius: '40% 40% 40% 40% / 15% 15% 15% 15%',
          background: feltGradient,
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.35), inset 0 -60px 100px rgba(0,0,0,0.2), inset 0 40px 60px rgba(255,255,255,0.02)'
        }}
      >
        {/* Subtle felt texture */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            borderRadius: 'inherit',
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
          }}
        />
        
        {/* Center logo */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
          <img src={syndikateLogo} alt="" className="w-28 h-auto opacity-[0.08] drop-shadow-lg"/>
          <span className="text-white/[0.04] font-black text-xl tracking-[0.4em] uppercase">
            Poker
          </span>
        </div>
        
        {/* Decorative horizontal line */}
        <div className="absolute top-1/2 -translate-y-1/2 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"/>
        
        {/* Corner decorations */}
        {[
          { top: '18%', left: '18%' },
          { top: '18%', right: '18%' },
          { bottom: '18%', left: '18%' },
          { bottom: '18%', right: '18%' }
        ].map((pos, i) => (
          <div 
            key={i}
            className="absolute w-6 h-6 opacity-[0.04]"
            style={{ 
              ...pos,
              border: '1px solid white',
              borderRadius: '50%'
            }}
          />
        ))}
      </div>
      
      {/* Ambient glow from pot area */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 w-32 h-24 pointer-events-none"
        style={{
          top: '40%',
          background: 'radial-gradient(ellipse, rgba(251,191,36,0.1) 0%, transparent 70%)',
          filter: 'blur(20px)'
        }}
      />
    </div>
  );
});

// ============= COMMUNITY CARDS with personalization =============
const CommunityCards = memo(function CommunityCards({ 
  cards, 
  phase 
}: { 
  cards: string[]; 
  phase: string;
}) {
  const { currentCardBack, preferences } = usePokerPreferences();
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
                transition={{ 
                  delay: idx * (preferences.fastAnimations ? 0.08 : 0.15), 
                  type: 'spring', 
                  stiffness: preferences.fastAnimations ? 300 : 200, 
                  damping: 20 
                }}
              >
                <PremiumCard 
                  card={card} 
                  size="lg" 
                  delay={0} 
                  isWinning={phase === 'showdown'}
                  cardBackColors={{ primary: currentCardBack.primaryColor, secondary: currentCardBack.secondaryColor }}
                  cardStyle={preferences.cardStyle}
                />
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
  
  // Get personalization preferences
  const { preferences, currentTableTheme, currentCardBack } = usePokerPreferences();
  
  // Build players array positioned relative to hero with rotation preference
  const positionedPlayers = useMemo(() => {
    const result: (PokerPlayer | null)[] = new Array(maxPlayers).fill(null);
    const rotationOffset = preferences.preferredSeatRotation;
    
    players.forEach(player => {
      let visualPosition: number;
      if (heroSeat !== null) {
        // Rotate so hero is always at position 0, then apply preference rotation
        visualPosition = (player.seatNumber - heroSeat + rotationOffset + maxPlayers) % maxPlayers;
      } else {
        visualPosition = (player.seatNumber + rotationOffset) % maxPlayers;
      }
      result[visualPosition] = player;
    });
    
    return result;
  }, [players, heroSeat, maxPlayers, preferences.preferredSeatRotation]);

  return (
    <div className="relative w-full h-full">
      {/* Table background with theme */}
      <SyndikateTableFelt themeColor={currentTableTheme.color} />
      
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
            communityCards={communityCards}
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