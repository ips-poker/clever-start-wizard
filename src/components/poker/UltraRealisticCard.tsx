// =====================================================
// ULTRA REALISTIC POKER CARD - Premium 3D Design
// =====================================================
// Features: 3D flip animation, holographic effects,
// realistic textures, dynamic lighting, wear effects

import React, { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';

// Premium suit configurations with rich colors
const SUITS = {
  h: { 
    symbol: '♥', 
    name: 'hearts', 
    primary: '#dc2626',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
    glow: 'rgba(220, 38, 38, 0.6)'
  },
  d: { 
    symbol: '♦', 
    name: 'diamonds', 
    primary: '#2563eb',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
    glow: 'rgba(37, 99, 235, 0.6)'
  },
  c: { 
    symbol: '♣', 
    name: 'clubs', 
    primary: '#15803d',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
    glow: 'rgba(21, 128, 61, 0.6)'
  },
  s: { 
    symbol: '♠', 
    name: 'spades', 
    primary: '#1e293b',
    gradient: 'linear-gradient(135deg, #334155 0%, #1e293b 50%, #0f172a 100%)',
    glow: 'rgba(30, 41, 59, 0.6)'
  }
} as const;

interface UltraRealisticCardProps {
  card: string;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  delay?: number;
  isDealing?: boolean;
  isWinning?: boolean;
  isHighlighted?: boolean;
  isFolded?: boolean;
  enable3D?: boolean;
  showHolographic?: boolean;
  className?: string;
  onClick?: () => void;
}

// Size configurations with premium dimensions
const SIZE_CONFIG = {
  xs: { w: 38, h: 54, rankSize: 14, suitSize: 16, cornerScale: 0.45, borderRadius: 4 },
  sm: { w: 50, h: 70, rankSize: 18, suitSize: 22, cornerScale: 0.5, borderRadius: 5 },
  md: { w: 64, h: 90, rankSize: 24, suitSize: 28, cornerScale: 0.55, borderRadius: 6 },
  lg: { w: 80, h: 112, rankSize: 30, suitSize: 36, cornerScale: 0.6, borderRadius: 8 },
  xl: { w: 100, h: 140, rankSize: 38, suitSize: 46, cornerScale: 0.65, borderRadius: 10 },
  hero: { w: 120, h: 168, rankSize: 48, suitSize: 56, cornerScale: 0.7, borderRadius: 12 }
};

// Premium card back pattern
const CardBackPattern = memo(function CardBackPattern({ size }: { size: keyof typeof SIZE_CONFIG }) {
  const config = SIZE_CONFIG[size];
  
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: config.borderRadius }}>
      {/* Base gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)'
        }}
      />
      
      {/* Diamond pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 140">
        <defs>
          <pattern id="diamond-pattern" patternUnits="userSpaceOnUse" width="20" height="20">
            <rect width="20" height="20" fill="transparent" />
            <polygon 
              points="10,0 20,10 10,20 0,10" 
              fill="none" 
              stroke="#d4af37" 
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100" height="140" fill="url(#diamond-pattern)" />
      </svg>
      
      {/* Ornate border */}
      <div 
        className="absolute inset-2"
        style={{
          border: '2px solid rgba(212, 175, 55, 0.4)',
          borderRadius: Math.max(config.borderRadius - 4, 2)
        }}
      />
      <div 
        className="absolute inset-3"
        style={{
          border: '1px solid rgba(212, 175, 55, 0.2)',
          borderRadius: Math.max(config.borderRadius - 6, 1)
        }}
      />
      
      {/* Center ornament */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className="relative"
          style={{
            width: config.w * 0.5,
            height: config.w * 0.5
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Spade emblem */}
            <g transform="translate(50, 50)">
              <path
                d="M 0 -35 
                   C -8 -28, -25 -15, -25 5 
                   C -25 18, -15 28, -5 28 
                   C -2 28, 0 26, 0 22 
                   C 0 26, 2 28, 5 28 
                   C 15 28, 25 18, 25 5 
                   C 25 -15, 8 -28, 0 -35 Z"
                fill="none"
                stroke="rgba(212, 175, 55, 0.5)"
                strokeWidth="1.5"
              />
              <path d="M 0 22 L -6 38 L 6 38 Z" 
                fill="none" 
                stroke="rgba(212, 175, 55, 0.5)" 
                strokeWidth="1.5"
              />
            </g>
          </svg>
        </div>
      </div>
      
      {/* Corner designs */}
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
        <div
          key={corner}
          className={cn(
            "absolute w-6 h-6",
            corner === 'top-left' && "top-1 left-1",
            corner === 'top-right' && "top-1 right-1 rotate-90",
            corner === 'bottom-left' && "bottom-1 left-1 -rotate-90",
            corner === 'bottom-right' && "bottom-1 right-1 rotate-180"
          )}
        >
          <svg viewBox="0 0 24 24" className="w-full h-full opacity-40">
            <path
              d="M2 12 L2 4 C2 3, 3 2, 4 2 L12 2"
              fill="none"
              stroke="#d4af37"
              strokeWidth="1"
            />
            <circle cx="4" cy="4" r="1.5" fill="#d4af37" />
          </svg>
        </div>
      ))}
      
      {/* Glossy overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(165deg, rgba(255,255,255,0.15) 0%, transparent 40%)',
          borderRadius: config.borderRadius
        }}
      />
    </div>
  );
});

// Premium card face
const CardFace = memo(function CardFace({ 
  rank, 
  suit, 
  size,
  isHighlighted
}: { 
  rank: string; 
  suit: keyof typeof SUITS; 
  size: keyof typeof SIZE_CONFIG;
  isHighlighted?: boolean;
}) {
  const config = SIZE_CONFIG[size];
  const suitInfo = SUITS[suit] || SUITS.s;
  const displayRank = rank === 'T' ? '10' : rank;
  const isFaceCard = ['J', 'Q', 'K'].includes(rank);

  return (
    <div 
      className="absolute inset-0 overflow-hidden"
      style={{ 
        borderRadius: config.borderRadius,
        background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 40%, #f1f3f5 100%)'
      }}
    >
      {/* Card texture */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(0,0,0,0.1) 0%, transparent 2%),
            radial-gradient(circle at 80% 70%, rgba(0,0,0,0.08) 0%, transparent 1.5%)
          `,
          backgroundSize: '6px 6px'
        }}
      />

      {/* Main rank and suit - center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
        <span 
          className="font-black leading-none tracking-tight"
          style={{ 
            fontSize: config.rankSize,
            background: suitInfo.gradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: isHighlighted ? `drop-shadow(0 0 8px ${suitInfo.glow})` : 'none'
          }}
        >
          {displayRank}
        </span>
        <span 
          className="leading-none"
          style={{ 
            fontSize: config.suitSize,
            color: suitInfo.primary,
            filter: isHighlighted ? `drop-shadow(0 0 6px ${suitInfo.glow})` : 'none',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          {suitInfo.symbol}
        </span>
      </div>

      {/* Top-left corner */}
      <div 
        className="absolute flex flex-col items-center leading-none"
        style={{ 
          top: 3, 
          left: 4,
          color: suitInfo.primary
        }}
      >
        <span 
          className="font-bold"
          style={{ fontSize: config.rankSize * config.cornerScale }}
        >
          {displayRank}
        </span>
        <span style={{ fontSize: config.suitSize * config.cornerScale * 0.85, marginTop: -2 }}>
          {suitInfo.symbol}
        </span>
      </div>

      {/* Bottom-right corner (rotated) */}
      <div 
        className="absolute flex flex-col items-center leading-none rotate-180"
        style={{ 
          bottom: 3, 
          right: 4,
          color: suitInfo.primary
        }}
      >
        <span 
          className="font-bold"
          style={{ fontSize: config.rankSize * config.cornerScale }}
        >
          {displayRank}
        </span>
        <span style={{ fontSize: config.suitSize * config.cornerScale * 0.85, marginTop: -2 }}>
          {suitInfo.symbol}
        </span>
      </div>

      {/* Face card special design */}
      {isFaceCard && (
        <div 
          className="absolute inset-4 opacity-5 pointer-events-none"
          style={{
            border: `1px solid ${suitInfo.primary}`,
            borderRadius: config.borderRadius - 4
          }}
        />
      )}

      {/* Glossy overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(155deg, rgba(255,255,255,0.4) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.03) 100%)',
          borderRadius: config.borderRadius
        }}
      />
      
      {/* Edge shadow for depth */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.05)',
          borderRadius: config.borderRadius
        }}
      />
    </div>
  );
});

// Holographic effect overlay
const HolographicOverlay = memo(function HolographicOverlay() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg opacity-30"
      animate={{
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "linear"
      }}
      style={{
        background: `linear-gradient(
          135deg,
          rgba(255,0,128,0.3) 0%,
          rgba(0,255,255,0.3) 25%,
          rgba(255,255,0,0.3) 50%,
          rgba(128,0,255,0.3) 75%,
          rgba(255,0,128,0.3) 100%
        )`,
        backgroundSize: '200% 200%',
        mixBlendMode: 'overlay'
      }}
    />
  );
});

export const UltraRealisticCard = memo(function UltraRealisticCard({
  card,
  faceDown = false,
  size = 'md',
  delay = 0,
  isDealing = false,
  isWinning = false,
  isHighlighted = false,
  isFolded = false,
  enable3D = true,
  showHolographic = false,
  className,
  onClick
}: UltraRealisticCardProps) {
  const config = SIZE_CONFIG[size];
  const [isHovered, setIsHovered] = useState(false);
  
  // Parse card
  const rank = card?.[0] || '?';
  const suit = (card?.[1]?.toLowerCase() || 's') as keyof typeof SUITS;
  const isUnknown = !card || card === '??' || faceDown;
  
  // 3D tilt effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enable3D) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  // Dealing animation
  const dealVariants = {
    initial: {
      opacity: 0,
      scale: 0.3,
      x: 200,
      y: -300,
      rotateZ: -45,
      rotateY: 180
    },
    animate: {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      rotateZ: 0,
      rotateY: isUnknown ? 180 : 0,
      transition: {
        type: 'spring' as const,
        stiffness: 150,
        damping: 18,
        delay: delay * 0.12
      }
    }
  };

  // Winning glow animation
  const winningVariants = {
    initial: { 
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)' 
    },
    winning: {
      boxShadow: [
        '0 0 20px 5px rgba(251, 191, 36, 0.5), 0 0 40px 10px rgba(251, 191, 36, 0.3)',
        '0 0 30px 10px rgba(251, 191, 36, 0.7), 0 0 60px 20px rgba(251, 191, 36, 0.4)',
        '0 0 20px 5px rgba(251, 191, 36, 0.5), 0 0 40px 10px rgba(251, 191, 36, 0.3)'
      ],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut' as const
      }
    }
  };

  return (
    <motion.div
      className={cn(
        "relative flex-shrink-0 cursor-pointer select-none",
        isFolded && "opacity-50 grayscale",
        className
      )}
      style={{
        width: config.w,
        height: config.h,
        perspective: 1000,
        transformStyle: 'preserve-3d'
      }}
      variants={isDealing ? dealVariants : undefined}
      initial={isDealing ? 'initial' : false}
      animate={isDealing ? 'animate' : undefined}
      whileHover={!isFolded ? { scale: 1.05, y: -6, zIndex: 50 } : undefined}
      whileTap={!isFolded ? { scale: 0.98 } : undefined}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <motion.div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          rotateX: enable3D && isHovered ? rotateX : 0,
          rotateY: enable3D && isHovered ? rotateY : isUnknown ? 180 : 0
        }}
        variants={winningVariants}
        initial="initial"
        animate={isWinning ? 'winning' : 'initial'}
      >
        {/* Card shadow */}
        <motion.div 
          className="absolute"
          style={{
            width: config.w,
            height: config.h,
            borderRadius: config.borderRadius,
            transform: 'translateZ(-5px) translateY(5px)',
            background: 'rgba(0,0,0,0.4)',
            filter: 'blur(8px)'
          }}
          animate={{
            opacity: isHovered ? 0.6 : 0.4,
            y: isHovered ? 10 : 5
          }}
        />

        {/* Front face (card value) */}
        <motion.div
          className="absolute inset-0 backface-hidden"
          style={{
            borderRadius: config.borderRadius,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)',
            border: isHighlighted ? '2px solid rgba(251, 191, 36, 0.6)' : '1px solid rgba(0,0,0,0.1)',
            boxShadow: isHighlighted 
              ? '0 0 20px rgba(251, 191, 36, 0.4)' 
              : '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          <CardFace rank={rank} suit={suit} size={size} isHighlighted={isHighlighted} />
          {showHolographic && isHighlighted && <HolographicOverlay />}
        </motion.div>

        {/* Back face (card back) */}
        <motion.div
          className="absolute inset-0 backface-hidden"
          style={{
            borderRadius: config.borderRadius,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          <CardBackPattern size={size} />
        </motion.div>
      </motion.div>

      {/* Highlight ring for winning */}
      <AnimatePresence>
        {isHighlighted && !isWinning && (
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1.02 }}
            exit={{ opacity: 0, scale: 1 }}
            className="absolute pointer-events-none"
            style={{
              inset: -3,
              borderRadius: config.borderRadius + 3,
              border: '2px solid rgba(251, 191, 36, 0.5)',
              boxShadow: '0 0 15px rgba(251, 191, 36, 0.3)'
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default UltraRealisticCard;
