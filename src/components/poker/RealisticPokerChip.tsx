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

// Premium 3D Poker Chip - Ultra realistic casino style
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
  
  // 8 large rectangular edge inserts
  const inserts = Array.from({ length: 8 }).map((_, i) => ({
    rotation: i * 45
  }));

  // Decorative dots between inserts
  const dots: { x: number; y: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const baseAngle = (i * 45 + 22.5 - 90) * Math.PI / 180;
    const radius = 40;
    [-8, 0, 8].forEach((offset) => {
      const angle = baseAngle + (offset * Math.PI / 180);
      dots.push({
        x: 50 + Math.cos(angle) * (radius - (offset === 0 ? 5 : 0)),
        y: 50 + Math.sin(angle) * (radius - (offset === 0 ? 5 : 0))
      });
    });
  }

  // Inner ring segments
  const ringSegments = Array.from({ length: 24 }).map((_, i) => ({
    startAngle: i * 15,
    isLight: i % 2 === 0
  }));

  return (
    <div 
      className={cn("relative flex-shrink-0", className)}
      style={{ 
        width: size, 
        height: size,
        transform: 'perspective(200px) rotateX(15deg)',
        transformStyle: 'preserve-3d'
      }}
    >
      <svg 
        viewBox="0 0 100 110" 
        className="w-full h-full"
        style={{ 
          filter: `drop-shadow(0 6px 8px rgba(0,0,0,0.6)) drop-shadow(0 2px 4px rgba(0,0,0,0.4))`
        }}
      >
        <defs>
          {/* Main surface gradient - metallic sheen */}
          <radialGradient id={`surface-${id}`} cx="30%" cy="20%" r="75%">
            <stop offset="0%" stopColor={colors.light} />
            <stop offset="35%" stopColor={colors.main} />
            <stop offset="70%" stopColor={colors.dark} />
            <stop offset="100%" stopColor={colors.edge} />
          </radialGradient>
          
          {/* 3D Edge gradient - creates depth illusion */}
          <linearGradient id={`edge3d-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.dark} />
            <stop offset="30%" stopColor={colors.edge} />
            <stop offset="70%" stopColor={colors.dark} stopOpacity="0.9" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.7" />
          </linearGradient>
          
          {/* Insert gradient with 3D bevel */}
          <linearGradient id={`insert-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="15%" stopColor={colors.insertLight} />
            <stop offset="50%" stopColor={colors.insert} />
            <stop offset="85%" stopColor={colors.insertLight} stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.5" />
          </linearGradient>
          
          {/* Inner circle gradient */}
          <radialGradient id={`inner-${id}`} cx="35%" cy="25%" r="65%">
            <stop offset="0%" stopColor={colors.light} stopOpacity="0.7" />
            <stop offset="40%" stopColor={colors.main} />
            <stop offset="100%" stopColor={colors.dark} />
          </radialGradient>
          
          {/* Glossy highlight */}
          <radialGradient id={`gloss-${id}`} cx="35%" cy="30%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.7" />
            <stop offset="50%" stopColor="white" stopOpacity="0.2" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          
          {/* Rim light effect */}
          <linearGradient id={`rim-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="50%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="white" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        
        {/* ===== 3D CHIP EDGE (thickness) ===== */}
        {/* Bottom edge shadow */}
        <ellipse 
          cx="50" 
          cy="58" 
          rx="47" 
          ry="8"
          fill="rgba(0,0,0,0.5)"
        />
        
        {/* Chip edge/side - 3D thickness */}
        <ellipse 
          cx="50" 
          cy="55" 
          rx="48" 
          ry="8"
          fill={`url(#edge3d-${id})`}
        />
        
        {/* Edge highlight stripe */}
        <ellipse 
          cx="50" 
          cy="53" 
          rx="47" 
          ry="6"
          fill="none"
          stroke={colors.main}
          strokeWidth="1"
          opacity="0.5"
        />
        
        {/* ===== MAIN CHIP FACE ===== */}
        {/* Outer edge ring */}
        <circle 
          cx="50" 
          cy="50" 
          r="48" 
          fill={colors.edge}
        />
        
        {/* Main chip surface */}
        <circle 
          cx="50" 
          cy="50" 
          r="46" 
          fill={`url(#surface-${id})`}
        />
        
        {/* Outer rim highlight */}
        <circle 
          cx="50" 
          cy="50" 
          r="46" 
          fill="none"
          stroke={`url(#rim-${id})`}
          strokeWidth="1.5"
        />
        
        {/* 8 Large rectangular edge inserts with 3D effect */}
        {inserts.map((insert, i) => (
          <g key={i} transform={`rotate(${insert.rotation}, 50, 50)`}>
            {/* Insert depression shadow */}
            <rect
              x="41"
              y="2.5"
              width="18"
              height="11"
              rx="2"
              fill="rgba(0,0,0,0.4)"
            />
            {/* Insert body */}
            <rect
              x="41"
              y="3"
              width="18"
              height="10"
              rx="2"
              fill={`url(#insert-${id})`}
            />
            {/* Insert top bevel highlight */}
            <rect
              x="42"
              y="3.5"
              width="16"
              height="3"
              rx="1.5"
              fill="rgba(255,255,255,0.5)"
            />
            {/* Insert bottom edge */}
            <rect
              x="42"
              y="10"
              width="16"
              height="2"
              rx="1"
              fill="rgba(0,0,0,0.15)"
            />
          </g>
        ))}
        
        {/* Decorative dots between inserts */}
        {dots.map((dot, i) => (
          <g key={`dot-${i}`}>
            {/* Dot shadow */}
            <circle
              cx={dot.x + 0.3}
              cy={dot.y + 0.5}
              r="2.2"
              fill="rgba(0,0,0,0.3)"
            />
            {/* Dot body */}
            <circle
              cx={dot.x}
              cy={dot.y}
              r="2"
              fill={colors.insert}
            />
            {/* Dot highlight */}
            <circle
              cx={dot.x - 0.5}
              cy={dot.y - 0.5}
              r="0.8"
              fill="rgba(255,255,255,0.6)"
            />
          </g>
        ))}
        
        {/* Inner decorative ring border */}
        <circle 
          cx="50" 
          cy="50" 
          r="30" 
          fill="none"
          stroke={colors.edge}
          strokeWidth="1"
        />
        
        {/* Alternating ring pattern */}
        {ringSegments.map((seg, i) => {
          const startRad = (seg.startAngle - 90) * Math.PI / 180;
          const endRad = (seg.startAngle + 15 - 90) * Math.PI / 180;
          const innerR = 26;
          const outerR = 30;
          
          const x1 = 50 + Math.cos(startRad) * innerR;
          const y1 = 50 + Math.sin(startRad) * innerR;
          const x2 = 50 + Math.cos(startRad) * outerR;
          const y2 = 50 + Math.sin(startRad) * outerR;
          const x3 = 50 + Math.cos(endRad) * outerR;
          const y3 = 50 + Math.sin(endRad) * outerR;
          const x4 = 50 + Math.cos(endRad) * innerR;
          const y4 = 50 + Math.sin(endRad) * innerR;
          
          return (
            <path
              key={`ring-${i}`}
              d={`M ${x1} ${y1} L ${x2} ${y2} A ${outerR} ${outerR} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerR} ${innerR} 0 0 0 ${x1} ${y1}`}
              fill={seg.isLight ? colors.insert : colors.dark}
              opacity={seg.isLight ? 0.95 : 0.75}
            />
          );
        })}
        
        {/* Inner ring outer border */}
        <circle 
          cx="50" 
          cy="50" 
          r="26" 
          fill="none"
          stroke={colors.edge}
          strokeWidth="0.5"
        />
        
        {/* Center circle with inset effect */}
        <circle 
          cx="50" 
          cy="50" 
          r="24" 
          fill={`url(#inner-${id})`}
        />
        
        {/* Center circle inset shadow */}
        <circle 
          cx="50" 
          cy="50" 
          r="23.5" 
          fill="none"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="1"
        />
        
        {/* Center circle highlight ring */}
        <circle 
          cx="50" 
          cy="50" 
          r="22" 
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="0.5"
        />
        
        {/* ===== SPADE SYMBOL ===== */}
        {showSymbol && (
          <g transform="translate(50, 50)">
            {/* Deep shadow */}
            <g transform="translate(1.5, 2)">
              <path
                d="M 0 -15 
                   C -4 -11, -13 -5, -13 2 
                   C -13 7, -9 11, -4 11 
                   C -2 11, 0 10, 0 8 
                   C 0 10, 2 11, 4 11 
                   C 9 11, 13 7, 13 2 
                   C 13 -5, 4 -11, 0 -15 
                   Z"
                fill="rgba(0,0,0,0.5)"
              />
              <path d="M 0 8 L -3 16 L 3 16 Z" fill="rgba(0,0,0,0.5)" />
            </g>
            
            {/* Main spade */}
            <path
              d="M 0 -15 
                 C -4 -11, -13 -5, -13 2 
                 C -13 7, -9 11, -4 11 
                 C -2 11, 0 10, 0 8 
                 C 0 10, 2 11, 4 11 
                 C 9 11, 13 7, 13 2 
                 C 13 -5, 4 -11, 0 -15 
                 Z"
              fill={colors.symbol}
            />
            
            {/* Stem */}
            <path d="M 0 8 L -3 16 L 3 16 Z" fill={colors.symbol} />
            
            {/* Left lobe highlight */}
            <ellipse cx="-6" cy="2" rx="4" ry="5" fill="rgba(255,255,255,0.2)" />
            
            {/* Right lobe subtle highlight */}
            <ellipse cx="6" cy="2" rx="3" ry="4" fill="rgba(255,255,255,0.1)" />
            
            {/* Top point highlight */}
            <ellipse cx="0" cy="-9" rx="2.5" ry="3.5" fill="rgba(255,255,255,0.25)" />
          </g>
        )}
        
        {/* ===== GLOSSY REFLECTIONS ===== */}
        {/* Main glossy highlight */}
        <ellipse
          cx="35"
          cy="35"
          rx="20"
          ry="15"
          fill={`url(#gloss-${id})`}
        />
        
        {/* Bright spot */}
        <circle cx="30" cy="30" r="6" fill="rgba(255,255,255,0.5)" />
        
        {/* Secondary bright spot */}
        <circle cx="36" cy="34" r="2.5" fill="rgba(255,255,255,0.4)" />
        
        {/* Edge rim light - left */}
        <path
          d="M 10 50 A 40 40 0 0 1 30 20"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
          strokeLinecap="round"
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
