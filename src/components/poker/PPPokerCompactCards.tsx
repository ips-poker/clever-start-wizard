// PPPoker-style Compact Cards - Cards positioned BELOW avatar (fanned)
// Smaller cards for opponents, positioned like in PPPoker reference images

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePokerPreferences } from '@/hooks/usePokerPreferences';

interface PPPokerCompactCardsProps {
  cards?: string[];
  faceDown?: boolean;
  isShowdown?: boolean;
  handName?: string;
  isWinner?: boolean;
  winningCardIndices?: number[]; // Indices of cards that participate in winning hand
  size?: 'xs' | 'sm';
  position?: { x: number; y: number }; // Player position for determining card placement
}

// Four-color suit configuration
const SUITS = {
  h: { symbol: '♥', color: '#ef4444' },   // Red hearts
  d: { symbol: '♦', color: '#3b82f6' },   // Blue diamonds  
  c: { symbol: '♣', color: '#22c55e' },   // Green clubs
  s: { symbol: '♠', color: '#1e293b' }    // Black spades
};

// Standard two-color suits
const SUITS_CLASSIC = {
  h: { symbol: '♥', color: '#ef4444' },
  d: { symbol: '♦', color: '#ef4444' },
  c: { symbol: '♣', color: '#1e293b' },
  s: { symbol: '♠', color: '#1e293b' }
};

// Size configuration - PPPoker style cards
const SIZE_CONFIG = {
  xs: { w: 22, h: 32, rank: 'text-[9px]', suit: 'text-[8px]', center: 'text-[12px]', overlap: -6 },
  sm: { w: 28, h: 40, rank: 'text-[11px]', suit: 'text-[10px]', center: 'text-[16px]', overlap: -8 }
};

