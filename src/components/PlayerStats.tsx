import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp, Users, Target, Crown, Flame, Zap, Star } from "lucide-react";

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  avatar_url?: string;
}

export function PlayerStats() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPlayers: 0,
    averageRating: 0,
    totalGames: 0
  });

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('elo_rating', { ascending: false });

      if (error) throw error;

      setPlayers(data || []);
      
      const totalPlayers = data?.length || 0;
      const totalGames = data?.reduce((sum, player) => sum + player.games_played, 0) || 0;
      const averageRating = totalPlayers > 0 
        ? Math.round(data.reduce((sum, player) => sum + player.elo_rating, 0) / totalPlayers)
        : 0;

      setStats({
        totalPlayers,
        averageRating,
        totalGames
      });
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWinRate = (wins: number, games: number) => {
    if (games === 0) return 0;
    return Math.round((wins / games) * 100);
  };

  const getRankBadge = (rating: number) => {
    if (rating >= 1800) return { label: "МАСТЕР", color: "bg-yellow-500", icon: Crown };
    if (rating >= 1600) return { label: "ЭКСПЕРТ", color: "bg-purple-500", icon: Star };
    if (rating >= 1400) return { label: "ПРОФИ", color: "bg-blue-500", icon: Zap };
    if (rating >= 1200) return { label: "ЛЮБИТЕЛЬ", color: "bg-green-500", icon: Flame };
    return { label: "НОВИЧОК", color: "bg-muted", icon: Target };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка рейтинга...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="brutal-border bg-card hover:border-primary/50 transition-all duration-300 group">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Всего игроков</p>
                <p className="text-3xl font-bold neon-orange mt-1">{stats.totalPlayers}</p>
              </div>
              <div className="p-3 bg-primary/10 border border-primary/30 group-hover:bg-primary/20 transition-colors">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="brutal-border bg-card hover:border-green-500/50 transition-all duration-300 group">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Средний рейтинг</p>
                <p className="text-3xl font-bold text-green-400 mt-1">{stats.averageRating}</p>
              </div>
              <div className="p-3 bg-green-500/10 border border-green-500/30 group-hover:bg-green-500/20 transition-colors">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="brutal-border bg-card hover:border-purple-500/50 transition-all duration-300 group">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Всего игр</p>
                <p className="text-3xl font-bold text-purple-400 mt-1">{stats.totalGames}</p>
              </div>
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 group-hover:bg-purple-500/20 transition-colors">
                <Target className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card className="brutal-border bg-card overflow-hidden">
        <CardHeader className="border-b border-border bg-secondary/30">
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 bg-primary">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-bold uppercase tracking-wide">Полный рейтинг</h3>
              <div className="h-0.5 w-20 bg-gradient-to-r from-primary to-accent mt-1" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {players.length > 0 ? (
            <div className="divide-y divide-border">
              {players.map((player, index) => {
                const position = index + 1;
                const isTopThree = position <= 3;
                const rankInfo = getRankBadge(player.elo_rating);
                const RankIcon = rankInfo.icon;
                const winRate = getWinRate(player.wins, player.games_played);
                
                return (
                  <div 
                    key={player.id} 
                    className={`
                      group flex items-center justify-between p-4 transition-all duration-300
                      ${isTopThree
                        ? 'bg-gradient-to-r from-primary/10 via-transparent to-transparent hover:from-primary/20' 
                        : 'hover:bg-secondary/50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="flex items-center justify-center w-10 h-10">
                        {position === 1 && (
                          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-neon-orange">
                            <Trophy className="h-5 w-5 text-white" />
                          </div>
                        )}
                        {position === 2 && (
                          <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center">
                            <Medal className="h-5 w-5 text-white" />
                          </div>
                        )}
                        {position === 3 && (
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                            <Award className="h-5 w-5 text-white" />
                          </div>
                        )}
                        {position > 3 && (
                          <div className="w-10 h-10 bg-secondary border border-border flex items-center justify-center text-sm font-bold text-muted-foreground">
                            {position}
                          </div>
                        )}
                      </div>
                      
                      {/* Avatar */}
                      <Avatar className={`h-12 w-12 border-2 ${isTopThree ? 'border-primary/50' : 'border-border'}`}>
                        <AvatarImage 
                          src={player.avatar_url || undefined} 
                          alt={player.name}
                        />
                        <AvatarFallback className="text-sm bg-secondary text-foreground font-bold">
                          {player.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-bold text-base group-hover:text-primary transition-colors truncate ${
                            isTopThree ? 'text-foreground' : 'text-foreground/90'
                          }`}>
                            {player.name}
                          </p>
                          <Badge className={`${rankInfo.color} text-white text-[10px] px-1.5 py-0 rounded-none font-bold`}>
                            <RankIcon className="h-2.5 w-2.5 mr-0.5" />
                            {rankInfo.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {player.games_played} игр
                          </span>
                          <span className="flex items-center gap-1">
                            <Trophy className="h-3 w-3" />
                            {player.wins} побед
                          </span>
                          <span className={`flex items-center gap-1 ${winRate >= 50 ? 'text-green-400' : ''}`}>
                            <TrendingUp className="h-3 w-3" />
                            {winRate}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* RPS Rating */}
                    <div className="text-right">
                      <div className={`text-2xl font-bold transition-colors ${
                        isTopThree ? 'neon-orange' : 'text-foreground'
                      }`}>
                        {player.elo_rating}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">RPS</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-secondary border border-border flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary opacity-50" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Рейтинг формируется</h3>
              <p className="text-sm text-muted-foreground">Игроки появятся после первых турниров</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
