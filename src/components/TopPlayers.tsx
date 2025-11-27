import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatedCounter } from "@/components/ui/animated-counter";
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
    <div className={`${size} rounded-none overflow-hidden flex-shrink-0 border-2 border-syndikate-orange`}>
      <img 
        src={player.avatar_url} 
        alt={`${player.name} avatar`}
        className="w-full h-full object-cover"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = `<div class="w-full h-full bg-syndikate-metal brutal-border flex items-center justify-center text-lg">${fallbackAvatar}</div>`;
          }
        }}
      />
    </div>
  ) : (
    <div className={`${size} bg-syndikate-metal brutal-border flex items-center justify-center text-lg`}>
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
      
      setAllPlayers(sortedPlayers);
      setTopPlayers(sortedPlayers.slice(0, 5));
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };

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
    return <section className="py-20 bg-background relative overflow-hidden">
        {/* Industrial Background */}
        <div className="absolute inset-0 industrial-texture opacity-50" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4 text-foreground uppercase tracking-wider">ЗАГРУЗКА РЕЙТИНГА...</h2>
          </div>
        </div>
      </section>;
  }

  return (
    <section id="rating" className="py-20 bg-background relative overflow-hidden">
      {/* Industrial Background */}
      <div className="absolute inset-0 industrial-texture opacity-50" />
      
      {/* Metal Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px),
            repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px)
          `
        }}
      />

      {/* Neon Glow Spots */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-syndikate-orange/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-syndikate-red/10 rounded-full blur-3xl animate-pulse" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center gap-3 justify-center mb-6">
            <div className="w-12 h-12 bg-syndikate-orange brutal-border flex items-center justify-center shadow-neon-orange">
              <Trophy className="h-6 w-6 text-background" />
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground tracking-wider uppercase">
              РЕЙТИНГ ЭЛИТЫ
            </h2>
          </div>
          <div className="h-[2px] w-20 bg-syndikate-orange mx-auto mb-6"></div>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto font-mono uppercase tracking-wider">
            СИСТЕМА RPS. ПУТЬ К ВЕРШИНЕ
          </p>
        </div>

        {topPlayers.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="brutal-metal brutal-border p-8">
              <div className="w-16 h-16 bg-syndikate-orange brutal-border flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-8 h-8 text-background" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground uppercase tracking-wider">Рейтинг формируется</h3>
              <p className="text-muted-foreground uppercase tracking-wide text-sm">Станьте первым в элитном списке игроков</p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Top Player Highlight */}
            {topPlayers[0] && (
              <div className="mb-12">
                <div className="brutal-metal brutal-border p-8 relative overflow-hidden group">
                  {/* Warning Stripe Top */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-2"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(45deg, rgba(255, 135, 31, 0.5), rgba(255, 135, 31, 0.5) 10px, transparent 10px, transparent 20px)'
                    }}
                  />

                  {/* Corner Brackets */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-syndikate-orange" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-syndikate-orange" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-syndikate-orange" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-syndikate-orange" />

                  <div className="flex items-center gap-6 relative z-10">
                    {/* Champion badge */}
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <PlayerAvatar player={topPlayers[0]} size="w-16 h-16" isChampion={true} />
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-syndikate-orange brutal-border flex items-center justify-center shadow-neon-orange">
                          <Crown className="w-3 h-3 text-background" />
                        </div>
                      </div>
                    </div>

                    {/* Player info */}
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold text-foreground tracking-wider uppercase">
                          {topPlayers[0].name}
                        </h3>
                        <div className="px-3 py-1 bg-syndikate-orange brutal-border">
                          <span className="text-background text-sm font-bold tracking-wider uppercase">Чемпион</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground font-mono">
                        <span>{topPlayers[0].games_played} ИГР</span>
                        <span>{getWinRate(topPlayers[0].wins, topPlayers[0].games_played)}% ПОБЕД</span>
                      </div>
                    </div>

                    {/* ELO Rating */}
                    <div className="text-right">
                      <div className="text-3xl font-bold text-syndikate-orange mb-1">
                        <AnimatedCounter end={topPlayers[0].elo_rating} duration={2000} />
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-widest font-mono">RPS</div>
                    </div>
                  </div>

                  {/* Warning Stripe Bottom */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-2"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(-45deg, rgba(255, 135, 31, 0.5), rgba(255, 135, 31, 0.5) 10px, transparent 10px, transparent 20px)'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Players List */}
            <div className="space-y-4 mb-8">
              {topPlayers.slice(1).map((player, index) => {
                const position = index + 2;
                return (
                  <div key={player.id} className="group">
                    <div className="brutal-metal brutal-border p-6 transition-all duration-300 hover:shadow-neon-orange relative overflow-hidden">
                      {/* Corner Brackets */}
                      <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-border opacity-30" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-border opacity-30" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-border opacity-30" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-border opacity-30" />

                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                          {/* Position */}
                          <div className="flex items-center justify-center w-10 h-10">
                            {position === 2 && (
                              <div className="w-8 h-8 bg-syndikate-metal-light brutal-border flex items-center justify-center">
                                <Medal className="w-5 h-5 text-syndikate-orange" />
                              </div>
                            )}
                            {position === 3 && (
                              <div className="w-8 h-8 bg-syndikate-metal-light brutal-border flex items-center justify-center">
                                <Award className="w-5 h-5 text-syndikate-orange" />
                              </div>
                            )}
                            {position > 3 && (
                              <div className="w-8 h-8 brutal-metal brutal-border flex items-center justify-center">
                                <span className="text-muted-foreground font-bold text-sm">
                                  {position}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Player avatar */}
                          <PlayerAvatar player={player} size="w-12 h-12" />

                          {/* Player info */}
                          <div>
                            <h4 className="text-lg font-bold text-foreground mb-1 tracking-wider uppercase group-hover:text-syndikate-orange transition-colors duration-300">
                              {player.name}
                            </h4>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono uppercase">
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {player.games_played} ИГР
                              </span>
                              <span className="flex items-center gap-1">
                                <Trophy className="w-3 h-3" />
                                {getWinRate(player.wins, player.games_played)}% ПОБЕД
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* ELO Rating */}
                        <div className="text-right">
                          <div className="text-2xl font-bold mb-1 text-syndikate-orange transition-colors duration-300">
                            <AnimatedCounter end={player.elo_rating} duration={1800} />
                          </div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">RPS</div>
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
                  onClick={() => setShowAll(!showAll)} 
                  className="group bg-syndikate-orange hover:bg-syndikate-orange-glow text-background font-bold uppercase tracking-wider shadow-neon-orange transition-all duration-300"
                >
                  <span>{showAll ? 'СКРЫТЬ РЕЙТИНГ' : 'ПОЛНЫЙ РЕЙТИНГ'}</span>
                  <ChevronRight className={`w-4 h-4 ml-2 transition-transform ${showAll ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
                </Button>

                {showAll && (
                  <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input 
                        placeholder="ПОИСК ИГРОКА..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="pl-10 brutal-metal brutal-border text-foreground placeholder:text-muted-foreground uppercase tracking-wider font-mono" 
                      />
                    </div>
                    <Button 
                      onClick={() => setShowFirstPlaceOnly(!showFirstPlaceOnly)} 
                      className={`flex items-center gap-2 transition-all duration-300 uppercase tracking-wider font-bold ${
                        showFirstPlaceOnly 
                          ? 'bg-syndikate-orange text-background hover:bg-syndikate-orange-glow shadow-neon-orange' 
                          : 'brutal-metal brutal-border text-foreground hover:bg-syndikate-metal-light'
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      {showFirstPlaceOnly ? 'ВСЕ' : 'ПОБЕДИТЕЛИ'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Full Rating Table */}
            {showAll && (
              <div className="brutal-metal brutal-border p-6">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {filteredPlayers.map((player, index) => (
                      <div key={player.id} className="flex items-center justify-between p-4 brutal-metal brutal-border hover:shadow-neon-orange transition-all duration-300">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 brutal-metal brutal-border flex items-center justify-center">
                            <span className="text-muted-foreground font-bold text-sm">{index + 1}</span>
                          </div>
                          <PlayerAvatar player={player} size="w-10 h-10" />
                          <div>
                            <h5 className="font-bold text-foreground uppercase tracking-wider">{player.name}</h5>
                            <div className="text-xs text-muted-foreground font-mono uppercase">
                              {player.games_played} ИГР • {getWinRate(player.wins, player.games_played)}% ПОБЕД
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-syndikate-orange">
                            {player.elo_rating}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase font-mono">RPS</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Link to Rating Page */}
            <div className="text-center mt-8">
              <Link to="/rating">
                <Button 
                  size="lg" 
                  className="bg-syndikate-orange hover:bg-syndikate-orange-glow text-background font-bold uppercase tracking-wider shadow-neon-orange px-8 group"
                >
                  ПОЛНАЯ СТАТИСТИКА
                  <ChevronRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}