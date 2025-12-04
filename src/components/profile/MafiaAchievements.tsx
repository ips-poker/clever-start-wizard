import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, Lock, Crown } from "lucide-react";
import { motion } from "framer-motion";

// Import poker avatars for mafia hierarchy
import avatar1 from "@/assets/avatars/poker-avatar-1.png";
import avatar2 from "@/assets/avatars/poker-avatar-2.png";
import avatar3 from "@/assets/avatars/poker-avatar-3.png";
import avatar4 from "@/assets/avatars/poker-avatar-4.png";
import avatar5 from "@/assets/avatars/poker-avatar-5.png";
import avatar6 from "@/assets/avatars/poker-avatar-6.png";
import avatar7 from "@/assets/avatars/poker-avatar-7.png";
import avatar8 from "@/assets/avatars/poker-avatar-8.png";
import avatar9 from "@/assets/avatars/poker-avatar-9.png";
import avatar10 from "@/assets/avatars/poker-avatar-10.png";

interface GameResult {
  position: number;
}

interface MafiaAchievementsProps {
  gamesPlayed: number;
  wins: number;
  rating: number;
  gameResults: GameResult[];
}

interface MafiaRank {
  id: string;
  name: string;
  title: string;
  description: string;
  avatar: string;
  requirement: {
    type: 'games' | 'wins' | 'rating' | 'combined';
    games?: number;
    wins?: number;
    rating?: number;
  };
  color: string;
  bgGradient: string;
  borderColor: string;
  glowColor: string;
  rarity: 'initiate' | 'soldier' | 'captain' | 'underboss' | 'boss' | 'godfather';
}

