import React, { memo } from 'react';
import { motion } from 'framer-motion';

interface CardDealAnimationProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  delay?: number;
  duration?: number;
  onComplete?: () => void;
  cardBack?: boolean;
}

export const CardDealAnimation = memo<CardDealAnimationProps>(({
  fromX,
  fromY,
  toX,
  toY,
  delay = 0,
  duration = 0.3,
  onComplete,
  cardBack = true
}) => {
  return (
    <motion.div
      className="absolute z-50 pointer-events-none"
      initial={{
        x: fromX,
        y: fromY,
        scale: 0.5,
        rotateY: 0,
        opacity: 0
      }}
      animate={{
        x: toX,
        y: toY,
        scale: 1,
        rotateY: cardBack ? 0 : 180,
        opacity: 1
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
        delay,
        duration
      }}
      onAnimationComplete={onComplete}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div 
        className="w-10 h-14 rounded-md shadow-lg relative overflow-hidden"
        style={{
          background: cardBack 
            ? 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)'
            : 'white',
          border: '1px solid #e5e7eb'
        }}
      >
        {cardBack && (
          <>
            {/* Grid pattern */}
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,122,0,0.12) 3px, rgba(255,122,0,0.12) 4px),
                  repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,122,0,0.12) 3px, rgba(255,122,0,0.12) 4px)
                `
              }}
            />
            {/* Border frame */}
            <div className="absolute inset-0.5 border border-orange-400/30 rounded-sm" />
            {/* Center S logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span 
                className="font-display font-black text-sm"
                style={{ color: '#ff7a00', opacity: 0.5 }}
              >
                S
              </span>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
});

CardDealAnimation.displayName = 'CardDealAnimation';
