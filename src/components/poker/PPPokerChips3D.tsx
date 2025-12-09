// =====================================================
// PPPOKER-STYLE 3D CHIP STACK - PREMIUM VERSION
// =====================================================
// Ultra-realistic 3D poker chips with proper stacking,
// horizontal layout, and PPPoker-accurate denominations

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PPPokerChips3DProps {
  amount: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
  maxChips?: number;
  layout?: 'stacked' | 'horizontal';
}

// PPPoker chip denominations with accurate colors
const CHIP_DENOMINATIONS = [
  { value: 100000, primary: '#fbbf24', secondary: '#d97706', edge: '#b45309', label: '100K' },
  { value: 50000, primary: '#a855f7', secondary: '#9333ea', edge: '#7c3aed', label: '50K' },
  { value: 10000, primary: '#f472b6', secondary: '#ec4899', edge: '#db2777', label: '10K' },
  { value: 5000, primary: '#fb923c', secondary: '#f97316', edge: '#ea580c', label: '5K' },
  { value: 1000, primary: '#1f2937', secondary: '#111827', edge: '#030712', label: '1K' },
  { value: 500, primary: '#a855f7', secondary: '#7c3aed', edge: '#6d28d9', label: '500' },
  { value: 100, primary: '#22c55e', secondary: '#16a34a', edge: '#15803d', label: '100' },
  { value: 50, primary: '#3b82f6', secondary: '#2563eb', edge: '#1d4ed8', label: '50' },
  { value: 25, primary: '#22c55e', secondary: '#16a34a', edge: '#15803d', label: '25' },
  { value: 10, primary: '#3b82f6', secondary: '#2563eb', edge: '#1d4ed8', label: '10' },
  { value: 5, primary: '#ef4444', secondary: '#dc2626', edge: '#b91c1c', label: '5' },
  { value: 1, primary: '#f8fafc', secondary: '#e2e8f0', edge: '#cbd5e1', label: '1' },
];

// Calculate chip breakdown
function calculateChips(amount: number, maxStacks: number = 3): Array<{ denom: typeof CHIP_DENOMINATIONS[0], count: number }> {
  const result: Array<{ denom: typeof CHIP_DENOMINATIONS[0], count: number }> = [];
  let remaining = amount;
  
  for (const denom of CHIP_DENOMINATIONS) {
    if (remaining >= denom.value && result.length < maxStacks) {
      const count = Math.min(Math.floor(remaining / denom.value), 5);
      if (count > 0) {
        result.push({ denom, count });
        remaining -= count * denom.value;
      }
    }
  }
  
  // If still remaining and no chips added, use smallest denomination
  if (result.length === 0 && amount > 0) {
    const smallestDenom = CHIP_DENOMINATIONS[CHIP_DENOMINATIONS.length - 1];
    result.push({ denom: smallestDenom, count: Math.min(amount, 5) });
  }
  
  return result;
}

function formatChipAmount(amount: number): string {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K';
  return amount.toLocaleString();
}

const SIZE_CONFIG = {
  xs: { chipW: 18, chipH: 14, stackGap: 2.5, fontSize: '8px', labelPx: 'px-1.5', labelPy: 'py-0.5' },
  sm: { chipW: 22, chipH: 17, stackGap: 3, fontSize: '10px', labelPx: 'px-2', labelPy: 'py-0.5' },
  md: { chipW: 28, chipH: 22, stackGap: 3.5, fontSize: '11px', labelPx: 'px-2.5', labelPy: 'py-1' },
  lg: { chipW: 36, chipH: 28, stackGap: 4, fontSize: '13px', labelPx: 'px-3', labelPy: 'py-1' }
};

