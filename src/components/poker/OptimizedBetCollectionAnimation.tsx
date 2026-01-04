/**
 * Optimized Bet Collection Animation
 * Uses CSS transforms and GPU acceleration for smooth performance on mobile
 */

import React, { memo, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface CollectedBet {
  playerId: string;
  seatNumber: number;
  amount: number;
  position: { x: number; y: number };
}

interface OptimizedBetCollectionAnimationProps {
  betsToCollect: CollectedBet[];
  onComplete?: () => void;
  duration?: number;
  isCollecting: boolean;
  className?: string;
}

// CSS-based chip animation - no framer-motion for better performance
const AnimatedChip = memo(function AnimatedChip({
  startX,
  startY,
  amount,
  delay,
  duration,
  onComplete
}: {
  startX: number;
  startY: number;
  amount: number;
  delay: number;
  duration: number;
  onComplete?: () => void;
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    const startTimer = setTimeout(() => setIsAnimating(true), delay);
    const endTimer = setTimeout(() => onComplete?.(), delay + duration);
    
    return () => {
      clearTimeout(startTimer);
      clearTimeout(endTimer);
    };
  }, [delay, duration, onComplete]);

  // Simple color based on amount
  const chipColor = amount >= 1000 ? '#f59e0b' : 
                    amount >= 100 ? '#1e1e1e' : 
                    amount >= 25 ? '#22c55e' : '#ef4444';

  return (
    <div
      className="absolute left-1/2 top-1/2 pointer-events-none"
      style={{
        width: 20,
        height: 20,
        marginLeft: -10,
        marginTop: -10,
        borderRadius: '50%',
        backgroundColor: chipColor,
        border: '2px solid rgba(0,0,0,0.3)',
        // GPU-accelerated animation
        transform: isAnimating 
          ? 'translate(0, 0) scale(0.5)' 
          : `translate(${startX}px, ${startY}px) scale(1)`,
        opacity: isAnimating ? 0 : 1,
        transition: `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${duration}ms ease-out`,
        willChange: 'transform, opacity',
        // Force GPU layer
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden'
      }}
    />
  );
});

export const OptimizedBetCollectionAnimation = memo(function OptimizedBetCollectionAnimation({
  betsToCollect,
  onComplete,
  duration = 400,
  isCollecting,
  className
}: OptimizedBetCollectionAnimationProps) {
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
      x: (bet.position.x - 50) * 3,
      y: (bet.position.y - 50) * 3,
      amount: bet.amount,
      delay: index * 30 // Reduced stagger for faster feel
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

  const handleChipComplete = useCallback(() => {
    setCompletedCount(prev => prev + 1);
  }, []);

  if (!isCollecting || chips.length === 0) {
    return null;
  }

  return (
    <div className={cn('absolute inset-0 pointer-events-none z-30', className)}>
      {/* Simple center glow - CSS only */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)',
          willChange: 'opacity'
        }}
      />

      {/* Animated chips - CSS transitions only */}
      {chips.map((chip) => (
        <AnimatedChip
          key={chip.id}
          startX={chip.x}
          startY={chip.y}
          amount={chip.amount}
          delay={chip.delay}
          duration={duration}
          onComplete={handleChipComplete}
        />
      ))}
    </div>
  );
});

export default OptimizedBetCollectionAnimation;
