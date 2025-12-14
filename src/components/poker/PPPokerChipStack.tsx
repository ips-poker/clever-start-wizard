// PPPoker-style Chip + BB Display for bet display
// Red poker chip with spade + "X.X BB" text - positioned horizontally from player panel

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

interface PPPokerChipStackProps {
  amount: number;
  seatPosition: { x: number; y: number };
  bigBlind?: number;
  showBBFormat?: boolean;
  animated?: boolean;
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
  animated = true
}: PPPokerChipStackProps) {
  
  const bbValue = useMemo(() => formatBB(amount, bigBlind), [amount, bigBlind]);

  if (amount <= 0) return null;

  // PPPoker style: bet is positioned HORIZONTALLY to the right/left of the player panel
  // Based on seat position on table
  const getBetPosition = () => {
    // Right side of table (x > 70): bet goes LEFT of player
    // Left side of table (x < 30): bet goes RIGHT of player  
    // Top (y < 30): bet goes DOWN-RIGHT
    // Bottom (y > 70): bet goes UP-RIGHT
    
    if (seatPosition.x > 70) {
      // Right side seats - bet to the left
      return { x: -90, y: 8 };
    } else if (seatPosition.x < 30) {
      // Left side seats - bet to the right
      return { x: 90, y: 8 };
    } else if (seatPosition.y < 35) {
      // Top seats - bet below-right
      return { x: 75, y: 45 };
    } else {
      // Bottom/hero seats - bet above-right
      return { x: 80, y: -25 };
    }
  };
  
  const betPos = getBetPosition();

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
      className="absolute flex items-center gap-1.5 z-20"
      style={{
        left: `calc(50% + ${betPos.x}px)`,
        top: `calc(50% + ${betPos.y}px)`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* PPPoker red chip with white spade - EXACT style from screenshot */}
      <div className="relative flex-shrink-0" style={{ width: 26, height: 26 }}>
        {/* Stacked chip below for 3D effect */}
        <div 
          className="absolute rounded-full"
          style={{
            width: 24,
            height: 24,
            top: 3,
            left: 1,
            background: 'linear-gradient(145deg, #b91c1c 0%, #7f1d1d 100%)',
            border: '2px solid #7f1d1d'
          }}
        />
        
        {/* Main red chip */}
        <div 
          className="absolute rounded-full flex items-center justify-center"
          style={{
            width: 24,
            height: 24,
            top: 0,
            left: 0,
            background: 'linear-gradient(145deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
            border: '2.5px solid #991b1b',
            boxShadow: `
              inset 0 2px 4px rgba(255,255,255,0.4),
              inset 0 -2px 4px rgba(0,0,0,0.3),
              0 3px 8px rgba(0,0,0,0.5)
            `
          }}
        >
          {/* White edge pattern - dashes around edge */}
          <div 
            className="absolute inset-[3px] rounded-full"
            style={{
              background: `repeating-conic-gradient(
                from 0deg,
                transparent 0deg 12deg,
                rgba(255,255,255,0.6) 12deg 24deg
              )`
            }}
          />
          
          {/* Inner red circle */}
          <div 
            className="absolute rounded-full flex items-center justify-center"
            style={{
              width: 14,
              height: 14,
              background: 'linear-gradient(145deg, #ef4444, #dc2626)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            {/* White spade symbol */}
            <span className="text-white text-[9px] font-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
              ♠
            </span>
          </div>
        </div>
      </div>

      {/* BB Amount text in rounded pill - PPPoker exact style */}
      <div 
        className="px-2.5 py-1 rounded-full flex items-center"
        style={{
          background: 'linear-gradient(180deg, rgba(30,40,45,0.95) 0%, rgba(15,25,30,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
        }}
      >
        <span 
          className="font-bold text-[13px] leading-none whitespace-nowrap"
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
