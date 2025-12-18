// PPPoker-style Community Cards - Large cards with 4-color deck support
// Premium styling matching reference screenshots

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePokerPreferences } from '@/hooks/usePokerPreferences';

interface PPPokerCommunityCardsProps {
  cards: string[];
  phase: string;
  winningCards?: string[];
  winningCardIndices?: number[];  // Indices of community cards that are part of winning hand
}

// 4-color deck suits
const SUITS_FOURCOLOR = {
  h: { symbol: '♥', color: '#ef4444', bg: '#fef2f2' },   // Red hearts
  d: { symbol: '♦', color: '#3b82f6', bg: '#eff6ff' },   // Blue diamonds  
  c: { symbol: '♣', color: '#22c55e', bg: '#f0fdf4' },   // Green clubs
  s: { symbol: '♠', color: '#1e293b', bg: '#f8fafc' }    // Black spades
};

// Classic 2-color suits
const SUITS_CLASSIC = {
  h: { symbol: '♥', color: '#ef4444', bg: '#fef2f2' },
  d: { symbol: '♦', color: '#ef4444', bg: '#fef2f2' },
  c: { symbol: '♣', color: '#1e293b', bg: '#f8fafc' },
  s: { symbol: '♠', color: '#1e293b', bg: '#f8fafc' }
};

// Large community card component with showdown highlighting
const CommunityCard = memo(function CommunityCard({
  card,
  delay = 0,
  isWinning = false,
  isDimmed = false,
  useFourColor = true,
  animate = true,
}: {
  card: string;
  delay?: number;
  isWinning?: boolean;
  isDimmed?: boolean;
  useFourColor?: boolean;
  animate?: boolean;
}) {
  const rank = card?.[0] === 'T' ? '10' : card?.[0] || '?';
  const suitChar = (card?.[1]?.toLowerCase() || 's') as keyof typeof SUITS_FOURCOLOR;
  const suitInfo = useFourColor ? SUITS_FOURCOLOR[suitChar] : SUITS_CLASSIC[suitChar];

  // Dimmed cards have gray background, bright cards have white/colored background
  const bgStyle = isDimmed 
    ? 'linear-gradient(145deg, #4b5563 0%, #374151 50%, #4b5563 100%)'
    : `linear-gradient(145deg, ${suitInfo.bg} 0%, #ffffff 50%, ${suitInfo.bg} 100%)`;
  
  const suitColor = isDimmed ? '#9ca3af' : suitInfo.color;
  const borderStyle = isWinning 
    ? '3px solid #fbbf24' 
    : isDimmed 
      ? '2px solid #6b7280' 
      : '2px solid #d1d5db';

  const commonStyle: React.CSSProperties = {
    width: 56,
    height: 78,
    background: bgStyle,
    border: borderStyle,
    boxShadow: isWinning 
      ? '0 0 20px rgba(251,191,36,0.5), 0 6px 16px rgba(0,0,0,0.3)'
      : isDimmed
        ? '0 2px 8px rgba(0,0,0,0.3)'
        : '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
    opacity: isDimmed ? 0.85 : 1,
  };

  const Inner = (
    <>
      {/* TOP-LEFT corner - Rank left, Suit right (horizontal) */}
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
      
      {/* BOTTOM-RIGHT corner - Suit left, Rank right (horizontal, rotated 180°) */}
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
      
      {/* Glossy effect - only on bright cards */}
      {!isDimmed && (
        <div 
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{ 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 40%, rgba(0,0,0,0.03) 100%)' 
          }}
        />
      )}
      
      {/* Winning glow (static at showdown to avoid flicker) */}
      {isWinning && (
        animate ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 rounded-lg"
            style={{
              background: 'radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)'
            }}
          />
        ) : (
          <div
            className="absolute inset-0 rounded-lg"
            style={{
              background: 'radial-gradient(circle, rgba(251,191,36,0.35) 0%, transparent 70%)',
              opacity: 0.85,
            }}
          />
        )
      )}
    </>
  );

  if (!animate) {
    return (
      <div className="relative rounded-lg overflow-hidden" style={commonStyle}>
        {Inner}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: -60, opacity: 0, rotateX: 90 }}
      animate={{ y: 0, opacity: 1, rotateX: 0 }}
      exit={{ y: 20, opacity: 0 }}
      transition={{ 
        delay: delay * 0.12, 
        type: 'spring', 
        stiffness: 250, 
        damping: 20 
      }}
      className="relative rounded-lg overflow-hidden"
      style={commonStyle}
    >
      {Inner}
    </motion.div>
  );
});

export const PPPokerCommunityCards = memo(function PPPokerCommunityCards({ 
  cards, 
  phase,
  winningCards = [],
  winningCardIndices = []
}: PPPokerCommunityCardsProps) {
  const { preferences } = usePokerPreferences();
  const useFourColor = preferences.cardStyle === 'fourcolor';
  
  const visibleCount = phase === 'flop' ? 3 : phase === 'turn' ? 4 : (phase === 'river' || phase === 'showdown') ? 5 : 0;

  // Determine which cards are part of winning hand
  const isShowdown = phase === 'showdown';
  
  // Check if a card is winning - by index OR by card string
  const isCardWinning = (idx: number, card: string): boolean => {
    if (winningCardIndices.length > 0) {
      return winningCardIndices.includes(idx);
    }
    return winningCards.includes(card);
  };
  
  // Determine if we have any winning info to show dimming
  const hasWinningInfo = winningCardIndices.length > 0 || winningCards.length > 0;
  
  return (
    <div className="flex items-center justify-center gap-1.5">
      {[0, 1, 2, 3, 4].map((idx) => {
        const isVisible = idx < visibleCount;
        const card = cards[idx];
        const isWinning = isCardWinning(idx, card);
        // At showdown, cards not in winning hand are dimmed
        const isDimmed = isShowdown && hasWinningInfo && !isWinning;

        // IMPORTANT: at showdown we avoid AnimatePresence and animations to prevent flicker
        if (isShowdown) {
          return isVisible && card ? (
            <CommunityCard
              key={idx}
              card={card}
              delay={idx}
              isWinning={isWinning}
              isDimmed={isDimmed}
              useFourColor={useFourColor}
              animate={false}
            />
          ) : (
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
          <AnimatePresence key={idx} mode="wait">
            {isVisible && card ? (
              <CommunityCard
                card={card}
                delay={idx}
                isWinning={isWinning}
                isDimmed={isDimmed}
                useFourColor={useFourColor}
                animate={true}
              />
            ) : (
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
            )}
          </AnimatePresence>
        );
      })}
    </div>
  );
});

export default PPPokerCommunityCards;
