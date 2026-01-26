// PPPoker-style Compact Cards - Cards positioned BELOW avatar (fanned)
// Smaller cards for opponents, positioned like in PPPoker reference images

import React, { memo, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePokerPreferences } from '@/hooks/usePokerPreferences';

interface PPPokerCompactCardsProps {
  cards?: string[];
  faceDown?: boolean;
  isShowdown?: boolean;
  gamePhase?: string; // Used to hide cards after hand ends (e.g. waiting)
  handName?: string;
  isWinner?: boolean;
  winningCardIndices?: number[]; // Indices of cards that participate in winning hand
  size?: 'xs' | 'sm';
  position?: { x: number; y: number }; // Player position for determining card placement
  handId?: string; // Unique hand identifier for animation reset
  dealDelay?: number; // Delay in ms before cards appear (for deal animation sync)
  animateDeal?: boolean; // Master switch for deal animation (lets parent prevent triple triggers)
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

// Size configuration - PPPoker style cards (increased by 15%)
const SIZE_CONFIG = {
  xs: { w: 25, h: 37, rank: 'text-[10px]', suit: 'text-[9px]', center: 'text-[14px]', overlap: -7 },
  sm: { w: 32, h: 46, rank: 'text-[13px]', suit: 'text-[11px]', center: 'text-[18px]', overlap: -9 },
  // Showdown size - larger cards like in reference
  showdown: { w: 41, h: 60, rank: 'text-[15px]', suit: 'text-[14px]', center: 'text-[23px]', overlap: -5 }
};

// Helper function to generate pattern CSS
const getCardBackPattern = (pattern: string, color: string): React.CSSProperties => {
  const colorWithAlpha = color + '40';
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
// delay is in milliseconds - total delay before this card appears
const MiniCard = memo(function MiniCard({
  card,
  faceDown = false,
  size = 'xs',
  delayMs = 0, // Delay in milliseconds
  isWinning = false,
  isDimmed = false,
  rotation = 0,
  cardBackColors,
  useFourColor = false,
  animate = true
}: {
  card: string;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'showdown';
  delayMs?: number;
  isWinning?: boolean;
  isDimmed?: boolean;
  rotation?: number;
  cardBackColors?: { accent: string; pattern: string };
  useFourColor?: boolean;
  animate?: boolean;
}) {
  const cfg = SIZE_CONFIG[size] || SIZE_CONFIG['sm'];
  
  // Check if card is unknown/placeholder
  const trimmed = (card || '').trim();
  const isCardFormatOk = /^(10|[2-9TJQKA])[cdhs]$/i.test(trimmed);
  const isPlaceholder = !isCardFormatOk || trimmed === 'XX' || trimmed === '??' || !card;
  
  // If placeholder, render as face-down
  const shouldShowFaceDown = faceDown || isPlaceholder;
  
  // Parse card
  const rank = card?.[0] === 'T' ? '10' : (card?.[0] === '1' && card?.[1] === '0' ? '10' : card?.[0] || '?');
  const suitChar = (card?.slice(-1)?.toLowerCase() || 's') as keyof typeof SUITS;
  const suitInfo = useFourColor ? SUITS[suitChar] : SUITS_CLASSIC[suitChar];
  const suitColor = suitInfo?.color || '#1e293b';

  // Delay in seconds for framer-motion
  const delaySeconds = delayMs / 1000;

  // Face-down card (placeholder or hidden)
  if (shouldShowFaceDown) {
    const accentColor = cardBackColors?.accent || '#3b82f6';
    const patternType = cardBackColors?.pattern || 'grid';
    
    const commonStyle: React.CSSProperties = {
      width: cfg.w,
      height: cfg.h,
      background: '#ffffff',
      border: `1px solid ${accentColor}60`,
      boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
      transformOrigin: 'bottom center',
      transform: `rotate(${rotation}deg)`
    };

    const Inner = (
      <>
        {/* White base layer */}
        <div className="absolute inset-0 bg-white rounded-[3px]" />
        
        {/* Colored gradient overlay */}
        <div 
          className="absolute inset-0 rounded-[3px]"
          style={{ background: `linear-gradient(135deg, ${accentColor}25 0%, ${accentColor}10 50%, ${accentColor}20 100%)` }}
        />
        
        {/* Pattern */}
        <div 
          className="absolute inset-0 rounded-[3px]"
          style={getCardBackPattern(patternType, accentColor)}
        />
        {/* Border frame */}
        <div className="absolute inset-1 border rounded-sm" style={{ borderColor: `${accentColor}40` }} />
        {/* Center S logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span 
            style={{ 
              fontSize: cfg.w > 24 ? '0.7rem' : '0.5rem',
              color: accentColor,
              opacity: 0.6,
              fontWeight: 'bold'
            }}
          >
            S
          </span>
        </div>
      </>
    );

    if (!animate) {
      return (
        <div className="rounded-[4px] shadow-lg relative overflow-hidden" style={commonStyle}>
          {Inner}
        </div>
      );
    }

    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, rotate: rotation }}
        transition={{ delay: delaySeconds, type: 'spring', stiffness: 300, damping: 25 }}
        className="rounded-[4px] shadow-lg relative overflow-hidden"
        style={commonStyle}
      >
        {Inner}
      </motion.div>
    );
  }

  // PPPoker GOLD style for winning cards - static, no animation/pulse
  const GOLD_BORDER = '#f59e0b';  // Amber-500 gold
  const GOLD_GLOW = 'rgba(245,158,11,0.6)';
  
  const cardStyle: React.CSSProperties = {
    width: cfg.w,
    height: cfg.h,
    background: isDimmed 
      ? 'linear-gradient(145deg, #4b5563 0%, #374151 100%)'
      : 'linear-gradient(145deg, #ffffff 0%, #fafafa 50%, #f5f5f5 100%)',
    border: isWinning 
      ? `3px solid ${GOLD_BORDER}`  // GOLD border for winning cards
      : isDimmed 
        ? '1px solid #6b7280' 
        : '1px solid #e5e5e5',
    boxShadow: isWinning 
      ? `0 0 12px ${GOLD_GLOW}, 0 0 24px rgba(245,158,11,0.35), 0 3px 8px rgba(0,0,0,0.3)` // Soft static gold glow
      : '0 3px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.8)',
    transformOrigin: 'bottom center',
    transform: `rotate(${rotation}deg)`,
    opacity: isDimmed ? 0.6 : 1  // Stronger dimming for non-winning cards
  };

  // Winning cards - STATIC gold display, no animation
  if (isWinning) {
    return (
      <div
        className="rounded-[4px] shadow-lg relative"
        style={cardStyle}
      >
        {/* TOP-LEFT corner */}
        <div className="absolute top-[2px] left-[2px] flex items-center gap-0.5 leading-none">
          <span className={cn(cfg.rank, 'font-black leading-none')} style={{ color: suitColor }}>{rank}</span>
          <span className={cn(cfg.suit, 'leading-none')} style={{ color: suitColor }}>{suitInfo.symbol}</span>
        </div>
        
        {/* CENTER */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cfg.center} style={{ color: suitColor, opacity: 0.85 }}>{suitInfo.symbol}</span>
        </div>
        
        {/* BOTTOM-RIGHT corner */}
        <div className="absolute bottom-[2px] right-[2px] flex items-center gap-0.5 leading-none rotate-180">
          <span className={cn(cfg.rank, 'font-black leading-none')} style={{ color: suitColor }}>{rank}</span>
          <span className={cn(cfg.suit, 'leading-none')} style={{ color: suitColor }}>{suitInfo.symbol}</span>
        </div>
        
        {/* Glossy effect */}
        <div 
          className="absolute inset-0 pointer-events-none rounded-[3px]"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 35%, rgba(0,0,0,0.02) 100%)' }}
        />
        
        {/* Static gold inner glow */}
        <div 
          className="absolute inset-0 pointer-events-none rounded-[3px]"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)' }}
        />
      </div>
    );
  }

  if (!animate) {
    return (
      <div
        className="rounded-[4px] shadow-lg relative"
        style={{
          width: cfg.w,
          height: cfg.h,
          background: isDimmed 
            ? 'linear-gradient(145deg, #4b5563 0%, #374151 100%)'
            : 'linear-gradient(145deg, #ffffff 0%, #fafafa 50%, #f5f5f5 100%)',
          border: isDimmed ? '1px solid #6b7280' : '1px solid #e5e5e5',
          boxShadow: '0 3px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.8)',
          transform: `rotate(${rotation}deg)`,
          opacity: isDimmed ? 0.6 : 1
        }}
      >
        {/* TOP-LEFT */}
        <div className="absolute top-[2px] left-[2px] flex items-center gap-0.5 leading-none">
          <span className={cn(cfg.rank, 'font-black leading-none')} style={{ color: isDimmed ? '#9ca3af' : suitColor }}>{rank}</span>
          <span className={cn(cfg.suit, 'leading-none')} style={{ color: isDimmed ? '#9ca3af' : suitColor }}>{suitInfo.symbol}</span>
        </div>
        
        {/* CENTER */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cfg.center} style={{ color: isDimmed ? '#9ca3af' : suitColor, opacity: 0.85 }}>{suitInfo.symbol}</span>
        </div>
        
        {/* BOTTOM-RIGHT */}
        <div className="absolute bottom-[2px] right-[2px] flex items-center gap-0.5 leading-none rotate-180">
          <span className={cn(cfg.rank, 'font-black leading-none')} style={{ color: isDimmed ? '#9ca3af' : suitColor }}>{rank}</span>
          <span className={cn(cfg.suit, 'leading-none')} style={{ color: isDimmed ? '#9ca3af' : suitColor }}>{suitInfo.symbol}</span>
        </div>
        
        {/* Glossy effect */}
        <div 
          className="absolute inset-0 pointer-events-none rounded-[3px]"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 35%, rgba(0,0,0,0.02) 100%)' }}
        />
      </div>
    );
  }

