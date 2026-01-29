// PPPoker-style Compact Cards - Cards positioned BELOW avatar (fanned)
// Smaller cards for opponents, positioned like in PPPoker reference images

import React, { memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  handId?: string; // Unique hand identifier for animation reset
  dealDelay?: number; // Delay in ms before cards appear (for deal animation sync)
  animateDeal?: boolean; // Trigger deal animation (only true during preflop)
  showAfterDeal?: boolean; // Keep cards visible after deal animation (true during flop/turn/river)
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
  handName,
  isWinner = false,
  winningCardIndices = [],
  size = 'xs',
  position = { x: 50, y: 50 },
  handId,
  dealDelay = 0,
  animateDeal = false,
  showAfterDeal = false // Keep visible after preflop
}: PPPokerCompactCardsProps) {
  const { currentCardBack, preferences } = usePokerPreferences();

  // =====================================================
  // POKERSTARS-STYLE: STABLE VISIBILITY & ANIMATION GUARDS v2
  // =====================================================
  // CRITICAL FIX: Prevent animation re-trigger after first action.
  // Problem: after state_update, animateDeal can flicker back to true
  // Solution: Lock animation to handId + record that we animated IMMEDIATELY
  
  // 1) Stable handId - persists even if server briefly omits it
  const stableHandIdRef = useRef<string | undefined>(undefined);

  // 1b) Once we start dealing for a hand, we MUST NOT swap IDs mid-hand
  // (e.g. local -> server handId arriving late), otherwise refs reset and
  // the deal animation can replay after an action/state_update.
  const dealLockedHandIdRef = useRef<string | undefined>(undefined);
  
  // 2) Track which handId has ALREADY been animated - NEVER re-animate
  const animatedHandIdRef = useRef<string | undefined>(undefined);

  // 3) Track previous handId to detect new hand
  const prevHandIdRef = useRef<string | undefined>(undefined);
  
  // STEP 1: Detect new hand FIRST (before updating stableHandIdRef)
  const incomingHandId = handId;
  const previousStableHandId = stableHandIdRef.current;

  // Only reset refs when TRULY hidden (waiting phase, no active hand).
  // CRITICAL FIX: Do NOT reset during active gameplay - this was causing cards to disappear.
  // Only reset when we have NO handId (truly between hands).
  const isTrulyBetweenHands = !animateDeal && !showAfterDeal && !isShowdown && !incomingHandId;
  if (isTrulyBetweenHands) {
    stableHandIdRef.current = undefined;
    animatedHandIdRef.current = undefined;
    dealLockedHandIdRef.current = undefined;
    prevHandIdRef.current = undefined;
  }
  
  // New hand detection: only when NOT locked (pre-deal). If we're locked,
  // treat incoming handId changes as late server hydration, not a new hand.
  const isLocked = Boolean(dealLockedHandIdRef.current);
  const isNewHand =
    !isLocked &&
    incomingHandId &&
    previousStableHandId &&
    incomingHandId !== previousStableHandId;
  
  // STEP 2: Reset refs on new hand
  if (isNewHand) {
    animatedHandIdRef.current = undefined;
  }
  
  // STEP 3: Update stable handId (persist if server flickers to undefined)
  // BUT once deal started, freeze it to prevent re-animations.
  if (incomingHandId) {
    const canAdoptIncomingId = !stableHandIdRef.current || !dealLockedHandIdRef.current;
    if (canAdoptIncomingId) {
      stableHandIdRef.current = incomingHandId;
    }
  }
  const stableHandId = stableHandIdRef.current;
  
  // Track for next render
  prevHandIdRef.current = stableHandId;
  
  // STEP 4: Determine visibility
  // IMPORTANT: `showAfterDeal` is allowed ONLY after we have seen a real deal start
  // for this hand. This prevents the "flash" where cards appear statically before
  // the actual shuffle/deal animation begins.
  const hasSeenDealForThisHand =
    !!stableHandId && dealLockedHandIdRef.current === stableHandId;

  const wantVisible = animateDeal || (showAfterDeal && hasSeenDealForThisHand) || isShowdown;
  const shouldShow = wantVisible;
  
  // STEP 5: ANIMATION GUARD - THE FIX
  // Only animate if:
  // - animateDeal is true (preflop signal from parent)
  // - stableHandId exists
  // - This EXACT handId was NOT already animated
  // - Not in showdown
  const alreadyAnimatedThisHand = animatedHandIdRef.current === stableHandId;
  const shouldAnimate = animateDeal && 
                        !!stableHandId && 
                        !alreadyAnimatedThisHand && 
                        !isShowdown;

  // Lock this hand as soon as deal starts (even if animation is suppressed later).
  if (animateDeal && stableHandId && !dealLockedHandIdRef.current) {
    dealLockedHandIdRef.current = stableHandId;
  }
  
  // STEP 6: Mark as animated IMMEDIATELY (sync, before render)
  // This is the KEY fix - we mark BEFORE MiniCard renders with animate=true
  if (shouldAnimate && stableHandId) {
    animatedHandIdRef.current = stableHandId;
  }
  
  // Use showdown size for larger cards during showdown like in reference
  const actualSize = isShowdown ? 'showdown' : size;
  const cfg = SIZE_CONFIG[actualSize] || SIZE_CONFIG[size];
  
  // Cards must exist and look like real cards for showdown display
  const hasAnyCards = Array.isArray(cards) && cards.length >= 2;
  // At showdown, show cards if valid, otherwise show placeholder for unknown cards
  const showCards = isShowdown && hasAnyCards;
  const useFourColor = preferences.cardStyle === 'fourcolor';
  
  // For PLO4, show all 4 cards; for Hold'em show 2
  const cardCount = cards?.length || 2;
  // At showdown, display actual cards (even if some are '??')
  const displayCards = showCards ? cards : Array(Math.min(cardCount, 4)).fill('XX');

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

  // Animation key based on handId to reset animation on new hand
  const animationKey = stableHandId ?? handId ?? 'static';

  // =====================================================
  // CSS VISIBILITY INSTEAD OF UNMOUNT
  // =====================================================
  // CRITICAL: We render ALWAYS but hide with CSS.
  // This preserves refs across server state flickers.
  
  return (
    <div
      className="relative flex items-center"
      style={{
        visibility: shouldShow ? 'visible' : 'hidden',
        opacity: shouldShow ? 1 : 0,
        pointerEvents: shouldShow ? 'auto' : 'none',
        transition: 'opacity 0.15s ease-out'
      }}
    >
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
          // idx * 60ms = additional delay for second card (faster cadence)
          const cardDelayMs = dealDelay + (idx * 60);
          
          return (
            <div 
              key={`${animationKey}-${idx}`} 
              className="relative"
              style={{
                marginLeft: idx > 0 ? (isShowdown ? 2 : -cfg.w * 0.45) : 0,
                zIndex: idx + 1
              }}
            >
              <MiniCard 
                card={showCards ? card : 'XX'} 
                faceDown={!showCards}
                size={actualSize as any} 
                delayMs={cardDelayMs}
                isWinning={isShowdown && isCardWinning && isWinner}
                isDimmed={isDimmed}
                rotation={rotation}
                cardBackColors={{ accent: currentCardBack.accentColor, pattern: currentCardBack.pattern }}
                useFourColor={useFourColor}
                animate={shouldAnimate}
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
