import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PokerChipsProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

export function PokerChips({ amount, size = 'md', animated = true, className }: PokerChipsProps) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const chipSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  // Determine chip colors based on amount
  const getChipColors = (amount: number) => {
    if (amount >= 10000) return ['from-purple-500 to-purple-700', 'border-purple-300'];
    if (amount >= 5000) return ['from-amber-500 to-amber-700', 'border-amber-300'];
    if (amount >= 1000) return ['from-gray-600 to-gray-800', 'border-gray-400'];
    if (amount >= 500) return ['from-blue-500 to-blue-700', 'border-blue-300'];
    if (amount >= 100) return ['from-green-500 to-green-700', 'border-green-300'];
    return ['from-red-500 to-red-700', 'border-red-300'];
  };

  const [bgGradient, borderColor] = getChipColors(amount);

  // Calculate number of chip stacks to show (max 3)
  const stackCount = Math.min(3, Math.ceil(amount / 1000));
  const stacks = Array.from({ length: stackCount }, (_, i) => i);

  const Wrapper = animated ? motion.div : 'div';

  return (
    <Wrapper
      initial={animated ? { scale: 0, opacity: 0 } : undefined}
      animate={animated ? { scale: 1, opacity: 1 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn('flex items-center gap-1', className)}
    >
      {/* Chip stack */}
      <div className="flex -space-x-1">
        {stacks.map((i) => (
          <div
            key={i}
            className={cn(
              chipSizes[size],
              'rounded-full',
              `bg-gradient-to-br ${bgGradient}`,
              `border-2 ${borderColor}`,
              'shadow-md',
              'flex items-center justify-center'
            )}
            style={{ transform: `translateY(${-i * 2}px)` }}
          >
            <div className="w-1/2 h-1/2 rounded-full border border-white/30" />
          </div>
        ))}
      </div>
      
      {/* Amount text */}
      <span className={cn('font-bold text-primary', sizeClasses[size])}>
        {amount.toLocaleString()}
      </span>
    </Wrapper>
  );
}

interface PotDisplayProps {
  pot: number;
  className?: string;
}

export function PotDisplay({ pot, className }: PotDisplayProps) {
  if (pot <= 0) return null;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-full',
        'bg-gradient-to-r from-amber-500/20 to-yellow-500/20',
        'border border-amber-500/30',
        'shadow-lg shadow-amber-500/10',
        className
      )}
    >
      <div className="flex -space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'w-5 h-5 rounded-full',
              'bg-gradient-to-br from-amber-400 to-amber-600',
              'border border-amber-300',
              'shadow'
            )}
            style={{ transform: `translateY(${-i * 2}px)` }}
          />
        ))}
      </div>
      <span className="font-bold text-amber-500 text-lg">
        {pot.toLocaleString()}
      </span>
    </motion.div>
  );
}
