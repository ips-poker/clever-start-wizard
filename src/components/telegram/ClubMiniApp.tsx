import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Trophy, 
  Calendar, 
  Users, 
  Star, 
  Home, 
  TrendingUp, 
  Clock, 
  Coins, 
  ChevronRight, 
  ArrowLeft,
  Download,
  Crown,
  Gem,
  Zap,
  Shield,
  Play,
  User,
  Loader2,
  Spade
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addToHomeScreen } from '@telegram-apps/sdk';
import { GlitchText } from '@/components/ui/glitch-text';
import { TournamentCard } from './TournamentCard';
import { RatingPodium } from './RatingPodium';
import { PlayerRatingCard } from './PlayerRatingCard';
import { TelegramPokerLobby } from './TelegramPokerLobby';
import { TelegramProfile } from './TelegramProfile';
import { CLAN_EMBLEMS } from '@/utils/clanEmblems';
import { motion } from 'framer-motion';

interface Club {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  emblem_id: number;
  primary_color: string;
  secondary_color?: string;
  total_rating: number | null;
}

interface Tournament {
  id: string;
  name: string;
  start_time: string;
  participation_fee: number;
  max_players: number;
  status: string;
  starting_chips: number;
  description?: string;
  tournament_format?: string;
  reentry_fee?: number;
  additional_fee?: number;
  tournament_registrations?: Array<{ count: number }>;
}

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  avatar_url?: string;
  manual_rank?: string | null;
}

interface TelegramUser {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
}

interface ClubMiniAppProps {
  club: Club;
  telegramUser: TelegramUser | null;
  userStats: Player | null;
  onBack: () => void;
  onStatsUpdate: (stats: Player) => void;
}

