// PPPoker-style Hero Cards - Large cards positioned to the RIGHT of avatar
// Supports 2-4 cards (Hold'em and PLO4), includes hand strength indicator

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
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

// Premium large card component for hero with dimming support
const HeroCard = memo(function HeroCard({
  card,
  delay = 0,
  isWinning = false,
  isDimmed = false,
  useFourColor = true,
  cardCount = 2
}: {
  card: string;
  delay?: number;
  isWinning?: boolean;
  isDimmed?: boolean;
  useFourColor?: boolean;
  cardCount?: number;
}) {
  const rank = card?.[0] === 'T' ? '10' : card?.[0] || '?';
  const suitChar = (card?.[1]?.toLowerCase() || 's') as keyof typeof SUITS_FOURCOLOR;
  const suitInfo = useFourColor ? SUITS_FOURCOLOR[suitChar] : SUITS_CLASSIC[suitChar];
  
  // Card sizes - PPPoker style proportions
  const cardWidth = cardCount > 2 ? 48 : 56;
  const cardHeight = cardCount > 2 ? 68 : 80;
  const rankSize = cardCount > 2 ? 'text-lg' : 'text-xl';
  const suitSize = cardCount > 2 ? 'text-sm' : 'text-base';
  const centerSize = cardCount > 2 ? 'text-2xl' : 'text-3xl';

  // Colors for dimmed vs bright cards
  const cardBg = isDimmed 
    ? 'linear-gradient(145deg, #4b5563 0%, #374151 50%, #4b5563 100%)'
    : `linear-gradient(145deg, ${suitInfo.bg} 0%, #ffffff 50%, ${suitInfo.bg} 100%)`;
  const suitColor = isDimmed ? '#9ca3af' : suitInfo.color;
  const borderStyle = isWinning 
    ? '3px solid #fbbf24' 
    : isDimmed 
      ? '2px solid #6b7280' 
      : '2px solid #d1d5db';

  return (
    <motion.div
      initial={{ rotateY: 180, scale: 0.3, opacity: 0 }}
      animate={{ rotateY: 0, scale: 1, opacity: isDimmed ? 0.9 : 1 }}
      transition={{ delay: delay * 0.08, type: 'spring', stiffness: 250, damping: 22 }}
      className="rounded-lg shadow-xl relative flex flex-col"
      style={{
        width: cardWidth,
        height: cardHeight,
        background: cardBg,
        border: borderStyle,
        boxShadow: isWinning 
          ? '0 0 25px rgba(251,191,36,0.5), 0 6px 20px rgba(0,0,0,0.3)'
          : isDimmed
            ? '0 3px 10px rgba(0,0,0,0.3)'
            : '0 6px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.8)'
      }}
    >
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
      
      {/* CENTER - Large suit symbol (semi-transparent) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span 
          className={centerSize}
          style={{ 
            color: suitColor, 
            opacity: isDimmed ? 0.2 : 0.25,
            filter: isDimmed ? 'none' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
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
            background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 40%, rgba(0,0,0,0.02) 100%)' 
          }}
        />
      )}
      
      {/* Winning pulse */}
      {isWinning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="absolute inset-0 rounded-lg"
          style={{
            background: 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, transparent 70%)'
          }}
        />
      )}
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
  const useFourColor = preferences.cardStyle === 'fourcolor' || true; // Default 4-color

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
          // Determine if this card is part of winning hand
          const isCardWinning = winningCardIndices.includes(idx);
          // At showdown with winning cards specified, dim non-winning cards
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
              />
            </div>
          );
        })}
      </div>
      
      {/* Hand strength badge - PPPoker style (green text) */}
      {handName && (
        <motion.div
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
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
      )}
    </div>
  );
});

export default PPPokerHeroCards;
