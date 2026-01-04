// PPPoker-style Hero Cards - Large cards positioned to the RIGHT of avatar
// Supports 2-4 cards (Hold'em and PLO4), includes hand strength indicator
// Professional grade animations with smooth deal effects

import React, { memo, useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePokerPreferences } from '@/hooks/usePokerPreferences';
import { getHandStrengthName } from '@/utils/handEvaluator';

interface PPPokerHeroCardsProps {
  cards: string[];
  communityCards?: string[];
  gamePhase: string;
  isWinner?: boolean;
  winningCardIndices?: number[]; // Indices of hole cards that participate in winning hand
}

// 4-color suit configuration (PPPoker default)
const SUITS_FOURCOLOR = {
  h: { symbol: '♥', color: '#ef4444', bg: '#fef2f2' },   // Red hearts
  d: { symbol: '♦', color: '#3b82f6', bg: '#eff6ff' },   // Blue diamonds  
  c: { symbol: '♣', color: '#22c55e', bg: '#f0fdf4' },   // Green clubs
  s: { symbol: '♠', color: '#1e293b', bg: '#f8fafc' }    // Black spades
};

const SUITS_CLASSIC = {
  h: { symbol: '♥', color: '#ef4444', bg: '#fef2f2' },
  d: { symbol: '♦', color: '#ef4444', bg: '#fef2f2' },
  c: { symbol: '♣', color: '#1e293b', bg: '#f8fafc' },
  s: { symbol: '♠', color: '#1e293b', bg: '#f8fafc' }
};