export function ClubMiniApp({ 
  club, 
  telegramUser, 
  userStats, 
  onBack,
  onStatsUpdate 
}: ClubMiniAppProps) {
  const [activeTab, setActiveTab] = useState('home');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [canAddToHomeScreen, setCanAddToHomeScreen] = useState(false);
  const [userRegistrations, setUserRegistrations] = useState<Set<string>>(new Set());
  const [isAtPokerTable, setIsAtPokerTable] = useState(false);
  const [playerBalance, setPlayerBalance] = useState(10000);

  const primaryColor = club.primary_color || '#ff6b35';
  const secondaryColor = club.secondary_color || '#000000';

  useEffect(() => {
    fetchData();
    setupRealtimeSubscriptions();
    
    // Check Add to Home Screen availability
    try {
      setCanAddToHomeScreen(addToHomeScreen.isAvailable());
    } catch (e) {
      console.log('addToHomeScreen not available');
    }
  }, [club.id]);

  useEffect(() => {
    if (userStats) {
      fetchUserRegistrations();
      fetchPlayerBalance();
    }
  }, [userStats]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchTournaments(),
        fetchPlayers()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const fetchTournaments = async () => {
    try {
      const { data } = await supabase
        .from('tournaments')
        .select('*, tournament_registrations(count)')
        .eq('clan_id', club.id)
        .eq('is_published', true)
        .or('is_archived.is.null,is_archived.eq.false')
        .not('status', 'in', '(finished,completed)')
        .order('start_time', { ascending: true });
      
      if (data) {
        setTournaments(data as Tournament[]);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      // Get club members
      const { data: members } = await supabase
        .from('clan_members')
        .select('player_id')
        .eq('clan_id', club.id);

      if (members && members.length > 0) {
        const playerIds = members.map(m => m.player_id);
        const { data } = await supabase
          .from('players')
          .select('*')
          .in('id', playerIds)
          .order('elo_rating', { ascending: false });
        
        if (data) {
          setPlayers(data as Player[]);
        }
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchUserRegistrations = async () => {
    if (!userStats) return;
    
    try {
      const { data } = await supabase
        .from('tournament_registrations')
        .select('tournament_id')
        .eq('player_id', userStats.id)
        .in('status', ['registered', 'confirmed', 'playing']);

      const registeredIds = new Set(data?.map(r => r.tournament_id) || []);
      setUserRegistrations(registeredIds);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    }
  };

  const fetchPlayerBalance = async () => {
    if (!userStats) return;
    
    try {
      const { data } = await supabase
        .from('diamond_wallets')
        .select('balance')
        .eq('player_id', userStats.id)
        .maybeSingle();
      
      if (data) {
        setPlayerBalance(data.balance);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const channel = supabase
      .channel(`club-${club.id}-updates`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournaments',
        filter: `clan_id=eq.${club.id}`
      }, () => fetchTournaments())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_registrations'
      }, () => {
        fetchTournaments();
        fetchUserRegistrations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAddToHomeScreen = () => {
    try {
      if (addToHomeScreen.isAvailable()) {
        addToHomeScreen();
        toast.success("Приложение добавлено на главный экран!");
      }
    } catch (error) {
      console.error('Error adding to home screen:', error);
    }
  };

  const registerForTournament = async (tournamentId: string) => {
    if (!userStats) {
      toast.error("Войдите в систему");
      return;
    }

    try {
      const { data, error } = await supabase.rpc('register_tournament_safe', {
        p_tournament_id: tournamentId,
        p_player_id: userStats.id
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result?.success) {
        toast.error(result?.error || 'Ошибка регистрации');
        return;
      }

      toast.success("Вы зарегистрированы на турнир!");
      await Promise.all([fetchTournaments(), fetchUserRegistrations()]);
    } catch (error: any) {
      toast.error(error.message || 'Ошибка регистрации');
    }
  };

  const getEmblemIcon = (emblemId: number) => {
    const emblem = CLAN_EMBLEMS.find(e => e.id === emblemId);
    return emblem?.icon || '🎰';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // If at poker table, show full-screen poker view
  if (isAtPokerTable) {
    return (
      <TelegramPokerLobby
        playerId={userStats?.id}
        playerName={userStats?.name || 'Гость'}
        playerAvatar={userStats?.avatar_url}
        playerBalance={playerBalance}
        onTableStateChange={setIsAtPokerTable}
        onBalanceUpdate={fetchPlayerBalance}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: secondaryColor }}>
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto" style={{ color: primaryColor }} />
          <p className="text-muted-foreground">Загрузка клуба...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: secondaryColor,
        '--club-primary': primaryColor,
        '--club-secondary': secondaryColor
      } as React.CSSProperties}
    >
      {/* Header with Club Branding */}
      <div 
        className="sticky top-0 z-50 backdrop-blur-xl border-b"
        style={{ 
          backgroundColor: `${secondaryColor}e6`,
          borderColor: `${primaryColor}20`
        }}
      >
        <div className="p-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Club Logo */}
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
            style={{ 
              backgroundColor: `${primaryColor}20`,
              border: `1px solid ${primaryColor}40`
            }}
          >
            {club.logo_url ? (
              <Avatar className="w-full h-full rounded-xl">
                <AvatarImage src={club.logo_url} alt={club.name} className="object-cover" />
                <AvatarFallback className="rounded-xl bg-transparent">
                  {getEmblemIcon(club.emblem_id)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <span>{getEmblemIcon(club.emblem_id)}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-black text-lg truncate">{club.name}</h1>
            <p className="text-xs text-muted-foreground">Покерный клуб</p>
          </div>

          {canAddToHomeScreen && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddToHomeScreen}
              className="flex-shrink-0"
              style={{ borderColor: `${primaryColor}40`, color: primaryColor }}
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pb-20">
        {activeTab === 'home' && (
          <div className="space-y-4 p-4">
            {/* Welcome Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card 
                className="overflow-hidden border"
                style={{ 
                  background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor})`,
                  borderColor: `${primaryColor}30`
                }}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                      style={{ backgroundColor: `${primaryColor}30` }}
                    >
                      {getEmblemIcon(club.emblem_id)}
                    </div>
                    <div>
                      <h2 className="text-xl font-black">Добро пожаловать!</h2>
                      <p className="text-sm text-muted-foreground">
                        {club.description || `Официальный клуб ${club.name}`}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center">
                      <div 
                        className="text-2xl font-black"
                        style={{ color: primaryColor }}
                      >
                        {players.length}
                      </div>
                      <div className="text-xs text-muted-foreground">Игроков</div>
                    </div>
                    <div className="text-center">
                      <div 
                        className="text-2xl font-black"
                        style={{ color: primaryColor }}
                      >
                        {tournaments.length}
                      </div>
                      <div className="text-xs text-muted-foreground">Турниров</div>
                    </div>
                    <div className="text-center">
                      <div 
                        className="text-2xl font-black"
                        style={{ color: primaryColor }}
                      >
                        {club.total_rating?.toLocaleString() || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Рейтинг</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                className="h-20 flex-col gap-2"
                style={{ 
                  backgroundColor: primaryColor,
                  color: 'white'
                }}
                onClick={() => setActiveTab('tournaments')}
              >
                <Trophy className="w-6 h-6" />
                <span>Турниры</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                style={{ borderColor: `${primaryColor}40` }}
                onClick={() => setIsAtPokerTable(true)}
              >
                <Play className="w-6 h-6" style={{ color: primaryColor }} />
                <span>Играть</span>
              </Button>
            </div>

            {/* Upcoming Tournaments */}
            {tournaments.length > 0 && (
              <div>
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: primaryColor }} />
                  Ближайшие турниры
                </h3>
                <div className="space-y-3">
                  {tournaments.slice(0, 3).map(tournament => (
                    <Card 
                      key={tournament.id}
                      className="overflow-hidden"
                      style={{ borderColor: `${primaryColor}20` }}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold">{tournament.name}</h4>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(tournament.start_time)}</span>
                            </div>
                          </div>
                          <Badge 
                            style={{ 
                              backgroundColor: `${primaryColor}20`,
                              color: primaryColor,
                              borderColor: `${primaryColor}40`
                            }}
                          >
                            {tournament.participation_fee}₽
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span>
                              {tournament.tournament_registrations?.[0]?.count || 0} / {tournament.max_players}
                            </span>
                          </div>
                          {userRegistrations.has(tournament.id) ? (
                            <Badge variant="outline" className="text-green-500 border-green-500/30">
                              ✓ Зарегистрирован
                            </Badge>
                          ) : (
                            <Button 
                              size="sm"
                              onClick={() => registerForTournament(tournament.id)}
                              style={{ backgroundColor: primaryColor }}
                            >
                              Регистрация
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tournaments' && (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-black flex items-center gap-2">
              <Trophy className="w-5 h-5" style={{ color: primaryColor }} />
              Турниры клуба
            </h2>
            
            {tournaments.length === 0 ? (
              <Card className="p-8 text-center" style={{ borderColor: `${primaryColor}20` }}>
                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-muted-foreground">Нет активных турниров</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {tournaments.map((tournament, index) => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    index={index}
                    isRegistered={userRegistrations.has(tournament.id)}
                    onRegister={() => registerForTournament(tournament.id)}
                    onClick={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'rating' && (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-black flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: primaryColor }} />
              Рейтинг клуба
            </h2>
            
            {players.length === 0 ? (
              <Card className="p-8 text-center" style={{ borderColor: `${primaryColor}20` }}>
                <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-muted-foreground">Нет участников клуба</p>
              </Card>
            ) : (
              <>
                {players.length >= 3 && (
                  <RatingPodium topPlayers={players.slice(0, 3)} onPlayerClick={() => {}} />
                )}
                <div className="space-y-2">
                  {players.map((player, index) => (
                    <PlayerRatingCard
                      key={player.id}
                      player={player}
                      rank={index + 1}
                      index={index}
                      isCurrentUser={player.id === userStats?.id}
                      onClick={() => {}}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <TelegramProfile
            telegramUser={telegramUser}
            userStats={userStats}
            onStatsUpdate={onStatsUpdate}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <div 
        className="fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t safe-area-inset-bottom"
        style={{ 
          backgroundColor: `${secondaryColor}f2`,
          borderColor: `${primaryColor}20`
        }}
      >
        <div className="flex justify-around py-2">
          {[
            { id: 'home', icon: Home, label: 'Главная' },
            { id: 'tournaments', icon: Trophy, label: 'Турниры' },
            { id: 'rating', icon: TrendingUp, label: 'Рейтинг' },
            { id: 'profile', icon: User, label: 'Профиль' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all
                ${activeTab === tab.id ? 'scale-105' : 'opacity-60'}
              `}
              style={{
                color: activeTab === tab.id ? primaryColor : undefined
              }}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
