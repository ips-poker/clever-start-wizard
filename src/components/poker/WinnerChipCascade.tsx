/**
 * Premium Win Animation - Chips Cascade to Winner
 * Uses the same PPPokerChip component as the table
 */

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PPPokerChip } from './RealisticPokerChip';

interface WinnerChipCascadeProps {
  isActive: boolean;
  fromPosition: { x: number; y: number }; // Pot position (%)
  toPosition: { x: number; y: number };   // Winner position (%)
  amount: number;
  bigBlind?: number; // For chip color calculation
  onComplete?: () => void;
}

// Chip BB values for cascading - matches table chip denominations
const CHIP_BB_VALUES = [1, 5, 10, 20, 50, 100] as const;

const getChipBBValue = (index: number, totalWaves: number): number => {
  // Later waves have higher value chips
  const baseIndex = Math.min(index, CHIP_BB_VALUES.length - 1);
  return CHIP_BB_VALUES[baseIndex];
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

// Single flying chip with arc trajectory - uses PPPokerChip
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
  // Calculate arc trajectory
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
  // Arc height based on distance
  const arcHeight = Math.min(distance * 0.4, 25);
  
  // Spread chips within wave
  const spreadX = (index - (totalInWave - 1) / 2) * 12;
  const spreadY = (Math.random() - 0.5) * 8;
  
  // Timing
  const waveDelay = wave * 0.18;
  const chipDelay = index * 0.04;
  const totalDelay = waveDelay + chipDelay;
  
  // Duration varies slightly for natural feel
  const duration = 0.7 + Math.random() * 0.2;
  
  // Rotation for tumbling effect
  const rotation = (Math.random() - 0.5) * 180;
  
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ 
        left: `${fromX}%`, 
        top: `${fromY}%`,
        zIndex: 9999 + wave
      }}
      initial={{ 
        x: spreadX, 
        y: spreadY, 
        scale: 1.3, 
        opacity: 1,
        rotate: 0 
      }}
      animate={{
        x: [
          spreadX,
          spreadX + deltaX * 0.3,
          spreadX + deltaX * 0.7,
          (toX - fromX) / 100 * window.innerWidth + spreadX
        ],
        y: [
          spreadY,
          spreadY - arcHeight * 1.5,
          spreadY - arcHeight * 0.5,
          (toY - fromY) / 100 * window.innerHeight + spreadY
        ],
        scale: [1.3, 1.2, 1, 0.8],
        opacity: [1, 1, 1, 0],
        rotate: [0, rotation * 0.4, rotation * 0.8, rotation]
      }}
      transition={{
        duration,
        delay: totalDelay,
        ease: [0.34, 1.56, 0.64, 1],
        times: [0, 0.3, 0.7, 1]
      }}
      onAnimationComplete={onComplete}
    >
      <div 
        className="relative"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        {/* Stack of PPPokerChips (2-3 chips based on wave) */}
        {[0, 1, 2].slice(0, 2 + (wave % 2)).map((stackIdx) => (
          <div
            key={stackIdx}
            className="absolute"
            style={{
              bottom: stackIdx * 4,
              left: '50%',
              transform: 'translateX(-50%)',
              filter: stackIdx === 0 ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))' : 'none'
            }}
          >
            <PPPokerChip 
              size={28} 
              bbValue={bbValue}
              showSymbol={stackIdx === 0}
            />
          </div>
        ))}
        
        {/* Sparkle trail */}
        <motion.div
          className="absolute w-4 h-4 rounded-full"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(251,191,36,0.9) 0%, transparent 70%)',
            filter: 'blur(3px)'
          }}
          animate={{
            opacity: [0.9, 0.5, 0],
            scale: [0.5, 2, 0.5]
          }}
          transition={{
            duration: 0.35,
            delay: totalDelay + 0.1,
            repeat: 2
          }}
        />
      </div>
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
  return (
    <motion.div
      className="absolute pointer-events-none z-70"
      style={{ 
        left: `${fromX}%`, 
        top: `${fromY}%` 
      }}
      initial={{ 
        scale: 0.5, 
        opacity: 0 
      }}
      animate={{
        x: [`0%`, `${(toX - fromX) * 0.5}%`, `${toX - fromX}%`],
        y: [`0%`, `${(toY - fromY) * 0.3 - 10}%`, `${toY - fromY - 5}%`],
        scale: [0.5, 1.3, 1],
        opacity: [0, 1, 0]
      }}
      transition={{
        duration: 1.2,
        delay: delay + 0.2,
        ease: "easeOut"
      }}
    >
      <div 
        className="px-3 py-1 rounded-lg font-bold text-lg whitespace-nowrap"
        style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(30,30,30,0.95) 100%)',
          color: '#fbbf24',
          textShadow: '0 0 10px rgba(251,191,36,0.6)',
          border: '1px solid rgba(251,191,36,0.3)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 30px rgba(251,191,36,0.2)',
          transform: 'translate(-50%, -50%)'
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
      className="absolute pointer-events-none z-55"
      style={{ 
        left: `${x}%`, 
        top: `${y}%`,
        transform: 'translate(-50%, -50%)'
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: [0, 1.5, 2, 2.5],
        opacity: [0, 0.6, 0.4, 0]
      }}
      transition={{
        duration: 1,
        delay: delay + 0.5,
        ease: "easeOut"
      }}
    >
      <div
        className="w-32 h-32 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(251,191,36,0.5) 0%, rgba(251,191,36,0.2) 40%, transparent 70%)',
          filter: 'blur(8px)'
        }}
      />
    </motion.div>
  );
});

