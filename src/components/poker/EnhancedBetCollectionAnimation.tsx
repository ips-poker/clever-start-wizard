/**
 * Enhanced Bet Collection Animation Component
 * OPTIMIZED for mobile/Telegram performance
 * Simplified chips fly from player positions to center pot
 * 
 * IMPORTANT: Uses unified timing configuration from src/config/pokerTimings.ts
 */
import React, { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BET_COLLECTION_TIMINGS } from '@/config/pokerTimings';

interface CollectedBet {
  playerId: string;
  seatNumber: number;
  amount: number;
  position: { x: number; y: number };
}

interface EnhancedBetCollectionAnimationProps {
  betsToCollect: CollectedBet[];
  onComplete?: () => void;
  duration?: number;
  isCollecting: boolean;
  containerRef?: React.RefObject<HTMLElement>;
  className?: string;
}

// Chip colors based on value - simplified
const getChipConfig = (amount: number): { color: string; border: string } => {
  if (amount >= 10000) return { 
    color: 'linear-gradient(145deg, #fef08a 0%, #f59e0b 50%, #d97706 100%)', 
    border: '#92400e'
  };
  if (amount >= 1000) return { 
    color: 'linear-gradient(145deg, #1e1e1e 0%, #374151 50%, #1f2937 100%)', 
    border: '#4b5563'
  };
  if (amount >= 500) return { 
    color: 'linear-gradient(145deg, #a855f7 0%, #7c3aed 50%, #6d28d9 100%)', 
    border: '#5b21b6'
  };
  if (amount >= 100) return { 
    color: 'linear-gradient(145deg, #1e1e1e 0%, #0f172a 50%, #020617 100%)', 
    border: '#334155'
  };
  if (amount >= 25) return { 
    color: 'linear-gradient(145deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)', 
    border: '#15803d'
  };
  return { 
    color: 'linear-gradient(145deg, #f87171 0%, #ef4444 50%, #dc2626 100%)', 
    border: '#b91c1c'
  };
};

// Single animated chip - OPTIMIZED: minimal shadows, no filters
const AnimatedChip = memo(function AnimatedChip({
  startX,
  startY,
  amount,
  delay,
  onComplete
}: {
  startX: number;
  startY: number;
  amount: number;
  delay: number;
  index: number;
  onComplete?: () => void;
}) {
  const config = getChipConfig(amount);

  return (
    <motion.div
      initial={{ 
        x: startX, 
        y: startY, 
        scale: 1, 
        opacity: 1
      }}
      animate={{ 
        x: [startX, startX * 0.5, 0], 
        y: [startY, startY * 0.5 - 15, 0], 
        scale: [1, 1.05, 0.7],
        opacity: [1, 1, 0]
      }}
      transition={{
        // Uses unified timing from config
        duration: BET_COLLECTION_TIMINGS.slideToCenter / 1000,
        delay,
        ease: [0.4, 0, 0.2, 1],
        times: [0, 0.4, 1]
      }}
      onAnimationComplete={onComplete}
      className="absolute left-1/2 top-1/2 pointer-events-none"
      style={{ transform: 'translate(-50%, -50%)' }}
    >
      <div
        className="w-5 h-5 rounded-full"
        style={{
          background: config.color,
          border: `2px solid ${config.border}`,
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}
      />
    </motion.div>
  );
});

export const EnhancedBetCollectionAnimation = memo(function EnhancedBetCollectionAnimation({
  betsToCollect,
  onComplete,
  isCollecting,
  className
}: EnhancedBetCollectionAnimationProps) {
  const [chips, setChips] = useState<Array<{
    id: string;
    x: number;
    y: number;
    amount: number;
    delay: number;
  }>>([]);
  const [completedCount, setCompletedCount] = useState(0);

  // Generate chips when collection starts - 1 chip per bet max
  useEffect(() => {
    if (!isCollecting || betsToCollect.length === 0) {
      setChips([]);
      setCompletedCount(0);
      return;
    }

    const newChips = betsToCollect.map((bet, betIndex) => ({
      id: `${bet.playerId}-${Date.now()}-${betIndex}`,
      x: (bet.position.x - 50) * 4,
      y: (bet.position.y - 50) * 4,
      amount: bet.amount,
      // Uses unified timing from config
      delay: betIndex * (BET_COLLECTION_TIMINGS.staggerPerPlayer / 1000)
    }));

    setChips(newChips);
    setCompletedCount(0);
  }, [isCollecting, betsToCollect]);

  // Track completion
  useEffect(() => {
    if (chips.length > 0 && completedCount >= chips.length) {
      setTimeout(() => {
        onComplete?.();
      }, 50);
    }
  }, [completedCount, chips.length, onComplete]);

  const handleChipComplete = () => {
    setCompletedCount(prev => prev + 1);
  };

  if (!isCollecting || chips.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      'absolute inset-0 pointer-events-none z-30',
      className
    )}>
      {chips.map((chip, index) => (
        <AnimatedChip
          key={chip.id}
          startX={chip.x}
          startY={chip.y}
          amount={chip.amount}
          delay={chip.delay}
          index={index}
          onComplete={handleChipComplete}
        />
      ))}
    </div>
  );
});

// Re-export with original name for backward compatibility
export const BetCollectionAnimation = EnhancedBetCollectionAnimation;

export default EnhancedBetCollectionAnimation;