  // Animated card
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, y: -20 }}
      animate={{ 
        scale: 1, 
        opacity: isDimmed ? 0.6 : 1, 
        y: 0,
        rotate: rotation 
      }}
      transition={{ 
        delay: delaySeconds, 
        type: 'spring', 
        stiffness: 300, 
        damping: 25 
      }}
      className="rounded-[4px] shadow-lg relative"
      style={{
        width: cfg.w,
        height: cfg.h,
        background: isDimmed 
          ? 'linear-gradient(145deg, #4b5563 0%, #374151 100%)'
          : 'linear-gradient(145deg, #ffffff 0%, #fafafa 50%, #f5f5f5 100%)',
        border: isDimmed ? '1px solid #6b7280' : '1px solid #e5e5e5',
        boxShadow: '0 3px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.8)',
        transformOrigin: 'bottom center'
      }}
    >
      {/* TOP-LEFT */}
      <div className="absolute top-[2px] left-[2px] flex items-center gap-0.5 leading-none">
        <span className={cn(cfg.rank, 'font-black leading-none')} style={{ color: isDimmed ? '#9ca3af' : suitColor }}>{rank}</span>
        <span className={cn(cfg.suit, 'leading-none')} style={{ color: isDimmed ? '#9ca3af' : suitColor }}>{suitInfo.symbol}</span>
      </div>
      
      {/* CENTER */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cfg.center} style={{ color: isDimmed ? '#9ca3af' : suitColor, opacity: 0.85 }}>{suitInfo.symbol}</span>
      </div>
      
      {/* BOTTOM-RIGHT */}
      <div className="absolute bottom-[2px] right-[2px] flex items-center gap-0.5 leading-none rotate-180">
        <span className={cn(cfg.rank, 'font-black leading-none')} style={{ color: isDimmed ? '#9ca3af' : suitColor }}>{rank}</span>
        <span className={cn(cfg.suit, 'leading-none')} style={{ color: isDimmed ? '#9ca3af' : suitColor }}>{suitInfo.symbol}</span>
      </div>
      
      {/* Glossy effect */}
      <div 
        className="absolute inset-0 pointer-events-none rounded-[3px]"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 35%, rgba(0,0,0,0.02) 100%)' }}
      />
    </motion.div>
  );
});

