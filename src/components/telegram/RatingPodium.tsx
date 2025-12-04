import React from 'react';
import { Crown, Trophy, Medal, Gamepad2 } from 'lucide-react';
import { PlayerLevelBadge } from './PlayerLevelBadge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { fixStorageUrl } from '@/utils/storageUtils';

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  avatar_url?: string;
}

interface RatingPodiumProps {
  topPlayers: Player[];
  onPlayerClick?: (player: Player) => void;
}

export const RatingPodium: React.FC<RatingPodiumProps> = ({ topPlayers, onPlayerClick }) => {
  if (topPlayers.length < 3) return null;

  const getWinRate = (wins: number, games: number) => {
    if (games === 0) return '0';
    return ((wins / games) * 100).toFixed(0);
  };

  return (
    <div className="relative mb-6">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-syndikate-orange/10 via-transparent to-transparent rounded-lg blur-xl opacity-50" />
      
      <div className="grid grid-cols-3 gap-2 items-end relative z-10">
        {/* 2nd Place - Left */}
        <div 
          className="relative cursor-pointer group"
          onClick={() => onPlayerClick?.(topPlayers[1])}
        >
          {/* Place indicator */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full brutal-border flex items-center justify-center shadow-lg z-20 group-hover:scale-110 transition-transform">
            <Medal className="h-5 w-5 text-background" />
          </div>
          
          <div className="bg-syndikate-metal/90 brutal-border p-3 pt-8 text-center space-y-2 group-hover:shadow-neon-orange transition-all duration-300 relative overflow-hidden">
            {/* Background effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <Avatar className="w-14 h-14 mx-auto brutal-border relative z-10 group-hover:scale-105 transition-transform">
              <AvatarImage src={topPlayers[1].avatar_url ? fixStorageUrl(topPlayers[1].avatar_url) : undefined} alt={topPlayers[1].name} />
              <AvatarFallback className="bg-gray-400/20 text-xl font-display text-gray-300">
                {topPlayers[1].name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="relative z-10">
              <div className="text-sm font-display truncate group-hover:text-syndikate-orange transition-colors">{topPlayers[1].name}</div>
              <PlayerLevelBadge rating={topPlayers[1].elo_rating} gamesPlayed={topPlayers[1].games_played} wins={topPlayers[1].wins} size="sm" />
              <div className="text-lg font-display text-syndikate-orange font-bold mt-1">{topPlayers[1].elo_rating}</div>
              <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <Gamepad2 className="h-3 w-3" />
                {topPlayers[1].games_played} игр • {getWinRate(topPlayers[1].wins, topPlayers[1].games_played)}% WR
              </div>
            </div>
          </div>
          
          {/* Podium stand */}
          <div className="h-16 bg-gradient-to-b from-gray-400/40 to-gray-600/40 brutal-border mt-1 flex items-center justify-center">
            <span className="text-3xl font-display text-gray-400/60">2</span>
          </div>
        </div>

        {/* 1st Place - Center */}
        <div 
          className="relative -mt-4 cursor-pointer group"
          onClick={() => onPlayerClick?.(topPlayers[0])}
        >
          {/* Crown with glow */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full brutal-border flex items-center justify-center shadow-neon-orange animate-pulse group-hover:scale-110 transition-transform">
              <Crown className="h-7 w-7 text-background" />
            </div>
          </div>
          
          <div className="bg-syndikate-metal/90 brutal-border p-4 pt-10 text-center space-y-2 shadow-neon-orange relative overflow-hidden">
            {/* Champion background effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-syndikate-orange/5 to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-syndikate-orange to-yellow-400" />
            
            <Avatar className="w-18 h-18 mx-auto brutal-border relative z-10 group-hover:scale-105 transition-transform ring-2 ring-yellow-500/50 ring-offset-2 ring-offset-background">
              <AvatarImage src={topPlayers[0].avatar_url ? fixStorageUrl(topPlayers[0].avatar_url) : undefined} alt={topPlayers[0].name} className="w-[72px] h-[72px]" />
              <AvatarFallback className="bg-syndikate-orange/20 text-2xl font-display text-syndikate-orange w-[72px] h-[72px]">
                {topPlayers[0].name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="relative z-10">
              <div className="text-base font-display truncate group-hover:text-syndikate-orange transition-colors font-bold">{topPlayers[0].name}</div>
              <PlayerLevelBadge rating={topPlayers[0].elo_rating} gamesPlayed={topPlayers[0].games_played} wins={topPlayers[0].wins} size="sm" />
              <div className="text-2xl font-display text-syndikate-orange font-bold mt-1">{topPlayers[0].elo_rating}</div>
              <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <Trophy className="h-3 w-3 text-syndikate-orange" />
                {topPlayers[0].wins} побед • {getWinRate(topPlayers[0].wins, topPlayers[0].games_played)}% WR
              </div>
              
              {/* Champion badge */}
              <div className="mt-2 px-3 py-1 bg-gradient-to-r from-yellow-500/20 to-syndikate-orange/20 brutal-border text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
                <Crown className="h-3 w-3 text-yellow-500" />
                <span className="text-yellow-500 font-bold">Чемпион</span>
              </div>
            </div>
          </div>
          
          {/* Podium stand - tallest */}
          <div className="h-24 bg-gradient-to-b from-yellow-400/40 to-yellow-600/40 brutal-border mt-1 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-syndikate-orange/20 to-transparent" />
            <span className="text-4xl font-display text-yellow-500/60 relative z-10">1</span>
          </div>
        </div>

        {/* 3rd Place - Right */}
        <div 
          className="relative cursor-pointer group"
          onClick={() => onPlayerClick?.(topPlayers[2])}
        >
          {/* Place indicator */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-800 rounded-full brutal-border flex items-center justify-center shadow-lg z-20 group-hover:scale-110 transition-transform">
            <Medal className="h-5 w-5 text-background" />
          </div>
          
          <div className="bg-syndikate-metal/90 brutal-border p-3 pt-8 text-center space-y-2 group-hover:shadow-neon-orange transition-all duration-300 relative overflow-hidden">
            {/* Background effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-700/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <Avatar className="w-14 h-14 mx-auto brutal-border relative z-10 group-hover:scale-105 transition-transform">
              <AvatarImage src={topPlayers[2].avatar_url ? fixStorageUrl(topPlayers[2].avatar_url) : undefined} alt={topPlayers[2].name} />
              <AvatarFallback className="bg-orange-700/20 text-xl font-display text-orange-400">
                {topPlayers[2].name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="relative z-10">
              <div className="text-sm font-display truncate group-hover:text-syndikate-orange transition-colors">{topPlayers[2].name}</div>
              <PlayerLevelBadge rating={topPlayers[2].elo_rating} gamesPlayed={topPlayers[2].games_played} wins={topPlayers[2].wins} size="sm" />
              <div className="text-lg font-display text-syndikate-orange font-bold mt-1">{topPlayers[2].elo_rating}</div>
              <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <Gamepad2 className="h-3 w-3" />
                {topPlayers[2].games_played} игр • {getWinRate(topPlayers[2].wins, topPlayers[2].games_played)}% WR
              </div>
            </div>
          </div>
          
          {/* Podium stand */}
          <div className="h-12 bg-gradient-to-b from-orange-700/40 to-orange-900/40 brutal-border mt-1 flex items-center justify-center">
            <span className="text-2xl font-display text-orange-600/60">3</span>
          </div>
        </div>
      </div>
    </div>
  );
};
