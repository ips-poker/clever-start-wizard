import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';

interface WinnerOverlayProps {
  winner: {
    name: string;
    amount: number;
    handName?: string;
  } | null;
  onClose?: () => void;
}

export const WinnerOverlay = memo<WinnerOverlayProps>(({ winner, onClose }) => {
  if (!winner) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-gradient-to-br from-yellow-500/90 to-amber-600/90 rounded-2xl p-6 shadow-2xl border-2 border-yellow-300 pointer-events-auto"
          initial={{ scale: 0, rotateZ: -10 }}
          animate={{ scale: 1, rotateZ: 0 }}
          exit={{ scale: 0, rotateZ: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          onClick={onClose}
        >
          <div className="flex flex-col items-center gap-3">
            <motion.div
              animate={{ 
                rotateY: [0, 360],
                scale: [1, 1.2, 1]
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                repeatDelay: 1
              }}
            >
              <Trophy className="w-12 h-12 text-yellow-200" />
            </motion.div>
            
            <motion.h2
              className="text-2xl font-bold text-white drop-shadow-lg"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {winner.name}
            </motion.h2>
            
            <motion.div
              className="text-3xl font-black text-yellow-100"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              +{winner.amount.toLocaleString()}
            </motion.div>
            
            {winner.handName && (
              <motion.div
                className="text-sm font-medium text-yellow-200 bg-black/20 px-3 py-1 rounded-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {winner.handName}
              </motion.div>
            )}

            {/* Confetti particles */}
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: ['#fbbf24', '#f59e0b', '#eab308', '#facc15'][i % 4],
                  left: '50%',
                  top: '50%'
                }}
                animate={{
                  x: [0, (Math.random() - 0.5) * 200],
                  y: [0, (Math.random() - 0.5) * 200],
                  opacity: [1, 0],
                  scale: [1, 0]
                }}
                transition={{
                  duration: 1,
                  delay: 0.1 + i * 0.02,
                  ease: "easeOut"
                }}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

WinnerOverlay.displayName = 'WinnerOverlay';