export const PPPokerCompactCards = memo(function PPPokerCompactCards({
  cards,
  faceDown = false,
  isShowdown = false,
  gamePhase,
  handName,
  isWinner = false,
  winningCardIndices = [],
  size = 'xs',
  position = { x: 50, y: 50 },
  handId,
  dealDelay = 0,
  animateDeal = true
}: PPPokerCompactCardsProps) {
  const { currentCardBack, preferences } = usePokerPreferences();

  /**
   * POKERSTARS-STYLE ANIMATION SYSTEM - CLEAN FIX V2
   * 
   * 1. Cards COMPLETELY HIDDEN until deal animation triggers
   * 2. Animation happens EXACTLY ONCE per handId (on first animateDeal=true in preflop)
   * 3. After animation, cards stay visible (static) until hand ends
   * 4. On showdown: if cards are revealed (not faceDown), show them; otherwise hide
   * 5. When new hand starts (new handId), reset visibility
   */

  // Track the current handId for this component instance
  const currentHandIdRef = useRef<string | undefined>(undefined);
  const hasAnimatedRef = useRef<boolean>(false);
  const isVisibleRef = useRef<boolean>(false);

  // Detect new hand - reset state
  if (handId && handId !== currentHandIdRef.current) {
    currentHandIdRef.current = handId;
    hasAnimatedRef.current = false;
    isVisibleRef.current = false;
  }

  // Hand finished / table idle: hide and fully reset (prevents old cards sticking around)
  // NOTE: FullscreenPokerTable uses "waiting" for idle; we also require no handId to avoid
  // hiding during transitional server states where pot/blinds can be present.
  if (gamePhase === 'waiting' && !handId) {
    currentHandIdRef.current = undefined;
    hasAnimatedRef.current = false;
    isVisibleRef.current = false;
    return null;
  }

  /**
   * ANIMATION TRIGGER LOGIC:
   * - animateDeal=true means parent says "it's preflop, do deal animation"
   * - We only animate ONCE per hand (hasAnimatedRef guards this)
   */
  const shouldAnimateNow = Boolean(
    animateDeal &&
    !isShowdown &&
    !hasAnimatedRef.current &&
    handId
  );

  // If we're animating now, mark as animated and visible
  if (shouldAnimateNow) {
    hasAnimatedRef.current = true;
    isVisibleRef.current = true;
  }

  // Once animated, stay visible (until new hand resets)
  const hasBeenDealt = hasAnimatedRef.current || isVisibleRef.current;

  /**
   * VISIBILITY LOGIC - CLEAN FIX V3:
   * 
   * Compact cards (fanned mini-cards on avatar) should ONLY show during active play:
   * - During preflop/flop/turn/river: show faceDown cards (card backs) if dealt
   * - On SHOWDOWN: HIDE compact cards entirely - showdown uses larger revealed cards overlay
   * - This prevents "double cards" on showdown (both compact AND showdown cards visible)
   */
  
  // On showdown, ALWAYS hide compact cards - showdown overlay handles card display
  if (isShowdown) {
    return null;
  }
  
  // During play: show only if dealt
  const shouldShowCards = hasBeenDealt;
  
  // Return nothing if cards shouldn't be shown
  if (!shouldShowCards) {
    return null;
  }
  
  // Use showdown size for larger cards during showdown like in reference
  const actualSize = isShowdown ? 'showdown' : size;
  const cfg = SIZE_CONFIG[actualSize] || SIZE_CONFIG[size];
  
  // Cards must exist and look like real cards for showdown display
  const hasAnyCards = Array.isArray(cards) && cards.length >= 2;
  const useFourColor = preferences.cardStyle === 'fourcolor';
  
  // For PLO4, show all 4 cards; for Hold'em show 2
  const cardCount = cards?.length || 2;
  // Display actual cards or placeholders
  const displayCards = hasAnyCards ? cards : Array(Math.min(cardCount, 4)).fill('XX');

  // Fan direction
  const getFanRotation = (idx: number, total: number) => {
    if (isShowdown) return 0;
    const baseAngle = total === 4 ? 8 : total === 3 ? 10 : 12;
    const halfTotal = (total - 1) / 2;
    return (idx - halfTotal) * baseAngle;
  };

  const getContainerRotation = () => {
    if (isShowdown) return 0;
    return 0;
  };

  return (
      <div className="relative flex items-center">
        {/* Cards container - fanned, rotated to point towards table */}
        <div 
          className="relative flex"
          style={{ 
            flexDirection: 'row',
            transform: `rotate(${getContainerRotation()}deg)`,
            transformOrigin: 'center center'
          }}
        >
          {displayCards.map((card, idx) => {
            // Determine if this card is part of winning hand
            const isCardWinning = winningCardIndices.includes(idx);
            // At showdown with winning cards specified, dim non-winning cards
            const isDimmed = isShowdown && winningCardIndices.length > 0 && !isCardWinning;
            
            // Fanned rotation when not showdown
            const rotation = getFanRotation(idx, displayCards.length);
            
            // POKERSTARS-STYLE: Sequential deal timing
            // dealDelay = base delay for this player (0ms, 120ms, 240ms from dealer)
            // idx * 80ms = additional delay for second card
            const cardDelayMs = dealDelay + (idx * 80);
            
            return (
              <div 
                key={idx}
                className="relative"
                style={{
                  marginLeft: idx > 0 ? (isShowdown ? 2 : -cfg.w * 0.45) : 0,
                  zIndex: idx + 1
                }}
              >
              <MiniCard 
                  card={isShowdown && hasAnyCards ? card : 'XX'} 
                  faceDown={!(isShowdown && hasAnyCards)}
                  size={actualSize as any} 
                  delayMs={cardDelayMs}
                  isWinning={isShowdown && isCardWinning && isWinner}
                  isDimmed={isDimmed}
                  rotation={rotation}
                  cardBackColors={{ accent: currentCardBack.accentColor, pattern: currentCardBack.pattern }}
                  useFourColor={useFourColor}
                  animate={shouldAnimateNow && !isShowdown}
                />
              </div>
            );
          })}
        </div>
        
        {/* Hand name badge at showdown */}
        {isShowdown && handName && (
          <div
            className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap z-30"
          >
            <span 
              className="text-[11px] font-bold"
              style={{
                color: '#22c55e',
                textShadow: '0 1px 4px rgba(0,0,0,0.8)'
              }}
            >
              {handName}
            </span>
          </div>
        )}
      </div>
  );
});

export default PPPokerCompactCards;
