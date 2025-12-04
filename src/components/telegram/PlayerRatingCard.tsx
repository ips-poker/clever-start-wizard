import React from 'react';
import { PlayerLevelBadge } from './PlayerLevelBadge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TrendingUp, TrendingDown, Minus, Trophy, Target, Gamepad2 } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  avatar_url?: string;
}

interface PlayerRatingCardProps {
  player: Player;
  rank: number;
  index?: number;
  onClick?: () => void;
  isCurrentUser?: boolean;
}

export const PlayerRatingCard: React.FC<PlayerRatingCardProps> = ({ 
  player, 
  rank, 
  index = 0, 
  onClick,
  isCurrentUser = false
}) => {
  const winRate = player.games_played > 0 
    ? ((player.wins / player.games_played) * 100).toFixed(1) 
    : '0.0';
  
  // Реальные достижения на основе данных
  const achievements = [];
  if (player.wins >= 5) achievements.push({ icon: '🏆', label: 'Победитель' });
  if (player.games_played >= 20) achievements.push({ icon: '⭐', label: 'Ветеран' });
  if (player.elo_rating >= 1500) achievements.push({ icon: '💎', label: 'Топ игрок' });
  if (Number(winRate) >= 60 && player.games_played >= 5) achievements.push({ icon: '🔥', label: 'На огне' });

  return (
    <div
      onClick={onClick}
      className={`relative brutal-border backdrop-blur-xl shadow-brutal overflow-hidden group cursor-pointer transition-all duration-300 animate-fade-in ${
        isCurrentUser 
          ? 'bg-syndikate-orange/20 border-syndikate-orange/50 hover:shadow-neon-orange' 
          : 'bg-syndikate-metal/90 hover:shadow-neon-orange'
      }`}
      style={{animationDelay: `${index * 50}ms`}}
    >
      {/* Current user indicator */}
      {isCurrentUser && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-syndikate-orange to-syndikate-red" />
      )}
      
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-syndikate-orange/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute inset-0 industrial-texture opacity-20" />

      <div className="relative z-10 p-4 space-y-3">
        <div className="flex items-center gap-3">
          {/* Rank */}
          <div className={`w-10 h-10 brutal-border flex items-center justify-center group-hover:scale-105 transition-all ${
            rank <= 10 
              ? 'bg-syndikate-orange/30 group-hover:bg-syndikate-orange/40' 
              : 'bg-syndikate-concrete/20 group-hover:bg-syndikate-orange/20'
          }`}>
            <span className={`text-lg font-display ${rank <= 10 ? 'text-syndikate-orange' : 'text-foreground/70'}`}>
              #{rank}
            </span>
          </div>

          {/* Player avatar */}
          <Avatar className="w-12 h-12 brutal-border group-hover:scale-110 transition-transform">
            <AvatarImage src={player.avatar_url} alt={player.name} />
            <AvatarFallback className="bg-syndikate-orange/20 text-syndikate-orange text-xl font-display">
              {player.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Player info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-base font-display truncate group-hover:text-syndikate-orange transition-colors">
                {player.name}
              </div>
              {isCurrentUser && (
                <span className="text-[10px] px-1.5 py-0.5 bg-syndikate-orange/30 text-syndikate-orange rounded uppercase font-bold">
                  Вы
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <PlayerLevelBadge rating={player.elo_rating} size="sm" />
              {/* Achievement badges */}
              {achievements.length > 0 && (
                <div className="flex gap-0.5">
                  {achievements.slice(0, 2).map((achievement, i) => (
                    <span key={i} className="text-xs" title={achievement.label}>
                      {achievement.icon}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rating display */}
          <div className="text-right">
            <div className="text-xl font-display text-syndikate-orange font-bold">
              {player.elo_rating}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              RPS
            </div>
          </div>
        </div>
        
        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-syndikate-concrete/20">
          <div className="text-center p-2 rounded bg-background/20 group-hover:bg-background/30 transition-colors">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Gamepad2 className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="text-sm font-display text-foreground">{player.games_played}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Игр</div>
          </div>
          <div className="text-center p-2 rounded bg-background/20 group-hover:bg-background/30 transition-colors">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Trophy className="h-3 w-3 text-syndikate-orange" />
            </div>
            <div className="text-sm font-display text-syndikate-orange">{player.wins}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Побед</div>
          </div>
          <div className="text-center p-2 rounded bg-background/20 group-hover:bg-background/30 transition-colors">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Target className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className={`text-sm font-display ${Number(winRate) >= 50 ? 'text-green-500' : 'text-foreground'}`}>
              {winRate}%
            </div>
            <div className="text-[10px] text-muted-foreground uppercase">Винрейт</div>
          </div>
        </div>
      </div>
    </div>
  );
};
