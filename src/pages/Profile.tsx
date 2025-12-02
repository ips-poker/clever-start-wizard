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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { PlayerStats } from "@/components/PlayerStats";
import { AvatarSelector } from "@/components/AvatarSelector";
import { ProfileTournaments } from "@/components/ProfileTournaments";
import { FloatingParticles } from "@/components/ui/floating-particles";

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  email?: string;
  avatar_url?: string;
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
      
      let data, error;
      
      const userIdResult = await supabase
        .from('players')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (userIdResult.error && userIdResult.error.code === 'PGRST116') {
        console.log('Player not found by user_id, trying email:', user.email);
        
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
        
        const playerName = userProfile?.full_name || user.email?.split('@')[0] || 'Player';
        
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
        
        setPlayer(result.player);
      } else if (error) {
        console.error('Error loading player:', error);
      } else {
        console.log('Player loaded successfully:', data);
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
    return "from-muted-foreground to-muted";
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Industrial Background */}
        <div className="fixed inset-0 pointer-events-none industrial-texture opacity-50 z-0" />
        
        {/* Metal grid */}
        <div
          className="fixed inset-0 pointer-events-none opacity-20 z-0"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(255,255,255,0.04) 48px, rgba(255,255,255,0.04) 49px),
              repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(255,255,255,0.04) 48px, rgba(255,255,255,0.04) 49px)
            `,
          }}
        />

        {/* Neon glows */}
        <div className="fixed w-[400px] h-[400px] bg-primary/20 rounded-full blur-[120px] opacity-60 -top-32 -left-24 z-0" />
        <div className="fixed w-[400px] h-[400px] bg-accent/15 rounded-full blur-[120px] opacity-60 -bottom-32 -right-24 z-0" />

        {/* Side rails */}
        <div className="fixed inset-y-0 left-0 w-[3px] bg-gradient-to-b from-primary/70 via-accent/40 to-transparent shadow-neon-orange pointer-events-none z-10" />
        <div className="fixed inset-y-0 right-0 w-[3px] bg-gradient-to-b from-primary/70 via-accent/40 to-transparent shadow-neon-orange pointer-events-none z-10" />
        <div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-primary/80 to-transparent pointer-events-none z-10" />

        <FloatingParticles />
        <Header />
        
        <main className="container mx-auto px-4 pt-24 md:pt-20 pb-8 space-y-8 relative z-20">
          {/* Profile Header */}
          <div className="relative overflow-hidden brutal-border bg-card p-6 md:p-8">
            {/* Industrial texture overlay */}
            <div className="absolute inset-0 industrial-texture opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            
            <div className="relative z-10 text-center space-y-6">
              {/* Avatar */}
              <div className="relative inline-block">
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${getRankClass(player?.elo_rating || 100)} opacity-40 blur-xl scale-125`} />
                <div className="relative">
                  <Avatar className="w-28 h-28 md:w-36 md:h-36 mx-auto border-4 border-primary/50 shadow-neon-orange">
                    <AvatarImage src={player?.avatar_url} alt={player?.name} />
                    <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                      {player?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    onClick={() => setShowAvatarSelector(true)}
                    className="absolute -bottom-2 -right-2 rounded-none w-10 h-10 p-0 shadow-brutal bg-primary hover:bg-primary/90 border-2 border-background"
                    size="sm"
                  >
                    <Edit3 className="h-4 w-4 text-primary-foreground" />
                  </Button>
                </div>
              </div>
              
              {/* Name & Rank */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        className="text-center text-xl font-bold max-w-xs bg-secondary border-border text-foreground"
                        placeholder="Введите новое имя"
                        onKeyPress={(e) => e.key === 'Enter' && handleNameUpdate()}
                      />
                      <Button
                        onClick={handleNameUpdate}
                        size="sm"
                        className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 rounded-none"
                        disabled={!newPlayerName.trim()}
                      >
                        <Check className="h-4 w-4 text-white" />
                      </Button>
                      <Button
                        onClick={cancelNameEdit}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-border hover:bg-secondary rounded-none"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-wide neon-orange">
                        {player?.name}
                      </h1>
                      <Button
                        onClick={startNameEdit}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <Badge className={`bg-gradient-to-r ${getRankClass(player?.elo_rating || 100)} text-white border-0 px-4 py-1 font-bold text-sm shadow-brutal rounded-none`}>
                    {getRankTitle(player?.elo_rating || 100)}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{userProfile?.full_name || player?.name}</p>
                
                {/* Quick Stats */}
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <p className="text-2xl font-bold neon-orange">{player?.elo_rating || 100}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">RPS Рейтинг</p>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">{player?.wins || 0}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Побед</p>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-400">{player?.games_played || 0}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Игр</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
              <Card key={index} className="group hover:shadow-neon-orange transition-all duration-300 brutal-border bg-card hover:border-primary/50">
                <CardContent className="p-4 md:p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 opacity-10">
                    <stat.icon className="w-full h-full text-primary" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 md:p-3 bg-secondary border border-border">
                        <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
                      </div>
                      <p className="text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {stat.value}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground/80">{stat.title}</p>
                      <p className="text-xs text-muted-foreground">{stat.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="statistics" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-card border border-border h-auto p-1">
              <TabsTrigger value="statistics" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Статистика</span>
                <span className="sm:hidden">Статс</span>
              </TabsTrigger>
              <TabsTrigger value="tournaments" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Турниры</span>
                <span className="sm:hidden">Турн</span>
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Рейтинг</span>
                <span className="sm:hidden">Топ</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none">
                <Star className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">История</span>
                <span className="sm:hidden">Игры</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="statistics" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* ELO Chart */}
                <Card className="brutal-border bg-card lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
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
                              backgroundColor: 'hsl(var(--card))',
                              border: '2px solid hsl(var(--border))',
                              borderRadius: '0',
                              fontSize: '14px'
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                            formatter={(value) => [value, 'RPS Рейтинг']}
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
                        <div className="bg-secondary border border-border w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          <Target className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-2">Нет данных для отображения</h3>
                        <p className="text-sm">Сыграйте несколько турниров для просмотра статистики</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Best Results */}
                <Card className="brutal-border bg-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Medal className="h-5 w-5 text-green-400" />
                      Лучшие результаты
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {gameResults.slice(0, 3).map((result) => (
                      <div key={result.id} className="flex items-center gap-3 p-3 bg-secondary border border-border">
                        <div className={`w-8 h-8 flex items-center justify-center text-sm font-bold text-white ${
                          result.position === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                          result.position === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                          result.position === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-muted'
                        }`}>
                          #{result.position}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate text-foreground">{result.tournament.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(result.created_at).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                        <Badge 
                          variant={result.elo_change >= 0 ? "default" : "destructive"} 
                          className="rounded-none font-bold"
                        >
                          {result.elo_change >= 0 ? '+' : ''}{result.elo_change}
                        </Badge>
                      </div>
                    ))}
                    {gameResults.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Trophy className="h-8 w-8 mx-auto mb-2 text-primary opacity-50" />
                        <p className="text-sm">Нет результатов</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Progress */}
                <Card className="brutal-border bg-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Award className="h-5 w-5 text-purple-400" />
                      Прогресс
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>До следующего ранга</span>
                        <span className="font-medium text-foreground">
                          {Math.max(0, Math.ceil(((Math.floor(((player?.elo_rating || 100) + 199) / 200) * 200) - (player?.elo_rating || 100))))}
                        </span>
                      </div>
                      <div className="w-full bg-secondary h-3 border border-border">
                        <div 
                          className="bg-gradient-to-r from-primary to-accent h-full transition-all duration-500" 
                          style={{ 
                            width: `${Math.min(100, (((player?.elo_rating || 100) % 200) / 200) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-center p-3 bg-blue-500/10 border border-blue-500/30">
                        <p className="text-xl font-bold text-blue-400">
                          {((player?.wins || 0) / Math.max(1, player?.games_played || 1) * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Winrate</p>
                      </div>
                      <div className="text-center p-3 bg-green-500/10 border border-green-500/30">
                        <p className="text-xl font-bold text-green-400">
                          {Math.max(...eloData.map(d => d.elo), player?.elo_rating || 100)}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Пик RPS</p>
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
              <Card className="brutal-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Star className="h-5 w-5 text-primary" />
                    История игр
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {gameResults.length > 0 ? (
                    <div className="space-y-3">
                      {gameResults.map((result) => (
                        <div key={result.id} className="group relative overflow-hidden border border-border bg-secondary p-4 hover:border-primary/50 transition-all duration-300">
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          
                          <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className={`w-12 h-12 flex items-center justify-center font-bold text-white ${
                                  result.position === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                                  result.position === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                                  result.position === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-muted'
                                }`}>
                                  <span className="text-sm">#{result.position}</span>
                                </div>
                                {result.position <= 3 && (
                                  <div className="absolute -top-1 -right-1 text-sm">
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
                                className={`font-bold rounded-none ${
                                  result.elo_change >= 0 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-destructive text-destructive-foreground'
                                }`}
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
                      <div className="bg-secondary border border-border w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-2">История пуста</h3>
                      <p className="text-sm">Сыграйте в турнирах, чтобы увидеть историю</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        <Footer />

        {/* Avatar Selector Dialog */}
        <Dialog open={showAvatarSelector} onOpenChange={setShowAvatarSelector}>
          <DialogContent className="max-w-2xl bg-card border-border rounded-none">
            <DialogHeader>
              <DialogTitle className="text-foreground">Выберите аватар</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Выберите готовый аватар или загрузите свое изображение
              </DialogDescription>
            </DialogHeader>
            <AvatarSelector
              onSelect={handleAvatarUpdate}
              onClose={() => setShowAvatarSelector(false)}
              playerId={player?.id}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
