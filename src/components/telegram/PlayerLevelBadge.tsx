import React from 'react';
import { getPlayerLevel, getProgressToNextLevel, getNextLevel } from '@/utils/playerLevels';

interface PlayerLevelBadgeProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  className?: string;
}

export const PlayerLevelBadge: React.FC<PlayerLevelBadgeProps> = ({ 
  rating, 
  size = 'md', 
  showProgress = false,
  className = '' 
}) => {
  const level = getPlayerLevel(rating);
  const progress = getProgressToNextLevel(rating);
  const nextLevel = getNextLevel(level);
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };
  
  const iconSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl'
  };

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <div 
        className={`brutal-border bg-gradient-to-r ${level.gradient} ${sizeClasses[size]} font-display flex items-center gap-1.5 shadow-lg`}
      >
        <span className={iconSizes[size]}>{level.icon}</span>
        <span className="text-background font-bold">{level.name}</span>
      </div>
      
      {showProgress && nextLevel && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-syndikate-concrete">
            <span>Next: {nextLevel.name}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-background brutal-border overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${nextLevel.gradient} transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-syndikate-concrete">
            {nextLevel.minRating - rating} рейтинга до {nextLevel.name}
          </div>
        </div>
      )}
    </div>
  );
};
