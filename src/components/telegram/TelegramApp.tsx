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

  const fetchData = async () => {
    await Promise.all([
      fetchTournaments(),
      fetchPlayers(), 
      fetchUserStats()
    ]);
    setLoading(false);
  };

  const fetchTournaments = async () => {
    try {
      const { data: tournamentsData } = await supabase
        .from('tournaments')
        .select(`
          *,
          tournament_registrations(count)
        `)
        .eq('is_published', true)
        .order('start_time', { ascending: true });
      
      if (tournamentsData) {
        setTournaments(tournamentsData);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .order('elo_rating', { ascending: false })
        .limit(10);
      
      if (playersData) {
        setPlayers(playersData);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchUserStats = async () => {
    if (!telegramUser) return;
    
    try {
      const { data: userPlayer } = await supabase
        .from('players')
        .select('*')
        .eq('telegram_id', telegramUser.id.toString())
        .single();
      
      if (userPlayer) {
        setUserStats(userPlayer);
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
      const { data: existingRegistration } = await supabase
        .from('tournament_registrations')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('player_id', userStats.id)
        .single();

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
    <div className="space-y-4 pb-20">
      {/* Club Header */}
      <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 text-white border-amber-600/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-600/20 rounded-xl flex items-center justify-center">
              <Trophy className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-lg text-white">IPS Club</CardTitle>
              <CardDescription className="text-amber-200/80 text-sm">
                Премиальный покерный клуб
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-amber-400">{tournaments.length}</div>
              <div className="text-xs text-slate-300">Турниров</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-400">{players.length}+</div>
              <div className="text-xs text-slate-300">Игроков</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-400">24/7</div>
              <div className="text-xs text-slate-300">Открыт</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="cursor-pointer hover:bg-slate-800/50 transition-colors border-slate-700 bg-slate-900/50" 
              onClick={() => setActiveTab('tournaments')}>
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 bg-amber-600/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-amber-400" />
            </div>
            <h3 className="font-medium text-white text-sm">Турниры</h3>
            <p className="text-xs text-slate-400">{tournaments.length} активных</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:bg-slate-800/50 transition-colors border-slate-700 bg-slate-900/50" 
              onClick={() => setActiveTab('rating')}>
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 bg-amber-600/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-400" />
            </div>
            <h3 className="font-medium text-white text-sm">Рейтинг</h3>
            <p className="text-xs text-slate-400">Топ игроков</p>
          </CardContent>
        </Card>
      </div>

      {/* User Stats */}
      {userStats && (
        <Card className="border-slate-700 bg-slate-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <User className="h-4 w-4 text-amber-400" />
              Ваша статистика
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-amber-400">{userStats.elo_rating}</div>
                <div className="text-xs text-slate-400">Рейтинг</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">{userStats.wins}</div>
                <div className="text-xs text-slate-400">Побед</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-400">{userStats.games_played}</div>
                <div className="text-xs text-slate-400">Игр</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ближайшие турниры */}
      <Card className="border-slate-700 bg-slate-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              Ближайшие турниры
            </span>
            <Button variant="ghost" size="sm" className="text-amber-400 text-xs h-8 px-2"
                    onClick={() => setActiveTab('tournaments')}>
              Все <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tournaments.slice(0, 3).map((tournament) => (
            <div key={tournament.id} 
                 className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="flex-1">
                <h4 className="font-medium text-white text-sm">{tournament.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">
                    {new Date(tournament.start_time).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-400">
                    {tournament.tournament_registrations?.[0]?.count || 0}/{tournament.max_players}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="bg-amber-600/20 text-amber-400 border-amber-600/20 text-xs">
                  {tournament.buy_in}₽
                </Badge>
              </div>
            </div>
          ))}
          {tournaments.length === 0 && (
            <div className="text-center py-6 text-slate-400">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Нет запланированных турниров</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderTournaments = () => (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Турниры</h2>
        <Badge variant="outline" className="border-amber-600/50 text-amber-400 bg-amber-600/10">
          {tournaments.length} турниров
        </Badge>
      </div>
      
      {tournaments.map((tournament) => (
        <Card key={tournament.id} className="border-slate-700 bg-slate-900/50">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base text-white">{tournament.name}</CardTitle>
                <CardDescription className="text-slate-400 text-sm">
                  {new Date(tournament.start_time).toLocaleString('ru-RU', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </CardDescription>
              </div>
              <Badge variant={tournament.status === 'running' ? 'default' : 'secondary'}
                     className={tournament.status === 'running' 
                       ? 'bg-green-600/20 text-green-400 border-green-600/20' 
                       : 'bg-slate-600/20 text-slate-400 border-slate-600/20'}>
                {tournament.status === 'scheduled' ? 'Скоро' : 
                 tournament.status === 'running' ? 'Идет' : tournament.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-400">Бай-ин</p>
                <p className="font-semibold text-amber-400">{tournament.buy_in}₽</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Игроки</p>
                <p className="font-semibold text-white">
                  {tournament.tournament_registrations?.[0]?.count || 0}/{tournament.max_players}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Фишки</p>
                <p className="font-semibold text-white">{tournament.starting_chips.toLocaleString()}</p>
              </div>
            </div>
            
            {tournament.description && (
              <p className="text-sm text-slate-300 mb-3">{tournament.description}</p>
            )}
            
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs">
                {tournament.tournament_format || 'Freezeout'}
              </Badge>
              {tournament.rebuy_cost && tournament.rebuy_cost > 0 && (
                <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs">
                  Ребай {tournament.rebuy_cost}₽
                </Badge>
              )}
              {tournament.addon_cost && tournament.addon_cost > 0 && (
                <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs">
                  Аддон {tournament.addon_cost}₽
                </Badge>
              )}
            </div>
            
            {tournament.status === 'scheduled' && (
              <Button 
                onClick={() => registerForTournament(tournament.id)}
                disabled={registering === tournament.id}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white border-0" 
                size="sm"
              >
                {registering === tournament.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Регистрируем...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Записаться на турнир
                  </>
                )}
              </Button>
            )}
            
            {tournament.status === 'running' && (
              <Button variant="outline" className="w-full border-green-600/50 text-green-400 hover:bg-green-600/10" size="sm">
                <Trophy className="h-4 w-4 mr-2" />
                Следить за турниром
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
      
      {tournaments.length === 0 && (
        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-600" />
            <h3 className="text-lg font-medium text-white mb-2">Нет активных турниров</h3>
            <p className="text-slate-400 text-sm">Следите за обновлениями в нашем канале</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderRating = () => (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Рейтинг игроков</h2>
        <Badge variant="outline" className="border-amber-600/50 text-amber-400 bg-amber-600/10">
          Топ {players.length}
        </Badge>
      </div>
      
      {/* Podium for top 3 */}
      {players.length >= 3 && (
        <Card className="border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900/20 mb-6">
          <CardContent className="p-4">
            <div className="flex items-end justify-center gap-4">
              {/* 2nd place */}
              <div className="text-center">
                <div className="w-16 h-12 bg-slate-600 rounded-t-lg flex items-end justify-center mb-2 relative">
                  <div className="absolute -top-2 w-8 h-8 bg-slate-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                </div>
                <Avatar className="w-10 h-10 mx-auto mb-1 border-2 border-slate-500">
                  <AvatarImage src={players[1]?.avatar_url} />
                  <AvatarFallback className="bg-slate-600 text-white text-sm">
                    {players[1]?.name?.[0] || 'P'}
                  </AvatarFallback>
                </Avatar>
                <p className="text-xs text-white font-medium">{players[1]?.name}</p>
                <p className="text-xs text-slate-400">{players[1]?.elo_rating}</p>
              </div>
              
              {/* 1st place */}
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-600 rounded-t-lg flex items-end justify-center mb-2 relative">
                  <div className="absolute -top-2 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                    <Trophy className="h-4 w-4 text-white" />
                  </div>
                </div>
                <Avatar className="w-12 h-12 mx-auto mb-1 border-2 border-amber-500">
                  <AvatarImage src={players[0]?.avatar_url} />
                  <AvatarFallback className="bg-amber-600 text-white">
                    {players[0]?.name?.[0] || 'P'}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm text-white font-bold">{players[0]?.name}</p>
                <p className="text-xs text-amber-400 font-semibold">{players[0]?.elo_rating}</p>
              </div>
              
              {/* 3rd place */}
              <div className="text-center">
                <div className="w-16 h-8 bg-amber-800 rounded-t-lg flex items-end justify-center mb-2 relative">
                  <div className="absolute -top-2 w-8 h-8 bg-amber-700 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                </div>
                <Avatar className="w-10 h-10 mx-auto mb-1 border-2 border-amber-700">
                  <AvatarImage src={players[2]?.avatar_url} />
                  <AvatarFallback className="bg-amber-700 text-white text-sm">
                    {players[2]?.name?.[0] || 'P'}
                  </AvatarFallback>
                </Avatar>
                <p className="text-xs text-white font-medium">{players[2]?.name}</p>
                <p className="text-xs text-slate-400">{players[2]?.elo_rating}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Full rating list */}
      {players.map((player, index) => (
        <Card key={player.id} className="border-slate-700 bg-slate-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                index === 0 ? 'bg-amber-600 text-white' :
                index === 1 ? 'bg-slate-500 text-white' :
                index === 2 ? 'bg-amber-700 text-white' :
                'bg-slate-600 text-slate-300'
              }`}>
                {index < 3 ? (
                  index === 0 ? <Trophy className="h-4 w-4" /> : index + 1
                ) : (
                  index + 1
                )}
              </div>
              <Avatar className="w-10 h-10">
                <AvatarImage src={player.avatar_url} />
                <AvatarFallback className="bg-slate-600 text-white">
                  {player.name?.[0] || 'P'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-white">{player.name}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{player.games_played} игр</span>
                  <span>•</span>
                  <span className="text-green-400">{player.wins} побед</span>
                  <span>•</span>
                  <span>{player.games_played > 0 ? Math.round((player.wins / player.games_played) * 100) : 0}%</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-amber-400">{player.elo_rating}</div>
                <div className="text-xs text-slate-400">ELO</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {players.length === 0 && (
        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="text-center py-12">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-slate-600" />
            <h3 className="text-lg font-medium text-white mb-2">Рейтинг пуст</h3>
            <p className="text-slate-400 text-sm">Сыграйте свой первый турнир!</p>
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