// Single 3D chip with side view effect
const Chip3D = memo(function Chip3D({
  width,
  height,
  primary,
  secondary,
  edge,
  stackIndex = 0,
  animated = false
}: {
  width: number;
  height: number;
  primary: string;
  secondary: string;
  edge: string;
  stackIndex?: number;
  animated?: boolean;
}) {
  const yOffset = -(stackIndex * 3);
  
  return (
    <motion.div
      initial={animated ? { scale: 0, y: 15, opacity: 0 } : false}
      animate={{ scale: 1, y: yOffset, opacity: 1 }}
      transition={{ 
        delay: stackIndex * 0.04, 
        type: 'spring', 
        stiffness: 350, 
        damping: 22 
      }}
      className="absolute"
      style={{
        width,
        height: height * 0.7,
        bottom: 0,
        left: '50%',
        marginLeft: -width / 2
      }}
    >
      {/* Chip edge (3D side) */}
      <div
        className="absolute inset-x-0 bottom-0 rounded-[2px]"
        style={{
          height: 4,
          background: `linear-gradient(180deg, ${secondary} 0%, ${edge} 50%, ${secondary} 100%)`,
          boxShadow: `0 1px 3px rgba(0,0,0,0.5)`
        }}
      />
      
      {/* Chip face (ellipse) */}
      <div
        className="absolute inset-0 rounded-[50%] overflow-hidden"
        style={{
          background: `radial-gradient(ellipse at 35% 30%, ${primary} 0%, ${secondary} 60%, ${edge} 100%)`,
          boxShadow: `
            inset 0 2px 6px rgba(255,255,255,0.4), 
            inset 0 -3px 6px rgba(0,0,0,0.3),
            0 1px 4px rgba(0,0,0,0.4)
          `,
          border: `1.5px solid ${edge}`
        }}
      >
        {/* Outer ring pattern */}
        <div
          className="absolute inset-[12%] rounded-[50%]"
          style={{
            border: `1.5px dashed rgba(255,255,255,0.35)`
          }}
        />
        
        {/* Inner ring pattern */}
        <div
          className="absolute inset-[25%] rounded-[50%]"
          style={{
            border: `1px solid rgba(255,255,255,0.2)`
          }}
        />
        
        {/* Center highlight */}
        <div
          className="absolute inset-[30%] rounded-[50%]"
          style={{
            background: `radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)`
          }}
        />
        
        {/* Top left reflection */}
        <div
          className="absolute top-[10%] left-[15%] w-[25%] h-[20%] rounded-[50%]"
          style={{
            background: `linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 100%)`
          }}
        />
      </div>
    </motion.div>
  );
});

// Stack of same denomination chips
const ChipStack = memo(function ChipStack({
  denom,
  count,
  size,
  animated,
  stackDelay = 0
}: {
  denom: typeof CHIP_DENOMINATIONS[0];
  count: number;
  size: typeof SIZE_CONFIG['sm'];
  animated: boolean;
  stackDelay?: number;
}) {
  return (
    <div 
      className="relative"
      style={{ 
        width: size.chipW, 
        height: size.chipH + (count * size.stackGap)
      }}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <Chip3D
          key={idx}
          width={size.chipW}
          height={size.chipH}
          primary={denom.primary}
          secondary={denom.secondary}
          edge={denom.edge}
          stackIndex={idx}
          animated={animated}
        />
      ))}
    </div>
  );
});