export function MafiaAchievements({ gamesPlayed, wins, rating, gameResults }: MafiaAchievementsProps) {
  const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;
  const top3Count = gameResults.filter(r => r.position <= 3).length;

  const mafiaRanks: MafiaRank[] = useMemo(() => [
    {
      id: 'shesterka',
      name: 'Шестёрка',
      title: 'Новичок семьи',
      description: 'Вступите в игру — сыграйте первый турнир',
      avatar: avatar1,
      requirement: { type: 'games', games: 1 },
      color: 'text-zinc-400',
      bgGradient: 'from-zinc-600 to-zinc-800',
      borderColor: 'border-zinc-500',
      glowColor: 'shadow-zinc-500/30',
      rarity: 'initiate'
    },
    {
      id: 'boets',
      name: 'Боец',
      title: 'Проверенный человек',
      description: 'Покажите характер — сыграйте 3 турнира',
      avatar: avatar2,
      requirement: { type: 'games', games: 3 },
      color: 'text-stone-400',
      bgGradient: 'from-stone-600 to-stone-800',
      borderColor: 'border-stone-500',
      glowColor: 'shadow-stone-500/30',
      rarity: 'initiate'
    },
    {
      id: 'brigadir',
      name: 'Бригадир',
      title: 'Командир бригады',
      description: 'Докажите лидерство — выиграйте турнир',
      avatar: avatar3,
      requirement: { type: 'wins', wins: 1 },
      color: 'text-amber-400',
      bgGradient: 'from-amber-600 to-amber-800',
      borderColor: 'border-amber-500',
      glowColor: 'shadow-amber-500/40',
      rarity: 'soldier'
    },
    {
      id: 'avtoritet',
      name: 'Авторитет',
      title: 'Уважаемый игрок',
      description: 'Заработайте уважение — 5 турниров',
      avatar: avatar4,
      requirement: { type: 'games', games: 5 },
      color: 'text-orange-400',
      bgGradient: 'from-orange-600 to-orange-800',
      borderColor: 'border-orange-500',
      glowColor: 'shadow-orange-500/40',
      rarity: 'soldier'
    },
    {
      id: 'pitboss',
      name: 'Питбосс',
      title: 'Хозяин стола',
      description: 'Достигните Silver уровня — 1200+ RPS',
      avatar: avatar5,
      requirement: { type: 'rating', rating: 1200 },
      color: 'text-blue-400',
      bgGradient: 'from-blue-600 to-blue-800',
      borderColor: 'border-blue-500',
      glowColor: 'shadow-blue-500/40',
      rarity: 'captain'
    },
    {
      id: 'shark',
      name: 'Шарк',
      title: 'Акула покера',
      description: 'Станьте легендой — 3 победы',
      avatar: avatar6,
      requirement: { type: 'wins', wins: 3 },
      color: 'text-purple-400',
      bgGradient: 'from-purple-600 to-purple-800',
      borderColor: 'border-purple-500',
      glowColor: 'shadow-purple-500/50',
      rarity: 'captain'
    },
    {
      id: 'kapo',
      name: 'Капо',
      title: 'Глава группировки',
      description: 'Опыт решает — 10 турниров',
      avatar: avatar7,
      requirement: { type: 'games', games: 10 },
      color: 'text-red-400',
      bgGradient: 'from-red-600 to-red-800',
      borderColor: 'border-red-500',
      glowColor: 'shadow-red-500/50',
      rarity: 'underboss'
    },
    {
      id: 'konsigliere',
      name: 'Консильери',
      title: 'Правая рука Дона',
      description: 'Достигните Gold уровня — 1500+ RPS',
      avatar: avatar8,
      requirement: { type: 'rating', rating: 1500 },
      color: 'text-yellow-400',
      bgGradient: 'from-yellow-500 to-yellow-700',
      borderColor: 'border-yellow-500',
      glowColor: 'shadow-yellow-500/50',
      rarity: 'underboss'
    },
    {
      id: 'don',
      name: 'Дон',
      title: 'Глава семьи',
      description: 'Докажите превосходство — 5 побед',
      avatar: avatar9,
      requirement: { type: 'wins', wins: 5 },
      color: 'text-rose-400',
      bgGradient: 'from-rose-500 to-rose-700',
      borderColor: 'border-rose-500',
      glowColor: 'shadow-rose-500/60',
      rarity: 'boss'
    },
    {
      id: 'patriarch',
      name: 'Патриарх Синдиката',
      title: 'Крёстный отец покера',
      description: 'Вершина власти — Diamond уровень 1800+ RPS',
      avatar: avatar10,
      requirement: { type: 'rating', rating: 1800 },
      color: 'text-cyan-300',
      bgGradient: 'from-cyan-400 via-blue-500 to-purple-600',
      borderColor: 'border-cyan-400',
      glowColor: 'shadow-cyan-400/70',
      rarity: 'godfather'
    },
  ], []);

  const isRankUnlocked = (rank: MafiaRank): boolean => {
    const req = rank.requirement;
    switch (req.type) {
      case 'games':
        return gamesPlayed >= (req.games || 0);
      case 'wins':
        return wins >= (req.wins || 0);
      case 'rating':
        return rating >= (req.rating || 0);
      case 'combined':
        return (
          gamesPlayed >= (req.games || 0) &&
          wins >= (req.wins || 0) &&
          rating >= (req.rating || 0)
        );
      default:
        return false;
    }
  };

  const getRankProgress = (rank: MafiaRank): { current: number; total: number; percent: number } => {
    const req = rank.requirement;
    let current = 0;
    let total = 1;
    
    switch (req.type) {
      case 'games':
        current = gamesPlayed;
        total = req.games || 1;
        break;
      case 'wins':
        current = wins;
        total = req.wins || 1;
        break;
      case 'rating':
        current = rating;
        total = req.rating || 1000;
        break;
    }
    
    return {
      current: Math.min(current, total),
      total,
      percent: Math.min((current / total) * 100, 100)
    };
  };

  const getRarityInfo = (rarity: string) => {
    const info: Record<string, { label: string; class: string; xp: number }> = {
      initiate: { label: 'Инициация', class: 'bg-zinc-600/80 text-zinc-200', xp: 25 },
      soldier: { label: 'Солдат', class: 'bg-amber-600/80 text-amber-100', xp: 50 },
      captain: { label: 'Капитан', class: 'bg-blue-600/80 text-blue-100', xp: 100 },
      underboss: { label: 'Андербосс', class: 'bg-purple-600/80 text-purple-100', xp: 150 },
      boss: { label: 'Босс', class: 'bg-rose-600/80 text-rose-100', xp: 250 },
      godfather: { label: 'Крёстный отец', class: 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white', xp: 500 }
    };
    return info[rarity] || info.initiate;
  };

  const unlockedRanks = mafiaRanks.filter(r => isRankUnlocked(r));
  const currentRank = unlockedRanks[unlockedRanks.length - 1];
  const totalXP = unlockedRanks.reduce((acc, r) => acc + getRarityInfo(r.rarity).xp, 0);

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
              {unlockedRanks.length}/{mafiaRanks.length}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      {/* Current Rank Display */}
      {currentRank && (
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
                <span className={`text-xl font-black ${currentRank.color}`}>{currentRank.name}</span>
                <Badge className={getRarityInfo(currentRank.rarity).class + " rounded-none text-xs"}>
                  {getRarityInfo(currentRank.rarity).label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{currentRank.title}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Текущий статус в семье</p>
            </div>
          </div>
        </div>
      )}

      <CardContent className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {mafiaRanks.map((rank, index) => {
            const unlocked = isRankUnlocked(rank);
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
                  {/* Avatar */}
                  <motion.div 
                    className={`relative rounded-full p-0.5 ${unlocked ? `bg-gradient-to-br ${rank.bgGradient}` : 'bg-secondary'}`}
                    whileHover={unlocked ? { rotate: [0, -5, 5, 0], scale: 1.1 } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {unlocked ? (
                      <img 
                        src={rank.avatar} 
                        alt={rank.name}
                        className="w-12 h-12 rounded-full border border-white/20"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center border border-border">
                        <Lock className="h-5 w-5 text-muted-foreground/50" />
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
                    <p className={`text-xs font-black leading-tight ${unlocked ? rank.color : 'text-muted-foreground/50'}`}>
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
                      <p className="text-[8px] text-muted-foreground/60">
                        {progress.current}/{progress.total}
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