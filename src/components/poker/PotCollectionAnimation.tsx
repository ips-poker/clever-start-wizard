// Pot Collection Animation - Chips flying to center when phase changes
import React, { memo, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChipFlyingProps {
  fromX: number;
  fromY: number;
  amount: number;
  delay: number;
  onComplete?: () => void;
}

// Single flying chip animation
const FlyingChip = memo(function FlyingChip({
  fromX,
  fromY,
  amount,
  delay,
  onComplete
}: ChipFlyingProps) {
  // Get chip color based on amount
  const chipColor = useMemo(() => {
    if (amount >= 25000) return { bg: '#06b6d4', border: '#0891b2' };
    if (amount >= 5000) return { bg: '#ec4899', border: '#be185d' };
    if (amount >= 1000) return { bg: '#f59e0b', border: '#d97706' };
    if (amount >= 500) return { bg: '#8b5cf6', border: '#6d28d9' };
    if (amount >= 100) return { bg: '#1e1e1e', border: '#404040' };
    if (amount >= 25) return { bg: '#22c55e', border: '#15803d' };
    if (amount >= 5) return { bg: '#ef4444', border: '#b91c1c' };
    return { bg: '#ffffff', border: '#c0c0c0' };
  }, [amount]);

  return (
    <motion.div
      initial={{ 
        x: fromX, 
        y: fromY, 
        scale: 1, 
        opacity: 1 
      }}
      animate={{ 
        x: 0, 
        y: 0, 
        scale: 0.5, 
        opacity: 0 
      }}
      transition={{
        duration: 1.2,
        delay,
        ease: [0.4, 0, 0.2, 1]
      }}
      onAnimationComplete={onComplete}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
    >
      {/* Chip stack effect - 3 chips */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 24,
            height: 24,
            bottom: i * 3,
            left: '50%',
            transform: 'translateX(-50%)',
            background: `radial-gradient(circle at 30% 30%, ${chipColor.bg} 0%, ${chipColor.bg}cc 60%, ${chipColor.border} 100%)`,
            border: `2px solid ${chipColor.border}`,
            boxShadow: `
              inset 0 2px 4px rgba(255,255,255,0.3),
              inset 0 -2px 4px rgba(0,0,0,0.2),
              0 ${i + 2}px ${4 + i}px rgba(0,0,0,0.4)
            `
          }}
        >
          {/* Chip pattern */}
          <div 
            className="absolute inset-0 rounded-full opacity-30"
            style={{
              background: `repeating-conic-gradient(
                from 0deg,
                ${chipColor.border} 0deg 30deg,
                transparent 30deg 60deg
              )`
            }}
          />
        </div>
      ))}
      
      {/* Amount label floating above */}
      <motion.div
        initial={{ opacity: 1, y: -20 }}
        animate={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.8, delay: delay + 0.6 }}
        className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
      >
        <span 
          className="text-sm font-bold px-2 py-0.5 rounded bg-black/80"
          style={{
            color: '#fbbf24',
            textShadow: '0 0 10px rgba(251,191,36,0.5)'
          }}
        >
          +{amount.toLocaleString()}
        </span>
      </motion.div>
    </motion.div>
  );
});

interface PotCollectionAnimationProps {
  isCollecting: boolean;
  bets: Array<{
    seatPosition: { x: number; y: number };
    amount: number;
  }>;
  onComplete?: () => void;
}

// Seat positions in % to pixel offset from center (approximate for animation)
const getPixelOffset = (seatPos: { x: number; y: number }, containerWidth = 400, containerHeight = 600) => {
  // Convert % position to pixel offset from center
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  
  const x = (seatPos.x / 100) * containerWidth - centerX;
  const y = (seatPos.y / 100) * containerHeight - centerY;
  
  // Add offset towards center (where bets are displayed)
  const towardsCenterX = x * 0.6;
  const towardsCenterY = y * 0.6;
  
  return { x: towardsCenterX, y: towardsCenterY };
};

export const PotCollectionAnimation = memo(function PotCollectionAnimation({
  isCollecting,
  bets,
  onComplete
}: PotCollectionAnimationProps) {
  const [showAnimation, setShowAnimation] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  
  useEffect(() => {
    if (isCollecting && bets.length > 0) {
      setShowAnimation(true);
      setCompletedCount(0);
    }
  }, [isCollecting, bets.length]);
  
  useEffect(() => {
    if (showAnimation && completedCount >= bets.length && bets.length > 0) {
      setShowAnimation(false);
      onComplete?.();
    }
  }, [completedCount, bets.length, showAnimation, onComplete]);

  if (!showAnimation || bets.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      {/* Central glow effect when collecting */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, transparent 70%)',
          filter: 'blur(20px)'
        }}
      />
      
      {/* Flying chips from each bet position */}
      <AnimatePresence>
        {bets.map((bet, idx) => {
          const offset = getPixelOffset(bet.seatPosition);
          return (
            <FlyingChip
              key={`chip-${idx}-${bet.amount}`}
              fromX={offset.x}
              fromY={offset.y}
              amount={bet.amount}
              delay={idx * 0.08}
              onComplete={() => setCompletedCount(c => c + 1)}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
});

export default PotCollectionAnimation;
