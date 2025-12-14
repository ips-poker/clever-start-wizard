// =====================================================
// PPPOKER-STYLE PREMIUM 3D POKER CHIPS
// =====================================================
// Perfect round chips with 3D stacking offset effect,
// edge stripes, and casino-grade visual design

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Chip denomination colors (PPPoker casino standard)
const CHIP_COLORS = {
  white: { 
    main: '#f5f5f5', 
    light: '#ffffff',
    dark: '#d4d4d4', 
    edge: '#a3a3a3',
    stripe: '#e5e5e5',
    symbol: '#374151'
  },
  red: { 
    main: '#ef4444', 
    light: '#fca5a5',
    dark: '#dc2626', 
    edge: '#991b1b',
    stripe: '#ffffff',
    symbol: '#ffffff'
  },
  green: { 
    main: '#22c55e', 
    light: '#86efac',
    dark: '#16a34a', 
    edge: '#15803d',
    stripe: '#ffffff',
    symbol: '#ffffff'
  },
  blue: { 
    main: '#3b82f6', 
    light: '#93c5fd',
    dark: '#2563eb', 
    edge: '#1d4ed8',
    stripe: '#ffffff',
    symbol: '#ffffff'
  },
  black: { 
    main: '#374151', 
    light: '#6b7280',
    dark: '#1f2937', 
    edge: '#111827',
    stripe: '#9ca3af',
    symbol: '#ffffff'
  },
  purple: { 
    main: '#a855f7', 
    light: '#d8b4fe',
    dark: '#9333ea', 
    edge: '#7e22ce',
    stripe: '#ffffff',
    symbol: '#ffffff'
  },
  gold: { 
    main: '#fbbf24', 
    light: '#fde68a',
    dark: '#f59e0b', 
    edge: '#d97706',
    stripe: '#ffffff',
    symbol: '#1f2937'
  },
  pink: { 
    main: '#ec4899', 
    light: '#f9a8d4',
    dark: '#db2777', 
    edge: '#be185d',
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
  bbValue?: number;
  showSymbol?: boolean;
  className?: string;
}

// Single PPPoker-style 3D chip - pure CSS/SVG for perfect round shape
export const PPPokerChip = memo(function PPPokerChip({
  size = 24,
  color,
  bbValue = 0,
  showSymbol = true,
  className
}: PPPokerChipProps) {
  const chipColor = color || getChipColorByBB(bbValue);
  const colors = CHIP_COLORS[chipColor];
  const id = `chip-${chipColor}-${Math.random().toString(36).slice(2, 8)}`;
  
  return (
    <div 
      className={cn("relative flex-shrink-0 rounded-full", className)}
      style={{ 
        width: size, 
        height: size,
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
      }}
    >
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
      >
        <defs>
          {/* Main chip gradient - 3D lighting effect */}
          <radialGradient id={`main-${id}`} cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={colors.light} />
            <stop offset="40%" stopColor={colors.main} />
            <stop offset="90%" stopColor={colors.dark} />
            <stop offset="100%" stopColor={colors.edge} />
          </radialGradient>
          
          {/* Inner circle gradient */}
          <radialGradient id={`inner-${id}`} cx="35%" cy="35%" r="60%">
            <stop offset="0%" stopColor={colors.main} />
            <stop offset="100%" stopColor={colors.dark} />
          </radialGradient>
        </defs>
        
        {/* Main chip body - perfect circle */}
        <circle 
          cx="50" 
          cy="50" 
          r="48" 
          fill={`url(#main-${id})`}
        />
        
        {/* Edge border */}
        <circle 
          cx="50" 
          cy="50" 
          r="47" 
          fill="none"
          stroke={colors.edge}
          strokeWidth="2"
        />
        
        {/* Edge stripes - 8 white segments */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * 45) * Math.PI / 180;
          const x1 = 50 + Math.cos(angle) * 36;
          const y1 = 50 + Math.sin(angle) * 36;
          const x2 = 50 + Math.cos(angle) * 47;
          const y2 = 50 + Math.sin(angle) * 47;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={colors.stripe}
              strokeWidth="7"
              strokeLinecap="round"
            />
          );
        })}
        
        {/* Inner circle */}
        <circle 
          cx="50" 
          cy="50" 
          r="30" 
          fill={`url(#inner-${id})`}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />
        
        {/* Spade symbol in center */}
        {showSymbol && (
          <text
            x="50"
            y="58"
            textAnchor="middle"
            fontSize="26"
            fontWeight="bold"
            fill={colors.symbol}
          >
            ♠
          </text>
        )}
        
        {/* Top highlight reflection */}
        <ellipse
          cx="38"
          cy="35"
          rx="18"
          ry="12"
          fill="rgba(255,255,255,0.3)"
        />
      </svg>
    </div>
  );
});

