import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lock, Crown, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  MAFIA_RANKS, 
  MafiaRank,
  isRankUnlocked, 
  getCurrentMafiaRank, 
  getMafiaRankProgress,
  getRarityInfo,
  getUnlockedRanks,
  getTotalRankXP 
} from '@/utils/mafiaRanks';

interface MafiaHierarchyProps {
  gamesPlayed: number;
  wins: number;
  rating: number;
}

export const MafiaHierarchy: React.FC<MafiaHierarchyProps> = ({ 
  gamesPlayed, 
  wins, 
  rating 
}) => {
  const stats = { gamesPlayed, wins, rating };
  const currentRank = getCurrentMafiaRank(stats);
  const rankProgress = getMafiaRankProgress(stats);
  const unlockedRanks = getUnlockedRanks(stats);
  const totalXP = getTotalRankXP(stats);
  const rarityInfo = getRarityInfo(currentRank.rarity);

  const getRankProgress = (rank: MafiaRank): { percent: number; details: string } => {
    const req = rank.requirement;
    
    switch (req.type) {
      case 'games':
        return {
          percent: Math.min((gamesPlayed / (req.games || 1)) * 100, 100),
          details: `${Math.min(gamesPlayed, req.games || 0)}/${req.games} игр`
        };
      case 'wins':
        return {
          percent: Math.min((wins / (req.wins || 1)) * 100, 100),
          details: `${Math.min(wins, req.wins || 0)}/${req.wins} побед`
        };
      case 'rating':
        return {
          percent: Math.min((rating / (req.rating || 1000)) * 100, 100),
          details: `${rating}/${req.rating} RPS`
        };
      case 'combined': {
        const progresses: number[] = [];
        const details: string[] = [];
        
        if (req.games) {
          progresses.push(Math.min(gamesPlayed / req.games, 1));
          details.push(`${Math.min(gamesPlayed, req.games)}/${req.games}`);
        }
        if (req.wins) {
          progresses.push(Math.min(wins / req.wins, 1));
          details.push(`${Math.min(wins, req.wins)}/${req.wins}W`);
        }
        if (req.rating) {
          progresses.push(Math.min(rating / req.rating, 1));
          details.push(`${rating}/${req.rating}`);
        }
        
        const avgPercent = progresses.length > 0 
          ? (progresses.reduce((a, b) => a + b, 0) / progresses.length) * 100 
          : 0;
        
        return { percent: Math.min(avgPercent, 100), details: details.join(' • ') };
      }
      default:
        return { percent: 0, details: '' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Rank Hero */}
      <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl overflow-hidden relative">
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${currentRank.bgGradient} opacity-10`} />
        
        {/* Animated glow */}
        <motion.div 
          className="absolute top-0 right-0 w-32 h-32 bg-syndikate-orange/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        
        <CardContent className="p-4 relative z-10">
          <div className="flex items-center gap-4">
            {/* Current Rank Avatar */}
            <motion.div 
              className={`relative p-1 rounded-full bg-gradient-to-br ${currentRank.bgGradient} shadow-lg`}
              animate={{ boxShadow: ['0 0 15px rgba(255,107,0,0.2)', '0 0 30px rgba(255,107,0,0.4)', '0 0 15px rgba(255,107,0,0.2)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <img 
                src={currentRank.avatar} 
                alt={currentRank.name}
                className="w-16 h-16 rounded-full border-2 border-white/20"
              />
              <motion.div 
                className="absolute -top-1 -right-1 bg-syndikate-orange rounded-full p-1 shadow-neon-orange"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Crown className="w-3 h-3 text-background" />
              </motion.div>
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-lg font-black ${currentRank.textColor}`}>
                  {currentRank.name}
                </span>
                <Badge className={`${rarityInfo.class} rounded-none text-[10px] font-bold`}>
                  {rarityInfo.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{currentRank.title}</p>
              
              {/* Progress to next */}
              {rankProgress.next && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>До {rankProgress.next.name}</span>
                    <span className="text-syndikate-orange font-bold">{Math.round(rankProgress.progress)}%</span>
                  </div>
                  <Progress value={rankProgress.progress} className="h-1.5 bg-secondary" />
                </div>
              )}
            </div>

            <div className="text-right">
              <Badge className="bg-primary/20 text-primary border border-primary/30 rounded-none font-bold">
                +{totalXP} XP
              </Badge>
              <p className="text-[10px] text-muted-foreground mt-1">
                {unlockedRanks.length}/{MAFIA_RANKS.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hierarchy Grid */}
      <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl overflow-hidden">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-gradient-to-b from-syndikate-orange to-syndikate-red rounded-full" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Иерархия Семьи</h3>
          </div>

          {/* Compact rank grid */}
          <div className="grid grid-cols-5 gap-2">
            {MAFIA_RANKS.map((rank, index) => {
              const unlocked = isRankUnlocked(rank, stats);
              const progress = getRankProgress(rank);
              const isCurrent = rank.id === currentRank.id;
              
              return (
                <motion.div 
                  key={rank.id}
                  className={`relative p-2 border transition-all duration-300 group ${
                    isCurrent 
                      ? `border-syndikate-orange bg-syndikate-orange/10 shadow-neon-orange` 
                      : unlocked 
                        ? `${rank.borderColor} bg-gradient-to-br from-background/50 to-secondary/20` 
                        : 'border-border/30 bg-secondary/10'
                  }`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                >
                  {/* Current indicator */}
                  {isCurrent && (
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-syndikate-orange rounded-full animate-pulse" />
                  )}

                  <div className="flex flex-col items-center">
                    {/* Avatar */}
                    <div className={`relative rounded-full p-0.5 bg-gradient-to-br ${rank.bgGradient} ${!unlocked ? 'opacity-60' : ''}`}>
                      <img 
                        src={rank.avatar} 
                        alt={rank.name}
                        className={`w-10 h-10 rounded-full border transition-all ${
                          unlocked ? 'border-white/20' : 'border-white/10 brightness-75'
                        }`}
                      />
                      
                      {/* Lock overlay */}
                      {!unlocked && (
                        <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50">
                          <Lock className="h-3 w-3 text-white/60" />
                        </div>
                      )}
                    </div>
                    
                    {/* Name */}
                    <p className={`text-[9px] font-bold text-center mt-1 leading-tight ${
                      unlocked ? rank.textColor : 'text-muted-foreground/50'
                    }`}>
                      {rank.name}
                    </p>
                    
                    {/* Progress or XP */}
                    {unlocked ? (
                      <span className="text-[8px] text-syndikate-orange font-bold">
                        +{getRarityInfo(rank.rarity).xp}
                      </span>
                    ) : (
                      <div className="w-full mt-0.5">
                        <Progress value={progress.percent} className="h-0.5 bg-secondary/50" />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
