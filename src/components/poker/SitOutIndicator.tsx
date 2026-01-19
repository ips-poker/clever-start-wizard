import React from 'react';
import { motion } from 'framer-motion';
import { Coffee, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SitOutIndicatorProps {
  sitOutOrbits?: number;
  maxOrbits?: number;
  isTournament?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showOrbitCounter?: boolean;
}

/**
 * Professional sit-out indicator overlay for player avatars
 * Similar to PokerStars "Away" indicator with orbit tracking
 */
export const SitOutIndicator: React.FC<SitOutIndicatorProps> = ({
  sitOutOrbits = 0,
  maxOrbits = 4,
  isTournament = false,
  size = 'md',
  showOrbitCounter = true
}) => {
  const isWarning = sitOutOrbits >= maxOrbits - 1; // Warning at 3 orbits (1 before removal)
  const isCritical = sitOutOrbits >= maxOrbits;
  
  const sizeClasses = {
    sm: 'w-4 h-4 text-[8px]',
    md: 'w-5 h-5 text-[10px]',
    lg: 'w-6 h-6 text-xs'
  };
  
  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "absolute -top-1 -right-1 z-20 flex items-center gap-0.5",
        isWarning && !isCritical && "animate-pulse"
      )}
    >
      {/* Away/Sitting Out icon */}
      <div 
        className={cn(
          "rounded-full flex items-center justify-center backdrop-blur-sm",
          sizeClasses[size],
          isCritical 
            ? "bg-red-600/90 border border-red-400" 
            : isWarning 
              ? "bg-amber-600/90 border border-amber-400"
              : "bg-gray-600/90 border border-gray-400"
        )}
      >
        <Coffee size={iconSizes[size]} className="text-white" />
      </div>
      
      {/* Orbit counter (only for cash games or if explicitly shown) */}
      {showOrbitCounter && !isTournament && sitOutOrbits > 0 && (
        <div 
          className={cn(
            "rounded-full flex items-center justify-center backdrop-blur-sm px-1",
            sizeClasses[size],
            isCritical 
              ? "bg-red-600/90 border border-red-400" 
              : isWarning 
                ? "bg-amber-600/90 border border-amber-400"
                : "bg-gray-600/90 border border-gray-400"
          )}
        >
          <Clock size={iconSizes[size] - 2} className="text-white mr-0.5" />
          <span className="text-white font-bold">{sitOutOrbits}/{maxOrbits}</span>
        </div>
      )}
    </motion.div>
  );
};

/**
 * Full overlay for sitting out player avatar
 * Shows "AWAY" text with dark overlay
 */
export const SitOutOverlay: React.FC<{ 
  isTournament?: boolean;
  showText?: boolean;
}> = ({ 
  isTournament = false,
  showText = true 
}) => {
  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
      {showText && (
        <motion.span 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white/90 text-[9px] font-bold tracking-wider uppercase"
        >
          {isTournament ? 'Away' : 'Sitting Out'}
        </motion.span>
      )}
    </div>
  );
};

export default SitOutIndicator;
