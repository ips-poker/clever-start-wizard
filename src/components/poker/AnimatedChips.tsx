import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RealisticPokerChip, RealisticChipStack } from './RealisticPokerChip';

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

  const sizeMap = {
    sm: 20,
    md: 28,
    lg: 36
  };

  return (
    <RealisticChipStack
      amount={amount}
      chipSize={sizeMap[size]}
      showAmount={showAmount}
      animated={animated}
      className={className}
    />
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

  // Calculate chip stacks for visual representation
  const getChipCount = (pot: number) => Math.min(6, Math.max(2, Math.ceil(Math.log10(pot + 1))));

  return (
    <motion.div 
      className={cn("flex flex-col items-center gap-2", className)}
      layout
    >
      {/* Main pot with realistic chip stacks */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`pot-${mainPot}`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="flex items-center gap-3 bg-black/70 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10"
          style={{
            boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}
        >
          {/* Realistic stacked chips */}
          <div className="flex items-end -space-x-2">
            {/* Stack of different colored chips based on pot size */}
            {mainPot >= 5000 && (
              <div className="relative" style={{ marginBottom: 4 }}>
                <RealisticPokerChip size={22} color="gold" animated delay={0.1} />
              </div>
            )}
            {mainPot >= 1000 && (
              <div className="relative" style={{ marginBottom: 2 }}>
                <RealisticPokerChip size={22} color="blue" animated delay={0.05} />
              </div>
            )}
            <div className="relative">
              <RealisticPokerChip size={22} color="red" animated delay={0} />
            </div>
          </div>
          
          <div className="flex flex-col items-start">
            {sidePots.length > 0 && (
              <span className="text-white/50 text-[10px] uppercase tracking-wider">Main</span>
            )}
            <span 
              className="text-amber-400 font-bold text-sm"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
            >
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
              className="flex items-center gap-1.5 bg-black/50 rounded-full px-2.5 py-1"
            >
              <RealisticPokerChip size={16} color="purple" animated delay={0.1 + i * 0.05} />
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

// Player bet display with realistic chip
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
        "flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5",
        className
      )}
    >
      <RealisticPokerChip size={18} color="red" animated />
      <span 
        className="text-white font-bold text-xs"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
      >
        {formatChipAmount(amount)}
      </span>
    </motion.div>
  );
});
