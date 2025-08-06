import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp, Users, Target } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
      
      // Calculate stats
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

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="h-5 w-5 flex items-center justify-center text-sm font-bold text-muted-foreground">#{position}</span>;
    }
  };

  const getWinRate = (wins: number, games: number) => {
    if (games === 0) return 0;
    return Math.round((wins / games) * 100);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Всего игроков</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalPlayers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Средний рейтинг</p>
                <p className="text-2xl font-bold text-foreground">{stats.averageRating}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Всего игр</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalGames}</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Таблица лидеров
          </CardTitle>
        </CardHeader>
        <CardContent>
          {players.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Место</TableHead>
                  <TableHead>Игрок</TableHead>
                  <TableHead className="text-center">RPS</TableHead>
                  <TableHead className="text-center">Игр</TableHead>
                  <TableHead className="text-center">Побед</TableHead>
                  <TableHead className="text-center">Винрейт</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player, index) => (
                  <TableRow key={player.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getRankIcon(index + 1)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={player.avatar_url} alt={player.name} />
                          <AvatarFallback className="text-sm bg-gradient-to-br from-primary/20 to-primary/10">
                            {player.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{player.name}</p>
                          {index < 3 && (
                            <Badge variant="secondary" className="text-xs">
                              Топ {index + 1}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="outline" 
                        className={`font-mono ${
                          player.elo_rating >= 1400 ? 'border-green-500 text-green-700' :
                          player.elo_rating >= 1200 ? 'border-blue-500 text-blue-700' :
                          'border-orange-500 text-orange-700'
                        }`}
                      >
                        RPS {player.elo_rating}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {player.games_played}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium text-foreground">{player.wins}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="secondary"
                        className={`${
                          getWinRate(player.wins, player.games_played) >= 30 ? 'bg-green-100 text-green-800' :
                          getWinRate(player.wins, player.games_played) >= 15 ? 'bg-blue-100 text-blue-800' :
                          'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {getWinRate(player.wins, player.games_played)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет зарегистрированных игроков</p>
              <p className="text-sm">Игроки появятся после первых турниров</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}