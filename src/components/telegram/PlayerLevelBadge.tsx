import React from 'react';
import { getCurrentMafiaRank, getMafiaRankProgress } from '@/utils/mafiaRanks';

interface PlayerLevelBadgeProps {
  rating: number;
  gamesPlayed?: number;
  wins?: number;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  className?: string;
}

export const PlayerLevelBadge: React.FC<PlayerLevelBadgeProps> = ({ 
  rating, 
  gamesPlayed = 0,
  wins = 0,
  size = 'md', 
  showProgress = false,
  className = '' 
}) => {
  const stats = { gamesPlayed, wins, rating };
  const rank = getCurrentMafiaRank(stats);
  const progress = getMafiaRankProgress(stats);
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm'
  };
  
  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <div 
        className={`brutal-border bg-gradient-to-r ${rank.bgGradient} ${sizeClasses[size]} font-display flex items-center gap-1 shadow-lg`}
      >
        <span className={iconSizes[size]}>{rank.icon}</span>
        <span className="text-white font-bold uppercase tracking-wide">{rank.name}</span>
      </div>
      
      {showProgress && progress.next && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>До: {progress.next.name}</span>
            <span>{Math.round(progress.progress)}%</span>
          </div>
          <div className="h-1.5 bg-background brutal-border overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${progress.next.bgGradient} transition-all duration-500`}
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