// Particle burst on landing
const ParticleBurst = memo(function ParticleBurst({
  x,
  y,
  delay
}: {
  x: number;
  y: number;
  delay: number;
}) {
  const particles = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => ({
      angle: (i / 12) * Math.PI * 2,
      distance: 30 + Math.random() * 20,
      size: 3 + Math.random() * 3,
      duration: 0.5 + Math.random() * 0.3
    })), 
  []);

  return (
    <>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none z-65 rounded-full"
          style={{ 
            left: `${x}%`, 
            top: `${y}%`,
            width: p.size,
            height: p.size,
            background: i % 3 === 0 
              ? '#fbbf24' 
              : i % 3 === 1 
                ? '#f59e0b' 
                : '#fef3c7',
            boxShadow: '0 0 6px rgba(251,191,36,0.8)',
            transform: 'translate(-50%, -50%)'
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
            scale: [0, 1, 0],
            opacity: [1, 1, 0]
          }}
          transition={{
            duration: p.duration,
            delay: delay + 0.6,
            ease: "easeOut"
          }}
        />
      ))}
    </>
  );
});

export const WinnerChipCascade = memo(function WinnerChipCascade({
  isActive,
  fromPosition,
  toPosition,
  amount,
  onComplete
}: WinnerChipCascadeProps) {
  // Generate waves of chips with BB values
  const chipWaves = useMemo(() => {
    if (!isActive) return [];
    
    // Number of waves based on pot size
    const waveCount = amount >= 10000 ? 4 : amount >= 1000 ? 3 : 2;
    const chipsPerWave = amount >= 5000 ? 5 : amount >= 500 ? 4 : 3;
    
    const waves: Array<{
      wave: number;
      chips: Array<{ index: number; bbValue: number }>;
    }> = [];
    
    for (let w = 0; w < waveCount; w++) {
      const chips = [];
      for (let c = 0; c < chipsPerWave; c++) {
        // Higher wave = higher denomination chips (using BB values)
        const bbValue = getChipBBValue(w, waveCount);
        chips.push({ index: c, bbValue });
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
      setTimeout(() => onComplete?.(), 300);
    }
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
      {/* Central glow pulse */}
      <motion.div
        className="absolute z-50"
        style={{ 
          left: `${fromPosition.x}%`, 
          top: `${fromPosition.y}%`,
          transform: 'translate(-50%, -50%)'
        }}
        initial={{ scale: 1, opacity: 0.8 }}
        animate={{ 
          scale: [1, 1.5, 0.5],
          opacity: [0.8, 0.4, 0]
        }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div
          className="w-24 h-24 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(251,191,36,0.6) 0%, transparent 70%)',
            filter: 'blur(10px)'
          }}
        />
      </motion.div>

      {/* Flying chips in waves */}
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

      {/* Floating amount display */}
      <FloatingAmount
        amount={amount}
        fromX={fromPosition.x}
        fromY={fromPosition.y}
        toX={toPosition.x}
        toY={toPosition.y}
        delay={0.3}
      />

      {/* Winner spotlight */}
      <WinnerSpotlight
        x={toPosition.x}
        y={toPosition.y}
        delay={0.4}
      />

      {/* Particle burst at landing */}
      <ParticleBurst
        x={toPosition.x}
        y={toPosition.y}
        delay={0.5}
      />
    </div>
  );
});

export default WinnerChipCascade;