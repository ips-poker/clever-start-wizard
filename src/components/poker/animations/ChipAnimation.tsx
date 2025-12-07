import React, { memo } from 'react';
import { motion } from 'framer-motion';

interface ChipAnimationProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  amount: number;
  delay?: number;
  duration?: number;
  onComplete?: () => void;
  type: 'bet' | 'collect' | 'win';
}

const getChipColor = (amount: number): string => {
  if (amount >= 10000) return '#fbbf24'; // gold
  if (amount >= 1000) return '#10b981'; // green
  if (amount >= 100) return '#3b82f6'; // blue
  if (amount >= 25) return '#22c55e'; // lime
  return '#ef4444'; // red
};

export const ChipAnimation = memo<ChipAnimationProps>(({
  fromX,
  fromY,
  toX,
  toY,
  amount,
  delay = 0,
  duration = 0.4,
  onComplete,
  type
}) => {
  const chipColor = getChipColor(amount);
  const chipCount = Math.min(5, Math.ceil(amount / 100));

  return (
    <motion.div
      className="absolute z-40 pointer-events-none"
      initial={{
        x: fromX,
        y: fromY,
        scale: type === 'win' ? 1.2 : 0.8,
        opacity: 0
      }}
      animate={{
        x: toX,
        y: toY,
        scale: 1,
        opacity: [0, 1, 1, type === 'collect' ? 0 : 1]
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 20,
        delay,
        duration
      }}
      onAnimationComplete={onComplete}
    >
      <div className="relative">
        {Array.from({ length: chipCount }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-6 h-6 rounded-full shadow-md"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${chipColor}, ${chipColor}aa)`,
              border: `2px dashed ${chipColor}66`,
              top: -i * 2,
              left: i * 1
            }}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: delay + i * 0.05 }}
          />
        ))}
        
        {type !== 'collect' && (
          <motion.div
            className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + 0.2 }}
          >
            <span className="text-xs font-bold text-white drop-shadow-lg">
              {amount.toLocaleString()}
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

ChipAnimation.displayName = 'ChipAnimation';
