// =====================================================
// PPPOKER-STYLE ENHANCED CHIPS - ULTRA REALISTIC
// =====================================================
// High-quality 3D chips with realistic lighting and textures

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Chip denominations with PPPoker-accurate colors and patterns
const CHIP_CONFIG = [
  { value: 100000, bg: '#fbbf24', edge: '#b45309', pattern: '#d97706', label: '100K', textColor: '#1f2937' },
  { value: 50000,  bg: '#a855f7', edge: '#6b21a8', pattern: '#7c3aed', label: '50K', textColor: '#ffffff' },
  { value: 25000,  bg: '#f472b6', edge: '#be185d', pattern: '#db2777', label: '25K', textColor: '#ffffff' },
  { value: 10000,  bg: '#06b6d4', edge: '#0e7490', pattern: '#0891b2', label: '10K', textColor: '#ffffff' },
  { value: 5000,   bg: '#fb923c', edge: '#c2410c', pattern: '#ea580c', label: '5K', textColor: '#1f2937' },
  { value: 1000,   bg: '#1f2937', edge: '#0f172a', pattern: '#374151', label: '1K', textColor: '#ffffff' },
  { value: 500,    bg: '#a855f7', edge: '#7c3aed', pattern: '#8b5cf6', label: '500', textColor: '#ffffff' },
  { value: 100,    bg: '#22c55e', edge: '#15803d', pattern: '#16a34a', label: '100', textColor: '#ffffff' },
  { value: 50,     bg: '#3b82f6', edge: '#1d4ed8', pattern: '#2563eb', label: '50', textColor: '#ffffff' },
  { value: 25,     bg: '#22c55e', edge: '#15803d', pattern: '#16a34a', label: '25', textColor: '#ffffff' },
  { value: 10,     bg: '#3b82f6', edge: '#1d4ed8', pattern: '#2563eb', label: '10', textColor: '#ffffff' },
  { value: 5,      bg: '#ef4444', edge: '#b91c1c', pattern: '#dc2626', label: '5', textColor: '#ffffff' },
  { value: 1,      bg: '#f1f5f9', edge: '#94a3b8', pattern: '#cbd5e1', label: '1', textColor: '#1f2937' },
];

interface ChipStackData {
  config: typeof CHIP_CONFIG[0];
  count: number;
}

function calculateChipStacks(amount: number, maxStacks: number = 3): ChipStackData[] {
  const stacks: ChipStackData[] = [];
  let remaining = Math.round(amount);
  
  for (const config of CHIP_CONFIG) {
    if (remaining >= config.value && stacks.length < maxStacks) {
      const count = Math.min(Math.floor(remaining / config.value), 5);
      if (count > 0) {
        stacks.push({ config, count });
        remaining -= count * config.value;
      }
    }
  }
  
  // Ensure at least one chip is shown
  if (stacks.length === 0 && amount > 0) {
    stacks.push({ config: CHIP_CONFIG[CHIP_CONFIG.length - 1], count: Math.min(amount, 5) });
  }
  
  return stacks;
}

function formatAmount(amount: number): string {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (amount >= 10000) return (amount / 1000).toFixed(0) + 'K';
  if (amount >= 1000) return (amount / 1000).toFixed(1).replace('.0', '') + 'K';
  return amount.toLocaleString();
}

// Single 3D chip component
const RealisticChip = memo(function RealisticChip({
  config,
  size,
  stackIndex,
  animated
}: {
  config: typeof CHIP_CONFIG[0];
  size: number;
  stackIndex: number;
  animated: boolean;
}) {
  const chipHeight = size * 0.18;
  const yOffset = -(stackIndex * (chipHeight * 0.7));
  
  return (
    <motion.div
      initial={animated ? { scale: 0, y: 20, opacity: 0 } : false}
      animate={{ scale: 1, y: yOffset, opacity: 1 }}
      transition={{ 
        delay: stackIndex * 0.03,
        type: 'spring',
        stiffness: 400,
        damping: 25
      }}
      className="absolute"
      style={{
        width: size,
        height: size * 0.6,
        bottom: 0,
        left: '50%',
        marginLeft: -size / 2
      }}
    >
      {/* Chip edge (3D side) */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: chipHeight,
          background: `linear-gradient(180deg, ${config.pattern} 0%, ${config.edge} 50%, ${config.pattern} 100%)`,
          borderRadius: '0 0 3px 3px',
          boxShadow: `0 2px 4px rgba(0,0,0,0.4), inset 0 -1px 0 rgba(255,255,255,0.1)`
        }}
      >
        {/* Edge pattern stripes */}
        <div className="absolute inset-0 flex justify-around items-center overflow-hidden rounded-b">
          {Array.from({ length: 8 }).map((_, i) => (
            <div 
              key={i} 
              className="w-0.5 h-full opacity-40"
              style={{ background: config.textColor }}
            />
          ))}
        </div>
      </div>
      
      {/* Chip face (top) */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          background: `radial-gradient(ellipse at 35% 25%, ${config.bg} 0%, ${config.pattern} 70%, ${config.edge} 100%)`,
          boxShadow: `
            inset 0 3px 8px rgba(255,255,255,0.35),
            inset 0 -3px 8px rgba(0,0,0,0.25),
            0 2px 6px rgba(0,0,0,0.3)
          `,
          border: `2px solid ${config.edge}`
        }}
      >
        {/* Outer decorative ring */}
        <div 
          className="absolute inset-[10%] rounded-full"
          style={{ border: `2px dashed ${config.textColor}40` }}
        />
        
        {/* Inner circle with value */}
        <div 
          className="absolute inset-[25%] rounded-full flex items-center justify-center"
          style={{ 
            background: `radial-gradient(circle, ${config.pattern}80 0%, transparent 100%)`,
            border: `1px solid ${config.textColor}20`
          }}
        >
          {stackIndex === 0 && size >= 20 && (
            <span 
              className="font-black leading-none"
              style={{ 
                fontSize: size * 0.22,
                color: config.textColor,
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}
            >
              {config.label}
            </span>
          )}
        </div>
        
        {/* Top-left highlight reflection */}
        <div
          className="absolute top-[8%] left-[12%] w-[30%] h-[25%] rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 100%)'
          }}
        />
      </div>
    </motion.div>
  );
});

