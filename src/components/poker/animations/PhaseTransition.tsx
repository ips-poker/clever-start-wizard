import React, { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PhaseTransitionProps {
  phase: string;
}

const getPhaseLabel = (phase: string): string => {
  switch (phase) {
    case 'preflop': return 'PRE-FLOP';
    case 'flop': return 'FLOP';
    case 'turn': return 'TURN';
    case 'river': return 'RIVER';
    case 'showdown': return 'SHOWDOWN';
    default: return phase.toUpperCase();
  }
};

const getPhaseColor = (phase: string): string => {
  switch (phase) {
    case 'preflop': return 'from-blue-500 to-blue-700';
    case 'flop': return 'from-green-500 to-green-700';
    case 'turn': return 'from-yellow-500 to-yellow-700';
    case 'river': return 'from-red-500 to-red-700';
    case 'showdown': return 'from-purple-500 to-purple-700';
    default: return 'from-gray-500 to-gray-700';
  }
};

export const PhaseTransition = memo<PhaseTransitionProps>(({ phase }) => {
  const [show, setShow] = useState(true);
  const label = getPhaseLabel(phase);
  const colorClass = getPhaseColor(phase);

  useEffect(() => {
    setShow(true);
    const timer = setTimeout(() => setShow(false), 1500);
    return () => clearTimeout(timer);
  }, [phase]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={`bg-gradient-to-r ${colorClass} px-8 py-3 rounded-lg shadow-2xl`}
            initial={{ scale: 0, rotateX: 90 }}
            animate={{ scale: 1, rotateX: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -50 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <motion.span
              className="text-2xl font-black text-white tracking-widest drop-shadow-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {label}
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

PhaseTransition.displayName = 'PhaseTransition';
