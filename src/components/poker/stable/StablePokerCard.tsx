import React, { memo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Suit configuration - PPPoker authentic colors
const SUITS = {
  h: { symbol: '♥', color: '#dc2626', name: 'hearts' },      // Red hearts
  d: { symbol: '♦', color: '#dc2626', name: 'diamonds' },    // Red diamonds (PPPoker style)
  c: { symbol: '♣', color: '#16a34a', name: 'clubs' },       // Green clubs (PPPoker style)
  s: { symbol: '♠', color: '#1e293b', name: 'spades' }       // Black spades
} as const;

type SuitKey = keyof typeof SUITS;

// PPPoker style card sizes - more prominent
const SIZE_CONFIG = {
  xs: { w: 32, h: 44, rank: 12, suit: 14 },
  sm: { w: 40, h: 56, rank: 15, suit: 18 },
  md: { w: 52, h: 72, rank: 18, suit: 22 },
  lg: { w: 68, h: 94, rank: 26, suit: 32 },
  xl: { w: 88, h: 120, rank: 32, suit: 40 }
} as const;

interface StablePokerCardProps {
  card: string;
  faceDown?: boolean;
  size?: keyof typeof SIZE_CONFIG;
  isWinning?: boolean;
  isHighlighted?: boolean;
  dealDelay?: number;
  className?: string;
}

// Memoized card back - SYNDIKATE brutal industrial style
const CardBack = memo(function CardBack({ size }: { size: keyof typeof SIZE_CONFIG }) {
  const config = SIZE_CONFIG[size];
  
  return (
    <div 
      className="absolute inset-0 rounded-lg overflow-hidden"
      style={{ width: config.w, height: config.h }}
    >
      {/* Base - dark industrial gradient */}
      <div 
        className="w-full h-full"
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 50%, #1a1a1a 100%)'
        }}
      >
        {/* Industrial grid pattern */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(255,122,0,0.1) 4px, rgba(255,122,0,0.1) 5px),
              repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,122,0,0.1) 4px, rgba(255,122,0,0.1) 5px)
            `
          }}
        />
        {/* Center S logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="font-display text-2xl font-black"
            style={{ 
              color: 'rgba(255, 122, 0, 0.4)',
              textShadow: '0 0 10px rgba(255, 122, 0, 0.3)'
            }}
          >
            S
          </div>
        </div>
        {/* Corner accents */}
        <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-orange-500/30" />
        <div className="absolute top-1 right-1 w-2 h-2 border-r border-t border-orange-500/30" />
        <div className="absolute bottom-1 left-1 w-2 h-2 border-l border-b border-orange-500/30" />
        <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-orange-500/30" />
      </div>
      {/* Orange neon edge glow */}
      <div 
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{ 
          boxShadow: 'inset 0 0 15px rgba(255, 122, 0, 0.15), 0 0 8px rgba(255, 122, 0, 0.2)'
        }}
      />
      {/* Subtle gloss */}
      <div 
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)' }}
      />
    </div>
  );
});

// Memoized card face - PPPoker authentic style
const CardFace = memo(function CardFace({ 
  rank, 
  suit, 
  size 
}: { 
  rank: string; 
  suit: SuitKey; 
  size: keyof typeof SIZE_CONFIG;
}) {
  const config = SIZE_CONFIG[size];
  const suitInfo = SUITS[suit] || SUITS.s;
  const displayRank = rank === 'T' ? '10' : rank;

  return (
    <div 
      className="absolute inset-0 rounded-lg overflow-hidden"
      style={{ 
        width: config.w, 
        height: config.h,
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.1)'
      }}
    >
      {/* Card border */}
      <div 
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{ border: '1px solid rgba(0,0,0,0.08)' }}
      />
      
      {/* Center - larger suit symbol */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span 
          className="font-black leading-none tracking-tight"
          style={{ fontSize: config.rank * 1.1, color: suitInfo.color }}
        >
          {displayRank}
        </span>
        <span 
          className="leading-none"
          style={{ fontSize: config.suit * 1.2, color: suitInfo.color }}
        >
          {suitInfo.symbol}
        </span>
      </div>

      {/* Top-left corner - Rank left, Suit right (horizontal) */}
      <div 
        className="absolute top-1 left-1.5 flex items-center gap-0.5 leading-none"
        style={{ color: suitInfo.color }}
      >
        <span className="font-bold" style={{ fontSize: config.rank * 0.55 }}>
          {displayRank}
        </span>
        <span style={{ fontSize: config.suit * 0.55 }}>
          {suitInfo.symbol}
        </span>
      </div>

      {/* Bottom-right corner - Suit left, Rank right (horizontal, rotated 180°) */}
      <div 
        className="absolute bottom-1 right-1.5 flex items-center gap-0.5 leading-none rotate-180"
        style={{ color: suitInfo.color }}
      >
        <span className="font-bold" style={{ fontSize: config.rank * 0.55 }}>
          {displayRank}
        </span>
        <span style={{ fontSize: config.suit * 0.55 }}>
          {suitInfo.symbol}
        </span>
      </div>

      {/* Subtle gloss effect */}
      <div 
        className="absolute inset-0 pointer-events-none rounded-lg"
        style={{ 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.02) 100%)'
        }}
      />
    </div>
  );
}, (prev, next) => prev.rank === next.rank && prev.suit === next.suit && prev.size === next.size);

// Main stable card component
export const StablePokerCard = memo(function StablePokerCard({
  card,
  faceDown = false,
  size = 'md',
  isWinning = false,
  isHighlighted = false,
  dealDelay = 0,
  className
}: StablePokerCardProps) {
  const config = SIZE_CONFIG[size];
  const [hasDealt, setHasDealt] = useState(false);
  const cardRef = useRef(card);
  
  // Parse card string (e.g., "Ah" -> { rank: "A", suit: "h" })
  const rank = card?.[0] || '?';
  const suit = (card?.[1]?.toLowerCase() || 's') as SuitKey;
  const isUnknown = !card || card === '??' || faceDown;

  // Track if this is a new card being dealt
  useEffect(() => {
    if (card !== cardRef.current) {
      setHasDealt(false);
      cardRef.current = card;
    }
    const timer = setTimeout(() => setHasDealt(true), dealDelay * 100 + 50);
    return () => clearTimeout(timer);
  }, [card, dealDelay]);

  return (
    <motion.div
      className={cn('relative flex-shrink-0', className)}
      style={{ width: config.w, height: config.h }}
      initial={{ opacity: 0, y: -30, scale: 0.8, rotateY: 180 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        rotateY: isUnknown ? 180 : 0
      }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay: dealDelay * 0.12
      }}
      whileHover={{ y: -4, scale: 1.02 }}
    >
      {/* Shadow layer */}
      <div 
        className="absolute inset-0 rounded-lg"
        style={{
          boxShadow: isHighlighted 
            ? '0 0 20px rgba(251, 191, 36, 0.6)' 
            : isWinning 
              ? '0 0 25px rgba(34, 197, 94, 0.6)' 
              : '0 4px 12px rgba(0,0,0,0.2)'
        }}
      />

      {/* Card content */}
      <div 
        className="relative w-full h-full"
        style={{ 
          transformStyle: 'preserve-3d',
          transform: `rotateY(${isUnknown ? 180 : 0}deg)`,
          transition: 'transform 0.4s ease-out'
        }}
      >
        {/* Front face */}
        <div 
          className="absolute inset-0"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <CardFace rank={rank} suit={suit} size={size} />
        </div>

        {/* Back face */}
        <div 
          className="absolute inset-0"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <CardBack size={size} />
        </div>
      </div>

      {/* Winning glow animation */}
      {isWinning && (
        <motion.div
          className="absolute -inset-1 rounded-xl border-2 border-green-400 pointer-events-none"
          animate={{ 
            boxShadow: [
              '0 0 10px rgba(34, 197, 94, 0.4)',
              '0 0 25px rgba(34, 197, 94, 0.7)',
              '0 0 10px rgba(34, 197, 94, 0.4)'
            ]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Highlight ring */}
      {isHighlighted && !isWinning && (
        <div 
          className="absolute -inset-0.5 rounded-lg border-2 border-amber-400 pointer-events-none"
          style={{ boxShadow: '0 0 12px rgba(251, 191, 36, 0.5)' }}
        />
      )}
    </motion.div>
  );
}, (prev, next) => {
  return (
    prev.card === next.card &&
    prev.faceDown === next.faceDown &&
    prev.size === next.size &&
    prev.isWinning === next.isWinning &&
    prev.isHighlighted === next.isHighlighted &&
    prev.dealDelay === next.dealDelay
  );
});

export default StablePokerCard;
