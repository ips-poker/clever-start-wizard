import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, Medal, Award, TrendingUp, Users, Clock, Star, ChevronDown, Crown, Target } from "lucide-react";
import { FloatingParticles } from "@/components/ui/floating-particles";
import { ScrollProgress } from "@/components/ScrollProgress";
import { fixStorageUrl } from "@/utils/storageUtils";
import { getEffectiveMafiaRank } from "@/utils/mafiaRanks";

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  avatar_url?: string;
  manual_rank?: string | null;
}

interface RecentTournament {
  tournament_name: string;
  tournament_id: string;
  finished_at: string;
  participants: number;
  winner: string;
}

const getPokerAvatar = (name: string, isChampion = false) => {
  const avatars = [
    "♠️", "♥️", "♦️", "♣️", "🃏", "🎯", "🎲", "💎", "⭐", "🔥"
  ];
  const index = name.charCodeAt(0) % avatars.length;
  return isChampion ? "👑" : avatars[index];
};

export default function Rating() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [recentTournaments, setRecentTournaments] = useState<RecentTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const baseTextureRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (baseTextureRef.current) {
        baseTextureRef.current.style.transform = `translateY(${currentScrollY * 0.15}px)`;
      }
      if (gridRef.current) {
        gridRef.current.style.transform = `translateY(${currentScrollY * 0.25}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Real-time subscriptions
    const playersChannel = supabase
      .channel('rating-players-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'players' }, 
        () => loadData()
      );
    
    playersChannel.subscribe();

    const tournamentsChannel = supabase
      .channel('rating-tournaments-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tournaments' }, 
        () => loadData()
      );
    
    tournamentsChannel.subscribe();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(tournamentsChannel);
    };
  }, []);

  const loadData = async () => {
    try {
      // Загружаем игроков напрямую чтобы получить manual_rank
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, elo_rating, games_played, wins, avatar_url, manual_rank');

      if (playersError) throw playersError;

      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select(`
          id,
          name,
          finished_at,
          tournament_registrations!inner(
            player_id,
            position,
            players!inner(name)
          )
        `)
        .eq('status', 'completed')
        .order('finished_at', { ascending: false })
        .limit(5);

      if (tournamentsError) throw tournamentsError;

      const processedTournaments = tournamentsData?.map(tournament => {
        const participants = tournament.tournament_registrations?.length || 0;
        const winner = tournament.tournament_registrations?.find(reg => reg.position === 1);
        return {
          tournament_name: tournament.name,
          tournament_id: tournament.id,
          finished_at: tournament.finished_at,
          participants,
          winner: winner?.players?.name || 'Неизвестно'
        };
      }) || [];

      const sortedPlayersData = (playersData || []).sort((a, b) => b.elo_rating - a.elo_rating);
      setAllPlayers(sortedPlayersData);
      setRecentTournaments(processedTournaments);
    } catch (error) {
      console.error('Error loading rating data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWinRate = (wins: number, games: number) => {
    if (games === 0) return 0;
    return Math.round((wins / games) * 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const topPlayers = allPlayers.slice(0, 5);

  if (loading) {
    return (
      <>
        <ScrollProgress />
        <div className="min-h-screen bg-background relative overflow-hidden">
          <div className="fixed inset-0 industrial-texture opacity-50" />
          <Header />
          <main className="pt-24 md:pt-20 relative z-20">
            <div className="container mx-auto px-4 py-20">
              <div className="text-center">
                <div className="w-12 h-12 border-2 border-syndikate-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h1 className="text-4xl font-bold mb-4 text-foreground uppercase tracking-wider">ЗАГРУЗКА РЕЙТИНГА...</h1>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <ScrollProgress />
      <FloatingParticles />
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Industrial metal base texture */}
        <div 
          ref={baseTextureRef}
          className="fixed inset-0 pointer-events-none industrial-texture opacity-50 z-0 transition-transform duration-0 will-change-transform" 
        />

        {/* Metal grid overlay */}
        <div
          ref={gridRef}
          className="fixed inset-0 pointer-events-none opacity-20 z-0 transition-transform duration-0 will-change-transform"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(255,255,255,0.04) 48px, rgba(255,255,255,0.04) 49px),
              repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(255,255,255,0.04) 48px, rgba(255,255,255,0.04) 49px)
            `,
          }}
        />

        {/* Neon glows */}
        <div className="fixed top-0 right-1/4 w-[520px] h-[520px] bg-syndikate-orange/25 rounded-full blur-[160px] opacity-80 animate-pulse" />
        <div className="fixed bottom-0 left-1/4 w-[520px] h-[520px] bg-syndikate-red/20 rounded-full blur-[160px] opacity-80 animate-pulse" />

        {/* Side rails */}
        <div className="fixed inset-y-0 left-0 w-[3px] bg-gradient-to-b from-syndikate-orange/70 via-syndikate-red/40 to-transparent shadow-neon-orange pointer-events-none z-10" />
        <div className="fixed inset-y-0 right-0 w-[3px] bg-gradient-to-b from-syndikate-orange/70 via-syndikate-red/40 to-transparent shadow-neon-orange pointer-events-none z-10" />
        <div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-syndikate-orange/80 to-transparent pointer-events-none z-10" />

        <Header />
        <main className="pt-24 md:pt-20 pb-16 relative z-20">
          {/* Hero Section */}
          <section className="py-12 md:py-20 relative overflow-hidden">
            <div className="container mx-auto px-4 relative">
              <div className="text-center mb-12 md:mb-16">
                <div className="flex items-center gap-3 justify-center mb-6">
                  <div className="w-12 h-12 bg-syndikate-orange brutal-border flex items-center justify-center shadow-neon-orange">
                    <Trophy className="h-6 w-6 text-background" />
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-bold text-foreground tracking-wider uppercase">
                    РЕЙТИНГ EPC
                  </h1>
                </div>
                <div className="h-[2px] w-20 bg-syndikate-orange mx-auto mb-6"></div>
                <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed font-mono uppercase tracking-wider px-4">
                  СИСТЕМА RPS ОТСЛЕЖИВАЕТ НАВЫКИ КАЖДОГО ИГРОКА
                </p>
              </div>

              {/* Statistics Cards */}
              <div className="grid md:grid-cols-3 gap-6 mb-16 max-w-4xl mx-auto">
                <div className="brutal-metal brutal-border p-6 text-center transition-all duration-300 hover:shadow-neon-orange">
                  <div className="w-12 h-12 bg-syndikate-orange brutal-border flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6 text-background" />
                  </div>
                  <div className="text-3xl font-bold text-syndikate-orange mb-2">
                    {allPlayers.length}
                  </div>
                  <div className="text-sm text-muted-foreground uppercase tracking-wider font-mono">Всего игроков</div>
                </div>
                
                <div className="brutal-metal brutal-border p-6 text-center transition-all duration-300 hover:shadow-neon-orange">
                  <div className="w-12 h-12 bg-syndikate-orange brutal-border flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-6 h-6 text-background" />
                  </div>
                  <div className="text-3xl font-bold text-syndikate-orange mb-2">
                    {allPlayers.reduce((sum, player) => sum + player.games_played, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground uppercase tracking-wider font-mono">Партий сыграно</div>
                </div>
                
                <div className="brutal-metal brutal-border p-6 text-center transition-all duration-300 hover:shadow-neon-orange">
                  <div className="w-12 h-12 bg-syndikate-orange brutal-border flex items-center justify-center mx-auto mb-4">
                    <Star className="w-6 h-6 text-background" />
                  </div>
                  <div className="text-3xl font-bold text-syndikate-orange mb-2">
                    {topPlayers[0]?.elo_rating || 100}
                  </div>
                  <div className="text-sm text-muted-foreground uppercase tracking-wider font-mono">Лучший рейтинг</div>
                </div>
              </div>

              {/* Top Players - использую ту же структуру что на главной */}
              <div className="max-w-4xl mx-auto">
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
                  <>
                    {/* Champion */}
                    {topPlayers[0] && (() => {
                      const championRankData = getEffectiveMafiaRank({
                        gamesPlayed: topPlayers[0].games_played,
                        wins: topPlayers[0].wins,
                        rating: topPlayers[0].elo_rating
                      }, topPlayers[0].manual_rank);
                      const championRank = championRankData.rank;
                      
                      return (
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
                              <div className="flex-shrink-0">
                                <div className="relative">
                                  {topPlayers[0].avatar_url ? (
                                    <img 
                                      src={fixStorageUrl(topPlayers[0].avatar_url)} 
                                      alt={topPlayers[0].name}
                                      className="w-16 h-16 border-2 border-syndikate-orange object-cover"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 brutal-metal brutal-border flex items-center justify-center text-2xl">
                                      👑
                                    </div>
                                  )}
                                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-syndikate-orange brutal-border flex items-center justify-center shadow-neon-orange">
                                    <Crown className="w-3 h-3 text-background" />
                                  </div>
                                  {/* Rank avatar badge */}
                                  <div className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full overflow-hidden border-2 border-syndikate-orange bg-background">
                                    <img 
                                      src={championRank.avatar} 
                                      alt={championRank.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="flex-grow">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <h3 className="text-2xl font-bold text-foreground tracking-wider uppercase">
                                    {topPlayers[0].name}
                                  </h3>
                                  <div className={`px-3 py-1 brutal-border ${championRank.bgGradient}`}>
                                    <span className="text-background text-sm font-bold tracking-wider uppercase">{championRank.name}</span>
                                  </div>
                                  {championRankData.isManual && (
                                    <div className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30">
                                      <span className="text-amber-400 text-xs font-bold uppercase">Назначен</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-6 text-sm text-muted-foreground font-mono uppercase">
                                  <span>{topPlayers[0].games_played} ИГР</span>
                                  <span>{getWinRate(topPlayers[0].wins, topPlayers[0].games_played)}% ПОБЕД</span>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-3xl font-bold text-syndikate-orange mb-1">
                                  {topPlayers[0].elo_rating}
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
                      );
                    })()}

                    {/* Positions 2-5 */}
                    <div className="space-y-4">
                      {topPlayers.slice(1).map((player, index) => {
                        const position = index + 2;
                        const playerRankData = getEffectiveMafiaRank({
                          gamesPlayed: player.games_played,
                          wins: player.wins,
                          rating: player.elo_rating
                        }, player.manual_rank);
                        const playerRank = playerRankData.rank;
                        
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
                                  <div className="flex items-center justify-center w-10 h-10">
                                    {position === 2 && (
                                      <div className="w-8 h-8 brutal-metal-light brutal-border flex items-center justify-center">
                                        <Medal className="w-5 h-5 text-syndikate-orange" />
                                      </div>
                                    )}
                                    {position === 3 && (
                                      <div className="w-8 h-8 brutal-metal-light brutal-border flex items-center justify-center">
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

                                  <div className="relative">
                                    {player.avatar_url ? (
                                      <img 
                                        src={fixStorageUrl(player.avatar_url)} 
                                        alt={player.name}
                                        className="w-12 h-12 border-2 border-syndikate-orange object-cover"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 brutal-metal brutal-border flex items-center justify-center text-lg">
                                        {getPokerAvatar(player.name)}
                                      </div>
                                    )}
                                    {/* Rank avatar badge */}
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full overflow-hidden border-2 border-syndikate-orange bg-background">
                                      <img 
                                        src={playerRank.avatar} 
                                        alt={playerRank.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <h4 className="text-lg font-bold text-foreground tracking-wider uppercase group-hover:text-syndikate-orange transition-colors duration-300">
                                        {player.name}
                                      </h4>
                                      <span className={`text-xs px-2 py-0.5 ${playerRank.bgGradient} text-white font-bold uppercase`}>
                                        {playerRank.name}
                                      </span>
                                      {playerRankData.isManual && (
                                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                                          Назначен
                                        </span>
                                      )}
                                    </div>
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

                                <div className="text-right">
                                  <div className="text-2xl font-bold mb-1 text-syndikate-orange transition-colors duration-300">
                                    {player.elo_rating}
                                  </div>
                                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono">RPS</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
}