// Single mini card component with dimming support for showdown
const MiniCard = memo(function MiniCard({
  card,
  faceDown = false,
  size = 'xs',
  delay = 0,
  isWinning = false,
  isDimmed = false,
  rotation = 0,
  cardBackColors,
  useFourColor = false
}: {
  card: string;
  faceDown?: boolean;
  size?: 'xs' | 'sm';
  delay?: number;
  isWinning?: boolean;
  isDimmed?: boolean;
  rotation?: number;
  cardBackColors?: { primary: string; secondary: string };
  useFourColor?: boolean;
}) {
  const cfg = SIZE_CONFIG[size];
  const rank = card?.[0] === 'T' ? '10' : card?.[0] || '?';
  const suitChar = (card?.[1]?.toLowerCase() || 's') as keyof typeof SUITS;
  const suitSource = useFourColor ? SUITS : SUITS_CLASSIC;
  const suitInfo = suitSource[suitChar] || suitSource['s']; // Fallback to spades if invalid
  
  const backPrimary = cardBackColors?.primary || '#3b82f6';
  const backSecondary = cardBackColors?.secondary || '#1d4ed8';

  // Colors for dimmed cards
  const cardBg = isDimmed 
    ? 'linear-gradient(145deg, #4b5563 0%, #374151 100%)'
    : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)';
  const suitColor = isDimmed ? '#9ca3af' : suitInfo.color;
  const borderStyle = isWinning 
    ? '2px solid #fbbf24' 
    : isDimmed 
      ? '1px solid #6b7280' 
      : '1px solid #e2e8f0';

  if (faceDown) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, rotate: rotation }}
        transition={{ delay: delay * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
        className="rounded-[4px] shadow-lg relative overflow-hidden"
        style={{
          width: cfg.w,
          height: cfg.h,
          background: `linear-gradient(145deg, ${backPrimary} 0%, ${backSecondary} 50%, ${backPrimary}dd 100%)`,
          border: `1.5px solid ${backSecondary}`,
          boxShadow: isWinning 
            ? '0 0 12px rgba(251,191,36,0.6), 0 3px 8px rgba(0,0,0,0.5)' 
            : '0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
          transformOrigin: 'bottom center'
        }}
      >
        {/* Outer border frame */}
        <div 
          className="absolute inset-[2px] rounded-[2px] pointer-events-none"
          style={{
            border: '0.5px solid rgba(255,255,255,0.2)'
          }}
        />
        
        {/* Inner decorative frame */}
        <div 
          className="absolute inset-[4px] rounded-[1px] pointer-events-none"
          style={{
            border: '0.5px solid rgba(255,255,255,0.1)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 50%)'
          }}
        />
        
        {/* Central diamond pattern with more detail */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 20 29" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id={`cardback-pattern-${backPrimary.replace('#','')}`} x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M2.5 0 L5 2.5 L2.5 5 L0 2.5 Z" fill="rgba(255,255,255,0.15)" />
            </pattern>
            <linearGradient id={`cardback-shine-${backPrimary.replace('#','')}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#cardback-pattern-${backPrimary.replace('#','')})`} />
          <rect width="100%" height="100%" fill={`url(#cardback-shine-${backPrimary.replace('#','')})`} />
        </svg>
        
        {/* Center emblem/logo area */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="w-3 h-3 rounded-full flex items-center justify-center"
            style={{
              background: `linear-gradient(145deg, ${backSecondary} 0%, ${backPrimary} 100%)`,
              border: '0.5px solid rgba(255,255,255,0.3)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.1)'
            }}
          >
            <div 
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)',
              }}
            />
          </div>
        </div>
        
        {/* Top corner decoration */}
        <div 
          className="absolute top-1 left-1 w-1 h-1"
          style={{
            background: 'rgba(255,255,255,0.2)',
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
          }}
        />
        
        {/* Bottom corner decoration */}
        <div 
          className="absolute bottom-1 right-1 w-1 h-1"
          style={{
            background: 'rgba(255,255,255,0.2)',
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
          }}
        />
        
        {/* Glossy overlay */}
        <div 
          className="absolute inset-0 pointer-events-none rounded-[3px]"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 40%, rgba(0,0,0,0.1) 100%)'
          }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: isDimmed ? 0.85 : 1, rotate: rotation }}
      transition={{ delay: delay * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
      className="rounded-[4px] shadow-lg relative"
      style={{
        width: cfg.w,
        height: cfg.h,
        background: isDimmed 
          ? 'linear-gradient(145deg, #4b5563 0%, #374151 100%)'
          : 'linear-gradient(145deg, #ffffff 0%, #fafafa 50%, #f5f5f5 100%)',
        border: isWinning 
          ? '2px solid #fbbf24' 
          : isDimmed 
            ? '1px solid #6b7280' 
            : '1px solid #e5e5e5',
        boxShadow: isWinning 
          ? '0 0 14px rgba(251,191,36,0.6), 0 3px 8px rgba(0,0,0,0.3)' 
          : '0 3px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.8)',
        transformOrigin: 'bottom center'
      }}
    >
      {/* Top-left corner - Rank above Suit (PPPoker style) */}
      <div className="absolute top-[2px] left-[3px] flex flex-col items-center leading-none">
        <span 
          className={cn(cfg.rank, 'font-black leading-none')} 
          style={{ color: suitColor }}
        >
          {rank}
        </span>
        <span 
          className={cn(cfg.suit, 'leading-none -mt-[1px]')} 
          style={{ color: suitColor }}
        >
          {suitInfo.symbol}
        </span>
      </div>
      
      {/* Center suit - large (PPPoker style) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span 
          className={cfg.center}
          style={{ 
            color: suitColor,
            opacity: isDimmed ? 0.5 : 0.85
          }}
        >
          {suitInfo.symbol}
        </span>
      </div>
      
      {/* Bottom-right corner - Rotated (PPPoker style) */}
      <div className="absolute bottom-[2px] right-[3px] flex flex-col items-center leading-none rotate-180">
        <span 
          className={cn(cfg.rank, 'font-black leading-none')} 
          style={{ color: suitColor }}
        >
          {rank}
        </span>
        <span 
          className={cn(cfg.suit, 'leading-none -mt-[1px]')} 
          style={{ color: suitColor }}
        >
          {suitInfo.symbol}
        </span>
      </div>
      
      {/* Glossy effect - only on bright cards */}
      {!isDimmed && (
        <div 
          className="absolute inset-0 pointer-events-none rounded-[3px]"
          style={{ 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 35%, rgba(0,0,0,0.02) 100%)' 
          }}
        />
      )}
    </motion.div>
  );
});

