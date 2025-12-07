import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface OptimizedPotDisplayProps {
  mainPot: number;
  sidePots?: number[];
  className?: string;
  compact?: boolean;
}

// Format chip amounts for display
function formatAmount(amount: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 10000) return `${(amount / 1000).toFixed(0)}K`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toLocaleString();
}

// Mini chip stack visual
const MiniChips = memo(function MiniChips({ count, color = 'amber' }: { count: number; color?: 'amber' | 'purple' }) {
  const colors = {
    amber: 'from-amber-400 to-amber-600 border-amber-300',
    purple: 'from-purple-400 to-purple-600 border-purple-300',
  };

  return (
    <div className="flex -space-x-1">
      {Array.from({ length: Math.min(4, count || 1) }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-4 h-4 rounded-full border shadow-sm',
            `bg-gradient-to-b ${colors[color]}`
          )}
          style={{ zIndex: 4 - i }}
        />
      ))}
    </div>
  );
});

// Side pot display
const SidePotBadge = memo(function SidePotBadge({ 
  pot, 
  index 
}: { 
  pot: number; 
  index: number;
}) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1 border border-purple-500/20"
    >
      <div className="w-3 h-3 rounded-full bg-gradient-to-b from-purple-400 to-purple-600 border border-purple-300" />
      <span className="text-purple-300 font-medium text-xs">
        {formatAmount(pot)}
      </span>
    </motion.div>
  );
});

export const OptimizedPotDisplay = memo(function OptimizedPotDisplay({
  mainPot,
  sidePots = [],
  className,
  compact = false
}: OptimizedPotDisplayProps) {
  const totalPot = useMemo(() => 
    mainPot + sidePots.reduce((a, b) => a + b, 0), 
    [mainPot, sidePots]
  );

  const chipCount = useMemo(() => 
    Math.min(4, Math.ceil(mainPot / 1000) || 1), 
    [mainPot]
  );

  if (totalPot <= 0) return null;

  return (
    <motion.div 
      className={cn('flex flex-col items-center gap-1', className)}
      layout
    >
      {/* Main pot */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`pot-${mainPot}`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={cn(
            'flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-full border border-white/10',
            compact ? 'px-3 py-1.5' : 'px-4 py-2'
          )}
        >
          <MiniChips count={chipCount} color="amber" />
          
          <div className="flex flex-col items-start">
            {sidePots.length > 0 && !compact && (
              <span className="text-white/50 text-[10px] uppercase tracking-wider">Main</span>
            )}
            <span className={cn(
              'text-amber-400 font-bold',
              compact ? 'text-xs' : 'text-sm'
            )}>
              {formatAmount(mainPot)}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Side pots */}
      <AnimatePresence>
        {sidePots.length > 0 && (
          <motion.div 
            className="flex flex-wrap gap-1.5 justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {sidePots.map((pot, i) => (
              <SidePotBadge key={`side-${i}-${pot}`} pot={pot} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Total (when there are side pots) */}
      {sidePots.length > 0 && !compact && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white/60 text-[10px]"
        >
          Total: <span className="text-white/80 font-medium">{formatAmount(totalPot)}</span>
        </motion.div>
      )}
    </motion.div>
  );
});

// Player bet chip display
interface PlayerBetDisplayProps {
  amount: number;
  className?: string;
}

export const PlayerBetDisplay = memo(function PlayerBetDisplay({
  amount,
  className
}: PlayerBetDisplayProps) {
  if (amount <= 0) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0, y: -10 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 border border-white/10',
        className
      )}
    >
      <div className="w-3 h-3 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-300" />
      <span className="text-white font-bold text-xs">{formatAmount(amount)}</span>
    </motion.div>
  );
});
