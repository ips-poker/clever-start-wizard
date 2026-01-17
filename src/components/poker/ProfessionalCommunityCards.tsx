/**
 * Professional Community Cards with PokerStars-style delayed animations
 * Uses phaseTimings from server for synchronized card reveals
 * Matches PPPokerHeroCards style with semi-transparent center suits
 * 
 * FIX: Cards now animate properly by using stable keys and tracking
 * which cards are "new" based on phase transitions, not card values.
 */
import React, { memo, useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePokerPreferences } from '@/hooks/usePokerPreferences';

// 4-color deck suits
const SUITS_FOURCOLOR = {
  h: { symbol: '♥', color: '#ef4444', bg: '#fef2f2' },
  d: { symbol: '♦', color: '#3b82f6', bg: '#eff6ff' },
  c: { symbol: '♣', color: '#22c55e', bg: '#f0fdf4' },
  s: { symbol: '♠', color: '#1e293b', bg: '#f8fafc' }
};

const SUITS_CLASSIC = {
  h: { symbol: '♥', color: '#ef4444', bg: '#fef2f2' },
  d: { symbol: '♦', color: '#ef4444', bg: '#fef2f2' },
  c: { symbol: '♣', color: '#1e293b', bg: '#f8fafc' },
  s: { symbol: '♠', color: '#1e293b', bg: '#f8fafc' }
};

interface PhaseTimings {
  dealDelay?: number;
  preDealDelay?: number;
  phase?: string;
}

interface ProfessionalCommunityCardsProps {
  cards: string[];
  phase: string;
  winningCardIndices?: number[];
  phaseTimings?: PhaseTimings | null;
}

// Card face content - matching HeroCards style with transparent center suit
const CardFace = memo(function CardFace({
  rank,
  suitInfo,
  suitColor,
  isDimmed,
  isWinning
}: {
  rank: string;
  suitInfo: { symbol: string; color: string; bg: string };
  suitColor: string;
  isDimmed: boolean;
  isWinning: boolean;
}) {
  return (
    <>
      {/* TOP-LEFT corner */}
      <div className="absolute top-1 left-1.5 flex items-center gap-0.5 leading-none">
        <span 
          className="text-lg font-black leading-none" 
          style={{ 
            color: suitColor,
            textShadow: isDimmed ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          {rank}
        </span>
        <span 
          className="text-sm leading-none" 
          style={{ color: suitColor }}
        >
          {suitInfo.symbol}
        </span>
      </div>
      
      {/* CENTER - Large suit symbol (semi-transparent like HeroCards) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span 
          className="text-2xl"
          style={{ 
            color: suitColor, 
            opacity: isDimmed ? 0.15 : 0.2,
          }}
        >
          {suitInfo.symbol}
        </span>
      </div>
      
      {/* BOTTOM-RIGHT corner */}
      <div className="absolute bottom-1 right-1.5 flex items-center gap-0.5 leading-none rotate-180">
        <span 
          className="text-lg font-black leading-none" 
          style={{ 
            color: suitColor,
            textShadow: isDimmed ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          {rank}
        </span>
        <span
          className="text-sm leading-none" 
          style={{ color: suitColor }}
        >
          {suitInfo.symbol}
        </span>
      </div>
      
      {/* Glossy effect */}
      {!isDimmed && (
        <div 
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{ 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 35%)' 
          }}
        />
      )}
      
      {/* Winning glow overlay */}
      {isWinning && (
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)',
          }}
        />
      )}
    </>
  );
});

