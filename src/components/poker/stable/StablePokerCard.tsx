import React, { memo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Suit configuration - stable reference
const SUITS = {
  h: { symbol: '♥', color: '#ef4444', name: 'hearts' },
  d: { symbol: '♦', color: '#3b82f6', name: 'diamonds' },
  c: { symbol: '♣', color: '#22c55e', name: 'clubs' },
  s: { symbol: '♠', color: '#1f2937', name: 'spades' }
} as const;

type SuitKey = keyof typeof SUITS;

const SIZE_CONFIG = {
  xs: { w: 28, h: 40, rank: 10, suit: 12 },
  sm: { w: 36, h: 50, rank: 13, suit: 15 },
  md: { w: 48, h: 68, rank: 16, suit: 20 },
  lg: { w: 64, h: 90, rank: 22, suit: 28 },
  xl: { w: 80, h: 112, rank: 28, suit: 36 }
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

// Memoized card back - never re-renders
const CardBack = memo(function CardBack({ size }: { size: keyof typeof SIZE_CONFIG }) {
  const config = SIZE_CONFIG[size];
  
  return (
    <div 
      className="absolute inset-0 rounded-lg overflow-hidden"
      style={{ width: config.w, height: config.h }}
    >
      <div 
        className="w-full h-full"
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 50%, #1e40af 100%)'
        }}
      >
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 40 40">
          <defs>
            <pattern id="stableCardPattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#stableCardPattern)" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1/2 h-1/2 rounded-full border-2 border-white/20" />
        </div>
      </div>
      <div 
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)' }}
      />
    </div>
  );
});

// Memoized card face - only re-renders when card value changes
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
      className="absolute inset-0 rounded-lg overflow-hidden bg-white"
      style={{ 
        width: config.w, 
        height: config.h,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}
    >
      {/* Center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span 
          className="font-bold leading-none"
          style={{ fontSize: config.rank, color: suitInfo.color }}
        >
          {displayRank}
        </span>
        <span style={{ fontSize: config.suit, color: suitInfo.color }}>
          {suitInfo.symbol}
        </span>
      </div>

      {/* Top-left corner */}
      <div 
        className="absolute top-1 left-1.5 flex flex-col items-center leading-none"
        style={{ color: suitInfo.color }}
      >
        <span className="font-semibold" style={{ fontSize: config.rank * 0.5 }}>
          {displayRank}
        </span>
        <span style={{ fontSize: config.suit * 0.5 }}>
          {suitInfo.symbol}
        </span>
      </div>

      {/* Bottom-right corner */}
      <div 
        className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180"
        style={{ color: suitInfo.color }}
      >
        <span className="font-semibold" style={{ fontSize: config.rank * 0.5 }}>
          {displayRank}
        </span>
        <span style={{ fontSize: config.suit * 0.5 }}>
          {suitInfo.symbol}
        </span>
      </div>

      {/* Gloss */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 40%)' }}
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
