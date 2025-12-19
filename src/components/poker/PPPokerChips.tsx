import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Chip denominations with PPPoker-style colors
const CHIP_COLORS = {
  1: { bg: 'hsl(0, 72%, 51%)', border: 'hsl(0, 72%, 65%)', label: 'hsl(0, 72%, 85%)' },
  5: { bg: 'hsl(217, 91%, 60%)', border: 'hsl(217, 91%, 75%)', label: 'hsl(217, 91%, 90%)' },
  25: { bg: 'hsl(142, 71%, 45%)', border: 'hsl(142, 71%, 60%)', label: 'hsl(142, 71%, 85%)' },
  100: { bg: 'hsl(0, 0%, 10%)', border: 'hsl(0, 0%, 30%)', label: 'hsl(0, 0%, 70%)' },
  500: { bg: 'hsl(280, 87%, 50%)', border: 'hsl(280, 87%, 70%)', label: 'hsl(280, 87%, 90%)' },
  1000: { bg: 'hsl(45, 93%, 47%)', border: 'hsl(45, 93%, 65%)', label: 'hsl(45, 93%, 85%)' },
  5000: { bg: 'hsl(330, 81%, 60%)', border: 'hsl(330, 81%, 75%)', label: 'hsl(330, 81%, 90%)' },
  10000: { bg: 'hsl(199, 89%, 48%)', border: 'hsl(199, 89%, 65%)', label: 'hsl(199, 89%, 90%)' }
} as const;

interface ChipStackProps {
  value: number;
  count: number;
  index: number;
  size: 'sm' | 'md' | 'lg';
}

const ChipStack = memo(function ChipStack({ value, count, index, size }: ChipStackProps) {
  const chipSize = { sm: 16, md: 22, lg: 28 }[size];
  const stackHeight = Math.min(count, 5);
  const colors = CHIP_COLORS[value as keyof typeof CHIP_COLORS] || CHIP_COLORS[1];

  return (
    <motion.div
      initial={{ scale: 0, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 25,
        delay: index * 0.05 
      }}
      className="relative"
      style={{
        width: chipSize,
        height: chipSize + (stackHeight - 1) * 3
      }}
    >
      {Array.from({ length: stackHeight }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full flex items-center justify-center"
          style={{
            width: chipSize,
            height: chipSize,
            bottom: i * 3,
            background: `radial-gradient(circle at 30% 30%, ${colors.border}, ${colors.bg})`,
            boxShadow: `
              inset 0 2px 4px rgba(255,255,255,0.3),
              inset 0 -2px 4px rgba(0,0,0,0.3),
              0 2px 4px rgba(0,0,0,0.2)
            `
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 + i * 0.02 }}
        >
          {/* Chip edge pattern */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              border: `2px dashed ${colors.label}`,
              opacity: 0.4
            }}
          />
          {/* Center circle */}
          {i === stackHeight - 1 && (
            <div 
              className="w-1/2 h-1/2 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle, ${colors.label}, ${colors.border})`,
                fontSize: chipSize * 0.28,
                fontWeight: 700,
                color: colors.bg
              }}
            >
              {value >= 1000 ? `${value / 1000}K` : value}
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
});

interface PPPokerChipsProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  animate?: boolean;
  className?: string;
  direction?: 'horizontal' | 'vertical';
}

export const PPPokerChips = memo(function PPPokerChips({
  amount,
  size = 'md',
  showValue = true,
  animate = true,
  className,
  direction = 'horizontal'
}: PPPokerChipsProps) {
  // Calculate chip breakdown
  const chipBreakdown = useMemo(() => {
    const denominations = [10000, 5000, 1000, 500, 100, 25, 5, 1];
    const stacks: { value: number; count: number }[] = [];
    let remaining = amount;

    for (const denom of denominations) {
      if (remaining >= denom) {
        const count = Math.floor(remaining / denom);
        stacks.push({ value: denom, count: Math.min(count, 10) });
        remaining %= denom;
        if (stacks.length >= 4) break; // Max 4 stacks for visual clarity
      }
    }

    return stacks;
  }, [amount]);

  const Wrapper = animate ? motion.div : 'div';

  return (
    <Wrapper
      initial={animate ? { opacity: 0, scale: 0.8 } : undefined}
      animate={animate ? { opacity: 1, scale: 1 } : undefined}
      className={cn(
        'flex items-end gap-1',
        direction === 'vertical' && 'flex-col',
        className
      )}
    >
      {/* Chip stacks */}
      <div className="flex items-end -space-x-1">
        {chipBreakdown.map((stack, index) => (
          <ChipStack
            key={stack.value}
            value={stack.value}
            count={stack.count}
            index={index}
            size={size}
          />
        ))}
      </div>

      {/* Amount display */}
      {showValue && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            'font-bold tabular-nums',
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-sm',
            size === 'lg' && 'text-base'
          )}
          style={{
            color: 'hsl(var(--primary))',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}
        >
          {amount.toLocaleString()}
        </motion.div>
      )}
    </Wrapper>
  );
});

// Flying chips animation for pot wins
interface FlyingChipsProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  amount: number;
  onComplete?: () => void;
}

export const FlyingChips = memo(function FlyingChips({
  from,
  to,
  amount,
  onComplete
}: FlyingChipsProps) {
  const chipCount = Math.min(8, Math.max(3, Math.floor(amount / 500)));

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {Array.from({ length: chipCount }).map((_, i) => {
        const colors = CHIP_COLORS[1000];
        const offset = (i - chipCount / 2) * 8;
        
        return (
          <motion.div
            key={i}
            className="fixed pointer-events-none z-50"
            initial={{
              x: from.x + offset,
              y: from.y,
              scale: 0.5,
              opacity: 0
            }}
            animate={{
              x: to.x + offset * 0.5,
              y: to.y,
              scale: 1,
              opacity: [0, 1, 1, 0]
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.2,
              delay: i * 0.05,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
          >
            <div
              className="w-6 h-6 rounded-full"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${colors.border}, ${colors.bg})`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            />
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
});

export default PPPokerChips;
