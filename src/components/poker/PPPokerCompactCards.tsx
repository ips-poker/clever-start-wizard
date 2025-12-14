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

// Size configuration
const SIZE_CONFIG = {
  xs: { w: 24, h: 32, rank: 'text-[8px]', suit: 'text-[7px]', overlap: -6 },
  sm: { w: 32, h: 44, rank: 'text-[10px]', suit: 'text-[9px]', overlap: -10 }
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
  const suitInfo = useFourColor ? SUITS[suitChar] : SUITS_CLASSIC[suitChar];
  
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

  // Calculate rotations for card fan based on count
  const getRotations = (count: number) => {
    if (count === 2) return [-10, 10];
    if (count === 3) return [-15, 0, 15];
    if (count === 4) return [-15, -5, 5, 15];
    return [-10, 10];
  };
  
  const rotations = getRotations(displayCards.length);

  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-0.5 flex flex-col items-center z-5">
      {/* Cards container - fanned effect */}
      <div className="relative flex justify-center" style={{ height: cfg.h + 4 }}>
        {displayCards.map((card, idx) => {
          // Determine if this card is part of winning hand
          const isCardWinning = winningCardIndices.includes(idx);
          // At showdown with winning cards specified, dim non-winning cards
          const isDimmed = isShowdown && winningCardIndices.length > 0 && !isCardWinning;
          
          return (
            <div 
              key={idx} 
              className="absolute"
              style={{ 
                left: `${idx * 20 - ((displayCards.length - 1) * 10)}px`,
                transform: `rotate(${rotations[idx] || 0}deg)`,
                transformOrigin: 'bottom center',
                zIndex: idx
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
      
      {/* Hand name badge at showdown - PPPoker style */}
      {isShowdown && handName && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -2 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-1 px-2 py-0.5 rounded text-[9px] font-bold whitespace-nowrap"
          style={{
            background: isWinner 
              ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
              : 'transparent',
            color: isWinner ? '#ffffff' : '#22c55e',
            textShadow: '0 1px 3px rgba(0,0,0,0.5)'
          }}
        >
          {handName}
        </motion.div>
      )}
    </div>
  );
});

export default PPPokerCompactCards;