// Premium large card component for hero with professional animations
const HeroCard = memo(function HeroCard({
  card,
  delay = 0,
  isWinning = false,
  isDimmed = false,
  useFourColor = true,
  cardCount = 2,
  animate = true
}: {
  card: string;
  delay?: number;
  isWinning?: boolean;
  isDimmed?: boolean;
  useFourColor?: boolean;
  cardCount?: number;
  animate?: boolean;
}) {
  const [isFlipped, setIsFlipped] = useState(!animate);
  const [isDealt, setIsDealt] = useState(!animate);
  
  const rank = card?.[0] === 'T' ? '10' : card?.[0] || '?';
  const suitChar = (card?.[1]?.toLowerCase() || 's') as keyof typeof SUITS_FOURCOLOR;
  const suitInfo = useFourColor ? SUITS_FOURCOLOR[suitChar] : SUITS_CLASSIC[suitChar];
  
  // Card sizes - PPPoker style proportions
  const cardWidth = cardCount > 2 ? 48 : 56;
  const cardHeight = cardCount > 2 ? 68 : 80;
  const rankSize = cardCount > 2 ? 'text-lg' : 'text-xl';
  const suitSize = cardCount > 2 ? 'text-sm' : 'text-base';
  const centerSize = cardCount > 2 ? 'text-3xl' : 'text-4xl';

  // PPPoker GOLD style constants
  const GOLD_BORDER = '#f59e0b';
  const GOLD_GLOW = 'rgba(245,158,11,0.5)';

  // Animation delays
  const slideDelay = delay * 120;
  const flipDelay = slideDelay + 180;

  useEffect(() => {
    if (!animate) {
      setIsFlipped(true);
      setIsDealt(true);
      return;
    }

    const slideTimer = setTimeout(() => setIsDealt(true), slideDelay);
    const flipTimer = setTimeout(() => setIsFlipped(true), flipDelay);

    return () => {
      clearTimeout(slideTimer);
      clearTimeout(flipTimer);
    };
  }, [animate, slideDelay, flipDelay]);

  // Colors for dimmed vs bright cards
  const cardBg = isDimmed 
    ? 'linear-gradient(145deg, #4b5563 0%, #374151 50%, #4b5563 100%)'
    : `linear-gradient(145deg, ${suitInfo.bg} 0%, #ffffff 50%, ${suitInfo.bg} 100%)`;
  const suitColor = isDimmed ? '#9ca3af' : suitInfo.color;
  const borderStyle = isWinning 
    ? `3px solid ${GOLD_BORDER}` 
    : isDimmed 
      ? '2px solid #6b7280' 
      : '2px solid #d1d5db';

  const cardStyle: React.CSSProperties = {
    width: cardWidth,
    height: cardHeight,
    background: cardBg,
    border: borderStyle,
    boxShadow: isWinning 
      ? `0 0 16px ${GOLD_GLOW}, 0 0 28px rgba(245,158,11,0.3), 0 6px 20px rgba(0,0,0,0.3)`
      : isDimmed
        ? '0 3px 10px rgba(0,0,0,0.3)'
        : '0 6px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.8)',
    opacity: isDimmed ? 0.6 : 1,
  };

  // Card back style
  const cardBackStyle: React.CSSProperties = {
    width: cardWidth,
    height: cardHeight,
    background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1e3a5f 100%)',
    border: '2px solid #334155',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
  };

  const CardFaceContent = (
    <>
      {/* TOP-LEFT corner - Rank left, Suit right (horizontal) */}
      <div className="absolute top-1 left-1.5 flex items-center gap-1 leading-none">
        <span 
          className={cn(rankSize, 'font-black leading-none')} 
          style={{ 
            color: suitColor,
            textShadow: isDimmed ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          {rank}
        </span>
        <span 
          className={cn(suitSize, 'leading-none')} 
          style={{ color: suitColor }}
        >
          {suitInfo.symbol}
        </span>
      </div>
      
      {/* CENTER - Large suit symbol (professional semi-transparent) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span 
          className={centerSize}
          style={{ 
            color: suitColor, 
            opacity: isDimmed ? 0.15 : 0.2,
          }}
        >
          {suitInfo.symbol}
        </span>
      </div>
      
      {/* BOTTOM-RIGHT corner - Suit left, Rank right (horizontal, rotated 180°) */}
      <div className="absolute bottom-1 right-1.5 flex items-center gap-1 leading-none rotate-180">
        <span 
          className={cn(rankSize, 'font-black leading-none')} 
          style={{ 
            color: suitColor,
            textShadow: isDimmed ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          {rank}
        </span>
        <span 
          className={cn(suitSize, 'leading-none')} 
          style={{ color: suitColor }}
        >
          {suitInfo.symbol}
        </span>
      </div>
      
      {/* Glossy effect - only on bright cards */}
      {!isDimmed && (
        <div 
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{ 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 35%)' 
          }}
        />
      )}
      
      {/* Winning glow - static overlay */}
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

  // Card back content
  const CardBackContent = (
    <>
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
    </>
  );

  // No animation - static card
  if (!animate) {
    return (
      <div className="rounded-lg shadow-xl relative flex flex-col" style={cardStyle}>
        {CardFaceContent}
      </div>
    );
  }

  // Professional 3D flip animation
  return (
    <motion.div
      className="relative"
      style={{ 
        width: cardWidth, 
        height: cardHeight,
        perspective: 800 
      }}
      initial={{ 
        x: 80, 
        y: -40, 
        rotateZ: 15,
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
        delay: slideDelay / 1000,
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
          {CardBackContent}
        </div>

        {/* Card Front */}
        <div
          className="absolute inset-0 rounded-lg overflow-hidden"
          style={{
            ...cardStyle,
            backfaceVisibility: 'hidden',
          }}
        >
          {CardFaceContent}
        </div>
      </motion.div>
    </motion.div>
  );
});

export const PPPokerHeroCards = memo(function PPPokerHeroCards({
  cards,
  communityCards = [],
  gamePhase,
  isWinner = false,
  winningCardIndices = []
}: PPPokerHeroCardsProps) {
  const { preferences } = usePokerPreferences();
  const useFourColor = preferences.cardStyle === 'fourcolor';

  // Calculate hand strength
  const handName = useMemo(() => {
    if (cards.length >= 2 && communityCards.length >= 3) {
      return getHandStrengthName(cards, communityCards);
    }
    return undefined;
  }, [cards, communityCards]);

  if (!cards || cards.length < 2) return null;

  const cardCount = cards.length;
  const cardOverlap = cardCount > 2 ? -8 : -10;
  const isShowdown = gamePhase === 'showdown';

  return (
    <div className="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 flex flex-col items-start gap-0.5 z-10">
      {/* Cards row with overlap */}
      <div className="flex">
        {cards.map((card, idx) => {
          const isCardWinning = winningCardIndices.includes(idx);
          const isDimmed = isShowdown && winningCardIndices.length > 0 && !isCardWinning;
          
          return (
            <div 
              key={idx} 
              style={{ 
                marginLeft: idx > 0 ? cardOverlap : 0,
                zIndex: idx
              }}
            >
              <HeroCard 
                card={card} 
                delay={idx} 
                isWinning={isShowdown && isCardWinning && isWinner}
                isDimmed={isDimmed}
                useFourColor={useFourColor}
                cardCount={cardCount}
                animate={!isShowdown}
              />
            </div>
          );
        })}
      </div>
      
      {/* Hand strength badge - PPPoker style */}
      {handName && (
        isShowdown ? (
          <div
            className="mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap"
            style={{
              background: isWinner 
                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                : 'transparent',
              color: isWinner ? '#ffffff' : '#22c55e',
              boxShadow: isWinner ? '0 0 12px rgba(34,197,94,0.4)' : 'none',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)'
            }}
          >
            {handName}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap"
            style={{
              background: isWinner 
                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                : 'transparent',
              color: isWinner ? '#ffffff' : '#22c55e',
              boxShadow: isWinner ? '0 0 12px rgba(34,197,94,0.4)' : 'none',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)'
            }}
          >
            {handName}
          </motion.div>
        )
      )}
    </div>
  );
});

export default PPPokerHeroCards;
