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

// Size configuration - larger cards with more rotation
const SIZE_CONFIG = {
  xs: { w: 28, h: 38, rank: 'text-[9px]', suit: 'text-[8px]', overlap: -8 },
  sm: { w: 36, h: 50, rank: 'text-[11px]', suit: 'text-[10px]', overlap: -12 }
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
        className="rounded-[3px] shadow-md relative overflow-hidden"
        style={{
          width: cfg.w,
          height: cfg.h,
          background: `linear-gradient(145deg, ${backPrimary} 0%, ${backSecondary} 100%)`,
          border: `1px solid ${backPrimary}`,
          boxShadow: isWinning 
            ? '0 0 12px rgba(251,191,36,0.6), 0 2px 6px rgba(0,0,0,0.4)' 
            : '0 2px 6px rgba(0,0,0,0.4)',
          transformOrigin: 'bottom center'
        }}
      >
        {/* Diamond pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 24 32">
          <defs>
            <pattern id={`mini-${backPrimary.replace('#','')}`} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M4 0 L8 4 L4 8 L0 4 Z" fill="white" opacity="0.4"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#mini-${backPrimary.replace('#','')})`}/>
        </svg>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: isDimmed ? 0.9 : 1, rotate: rotation }}
      transition={{ delay: delay * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
      className="rounded-[3px] shadow-md relative flex flex-col"
      style={{
        width: cfg.w,
        height: cfg.h,
        background: cardBg,
        border: borderStyle,
        boxShadow: isWinning 
          ? '0 0 12px rgba(251,191,36,0.6), 0 2px 6px rgba(0,0,0,0.3)' 
          : '0 2px 6px rgba(0,0,0,0.25)',
        transformOrigin: 'bottom center'
      }}
    >
      {/* Top-left corner */}
      <div className="absolute top-0.5 left-1 flex flex-col items-center leading-none">
        <span className={cn(cfg.rank, 'font-bold')} style={{ color: suitColor }}>{rank}</span>
        <span className={cfg.suit} style={{ color: suitColor }}>{suitInfo.symbol}</span>
      </div>
      
      {/* Glossy effect - only on bright cards */}
      {!isDimmed && (
        <div className="absolute inset-0 pointer-events-none rounded-[3px]"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 50%)' }}
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
  size = 'xs'
}: PPPokerCompactCardsProps) {
  const { currentCardBack, preferences } = usePokerPreferences();
  
  const cfg = SIZE_CONFIG[size];
  const showCards = isShowdown && cards && cards.length >= 2;
  const useFourColor = preferences.cardStyle === 'fourcolor';
  
  // For PLO4, show all 4 cards
  const cardCount = cards?.length || 2;
  const displayCards = showCards ? cards : Array(Math.min(cardCount, 4)).fill('XX');

  // Calculate rotations for card fan - PPPoker style: bigger angle spread like in reference
  const getRotations = (count: number) => {
    if (count === 2) return [-12, 22]; // More spread
    if (count === 3) return [-18, 8, 28];
    if (count === 4) return [-20, -5, 12, 28];
    return [-12, 22];
  };
  
  const rotations = getRotations(displayCards.length);

  return (
    <>
      {/* Cards positioned to the RIGHT of avatar, fanned with bigger angle - PPPoker style */}
      <div 
        className="absolute"
        style={{
          right: -(cfg.w * 0.6),
          top: '15%',
          zIndex: 5
        }}
      >
        {/* Cards container - fanned effect with more angle and shift like PPPoker */}
        <div className="relative" style={{ width: cfg.w * 2.8, height: cfg.h + 20 }}>
          {displayCards.map((card, idx) => {
            // Determine if this card is part of winning hand
            const isCardWinning = winningCardIndices.includes(idx);
            // At showdown with winning cards specified, dim non-winning cards
            const isDimmed = isShowdown && winningCardIndices.length > 0 && !isCardWinning;
            
            // Rotation and positioning for PPPoker style fan - more angle
            const totalCards = displayCards.length;
            const baseRotation = totalCards === 4 ? -18 : totalCards === 3 ? -15 : -12;
            const rotationStep = totalCards === 4 ? 10 : totalCards === 3 ? 12 : 18;
            const rotation = baseRotation + idx * rotationStep;
            
            // Horizontal offset for each card with more overlap
            const xOffset = idx * (cfg.w * 0.5);
            // Vertical stagger for depth effect
            const yOffset = idx * 2;
            
            return (
              <div 
                key={idx} 
                className="absolute"
                style={{ 
                  left: xOffset,
                  top: yOffset,
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: 'bottom left',
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
