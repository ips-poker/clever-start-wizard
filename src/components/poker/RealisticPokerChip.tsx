// =====================================================
// REALISTIC 3D POKER CHIP COMPONENT
// =====================================================
// High-quality chip with edge pattern, metallic shine,
// stacking effect and casino-grade visual design

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Chip denomination colors (casino standard)
const CHIP_COLORS = {
  white: { 
    primary: '#f5f5f5', 
    secondary: '#e0e0e0', 
    dark: '#bdbdbd', 
    edge: '#9e9e9e',
    accent: '#ffffff',
    text: '#1a1a1a'
  },
  red: { 
    primary: '#ef4444', 
    secondary: '#dc2626', 
    dark: '#b91c1c', 
    edge: '#991b1b',
    accent: '#fca5a5',
    text: '#ffffff'
  },
  green: { 
    primary: '#22c55e', 
    secondary: '#16a34a', 
    dark: '#15803d', 
    edge: '#166534',
    accent: '#86efac',
    text: '#ffffff'
  },
  blue: { 
    primary: '#3b82f6', 
    secondary: '#2563eb', 
    dark: '#1d4ed8', 
    edge: '#1e40af',
    accent: '#93c5fd',
    text: '#ffffff'
  },
  black: { 
    primary: '#374151', 
    secondary: '#1f2937', 
    dark: '#111827', 
    edge: '#030712',
    accent: '#6b7280',
    text: '#ffffff'
  },
  purple: { 
    primary: '#a855f7', 
    secondary: '#9333ea', 
    dark: '#7e22ce', 
    edge: '#6b21a8',
    accent: '#d8b4fe',
    text: '#ffffff'
  },
  gold: { 
    primary: '#fbbf24', 
    secondary: '#f59e0b', 
    dark: '#d97706', 
    edge: '#b45309',
    accent: '#fde68a',
    text: '#1a1a1a'
  },
  pink: { 
    primary: '#ec4899', 
    secondary: '#db2777', 
    dark: '#be185d', 
    edge: '#9d174d',
    accent: '#f9a8d4',
    text: '#ffffff'
  }
};

type ChipColor = keyof typeof CHIP_COLORS;

// Get chip color based on value
const getChipColorByValue = (value: number): ChipColor => {
  if (value >= 100000) return 'gold';
  if (value >= 25000) return 'purple';
  if (value >= 10000) return 'black';
  if (value >= 5000) return 'pink';
  if (value >= 1000) return 'blue';
  if (value >= 500) return 'green';
  if (value >= 100) return 'red';
  return 'white';
};

interface RealisticPokerChipProps {
  size?: number;
  color?: ChipColor;
  value?: number;
  showValue?: boolean;
  stackPosition?: number; // 0 = bottom, increases upward
  className?: string;
  animated?: boolean;
  delay?: number;
}

