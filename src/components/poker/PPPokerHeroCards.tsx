// PPPoker-style Hero Cards - Large cards positioned to the RIGHT of avatar
// Includes hand strength indicator

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

// Suit configuration
const SUITS = {
  h: { symbol: '♥', color: '#ef4444' },
  d: { symbol: '♦', color: '#3b82f6' },
  c: { symbol: '♣', color: '#22c55e' },
  s: { symbol: '♠', color: '#1e293b' }
};

const SUITS_CLASSIC = {
  h: { symbol: '♥', color: '#ef4444' },
  d: { symbol: '♦', color: '#ef4444' },
  c: { symbol: '♣', color: '#1e293b' },
  s: { symbol: '♠', color: '#1e293b' }
};

// Premium large card component
const HeroCard = memo(function HeroCard({
  card,
  delay = 0,
  isWinning = false,
  cardBackColors,
  useFourColor = false
}: {
  card: string;
  delay?: number;
  isWinning?: boolean;
  cardBackColors?: { primary: string; secondary: string };
  useFourColor?: boolean;
}) {
  const rank = card?.[0] === 'T' ? '10' : card?.[0] || '?';
  const suitChar = (card?.[1]?.toLowerCase() || 's') as keyof typeof SUITS;
  const suitInfo = useFourColor ? SUITS[suitChar] : SUITS_CLASSIC[suitChar];

  return (
    <motion.div
      initial={{ rotateY: 180, scale: 0.3, opacity: 0 }}
      animate={{ rotateY: 0, scale: 1, opacity: 1 }}
      transition={{ delay: delay * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
      className="rounded-lg shadow-xl relative flex flex-col"
      style={{
        width: 56,
        height: 78,
        background: 'linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%)',
        border: isWinning ? '3px solid #fbbf24' : '2px solid #e2e8f0',
        boxShadow: isWinning 
          ? '0 0 30px rgba(251,191,36,0.6), 0 8px 24px rgba(0,0,0,0.3)'
          : '0 8px 24px rgba(0,0,0,0.25)'
      }}
    >
      {/* Top-left corner */}
      <div className="absolute top-1 left-1.5 flex flex-col items-center leading-none">
        <span className="text-base font-bold" style={{ color: suitInfo.color }}>{rank}</span>
        <span className="text-sm" style={{ color: suitInfo.color }}>{suitInfo.symbol}</span>
      </div>
      
      {/* Center suit */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl" style={{ color: suitInfo.color, opacity: 0.15 }}>{suitInfo.symbol}</span>
      </div>
      
      {/* Bottom-right corner (rotated) */}
      <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180">
        <span className="text-base font-bold" style={{ color: suitInfo.color }}>{rank}</span>
        <span className="text-sm" style={{ color: suitInfo.color }}>{suitInfo.symbol}</span>
      </div>
      
      {/* Glossy effect */}
      <div className="absolute inset-0 pointer-events-none rounded-lg"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%)' }}
      />
    </motion.div>
  );
});

export const PPPokerHeroCards = memo(function PPPokerHeroCards({
  cards,
  communityCards = [],
  gamePhase,
  isWinner = false
}: PPPokerHeroCardsProps) {
  const { currentCardBack, preferences } = usePokerPreferences();
  const useFourColor = preferences.cardStyle === 'fourcolor';

  // Calculate hand strength
  const handName = useMemo(() => {
    if (cards.length >= 2 && communityCards.length >= 3) {
      return getHandStrengthName(cards, communityCards);
    }
    return undefined;
  }, [cards, communityCards]);

  if (!cards || cards.length < 2) return null;

  return (
    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 flex flex-col items-start gap-1 z-10">
      {/* Cards - slightly overlapped */}
      <div className="flex">
        {cards.map((card, idx) => (
          <div key={idx} style={{ marginLeft: idx > 0 ? '-12px' : 0 }}>
            <HeroCard 
              card={card} 
              delay={idx} 
              isWinning={gamePhase === 'showdown' && isWinner}
              cardBackColors={{ primary: currentCardBack.primaryColor, secondary: currentCardBack.secondaryColor }}
              useFourColor={useFourColor}
            />
          </div>
        ))}
      </div>
      
      {/* Hand strength badge */}
      {handName && (
        <motion.div
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shadow-lg",
            isWinner 
              ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black" 
              : "bg-black/85 text-emerald-400 border border-emerald-500/40"
          )}
        >
          {handName}
        </motion.div>
      )}
    </div>
  );
});

export default PPPokerHeroCards;
