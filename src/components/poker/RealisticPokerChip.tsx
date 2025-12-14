// =====================================================
// PREMIUM 3D POKER CHIPS WITH EDGE INSERTS
// =====================================================
// Casino-grade chips with 3D depth, metallic edge inserts,
// glossy surface, and realistic stacking effects

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Premium chip colors with metallic variations
const CHIP_COLORS = {
  white: { 
    main: '#f8fafc', 
    light: '#ffffff',
    dark: '#e2e8f0', 
    edge: '#cbd5e1',
    insert: '#94a3b8',
    insertLight: '#e2e8f0',
    symbol: '#1e293b',
    glow: 'rgba(248,250,252,0.4)'
  },
  red: { 
    main: '#ef4444', 
    light: '#fca5a5',
    dark: '#dc2626', 
    edge: '#b91c1c',
    insert: '#ffffff',
    insertLight: '#fecaca',
    symbol: '#ffffff',
    glow: 'rgba(239,68,68,0.4)'
  },
  green: { 
    main: '#22c55e', 
    light: '#86efac',
    dark: '#16a34a', 
    edge: '#15803d',
    insert: '#ffffff',
    insertLight: '#bbf7d0',
    symbol: '#ffffff',
    glow: 'rgba(34,197,94,0.4)'
  },
  blue: { 
    main: '#3b82f6', 
    light: '#93c5fd',
    dark: '#2563eb', 
    edge: '#1d4ed8',
    insert: '#ffffff',
    insertLight: '#bfdbfe',
    symbol: '#ffffff',
    glow: 'rgba(59,130,246,0.4)'
  },
  black: { 
    main: '#1f2937', 
    light: '#4b5563',
    dark: '#111827', 
    edge: '#030712',
    insert: '#9ca3af',
    insertLight: '#6b7280',
    symbol: '#ffffff',
    glow: 'rgba(31,41,55,0.4)'
  },
  purple: { 
    main: '#a855f7', 
    light: '#d8b4fe',
    dark: '#9333ea', 
    edge: '#7e22ce',
    insert: '#ffffff',
    insertLight: '#e9d5ff',
    symbol: '#ffffff',
    glow: 'rgba(168,85,247,0.4)'
  },
  gold: { 
    main: '#f59e0b', 
    light: '#fcd34d',
    dark: '#d97706', 
    edge: '#b45309',
    insert: '#ffffff',
    insertLight: '#fef3c7',
    symbol: '#1c1917',
    glow: 'rgba(245,158,11,0.5)'
  },
  pink: { 
    main: '#ec4899', 
    light: '#f9a8d4',
    dark: '#db2777', 
    edge: '#be185d',
    insert: '#ffffff',
    insertLight: '#fbcfe8',
    symbol: '#ffffff',
    glow: 'rgba(236,72,153,0.4)'
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

// Premium 3D Poker Chip with edge inserts
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
  
  // Calculate insert positions (8 inserts around the edge)
  const inserts = Array.from({ length: 8 }).map((_, i) => {
    const angle = (i * 45) * Math.PI / 180;
    return {
      x: 50 + Math.cos(angle) * 38,
      y: 50 + Math.sin(angle) * 38,
      rotation: i * 45
    };
  });

  return (
    <div 
      className={cn("relative flex-shrink-0", className)}
      style={{ 
        width: size, 
        height: size
      }}
    >
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
        style={{ 
          filter: `drop-shadow(0 2px 3px rgba(0,0,0,0.4)) drop-shadow(0 1px 1px rgba(0,0,0,0.2))`
        }}
      >
        <defs>
          {/* Main chip surface gradient */}
          <radialGradient id={`surface-${id}`} cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor={colors.light} />
            <stop offset="50%" stopColor={colors.main} />
            <stop offset="100%" stopColor={colors.dark} />
          </radialGradient>
          
          {/* Edge/rim gradient for 3D depth */}
          <linearGradient id={`edge-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.main} />
            <stop offset="50%" stopColor={colors.edge} />
            <stop offset="100%" stopColor={colors.dark} />
          </linearGradient>
          
          {/* Insert gradient for 3D raised effect */}
          <radialGradient id={`insert-${id}`} cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={colors.insertLight} />
            <stop offset="60%" stopColor={colors.insert} />
            <stop offset="100%" stopColor={colors.insertLight} stopOpacity="0.6" />
          </radialGradient>
          
          {/* Inner circle gradient */}
          <radialGradient id={`inner-${id}`} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor={colors.light} stopOpacity="0.3" />
            <stop offset="50%" stopColor={colors.main} />
            <stop offset="100%" stopColor={colors.dark} />
          </radialGradient>
          
          {/* Glossy highlight */}
          <linearGradient id={`gloss-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.5" />
            <stop offset="50%" stopColor="white" stopOpacity="0.1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Outer edge ring - creates 3D thickness */}
        <circle 
          cx="50" 
          cy="50" 
          r="48" 
          fill={`url(#edge-${id})`}
          stroke={colors.edge}
          strokeWidth="1"
        />
        
        {/* Main chip surface */}
        <circle 
          cx="50" 
          cy="50" 
          r="45" 
          fill={`url(#surface-${id})`}
        />
        
        {/* 8 Edge inserts - raised 3D elements */}
        {inserts.map((insert, i) => (
          <g key={i}>
            {/* Insert shadow */}
            <ellipse
              cx={insert.x + 0.5}
              cy={insert.y + 1}
              rx="9"
              ry="5"
              fill="rgba(0,0,0,0.3)"
              transform={`rotate(${insert.rotation}, ${insert.x + 0.5}, ${insert.y + 1})`}
            />
            {/* Insert body */}
            <ellipse
              cx={insert.x}
              cy={insert.y}
              rx="9"
              ry="5"
              fill={`url(#insert-${id})`}
              stroke={colors.edge}
              strokeWidth="0.5"
              transform={`rotate(${insert.rotation}, ${insert.x}, ${insert.y})`}
            />
            {/* Insert highlight */}
            <ellipse
              cx={insert.x - 1}
              cy={insert.y - 1}
              rx="4"
              ry="2"
              fill="rgba(255,255,255,0.4)"
              transform={`rotate(${insert.rotation}, ${insert.x - 1}, ${insert.y - 1})`}
            />
          </g>
        ))}
        
        {/* Inner decorative ring */}
        <circle 
          cx="50" 
          cy="50" 
          r="28" 
          fill="none"
          stroke={colors.edge}
          strokeWidth="1.5"
          opacity="0.6"
        />
        
        {/* Center circle */}
        <circle 
          cx="50" 
          cy="50" 
          r="25" 
          fill={`url(#inner-${id})`}
        />
        
        {/* Inner ring highlight */}
        <circle 
          cx="50" 
          cy="50" 
          r="24" 
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="0.5"
        />
        
        {/* Spade symbol in center */}
        {showSymbol && (
          <text
            x="50"
            y="57"
            textAnchor="middle"
            fontSize="22"
            fontWeight="bold"
            fill={colors.symbol}
            style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' }}
          >
            ♠
          </text>
        )}
        
        {/* Top glossy highlight */}
        <ellipse
          cx="40"
          cy="35"
          rx="20"
          ry="12"
          fill={`url(#gloss-${id})`}
        />
        
        {/* Small shine dot */}
        <circle
          cx="35"
          cy="32"
          r="4"
          fill="rgba(255,255,255,0.5)"
        />
      </svg>
    </div>
  );
});

// =====================================================
// 3D STACKED CHIPS - with realistic depth offset
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
  const count = Math.min(4, Math.max(1, stackCount));
  const stackOffset = Math.max(2, size * 0.12); // Dynamic offset based on size
  
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
// POT CHIPS - Mixed color stack for pot display
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
  const bbValue = bigBlind > 0 ? amount / bigBlind : amount / 20;
  
  // Build diverse chip breakdown
  const getChipBreakdown = (bb: number): { color: ChipColor; stack: number }[] => {
    const chips: { color: ChipColor; stack: number }[] = [];
    
    if (bb >= 100) chips.push({ color: 'gold', stack: 2 });
    if (bb >= 50) chips.push({ color: 'purple', stack: bb >= 100 ? 1 : 2 });
    if (bb >= 20) chips.push({ color: 'black', stack: 1 });
    if (bb >= 10) chips.push({ color: 'blue', stack: 1 });
    if (bb >= 5) chips.push({ color: 'green', stack: 1 });
    if (bb >= 1 || chips.length === 0) chips.push({ color: 'red', stack: chips.length === 0 ? 2 : 1 });
    
    return chips.slice(0, 4);
  };
  
  const chipBreakdown = getChipBreakdown(bbValue);

  return (
    <motion.div 
      className={cn("flex items-end", className)}
      style={{ gap: -size * 0.25 }}
      initial={animated ? { scale: 0 } : false}
      animate={{ scale: 1 }}
    >
      {chipBreakdown.map((chip, i) => (
        <motion.div
          key={`pot-${chip.color}-${i}`}
          className="relative"
          style={{ 
            zIndex: chipBreakdown.length - i,
            marginTop: i * 1
          }}
          initial={animated ? { y: -12, opacity: 0 } : false}
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

// Legacy exports
export const RealisticPokerChip = PPPokerChip;
export const RealisticChipStack = PPPokerChipStackVisual;

export default PPPokerChip;
