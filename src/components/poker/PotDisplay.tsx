import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SmartChipDisplay } from './CasinoChip';

interface PotDisplayProps {
  mainPot: number;
  sidePots?: { amount: number; eligible: string[] }[];
  totalPot?: number;
  showChips?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PotDisplay: React.FC<PotDisplayProps> = ({
  mainPot,
  sidePots = [],
  totalPot,
  showChips = true,
  size = 'md',
  className
}) => {
  const total = totalPot || mainPot + sidePots.reduce((sum, pot) => sum + pot.amount, 0);

  const sizeStyles = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('flex flex-col items-center', className)}
    >
      {/* Chips visualization */}
      {showChips && total > 0 && (
        <div className="mb-2">
          <SmartChipDisplay amount={total} maxStacks={4} />
        </div>
      )}

      {/* Main pot */}
      <div
        className={cn(
          'px-6 py-2 rounded-full',
          'bg-black/70 backdrop-blur-sm',
          'border border-casino-gold/50',
          'shadow-[0_0_20px_rgba(255,215,0,0.2)]'
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={total}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
          >
            <span className="text-gray-400 font-roboto-condensed text-sm">POT</span>
            <span className={cn('text-casino-gold font-orbitron font-bold', sizeStyles[size])}>
              {total.toLocaleString()}
            </span>
            <span className="text-xl">💰</span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Side pots */}
      {sidePots.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 justify-center">
          {sidePots.map((pot, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="px-3 py-1 rounded-full bg-gray-800/80 border border-gray-600 text-sm"
            >
              <span className="text-gray-400">Side {index + 1}: </span>
              <span className="text-amber-400 font-orbitron">{pot.amount.toLocaleString()}</span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// Helper to convert suit/rank to card string
const toCardString = (suit: string, rank: string): string => {
  const suitMap: Record<string, string> = { hearts: 'h', diamonds: 'd', clubs: 'c', spades: 's' };
  return `${rank}${suitMap[suit] || 's'}`;
};

// Community cards display
interface CommunityCardsProps {
  cards: { suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'; rank: string }[];
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  className?: string;
}

export const CommunityCardsDisplay: React.FC<CommunityCardsProps> = ({
  cards,
  phase,
  className
}) => {
  // Dynamic import to avoid circular dependency
  const UltraRealisticCard = React.lazy(() => 
    import('./UltraRealisticCard').then(module => ({ default: module.UltraRealisticCard }))
  );

  const visibleCards = {
    preflop: 0,
    flop: 3,
    turn: 4,
    river: 5,
    showdown: 5
  };

  const cardsToShow = cards.slice(0, visibleCards[phase]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <React.Suspense fallback={<div className="flex gap-2">{[...Array(5)].map((_, i) => (
        <div key={i} className="w-16 h-24 rounded-lg bg-gray-700 animate-pulse" />
      ))}</div>}>
        {/* Card placeholders for undealt cards */}
        {[...Array(5)].map((_, index) => (
          <motion.div
            key={index}
            initial={{ rotateY: 180, opacity: 0 }}
            animate={{
              rotateY: index < cardsToShow.length ? 0 : 180,
              opacity: 1
            }}
            transition={{
              delay: index < cardsToShow.length ? index * 0.15 : 0,
              duration: 0.5,
              type: 'spring'
            }}
            style={{ perspective: 1000 }}
          >
            {index < cardsToShow.length ? (
              <UltraRealisticCard
                card={toCardString(cardsToShow[index].suit, cardsToShow[index].rank)}
                size="md"
              />
            ) : (
              <div
                className={cn(
                  'w-16 h-24 rounded-lg',
                  'bg-gradient-to-br from-gray-700 to-gray-800',
                  'border border-gray-600',
                  'flex items-center justify-center'
                )}
              >
                <div className="w-8 h-8 rounded-full border-2 border-gray-600 border-dashed" />
              </div>
            )}
          </motion.div>
        ))}
      </React.Suspense>
    </div>
  );
};

// Hand strength indicator
export const HandStrengthIndicator: React.FC<{
  handName: string;
  strength: number; // 0-100
  className?: string;
}> = ({ handName, strength, className }) => {
  const getStrengthColor = (s: number) => {
    if (s >= 80) return 'from-green-500 to-emerald-500';
    if (s >= 60) return 'from-blue-500 to-cyan-500';
    if (s >= 40) return 'from-yellow-500 to-amber-500';
    if (s >= 20) return 'from-orange-500 to-red-500';
    return 'from-red-600 to-red-800';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'px-4 py-2 rounded-lg',
        'bg-black/70 backdrop-blur-sm border border-gray-700',
        className
      )}
    >
      <div className="text-center mb-1">
        <span className="text-white font-roboto-condensed">{handName}</span>
      </div>
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${strength}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn('h-full rounded-full bg-gradient-to-r', getStrengthColor(strength))}
        />
      </div>
    </motion.div>
  );
};

export default PotDisplay;
