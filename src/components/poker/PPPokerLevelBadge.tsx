// PPPoker-style Level Badge - Shows player level (5YR, VIP, etc.)
// Positioned on top-left of player avatar

import React, { memo } from 'react';
import { motion } from 'framer-motion';

interface PPPokerLevelBadgeProps {
  level?: string | number;
  isVIP?: boolean;
}

export const PPPokerLevelBadge = memo(function PPPokerLevelBadge({ 
  level,
  isVIP = false
}: PPPokerLevelBadgeProps) {
  if (!level && !isVIP) return null;
  
  // Determine badge type and style
  const getBadgeConfig = () => {
    if (isVIP) {
      return {
        text: 'VIP',
        bgGradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
        textColor: '#ffffff',
        borderColor: 'rgba(255,255,255,0.4)'
      };
    }
    
    // Year badges (1YR, 5YR, etc.)
    const yearMatch = String(level).match(/^(\d+)(YR|год)?$/i);
    if (yearMatch) {
      const years = parseInt(yearMatch[1]);
      return {
        text: `${years}YR`,
        bgGradient: years >= 5 
          ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
          : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        textColor: years >= 5 ? '#000000' : '#ffffff',
        borderColor: 'rgba(255,255,255,0.3)'
      };
    }
    
    // Numeric level
    if (typeof level === 'number' || !isNaN(Number(level))) {
      const numLevel = Number(level);
      return {
        text: `Lv${numLevel}`,
        bgGradient: numLevel >= 50 
          ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
          : numLevel >= 20 
            ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
            : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
        textColor: numLevel >= 50 ? '#000000' : '#ffffff',
        borderColor: 'rgba(255,255,255,0.3)'
      };
    }
    
    // Default/custom badge
    return {
      text: String(level).toUpperCase(),
      bgGradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
      textColor: '#ffffff',
      borderColor: 'rgba(255,255,255,0.2)'
    };
  };
  
  const config = getBadgeConfig();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute -top-1 -left-1 z-30"
    >
      <div 
        className="px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap"
        style={{
          background: config.bgGradient,
          color: config.textColor,
          border: `1px solid ${config.borderColor}`,
          boxShadow: '0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
          textShadow: config.textColor === '#000000' ? 'none' : '0 1px 2px rgba(0,0,0,0.5)'
        }}
      >
        {config.text}
      </div>
    </motion.div>
  );
});

export default PPPokerLevelBadge;
