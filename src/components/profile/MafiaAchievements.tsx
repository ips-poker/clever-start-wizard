import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lock, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { 
  MAFIA_RANKS, 
  MafiaRank,
  isRankUnlocked, 
  getCurrentMafiaRank, 
  getRarityInfo,
  getUnlockedRanks,
  getTotalRankXP 
} from "@/utils/mafiaRanks";

interface GameResult {
  position: number;
}

interface MafiaAchievementsProps {
  gamesPlayed: number;
  wins: number;
  rating: number;
  gameResults: GameResult[];
}

export function MafiaAchievements({ gamesPlayed, wins, rating, gameResults }: MafiaAchievementsProps) {
  const stats = { gamesPlayed, wins, rating };
  
  const getRankProgress = (rank: MafiaRank): { current: number; total: number; percent: number; details?: string } => {
    const req = rank.requirement;
    
    switch (req.type) {
      case 'games':
        return {
          current: Math.min(gamesPlayed, req.games || 1),
          total: req.games || 1,
          percent: Math.min((gamesPlayed / (req.games || 1)) * 100, 100)
        };
      case 'wins':
        return {
          current: Math.min(wins, req.wins || 1),
          total: req.wins || 1,
          percent: Math.min((wins / (req.wins || 1)) * 100, 100)
        };
      case 'rating':
        return {
          current: Math.min(rating, req.rating || 1000),
          total: req.rating || 1000,
          percent: Math.min((rating / (req.rating || 1000)) * 100, 100)
        };
      case 'combined': {
        const progresses: number[] = [];
        const details: string[] = [];
        
        if (req.games) {
          const gameProgress = Math.min(gamesPlayed / req.games, 1);
          progresses.push(gameProgress);
          details.push(`${Math.min(gamesPlayed, req.games)}/${req.games} игр`);
        }
        if (req.wins) {
          const winProgress = Math.min(wins / req.wins, 1);
          progresses.push(winProgress);
          details.push(`${Math.min(wins, req.wins)}/${req.wins} побед`);
        }
        if (req.rating) {
          const ratingProgress = Math.min(rating / req.rating, 1);
          progresses.push(ratingProgress);
          details.push(`${rating}/${req.rating} RPS`);
        }
        
        const avgPercent = progresses.length > 0 
          ? (progresses.reduce((a, b) => a + b, 0) / progresses.length) * 100 
          : 0;
        
        return {
          current: Math.round(avgPercent),
          total: 100,
          percent: Math.min(avgPercent, 100),
          details: details.join(' • ')
        };
      }
      default:
        return { current: 0, total: 1, percent: 0 };
    }
  };

  const unlockedRanks = getUnlockedRanks(stats);
  const currentRank = getCurrentMafiaRank(stats);
  const totalXP = getTotalRankXP(stats);

  return (
    <Card className="brutal-border bg-card overflow-hidden">
      <CardHeader className="border-b border-border bg-gradient-to-r from-red-900/20 via-background to-purple-900/20">
        <CardTitle className="flex items-center justify-between text-foreground">
          <div className="flex items-center gap-3">
            <motion.div 
              className="p-2 bg-gradient-to-br from-red-600 to-purple-700 shadow-brutal"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Crown className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <h3 className="text-lg font-bold uppercase tracking-wide">Иерархия Семьи</h3>
              <div className="h-0.5 w-20 bg-gradient-to-r from-red-500 to-purple-500 mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-primary/20 text-primary border border-primary/30 rounded-none font-bold">
              +{totalXP} XP
            </Badge>
            <Badge className="bg-gradient-to-r from-red-600 to-purple-600 text-white rounded-none font-bold px-3">
              {unlockedRanks.length}/{MAFIA_RANKS.length}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      {/* Current Rank Display */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-background via-primary/5 to-background">
        <div className="flex items-center gap-4">
          <motion.div 
            className={`relative p-1 rounded-full bg-gradient-to-br ${currentRank.bgGradient} ${currentRank.glowColor} shadow-lg`}
            animate={{ boxShadow: ['0 0 20px rgba(0,0,0,0.3)', '0 0 40px rgba(0,0,0,0.5)', '0 0 20px rgba(0,0,0,0.3)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <img 
              src={currentRank.avatar} 
              alt={currentRank.name}
              className="w-16 h-16 rounded-full border-2 border-white/20"
            />
            <motion.div 
              className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Crown className="w-3 h-3 text-white" />
            </motion.div>
          </motion.div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xl mr-1">{currentRank.icon}</span>
              <span className={`text-xl font-black ${currentRank.textColor}`}>{currentRank.name}</span>
              <Badge className={getRarityInfo(currentRank.rarity).class + " rounded-none text-xs"}>
                {getRarityInfo(currentRank.rarity).label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{currentRank.title}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Текущий статус в семье</p>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {MAFIA_RANKS.map((rank, index) => {
            const unlocked = isRankUnlocked(rank, stats);
            const progress = getRankProgress(rank);
            const rarityInfo = getRarityInfo(rank.rarity);
            
            return (
              <motion.div 
                key={rank.id}
                className={`relative p-3 border-2 transition-all duration-300 group cursor-pointer overflow-hidden ${
                  unlocked 
                    ? `${rank.borderColor} bg-gradient-to-br from-background to-secondary/30 hover:scale-105` 
                    : 'border-border/50 bg-secondary/20 grayscale hover:grayscale-[50%]'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ y: -4 }}
              >
                {/* Glow effect for unlocked */}
                {unlocked && (
                  <motion.div 
                    className={`absolute inset-0 bg-gradient-to-br ${rank.bgGradient} opacity-10`}
                    animate={{ opacity: [0.05, 0.15, 0.05] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                )}

                {/* Rank number */}
                <div className="absolute top-1 left-1">
                  <span className={`text-xs font-bold ${unlocked ? rank.color : 'text-muted-foreground/50'}`}>
                    #{index + 1}
                  </span>
                </div>

                <div className="flex flex-col items-center text-center gap-2 relative z-10">
                  {/* Avatar - always visible, bright when unlocked */}
                  <motion.div 
                    className={`relative rounded-full p-0.5 ${unlocked ? `bg-gradient-to-br ${rank.bgGradient}` : 'bg-secondary/50'}`}
                    whileHover={unlocked ? { rotate: [0, -5, 5, 0], scale: 1.1 } : { scale: 1.05 }}
                    transition={{ duration: 0.5 }}
                  >
                    <img 
                      src={rank.avatar} 
                      alt={rank.name}
                      className={`w-12 h-12 rounded-full border transition-all duration-500 ${
                        unlocked 
                          ? 'border-white/20 brightness-100 saturate-100' 
                          : 'border-border/50 brightness-50 saturate-0 opacity-60'
                      }`}
                    />
                    
                    {/* Lock overlay for locked ranks */}
                    {!unlocked && (
                      <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/30">
                        <Lock className="h-4 w-4 text-white/50" />
                      </div>
                    )}
                    
                    {/* Animated ring for godfather rank */}
                    {unlocked && rank.rarity === 'godfather' && (
                      <motion.div 
                        className="absolute inset-0 rounded-full border-2 border-cyan-400"
                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                  
                  {/* Name */}
                  <div>
                    <p className={`text-xs font-black leading-tight ${unlocked ? rank.textColor : 'text-muted-foreground/50'}`}>
                      {rank.name}
                    </p>
                    <p className={`text-[9px] mt-0.5 leading-tight ${unlocked ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
                      {rank.title}
                    </p>
                  </div>
                  
                  {/* Progress or Status */}
                  {unlocked ? (
                    <Badge className={`${rarityInfo.class} text-[8px] px-1.5 py-0 rounded-none font-bold`}>
                      +{rarityInfo.xp} XP
                    </Badge>
                  ) : (
                    <div className="w-full space-y-1">
                      <Progress 
                        value={progress.percent} 
                        className="h-1.5 bg-secondary"
                      />
                      <p className="text-[8px] text-muted-foreground/60 leading-tight">
                        {progress.details || `${progress.current}/${progress.total}`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Tooltip on hover */}
                <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-background/95 backdrop-blur-sm border-t border-border p-2 z-20">
                  <p className="text-[10px] text-center text-muted-foreground">{rank.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Уровни иерархии:</p>
          <div className="flex flex-wrap gap-2">
            {['initiate', 'soldier', 'captain', 'underboss', 'boss', 'godfather'].map(rarity => {
              const info = getRarityInfo(rarity);
              return (
                <Badge key={rarity} className={`${info.class} text-[9px] rounded-none`}>
                  {info.label} (+{info.xp} XP)
                </Badge>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}