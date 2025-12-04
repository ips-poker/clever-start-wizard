import React from 'react';
import { getPlayerLevel, getProgressToNextLevel, getNextLevel, getRatingToNextLevel } from '@/utils/playerLevels';
import { motion } from 'framer-motion';
import { RankIcon, RankBadge } from '@/components/ui/rank-icon';

interface PlayerLevelBadgeProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  showDescription?: boolean;
  className?: string;
}

export const PlayerLevelBadge: React.FC<PlayerLevelBadgeProps> = ({ 
  rating, 
  size = 'md', 
  showProgress = false,
  showDescription = false,
  className = '' 
}) => {
  const level = getPlayerLevel(rating);
  const progress = getProgressToNextLevel(rating);
  const nextLevel = getNextLevel(level);
  const ratingToNext = getRatingToNextLevel(rating);
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };
  
  const iconSizes = {
    sm: 'sm' as const,
    md: 'md' as const,
    lg: 'lg' as const
  };

  return (
    <div className={`inline-flex flex-col gap-2 ${className}`}>
      <motion.div 
        className={`brutal-border bg-gradient-to-r ${level.gradient} ${sizeClasses[size]} font-display flex items-center gap-2 shadow-lg relative overflow-hidden`}
        whileHover={{ scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 400 }}
      >
        {/* Shine effect for Boss level */}
        {level.level === 'don' && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          />
        )}
        
        <RankIcon rank={level.level} size={iconSizes[size]} className="text-white" />
        <span className="text-background font-bold uppercase tracking-wide">{level.nameRu}</span>
      </motion.div>
      
      {showDescription && (
        <p className="text-xs text-muted-foreground">{level.description}</p>
      )}
      
      {showProgress && nextLevel && (
        <div className="space-y-1.5 w-full">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <RankIcon rank={nextLevel.level} size="sm" />
              <span>{nextLevel.nameRu}</span>
            </span>
            <span className="font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-secondary brutal-border overflow-hidden">
            <motion.div 
              className={`h-full bg-gradient-to-r ${nextLevel.gradient}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            <span className="font-bold text-primary">{ratingToNext}</span> RPS до ранга {nextLevel.nameRu}
          </p>
        </div>
      )}
      
      {showProgress && !nextLevel && (
        <div className="text-center">
          <motion.p 
            className="text-xs text-amber-400 font-bold flex items-center justify-center gap-1"
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <RankIcon rank="don" size="sm" animated />
            Максимальный ранг достигнут!
          </motion.p>
        </div>
      )}
    </div>
  );
};
