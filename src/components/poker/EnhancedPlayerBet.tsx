// Enhanced Player Bet Display with Realistic Chips - PPPoker Style
// Bets positioned towards center of table with chip animation
import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EnhancedPlayerBetProps {
  amount: number;
  seatPosition: { x: number; y: number };
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

// Format amount for display
const formatAmount = (amount: number): string => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toLocaleString();
};

// Single Chip Component with stacking effect
const ChipIcon = memo(function ChipIcon({ color, border }: { color: string; border: string }) {
  return (
    <div 
      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 relative"
      style={{
        background: `radial-gradient(circle at 30% 30%, ${color} 0%, ${color}cc 60%, ${border} 100%)`,
        border: `2px solid ${border}`,
        boxShadow: `
          inset 0 2px 4px rgba(255,255,255,0.3),
          inset 0 -2px 4px rgba(0,0,0,0.2),
          0 2px 4px rgba(0,0,0,0.4)
        `
      }}
    >
      {/* Chip pattern */}
      <div 
        className="absolute inset-0 rounded-full opacity-30"
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
    </div>
  );
});

// Calculate bet position offset towards center based on seat position
const getBetOffset = (seatPosition: { x: number; y: number }) => {
  const centerX = 50;
  const centerY = 50;
  
  // Calculate direction towards center
  const dx = centerX - seatPosition.x;
  const dy = centerY - seatPosition.y;
  
  // Normalize and scale - move bet 40-60px towards center
  const distance = Math.sqrt(dx * dx + dy * dy);
  const scale = 45 / distance;
  
  return {
    x: dx * scale,
    y: dy * scale
  };
};

export const EnhancedPlayerBet = memo(function EnhancedPlayerBet({
  amount,
  seatPosition,
  isHero = false,
  animated = true
}: EnhancedPlayerBetProps) {
  const chipColor = useMemo(() => getChipColor(amount), [amount]);
  const betOffset = useMemo(() => getBetOffset(seatPosition), [seatPosition]);

  if (amount <= 0) return null;

  return (
    <motion.div
      initial={animated ? { 
        scale: 0, 
        opacity: 0,
        x: 0,
        y: 0
      } : false}
      animate={{ 
        scale: 1, 
        opacity: 1,
        x: betOffset.x,
        y: betOffset.y
      }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        delay: 0.1
      }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 z-25"
    >
      {/* Chip icon with correct color */}
      <ChipIcon color={chipColor.color} border={chipColor.border} />

      {/* Amount label - compact */}
      <div 
        className="px-1.5 py-0.5 rounded-md"
        style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(30,30,30,0.9) 100%)',
          border: '1px solid rgba(251,191,36,0.4)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
        }}
      >
        <span 
          className="font-bold text-[11px]"
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
