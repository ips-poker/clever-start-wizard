import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PokerCardProps {
  card: string;
  hidden?: boolean;
  size?: 'sm' | 'md' | 'lg';
  index?: number;
  className?: string;
}

const SUITS: Record<string, { symbol: string; color: string }> = {
  's': { symbol: '♠', color: 'text-foreground' },
  'h': { symbol: '♥', color: 'text-red-500' },
  'd': { symbol: '♦', color: 'text-red-500' },
  'c': { symbol: '♣', color: 'text-foreground' },
};

const RANKS: Record<string, string> = {
  'A': 'A', 'K': 'K', 'Q': 'Q', 'J': 'J', 'T': '10',
  '9': '9', '8': '8', '7': '7', '6': '6', '5': '5',
  '4': '4', '3': '3', '2': '2'
};

export function PokerCard({ card, hidden = false, size = 'md', index = 0, className }: PokerCardProps) {
  const sizeClasses = {
    sm: 'w-8 h-12 text-xs',
    md: 'w-12 h-16 text-sm',
    lg: 'w-16 h-24 text-lg'
  };

  if (hidden || !card || card.length < 2) {
    return (
      <motion.div
        initial={{ rotateY: 180, scale: 0.8 }}
        animate={{ rotateY: 0, scale: 1 }}
        transition={{ 
          duration: 0.3, 
          delay: index * 0.1,
          type: 'spring',
          stiffness: 200
        }}
        className={cn(
          sizeClasses[size],
          'rounded-lg shadow-lg',
          'bg-gradient-to-br from-blue-600 to-blue-800',
          'border-2 border-blue-400/50',
          'flex items-center justify-center',
          className
        )}
      >
        <div className="w-3/4 h-3/4 rounded border border-blue-400/30 bg-blue-700/50" />
      </motion.div>
    );
  }

  const rank = card[0].toUpperCase();
  const suit = card[1].toLowerCase();
  const suitInfo = SUITS[suit] || { symbol: '?', color: 'text-muted-foreground' };
  const rankDisplay = RANKS[rank] || rank;

  return (
    <motion.div
      initial={{ rotateY: 180, scale: 0.8, opacity: 0 }}
      animate={{ rotateY: 0, scale: 1, opacity: 1 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.15,
        type: 'spring',
        stiffness: 150
      }}
      whileHover={{ y: -4, scale: 1.05 }}
      className={cn(
        sizeClasses[size],
        'rounded-lg shadow-lg cursor-pointer',
        'bg-gradient-to-br from-white to-gray-100',
        'border border-gray-300',
        'flex flex-col items-center justify-center gap-0.5',
        'relative overflow-hidden',
        className
      )}
    >
      {/* Rank and suit in corner */}
      <span className={cn('font-bold leading-none', suitInfo.color)}>
        {rankDisplay}
      </span>
      <span className={cn('leading-none', suitInfo.color, size === 'lg' ? 'text-2xl' : 'text-lg')}>
        {suitInfo.symbol}
      </span>
      
      {/* Decorative shine */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent pointer-events-none" />
    </motion.div>
  );
}

interface CardHandProps {
  cards: string[];
  hidden?: boolean;
  size?: 'sm' | 'md' | 'lg';
  overlap?: boolean;
  className?: string;
}

export function CardHand({ cards, hidden = false, size = 'md', overlap = true, className }: CardHandProps) {
  return (
    <div className={cn('flex', overlap ? '-space-x-3' : 'gap-1', className)}>
      {cards.map((card, index) => (
        <PokerCard 
          key={`${card}-${index}`} 
          card={card} 
          hidden={hidden}
          size={size}
          index={index}
        />
      ))}
    </div>
  );
}

interface CommunityCardsProps {
  cards: string[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CommunityCards({ cards, size = 'lg', className }: CommunityCardsProps) {
  // Pad to 5 cards for layout consistency
  const displayCards = [...cards];
  while (displayCards.length < 5) {
    displayCards.push('');
  }

  const sizeClasses = {
    sm: 'w-10 h-14',
    md: 'w-12 h-16',
    lg: 'w-16 h-24'
  };

  return (
    <div className={cn('flex gap-2 justify-center', size === 'sm' && 'gap-1', className)}>
      {displayCards.map((card, index) => (
        <div key={index} className="relative">
          {card ? (
            <PokerCard card={card} size={size} index={index} />
          ) : (
            <div className={cn(
              sizeClasses[size],
              'rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20'
            )} />
          )}
        </div>
      ))}
    </div>
  );
}
