/**
 * Professional Community Cards with PokerStars-style delayed animations
 * Cards start HIDDEN and only appear with animation when phase changes
 */
import React, { memo, useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
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

// Card face content
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
      
      {/* CENTER - Large suit symbol */}
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

// Static card - no animation
const StaticCard = memo(function StaticCard({
  card,
  isWinning = false,
  isDimmed = false,
  useFourColor = true
}: {
  card: string;
  isWinning?: boolean;
  isDimmed?: boolean;
  useFourColor?: boolean;
}) {
  const rank = card?.[0] === 'T' ? '10' : card?.[0] || '?';
  const suitChar = (card?.[1]?.toLowerCase() || 's') as keyof typeof SUITS_FOURCOLOR;
  const suitInfo = useFourColor ? SUITS_FOURCOLOR[suitChar] : SUITS_CLASSIC[suitChar];

  const GOLD_BORDER = '#f59e0b';
  const GOLD_GLOW = 'rgba(245,158,11,0.5)';

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

  return (
    <div className="relative rounded-lg overflow-hidden" style={cardStyle}>
      <CardFace rank={rank} suitInfo={suitInfo} suitColor={suitColor} isDimmed={isDimmed} isWinning={isWinning} />
    </div>
  );
});

// Animated card with flip
const AnimatedCard = memo(function AnimatedCard({
  card,
  index,
  phase,
  isWinning = false,
  isDimmed = false,
  useFourColor = true,
  delayMs = 0,
  onAnimationComplete
}: {
  card: string;
  index: number;
  phase: string;
  isWinning?: boolean;
  isDimmed?: boolean;
  useFourColor?: boolean;
  delayMs?: number;
  onAnimationComplete?: () => void;
}) {
  const [animState, setAnimState] = useState<'hidden' | 'dealing' | 'flipping' | 'done'>('hidden');
  
  const rank = card?.[0] === 'T' ? '10' : card?.[0] || '?';
  const suitChar = (card?.[1]?.toLowerCase() || 's') as keyof typeof SUITS_FOURCOLOR;
  const suitInfo = useFourColor ? SUITS_FOURCOLOR[suitChar] : SUITS_CLASSIC[suitChar];

  const GOLD_BORDER = '#f59e0b';
  const GOLD_GLOW = 'rgba(245,158,11,0.5)';

  // Start animation after delay
  useEffect(() => {
    const dealTimer = setTimeout(() => {
      setAnimState('dealing');
    }, delayMs);

    const flipTimer = setTimeout(() => {
      setAnimState('flipping');
    }, delayMs + 300);

    const doneTimer = setTimeout(() => {
      setAnimState('done');
      onAnimationComplete?.();
    }, delayMs + 550);

    return () => {
      clearTimeout(dealTimer);
      clearTimeout(flipTimer);
      clearTimeout(doneTimer);
    };
  }, [delayMs, onAnimationComplete]);

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

  // Hidden state - empty placeholder
  if (animState === 'hidden') {
    return (
      <div 
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

  // Animation complete - show static card
  if (animState === 'done') {
    return (
      <div className="relative rounded-lg overflow-hidden" style={cardStyle}>
        <CardFace rank={rank} suitInfo={suitInfo} suitColor={suitColor} isDimmed={isDimmed} isWinning={isWinning} />
      </div>
    );
  }

  const isFlipped = animState === 'flipping';

  return (
    <motion.div
      className="relative"
      style={{ 
        width: 52, 
        height: 72,
        perspective: 800
      }}
      initial={{ 
        x: phase === 'flop' ? -120 - (index * 15) : 80, 
        y: -50, 
        rotateZ: phase === 'flop' ? -8 + (index * 2) : 12,
        scale: 0.7,
        opacity: 0 
      }}
      animate={{
        x: 0,
        y: 0,
        rotateZ: 0,
        scale: 1,
        opacity: isDimmed ? 0.6 : 1,
      }}
      transition={{
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      {/* Card container with 3D flip */}
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 0 : 180 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
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
});

// Empty card placeholder
const EmptySlot = memo(function EmptySlot() {
  return (
    <div 
      className="rounded-lg border-2 border-dashed"
      style={{ 
        width: 52, 
        height: 72,
        borderColor: 'rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.1)'
      }}
    />
  );
});

export const ProfessionalCommunityCards = memo(function ProfessionalCommunityCards({ 
  cards, 
  phase,
  winningCardIndices = [],
  phaseTimings
}: ProfessionalCommunityCardsProps) {
  const { preferences } = usePokerPreferences();
  const useFourColor = preferences.cardStyle === 'fourcolor';
  
  // Track cards that have been "revealed" (animated or shown)
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  
  // Track phase to detect transitions
  const prevPhaseRef = useRef<string>(phase);
  const mountedPhaseRef = useRef<string>(phase);
  
  // Track which cards are currently animating
  const [animatingCards, setAnimatingCards] = useState<Set<number>>(new Set());
  
  // Determine visible card count based on phase
  const visibleCount = useMemo(() => {
    if (phase === 'preflop') return 0;
    if (phase === 'flop') return 3;
    if (phase === 'turn') return 4;
    if (phase === 'river' || phase === 'showdown') return 5;
    return 0;
  }, [phase]);

  // Get timing from server or use professional defaults
  const preDealDelay = phaseTimings?.preDealDelay ?? 200;
  const dealDelay = phaseTimings?.dealDelay ?? 100;

  // On mount: if we're past preflop, immediately reveal cards without animation
  useEffect(() => {
    const mountPhase = mountedPhaseRef.current;
    if (mountPhase !== 'preflop') {
      // Component mounted with cards already visible - no animation
      const initialRevealed = new Set<number>();
      if (mountPhase === 'flop') {
        [0, 1, 2].forEach(i => initialRevealed.add(i));
      } else if (mountPhase === 'turn') {
        [0, 1, 2, 3].forEach(i => initialRevealed.add(i));
      } else if (mountPhase === 'river' || mountPhase === 'showdown') {
        [0, 1, 2, 3, 4].forEach(i => initialRevealed.add(i));
      }
      setRevealedCards(initialRevealed);
    }
  }, []);

  // Detect phase transitions and trigger animations
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    
    if (phase !== prevPhase) {
      prevPhaseRef.current = phase;
      
      // Determine which cards are NEW in this phase
      let newCardIndices: number[] = [];
      
      if (phase === 'flop' && prevPhase === 'preflop') {
        newCardIndices = [0, 1, 2];
      } else if (phase === 'turn' && prevPhase === 'flop') {
        newCardIndices = [3];
      } else if (phase === 'river' && prevPhase === 'turn') {
        newCardIndices = [4];
      } else if (phase === 'showdown') {
        // Showdown - reveal any not-yet-revealed cards instantly
        const revealed = new Set(revealedCards);
        for (let i = 0; i < 5; i++) {
          revealed.add(i);
        }
        setRevealedCards(revealed);
        return;
      }
      
      if (newCardIndices.length > 0) {
        // Start animation for new cards
        setAnimatingCards(new Set(newCardIndices));
      }
    }
  }, [phase, revealedCards]);

  // Handle animation completion
  const handleAnimationComplete = (index: number) => {
    setRevealedCards(prev => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    setAnimatingCards(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const isShowdown = phase === 'showdown';
  const hasWinningInfo = winningCardIndices.length > 0;

  // Get visible cards
  const visibleCards = useMemo(() => cards.slice(0, visibleCount), [cards, visibleCount]);

  return (
    <div className="flex items-center justify-center gap-1.5">
      {[0, 1, 2, 3, 4].map((idx) => {
        const isVisible = idx < visibleCount;
        const card = visibleCards[idx];
        const isWinning = winningCardIndices.includes(idx);
        const isDimmed = isShowdown && hasWinningInfo && !isWinning;
        const isRevealed = revealedCards.has(idx);
        const isAnimating = animatingCards.has(idx);

        // Not visible yet - show empty slot
        if (!isVisible || !card) {
          return <EmptySlot key={`slot-${idx}`} />;
        }

        // Card is animating - show animated card
        if (isAnimating) {
          // Calculate delay within phase
          let delayMs = preDealDelay;
          if (phase === 'flop') {
            delayMs += idx * dealDelay;
          }
          
          return (
            <AnimatedCard
              key={`anim-${idx}-${card}`}
              card={card}
              index={idx}
              phase={phase}
              isWinning={isWinning}
              isDimmed={isDimmed}
              useFourColor={useFourColor}
              delayMs={delayMs}
              onAnimationComplete={() => handleAnimationComplete(idx)}
            />
          );
        }

        // Card is already revealed - show static card
        if (isRevealed) {
          return (
            <StaticCard
              key={`static-${idx}`}
              card={card}
              isWinning={isWinning}
              isDimmed={isDimmed}
              useFourColor={useFourColor}
            />
          );
        }

        // Card should be visible but hasn't been revealed yet
        // This happens when phase changed but animation hasn't started
        // Show empty slot to prevent flash
        return <EmptySlot key={`pending-${idx}`} />;
      })}
    </div>
  );
});

export default ProfessionalCommunityCards;
