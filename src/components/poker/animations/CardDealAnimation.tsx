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
        className="w-10 h-14 rounded-md shadow-lg"
        style={{
          background: cardBack 
            ? 'linear-gradient(135deg, #1a365d 0%, #2d3748 100%)'
            : 'white',
          border: '2px solid #4a5568'
        }}
      >
        {cardBack && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-6 h-8 rounded border border-blue-400/30 bg-gradient-to-br from-blue-600 to-blue-800" />
          </div>
        )}
      </div>
    </motion.div>
  );
});

CardDealAnimation.displayName = 'CardDealAnimation';