// =====================================================
// 3D STACKED CHIPS - with offset for depth illusion
// =====================================================
interface PPPokerChipStackProps {
  size?: number;
  color?: ChipColor;
  bbValue?: number;
  stackCount?: number;
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
  const count = Math.min(3, Math.max(1, stackCount));
  const stackOffset = 3; // Vertical offset per chip
  
  const content = (
    <div 
      className={cn("relative flex-shrink-0", className)}
      style={{ 
        width: size, 
        height: size + (count - 1) * stackOffset
      }}
    >
      {/* Render chips from bottom to top */}
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{ 
            left: 0,
            bottom: i * stackOffset,
            zIndex: i
          }}
        >
          {/* Edge shadow visible between stacked chips */}
          {i > 0 && (
            <div 
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                top: 2,
                left: 0,
                background: 'rgba(0,0,0,0.25)',
                filter: 'blur(1px)'
              }}
            />
          )}
          
          <PPPokerChip
            size={size}
            color={chipColor}
            showSymbol={i === count - 1}
          />
        </div>
      ))}
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0, y: -8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25
        }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
});

// =====================================================
// POT CHIPS - Multiple stacked chip colors for pot
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
  // Calculate BB value
  const bbValue = bigBlind > 0 ? amount / bigBlind : amount / 20;
  
  // Build chip breakdown based on pot size
  const getChipBreakdown = (bb: number): { color: ChipColor; stack: number }[] => {
    const chips: { color: ChipColor; stack: number }[] = [];
    
    // Add chips based on pot size
    if (bb >= 100) {
      chips.push({ color: 'gold', stack: 2 });
    }
    if (bb >= 50) {
      chips.push({ color: 'purple', stack: bb >= 100 ? 1 : 2 });
    }
    if (bb >= 20) {
      chips.push({ color: 'black', stack: 1 });
    }
    if (bb >= 10) {
      chips.push({ color: 'blue', stack: 1 });
    }
    if (bb >= 5) {
      chips.push({ color: 'green', stack: 1 });
    }
    if (bb >= 1 || chips.length === 0) {
      chips.push({ color: 'red', stack: chips.length === 0 ? 2 : 1 });
    }
    
    // Return max 4 different chip colors
    return chips.slice(0, 4);
  };
  
  const chipBreakdown = getChipBreakdown(bbValue);

  return (
    <motion.div 
      className={cn("flex items-end", className)}
      style={{ gap: -size * 0.3 }}
      initial={animated ? { scale: 0 } : false}
      animate={{ scale: 1 }}
    >
      {chipBreakdown.map((chip, i) => (
        <motion.div
          key={`pot-${chip.color}-${i}`}
          className="relative"
          style={{ 
            zIndex: chipBreakdown.length - i,
            marginTop: i * 2
          }}
          initial={animated ? { y: -15, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: i * 0.04 }}
        >
          <PPPokerChipStackVisual
            size={size}
            color={chip.color}
            stackCount={chip.stack}
            animated={false}
          />
        </motion.div>
      ))}
    </motion.div>
  );
});

// Legacy exports for compatibility
export const RealisticPokerChip = PPPokerChip;
export const RealisticChipStack = PPPokerChipStackVisual;

export default PPPokerChip;
