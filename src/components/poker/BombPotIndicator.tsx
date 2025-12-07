import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bomb, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BombPotIndicatorProps {
  isActive: boolean;
  multiplier: number;
  isDoubleBoard?: boolean;
  className?: string;
}

export const BombPotIndicator: React.FC<BombPotIndicatorProps> = ({
  isActive,
  multiplier,
  isDoubleBoard = false,
  className
}) => {
  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0, y: -20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0, opacity: 0, y: -20 }}
        className={cn(
          "absolute top-4 left-1/2 transform -translate-x-1/2 z-50",
          className
        )}
      >
        <motion.div
          animate={{
            boxShadow: [
              '0 0 10px rgba(251, 191, 36, 0.5)',
              '0 0 30px rgba(251, 191, 36, 0.8)',
              '0 0 10px rgba(251, 191, 36, 0.5)',
            ]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 text-white px-4 py-2 rounded-full"
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
          >
            <Bomb className="h-5 w-5" />
          </motion.div>
          
          <div className="flex flex-col items-center">
            <span className="font-bold text-lg tracking-wide">BOMB POT</span>
            <span className="text-[10px] opacity-90">
              {multiplier}x BB Ante
              {isDoubleBoard && ' • Double Board'}
            </span>
          </div>
          
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="h-5 w-5 text-yellow-200" />
          </motion.div>
        </motion.div>

        {/* Explosion particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-amber-400"
            initial={{ 
              x: 0, 
              y: 0, 
              opacity: 1,
              scale: 1
            }}
            animate={{ 
              x: Math.cos(i * Math.PI / 4) * 60,
              y: Math.sin(i * Math.PI / 4) * 60,
              opacity: 0,
              scale: 0
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeOut"
            }}
            style={{
              left: '50%',
              top: '50%',
            }}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

export default BombPotIndicator;
