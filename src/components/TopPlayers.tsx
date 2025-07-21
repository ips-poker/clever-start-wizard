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
    <section id="rating" className="py-20 bg-poker-surface-subtle">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 border-poker-accent text-poker-accent">
            Рейтинг ELO
          </Badge>
          <h2 className="text-4xl font-bold mb-4 text-poker-text-primary">
            Лучшие игроки клуба
          </h2>
          <p className="text-lg text-poker-text-secondary max-w-2xl mx-auto">
            Топ игроков по системе ELO рейтинга. Участвуйте в турнирах и поднимайтесь в рейтинге!
          </p>
        </div>

        {topPlayers.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-poker-text-muted" />
            <h3 className="text-xl font-semibold mb-2">Рейтинг пока пуст</h3>
            <p className="text-poker-text-muted">Станьте первым игроком в нашем рейтинге!</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Modern Top 3 Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {topPlayers.slice(0, 3).map((player, index) => {
                const position = index + 1;
                const isFirst = position === 1;
                return (
                  <Card 
                    key={player.id} 
                    className={`relative overflow-hidden transition-all duration-300 hover:scale-105 ${
                      isFirst 
                        ? 'bg-gradient-to-br from-poker-accent/5 to-poker-accent/10 border-poker-accent shadow-card' 
                        : 'bg-white border-poker-border hover:shadow-card'
                    }`}
                  >
                    {/* Position indicator */}
                    <div className={`absolute top-0 right-0 w-16 h-16 ${
                      isFirst ? 'bg-poker-accent' : 'bg-poker-primary'
                    } transform rotate-45 translate-x-6 -translate-y-6`}>
                      <div className="absolute bottom-2 left-2 transform -rotate-45 text-white font-bold text-sm">
                        #{position}
                      </div>
                    </div>
                    
                    <CardContent className="p-6 text-center">
                      <div className="mb-4">
                        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                          isFirst ? 'bg-poker-accent text-white' : 'bg-poker-surface-elevated text-poker-text-primary'
                        }`}>
                          {getRankIcon(position)}
                        </div>
                      </div>
                      
                      <h3 className="font-bold text-lg mb-2 text-poker-text-primary">{player.name}</h3>
                      
                      <div className="space-y-3">
                        <div>
                          <p className={`text-3xl font-bold ${isFirst ? 'text-poker-accent' : 'text-poker-primary'}`}>
                            {player.elo_rating}
                          </p>
                          <p className="text-sm text-poker-text-muted">ELO рейтинг</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-poker-border/50">
                          <div>
                            <p className="font-semibold text-poker-text-primary">{player.games_played}</p>
                            <p className="text-xs text-poker-text-muted">Игр</p>
                          </div>
                          <div>
                            <p className="font-semibold text-poker-text-primary">{getWinRate(player.wins, player.games_played)}%</p>
                            <p className="text-xs text-poker-text-muted">Винрейт</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Remaining Players - Modern List */}
            {topPlayers.length > 3 && (
              <Card className="bg-white border-poker-border">
                <CardHeader>
                  <CardTitle className="text-xl text-poker-text-primary">Остальные игроки</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-poker-border">
                    {topPlayers.slice(3).map((player, index) => {
                      const position = index + 4;
                      return (
                        <div key={player.id} className="flex items-center justify-between p-4 hover:bg-poker-surface-subtle transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-full bg-poker-surface-elevated flex items-center justify-center text-sm font-semibold text-poker-text-primary">
                                {position}
                              </span>
                              <div>
                                <h4 className="font-semibold text-poker-text-primary">{player.name}</h4>
                                <p className="text-sm text-poker-text-muted">
                                  {player.games_played} игр • {getWinRate(player.wins, player.games_played)}% побед
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-poker-accent">{player.elo_rating}</p>
                            <p className="text-sm text-poker-text-muted">ELO</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </section>
  );
}