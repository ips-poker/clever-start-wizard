// =====================================================
// PPPOKER-STYLE DEALER BUTTON
// =====================================================
// Premium 3D dealer button with realistic materials

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PPPokerDealerButtonProps {
  size?: 'sm' | 'md' | 'lg';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  animated?: boolean;
}

const SIZE_CONFIG = {
  sm: { size: 22, fontSize: '9px', offset: -2 },
  md: { size: 28, fontSize: '11px', offset: -3 },
  lg: { size: 34, fontSize: '13px', offset: -4 }
};

const POSITION_CONFIG = {
  'top-right': { top: -3, right: -3 },
  'top-left': { top: -3, left: -3 },
  'bottom-right': { bottom: -3, right: -3 },
  'bottom-left': { bottom: -3, left: -3 }
};

export const PPPokerDealerButton = memo(function PPPokerDealerButton({
  size = 'md',
  position = 'top-right',
  animated = true
}: PPPokerDealerButtonProps) {
  const config = SIZE_CONFIG[size];
  const positionStyle = POSITION_CONFIG[position];

  return (
    <motion.div
      initial={animated ? { scale: 0, rotate: -180 } : false}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 20,
        delay: 0.1
      }}
      className="absolute z-25"
      style={{
        ...positionStyle,
        width: config.size,
        height: config.size
      }}
    >
      {/* Button shadow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'rgba(0,0,0,0.4)',
          filter: 'blur(3px)',
          transform: 'translateY(2px)'
        }}
      />
      
      {/* 3D side effect */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'linear-gradient(180deg, #b45309 0%, #92400e 100%)',
          transform: 'translateY(2px)'
        }}
      />
      
      {/* Main button face */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center"
        style={{
          background: 'linear-gradient(145deg, #fef3c7 0%, #fcd34d 25%, #fbbf24 50%, #f59e0b 75%, #d97706 100%)',
          boxShadow: `
            inset 0 2px 4px rgba(255,255,255,0.6),
            inset 0 -2px 4px rgba(0,0,0,0.2),
            0 3px 8px rgba(0,0,0,0.3)
          `,
          border: '2px solid #92400e'
        }}
      >
        {/* Inner ring */}
        <div
          className="absolute inset-[3px] rounded-full"
          style={{
            border: '1px solid rgba(255,255,255,0.3)'
          }}
        />
        
        {/* D letter */}
        <span
          className="font-black text-amber-900"
          style={{
            fontSize: config.fontSize,
            textShadow: '0 1px 0 rgba(255,255,255,0.4)'
          }}
        >
          D
        </span>
        
        {/* Glossy highlight */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%)'
          }}
        />
      </div>
    </motion.div>
  );
});

// =====================================================
// BLIND BUTTONS (SB/BB)
// =====================================================
interface BlindButtonProps {
  type: 'SB' | 'BB';
  size?: 'sm' | 'md';
  animated?: boolean;
}

export const PPPokerBlindButton = memo(function PPPokerBlindButton({
  type,
  size = 'sm',
  animated = true
}: BlindButtonProps) {
  const isBB = type === 'BB';
  const config = size === 'sm' 
    ? { size: 18, fontSize: '7px' } 
    : { size: 22, fontSize: '9px' };

  const bgGradient = isBB
    ? 'linear-gradient(145deg, #fcd34d, #f59e0b)'
    : 'linear-gradient(145deg, #94a3b8, #64748b)';

  const borderColor = isBB ? '#b45309' : '#475569';

  return (
    <motion.div
      initial={animated ? { scale: 0 } : false}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="rounded-full flex items-center justify-center shadow-lg"
      style={{
        width: config.size,
        height: config.size,
        background: bgGradient,
        border: `1.5px solid ${borderColor}`,
        boxShadow: '0 2px 6px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.4)'
      }}
    >
      <span
        className={cn(
          "font-black",
          isBB ? "text-amber-900" : "text-gray-800"
        )}
        style={{ fontSize: config.fontSize }}
      >
        {type}
      </span>
    </motion.div>
  );
});

export default PPPokerDealerButton;
