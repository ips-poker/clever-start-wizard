/**
 * Premium Win Animation - Chips Cascade from Pot to Winner
 * Clean, direct trajectory animation
 */

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PPPokerChip } from './RealisticPokerChip';
import { SHOWDOWN_TIMINGS } from '@/config/pokerTimings';

interface WinnerChipCascadeProps {
  isActive: boolean;
  fromPosition: { x: number; y: number }; // Pot position (%)
  toPosition: { x: number; y: number };   // Winner position (%)
  amount: number;
  bigBlind?: number;
  onComplete?: () => void;
}

// Chip BB values for cascading - matches table chip denominations
const CHIP_BB_VALUES = [1, 5, 10, 20, 50, 100] as const;

const getChipBBValue = (waveIndex: number): number => {
  const idx = Math.min(waveIndex, CHIP_BB_VALUES.length - 1);
  return CHIP_BB_VALUES[idx];
};

interface SingleChipProps {
  index: number;
  wave: number;
  totalInWave: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  bbValue: number;
  onComplete?: () => void;
}

// Single flying chip - DIRECT straight line from pot to winner
const FlyingChip = memo(function FlyingChip({
  index,
  totalInWave,
  fromX,
  fromY,
  toX,
  toY,
  bbValue,
  onComplete
}: SingleChipProps) {
  // Calculate direct delta
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  
  // Small random offset for natural spread (chips don't stack exactly)
  const offsetX = (Math.random() - 0.5) * 2;
  const offsetY = (Math.random() - 0.5) * 2;
  
  // All chips start together with tiny random delay (0-50ms)
  const delay = Math.random() * 0.05;
  
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ 
        left: `${fromX}%`, 
        top: `${fromY}%`,
        zIndex: 9999 + index,
        transform: 'translate(-50%, -50%)'
      }}
      initial={{ 
        x: offsetX, 
        y: offsetY, 
        scale: 1, 
        opacity: 1
      }}
      animate={{
        x: `${deltaX}vw`,
        y: `${deltaY}vh`,
        scale: [1, 1.05, 0.85],
        opacity: [1, 1, 0]
      }}
      transition={{
        duration: SHOWDOWN_TIMINGS.potSlideToWinner / 1000,
        delay,
        ease: [0.25, 0.1, 0.25, 1], // Smooth easing
        times: [0, 0.75, 1]
      }}
      onAnimationComplete={onComplete}
    >
      <div className="relative">
        <PPPokerChip 
          size={22} 
          bbValue={bbValue}
          showSymbol={false}
        />
      </div>
    </motion.div>
  );
});

export const WinnerChipCascade = memo(function WinnerChipCascade({
  isActive,
  fromPosition,
  toPosition,
  amount,
  onComplete
}: WinnerChipCascadeProps) {
  // Generate chips - simple array, all fly together
  const chips = useMemo(() => {
    if (!isActive) return [];
    
    // 5-8 chips based on amount
    const chipCount = amount >= 500 ? 8 : 5;
    
    return Array.from({ length: chipCount }, (_, i) => ({
      index: i,
      bbValue: getChipBBValue(Math.floor(i / 2))
    }));
  }, [isActive, amount]);

  let completedCount = 0;

  const handleChipComplete = () => {
    completedCount++;
    if (completedCount >= chips.length) {
      setTimeout(() => onComplete?.(), 100); // Small buffer after last chip
    }
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
      {/* Flying chips - all at once */}
      <AnimatePresence>
        {chips.map((chip) => (
          <FlyingChip
            key={`chip-${chip.index}`}
            index={chip.index}
            wave={0}
            totalInWave={chips.length}
            fromX={fromPosition.x}
            fromY={fromPosition.y}
            toX={toPosition.x}
            toY={toPosition.y}
            bbValue={chip.bbValue}
            onComplete={handleChipComplete}
          />
        ))}
      </AnimatePresence>

      {/* Floating amount */}
      <motion.div
        className="absolute pointer-events-none z-[10000]"
        style={{ 
          left: `${toPosition.x}%`, 
          top: `${toPosition.y}%`,
          transform: 'translate(-50%, -100%)'
        }}
        initial={{ y: 20, opacity: 0, scale: 0.8 }}
        animate={{ y: -35, opacity: [0, 1, 1, 0], scale: 1 }}
        transition={{ 
          duration: SHOWDOWN_TIMINGS.winnerCelebration / 1000, 
          delay: SHOWDOWN_TIMINGS.potSlideToWinner / 1000 * 0.5, 
          times: [0, 0.15, 0.75, 1] 
        }}
      >
        <div 
          className="px-2 py-0.5 rounded-md font-bold text-sm whitespace-nowrap"
          style={{
            background: 'linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(30,30,30,0.9) 100%)',
            color: '#fbbf24',
            textShadow: '0 0 8px rgba(251,191,36,0.5)',
            border: '1px solid rgba(251,191,36,0.25)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.4)'
          }}
        >
          +{amount.toLocaleString()}
        </div>
      </motion.div>

      {/* Winner glow */}
      <motion.div
        className="absolute pointer-events-none z-[9990]"
        style={{ 
          left: `${toPosition.x}%`, 
          top: `${toPosition.y}%`,
          transform: 'translate(-50%, -50%)'
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5], opacity: [0, 0.6, 0] }}
        transition={{ 
          duration: SHOWDOWN_TIMINGS.potCollection / 1000, 
          delay: SHOWDOWN_TIMINGS.potSlideToWinner / 1000 * 0.4 
        }}
      >
        <div
          className="w-16 h-16 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(251,191,36,0.5) 0%, transparent 70%)',
            filter: 'blur(8px)'
          }}
        />
      </motion.div>
    </div>
  );
});

export default WinnerChipCascade;
