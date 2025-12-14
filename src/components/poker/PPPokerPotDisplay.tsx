// PPPoker-style Pot Display - Shows "Банк: X BB" with chip icon
// Matches reference screenshot styling

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

interface PPPokerPotDisplayProps {
  pot: number;
  bigBlind: number;
  smallBlind: number;
  showBBFormat?: boolean;
}

// PPPoker-style 3D chip stack icon - more realistic
const ChipStackIcon = memo(function ChipStackIcon() {
  return (
    <div className="relative" style={{ width: 28, height: 28 }}>
      {/* Bottom chip shadow */}
      <div 
        className="absolute rounded-full"
        style={{
          width: 22,
          height: 22,
          bottom: -2,
          left: 2,
          background: 'rgba(0,0,0,0.4)',
          filter: 'blur(3px)'
        }}
      />
      
      {/* Bottom chip - red */}
      <div 
        className="absolute rounded-full"
        style={{
          width: 22,
          height: 22,
          bottom: 0,
          left: 0,
          background: 'linear-gradient(145deg, #ef4444 0%, #dc2626 50%, #991b1b 100%)',
          border: '2px solid #7f1d1d',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.35), inset 0 -1px 3px rgba(0,0,0,0.3)'
        }}
      >
        {/* Chip edge pattern */}
        <div 
          className="absolute inset-0 rounded-full opacity-50"
          style={{
            background: `repeating-conic-gradient(
              from 0deg,
              transparent 0deg 18deg,
              rgba(255,255,255,0.3) 18deg 36deg
            )`
          }}
        />
      </div>
      
      {/* Middle chip - blue */}
      <div 
        className="absolute rounded-full"
        style={{
          width: 22,
          height: 22,
          bottom: 4,
          left: 2,
          background: 'linear-gradient(145deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
          border: '2px solid #1e40af',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.35), inset 0 -1px 3px rgba(0,0,0,0.3)'
        }}
      >
        <div 
          className="absolute inset-0 rounded-full opacity-50"
          style={{
            background: `repeating-conic-gradient(
              from 15deg,
              transparent 0deg 18deg,
              rgba(255,255,255,0.3) 18deg 36deg
            )`
          }}
        />
      </div>
      
      {/* Top chip - gold */}
      <div 
        className="absolute rounded-full flex items-center justify-center"
        style={{
          width: 22,
          height: 22,
          bottom: 8,
          left: 4,
          background: 'linear-gradient(145deg, #fcd34d 0%, #fbbf24 30%, #f59e0b 70%, #d97706 100%)',
          border: '2px solid #b45309',
          boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.2), 0 3px 10px rgba(0,0,0,0.4)'
        }}
      >
        {/* Center circle */}
        <div 
          className="rounded-full"
          style={{
            width: 10,
            height: 10,
            background: 'linear-gradient(145deg, #fef3c7, #fcd34d)',
            border: '1px solid #b45309'
          }}
        />
        {/* Chip edge pattern */}
        <div 
          className="absolute inset-0 rounded-full opacity-40"
          style={{
            background: `repeating-conic-gradient(
              from 10deg,
              transparent 0deg 18deg,
              rgba(255,255,255,0.4) 18deg 36deg
            )`
          }}
        />
      </div>
    </div>
  );
});

export const PPPokerPotDisplay = memo(function PPPokerPotDisplay({ 
  pot, 
  bigBlind,
  smallBlind,
  showBBFormat = true
}: PPPokerPotDisplayProps) {
  if (pot === 0) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex flex-col items-center gap-2"
    >
      {/* Main pot display with chips */}
      <div className="flex items-center gap-2">
        <ChipStackIcon />
        
        <span 
          className="font-bold text-[16px]"
          style={{
            color: '#fbbf24',
            textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 10px rgba(251,191,36,0.3)'
          }}
        >
          {pot.toLocaleString()}
        </span>
      </div>
      
      {/* Blinds info - PPPoker style "Блайнды: X/Y" */}
      <span 
        className="text-white/90 text-[12px] font-medium"
        style={{
          textShadow: '0 1px 3px rgba(0,0,0,0.8)'
        }}
      >
        Блайнды: {smallBlind.toLocaleString()}/{bigBlind.toLocaleString()}
      </span>
    </motion.div>
  );
});

export default PPPokerPotDisplay;
