import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, TrendingUp, Calendar, Users, Star, Medal, Award, Target, Edit3, Check, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { toast } from "sonner";
import { PlayerStats } from "@/components/PlayerStats";
import { AvatarSelector } from "@/components/AvatarSelector";
import { ProfileTournaments } from "@/components/ProfileTournaments";

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  email?: string;
  avatar_url?: string;
}

interface ProfileTournament {
  id: string;
  name: string;
  description?: string;
  start_time: string;
  buy_in: number;
  max_players: number;
  status: string;
  starting_chips: number;
  registered_count?: number;
}

interface GameResult {
  id: string;
  position: number;
  elo_change: number;
  elo_after: number;
  elo_before: number;
  created_at: string;
  tournament: { name: string };
}

interface StatCard {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

export default function Profile() {
  const { user, userProfile } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");

  useEffect(() => {
    if (user) {
      loadPlayerData();
    }
  }, [user]);

  useEffect(() => {
    if (player?.id) {
      loadGameResults();
    }
  }, [player?.id]);

  const loadPlayerData = async () => {
    if (!user) return;

    try {
      // Сначала ищем игрока по user_id, затем по email
      let data, error;
      
      // Попытка найти по user_id
      const userIdResult = await supabase
        .from('players')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (userIdResult.error && userIdResult.error.code === 'PGRST116') {
        // Если не найден по user_id, ищем по email
        const emailResult = await supabase
          .from('players')
          .select('*')
          .eq('email', user.email)
          .single();
        
        data = emailResult.data;
        error = emailResult.error;
      } else {
        data = userIdResult.data;
        error = userIdResult.error;
      }

      if (error && error.code === 'PGRST116') {
        // Player doesn't exist, create one
        const playerName = userProfile?.full_name || user.email?.split('@')[0] || 'Player';
        
        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert([{ 
            name: playerName,
            email: user.email,
            elo_rating: 100,
            user_id: user.id,
            avatar_url: userProfile?.avatar_url
          }])
          .select()
          .single();

        if (createError) {
          console.error('Error creating player:', createError);
          return;
        }
        setPlayer(newPlayer);
      } else if (error) {
        console.error('Error loading player:', error);
      } else {
        setPlayer(data);
      }
    } catch (error) {
      console.error('Error in loadPlayerData:', error);
    } finally {
      setLoading(false);
    }
  };


  const loadGameResults = async () => {
    if (!player?.id) return;

    try {
      const { data, error } = await supabase
        .from('game_results')
        .select(`
          *,
          tournament:tournaments(name)
        `)
        .eq('player_id', player.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setGameResults(data || []);
    } catch (error) {
      console.error('Error loading game results:', error);
    }
  };

  const handleAvatarUpdate = async (avatarUrl: string) => {
    if (!player) return;

    try {
      const { error } = await supabase
        .from('players')
        .update({ avatar_url: avatarUrl })
        .eq('id', player.id);

      if (error) throw error;

      setPlayer({ ...player, avatar_url: avatarUrl });
      setShowAvatarSelector(false);
      toast("Аватар обновлен успешно!");
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast("Ошибка при обновлении аватара");
    }
  };

  const handleNameUpdate = async () => {
    if (!player || !newPlayerName.trim()) return;

    try {
      const { error } = await supabase
        .from('players')
        .update({ name: newPlayerName.trim() })
        .eq('id', player.id);

      if (error) throw error;

      setPlayer({ ...player, name: newPlayerName.trim() });
      setEditingName(false);
      setNewPlayerName("");
      toast("Имя игрока обновлено успешно!");
    } catch (error) {
      console.error('Error updating player name:', error);
      toast("Ошибка при обновлении имени");
    }
  };

  const startNameEdit = () => {
    setNewPlayerName(player?.name || "");
    setEditingName(true);
  };

  const cancelNameEdit = () => {
    setEditingName(false);
    setNewPlayerName("");
  };

  const eloData = gameResults.slice(0, 10).reverse().map((result, index) => ({
    game: index + 1,
    elo: result.elo_after,
    change: result.elo_change
  }));

  const getRankClass = (rating: number) => {
    if (rating >= 1800) return "from-amber-600 to-amber-800";
    if (rating >= 1600) return "from-purple-600 to-purple-800";
    if (rating >= 1400) return "from-blue-600 to-blue-800";
    if (rating >= 1200) return "from-emerald-600 to-emerald-800";
    return "from-slate-600 to-slate-800";
  };

  const getRankTitle = (rating: number) => {
    if (rating >= 1800) return "Мастер";
    if (rating >= 1600) return "Эксперт";
    if (rating >= 1400) return "Продвинутый";
    if (rating >= 1200) return "Любитель";
    return "Новичок";
  };

  const statCards: StatCard[] = [
    {
      title: "Рейтинг RPS",
      value: player?.elo_rating || 100,
      description: getRankTitle(player?.elo_rating || 100),
      icon: TrendingUp,
      color: "text-primary"
    },
    {
      title: "Игр сыграно",
      value: player?.games_played || 0,
      description: "Всего турниров",
      icon: Target,
      color: "text-chart-2"
    },
    {
      title: "Побед",
      value: player?.wins || 0,
      description: "Первые места",
      icon: Trophy,
      color: "text-chart-3"
    },
    {
      title: "Винрейт",
      value: player?.games_played ? `${Math.round((player.wins / player.games_played) * 100)}%` : "0%",
      description: "Процент побед",
      icon: Award,
      color: "text-chart-4"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Decorative Background Elements - matching homepage */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-10 z-0">
          <div className="absolute top-20 left-10 w-16 h-16 rounded-full animate-pulse-slow">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 opacity-30"></div>
            <div className="absolute inset-1 rounded-full bg-slate-900/80 border border-amber-400/20"></div>
          </div>
          <div className="absolute top-1/4 right-20 w-12 h-12 rounded-full animate-bounce-subtle">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 opacity-25"></div>
            <div className="absolute inset-1 rounded-full bg-slate-900/80 border border-purple-400/20"></div>
          </div>
          <div className="absolute bottom-1/3 left-1/4 w-20 h-20 rounded-full animate-pulse-slow">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 to-red-600 opacity-35"></div>
            <div className="absolute inset-1.5 rounded-full bg-slate-900/80 border-2 border-red-400/20"></div>
          </div>
        </div>

        {/* Poker Suits Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-10 z-0">
          <div className="absolute top-20 left-10 animate-pulse-slow">
            <div className="text-amber-400/40 text-6xl filter drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">♠</div>
          </div>
          <div className="absolute bottom-1/3 left-20 animate-pulse-slow">
            <div className="text-red-400/45 text-7xl filter drop-shadow-[0_0_20px_rgba(248,113,113,0.4)]">♥</div>
          </div>
          <div className="absolute top-1/2 right-1/4 animate-bounce-subtle">
            <div className="text-purple-400/30 text-5xl filter drop-shadow-[0_0_12px_rgba(192,132,252,0.25)]">♦</div>
          </div>
        </div>

        {/* Ambient light spots */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        </div>

        <Header />
        
        <main className="container mx-auto px-4 pt-24 md:pt-20 pb-8 space-y-8 relative z-10">
          {/* Profile Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 p-8 border border-primary/30 shadow-2xl backdrop-blur-sm">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJoc2wodmFyKC0tcHJpbWFyeSkpIiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC4xIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
            
            <div className="relative z-10 text-center space-y-6">
              <div className="relative inline-block">
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${getRankClass(player?.elo_rating || 100)} opacity-30 blur-xl scale-110`}></div>
                <Avatar className="relative w-32 h-32 mx-auto border-4 border-slate-800/80 shadow-2xl ring-4 ring-primary/30">
                  <AvatarImage src={player?.avatar_url} alt={player?.name} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-primary border-2 border-slate-700/50">
                    {player?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  onClick={() => setShowAvatarSelector(true)}
                  className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 p-0 shadow-lg hover:scale-110 transition-transform bg-primary hover:bg-primary/90"
                  size="sm"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        className="text-center text-xl font-bold max-w-xs bg-slate-900/80 border-slate-700/50 text-foreground placeholder:text-muted-foreground"
                        placeholder="Введите новое имя"
                        onKeyPress={(e) => e.key === 'Enter' && handleNameUpdate()}
                      />
                      <Button
                        onClick={handleNameUpdate}
                        size="sm"
                        className="h-8 w-8 p-0 bg-primary hover:bg-primary/90"
                        disabled={!newPlayerName.trim()}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={cancelNameEdit}
                        variant="secondary"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl sm:text-3xl font-bold text-foreground text-center">{player?.name}</h1>
                      <Button
                        onClick={startNameEdit}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-primary/20 text-primary"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                   <Badge className={`bg-gradient-to-r ${getRankClass(player?.elo_rating || 100)} text-white border-0 px-3 py-1 font-semibold shadow-lg`}>
                    {getRankTitle(player?.elo_rating || 100)}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-center">{userProfile?.full_name || player?.name}</p>
                
                {/* Quick Stats */}
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-700/50">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{player?.elo_rating || 100}</p>
                    <p className="text-xs text-muted-foreground">RPS Рейтинг</p>
                  </div>
                  <div className="w-px h-8 bg-slate-700/50"></div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-chart-3">{player?.wins || 0}</p>
                    <p className="text-xs text-muted-foreground">Побед</p>
                  </div>
                  <div className="w-px h-8 bg-slate-700/50"></div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-chart-2">{player?.games_played || 0}</p>
                    <p className="text-xs text-muted-foreground">Игр</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {statCards.map((stat, index) => (
              <Card key={index} className="group hover:shadow-2xl transition-all duration-300 border-slate-800/80 hover:border-primary/50 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 hover:scale-105 backdrop-blur-sm shadow-lg">
                <CardContent className="p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 opacity-10">
                    <stat.icon className="w-full h-full text-primary" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br from-slate-800/60 to-slate-900/80 border border-slate-700/40`}>
                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                          {stat.value}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                      <p className="text-xs text-muted-foreground">{stat.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content */}
          <Tabs defaultValue="statistics" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-slate-900/70 backdrop-blur-sm border border-slate-800/80 h-auto p-1 shadow-lg">
              <TabsTrigger value="statistics" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Статистика</span>
                <span className="sm:hidden">Статс</span>
              </TabsTrigger>
              <TabsTrigger value="tournaments" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Турниры</span>
                <span className="sm:hidden">Турн</span>
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Рейтинг</span>
                <span className="sm:hidden">Топ</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                <Star className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">История</span>
                <span className="sm:hidden">Игры</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="statistics" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* ELO Chart */}
                <Card className="border-slate-800/80 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-sm shadow-lg lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      График рейтинга RPS
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {eloData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={eloData}>
                          <defs>
                            <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                          <XAxis 
                            dataKey="game" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'hsl(var(--popover))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '12px',
                              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)',
                              fontSize: '14px'
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                            formatter={(value, name) => [
                              <span style={{ color: 'hsl(var(--primary))' }}>{value}</span>,
                              'RPS Рейтинг'
                            ]}
                            labelFormatter={(label) => `Игра ${label}`}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="elo" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#eloGradient)"
                            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2, fill: 'hsl(var(--background))' }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-16 text-muted-foreground">
                        <div className="bg-slate-800/60 border border-slate-700/40 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          <Target className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-2">Нет данных для отображения</h3>
                        <p className="text-sm">Сыграйте несколько турниров для просмотра статистики</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Additional Stats */}
                <Card className="border-slate-800/80 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-sm shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Medal className="h-5 w-5 text-chart-3" />
                      Лучшие результаты
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {gameResults.slice(0, 3).map((result, index) => (
                      <div key={result.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 backdrop-blur-sm border border-slate-800/40">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md ${
                          result.position === 1 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                          result.position === 2 ? 'bg-gradient-to-br from-slate-500 to-slate-700' :
                          result.position === 3 ? 'bg-gradient-to-br from-amber-700 to-amber-900' : 'bg-gradient-to-br from-primary/50 to-primary/30'
                        }`}>
                          #{result.position}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{result.tournament.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(result.created_at).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                        <Badge variant={result.elo_change >= 0 ? "default" : "destructive"} className="text-xs">
                          {result.elo_change >= 0 ? '+' : ''}{result.elo_change}
                        </Badge>
                      </div>
                    ))}
                    {gameResults.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Нет результатов</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-800/80 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-sm shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-chart-4" />
                      Прогресс
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>До следующего ранга</span>
                        <span className="font-medium">{Math.max(0, Math.ceil(((Math.floor(((player?.elo_rating || 100) + 199) / 200) * 200) - (player?.elo_rating || 100))))}</span>
                      </div>
                      <div className="w-full bg-slate-800/50 rounded-full h-2 border border-slate-700/30">
                        <div 
                          className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500 shadow-lg shadow-primary/20" 
                          style={{ 
                            width: `${Math.min(100, (((player?.elo_rating || 100) % 200) / 200) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-center p-3 rounded-lg bg-chart-2/10">
                        <p className="text-xl font-bold text-chart-2">{((player?.wins || 0) / Math.max(1, player?.games_played || 1) * 100).toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">Winrate</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-chart-3/10">
                        <p className="text-xl font-bold text-chart-3">{Math.max(...eloData.map(d => d.elo), player?.elo_rating || 100)}</p>
                        <p className="text-xs text-muted-foreground">Пик RPS</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tournaments" className="space-y-6">
              <ProfileTournaments playerId={player?.id} />
            </TabsContent>

            <TabsContent value="leaderboard" className="space-y-6">
              <PlayerStats />
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
                <Card className="border-slate-800/80 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    История игр
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {gameResults.length > 0 ? (
                    <div className="space-y-3">
                      {gameResults.map((result, index) => (
                        <div key={result.id} className="group relative overflow-hidden rounded-xl border border-slate-800/60 bg-gradient-to-r from-slate-900/90 to-slate-800/80 p-4 hover:shadow-xl hover:border-primary/40 transition-all duration-300 backdrop-blur-sm">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          
                          <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                               <div className="relative">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-lg ${
                                  result.position === 1 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                                  result.position === 2 ? 'bg-gradient-to-br from-slate-500 to-slate-700' :
                                  result.position === 3 ? 'bg-gradient-to-br from-amber-700 to-amber-900' : 'bg-gradient-to-br from-slate-700 to-slate-900'
                                }`}>
                                  <span className="text-sm">#{result.position}</span>
                                </div>
                                {result.position <= 3 && (
                                  <div className="absolute -top-1 -right-1">
                                    {result.position === 1 ? '🥇' : result.position === 2 ? '🥈' : '🥉'}
                                  </div>
                                )}
                              </div>
                              
                              <div className="space-y-1">
                                <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {result.tournament.name}
                                </p>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(result.created_at).toLocaleDateString('ru-RU')}
                                  </span>
                                  <span className="text-xs">•</span>
                                  <span>RPS: {result.elo_before} → {result.elo_after}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right space-y-2">
                              <Badge 
                                variant={result.elo_change >= 0 ? "default" : "destructive"}
                                className={`font-bold ${
                                  result.elo_change >= 0 
                                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-0' 
                                    : 'bg-gradient-to-r from-red-500 to-red-600 text-white border-0'
                                } shadow-lg`}
                              >
                                {result.elo_change >= 0 ? '+' : ''}{result.elo_change}
                              </Badge>
                              <div className="text-xs text-muted-foreground">
                                Изменение рейтинга
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-muted-foreground">
                      <div className="bg-slate-800/60 border border-slate-700/40 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-2">История игр пуста</h3>
                      <p className="text-sm">Зарегистрируйтесь на турнир, чтобы начать играть</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        {/* Avatar Selector Modal */}
        {showAvatarSelector && (
          <AvatarSelector
            onSelect={handleAvatarUpdate}
            onClose={() => setShowAvatarSelector(false)}
          />
        )}

        <Footer />
        
        {/* Custom animations matching homepage */}
        <style>{`
          .animate-bounce-subtle {
            animation: bounce-subtle 4s ease-in-out infinite;
          }
          .animate-pulse-slow {
            animation: pulse-slow 8s ease-in-out infinite;
          }
          @keyframes bounce-subtle {
            0%, 100% { transform: translateY(0px) rotate(var(--tw-rotate)); }
            50% { transform: translateY(-15px) rotate(var(--tw-rotate)); }
          }
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.05); }
          }
        `}</style>
      </div>
    </AuthGuard>
  );
}