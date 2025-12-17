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
  sm: { w: 28, h: 40, rank: 'text-[11px]', suit: 'text-[10px]', center: 'text-[16px]', overlap: -8 },
  // Showdown size - larger cards like in reference
  showdown: { w: 36, h: 52, rank: 'text-[13px]', suit: 'text-[12px]', center: 'text-[20px]', overlap: -4 }
};

// Helper function to generate pattern CSS
const getCardBackPattern = (pattern: string, color: string): React.CSSProperties => {
  const colorWithAlpha = color + '20';
  switch (pattern) {
    case 'grid':
      return { backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 3px, ${colorWithAlpha} 3px, ${colorWithAlpha} 4px), repeating-linear-gradient(90deg, transparent, transparent 3px, ${colorWithAlpha} 3px, ${colorWithAlpha} 4px)` };
    case 'diamonds':
      return { backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 3px, ${colorWithAlpha} 3px, ${colorWithAlpha} 4px), repeating-linear-gradient(-45deg, transparent, transparent 3px, ${colorWithAlpha} 3px, ${colorWithAlpha} 4px)` };
    case 'dots':
      return { backgroundImage: `radial-gradient(circle, ${colorWithAlpha} 1px, transparent 1px)`, backgroundSize: '5px 5px' };
    case 'diagonal':
      return { backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, ${colorWithAlpha} 2px, ${colorWithAlpha} 3px)` };
    case 'circles':
      return { backgroundImage: `radial-gradient(circle, transparent 2px, ${colorWithAlpha} 2px, ${colorWithAlpha} 3px, transparent 3px)`, backgroundSize: '8px 8px' };
    case 'waves':
      return { backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${colorWithAlpha} 2px, ${colorWithAlpha} 3px), repeating-linear-gradient(60deg, transparent, transparent 3px, ${colorWithAlpha} 3px, ${colorWithAlpha} 4px)` };
    default:
      return { backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 3px, ${colorWithAlpha} 3px, ${colorWithAlpha} 4px), repeating-linear-gradient(90deg, transparent, transparent 3px, ${colorWithAlpha} 3px, ${colorWithAlpha} 4px)` };
  }
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
  size?: 'xs' | 'sm' | 'showdown';
  delay?: number;
  isWinning?: boolean;
  isDimmed?: boolean;
  rotation?: number;
  cardBackColors?: { accent: string; pattern: string };
  useFourColor?: boolean;
}) {
  const cfg = SIZE_CONFIG[size] || SIZE_CONFIG['sm'];
  const rank = card?.[0] === 'T' ? '10' : card?.[0] || '?';
  const suitChar = (card?.[1]?.toLowerCase() || 's') as keyof typeof SUITS;
  const suitSource = useFourColor ? SUITS : SUITS_CLASSIC;
  const suitInfo = suitSource[suitChar] || suitSource['s'];
  
  const accentColor = cardBackColors?.accent || '#ff7a00';
  const patternType = cardBackColors?.pattern || 'grid';

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
          background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
          border: '1px solid #e5e7eb',
          boxShadow: isWinning 
            ? '0 0 12px rgba(251,191,36,0.6), 0 3px 8px rgba(0,0,0,0.3)' 
            : '0 3px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
          transformOrigin: 'bottom center'
        }}
      >
        {/* Pattern */}
        <div 
          className="absolute inset-0"
          style={getCardBackPattern(patternType, accentColor)}
        />
        
        {/* Border frame */}
        <div 
          className="absolute inset-0.5 rounded-[2px] pointer-events-none"
          style={{ border: `1px solid ${accentColor}30` }}
        />
        
        {/* Center S logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span 
            className="font-display font-black"
            style={{ 
              fontSize: cfg.w > 24 ? '0.7rem' : '0.5rem',
              color: accentColor,
              opacity: 0.5
            }}
          >
            S
          </span>
        </div>
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
      {/* TOP-LEFT corner - Rank left, Suit right (horizontal) */}
      <div className="absolute top-[2px] left-[2px] flex items-center gap-0.5 leading-none">
        <span 
          className={cn(cfg.rank, 'font-black leading-none')} 
          style={{ color: suitColor }}
        >
          {rank}
        </span>
        <span 
          className={cn(cfg.suit, 'leading-none')} 
          style={{ color: suitColor }}
        >
          {suitInfo.symbol}
        </span>
      </div>
      
      {/* CENTER - Large suit symbol */}
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
      
      {/* BOTTOM-RIGHT corner - Suit left, Rank right (horizontal, rotated 180°) */}
      <div className="absolute bottom-[2px] right-[2px] flex items-center gap-0.5 leading-none rotate-180">
        <span 
          className={cn(cfg.rank, 'font-black leading-none')}
          style={{ color: suitColor }}
        >
          {rank}
        </span>
        <span 
          className={cn(cfg.suit, 'leading-none')} 
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
  
  // Use showdown size for larger cards during showdown like in reference
  const actualSize = isShowdown ? 'showdown' : size;
  const cfg = SIZE_CONFIG[actualSize] || SIZE_CONFIG[size];
  
  // Cards must exist and have valid values for showdown display
  const hasValidCards = cards && cards.length >= 2 && cards.every(c => c && c !== 'XX' && c !== '??');
  const showCards = isShowdown && hasValidCards;
  const useFourColor = preferences.cardStyle === 'fourcolor';
  
  // Debug: log what we're rendering
  if (isShowdown) {
    console.log('[PPPokerCompactCards] Showdown render:', { 
      cards, 
      hasValidCards, 
      showCards, 
      handName, 
      isWinner 
    });
  }
  
  // For PLO4, show all 4 cards; for Hold'em show 2
  const cardCount = cards?.length || 2;
  const displayCards = showCards ? cards : Array(Math.min(cardCount, 4)).fill('XX');
  
  // Determine if cards should be on left or right based on player position
  // Cards should point TOWARDS the center of the table
  const isOnRightSide = position.x > 50;

  return (
    <>
      {/* Cards positioned TOWARDS CENTER - larger horizontal layout at showdown */}
      <div 
        className="absolute"
        style={{
          [isOnRightSide ? 'left' : 'right']: isShowdown ? -(cfg.w * displayCards.length + 8) : -(cfg.w * 2.5),
          top: isShowdown ? '-20%' : '5%',
          zIndex: 15,
          transform: isOnRightSide ? 'scaleX(-1)' : 'none'
        }}
      >
        {/* Cards container - horizontal row at showdown, fanned otherwise */}
        <div 
          className="relative flex"
          style={{ 
            flexDirection: isShowdown ? 'row' : 'column',
            gap: isShowdown ? 2 : 0
          }}
        >
          {displayCards.map((card, idx) => {
            // Determine if this card is part of winning hand
            const isCardWinning = winningCardIndices.includes(idx);
            // At showdown with winning cards specified, dim non-winning cards
            const isDimmed = isShowdown && winningCardIndices.length > 0 && !isCardWinning;
            
            // At showdown - horizontal row, no rotation. Otherwise - fanned
            const rotation = isShowdown ? 0 : (-5 + idx * (displayCards.length === 4 ? 8 : displayCards.length === 3 ? 10 : 12));
            
            return (
              <div 
                key={idx} 
                className={isShowdown ? '' : 'absolute'}
                style={isShowdown ? {
                  transform: isOnRightSide ? 'scaleX(-1)' : 'none'
                } : { 
                  left: idx * (cfg.w * 0.55),
                  top: 0,
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: 'bottom center',
                  zIndex: idx + 1
                }}
              >
                <MiniCard 
                  card={showCards ? card : 'XX'} 
                  faceDown={!showCards}
                  size={actualSize as any} 
                  delay={idx}
                  isWinning={isShowdown && isCardWinning && isWinner}
                  isDimmed={isDimmed}
                  rotation={0}
                  cardBackColors={{ accent: currentCardBack.accentColor, pattern: currentCardBack.pattern }}
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
