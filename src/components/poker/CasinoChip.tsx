// =====================================================
// CASINO-GRADE POKER CHIP - Ultra Realistic Design
// =====================================================
// Features: 3D perspective, metallic edge inserts,
// detailed textures, realistic stacking with physics

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Casino standard chip denominations with accurate colors
const CHIP_DENOMINATIONS = {
  1: { color: 'white', label: '1', primary: '#f8fafc', secondary: '#e2e8f0', edge: '#cbd5e1', text: '#1e293b' },
  5: { color: 'red', label: '5', primary: '#ef4444', secondary: '#dc2626', edge: '#b91c1c', text: '#ffffff' },
  10: { color: 'blue', label: '10', primary: '#3b82f6', secondary: '#2563eb', edge: '#1d4ed8', text: '#ffffff' },
  25: { color: 'green', label: '25', primary: '#22c55e', secondary: '#16a34a', edge: '#15803d', text: '#ffffff' },
  50: { color: 'orange', label: '50', primary: '#f97316', secondary: '#ea580c', edge: '#c2410c', text: '#ffffff' },
  100: { color: 'black', label: '100', primary: '#1f2937', secondary: '#111827', edge: '#030712', text: '#ffffff' },
  500: { color: 'purple', label: '500', primary: '#a855f7', secondary: '#9333ea', edge: '#7c3aed', text: '#ffffff' },
  1000: { color: 'gold', label: '1K', primary: '#fbbf24', secondary: '#f59e0b', edge: '#d97706', text: '#1c1917' },
  5000: { color: 'pink', label: '5K', primary: '#ec4899', secondary: '#db2777', edge: '#be185d', text: '#ffffff' },
  10000: { color: 'cyan', label: '10K', primary: '#06b6d4', secondary: '#0891b2', edge: '#0e7490', text: '#ffffff' },
  25000: { color: 'lime', label: '25K', primary: '#84cc16', secondary: '#65a30d', edge: '#4d7c0f', text: '#ffffff' },
  50000: { color: 'rose', label: '50K', primary: '#f43f5e', secondary: '#e11d48', edge: '#be123c', text: '#ffffff' },
  100000: { color: 'amber', label: '100K', primary: '#fcd34d', secondary: '#fbbf24', edge: '#f59e0b', text: '#1c1917' }
};

type ChipValue = keyof typeof CHIP_DENOMINATIONS;

interface CasinoChipProps {
  value?: ChipValue;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showValue?: boolean;
  animated?: boolean;
  stackIndex?: number;
  className?: string;
}

const SIZE_CONFIG = {
  xs: { diameter: 24, thickness: 4, fontSize: 6, insertSize: 3 },
  sm: { diameter: 32, thickness: 5, fontSize: 8, insertSize: 4 },
  md: { diameter: 44, thickness: 6, fontSize: 10, insertSize: 5 },
  lg: { diameter: 56, thickness: 8, fontSize: 13, insertSize: 6 },
  xl: { diameter: 72, thickness: 10, fontSize: 16, insertSize: 8 }
};

