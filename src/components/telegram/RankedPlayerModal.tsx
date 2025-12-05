import React, { useState, useEffect } from 'react';
import { X, Trophy, TrendingUp, Award, Calendar, Target, Zap, Crown, Star, Gamepad2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GlitchText } from '@/components/ui/glitch-text';
import { PlayerLevelBadge } from './PlayerLevelBadge';
import { GlitchAvatarFrame } from '@/components/ui/glitch-avatar-frame';
import { getRankProfileStyle } from './RankProfileStyles';
import { getCurrentMafiaRank, getRarityInfo } from '@/utils/mafiaRanks';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { fixStorageUrl } from '@/utils/storageUtils';
import { motion } from 'framer-motion';

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  avatar_url?: string;
  telegram?: string;
}

interface GameResult {
  id: string;
  tournament_id: string;
  position: number;
  elo_before: number;
  elo_after: number;
  elo_change: number;
  created_at: string;
  tournaments?: {
    name: string;
    start_time: string;
  };
}

interface RankedPlayerModalProps {
  player: Player;
  onClose: () => void;
}

export const RankedPlayerModal: React.FC<RankedPlayerModalProps> = ({ player, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'achievements'>('overview');
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate rank based on player stats
  const stats = {
    gamesPlayed: player.games_played,
    wins: player.wins,
    rating: player.elo_rating
  };
  const currentRank = getCurrentMafiaRank(stats);
  const rankStyle = getRankProfileStyle(currentRank);
  const rarityInfo = getRarityInfo(currentRank.rarity);

  useEffect(() => {
    fetchPlayerStats();
  }, [player.id]);

  const fetchPlayerStats = async () => {
    setLoading(true);
    try {
      const { data: results, error } = await supabase
        .from('game_results')
        .select(`
          *,
          tournaments:tournament_id (
            name,
            start_time
          )
        `)
        .eq('player_id', player.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGameResults(results || []);
    } catch (error) {
      console.error('Error fetching player stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStats = () => {
    const winRate = player.games_played > 0 ? ((player.wins / player.games_played) * 100).toFixed(1) : '0.0';
    const topThree = gameResults.filter(r => r.position <= 3).length;
    const avgPosition = gameResults.length > 0 
      ? (gameResults.reduce((sum, r) => sum + r.position, 0) / gameResults.length).toFixed(1)
      : '0';
    const totalRatingGained = gameResults.reduce((sum, r) => sum + r.elo_change, 0);

    return { winRate, topThree, avgPosition, totalRatingGained };
  };

  const getRatingChartData = () => {
    return gameResults
      .slice()
      .reverse()
      .map((result, index) => ({
        game: index + 1,
        rating: result.elo_after,
        date: new Date(result.created_at).toLocaleDateString('ru-RU', { 
          day: 'numeric', 
          month: 'short' 
        }),
      }));
  };

  // Calculate achievements based on real data
  const getAchievements = () => {
    const wins = player.wins;
    const gamesPlayed = player.games_played;
    const topThreeFinishes = gameResults.filter(r => r.position <= 3).length;
    const biggestRatingGain = Math.max(...gameResults.map(r => r.elo_change), 0);
    const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;

    return [
      // По победам
      { id: 'first_win', icon: '🏆', title: 'Первая победа', unlocked: wins >= 1, progress: Math.min(wins, 1), max: 1 },
      { id: 'triple_win', icon: '👑', title: 'Триумфатор', desc: '3 победы', unlocked: wins >= 3, progress: Math.min(wins, 3), max: 3 },
      { id: 'champion', icon: '🎖️', title: 'Чемпион', desc: '10 побед', unlocked: wins >= 10, progress: Math.min(wins, 10), max: 10 },
      
      // По играм
      { id: 'active', icon: '🎮', title: 'Активный', desc: '3 игры', unlocked: gamesPlayed >= 3, progress: Math.min(gamesPlayed, 3), max: 3 },
      { id: 'regular', icon: '⭐', title: 'Регуляр', desc: '10 игр', unlocked: gamesPlayed >= 10, progress: Math.min(gamesPlayed, 10), max: 10 },
      { id: 'veteran', icon: '🌟', title: 'Ветеран', desc: '25 игр', unlocked: gamesPlayed >= 25, progress: Math.min(gamesPlayed, 25), max: 25 },
      { id: 'legend', icon: '💫', title: 'Легенда', desc: '50 игр', unlocked: gamesPlayed >= 50, progress: Math.min(gamesPlayed, 50), max: 50 },
      { id: 'grinder', icon: '⚡', title: 'Гриндер', desc: '100 игр', unlocked: gamesPlayed >= 100, progress: Math.min(gamesPlayed, 100), max: 100 },
      
      // По призовым местам
      { id: 'podium', icon: '🥉', title: 'На подиуме', desc: '3 топ-3', unlocked: topThreeFinishes >= 3, progress: Math.min(topThreeFinishes, 3), max: 3 },
      { id: 'consistent', icon: '📊', title: 'Стабильный', desc: '10 топ-3', unlocked: topThreeFinishes >= 10, progress: Math.min(topThreeFinishes, 10), max: 10 },
      
      // По рейтингу
      { id: 'growth', icon: '📈', title: 'Рост', desc: '500 RPS', unlocked: player.elo_rating >= 500, progress: Math.min(player.elo_rating, 500), max: 500 },
      { id: 'top_player', icon: '💎', title: 'Топ игрок', desc: '1000 RPS', unlocked: player.elo_rating >= 1000, progress: Math.min(player.elo_rating, 1000), max: 1000 },
      { id: 'elite', icon: '🔱', title: 'Элита', desc: '1500 RPS', unlocked: player.elo_rating >= 1500, progress: Math.min(player.elo_rating, 1500), max: 1500 },
      { id: 'master', icon: '⚜️', title: 'Мастер', desc: '2000 RPS', unlocked: player.elo_rating >= 2000, progress: Math.min(player.elo_rating, 2000), max: 2000 },
      
      // По росту за турнир
      { id: 'rising_star', icon: '🚀', title: 'Восходящая звезда', desc: '+50 за турнир', unlocked: biggestRatingGain >= 50, progress: Math.min(biggestRatingGain, 50), max: 50 },
      { id: 'big_win', icon: '💰', title: 'Большой выигрыш', desc: '+100 за турнир', unlocked: biggestRatingGain >= 100, progress: Math.min(biggestRatingGain, 100), max: 100 },
      
      // По винрейту
      { id: 'accurate', icon: '🎯', title: 'Меткий', desc: '40%+ винрейт', unlocked: winRate >= 40 && gamesPlayed >= 3, progress: Math.round(Math.min(winRate, 40)), max: 40 },
      { id: 'hot_streak', icon: '🔥', title: 'В ударе', desc: '60%+ винрейт', unlocked: winRate >= 60 && gamesPlayed >= 5, progress: Math.round(Math.min(winRate, 60)), max: 60 },
    ];
  };

  const playerStats = getStats();
  const chartData = getRatingChartData();
  const achievements = getAchievements();
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/95 backdrop-blur-xl animate-fade-in">
      <motion.div 
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden relative shadow-brutal"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        {/* Rank-themed background */}
        <div className={`absolute inset-0 ${rankStyle.bgPattern}`} />
        <div className={`absolute inset-0 ${rankStyle.bgOverlay}`} />
        
        {/* Rank decorations */}
        {rankStyle.decorations}
        
        {/* Industrial texture */}
        <div className="absolute inset-0 industrial-texture opacity-30" />
        
        {/* Brutal border */}
        <div className="absolute inset-0 border-2 border-foreground/20" />

        <div className="relative z-10 flex flex-col h-full max-h-[90vh]">
          {/* Header with both avatars */}
          <div className="p-5 border-b border-foreground/10 bg-background/30 backdrop-blur-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                {/* Telegram Avatar with Glitch Frame */}
                <GlitchAvatarFrame rank={currentRank} size="lg">
                  <Avatar className="w-full h-full">
                    <AvatarImage 
                      src={player.avatar_url ? fixStorageUrl(player.avatar_url) : undefined} 
                      alt={player.name} 
                    />
                    <AvatarFallback className="bg-syndikate-orange/20 text-syndikate-orange text-2xl font-display">
                      {player.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </GlitchAvatarFrame>

                {/* Rank Avatar */}
                <div className="relative">
                  <div className={`p-1 rounded-full bg-gradient-to-br ${currentRank.bgGradient} shadow-lg`}>
                    <img 
                      src={currentRank.avatar} 
                      alt={currentRank.name}
                      className="w-12 h-12 rounded-full border-2 border-white/20"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                    <Crown className="w-3 h-3 text-syndikate-orange" />
                  </div>
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <h2 className={`text-2xl font-display uppercase truncate ${rankStyle.nameClass}`}>
                    <GlitchText text={player.name} />
                  </h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-sm font-bold ${currentRank.textColor}`}>
                      {currentRank.name}
                    </span>
                    <Badge className={`${rarityInfo.class} rounded-none text-[10px] font-bold`}>
                      {rarityInfo.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{currentRank.title}</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-foreground/10 brutal-border transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Rating and Stats Summary */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Award className="h-4 w-4 text-syndikate-orange" />
                <span className="text-syndikate-orange font-bold">{player.elo_rating} RPS</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Gamepad2 className="h-4 w-4" />
                <span>{player.games_played} игр</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Trophy className="h-4 w-4" />
                <span>{player.wins} побед</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-4">
              {(['overview', 'history', 'achievements'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 brutal-border font-display text-xs uppercase transition-all ${
                    activeTab === tab
                      ? 'bg-syndikate-orange text-background'
                      : 'bg-background/30 hover:bg-background/50'
                  }`}
                >
                  {tab === 'overview' ? 'Обзор' : tab === 'history' ? 'История' : 'Достижения'}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-2 border-syndikate-orange border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground mt-4">Загрузка...</p>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-background/30 brutal-border p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-syndikate-orange" />
                          <span className="text-xs text-muted-foreground uppercase">Винрейт</span>
                        </div>
                        <div className="text-2xl font-display text-syndikate-orange">{playerStats.winRate}%</div>
                      </div>
                      <div className="bg-background/30 brutal-border p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="h-4 w-4 text-syndikate-orange" />
                          <span className="text-xs text-muted-foreground uppercase">Топ 3</span>
                        </div>
                        <div className="text-2xl font-display">{playerStats.topThree}</div>
                      </div>
                      <div className="bg-background/30 brutal-border p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-syndikate-orange" />
                          <span className="text-xs text-muted-foreground uppercase">Ср. позиция</span>
                        </div>
                        <div className="text-2xl font-display">{playerStats.avgPosition}</div>
                      </div>
                      <div className="bg-background/30 brutal-border p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-4 w-4 text-syndikate-orange" />
                          <span className="text-xs text-muted-foreground uppercase">Всего набрано</span>
                        </div>
                        <div className={`text-2xl font-display ${playerStats.totalRatingGained >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {playerStats.totalRatingGained >= 0 ? '+' : ''}{playerStats.totalRatingGained}
                        </div>
                      </div>
                    </div>

                    {/* Rating chart */}
                    {chartData.length > 0 && (
                      <div className="bg-background/30 brutal-border p-4 backdrop-blur-sm">
                        <h3 className="text-sm font-display uppercase mb-4 text-syndikate-orange">Прогресс рейтинга</h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 107, 0, 0.1)" />
                            <XAxis 
                              dataKey="date" 
                              stroke="rgba(255, 107, 0, 0.5)"
                              tick={{ fill: 'rgba(255, 107, 0, 0.7)', fontSize: 10 }}
                            />
                            <YAxis 
                              stroke="rgba(255, 107, 0, 0.5)"
                              tick={{ fill: 'rgba(255, 107, 0, 0.7)', fontSize: 10 }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#1a1a1a', 
                                border: '2px solid #ff6b00',
                                borderRadius: 0,
                              }}
                              labelStyle={{ color: '#ff6b00' }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="rating" 
                              stroke="#ff6b00" 
                              strokeWidth={2}
                              dot={{ fill: '#ff6b00', r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="space-y-3">
                    {gameResults.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Пока нет истории турниров</p>
                      </div>
                    ) : (
                      gameResults.map((result, index) => (
                        <motion.div
                          key={result.id}
                          className="bg-background/30 brutal-border p-4 hover:shadow-neon-orange transition-all backdrop-blur-sm"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-display text-sm">
                                {result.tournaments?.name || 'Турнир'}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {new Date(result.created_at).toLocaleDateString('ru-RU', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className={`text-sm font-bold ${
                                result.position === 1 ? 'text-yellow-500' :
                                result.position === 2 ? 'text-gray-400' :
                                result.position === 3 ? 'text-orange-700' :
                                'text-foreground'
                              }`}>
                                {result.position === 1 && '🥇'} 
                                {result.position === 2 && '🥈'} 
                                {result.position === 3 && '🥉'}
                                {' '}#{result.position}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <div className="text-muted-foreground">
                              {result.elo_before} → {result.elo_after}
                            </div>
                            <div className={`font-bold ${
                              result.elo_change > 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {result.elo_change > 0 ? '+' : ''}{result.elo_change}
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'achievements' && (
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <span className="text-2xl font-display text-syndikate-orange">{unlockedCount}</span>
                      <span className="text-muted-foreground">/{achievements.length} разблокировано</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {achievements.map((achievement) => (
                        <motion.div
                          key={achievement.id}
                          className={`bg-background/30 brutal-border p-3 backdrop-blur-sm ${
                            achievement.unlocked ? 'border-syndikate-orange/50' : 'opacity-60'
                          }`}
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{achievement.icon}</span>
                            <span className={`text-sm font-display ${achievement.unlocked ? 'text-syndikate-orange' : 'text-muted-foreground'}`}>
                              {achievement.title}
                            </span>
                          </div>
                          <Progress 
                            value={(achievement.progress / achievement.max) * 100} 
                            className="h-1.5" 
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {achievement.progress}/{achievement.max}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
