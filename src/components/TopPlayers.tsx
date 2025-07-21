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
      .channel('players-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'players' }, 
        () => {
          loadTopPlayers();
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
        return <TrendingUp className="w-5 h-5 text-poker-steel" />;
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
      <Badge variant="outline" className="border-poker-steel text-poker-steel">
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
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-poker-gold to-poker-steel bg-clip-text text-transparent">
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
            {/* Top 3 Players - Featured */}
            <div className="lg:col-span-2">
              <h3 className="text-xl font-semibold mb-6 text-center">Подиум лидеров</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {topPlayers.slice(0, 3).map((player, index) => {
                  const position = index + 1;
                  return (
                    <Card 
                      key={player.id} 
                      className={`text-center overflow-hidden ${
                        position === 1 
                          ? 'ring-2 ring-yellow-400 shadow-lg' 
                          : position === 2 
                          ? 'ring-2 ring-gray-400' 
                          : 'ring-2 ring-amber-400'
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-center mb-3">
                          {getRankIcon(position)}
                        </div>
                        <div className="flex justify-center mb-2">
                          {getRankBadge(position)}
                        </div>
                        <CardTitle className="text-lg">{player.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <p className="text-3xl font-bold text-poker-gold">{player.elo_rating}</p>
                            <p className="text-sm text-muted-foreground">ELO рейтинг</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-semibold">{player.games_played}</p>
                              <p className="text-muted-foreground">Игр</p>
                            </div>
                            <div>
                              <p className="font-semibold">{getWinRate(player.wins, player.games_played)}%</p>
                              <p className="text-muted-foreground">Винрейт</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Remaining Players - List Format */}
            {topPlayers.length > 3 && (
              <div className="lg:col-span-2">
                <h3 className="text-xl font-semibold mb-6">Топ 10 игроков</h3>
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {topPlayers.slice(3).map((player, index) => {
                        const position = index + 4;
                        return (
                          <div key={player.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                {getRankIcon(position)}
                                {getRankBadge(position)}
                              </div>
                              <div>
                                <h4 className="font-semibold">{player.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {player.games_played} игр, {getWinRate(player.wins, player.games_played)}% побед
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-poker-gold">{player.elo_rating}</p>
                              <p className="text-sm text-muted-foreground">ELO</p>
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