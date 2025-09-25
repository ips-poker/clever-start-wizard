import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Calendar, Users, Star, MessageSquare, User, Home, TrendingUp, Clock, MapPin, Coins, ChevronRight, Award, Target, CheckCircle, UserPlus, Loader2, Crown, Gem, Zap, Shield, Play, Pause, CircleDot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TelegramAuth } from './TelegramAuth';
import { toast } from 'sonner';
import epcLogo from '@/assets/epc-logo.png';

interface Tournament {
  id: string;
  name: string;
  start_time: string;
  buy_in: number;
  max_players: number;
  status: string;
  starting_chips: number;
  description?: string;
  tournament_format?: string;
  rebuy_cost?: number;
  addon_cost?: number;
  tournament_registrations?: Array<{
    count: number;
  }>;
}

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  avatar_url?: string;
  created_at?: string;
  telegram?: string;
}

interface TelegramUser {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
}

export const TelegramApp = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<Player | null>(null);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [registering, setRegistering] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && telegramUser) {
      fetchData();
      setupRealtimeSubscriptions();
    }
  }, [isAuthenticated, telegramUser]);

  const setupRealtimeSubscriptions = () => {
    const tournamentsChannel = supabase.channel('tournaments-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tournaments'
    }, payload => {
      console.log('Tournament update:', payload);
      fetchTournaments();
    }).subscribe();

    const playersChannel = supabase.channel('players-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'players'
    }, payload => {
      console.log('Player update:', payload);
      fetchPlayers();
      if (telegramUser && payload.new && (payload.new as any).telegram === telegramUser.id.toString()) {
        setUserStats(payload.new as Player);
      }
    }).subscribe();

    const registrationsChannel = supabase.channel('registrations-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tournament_registrations'
    }, payload => {
      console.log('Registration update:', payload);
      fetchTournaments();
    }).subscribe();

    return () => {
      supabase.removeChannel(tournamentsChannel);
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(registrationsChannel);
    };
  };

  const handleAuthComplete = (user: TelegramUser) => {
    setTelegramUser(user);
    setIsAuthenticated(true);
  };

  const fetchData = async (): Promise<void> => {
    try {
      await Promise.all([fetchTournaments(), fetchPlayers(), fetchUserStats()]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const fetchTournaments = async (): Promise<void> => {
    try {
      const { data } = await supabase.from('tournaments').select(`
          *,
          tournament_registrations(count)
        `).eq('is_published', true).order('start_time', {
        ascending: true
      });
      if (data) {
        setTournaments(data as Tournament[]);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const fetchPlayers = async (): Promise<void> => {
    try {
      const { data } = await supabase.from('players').select('*').order('elo_rating', {
        ascending: false
      }).limit(10);
      if (data) {
        setPlayers(data as Player[]);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchUserStats = async () => {
    if (!telegramUser) return;
    try {
      const telegramId = telegramUser.id.toString();
      const { data, error } = await supabase.from('players').select('*').eq('telegram', telegramId).maybeSingle();
      if (error) {
        console.error('Error fetching user stats:', error);
        return;
      }
      if (data) {
        setUserStats(data);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const registerForTournament = async (tournamentId: string) => {
    if (!telegramUser || !userStats) {
      toast.error("Не удалось найти данные пользователя");
      return;
    }
    setRegistering(tournamentId);
    try {
      const { data: existingRegistration, error: checkError } = await supabase.from('tournament_registrations').select('id').eq('tournament_id', tournamentId).eq('player_id', userStats.id).maybeSingle();
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      if (existingRegistration) {
        toast.info("Вы уже зарегистрированы на этот турнир");
        return;
      }

      const { error } = await supabase.from('tournament_registrations').insert({
        tournament_id: tournamentId,
        player_id: userStats.id,
        status: 'registered'
      });
      if (error) {
        throw error;
      }
      toast.success("Вы успешно зарегистрированы на турнир");
      fetchTournaments();
    } catch (error) {
      console.error('Error registering for tournament:', error);
      toast.error("Не удалось зарегистрироваться на турнир");
    } finally {
      setRegistering(null);
    }
  };

  const renderHome = () => (
    <div className="space-y-4 pb-20 px-4 bg-black min-h-screen">
      <Card className="bg-gradient-to-br from-red-600 to-red-800 border-0 overflow-hidden relative">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4">
            <Crown className="h-24 w-24" />
          </div>
        </div>
        
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden">
              <img src={epcLogo} alt="EPC Logo" className="w-12 h-12 object-contain" />
            </div>
            
            <div className="flex-1">
              <h1 className="text-2xl font-black text-white tracking-wide">О КЛУБЕ</h1>
            </div>
          </div>
          
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-white text-sm font-medium leading-relaxed">Общий рейтинг</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-0 overflow-hidden cursor-pointer hover:from-gray-700 hover:to-gray-800 transition-all duration-300" 
            onClick={() => setActiveTab('rating')}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-black text-white tracking-wide">CHECK CHECK</h3>
              <h3 className="text-xl font-black text-white tracking-wide -mt-1">LEGENDS</h3>
            </div>
            
            <div className="text-white/60">
              <ChevronRight className="h-5 w-5" />
            </div>
          </div>
          
          <div className="mt-4 bg-white/5 rounded-lg p-3">
            <p className="text-white/70 text-sm font-medium">Общий рейтинг</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-0 cursor-pointer hover:from-gray-700 hover:to-gray-800 transition-all duration-300" 
              onClick={() => setActiveTab('qa')}>
          <CardContent className="p-5 text-center">
            <h3 className="text-white font-black text-lg tracking-wide">Q&A</h3>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-0 cursor-pointer hover:from-gray-700 hover:to-gray-800 transition-all duration-300">
          <CardContent className="p-5 text-center">
            <h3 className="text-white font-black text-lg tracking-wide">SUPPORT</h3>
          </CardContent>
        </Card>
      </div>

      <div>
        <p className="text-white/70 text-sm font-medium mb-2 px-1">Ближайший турнир</p>
        
        <Card className="bg-gradient-to-br from-red-600 to-red-800 border-0 overflow-hidden cursor-pointer hover:from-red-500 hover:to-red-700 transition-all duration-300 relative" 
              onClick={() => setActiveTab('tournaments')}>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                {tournaments.length > 0 ? (
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-wide uppercase">
                      {tournaments[0].name.split(' ')[0] || 'PHOENIX'}
                    </h3>
                    <h3 className="text-2xl font-black text-white tracking-wide uppercase -mt-1">
                      {tournaments[0].name.split(' ').slice(1).join(' ') || 'TOURNAMENT'}
                    </h3>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-wide">PHOENIX</h3>
                    <h3 className="text-2xl font-black text-white tracking-wide -mt-1">TOURNAMENT</h3>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="flex items-center gap-2 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                <Users className="h-4 w-4 text-white" />
                <span className="text-white text-sm font-medium">
                  {tournaments.length > 0 ? `${tournaments[0]?.tournament_registrations?.[0]?.count || 0}/${tournaments[0]?.max_players}` : '509/500'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                <Clock className="h-4 w-4 text-white" />
                <span className="text-white text-sm font-medium">
                  {tournaments.length > 0 ? new Date(tournaments[0]?.start_time).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit'
                }) : '24:00/19:00'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {userStats && (
        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">
                  {telegramUser?.username || telegramUser?.firstName || 'Игрок'}
                </h3>
                <p className="text-white/60 text-sm">Мой рейтинг</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-white font-bold text-lg">{userStats.elo_rating}</div>
                <div className="text-white/60 text-xs">Месячно</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-white font-bold text-lg">{userStats.wins}</div>
                <div className="text-white/60 text-xs">Полугодие</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-white font-bold text-lg">{userStats.games_played}</div>
                <div className="text-white/60 text-xs">Рейтинг</div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-white/5 rounded-lg">
              <h4 className="text-white font-bold mb-2">История игр</h4>
              <p className="text-white/60 text-sm">Нет данных</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (!isAuthenticated) {
    return <TelegramAuth onAuthComplete={handleAuthComplete} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto bg-black min-h-screen">
      {activeTab === 'home' && renderHome()}
      {activeTab === 'tournaments' && (
        <div className="space-y-4 pb-20 px-4 bg-black min-h-screen">
          <h2 className="text-2xl font-black text-white tracking-wide p-4">ТУРНИРЫ</h2>
          {tournaments.map((tournament, index) => (
            <Card key={tournament.id} className="bg-gradient-to-br from-red-600 to-red-800 border-0">
              <CardContent className="p-6">
                <h3 className="text-xl font-black text-white tracking-wide uppercase mb-3">
                  {tournament.name}
                </h3>
                <div className="flex items-center gap-4 text-white/80 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">{tournament.tournament_registrations?.[0]?.count || 0}/{tournament.max_players}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">{new Date(tournament.start_time).toLocaleString('ru-RU')}</span>
                  </div>
                </div>
                {tournament.status === 'scheduled' && (
                  <Button 
                    onClick={() => registerForTournament(tournament.id)} 
                    disabled={registering === tournament.id} 
                    className="w-full bg-black/30 hover:bg-black/50 text-white font-bold py-3 rounded-lg"
                  >
                    {registering === tournament.id ? 'Регистрируем...' : 'В список ожидания'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {activeTab === 'rating' && (
        <div className="space-y-6 pb-20 px-4 bg-black min-h-screen">
          <h1 className="text-2xl font-black text-white tracking-wide p-4">ЛЕГЕНДЫ CHECK CHECK</h1>
          <div className="space-y-3">
            {players.map((player, index) => (
              <Card key={player.id} className="bg-gray-800 border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={player.avatar_url} />
                        <AvatarFallback className="bg-gray-600 text-white">{player.name?.[0] || 'P'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-white font-medium">{player.name}</h3>
                        <p className="text-white/60 text-sm">{player.games_played} игр</p>
                      </div>
                    </div>
                    <div className="text-white font-bold text-xl">{player.elo_rating}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'qa' && (
        <div className="space-y-6 pb-20 px-4 bg-black min-h-screen">
          <h2 className="text-2xl font-black text-white tracking-wide p-4">Q&A</h2>
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-white font-bold mb-2">1. Это законно?</h3>
              <p className="text-white/70 text-sm">Да, совершенно законно! Мы проводим турниры по техасскому холдему как хобби.</p>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700">
        <div className="max-w-lg mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 bg-transparent h-16">
              <TabsTrigger value="home" className="flex flex-col gap-1 text-white data-[state=active]:text-red-500">
                <Home className="h-5 w-5" />
                <span className="text-xs">Главная</span>
              </TabsTrigger>
              <TabsTrigger value="tournaments" className="flex flex-col gap-1 text-white data-[state=active]:text-red-500">
                <Trophy className="h-5 w-5" />
                <span className="text-xs">Турниры</span>
              </TabsTrigger>
              <TabsTrigger value="rating" className="flex flex-col gap-1 text-white data-[state=active]:text-red-500">
                <Star className="h-5 w-5" />
                <span className="text-xs">Рейтинг</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex flex-col gap-1 text-white data-[state=active]:text-red-500">
                <User className="h-5 w-5" />
                <span className="text-xs">Профиль</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  );
};