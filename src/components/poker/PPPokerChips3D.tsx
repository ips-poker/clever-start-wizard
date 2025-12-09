// =====================================================
// PPPOKER-STYLE 3D CHIP STACK
// =====================================================
// Realistic 3D poker chips with stacking and animations

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PPPokerChips3DProps {
  amount: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
  maxChips?: number;
}

// PPPoker chip colors based on denomination
const CHIP_COLORS = [
  { 
    threshold: 0, 
    primary: '#4b5563', 
    secondary: '#374151', 
    accent: '#6b7280',
    label: 'gray'
  },
  { 
    threshold: 100, 
    primary: '#3b82f6', 
    secondary: '#2563eb', 
    accent: '#60a5fa',
    label: 'blue'
  },
  { 
    threshold: 500, 
    primary: '#22c55e', 
    secondary: '#16a34a', 
    accent: '#4ade80',
    label: 'green'
  },
  { 
    threshold: 1000, 
    primary: '#ef4444', 
    secondary: '#dc2626', 
    accent: '#f87171',
    label: 'red'
  },
  { 
    threshold: 5000, 
    primary: '#1f2937', 
    secondary: '#111827', 
    accent: '#374151',
    label: 'black'
  },
  { 
    threshold: 10000, 
    primary: '#a855f7', 
    secondary: '#9333ea', 
    accent: '#c084fc',
    label: 'purple'
  },
  { 
    threshold: 50000, 
    primary: '#f59e0b', 
    secondary: '#d97706', 
    accent: '#fbbf24',
    label: 'gold'
  },
];

function getChipColor(amount: number) {
  for (let i = CHIP_COLORS.length - 1; i >= 0; i--) {
    if (amount >= CHIP_COLORS[i].threshold) {
      return CHIP_COLORS[i];
    }
  }
  return CHIP_COLORS[0];
}

function formatChipAmount(amount: number): string {
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(1) + 'M';
  }
  if (amount >= 1000) {
    return (amount / 1000).toFixed(1) + 'K';
  }
  return amount.toLocaleString();
}

const SIZE_CONFIG = {
  xs: { chipSize: 16, stackHeight: 2, fontSize: '9px', labelPadding: 'px-1.5 py-0.5' },
  sm: { chipSize: 20, stackHeight: 2.5, fontSize: '10px', labelPadding: 'px-2 py-0.5' },
  md: { chipSize: 26, stackHeight: 3, fontSize: '11px', labelPadding: 'px-2.5 py-1' },
  lg: { chipSize: 32, stackHeight: 4, fontSize: '13px', labelPadding: 'px-3 py-1' }
};

// Single 3D chip
const Chip3D = memo(function Chip3D({
  size,
  color,
  stackIndex = 0,
  animated = false
}: {
  size: number;
  color: { primary: string; secondary: string; accent: string };
  stackIndex?: number;
  animated?: boolean;
}) {
  const yOffset = -(stackIndex * (size * 0.12));
  
  return (
    <motion.div
      initial={animated ? { scale: 0, y: 20, opacity: 0 } : false}
      animate={animated ? { scale: 1, y: yOffset, opacity: 1 } : { y: yOffset }}
      transition={{ 
        delay: stackIndex * 0.03, 
        type: 'spring', 
        stiffness: 400, 
        damping: 25 
      }}
      className="absolute"
      style={{
        width: size,
        height: size * 0.7,
        bottom: 0,
        left: '50%',
        transform: `translateX(-50%) translateY(${yOffset}px)`
      }}
    >
      {/* Chip side (3D effect) */}
      <div
        className="absolute inset-x-0 bottom-0 rounded-sm"
        style={{
          height: size * 0.15,
          background: `linear-gradient(180deg, ${color.secondary} 0%, ${color.primary} 50%, ${color.secondary} 100%)`,
          boxShadow: `0 2px 4px rgba(0,0,0,0.4)`
        }}
      />
      
      {/* Chip face (top) */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          background: `radial-gradient(ellipse at 30% 30%, ${color.accent} 0%, ${color.primary} 50%, ${color.secondary} 100%)`,
          boxShadow: `inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.3)`,
          border: `2px solid ${color.accent}`
        }}
      >
        {/* Inner ring pattern like real chips */}
        <div
          className="absolute inset-[15%] rounded-full"
          style={{
            border: `1.5px dashed ${color.accent}`,
            opacity: 0.6
          }}
        />
        
        {/* Center highlight */}
        <div
          className="absolute inset-[25%] rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)`
          }}
        />
      </div>
    </motion.div>
  );
});

export const PPPokerChips3D = memo(function PPPokerChips3D({
  amount,
  size = 'sm',
  showLabel = true,
  animated = true,
  maxChips = 5
}: PPPokerChips3DProps) {
  const config = SIZE_CONFIG[size];
  const chipColor = useMemo(() => getChipColor(amount), [amount]);
  
  // Calculate number of chips to show based on amount
  const chipCount = useMemo(() => {
    if (amount <= 0) return 0;
    if (amount < 50) return 1;
    if (amount < 200) return 2;
    if (amount < 500) return 3;
    if (amount < 1000) return 4;
    return maxChips;
  }, [amount, maxChips]);

  if (amount <= 0) return null;

  return (
    <div className="relative flex flex-col items-center">
      {/* Chip stack */}
      <div 
        className="relative"
        style={{ 
          width: config.chipSize, 
          height: config.chipSize + (chipCount * config.stackHeight * 2)
        }}
      >
        {Array.from({ length: chipCount }).map((_, index) => (
          <Chip3D
            key={index}
            size={config.chipSize}
            color={chipColor}
            stackIndex={index}
            animated={animated}
          />
        ))}
      </div>
      
      {/* Amount label */}
      {showLabel && (
        <motion.div
          initial={animated ? { opacity: 0, scale: 0.8 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: chipCount * 0.03 + 0.1 }}
          className={cn(
            "mt-1 rounded-full font-bold text-white shadow-lg",
            config.labelPadding
          )}
          style={{
            fontSize: config.fontSize,
            background: 'linear-gradient(135deg, rgba(0,0,0,0.85), rgba(20,20,20,0.95))',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
          }}
        >
          {formatChipAmount(amount)}
        </motion.div>
      )}
    </div>
  );
});

// =====================================================
// SIMPLE BET DISPLAY (PPPoker style)
// =====================================================
export const PPPokerBetDisplay = memo(function PPPokerBetDisplay({
  amount,
  position,
  animated = true
}: {
  amount: number;
  position: { x: number; y: number };
  animated?: boolean;
}) {
  if (!amount || amount <= 0) return null;
  
  // Calculate position towards table center
  const centerX = 50;
  const centerY = 42;
  const dx = centerX - position.x;
  const dy = centerY - position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const offsetX = distance > 0 ? (dx / distance) * 22 : 0;
  const offsetY = distance > 0 ? (dy / distance) * 22 : 0;

  return (
    <motion.div
      initial={animated ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      className="absolute z-15 pointer-events-none"
      style={{
        left: `${position.x + offsetX}%`,
        top: `${position.y + offsetY}%`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <PPPokerChips3D amount={amount} size="sm" showLabel={true} animated={animated} />
    </motion.div>
  );
});

export default PPPokerChips3D;
