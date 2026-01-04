/**
 * Enhanced Bet Collection Animation Component
 * PokerStars-style professional chip collection animation
 * Animated chips fly from player positions to center pot with physics
 */
import React, { memo, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CollectedBet {
  playerId: string;
  seatNumber: number;
  amount: number;
  position: { x: number; y: number };
}

interface EnhancedBetCollectionAnimationProps {
  /** Bets to collect - triggers animation when changes */
  betsToCollect: CollectedBet[];
  /** Callback when all chips reach the pot */
  onComplete?: () => void;
  /** Duration of collection animation in ms */
  duration?: number;
  /** Whether collection is in progress */
  isCollecting: boolean;
  /** Container dimensions for positioning */
  containerRef?: React.RefObject<HTMLElement>;
  className?: string;
}

// Chip colors based on value (PokerStars standard)
const getChipConfig = (amount: number): { color: string; border: string; glow: string } => {
  if (amount >= 10000) return { 
    color: 'linear-gradient(145deg, #fef08a 0%, #f59e0b 50%, #d97706 100%)', 
    border: '#92400e',
    glow: 'rgba(245, 158, 11, 0.6)'
  };
  if (amount >= 1000) return { 
    color: 'linear-gradient(145deg, #1e1e1e 0%, #374151 50%, #1f2937 100%)', 
    border: '#4b5563',
    glow: 'rgba(75, 85, 99, 0.4)'
  };
  if (amount >= 500) return { 
    color: 'linear-gradient(145deg, #a855f7 0%, #7c3aed 50%, #6d28d9 100%)', 
    border: '#5b21b6',
    glow: 'rgba(139, 92, 246, 0.5)'
  };
  if (amount >= 100) return { 
    color: 'linear-gradient(145deg, #1e1e1e 0%, #0f172a 50%, #020617 100%)', 
    border: '#334155',
    glow: 'rgba(51, 65, 85, 0.4)'
  };
  if (amount >= 25) return { 
    color: 'linear-gradient(145deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)', 
    border: '#15803d',
    glow: 'rgba(34, 197, 94, 0.5)'
  };
  return { 
    color: 'linear-gradient(145deg, #f87171 0%, #ef4444 50%, #dc2626 100%)', 
    border: '#b91c1c',
    glow: 'rgba(239, 68, 68, 0.5)'
  };
};

// Single animated chip with realistic physics
const AnimatedChip = memo(function AnimatedChip({
  startX,
  startY,
  amount,
  delay,
  index,
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
  
  // Randomize path slightly for natural look
  const pathVariation = {
    x: (Math.random() - 0.5) * 20,
    y: (Math.random() - 0.5) * 10,
    rotation: (Math.random() - 0.5) * 360
  };

  return (
    <motion.div
      initial={{ 
        x: startX, 
        y: startY, 
        scale: 1, 
        opacity: 1,
        rotate: 0,
        filter: 'brightness(1)'
      }}
      animate={{ 
        x: [startX, startX + pathVariation.x, 0], 
        y: [startY, startY + pathVariation.y - 20, 0], 
        scale: [1, 1.1, 0.6],
        opacity: [1, 1, 0],
        rotate: [0, pathVariation.rotation / 2, pathVariation.rotation],
        filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1.5)']
      }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.4, 0, 0.2, 1],
        times: [0, 0.4, 1]
      }}
      onAnimationComplete={onComplete}
      className="absolute left-1/2 top-1/2 pointer-events-none"
      style={{ transform: 'translate(-50%, -50%)' }}
    >
      {/* Chip stack (2-3 chips) */}
      {[0, 1, 2].slice(0, Math.min(3, Math.ceil(amount / 100))).map((stackIndex) => (
        <div
          key={stackIndex}
          className="absolute w-6 h-6 rounded-full"
          style={{
            background: config.color,
            border: `2px solid ${config.border}`,
            boxShadow: `
              0 ${2 + stackIndex}px ${4 + stackIndex * 2}px rgba(0,0,0,0.4),
              inset 0 2px 4px rgba(255,255,255,0.2),
              0 0 ${8 + stackIndex * 4}px ${config.glow}
            `,
            top: -stackIndex * 2,
            left: stackIndex * 0.5,
            zIndex: 3 - stackIndex
          }}
        >
          {/* Chip edge pattern */}
          <div 
            className="absolute inset-0.5 rounded-full"
            style={{
              background: `repeating-conic-gradient(
                from 0deg,
                rgba(255,255,255,0.1) 0deg 10deg,
                transparent 10deg 20deg
              )`
            }}
          />
        </div>
      ))}
    </motion.div>
  );
});

export const EnhancedBetCollectionAnimation = memo(function EnhancedBetCollectionAnimation({
  betsToCollect,
  onComplete,
  duration = 500,
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
  const [showPotGlow, setShowPotGlow] = useState(false);

  // Calculate total amount for pot glow intensity
  const totalAmount = useMemo(() => 
    betsToCollect.reduce((sum, bet) => sum + bet.amount, 0),
    [betsToCollect]
  );

  // Generate chips when collection starts
  useEffect(() => {
    if (!isCollecting || betsToCollect.length === 0) {
      setChips([]);
      setCompletedCount(0);
      setShowPotGlow(false);
      return;
    }

    // Show pot glow immediately
    setShowPotGlow(true);

    // Create chip elements with staggered delays
    const newChips = betsToCollect.flatMap((bet, betIndex) => {
      // Number of visual chips based on amount
      const chipCount = Math.min(3, Math.max(1, Math.ceil(bet.amount / 200)));
      
      return Array.from({ length: chipCount }).map((_, chipIndex) => ({
        id: `${bet.playerId}-${Date.now()}-${betIndex}-${chipIndex}`,
        // Convert percentage position to pixels from center
        x: (bet.position.x - 50) * 4,
        y: (bet.position.y - 50) * 4,
        amount: bet.amount / chipCount,
        delay: betIndex * 0.08 + chipIndex * 0.03
      }));
    });

    setChips(newChips);
    setCompletedCount(0);
  }, [isCollecting, betsToCollect]);

  // Track completion
  useEffect(() => {
    if (chips.length > 0 && completedCount >= chips.length) {
      // Delay callback slightly for pot glow fade
      setTimeout(() => {
        onComplete?.();
        setShowPotGlow(false);
      }, 200);
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
      {/* Center pot glow - intensifies as chips arrive */}
      <AnimatePresence>
        {showPotGlow && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ 
              scale: [1, 1.3, 1.1], 
              opacity: [0.3, 0.8, 0.6] 
            }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div 
              className="rounded-full"
              style={{
                width: Math.min(100, 50 + totalAmount / 100),
                height: Math.min(100, 50 + totalAmount / 100),
                background: `radial-gradient(circle, rgba(251,191,36,0.5) 0%, rgba(245,158,11,0.3) 40%, transparent 70%)`,
                filter: 'blur(8px)'
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pot center marker */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(251,191,36,0.8) 0%, transparent 70%)',
        }}
      />

      {/* Animated chips */}
      <AnimatePresence mode="popLayout">
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
      </AnimatePresence>
    </div>
  );
});

// Re-export with original name for backward compatibility
export const BetCollectionAnimation = EnhancedBetCollectionAnimation;

export default EnhancedBetCollectionAnimation;
