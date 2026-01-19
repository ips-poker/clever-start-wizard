import React from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WaitForBBIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Indicator shown when player is waiting for Big Blind position
 * Before posting natural BB to rejoin the game
 */
export const WaitForBBIndicator: React.FC<WaitForBBIndicatorProps> = ({
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'text-[8px] px-1.5 py-0.5',
    md: 'text-[10px] px-2 py-1',
    lg: 'text-xs px-2.5 py-1'
  };
  
  const iconSizes = {
    sm: 8,
    md: 10,
    lg: 12
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-20"
    >
      <div 
        className={cn(
          "rounded-full flex items-center gap-1 backdrop-blur-sm whitespace-nowrap",
          "bg-blue-600/90 border border-blue-400",
          sizeClasses[size]
        )}
      >
        <Clock size={iconSizes[size]} className="text-white" />
        <span className="text-white font-medium">Wait BB</span>
      </div>
    </motion.div>
  );
};

export default WaitForBBIndicator;