// Single Casino Chip Component
export const CasinoChip = memo(function CasinoChip({
  value = 100,
  size = 'md',
  showValue = true,
  animated = true,
  stackIndex = 0,
  className
}: CasinoChipProps) {
  const config = SIZE_CONFIG[size];
  const denom = CHIP_DENOMINATIONS[value] || CHIP_DENOMINATIONS[100];
  const chipId = useMemo(() => `chip-${Math.random().toString(36).slice(2, 8)}`, []);

  // 8 edge inserts positioned around the chip
  const inserts = Array.from({ length: 8 }).map((_, i) => ({
    angle: i * 45,
    isAlternate: i % 2 === 0
  }));

  return (
    <motion.div
      className={cn("relative flex-shrink-0", className)}
      initial={animated ? { scale: 0, y: 20, opacity: 0 } : false}
      animate={{ 
        scale: 1, 
        y: -(stackIndex * (config.thickness - 1)), 
        opacity: 1 
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
        delay: stackIndex * 0.03
      }}
      style={{
        width: config.diameter,
        height: config.diameter,
        perspective: 200,
        transformStyle: 'preserve-3d'
      }}
    >
      <svg 
        viewBox="0 0 100 110" 
        className="w-full h-full"
        style={{
          filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))'
        }}
      >
        <defs>
          {/* Main surface gradient */}
          <radialGradient id={`surface-${chipId}`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor={denom.primary} />
            <stop offset="50%" stopColor={denom.secondary} />
            <stop offset="100%" stopColor={denom.edge} />
          </radialGradient>
          
          {/* Edge gradient for 3D effect */}
          <linearGradient id={`edge-${chipId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={denom.secondary} />
            <stop offset="50%" stopColor={denom.edge} />
            <stop offset="100%" stopColor="#000" stopOpacity="0.5" />
          </linearGradient>
          
          {/* Insert gradient */}
          <linearGradient id={`insert-${chipId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          
          {/* Gloss effect */}
          <radialGradient id={`gloss-${chipId}`} cx="30%" cy="25%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.6" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
        
        {/* 3D Edge (chip thickness) */}
        <ellipse 
          cx="50" cy="56" rx="47" ry="8"
          fill="rgba(0,0,0,0.4)"
        />
        <ellipse 
          cx="50" cy="54" rx="48" ry="8"
          fill={`url(#edge-${chipId})`}
        />
        
        {/* Main chip face - outer edge */}
        <circle cx="50" cy="50" r="48" fill={denom.edge} />
        
        {/* Main chip surface */}
        <circle cx="50" cy="50" r="46" fill={`url(#surface-${chipId})`} />
        
        {/* Edge inserts */}
        {inserts.map((insert, i) => (
          <g key={i} transform={`rotate(${insert.angle}, 50, 50)`}>
            <rect
              x="42"
              y="3"
              width="16"
              height="8"
              rx="2"
              fill={insert.isAlternate ? `url(#insert-${chipId})` : denom.edge}
            />
            {insert.isAlternate && (
              <rect
                x="43"
                y="4"
                width="14"
                height="2"
                rx="1"
                fill="rgba(255,255,255,0.5)"
              />
            )}
          </g>
        ))}
        
        {/* Inner decorative rings */}
        <circle 
          cx="50" cy="50" r="32" 
          fill="none" 
          stroke="rgba(255,255,255,0.15)" 
          strokeWidth="1"
        />
        <circle 
          cx="50" cy="50" r="28" 
          fill="none" 
          stroke={denom.edge} 
          strokeWidth="0.5"
        />
        
        {/* Alternating ring pattern */}
        <circle 
          cx="50" cy="50" r="30" 
          fill="none" 
          stroke="rgba(255,255,255,0.1)" 
          strokeWidth="4"
          strokeDasharray="6 6"
        />
        
        {/* Center circle */}
        <circle cx="50" cy="50" r="22" fill={denom.secondary} />
        <circle cx="50" cy="50" r="20" fill={`url(#surface-${chipId})`} />
        
        {/* Chip value text */}
        {showValue && (
          <text
            x="50"
            y="54"
            textAnchor="middle"
            fontSize={config.fontSize + 6}
            fontFamily="'Rajdhani', 'Orbitron', sans-serif"
            fontWeight="700"
            fill={denom.text}
            style={{ userSelect: 'none' }}
          >
            {denom.label}
          </text>
        )}
        
        {/* Spade symbol (if no value shown) */}
        {!showValue && (
          <g transform="translate(50, 50)">
            <path
              d="M 0 -12 
                 C -3 -9, -10 -4, -10 3 
                 C -10 8, -6 11, -2 11 
                 C -1 11, 0 10, 0 8 
                 C 0 10, 1 11, 2 11 
                 C 6 11, 10 8, 10 3 
                 C 10 -4, 3 -9, 0 -12 Z"
              fill={denom.text}
            />
            <path d="M 0 8 L -2.5 14 L 2.5 14 Z" fill={denom.text} />
          </g>
        )}
        
        {/* Glossy highlight */}
        <ellipse
          cx="35"
          cy="35"
          rx="18"
          ry="12"
          fill={`url(#gloss-${chipId})`}
        />
        
        {/* Bright spot */}
        <circle cx="32" cy="32" r="5" fill="rgba(255,255,255,0.4)" />
        <circle cx="36" cy="35" r="2" fill="rgba(255,255,255,0.3)" />
      </svg>
    </motion.div>
  );
});

// Chip Stack - multiple chips stacked vertically
interface ChipStackProps {
  value: ChipValue;
  count: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  maxVisible?: number;
  className?: string;
}

export const ChipStack = memo(function ChipStack({
  value,
  count,
  size = 'sm',
  animated = true,
  maxVisible = 5,
  className
}: ChipStackProps) {
  const config = SIZE_CONFIG[size];
  const visibleCount = Math.min(count, maxVisible);
  const stackHeight = config.diameter + (visibleCount - 1) * (config.thickness - 1);

  return (
    <div 
      className={cn("relative", className)}
      style={{ 
        width: config.diameter, 
        height: stackHeight 
      }}
    >
      {Array.from({ length: visibleCount }).map((_, idx) => (
        <div
          key={idx}
          className="absolute left-0"
          style={{ bottom: 0 }}
        >
          <CasinoChip
            value={value}
            size={size}
            showValue={idx === visibleCount - 1}
            animated={animated}
            stackIndex={idx}
          />
        </div>
      ))}
    </div>
  );
});

// Smart Chip Display - automatically breaks down amount into chip stacks
interface SmartChipDisplayProps {
  amount: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
  maxStacks?: number;
  className?: string;
}

function calculateChipBreakdown(amount: number, maxStacks: number = 4): Array<{ value: ChipValue; count: number }> {
  const denominations: ChipValue[] = [100000, 50000, 25000, 10000, 5000, 1000, 500, 100, 50, 25, 10, 5, 1];
  const result: Array<{ value: ChipValue; count: number }> = [];
  let remaining = amount;

  for (const denom of denominations) {
    if (remaining >= denom && result.length < maxStacks) {
      const count = Math.min(Math.floor(remaining / denom), 5);
      if (count > 0) {
        result.push({ value: denom, count });
        remaining -= count * denom;
      }
    }
  }

  if (result.length === 0 && amount > 0) {
    result.push({ value: 1, count: Math.min(amount, 5) });
  }

  return result;
}

function formatAmount(amount: number): string {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K';
  return amount.toLocaleString();
}

export const SmartChipDisplay = memo(function SmartChipDisplay({
  amount,
  size = 'sm',
  showLabel = true,
  animated = true,
  maxStacks = 3,
  className
}: SmartChipDisplayProps) {
  const config = SIZE_CONFIG[size];
  const chipBreakdown = useMemo(() => calculateChipBreakdown(amount, maxStacks), [amount, maxStacks]);

  if (amount <= 0) return null;

  return (
    <motion.div
      className={cn("flex flex-col items-center gap-1", className)}
      initial={animated ? { scale: 0.8, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
    >
      {/* Chip stacks */}
      <div className="flex items-end gap-0.5">
        {chipBreakdown.map((stack, idx) => (
          <ChipStack
            key={`${stack.value}-${idx}`}
            value={stack.value}
            count={stack.count}
            size={size}
            animated={animated}
          />
        ))}
      </div>

      {/* Amount label */}
      {showLabel && (
        <motion.div
          initial={animated ? { opacity: 0, y: 4 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-full font-bold text-center shadow-lg"
          style={{
            fontSize: config.fontSize,
            padding: `2px ${config.fontSize}px`,
            minWidth: config.diameter,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(20,20,20,0.95) 100%)',
            border: '1px solid rgba(251,191,36,0.5)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
          }}
        >
          <span
            style={{
              background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            {formatAmount(amount)}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
});

export default CasinoChip;