export const PPPokerChips3D = memo(function PPPokerChips3D({
  amount,
  size = 'sm',
  showLabel = true,
  animated = true,
  maxChips = 4,
  layout = 'horizontal'
}: PPPokerChips3DProps) {
  const config = SIZE_CONFIG[size];
  
  const chipStacks = useMemo(() => calculateChips(amount, 3), [amount]);

  if (amount <= 0) return null;

  return (
    <motion.div 
      className="flex flex-col items-center"
      initial={animated ? { scale: 0.8, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Chips container - horizontal layout */}
      <div className="flex items-end gap-0.5">
        {chipStacks.map((stack, idx) => (
          <ChipStack
            key={`${stack.denom.value}-${idx}`}
            denom={stack.denom}
            count={stack.count}
            size={config}
            animated={animated}
            stackDelay={idx * 0.1}
          />
        ))}
      </div>
      
      {/* Amount label - PPPoker style pill */}
      {showLabel && (
        <motion.div
          initial={animated ? { opacity: 0, y: 5 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={cn(
            "mt-0.5 rounded-full font-bold text-white shadow-lg flex items-center justify-center",
            config.labelPx,
            config.labelPy
          )}
          style={{
            fontSize: config.fontSize,
            minWidth: size === 'xs' ? 28 : size === 'sm' ? 36 : 44,
            background: 'linear-gradient(180deg, rgba(15,15,15,0.95) 0%, rgba(5,5,5,0.98) 100%)',
            border: '1px solid rgba(251,191,36,0.5)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}
        >
          <span style={{
            background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {formatChipAmount(amount)}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
});

// =====================================================
// BET DISPLAY WITH POSITION CALCULATION
// =====================================================
export const PPPokerBetDisplay = memo(function PPPokerBetDisplay({
  amount,
  position,
  isMobile = false,
  animated = true
}: {
  amount: number;
  position: { x: number; y: number };
  isMobile?: boolean;
  animated?: boolean;
}) {
  if (!amount || amount <= 0) return null;
  
  // Calculate offset towards table center
  const centerX = 50;
  const centerY = 42;
  const dx = centerX - position.x;
  const dy = centerY - position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const multiplier = isMobile ? 20 : 28;
  const offsetX = distance > 0 ? (dx / distance) * multiplier : 0;
  const offsetY = distance > 0 ? (dy / distance) * multiplier : 0;

  return (
    <motion.div
      initial={animated ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      className="absolute z-15 pointer-events-none"
      style={{
        left: `${position.x + offsetX}%`,
        top: `${position.y + offsetY}%`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <PPPokerChips3D 
        amount={amount} 
        size={isMobile ? 'xs' : 'sm'} 
        showLabel={true} 
        animated={animated} 
      />
    </motion.div>
  );
});

// =====================================================
// POT DISPLAY WITH LARGE CHIPS
// =====================================================
export const PPPokerPotDisplay = memo(function PPPokerPotDisplay({
  amount,
  sidePots = [],
  isMobile = false,
  animated = true
}: {
  amount: number;
  sidePots?: Array<{ amount: number; players?: string[] }>;
  isMobile?: boolean;
  animated?: boolean;
}) {
  if (amount <= 0) return null;

  return (
    <motion.div
      initial={animated ? { scale: 0.8, opacity: 0, y: 10 } : false}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-1"
    >
      {/* Main pot */}
      <div className="flex flex-col items-center">
        <PPPokerChips3D 
          amount={amount} 
          size={isMobile ? 'sm' : 'md'} 
          showLabel={false}
          animated={animated}
          maxChips={5}
        />
        <motion.div
          initial={animated ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "mt-1 rounded-full font-black text-center shadow-lg",
            isMobile ? "px-3 py-1 text-sm" : "px-4 py-1.5 text-base"
          )}
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(20,20,20,0.95) 100%)',
            border: '2px solid rgba(34,197,94,0.6)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6), 0 0 20px rgba(34,197,94,0.2)'
          }}
        >
          <span style={{
            background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            POT: {formatChipAmount(amount)}
          </span>
        </motion.div>
      </div>
      
      {/* Side pots */}
      {sidePots.length > 0 && (
        <div className="flex gap-2 mt-1">
          {sidePots.map((pot, idx) => (
            <motion.div
              key={idx}
              initial={animated ? { scale: 0 } : false}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              className={cn(
                "rounded-full font-bold text-amber-400 shadow",
                isMobile ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs"
              )}
              style={{
                background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(30,30,30,0.9) 100%)',
                border: '1px solid rgba(251,191,36,0.4)'
              }}
            >
              Side {idx + 1}: {formatChipAmount(pot.amount)}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
});

export default PPPokerChips3D;