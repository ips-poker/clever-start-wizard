import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Chip denominations with stable colors
const CHIP_DENOMS = [
  { value: 10000, color: '#7c3aed', border: '#a78bfa', label: '10K' },
  { value: 5000, color: '#ec4899', border: '#f472b6', label: '5K' },
  { value: 1000, color: '#f59e0b', border: '#fbbf24', label: '1K' },
  { value: 500, color: '#8b5cf6', border: '#a78bfa', label: '500' },
  { value: 100, color: '#1f2937', border: '#4b5563', label: '100' },
  { value: 25, color: '#22c55e', border: '#4ade80', label: '25' },
  { value: 5, color: '#ef4444', border: '#f87171', label: '5' },
  { value: 1, color: '#f8fafc', border: '#e2e8f0', label: '1' }
] as const;

interface StableChipStackProps {
  amount: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  xs: { chip: 16, stack: 2, fontSize: 8 },
  sm: { chip: 20, stack: 2.5, fontSize: 9 },
  md: { chip: 28, stack: 3, fontSize: 10 },
  lg: { chip: 36, stack: 4, fontSize: 12 }
};

// Single chip component - heavily memoized
const Chip = memo(function Chip({ 
  denom, 
  size, 
  stackIndex 
}: { 
  denom: typeof CHIP_DENOMS[number];
  size: keyof typeof SIZE_CONFIG;
  stackIndex: number;
}) {
  const config = SIZE_CONFIG[size];
  
  return (
    <div
      className="absolute rounded-full"
      style={{
        width: config.chip,
        height: config.chip,
        bottom: stackIndex * config.stack,
        background: `radial-gradient(circle at 30% 30%, ${denom.border}, ${denom.color})`,
        border: `2px solid ${denom.border}`,
        boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
      }}
    >
      {/* Chip pattern */}
      <div 
        className="absolute inset-1 rounded-full border border-white/20"
        style={{ borderStyle: 'dashed' }}
      />
    </div>
  );
}, (prev, next) => 
  prev.denom.value === next.denom.value && 
  prev.size === next.size && 
  prev.stackIndex === next.stackIndex
);

// Calculate chip breakdown - memoized
function calculateChips(amount: number): { denom: typeof CHIP_DENOMS[number]; count: number }[] {
  const result: { denom: typeof CHIP_DENOMS[number]; count: number }[] = [];
  let remaining = amount;
  
  for (const denom of CHIP_DENOMS) {
    const count = Math.floor(remaining / denom.value);
    if (count > 0) {
      // Limit visual chips per denom to prevent UI clutter
      result.push({ denom, count: Math.min(count, 5) });
      remaining -= count * denom.value;
    }
  }
  
  return result;
}

export const StableChipStack = memo(function StableChipStack({
  amount,
  size = 'md',
  showLabel = true,
  animated = true,
  className
}: StableChipStackProps) {
  const config = SIZE_CONFIG[size];
  
  // Memoize chip calculation
  const chips = useMemo(() => calculateChips(amount), [amount]);
  
  // Calculate total height for stacking
  const totalChips = chips.reduce((sum, c) => sum + c.count, 0);
  const stackHeight = Math.min(totalChips, 10) * config.stack + config.chip;

  if (amount <= 0) return null;

  const content = (
    <div className={cn('relative flex items-end gap-0.5', className)}>
      {chips.slice(0, 3).map((chipGroup, groupIdx) => (
        <div 
          key={chipGroup.denom.value}
          className="relative"
          style={{ 
            width: config.chip, 
            height: stackHeight,
            marginLeft: groupIdx > 0 ? -config.chip * 0.3 : 0
          }}
        >
          {Array.from({ length: chipGroup.count }).map((_, i) => (
            <Chip
              key={`${chipGroup.denom.value}-${i}`}
              denom={chipGroup.denom}
              size={size}
              stackIndex={i}
            />
          ))}
        </div>
      ))}
      
      {/* Amount label */}
      {showLabel && (
        <div 
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap"
        >
          <span 
            className="px-1.5 py-0.5 rounded bg-black/70 text-white font-bold"
            style={{ fontSize: config.fontSize }}
          >
            {amount.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );

  if (!animated) return content;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {content}
    </motion.div>
  );
}, (prev, next) => {
  return (
    prev.amount === next.amount &&
    prev.size === next.size &&
    prev.showLabel === next.showLabel &&
    prev.animated === next.animated
  );
});

export default StableChipStack;
