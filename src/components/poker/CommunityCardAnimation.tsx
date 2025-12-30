/**
 * Premium Community Card Animation
 * Professional-grade card dealing animations for Flop, Turn, River
 */

import React, { memo, useEffect, useState, useRef } from 'react';
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

interface AnimatedCardProps {
  card: string;
  index: number;
  phase: 'flop' | 'turn' | 'river' | 'showdown';
  isWinning?: boolean;
  isDimmed?: boolean;
  useFourColor?: boolean;
  onDealt?: () => void;
}

// Single animated card with premium effects
const AnimatedCard = memo(function AnimatedCard({
  card,
  index,
  phase,
  isWinning = false,
  isDimmed = false,
  useFourColor = true,
  onDealt
}: AnimatedCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDealt, setIsDealt] = useState(false);
  
  const rank = card?.[0] === 'T' ? '10' : card?.[0] || '?';
  const suitChar = (card?.[1]?.toLowerCase() || 's') as keyof typeof SUITS_FOURCOLOR;
  const suitInfo = useFourColor ? SUITS_FOURCOLOR[suitChar] : SUITS_CLASSIC[suitChar];

  const GOLD_BORDER = '#f59e0b';
  const GOLD_GLOW = 'rgba(245,158,11,0.5)';

  // Animation configuration based on phase
  const getAnimationConfig = () => {
    const baseDelay = phase === 'flop' ? index * 0.15 : 0;
    
    switch (phase) {
      case 'flop':
        return {
          initial: { 
            x: -200 - (index * 30), 
            y: -80, 
            rotateY: 180, 
            rotateZ: -15 + (index * 5),
            scale: 0.7,
            opacity: 0 
          },
          slideIn: {
            x: 0,
            y: 0,
            rotateZ: 0,
            scale: 1,
            opacity: 1,
            transition: {
              delay: baseDelay,
              duration: 0.4,
              ease: [0.25, 0.46, 0.45, 0.94]
            }
          },
          flip: {
            rotateY: 0,
            transition: {
              delay: baseDelay + 0.35,
              duration: 0.3,
              ease: "easeOut"
            }
          },
          bounce: {
            y: [0, -8, 0],
            transition: {
              delay: baseDelay + 0.55,
              duration: 0.25,
              ease: "easeOut"
            }
          }
        };
      case 'turn':
        return {
          initial: { 
            x: 150, 
            y: -100, 
            rotateY: 180, 
            rotateZ: 20,
            scale: 0.6,
            opacity: 0 
          },
          slideIn: {
            x: 0,
            y: 0,
            rotateZ: 0,
            scale: 1,
            opacity: 1,
            transition: {
              duration: 0.5,
              ease: [0.34, 1.56, 0.64, 1]
            }
          },
          flip: {
            rotateY: 0,
            transition: {
              delay: 0.4,
              duration: 0.35,
              ease: "easeOut"
            }
          },
          bounce: {
            y: [0, -12, 0],
            transition: {
              delay: 0.65,
              duration: 0.3,
              ease: "easeOut"
            }
          }
        };
      case 'river':
        return {
          initial: { 
            x: 180, 
            y: -120, 
            rotateY: 180, 
            rotateZ: -25,
            scale: 0.5,
            opacity: 0 
          },
          slideIn: {
            x: 0,
            y: 0,
            rotateZ: 0,
            scale: 1,
            opacity: 1,
            transition: {
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1]
            }
          },
          flip: {
            rotateY: 0,
            transition: {
              delay: 0.5,
              duration: 0.4,
              ease: "easeOut"
            }
          },
          bounce: {
            y: [0, -15, 0],
            transition: {
              delay: 0.8,
              duration: 0.35,
              ease: "easeOut"
            }
          }
        };
      default:
        return {
          initial: { opacity: 1 },
          slideIn: { opacity: 1, transition: { duration: 0 } },
          flip: { rotateY: 0, transition: { duration: 0 } },
          bounce: { y: 0, transition: { duration: 0 } }
        };
    }
  };

  const config = getAnimationConfig();

  useEffect(() => {
    if (phase === 'showdown') {
      setIsFlipped(true);
      setIsDealt(true);
      return;
    }

    const baseDelay = phase === 'flop' ? index * 150 : 0;
    
    // Flip after slide
    const flipTimer = setTimeout(() => {
      setIsFlipped(true);
    }, baseDelay + (phase === 'flop' ? 400 : phase === 'turn' ? 450 : 550));

    // Mark as dealt
    const dealtTimer = setTimeout(() => {
      setIsDealt(true);
      onDealt?.();
    }, baseDelay + (phase === 'flop' ? 700 : phase === 'turn' ? 800 : 950));

    return () => {
      clearTimeout(flipTimer);
      clearTimeout(dealtTimer);
    };
  }, [phase, index, onDealt]);

  const bgStyle = isDimmed 
    ? 'linear-gradient(145deg, #4b5563 0%, #374151 50%, #4b5563 100%)'
    : `linear-gradient(145deg, ${suitInfo.bg} 0%, #ffffff 50%, ${suitInfo.bg} 100%)`;
  
  const suitColor = isDimmed ? '#9ca3af' : suitInfo.color;
  const borderStyle = isWinning 
    ? `3px solid ${GOLD_BORDER}` 
    : isDimmed 
      ? '2px solid #6b7280' 
      : '2px solid #d1d5db';

  if (phase === 'showdown') {
    return (
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          width: 56,
          height: 78,
          background: bgStyle,
          border: borderStyle,
          boxShadow: isWinning 
            ? `0 0 16px ${GOLD_GLOW}, 0 0 28px rgba(245,158,11,0.3), 0 6px 16px rgba(0,0,0,0.3)`
            : isDimmed
              ? '0 2px 8px rgba(0,0,0,0.3)'
              : '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
          opacity: isDimmed ? 0.6 : 1,
        }}
      >
        <CardFace rank={rank} suitInfo={suitInfo} suitColor={suitColor} isDimmed={isDimmed} isWinning={isWinning} />
      </div>
    );
  }

  return (
    <motion.div
      className="relative"
      style={{ 
        width: 56, 
        height: 78,
        perspective: 1000 
      }}
      initial={config.initial}
      animate={{
        x: 0,
        y: isDealt ? 0 : 0,
        rotateZ: 0,
        scale: 1,
        opacity: 1,
      }}
      transition={{
        duration: phase === 'flop' ? 0.4 : phase === 'turn' ? 0.5 : 0.6,
        delay: phase === 'flop' ? index * 0.15 : 0,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      {/* Card container with 3D flip */}
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 0 : 180 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {/* Card Back */}
        <div
          className="absolute inset-0 rounded-lg overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1e3a5f 100%)',
            border: '2px solid #334155',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          {/* Card back pattern */}
          <div 
            className="absolute inset-2 rounded"
            style={{
              background: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 4px,
                rgba(255,255,255,0.05) 4px,
                rgba(255,255,255,0.05) 8px
              )`,
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          />
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{ color: 'rgba(255,255,255,0.15)' }}
          >
            <span className="text-3xl">♠</span>
          </div>
        </div>

        {/* Card Front */}
        <div
          className="absolute inset-0 rounded-lg overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            background: bgStyle,
            border: borderStyle,
            boxShadow: isWinning 
              ? `0 0 16px ${GOLD_GLOW}, 0 0 28px rgba(245,158,11,0.3), 0 6px 16px rgba(0,0,0,0.3)`
              : '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          <CardFace rank={rank} suitInfo={suitInfo} suitColor={suitColor} isDimmed={isDimmed} isWinning={isWinning} />
        </div>
      </motion.div>

      {/* Deal shimmer effect */}
      {!isDealt && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 0.4, delay: phase === 'flop' ? index * 0.15 + 0.2 : 0.3 }}
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          }}
        />
      )}

      {/* River dramatic glow */}
      {phase === 'river' && !isDealt && (
        <motion.div
          className="absolute -inset-4 rounded-xl pointer-events-none"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.5, 0], scale: [0.8, 1.2, 1] }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            background: 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, transparent 70%)',
          }}
        />
      )}
    </motion.div>
  );
});

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
      <div className="absolute top-1 left-1.5 flex items-center gap-1 leading-none">
        <span 
          className="text-xl font-black leading-none" 
          style={{ 
            color: suitColor,
            textShadow: isDimmed ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          {rank}
        </span>
        <span 
          className="text-lg leading-none" 
          style={{ color: suitColor }}
        >
          {suitInfo.symbol}
        </span>
      </div>
      
      {/* CENTER - Large suit symbol */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span 
          className="text-4xl"
          style={{ 
            color: suitColor, 
            opacity: isDimmed ? 0.5 : 0.9,
            filter: isDimmed ? 'none' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))'
          }}
        >
          {suitInfo.symbol}
        </span>
      </div>
      
      {/* BOTTOM-RIGHT corner */}
      <div className="absolute bottom-1 right-1.5 flex items-center gap-1 leading-none rotate-180">
        <span 
          className="text-xl font-black leading-none" 
          style={{ 
            color: suitColor,
            textShadow: isDimmed ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          {rank}
        </span>
        <span
          className="text-lg leading-none" 
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
            background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 40%, rgba(0,0,0,0.03) 100%)' 
          }}
        />
      )}
      
      {/* Winning glow overlay */}
      {isWinning && (
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background: 'radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)',
          }}
        />
      )}
    </>
  );
});

interface CommunityCardAnimationProps {
  cards: string[];
  phase: string;
  winningCards?: string[];
  winningCardIndices?: number[];
}

export const CommunityCardAnimation = memo(function CommunityCardAnimation({ 
  cards, 
  phase,
  winningCards = [],
  winningCardIndices = []
}: CommunityCardAnimationProps) {
  const { preferences } = usePokerPreferences();
  const useFourColor = preferences.cardStyle === 'fourcolor';
  const prevPhaseRef = useRef(phase);
  const [animatingCards, setAnimatingCards] = useState<Set<number>>(new Set());
  
  // Determine which cards to show based on phase
  const visibleCount = phase === 'flop' ? 3 : phase === 'turn' ? 4 : (phase === 'river' || phase === 'showdown') ? 5 : 0;

  // Track phase changes for new card animations
  useEffect(() => {
    if (prevPhaseRef.current !== phase) {
      if (phase === 'flop') {
        setAnimatingCards(new Set([0, 1, 2]));
      } else if (phase === 'turn') {
        setAnimatingCards(new Set([3]));
      } else if (phase === 'river') {
        setAnimatingCards(new Set([4]));
      }
      prevPhaseRef.current = phase;
    }
  }, [phase]);

  const isShowdown = phase === 'showdown';
  
  const isCardWinning = (idx: number, card: string): boolean => {
    if (winningCardIndices.length > 0) {
      return winningCardIndices.includes(idx);
    }
    return winningCards.includes(card);
  };
  
  const hasWinningInfo = winningCardIndices.length > 0 || winningCards.length > 0;

  const getCardPhase = (idx: number): 'flop' | 'turn' | 'river' | 'showdown' => {
    if (isShowdown) return 'showdown';
    if (idx < 3) return 'flop';
    if (idx === 3) return 'turn';
    return 'river';
  };

  return (
    <div className="flex items-center justify-center gap-1.5">
      {[0, 1, 2, 3, 4].map((idx) => {
        const isVisible = idx < visibleCount;
        const card = cards[idx];
        const isWinning = isCardWinning(idx, card);
        const isDimmed = isShowdown && hasWinningInfo && !isWinning;
        const cardPhase = getCardPhase(idx);
        const isAnimating = animatingCards.has(idx);

        if (!isVisible || !card) {
          return (
            <div 
              key={`empty-${idx}`}
              className="rounded-lg border-2 border-dashed"
              style={{ 
                width: 56, 
                height: 78,
                borderColor: 'rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.1)'
              }}
            />
          );
        }

        return (
          <AnimatedCard
            key={`card-${idx}-${card}`}
            card={card}
            index={idx < 3 ? idx : 0}
            phase={isAnimating ? cardPhase : 'showdown'}
            isWinning={isWinning}
            isDimmed={isDimmed}
            useFourColor={useFourColor}
            onDealt={() => {
              setAnimatingCards(prev => {
                const next = new Set(prev);
                next.delete(idx);
                return next;
              });
            }}
          />
        );
      })}
    </div>
  );
});

export default CommunityCardAnimation;