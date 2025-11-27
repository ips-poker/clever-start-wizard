import React, { useState, useEffect } from 'react';
import { X, Trophy, TrendingUp, Award, Calendar, Target, Zap, Crown, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GlitchText } from '@/components/ui/glitch-text';
import { PlayerLevelBadge } from './PlayerLevelBadge';

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  avatar_url?: string;
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

interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

interface PlayerStatsModalProps {
  player: Player;
  onClose: () => void;
}

export const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({ player, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'achievements'>('overview');
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    fetchPlayerStats();
  }, [player.id]);

  const fetchPlayerStats = async () => {
    setLoading(true);
    try {
      // Fetch game results with tournament info
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
      calculateAchievements(results || [], player);
    } catch (error) {
      console.error('Error fetching player stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAchievements = (results: GameResult[], playerData: Player) => {
    const wins = playerData.wins;
    const gamesPlayed = playerData.games_played;
    const topThreeFinishes = results.filter(r => r.position <= 3).length;
    const winStreak = calculateWinStreak(results);
    const biggestRatingGain = Math.max(...results.map(r => r.elo_change), 0);

    const achievementsList: Achievement[] = [
      {
        id: 'first_win',
        icon: '🏆',
        title: 'First Victory',
        description: 'Win your first tournament',
        unlocked: wins >= 1,
        progress: Math.min(wins, 1),
        maxProgress: 1,
      },
      {
        id: 'veteran',
        icon: '⭐',
        title: 'Veteran Player',
        description: 'Play 50 tournaments',
        unlocked: gamesPlayed >= 50,
        progress: Math.min(gamesPlayed, 50),
        maxProgress: 50,
      },
      {
        id: 'champion',
        icon: '👑',
        title: 'Champion',
        description: 'Win 10 tournaments',
        unlocked: wins >= 10,
        progress: Math.min(wins, 10),
        maxProgress: 10,
      },
      {
        id: 'consistent',
        icon: '📊',
        title: 'Consistent Player',
        description: 'Finish in top 3 twenty times',
        unlocked: topThreeFinishes >= 20,
        progress: Math.min(topThreeFinishes, 20),
        maxProgress: 20,
      },
      {
        id: 'rising_star',
        icon: '📈',
        title: 'Rising Star',
        description: 'Gain 100+ rating in one tournament',
        unlocked: biggestRatingGain >= 100,
        progress: Math.min(biggestRatingGain, 100),
        maxProgress: 100,
      },
      {
        id: 'win_streak',
        icon: '🔥',
        title: 'On Fire',
        description: 'Win 3 tournaments in a row',
        unlocked: winStreak >= 3,
        progress: Math.min(winStreak, 3),
        maxProgress: 3,
      },
      {
        id: 'elite',
        icon: '💎',
        title: 'Elite Player',
        description: 'Reach 2000+ rating',
        unlocked: playerData.elo_rating >= 2000,
        progress: Math.min(playerData.elo_rating, 2000),
        maxProgress: 2000,
      },
      {
        id: 'grinder',
        icon: '⚡',
        title: 'The Grinder',
        description: 'Play 100 tournaments',
        unlocked: gamesPlayed >= 100,
        progress: Math.min(gamesPlayed, 100),
        maxProgress: 100,
      },
    ];

    setAchievements(achievementsList);
  };

  const calculateWinStreak = (results: GameResult[]): number => {
    let streak = 0;
    let maxStreak = 0;
    
    const sortedResults = [...results].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    sortedResults.forEach(result => {
      if (result.position === 1) {
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 0;
      }
    });

    return maxStreak;
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

  const getStats = () => {
    const winRate = player.games_played > 0 ? ((player.wins / player.games_played) * 100).toFixed(1) : '0.0';
    const topThree = gameResults.filter(r => r.position <= 3).length;
    const avgPosition = gameResults.length > 0 
      ? (gameResults.reduce((sum, r) => sum + r.position, 0) / gameResults.length).toFixed(1)
      : '0';
    const totalRatingGained = gameResults.reduce((sum, r) => sum + r.elo_change, 0);

    return { winRate, topThree, avgPosition, totalRatingGained };
  };

  const stats = getStats();
  const chartData = getRatingChartData();
  const unlockedAchievements = achievements.filter(a => a.unlocked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/95 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] bg-syndikate-metal brutal-border overflow-hidden relative shadow-brutal">
        {/* Background effects */}
        <div className="absolute inset-0 industrial-texture opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/10 via-transparent to-syndikate-red/10" />
        
        {/* Corner brackets */}
        <div className="absolute top-2 left-2 w-12 h-12 border-l-2 border-t-2 border-syndikate-orange" />
        <div className="absolute top-2 right-2 w-12 h-12 border-r-2 border-t-2 border-syndikate-orange" />
        <div className="absolute bottom-2 left-2 w-12 h-12 border-l-2 border-b-2 border-syndikate-orange" />
        <div className="absolute bottom-2 right-2 w-12 h-12 border-r-2 border-b-2 border-syndikate-orange" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-syndikate-concrete/20 bg-background/50 backdrop-blur-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-syndikate-orange/20 brutal-border flex items-center justify-center text-2xl">
                  {player.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-display uppercase">
                    <GlitchText text={player.name} />
                  </h2>
                  <div className="mt-2 mb-3">
                    <PlayerLevelBadge rating={player.elo_rating} size="md" showProgress />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-syndikate-concrete">
                      Rating: <span className="text-syndikate-orange font-bold">{player.elo_rating}</span>
                    </div>
                    <div className="text-sm text-syndikate-concrete">
                      Games: <span className="font-bold">{player.games_played}</span>
                    </div>
                    <div className="text-sm text-syndikate-concrete">
                      Wins: <span className="font-bold">{player.wins}</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-syndikate-concrete/20 brutal-border transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 brutal-border font-display text-sm uppercase transition-all ${
                  activeTab === 'overview'
                    ? 'bg-syndikate-orange text-background'
                    : 'bg-syndikate-concrete/20 hover:bg-syndikate-concrete/30'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 brutal-border font-display text-sm uppercase transition-all ${
                  activeTab === 'history'
                    ? 'bg-syndikate-orange text-background'
                    : 'bg-syndikate-concrete/20 hover:bg-syndikate-concrete/30'
                }`}
              >
                History
              </button>
              <button
                onClick={() => setActiveTab('achievements')}
                className={`px-4 py-2 brutal-border font-display text-sm uppercase transition-all ${
                  activeTab === 'achievements'
                    ? 'bg-syndikate-orange text-background'
                    : 'bg-syndikate-concrete/20 hover:bg-syndikate-concrete/30'
                }`}
              >
                Achievements
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-2 border-syndikate-orange border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-syndikate-concrete mt-4">Loading stats...</p>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-background/50 brutal-border p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-syndikate-orange" />
                          <span className="text-xs text-syndikate-concrete uppercase">Win Rate</span>
                        </div>
                        <div className="text-2xl font-display text-syndikate-orange">{stats.winRate}%</div>
                      </div>
                      <div className="bg-background/50 brutal-border p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="h-4 w-4 text-syndikate-orange" />
                          <span className="text-xs text-syndikate-concrete uppercase">Top 3</span>
                        </div>
                        <div className="text-2xl font-display">{stats.topThree}</div>
                      </div>
                      <div className="bg-background/50 brutal-border p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-syndikate-orange" />
                          <span className="text-xs text-syndikate-concrete uppercase">Avg Position</span>
                        </div>
                        <div className="text-2xl font-display">{stats.avgPosition}</div>
                      </div>
                      <div className="bg-background/50 brutal-border p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-4 w-4 text-syndikate-orange" />
                          <span className="text-xs text-syndikate-concrete uppercase">Total Gained</span>
                        </div>
                        <div className={`text-2xl font-display ${stats.totalRatingGained >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {stats.totalRatingGained >= 0 ? '+' : ''}{stats.totalRatingGained}
                        </div>
                      </div>
                    </div>

                    {/* Rating chart */}
                    {chartData.length > 0 && (
                      <div className="bg-background/50 brutal-border p-4">
                        <h3 className="text-sm font-display uppercase mb-4 text-syndikate-orange">Rating Progress</h3>
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
                        <Calendar className="h-12 w-12 text-syndikate-concrete mx-auto mb-4" />
                        <p className="text-syndikate-concrete">No tournament history yet</p>
                      </div>
                    ) : (
                      gameResults.map((result, index) => (
                        <div
                          key={result.id}
                          className="bg-background/50 brutal-border p-4 hover:shadow-neon-orange transition-all animate-fade-in"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-display text-sm">
                                {result.tournaments?.name || 'Tournament'}
                              </h4>
                              <p className="text-xs text-syndikate-concrete">
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
                            <div className="text-syndikate-concrete">
                              {result.elo_before} → {result.elo_after}
                            </div>
                            <div className={`font-bold ${
                              result.elo_change > 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {result.elo_change > 0 ? '+' : ''}{result.elo_change}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'achievements' && (
                  <div className="space-y-4">
                    <div className="bg-background/50 brutal-border p-4 text-center">
                      <div className="text-3xl font-display text-syndikate-orange mb-1">
                        {unlockedAchievements}/{achievements.length}
                      </div>
                      <div className="text-sm text-syndikate-concrete uppercase">Achievements Unlocked</div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {achievements.map((achievement, index) => (
                        <div
                          key={achievement.id}
                          className={`brutal-border p-4 transition-all animate-fade-in ${
                            achievement.unlocked
                              ? 'bg-syndikate-orange/20 shadow-neon-orange'
                              : 'bg-background/30 opacity-60'
                          }`}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`text-3xl ${achievement.unlocked ? '' : 'grayscale opacity-50'}`}>
                              {achievement.icon}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-display text-sm uppercase mb-1">
                                {achievement.title}
                              </h4>
                              <p className="text-xs text-syndikate-concrete mb-2">
                                {achievement.description}
                              </p>
                              {!achievement.unlocked && achievement.progress !== undefined && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs text-syndikate-concrete">
                                    <span>Progress</span>
                                    <span>{achievement.progress}/{achievement.maxProgress}</span>
                                  </div>
                                  <div className="h-1 bg-background brutal-border overflow-hidden">
                                    <div
                                      className="h-full bg-syndikate-orange transition-all"
                                      style={{
                                        width: `${(achievement.progress / (achievement.maxProgress || 1)) * 100}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
