// PPPoker-style 3D Chip Stack for bet display
// Realistic stacked chips with amount badge - positioned towards table center

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PPPokerChipStackProps {
  amount: number;
  seatPosition: { x: number; y: number };
  bigBlind?: number;
  showBBFormat?: boolean;
  animated?: boolean;
}

// Chip denominations with PPPoker-style colors
const CHIP_DENOMS = [
  { value: 1, color: '#ffffff', border: '#d1d5db', textColor: '#374151' },
  { value: 5, color: '#ef4444', border: '#b91c1c', textColor: '#ffffff' },
  { value: 25, color: '#22c55e', border: '#15803d', textColor: '#ffffff' },
  { value: 100, color: '#1f2937', border: '#4b5563', textColor: '#ffffff' },
  { value: 500, color: '#8b5cf6', border: '#6d28d9', textColor: '#ffffff' },
  { value: 1000, color: '#eab308', border: '#a16207', textColor: '#1f2937' },
  { value: 5000, color: '#ec4899', border: '#be185d', textColor: '#ffffff' },
];

// Calculate chip breakdown for visual display
const calculateChips = (amount: number): Array<{ value: number; count: number; color: string; border: string; textColor: string }> => {
  const result: Array<{ value: number; count: number; color: string; border: string; textColor: string }> = [];
  let remaining = amount;
  
  // Work from highest to lowest denomination
  for (let i = CHIP_DENOMS.length - 1; i >= 0; i--) {
    const denom = CHIP_DENOMS[i];
    const count = Math.floor(remaining / denom.value);
    if (count > 0) {
      // Limit visual chips to 4 per denomination for clean display
      result.push({ 
        ...denom, 
        count: Math.min(count, 4) 
      });
      remaining -= count * denom.value;
    }
  }
  
  // If result is empty (amount < 1), use smallest chip
  if (result.length === 0 && amount > 0) {
    result.push({ ...CHIP_DENOMS[0], count: 1 });
  }
  
  return result.slice(0, 3); // Max 3 different denominations
};

// Get bet position offset towards center of table
const getBetOffset = (seatPosition: { x: number; y: number }): { x: number; y: number } => {
  const centerX = 50;
  const centerY = 45; // Slightly above center for pot area
  
  // Calculate direction towards center
  const dx = centerX - seatPosition.x;
  const dy = centerY - seatPosition.y;
  
  // Distance to move (percentage-based)
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance === 0) return { x: 0, y: 0 };
  
  // Move 35-45% towards center depending on distance
  const movePercent = 0.38;
  
  return {
    x: dx * movePercent,
    y: dy * movePercent
  };
};

// Format amount for display
const formatAmount = (amount: number): string => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 10000) return `${Math.round(amount / 1000)}K`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toLocaleString();
};

// Single 3D Chip Component
const Chip3D = memo(function Chip3D({ 
  color, 
  border, 
  stackIndex = 0,
  isTop = false 
}: { 
  color: string; 
  border: string; 
  stackIndex?: number;
  isTop?: boolean;
}) {
  return (
    <div 
      className="absolute w-5 h-5 rounded-full"
      style={{
        bottom: stackIndex * 3, // Stack height
        left: 0,
        background: `
          radial-gradient(circle at 35% 35%, ${color} 0%, ${color}ee 30%, ${border} 100%)
        `,
        border: `1.5px solid ${border}`,
        boxShadow: `
          inset 0 2px 4px rgba(255,255,255,0.35),
          inset 0 -2px 4px rgba(0,0,0,0.25),
          ${isTop ? '0 2px 8px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.3)'}
        `,
        zIndex: 10 - stackIndex
      }}
    >
      {/* Chip edge pattern */}
      <div 
        className="absolute inset-0 rounded-full opacity-40"
        style={{
          background: `repeating-conic-gradient(
            from 0deg,
            ${border} 0deg 20deg,
            transparent 20deg 40deg
          )`
        }}
      />
      {/* Center circle */}
      <div 
        className="absolute inset-[28%] rounded-full"
        style={{
          background: color,
          border: `1px solid ${border}`
        }}
      />
    </div>
  );
});

export const PPPokerChipStack = memo(function PPPokerChipStack({
  amount,
  seatPosition,
  bigBlind = 20,
  showBBFormat = true, // Default to BB format like PPPoker
  animated = true
}: PPPokerChipStackProps) {
  const chips = useMemo(() => calculateChips(amount), [amount]);
  const betOffset = useMemo(() => getBetOffset(seatPosition), [seatPosition]);
  
  // Calculate BB format
  const bbValue = useMemo(() => {
    if (!showBBFormat || bigBlind <= 0) return null;
    const bb = amount / bigBlind;
    if (bb >= 100) return Math.round(bb).toLocaleString();
    if (bb >= 10) return bb.toFixed(1);
    if (bb >= 1) return bb.toFixed(1);
    return bb.toFixed(2);
  }, [amount, bigBlind, showBBFormat]);

  if (amount <= 0) return null;

  // Calculate total chip stack height
  const totalChips = chips.reduce((sum, c) => sum + c.count, 0);
  const stackHeight = Math.min(totalChips, 6) * 3 + 20; // Max 6 chips visible

  return (
    <motion.div
      initial={animated ? { scale: 0, opacity: 0 } : false}
      animate={{ 
        scale: 1, 
        opacity: 1,
        x: betOffset.x,
        y: betOffset.y
      }}
      transition={{
        type: 'spring',
        stiffness: 280,
        damping: 24,
        delay: 0.03
      }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 z-20"
    >
      {/* PPPoker-style chip icon - красная фишка с текстурой */}
      <div 
        className="relative flex-shrink-0"
        style={{ width: 22, height: 22 }}
      >
        {/* Main chip */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(145deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
            border: '2px solid #991b1b',
            boxShadow: `
              inset 0 2px 4px rgba(255,255,255,0.3),
              inset 0 -2px 4px rgba(0,0,0,0.3),
              0 3px 8px rgba(0,0,0,0.4)
            `
          }}
        >
          {/* Edge pattern - white dashes */}
          <div 
            className="absolute inset-[2px] rounded-full"
            style={{
              background: `repeating-conic-gradient(
                from 0deg,
                transparent 0deg 15deg,
                rgba(255,255,255,0.4) 15deg 30deg
              )`
            }}
          />
          {/* Center circle */}
          <div 
            className="absolute inset-[5px] rounded-full"
            style={{
              background: 'linear-gradient(145deg, #ef4444, #dc2626)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          />
        </div>
        
        {/* Stacked chips behind (3D effect) */}
        {chips.length > 0 && chips[0].count > 1 && (
          <>
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(145deg, #f87171, #ef4444)',
                border: '2px solid #991b1b',
                transform: 'translateY(3px)',
                zIndex: -1
              }}
            />
            {chips[0].count > 2 && (
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(145deg, #fca5a5, #f87171)',
                  border: '2px solid #991b1b',
                  transform: 'translateY(6px)',
                  zIndex: -2
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Amount text - PPPoker golden style */}
      <span 
        className="font-bold text-[12px] leading-none whitespace-nowrap"
        style={{
          color: '#fbbf24',
          textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(251,191,36,0.3)'
        }}
      >
        {showBBFormat && bbValue ? bbValue : formatAmount(amount)}
      </span>
    </motion.div>
  );
});

export default PPPokerChipStack;
