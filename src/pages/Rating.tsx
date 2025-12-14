import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Trophy, TrendingUp, Users, Star } from "lucide-react";
import { FloatingParticles } from "@/components/ui/floating-particles";
import { ScrollProgress } from "@/components/ScrollProgress";
import { RankedPlayerModal } from "@/components/telegram/RankedPlayerModal";
import { RatingPodium } from "@/components/telegram/RatingPodium";
import { PlayerRatingCard } from "@/components/telegram/PlayerRatingCard";
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

// Removed getPokerAvatar - now using PlayerRatingCard component

export default function Rating() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [recentTournaments, setRecentTournaments] = useState<RecentTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
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

              {/* Top Players - Using components from mini-app */}
              <div className="max-w-4xl mx-auto">
                {allPlayers.length === 0 ? (
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
                    {/* Podium for top 3 */}
                    {allPlayers.length >= 3 && (
                      <div className="mb-8">
                        <RatingPodium 
                          topPlayers={allPlayers.slice(0, 3)}
                          onPlayerClick={(player) => setSelectedPlayer(player)}
                        />
                      </div>
                    )}

                    {/* Player cards for positions 4+ (or all if less than 3 players) */}
                    <div className="space-y-3">
                      {(allPlayers.length >= 3 ? allPlayers.slice(3) : allPlayers).map((player, index) => {
                        const actualRank = allPlayers.length >= 3 ? index + 4 : index + 1;
                        return (
                          <PlayerRatingCard
                            key={player.id}
                            player={player}
                            rank={actualRank}
                            index={index}
                            onClick={() => setSelectedPlayer(player)}
                          />
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

      {/* Player Modal */}
      {selectedPlayer && (
        <RankedPlayerModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </>
  );
}