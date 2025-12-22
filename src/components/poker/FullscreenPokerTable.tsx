// ============================================
// FULLSCREEN POKER TABLE - PPPoker Premium Style
// ============================================
// Полноэкранный овальный стол как в PPPoker

import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PokerPlayer } from '@/hooks/useNodePokerTable';
import { resolveAvatarUrl } from '@/utils/avatarResolver';
import { usePokerPreferences, TABLE_THEMES, CARD_BACKS } from '@/hooks/usePokerPreferences';
import syndikateLogo from '@/assets/syndikate-logo-main.png';
import { SmoothAvatarTimer } from './SmoothAvatarTimer';
import { PPPokerChipStack } from './PPPokerChipStack';
import { PotChips } from './RealisticPokerChip';
import { SyndikateTableBackground } from './SyndikateTableBackground';
import { PPPokerCompactCards } from './PPPokerCompactCards';
import { PPPokerHeroCards } from './PPPokerHeroCards';
import { PPPokerCommunityCards } from './PPPokerCommunityCards';
import { PPPokerPotDisplay } from './PPPokerPotDisplay';
import { PPPokerActionBadge } from './PPPokerActionBadge';
import { PPPokerLevelBadge } from './PPPokerLevelBadge';
import { PotCollectionAnimation } from './PotCollectionAnimation';
import { getHandStrengthName } from '@/utils/handEvaluator';

// ============= SUIT CONFIGURATION =============
const SUITS = {
  h: { symbol: '♥', color: '#ef4444', name: 'hearts' },
  d: { symbol: '♦', color: '#3b82f6', name: 'diamonds' },
  c: { symbol: '♣', color: '#22c55e', name: 'clubs' },
  s: { symbol: '♠', color: '#1e293b', name: 'spades' }
} as const;

// ============= SEAT POSITIONS FOR VERTICAL OVAL TABLE =============
// Позиции для разного количества игроков вокруг вертикального овала
// Hero всегда внизу по центру, остальные симметрично вдоль борта

// Динамические позиции для 2-8 игроков
// Позиции на самом бортике овального стола
// x=18 и x=82 - левый/правый бортик (по центру рельса ~20%)
// y=8 и y=90 - верхний/нижний бортик (по центру рельса между 6-10%)
const SEAT_POSITIONS_BY_COUNT: Record<number, Array<{ x: number; y: number }>> = {
  2: [
    { x: 50, y: 88 },   // Seat 0 - Hero (bottom center)
    { x: 50, y: 8 },    // Seat 1 - Top center
  ],
  3: [
    { x: 50, y: 88 },   // Seat 0 - Hero (bottom center)
    { x: 12, y: 50 },   // Seat 1 - Left center
    { x: 88, y: 50 },   // Seat 2 - Right center
  ],
  4: [
    { x: 50, y: 88 },   // Seat 0 - Hero (bottom center)
    { x: 12, y: 50 },   // Seat 1 - Left middle
    { x: 50, y: 8 },    // Seat 2 - Top center
    { x: 88, y: 50 },   // Seat 3 - Right middle
  ],
  5: [
    { x: 50, y: 88 },   // Seat 0 - Hero (bottom center)
    { x: 12, y: 68 },   // Seat 1 - Left bottom
    { x: 12, y: 32 },   // Seat 2 - Left top
    { x: 88, y: 32 },   // Seat 3 - Right top
    { x: 88, y: 68 },   // Seat 4 - Right bottom
  ],
  6: [
    { x: 50, y: 88 },   // Seat 0 - Hero (bottom center)
    { x: 12, y: 68 },   // Seat 1 - Left bottom
    { x: 12, y: 32 },   // Seat 2 - Left top
    { x: 50, y: 8 },    // Seat 3 - Top center
    { x: 88, y: 32 },   // Seat 4 - Right top
    { x: 88, y: 68 },   // Seat 5 - Right bottom
  ],
  7: [
    { x: 50, y: 88 },   // Seat 0 - Hero (bottom center)
    { x: 12, y: 70 },   // Seat 1 - Left bottom
    { x: 12, y: 50 },   // Seat 2 - Left middle
    { x: 12, y: 30 },   // Seat 3 - Left top
    { x: 88, y: 30 },   // Seat 4 - Right top
    { x: 88, y: 50 },   // Seat 5 - Right middle
    { x: 88, y: 70 },   // Seat 6 - Right bottom
  ],
  8: [
    { x: 50, y: 88 },   // Seat 0 - Hero (bottom center)
    { x: 12, y: 70 },   // Seat 1 - Left bottom
    { x: 12, y: 50 },   // Seat 2 - Left middle
    { x: 12, y: 30 },   // Seat 3 - Left top
    { x: 50, y: 8 },    // Seat 4 - Top center
    { x: 88, y: 30 },   // Seat 5 - Right top
    { x: 88, y: 50 },   // Seat 6 - Right middle
    { x: 88, y: 70 },   // Seat 7 - Right bottom
  ],
};

