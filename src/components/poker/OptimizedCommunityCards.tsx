import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MemoizedPokerCard } from './MemoizedPokerCard';

type GamePhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'waiting';

interface OptimizedCommunityCardsProps {
  cards: string[];
  phase?: GamePhase;
  winningCards?: string[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Placeholder card for empty slots
const CardPlaceholder = memo(function CardPlaceholder({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeStyles = {
    sm: 'w-8 h-11',
    md: 'w-11 h-16',
    lg: 'w-14 h-20',
  };

  return (
    <div className={cn(
      sizeStyles[size],
      'rounded-lg border-2 border-dashed border-white/15 bg-white/5 backdrop-blur-sm'
    )} />
  );
});

// Single community card wrapper with animation
const CommunityCardSlot = memo(function CommunityCardSlot({
  card,
  index,
  phase,
  isWinning,
  size
}: {
  card: string;
  index: number;
  phase: GamePhase;
  isWinning: boolean;
  size: 'sm' | 'md' | 'lg';
}) {
  // Calculate animation delay based on phase and card index
  const animationDelay = useMemo(() => {
    if (phase === 'flop' && index < 3) return index * 0.15;
    if (phase === 'turn' && index === 3) return 0.1;
    if (phase === 'river' && index === 4) return 0.1;
    return 0;
  }, [phase, index]);

  if (!card) {
    return <CardPlaceholder size={size} />;
  }

  return (
    <motion.div
      initial={{ y: -30, opacity: 0, scale: 0.8, rotateY: 180 }}
      animate={{ 
        y: 0, 
        opacity: 1, 
        scale: isWinning ? 1.05 : 1,
        rotateY: 0
      }}
      exit={{ y: 20, opacity: 0, scale: 0.9 }}
      transition={{ 
        delay: animationDelay,
        type: 'spring',
        stiffness: 200,
        damping: 20
      }}
      className={cn(
        'relative',
        isWinning && 'z-10'
      )}
    >
      <MemoizedPokerCard
        card={card}
        size={size}
        animate={false}
      />
      
      {/* Winner glow effect */}
      {isWinning && (
        <motion.div
          className="absolute inset-0 rounded-lg ring-2 ring-amber-400 ring-offset-1 ring-offset-transparent"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
});

export const OptimizedCommunityCards = memo(function OptimizedCommunityCards({
  cards,
  phase = 'preflop',
  winningCards = [],
  size = 'md',
  className
}: OptimizedCommunityCardsProps) {
  // Always display 5 card slots
  const displayCards = useMemo(() => {
    const result = [...cards];
    while (result.length < 5) {
      result.push('');
    }
    return result;
  }, [cards]);

  const winningSet = useMemo(() => new Set(winningCards), [winningCards]);

  // Calculate gap based on size
  const gapClass = size === 'sm' ? 'gap-1' : size === 'md' ? 'gap-1.5' : 'gap-2';

  return (
    <div className={cn('flex justify-center', gapClass, className)}>
      <AnimatePresence mode="popLayout">
        {displayCards.map((card, index) => (
          <CommunityCardSlot
            key={`community-${index}-${card || 'empty'}`}
            card={card}
            index={index}
            phase={phase}
            isWinning={card ? winningSet.has(card) : false}
            size={size}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});

// Hero cards component - the cards shown at the bottom for the current player
interface HeroCardsProps {
  cards: string[];
  showPeek?: boolean;
  handName?: string;
  size?: 'md' | 'lg';
  className?: string;
}

export const HeroCards = memo(function HeroCards({
  cards,
  showPeek = true,
  handName,
  size = 'lg',
  className
}: HeroCardsProps) {
  if (!cards || cards.length === 0) return null;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="flex gap-2">
        {cards.map((card, idx) => (
          <motion.div
            key={`hero-${card}-${idx}`}
            initial={{ y: 50, opacity: 0, rotateY: 180 }}
            animate={{ 
              y: 0, 
              opacity: 1, 
              rotateY: showPeek ? 0 : 180 
            }}
            transition={{ 
              delay: idx * 0.1,
              type: 'spring',
              stiffness: 200,
              damping: 20
            }}
            whileHover={{ y: -8, scale: 1.05 }}
            className="cursor-pointer"
          >
            <MemoizedPokerCard
              card={showPeek ? card : '??'}
              faceDown={!showPeek}
              size={size}
              animate={false}
            />
          </motion.div>
        ))}
      </div>
      
      {/* Hand strength indicator */}
      {handName && showPeek && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2"
        >
          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold shadow-lg">
            {handName}
          </div>
        </motion.div>
      )}
    </div>
  );
});