export const RealisticPokerChip = memo(function RealisticPokerChip({
  size = 32,
  color,
  value = 0,
  showValue = false,
  stackPosition = 0,
  className,
  animated = true,
  delay = 0
}: RealisticPokerChipProps) {
  const chipColor = color || getChipColorByValue(value);
  const colors = CHIP_COLORS[chipColor];
  const chipId = `chip-${chipColor}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Stack offset for 3D effect
  const stackOffset = stackPosition * 3;

  const chipContent = (
    <div 
      className={cn("relative", className)}
      style={{ 
        width: size, 
        height: size,
        transform: `translateY(-${stackOffset}px)`
      }}
    >
      {/* Bottom edge shadow for 3D depth */}
      <div 
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          top: 3,
          left: 0,
          background: `linear-gradient(180deg, ${colors.edge} 0%, rgba(0,0,0,0.8) 100%)`,
          filter: 'blur(1px)'
        }}
      />
      
      {/* Chip edge (visible from side) */}
      <div 
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          top: 2,
          left: 0,
          background: colors.dark
        }}
      />

      {/* Main chip surface */}
      <div 
        className="absolute rounded-full overflow-hidden"
        style={{
          width: size,
          height: size,
          top: 0,
          left: 0,
          background: `
            radial-gradient(ellipse 80% 50% at 30% 20%, ${colors.accent}40 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 70% 80%, rgba(0,0,0,0.3) 0%, transparent 50%),
            linear-gradient(145deg, ${colors.primary} 0%, ${colors.secondary} 50%, ${colors.dark} 100%)
          `,
          border: `2px solid ${colors.edge}`,
          boxShadow: `
            inset 0 2px 6px rgba(255,255,255,0.4),
            inset 0 -2px 6px rgba(0,0,0,0.4),
            0 4px 12px rgba(0,0,0,0.5)
          `
        }}
      >
        {/* SVG for edge pattern and center design */}
        <svg 
          viewBox="0 0 100 100" 
          className="absolute inset-0 w-full h-full"
        >
          <defs>
            {/* Edge dash pattern */}
            <pattern 
              id={`edge-${chipId}`} 
              patternUnits="userSpaceOnUse" 
              width="100" 
              height="100"
            >
              {/* Edge segments - casino style rectangles */}
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 30 - 90) * Math.PI / 180;
                const x1 = 50 + Math.cos(angle) * 42;
                const y1 = 50 + Math.sin(angle) * 42;
                const x2 = 50 + Math.cos(angle) * 48;
                const y2 = 50 + Math.sin(angle) * 48;
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="white"
                    strokeWidth="6"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                );
              })}
            </pattern>
          </defs>
          
          {/* Edge pattern ring */}
          <circle 
            cx="50" 
            cy="50" 
            r="45" 
            fill="none"
            stroke={`url(#edge-${chipId})`}
            strokeWidth="12"
          />
          
          {/* Inner decorative ring */}
          <circle 
            cx="50" 
            cy="50" 
            r="35" 
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
          />
          
          {/* Center circle background */}
          <circle 
            cx="50" 
            cy="50" 
            r="28" 
            fill={colors.secondary}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
          />
          
          {/* Center highlight */}
          <ellipse
            cx="44"
            cy="44"
            rx="12"
            ry="8"
            fill="rgba(255,255,255,0.15)"
          />
          
          {/* Spade symbol or value in center */}
          {showValue && value > 0 ? (
            <text
              x="50"
              y="56"
              textAnchor="middle"
              fontSize={size > 40 ? "24" : "18"}
              fontWeight="bold"
              fill={colors.text}
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
            >
              {value >= 1000 ? `${value / 1000}K` : value}
            </text>
          ) : (
            <text
              x="50"
              y="58"
              textAnchor="middle"
              fontSize="28"
              fill={colors.text}
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
            >
              ♠
            </text>
          )}
        </svg>
        
        {/* Glossy highlight overlay */}
        <div 
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `
              linear-gradient(
                135deg,
                rgba(255,255,255,0.35) 0%,
                rgba(255,255,255,0.1) 30%,
                transparent 50%
              )
            `
          }}
        />
      </div>
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0, y: -10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
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
// CHIP STACK - Multiple stacked chips
// =====================================================
interface RealisticChipStackProps {
  amount: number;
  maxChips?: number;
  chipSize?: number;
  showAmount?: boolean;
  animated?: boolean;
  className?: string;
}

export const RealisticChipStack = memo(function RealisticChipStack({
  amount,
  maxChips = 5,
  chipSize = 28,
  showAmount = true,
  animated = true,
  className
}: RealisticChipStackProps) {
  if (amount <= 0) return null;

  // Determine chip count based on amount
  const chipCount = Math.min(maxChips, Math.max(1, Math.ceil(Math.log10(amount + 1))));
  
  // Get primary color based on amount
  const primaryColor = getChipColorByValue(amount);

  return (
    <motion.div 
      className={cn("flex items-end gap-1.5", className)}
      initial={animated ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
    >
      {/* Stacked chips */}
      <div className="relative" style={{ width: chipSize, height: chipSize + (chipCount - 1) * 3 }}>
        {Array.from({ length: chipCount }).map((_, i) => (
          <div 
            key={i} 
            className="absolute"
            style={{ 
              bottom: i * 3,
              left: 0,
              zIndex: chipCount - i
            }}
          >
            <RealisticPokerChip
              size={chipSize}
              color={primaryColor}
              stackPosition={0}
              animated={animated}
              delay={i * 0.03}
            />
          </div>
        ))}
      </div>

      {/* Amount display */}
      {showAmount && (
        <motion.span
          className="font-bold text-white text-sm drop-shadow-lg"
          initial={animated ? { opacity: 0, x: -5 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            textShadow: '0 2px 4px rgba(0,0,0,0.8)'
          }}
        >
          {formatAmount(amount)}
        </motion.span>
      )}
    </motion.div>
  );
});

// Format amount helper
const formatAmount = (amount: number): string => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 10000) return `${(amount / 1000).toFixed(0)}K`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toLocaleString();
};

export default RealisticPokerChip;
