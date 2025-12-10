// Enhanced Player Bet Display with Realistic Chips
import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EnhancedPlayerBetProps {
  amount: number;
  position: 'top' | 'bottom' | 'left' | 'right';
  isHero?: boolean;
  animated?: boolean;
}

// Chip denominations with realistic colors
const CHIP_COLORS = [
  { min: 0, color: '#ffffff', border: '#c0c0c0', label: '1' },      // White - 1
  { min: 5, color: '#ef4444', border: '#b91c1c', label: '5' },      // Red - 5
  { min: 25, color: '#22c55e', border: '#15803d', label: '25' },    // Green - 25
  { min: 100, color: '#1e1e1e', border: '#404040', label: '100' },  // Black - 100
  { min: 500, color: '#8b5cf6', border: '#6d28d9', label: '500' },  // Purple - 500
  { min: 1000, color: '#f59e0b', border: '#d97706', label: '1K' },  // Yellow - 1000
  { min: 5000, color: '#ec4899', border: '#be185d', label: '5K' },  // Pink - 5000
  { min: 25000, color: '#06b6d4', border: '#0891b2', label: '25K' }, // Cyan - 25000
];

// Get chip color based on amount
const getChipColor = (amount: number) => {
  let chip = CHIP_COLORS[0];
  for (const c of CHIP_COLORS) {
    if (amount >= c.min) chip = c;
  }
  return chip;
};

// Calculate chip stacks for display
const calculateChipStacks = (amount: number): { color: string; border: string; count: number }[] => {
  const stacks: { color: string; border: string; count: number }[] = [];
  let remaining = amount;

  // Work backwards from highest denomination
  const denoms = [...CHIP_COLORS].reverse();
  
  for (const denom of denoms) {
    if (denom.min === 0) continue;
    const count = Math.floor(remaining / denom.min);
    if (count > 0) {
      stacks.push({
        color: denom.color,
        border: denom.border,
        count: Math.min(count, 5) // Max 5 chips per stack visually
      });
      remaining -= count * denom.min;
      if (stacks.length >= 3) break; // Max 3 stacks
    }
  }

  // Add at least one chip if we have remaining or amount > 0
  if (stacks.length === 0 && amount > 0) {
    const chip = getChipColor(amount);
    stacks.push({ color: chip.color, border: chip.border, count: 1 });
  }

  return stacks;
};

// Format amount for display
const formatAmount = (amount: number): string => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toLocaleString();
};

// Single Chip Component
const Chip = memo(function Chip({
  color,
  border,
  index,
  size = 20
}: {
  color: string;
  border: string;
  index: number;
  size?: number;
}) {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.03 }}
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        bottom: index * 3,
        background: `
          radial-gradient(circle at 30% 30%, ${color} 0%, ${color}cc 60%, ${border} 100%)
        `,
        border: `2px solid ${border}`,
        boxShadow: `
          inset 0 2px 4px rgba(255,255,255,0.3),
          inset 0 -2px 4px rgba(0,0,0,0.2),
          0 ${index + 1}px ${2 + index}px rgba(0,0,0,0.3)
        `
      }}
    >
      {/* Chip pattern */}
      <div 
        className="absolute inset-0 rounded-full opacity-40"
        style={{
          background: `repeating-conic-gradient(
            from 0deg,
            ${border} 0deg 30deg,
            transparent 30deg 60deg
          )`
        }}
      />
      {/* Chip center */}
      <div 
        className="absolute inset-[25%] rounded-full"
        style={{
          background: color,
          border: `1px solid ${border}`
        }}
      />
    </motion.div>
  );
});

// Chip Stack Component
const ChipStack = memo(function ChipStack({
  color,
  border,
  count,
  offsetX = 0
}: {
  color: string;
  border: string;
  count: number;
  offsetX?: number;
}) {
  return (
    <div 
      className="relative"
      style={{ 
        marginLeft: offsetX,
        width: 20,
        height: 20 + count * 3
      }}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <Chip 
          key={idx} 
          color={color} 
          border={border} 
          index={idx} 
        />
      ))}
    </div>
  );
});

export const EnhancedPlayerBet = memo(function EnhancedPlayerBet({
  amount,
  position,
  isHero = false,
  animated = true
}: EnhancedPlayerBetProps) {
  const chipStacks = useMemo(() => calculateChipStacks(amount), [amount]);

  if (amount <= 0) return null;

  // Position styles
  const positionStyles = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-3 top-1/2 -translate-y-1/2',
    right: 'left-full ml-3 top-1/2 -translate-y-1/2'
  };

  return (
    <motion.div
      initial={animated ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      className={cn("absolute flex items-end gap-0.5 z-10", positionStyles[position])}
    >
      {/* Chip stacks */}
      <div className="flex items-end">
        {chipStacks.map((stack, idx) => (
          <ChipStack
            key={idx}
            color={stack.color}
            border={stack.border}
            count={stack.count}
            offsetX={idx > 0 ? -6 : 0}
          />
        ))}
      </div>

      {/* Amount label */}
      <div 
        className="ml-1 px-2 py-0.5 rounded-md"
        style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(30,30,30,0.9) 100%)',
          border: '1px solid rgba(251,191,36,0.5)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
        }}
      >
        <span 
          className="font-bold text-xs"
          style={{
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          {formatAmount(amount)}
        </span>
      </div>
    </motion.div>
  );
});

export default EnhancedPlayerBet;