// Fallback для 9-max (legacy)
const SEAT_POSITIONS_9MAX = [
  { x: 50, y: 88 },   // Seat 0 - Hero (bottom center)
  { x: 12, y: 70 },   // Seat 1 - Left bottom
  { x: 12, y: 50 },   // Seat 2 - Left middle
  { x: 12, y: 30 },   // Seat 3 - Left top
  { x: 50, y: 8 },    // Seat 4 - Top center
  { x: 88, y: 30 },   // Seat 5 - Right top
  { x: 88, y: 50 },   // Seat 6 - Right middle
  { x: 88, y: 70 },   // Seat 7 - Right bottom
];

// Legacy 6-max (используем новую систему)
const SEAT_POSITIONS_6MAX = SEAT_POSITIONS_BY_COUNT[6];

// Функция получения позиций по количеству игроков
function getSeatPositions(playerCount: number): Array<{ x: number; y: number }> {
  if (playerCount <= 2) return SEAT_POSITIONS_BY_COUNT[2];
  if (playerCount >= 9) return SEAT_POSITIONS_9MAX;
  return SEAT_POSITIONS_BY_COUNT[playerCount] || SEAT_POSITIONS_BY_COUNT[6];
}

// ============= PREMIUM POKER CARD with personalization =============
// Helper function to generate pattern CSS
const getCardBackPattern = (pattern: string, color: string): React.CSSProperties => {
  const colorWithAlpha = color + '20';
  switch (pattern) {
    case 'grid':
      return { backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 5px, ${colorWithAlpha} 5px, ${colorWithAlpha} 6px), repeating-linear-gradient(90deg, transparent, transparent 5px, ${colorWithAlpha} 5px, ${colorWithAlpha} 6px)` };
    case 'diamonds':
      return { backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 5px, ${colorWithAlpha} 5px, ${colorWithAlpha} 6px), repeating-linear-gradient(-45deg, transparent, transparent 5px, ${colorWithAlpha} 5px, ${colorWithAlpha} 6px)` };
    case 'dots':
      return { backgroundImage: `radial-gradient(circle, ${colorWithAlpha} 2px, transparent 2px)`, backgroundSize: '8px 8px' };
    case 'diagonal':
      return { backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, ${colorWithAlpha} 4px, ${colorWithAlpha} 5px)` };
    case 'circles':
      return { backgroundImage: `radial-gradient(circle, transparent 4px, ${colorWithAlpha} 4px, ${colorWithAlpha} 5px, transparent 5px)`, backgroundSize: '12px 12px' };
    case 'waves':
      return { backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 3px, ${colorWithAlpha} 3px, ${colorWithAlpha} 4px), repeating-linear-gradient(60deg, transparent, transparent 5px, ${colorWithAlpha} 5px, ${colorWithAlpha} 6px)` };
    default:
      return { backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 5px, ${colorWithAlpha} 5px, ${colorWithAlpha} 6px), repeating-linear-gradient(90deg, transparent, transparent 5px, ${colorWithAlpha} 5px, ${colorWithAlpha} 6px)` };
  }
};

interface PremiumCardProps {
  card: string;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  delay?: number;
  isWinning?: boolean;
  cardBackColors?: { accent: string; pattern: string };
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
  const accentColor = cardBackColors?.accent || '#ff7a00';
  const patternType = cardBackColors?.pattern || 'grid';

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
          background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
          border: '1px solid #e5e7eb',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)'
        }}
      >
        {/* Pattern */}
        <div 
          className="absolute inset-0"
          style={getCardBackPattern(patternType, accentColor)}
        />
        {/* Border frame */}
        <div className="absolute inset-1 border rounded-sm" style={{ borderColor: `${accentColor}30` }} />
        <div className="absolute inset-2 border rounded-sm" style={{ borderColor: `${accentColor}20` }} />
        {/* Center S logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span 
            className="font-display font-black text-xl"
            style={{ color: accentColor, opacity: 0.5 }}
          >
            S
          </span>
        </div>
        {/* Corner ornaments */}
        <div className="absolute top-1 left-1 w-2 h-2 border-l-2 border-t-2" style={{ borderColor: `${accentColor}40` }} />
        <div className="absolute top-1 right-1 w-2 h-2 border-r-2 border-t-2" style={{ borderColor: `${accentColor}40` }} />
        <div className="absolute bottom-1 left-1 w-2 h-2 border-l-2 border-b-2" style={{ borderColor: `${accentColor}40` }} />
        <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2" style={{ borderColor: `${accentColor}40` }} />
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
      {/* Top-left corner - Rank left, Suit right (horizontal) */}
      <div className="absolute top-1 left-1.5 flex items-center gap-1 leading-none">
        <span className={cn(cfg.rank, 'font-bold')} style={{ color: suitInfo.color }}>{rank}</span>
        <span className={cfg.suit} style={{ color: suitInfo.color }}>{suitInfo.symbol}</span>
      </div>
      
      {/* Center suit */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cfg.center} style={{ color: suitInfo.color, opacity: 0.15 }}>{suitInfo.symbol}</span>
      </div>
      
      {/* Bottom-right corner - Suit left, Rank right (horizontal, rotated 180°) */}
      <div className="absolute bottom-1 right-1.5 flex items-center gap-1 leading-none rotate-180">
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
  lastAction?: string;
  showdownPlayers?: Array<{ playerId: string; seatNumber: number; holeCards: string[]; handName?: string }>;
  showdownWinners?: Array<{ playerId: string; amount: number; handName?: string }>;
}

// ============= ACTION BADGE - PPPoker style status above player =============
const ActionBadge = memo(function ActionBadge({ 
  action, 
  amount 
}: { 
  action: string | null | undefined; 
  amount?: number;
}) {
  if (!action) return null;
  
  const actionConfig: Record<string, { label: string; bg: string; text: string }> = {
    fold: { label: 'Фолд', bg: 'bg-gray-600', text: 'text-white' },
    check: { label: 'Чек', bg: 'bg-blue-500', text: 'text-white' },
    call: { label: 'Колл', bg: 'bg-emerald-500', text: 'text-white' },
    bet: { label: 'Бет', bg: 'bg-amber-500', text: 'text-black' },
    raise: { label: 'Рейз', bg: 'bg-amber-500', text: 'text-black' },
    allin: { label: 'ОЛЛ-ИН', bg: 'bg-red-500', text: 'text-white' },
  };
  
  const config = actionConfig[action.toLowerCase()] || { label: action, bg: 'bg-gray-500', text: 'text-white' };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -5, scale: 0.8 }}
      className={cn(
        "absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shadow-lg z-30",
        config.bg, config.text
      )}
    >
      {config.label}
      {amount && amount > 0 && ` ${amount.toLocaleString()}`}
    </motion.div>
  );
});

// OpponentCards now uses PPPokerCompactCards component

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
  onSeatClick,
  lastAction,
  showdownPlayers,
  showdownWinners
}: PlayerSeatProps & { lastAction?: string }) {
  // Avatar sizes - same for all players
  const avatarSize = 56;
  
  // Check if this player is a winner from showdownWinners prop (more reliable than player.isWinner)
  const isWinner = useMemo(() => {
    if (!player) return false;
    if ((player as any).isWinner) return true;
    if (showdownWinners && showdownWinners.length > 0) {
      return showdownWinners.some(w => w.playerId === player.playerId);
    }
    return false;
  }, [player, showdownWinners]);
  
  // Empty seat
  if (!player) {
    return (
      <motion.div
        className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
        style={{ left: `${position.x}%`, top: `${position.y}%` }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => canJoin && onSeatClick?.(seatNumber)}
      >
        <div 
          className={cn(
            "rounded-full flex items-center justify-center transition-all",
            canJoin ? "cursor-pointer" : "cursor-default"
          )}
          style={{
            width: avatarSize,
            height: avatarSize,
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
        </div>
      </motion.div>
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
      {/* Avatar with status border and opponent cards */}
      <div className="relative">
        {/* Timer ring - UNDER cards and game elements, around avatar */}
        {isCurrentTurn && turnTimeRemaining !== undefined && !player.isFolded && (
          <div 
            className="absolute z-0 pointer-events-none"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: avatarSize + 6,
              height: avatarSize + 6
            }}
          >
            <SmoothAvatarTimer 
              remaining={turnTimeRemaining} 
              total={30} 
              size={avatarSize + 6}
              strokeWidth={3}
            />
          </div>
        )}
        
        {/* Level badge - PPPoker style (5YR, VIP, etc.) */}
        <PPPokerLevelBadge level={(player as any).level} isVIP={(player as any).isVIP} />
        
        <div 
          className={cn(
            "rounded-full overflow-hidden transition-all duration-200",
            player.isFolded && "opacity-50 grayscale"
          )}
          style={{
            width: avatarSize,
            height: avatarSize,
            border: isWinner
              ? '4px solid #fbbf24'
              : player.isAllIn
                ? '3px solid #ef4444'
                : '2px solid rgba(255,255,255,0.3)',
            boxShadow: isWinner
              ? '0 0 30px rgba(251,191,36,0.9), 0 0 60px rgba(251,191,36,0.6), 0 0 90px rgba(251,191,36,0.3)'
              : player.isAllIn
                ? '0 0 20px rgba(239,68,68,0.5)'
                : '0 6px 20px rgba(0,0,0,0.5)',
            animation: isWinner ? 'winner-glow 1.5s ease-in-out infinite' : undefined
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
          
          {/* Winner glow overlay */}
          {isWinner && (
            <motion.div 
              className="absolute inset-0 rounded-full pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ 
                boxShadow: 'inset 0 0 30px rgba(251,191,36,0.6)'
              }}
            />
          )}
        </div>
        
        {/* Opponent cards - positioned at corner of avatar */}
        {!isHero && !player.isFolded && gamePhase !== 'waiting' && (() => {
          // Get cards from showdownPlayers if available (revealed at showdown)
          const showdownData = showdownPlayers?.find(sp => sp.playerId === player.playerId || sp.seatNumber === seatNumber);
          const revealedCards = showdownData?.holeCards;
          const hasRevealedCards = revealedCards && revealedCards.length >= 2 && revealedCards[0] !== '??' && revealedCards[1] !== '??';
          
          // Also check player.holeCards (updated by hook at showdown)
          const playerHasCards = player.holeCards && player.holeCards.length >= 2 && player.holeCards[0] !== '??' && player.holeCards[1] !== '??';
          
          // Use revealed cards from showdownPlayers first, then player.holeCards
          const displayCards = hasRevealedCards ? revealedCards : (playerHasCards ? player.holeCards : ['??', '??']);
          
          // Reveal if showdown AND we have real cards to show
          const shouldReveal = gamePhase === 'showdown' && (hasRevealedCards || playerHasCards);
          
          // Get winning card indices - from player object (calculated by hook)
          const playerWinningIndices = (player as any).winningCardIndices || [];
          
          // Debug: log showdown data
          if (shouldReveal) {
            console.log('[PlayerSeat] Showdown render:', {
              playerName: player.name,
              isWinner: (player as any).isWinner,
              winningCardIndices: playerWinningIndices,
              handName: (player as any).handName,
              displayCards
            });
          }
          
          // Position cards ON the avatar corner, pointing towards table center
          const isOnRightSide = position.x > 50;
          const isOnLeftSide = position.x <= 50;
          const isOnBottom = position.y > 50;
          const isOnTop = position.y <= 50;
          
          // Cards overlaid on avatar corner (towards center of table)
          // Left players: cards on RIGHT (towards table)
          // Right players: cards on LEFT (mirrored, towards table)
          let cardStyle: React.CSSProperties = {};
          
          if (isOnLeftSide) {
            // Left side players - cards on right side of avatar
            if (isOnBottom) {
              cardStyle = { top: '-12px', right: '-10px' }; // Left bottom: cards top-right
            } else {
              cardStyle = { bottom: '10px', right: '-10px' }; // Left top: cards bottom-right
            }
          } else {
            // Right side players - cards on left side of avatar (mirrored)
            if (isOnBottom) {
              cardStyle = { top: '-12px', left: '-10px' }; // Right bottom: cards top-left
            } else {
              cardStyle = { bottom: '10px', left: '-10px' }; // Right top: cards bottom-left
            }
          }
          
          return (
            <div 
              className="absolute z-5"
              style={cardStyle}
            >
              <PPPokerCompactCards 
                cards={displayCards}
                faceDown={!shouldReveal}
                isShowdown={shouldReveal}
                handName={shouldReveal ? (showdownData?.handName || (player as any).handName) : undefined}
                isWinner={(player as any).isWinner}
                winningCardIndices={playerWinningIndices}
                size="xs"
                position={position}
              />
            </div>
          );
        })()}
        
        {/* Dealer button - PPPoker style - positioned INSIDE table */}
        {isDealer && (
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center z-25",
              position.x > 50 ? "-left-2" : "-right-2"
            )}
            style={{
              background: 'linear-gradient(145deg, #fef3c7 0%, #fbbf24 50%, #f59e0b 100%)',
              border: '2px solid #92400e',
              boxShadow: '0 2px 8px rgba(251,191,36,0.5), inset 0 1px 2px rgba(255,255,255,0.4)'
            }}
          >
            <span className="font-black text-[10px] text-amber-900">D</span>
          </motion.div>
        )}
        
        {/* SB/BB indicator - positioned INSIDE table (opposite side from edge) */}
        {(isSB || isBB) && !isDealer && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center z-20",
              position.x > 50 ? "-left-2" : "-right-2"
            )}
            style={{
              background: isBB 
                ? 'linear-gradient(145deg, #fbbf24, #f59e0b)'
                : 'linear-gradient(145deg, #94a3b8, #64748b)',
              border: isBB ? '1.5px solid #92400e' : '1.5px solid #475569',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
            }}
          >
            <span className={cn(
              "font-black text-[7px]",
              isBB ? "text-amber-900" : "text-gray-800"
            )}>{isBB ? 'BB' : 'SB'}</span>
          </motion.div>
        )}
      </div>
      
      {/* Name and stack panel - anchored to avatar center (doesn't affect seat positioning) */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md text-center min-w-[60px]"
        style={{
          top: avatarSize + 6,
          background: player.isAllIn 
            ? 'linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)'
            : 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(20,20,20,0.95) 100%)',
          borderBottom: `2px solid ${player.isAllIn ? '#ef4444' : '#22c55e'}`
        }}
      >
        <p className="text-[9px] text-white/80 font-medium truncate max-w-[60px]">
          {player.name}
        </p>
        <p className={cn(
          "text-[11px] font-bold",
          player.isAllIn ? "text-white" : "text-emerald-400"
        )}>
          {player.isAllIn ? 'ALL-IN' : player.stack.toLocaleString()}
        </p>
      </div>
      
      {/* Hero cards - below player, not in avatar container */}
      {isHero && heroCards && heroCards.length > 0 && !player.isFolded && (
        <PPPokerHeroCards 
          cards={heroCards} 
          gamePhase={gamePhase} 
          communityCards={communityCards}
          isWinner={(player as any).isWinner}
          winningCardIndices={(player as any).winningCardIndices || []}
        />
      )}
      
      {/* Action badge - PPPoker style */}
      <AnimatePresence>
        {lastAction && !player.isFolded && (
          <PPPokerActionBadge action={lastAction} amount={player.betAmount} />
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// ============= SYNDIKATE TABLE FELT - Unique hexagonal stadium shape =============
interface SyndikateTableFeltProps {
  themeColor?: string;
  themeGradient?: string;
  wideMode?: boolean; // For Telegram Mini App - wider table
}

const SyndikateTableFelt = memo(function SyndikateTableFelt({ 
  themeColor = '#0d5c2e',
  themeGradient,
  wideMode = false
}: SyndikateTableFeltProps) {
  // Generate felt gradient from theme color
  // Wide mode uses smaller left/right margins for Telegram Mini App
  const sideMargin = wideMode ? { outer: '10%', leather: '11%', glow: '12%', inner: '13%', felt: '14%', corners: '12%' } 
                               : { outer: '20%', leather: '21%', glow: '22%', inner: '23%', felt: '24%', corners: '22%' };
  const feltGradient = themeGradient || `radial-gradient(ellipse at 50% 40%, ${themeColor} 0%, ${themeColor}dd 25%, ${themeColor}bb 45%, ${themeColor}99 65%, ${themeColor}77 85%, ${themeColor}55 100%)`;
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Transparent background - uses parent's tech theme */}
      
      {/* Glowing ambient effect behind table - vertical stadium shape */}
      <div 
        className="absolute"
        style={{
          top: '8%',
          left: sideMargin.glow,
          right: sideMargin.glow,
          bottom: '8%',
          borderRadius: '45% / 25%',
          background: `radial-gradient(ellipse at 50% 50%, ${themeColor}50 0%, transparent 70%)`,
          filter: 'blur(40px)'
        }}
      />
      
      {/* Outer metallic rail - VERTICAL stadium shape like hockey rink */}
      <div 
        className="absolute"
        style={{
          top: '6%',
          left: sideMargin.outer,
          right: sideMargin.outer,
          bottom: '6%',
          borderRadius: '45% / 22%',
          background: 'linear-gradient(180deg, #5a6a7a 0%, #3d4a5a 20%, #2a3440 50%, #3d4a5a 80%, #5a6a7a 100%)',
          boxShadow: '0 10px 60px rgba(0,0,0,0.9), 0 0 80px rgba(0,0,0,0.4), inset 0 2px 20px rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      />
      
      {/* Leather padding rail */}
      <div 
        className="absolute"
        style={{
          top: '7%',
          left: sideMargin.leather,
          right: sideMargin.leather,
          bottom: '7%',
          borderRadius: '44% / 21%',
          background: 'linear-gradient(180deg, #3a2820 0%, #2a1a14 30%, #1a0f0a 60%, #2a1a14 85%, #3a2820 100%)',
          boxShadow: 'inset 0 5px 30px rgba(0,0,0,0.8), inset 0 -5px 20px rgba(0,0,0,0.4)'
        }}
      />
      
      {/* Inner metal trim */}
      <div 
        className="absolute"
        style={{
          top: '9%',
          left: sideMargin.inner,
          right: sideMargin.inner,
          bottom: '9%',
          borderRadius: '42% / 20%',
          background: 'linear-gradient(180deg, #4a5568 0%, #2d3748 50%, #1a202c 100%)',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
          border: '1px solid rgba(212,175,55,0.2)'
        }}
      />
      
      {/* Main felt surface - vertical stadium oval */}
      <div 
        className="absolute"
        style={{
          top: '10%',
          left: sideMargin.felt,
          right: sideMargin.felt,
          bottom: '10%',
          borderRadius: '40% / 18%',
          background: feltGradient,
          boxShadow: 'inset 0 0 80px rgba(0,0,0,0.35), inset 0 -40px 80px rgba(0,0,0,0.2), inset 0 30px 50px rgba(255,255,255,0.02)'
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
        <div className="absolute top-1/2 -translate-y-1/2 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"/>
        
        {/* Corner decorations - positioned for vertical shape */}
        {[
          { top: '12%', left: sideMargin.corners },
          { top: '12%', right: sideMargin.corners },
          { bottom: '12%', left: sideMargin.corners },
          { bottom: '12%', right: sideMargin.corners }
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
  phase,
  winningCardIndices = []
}: { 
  cards: string[]; 
  phase: string;
  winningCardIndices?: number[];
}) {
  const { currentCardBack, preferences } = usePokerPreferences();
  const visibleCount = phase === 'flop' ? 3 : phase === 'turn' ? 4 : (phase === 'river' || phase === 'showdown') ? 5 : 0;
  const isShowdown = phase === 'showdown';
  const hasWinningInfo = winningCardIndices.length > 0;

  return (
    <div className="flex items-center justify-center gap-1">
      {[0, 1, 2, 3, 4].map((idx) => {
        const isVisible = idx < visibleCount;
        const card = cards[idx];
        const isWinning = winningCardIndices.includes(idx);
        const isDimmed = isShowdown && hasWinningInfo && !isWinning;
        
        return (
          <AnimatePresence key={idx}>
            {isVisible && card ? (
              <motion.div
                initial={{ y: -80, opacity: 0, rotateX: 90 }}
                animate={{ y: 0, opacity: isDimmed ? 0.6 : 1, rotateX: 0 }}
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
                  size="md" 
                  delay={0} 
                  isWinning={isShowdown && isWinning}
                  cardBackColors={{ accent: currentCardBack.accentColor, pattern: currentCardBack.pattern }}
                  cardStyle={preferences.cardStyle}
                />
              </motion.div>
            ) : (
              <div 
                key={`empty-${idx}`}
                className="rounded-md border border-dashed border-white/10"
                style={{ width: 48, height: 66 }}
              />
            )}
          </AnimatePresence>
        );
      })}
    </div>
  );
});

// ============= POT DISPLAY - PPPoker style with premium 3D chips =============
const PotDisplay = memo(function PotDisplay({ pot, blinds }: { pot: number; blinds: string }) {
  if (pot === 0) return null;
  
  // Parse big blind from blinds string (e.g., "10/20" -> 20)
  const bigBlind = parseInt(blinds.split('/')[1]) || 20;
  
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex flex-col items-center gap-2"
    >
      {/* Pot amount with premium 3D chip stack */}
      <div className="flex items-center gap-3">
        {/* Premium 3D Chip stack from RealisticPokerChip */}
        <PotChips 
          amount={pot} 
          bigBlind={bigBlind} 
          size={26} 
          animated 
        />
        
        {/* Pot amount - golden text */}
        <span 
          className="font-bold text-[17px]"
          style={{
            color: '#fbbf24',
            textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 10px rgba(251,191,36,0.3)'
          }}
        >
          {pot.toLocaleString()}
        </span>
      </div>
      
      {/* Blinds info - PPPoker Russian style */}
      <span 
        className="text-white/90 text-[12px] font-medium"
        style={{
          textShadow: '0 1px 3px rgba(0,0,0,0.8)'
        }}
      >
        Блайнды: {blinds}
      </span>
    </motion.div>
  );
});
// ============= TOURNAMENT INFO BAR (compact PPPoker style) =============
interface TournamentInfoBarProps {
  currentLevel?: number;
  smallBlind: number;
  bigBlind: number;
  ante?: number;
  timeToNextLevel?: number;
  remainingPlayers?: number;
  totalPlayers?: number;
  tournamentName?: string;
}

const TournamentInfoBar = memo(function TournamentInfoBar({
  currentLevel = 1,
  smallBlind,
  bigBlind,
  ante,
  timeToNextLevel = 0,
  remainingPlayers = 0,
  totalPlayers = 0,
  tournamentName
}: TournamentInfoBarProps) {
  const isLowTime = timeToNextLevel > 0 && timeToNextLevel <= 60;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center justify-center gap-3 px-4 py-2 rounded-full"
      style={{
        background: 'linear-gradient(180deg, rgba(15,20,25,0.9) 0%, rgba(5,10,15,0.95) 100%)',
        border: '1px solid rgba(34,197,94,0.25)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
      }}
    >
      {/* Level badge */}
      <div className="flex items-center gap-1.5">
        <div 
          className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[10px]"
          style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
        >
          {currentLevel}
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-emerald-400 font-bold text-xs">
            {smallBlind.toLocaleString()}/{bigBlind.toLocaleString()}
          </span>
          {ante && ante > 0 && (
            <span className="text-white/50 text-[8px]">
              ante {ante}
            </span>
          )}
        </div>
      </div>
      
      {/* Divider */}
      <div className="w-px h-5 bg-white/10" />
      
      {/* Timer */}
      {timeToNextLevel > 0 && (
        <>
          <div className={cn(
            "flex items-center gap-1 font-mono font-bold text-xs",
            isLowTime ? "text-red-400" : "text-white"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full", isLowTime ? "bg-red-400 animate-pulse" : "bg-emerald-400")} />
            {formatTime(timeToNextLevel)}
          </div>
          <div className="w-px h-5 bg-white/10" />
        </>
      )}
      
      {/* Players */}
      {totalPlayers > 0 && (
        <div className="flex items-center gap-1 text-white text-xs">
          <span className="text-blue-400">👤</span>
          <span>{remainingPlayers}/{totalPlayers}</span>
        </div>
      )}
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
  onPotCollect?: () => void;
  // Showdown data
  showdownPlayers?: Array<{ playerId: string; seatNumber: number; holeCards: string[]; handName?: string; isFolded?: boolean }>;
  winners?: Array<{ playerId: string; amount: number; handName?: string }>;
  // Tournament info
  tournamentId?: string;
  tournamentName?: string;
  currentLevel?: number;
  levelTimeRemaining?: number;
  nextSmallBlind?: number;
  nextBigBlind?: number;
  remainingPlayers?: number;
  totalPlayers?: number;
  prizePool?: number;
  ante?: number;
  // Table configuration
  maxSeats?: number;
  wideMode?: boolean; // For Telegram Mini App - wider table
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
  onSeatClick,
  onPotCollect,
  // Showdown props
  showdownPlayers,
  winners,
  // Tournament props
  tournamentId,
  tournamentName,
  currentLevel,
  levelTimeRemaining,
  remainingPlayers,
  totalPlayers,
  ante,
  // Table config
  maxSeats = 6,
  wideMode = false
}: FullscreenPokerTableProps) {
  // Use dynamic positions based on max seats
  const maxPlayers = maxSeats;
  const positions = getSeatPositions(maxPlayers);
  
  // Get personalization preferences
  const { preferences, currentTableTheme, currentCardBack } = usePokerPreferences();
  
  // Track phase changes for pot collection animation
  const prevPhaseRef = useRef(phase);
  const [isCollectingBets, setIsCollectingBets] = useState(false);
  const [collectionBets, setCollectionBets] = useState<Array<{ seatPosition: { x: number; y: number }; amount: number }>>([]);
  
  // Win distribution animation state
  const [winDistribution, setWinDistribution] = useState<{ winnerSeat: number; amount: number } | null>(null);
  
  // Trigger win distribution animation when winners change
  useEffect(() => {
    if (winners && winners.length > 0 && phase === 'showdown') {
      const winner = winners[0];
      // Find winner's seat
      const winnerPlayer = players.find(p => p.playerId === winner.playerId);
      if (winnerPlayer) {
        // Calculate visual position
        let visualPos = 0;
        if (heroSeat !== null) {
          visualPos = (winnerPlayer.seatNumber - heroSeat + maxPlayers) % maxPlayers;
        } else {
          visualPos = (winnerPlayer.seatNumber + preferences.preferredSeatRotation) % maxPlayers;
        }
        setWinDistribution({ winnerSeat: visualPos, amount: winner.amount });
      }
    } else {
      setWinDistribution(null);
    }
  }, [winners, phase, players, heroSeat, maxPlayers, preferences.preferredSeatRotation]);
  
  
  // Detect phase change and trigger collection animation
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    const phasesOrder = ['preflop', 'flop', 'turn', 'river', 'showdown'];
    const prevIndex = phasesOrder.indexOf(prevPhase);
    const currIndex = phasesOrder.indexOf(phase);
    
    // Phase advanced (not reset) - collect bets
    if (currIndex > prevIndex && prevIndex >= 0) {
      // Gather all player bets for animation
      const betsToCollect = players
        .filter(p => p.betAmount > 0)
        .map(p => {
          // Find visual position for this player
          let visualPos = 0;
          if (heroSeat !== null) {
            // Hero always at position 0 - no rotation offset when hero is seated
            visualPos = (p.seatNumber - heroSeat + maxPlayers) % maxPlayers;
          } else {
            visualPos = (p.seatNumber + preferences.preferredSeatRotation) % maxPlayers;
          }
          return {
            seatPosition: positions[visualPos],
            amount: p.betAmount
          };
        });
      
      if (betsToCollect.length > 0) {
        setCollectionBets(betsToCollect);
        setIsCollectingBets(true);
        onPotCollect?.();
      }
    }
    
    prevPhaseRef.current = phase;
  }, [phase, players, heroSeat, preferences.preferredSeatRotation, positions, maxPlayers]);
  
  
  // Build players array positioned relative to hero with rotation preference
  const positionedPlayers = useMemo(() => {
    const result: (PokerPlayer | null)[] = new Array(maxPlayers).fill(null);
    const rotationOffset = preferences.preferredSeatRotation;
    
    players.forEach(player => {
      let visualPosition: number;
      if (heroSeat !== null) {
        // Hero always at position 0 (bottom center) - no rotation offset when hero is seated
        visualPosition = (player.seatNumber - heroSeat + maxPlayers) % maxPlayers;
      } else {
        // No hero seated - apply rotation preference
        visualPosition = (player.seatNumber + rotationOffset) % maxPlayers;
      }
      result[visualPosition] = player;
    });
    
    return result;
  }, [players, heroSeat, maxPlayers, preferences.preferredSeatRotation]);
  

  return (
    <div className="relative w-full h-full">
      {/* Syndikate tech background */}
      <SyndikateTableBackground themeColor={currentTableTheme.color} />
      
      {/* Table felt overlay */}
      <SyndikateTableFelt themeColor={currentTableTheme.color} wideMode={wideMode} />
      
      
      {/* Pot collection animation */}
      <PotCollectionAnimation
        isCollecting={isCollectingBets}
        bets={collectionBets}
        onComplete={() => {
          setIsCollectingBets(false);
          setCollectionBets([]);
        }}
      />
      
      {/* Win distribution animation - chips flying from pot to winner in cascade */}
      <AnimatePresence>
        {winDistribution && (() => {
          const targetPos = positions[winDistribution.winnerSeat];
          const potY = 50; // Center of table
          const potX = 50;
          const deltaX = (targetPos.x - potX);
          const deltaY = (targetPos.y - potY);
          const chipCount = 12;
          
          return (
            <motion.div
              key="win-distribution"
              className="absolute inset-0 pointer-events-none z-50"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
            >
              {/* Flying chips cascade from pot to winner */}
              {[...Array(chipCount)].map((_, i) => {
                const offsetX = (Math.random() - 0.5) * 15;
                const offsetY = (Math.random() - 0.5) * 10;
                const chipColors = [
                  'radial-gradient(circle at 30% 30%, #fbbf24 0%, #f59e0b 60%, #d97706 100%)',
                  'radial-gradient(circle at 30% 30%, #22c55e 0%, #16a34a 60%, #15803d 100%)',
                  'radial-gradient(circle at 30% 30%, #ef4444 0%, #dc2626 60%, #b91c1c 100%)',
                ];
                
                return (
                  <motion.div
                    key={`win-chip-${i}`}
                    className="absolute"
                    style={{ left: `${potX}%`, top: `${potY}%` }}
                    initial={{ x: offsetX, y: offsetY, scale: 1, opacity: 1, rotate: 0 }}
                    animate={{ 
                      x: `calc(${deltaX}vw + ${offsetX}px)`,
                      y: `calc(${deltaY}vh + ${offsetY}px)`,
                      scale: [1, 1.1, 0.8],
                      opacity: [1, 1, 1, 0],
                      rotate: (Math.random() - 0.5) * 180
                    }}
                    transition={{
                      duration: 0.7,
                      delay: i * 0.04,
                      ease: [0.25, 0.46, 0.45, 0.94]
                    }}
                    onAnimationComplete={() => {
                      if (i === chipCount - 1) {
                        setTimeout(() => setWinDistribution(null), 200);
                      }
                    }}
                  >
                    <div className="relative" style={{ transform: 'translate(-50%, -50%)' }}>
                      {[0, 1, 2].map((j) => (
                        <div
                          key={j}
                          className="absolute rounded-full"
                          style={{
                            width: 18,
                            height: 18,
                            bottom: j * 2,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: chipColors[(i + j) % 3],
                            border: '2px solid rgba(255,255,255,0.5)',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                );
              })}
              
              {/* Golden trail effect */}
              <motion.div
                className="absolute rounded-full"
                style={{ 
                  left: `${potX}%`, 
                  top: `${potY}%`,
                  width: 60,
                  height: 60,
                  transform: 'translate(-50%, -50%)',
                  background: 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, transparent 70%)'
                }}
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ 
                  scale: [1, 2, 0.5],
                  opacity: [0.8, 0.4, 0],
                  x: `calc(${deltaX}vw)`,
                  y: `calc(${deltaY}vh)`
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </motion.div>
          );
        })()}
      </AnimatePresence>
      
      {/* Center area - pot and community cards - vertically centered in table */}
      {(() => {
        const winnerPlayer = players.find(p => (p as any).isWinner);
        const winningCommIndices = (winnerPlayer as any)?.communityCardIndices || [];
        
        return (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-10">
            <PotDisplay pot={pot} blinds={`${smallBlind}/${bigBlind}`} />
            <CommunityCards 
              cards={communityCards} 
              phase={phase} 
              winningCardIndices={winningCommIndices}
            />
            
            {/* Tournament info bar - shown when tournament mode */}
            {(currentLevel || totalPlayers) && (
              <TournamentInfoBar
                currentLevel={currentLevel}
                smallBlind={smallBlind}
                bigBlind={bigBlind}
                ante={ante}
                timeToNextLevel={levelTimeRemaining}
                remainingPlayers={remainingPlayers}
                totalPlayers={totalPlayers}
                tournamentName={tournamentName}
              />
            )}
          </div>
        );
      })()}
      
      {/* Player seats */}
      {positions.map((pos, idx) => {
        const player = positionedPlayers[idx];
        const actualSeatNumber = heroSeat !== null 
          ? (idx + heroSeat) % maxPlayers 
          : idx;

        const isHeroSeat = idx === 0 && heroSeat !== null;

        return (
          <React.Fragment key={`seat-${idx}`}>
            <PlayerSeat
              player={player}
              position={pos}
              seatNumber={actualSeatNumber}
              isHero={isHeroSeat}
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
              lastAction={(player as any)?.lastAction}
              showdownPlayers={showdownPlayers}
              showdownWinners={winners}
            />

            {/* Bet amount - anchored to avatar center in table coordinates */}
            {!!player?.betAmount && player.betAmount > 0 && (
              <PPPokerChipStack
                amount={player.betAmount}
                seatPosition={pos}
                animated={true}
                isHero={isHeroSeat}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
});

export default FullscreenPokerTable;