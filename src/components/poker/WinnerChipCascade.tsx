/**
 * Premium Win Animation - Chips Cascade from Pot to Winner
 * Clean, direct trajectory animation
 */

import React, { memo, useMemo } from 'react';
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

// Single flying chip - DIRECT trajectory from pot to winner
const FlyingChip = memo(function FlyingChip({
  index,
  wave,
  totalInWave,
  fromX,
  fromY,
  toX,
  toY,
  bbValue,
  onComplete
}: SingleChipProps) {
  // Direct path from pot to winner
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  
  // Small spread at start (chips fan out slightly from pot center)
  const spreadAngle = ((index - (totalInWave - 1) / 2) / Math.max(totalInWave, 1)) * 0.3;
  const startSpreadX = spreadAngle * 1.5;
  const startSpreadY = (Math.random() - 0.5) * 0.8;
  
  // Timing - staggered by wave and chip index
  const waveDelay = wave * 0.1;
  const chipDelay = index * 0.03;
  const totalDelay = waveDelay + chipDelay;
  
  // Duration - 0.7s as requested
  const duration = 0.7;
  
  // Slight rotation during flight
  const rotation = (Math.random() - 0.5) * 25;
  
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ 
        left: `${fromX}%`, 
        top: `${fromY}%`,
        zIndex: 9999 + wave * 10 + index,
        transform: 'translate(-50%, -50%)'
      }}
      initial={{ 
        x: `${startSpreadX}vw`, 
        y: `${startSpreadY}vh`, 
        scale: 0.6, 
        opacity: 0
      }}
      animate={{
        // Direct path with very slight curve
        x: [
          `${startSpreadX}vw`,
          `${startSpreadX + deltaX * 0.55}vw`,
          `${deltaX}vw`
        ],
        y: [
          `${startSpreadY}vh`,
          `${startSpreadY + deltaY * 0.5 - 0.5}vh`,
          `${deltaY}vh`
        ],
        scale: [0.6, 0.9, 0.6],
        opacity: [0, 1, 1],
        rotate: [0, rotation * 0.6, rotation]
      }}
      transition={{
        duration,
        delay: totalDelay,
        ease: [0.4, 0, 0.2, 1],
        times: [0, 0.6, 1]
      }}
      onAnimationComplete={onComplete}
    >
      <motion.div 
        className="relative"
        animate={{ opacity: [1, 1, 0] }}
        transition={{ 
          duration: duration + 0.15, 
          delay: totalDelay,
          times: [0, 0.9, 1]
        }}
      >
        {/* Stack of 2 small chips */}
        {[0, 1].map((stackIdx) => (
          <div
            key={stackIdx}
            className="absolute"
            style={{
              bottom: stackIdx * 2,
              left: '50%',
              transform: 'translateX(-50%)',
              filter: stackIdx === 0 ? 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' : 'none'
            }}
          >
            <PPPokerChip 
              size={22} 
              bbValue={bbValue}
              showSymbol={false}
            />
          </div>
        ))}
        
        {/* Subtle glow */}
        <motion.div
          className="absolute w-2 h-2 rounded-full"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(251,191,36,0.6) 0%, transparent 70%)',
            filter: 'blur(1px)'
          }}
          animate={{ opacity: [0.6, 0.3, 0.1] }}
          transition={{ duration: duration * 0.6, delay: totalDelay }}
        />
      </motion.div>
    </motion.div>
  );
});

// Amount label floating to winner
const FloatingAmount = memo(function FloatingAmount({
  amount,
  fromX,
  fromY,
  toX,
  toY,
  delay
}: {
  amount: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  delay: number;
}) {
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  
  return (
    <motion.div
      className="absolute pointer-events-none z-[10000]"
      style={{ 
        left: `${fromX}%`, 
        top: `${fromY}%`,
        transform: 'translate(-50%, -50%)'
      }}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{
        x: [`0vw`, `${deltaX * 0.5}vw`, `${deltaX}vw`],
        y: [`0vh`, `${deltaY * 0.5 - 3}vh`, `${deltaY - 4}vh`],
        scale: [0.6, 1.1, 0.9],
        opacity: [0, 1, 0]
      }}
      transition={{
        duration: 0.8,
        delay: delay + 0.15,
        ease: "easeOut",
        times: [0, 0.5, 1]
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
  );
});

// Winner spotlight effect
const WinnerSpotlight = memo(function WinnerSpotlight({
  x,
  y,
  delay
}: {
  x: number;
  y: number;
  delay: number;
}) {
  return (
    <motion.div
      className="absolute pointer-events-none z-[9990]"
      style={{ 
        left: `${x}%`, 
        top: `${y}%`,
        transform: 'translate(-50%, -50%)'
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: [0, 1.2, 1.8],
        opacity: [0, 0.5, 0]
      }}
      transition={{
        duration: 0.7,
        delay: delay + 0.4,
        ease: "easeOut"
      }}
    >
      <div
        className="w-20 h-20 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, transparent 70%)',
          filter: 'blur(6px)'
        }}
      />
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
  // Generate waves of chips
  const chipWaves = useMemo(() => {
    if (!isActive) return [];
    
    // 1-2 waves, 4-6 chips per wave for cleaner look
    const waveCount = amount >= 1000 ? 2 : 1;
    const chipsPerWave = amount >= 500 ? 6 : 4;
    
    const waves: Array<{
      wave: number;
      chips: Array<{ index: number; bbValue: number }>;
    }> = [];
    
    for (let w = 0; w < waveCount; w++) {
      const chips = [];
      for (let c = 0; c < chipsPerWave; c++) {
        chips.push({ index: c, bbValue: getChipBBValue(w) });
      }
      waves.push({ wave: w, chips });
    }
    
    return waves;
  }, [isActive, amount]);

  const totalChips = chipWaves.reduce((acc, w) => acc + w.chips.length, 0);
  let completedCount = 0;

  const handleChipComplete = () => {
    completedCount++;
    if (completedCount >= totalChips) {
      setTimeout(() => onComplete?.(), 200);
    }
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
      {/* Initial pot glow */}
      <motion.div
        className="absolute z-[9990]"
        style={{ 
          left: `${fromPosition.x}%`, 
          top: `${fromPosition.y}%`,
          transform: 'translate(-50%, -50%)'
        }}
        initial={{ scale: 1, opacity: 0.7 }}
        animate={{ 
          scale: [1, 1.3, 0.5],
          opacity: [0.7, 0.3, 0]
        }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div
          className="w-16 h-16 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(251,191,36,0.5) 0%, transparent 70%)',
            filter: 'blur(6px)'
          }}
        />
      </motion.div>

      {/* Flying chips */}
      <AnimatePresence>
        {chipWaves.map(({ wave, chips }) => 
          chips.map((chip) => (
            <FlyingChip
              key={`wave-${wave}-chip-${chip.index}`}
              index={chip.index}
              wave={wave}
              totalInWave={chips.length}
              fromX={fromPosition.x}
              fromY={fromPosition.y}
              toX={toPosition.x}
              toY={toPosition.y}
              bbValue={chip.bbValue}
              onComplete={handleChipComplete}
            />
          ))
        )}
      </AnimatePresence>

      {/* Floating amount */}
      <FloatingAmount
        amount={amount}
        fromX={fromPosition.x}
        fromY={fromPosition.y}
        toX={toPosition.x}
        toY={toPosition.y}
        delay={0.2}
      />

      {/* Winner spotlight */}
      <WinnerSpotlight
        x={toPosition.x}
        y={toPosition.y}
        delay={0.3}
      />
    </div>
  );
});

export default WinnerChipCascade;
