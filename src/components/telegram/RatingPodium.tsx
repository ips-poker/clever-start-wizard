import React from 'react';
import { Crown, Trophy, Medal, Gamepad2, Star } from 'lucide-react';
import { PlayerLevelBadge } from './PlayerLevelBadge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { GlitchAvatarFrame } from '@/components/ui/glitch-avatar-frame';
import { fixStorageUrl } from '@/utils/storageUtils';
import { getEffectiveMafiaRank, getRarityInfo, MafiaRank } from '@/utils/mafiaRanks';

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  avatar_url?: string;
  manual_rank?: string | null;
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

  const getPlayerRank = (player: Player): MafiaRank => {
    const effectiveRankData = getEffectiveMafiaRank({
      gamesPlayed: player.games_played,
      wins: player.wins,
      rating: player.elo_rating
    }, player.manual_rank);
    return effectiveRankData.rank;
  };

  const getRankStyles = (rank: MafiaRank) => {
    const rarity = rank.rarity;
    const styles = {
      initiate: {
        cardBg: 'bg-gradient-to-br from-zinc-800/90 to-zinc-900/90',
        border: 'border-zinc-500/50',
        glow: '',
        accent: 'text-zinc-400',
        ring: 'ring-zinc-500/30',
      },
      soldier: {
        cardBg: 'bg-gradient-to-br from-amber-900/40 to-amber-950/60',
        border: 'border-amber-500/60',
        glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
        accent: 'text-amber-400',
        ring: 'ring-amber-500/40',
      },
      captain: {
        cardBg: 'bg-gradient-to-br from-blue-900/40 to-cyan-950/60',
        border: 'border-blue-500/60',
        glow: 'shadow-[0_0_25px_rgba(59,130,246,0.4)]',
        accent: 'text-blue-400',
        ring: 'ring-blue-500/50',
      },
      underboss: {
        cardBg: 'bg-gradient-to-br from-purple-900/40 to-pink-950/60',
        border: 'border-purple-500/60',
        glow: 'shadow-[0_0_30px_rgba(168,85,247,0.4)]',
        accent: 'text-purple-400',
        ring: 'ring-purple-500/50',
      },
      boss: {
        cardBg: 'bg-gradient-to-br from-yellow-900/40 to-amber-950/60',
        border: 'border-yellow-500/70',
        glow: 'shadow-[0_0_35px_rgba(234,179,8,0.5)]',
        accent: 'text-yellow-400',
        ring: 'ring-yellow-500/60',
      },
      godfather: {
        cardBg: 'bg-gradient-to-br from-cyan-900/40 via-purple-900/40 to-pink-900/40',
        border: 'border-cyan-400/70',
        glow: 'shadow-[0_0_40px_rgba(6,182,212,0.5),0_0_60px_rgba(168,85,247,0.3)]',
        accent: 'text-cyan-300',
        ring: 'ring-cyan-400/60',
      },
    };
    return styles[rarity] || styles.initiate;
  };

  const player1 = topPlayers[0];
  const player2 = topPlayers[1];
  const player3 = topPlayers[2];

  const rank1 = getPlayerRank(player1);
  const rank2 = getPlayerRank(player2);
  const rank3 = getPlayerRank(player3);

  const styles1 = getRankStyles(rank1);
  const styles2 = getRankStyles(rank2);
  const styles3 = getRankStyles(rank3);

  const rarityInfo1 = getRarityInfo(rank1.rarity);
  const rarityInfo2 = getRarityInfo(rank2.rarity);
  const rarityInfo3 = getRarityInfo(rank3.rarity);

  return (
    <div className="relative mb-6">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-syndikate-orange/10 via-transparent to-transparent rounded-lg blur-xl opacity-50" />
      
      <div className="grid grid-cols-3 gap-2 items-end relative z-10">
        {/* 2nd Place - Left */}
        <div 
          className="relative cursor-pointer group"
          onClick={() => onPlayerClick?.(player2)}
        >
          {/* Place indicator */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full brutal-border flex items-center justify-center shadow-lg z-20 group-hover:scale-110 transition-transform">
            <Medal className="h-5 w-5 text-background" />
          </div>
          
          <div className={`${styles2.cardBg} brutal-border ${styles2.border} p-3 pt-8 text-center space-y-2 ${styles2.glow} group-hover:scale-[1.02] transition-all duration-300 relative overflow-hidden`}>
            {/* Rank-based background pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
            </div>
            
            {/* Rank badge */}
            <div className={`absolute top-1 right-1 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${rarityInfo2.class} rounded brutal-border`}>
              {rank2.name}
            </div>
            
            <div className="flex justify-center">
              <GlitchAvatarFrame rank={rank2} size="sm">
                <Avatar className={`w-full h-full ring-2 ${styles2.ring} ring-offset-1 ring-offset-background`}>
                  <AvatarImage src={player2.avatar_url ? fixStorageUrl(player2.avatar_url) : undefined} alt={player2.name} />
                  <AvatarFallback className={`bg-gradient-to-br ${rank2.bgGradient} text-lg font-display text-white`}>
                    {player2.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </GlitchAvatarFrame>
            </div>
            
            <div className="relative z-10">
              <div className={`text-sm font-display truncate ${styles2.accent} transition-colors`}>{player2.name}</div>
              <PlayerLevelBadge rating={player2.elo_rating} gamesPlayed={player2.games_played} wins={player2.wins} size="sm" />
              <div className="text-lg font-display text-syndikate-orange font-bold mt-1">{player2.elo_rating}</div>
              <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <Gamepad2 className="h-3 w-3" />
                {player2.games_played} игр • {getWinRate(player2.wins, player2.games_played)}% WR
              </div>
            </div>
          </div>
          
          {/* Podium stand */}
          <div className={`h-16 bg-gradient-to-b from-gray-400/40 to-gray-600/40 brutal-border mt-1 flex items-center justify-center ${styles2.border}`}>
            <span className="text-3xl font-display text-gray-400/60">2</span>
          </div>
        </div>

        {/* 1st Place - Center */}
        <div 
          className="relative -mt-4 cursor-pointer group"
          onClick={() => onPlayerClick?.(player1)}
        >
          {/* Crown with glow */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full brutal-border flex items-center justify-center shadow-neon-orange animate-pulse group-hover:scale-110 transition-transform">
              <Crown className="h-7 w-7 text-background" />
            </div>
          </div>
          
          <div className={`${styles1.cardBg} brutal-border ${styles1.border} p-4 pt-10 text-center space-y-2 ${styles1.glow} relative overflow-hidden group-hover:scale-[1.02] transition-all duration-300`}>
            {/* Champion background effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-syndikate-orange/5 to-transparent" />
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${rank1.rarity === 'godfather' ? 'from-cyan-400 via-purple-500 to-pink-500' : 'from-yellow-400 via-syndikate-orange to-yellow-400'}`} />
            
            {/* Rank badge */}
            <div className={`absolute top-2 right-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${rarityInfo1.class} rounded brutal-border flex items-center gap-1`}>
              <Star className="h-3 w-3" />
              {rank1.name}
            </div>
            
            <div className="flex justify-center">
              <GlitchAvatarFrame rank={rank1} size="sm">
                <Avatar className={`w-full h-full ring-2 ${styles1.ring} ring-offset-2 ring-offset-background`}>
                  <AvatarImage src={player1.avatar_url ? fixStorageUrl(player1.avatar_url) : undefined} alt={player1.name} />
                  <AvatarFallback className={`bg-gradient-to-br ${rank1.bgGradient} text-xl font-display text-white`}>
                    {player1.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </GlitchAvatarFrame>
            </div>
            
            <div className="relative z-10">
              <div className={`text-base font-display truncate ${styles1.accent} font-bold transition-colors`}>{player1.name}</div>
              <PlayerLevelBadge rating={player1.elo_rating} gamesPlayed={player1.games_played} wins={player1.wins} size="sm" />
              <div className="text-2xl font-display text-syndikate-orange font-bold mt-1">{player1.elo_rating}</div>
              <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <Trophy className="h-3 w-3 text-syndikate-orange" />
                {player1.wins} побед • {getWinRate(player1.wins, player1.games_played)}% WR
              </div>
              
              {/* Champion badge */}
              <div className={`mt-2 px-3 py-1 bg-gradient-to-r ${rank1.rarity === 'godfather' ? 'from-cyan-500/30 via-purple-500/30 to-pink-500/30' : 'from-yellow-500/20 to-syndikate-orange/20'} brutal-border text-[10px] uppercase tracking-wider inline-flex items-center gap-1`}>
                <Crown className={`h-3 w-3 ${rank1.rarity === 'godfather' ? 'text-cyan-400' : 'text-yellow-500'}`} />
                <span className={`${rank1.rarity === 'godfather' ? 'text-cyan-400' : 'text-yellow-500'} font-bold`}>Чемпион</span>
              </div>
            </div>
          </div>
          
          {/* Podium stand - tallest */}
          <div className={`h-24 bg-gradient-to-b ${rank1.rarity === 'godfather' ? 'from-cyan-400/40 via-purple-500/40 to-pink-500/40' : 'from-yellow-400/40 to-yellow-600/40'} brutal-border ${styles1.border} mt-1 flex items-center justify-center relative overflow-hidden`}>
            <div className="absolute inset-0 bg-gradient-to-t from-syndikate-orange/20 to-transparent" />
            <span className={`text-4xl font-display ${rank1.rarity === 'godfather' ? 'text-cyan-400/60' : 'text-yellow-500/60'} relative z-10`}>1</span>
          </div>
        </div>

        {/* 3rd Place - Right */}
        <div 
          className="relative cursor-pointer group"
          onClick={() => onPlayerClick?.(player3)}
        >
          {/* Place indicator */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-800 rounded-full brutal-border flex items-center justify-center shadow-lg z-20 group-hover:scale-110 transition-transform">
            <Medal className="h-5 w-5 text-background" />
          </div>
          
          <div className={`${styles3.cardBg} brutal-border ${styles3.border} p-3 pt-8 text-center space-y-2 ${styles3.glow} group-hover:scale-[1.02] transition-all duration-300 relative overflow-hidden`}>
            {/* Rank-based background pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
            </div>
            
            {/* Rank badge */}
            <div className={`absolute top-1 right-1 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${rarityInfo3.class} rounded brutal-border`}>
              {rank3.name}
            </div>
            
            <div className="flex justify-center">
              <GlitchAvatarFrame rank={rank3} size="sm">
                <Avatar className={`w-full h-full ring-2 ${styles3.ring} ring-offset-1 ring-offset-background`}>
                  <AvatarImage src={player3.avatar_url ? fixStorageUrl(player3.avatar_url) : undefined} alt={player3.name} />
                  <AvatarFallback className={`bg-gradient-to-br ${rank3.bgGradient} text-lg font-display text-white`}>
                    {player3.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </GlitchAvatarFrame>
            </div>
            
            <div className="relative z-10">
              <div className={`text-sm font-display truncate ${styles3.accent} transition-colors`}>{player3.name}</div>
              <PlayerLevelBadge rating={player3.elo_rating} gamesPlayed={player3.games_played} wins={player3.wins} size="sm" />
              <div className="text-lg font-display text-syndikate-orange font-bold mt-1">{player3.elo_rating}</div>
              <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <Gamepad2 className="h-3 w-3" />
                {player3.games_played} игр • {getWinRate(player3.wins, player3.games_played)}% WR
              </div>
            </div>
          </div>
          
          {/* Podium stand */}
          <div className={`h-12 bg-gradient-to-b from-orange-700/40 to-orange-900/40 brutal-border ${styles3.border} mt-1 flex items-center justify-center`}>
            <span className="text-2xl font-display text-orange-600/60">3</span>
          </div>
        </div>
      </div>
    </div>
  );
};
