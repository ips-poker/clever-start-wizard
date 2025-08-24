import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, Medal, Award, TrendingUp, Users, Clock, Star, ChevronDown, Crown, Target } from "lucide-react";
import { RecalculateRatings } from "@/components/RecalculateRatings";

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
}

interface Tournament {
  id: string;
  name: string;
  finished_at: string;
  participant_count: number;
  winner_name: string;
}

interface RecentTournament {
  tournament_name: string;
  tournament_id: string;
  finished_at: string;
  participants: number;
  winner: string;
}

const getPokerAvatar = (name: string, isChampion = false) => {
  const avatars = [
    "♠️", "♥️", "♦️", "♣️", "🃏", "🎯", "🎲", "💎", "⭐", "🔥"
  ];
  const index = name.charCodeAt(0) % avatars.length;
  return isChampion ? "👑" : avatars[index];
};

export default function Rating() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [recentTournaments, setRecentTournaments] = useState<RecentTournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    
    // Real-time subscriptions
    const playersChannel = supabase
      .channel('rating-players-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'players' }, 
        () => loadData()
      )
      .subscribe();

    const tournamentsChannel = supabase
      .channel('rating-tournaments-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tournaments' }, 
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(tournamentsChannel);
    };
  }, []);

  const loadData = async () => {
    try {
      // Load all players
      const { data: playersData, error: playersError } = await supabase
        .from('players_public')
        .select('*')
        .order('elo_rating', { ascending: false });

      if (playersError) throw playersError;

      // Load recent tournaments with participants and winners
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select(`
          id,
          name,
          finished_at,
          tournament_registrations!inner(
            player_id,
            position,
            players!inner(name)
          )
        `)
        .eq('status', 'completed')
        .order('finished_at', { ascending: false })
        .limit(5);

      if (tournamentsError) throw tournamentsError;

      // Process tournament data
      const processedTournaments = tournamentsData?.map(tournament => {
        const participants = tournament.tournament_registrations?.length || 0;
        const winner = tournament.tournament_registrations?.find(reg => reg.position === 1);
        return {
          tournament_name: tournament.name,
          tournament_id: tournament.id,
          finished_at: tournament.finished_at,
          participants,
          winner: winner?.players?.name || 'Неизвестно'
        };
      }) || [];

      setAllPlayers(playersData || []);
      setRecentTournaments(processedTournaments);
    } catch (error) {
      console.error('Error loading rating data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWinRate = (wins: number, games: number) => {
    if (games === 0) return 0;
    return Math.round((wins / games) * 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const topPlayers = allPlayers.slice(0, 5);
  const remainingPlayers = allPlayers.slice(5);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-surface">
        <Header />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poker-primary mx-auto mb-4"></div>
              <h1 className="text-4xl font-bold mb-4">Загрузка рейтинга...</h1>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface">
      <Header />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-background via-background/50 to-background relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-20 left-10 w-72 h-72 bg-poker-accent rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-poker-primary rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto px-4 relative">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4 border-poker-accent text-poker-accent animate-fade-in">
                <Trophy className="w-4 h-4 mr-2" />
                Элитный рейтинг
              </Badge>
              <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-poker-primary to-poker-accent bg-clip-text text-transparent animate-fade-in">
                Рейтинг IPS
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in">
                Система RPS отслеживает навыки каждого игрока. Каждая партия влияет на рейтинг в зависимости от результата и уровня соперников.
              </p>
              <div className="flex justify-center mt-8">
                <RecalculateRatings />
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-16 max-w-4xl mx-auto">
              <Card className="p-6 text-center hover:shadow-floating transition-all duration-300 animate-fade-in">
                <div className="w-16 h-16 bg-poker-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-poker-primary" />
                </div>
                <div className="text-3xl font-bold text-poker-primary mb-2">
                  {allPlayers.length}
                </div>
                <div className="text-muted-foreground">Всего игроков</div>
              </Card>
              
              <Card className="p-6 text-center hover:shadow-floating transition-all duration-300 animate-fade-in">
                <div className="w-16 h-16 bg-poker-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-poker-accent" />
                </div>
                <div className="text-3xl font-bold text-poker-accent mb-2">
                  {allPlayers.reduce((sum, player) => sum + player.games_played, 0)}
                </div>
                <div className="text-muted-foreground">Партий сыграно</div>
              </Card>
              
              <Card className="p-6 text-center hover:shadow-floating transition-all duration-300 animate-fade-in">
                <div className="w-16 h-16 bg-poker-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-poker-warning" />
                </div>
                <div className="text-3xl font-bold text-poker-warning mb-2">
                  {topPlayers[0]?.elo_rating || 100}
                </div>
                <div className="text-muted-foreground">Лучший рейтинг</div>
              </Card>
            </div>

            {/* Top Players */}
            <div className="max-w-4xl mx-auto">
              {topPlayers.length === 0 ? (
                <div className="max-w-md mx-auto text-center py-16">
                  <div className="w-20 h-20 bg-background border border-border rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Trophy className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-medium mb-3">Рейтинг формируется</h3>
                  <p className="text-muted-foreground">Станьте первым в элитном списке игроков</p>
                </div>
              ) : (
                <>
                  {/* Champion */}
                  {topPlayers[0] && (
                    <div className="mb-12">
                      <Card className="bg-gradient-to-br from-background via-background/50 to-background border-2 border-poker-accent/30 rounded-3xl p-8 shadow-floating relative overflow-hidden animate-fade-in">
                        <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                          <Crown className="w-full h-full text-poker-accent" />
                        </div>

                        <div className="flex items-center gap-6 relative">
                          <div className="flex-shrink-0">
                            <div className="relative">
                              <div className="w-20 h-20 bg-gradient-to-br from-poker-accent to-poker-primary rounded-2xl flex items-center justify-center shadow-lg">
                                <span className="text-2xl">{getPokerAvatar(topPlayers[0].name, true)}</span>
                              </div>
                              <div className="absolute -top-2 -right-2 w-8 h-8 bg-poker-warning rounded-full flex items-center justify-center shadow-lg">
                                <Crown className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          </div>

                          <div className="flex-grow">
                            <div className="flex items-center gap-3 mb-2">
                              <h2 className="text-3xl font-bold text-poker-primary">
                                {topPlayers[0].name}
                              </h2>
                              <Badge className="bg-gradient-to-r from-poker-accent to-poker-primary text-white">
                                Чемпион
                              </Badge>
                            </div>
                            <div className="flex items-center gap-6 text-muted-foreground">
                              <span className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                {topPlayers[0].games_played} игр
                              </span>
                              <span className="flex items-center gap-2">
                                <Trophy className="w-4 h-4" />
                                {getWinRate(topPlayers[0].wins, topPlayers[0].games_played)}% побед
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-4xl font-bold text-poker-primary mb-1">
                              {topPlayers[0].elo_rating}
                            </div>
                            <div className="text-sm text-muted-foreground uppercase tracking-widest">
                              RPS
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Positions 2-5 */}
                  <div className="space-y-4 mb-8">
                    {topPlayers.slice(1).map((player, index) => {
                      const position = index + 2;
                      const isTopThree = position <= 3;
                      
                      return (
                        <Card key={player.id} className={`
                          p-6 hover:shadow-floating transition-all duration-300 relative overflow-hidden animate-fade-in
                          ${isTopThree ? 'border-poker-accent/20 bg-gradient-to-r from-background to-background/80' : 'bg-background/60 backdrop-blur-sm'}
                        `}>
                          <div className="flex items-center justify-between relative">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center justify-center w-12 h-12">
                                {position === 2 && (
                                  <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-500 rounded-xl flex items-center justify-center shadow-md">
                                    <Medal className="w-5 h-5 text-white" />
                                  </div>
                                )}
                                {position === 3 && (
                                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                                    <Award className="w-5 h-5 text-white" />
                                  </div>
                                )}
                                {position > 3 && (
                                  <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center border border-border shadow-sm">
                                    <span className="text-muted-foreground font-semibold">
                                      {position}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className={`
                                w-14 h-14 rounded-xl flex items-center justify-center shadow-sm text-xl
                                ${isTopThree 
                                  ? 'bg-gradient-to-br from-poker-accent/20 to-poker-primary/20 border-2 border-poker-accent/30' 
                                  : 'bg-background border border-border'
                                }
                              `}>
                                {getPokerAvatar(player.name)}
                              </div>

                              <div>
                                <h3 className="text-xl font-semibold text-poker-primary mb-1">
                                  {player.name}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    {player.games_played} игр
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Trophy className="w-3 h-3" />
                                    {getWinRate(player.wins, player.games_played)}% побед
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Star className="w-3 h-3" />
                                    {player.wins} побед
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className={`text-2xl font-bold mb-1 ${isTopThree ? 'text-poker-accent' : 'text-poker-primary'}`}>
                                {player.elo_rating}
                              </div>
                              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                                RPS
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Full Rating Table */}
                  {remainingPlayers.length > 0 && (
                    <div className="space-y-6">
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-poker-primary mb-2">Полный рейтинг</h2>
                        <p className="text-muted-foreground">Все игроки по убыванию рейтинга</p>
                      </div>
                      
                      <Card className="p-6 bg-background/80 backdrop-blur-sm">
                        <div className="space-y-3">
                          {allPlayers.map((player, index) => {
                            const position = index + 1;
                            const isTopFive = position <= 5;
                            
                            return (
                              <div key={player.id} className={`
                                flex items-center justify-between p-4 rounded-xl transition-all duration-200
                                ${isTopFive ? 'bg-poker-accent/5 border border-poker-accent/20' : 'hover:bg-background/50'}
                              `}>
                                <div className="flex items-center gap-4">
                                  <div className={`
                                    w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold
                                    ${isTopFive ? 'bg-poker-accent/20 text-poker-accent' : 'bg-background border border-border text-muted-foreground'}
                                  `}>
                                    {position}
                                  </div>
                                  <div className={`
                                    w-12 h-12 rounded-lg flex items-center justify-center text-lg
                                    ${isTopFive ? 'bg-poker-primary/20 border border-poker-primary/30' : 'bg-background border border-border'}
                                  `}>
                                    {getPokerAvatar(player.name, position === 1)}
                                  </div>
                                  <div>
                                    <div className={`font-semibold ${isTopFive ? 'text-poker-primary' : 'text-foreground'}`}>
                                      {player.name}
                                      {position === 1 && <Crown className="inline w-4 h-4 ml-2 text-poker-warning" />}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {player.games_played} игр • {getWinRate(player.wins, player.games_played)}% побед • {player.wins} побед
                                    </div>
                                  </div>
                                </div>
                                <div className={`text-xl font-bold ${isTopFive ? 'text-poker-accent' : 'text-poker-primary'}`}>
                                  {player.elo_rating}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* Recent Tournaments Section */}
        {recentTournaments.length > 0 && (
          <section className="py-16 bg-background/50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-poker-primary mb-4">Последние турниры</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Результаты недавних турниров, которые повлияли на рейтинг игроков
                </p>
              </div>

              <div className="max-w-4xl mx-auto">
                <div className="space-y-4">
                  {recentTournaments.map((tournament, index) => (
                    <Card key={tournament.tournament_id} className="p-6 hover:shadow-floating transition-all duration-300 bg-background/80 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-poker-primary/10 rounded-xl flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-poker-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-poker-primary mb-1">
                              {tournament.tournament_name}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(tournament.finished_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {tournament.participants} участников
                              </span>
                              <span className="flex items-center gap-1">
                                <Crown className="w-3 h-3" />
                                Победитель: {tournament.winner}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-poker-accent/30 text-poker-accent">
                          Завершен
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}