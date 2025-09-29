import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Medal, Award, TrendingUp, Users, ChevronRight, Crown, Search, Filter } from "lucide-react";
import { Link } from "react-router-dom";
interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  avatar_url: string | null;
}
const PlayerAvatar = ({ player, size = "w-12 h-12", isChampion = false }: {
  player: Player;
  size?: string;
  isChampion?: boolean;
}) => {
  const fallbackAvatars = ["♠️", "♥️", "♦️", "♣️", "🃏", "🎯", "🎲", "💎", "⭐", "🔥"];
  const fallbackIndex = player.name.charCodeAt(0) % fallbackAvatars.length;
  const fallbackAvatar = isChampion ? "👑" : fallbackAvatars[fallbackIndex];

  return player.avatar_url ? (
    <div className={`${size} rounded-xl overflow-hidden flex-shrink-0`}>
      <img 
        src={player.avatar_url} 
        alt={`${player.name} avatar`}
        className="w-full h-full object-cover"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-poker-accent/20 to-poker-primary/20 border border-poker-accent/30 rounded-xl flex items-center justify-center text-lg">${fallbackAvatar}</div>`;
          }
        }}
      />
    </div>
  ) : (
    <div className={`${size} bg-gradient-to-br from-poker-accent/20 to-poker-primary/20 border border-poker-accent/30 rounded-xl flex items-center justify-center text-lg`}>
      {fallbackAvatar}
    </div>
  );
};
export function TopPlayers() {
  const [topPlayers, setTopPlayers] = useState<Player[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [showFirstPlaceOnly, setShowFirstPlaceOnly] = useState(false);
  useEffect(() => {
    loadPlayers();

    // Set up real-time subscription for player updates
    const playersChannel = supabase.channel('players-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'players'
    }, () => {
      loadPlayers();
    }).subscribe();
    return () => {
      supabase.removeChannel(playersChannel);
    };
  }, []);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_players_public');
      if (error) throw error;
      
      const sortedPlayers = (data || []).sort((a, b) => b.elo_rating - a.elo_rating);
      
      // Устанавливаем все данные из одного запроса
      setAllPlayers(sortedPlayers);
      setTopPlayers(sortedPlayers.slice(0, 5));
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter players based on search and first place filter
  const filteredPlayers = useMemo(() => {
    let filtered = allPlayers;
    if (searchTerm) {
      filtered = filtered.filter(player => player.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (showFirstPlaceOnly) {
      filtered = filtered.filter(player => player.wins > 0);
    }
    return filtered;
  }, [allPlayers, searchTerm, showFirstPlaceOnly]);

  const getWinRate = useCallback((wins: number, games: number) => {
    if (games === 0) return 0;
    return Math.round(wins / games * 100);
  }, []);
  if (loading) {
    return <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4 text-poker-text-primary">Загрузка рейтинга...</h2>
          </div>
        </div>
      </section>;
  }
  return (
    <section id="rating" className="py-20 bg-gradient-to-br from-slate-900 via-black to-slate-800 relative overflow-hidden">
      {/* Покерные масти декорация */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
        <div className="absolute top-20 left-20 text-amber-400/30 text-6xl animate-pulse transform rotate-12">♦</div>
        <div className="absolute top-40 right-10 text-amber-400/20 text-4xl animate-bounce-subtle transform -rotate-12">♥</div>
        <div className="absolute bottom-20 left-10 text-amber-400/25 text-5xl animate-pulse transform rotate-45">♠</div>
        <div className="absolute bottom-40 right-20 text-amber-400/20 text-3xl animate-bounce-subtle transform -rotate-30">♣</div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center gap-3 justify-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-light text-white tracking-wide">
              РЕЙТИНГ ЭЛИТЫ
            </h2>
          </div>
          <div className="h-0.5 w-20 bg-gradient-to-r from-amber-400 to-amber-600 mx-auto mb-6"></div>
          <p className="text-lg text-white/70 max-w-xl mx-auto font-light">
            Система RPS рейтинга. Поднимайтесь к вершине покерного мастерства
          </p>
        </div>

        {topPlayers.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-xl font-medium mb-3 text-white">Рейтинг формируется</h3>
              <p className="text-white/60">Станьте первым в элитном списке игроков</p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Top Player Highlight */}
            {topPlayers[0] && (
              <div className="mb-12">
                <div className="bg-gradient-to-br from-amber-500/10 via-amber-600/15 to-amber-500/10 rounded-3xl p-8 border border-amber-500/20 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                    <div className="absolute top-4 right-6 text-amber-400/30 text-4xl animate-pulse">♠</div>
                    <div className="absolute bottom-4 left-6 text-amber-400/20 text-3xl animate-bounce-subtle">♣</div>
                  </div>

                  <div className="flex items-center gap-6 relative z-10">
                    {/* Champion badge */}
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <PlayerAvatar player={topPlayers[0]} size="w-16 h-16" isChampion={true} />
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

            {/* Players List */}
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
                          <PlayerAvatar player={player} size="w-12 h-12" />

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

            {/* View All Button and Filters */}
            <div className="text-center mb-8">
              <div className="flex flex-col items-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAll(!showAll)} 
                  className="group border-amber-400/50 text-amber-400 hover:bg-amber-400/10 transition-all duration-300"
                >
                  <span>{showAll ? 'Скрыть полный рейтинг' : 'Посмотреть полный рейтинг'}</span>
                  <ChevronRight className={`w-4 h-4 ml-2 transition-transform ${showAll ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
                </Button>

                {showAll && (
                  <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4" />
                      <Input 
                        placeholder="Поиск игрока..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50" 
                      />
                    </div>
                    <Button 
                      variant={showFirstPlaceOnly ? "default" : "outline"} 
                      onClick={() => setShowFirstPlaceOnly(!showFirstPlaceOnly)} 
                      className="flex items-center gap-2 border-amber-400/50 text-amber-400 hover:bg-amber-400/10"
                    >
                      <Filter className="w-4 h-4" />
                      <span className="hidden sm:inline">Только победители</span>
                      <span className="sm:hidden">Фильтр</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Full Rating List */}
            {showAll && (
              <div className="mb-16">
                <ScrollArea className="h-96 w-full rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 backdrop-blur-xl">
                  <div className="p-4 space-y-2">
                    {filteredPlayers.map((player, index) => {
                      const position = allPlayers.findIndex(p => p.id === player.id) + 1;
                      const isTopThree = position <= 3;
                      return (
                        <div key={player.id} className="group">
                          <div className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 relative overflow-hidden">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {/* Position */}
                                <div className="flex items-center justify-center w-8 h-8">
                                  {position === 1 && (
                                    <div className="w-6 h-6 bg-gradient-to-br from-amber-500 to-amber-600 rounded-md flex items-center justify-center">
                                      <Crown className="w-4 h-4 text-white" />
                                    </div>
                                  )}
                                  {position === 2 && (
                                    <div className="w-6 h-6 bg-gradient-to-br from-gray-300 to-gray-500 rounded-md flex items-center justify-center">
                                      <Medal className="w-4 h-4 text-white" />
                                    </div>
                                  )}
                                  {position === 3 && (
                                    <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-amber-600 rounded-md flex items-center justify-center">
                                      <Award className="w-4 h-4 text-white" />
                                    </div>
                                  )}
                                  {position > 3 && (
                                    <div className="w-6 h-6 bg-white/10 rounded-md flex items-center justify-center border border-white/20">
                                      <span className="text-white/70 font-medium text-xs">
                                        {position}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Player avatar */}
                                <PlayerAvatar player={player} size="w-8 h-8" isChampion={position === 1} />

                                {/* Player info */}
                                <div>
                                  <h4 className="text-sm font-medium text-white">
                                    {player.name}
                                  </h4>
                                  <div className="flex items-center gap-3 text-xs text-white/60">
                                    <span>{player.games_played} игр</span>
                                    <span>{getWinRate(player.wins, player.games_played)}% побед</span>
                                  </div>
                                </div>
                              </div>

                              {/* ELO Rating */}
                              <div className="text-right">
                                <div className={`text-lg font-light ${isTopThree ? 'text-amber-400' : 'text-white'}`}>
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
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-white/8 via-white/12 to-white/8 rounded-2xl p-8 border border-white/10 backdrop-blur-sm max-w-2xl mx-auto">
            <h3 className="text-xl font-light text-white mb-4 tracking-wide">Присоединяйтесь к элите</h3>
            <p className="text-white/70 mb-6 font-light">Начните свой путь к вершине рейтинга RPS</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/rating">
                <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium px-8 py-3 transition-all duration-300">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Полный рейтинг
                </Button>
              </Link>
              <Link to="/tournaments">
                <Button 
                  variant="outline" 
                  className="border-amber-400/50 text-amber-400 hover:bg-amber-400/10 px-8 py-3 font-medium transition-all duration-300"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Участвовать
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0px) rotate(var(--tw-rotate)); }
          50% { transform: translateY(-10px) rotate(var(--tw-rotate)); }
        }
      `}</style>
      <style>{`
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0px) rotate(var(--tw-rotate)); }
          50% { transform: translateY(-10px) rotate(var(--tw-rotate)); }
        }
      `}</style>
    </section>
  );
}