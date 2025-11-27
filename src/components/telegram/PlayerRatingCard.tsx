import React from 'react';

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
}

export const PlayerRatingCard: React.FC<PlayerRatingCardProps> = ({ player, rank, index, onClick }) => {
  const ratingChange = Math.floor(Math.random() * 100) - 50; // Mock rating change
  const winRate = ((player.wins / player.games_played) * 100).toFixed(1);
  
  // Mock achievement badges
  const achievements = [];
  if (player.wins >= 10) achievements.push({ icon: '🏆', label: 'Winner' });
  if (player.games_played >= 50) achievements.push({ icon: '⭐', label: 'Veteran' });
  if (ratingChange > 30) achievements.push({ icon: '📈', label: 'Rising Star' });

  return (
    <div
      onClick={onClick}
      className="relative bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal overflow-hidden group cursor-pointer hover:shadow-neon-orange transition-all duration-300 animate-fade-in"
      style={{animationDelay: `${index * 50}ms`}}
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-syndikate-orange/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute inset-0 industrial-texture opacity-20" />

      <div className="relative z-10 p-4 space-y-3">
        <div className="flex items-center gap-4">
          {/* Rank */}
          <div className="w-10 h-10 bg-syndikate-concrete/20 brutal-border flex items-center justify-center group-hover:bg-syndikate-orange/20 transition-colors">
            <span className="text-lg font-display text-syndikate-orange">
              {rank}
            </span>
          </div>

          {/* Player avatar/initial */}
          <div className="w-12 h-12 bg-syndikate-orange/20 brutal-border flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="text-xl font-display text-syndikate-orange">
              {player.name.charAt(0)}
            </span>
          </div>

          {/* Player info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-base font-display truncate">
                {player.name}
              </div>
              {/* Achievement badges */}
              {achievements.length > 0 && (
                <div className="flex gap-1">
                  {achievements.map((achievement, i) => (
                    <span key={i} className="text-xs" title={achievement.label}>
                      {achievement.icon}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-xs text-syndikate-concrete flex items-center gap-2">
              <span>{player.games_played} games</span>
              <span>•</span>
              <span className={Number(winRate) >= 50 ? "text-green-500" : "text-syndikate-concrete"}>
                {winRate}% WR
              </span>
            </div>
          </div>

          {/* Rating with change indicator */}
          <div className="text-right">
            <div className="text-xl font-display text-syndikate-orange">
              {player.elo_rating}
            </div>
            <div className={`text-xs font-display ${
              ratingChange > 0 ? 'text-green-500' : ratingChange < 0 ? 'text-red-500' : 'text-syndikate-concrete'
            }`}>
              {ratingChange > 0 ? '▲' : ratingChange < 0 ? '▼' : '━'} {Math.abs(ratingChange)}
            </div>
          </div>
        </div>
        
        {/* Mini progress chart */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-syndikate-concrete">
            <span>Performance</span>
            <span>{winRate}%</span>
          </div>
          <div className="h-1 bg-background brutal-border overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                Number(winRate) >= 50 
                  ? 'bg-gradient-to-r from-green-500 to-syndikate-orange' 
                  : 'bg-gradient-to-r from-syndikate-concrete to-syndikate-orange/50'
              }`}
              style={{ width: `${winRate}%` }}
            />
          </div>
        </div>
        
        {/* Extended stats grid */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-syndikate-concrete/20">
          <div className="text-center">
            <div className="text-sm font-display text-syndikate-orange">{player.wins}</div>
            <div className="text-xs text-syndikate-concrete">Wins</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-display text-foreground">
              {Math.ceil(player.games_played / 3)}
            </div>
            <div className="text-xs text-syndikate-concrete">Top 3</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-display text-foreground">
              {player.wins > 0 ? Math.ceil(player.games_played / player.wins) : 0}
            </div>
            <div className="text-xs text-syndikate-concrete">Avg Pos</div>
          </div>
        </div>
      </div>
    </div>
  );
};
