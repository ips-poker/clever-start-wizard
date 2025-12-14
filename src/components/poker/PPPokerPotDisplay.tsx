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

// Realistic chip stack icon
const ChipStackIcon = memo(function ChipStackIcon() {
  return (
    <div className="relative w-6 h-6">
      {/* Bottom chip - red */}
      <div 
        className="absolute bottom-0 left-0 w-5 h-5 rounded-full"
        style={{
          background: 'linear-gradient(145deg, #ef4444 0%, #dc2626 100%)',
          border: '1.5px solid #b91c1c',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), 0 1px 2px rgba(0,0,0,0.3)'
        }}
      />
      {/* Middle chip - green */}
      <div 
        className="absolute bottom-1 left-0.5 w-5 h-5 rounded-full"
        style={{
          background: 'linear-gradient(145deg, #22c55e 0%, #16a34a 100%)',
          border: '1.5px solid #15803d',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), 0 1px 2px rgba(0,0,0,0.3)'
        }}
      />
      {/* Top chip - gold/yellow */}
      <div 
        className="absolute bottom-2 left-1 w-5 h-5 rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(145deg, #fbbf24 0%, #f59e0b 100%)',
          border: '1.5px solid #d97706',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), 0 2px 6px rgba(0,0,0,0.4)'
        }}
      >
        <div 
          className="w-2.5 h-2.5 rounded-full"
          style={{
            background: '#fef3c7',
            border: '1px solid #d97706'
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
  // Format pot in BB
  const potInBB = useMemo(() => {
    if (bigBlind <= 0) return pot.toLocaleString();
    const bb = pot / bigBlind;
    if (bb >= 100) return Math.round(bb).toLocaleString();
    if (bb >= 10) return bb.toFixed(1);
    return bb.toFixed(1);
  }, [pot, bigBlind]);

  if (pot === 0) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex flex-col items-center gap-1.5"
    >
      {/* Pot amount with chip icon */}
      <div 
        className="flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(15,15,15,0.9) 100%)',
          border: '1px solid rgba(251,191,36,0.35)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
        }}
      >
        <ChipStackIcon />
        
        <div className="flex items-center gap-1.5">
          <span 
            className="font-bold text-base"
            style={{
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            {showBBFormat ? `${potInBB} BB` : pot.toLocaleString()}
          </span>
        </div>
      </div>
      
      {/* "Банк:" label above - PPPoker style */}
      <div 
        className="flex items-center gap-2 px-3 py-1 rounded-full"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(15,15,15,0.85) 100%)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <span className="text-white/90 text-xs font-medium">
          Банк: {showBBFormat ? `${potInBB} BB` : pot.toLocaleString()}
        </span>
      </div>
      
      {/* Blinds info */}
      <span className="text-white/50 text-[11px] font-medium">
        Блайнды: {smallBlind.toLocaleString()}/{bigBlind.toLocaleString()}
      </span>
    </motion.div>
  );
});

export default PPPokerPotDisplay;
