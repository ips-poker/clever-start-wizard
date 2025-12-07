import React, { memo, useRef, useEffect } from 'react';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const SUITS = {
  h: { symbol: '♥', color: 'hsl(0, 84%, 60%)', name: 'hearts' },
  d: { symbol: '♦', color: 'hsl(217, 91%, 60%)', name: 'diamonds' },
  c: { symbol: '♣', color: 'hsl(142, 71%, 45%)', name: 'clubs' },
  s: { symbol: '♠', color: 'hsl(220, 13%, 18%)', name: 'spades' }
} as const;

interface PPPokerCardProps {
  card: string;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  delay?: number;
  isDealing?: boolean;
  isWinning?: boolean;
  isHighlighted?: boolean;
  flipOnReveal?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  xs: { w: 28, h: 40, rank: 10, suit: 12, corner: 0.5 },
  sm: { w: 36, h: 50, rank: 13, suit: 15, corner: 0.55 },
  md: { w: 48, h: 68, rank: 16, suit: 20, corner: 0.6 },
  lg: { w: 60, h: 84, rank: 20, suit: 26, corner: 0.6 },
  xl: { w: 72, h: 100, rank: 24, suit: 32, corner: 0.6 }
};

// Card back pattern SVG
const CardBackPattern = memo(function CardBackPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-md">
      <div 
        className="w-full h-full"
        style={{
          background: `
            linear-gradient(135deg, hsl(221, 83%, 53%) 0%, hsl(224, 76%, 48%) 50%, hsl(221, 83%, 53%) 100%)
          `
        }}
      >
        {/* Diamond pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 40 40">
          <defs>
            <pattern id="cardPattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="1.5" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cardPattern)" />
        </svg>
        {/* Center emblem */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1/2 h-1/2 rounded-full border-2 border-white/20 flex items-center justify-center">
            <div className="w-3/4 h-3/4 rounded-full border border-white/10" />
          </div>
        </div>
      </div>
      {/* Glossy effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)'
        }}
      />
    </div>
  );
});

// Card face component
const CardFace = memo(function CardFace({ 
  rank, 
  suit, 
  size 
}: { 
  rank: string; 
  suit: keyof typeof SUITS; 
  size: keyof typeof SIZE_CONFIG 
}) {
  const config = SIZE_CONFIG[size];
  const suitInfo = SUITS[suit] || SUITS.s;
  const displayRank = rank === 'T' ? '10' : rank;

  return (
    <div 
      className="absolute inset-0 rounded-md overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)'
      }}
    >
      {/* Main rank and suit */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span 
          className="font-bold leading-none"
          style={{ 
            fontSize: config.rank, 
            color: suitInfo.color,
            textShadow: '0 1px 0 rgba(0,0,0,0.1)'
          }}
        >
          {displayRank}
        </span>
        <span 
          className="leading-none"
          style={{ 
            fontSize: config.suit, 
            color: suitInfo.color 
          }}
        >
          {suitInfo.symbol}
        </span>
      </div>

      {/* Top-left corner */}
      <div 
        className="absolute flex flex-col items-center leading-none"
        style={{ 
          top: 2, 
          left: 3,
          color: suitInfo.color 
        }}
      >
        <span style={{ fontSize: config.rank * config.corner, fontWeight: 600 }}>
          {displayRank}
        </span>
        <span style={{ fontSize: config.suit * config.corner, marginTop: -1 }}>
          {suitInfo.symbol}
        </span>
      </div>

      {/* Bottom-right corner (rotated) */}
      <div 
        className="absolute flex flex-col items-center leading-none rotate-180"
        style={{ 
          bottom: 2, 
          right: 3,
          color: suitInfo.color 
        }}
      >
        <span style={{ fontSize: config.rank * config.corner, fontWeight: 600 }}>
          {displayRank}
        </span>
        <span style={{ fontSize: config.suit * config.corner, marginTop: -1 }}>
          {suitInfo.symbol}
        </span>
      </div>

      {/* Glossy overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 40%)'
        }}
      />
    </div>
  );
});

export const PPPokerCard = memo(function PPPokerCard({
  card,
  faceDown = false,
  size = 'md',
  delay = 0,
  isDealing = false,
  isWinning = false,
  isHighlighted = false,
  flipOnReveal = true,
  className
}: PPPokerCardProps) {
  const config = SIZE_CONFIG[size];
  const prevFaceDown = useRef(faceDown);
  const shouldFlip = flipOnReveal && prevFaceDown.current && !faceDown;

  useEffect(() => {
    prevFaceDown.current = faceDown;
  }, [faceDown]);

  // Parse card
  const rank = card?.[0] || '?';
  const suit = (card?.[1]?.toLowerCase() || 's') as keyof typeof SUITS;
  const isUnknown = !card || card === '??' || faceDown;

  // Spring animations for smooth movement
  const scale = useSpring(1, { stiffness: 300, damping: 20 });
  const rotateY = useSpring(isUnknown ? 180 : 0, { stiffness: 200, damping: 25 });

  useEffect(() => {
    if (shouldFlip) {
      rotateY.set(0);
    }
  }, [faceDown, shouldFlip, rotateY]);

  // Dealing animation variants
  const dealingVariants = {
    initial: {
      opacity: 0,
      scale: 0.3,
      x: 100,
      y: -200,
      rotateZ: -30
    },
    animate: {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      rotateZ: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 200,
        damping: 20,
        delay: delay * 0.15
      }
    }
  };

  // Winning glow animation
  const glowVariants = {
    initial: { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
    winning: {
      boxShadow: [
        '0 0 20px 5px rgba(251, 191, 36, 0.5)',
        '0 0 30px 10px rgba(251, 191, 36, 0.7)',
        '0 0 20px 5px rgba(251, 191, 36, 0.5)'
      ],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'easeInOut' as const
      }
    }
  };

  return (
    <motion.div
      className={cn(
        'relative flex-shrink-0 cursor-pointer select-none',
        isHighlighted && 'z-10',
        className
      )}
      style={{
        width: config.w,
        height: config.h,
        perspective: 1000
      }}
      variants={isDealing ? dealingVariants : undefined}
      initial={isDealing ? 'initial' : false}
      animate={isDealing ? 'animate' : undefined}
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          rotateY
        }}
        variants={glowVariants}
        initial="initial"
        animate={isWinning ? 'winning' : 'initial'}
      >
        {/* Card shadow */}
        <div 
          className="absolute inset-0 rounded-md"
          style={{
            transform: 'translateZ(-1px)',
            boxShadow: isHighlighted 
              ? '0 8px 24px rgba(0,0,0,0.3)' 
              : '0 4px 12px rgba(0,0,0,0.15)'
          }}
        />

        {/* Front face */}
        <motion.div
          className="absolute inset-0 rounded-md border border-gray-200"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)'
          }}
        >
          {!isUnknown && <CardFace rank={rank} suit={suit} size={size} />}
        </motion.div>

        {/* Back face */}
        <motion.div
          className="absolute inset-0 rounded-md border-2 border-blue-400"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <CardBackPattern />
        </motion.div>
      </motion.div>

      {/* Highlight ring */}
      <AnimatePresence>
        {isHighlighted && (
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1.05 }}
            exit={{ opacity: 0, scale: 1 }}
            className="absolute -inset-1 rounded-lg border-2 border-amber-400 pointer-events-none"
            style={{
              boxShadow: '0 0 12px rgba(251, 191, 36, 0.4)'
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default PPPokerCard;
