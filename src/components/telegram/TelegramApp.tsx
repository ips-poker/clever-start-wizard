import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Calendar, 
  Users, 
  Star, 
  MessageSquare, 
  User,
  Home,
  TrendingUp,
  Clock,
  MapPin,
  Coins,
  ChevronRight,
  Award,
  Target,
  CheckCircle,
  UserPlus,
  Loader2,
  Settings,
  ArrowLeft,
  HelpCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TelegramAuth } from './TelegramAuth';
import { toast } from 'sonner';

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
  tournament_registrations?: Array<{ count: number }>;
}

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  avatar_url?: string;
  created_at?: string;
  telegram_id?: string;
  telegram_username?: string;
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
    const tournamentsChannel = supabase
      .channel('tournaments-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournaments' },
        () => fetchTournaments()
      )
      .subscribe();

    const playersChannel = supabase
      .channel('players-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        (payload) => {
          fetchPlayers();
          if (telegramUser && payload.new && (payload.new as any).telegram_id === telegramUser.id.toString()) {
            setUserStats(payload.new as Player);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tournamentsChannel);
      supabase.removeChannel(playersChannel);
    };
  };

  const handleAuthComplete = (user: TelegramUser) => {
    setTelegramUser(user);
    setIsAuthenticated(true);
  };

  const fetchData = async (): Promise<void> => {
    try {
      await Promise.all([
        fetchTournaments(),
        fetchPlayers(), 
        fetchUserStats()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const fetchTournaments = async (): Promise<void> => {
    try {
      const { data } = await supabase
        .from('tournaments')
        .select(`
          *,
          tournament_registrations(count)
        `)
        .eq('is_published', true)
        .order('start_time', { ascending: true });
      
      if (data) {
        setTournaments(data as Tournament[]);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const fetchPlayers = async (): Promise<void> => {
    try {
      const { data } = await supabase
        .from('players')
        .select('*')
        .order('elo_rating', { ascending: false })
        .limit(10);
      
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
      const supabaseUrl = 'https://mokhssmnorrhohrowxvu.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1va2hzc21ub3JyaG9ocm93eHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODUzNDYsImV4cCI6MjA2ODY2MTM0Nn0.ZWYgSZFeidY0b_miC7IyfXVPh1EUR2WtxlEvt_fFmGc';
      
      const response = await fetch(`${supabaseUrl}/rest/v1/players?telegram_id=eq.${telegramId}&select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const players = await response.json();
        const playerData = players?.[0];
        
        if (playerData) {
          setUserStats(playerData);
        }
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
      const { data: existingRegistration, error: checkError } = await supabase
        .from('tournament_registrations')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('player_id', userStats.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingRegistration) {
        toast.info("Вы уже зарегистрированы на этот турнир");
        return;
      }

      const { error } = await supabase
        .from('tournament_registrations')
        .insert({
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

  // Poker Chip Component
  const PokerChip = ({ className = "w-12 h-12" }) => (
    <div className={`${className} bg-gradient-chip rounded-full border-2 border-poker-gray-700 shadow-card flex items-center justify-center relative overflow-hidden`}>
      <div className="absolute inset-1 rounded-full border border-poker-gray-600 opacity-50" />
      <div className="w-2 h-2 bg-poker-gray-600 rounded-full" />
    </div>
  );

  const renderHome = () => (
    <div className="min-h-screen bg-poker-black text-poker-white pb-20">
      {/* Main Club Card */}
      <Card className="m-4 bg-gradient-red-card border-0 shadow-red text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">О КЛУБЕ</h1>
              <p className="text-sm opacity-90">Info</p>
            </div>
            <PokerChip className="w-16 h-16" />
          </div>
        </CardContent>
      </Card>

      {/* Check Check Legends */}
      <Card className="mx-4 mb-4 bg-poker-gray-900 border-0 shadow-card" onClick={() => setActiveTab('legends')}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">CHECK CHECK</h2>
              <h3 className="text-lg font-semibold text-white mb-2">LEGENDS</h3>
              <p className="text-sm text-poker-gray-400 flex items-center">
                <Trophy className="w-4 h-4 mr-2" />
                Общий рейтинг
              </p>
            </div>
            <PokerChip className="w-14 h-14" />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4 mx-4 mb-4">
        <Card className="bg-poker-gray-900 border-0 shadow-card" onClick={() => setActiveTab('qa')}>
          <CardContent className="p-4 text-center">
            <h3 className="text-lg font-bold text-white">Q&A</h3>
          </CardContent>
        </Card>
        
        <Card className="bg-poker-gray-900 border-0 shadow-card">
          <CardContent className="p-4 text-center">
            <h3 className="text-lg font-bold text-white">SUPPORT</h3>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Tournament */}
      <div className="mx-4 mb-4">
        <p className="text-poker-gray-400 text-sm mb-2">Ближайший турнир</p>
        
        <Card className="bg-poker-gray-900 border-0 shadow-card" onClick={() => setActiveTab('tournaments')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">
                  {tournaments[0]?.name || "PHOENIX TOURNAMENT"}
                </h3>
                <div className="flex items-center text-poker-gray-400 text-sm">
                  <Users className="w-4 h-4 mr-2" />
                  <span className="mr-4">
                    {tournaments[0]?.tournament_registrations?.[0]?.count || 0}/{tournaments[0]?.max_players || 0}
                  </span>
                  <Clock className="w-4 h-4 mr-2" />
                  <span>
                    {tournaments[0] ? 
                      new Date(tournaments[0].start_time).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 
                      "24.09 / 19:00"
                    }
                  </span>
                </div>
              </div>
              <PokerChip className="w-14 h-14" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderLegends = () => (
    <div className="min-h-screen bg-poker-black text-poker-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-poker-gray-800">
        <ArrowLeft className="w-6 h-6 cursor-pointer" onClick={() => setActiveTab('home')} />
        <h1 className="text-lg font-semibold">Check-Check</h1>
        <div></div>
      </div>

      <div className="p-4">
        <h2 className="text-3xl font-bold text-white mb-1">ЛЕГЕНДЫ</h2>
        <h3 className="text-3xl font-bold text-white mb-6">CHECK CHECK</h3>

        {/* Rating Tabs */}
        <Tabs defaultValue="rating" className="mb-6">
          <TabsList className="grid grid-cols-3 bg-poker-gray-900 border-0">
            <TabsTrigger 
              value="newbies" 
              className="data-[state=active]:bg-poker-red data-[state=active]:text-white text-poker-gray-400"
            >
              Новички
            </TabsTrigger>
            <TabsTrigger 
              value="popular" 
              className="data-[state=active]:bg-poker-red data-[state=active]:text-white text-poker-gray-400"
            >
              Популярные
            </TabsTrigger>
            <TabsTrigger 
              value="rating" 
              className="data-[state=active]:bg-poker-red data-[state=active]:text-white text-poker-gray-400"
            >
              Рейтинг
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rating" className="space-y-3">
            {players.map((player, index) => (
              <div key={player.id} className="flex items-center justify-between p-4 bg-poker-gray-900 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-poker-blue rounded-full"></div>
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={player.avatar_url} />
                    <AvatarFallback className="bg-poker-gray-700 text-white">
                      {player.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-white">{player.name}</span>
                </div>
                
                <div className="flex items-center space-x-6">
                  <span className="text-poker-gray-400">0</span>
                  <span className="text-poker-gold font-bold">{player.elo_rating}</span>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  const renderQA = () => (
    <div className="min-h-screen bg-poker-black text-poker-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-poker-gray-800">
        <ArrowLeft className="w-6 h-6 cursor-pointer" onClick={() => setActiveTab('home')} />
        <h1 className="text-lg font-semibold">Check-Check</h1>
        <div></div>
      </div>

      <div className="p-4">
        <h2 className="text-3xl font-bold text-white mb-8">Q&A</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-3">1. Это законно?</h3>
            <p className="text-poker-gray-400 text-sm leading-relaxed">
              Да, совершенно законно, наш клуб составлен как НП-организация в СНГ, согласно статьи 1 п.4 
              закона о НП-организации в РФ, согласно статьи 265 4 п.1-0 постановление по регистрации 
              покерных клубов в комиссии по НП. В России разрешена игра в покер как интеллектуальный спорт.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white mb-3">2. Если нет призов, зачем играть?</h3>
            <p className="text-poker-gray-400 text-sm leading-relaxed">
              Мы обеспечиваем исключительно турнирную борьбу игроков, призов не предусмотрено, игроки 
              приходят исключительно в игру турниров исключительно, призов не предусмотрено собой покер как 
              спорт клубом в турнире и в 10000 рай вон не призов собой слабых!
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white mb-3">3. Что такое рейтинг?</h3>
            <p className="text-poker-gray-400 text-sm leading-relaxed">
              Рейтинговая система, которая подсчитывает ваш общая покерная состав 
              рейтинговой игровой. Он служит целям определить предпочтительное место...
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTournaments = () => (
    <div className="min-h-screen bg-poker-black text-poker-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-poker-gray-800">
        <ArrowLeft className="w-6 h-6 cursor-pointer" onClick={() => setActiveTab('home')} />
        <h1 className="text-lg font-semibold">Турниры</h1>
        <div></div>
      </div>

      <div className="p-4 space-y-4">
        {tournaments.map((tournament) => (
          <Card key={tournament.id} className="bg-poker-gray-900 border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">{tournament.name}</h3>
                  <div className="flex items-center text-poker-gray-400 text-sm mb-2">
                    <Users className="w-4 h-4 mr-2" />
                    <span className="mr-4">
                      {tournament.tournament_registrations?.[0]?.count || 0} чел.
                    </span>
                    <Clock className="w-4 h-4 mr-2" />
                    <span>
                      {new Date(tournament.start_time).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <Button 
                    onClick={() => registerForTournament(tournament.id)}
                    disabled={registering === tournament.id}
                    className="bg-poker-red hover:bg-poker-red-dark text-white border-0 text-sm px-4 py-2"
                  >
                    {registering === tournament.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Регистрация
                  </Button>
                </div>
                <PokerChip className="w-14 h-14" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="min-h-screen bg-poker-black text-poker-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-poker-gray-800">
        <ArrowLeft className="w-6 h-6 cursor-pointer" onClick={() => setActiveTab('home')} />
        <h1 className="text-lg font-semibold">Профиль</h1>
        <div></div>
      </div>

      <div className="p-4">
        {userStats && (
          <>
            {/* Profile Header */}
            <div className="flex items-center space-x-4 mb-6">
              <Avatar className="w-16 h-16">
                <AvatarImage src={telegramUser?.photoUrl} />
                <AvatarFallback className="bg-poker-gray-700 text-white text-xl">
                  {userStats.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold text-white">{userStats.name} {userStats.elo_rating}</h2>
              </div>
            </div>

            {/* Rating Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Мой рейтинг</h3>
              
              <Tabs defaultValue="rating" className="mb-4">
                <TabsList className="grid grid-cols-3 bg-poker-gray-900 border-0">
                  <TabsTrigger 
                    value="newbies" 
                    className="data-[state=active]:bg-poker-red data-[state=active]:text-white text-poker-gray-400"
                  >
                    Новички
                  </TabsTrigger>
                  <TabsTrigger 
                    value="popular" 
                    className="data-[state=active]:bg-poker-red data-[state=active]:text-white text-poker-gray-400"
                  >
                    Популярные
                  </TabsTrigger>
                  <TabsTrigger 
                    value="rating" 
                    className="data-[state=active]:bg-poker-red data-[state=active]:text-white text-poker-gray-400"
                  >
                    Рейтинг
                  </TabsTrigger>
                </TabsList>

                <div className="text-center py-8">
                  <p className="text-poker-gray-400">Нет данных</p>
                </div>
              </Tabs>
            </div>

            {/* Game History */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">История игр</h3>
              <div className="text-center py-8">
                <p className="text-poker-gray-400">Нет данных</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Navigation Bar Component
  const NavigationBar = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-poker-gray-900 border-t border-poker-gray-800">
      <div className="flex items-center justify-around py-3">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center space-y-1 px-4 py-2 ${
            activeTab === 'home' ? 'text-white' : 'text-poker-gray-400'
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs">Главная</span>
        </button>
        
        <button
          onClick={() => setActiveTab('tournaments')}
          className={`flex flex-col items-center space-y-1 px-4 py-2 ${
            activeTab === 'tournaments' ? 'text-white' : 'text-poker-gray-400'
          }`}
        >
          <Trophy className="w-6 h-6" />
          <span className="text-xs">Турниры</span>
        </button>
        
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center space-y-1 px-4 py-2 ${
            activeTab === 'profile' ? 'text-white' : 'text-poker-gray-400'
          }`}
        >
          <Settings className="w-6 h-6" />
          <span className="text-xs">Профиль</span>
        </button>
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return <TelegramAuth onAuthComplete={handleAuthComplete} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-poker-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-poker-red" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-poker-black font-inter">
      {activeTab === 'home' && renderHome()}
      {activeTab === 'legends' && renderLegends()}
      {activeTab === 'qa' && renderQA()}
      {activeTab === 'tournaments' && renderTournaments()}
      {activeTab === 'profile' && renderProfile()}
      
      <NavigationBar />
    </div>
  );
};