export const PPPokerCompactCards = memo(function PPPokerCompactCards({
  cards,
  faceDown = false,
  isShowdown = false,
  handName,
  isWinner = false,
  winningCardIndices = [],
  size = 'xs',
  position = { x: 50, y: 50 }
}: PPPokerCompactCardsProps) {
  const { currentCardBack, preferences } = usePokerPreferences();
  
  const cfg = SIZE_CONFIG[size];
  // Show actual cards when we have them and not face down
  const hasCards = cards && cards.length >= 2;
  const showCards = hasCards && !faceDown;
  const useFourColor = preferences.cardStyle === 'fourcolor';
  
  // For PLO4, show all 4 cards - default to 2 cards if no cards provided
  const cardCount = hasCards ? cards.length : 2;
  const displayCards = showCards ? cards : Array(Math.min(cardCount, 4)).fill('XX');
  
  // Don't render anything if no cards and not in a game phase
  if (!hasCards && !isShowdown) return null;

  // Calculate rotations for card fan - PPPoker style: bigger angle spread like in reference
  const getRotations = (count: number) => {
    if (count === 2) return [-12, 22]; // More spread
    if (count === 3) return [-18, 8, 28];
    if (count === 4) return [-20, -5, 12, 28];
    return [-12, 22];
  };
  
  const rotations = getRotations(displayCards.length);
  
  // Determine if cards should be on left or right based on player position
  // Cards should point TOWARDS the center of the table
  const isOnRightSide = position.x > 50;

  return (
    <>
      {/* Cards positioned TOWARDS CENTER - left for right-side players, right for left-side players */}
      <div 
        className="absolute"
        style={{
          [isOnRightSide ? 'left' : 'right']: -(cfg.w * 2.5),
          top: '5%',
          zIndex: 5,
          transform: isOnRightSide ? 'scaleX(-1)' : 'none'
        }}
      >
        {/* Cards container - tight fan effect like PPPoker */}
        <div className="relative" style={{ width: cfg.w * 3, height: cfg.h + 10 }}>
          {displayCards.map((card, idx) => {
            // Determine if this card is part of winning hand
            const isCardWinning = winningCardIndices.includes(idx);
            // At showdown with winning cards specified, dim non-winning cards
            const isDimmed = isShowdown && winningCardIndices.length > 0 && !isCardWinning;
            
            // PPPoker style tight fan - cards fan out from left with small angles
            const totalCards = displayCards.length;
            // Start rotation and step for tight fan
            const baseRotation = -5;
            const rotationStep = totalCards === 4 ? 8 : totalCards === 3 ? 10 : 12;
            const rotation = baseRotation + idx * rotationStep;
            
            // Cards overlap significantly, small horizontal offset
            const xOffset = idx * (cfg.w * 0.55);
            
            return (
              <div 
                key={idx} 
                className="absolute"
                style={{ 
                  left: xOffset,
                  top: 0,
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: 'bottom center',
                  zIndex: idx + 1
                }}
              >
                <MiniCard 
                  card={showCards ? card : 'XX'} 
                  faceDown={!showCards}
                  size={size} 
                  delay={idx}
                  isWinning={isShowdown && isCardWinning && isWinner}
                  isDimmed={isDimmed}
                  rotation={0}
                  cardBackColors={{ primary: currentCardBack.primaryColor, secondary: currentCardBack.secondaryColor }}
                  useFourColor={useFourColor}
                />
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Hand name badge at showdown - positioned BELOW player panel, green text */}
      {isShowdown && handName && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap z-30"
          style={{
            bottom: -22,
          }}
        >
          <span 
            className="text-[11px] font-bold"
            style={{
              color: isWinner ? '#22c55e' : '#22c55e',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)'
            }}
          >
            {handName}
          </span>
        </motion.div>
      )}
    </>
  );
});

export default PPPokerCompactCards;
