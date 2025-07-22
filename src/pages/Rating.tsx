import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, Medal, Award, TrendingUp, Users, Clock, Star, ChevronDown, Crown } from "lucide-react";
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
  const [showAll, setShowAll] = useState(false);

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
        .from('players')
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
      <div className="min-h-screen">
        <Header />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-20">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4 text-poker-text-primary">Загрузка рейтинга...</h1>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-poker-background via-poker-surface/30 to-poker-background relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-20 left-10 w-72 h-72 bg-poker-accent rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-poker-primary rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto px-4 relative">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="relative">
                  <Trophy className="w-8 h-8 text-poker-accent" />
                  <div className="absolute -inset-1 bg-poker-accent/20 rounded-full blur-sm"></div>
                </div>
                <h1 className="text-5xl font-light tracking-tight text-poker-text-primary">
                  Рейтинг <span className="bg-gradient-to-r from-poker-accent to-poker-primary bg-clip-text text-transparent font-medium">элиты</span>
                </h1>
              </div>
              <p className="text-xl text-poker-text-muted max-w-2xl mx-auto font-light mb-6">
                Живой рейтинг лучших игроков по системе ELO. Следите за турнирами в реальном времени
              </p>
              <div className="flex justify-center">
                <RecalculateRatings />
              </div>
            </div>

            {/* Top 5 Players */}
            <div className="max-w-4xl mx-auto">
              {topPlayers.length === 0 ? (
                <div className="max-w-md mx-auto text-center py-16">
                  <div className="w-20 h-20 bg-poker-surface border border-poker-border rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Trophy className="w-10 h-10 text-poker-text-muted" />
                  </div>
                  <h3 className="text-xl font-medium mb-3 text-poker-text-primary">Рейтинг формируется</h3>
                  <p className="text-poker-text-muted">Станьте первым в элитном списке игроков</p>
                </div>
              ) : (
                <>
                  {/* Champion */}
                  {topPlayers[0] && (
                    <div className="mb-12">
                      <Card className="bg-gradient-to-br from-poker-surface via-white to-poker-surface-elevated border-poker-border/50 rounded-3xl p-8 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                          <svg viewBox="0 0 40 40" className="w-full h-full">
                            <defs>
                              <pattern id="premium-pattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                                <circle cx="4" cy="4" r="1" fill="currentColor"/>
                              </pattern>
                            </defs>
                            <rect width="40" height="40" fill="url(#premium-pattern)"/>
                          </svg>
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
                              <h2 className="text-3xl font-medium text-poker-text-primary">
                                {topPlayers[0].name}
                              </h2>
                              <Badge variant="outline" className="bg-gradient-to-r from-poker-accent/10 to-poker-primary/10 text-poker-accent border-poker-accent/20">
                                Чемпион
                              </Badge>
                            </div>
                            <div className="flex items-center gap-6 text-poker-text-muted">
                              <span>{topPlayers[0].games_played} игр</span>
                              <span>{getWinRate(topPlayers[0].wins, topPlayers[0].games_played)}% побед</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-4xl font-light text-poker-primary mb-1">
                              {topPlayers[0].elo_rating}
                            </div>
                            <div className="text-sm text-poker-text-muted uppercase tracking-widest">
                              ELO
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Positions 2-5 */}
                  <div className="space-y-3 mb-8">
                    {topPlayers.slice(1).map((player, index) => {
                      const position = index + 2;
                      const isTopThree = position <= 3;
                      
                      return (
                        <Card key={player.id} className={`
                          p-5 hover:shadow-lg transition-all duration-300 relative overflow-hidden
                          ${isTopThree ? 'bg-gradient-to-r from-poker-surface via-white to-poker-surface-elevated border-poker-accent/20' : 'bg-white/60 backdrop-blur-sm'}
                        `}>
                          {isTopThree && (
                            <div className="absolute inset-0 bg-gradient-to-r from-poker-accent/5 via-transparent to-poker-primary/5 rounded-2xl"></div>
                          )}

                          <div className="flex items-center justify-between relative">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center justify-center w-10 h-10">
                                {position === 2 && (
                                  <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-500 rounded-lg flex items-center justify-center shadow-sm">
                                    <Medal className="w-5 h-5 text-white" />
                                  </div>
                                )}
                                {position === 3 && (
                                  <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-sm">
                                    <Award className="w-5 h-5 text-white" />
                                  </div>
                                )}
                                {position > 3 && (
                                  <div className="w-8 h-8 bg-poker-surface rounded-lg flex items-center justify-center border border-poker-border/30">
                                    <span className="text-poker-text-muted font-medium text-sm">
                                      {position}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className={`
                                w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-lg
                                ${isTopThree 
                                  ? 'bg-gradient-to-br from-poker-accent/20 to-poker-primary/20 border border-poker-accent/30' 
                                  : 'bg-poker-surface border border-poker-border/30'
                                }
                              `}>
                                {getPokerAvatar(player.name)}
                              </div>

                              <div>
                                <h3 className="text-lg font-medium text-poker-text-primary mb-1">
                                  {player.name}
                                </h3>
                                <div className="flex items-center gap-4 text-xs text-poker-text-muted">
                                  <span className="flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    {player.games_played} игр
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Trophy className="w-3 h-3" />
                                    {getWinRate(player.wins, player.games_played)}% побед
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className={`text-2xl font-light mb-1 ${isTopThree ? 'text-poker-accent' : 'text-poker-text-primary'}`}>
                                {player.elo_rating}
                              </div>
                              <div className="text-xs text-poker-text-muted uppercase tracking-wide">
                                ELO
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Show All Players Button */}
                  {remainingPlayers.length > 0 && (
                    <div className="text-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="group">
                            <span>Показать полный рейтинг</span>
                            <ChevronDown className="w-4 h-4 ml-2 group-hover:translate-y-1 transition-transform" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Trophy className="w-5 h-5 text-poker-accent" />
                              Полный рейтинг игроков
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2">
                            {allPlayers.map((player, index) => (
                              <div key={player.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-poker-surface/50 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-poker-surface flex items-center justify-center border border-poker-border/30 text-sm font-medium">
                                    {index + 1}
                                  </div>
                                  <div className="w-10 h-10 rounded-lg bg-poker-surface border border-poker-border/30 flex items-center justify-center text-lg">
                                    {getPokerAvatar(player.name, index === 0)}
                                  </div>
                                  <div>
                                    <div className="font-medium text-poker-text-primary">{player.name}</div>
                                    <div className="text-xs text-poker-text-muted">
                                      {player.games_played} игр • {getWinRate(player.wins, player.games_played)}% побед
                                    </div>
                                  </div>
                                </div>
                                <div className="text-lg font-light text-poker-text-primary">
                                  {player.elo_rating}
                                </div>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Statistics */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <Card className="text-center p-6 bg-white/40 backdrop-blur-sm border-poker-border/30">
                <div className="flex items-center justify-center w-12 h-12 bg-poker-surface rounded-xl mx-auto mb-4 border border-poker-border/30">
                  <Users className="w-6 h-6 text-poker-text-primary" />
                </div>
                <div className="text-3xl font-light text-poker-text-primary mb-2">
                  {allPlayers.length}
                </div>
                <div className="text-sm text-poker-text-muted uppercase tracking-wide">
                  Всего игроков
                </div>
              </Card>

              <Card className="text-center p-6 bg-white/40 backdrop-blur-sm border-poker-border/30">
                <div className="flex items-center justify-center w-12 h-12 bg-poker-surface rounded-xl mx-auto mb-4 border border-poker-border/30">
                  <Trophy className="w-6 h-6 text-poker-warning" />
                </div>
                <div className="text-3xl font-light text-poker-text-primary mb-2">
                  {allPlayers.reduce((sum, p) => sum + p.games_played, 0)}
                </div>
                <div className="text-sm text-poker-text-muted uppercase tracking-wide">
                  Игр сыграно
                </div>
              </Card>

              <Card className="text-center p-6 bg-white/40 backdrop-blur-sm border-poker-border/30">
                <div className="flex items-center justify-center w-12 h-12 bg-poker-surface rounded-xl mx-auto mb-4 border border-poker-border/30">
                  <TrendingUp className="w-6 h-6 text-poker-accent" />
                </div>
                <div className="text-3xl font-light text-poker-text-primary mb-2">
                  {allPlayers.length > 0 ? Math.round(allPlayers.reduce((sum, p) => sum + p.elo_rating, 0) / allPlayers.length) : 0}
                </div>
                <div className="text-sm text-poker-text-muted uppercase tracking-wide">
                  Средний ELO
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Recent Tournaments */}
        <section className="py-20 bg-poker-surface/20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-light text-poker-text-primary mb-4">
                Последние <span className="text-poker-accent font-medium">турниры</span>
              </h2>
              <p className="text-poker-text-muted max-w-xl mx-auto">
                Результаты недавних турниров и их влияние на рейтинг
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              {recentTournaments.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-poker-text-muted mx-auto mb-4" />
                  <p className="text-poker-text-muted">Турниры ещё не завершились</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTournaments.map((tournament, index) => (
                    <Card key={tournament.tournament_id} className="p-6 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-poker-surface rounded-xl flex items-center justify-center border border-poker-border/30">
                            <Trophy className="w-6 h-6 text-poker-accent" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-poker-text-primary mb-1">
                              {tournament.tournament_name}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-poker-text-muted">
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {tournament.participants} участников
                              </span>
                              <span className="flex items-center gap-1">
                                <Star className="w-4 h-4" />
                                Победитель: {tournament.winner}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {formatDate(tournament.finished_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}