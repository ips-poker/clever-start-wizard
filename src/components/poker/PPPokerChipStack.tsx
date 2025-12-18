// PPPoker-style Chip + BB Display for bet display
// Realistic 3D poker chip stack with edge pattern + "X.X BB" text

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PPPokerChipStackVisual } from './RealisticPokerChip';

interface PPPokerChipStackProps {
  amount: number;
  seatPosition: { x: number; y: number };
  bigBlind?: number;
  showBBFormat?: boolean;
  animated?: boolean;
  isHero?: boolean;
}

// Format BB value
const formatBB = (amount: number, bigBlind: number): string => {
  if (bigBlind <= 0) return amount.toLocaleString();
  const bb = amount / bigBlind;
  if (bb >= 100) return Math.round(bb).toLocaleString();
  if (bb >= 10) return bb.toFixed(1);
  return bb.toFixed(1);
};

export const PPPokerChipStack = memo(function PPPokerChipStack({
  amount,
  seatPosition,
  bigBlind = 20,
  showBBFormat = true,
  animated = true,
  isHero = false
}: PPPokerChipStackProps) {
  
  const bbValue = useMemo(() => formatBB(amount, bigBlind), [amount, bigBlind]);
  const bbNumeric = bigBlind > 0 ? amount / bigBlind : 1;

  if (amount <= 0) return null;

  // Calculate stack count based on bet size - more stacks for better 3D effect
  const getStackCount = (bb: number) => {
    if (bb >= 20) return 4;
    if (bb >= 10) return 3;
    if (bb >= 3) return 2;
    return 2; // minimum 2 for visible depth
  };

  // Position bets PERPENDICULAR from avatar center towards table (PPPoker style)
  // Priority: LEFT/RIGHT rails first, then TOP/BOTTOM
  // Distances: vertical (top/bottom) = 55px, horizontal (left/right) = 62px
  const betOffset = useMemo(() => {
    const verticalDistance = 55;   // for top/bottom positions
    const horizontalDistance = 62; // for left/right positions

    // Check LEFT/RIGHT rails FIRST (takes priority over top/bottom corners)
    const isLeftRail = seatPosition.x <= 25;
    const isRightRail = seatPosition.x >= 75;
    
    if (isLeftRail) return { x: horizontalDistance, y: 0 }; // move right (towards table)
    if (isRightRail) return { x: -horizontalDistance, y: 0 }; // move left (towards table)
    
    // Then check TOP/BOTTOM for center positions
    const isTop = seatPosition.y <= 20;
    if (isTop) return { x: 0, y: verticalDistance }; // move down (towards table)
    
    // Default: bottom center position
    return { x: 0, y: -verticalDistance }; // move up (towards table)
  }, [seatPosition.x, seatPosition.y]);

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
      className="absolute flex items-center gap-1.5 z-20 pointer-events-none"
      style={{
        left: `calc(${seatPosition.x}% + ${betOffset.x}px)`,
        top: `calc(${seatPosition.y}% + ${betOffset.y}px)`,
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

      {/* BB Amount text in rounded pill - PPPoker exact style */}
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
          {bbValue} BB
        </span>
      </div>
    </motion.div>
  );
});

export default PPPokerChipStack;
