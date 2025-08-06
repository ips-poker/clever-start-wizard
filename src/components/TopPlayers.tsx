import { useState, useEffect } from "react";
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
}
const getPokerAvatar = (name: string, isChampion = false) => {
  const avatars = ["♠️", "♥️", "♦️", "♣️", "🃏", "🎯", "🎲", "💎", "⭐", "🔥"];
  const index = name.charCodeAt(0) % avatars.length;
  return isChampion ? "👑" : avatars[index];
};
export function TopPlayers() {
  const [topPlayers, setTopPlayers] = useState<Player[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [showFirstPlaceOnly, setShowFirstPlaceOnly] = useState(false);
  useEffect(() => {
    loadTopPlayers();
    loadAllPlayers();

    // Set up real-time subscription for player updates
    const playersChannel = supabase.channel('players-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'players'
    }, () => {
      loadTopPlayers();
      loadAllPlayers();
    }).subscribe();
    return () => {
      supabase.removeChannel(playersChannel);
    };
  }, []);
  const loadTopPlayers = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('players').select('*').order('elo_rating', {
        ascending: false
      }).limit(5);
      if (error) throw error;
      setTopPlayers(data || []);
    } catch (error) {
      console.error('Error loading top players:', error);
    } finally {
      setLoading(false);
    }
  };
  const loadAllPlayers = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('players').select('*').order('elo_rating', {
        ascending: false
      });
      if (error) throw error;
      setAllPlayers(data || []);
      setFilteredPlayers(data || []);
    } catch (error) {
      console.error('Error loading all players:', error);
    }
  };

  // Filter players based on search and first place filter
  useEffect(() => {
    let filtered = allPlayers;
    if (searchTerm) {
      filtered = filtered.filter(player => player.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (showFirstPlaceOnly) {
      filtered = filtered.filter(player => player.wins > 0);
    }
    setFilteredPlayers(filtered);
  }, [allPlayers, searchTerm, showFirstPlaceOnly]);
  const getWinRate = (wins: number, games: number) => {
    if (games === 0) return 0;
    return Math.round(wins / games * 100);
  };
  if (loading) {
    return <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4 text-poker-text-primary">Загрузка рейтинга...</h2>
          </div>
        </div>
      </section>;
  }
  return <section id="rating" className="py-20 bg-gradient-to-b from-poker-background via-poker-surface/30 to-poker-background relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-72 h-72 bg-poker-accent rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-poker-primary rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="relative">
              <Trophy className="w-8 h-8 text-poker-accent" />
              <div className="absolute -inset-1 bg-poker-accent/20 rounded-full blur-sm"></div>
            </div>
            <h2 className="text-4xl font-light tracking-tight text-poker-text-primary">
              Рейтинг <span className="bg-gradient-to-r from-poker-accent to-poker-primary bg-clip-text text-transparent font-medium">элиты</span>
            </h2>
          </div>
          <p className="text-lg text-poker-text-muted max-w-xl mx-auto font-light">
            Система RPS рейтинга. Поднимайтесь к вершине покерного мастерства
          </p>
        </div>

        {topPlayers.length === 0 ? <div className="max-w-md mx-auto text-center py-16">
            <div className="w-20 h-20 bg-poker-surface border border-poker-border rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Trophy className="w-10 h-10 text-poker-text-muted" />
            </div>
            <h3 className="text-xl font-medium mb-3 text-poker-text-primary">Рейтинг формируется</h3>
            <p className="text-poker-text-muted">Станьте первым в элитном списке игроков</p>
          </div> : <div className="max-w-4xl mx-auto">
            {/* Top Player Highlight */}
            {topPlayers[0] && <div className="mb-12">
                <div className="bg-gradient-to-br from-poker-surface via-white to-poker-surface-elevated border border-poker-border/50 rounded-3xl p-8 shadow-lg relative overflow-hidden">
                  {/* Premium pattern overlay */}
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                    <svg viewBox="0 0 40 40" className="w-full h-full">
                      <defs>
                        <pattern id="premium-pattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                          <circle cx="4" cy="4" r="1" fill="currentColor" />
                        </pattern>
                      </defs>
                      <rect width="40" height="40" fill="url(#premium-pattern)" />
                    </svg>
                  </div>

                  <div className="flex items-center gap-6 relative">
                    {/* Champion badge */}
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="w-16 h-16 bg-gradient-to-br from-poker-accent to-poker-primary rounded-2xl flex items-center justify-center shadow-lg">
                          <span className="text-2xl">{getPokerAvatar(topPlayers[0].name, true)}</span>
                        </div>
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-poker-warning rounded-full flex items-center justify-center">
                          <Crown className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    </div>

                    {/* Player info */}
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-medium text-poker-text-primary">
                          {topPlayers[0].name}
                        </h3>
                        <span className="px-3 py-1 bg-gradient-to-r from-poker-accent/10 to-poker-primary/10 text-poker-accent text-sm font-medium rounded-full border border-poker-accent/20">
                          Чемпион
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-poker-text-muted">
                        <span>{topPlayers[0].games_played} игр</span>
                        <span>{getWinRate(topPlayers[0].wins, topPlayers[0].games_played)}% побед</span>
                      </div>
                    </div>

                    {/* ELO Rating */}
                    <div className="text-right">
                      <div className="text-3xl font-light text-poker-primary mb-1">
                        {topPlayers[0].elo_rating}
                      </div>
                      <div className="text-xs text-poker-text-muted uppercase tracking-widest">RPS</div>
                    </div>
                  </div>
                </div>
              </div>}

            {/* Players List */}
            <div className="space-y-3 mb-8">
              {topPlayers.slice(1).map((player, index) => {
            const position = index + 2;
            const isTopThree = position <= 3;
            return <div key={player.id} className="group">
                    <div className={`
                      bg-white/60 backdrop-blur-sm border border-poker-border/50 rounded-2xl p-5 
                      hover:bg-white/80 hover:shadow-lg hover:border-poker-border 
                      transition-all duration-300 relative overflow-hidden
                      ${isTopThree ? 'bg-gradient-to-r from-poker-surface via-white to-poker-surface-elevated border-poker-accent/20' : ''}
                    `}>
                      {/* Premium glow for top 3 */}
                      {isTopThree && <div className="absolute inset-0 bg-gradient-to-r from-poker-accent/5 via-transparent to-poker-primary/5 rounded-2xl"></div>}

                      <div className="flex items-center justify-between relative">
                        <div className="flex items-center gap-4">
                          {/* Position with premium icons */}
                          <div className="flex items-center justify-center w-10 h-10">
                            {position === 2 && <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-500 rounded-lg flex items-center justify-center shadow-sm">
                                <Medal className="w-5 h-5 text-white" />
                              </div>}
                            {position === 3 && <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-sm">
                                <Award className="w-5 h-5 text-white" />
                              </div>}
                            {position > 3 && <div className="w-8 h-8 bg-poker-surface rounded-lg flex items-center justify-center border border-poker-border/30">
                                <span className="text-poker-text-muted font-medium text-sm">
                                  {position}
                                </span>
                              </div>}
                          </div>

                          {/* Player avatar */}
                          <div className={`
                            w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-lg
                            ${isTopThree ? 'bg-gradient-to-br from-poker-accent/20 to-poker-primary/20 border border-poker-accent/30' : 'bg-poker-surface border border-poker-border/30'}
                          `}>
                            {getPokerAvatar(player.name)}
                          </div>

                          {/* Player info */}
                          <div>
                            <h4 className="text-lg font-medium text-poker-text-primary mb-1">
                              {player.name}
                            </h4>
                            <div className="flex items-center gap-4 text-xs text-poker-text-muted">
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
                          <div className={`text-2xl font-light mb-1 ${isTopThree ? 'text-poker-accent' : 'text-poker-text-primary'}`}>
                            {player.elo_rating}
                          </div>
                          <div className="text-xs text-poker-text-muted uppercase tracking-wide">RPS</div>
                        </div>
                      </div>
                    </div>
                  </div>;
          })}
            </div>

            {/* View All Button and Filters */}
            <div className="text-center mb-8">
              <div className="flex flex-col items-center gap-4">
                <Button variant="outline" onClick={() => setShowAll(!showAll)} className="group">
                  <span>{showAll ? 'Скрыть полный рейтинг' : 'Посмотреть полный рейтинг'}</span>
                  <ChevronRight className={`w-4 h-4 ml-2 transition-transform ${showAll ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
                </Button>

                {showAll && <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-poker-text-muted w-4 h-4" />
                      <Input placeholder="Поиск игрока..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                    </div>
                    <Button variant={showFirstPlaceOnly ? "default" : "outline"} onClick={() => setShowFirstPlaceOnly(!showFirstPlaceOnly)} className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      <span className="hidden sm:inline">Только победители</span>
                      <span className="sm:hidden">Фильтр</span>
                    </Button>
                  </div>}
              </div>
            </div>

            {/* Full Rating List */}
            {showAll && <div className="mb-16">
                <ScrollArea className="h-96 w-full rounded-2xl border border-poker-border/30 bg-white/40 backdrop-blur-sm">
                  <div className="p-4 space-y-2">
                    {filteredPlayers.map((player, index) => {
                const position = allPlayers.findIndex(p => p.id === player.id) + 1;
                const isTopThree = position <= 3;
                return <div key={player.id} className="group">
                          <div className={`
                            bg-white/60 backdrop-blur-sm border border-poker-border/50 rounded-xl p-4 
                            hover:bg-white/80 hover:shadow-md hover:border-poker-border 
                            transition-all duration-300 relative overflow-hidden
                            ${isTopThree ? 'bg-gradient-to-r from-poker-surface via-white to-poker-surface-elevated border-poker-accent/20' : ''}
                          `}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {/* Position */}
                                <div className="flex items-center justify-center w-8 h-8">
                                  {position === 1 && <div className="w-6 h-6 bg-gradient-to-br from-poker-warning to-yellow-500 rounded-md flex items-center justify-center">
                                      <Crown className="w-4 h-4 text-white" />
                                    </div>}
                                  {position === 2 && <div className="w-6 h-6 bg-gradient-to-br from-gray-300 to-gray-500 rounded-md flex items-center justify-center">
                                      <Medal className="w-4 h-4 text-white" />
                                    </div>}
                                  {position === 3 && <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-amber-600 rounded-md flex items-center justify-center">
                                      <Award className="w-4 h-4 text-white" />
                                    </div>}
                                  {position > 3 && <div className="w-6 h-6 bg-poker-surface rounded-md flex items-center justify-center border border-poker-border/30">
                                      <span className="text-poker-text-muted font-medium text-xs">
                                        {position}
                                      </span>
                                    </div>}
                                </div>

                                {/* Player avatar */}
                                <div className={`
                                  w-8 h-8 rounded-lg flex items-center justify-center text-sm
                                  ${isTopThree ? 'bg-gradient-to-br from-poker-accent/20 to-poker-primary/20 border border-poker-accent/30' : 'bg-poker-surface border border-poker-border/30'}
                                `}>
                                  {getPokerAvatar(player.name, position === 1)}
                                </div>

                                {/* Player info */}
                                <div>
                                  <h4 className="text-sm font-medium text-poker-text-primary">
                                    {player.name}
                                  </h4>
                                  <div className="flex items-center gap-3 text-xs text-poker-text-muted">
                                    <span>{player.games_played} игр</span>
                                    <span>{getWinRate(player.wins, player.games_played)}% побед</span>
                                  </div>
                                </div>
                              </div>

                              {/* ELO Rating */}
                              <div className="text-right">
                                <div className={`text-lg font-light ${isTopThree ? 'text-poker-accent' : 'text-poker-text-primary'}`}>
                                  {player.elo_rating}
                                </div>
                                <div className="text-xs text-poker-text-muted uppercase tracking-wide">
                                  RPS
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>;
              })}
                    {filteredPlayers.length === 0 && <div className="text-center py-8 text-poker-text-muted">
                        {showFirstPlaceOnly ? "Нет игроков с победами" : searchTerm ? "Игроки не найдены" : "Нет данных"}
                      </div>}
                  </div>
                </ScrollArea>
              </div>}

            {/* Statistics Summary */}
            <div className="mt-16 grid grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="text-center p-6 bg-white/40 backdrop-blur-sm rounded-2xl border border-poker-border/30">
                <div className="flex items-center justify-center w-10 h-10 bg-poker-surface rounded-xl mx-auto mb-3 border border-poker-border/30">
                  <Users className="w-5 h-5 text-poker-text-primary" />
                </div>
                <div className="text-2xl font-light text-poker-text-primary mb-1">
                  {topPlayers.length}
                </div>
                <div className="text-xs text-poker-text-muted uppercase tracking-wide">
                  Игроков
                </div>
              </div>

              <div className="text-center p-6 bg-white/40 backdrop-blur-sm rounded-2xl border border-poker-border/30">
                <div className="flex items-center justify-center w-10 h-10 bg-poker-surface rounded-xl mx-auto mb-3 border border-poker-border/30">
                  <Trophy className="w-5 h-5 text-poker-warning" />
                </div>
                <div className="text-2xl font-light text-poker-text-primary mb-1">
                  {topPlayers.reduce((sum, p) => sum + p.games_played, 0)}
                </div>
                <div className="text-xs text-poker-text-muted uppercase tracking-wide">
                  Игр сыграно
                </div>
              </div>

              <div className="text-center p-6 bg-white/40 backdrop-blur-sm rounded-2xl border border-poker-border/30">
                <div className="flex items-center justify-center w-10 h-10 bg-poker-surface rounded-xl mx-auto mb-3 border border-poker-border/30">
                  <TrendingUp className="w-5 h-5 text-poker-accent" />
                </div>
                <div className="text-2xl font-light text-poker-text-primary mb-1">
                  {topPlayers.length > 0 ? Math.round(topPlayers.reduce((sum, p) => sum + p.elo_rating, 0) / topPlayers.length) : 0}
                </div>
                <div className="text-xs text-poker-text-muted uppercase tracking-wide">СРЕДНИЙ RPS</div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center mt-12">
              <div className="bg-gradient-to-br from-poker-surface via-white to-poker-surface-elevated border border-poker-border/50 rounded-3xl p-8 shadow-lg relative overflow-hidden max-w-lg mx-auto">
                <div className="space-y-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-poker-accent to-poker-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-medium text-poker-text-primary mb-3">
                      Присоединяйтесь к элите
                    </h3>
                    <p className="text-poker-text-muted mb-6 max-w-md mx-auto">
                      Участвуйте в турнирах, развивайте навыки и поднимайтесь в рейтинге
                    </p>
                    <Link to="/tournaments">
                      <Button className="bg-gradient-to-r from-poker-accent to-poker-primary text-white hover:from-poker-accent/90 hover:to-poker-primary/90 transition-all duration-300 font-medium px-8 py-3 rounded-xl shadow-lg hover:scale-105 hover:shadow-xl">
                        <Trophy className="w-5 h-5 mr-2" />
                        Зарегистрироваться на турнир
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>}
      </div>
    </section>;
}