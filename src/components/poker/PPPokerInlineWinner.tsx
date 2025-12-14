// ============================================
// PPPOKER INLINE WINNER - Shows winner info directly on table without modal
// ============================================
import React, { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';

interface Winner {
  playerId: string;
  name?: string;
  amount: number;
  handName?: string;
  bestCards?: string[];
  seatNumber?: number;
}

interface PPPokerInlineWinnerProps {
  winners: Winner[];
  autoHide?: boolean;
  autoHideDuration?: number;
  onComplete?: () => void;
  isMobile?: boolean;
}

// Chip animation component
const FlyingChip = memo(function FlyingChip({ 
  index, 
  color 
}: { 
  index: number; 
  color: string; 
}) {
  const angle = (index / 8) * Math.PI * 2;
  const radius = 80 + Math.random() * 40;
  const startX = Math.cos(angle) * radius;
  const startY = Math.sin(angle) * radius;
  
  return (
    <motion.div
      initial={{ 
        x: startX, 
        y: startY, 
        scale: 1, 
        opacity: 1,
        rotate: Math.random() * 360
      }}
      animate={{ 
        x: 0,
        y: 0,
        scale: [1, 1.2, 0.5],
        opacity: [1, 1, 0],
        rotate: 360 + Math.random() * 180
      }}
      transition={{ 
        duration: 0.6, 
        delay: index * 0.03,
        ease: [0.4, 0, 0.2, 1]
      }}
      className="absolute pointer-events-none"
      style={{ 
        width: 18, 
        height: 18,
        left: '50%',
        top: '50%',
        marginLeft: -9,
        marginTop: -9
      }}
    >
      <div 
        className="w-full h-full rounded-full"
        style={{
          background: color,
          border: '2px solid rgba(255,255,255,0.4)',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.3)'
        }}
      />
    </motion.div>
  );
});

export const PPPokerInlineWinner = memo(function PPPokerInlineWinner({
  winners,
  autoHide = true,
  autoHideDuration = 4000,
  onComplete,
  isMobile = false
}: PPPokerInlineWinnerProps) {
  const [visible, setVisible] = useState(true);
  const [showChips, setShowChips] = useState(true);

  useEffect(() => {
    const chipsTimer = setTimeout(() => setShowChips(false), 800);
    
    if (autoHide) {
      const hideTimer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, autoHideDuration);
      
      return () => {
        clearTimeout(chipsTimer);
        clearTimeout(hideTimer);
      };
    }
    
    return () => clearTimeout(chipsTimer);
  }, [autoHide, autoHideDuration, onComplete]);

  if (!visible || winners.length === 0) return null;

  const mainWinner = winners[0];
  const chipColors = [
    'linear-gradient(135deg, #fbbf24, #d97706)',
    'linear-gradient(135deg, #22c55e, #15803d)',
    'linear-gradient(135deg, #ef4444, #b91c1c)',
    'linear-gradient(135deg, #3b82f6, #1d4ed8)'
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none"
    >
      {/* Flying chips animation */}
      <AnimatePresence>
        {showChips && [...Array(12)].map((_, i) => (
          <FlyingChip 
            key={i} 
            index={i} 
            color={chipColors[i % chipColors.length]} 
          />
        ))}
      </AnimatePresence>

      {/* Winner info bubble */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
        className={cn(
          "rounded-xl px-4 py-3 text-center",
          isMobile ? "min-w-[160px]" : "min-w-[200px]"
        )}
        style={{
          background: 'linear-gradient(180deg, rgba(34,197,94,0.95) 0%, rgba(22,163,74,0.95) 100%)',
          border: '2px solid rgba(255,255,255,0.3)',
          boxShadow: '0 0 30px rgba(34,197,94,0.5), 0 10px 30px rgba(0,0,0,0.3)'
        }}
      >
        {/* Trophy icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1] }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="flex justify-center mb-1"
        >
          <Trophy className={cn(
            "text-yellow-300",
            isMobile ? "h-5 w-5" : "h-6 w-6"
          )} />
        </motion.div>

        {/* Winner name */}
        <div className={cn(
          "font-bold text-white mb-1",
          isMobile ? "text-sm" : "text-base"
        )}>
          {mainWinner.name || 'Победитель'}
        </div>

        {/* Amount won */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 400 }}
          className={cn(
            "font-black text-white",
            isMobile ? "text-lg" : "text-xl"
          )}
        >
          +{mainWinner.amount.toLocaleString()}
        </motion.div>

        {/* Hand name */}
        {mainWinner.handName && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className={cn(
              "text-white/90 font-medium mt-1",
              isMobile ? "text-xs" : "text-sm"
            )}
          >
            {mainWinner.handName}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
});

export default PPPokerInlineWinner;
