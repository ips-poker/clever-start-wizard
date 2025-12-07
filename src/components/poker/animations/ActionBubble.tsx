import React, { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActionBubbleProps {
  action: string;
  amount?: number;
  x: number;
  y: number;
  duration?: number;
}

const getActionStyle = (action: string) => {
  switch (action.toLowerCase()) {
    case 'fold':
      return { bg: 'bg-gray-600', text: 'text-gray-200', icon: '✗' };
    case 'check':
      return { bg: 'bg-blue-600', text: 'text-blue-100', icon: '✓' };
    case 'call':
      return { bg: 'bg-green-600', text: 'text-green-100', icon: '→' };
    case 'raise':
    case 'bet':
      return { bg: 'bg-yellow-600', text: 'text-yellow-100', icon: '↑' };
    case 'all-in':
    case 'allin':
      return { bg: 'bg-red-600', text: 'text-red-100', icon: '★' };
    default:
      return { bg: 'bg-gray-600', text: 'text-gray-200', icon: '' };
  }
};

export const ActionBubble = memo<ActionBubbleProps>(({
  action,
  amount,
  x,
  y,
  duration = 2000
}) => {
  const [visible, setVisible] = useState(true);
  const style = getActionStyle(action);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute z-50 pointer-events-none"
          style={{ left: x, top: y }}
          initial={{ scale: 0, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className={`${style.bg} px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5`}>
            <span className={`${style.text} text-sm font-bold uppercase tracking-wide`}>
              {style.icon} {action}
            </span>
            {amount !== undefined && amount > 0 && (
              <span className={`${style.text} text-sm font-bold`}>
                {amount.toLocaleString()}
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ActionBubble.displayName = 'ActionBubble';
