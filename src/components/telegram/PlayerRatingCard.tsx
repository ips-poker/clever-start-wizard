import React from 'react';
import { PlayerLevelBadge } from './PlayerLevelBadge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Target, Gamepad2 } from 'lucide-react';
import { fixStorageUrl } from '@/utils/storageUtils';
import { getCurrentMafiaRank } from '@/utils/mafiaRanks';
import { getRankCardStyle } from './RankProfileStyles';

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
  index: number;
  onClick?: () => void;
  isCurrentUser?: boolean;
}

export const PlayerRatingCard: React.FC<PlayerRatingCardProps> = ({ 
  player, 
  rank, 
  index, 
  onClick,
  isCurrentUser = false
}) => {
  const winRate = player.games_played > 0 
    ? ((player.wins / player.games_played) * 100).toFixed(1) 
    : '0.0';
  
  // Get player's mafia rank
  const mafiaRank = getCurrentMafiaRank({ gamesPlayed: player.games_played, wins: player.wins, rating: player.elo_rating });
  const rankStyle = getRankCardStyle(mafiaRank);
  
  // Реальные достижения на основе данных
  const achievements = [];
  if (player.wins >= 5) achievements.push({ icon: '🏆', label: 'Победитель' });
  if (player.games_played >= 20) achievements.push({ icon: '⭐', label: 'Ветеран' });
  if (player.elo_rating >= 1500) achievements.push({ icon: '💎', label: 'Топ игрок' });
  if (Number(winRate) >= 60 && player.games_played >= 5) achievements.push({ icon: '🔥', label: 'На огне' });

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden group cursor-pointer transition-all duration-300 animate-fade-in ${rankStyle.cardBg} ${rankStyle.border}`}
      style={{animationDelay: `${index * 50}ms`}}
    >
      {/* Current user indicator */}
      {isCurrentUser && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-syndikate-orange to-syndikate-red" />
      )}
      
      {/* Background decorations from rank style */}
      {rankStyle.decorations}
      
      {/* Hover overlay */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${rankStyle.hoverOverlay}`} />

      <div className="relative z-10 p-4 space-y-3">
        <div className="flex items-center gap-3">
          {/* Rank position */}
          <div className={`w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-all ${rankStyle.rankBadgeBg}`}>
            <span className={`text-lg font-display ${rankStyle.rankText}`}>
              #{rank}
            </span>
          </div>

          {/* Player avatar with rank avatar overlay */}
          <div className={`relative ${rankStyle.avatarGlow}`}>
            <Avatar className={`w-12 h-12 ${rankStyle.avatarRing} group-hover:scale-110 transition-transform`}>
              <AvatarImage src={player.avatar_url ? fixStorageUrl(player.avatar_url) : undefined} alt={player.name} />
              <AvatarFallback className={`${rankStyle.avatarFallback} text-xl font-display`}>
                {player.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Rank avatar badge */}
            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full overflow-hidden border-2 ${rankStyle.border} bg-background group-hover:scale-110 transition-transform`}>
              <img 
                src={mafiaRank.avatar} 
                alt={mafiaRank.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Player info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className={`text-base font-display truncate transition-colors ${rankStyle.nameClass}`}>
                {player.name}
              </div>
              {isCurrentUser && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${rankStyle.currentUserBadge}`}>
                  Вы
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <PlayerLevelBadge rating={player.elo_rating} gamesPlayed={player.games_played} wins={player.wins} size="sm" />
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
            <div className={`text-xl font-display font-bold ${rankStyle.ratingText}`}>
              {player.elo_rating}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              RPS
            </div>
          </div>
        </div>
        
        {/* Stats grid */}
        <div className={`grid grid-cols-3 gap-2 pt-2 border-t ${rankStyle.statsBorder}`}>
          <div className={`text-center p-2 rounded transition-colors ${rankStyle.statsBg}`}>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Gamepad2 className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="text-sm font-display text-foreground">{player.games_played}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Игр</div>
          </div>
          <div className={`text-center p-2 rounded transition-colors ${rankStyle.statsBg}`}>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Trophy className={`h-3 w-3 ${rankStyle.iconColor}`} />
            </div>
            <div className={`text-sm font-display ${rankStyle.iconColor}`}>{player.wins}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Побед</div>
          </div>
          <div className={`text-center p-2 rounded transition-colors ${rankStyle.statsBg}`}>
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
