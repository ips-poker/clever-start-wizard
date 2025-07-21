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
    <section id="rating" className="py-24 bg-gradient-to-b from-poker-background via-poker-surface/20 to-poker-background">
      <div className="container mx-auto px-4">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <Trophy className="w-8 h-8 text-poker-warning" />
            <h2 className="text-5xl font-light tracking-tight bg-gradient-primary bg-clip-text text-transparent">
              Рейтинг элиты
            </h2>
          </div>
          <p className="text-lg text-poker-text-secondary max-w-2xl mx-auto font-light leading-relaxed">
            Система ELO рейтинга. Поднимайтесь к вершине покерного мастерства
          </p>
        </div>

        {topPlayers.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-surface rounded-full flex items-center justify-center mx-auto mb-6 shadow-card">
              <Trophy className="w-12 h-12 text-poker-text-muted" />
            </div>
            <h3 className="text-2xl font-light mb-3 text-poker-text-primary">Рейтинг формируется</h3>
            <p className="text-poker-text-muted font-light">Станьте первым в элитном списке игроков</p>
          </div>
        ) : (
          <div className="space-y-16">
            {/* Champion Section */}
            {topPlayers[0] && (
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  {/* Champion Card */}
                  <div className="bg-gradient-to-br from-poker-surface via-poker-surface-elevated to-poker-surface backdrop-blur-sm border border-poker-warning/20 rounded-3xl p-12 shadow-floating relative overflow-hidden">
                    {/* Luxury Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute top-8 left-8 w-32 h-32 border border-poker-warning/30 rounded-full"></div>
                      <div className="absolute bottom-8 right-8 w-24 h-24 border border-poker-warning/20 rounded-full"></div>
                    </div>
                    
                    {/* Crown Icon */}
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                      <div className="w-12 h-12 bg-gradient-accent rounded-full flex items-center justify-center shadow-accent">
                        <Trophy className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    <div className="relative text-center pt-6">
                      {/* Avatar */}
                      <div className="w-20 h-20 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-accent">
                        <span className="text-white font-medium text-2xl">
                          {topPlayers[0].name.charAt(0)}
                        </span>
                      </div>

                      {/* Name & Title */}
                      <h3 className="text-3xl font-light mb-2 text-poker-text-primary">
                        {topPlayers[0].name}
                      </h3>
                      <Badge className="bg-gradient-accent text-white border-0 mb-6 px-4 py-1 text-sm font-light">
                        Чемпион
                      </Badge>

                      {/* ELO Rating */}
                      <div className="mb-8">
                        <div className="text-5xl font-light text-poker-warning mb-2">
                          {topPlayers[0].elo_rating}
                        </div>
                        <div className="text-sm text-poker-text-muted uppercase tracking-widest font-light">
                          ELO Рейтинг
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex justify-center gap-8 text-poker-text-secondary">
                        <div className="text-center">
                          <div className="text-xl font-light text-poker-text-primary">
                            {topPlayers[0].games_played}
                          </div>
                          <div className="text-xs uppercase tracking-wide">Игр</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-light text-poker-text-primary">
                            {getWinRate(topPlayers[0].wins, topPlayers[0].games_played)}%
                          </div>
                          <div className="text-xs uppercase tracking-wide">Побед</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Top Players List */}
            <div className="max-w-4xl mx-auto">
              <div className="space-y-3">
                {topPlayers.slice(1, 10).map((player, index) => (
                  <div key={player.id} className="group">
                    <div className="bg-gradient-to-r from-poker-surface/80 via-poker-surface-elevated/60 to-poker-surface/80 backdrop-blur-sm border border-poker-border/50 rounded-2xl p-6 hover:shadow-card transition-all duration-300 hover:bg-poker-surface-elevated/80">
                      <div className="flex items-center justify-between">
                        {/* Left Side - Rank & Player Info */}
                        <div className="flex items-center gap-6">
                          {/* Rank */}
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 flex items-center justify-center">
                              {index + 2 === 2 && <Medal className="w-6 h-6 text-poker-text-muted" />}
                              {index + 2 === 3 && <Award className="w-6 h-6 text-poker-accent" />}
                              {index + 2 > 3 && (
                                <span className="text-poker-text-secondary font-light text-lg">
                                  {index + 2}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Avatar */}
                          <div className="w-12 h-12 bg-gradient-surface rounded-xl flex items-center justify-center shadow-minimal">
                            <span className="text-poker-text-primary font-medium">
                              {player.name.charAt(0)}
                            </span>
                          </div>

                          {/* Player Info */}
                          <div>
                            <h4 className="text-lg font-medium text-poker-text-primary mb-1">
                              {player.name}
                            </h4>
                            <div className="flex items-center gap-4 text-xs text-poker-text-muted">
                              <span>{player.games_played} игр</span>
                              <span>{getWinRate(player.wins, player.games_played)}% побед</span>
                            </div>
                          </div>
                        </div>

                        {/* Right Side - ELO Rating */}
                        <div className="text-right">
                          <div className="text-2xl font-light text-poker-text-primary mb-1">
                            {player.elo_rating}
                          </div>
                          <div className="text-xs text-poker-text-muted uppercase tracking-wide">
                            ELO
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Summary */}
            <div className="max-w-3xl mx-auto">
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gradient-surface/50 backdrop-blur-sm rounded-2xl border border-poker-border/30">
                  <div className="text-2xl font-light text-poker-text-primary mb-2">
                    {topPlayers.length}
                  </div>
                  <div className="text-sm text-poker-text-muted uppercase tracking-wide">
                    Игроков
                  </div>
                </div>

                <div className="text-center p-6 bg-gradient-surface/50 backdrop-blur-sm rounded-2xl border border-poker-border/30">
                  <div className="text-2xl font-light text-poker-text-primary mb-2">
                    {topPlayers.reduce((sum, p) => sum + p.games_played, 0)}
                  </div>
                  <div className="text-sm text-poker-text-muted uppercase tracking-wide">
                    Игр сыграно
                  </div>
                </div>

                <div className="text-center p-6 bg-gradient-surface/50 backdrop-blur-sm rounded-2xl border border-poker-border/30">
                  <div className="text-2xl font-light text-poker-text-primary mb-2">
                    {topPlayers.length > 0 ? Math.round(topPlayers.reduce((sum, p) => sum + p.elo_rating, 0) / topPlayers.length) : 0}
                  </div>
                  <div className="text-sm text-poker-text-muted uppercase tracking-wide">
                    Средний ELO
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}