import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp, Users } from "lucide-react";

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
        return <Trophy className="w-6 h-6 text-poker-warning" />;
      case 2:
        return <Medal className="w-6 h-6 text-poker-text-muted" />;
      case 3:
        return <Award className="w-6 h-6 text-poker-accent" />;
      default:
        return <TrendingUp className="w-5 h-5 text-poker-text-secondary" />;
    }
  };

  const getRankBadge = (position: number) => {
    if (position <= 3) {
      const colors = {
        1: "bg-gradient-accent text-white",
        2: "bg-gradient-to-r from-poker-text-muted to-poker-border text-white", 
        3: "bg-gradient-to-r from-poker-accent to-poker-accent-light text-white"
      };
      return (
        <Badge className={colors[position as keyof typeof colors]}>
          #{position}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-poker-border text-poker-text-secondary">
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
            <h2 className="text-3xl font-bold mb-4 text-poker-text-primary">Загрузка рейтинга...</h2>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="rating" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Рейтинг лучших игроков
          </h2>
          <p className="text-xl text-poker-text-secondary max-w-3xl mx-auto leading-relaxed">
            Топ игроков по системе ELO рейтинга. Участвуйте в турнирах и поднимайтесь в рейтинге!
          </p>
          <div className="w-24 h-1 bg-gradient-primary mx-auto mt-6 rounded-full"></div>
        </div>

        {topPlayers.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-poker-text-muted" />
            <h3 className="text-xl font-semibold mb-2 text-poker-text-primary">Рейтинг пока пуст</h3>
            <p className="text-poker-text-muted">Станьте первым игроком в нашем рейтинге!</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Top 3 Players - Luxury Podium */}
            <div className="relative">
              <h3 className="text-3xl font-bold mb-12 text-center bg-gradient-primary bg-clip-text text-transparent">
                Подиум лидеров
              </h3>
              
              {/* Podium Layout - Three-tier design */}
              <div className="relative max-w-5xl mx-auto">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-gradient-surface rounded-3xl opacity-30"></div>
                
                <div className="relative flex items-end justify-center gap-8 px-8 py-12">
                  {/* 2nd Place */}
                  {topPlayers[1] && (
                    <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
                      <div className="relative group">
                        {/* Card */}
                        <div className="bg-gradient-card border border-poker-border rounded-3xl p-8 mb-6 shadow-dramatic hover:shadow-floating transition-all duration-700 hover:-translate-y-4 transform backdrop-blur-sm">
                          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                            <div className="w-12 h-12 bg-gradient-to-br from-poker-text-muted to-poker-border rounded-2xl flex items-center justify-center shadow-elevated">
                              <Medal className="w-6 h-6 text-white" />
                            </div>
                          </div>
                          
                          <div className="text-center pt-4">
                            <div className="w-20 h-20 bg-gradient-to-br from-poker-text-muted to-poker-border rounded-full flex items-center justify-center mx-auto mb-4 shadow-accent group-hover:scale-110 transition-transform duration-500">
                              <span className="text-white font-bold text-2xl">
                                {topPlayers[1].name.charAt(0)}
                              </span>
                            </div>
                            <h4 className="font-bold text-xl mb-2 text-poker-text-primary">{topPlayers[1].name}</h4>
                            <div className="text-3xl font-black text-poker-accent mb-3 animate-glow">
                              {topPlayers[1].elo_rating}
                            </div>
                            <Badge className="bg-gradient-to-r from-poker-text-muted to-poker-border text-white border-0 px-4 py-1">
                              2 место
                            </Badge>
                            <div className="mt-4 flex justify-center gap-4 text-sm text-poker-text-secondary">
                              <span>{topPlayers[1].games_played} игр</span>
                              <span>{getWinRate(topPlayers[1].wins, topPlayers[1].games_played)}% побед</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Podium base */}
                        <div className="w-32 h-32 bg-gradient-to-t from-poker-text-muted to-poker-border rounded-t-3xl flex items-start justify-center pt-6 shadow-elevated">
                          <div className="text-white font-bold text-4xl opacity-80">2</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 1st Place - Champion */}
                  {topPlayers[0] && (
                    <div className="flex flex-col items-center animate-scale-in" style={{ animationDelay: '0.1s' }}>
                      <div className="relative group">
                        {/* Crown decoration */}
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-10">
                          <div className="text-6xl animate-bounce-subtle">👑</div>
                        </div>
                        
                        {/* Champion Card */}
                        <div className="bg-gradient-card border-2 border-poker-warning/50 rounded-3xl p-10 mb-6 shadow-floating hover:shadow-dramatic transition-all duration-700 hover:-translate-y-6 transform backdrop-blur-sm relative overflow-hidden">
                          {/* Glowing effect */}
                          <div className="absolute inset-0 bg-gradient-accent opacity-10 animate-pulse"></div>
                          
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                            <div className="w-16 h-16 bg-gradient-accent rounded-2xl flex items-center justify-center shadow-accent animate-glow">
                              <Trophy className="w-8 h-8 text-white" />
                            </div>
                          </div>
                          
                          <div className="relative text-center pt-6">
                            <div className="w-24 h-24 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-success group-hover:scale-110 transition-transform duration-500 animate-pulse-glow">
                              <span className="text-white font-bold text-3xl">
                                {topPlayers[0].name.charAt(0)}
                              </span>
                            </div>
                            <h4 className="font-bold text-2xl mb-3 text-poker-text-primary">{topPlayers[0].name}</h4>
                            <div className="text-4xl font-black text-poker-warning mb-4 animate-glow">
                              {topPlayers[0].elo_rating}
                            </div>
                            <Badge className="bg-gradient-accent text-white border-0 px-6 py-2 text-lg shadow-accent">
                              🏆 Чемпион
                            </Badge>
                            <div className="mt-6 flex justify-center gap-6 text-sm text-poker-text-secondary">
                              <span className="flex items-center gap-1">
                                <Trophy className="w-4 h-4" />
                                {topPlayers[0].games_played} игр
                              </span>
                              <span className="flex items-center gap-1">
                                <Award className="w-4 h-4" />
                                {getWinRate(topPlayers[0].wins, topPlayers[0].games_played)}% побед
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Champion Podium base */}
                        <div className="w-36 h-40 bg-gradient-accent rounded-t-3xl flex items-start justify-center pt-8 shadow-accent relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-success opacity-20 animate-pulse"></div>
                          <div className="text-white font-bold text-5xl relative z-10">1</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {topPlayers[2] && (
                    <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
                      <div className="relative group">
                        {/* Card */}
                        <div className="bg-gradient-card border border-poker-border rounded-3xl p-8 mb-6 shadow-dramatic hover:shadow-floating transition-all duration-700 hover:-translate-y-4 transform backdrop-blur-sm">
                          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                            <div className="w-12 h-12 bg-gradient-to-br from-poker-accent to-poker-accent-light rounded-2xl flex items-center justify-center shadow-elevated">
                              <Award className="w-6 h-6 text-white" />
                            </div>
                          </div>
                          
                          <div className="text-center pt-4">
                            <div className="w-20 h-20 bg-gradient-to-br from-poker-accent to-poker-accent-light rounded-full flex items-center justify-center mx-auto mb-4 shadow-accent group-hover:scale-110 transition-transform duration-500">
                              <span className="text-white font-bold text-2xl">
                                {topPlayers[2].name.charAt(0)}
                              </span>
                            </div>
                            <h4 className="font-bold text-xl mb-2 text-poker-text-primary">{topPlayers[2].name}</h4>
                            <div className="text-3xl font-black text-poker-accent mb-3 animate-glow">
                              {topPlayers[2].elo_rating}
                            </div>
                            <Badge className="bg-gradient-to-r from-poker-accent to-poker-accent-light text-white border-0 px-4 py-1">
                              3 место
                            </Badge>
                            <div className="mt-4 flex justify-center gap-4 text-sm text-poker-text-secondary">
                              <span>{topPlayers[2].games_played} игр</span>
                              <span>{getWinRate(topPlayers[2].wins, topPlayers[2].games_played)}% побед</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Podium base */}
                        <div className="w-28 h-24 bg-gradient-to-t from-poker-accent to-poker-accent-light rounded-t-3xl flex items-start justify-center pt-4 shadow-elevated">
                          <div className="text-white font-bold text-3xl opacity-90">3</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Remaining Players - Elegant List */}
            {topPlayers.length > 3 && (
              <div className="max-w-4xl mx-auto">
                <h3 className="text-2xl font-bold mb-8 text-center text-poker-text-primary">
                  Остальные лидеры
                </h3>
                
                <div className="space-y-4">
                  {topPlayers.slice(3).map((player, index) => (
                    <div key={player.id} className="bg-gradient-card border border-poker-border rounded-2xl p-6 shadow-card hover:shadow-elevated transition-all duration-500 hover:-translate-y-1 transform">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-surface rounded-2xl flex items-center justify-center text-poker-text-primary font-bold text-lg shadow-minimal">
                            #{index + 4}
                          </div>
                          <div className="w-16 h-16 bg-gradient-to-br from-poker-surface to-poker-surface-elevated rounded-2xl flex items-center justify-center shadow-subtle">
                            <span className="text-poker-text-primary font-bold text-xl">
                              {player.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-xl text-poker-text-primary">{player.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-poker-text-muted mt-1">
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
                          <div className="text-xs text-poker-text-muted uppercase tracking-wider">
                            ELO рейтинг
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card className="bg-gradient-card border-poker-border shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-poker-text-secondary" />
                    <div>
                      <p className="text-2xl font-bold text-poker-text-primary">{topPlayers.length}</p>
                      <p className="text-xs text-poker-text-muted">Активных игроков</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-card border-poker-border shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-4 w-4 text-poker-warning" />
                    <div>
                      <p className="text-2xl font-bold text-poker-text-primary">
                        {topPlayers.reduce((sum, p) => sum + p.games_played, 0)}
                      </p>
                      <p className="text-xs text-poker-text-muted">Сыгранных игр</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-card border-poker-border shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-poker-accent" />
                    <div>
                      <p className="text-2xl font-bold text-poker-text-primary">
                        {topPlayers.length > 0 ? Math.round(topPlayers.reduce((sum, p) => sum + p.elo_rating, 0) / topPlayers.length) : 0}
                      </p>
                      <p className="text-xs text-poker-text-muted">Средний рейтинг</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}