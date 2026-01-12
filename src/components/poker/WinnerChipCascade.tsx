/**
 * Premium Win Animation - Chips Cascade from Pot to Winner
 * Clean, direct trajectory animation
 */

import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PPPokerChip } from './RealisticPokerChip';

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
        scale: [1, 1, 0.8],
        opacity: [1, 1, 0]
      }}
      transition={{
        duration: 0.6,
        delay,
        ease: "easeOut",
        times: [0, 0.7, 1]
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

  const completedChipIndexesRef = useRef<Set<number>>(new Set());
  const completeTimeoutRef = useRef<number | null>(null);

  // Reset completion tracking whenever we (re)start the animation
  useEffect(() => {
    completedChipIndexesRef.current = new Set();
    if (completeTimeoutRef.current !== null) {
      window.clearTimeout(completeTimeoutRef.current);
      completeTimeoutRef.current = null;
    }
  }, [isActive, chips.length, amount]);

  const handleChipComplete = useCallback((chipIndex: number) => {
    const completed = completedChipIndexesRef.current;
    if (completed.has(chipIndex)) return;
    completed.add(chipIndex);

    if (completed.size >= chips.length) {
      if (completeTimeoutRef.current !== null) {
        window.clearTimeout(completeTimeoutRef.current);
      }
      completeTimeoutRef.current = window.setTimeout(() => {
        onComplete?.();
      }, 100);
    }
  }, [chips.length, onComplete]);

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
            onComplete={() => handleChipComplete(chip.index)}
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
        animate={{ y: -30, opacity: [0, 1, 1, 0], scale: 1 }}
        transition={{ duration: 1.2, delay: 0.4, times: [0, 0.2, 0.7, 1] }}
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
        transition={{ duration: 0.6, delay: 0.5 }}
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
