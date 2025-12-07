import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SqueezeCardProps {
  card: string;
  onReveal?: () => void;
  isRevealed?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SUITS: Record<string, { symbol: string; color: string }> = {
  's': { symbol: '♠', color: 'text-slate-900' },
  'h': { symbol: '♥', color: 'text-red-500' },
  'd': { symbol: '♦', color: 'text-blue-500' },
  'c': { symbol: '♣', color: 'text-green-600' },
};

const RANKS: Record<string, string> = {
  'A': 'A', 'K': 'K', 'Q': 'Q', 'J': 'J', 'T': '10',
  '9': '9', '8': '8', '7': '7', '6': '6', '5': '5',
  '4': '4', '3': '3', '2': '2'
};

const SIZES = {
  sm: { width: 48, height: 68, fontSize: 'text-lg', cornerSize: 'text-xs' },
  md: { width: 64, height: 90, fontSize: 'text-2xl', cornerSize: 'text-sm' },
  lg: { width: 80, height: 112, fontSize: 'text-3xl', cornerSize: 'text-base' },
  xl: { width: 100, height: 140, fontSize: 'text-4xl', cornerSize: 'text-lg' },
};

export function SqueezeCard({ 
  card, 
  onReveal, 
  isRevealed = false,
  size = 'lg',
  className 
}: SqueezeCardProps) {
  const [squeezed, setSqueezed] = useState(false);
  const [revealPercent, setRevealPercent] = useState(0);
  const [showFullCard, setShowFullCard] = useState(isRevealed);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const dragY = useMotionValue(0);
  const dragX = useMotionValue(0);
  
  // Parse card
  const rank = card.length > 0 ? card[0].toUpperCase() : '?';
  const suit = card.length > 1 ? card[1].toLowerCase() : 's';
  const suitInfo = SUITS[suit] || SUITS['s'];
  const displayRank = RANKS[rank] || rank;
  
  const sizeConfig = SIZES[size];

  // Transform reveal based on drag
  const revealY = useTransform(dragY, [0, -100], [0, 100]);
  const maskHeight = useTransform(dragY, [0, -100], ['0%', '100%']);
  const cardRotate = useTransform(dragX, [-50, 50], [-5, 5]);
  const cardScale = useTransform(dragY, [0, -50], [1, 1.05]);

  useEffect(() => {
    if (isRevealed) {
      setShowFullCard(true);
    }
  }, [isRevealed]);

  const handleDrag = (_: any, info: PanInfo) => {
    const percent = Math.min(100, Math.max(0, Math.abs(info.offset.y) / 1.5));
    setRevealPercent(percent);
    
    if (percent >= 80 && !squeezed) {
      setSqueezed(true);
      setShowFullCard(true);
      onReveal?.();
    }
  };

  const handleDragEnd = () => {
    if (revealPercent >= 80) {
      setShowFullCard(true);
    }
  };

  // Full reveal animation
  if (showFullCard) {
    return (
      <motion.div
        initial={{ rotateY: 180, scale: 0.8 }}
        animate={{ rotateY: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className={cn(
          "relative rounded-xl shadow-2xl overflow-hidden cursor-default",
          "bg-white border-2 border-slate-200",
          className
        )}
        style={{ 
          width: sizeConfig.width, 
          height: sizeConfig.height,
          perspective: '1000px'
        }}
      >
        {/* Card face */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-white">
          {/* Center suit/rank */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn(sizeConfig.fontSize, 'font-bold', suitInfo.color)}>
              {displayRank}
            </span>
            <span className={cn(sizeConfig.fontSize, suitInfo.color)}>
              {suitInfo.symbol}
            </span>
          </div>
          
          {/* Corner indicators */}
          <div className={cn("absolute top-1 left-1.5 flex flex-col items-center", suitInfo.color)}>
            <span className={cn(sizeConfig.cornerSize, 'font-bold leading-none')}>{displayRank}</span>
            <span className={cn(sizeConfig.cornerSize, 'leading-none')}>{suitInfo.symbol}</span>
          </div>
          <div className={cn("absolute bottom-1 right-1.5 flex flex-col items-center rotate-180", suitInfo.color)}>
            <span className={cn(sizeConfig.cornerSize, 'font-bold leading-none')}>{displayRank}</span>
            <span className={cn(sizeConfig.cornerSize, 'leading-none')}>{suitInfo.symbol}</span>
          </div>
        </div>
        
        {/* Shine effect */}
        <motion.div
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: '200%', opacity: [0, 0.5, 0] }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50"
          style={{ transform: 'skewX(-20deg)' }}
        />
      </motion.div>
    );
  }

  // Squeeze interaction
  return (
    <motion.div
      ref={cardRef}
      className={cn(
        "relative rounded-xl shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing",
        "touch-none select-none",
        className
      )}
      style={{ 
        width: sizeConfig.width, 
        height: sizeConfig.height,
        rotateZ: cardRotate,
        scale: cardScale
      }}
      drag="y"
      dragConstraints={{ top: -120, bottom: 0 }}
      dragElastic={0.1}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 1.02 }}
    >
      {/* Card back (always visible) */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-700 via-red-800 to-red-900 rounded-xl">
        {/* Pattern */}
        <div 
          className="absolute inset-2 rounded-lg border-2 border-amber-400/30"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 5px,
                rgba(255,215,0,0.05) 5px,
                rgba(255,215,0,0.05) 10px
              )
            `
          }}
        />
        {/* Center emblem */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
            <span className="text-red-900 font-bold text-sm">♠</span>
          </div>
        </div>
      </div>

      {/* Reveal overlay - shows as you drag */}
      <motion.div
        className="absolute inset-x-0 bottom-0 overflow-hidden rounded-b-xl"
        style={{ height: maskHeight }}
      >
        <div 
          className="absolute inset-x-0 bottom-0 bg-gradient-to-br from-white via-slate-50 to-white"
          style={{ height: sizeConfig.height }}
        >
          {/* Revealed card content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn(sizeConfig.fontSize, 'font-bold', suitInfo.color)}>
              {displayRank}
            </span>
            <span className={cn(sizeConfig.fontSize, suitInfo.color)}>
              {suitInfo.symbol}
            </span>
          </div>
          
          {/* Corner indicators */}
          <div className={cn("absolute top-1 left-1.5 flex flex-col items-center", suitInfo.color)}>
            <span className={cn(sizeConfig.cornerSize, 'font-bold leading-none')}>{displayRank}</span>
            <span className={cn(sizeConfig.cornerSize, 'leading-none')}>{suitInfo.symbol}</span>
          </div>
        </div>
      </motion.div>

      {/* Squeeze hint */}
      {revealPercent < 20 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-2 inset-x-0 text-center"
        >
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-[10px] text-amber-300/80 font-medium"
          >
            ↑ Потяните для squeeze
          </motion.div>
        </motion.div>
      )}

      {/* Progress indicator */}
      {revealPercent > 0 && revealPercent < 80 && (
        <div className="absolute top-2 inset-x-2">
          <div className="h-1 bg-black/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-amber-400"
              style={{ width: `${revealPercent}%` }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Squeeze hand - two cards
interface SqueezeHandProps {
  cards: string[];
  onRevealComplete?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function SqueezeHand({ cards, onRevealComplete, size = 'lg' }: SqueezeHandProps) {
  const [revealed, setRevealed] = useState<boolean[]>([false, false]);

  const handleReveal = (index: number) => {
    const newRevealed = [...revealed];
    newRevealed[index] = true;
    setRevealed(newRevealed);
    
    if (newRevealed.every(r => r)) {
      onRevealComplete?.();
    }
  };

  return (
    <div className="flex gap-3 p-4">
      {cards.slice(0, 2).map((card, index) => (
        <SqueezeCard
          key={`${card}-${index}`}
          card={card}
          size={size}
          isRevealed={revealed[index]}
          onReveal={() => handleReveal(index)}
        />
      ))}
    </div>
  );
}
