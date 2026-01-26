/**
 * Bet Collection Animation Component
 * Animates chips from player positions to center pot
 * Triggered when betting round ends and chips are collected
 * 
 * IMPORTANT: Uses unified timing configuration from src/config/pokerTimings.ts
 */
import React, { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BET_COLLECTION_TIMINGS } from '@/config/pokerTimings';

interface CollectedBet {
  playerId: string;
  seatNumber: number;
  amount: number;
  position: { x: number; y: number };
}

interface BetCollectionAnimationProps {
  /** Bets to collect - triggers animation when changes */
  betsToCollect: CollectedBet[];
  /** Callback when all chips reach the pot */
  onComplete?: () => void;
  /** Duration of collection animation in ms */
  duration?: number;
  /** Whether collection is in progress */
  isCollecting: boolean;
  className?: string;
}

// Chip visual for animation
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
  onComplete?: () => void;
}) {
  const chipColor = amount >= 1000 ? '#f59e0b' : 
                    amount >= 100 ? '#1e1e1e' : 
                    amount >= 25 ? '#22c55e' : '#ef4444';

  return (
    <motion.div
      initial={{ 
        x: startX, 
        y: startY, 
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
        // Uses unified timing from config
        duration: BET_COLLECTION_TIMINGS.slideToCenter / 1000,
        delay,
        ease: [0.4, 0, 0.2, 1]
      }}
      onAnimationComplete={onComplete}
      className="absolute left-1/2 top-1/2"
      style={{ transform: 'translate(-50%, -50%)' }}
    >
      <div 
        className="w-5 h-5 rounded-full"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${chipColor} 0%, ${chipColor}cc 60%, #333 100%)`,
          border: '2px solid #333',
          boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
        }}
      />
    </motion.div>
  );
});

export const BetCollectionAnimation = memo(function BetCollectionAnimation({
  betsToCollect,
  onComplete,
  // Uses unified timing from config
  duration = BET_COLLECTION_TIMINGS.totalDuration,
  isCollecting,
  className
}: BetCollectionAnimationProps) {
  const [chips, setChips] = useState<Array<{
    id: string;
    x: number;
    y: number;
    amount: number;
    delay: number;
  }>>([]);
  const [completedCount, setCompletedCount] = useState(0);

  // Generate chips when collection starts
  useEffect(() => {
    if (!isCollecting || betsToCollect.length === 0) {
      setChips([]);
      setCompletedCount(0);
      return;
    }

    // Create chip elements with staggered delays
    const newChips = betsToCollect.map((bet, index) => ({
      id: `${bet.playerId}-${Date.now()}-${index}`,
      // Convert percentage position to pixels from center
      x: (bet.position.x - 50) * 3, // Scale factor for visual
      y: (bet.position.y - 50) * 3,
      amount: bet.amount,
      // POKERSTARS-STYLE: ~80ms stagger between each player's chips
      delay: index * 0.08
    }));

    setChips(newChips);
    setCompletedCount(0);
  }, [isCollecting, betsToCollect]);

  // Track completion
  useEffect(() => {
    if (chips.length > 0 && completedCount >= chips.length) {
      onComplete?.();
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
      {/* Center target glow */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <div className="w-16 h-16 rounded-full bg-amber-400/20 blur-lg" />
      </motion.div>

      {/* Animated chips */}
      <AnimatePresence>
        {chips.map((chip) => (
          <AnimatedChip
            key={chip.id}
            startX={chip.x}
            startY={chip.y}
            amount={chip.amount}
            delay={chip.delay}
            onComplete={handleChipComplete}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});

export default BetCollectionAnimation;
