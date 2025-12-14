// =====================================================
// PPPOKER-STYLE PREMIUM POKER CHIPS
// =====================================================
// High-quality chips with edge stripes, stacking effect,
// and casino-grade visual design matching PPPoker reference

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Chip denomination colors (PPPoker casino standard)
const CHIP_COLORS = {
  white: { 
    main: '#f5f5f5', 
    dark: '#d4d4d4', 
    edge: '#a3a3a3',
    stripe: '#ffffff',
    symbol: '#1a1a1a'
  },
  red: { 
    main: '#ef4444', 
    dark: '#b91c1c', 
    edge: '#7f1d1d',
    stripe: '#ffffff',
    symbol: '#ffffff'
  },
  green: { 
    main: '#22c55e', 
    dark: '#15803d', 
    edge: '#166534',
    stripe: '#ffffff',
    symbol: '#ffffff'
  },
  blue: { 
    main: '#3b82f6', 
    dark: '#1d4ed8', 
    edge: '#1e40af',
    stripe: '#ffffff',
    symbol: '#ffffff'
  },
  black: { 
    main: '#374151', 
    dark: '#1f2937', 
    edge: '#111827',
    stripe: '#9ca3af',
    symbol: '#ffffff'
  },
  purple: { 
    main: '#a855f7', 
    dark: '#7e22ce', 
    edge: '#6b21a8',
    stripe: '#ffffff',
    symbol: '#ffffff'
  },
  gold: { 
    main: '#fbbf24', 
    dark: '#d97706', 
    edge: '#b45309',
    stripe: '#ffffff',
    symbol: '#1a1a1a'
  },
  pink: { 
    main: '#ec4899', 
    dark: '#be185d', 
    edge: '#9d174d',
    stripe: '#ffffff',
    symbol: '#ffffff'
  }
};

type ChipColor = keyof typeof CHIP_COLORS;

// Get chip color based on BB value
const getChipColorByBB = (bbValue: number): ChipColor => {
  if (bbValue >= 100) return 'gold';
  if (bbValue >= 50) return 'purple';
  if (bbValue >= 20) return 'black';
  if (bbValue >= 10) return 'blue';
  if (bbValue >= 5) return 'green';
  if (bbValue >= 1) return 'red';
  return 'white';
};

interface PPPokerChipProps {
  size?: number;
  color?: ChipColor;
  bbValue?: number; // BB value to auto-select color
  showSymbol?: boolean;
  className?: string;
  animated?: boolean;
  delay?: number;
}

// Single PPPoker-style chip
export const PPPokerChip = memo(function PPPokerChip({
  size = 24,
  color,
  bbValue = 0,
  showSymbol = true,
  className,
  animated = true,
  delay = 0
}: PPPokerChipProps) {
  const chipColor = color || getChipColorByBB(bbValue);
  const colors = CHIP_COLORS[chipColor];
  
  const chipContent = (
    <div 
      className={cn("relative flex-shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {/* Chip SVG for perfect edge stripes */}
      <svg 
        viewBox="0 0 100 100" 
        className="absolute inset-0 w-full h-full"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
      >
        <defs>
          {/* Gradient for 3D effect */}
          <radialGradient id={`chipGrad-${chipColor}`} cx="35%" cy="35%" r="60%">
            <stop offset="0%" stopColor={colors.main} stopOpacity="1" />
            <stop offset="70%" stopColor={colors.dark} stopOpacity="1" />
            <stop offset="100%" stopColor={colors.edge} stopOpacity="1" />
          </radialGradient>
          
          {/* Inner circle gradient */}
          <radialGradient id={`innerGrad-${chipColor}`} cx="40%" cy="40%" r="50%">
            <stop offset="0%" stopColor={colors.main} stopOpacity="1" />
            <stop offset="100%" stopColor={colors.dark} stopOpacity="1" />
          </radialGradient>
        </defs>
        
        {/* Main chip body */}
        <circle 
          cx="50" 
          cy="50" 
          r="46" 
          fill={`url(#chipGrad-${chipColor})`}
          stroke={colors.edge}
          strokeWidth="2"
        />
        
        {/* Edge stripes - PPPoker style white rectangles */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * 45 - 90) * Math.PI / 180;
          const x1 = 50 + Math.cos(angle) * 35;
          const y1 = 50 + Math.sin(angle) * 35;
          const x2 = 50 + Math.cos(angle) * 46;
          const y2 = 50 + Math.sin(angle) * 46;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={colors.stripe}
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.95"
            />
          );
        })}
        
        {/* Inner circle border */}
        <circle 
          cx="50" 
          cy="50" 
          r="28" 
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
        
        {/* Inner circle with symbol */}
        <circle 
          cx="50" 
          cy="50" 
          r="26" 
          fill={`url(#innerGrad-${chipColor})`}
        />
        
        {/* Spade symbol */}
        {showSymbol && (
          <text
            x="50"
            y="58"
            textAnchor="middle"
            fontSize="28"
            fill={colors.symbol}
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
          >
            ♠
          </text>
        )}
        
        {/* Highlight reflection */}
        <ellipse
          cx="38"
          cy="38"
          rx="15"
          ry="10"
          fill="rgba(255,255,255,0.25)"
        />
      </svg>
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
          delay: delay
        }}
      >
        {chipContent}
      </motion.div>
    );
  }

  return chipContent;
});

