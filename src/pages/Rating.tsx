import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, Medal, Award, TrendingUp, Users, Clock, Star, ChevronDown, Crown, Target } from "lucide-react";

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  avatar_url?: string;
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
      const { data: playersData, error: playersError } = await supabase.rpc('get_players_public');

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

      const sortedPlayersData = (playersData || []).sort((a, b) => b.elo_rating - a.elo_rating);
      setAllPlayers(sortedPlayersData);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <main className="pt-24 md:pt-20">
          <div className="container mx-auto px-4 py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4"></div>
              <h1 className="text-4xl font-bold mb-4 text-white">Загрузка рейтинга...</h1>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      <main className="pt-24 md:pt-20">
        {/* Hero Section */}
        <section className="py-12 md:py-20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 text-amber-400/40 text-5xl animate-pulse">♠</div>
            <div className="absolute top-20 right-20 text-amber-400/30 text-4xl animate-bounce-subtle">♣</div>
            <div className="absolute bottom-10 left-20 text-amber-400/35 text-6xl animate-pulse">♥</div>
            <div className="absolute bottom-20 right-10 text-amber-400/30 text-3xl animate-bounce-subtle">♦</div>
          </div>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto px-4 relative">
            <div className="text-center mb-12 md:mb-16">
              <div className="flex items-center gap-3 justify-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-3xl lg:text-4xl font-light text-white tracking-wide">
                  РЕЙТИНГ EPC
                </h1>
              </div>
              <div className="h-0.5 w-20 bg-gradient-to-r from-amber-400 to-amber-600 mx-auto mb-6"></div>
              <p className="text-base md:text-lg text-white/70 max-w-3xl mx-auto leading-relaxed font-light px-4">
                Система RPS отслеживает навыки каждого игрока. Каждая партия влияет на рейтинг в зависимости от результата и уровня соперников.
              </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-16 max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 rounded-2xl p-6 text-center backdrop-blur-xl hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-300">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-amber-400" />
                </div>
                <div className="text-3xl font-light text-amber-400 mb-2">
                  {allPlayers.length}
                </div>
                <div className="text-sm font-light text-white/60 uppercase tracking-wide">Всего игроков</div>
              </div>
              
              <div className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 rounded-2xl p-6 text-center backdrop-blur-xl hover:shadow-2xl hover:shadow-green-500/20 transition-all duration-300">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <div className="text-3xl font-light text-green-400 mb-2">
                  {allPlayers.reduce((sum, player) => sum + player.games_played, 0)}
                </div>
                <div className="text-sm font-light text-white/60 uppercase tracking-wide">Партий сыграно</div>
              </div>
              
              <div className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 rounded-2xl p-6 text-center backdrop-blur-xl hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-3xl font-light text-purple-400 mb-2">
                  {topPlayers[0]?.elo_rating || 100}
                </div>
                <div className="text-sm font-light text-white/60 uppercase tracking-wide">Лучший рейтинг</div>
              </div>
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
                      <div className="bg-gradient-to-br from-amber-500/10 via-amber-600/15 to-amber-500/10 rounded-3xl p-8 border border-amber-500/20 backdrop-blur-xl shadow-2xl relative overflow-hidden group animate-fade-in">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                          <div className="absolute top-4 right-6 text-amber-400/30 text-4xl animate-pulse">♠</div>
                          <div className="absolute bottom-4 left-6 text-amber-400/20 text-3xl animate-bounce-subtle">♣</div>
                        </div>

                         <div className="flex items-center gap-6 relative z-10">
                          {/* Champion badge */}
                          <div className="flex-shrink-0">
                            <div className="relative">
                              {topPlayers[0].avatar_url ? (
                                <img 
                                  src={topPlayers[0].avatar_url} 
                                  alt={topPlayers[0].name}
                                  className="w-16 h-16 rounded-xl border-2 border-amber-500/30 object-cover"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-xl flex items-center justify-center text-2xl">
                                  👑
                                </div>
                              )}
                              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
                                <Crown className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          </div>

                          {/* Player info */}
                          <div className="flex-grow">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-2xl font-light text-white tracking-wide">
                                {topPlayers[0].name}
                              </h3>
                              <div className="px-3 py-1 bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-lg backdrop-blur-md border border-white/20">
                                <span className="text-amber-400 text-sm font-medium tracking-wide">Чемпион</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 text-sm text-white/60">
                              <span>{topPlayers[0].games_played} игр</span>
                              <span>{getWinRate(topPlayers[0].wins, topPlayers[0].games_played)}% побед</span>
                            </div>
                          </div>

                          {/* ELO Rating */}
                          <div className="text-right">
                            <div className="text-3xl font-light text-amber-400 mb-1">
                              {topPlayers[0].elo_rating}
                            </div>
                            <div className="text-xs text-white/60 uppercase tracking-widest">RPS</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Positions 2-5 */}
                  <div className="space-y-4 mb-8">
                    {topPlayers.slice(1).map((player, index) => {
                      const position = index + 2;
                      const isTopThree = position <= 3;
                      
                      return (
                        <div key={player.id} className="group">
                          <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl group-hover:scale-[1.02] transition-all duration-500 hover:shadow-xl hover:shadow-amber-500/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                              <div className="absolute top-3 right-3 text-amber-400/30 text-2xl animate-pulse">♥</div>
                              <div className="absolute bottom-3 left-3 text-amber-400/20 text-xl animate-bounce-subtle">♦</div>
                            </div>

                            <div className="flex items-center justify-between relative z-10">
                              <div className="flex items-center gap-4">
                                {/* Position with premium icons */}
                                <div className="flex items-center justify-center w-10 h-10">
                                  {position === 2 && (
                                    <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-500 rounded-lg flex items-center justify-center shadow-md">
                                      <Medal className="w-5 h-5 text-white" />
                                    </div>
                                  )}
                                  {position === 3 && (
                                    <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-md">
                                      <Award className="w-5 h-5 text-white" />
                                    </div>
                                  )}
                                  {position > 3 && (
                                    <div className="w-8 h-8 bg-gradient-to-br from-white/10 to-white/5 rounded-lg flex items-center justify-center border border-white/20">
                                      <span className="text-white/70 font-medium text-sm">
                                        {position}
                                      </span>
                                    </div>
                                  )}
                                </div>

                        {/* Player avatar */}
                        {player.avatar_url ? (
                          <img 
                            src={player.avatar_url} 
                            alt={player.name}
                            className="w-12 h-12 rounded-xl border border-amber-500/30 object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-xl flex items-center justify-center text-lg">
                            {getPokerAvatar(player.name)}
                          </div>
                        )}

                                {/* Player info */}
                                <div>
                                  <h4 className="text-lg font-light text-white mb-1 tracking-wide group-hover:text-amber-100 transition-colors duration-300">
                                    {player.name}
                                  </h4>
                                  <div className="flex items-center gap-4 text-xs text-white/60">
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

                              {/* ELO Rating */}
                              <div className="text-right">
                                <div className={`text-2xl font-light mb-1 transition-colors duration-300 ${isTopThree ? 'text-amber-400' : 'text-white'}`}>
                                  {player.elo_rating}
                                </div>
                                <div className="text-xs text-white/60 uppercase tracking-wide">RPS</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Full Rating Table */}
                  {remainingPlayers.length > 0 && (
                    <div className="space-y-8">
                      <div className="text-center">
                        <div className="flex items-center gap-3 justify-center mb-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Trophy className="h-5 w-5 text-white" />
                          </div>
                          <h2 className="text-2xl lg:text-3xl font-light text-white tracking-wide">
                            ПОЛНЫЙ РЕЙТИНГ
                          </h2>
                        </div>
                        <div className="h-0.5 w-20 bg-gradient-to-r from-amber-400 to-amber-600 mx-auto mb-4"></div>
                        <p className="text-white/70 font-light">Все игроки по убыванию RPS рейтинга</p>
                      </div>
                      
                      <div className="space-y-3">
                        {allPlayers.map((player, index) => {
                          const position = index + 1;
                          const isTopThree = position <= 3;
                          const isTopFive = position <= 5;
                          
                          return (
                            <div 
                              key={player.id} 
                              className={`
                                group flex items-center justify-between p-4 rounded-2xl transition-all duration-300
                                ${isTopThree
                                  ? 'bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-amber-500/10 border border-amber-500/20 hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/20' 
                                  : 'bg-gradient-to-br from-slate-800/50 via-slate-900/60 to-black/50 hover:bg-slate-800/70 border border-white/10 hover:border-amber-500/30'
                                }
                              `}
                            >
                              <div className="flex items-center gap-4">
                                {/* Rank Icon/Number */}
                                <div className="flex items-center justify-center w-10 h-10">
                                  {position === 1 && (
                                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                                      <Trophy className="h-6 w-6 text-white" />
                                    </div>
                                  )}
                                  {position === 2 && (
                                    <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-500 rounded-xl flex items-center justify-center shadow-md">
                                      <Medal className="h-6 w-6 text-white" />
                                    </div>
                                  )}
                                  {position === 3 && (
                                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                                      <Award className="h-6 w-6 text-white" />
                                    </div>
                                  )}
                                  {position > 3 && (
                                    <div className={`
                                      w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium
                                      ${isTopFive
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : 'bg-white/5 text-white/70 border border-white/20'
                                      }
                                    `}>
                                      {position}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Avatar */}
                                {player.avatar_url ? (
                                  <img 
                                    src={player.avatar_url} 
                                    alt={player.name}
                                    className="w-12 h-12 rounded-xl border border-amber-500/30 object-cover"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-xl flex items-center justify-center text-lg">
                                    {getPokerAvatar(player.name, position === 1)}
                                  </div>
                                )}
                                
                                {/* Player Info */}
                                <div>
                                  <h4 className={`font-light text-lg mb-1 tracking-wide group-hover:text-amber-100 transition-colors duration-300 ${isTopThree ? 'text-white' : 'text-white/90'}`}>
                                    {player.name}
                                    {position === 1 && <Crown className="inline w-4 h-4 ml-2 text-amber-400" />}
                                  </h4>
                                  <div className="flex items-center gap-3 text-xs text-white/60">
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
                              
                              {/* RPS Rating */}
                              <div className="text-right">
                                <div className={`text-2xl font-light mb-1 transition-colors duration-300 ${isTopThree ? 'text-amber-400' : 'text-white'}`}>
                                  {player.elo_rating}
                                </div>
                                <div className="text-xs text-white/60 uppercase tracking-widest">RPS</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* Recent Tournaments Section */}
        {recentTournaments.length > 0 && (
          <section className="py-16 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
            </div>
            <div className="container mx-auto px-4 relative z-10">
              <div className="text-center mb-12">
                <div className="flex items-center gap-3 justify-center mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-light text-white tracking-wide">ПОСЛЕДНИЕ ТУРНИРЫ</h2>
                </div>
                <div className="h-0.5 w-20 bg-gradient-to-r from-amber-400 to-amber-600 mx-auto mb-6"></div>
                <p className="text-white/70 max-w-2xl mx-auto font-light">
                  Результаты недавних турниров, которые повлияли на RPS рейтинг игроков
                </p>
              </div>

              <div className="max-w-4xl mx-auto">
                <div className="space-y-4">
                  {recentTournaments.map((tournament, index) => (
                    <div 
                      key={tournament.tournament_id} 
                      className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/20 backdrop-blur-xl"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-amber-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-light text-white mb-1 tracking-wide">
                              {tournament.tournament_name}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-white/60">
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
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border">
                          Завершен
                        </Badge>
                      </div>
                    </div>
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