import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Chip colors based on value
const getChipStyle = (amount: number) => {
  if (amount >= 10000) return { bg: 'from-amber-400 to-amber-600', border: 'border-amber-300' };
  if (amount >= 5000) return { bg: 'from-purple-400 to-purple-600', border: 'border-purple-300' };
  if (amount >= 1000) return { bg: 'from-slate-600 to-slate-800', border: 'border-slate-400' };
  if (amount >= 500) return { bg: 'from-emerald-400 to-emerald-600', border: 'border-emerald-300' };
  if (amount >= 100) return { bg: 'from-blue-400 to-blue-600', border: 'border-blue-300' };
  if (amount >= 25) return { bg: 'from-red-400 to-red-600', border: 'border-red-300' };
  return { bg: 'from-gray-300 to-gray-500', border: 'border-gray-200' };
};

export function formatChipAmount(amount: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 10000) return `${(amount / 1000).toFixed(0)}K`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toLocaleString();
}

interface ChipStackProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  showAmount?: boolean;
  animated?: boolean;
  className?: string;
}

export const ChipStack = memo(function ChipStack({
  amount,
  size = 'md',
  showAmount = true,
  animated = true,
  className
}: ChipStackProps) {
  if (amount <= 0) return null;

  const sizeClasses = {
    sm: { chip: 'w-5 h-5', text: 'text-[10px]', spacing: 1.5 },
    md: { chip: 'w-7 h-7', text: 'text-xs', spacing: 2 },
    lg: { chip: 'w-9 h-9', text: 'text-sm', spacing: 2.5 }
  };

  const { chip: chipSize, text, spacing } = sizeClasses[size];
  const chipCount = Math.min(5, Math.max(1, Math.ceil(amount / 500)));
  const style = getChipStyle(amount);

  return (
    <motion.div
      className={cn("flex items-center gap-1", className)}
      initial={animated ? { scale: 0, opacity: 0 } : undefined}
      animate={animated ? { scale: 1, opacity: 1 } : undefined}
      exit={animated ? { scale: 0, opacity: 0 } : undefined}
      transition={animated ? { type: 'spring' as const, stiffness: 400, damping: 25 } : undefined}
    >
      {/* Chip stack */}
      <div className="relative" style={{ width: chipSize.split(' ')[0] }}>
        {Array.from({ length: chipCount }).map((_, i) => (
          <motion.div
            key={i}
            className={cn(
              chipSize,
              "absolute rounded-full border-2 shadow-md",
              `bg-gradient-to-b ${style.bg}`,
              style.border
            )}
            style={{ bottom: i * spacing }}
            initial={animated ? { y: -8, opacity: 0 } : undefined}
            animate={animated ? { y: 0, opacity: 1 } : undefined}
            transition={animated ? { delay: i * 0.04 } : undefined}
          >
            {/* Inner ring pattern */}
            <div className="absolute inset-1 rounded-full border border-white/30" />
            <div className="absolute inset-[6px] rounded-full bg-white/10" />
          </motion.div>
        ))}
      </div>

      {/* Amount */}
      {showAmount && (
        <motion.span
          className={cn("text-white font-bold drop-shadow-lg", text)}
          style={{ marginLeft: 4 }}
          initial={animated ? { x: -4, opacity: 0 } : undefined}
          animate={animated ? { x: 0, opacity: 1 } : undefined}
          transition={animated ? { delay: 0.15 } : undefined}
        >
          {formatChipAmount(amount)}
        </motion.span>
      )}
    </motion.div>
  );
});

interface PotDisplayProps {
  mainPot: number;
  sidePots?: number[];
  className?: string;
}

export const PotDisplay = memo(function PotDisplay({
  mainPot,
  sidePots = [],
  className
}: PotDisplayProps) {
  const totalPot = mainPot + sidePots.reduce((a, b) => a + b, 0);

  if (totalPot <= 0) return null;

  return (
    <motion.div 
      className={cn("flex flex-col items-center gap-1", className)}
      layout
    >
      {/* Main pot */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`pot-${mainPot}`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10"
        >
          {/* Mini chips */}
          <div className="flex -space-x-1">
            {[...Array(Math.min(4, Math.ceil(mainPot / 1000) || 1))].map((_, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-300 shadow-sm"
                style={{ zIndex: 4 - i }}
              />
            ))}
          </div>
          
          <div className="flex flex-col items-start">
            {sidePots.length > 0 && (
              <span className="text-white/50 text-[10px] uppercase tracking-wider">Main</span>
            )}
            <span className="text-amber-400 font-bold text-sm">
              {formatChipAmount(mainPot)}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Side pots */}
      {sidePots.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {sidePots.map((pot, i) => (
            <motion.div
              key={`side-${i}-${pot}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-1 bg-black/50 rounded-full px-2.5 py-1"
            >
              <div className="w-3 h-3 rounded-full bg-gradient-to-b from-purple-400 to-purple-600 border border-purple-300" />
              <span className="text-purple-300 font-medium text-xs">
                {formatChipAmount(pot)}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Total (when there are side pots) */}
      {sidePots.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white/60 text-[10px] mt-0.5"
        >
          Total: <span className="text-white/80">{formatChipAmount(totalPot)}</span>
        </motion.div>
      )}
    </motion.div>
  );
});

// Player bet display
interface PlayerBetProps {
  amount: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const PlayerBet = memo(function PlayerBet({
  amount,
  position = 'bottom',
  className
}: PlayerBetProps) {
  if (amount <= 0) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0, y: position === 'top' ? -20 : 20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        "flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5",
        className
      )}
    >
      <div className="w-3 h-3 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-300" />
      <span className="text-white font-bold text-xs">{formatChipAmount(amount)}</span>
    </motion.div>
  );
});
