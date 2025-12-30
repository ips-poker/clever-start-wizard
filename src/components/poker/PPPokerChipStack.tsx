// PPPoker-style Chip + BB/Chips Display for bet display
// Realistic 3D poker chip stack with edge pattern + "X.X BB" or chips text

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PPPokerChipStackVisual } from './RealisticPokerChip';
import { type DisplayFormat } from '@/hooks/usePokerPreferences';

interface PPPokerChipStackProps {
  amount: number;
  seatPosition: { x: number; y: number };
  bigBlind?: number;
  showBBFormat?: boolean;
  animated?: boolean;
  isHero?: boolean;
  calibratedOffset?: { x: number; y: number } | null;
  displayFormat?: DisplayFormat;
}

// Format BB value
const formatBB = (amount: number, bigBlind: number): string => {
  if (bigBlind <= 0) return amount.toLocaleString();
  const bb = amount / bigBlind;
  if (bb >= 100) return Math.round(bb).toLocaleString();
  if (bb >= 10) return bb.toFixed(1);
  return bb.toFixed(1);
};

// Format chips value (compact)
const formatChips = (amount: number): string => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toLocaleString();
};

export const PPPokerChipStack = memo(function PPPokerChipStack({
  amount,
  seatPosition,
  bigBlind = 20,
  showBBFormat = true,
  animated = true,
  isHero = false,
  calibratedOffset,
  displayFormat = 'bb'
}: PPPokerChipStackProps) {
  
  const displayValue = useMemo(() => {
    if (displayFormat === 'bb') {
      return { text: `${formatBB(amount, bigBlind)} BB`, suffix: '' };
    } else {
      return { text: formatChips(amount), suffix: '' };
    }
  }, [amount, bigBlind, displayFormat]);
  
  const bbNumeric = bigBlind > 0 ? amount / bigBlind : 1;

  if (amount <= 0) return null;

  // Calculate stack count based on bet size - more stacks for better 3D effect
  const getStackCount = (bb: number) => {
    if (bb >= 20) return 4;
    if (bb >= 10) return 3;
    if (bb >= 3) return 2;
    return 2; // minimum 2 for visible depth
  };

  // Position bets towards table center (PPPoker style)
  // Если есть калиброванное смещение - используем его (в процентах)
  // Иначе вычисляем по дефолтной логике
  const { offsetStyle, usePercentOffset } = useMemo(() => {
    if (calibratedOffset) {
      // Калиброванное смещение - в процентах относительно контейнера
      return {
        usePercentOffset: true,
        offsetStyle: {
          left: `${seatPosition.x + calibratedOffset.x}%`,
          top: `${seatPosition.y + calibratedOffset.y}%`,
        }
      };
    }
    
    // Дефолтная логика - смещение в пикселях
    const { x, y } = seatPosition;
    let betOffset = { x: 0, y: -54 };
    
    // Left rail positions (x < 25)
    if (x <= 25) {
      // Left bottom (y > 50): bet goes right and slightly up
      if (y > 50) betOffset = { x: 75, y: 12 };
      // Left top (y <= 50): bet goes right and down
      else betOffset = { x: 75, y: 12 };
    }
    // Right rail positions (x > 70)
    else if (x >= 70) {
      // Right bottom (y > 50): bet goes left and slightly up
      if (y > 50) betOffset = { x: -75, y: 12 };
      // Right top (y <= 50): bet goes left and down
      else betOffset = { x: -75, y: 12 };
    }
    // Top center position (y < 20): bet goes down
    else if (y <= 20) {
      betOffset = { x: 0, y: 85 };
    }
    // Bottom/hero position: bet goes up (centered)
    else {
      betOffset = { x: 0, y: -54 };
    }
    
    return {
      usePercentOffset: false,
      offsetStyle: {
        left: `calc(${seatPosition.x}% + ${betOffset.x}px)`,
        top: `calc(${seatPosition.y}% + ${betOffset.y}px)`,
      }
    };
  }, [seatPosition.x, seatPosition.y, calibratedOffset]);

  return (
    <motion.div
      initial={animated ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 280,
        damping: 24,
        delay: 0.03
      }}
      className="absolute flex flex-col items-center gap-0.5 z-20 pointer-events-none"
      style={{
        ...offsetStyle,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* Premium 3D stacked poker chips */}
      <PPPokerChipStackVisual
        size={28}
        bbValue={bbNumeric}
        stackCount={getStackCount(bbNumeric)}
        animated={animated}
      />

      {/* Amount text below chips - PPPoker exact style */}
      <div 
        className="px-2 py-0.5 rounded-full flex items-center"
        style={{
          background: 'linear-gradient(180deg, rgba(30,40,45,0.95) 0%, rgba(15,25,30,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
        }}
      >
        <span 
          className="font-bold text-[12px] leading-none whitespace-nowrap"
          style={{
            color: '#ffffff',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)'
          }}
        >
          {displayValue.text}
        </span>
      </div>
    </motion.div>
  );
});

export default PPPokerChipStack;
