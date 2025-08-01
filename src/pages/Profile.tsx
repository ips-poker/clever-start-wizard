import React, { useState, useEffect } from "react";
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
import { Trophy, TrendingUp, Calendar, Users, Star, Medal, Award, Target } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { toast } from "sonner";
import { PlayerStats } from "@/components/PlayerStats";
import { AvatarSelector } from "@/components/AvatarSelector";
import { TournamentRegistration } from "@/components/TournamentRegistration";

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
  const [tournaments, setTournaments] = useState<ProfileTournament[]>([]);
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  useEffect(() => {
    if (user) {
      loadPlayerData();
      loadTournaments();
      loadGameResults();
    }
  }, [user]);

  const loadPlayerData = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('email', user.email)
        .single();

      if (error && error.code === 'PGRST116') {
        // Player doesn't exist, create one
        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert([{ 
            name: userProfile?.full_name || user.email?.split('@')[0] || 'Player',
            email: user.email,
            elo_rating: 1200
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

  const loadTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          tournament_registrations(count)
        `)
        .in('status', ['registration', 'active'])
        .order('start_time', { ascending: true });

      if (error) throw error;

      const tournamentsWithCount = data?.map(tournament => ({
        ...tournament,
        registered_count: tournament.tournament_registrations?.[0]?.count || 0
      })) || [];

      setTournaments(tournamentsWithCount);
    } catch (error) {
      console.error('Error loading tournaments:', error);
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

  const eloData = gameResults.slice(0, 10).reverse().map((result, index) => ({
    game: index + 1,
    elo: result.elo_after,
    change: result.elo_change
  }));

  const statCards: StatCard[] = [
    {
      title: "Рейтинг ELO",
      value: player?.elo_rating || 1200,
      description: "Текущий рейтинг",
      icon: TrendingUp,
      color: "text-blue-500"
    },
    {
      title: "Игр сыграно",
      value: player?.games_played || 0,
      description: "Всего турниров",
      icon: Target,
      color: "text-green-500"
    },
    {
      title: "Побед",
      value: player?.wins || 0,
      description: "Первые места",
      icon: Trophy,
      color: "text-yellow-500"
    },
    {
      title: "Винрейт",
      value: player?.games_played ? `${Math.round((player.wins / player.games_played) * 100)}%` : "0%",
      description: "Процент побед",
      icon: Award,
      color: "text-purple-500"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="container mx-auto px-4 py-8 space-y-8">
          {/* Profile Header */}
          <div className="text-center space-y-4">
            <div className="relative inline-block">
              <Avatar className="w-32 h-32 mx-auto border-4 border-primary/20 shadow-lg">
                <AvatarImage src={player?.avatar_url} alt={player?.name} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/60">
                  {player?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                onClick={() => setShowAvatarSelector(true)}
                className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 p-0"
                size="sm"
              >
                ✏️
              </Button>
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-foreground">{player?.name}</h1>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.description}</p>
                    </div>
                    <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content */}
          <Tabs defaultValue="statistics" className="space-y-6">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-4 bg-muted/30">
              <TabsTrigger value="statistics" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Статистика
              </TabsTrigger>
              <TabsTrigger value="tournaments" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Турниры
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Рейтинг
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                История
              </TabsTrigger>
            </TabsList>

            <TabsContent value="statistics" className="space-y-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    График рейтинга ELO
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {eloData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={eloData}>
                        <defs>
                          <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="game" 
                          stroke="hsl(var(--muted-foreground))"
                          label={{ value: 'Игра', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          label={{ value: 'ELO', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="elo" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#eloGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Нет данных для отображения</p>
                      <p className="text-sm">Сыграйте несколько турниров для просмотра статистики</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tournaments" className="space-y-6">
              <TournamentRegistration 
                tournaments={tournaments} 
                playerId={player?.id} 
                onRegistrationUpdate={loadTournaments}
              />
            </TabsContent>

            <TabsContent value="leaderboard" className="space-y-6">
              <PlayerStats />
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    История игр
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {gameResults.length > 0 ? (
                    <div className="space-y-4">
                      {gameResults.map((result) => (
                        <div key={result.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                              result.position === 1 ? 'bg-yellow-500' :
                              result.position === 2 ? 'bg-gray-400' :
                              result.position === 3 ? 'bg-amber-600' : 'bg-muted'
                            }`}>
                              #{result.position}
                            </div>
                            <div>
                              <p className="font-medium">{result.tournament.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(result.created_at).toLocaleDateString('ru-RU')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={result.elo_change >= 0 ? "default" : "destructive"}>
                              {result.elo_change >= 0 ? '+' : ''}{result.elo_change}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              ELO: {result.elo_after}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>История игр пуста</p>
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
      </div>
    </AuthGuard>
  );
}