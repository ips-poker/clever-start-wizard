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

const SUITS: Record<string, { symbol: string; color: string; bgColor: string }> = {
  's': { symbol: '♠', color: 'text-slate-900', bgColor: 'bg-white' },
  'h': { symbol: '♥', color: 'text-red-600', bgColor: 'bg-white' },
  'd': { symbol: '♦', color: 'text-red-600', bgColor: 'bg-white' },
  'c': { symbol: '♣', color: 'text-slate-900', bgColor: 'bg-white' },
};

const RANKS: Record<string, string> = {
  'A': 'A', 'K': 'K', 'Q': 'Q', 'J': 'J', 'T': '10',
  '9': '9', '8': '8', '7': '7', '6': '6', '5': '5',
  '4': '4', '3': '3', '2': '2'
};

export function PokerCard({ card, hidden = false, size = 'md', index = 0, className }: PokerCardProps) {
  const sizeClasses = {
    sm: 'w-10 h-14 text-sm',
    md: 'w-14 h-20 text-base',
    lg: 'w-16 h-24 text-lg'
  };

  const innerSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
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
          'rounded-lg shadow-xl',
          'bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900',
          'border-2 border-blue-500/50',
          'flex items-center justify-center',
          'relative overflow-hidden',
          className
        )}
      >
        {/* Card back pattern */}
        <div className="absolute inset-1 rounded border border-blue-400/30">
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 4px,
              rgba(255,255,255,0.1) 4px,
              rgba(255,255,255,0.1) 8px
            )`
          }} />
        </div>
        <div className="w-1/2 h-1/2 rounded-sm border border-blue-300/40 bg-blue-600/30" />
      </motion.div>
    );
  }

  const rank = card[0].toUpperCase();
  const suit = card[1].toLowerCase();
  const suitInfo = SUITS[suit] || { symbol: '?', color: 'text-muted-foreground', bgColor: 'bg-white' };
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
      whileHover={{ y: -6, scale: 1.05 }}
      className={cn(
        sizeClasses[size],
        'rounded-lg shadow-xl cursor-pointer',
        'bg-gradient-to-br from-white via-gray-50 to-gray-100',
        'border border-gray-200',
        'relative overflow-hidden',
        className
      )}
    >
      {/* Top left corner */}
      <div className={cn(
        'absolute top-1 left-1.5 flex flex-col items-center leading-none',
        suitInfo.color,
        innerSizes[size]
      )}>
        <span className="font-bold">{rankDisplay}</span>
        <span className={size === 'lg' ? 'text-base' : 'text-sm'}>{suitInfo.symbol}</span>
      </div>

      {/* Center suit */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn(
          suitInfo.color,
          size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-3xl' : 'text-2xl'
        )}>
          {suitInfo.symbol}
        </span>
      </div>

      {/* Bottom right corner (upside down) */}
      <div className={cn(
        'absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180',
        suitInfo.color,
        innerSizes[size]
      )}>
        <span className="font-bold">{rankDisplay}</span>
        <span className={size === 'lg' ? 'text-base' : 'text-sm'}>{suitInfo.symbol}</span>
      </div>
      
      {/* Decorative shine */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent pointer-events-none rounded-lg" />
      
      {/* Edge shadow */}
      <div className="absolute inset-0 rounded-lg shadow-inner pointer-events-none" />
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
    md: 'w-14 h-20',
    lg: 'w-16 h-24'
  };

  return (
    <div className={cn('flex gap-2 justify-center', size === 'sm' && 'gap-1', className)}>
      {displayCards.map((card, index) => (
        <motion.div 
          key={index} 
          className="relative"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          {card ? (
            <PokerCard card={card} size={size} index={index} />
          ) : (
            <div className={cn(
              sizeClasses[size],
              'rounded-lg border border-white/10 bg-black/20 backdrop-blur-sm'
            )} />
          )}
        </motion.div>
      ))}
    </div>
  );
}
