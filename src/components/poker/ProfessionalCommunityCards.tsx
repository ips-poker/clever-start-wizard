/**
 * Professional Community Cards with PokerStars-style delayed animations
 * Uses phaseTimings from server for synchronized card reveals
 * Matches PPPokerHeroCards style with semi-transparent center suits
 */
import React, { memo, useState, useEffect, useRef } from 'react';
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
          className="text-4xl"
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
  isNewCard = false
}: {
  card: string;
  index: number;
  phase: string;
  isWinning?: boolean;
  isDimmed?: boolean;
  useFourColor?: boolean;
  preDealDelay?: number;
  dealDelay?: number;
  isNewCard?: boolean;
}) {
  const [isFlipped, setIsFlipped] = useState(!isNewCard);
  const [isDealt, setIsDealt] = useState(!isNewCard);
  
  const rank = card?.[0] === 'T' ? '10' : card?.[0] || '?';
  const suitChar = (card?.[1]?.toLowerCase() || 's') as keyof typeof SUITS_FOURCOLOR;
  const suitInfo = useFourColor ? SUITS_FOURCOLOR[suitChar] : SUITS_CLASSIC[suitChar];

  const GOLD_BORDER = '#f59e0b';
  const GOLD_GLOW = 'rgba(245,158,11,0.5)';

  // Calculate individual card delay based on phase
  const getCardDelay = () => {
    if (!isNewCard) return 0;
    
    const baseDelay = preDealDelay;
    
    if (phase === 'flop') {
      return baseDelay + (index * dealDelay);
    } else if (phase === 'turn') {
      return baseDelay;
    } else if (phase === 'river') {
      return baseDelay;
    }
    
    return 0;
  };

  // Animate new cards
  useEffect(() => {
    if (!isNewCard) {
      setIsFlipped(true);
      setIsDealt(true);
      return;
    }

    const cardDelay = getCardDelay();
    
    const slideTimer = setTimeout(() => {
      setIsDealt(true);
    }, cardDelay);

    const flipTimer = setTimeout(() => {
      setIsFlipped(true);
    }, cardDelay + 180);

    return () => {
      clearTimeout(slideTimer);
      clearTimeout(flipTimer);
    };
  }, [isNewCard, preDealDelay, dealDelay, index, phase]);

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

  // Static card (already dealt)
  if (!isNewCard || phase === 'showdown') {
    return (
      <div className="relative rounded-lg overflow-hidden" style={cardStyle}>
        <CardFace rank={rank} suitInfo={suitInfo} suitColor={suitColor} isDimmed={isDimmed} isWinning={isWinning} />
      </div>
    );
  }

  // Animated new card
  const cardDelay = getCardDelay();

  return (
    <motion.div
      className="relative"
      style={{ 
        width: 52, 
        height: 72,
        perspective: 800 
      }}
      initial={{ 
        x: phase === 'flop' ? -150 - (index * 20) : 100, 
        y: -60, 
        rotateZ: phase === 'flop' ? -10 + (index * 3) : 15,
        scale: 0.6,
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
        duration: 0.35,
        delay: cardDelay / 1000,
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
  const prevPhaseRef = useRef(phase);
  const prevCardCountRef = useRef(0);
  const [newCardIndices, setNewCardIndices] = useState<Set<number>>(new Set());
  
  // Determine visible card count based on phase
  const visibleCount = phase === 'flop' ? 3 : phase === 'turn' ? 4 : (phase === 'river' || phase === 'showdown') ? 5 : 0;
  
  // Get timing from server or use professional defaults
  const preDealDelay = phaseTimings?.preDealDelay ?? 
    (phase === 'flop' ? 400 : phase === 'turn' ? 300 : phase === 'river' ? 300 : 0);
  const dealDelay = phaseTimings?.dealDelay ?? 
    (phase === 'flop' ? 120 : 0);

  // Detect phase changes and mark new cards
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    
    if (phase !== prevPhase) {
      prevPhaseRef.current = phase;
      
      if (phase === 'flop' && prevPhase !== 'flop') {
        setNewCardIndices(new Set([0, 1, 2]));
      } else if (phase === 'turn' && prevPhase === 'flop') {
        setNewCardIndices(new Set([3]));
      } else if (phase === 'river' && prevPhase === 'turn') {
        setNewCardIndices(new Set([4]));
      } else {
        setNewCardIndices(new Set());
      }
    }
    
    // Clear new card flags after animation completes
    if (newCardIndices.size > 0) {
      const totalAnimTime = preDealDelay + (dealDelay * 3) + 400;
      const timer = setTimeout(() => {
        setNewCardIndices(new Set());
      }, totalAnimTime);
      return () => clearTimeout(timer);
    }
    
    prevCardCountRef.current = visibleCount;
  }, [phase, visibleCount, preDealDelay, dealDelay, newCardIndices.size]);

  const isShowdown = phase === 'showdown';
  const hasWinningInfo = winningCardIndices.length > 0;

  return (
    <div className="flex items-center justify-center gap-1.5">
      {[0, 1, 2, 3, 4].map((idx) => {
        const isVisible = idx < visibleCount;
        const card = cards[idx];
        const isWinning = winningCardIndices.includes(idx);
        const isDimmed = isShowdown && hasWinningInfo && !isWinning;
        const isNewCard = newCardIndices.has(idx);

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
            key={`card-${idx}-${card}`}
            card={card}
            index={idx}
            phase={phase}
            isWinning={isWinning}
            isDimmed={isDimmed}
            useFourColor={useFourColor}
            preDealDelay={preDealDelay}
            dealDelay={dealDelay}
            isNewCard={isNewCard}
          />
        );
      })}
    </div>
  );
});

export default ProfessionalCommunityCards;