// Professional card with 3D flip animation
const ProfessionalCard = memo(function ProfessionalCard({
  card,
  index,
  phase,
  isWinning = false,
  isDimmed = false,
  useFourColor = true,
  preDealDelay = 0,
  dealDelay = 150,
  animateIn = false
}: {
  card: string;
  index: number;
  phase: string;
  isWinning?: boolean;
  isDimmed?: boolean;
  useFourColor?: boolean;
  preDealDelay?: number;
  dealDelay?: number;
  animateIn?: boolean;
}) {
  // Animation states - start hidden if animateIn is true
  const [isDealt, setIsDealt] = useState(!animateIn);
  const [isFlipped, setIsFlipped] = useState(!animateIn);
  
  const rank = card?.[0] === 'T' ? '10' : card?.[0] || '?';
  const suitChar = (card?.[1]?.toLowerCase() || 's') as keyof typeof SUITS_FOURCOLOR;
  const suitInfo = useFourColor ? SUITS_FOURCOLOR[suitChar] : SUITS_CLASSIC[suitChar];

  const GOLD_BORDER = '#f59e0b';
  const GOLD_GLOW = 'rgba(245,158,11,0.5)';

  // Calculate individual card delay based on phase and index within phase
  const cardDelay = useMemo(() => {
    if (!animateIn) return 0;
    
    if (phase === 'flop') {
      // Flop: cards 0,1,2 - stagger by index
      return preDealDelay + (index * dealDelay);
    } else if (phase === 'turn') {
      // Turn: card 3
      return preDealDelay;
    } else if (phase === 'river') {
      // River: card 4
      return preDealDelay;
    }
    
    return 0;
  }, [animateIn, preDealDelay, dealDelay, index, phase]);

  // Animate new cards - trigger once when animateIn is true
  useEffect(() => {
    if (!animateIn) {
      setIsDealt(true);
      setIsFlipped(true);
      return;
    }

    // Start with hidden state
    setIsDealt(false);
    setIsFlipped(false);
    
    const slideTimer = setTimeout(() => {
      setIsDealt(true);
    }, cardDelay);

    const flipTimer = setTimeout(() => {
      setIsFlipped(true);
    }, cardDelay + 200);

    return () => {
      clearTimeout(slideTimer);
      clearTimeout(flipTimer);
    };
  }, [animateIn, cardDelay]);

  const bgStyle = isDimmed 
    ? 'linear-gradient(145deg, #4b5563 0%, #374151 50%, #4b5563 100%)'
    : `linear-gradient(145deg, ${suitInfo.bg} 0%, #ffffff 50%, ${suitInfo.bg} 100%)`;
  
  const suitColor = isDimmed ? '#9ca3af' : suitInfo.color;
  const borderStyle = isWinning 
    ? `3px solid ${GOLD_BORDER}` 
    : isDimmed 
      ? '2px solid #6b7280' 
      : '2px solid #d1d5db';

  const cardStyle: React.CSSProperties = {
    width: 52,
    height: 72,
    background: bgStyle,
    border: borderStyle,
    boxShadow: isWinning 
      ? `0 0 16px ${GOLD_GLOW}, 0 0 28px rgba(245,158,11,0.3), 0 6px 16px rgba(0,0,0,0.3)`
      : isDimmed
        ? '0 2px 8px rgba(0,0,0,0.3)'
        : '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
    opacity: isDimmed ? 0.6 : 1,
  };

  const cardBackStyle: React.CSSProperties = {
    width: 52,
    height: 72,
    background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1e3a5f 100%)',
    border: '2px solid #334155',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
  };

  // Static card - no animation (already dealt or showdown)
  if (!animateIn || phase === 'showdown') {
    return (
      <div className="relative rounded-lg overflow-hidden" style={cardStyle}>
        <CardFace rank={rank} suitInfo={suitInfo} suitColor={suitColor} isDimmed={isDimmed} isWinning={isWinning} />
      </div>
    );
  }

  // Animated card - slide in and flip
  return (
    <motion.div
      className="relative"
      style={{ 
        width: 52, 
        height: 72,
        perspective: 800,
        visibility: isDealt ? 'visible' : 'hidden'
      }}
      initial={{ 
        x: phase === 'flop' ? -150 - (index * 20) : 100, 
        y: -60, 
        rotateZ: phase === 'flop' ? -10 + (index * 3) : 15,
        scale: 0.6,
        opacity: 0 
      }}
      animate={isDealt ? {
        x: 0,
        y: 0,
        rotateZ: 0,
        scale: 1,
        opacity: isDimmed ? 0.6 : 1,
      } : undefined}
      transition={{
        duration: 0.35,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      {/* Card container with 3D flip */}
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 0 : 180 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Card Back */}
        <div
          className="absolute inset-0 rounded-lg overflow-hidden"
          style={{
            ...cardBackStyle,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div 
            className="absolute inset-1.5 rounded"
            style={{
              background: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 3px,
                rgba(255,255,255,0.03) 3px,
                rgba(255,255,255,0.03) 6px
              )`,
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl" style={{ color: 'rgba(255,255,255,0.12)' }}>♠</span>
          </div>
        </div>

        {/* Card Front */}
        <div
          className="absolute inset-0 rounded-lg overflow-hidden"
          style={{
            ...cardStyle,
            backfaceVisibility: 'hidden',
          }}
        >
          <CardFace rank={rank} suitInfo={suitInfo} suitColor={suitColor} isDimmed={isDimmed} isWinning={isWinning} />
        </div>
      </motion.div>
    </motion.div>
  );
}, (prev, next) => {
  // Custom comparison - only re-render when necessary
  return prev.card === next.card &&
    prev.index === next.index &&
    prev.phase === next.phase &&
    prev.isWinning === next.isWinning &&
    prev.isDimmed === next.isDimmed &&
    prev.useFourColor === next.useFourColor &&
    prev.animateIn === next.animateIn &&
    prev.preDealDelay === next.preDealDelay &&
    prev.dealDelay === next.dealDelay;
});

export const ProfessionalCommunityCards = memo(function ProfessionalCommunityCards({ 
  cards, 
  phase,
  winningCardIndices = [],
  phaseTimings
}: ProfessionalCommunityCardsProps) {
  const { preferences } = usePokerPreferences();
  const useFourColor = preferences.cardStyle === 'fourcolor';
  
  // Track phase transitions to detect new cards
  const prevPhaseRef = useRef<string>('preflop');
  const animationIdRef = useRef<number>(0);
  
  // Track which cards should animate based on phase transition
  const [animatingCards, setAnimatingCards] = useState<Set<number>>(new Set());
  
  // Determine visible card count based on phase
  const visibleCount = phase === 'flop' ? 3 : phase === 'turn' ? 4 : (phase === 'river' || phase === 'showdown') ? 5 : 0;
  
  // Get timing from server or use professional defaults
  const preDealDelay = phaseTimings?.preDealDelay ?? 
    (phase === 'flop' ? 400 : phase === 'turn' ? 300 : phase === 'river' ? 300 : 0);
  const dealDelay = phaseTimings?.dealDelay ?? 
    (phase === 'flop' ? 120 : 0);

  // Detect phase changes and trigger animation for new cards
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    
    // Only trigger animation on actual phase change
    if (phase !== prevPhase) {
      prevPhaseRef.current = phase;
      animationIdRef.current += 1;
      
      let newIndices: number[] = [];
      
      if (phase === 'flop' && prevPhase === 'preflop') {
        newIndices = [0, 1, 2];
      } else if (phase === 'turn' && prevPhase === 'flop') {
        newIndices = [3];
      } else if (phase === 'river' && prevPhase === 'turn') {
        newIndices = [4];
      }
      
      if (newIndices.length > 0) {
        setAnimatingCards(new Set(newIndices));
        
        // Clear animation flag after animation completes
        const animDuration = preDealDelay + (dealDelay * 3) + 600;
        const timerId = setTimeout(() => {
          setAnimatingCards(new Set());
        }, animDuration);
        
        return () => clearTimeout(timerId);
      }
    }
  }, [phase, preDealDelay, dealDelay]);

  const isShowdown = phase === 'showdown';
  const hasWinningInfo = winningCardIndices.length > 0;

  // Memoize visible cards to prevent unnecessary re-renders
  const visibleCards = useMemo(() => {
    return cards.slice(0, visibleCount);
  }, [cards, visibleCount]);

  return (
    <div className="flex items-center justify-center gap-1.5">
      {[0, 1, 2, 3, 4].map((idx) => {
        const isVisible = idx < visibleCount;
        const card = visibleCards[idx];
        const isWinning = winningCardIndices.includes(idx);
        const isDimmed = isShowdown && hasWinningInfo && !isWinning;
        const shouldAnimate = animatingCards.has(idx);

        if (!isVisible || !card) {
          return (
            <div 
              key={`empty-${idx}`}
              className="rounded-lg border-2 border-dashed"
              style={{ 
                width: 52, 
                height: 72,
                borderColor: 'rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.1)'
              }}
            />
          );
        }

        return (
          <ProfessionalCard
            key={`card-slot-${idx}`}
            card={card}
            index={idx}
            phase={phase}
            isWinning={isWinning}
            isDimmed={isDimmed}
            useFourColor={useFourColor}
            preDealDelay={preDealDelay}
            dealDelay={dealDelay}
            animateIn={shouldAnimate}
          />
        );
      })}
    </div>
  );
});

export default ProfessionalCommunityCards;