// Chip stack component
const ChipStack = memo(function ChipStack({
  stack,
  size,
  animated,
  delay = 0
}: {
  stack: ChipStackData;
  size: number;
  animated: boolean;
  delay?: number;
}) {
  const chipHeight = size * 0.18;
  const totalHeight = size * 0.6 + (stack.count - 1) * (chipHeight * 0.7);
  
  return (
    <div className="relative" style={{ width: size, height: totalHeight }}>
      {Array.from({ length: stack.count }).map((_, idx) => (
        <RealisticChip
          key={idx}
          config={stack.config}
          size={size}
          stackIndex={idx}
          animated={animated}
        />
      ))}
    </div>
  );
});

interface PPPokerEnhancedChipsProps {
  amount: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: { chip: 20, fontSize: '9px', padding: 'px-1.5 py-0.5', minWidth: 32 },
  sm: { chip: 26, fontSize: '10px', padding: 'px-2 py-0.5', minWidth: 40 },
  md: { chip: 32, fontSize: '12px', padding: 'px-2.5 py-1', minWidth: 48 },
  lg: { chip: 40, fontSize: '14px', padding: 'px-3 py-1', minWidth: 56 }
};

export const PPPokerEnhancedChips = memo(function PPPokerEnhancedChips({
  amount,
  size = 'sm',
  showLabel = true,
  animated = true,
  className
}: PPPokerEnhancedChipsProps) {
  const config = SIZE_MAP[size];
  const stacks = useMemo(() => calculateChipStacks(amount, 3), [amount]);

  if (amount <= 0) return null;

  return (
    <motion.div 
      className={cn("flex flex-col items-center", className)}
      initial={animated ? { scale: 0.8, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Chip stacks */}
      <div className="flex items-end gap-0.5">
        {stacks.map((stack, idx) => (
          <ChipStack
            key={`${stack.config.value}-${idx}`}
            stack={stack}
            size={config.chip}
            animated={animated}
            delay={idx * 0.08}
          />
        ))}
      </div>
      
      {/* Amount label - PPPoker style golden pill */}
      {showLabel && (
        <motion.div
          initial={animated ? { opacity: 0, y: 5 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={cn("mt-1 rounded-full font-bold text-center shadow-lg flex items-center justify-center", config.padding)}
          style={{
            fontSize: config.fontSize,
            minWidth: config.minWidth,
            background: 'linear-gradient(180deg, rgba(10,10,10,0.95) 0%, rgba(0,0,0,0.98) 100%)',
            border: '1.5px solid rgba(251,191,36,0.5)',
            boxShadow: '0 3px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}
        >
          <span style={{
            background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {formatAmount(amount)}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
});

// Bet display positioned near player avatar
interface PPPokerBetChipsProps {
  amount: number;
  position: { x: number; y: number };
  isMobile?: boolean;
  animated?: boolean;
}

export const PPPokerBetChips = memo(function PPPokerBetChips({
  amount,
  position,
  isMobile = false,
  animated = true
}: PPPokerBetChipsProps) {
  if (!amount || amount <= 0) return null;

  // Calculate offset towards table center
  const centerX = 50, centerY = 42;
  const dx = centerX - position.x;
  const dy = centerY - position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const multiplier = isMobile ? 22 : 30;
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
      <PPPokerEnhancedChips 
        amount={amount} 
        size={isMobile ? 'xs' : 'sm'} 
        showLabel={true}
        animated={animated}
      />
    </motion.div>
  );
});

// Main pot display
interface PPPokerMainPotProps {
  amount: number;
  sidePots?: Array<{ amount: number; players?: string[] }>;
  isMobile?: boolean;
  animated?: boolean;
}

export const PPPokerMainPot = memo(function PPPokerMainPot({
  amount,
  sidePots = [],
  isMobile = false,
  animated = true
}: PPPokerMainPotProps) {
  if (amount <= 0) return null;

  return (
    <motion.div
      initial={animated ? { scale: 0.8, opacity: 0, y: 10 } : false}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-1"
    >
      {/* Chips visual */}
      <PPPokerEnhancedChips 
        amount={amount} 
        size={isMobile ? 'sm' : 'md'} 
        showLabel={false}
        animated={animated}
      />
      
      {/* Pot label - PPPoker style */}
      <motion.div
        initial={animated ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={cn(
          "rounded-full font-black text-center shadow-xl",
          isMobile ? "px-4 py-1.5 text-sm" : "px-5 py-2 text-base"
        )}
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.92) 0%, rgba(15,15,15,0.95) 100%)',
          border: '2px solid rgba(34,197,94,0.6)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6), 0 0 30px rgba(34,197,94,0.15)'
        }}
      >
        <span className="flex items-center gap-1.5">
          <span className="text-white/50 font-medium">Банк:</span>
          <span style={{
            background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {formatAmount(amount)}
          </span>
        </span>
      </motion.div>
      
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
                "rounded-full font-bold shadow-lg",
                isMobile ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
              )}
              style={{
                background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(20,20,20,0.9) 100%)',
                border: '1px solid rgba(251,191,36,0.4)',
                color: '#fbbf24'
              }}
            >
              Side {idx + 1}: {formatAmount(pot.amount)}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
});

export default PPPokerEnhancedChips;
