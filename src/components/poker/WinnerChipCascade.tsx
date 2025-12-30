/**
 * Premium Win Animation - Chips Cascade to Winner
 * Professional-grade chip flying animation with waves, arcs, and effects
 */

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WinnerChipCascadeProps {
  isActive: boolean;
  fromPosition: { x: number; y: number }; // Pot position (%)
  toPosition: { x: number; y: number };   // Winner position (%)
  amount: number;
  onComplete?: () => void;
}

// Chip denomination colors matching casino standards
const CHIP_COLORS = [
  { min: 0, bg: '#ffffff', border: '#c0c0c0', label: '1' },
  { min: 5, bg: '#ef4444', border: '#b91c1c', label: '5' },
  { min: 25, bg: '#22c55e', border: '#15803d', label: '25' },
  { min: 100, bg: '#1e1e1e', border: '#404040', label: '100' },
  { min: 500, bg: '#8b5cf6', border: '#6d28d9', label: '500' },
  { min: 1000, bg: '#f59e0b', border: '#d97706', label: '1K' },
  { min: 5000, bg: '#ec4899', border: '#be185d', label: '5K' },
  { min: 25000, bg: '#06b6d4', border: '#0891b2', label: '25K' },
];

const getChipColor = (value: number) => {
  for (let i = CHIP_COLORS.length - 1; i >= 0; i--) {
    if (value >= CHIP_COLORS[i].min) {
      return CHIP_COLORS[i];
    }
  }
  return CHIP_COLORS[0];
};

interface SingleChipProps {
  index: number;
  wave: number;
  totalInWave: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  chipValue: number;
  onComplete?: () => void;
}

// Single flying chip with arc trajectory
const FlyingChip = memo(function FlyingChip({
  index,
  wave,
  totalInWave,
  fromX,
  fromY,
  toX,
  toY,
  chipValue,
  onComplete
}: SingleChipProps) {
  const chipColor = getChipColor(chipValue);
  
  // Calculate arc trajectory
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
  // Arc height based on distance
  const arcHeight = Math.min(distance * 0.4, 25);
  
  // Spread chips within wave
  const spreadX = (index - (totalInWave - 1) / 2) * 8;
  const spreadY = (Math.random() - 0.5) * 6;
  
  // Timing
  const waveDelay = wave * 0.15;
  const chipDelay = index * 0.03;
  const totalDelay = waveDelay + chipDelay;
  
  // Duration varies slightly for natural feel
  const duration = 0.6 + Math.random() * 0.15;
  
  // Rotation for tumbling effect
  const rotation = (Math.random() - 0.5) * 360;
  
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ 
        left: `${fromX}%`, 
        top: `${fromY}%`,
        zIndex: 60 + wave
      }}
      initial={{ 
        x: spreadX, 
        y: spreadY, 
        scale: 1.2, 
        opacity: 1,
        rotate: 0 
      }}
      animate={{
        x: [
          spreadX,
          spreadX + deltaX * 0.3,
          spreadX + deltaX * 0.6,
          (toX - fromX) * (100 / window.innerWidth) * window.innerWidth / 100 + spreadX
        ],
        y: [
          spreadY,
          spreadY - arcHeight,
          spreadY - arcHeight * 0.5,
          (toY - fromY) * (100 / window.innerHeight) * window.innerHeight / 100 + spreadY
        ],
        scale: [1.2, 1.1, 1, 0.9],
        opacity: [1, 1, 1, 0],
        rotate: [0, rotation * 0.3, rotation * 0.7, rotation]
      }}
      transition={{
        duration,
        delay: totalDelay,
        ease: [0.34, 1.56, 0.64, 1], // Bounce-out easing
        times: [0, 0.3, 0.7, 1]
      }}
      onAnimationComplete={onComplete}
    >
      <div 
        className="relative"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        {/* Chip stack (2-3 chips) */}
        {[0, 1, 2].slice(0, 2 + (wave % 2)).map((stackIdx) => (
          <div
            key={stackIdx}
            className="absolute rounded-full"
            style={{
              width: 20,
              height: 20,
              bottom: stackIdx * 3,
              left: '50%',
              transform: 'translateX(-50%)',
              background: `radial-gradient(circle at 30% 30%, ${chipColor.bg} 0%, ${chipColor.bg}dd 50%, ${chipColor.border} 100%)`,
              border: `2px solid ${chipColor.border}`,
              boxShadow: `
                inset 0 2px 4px rgba(255,255,255,0.4),
                inset 0 -2px 4px rgba(0,0,0,0.2),
                0 ${stackIdx + 2}px ${4 + stackIdx}px rgba(0,0,0,0.3)
              `
            }}
          >
            {/* Chip edge pattern */}
            <div 
              className="absolute inset-0 rounded-full opacity-40"
              style={{
                background: `repeating-conic-gradient(
                  from 0deg,
                  transparent 0deg 20deg,
                  ${chipColor.border}44 20deg 40deg
                )`
              }}
            />
            {/* Center circle */}
            <div 
              className="absolute inset-1.5 rounded-full"
              style={{
                background: `radial-gradient(circle, ${chipColor.bg} 0%, ${chipColor.bg}cc 100%)`,
                border: `1px solid ${chipColor.border}55`
              }}
            />
          </div>
        ))}
        
        {/* Sparkle trail */}
        <motion.div
          className="absolute w-3 h-3 rounded-full"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(251,191,36,0.8) 0%, transparent 70%)',
            filter: 'blur(2px)'
          }}
          animate={{
            opacity: [0.8, 0.4, 0],
            scale: [0.5, 1.5, 0.5]
          }}
          transition={{
            duration: 0.3,
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
  // Generate waves of chips
  const chipWaves = useMemo(() => {
    if (!isActive) return [];
    
    // Number of waves based on pot size
    const waveCount = amount >= 10000 ? 4 : amount >= 1000 ? 3 : 2;
    const chipsPerWave = amount >= 5000 ? 5 : amount >= 500 ? 4 : 3;
    
    const waves: Array<{
      wave: number;
      chips: Array<{ index: number; value: number }>;
    }> = [];
    
    // Distribute chip values across waves (higher values in later waves)
    const baseValue = Math.floor(amount / (waveCount * chipsPerWave));
    
    for (let w = 0; w < waveCount; w++) {
      const chips = [];
      for (let c = 0; c < chipsPerWave; c++) {
        // Higher wave = higher denomination chips
        const chipValue = baseValue * (1 + w * 0.5);
        chips.push({ index: c, value: Math.floor(chipValue) });
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
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
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
              chipValue={chip.value}
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