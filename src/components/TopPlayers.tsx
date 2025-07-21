import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
}

export function TopPlayers() {
  const [topPlayers, setTopPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTopPlayers();
    
    // Set up real-time subscription for player updates
    const playersChannel = supabase
      .channel('top-players-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'players' }, 
        (payload) => {
          console.log('Player rating updated:', payload);
          loadTopPlayers(); // Reload when any player data changes
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_results' },
        (payload) => {
          console.log('Game result added:', payload);
          loadTopPlayers(); // Reload when game results are added
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tournaments' },
        (payload) => {
          console.log('Tournament status changed:', payload);
          // Only reload if tournament status changed to completed
          if (payload.new && (payload.new as any).status === 'completed') {
            setTimeout(() => loadTopPlayers(), 2000); // Small delay for rating calculation
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
    };
  }, []);

  const loadTopPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('elo_rating', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTopPlayers(data || []);
    } catch (error) {
      console.error('Error loading top players:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <TrendingUp className="w-5 h-5 text-poker-primary" />;
    }
  };

  const getRankBadge = (position: number) => {
    if (position <= 3) {
      const colors = {
        1: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-black",
        2: "bg-gradient-to-r from-gray-300 to-gray-500 text-black", 
        3: "bg-gradient-to-r from-amber-400 to-amber-600 text-black"
      };
      return (
        <Badge className={colors[position as keyof typeof colors]}>
          #{position}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-poker-primary/20 text-poker-primary">
        #{position}
      </Badge>
    );
  };

  const getWinRate = (wins: number, games: number) => {
    if (games === 0) return 0;
    return Math.round((wins / games) * 100);
  };

  if (loading) {
    return (
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Загрузка рейтинга...</h2>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="rating" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-poker-accent to-poker-primary bg-clip-text text-transparent">
            Рейтинг лучших игроков
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Топ игроков по системе ELO рейтинга. Участвуйте в турнирах и поднимайтесь в рейтинге!
          </p>
        </div>

        {topPlayers.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Рейтинг пока пуст</h3>
            <p className="text-muted-foreground">Станьте первым игроком в нашем рейтинге!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top 3 Players - Modern Podium */}
            <div className="lg:col-span-2">
              <h3 className="text-2xl font-bold mb-8 text-center bg-gradient-to-r from-poker-accent to-poker-primary bg-clip-text text-transparent">
                Подиум лидеров
              </h3>
              
              {/* Podium Layout */}
              <div className="relative mb-12">
                <div className="flex items-end justify-center gap-4 h-64">
                  {/* 2nd Place */}
                  {topPlayers[1] && (
                    <div className="flex flex-col items-center">
                      <div className="bg-gradient-card border border-border/50 rounded-2xl p-6 mb-4 shadow-elevated hover:shadow-floating transition-all duration-500 hover:-translate-y-2 transform">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                            <span className="text-white font-bold text-xl">
                              {topPlayers[1].name.charAt(0)}
                            </span>
                          </div>
                          <h4 className="font-bold text-lg mb-1">{topPlayers[1].name}</h4>
                          <div className="text-2xl font-black text-poker-accent mb-2">
                            {topPlayers[1].elo_rating}
                          </div>
                          <Badge className="bg-gradient-to-r from-gray-300 to-gray-500 text-black border-0">
                            2 место
                          </Badge>
                        </div>
                      </div>
                      <div className="w-24 h-32 bg-gradient-to-t from-gray-300 to-gray-400 rounded-t-lg flex items-start justify-center pt-4 shadow-lg">
                        <Medal className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  )}

                  {/* 1st Place - Highest */}
                  {topPlayers[0] && (
                    <div className="flex flex-col items-center -mt-8">
                      <div className="bg-gradient-card border border-poker-accent/30 rounded-2xl p-8 mb-4 shadow-floating hover:shadow-dramatic transition-all duration-500 hover:-translate-y-3 transform ring-2 ring-poker-accent/20">
                        <div className="text-center">
                          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse">
                            <span className="text-black font-bold text-2xl">
                              {topPlayers[0].name.charAt(0)}
                            </span>
                          </div>
                          <h4 className="font-bold text-xl mb-2">{topPlayers[0].name}</h4>
                          <div className="text-3xl font-black text-poker-accent mb-3">
                            {topPlayers[0].elo_rating}
                          </div>
                          <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black border-0 text-sm">
                            🏆 Чемпион
                          </Badge>
                        </div>
                      </div>
                      <div className="w-28 h-40 bg-gradient-to-t from-yellow-400 to-yellow-500 rounded-t-xl flex items-start justify-center pt-4 shadow-xl">
                        <Trophy className="w-10 h-10 text-white" />
                      </div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {topPlayers[2] && (
                    <div className="flex flex-col items-center">
                      <div className="bg-gradient-card border border-border/50 rounded-2xl p-6 mb-4 shadow-elevated hover:shadow-floating transition-all duration-500 hover:-translate-y-2 transform">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                            <span className="text-black font-bold text-xl">
                              {topPlayers[2].name.charAt(0)}
                            </span>
                          </div>
                          <h4 className="font-bold text-lg mb-1">{topPlayers[2].name}</h4>
                          <div className="text-2xl font-black text-poker-accent mb-2">
                            {topPlayers[2].elo_rating}
                          </div>
                          <Badge className="bg-gradient-to-r from-amber-400 to-amber-600 text-black border-0">
                            3 место
                          </Badge>
                        </div>
                      </div>
                      <div className="w-24 h-24 bg-gradient-to-t from-amber-400 to-amber-500 rounded-t-lg flex items-start justify-center pt-4 shadow-lg">
                        <Award className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats for top 3 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {topPlayers.slice(0, 3).map((player, index) => (
                  <div key={player.id} className="bg-gradient-surface rounded-xl p-4 border border-border/50">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-poker-primary">{player.games_played}</p>
                        <p className="text-muted-foreground">Игр сыграно</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-poker-success">{getWinRate(player.wins, player.games_played)}%</p>
                        <p className="text-muted-foreground">Винрейт</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Remaining Players - Modern List */}
            {topPlayers.length > 3 && (
              <div className="lg:col-span-2">
                <h3 className="text-xl font-semibold mb-6 text-poker-primary">Топ 10 игроков</h3>
                <Card className="border border-border/50 shadow-card">
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/50">
                      {topPlayers.slice(3).map((player, index) => {
                        const position = index + 4;
                        return (
                          <div 
                            key={player.id} 
                            className="flex items-center justify-between p-6 hover:bg-gradient-surface transition-all duration-300 hover:shadow-subtle group"
                          >
                            <div className="flex items-center gap-6">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-poker-accent/20 to-poker-primary/20 rounded-full flex items-center justify-center border border-poker-accent/20 group-hover:border-poker-accent/40 transition-colors">
                                  <span className="font-bold text-poker-primary">
                                    {player.name.charAt(0)}
                                  </span>
                                </div>
                                {getRankBadge(position)}
                              </div>
                              <div>
                                <h4 className="font-bold text-lg text-poker-primary group-hover:text-poker-accent transition-colors">
                                  {player.name}
                                </h4>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
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
                              <div className="text-2xl font-black text-poker-accent mb-1">
                                {player.elo_rating}
                              </div>
                              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                                ELO рейтинг
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}