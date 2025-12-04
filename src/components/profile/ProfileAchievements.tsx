import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, Award, Target, Crown, Shield, Swords, Medal, Gem, Rocket, Gift, 
  Star, Flame, Zap, Heart, Lock, Users, TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import { getPlayerLevel, LEVELS_ORDERED } from "@/utils/playerLevels";

interface GameResult {
  position: number;
}

interface ProfileAchievementsProps {
  gamesPlayed: number;
  wins: number;
  rating: number;
  gameResults: GameResult[];
}

export function ProfileAchievements({ gamesPlayed, wins, rating, gameResults }: ProfileAchievementsProps) {
  const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;
  const top3Count = gameResults.filter(r => r.position <= 3).length;
  const currentLevel = getPlayerLevel(rating);

  const achievements = useMemo(() => [
    // Игровые достижения
    { 
      id: 'first_game', 
      name: 'Инициация', 
      description: 'Сыграйте первый турнир в Синдикате',
      icon: Gift, 
      unlocked: gamesPlayed >= 1,
      progress: Math.min(gamesPlayed, 1),
      total: 1,
      color: 'from-green-400 to-emerald-600',
      bgColor: 'bg-green-500/20',
      rarity: 'common'
    },
    { 
      id: 'first_win', 
      name: 'Первая кровь', 
      description: 'Выиграйте турнир',
      icon: Trophy, 
      unlocked: wins >= 1,
      progress: Math.min(wins, 1),
      total: 1,
      color: 'from-yellow-400 to-amber-600',
      bgColor: 'bg-yellow-500/20',
      rarity: 'common'
    },
    { 
      id: 'top3_first', 
      name: 'В деле', 
      description: 'Финишируйте в топ-3',
      icon: Medal, 
      unlocked: top3Count >= 1,
      progress: Math.min(top3Count, 1),
      total: 1,
      color: 'from-orange-400 to-orange-600',
      bgColor: 'bg-orange-500/20',
      rarity: 'common'
    },
    { 
      id: 'veteran', 
      name: 'Ветеран', 
      description: 'Сыграйте 10 турниров',
      icon: Shield, 
      unlocked: gamesPlayed >= 10,
      progress: Math.min(gamesPlayed, 10),
      total: 10,
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-500/20',
      rarity: 'rare'
    },
    { 
      id: 'consistent', 
      name: 'Надёжный', 
      description: 'Топ-3 в 5 турнирах',
      icon: Star, 
      unlocked: top3Count >= 5,
      progress: Math.min(top3Count, 5),
      total: 5,
      color: 'from-cyan-400 to-cyan-600',
      bgColor: 'bg-cyan-500/20',
      rarity: 'rare'
    },
    { 
      id: 'champion', 
      name: 'Авторитет', 
      description: 'Выиграйте 5 турниров',
      icon: Crown, 
      unlocked: wins >= 5,
      progress: Math.min(wins, 5),
      total: 5,
      color: 'from-purple-400 to-purple-600',
      bgColor: 'bg-purple-500/20',
      rarity: 'epic'
    },
    { 
      id: 'pro_winrate', 
      name: 'Профи', 
      description: 'Винрейт 50%+ (мин. 5 игр)',
      icon: Rocket, 
      unlocked: winRate >= 50 && gamesPlayed >= 5,
      progress: gamesPlayed >= 5 ? Math.min(winRate, 50) : 0,
      total: 50,
      color: 'from-pink-400 to-pink-600',
      bgColor: 'bg-pink-500/20',
      rarity: 'epic'
    },
    // Ранговые достижения
    { 
      id: 'rank_soldier', 
      name: 'Боец', 
      description: 'Достигните ранга Боец (300+ RPS)',
      icon: Swords, 
      unlocked: rating >= 300,
      progress: Math.min(rating, 300),
      total: 300,
      color: 'from-emerald-400 to-emerald-600',
      bgColor: 'bg-emerald-500/20',
      rarity: 'rare'
    },
    { 
      id: 'rank_capo', 
      name: 'Капо', 
      description: 'Достигните ранга Капо (600+ RPS)',
      icon: Target, 
      unlocked: rating >= 600,
      progress: Math.min(rating, 600),
      total: 600,
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-500/20',
      rarity: 'epic'
    },
    { 
      id: 'rank_consigliere', 
      name: 'Консильери', 
      description: 'Достигните ранга Консильери (1000+ RPS)',
      icon: Flame, 
      unlocked: rating >= 1000,
      progress: Math.min(rating, 1000),
      total: 1000,
      color: 'from-purple-400 to-purple-600',
      bgColor: 'bg-purple-500/20',
      rarity: 'epic'
    },
    { 
      id: 'rank_don', 
      name: 'Дон', 
      description: 'Достигните ранга Дон (1500+ RPS)',
      icon: Gem, 
      unlocked: rating >= 1500,
      progress: Math.min(rating, 1500),
      total: 1500,
      color: 'from-amber-300 via-yellow-400 to-amber-500',
      bgColor: 'bg-amber-500/20',
      rarity: 'legendary'
    },
    { 
      id: 'grinder', 
      name: 'Гриндер', 
      description: 'Сыграйте 25 турниров',
      icon: TrendingUp, 
      unlocked: gamesPlayed >= 25,
      progress: Math.min(gamesPlayed, 25),
      total: 25,
      color: 'from-slate-400 to-slate-600',
      bgColor: 'bg-slate-500/20',
      rarity: 'epic'
    },
    { 
      id: 'legend', 
      name: 'Крёстный отец', 
      description: 'Выиграйте 10 турниров',
      icon: Heart, 
      unlocked: wins >= 10,
      progress: Math.min(wins, 10),
      total: 10,
      color: 'from-rose-400 via-pink-500 to-rose-600',
      bgColor: 'bg-rose-500/20',
      rarity: 'legendary'
    },
  ], [gamesPlayed, wins, rating, top3Count, winRate]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalXP = achievements.filter(a => a.unlocked).reduce((acc, a) => {
    const xpByRarity: Record<string, number> = { common: 25, rare: 50, epic: 100, legendary: 250 };
    return acc + (xpByRarity[a.rarity] || 25);
  }, 0);

  const getRarityLabel = (rarity: string) => {
    const labels: Record<string, { text: string; class: string }> = {
      common: { text: 'Обычное', class: 'bg-zinc-500/50 text-zinc-200' },
      rare: { text: 'Редкое', class: 'bg-blue-500/50 text-blue-200' },
      epic: { text: 'Эпическое', class: 'bg-purple-500/50 text-purple-200' },
      legendary: { text: 'Легендарное', class: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white' }
    };
    return labels[rarity] || labels.common;
  };

  return (
    <Card className="brutal-border bg-card overflow-hidden">
      <CardHeader className="border-b border-border bg-gradient-to-r from-amber-500/10 via-transparent to-primary/10">
        <CardTitle className="flex items-center justify-between text-foreground">
          <div className="flex items-center gap-3">
            <motion.div 
              className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 shadow-brutal"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Award className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <h3 className="text-lg font-bold uppercase tracking-wide">Достижения</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg">{currentLevel.icon}</span>
                <span className={`text-sm font-bold ${currentLevel.color}`}>{currentLevel.nameRu}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-primary/20 text-primary border border-primary/30 rounded-none font-bold">
              +{totalXP} XP
            </Badge>
            <Badge className="bg-amber-500 text-white rounded-none font-bold px-3">
              {unlockedCount}/{achievements.length}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      {/* Ранговая система */}
      <div className="p-4 border-b border-border bg-secondary/30">
        <h4 className="text-sm font-bold uppercase tracking-wide mb-3 text-muted-foreground">
          Ранги Синдиката
        </h4>
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {LEVELS_ORDERED.map((level, index) => {
            const isActive = currentLevel.level === level.level;
            const isPassed = rating >= level.minRating;
            
            return (
              <React.Fragment key={level.level}>
                <motion.div 
                  className={`flex flex-col items-center min-w-[70px] p-2 rounded-lg transition-all ${
                    isActive 
                      ? `bg-gradient-to-br ${level.bgColor} border border-primary/50` 
                      : isPassed 
                        ? 'opacity-60' 
                        : 'opacity-30'
                  }`}
                  whileHover={{ scale: 1.05 }}
                >
                  <span className="text-2xl">{level.icon}</span>
                  <span className={`text-xs font-bold mt-1 ${isPassed ? level.color : 'text-muted-foreground'}`}>
                    {level.nameRu}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {level.minRating}+
                  </span>
                </motion.div>
                {index < LEVELS_ORDERED.length - 1 && (
                  <div className={`h-0.5 w-4 flex-shrink-0 ${isPassed ? 'bg-primary' : 'bg-border'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <CardContent className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {achievements.map((achievement, index) => {
            const Icon = achievement.icon;
            const progressPercent = (achievement.progress / achievement.total) * 100;
            const rarityInfo = getRarityLabel(achievement.rarity);
            
            return (
              <motion.div 
                key={achievement.id}
                className={`relative p-3 border transition-all duration-300 group cursor-pointer ${
                  achievement.unlocked 
                    ? `bg-gradient-to-br ${achievement.bgColor} border-primary/30 hover:border-primary/60` 
                    : 'bg-secondary/30 border-border hover:border-border/80'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.03, y: -2 }}
              >
                {/* Rarity indicator */}
                <div className="absolute top-1 right-1">
                  {achievement.rarity === 'legendary' && achievement.unlocked && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    >
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    </motion.div>
                  )}
                </div>

                <div className="flex flex-col items-center text-center gap-2">
                  {/* Icon */}
                  <motion.div 
                    className={`relative p-2.5 border ${
                      achievement.unlocked 
                        ? `bg-gradient-to-br ${achievement.color} border-white/20` 
                        : 'bg-secondary border-border'
                    }`}
                    whileHover={achievement.unlocked ? { rotate: [0, -10, 10, 0] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {achievement.unlocked ? (
                      <Icon className="h-6 w-6 text-white" />
                    ) : (
                      <Lock className="h-6 w-6 text-muted-foreground" />
                    )}
                    
                    {/* Glow effect for unlocked */}
                    {achievement.unlocked && (
                      <motion.div 
                        className={`absolute inset-0 bg-gradient-to-br ${achievement.color} opacity-50 blur-md -z-10`}
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                  
                  {/* Name */}
                  <div>
                    <p className={`text-xs font-bold leading-tight ${achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {achievement.name}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2 leading-tight">
                      {achievement.description}
                    </p>
                  </div>
                  
                  {/* Progress or Status */}
                  {achievement.unlocked ? (
                    <Badge className={`${rarityInfo.class} text-[9px] px-1.5 py-0 rounded-none font-medium`}>
                      {rarityInfo.text}
                    </Badge>
                  ) : (
                    <div className="w-full space-y-1">
                      <div className="w-full bg-secondary h-1.5 overflow-hidden">
                        <motion.div 
                          className={`bg-gradient-to-r ${achievement.color} h-full`}
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 1, delay: index * 0.05 }}
                        />
                      </div>
                      <p className="text-[9px] text-muted-foreground">
                        {achievement.progress}/{achievement.total}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
