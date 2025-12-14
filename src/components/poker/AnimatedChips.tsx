import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PPPokerChip, PPPokerChipStackVisual, PotChips } from './RealisticPokerChip';

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

  const bbValue = amount / 20; // Assume 20 BB default

  return (
    <motion.div 
      className={cn("flex items-end gap-1.5", className)}
      initial={animated ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
    >
      <PPPokerChipStackVisual
        size={sizeMap[size]}
        bbValue={bbValue}
        stackCount={Math.min(3, Math.max(1, Math.ceil(Math.log10(amount + 1))))}
        animated={animated}
      />

      {showAmount && (
        <motion.span
          className="font-bold text-white text-sm drop-shadow-lg"
          initial={animated ? { opacity: 0, x: -5 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
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
  bigBlind?: number;
  className?: string;
}

export const PotDisplay = memo(function PotDisplay({
  mainPot,
  sidePots = [],
  bigBlind = 20,
  className
}: PotDisplayProps) {
  const totalPot = mainPot + sidePots.reduce((a, b) => a + b, 0);

  if (totalPot <= 0) return null;

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
          {/* PPPoker style pot chips - multiple colors based on amount */}
          <PotChips 
            amount={mainPot} 
            bigBlind={bigBlind} 
            size={22} 
            animated 
          />
          
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
              <PPPokerChip size={16} color="purple" />
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
  bigBlind?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const PlayerBet = memo(function PlayerBet({
  amount,
  bigBlind = 20,
  position = 'bottom',
  className
}: PlayerBetProps) {
  if (amount <= 0) return null;

  const bbValue = bigBlind > 0 ? amount / bigBlind : 1;

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
      <PPPokerChipStackVisual size={18} bbValue={bbValue} stackCount={2} animated />
      <span 
        className="text-white font-bold text-xs"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
      >
        {formatChipAmount(amount)}
      </span>
    </motion.div>
  );
});
