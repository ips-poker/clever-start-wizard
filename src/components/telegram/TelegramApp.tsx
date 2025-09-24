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
  Loader2
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
    // Подписка на изменения турниров
    const tournamentsChannel = supabase
      .channel('tournaments-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournaments' },
        (payload) => {
          console.log('Tournament update:', payload);
          fetchTournaments();
        }
      )
      .subscribe();

    // Подписка на изменения игроков
    const playersChannel = supabase
      .channel('players-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        (payload) => {
          console.log('Player update:', payload);
          fetchPlayers();
          if (telegramUser && payload.new && (payload.new as any).telegram_id === telegramUser.id.toString()) {
            setUserStats(payload.new as Player);
          }
        }
      )
      .subscribe();

    // Подписка на изменения регистраций на турниры
    const registrationsChannel = supabase
      .channel('registrations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament_registrations' },
        (payload) => {
          console.log('Registration update:', payload);
          fetchTournaments();
        }
      )
      .subscribe();

    // Очистка подписок при размонтировании
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
      // Используем простой fetch для избежания проблем с типизацией
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
      // Проверяем, не зарегистрирован ли уже пользователь
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

      // Регистрируем пользователя на турнир
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

      // Обновляем данные турниров
      fetchTournaments();
    } catch (error) {
      console.error('Error registering for tournament:', error);
      toast.error("Не удалось зарегистрироваться на турнир");
    } finally {
      setRegistering(null);
    }
  };

  const renderHome = () => (
    <div className="space-y-6 pb-20 px-4">
      {/* Club Header - Modern Poker Style */}
      <Card className="bg-gradient-poker-red border-0 shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 opacity-10">
          <Trophy className="h-24 w-24" />
        </div>
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">О КЛУБЕ</h1>
              <p className="text-white/80 text-sm">Премиальный покерный клуб</p>
            </div>
          </div>
          <p className="text-white/90 text-sm leading-relaxed">
            Добро пожаловать в элитный мир покера. Профессиональная игра, честные турниры, крупные призы.
          </p>
        </CardContent>
      </Card>

      {/* Main Action Cards */}
      <div className="space-y-4">
        {/* Check Check Legends */}
        <Card className="bg-gradient-poker-dark border border-poker-gray-light/20 overflow-hidden cursor-pointer 
                       hover:scale-[1.02] transition-transform duration-200" 
              onClick={() => setActiveTab('rating')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-poker-gray-light/20 rounded-xl flex items-center justify-center">
                <Star className="h-7 w-7 text-poker-gold" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">CHECK CHECK</h3>
                <h3 className="text-lg font-bold text-white">LEGENDS</h3>
                <p className="text-poker-gold text-sm mt-1">Общий рейтинг</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Q&A Section */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-poker-dark border border-poker-gray-light/20 cursor-pointer 
                         hover:scale-[1.02] transition-transform duration-200" 
                onClick={() => setActiveTab('qa')}>
            <CardContent className="p-4 text-center">
              <MessageSquare className="h-8 w-8 text-white mx-auto mb-2" />
              <h3 className="text-white font-semibold">Q&A</h3>
            </CardContent>
          </Card>

          <Card className="bg-gradient-poker-dark border border-poker-gray-light/20 cursor-pointer 
                         hover:scale-[1.02] transition-transform duration-200">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-white mx-auto mb-2" />
              <h3 className="text-white font-semibold">SUPPORT</h3>
            </CardContent>
          </Card>
        </div>

        {/* Tournament Section */}
        <Card className="bg-gradient-poker-red border-0 overflow-hidden cursor-pointer 
                       hover:scale-[1.02] transition-transform duration-200 relative" 
              onClick={() => setActiveTab('tournaments')}>
          <div className="absolute top-0 right-0 opacity-20">
            <Coins className="h-20 w-20" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">Ближайший турнир</p>
                <h3 className="text-xl font-bold text-white">PHOENIX TOURNAMENT</h3>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-2 text-white/90">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">{tournaments.length > 0 ? 
                      `${tournaments[0]?.tournament_registrations?.[0]?.count || 0}/${tournaments[0]?.max_players}` : 
                      '0/0'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/90">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">{tournaments.length > 0 ? 
                      new Date(tournaments[0]?.start_time).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}) : 
                      '--:--'}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Stats - Minimalist */}
      {userStats && (
        <Card className="bg-gradient-poker-dark border border-poker-gray-light/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-semibold">Ваша статистика</h4>
              <Button variant="ghost" size="sm" className="text-poker-gold text-xs h-8 px-3">
                Подробнее
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div className="text-center">
                <div className="text-lg font-bold text-poker-gold">{userStats.elo_rating}</div>
                <div className="text-xs text-white/60">Рейтинг</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-poker-gold">{userStats.wins}</div>
                <div className="text-xs text-white/60">Побед</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-poker-gold">{userStats.games_played}</div>
                <div className="text-xs text-white/60">Игр</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderTournaments = () => (
    <div className="space-y-4 pb-20 px-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Турниры</h2>
      </div>
      
      {tournaments.map((tournament) => (
        <Card key={tournament.id} className="bg-gradient-poker-red border-0 overflow-hidden relative 
                                            hover:scale-[1.02] transition-transform duration-200">
          <div className="absolute top-0 right-0 opacity-10">
            <Coins className="h-20 w-20" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white uppercase tracking-wider">
                  {tournament.name}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-white/80">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {tournament.tournament_registrations?.[0]?.count || 0}/{tournament.max_players}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">
                      {new Date(tournament.start_time).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <Badge 
                variant={tournament.status === 'running' ? 'default' : 'secondary'}
                className={tournament.status === 'running' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white/20 text-white border-white/20'
                }
              >
                {tournament.status === 'scheduled' ? 'Скоро' : 
                 tournament.status === 'running' ? 'Идет' : tournament.status}
              </Badge>
            </div>
            
            <div className="space-y-3">
              <div>
                <h4 className="text-white font-semibold mb-2">Когда и где</h4>
                <div className="space-y-1 text-white/80 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>г. Уфа, Российская Сутолочная перулок 5-1</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(tournament.start_time).toLocaleDateString('ru-RU', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-2">Общие правила</h4>
                <div className="grid grid-cols-2 gap-4 text-sm text-white/80">
                  <div>
                    <span className="font-medium">Бай-ин:</span>
                    <div className="text-white font-bold">{tournament.buy_in}₽</div>
                  </div>
                  <div>
                    <span className="font-medium">Стартовые фишки:</span>
                    <div className="text-white font-bold">{tournament.starting_chips?.toLocaleString() || '10,000'}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-2">Особенности</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-white/20 text-white border-white/20 text-xs">
                    {tournament.tournament_format || 'Freezeout'}
                  </Badge>
                  {tournament.rebuy_cost && tournament.rebuy_cost > 0 && (
                    <Badge className="bg-white/20 text-white border-white/20 text-xs">
                      Ребай {tournament.rebuy_cost}₽
                    </Badge>
                  )}
                  {tournament.addon_cost && tournament.addon_cost > 0 && (
                    <Badge className="bg-white/20 text-white border-white/20 text-xs">
                      Аддон {tournament.addon_cost}₽
                    </Badge>
                  )}
                  <Badge className="bg-white/20 text-white border-white/20 text-xs">
                    Начальный рейтинг = 1000₽
                  </Badge>
                </div>
              </div>
            </div>

            {tournament.status === 'scheduled' && (
              <Button 
                onClick={() => registerForTournament(tournament.id)}
                disabled={registering === tournament.id}
                className="w-full bg-white text-poker-red hover:bg-white/90 font-semibold mt-4" 
                size="lg"
              >
                {registering === tournament.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Регистрируем...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    В список ожидания
                  </>
                )}
              </Button>
            )}
            
            {tournament.status === 'running' && (
              <Button 
                variant="outline" 
                className="w-full border-white/30 text-white hover:bg-white/10 mt-4" 
                size="lg"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Турнир в процессе
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
      
      {tournaments.length === 0 && (
        <Card className="bg-gradient-poker-dark border border-poker-gray-light/20">
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-poker-gray" />
            <h3 className="text-lg font-medium text-white mb-2">Нет активных турниров</h3>
            <p className="text-white/60 text-sm">Следите за обновлениями в нашем канале</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderRating = () => (
    <div className="space-y-4 pb-20 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">ЛЕГЕНДЫ</h1>
          <h2 className="text-2xl font-bold text-white">CHECK CHECK</h2>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-poker-gray-dark rounded-xl p-1">
          <button className="px-4 py-2 text-white bg-poker-red rounded-lg text-sm font-medium">
            Ежемесячно
          </button>
          <button className="px-4 py-2 text-white/60 text-sm font-medium">
            Полугодие
          </button>
          <button className="px-4 py-2 text-white/60 text-sm font-medium">
            Рейтинг
          </button>
        </div>
      </div>
      
      {/* Players List */}
      <div className="space-y-3">
        {players.map((player, index) => (
          <Card key={player.id} className="bg-gradient-poker-dark border border-poker-gray-light/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Position */}
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    index === 0 ? 'bg-poker-gold text-black' :
                    index === 1 ? 'bg-gray-300 text-black' :
                    index === 2 ? 'bg-amber-600 text-white' :
                    'bg-transparent border border-poker-gray text-white'
                  }`}>
                    {index + 1}
                  </div>
                  
                  {/* Avatar */}
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={player.avatar_url} />
                    <AvatarFallback className={`text-white text-sm font-semibold ${
                      index === 0 ? 'bg-poker-gold' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-amber-600' :
                      'bg-poker-gray'
                    }`}>
                      {player.name?.[0] || 'P'}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Player Info */}
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{player.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <span>{player.games_played} игр</span>
                    {player.games_played > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-green-400">{Math.round((player.wins / player.games_played) * 100)}% побед</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Rating */}
                <div className="text-right">
                  <div className="font-bold text-xl text-poker-gold">{player.elo_rating}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {players.length === 0 && (
        <Card className="bg-gradient-poker-dark border border-poker-gray-light/20">
          <CardContent className="text-center py-12">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-poker-gray" />
            <h3 className="text-lg font-medium text-white mb-2">Рейтинг пуст</h3>
            <p className="text-white/60 text-sm">Сыграйте свой первый турнир!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderQA = () => (
    <div className="space-y-4 pb-20">
      <h2 className="text-xl font-bold text-white mb-4">Вопросы и ответы</h2>
      
      <Card className="border-slate-700 bg-slate-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-amber-400" />
            Как записаться на турнир?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-300 text-sm leading-relaxed">
            Выберите турнир в разделе "Турниры" и нажмите кнопку "Записаться". 
            Подтвердите участие через администратора клуба или напишите в чат.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-700 bg-slate-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            Как работает рейтинговая система?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-300 text-sm leading-relaxed">
            Мы используем систему ELO для расчета рейтинга игроков. 
            Рейтинг изменяется в зависимости от результатов турниров и силы соперников.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-700 bg-slate-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <MapPin className="h-4 w-4 text-amber-400" />
            Контакты и адрес клуба
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-amber-600/20 rounded flex items-center justify-center">
                <MapPin className="h-3 w-3 text-amber-400" />
              </div>
              <p className="text-slate-300 text-sm">г. Москва, ул. Примерная, 123</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-amber-600/20 rounded flex items-center justify-center">
                <span className="text-amber-400 text-xs">📞</span>
              </div>
              <p className="text-slate-300 text-sm">+7 (999) 123-45-67</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-amber-600/20 rounded flex items-center justify-center">
                <Clock className="h-3 w-3 text-amber-400" />
              </div>
              <p className="text-slate-300 text-sm">Режим работы: 24/7</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-700 bg-slate-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-400" />
            Стоимость игр и услуг
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 text-sm">Турнир (бай-ин)</span>
              <span className="text-amber-400 font-medium text-sm">от 1000₽</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300 text-sm">Кэш-игра (час)</span>
              <span className="text-amber-400 font-medium text-sm">200₽</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300 text-sm">Напитки</span>
              <span className="text-green-400 font-medium text-sm">бесплатно</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-700 bg-slate-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-400" />
            Правила турниров
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-slate-300">
            <p>• Приходите за 15 минут до начала</p>
            <p>• Документы обязательны для участия</p>
            <p>• Мобильные телефоны на беззвучном режиме</p>
            <p>• Дресс-код: smart casual</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderProfile = () => {
    return (
      <div className="space-y-4 pb-20">
        <h2 className="text-xl font-bold text-white mb-4">Профиль</h2>
        
        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="w-16 h-16 border-2 border-amber-600/30">
                <AvatarImage src={userStats?.avatar_url || telegramUser?.photoUrl} />
                <AvatarFallback className="bg-amber-600/20 text-amber-400 text-lg font-bold">
                  {userStats?.name?.[0] || telegramUser?.firstName?.[0] || 'P'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {userStats?.name || [telegramUser?.firstName, telegramUser?.lastName].filter(Boolean).join(' ') || 'Игрок'}
                </h3>
                <p className="text-slate-400">
                  @{userStats?.telegram_username || telegramUser?.username || 'telegram_user'}
                </p>
                {userStats?.created_at && (
                  <p className="text-xs text-amber-400 mt-1">
                    Участник с {new Date(userStats.created_at).toLocaleDateString('ru-RU')}
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="font-bold text-lg text-amber-400">{userStats?.elo_rating || 1000}</div>
                <div className="text-xs text-slate-400">ELO Рейтинг</div>
              </div>
              <div className="text-center p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="font-bold text-lg text-green-400">{userStats?.wins || 0}</div>
                <div className="text-xs text-slate-400">Побед</div>
              </div>
              <div className="text-center p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="font-bold text-lg text-blue-400">{userStats?.games_played || 0}</div>
                <div className="text-xs text-slate-400">Турниров</div>
              </div>
            </div>
            
            {userStats && userStats.games_played > 0 && (
              <div className="mt-4 p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Процент побед:</span>
                  <span className="text-green-400 font-medium">
                    {Math.round((userStats.wins / userStats.games_played) * 100)}%
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              Достижения
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {userStats?.games_played && userStats.games_played >= 1 && (
                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700 text-center">
                  <Target className="h-6 w-6 mx-auto mb-1 text-blue-400" />
                  <p className="text-xs text-white font-medium">Первый турнир</p>
                </div>
              )}
              {userStats?.wins && userStats.wins >= 1 && (
                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700 text-center">
                  <Trophy className="h-6 w-6 mx-auto mb-1 text-amber-400" />
                  <p className="text-xs text-white font-medium">Первая победа</p>
                </div>
              )}
              {userStats?.games_played && userStats.games_played >= 10 && (
                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700 text-center">
                  <Star className="h-6 w-6 mx-auto mb-1 text-purple-400" />
                  <p className="text-xs text-white font-medium">Ветеран</p>
                </div>
              )}
              {userStats?.elo_rating && userStats.elo_rating >= 1500 && (
                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700 text-center">
                  <Award className="h-6 w-6 mx-auto mb-1 text-green-400" />
                  <p className="text-xs text-white font-medium">Мастер</p>
                </div>
              )}
            </div>
            {(!userStats || userStats.games_played === 0) && (
              <div className="text-center py-6 text-slate-400">
                <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Сыграйте турнир для получения достижений</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">Последние турниры</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 text-slate-400">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">История турниров пуста</p>
              <p className="text-xs text-slate-500 mt-1">Запишитесь на турнир, чтобы начать играть</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {!isAuthenticated ? (
        <TelegramAuth onAuthComplete={handleAuthComplete} />
      ) : (
        <div className="max-w-md mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-4 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-600 border-t-transparent"></div>
                </div>
              ) : (
                <>
                  <TabsContent value="home" className="mt-0">{renderHome()}</TabsContent>
                  <TabsContent value="tournaments" className="mt-0">{renderTournaments()}</TabsContent>
                  <TabsContent value="rating" className="mt-0">{renderRating()}</TabsContent>
                  <TabsContent value="qa" className="mt-0">{renderQA()}</TabsContent>
                  <TabsContent value="profile" className="mt-0">{renderProfile()}</TabsContent>
                </>
              )}
            </div>
            
            <TabsList className="fixed bottom-0 left-0 right-0 h-20 grid grid-cols-5 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 rounded-none">
              <TabsTrigger 
                value="home" 
                className="flex flex-col gap-1 data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-400 text-slate-400 border-0 rounded-none h-full"
              >
                <Home className="h-5 w-5" />
                <span className="text-xs">Главная</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tournaments" 
                className="flex flex-col gap-1 data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-400 text-slate-400 border-0 rounded-none h-full"
              >
                <Calendar className="h-5 w-5" />
                <span className="text-xs">Турниры</span>
              </TabsTrigger>
              <TabsTrigger 
                value="rating" 
                className="flex flex-col gap-1 data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-400 text-slate-400 border-0 rounded-none h-full"
              >
                <TrendingUp className="h-5 w-5" />
                <span className="text-xs">Рейтинг</span>
              </TabsTrigger>
              <TabsTrigger 
                value="qa" 
                className="flex flex-col gap-1 data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-400 text-slate-400 border-0 rounded-none h-full"
              >
                <MessageSquare className="h-5 w-5" />
                <span className="text-xs">Вопросы</span>
              </TabsTrigger>
              <TabsTrigger 
                value="profile" 
                className="flex flex-col gap-1 data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-400 text-slate-400 border-0 rounded-none h-full"
              >
                <User className="h-5 w-5" />
                <span className="text-xs">Профиль</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}
    </div>
  );
};