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
      console.log('Loading player data for user:', user.id);
      
      // Сначала ищем игрока по user_id, затем по email
      let data, error;
      
      // Попытка найти по user_id
      const userIdResult = await supabase
        .from('players')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (userIdResult.error && userIdResult.error.code === 'PGRST116') {
        console.log('Player not found by user_id, trying email:', user.email);
        
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
        console.log('Player does not exist, creating new one');
        
        // Player doesn't exist, create one using safe RPC
        const playerName = userProfile?.full_name || user.email?.split('@')[0] || 'Player';
        
        console.log('Creating player with data:', {
          name: playerName,
          email: user.email,
          user_id: user.id,
          avatar_url: userProfile?.avatar_url || 'NO AVATAR',
          hasAvatar: !!userProfile?.avatar_url
        });
        
        const { data: createResult, error: createError } = await supabase.rpc('create_player_safe', {
          p_name: playerName,
          p_email: user.email || null,
          p_telegram: null,
          p_avatar_url: userProfile?.avatar_url || null,
          p_user_id: user.id
        });

        if (createError) {
          console.error('Error creating player:', createError);
          return;
        }

        const result = createResult as { success: boolean; error?: string; player?: any; player_id?: string };
        
        if (!result?.success) {
          console.error('Player creation failed:', result?.error);
          // Если игрок уже существует, пытаемся загрузить его
          if (result?.player_id) {
            const { data: existingPlayer } = await supabase
              .from('players')
              .select('*')
              .eq('id', result.player_id)
              .single();
            if (existingPlayer) {
              setPlayer(existingPlayer);
              return;
            }
          }
          return;
        }
        
        console.log('Player created successfully:', {
          id: result.player?.id,
          name: result.player?.name,
          avatar_url: result.player?.avatar_url || 'NO AVATAR'
        });
        
        setPlayer(result.player);
      } else if (error) {
        console.error('Error loading player:', error);
      } else {
        console.log('Player loaded successfully:', {
          id: data.id,
          name: data.name,
          avatar_url: data.avatar_url || 'NO AVATAR',
          hasAvatar: !!data.avatar_url
        });
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
    if (!player) {
      toast.error("Ошибка: профиль игрока не найден");
      return;
    }

    try {
      const { data, error } = await supabase.rpc('update_player_safe', {
        p_player_id: player.id,
        p_avatar_url: avatarUrl
      });

      if (error) {
        console.error('Error updating avatar:', error);
        toast.error(`Ошибка при обновлении аватара: ${error.message}`);
        throw error;
      }

      const result = data as { success: boolean; error?: string };
      if (!result?.success) {
        toast.error(`Ошибка: ${result?.error || 'Не удалось обновить аватар'}`);
        return;
      }

      setPlayer({ ...player, avatar_url: avatarUrl });
      setShowAvatarSelector(false);
      toast.success("Аватар обновлен успешно!");
    } catch (error: any) {
      console.error('Error updating avatar:', error);
      toast.error(`Ошибка при обновлении аватара: ${error.message || 'Неизвестная ошибка'}`);
    }
  };

  const handleNameUpdate = async () => {
    if (!player || !newPlayerName.trim()) return;

    try {
      const { data, error } = await supabase.rpc('update_player_safe', {
        p_player_id: player.id,
        p_name: newPlayerName.trim()
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result?.success) {
        toast(`Ошибка: ${result?.error || 'Не удалось обновить имя'}`);
        return;
      }

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
    if (rating >= 1800) return "from-yellow-400 to-yellow-600";
    if (rating >= 1600) return "from-purple-400 to-purple-600";
    if (rating >= 1400) return "from-blue-400 to-blue-600";
    if (rating >= 1200) return "from-green-400 to-green-600";
    return "from-gray-400 to-gray-600";
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
      color: "text-amber-400"
    },
    {
      title: "Игр сыграно",
      value: player?.games_played || 0,
      description: "Всего турниров",
      icon: Target,
      color: "text-blue-400"
    },
    {
      title: "Побед",
      value: player?.wins || 0,
      description: "Первые места",
      icon: Trophy,
      color: "text-green-400"
    },
    {
      title: "Винрейт",
      value: player?.games_played ? `${Math.round((player.wins / player.games_played) * 100)}%` : "0%",
      description: "Процент побед",
      icon: Award,
      color: "text-purple-400"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4"></div>
          <p className="text-white/70">Загрузка профиля...</p>
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
                <Avatar className="relative w-32 h-32 mx-auto border-4 border-white/20 shadow-2xl">
                  <AvatarImage src={player?.avatar_url} alt={player?.name} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                    {player?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  onClick={() => setShowAvatarSelector(true)}
                  className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 p-0 shadow-lg hover:scale-110 transition-transform bg-amber-500 hover:bg-amber-600"
                  size="sm"
                >
                  <Edit3 className="h-4 w-4 text-white" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                   {editingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        className="text-center text-xl font-bold max-w-xs bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        placeholder="Введите новое имя"
                        onKeyPress={(e) => e.key === 'Enter' && handleNameUpdate()}
                      />
                      <Button
                        onClick={handleNameUpdate}
                        size="sm"
                        className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600"
                        disabled={!newPlayerName.trim()}
                      >
                        <Check className="h-4 w-4 text-white" />
                      </Button>
                      <Button
                        onClick={cancelNameEdit}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-white/20 hover:bg-white/10"
                      >
                        <X className="h-4 w-4 text-white" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl sm:text-3xl font-light text-white tracking-wide text-center">{player?.name}</h1>
                      <Button
                        onClick={startNameEdit}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-white/10 text-white/70 hover:text-white"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                   <Badge className={`bg-gradient-to-r ${getRankClass(player?.elo_rating || 100)} text-white border-0 px-3 py-1 font-medium text-sm shadow-lg`}>
                    {getRankTitle(player?.elo_rating || 100)}
                  </Badge>
                </div>
                <p className="text-white/60 text-center">{userProfile?.full_name || player?.name}</p>
                
                {/* Quick Stats */}
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/10">
                  <div className="text-center">
                    <p className="text-2xl font-light text-amber-400">{player?.elo_rating || 100}</p>
                    <p className="text-xs text-white/60">RPS Рейтинг</p>
                  </div>
                  <div className="w-px h-8 bg-white/20"></div>
                  <div className="text-center">
                    <p className="text-2xl font-light text-green-400">{player?.wins || 0}</p>
                    <p className="text-xs text-white/60">Побед</p>
                  </div>
                  <div className="w-px h-8 bg-white/20"></div>
                  <div className="text-center">
                    <p className="text-2xl font-light text-blue-400">{player?.games_played || 0}</p>
                    <p className="text-xs text-white/60">Игр</p>
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
                        <p className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors">
                          {stat.value}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/70 mb-1">{stat.title}</p>
                      <p className="text-xs text-white/50">{stat.description}</p>
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
                    <CardTitle className="flex items-center gap-2 text-white">
                      <TrendingUp className="h-5 w-5 text-amber-400" />
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
                      <div className="text-center py-16 text-white/70">
                        <div className="bg-slate-800/60 border border-slate-700/40 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          <Target className="h-8 w-8 text-amber-400" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">Нет данных для отображения</h3>
                        <p className="text-sm">Сыграйте несколько турниров для просмотра статистики</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Additional Stats */}
                <Card className="border-slate-800/80 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-sm shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Medal className="h-5 w-5 text-green-400" />
                      Лучшие результаты
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {gameResults.slice(0, 3).map((result, index) => (
                      <div key={result.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 backdrop-blur-sm border border-slate-800/40">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md ${
                          result.position === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                          result.position === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                          result.position === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-gradient-to-br from-slate-600 to-slate-800'
                        }`}>
                          #{result.position}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate text-white">{result.tournament.name}</p>
                          <p className="text-xs text-white/60">
                            {new Date(result.created_at).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                        <Badge variant={result.elo_change >= 0 ? "default" : "destructive"} className="text-xs">
                          {result.elo_change >= 0 ? '+' : ''}{result.elo_change}
                        </Badge>
                      </div>
                    ))}
                    {gameResults.length === 0 && (
                      <div className="text-center py-8 text-white/70">
                        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50 text-amber-400" />
                        <p className="text-sm">Нет результатов</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-800/80 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-sm shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Award className="h-5 w-5 text-purple-400" />
                      Прогресс
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-white/70">
                        <span>До следующего ранга</span>
                        <span className="font-medium text-white">{Math.max(0, Math.ceil(((Math.floor(((player?.elo_rating || 100) + 199) / 200) * 200) - (player?.elo_rating || 100))))}</span>
                      </div>
                      <div className="w-full bg-slate-800/50 rounded-full h-2 border border-slate-700/30">
                        <div 
                          className="bg-gradient-to-r from-amber-400 to-amber-600 h-2 rounded-full transition-all duration-500 shadow-lg shadow-amber-400/20" 
                          style={{ 
                            width: `${Math.min(100, (((player?.elo_rating || 100) % 200) / 200) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-center p-3 rounded-lg bg-blue-400/10">
                        <p className="text-xl font-bold text-blue-400">{((player?.wins || 0) / Math.max(1, player?.games_played || 1) * 100).toFixed(1)}%</p>
                        <p className="text-xs text-white/60">Winrate</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-green-400/10">
                        <p className="text-xl font-bold text-green-400">{Math.max(...eloData.map(d => d.elo), player?.elo_rating || 100)}</p>
                        <p className="text-xs text-white/60">Пик RPS</p>
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
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Star className="h-5 w-5 text-amber-400" />
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
                                  result.position === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                                  result.position === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                                  result.position === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-gradient-to-br from-slate-600 to-slate-800'
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
                                <p className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                                  {result.tournament.name}
                                </p>
                                <div className="flex items-center gap-3 text-sm text-white/60">
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
                              <div className="text-xs text-white/60">
                                Изменение рейтинга
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-white/70">
                      <div className="bg-slate-800/60 border border-slate-700/40 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-8 w-8 text-amber-400" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">История игр пуста</h3>
                      <p className="text-sm">Зарегистрируйтесь на турнир, чтобы начать играть</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        {/* Avatar Selector Modal */}
        {showAvatarSelector && player && (
          <AvatarSelector
            onSelect={handleAvatarUpdate}
            onClose={() => setShowAvatarSelector(false)}
            playerId={player.id}
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