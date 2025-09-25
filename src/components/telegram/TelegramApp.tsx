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
    // Подписка на изменения турниров
    const tournamentsChannel = supabase.channel('tournaments-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tournaments'
    }, payload => {
      console.log('Tournament update:', payload);
      fetchTournaments();
    }).subscribe();

    // Подписка на изменения игроков
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

    // Подписка на изменения регистраций на турниры
    const registrationsChannel = supabase.channel('registrations-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tournament_registrations'
    }, payload => {
      console.log('Registration update:', payload);
      fetchTournaments();
    }).subscribe();

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
      await Promise.all([fetchTournaments(), fetchPlayers(), fetchUserStats()]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };
  const fetchTournaments = async (): Promise<void> => {
    try {
      const {
        data
      } = await supabase.from('tournaments').select(`
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
      const {
        data
      } = await supabase.from('players').select('*').order('elo_rating', {
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
      // Исправляем запрос - используем поле telegram вместо telegram_id
      const telegramId = telegramUser.id.toString();
      const {
        data,
        error
      } = await supabase.from('players').select('*').eq('telegram', telegramId).maybeSingle();
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
      // Проверяем, не зарегистрирован ли уже пользователь
      const {
        data: existingRegistration,
        error: checkError
      } = await supabase.from('tournament_registrations').select('id').eq('tournament_id', tournamentId).eq('player_id', userStats.id).maybeSingle();
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      if (existingRegistration) {
        toast.info("Вы уже зарегистрированы на этот турнир");
        return;
      }

      // Регистрируем пользователя на турнир
      const {
        error
      } = await supabase.from('tournament_registrations').insert({
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
  const renderHome = () => <div className="space-y-8 pb-20 px-4">
      {/* Modern Club Header */}
      <Card className="bg-gradient-to-br from-background to-muted border border-border/50 overflow-hidden relative">
        <CardContent className="p-8 relative z-10">
          <div className="flex items-center gap-6 mb-8">
            {/* Clean Logo */}
            <div className="relative">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center border border-primary/20 overflow-hidden">
                <img src={epcLogo} alt="EPC Logo" className="w-14 h-14 object-contain" />
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">EPC</h1>
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-medium text-muted-foreground -mt-1">Event Poker Club</h2>
              <p className="text-muted-foreground text-sm mt-2">Премиальный покерный клуб</p>
            </div>
          </div>
          
          <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-md">
            Добро пожаловать в мир профессионального покера. Честные турниры, крупные призы, дружелюбное сообщество.
          </p>
          
          {/* Clean Stats Grid */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
            {[{
            value: tournaments.length,
            label: "Турниров",
            icon: Trophy
          }, {
            value: `${players.length}+`,
            label: "Игроков",
            icon: Users
          }, {
            value: "24/7",
            label: "Онлайн",
            icon: Zap
          }].map((stat, index) => <div key={index} className="text-center p-4 bg-muted/50 rounded-2xl">
                <stat.icon className="h-5 w-5 text-primary mx-auto mb-3" />
                <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground font-medium mt-1">
                  {stat.label}
                </div>
              </div>)}
          </div>
        </CardContent>
      </Card>

      {/* Modern Action Cards */}
      <div className="space-y-6">
        {/* EPC Rating System - Clean Design */}
        <Card className="bg-card border border-border hover:shadow-lg transition-all duration-300 cursor-pointer group" 
              onClick={() => setActiveTab('rating')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                <Crown className="h-7 w-7 text-primary" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground mb-1">Рейтинг EPC</h3>
                <p className="text-muted-foreground text-sm">Система рейтинга клуба</p>
              </div>
              
              <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                <ChevronRight className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access Grid - Clean Design */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card border border-border hover:shadow-md transition-all duration-300 cursor-pointer" 
                onClick={() => setActiveTab('qa')}>
            <CardContent className="p-5 text-center">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="text-foreground font-medium text-base mb-1">Вопросы</h3>
              <p className="text-muted-foreground text-xs">Частые вопросы</p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border hover:shadow-md transition-all duration-300 cursor-pointer">
            <CardContent className="p-5 text-center">
              <div className="w-12 h-12 bg-green-500/10 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="text-foreground font-medium text-base mb-1">Поддержка</h3>
              <p className="text-muted-foreground text-xs">Помощь 24/7</p>
            </CardContent>
          </Card>
        </div>

        {/* Next Tournament Section - Clean Design */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 cursor-pointer 
                       hover:shadow-lg transition-all duration-300 group" onClick={() => setActiveTab('tournaments')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                  <p className="text-muted-foreground text-sm font-medium">Ближайший турнир</p>
                </div>
                {tournaments.length > 0 ? (
                  <div>
                    <h3 className="text-2xl font-semibold text-foreground mb-1">
                      {tournaments[0].name}
                    </h3>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-2xl font-semibold text-foreground mb-1">Скоро новый турнир</h3>
                  </div>
                )}
              </div>
              <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                <ChevronRight className="h-6 w-6" />
              </div>
            </div>
            
            {/* Clean Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Участники</span>
                  <span className="text-lg font-semibold text-foreground">
                    {tournaments.length > 0 ? `${tournaments[0]?.tournament_registrations?.[0]?.count || 0}/${tournaments[0]?.max_players}` : '0/100'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Начало</span>
                  <span className="text-lg font-semibold text-foreground">
                    {tournaments.length > 0 ? new Date(tournaments[0]?.start_time).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '20:00'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Statistics - Clean Design */}
      {userStats && <Card className="bg-card border border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-foreground font-semibold text-lg flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Crown className="h-4 w-4 text-primary" />
                </div>
                Ваша статистика
              </h4>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 
                               text-xs h-8 px-3 font-medium">
                Подробнее
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {[{
            value: userStats.elo_rating,
            label: "Рейтинг",
            icon: Star,
            color: "amber-500"
          }, {
            value: userStats.wins,
            label: "Побед",
            icon: Trophy,
            color: "green-500"
          }, {
            value: userStats.games_played,
            label: "Игр",
            icon: Target,
            color: "blue-500"
          }].map((stat, index) => <div key={index} className="text-center p-4 bg-muted/50 rounded-xl 
                                           border border-border hover:border-primary/30 
                                           transition-all duration-300">
                  <div className={`w-8 h-8 bg-${stat.color}/10 rounded-lg mx-auto mb-3 flex items-center justify-center`}>
                    <stat.icon className={`h-4 w-4 text-${stat.color}`} />
                  </div>
                  <div className={`text-xl font-semibold text-${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground font-medium mt-1">
                    {stat.label}
                  </div>
                </div>)}
            </div>
          </CardContent>
        </Card>}
    </div>;
  const renderTournaments = () => <div className="space-y-6 pb-20 px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Турниры</h2>
            <p className="text-muted-foreground text-sm">Предстоящие события</p>
          </div>
        </div>
      </div>
      
      {tournaments.map((tournament, index) => <Card key={tournament.id} className="bg-card border border-border hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            {/* Tournament Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant={tournament.status === 'running' ? 'default' : 'secondary'} 
                         className={`${tournament.status === 'running' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'} font-medium`}>
                    {tournament.status === 'scheduled' ? '📅 Запланирован' : tournament.status === 'running' ? '🔴 В процессе' : tournament.status}
                  </Badge>
                </div>
                
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  {tournament.name}
                </h3>
                
                <div className="flex items-center gap-6 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <Users className="h-4 w-4 text-blue-500" />
                    </div>
                    <span className="text-sm font-medium">
                      {tournament.tournament_registrations?.[0]?.count || 0}/{tournament.max_players}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                      <Clock className="h-4 w-4 text-orange-500" />
                    </div>
                    <span className="text-sm font-medium">
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
            </div>
            
            {/* Tournament Details Grid */}
            <div className="space-y-4">
              {/* Location & Date Card */}
              <div className="bg-muted/50 rounded-xl p-4">
                <h4 className="text-foreground font-medium mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Место и время
                </h4>
                <div className="space-y-2 text-muted-foreground text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-red-500/10 rounded-lg flex items-center justify-center">
                      <MapPin className="h-3 w-3 text-red-500" />
                    </div>
                    <span className="font-medium">г. Уфа, Российская Сутолочная перулок 5-1</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <Calendar className="h-3 w-3 text-blue-500" />
                    </div>
                    <span className="font-medium capitalize">{new Date(tournament.start_time).toLocaleDateString('ru-RU', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}</span>
                  </div>
                </div>
              </div>

              {/* Tournament Rules Card */}
              <div className="bg-muted/50 rounded-xl p-4">
                <h4 className="text-foreground font-medium mb-3 flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  Правила турнира
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-background rounded-lg p-3 border border-border">
                    <span className="text-muted-foreground font-medium block mb-1">Бай-ин</span>
                    <div className="text-lg font-semibold text-primary">{tournament.buy_in}₽</div>
                  </div>
                  <div className="bg-background rounded-lg p-3 border border-border">
                    <span className="text-muted-foreground font-medium block mb-1">Стартовые фишки</span>
                    <div className="text-lg font-semibold text-blue-500">{tournament.starting_chips?.toLocaleString() || '10,000'}</div>
                  </div>
                </div>
              </div>

              {/* Tournament Features */}
              <div className="bg-muted/50 rounded-xl p-4">
                <h4 className="text-foreground font-medium mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  Особенности
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-medium">
                    {tournament.tournament_format || 'Freezeout'}
                  </Badge>
                  {tournament.rebuy_cost && tournament.rebuy_cost > 0 && <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs font-medium">
                      Ребай {tournament.rebuy_cost}₽
                    </Badge>}
                  {tournament.addon_cost && tournament.addon_cost > 0 && <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs font-medium">
                      Аддон {tournament.addon_cost}₽
                    </Badge>}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              {tournament.status === 'scheduled' && <Button onClick={() => registerForTournament(tournament.id)} 
                         disabled={registering === tournament.id} 
                         className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-base py-3 rounded-xl" 
                         size="lg">
                  {registering === tournament.id ? <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Регистрируем...
                    </> : <>
                      <Crown className="h-4 w-4 mr-2" />
                      В список ожидания
                    </>}
                </Button>}
              
              {tournament.status === 'running' && <Button variant="outline" 
                         className="w-full border-green-500/40 text-green-500 hover:bg-green-500/10 font-medium text-base py-3 rounded-xl" 
                         size="lg">
                  <Play className="h-4 w-4 mr-2" />
                  Турнир в процессе
                </Button>}
            </div>
          </CardContent>
        </Card>)}
      
      {tournaments.length === 0 && <Card className="bg-card border border-border">
          <CardContent className="text-center py-16">
            <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Нет активных турниров</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
              Следите за обновлениями в нашем канале.<br />
              Новые турниры добавляются регулярно!
            </p>
          </CardContent>
        </Card>}
    </div>;
  const renderRating = () => <div className="space-y-6 pb-20 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Рейтинг EPC</h1>
          <p className="text-muted-foreground text-sm">Система рейтинга клуба</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-muted rounded-xl p-1">
          <button className="px-4 py-2 text-primary-foreground bg-primary rounded-lg text-sm font-medium">
            Ежемесячно
          </button>
          <button className="px-4 py-2 text-muted-foreground text-sm font-medium hover:text-foreground transition-colors">
            Полугодие
          </button>
          <button className="px-4 py-2 text-muted-foreground text-sm font-medium hover:text-foreground transition-colors">
            Общий
          </button>
        </div>
      </div>
      
      {/* Players List */}
      <div className="space-y-3">
        {players.map((player, index) => <Card key={player.id} className="bg-card border border-border hover:shadow-md transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Position */}
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                    index === 0 ? 'bg-amber-500 text-white' : 
                    index === 1 ? 'bg-slate-400 text-white' : 
                    index === 2 ? 'bg-amber-600 text-white' : 
                    'bg-muted text-muted-foreground border border-border'
                  }`}>
                    {index + 1}
                  </div>
                  
                  {/* Avatar */}
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={player.avatar_url} />
                    <AvatarFallback className={`text-white text-sm font-medium ${
                      index === 0 ? 'bg-amber-500' : 
                      index === 1 ? 'bg-slate-400' : 
                      index === 2 ? 'bg-amber-600' : 
                      'bg-muted-foreground'
                    }`}>
                      {player.name?.[0] || 'P'}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Player Info */}
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{player.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{player.games_played} игр</span>
                    {player.games_played > 0 && <>
                        <span>•</span>
                        <span className="text-green-500">{Math.round(player.wins / player.games_played * 100)}% побед</span>
                      </>}
                  </div>
                </div>

                {/* Rating */}
                <div className="text-right">
                  <div className="font-semibold text-xl text-primary">{player.elo_rating}</div>
                </div>
              </div>
            </CardContent>
          </Card>)}
      </div>
      
      {players.length === 0 && <Card className="bg-card border border-border">
          <CardContent className="text-center py-12">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">Рейтинг пуст</h3>
            <p className="text-muted-foreground text-sm">Сыграйте свой первый турнир!</p>
          </CardContent>
        </Card>}
    </div>;
  const renderQA = () => <div className="space-y-6 pb-20 px-4">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-2">Вопросы и ответы</h2>
        <p className="text-muted-foreground text-sm">Часто задаваемые вопросы</p>
      </div>
      
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Как записаться на турнир?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Выберите турнир в разделе "Турниры" и нажмите кнопку "В список ожидания". 
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
    </div>;
  const renderProfile = () => {
    return <div className="space-y-6 pb-20 px-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-white tracking-wider">ПРОФИЛЬ</h1>
        </div>
        
        {/* User Card - Premium Design */}
        <Card className="bg-gradient-poker-dark border border-poker-gray-light/30 shadow-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <Avatar className="w-20 h-20 border-3 border-poker-gold/50 shadow-xl">
                  <AvatarImage src={userStats?.avatar_url || telegramUser?.photoUrl} />
                  <AvatarFallback className="bg-gradient-poker-red text-white text-xl font-black">
                    {userStats?.name?.[0] || telegramUser?.firstName?.[0] || 'P'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-poker-gold rounded-full flex items-center justify-center border-2 border-poker-gray-dark">
                  <Star className="h-3 w-3 text-black" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-white">
                  {userStats?.name || [telegramUser?.firstName, telegramUser?.lastName].filter(Boolean).join(' ') || 'Игрок'}
                </h3>
                <p className="text-poker-gold font-medium">
                  @{telegramUser?.username || userStats?.telegram || 'telegram_user'}
                </p>
                {userStats?.created_at && <p className="text-xs text-white/60 mt-2 bg-poker-gray-dark/50 px-2 py-1 rounded-lg inline-block">
                    Участник с {new Date(userStats.created_at).toLocaleDateString('ru-RU')}
                  </p>}
              </div>
            </div>
            
            {/* Stats Grid - Enhanced */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-poker-gray-dark/50 rounded-xl border border-poker-gray-light/20">
                <div className="font-black text-2xl text-poker-gold">{userStats?.elo_rating || 1000}</div>
                <div className="text-xs text-white/60 font-medium uppercase tracking-wide">ELO Рейтинг</div>
              </div>
              <div className="text-center p-4 bg-poker-gray-dark/50 rounded-xl border border-poker-gray-light/20">
                <div className="font-black text-2xl text-poker-gold">{userStats?.wins || 0}</div>
                <div className="text-xs text-white/60 font-medium uppercase tracking-wide">Побед</div>
              </div>
              <div className="text-center p-4 bg-poker-gray-dark/50 rounded-xl border border-poker-gray-light/20">
                <div className="font-black text-2xl text-poker-gold">{userStats?.games_played || 0}</div>
                <div className="text-xs text-white/60 font-medium uppercase tracking-wide">Турниров</div>
              </div>
            </div>
            
            {/* Win Rate */}
            {userStats && userStats.games_played > 0 && <div className="mt-6 p-4 bg-gradient-poker-red/20 rounded-xl border border-poker-red/30">
                <div className="flex justify-between items-center">
                  <span className="text-white font-semibold">Процент побед:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-poker-gold font-black text-lg">
                      {Math.round(userStats.wins / userStats.games_played * 100)}%
                    </span>
                    <Trophy className="h-4 w-4 text-poker-gold" />
                  </div>
                </div>
              </div>}
          </CardContent>
        </Card>

        {/* Achievements - Premium Design */}
        <Card className="bg-gradient-poker-dark border border-poker-gray-light/30 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-black text-white flex items-center gap-2 tracking-wide">
              <div className="w-6 h-6 bg-poker-gold/20 rounded-lg flex items-center justify-center">
                <Trophy className="h-4 w-4 text-poker-gold" />
              </div>
              ДОСТИЖЕНИЯ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {userStats?.games_played && userStats.games_played >= 1 && <div className="p-4 bg-poker-gray-dark/50 rounded-xl border border-poker-gray-light/20 text-center group hover:bg-poker-gray-dark/70 transition-colors">
                  <Target className="h-8 w-8 mx-auto mb-2 text-blue-400 group-hover:scale-110 transition-transform" />
                  <p className="text-sm text-white font-semibold">Первый турнир</p>
                </div>}
              {userStats?.wins && userStats.wins >= 1 && <div className="p-4 bg-poker-gray-dark/50 rounded-xl border border-poker-gray-light/20 text-center group hover:bg-poker-gray-dark/70 transition-colors">
                  <Trophy className="h-8 w-8 mx-auto mb-2 text-poker-gold group-hover:scale-110 transition-transform" />
                  <p className="text-sm text-white font-semibold">Первая победа</p>
                </div>}
              {userStats?.games_played && userStats.games_played >= 10 && <div className="p-4 bg-poker-gray-dark/50 rounded-xl border border-poker-gray-light/20 text-center group hover:bg-poker-gray-dark/70 transition-colors">
                  <Star className="h-8 w-8 mx-auto mb-2 text-purple-400 group-hover:scale-110 transition-transform" />
                  <p className="text-sm text-white font-semibold">Ветеран</p>
                </div>}
              {userStats?.elo_rating && userStats.elo_rating >= 1500 && <div className="p-4 bg-poker-gray-dark/50 rounded-xl border border-poker-gray-light/20 text-center group hover:bg-poker-gray-dark/70 transition-colors">
                  <Award className="h-8 w-8 mx-auto mb-2 text-green-400 group-hover:scale-110 transition-transform" />
                  <p className="text-sm text-white font-semibold">Мастер</p>
                </div>}
            </div>
            {(!userStats || userStats.games_played === 0) && <div className="text-center py-8 text-white/60">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Сыграйте турнир для получения достижений</p>
                <p className="text-xs mt-1 opacity-70">Ваши успехи будут отображены здесь</p>
              </div>}
          </CardContent>
        </Card>

        {/* Tournament History */}
        <Card className="bg-gradient-poker-dark border border-poker-gray-light/30 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-black text-white tracking-wide">ИСТОРИЯ ТУРНИРОВ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-white/60">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">История турниров пуста</p>
              <p className="text-xs mt-1 opacity-70">Запишитесь на турнир, чтобы начать играть</p>
            </div>
          </CardContent>
        </Card>
      </div>;
  };
  return <div className="min-h-screen bg-gradient-to-br from-black via-poker-gray-dark to-poker-gray">
      {!isAuthenticated ? <TelegramAuth onAuthComplete={handleAuthComplete} /> : <div className="max-w-md mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="py-4">
              {loading ? <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-3 border-poker-red border-t-transparent shadow-lg"></div>
                </div> : <>
                  <TabsContent value="home" className="mt-0">{renderHome()}</TabsContent>
                  <TabsContent value="tournaments" className="mt-0">{renderTournaments()}</TabsContent>
                  <TabsContent value="rating" className="mt-0">{renderRating()}</TabsContent>
                  <TabsContent value="qa" className="mt-0">{renderQA()}</TabsContent>
                  <TabsContent value="profile" className="mt-0">{renderProfile()}</TabsContent>
                </>}
            </div>
            
            {/* Премиум нижняя панель навигации */}
            <TabsList className="fixed bottom-0 left-0 right-0 h-20 grid grid-cols-5 bg-black/95 backdrop-blur-xl border-t border-poker-gray-light/20 rounded-none shadow-2xl">
              <TabsTrigger value="home" className="flex flex-col gap-1 data-[state=active]:bg-poker-red/20 data-[state=active]:text-poker-red text-white/60 hover:text-white/80 border-0 rounded-none h-full transition-all duration-200">
                <Home className="h-5 w-5" />
                <span className="text-xs font-medium">Главная</span>
              </TabsTrigger>
              <TabsTrigger value="tournaments" className="flex flex-col gap-1 data-[state=active]:bg-poker-red/20 data-[state=active]:text-poker-red text-white/60 hover:text-white/80 border-0 rounded-none h-full transition-all duration-200">
                <Calendar className="h-5 w-5" />
                <span className="text-xs font-medium">Турниры</span>
              </TabsTrigger>
              <TabsTrigger value="rating" className="flex flex-col gap-1 data-[state=active]:bg-poker-red/20 data-[state=active]:text-poker-red text-white/60 hover:text-white/80 border-0 rounded-none h-full transition-all duration-200">
                <TrendingUp className="h-5 w-5" />
                <span className="text-xs font-medium">Рейтинг</span>
              </TabsTrigger>
              <TabsTrigger value="qa" className="flex flex-col gap-1 data-[state=active]:bg-poker-red/20 data-[state=active]:text-poker-red text-white/60 hover:text-white/80 border-0 rounded-none h-full transition-all duration-200">
                <MessageSquare className="h-5 w-5" />
                <span className="text-xs font-medium">Вопросы</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex flex-col gap-1 data-[state=active]:bg-poker-red/20 data-[state=active]:text-poker-red text-white/60 hover:text-white/80 border-0 rounded-none h-full transition-all duration-200">
                <User className="h-5 w-5" />
                <span className="text-xs font-medium">Профиль</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>}
    </div>;
};