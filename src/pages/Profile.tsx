import React, { useState, useEffect, useMemo } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Trophy, TrendingUp, Calendar, Users, Star, Medal, Award, Target, Edit3, Check, X, 
  Flame, Zap, Crown, Shield, Swords, Heart, Gem, Rocket, Gift, Clock
} from "lucide-react";
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

  const getRankIcon = (rating: number) => {
    if (rating >= 1800) return Crown;
    if (rating >= 1600) return Star;
    if (rating >= 1400) return Zap;
    if (rating >= 1200) return Flame;
    return Target;
  };

  // Calculate achievements based on player stats
  const achievements = useMemo(() => {
    const wins = player?.wins || 0;
    const games = player?.games_played || 0;
    const rating = player?.elo_rating || 100;
    const winRate = games > 0 ? (wins / games) * 100 : 0;
    const top3Count = gameResults.filter(r => r.position <= 3).length;

    return [
      { 
        id: 'first_game', 
        name: 'Первая игра', 
        description: 'Сыграйте первый турнир',
        icon: Gift, 
        unlocked: games >= 1,
        progress: Math.min(games, 1),
        total: 1,
        color: 'text-green-400'
      },
      { 
        id: 'first_win', 
        name: 'Первая победа', 
        description: 'Выиграйте турнир',
        icon: Trophy, 
        unlocked: wins >= 1,
        progress: Math.min(wins, 1),
        total: 1,
        color: 'text-yellow-400'
      },
      { 
        id: 'veteran', 
        name: 'Ветеран', 
        description: 'Сыграйте 10 турниров',
        icon: Shield, 
        unlocked: games >= 10,
        progress: Math.min(games, 10),
        total: 10,
        color: 'text-blue-400'
      },
      { 
        id: 'champion', 
        name: 'Чемпион', 
        description: 'Выиграйте 5 турниров',
        icon: Crown, 
        unlocked: wins >= 5,
        progress: Math.min(wins, 5),
        total: 5,
        color: 'text-purple-400'
      },
      { 
        id: 'consistent', 
        name: 'Стабильность', 
        description: 'Финишируйте в топ-3 5 раз',
        icon: Medal, 
        unlocked: top3Count >= 5,
        progress: Math.min(top3Count, 5),
        total: 5,
        color: 'text-orange-400'
      },
      { 
        id: 'master', 
        name: 'Мастер', 
        description: 'Достигните 1800+ RPS',
        icon: Gem, 
        unlocked: rating >= 1800,
        progress: Math.min(rating, 1800),
        total: 1800,
        color: 'text-cyan-400'
      },
      { 
        id: 'pro_winrate', 
        name: 'Профи', 
        description: 'Винрейт 50%+ (мин. 5 игр)',
        icon: Rocket, 
        unlocked: winRate >= 50 && games >= 5,
        progress: games >= 5 ? Math.min(winRate, 50) : 0,
        total: 50,
        color: 'text-pink-400'
      },
      { 
        id: 'grinder', 
        name: 'Гриндер', 
        description: 'Сыграйте 25 турниров',
        icon: Swords, 
        unlocked: games >= 25,
        progress: Math.min(games, 25),
        total: 25,
        color: 'text-red-400'
      },
    ];
  }, [player, gameResults]);

  const unlockedAchievements = achievements.filter(a => a.unlocked).length;
  const RankIcon = getRankIcon(player?.elo_rating || 100);

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
              {/* Achievements Section */}
              <Card className="brutal-border bg-card overflow-hidden">
                <CardHeader className="border-b border-border bg-secondary/30">
                  <CardTitle className="flex items-center justify-between text-foreground">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500">
                        <Award className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold uppercase tracking-wide">Достижения</h3>
                        <div className="h-0.5 w-16 bg-gradient-to-r from-yellow-400 to-primary mt-1" />
                      </div>
                    </div>
                    <Badge className="bg-primary text-primary-foreground rounded-none font-bold">
                      {unlockedAchievements}/{achievements.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {achievements.map((achievement) => {
                      const Icon = achievement.icon;
                      const progressPercent = (achievement.progress / achievement.total) * 100;
                      
                      return (
                        <div 
                          key={achievement.id}
                          className={`relative p-3 border transition-all duration-300 ${
                            achievement.unlocked 
                              ? 'bg-gradient-to-br from-primary/10 to-transparent border-primary/50' 
                              : 'bg-secondary/30 border-border opacity-60'
                          }`}
                        >
                          <div className="flex flex-col items-center text-center gap-2">
                            <div className={`p-2 ${achievement.unlocked ? 'bg-primary/20' : 'bg-secondary'} border border-border`}>
                              <Icon className={`h-5 w-5 ${achievement.unlocked ? achievement.color : 'text-muted-foreground'}`} />
                            </div>
                            <div>
                              <p className={`text-xs font-bold ${achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {achievement.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{achievement.description}</p>
                            </div>
                            {!achievement.unlocked && (
                              <div className="w-full bg-secondary h-1 mt-1">
                                <div 
                                  className="bg-primary/50 h-full transition-all"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            )}
                            {achievement.unlocked && (
                              <Badge className="bg-green-600 text-white text-[10px] px-1 py-0 rounded-none">
                                <Check className="h-2 w-2 mr-0.5" />
                                ПОЛУЧЕНО
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* ELO Chart */}
                <Card className="brutal-border bg-card lg:col-span-2">
                  <CardHeader className="border-b border-border">
                    <CardTitle className="flex items-center gap-3 text-foreground">
                      <div className="p-2 bg-primary">
                        <TrendingUp className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <span className="text-lg font-bold uppercase">График рейтинга RPS</span>
                        <div className="h-0.5 w-16 bg-gradient-to-r from-primary to-accent mt-1" />
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {eloData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
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
                      <div className="text-center py-12 text-muted-foreground">
                        <div className="bg-secondary border border-border w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          <Target className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">Нет данных</h3>
                        <p className="text-sm">Сыграйте турниры для отображения графика</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Best Results */}
                <Card className="brutal-border bg-card">
                  <CardHeader className="border-b border-border">
                    <CardTitle className="flex items-center gap-3 text-foreground">
                      <div className="p-2 bg-green-600">
                        <Medal className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-base font-bold uppercase">Лучшие результаты</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {gameResults.length > 0 ? (
                      <div className="divide-y divide-border">
                        {gameResults.slice(0, 4).map((result) => (
                          <div key={result.id} className="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors">
                            <div className={`w-10 h-10 flex items-center justify-center text-sm font-bold text-white ${
                              result.position === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                              result.position === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
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
                              className={`rounded-none font-bold ${
                                result.elo_change >= 0 ? 'bg-green-600' : 'bg-accent'
                              } text-white`}
                            >
                              {result.elo_change >= 0 ? '+' : ''}{result.elo_change}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Trophy className="h-8 w-8 mx-auto mb-2 text-primary opacity-50" />
                        <p className="text-sm">Нет результатов</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Progress & Stats */}
                <Card className="brutal-border bg-card">
                  <CardHeader className="border-b border-border">
                    <CardTitle className="flex items-center gap-3 text-foreground">
                      <div className="p-2 bg-purple-600">
                        <Rocket className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-base font-bold uppercase">Прогресс</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {/* Rank Progress */}
                    <div className="p-3 bg-secondary/50 border border-border">
                      <div className="flex items-center gap-3 mb-2">
                        <RankIcon className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-foreground">{getRankTitle(player?.elo_rating || 100)}</span>
                            <span className="text-muted-foreground">
                              {Math.max(0, Math.ceil(((Math.floor(((player?.elo_rating || 100) + 199) / 200) * 200) - (player?.elo_rating || 100))))} до след. ранга
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-background h-2 border border-border">
                        <div 
                          className="bg-gradient-to-r from-primary to-accent h-full transition-all duration-500" 
                          style={{ 
                            width: `${Math.min(100, (((player?.elo_rating || 100) % 200) / 200) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-blue-500/10 border border-blue-500/30">
                        <p className="text-xl font-bold text-blue-400">
                          {((player?.wins || 0) / Math.max(1, player?.games_played || 1) * 100).toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Winrate</p>
                      </div>
                      <div className="text-center p-3 bg-green-500/10 border border-green-500/30">
                        <p className="text-xl font-bold text-green-400">
                          {Math.max(...eloData.map(d => d.elo), player?.elo_rating || 100)}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Пик RPS</p>
                      </div>
                      <div className="text-center p-3 bg-purple-500/10 border border-purple-500/30">
                        <p className="text-xl font-bold text-purple-400">
                          {gameResults.filter(r => r.position <= 3).length}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Топ-3</p>
                      </div>
                      <div className="text-center p-3 bg-primary/10 border border-primary/30">
                        <p className="text-xl font-bold text-primary">
                          {gameResults.reduce((sum, r) => sum + Math.max(0, r.elo_change), 0)}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Набрано RPS</p>
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
              <Card className="brutal-border bg-card overflow-hidden">
                <CardHeader className="border-b border-border bg-secondary/30">
                  <CardTitle className="flex items-center gap-3 text-foreground">
                    <div className="p-2 bg-primary">
                      <Clock className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <span className="text-lg font-bold uppercase tracking-wide">История игр</span>
                      <div className="h-0.5 w-16 bg-gradient-to-r from-primary to-accent mt-1" />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {gameResults.length > 0 ? (
                    <div className="divide-y divide-border">
                      {gameResults.map((result, index) => (
                        <div 
                          key={result.id} 
                          className="group relative overflow-hidden p-4 hover:bg-secondary/50 transition-all duration-300"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          
                          <div className="relative z-10 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className={`w-12 h-12 flex items-center justify-center font-bold text-white shadow-brutal ${
                                  result.position === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                                  result.position === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                                  result.position === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-muted'
                                }`}>
                                  <span className="text-sm">#{result.position}</span>
                                </div>
                                {result.position <= 3 && (
                                  <div className="absolute -top-1.5 -right-1.5 text-base">
                                    {result.position === 1 ? '🥇' : result.position === 2 ? '🥈' : '🥉'}
                                  </div>
                                )}
                              </div>
                              
                              <div className="space-y-1 min-w-0">
                                <p className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                  {result.tournament.name}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(result.created_at).toLocaleDateString('ru-RU')}
                                  </span>
                                  <span className="hidden sm:flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    {result.elo_before} → {result.elo_after}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right shrink-0">
                              <Badge 
                                className={`font-bold rounded-none text-sm px-3 py-1 ${
                                  result.elo_change >= 0 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-accent text-white'
                                }`}
                              >
                                {result.elo_change >= 0 ? '+' : ''}{result.elo_change}
                              </Badge>
                              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                                RPS
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-muted-foreground">
                      <div className="bg-secondary border border-border w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <Clock className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-2">История пуста</h3>
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
