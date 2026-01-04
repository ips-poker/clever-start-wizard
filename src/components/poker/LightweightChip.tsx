/**
 * Lightweight Poker Chip - Optimized for Telegram Mini App
 * Uses CSS instead of SVG for maximum performance
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

// Chip colors - simple CSS-based
const CHIP_COLORS = {
  white: { bg: '#f8fafc', border: '#cbd5e1' },
  red: { bg: '#ef4444', border: '#b91c1c' },
  green: { bg: '#22c55e', border: '#15803d' },
  blue: { bg: '#3b82f6', border: '#1d4ed8' },
  black: { bg: '#1f2937', border: '#030712' },
  purple: { bg: '#a855f7', border: '#7e22ce' },
  gold: { bg: '#f59e0b', border: '#b45309' },
  pink: { bg: '#ec4899', border: '#be185d' }
} as const;

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

interface LightweightChipProps {
  size?: number;
  bbValue?: number;
  className?: string;
}

// Simple CSS-based chip for performance
export const LightweightChip = memo(function LightweightChip({
  size = 20,
  bbValue = 1,
  className
}: LightweightChipProps) {
  const colorKey = getChipColorByBB(bbValue);
  const colors = CHIP_COLORS[colorKey];

  return (
    <div
      className={cn("rounded-full flex-shrink-0", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: colors.bg,
        border: `2px solid ${colors.border}`,
        // GPU acceleration
        transform: 'translateZ(0)',
        willChange: 'transform, opacity'
      }}
    />
  );
});

interface LightweightChipStackProps {
  count?: number;
  size?: number;
  bbValue?: number;
  className?: string;
}

// Simple stacked chips for performance
export const LightweightChipStack = memo(function LightweightChipStack({
  count = 3,
  size = 20,
  bbValue = 1,
  className
}: LightweightChipStackProps) {
  const colorKey = getChipColorByBB(bbValue);
  const colors = CHIP_COLORS[colorKey];
  const stackCount = Math.min(count, 5); // Max 5 chips for performance

  return (
    <div 
      className={cn("relative", className)}
      style={{ 
        width: size, 
        height: size + (stackCount - 1) * 2,
        willChange: 'transform'
      }}
    >
      {Array.from({ length: stackCount }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: size,
            height: size,
            backgroundColor: colors.bg,
            border: `2px solid ${colors.border}`,
            bottom: i * 2,
            left: 0,
            transform: 'translateZ(0)'
          }}
        />
      ))}
    </div>
  );
});

export default LightweightChip;
