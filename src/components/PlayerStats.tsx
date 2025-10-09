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

  const getWinRate = (wins: number, games: number) => {
    if (games === 0) return 0;
    return Math.round((wins / games) * 100);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4"></div>
          <p className="text-white/70">Загрузка рейтинга...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 backdrop-blur-xl shadow-xl hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-white/60 uppercase tracking-wide">Всего игроков</p>
                <p className="text-3xl font-light text-amber-400 mt-1">{stats.totalPlayers}</p>
              </div>
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 backdrop-blur-xl shadow-xl hover:shadow-2xl hover:shadow-green-500/20 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-white/60 uppercase tracking-wide">Средний рейтинг</p>
                <p className="text-3xl font-light text-green-400 mt-1">{stats.averageRating}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 backdrop-blur-xl shadow-xl hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-white/60 uppercase tracking-wide">Всего игр</p>
                <p className="text-3xl font-light text-purple-400 mt-1">{stats.totalGames}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <Target className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 backdrop-blur-xl shadow-xl">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-light tracking-wide">ПОЛНЫЙ РЕЙТИНГ</h3>
              <div className="h-0.5 w-16 bg-gradient-to-r from-amber-400 to-amber-600 mt-2"></div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {players.length > 0 ? (
            <div className="space-y-3">
              {players.map((player, index) => {
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
                        : 'bg-slate-800/50 hover:bg-slate-800/70 border border-white/10 hover:border-amber-500/30'
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
                        <Avatar className="h-12 w-12 border-2 border-amber-500/20">
                          <AvatarFallback className="text-sm bg-gradient-to-br from-amber-500/20 to-amber-600/20 text-white">
                            {player.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      {/* Player Info */}
                      <div>
                        <p className={`font-light text-lg mb-1 tracking-wide group-hover:text-amber-100 transition-colors duration-300 ${isTopThree ? 'text-white' : 'text-white/90'}`}>
                          {player.name}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-white/60">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {player.games_played} игр
                          </span>
                          <span className="flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            {player.wins} побед
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {getWinRate(player.wins, player.games_played)}% винрейт
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
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Users className="h-10 w-10 text-amber-400/50" />
              </div>
              <h3 className="text-xl font-light text-white mb-3 tracking-wide">Рейтинг формируется</h3>
              <p className="text-sm text-white/50">Игроки появятся после первых турниров</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}