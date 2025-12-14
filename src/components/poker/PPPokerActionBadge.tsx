// PPPoker-style Action Badge - Colored badges above player avatar
// Matches reference screenshots: Чек (cyan), Бет (cyan), Колл (cyan), Фолд (gray), Банк (cyan)

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PPPokerActionBadgeProps {
  action: string | null | undefined;
  amount?: number;
  bigBlind?: number;
  showBBFormat?: boolean;
}

// Action configurations matching PPPoker style
const ACTION_CONFIGS: Record<string, { 
  label: string; 
  bgGradient: string;
  textColor: string;
  borderColor: string;
  arrowColor: string;
}> = {
  fold: { 
    label: 'Фолд', 
    bgGradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
    textColor: '#ffffff',
    borderColor: 'rgba(255,255,255,0.2)',
    arrowColor: '#4b5563'
  },
  check: { 
    label: 'Чек', 
    bgGradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    textColor: '#ffffff',
    borderColor: 'rgba(255,255,255,0.3)',
    arrowColor: '#0891b2'
  },
  call: { 
    label: 'Колл', 
    bgGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    textColor: '#ffffff',
    borderColor: 'rgba(255,255,255,0.3)',
    arrowColor: '#059669'
  },
  bet: { 
    label: 'Бет', 
    bgGradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    textColor: '#000000',
    borderColor: 'rgba(255,255,255,0.3)',
    arrowColor: '#f59e0b'
  },
  raise: { 
    label: 'Рейз', 
    bgGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    textColor: '#000000',
    borderColor: 'rgba(255,255,255,0.3)',
    arrowColor: '#d97706'
  },
  allin: { 
    label: 'ОЛЛ-ИН', 
    bgGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    textColor: '#ffffff',
    borderColor: 'rgba(255,255,255,0.3)',
    arrowColor: '#dc2626'
  },
  sittingout: { 
    label: 'Вне игры', 
    bgGradient: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
    textColor: '#9ca3af',
    borderColor: 'rgba(255,255,255,0.1)',
    arrowColor: '#1f2937'
  },
  bank: { 
    label: 'Банк', 
    bgGradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    textColor: '#ffffff',
    borderColor: 'rgba(255,255,255,0.3)',
    arrowColor: '#0891b2'
  },
  sb: { 
    label: 'SB', 
    bgGradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
    textColor: '#ffffff',
    borderColor: 'rgba(255,255,255,0.2)',
    arrowColor: '#475569'
  },
  bb: { 
    label: 'BB', 
    bgGradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    textColor: '#ffffff',
    borderColor: 'rgba(255,255,255,0.3)',
    arrowColor: '#2563eb'
  }
};

export const PPPokerActionBadge = memo(function PPPokerActionBadge({ 
  action,
  amount,
  bigBlind = 20,
  showBBFormat = false
}: PPPokerActionBadgeProps) {
  if (!action) return null;
  
  const config = ACTION_CONFIGS[action.toLowerCase()] || { 
    label: action, 
    bgGradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
    textColor: '#ffffff',
    borderColor: 'rgba(255,255,255,0.2)',
    arrowColor: '#4b5563'
  };
  
  // Format amount
  const formattedAmount = amount && amount > 0 
    ? (showBBFormat && bigBlind > 0 
        ? ` ${(amount / bigBlind).toFixed(1)} BB` 
        : ` ${amount.toLocaleString()}`)
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="absolute -top-8 left-1/2 -translate-x-1/2 z-30"
    >
      <div 
        className="px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap"
        style={{
          background: config.bgGradient,
          color: config.textColor,
          border: `1px solid ${config.borderColor}`,
          boxShadow: '0 3px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
        }}
      >
        {config.label}{formattedAmount}
      </div>
      
      {/* Arrow pointing down */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-0 h-0"
        style={{
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: `6px solid ${config.arrowColor}`
        }}
      />
    </motion.div>
  );
});

export default PPPokerActionBadge;