// =====================================================
// STACKED CHIPS - PPPoker style with 3D stacking
// =====================================================
interface PPPokerChipStackProps {
  size?: number;
  color?: ChipColor;
  bbValue?: number;
  stackCount?: number; // Number of chips in stack (1-3)
  className?: string;
  animated?: boolean;
}

export const PPPokerChipStackVisual = memo(function PPPokerChipStackVisual({
  size = 24,
  color,
  bbValue = 0,
  stackCount = 2,
  className,
  animated = true
}: PPPokerChipStackProps) {
  const chipColor = color || getChipColorByBB(bbValue);
  const colors = CHIP_COLORS[chipColor];
  const count = Math.min(3, Math.max(1, stackCount));
  
  return (
    <div 
      className={cn("relative flex-shrink-0", className)}
      style={{ 
        width: size, 
        height: size + (count - 1) * 3 
      }}
    >
      {/* Stacked chips from bottom to top */}
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute left-0"
          style={{ 
            bottom: i * 3,
            zIndex: i
          }}
          initial={animated ? { scale: 0, opacity: 0, y: -10 } : false}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 25,
            delay: i * 0.03
          }}
        >
          {/* Shadow for depth */}
          {i > 0 && (
            <div 
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                top: 2,
                background: 'rgba(0,0,0,0.3)',
                filter: 'blur(1px)'
              }}
            />
          )}
          
          <PPPokerChip
            size={size}
            color={chipColor}
            showSymbol={i === count - 1} // Only show symbol on top chip
            animated={false}
          />
        </motion.div>
      ))}
    </div>
  );
});

// =====================================================
// POT CHIPS - Multiple colored chips for pot display
// =====================================================
interface PotChipsProps {
  amount: number;
  bigBlind?: number;
  size?: number;
  className?: string;
  animated?: boolean;
}

export const PotChips = memo(function PotChips({
  amount,
  bigBlind = 20,
  size = 22,
  className,
  animated = true
}: PotChipsProps) {
  const bbValue = bigBlind > 0 ? amount / bigBlind : amount;
  
  // Calculate which denominations to show
  const getChipBreakdown = (bb: number): { color: ChipColor; count: number }[] => {
    const chips: { color: ChipColor; count: number }[] = [];
    
    if (bb >= 100) chips.push({ color: 'gold', count: Math.min(2, Math.floor(bb / 100)) });
    if (bb >= 20) chips.push({ color: 'black', count: 1 });
    if (bb >= 5) chips.push({ color: 'green', count: 1 });
    if (bb >= 1) chips.push({ color: 'red', count: 1 });
    
    // Ensure at least one chip
    if (chips.length === 0) chips.push({ color: 'white', count: 1 });
    
    return chips.slice(0, 3); // Max 3 different colors
  };
  
  const chipBreakdown = getChipBreakdown(bbValue);

  return (
    <div className={cn("flex items-end -space-x-2", className)}>
      {chipBreakdown.map((chip, i) => (
        <motion.div
          key={`${chip.color}-${i}`}
          className="relative"
          style={{ 
            zIndex: chipBreakdown.length - i,
            marginBottom: i * 2 // Slight vertical offset for 3D
          }}
          initial={animated ? { scale: 0, y: -10 } : false}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <PPPokerChipStackVisual
            size={size}
            color={chip.color}
            stackCount={chip.count}
            animated={animated}
          />
        </motion.div>
      ))}
    </div>
  );
});

// Legacy exports for compatibility
export const RealisticPokerChip = PPPokerChip;
export const RealisticChipStack = PPPokerChipStackVisual;

export default PPPokerChip;
