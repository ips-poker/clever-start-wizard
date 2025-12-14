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

// Premium large card component for hero
const HeroCard = memo(function HeroCard({
  card,
  delay = 0,
  isWinning = false,
  useFourColor = true,
  cardCount = 2
}: {
  card: string;
  delay?: number;
  isWinning?: boolean;
  useFourColor?: boolean;
  cardCount?: number;
}) {
  const rank = card?.[0] === 'T' ? '10' : card?.[0] || '?';
  const suitChar = (card?.[1]?.toLowerCase() || 's') as keyof typeof SUITS_FOURCOLOR;
  const suitInfo = useFourColor ? SUITS_FOURCOLOR[suitChar] : SUITS_CLASSIC[suitChar];
  
  // Adjust card size based on number of cards (smaller for PLO4)
  const cardWidth = cardCount > 2 ? 44 : 52;
  const cardHeight = cardCount > 2 ? 62 : 72;
  const rankSize = cardCount > 2 ? 'text-base' : 'text-lg';
  const suitSize = cardCount > 2 ? 'text-sm' : 'text-base';
  const centerSize = cardCount > 2 ? 'text-2xl' : 'text-3xl';

  return (
    <motion.div
      initial={{ rotateY: 180, scale: 0.3, opacity: 0 }}
      animate={{ rotateY: 0, scale: 1, opacity: 1 }}
      transition={{ delay: delay * 0.08, type: 'spring', stiffness: 250, damping: 22 }}
      className="rounded-lg shadow-xl relative flex flex-col"
      style={{
        width: cardWidth,
        height: cardHeight,
        background: `linear-gradient(145deg, ${suitInfo.bg} 0%, #ffffff 50%, ${suitInfo.bg} 100%)`,
        border: isWinning ? '3px solid #fbbf24' : '2px solid #d1d5db',
        boxShadow: isWinning 
          ? '0 0 25px rgba(251,191,36,0.5), 0 6px 20px rgba(0,0,0,0.3)'
          : '0 6px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.8)'
      }}
    >
      {/* Top-left corner */}
      <div className="absolute top-0.5 left-1 flex flex-col items-center leading-none">
        <span 
          className={cn(rankSize, 'font-black')} 
          style={{ 
            color: suitInfo.color,
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          {rank}
        </span>
        <span 
          className={cn(suitSize, '-mt-0.5')} 
          style={{ color: suitInfo.color }}
        >
          {suitInfo.symbol}
        </span>
      </div>
      
      {/* Center large suit */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span 
          className={centerSize}
          style={{ 
            color: suitInfo.color, 
            opacity: 0.9,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))'
          }}
        >
          {suitInfo.symbol}
        </span>
      </div>
      
      {/* Bottom-right corner (rotated) */}
      <div className="absolute bottom-0.5 right-1 flex flex-col items-center leading-none rotate-180">
        <span 
          className={cn(rankSize, 'font-black')} 
          style={{ 
            color: suitInfo.color,
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          {rank}
        </span>
        <span 
          className={cn(suitSize, '-mt-0.5')} 
          style={{ color: suitInfo.color }}
        >
          {suitInfo.symbol}
        </span>
      </div>
      
      {/* Glossy effect */}
      <div 
        className="absolute inset-0 pointer-events-none rounded-lg"
        style={{ 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 40%, rgba(0,0,0,0.02) 100%)' 
        }}
      />
      
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
  isWinner = false
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

  return (
    <div className="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 flex flex-col items-start gap-0.5 z-10">
      {/* Cards row with overlap */}
      <div className="flex">
        {cards.map((card, idx) => (
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
              isWinning={gamePhase === 'showdown' && isWinner}
              useFourColor={useFourColor}
              cardCount={cardCount}
            />
          </div>
        ))}
      </div>
      
      {/* Hand strength badge - PPPoker style */}
      {handName && (
        <motion.div
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className={cn(
            "mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap",
            isWinner 
              ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg" 
              : "bg-black/90 text-white border border-white/20"
          )}
          style={{
            boxShadow: isWinner 
              ? '0 0 12px rgba(251,191,36,0.5)' 
              : '0 2px 8px rgba(0,0,0,0.4)'
          }}
        >
          {handName}
        </motion.div>
      )}
    </div>
  );
});

export default PPPokerHeroCards;
