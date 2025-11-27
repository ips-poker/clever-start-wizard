import React from 'react';
import { Crown } from 'lucide-react';
import { PlayerLevelBadge } from './PlayerLevelBadge';

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

  return (
    <div className="relative mb-8">
      <div className="grid grid-cols-3 gap-2 items-end">
        {/* 2nd Place */}
        <div 
          className="relative cursor-pointer"
          onClick={() => onPlayerClick?.(topPlayers[1])}
        >
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full brutal-border flex items-center justify-center shadow-lg animate-fade-in" style={{animationDelay: '100ms'}}>
            <span className="text-xl font-display text-background">2</span>
          </div>
          <div className="bg-syndikate-metal/90 brutal-border p-4 pt-10 text-center space-y-2 hover:shadow-neon-orange transition-all">
            <div className="w-16 h-16 mx-auto bg-syndikate-concrete/20 brutal-border flex items-center justify-center text-2xl">
              {topPlayers[1].name.charAt(0)}
            </div>
            <div className="text-sm font-display truncate">{topPlayers[1].name}</div>
            <PlayerLevelBadge rating={topPlayers[1].elo_rating} size="sm" />
            <div className="text-lg font-display text-syndikate-orange">{topPlayers[1].elo_rating}</div>
            <div className="text-xs text-syndikate-concrete">{topPlayers[1].games_played} games</div>
          </div>
          <div className="h-20 bg-gradient-to-b from-gray-400/30 to-gray-600/30 brutal-border mt-2" />
        </div>

        {/* 1st Place */}
        <div 
          className="relative -mt-4 cursor-pointer"
          onClick={() => onPlayerClick?.(topPlayers[0])}
        >
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full brutal-border flex items-center justify-center shadow-neon-orange animate-pulse">
            <Crown className="h-8 w-8 text-background" />
          </div>
          <div className="bg-syndikate-metal/90 brutal-border p-4 pt-12 text-center space-y-2 shadow-neon-orange">
            <div className="w-20 h-20 mx-auto bg-syndikate-orange/20 brutal-border flex items-center justify-center text-3xl">
              {topPlayers[0].name.charAt(0)}
            </div>
            <div className="text-base font-display truncate">{topPlayers[0].name}</div>
            <PlayerLevelBadge rating={topPlayers[0].elo_rating} size="md" />
            <div className="text-2xl font-display text-syndikate-orange">{topPlayers[0].elo_rating}</div>
            <div className="text-xs text-syndikate-concrete">{topPlayers[0].games_played} games</div>
            {/* Achievement badge */}
            <div className="px-2 py-1 bg-syndikate-orange/20 brutal-border text-xs uppercase">
              <span className="text-syndikate-orange">👑 Champion</span>
            </div>
          </div>
          <div className="h-32 bg-gradient-to-b from-yellow-400/30 to-yellow-600/30 brutal-border mt-2" />
        </div>

        {/* 3rd Place */}
        <div 
          className="relative cursor-pointer"
          onClick={() => onPlayerClick?.(topPlayers[2])}
        >
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-br from-orange-700 to-orange-900 rounded-full brutal-border flex items-center justify-center shadow-lg animate-fade-in" style={{animationDelay: '200ms'}}>
            <span className="text-xl font-display text-background">3</span>
          </div>
          <div className="bg-syndikate-metal/90 brutal-border p-4 pt-10 text-center space-y-2 hover:shadow-neon-orange transition-all">
            <div className="w-16 h-16 mx-auto bg-syndikate-concrete/20 brutal-border flex items-center justify-center text-2xl">
              {topPlayers[2].name.charAt(0)}
            </div>
            <div className="text-sm font-display truncate">{topPlayers[2].name}</div>
            <PlayerLevelBadge rating={topPlayers[2].elo_rating} size="sm" />
            <div className="text-lg font-display text-syndikate-orange">{topPlayers[2].elo_rating}</div>
            <div className="text-xs text-syndikate-concrete">{topPlayers[2].games_played} games</div>
          </div>
          <div className="h-16 bg-gradient-to-b from-orange-700/30 to-orange-900/30 brutal-border mt-2" />
        </div>
      </div>
    </div>
  );
};
