import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface PokerCardProps {
  card: string;
  hidden?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  index?: number;
  winner?: boolean;
  folded?: boolean;
  revealed?: boolean;
  className?: string;
}

const SUITS: Record<string, { symbol: string; color: string }> = {
  's': { symbol: '♠', color: 'text-slate-900' },
  'h': { symbol: '♥', color: 'text-red-600' },
  'd': { symbol: '♦', color: 'text-red-600' },
  'c': { symbol: '♣', color: 'text-slate-900' },
};

const RANKS: Record<string, string> = {
  'A': 'A', 'K': 'K', 'Q': 'Q', 'J': 'J', 'T': '10',
  '9': '9', '8': '8', '7': '7', '6': '6', '5': '5',
  '4': '4', '3': '3', '2': '2',
  '14': 'A', '13': 'K', '12': 'Q', '11': 'J', '10': '10'
};

const SIZE_CLASSES = {
  xs: { card: 'w-7 h-10', rank: 'text-[8px]', suit: 'text-[7px]', center: 'text-lg' },
  sm: { card: 'w-10 h-14', rank: 'text-xs', suit: 'text-[10px]', center: 'text-2xl' },
  md: { card: 'w-14 h-20', rank: 'text-sm', suit: 'text-xs', center: 'text-3xl' },
  lg: { card: 'w-16 h-24', rank: 'text-base', suit: 'text-sm', center: 'text-4xl' },
  xl: { card: 'w-20 h-28', rank: 'text-lg', suit: 'text-base', center: 'text-5xl' }
};

export const PokerCard = memo(function PokerCard({ 
  card, 
  hidden = false, 
  size = 'md', 
  index = 0,
  winner = false,
  folded = false,
  revealed = false,
  className 
}: PokerCardProps) {
  const sizeClass = SIZE_CLASSES[size];

  // Card back
  if (hidden || !card || card.length < 2) {
    return (
      <motion.div
        initial={{ rotateY: 180, scale: 0.8, opacity: 0 }}
        animate={{ rotateY: 0, scale: 1, opacity: folded ? 0.4 : 1 }}
        transition={{ 
          duration: 0.3, 
          delay: index * 0.1,
          type: 'spring',
          stiffness: 200
        }}
        className={cn(
          sizeClass.card,
          'rounded-lg shadow-xl select-none',
          'bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900',
          'border-2 border-blue-500/50',
          'flex items-center justify-center',
          'relative overflow-hidden',
          folded && 'opacity-40',
          className
        )}
      >
        <div className="absolute inset-1 rounded border border-blue-400/30">
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 8px)`
          }} />
        </div>
        <span className="text-blue-400/40 text-lg">♠</span>
      </motion.div>
    );
  }

  // Parse card
  const rank = card.length > 2 ? card.slice(0, -1) : card[0].toUpperCase();
  const suit = card.slice(-1).toLowerCase();
  const suitInfo = SUITS[suit] || { symbol: '?', color: 'text-muted-foreground' };
  const rankDisplay = RANKS[rank] || rank;

  return (
    <motion.div
      initial={{ rotateY: revealed ? 180 : 0, scale: 0.8, opacity: 0 }}
      animate={{ 
        rotateY: 0, 
        scale: winner ? 1.1 : 1, 
        opacity: folded ? 0.4 : 1 
      }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.12,
        type: 'spring',
        stiffness: 150
      }}
      whileHover={{ y: -4, scale: 1.03 }}
      className={cn(
        sizeClass.card,
        'rounded-lg shadow-xl cursor-pointer select-none',
        'bg-gradient-to-br from-white via-gray-50 to-gray-100',
        'border border-gray-200',
        'relative overflow-hidden',
        winner && 'ring-2 ring-amber-400 ring-offset-2 ring-offset-black',
        folded && 'opacity-40 grayscale',
        className
      )}
      style={{
        boxShadow: winner 
          ? '0 0 20px rgba(251, 191, 36, 0.5), 0 6px 20px rgba(0,0,0,0.3)'
          : '0 6px 20px rgba(0,0,0,0.3)'
      }}
    >
      {/* Top left corner - horizontal */}
      <div className={cn(
        'absolute top-0.5 left-1 flex items-center gap-1 leading-none',
        suitInfo.color
      )}>
        <span className={cn(sizeClass.rank, "font-bold")}>{rankDisplay}</span>
        <span className={sizeClass.suit}>{suitInfo.symbol}</span>
      </div>

      {/* Center suit */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn(suitInfo.color, sizeClass.center, "opacity-25")}>
          {suitInfo.symbol}
        </span>
      </div>

      {/* Bottom right corner - horizontal (rotated 180°) */}
      <div className={cn(
        'absolute bottom-0.5 right-1 flex items-center gap-1 leading-none rotate-180',
        suitInfo.color
      )}>
        <span className={cn(sizeClass.rank, "font-bold")}>{rankDisplay}</span>
        <span className={sizeClass.suit}>{suitInfo.symbol}</span>
      </div>
      
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent pointer-events-none rounded-lg" />

      {/* Winner glow */}
      {winner && (
        <motion.div
          className="absolute inset-0 rounded-lg bg-amber-400/20"
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
});

interface CardHandProps {
  cards: string[];
  hidden?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  overlap?: boolean;
  winner?: boolean;
  folded?: boolean;
  className?: string;
}

export const CardHand = memo(function CardHand({ 
  cards, 
  hidden = false, 
  size = 'md', 
  overlap = true,
  winner = false,
  folded = false,
  className 
}: CardHandProps) {
  return (
    <div className={cn('flex', overlap ? '-space-x-3' : 'gap-1', className)}>
      {cards.map((card, index) => (
        <PokerCard 
          key={`${card}-${index}`} 
          card={card} 
          hidden={hidden}
          size={size}
          index={index}
          winner={winner}
          folded={folded}
          className={overlap ? `z-[${10 - index}]` : ''}
        />
      ))}
    </div>
  );
});

interface CommunityCardsProps {
  cards: string[];
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  winningCards?: string[];
  phase?: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  className?: string;
}

export const CommunityCards = memo(function CommunityCards({ 
  cards, 
  size = 'lg',
  winningCards = [],
  phase,
  className 
}: CommunityCardsProps) {
  const displayCards = [...cards];
  while (displayCards.length < 5) {
    displayCards.push('');
  }

  const sizeClass = SIZE_CLASSES[size];

  return (
    <div className={cn('flex gap-2 justify-center', size === 'sm' && 'gap-1', className)}>
      <AnimatePresence mode="popLayout">
        {displayCards.map((card, index) => (
          <motion.div 
            key={`community-${index}`}
            className="relative"
            layout
            initial={{ y: -20, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.8 }}
            transition={{ 
              delay: phase === 'flop' && index < 3 ? index * 0.15 : 
                     phase === 'turn' && index === 3 ? 0.2 :
                     phase === 'river' && index === 4 ? 0.2 : 
                     index * 0.1
            }}
          >
            {card ? (
              <PokerCard 
                card={card} 
                size={size} 
                index={0}
                winner={winningCards.includes(card)}
                revealed={true}
              />
            ) : (
              <div className={cn(
                sizeClass.card,
                'rounded-lg border-2 border-dashed border-white/20 bg-white/5 backdrop-blur-sm'
              )} />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});
