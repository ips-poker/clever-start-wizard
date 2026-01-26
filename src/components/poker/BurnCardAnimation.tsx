/**
 * Burn Card Animation - PokerStars-style visual burn card effect
 * Shows a card sliding off to the side before dealing community cards
 * 
 * IMPORTANT: Uses unified timing configuration from src/config/pokerTimings.ts
 */

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CARD_DEAL_TIMINGS } from '@/config/pokerTimings';

interface BurnCardAnimationProps {
  isActive: boolean;
  phase: 'flop' | 'turn' | 'river';
  onComplete?: () => void;
}

export const BurnCardAnimation = memo(function BurnCardAnimation({
  isActive,
  phase,
  onComplete
}: BurnCardAnimationProps) {
  if (!isActive) return null;

  // Direction based on phase for visual variety
  const slideDirection = phase === 'turn' ? -1 : 1;
  const rotation = phase === 'flop' ? -15 : phase === 'turn' ? 10 : -10;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="absolute pointer-events-none z-[100]"
          style={{
            left: '50%',
            top: '35%',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ 
            x: 0, 
            y: 0, 
            rotate: 0,
            opacity: 1,
            scale: 0.9
          }}
          animate={{ 
            x: slideDirection * 120,
            y: -40,
            rotate: rotation,
            opacity: 0,
            scale: 0.7
          }}
          exit={{ opacity: 0 }}
          transition={{
            // Uses unified timing from config
            duration: CARD_DEAL_TIMINGS.burnCardDuration / 1000,
            ease: [0.4, 0, 0.2, 1]
          }}
          onAnimationComplete={onComplete}
        >
          {/* Card back design */}
          <div
            className="rounded-lg overflow-hidden"
            style={{
              width: 48,
              height: 68,
              background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1e3a5f 100%)',
              border: '2px solid #334155',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
          >
            {/* Pattern on card back */}
            <div 
              className="absolute inset-1.5 rounded"
              style={{
                background: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 3px,
                  rgba(255,255,255,0.03) 3px,
                  rgba(255,255,255,0.03) 6px
                )`,
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            />
            
            {/* Center symbol */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span 
                className="text-xl font-bold"
                style={{ color: 'rgba(255,255,255,0.12)' }}
              >
                ♠
              </span>
            </div>

            {/* Glossy effect */}
            <div 
              className="absolute inset-0 pointer-events-none rounded"
              style={{ 
                background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 40%)' 
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default BurnCardAnimation;
