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
    <div className="space-y-6 pb-20 px-4 animate-f1-entrance">
      {/* EPC Header - Ultra Aesthetic Design */}
      <Card className="bg-gradient-crimson border-0 shadow-strong overflow-hidden relative animate-premium-pulse">
        <div className="absolute inset-0 bg-gradient-to-br from-aesthetic-crimson/98 via-aesthetic-crimson to-aesthetic-crimson-dark opacity-95"></div>
        
        {/* Luxury Shimmer Effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-shimmer animate-shimmer-pass opacity-60"></div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-royal animate-shimmer-pass opacity-40" style={{animationDelay: '1s'}}></div>
        </div>
        
        {/* Elegant Background Pattern */}
        <div className="absolute top-0 right-0 opacity-5">
          <div className="w-40 h-40 bg-gradient-royal rounded-full blur-3xl animate-elegant-float"></div>
        </div>
        
        <CardContent className="p-8 relative z-20">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-24 h-24 bg-gradient-glass rounded-full flex items-center justify-center backdrop-blur-xl 
                          border-2 border-aesthetic-pearl/30 shadow-gold relative overflow-hidden group">
              <Trophy className="h-12 w-12 text-aesthetic-pearl drop-shadow-2xl animate-luxury-glow z-10" />
              <div className="absolute inset-0 bg-gradient-shimmer opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
            </div>
            <div>
              <h1 className="text-4xl font-black text-aesthetic-pearl tracking-[0.2em] drop-shadow-2xl animate-luxury-glow">
                EPC
              </h1>
              <h2 className="text-xl font-bold text-aesthetic-pearl/95 -mt-1 tracking-[0.15em] drop-shadow-lg">
                EVENT POKER CLUB
              </h2>
              <p className="text-aesthetic-pearl/90 text-sm font-semibold tracking-[0.1em] mt-1">
                ✦ ЭСТЕТИКА ПРЕВОСХОДСТВА ✦
              </p>
            </div>
          </div>
          
          <div className="bg-gradient-glass backdrop-blur-xl rounded-2xl p-4 mb-6 border border-aesthetic-pearl/20">
            <p className="text-aesthetic-pearl/95 text-sm leading-relaxed font-medium text-center">
              🎯 Где элегантность встречается с мастерством. Эксклюзивный покер для истинных ценителей.
            </p>
          </div>
          
          {/* Luxury Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-glass rounded-xl border border-aesthetic-pearl/20 backdrop-blur-sm 
                          hover:bg-aesthetic-pearl/10 transition-all duration-300 group">
              <div className="text-3xl font-black text-aesthetic-pearl drop-shadow-lg group-hover:animate-luxury-glow">
                {tournaments.length}
              </div>
              <div className="text-xs text-aesthetic-pearl/80 font-bold uppercase tracking-[0.15em]">СОБЫТИЯ</div>
            </div>
            <div className="text-center p-4 bg-gradient-glass rounded-xl border border-aesthetic-pearl/20 backdrop-blur-sm 
                          hover:bg-aesthetic-pearl/10 transition-all duration-300 group">
              <div className="text-3xl font-black text-aesthetic-pearl drop-shadow-lg group-hover:animate-luxury-glow">
                {players.length}+
              </div>
              <div className="text-xs text-aesthetic-pearl/80 font-bold uppercase tracking-[0.15em]">ЭЛИТА</div>
            </div>
            <div className="text-center p-4 bg-gradient-glass rounded-xl border border-aesthetic-pearl/20 backdrop-blur-sm 
                          hover:bg-aesthetic-pearl/10 transition-all duration-300 group">
              <div className="text-3xl font-black text-aesthetic-pearl drop-shadow-lg group-hover:animate-luxury-glow">
                24/7
              </div>
              <div className="text-xs text-aesthetic-pearl/80 font-bold uppercase tracking-[0.15em]">ДОСТУП</div>
            </div>
          </div>
        </CardContent>
        
        {/* Luxury Border */}
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-royal"></div>
      </Card>

      {/* Action Cards - Ultra Aesthetic Design */}
      <div className="space-y-4">
        {/* Legends Championship */}
        <Card className="bg-gradient-luxury border border-aesthetic-obsidian-light/80 overflow-hidden cursor-pointer 
                       hover:scale-[1.02] hover:shadow-glow hover:border-aesthetic-crimson/50 transition-all duration-500 group relative" 
              onClick={() => setActiveTab('rating')}>
          
          {/* Elegant Glow Effect */}
          <div className="absolute inset-0 bg-gradient-aurora opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl"></div>
          
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-18 h-18 bg-gradient-royal rounded-2xl flex items-center justify-center border-2 border-aesthetic-gold/50 
                            group-hover:animate-premium-pulse shadow-gold relative overflow-hidden">
                <Star className="h-10 w-10 text-aesthetic-pearl drop-shadow-xl animate-elegant-float" />
                <div className="absolute inset-0 bg-gradient-shimmer opacity-0 group-hover:opacity-40 transition-opacity duration-300"></div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-black text-aesthetic-pearl tracking-[0.1em] drop-shadow-lg">
                  LEGENDS
                </h3>
                <h3 className="text-2xl font-black text-aesthetic-gold tracking-[0.1em] -mt-1 animate-luxury-glow">
                  CHAMPIONSHIP
                </h3>
                <p className="text-aesthetic-platinum text-sm mt-2 font-semibold tracking-wide">
                  Элитная таблица лидеров
                </p>
              </div>
              <div className="text-aesthetic-gold/60 group-hover:text-aesthetic-gold transition-colors">
                <ChevronRight className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support Grid - Elegant Design */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-luxury border border-aesthetic-obsidian-light/80 cursor-pointer 
                         hover:scale-[1.02] hover:shadow-medium hover:border-aesthetic-sapphire/50 transition-all duration-400 group" 
                onClick={() => setActiveTab('qa')}>
            <CardContent className="p-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-aurora opacity-0 group-hover:opacity-5 transition-opacity rounded-xl"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-aesthetic-sapphire/20 rounded-2xl mx-auto mb-4 flex items-center justify-center 
                              group-hover:bg-aesthetic-sapphire/30 border border-aesthetic-sapphire/40 transition-all duration-300
                              group-hover:animate-elegant-float">
                  <MessageSquare className="h-7 w-7 text-aesthetic-sapphire" />
                </div>
                <h3 className="text-aesthetic-pearl font-black text-lg tracking-[0.1em]">ПОМОЩЬ</h3>
                <p className="text-aesthetic-platinum/70 text-xs mt-1 font-medium">Поддержка экспертов</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-luxury border border-aesthetic-obsidian-light/80 cursor-pointer 
                         hover:scale-[1.02] hover:shadow-medium hover:border-aesthetic-amethyst/50 transition-all duration-400 group">
            <CardContent className="p-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-aurora opacity-0 group-hover:opacity-5 transition-opacity rounded-xl"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-aesthetic-amethyst/20 rounded-2xl mx-auto mb-4 flex items-center justify-center 
                              group-hover:bg-aesthetic-amethyst/30 border border-aesthetic-amethyst/40 transition-all duration-300
                              group-hover:animate-elegant-float">
                  <Users className="h-7 w-7 text-aesthetic-amethyst" />
                </div>
                <h3 className="text-aesthetic-pearl font-black text-lg tracking-[0.1em]">СООБЩЕСТВО</h3>
                <p className="text-aesthetic-platinum/70 text-xs mt-1 font-medium">Элитный круг</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tournament Phoenix Championship */}
        <Card className="bg-gradient-crimson border-0 overflow-hidden cursor-pointer 
                       hover:scale-[1.02] hover:shadow-strong transition-all duration-500 group relative" 
              onClick={() => setActiveTab('tournaments')}>
          
          {/* Royal Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-aesthetic-crimson/98 via-aesthetic-crimson to-aesthetic-crimson-dark"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-royal"></div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-royal"></div>
          
          {/* Floating Decoration */}
          <div className="absolute top-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity">
            <Coins className="h-32 w-32 animate-elegant-float" />
          </div>
          
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-aesthetic-pearl/90 text-sm mb-2 font-bold tracking-[0.1em]">
                  ♦ ПРЕМИУМ СОБЫТИЕ ♦
                </p>
                <h3 className="text-3xl font-black text-aesthetic-pearl tracking-[0.15em] drop-shadow-xl">
                  PHOENIX
                </h3>
                <h3 className="text-3xl font-black text-aesthetic-gold tracking-[0.15em] -mt-1 animate-luxury-glow">
                  CHAMPIONSHIP
                </h3>
              </div>
              <div className="text-aesthetic-pearl/70 group-hover:text-aesthetic-pearl transition-colors">
                <ChevronRight className="h-8 w-8" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div className="flex items-center gap-3 text-aesthetic-pearl/95 p-4 bg-gradient-glass rounded-2xl backdrop-blur-xl
                            border border-aesthetic-pearl/20 hover:bg-aesthetic-pearl/10 transition-all duration-300">
                <div className="w-10 h-10 bg-gradient-glass rounded-xl flex items-center justify-center border border-aesthetic-pearl/30">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-sm font-bold block tracking-[0.05em]">УЧАСТНИКИ</span>
                  <span className="text-lg font-black">
                    {tournaments.length > 0 ? 
                      `${tournaments[0]?.tournament_registrations?.[0]?.count || 0}/${tournaments[0]?.max_players}` : 
                      '0/100'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-aesthetic-pearl/95 p-4 bg-gradient-glass rounded-2xl backdrop-blur-xl
                            border border-aesthetic-pearl/20 hover:bg-aesthetic-pearl/10 transition-all duration-300">
                <div className="w-10 h-10 bg-gradient-glass rounded-xl flex items-center justify-center border border-aesthetic-pearl/30">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-sm font-bold block tracking-[0.05em]">ВРЕМЯ</span>
                  <span className="text-lg font-black">
                    {tournaments.length > 0 ? 
                      new Date(tournaments[0]?.start_time).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}) : 
                      '20:00'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Stats - Premium Aesthetic */}
      {userStats && (
        <Card className="bg-gradient-luxury border border-aesthetic-obsidian-light/80 shadow-strong relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-royal"></div>
          
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-aesthetic-pearl font-black text-xl flex items-center gap-3 tracking-[0.05em]">
                <div className="w-8 h-8 bg-gradient-royal rounded-xl flex items-center justify-center border border-aesthetic-gold/50">
                  <User className="h-5 w-5 text-aesthetic-pearl" />
                </div>
                ВАША СТАТИСТИКА
              </h4>
              <Button variant="ghost" size="sm" 
                     className="text-aesthetic-gold hover:text-aesthetic-gold hover:bg-aesthetic-gold/10 text-sm h-10 px-4 font-bold tracking-wide
                              border border-aesthetic-gold/30 hover:border-aesthetic-gold/50 transition-all duration-300">
                ДЕТАЛИ
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-5 bg-gradient-glass rounded-2xl border-2 border-aesthetic-gold/40 relative overflow-hidden group
                            hover:shadow-gold transition-all duration-300 backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-shimmer opacity-0 group-hover:opacity-20 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="text-3xl font-black text-aesthetic-gold drop-shadow-xl animate-luxury-glow">
                    {userStats.elo_rating}
                  </div>
                  <div className="text-xs text-aesthetic-platinum/80 font-bold uppercase tracking-[0.15em] mt-1">
                    РЕЙТИНГ
                  </div>
                </div>
              </div>
              <div className="text-center p-5 bg-gradient-glass rounded-2xl border-2 border-aesthetic-emerald/40 relative overflow-hidden group
                            hover:shadow-medium transition-all duration-300 backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-shimmer opacity-0 group-hover:opacity-20 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="text-3xl font-black text-aesthetic-emerald drop-shadow-xl">
                    {userStats.wins}
                  </div>
                  <div className="text-xs text-aesthetic-platinum/80 font-bold uppercase tracking-[0.15em] mt-1">
                    ПОБЕДЫ
                  </div>
                </div>
              </div>
              <div className="text-center p-5 bg-gradient-glass rounded-2xl border-2 border-aesthetic-sapphire/40 relative overflow-hidden group
                            hover:shadow-medium transition-all duration-300 backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-shimmer opacity-0 group-hover:opacity-20 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="text-3xl font-black text-aesthetic-sapphire drop-shadow-xl">
                    {userStats.games_played}
                  </div>
                  <div className="text-xs text-aesthetic-platinum/80 font-bold uppercase tracking-[0.15em] mt-1">
                    СОБЫТИЯ
                  </div>
                </div>
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
      <div className="space-y-6 pb-20 px-4">
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
                  @{userStats?.telegram_username || telegramUser?.username || 'telegram_user'}
                </p>
                {userStats?.created_at && (
                  <p className="text-xs text-white/60 mt-2 bg-poker-gray-dark/50 px-2 py-1 rounded-lg inline-block">
                    Участник с {new Date(userStats.created_at).toLocaleDateString('ru-RU')}
                  </p>
                )}
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
            {userStats && userStats.games_played > 0 && (
              <div className="mt-6 p-4 bg-gradient-poker-red/20 rounded-xl border border-poker-red/30">
                <div className="flex justify-between items-center">
                  <span className="text-white font-semibold">Процент побед:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-poker-gold font-black text-lg">
                      {Math.round((userStats.wins / userStats.games_played) * 100)}%
                    </span>
                    <Trophy className="h-4 w-4 text-poker-gold" />
                  </div>
                </div>
              </div>
            )}
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
              {userStats?.games_played && userStats.games_played >= 1 && (
                <div className="p-4 bg-poker-gray-dark/50 rounded-xl border border-poker-gray-light/20 text-center group hover:bg-poker-gray-dark/70 transition-colors">
                  <Target className="h-8 w-8 mx-auto mb-2 text-blue-400 group-hover:scale-110 transition-transform" />
                  <p className="text-sm text-white font-semibold">Первый турнир</p>
                </div>
              )}
              {userStats?.wins && userStats.wins >= 1 && (
                <div className="p-4 bg-poker-gray-dark/50 rounded-xl border border-poker-gray-light/20 text-center group hover:bg-poker-gray-dark/70 transition-colors">
                  <Trophy className="h-8 w-8 mx-auto mb-2 text-poker-gold group-hover:scale-110 transition-transform" />
                  <p className="text-sm text-white font-semibold">Первая победа</p>
                </div>
              )}
              {userStats?.games_played && userStats.games_played >= 10 && (
                <div className="p-4 bg-poker-gray-dark/50 rounded-xl border border-poker-gray-light/20 text-center group hover:bg-poker-gray-dark/70 transition-colors">
                  <Star className="h-8 w-8 mx-auto mb-2 text-purple-400 group-hover:scale-110 transition-transform" />
                  <p className="text-sm text-white font-semibold">Ветеран</p>
                </div>
              )}
              {userStats?.elo_rating && userStats.elo_rating >= 1500 && (
                <div className="p-4 bg-poker-gray-dark/50 rounded-xl border border-poker-gray-light/20 text-center group hover:bg-poker-gray-dark/70 transition-colors">
                  <Award className="h-8 w-8 mx-auto mb-2 text-green-400 group-hover:scale-110 transition-transform" />
                  <p className="text-sm text-white font-semibold">Мастер</p>
                </div>
              )}
            </div>
            {(!userStats || userStats.games_played === 0) && (
              <div className="text-center py-8 text-white/60">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Сыграйте турнир для получения достижений</p>
                <p className="text-xs mt-1 opacity-70">Ваши успехи будут отображены здесь</p>
              </div>
            )}
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
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-aesthetic-obsidian to-aesthetic-obsidian-light relative overflow-hidden">
      {/* Luxury Pattern Background */}
      <div className="absolute inset-0 opacity-3">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 50%, hsl(var(--crimson)) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, hsl(var(--gold)) 0%, transparent 50%),
            radial-gradient(circle at 40% 20%, hsl(var(--sapphire)) 0%, transparent 50%)
          `,
          backgroundSize: '300px 300px'
        }}></div>
      </div>
      
      {/* Aesthetic Floating Elements */}
      <div className="absolute inset-0 overflow-hidden opacity-5">
        <div className="absolute top-20 left-10 w-2 h-32 bg-gradient-shimmer animate-shimmer-pass" 
             style={{animationDelay: '0s'}}></div>
        <div className="absolute top-40 right-20 w-2 h-32 bg-gradient-shimmer animate-shimmer-pass" 
             style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-40 left-1/2 w-2 h-32 bg-gradient-shimmer animate-shimmer-pass" 
             style={{animationDelay: '4s'}}></div>
      </div>

      {!isAuthenticated ? (
        <TelegramAuth onAuthComplete={handleAuthComplete} />
      ) : (
        <div className="max-w-md mx-auto relative z-10">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="py-4">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-20 w-20 border-4 border-aesthetic-crimson border-t-transparent shadow-strong"></div>
                    <div className="absolute inset-0 animate-premium-pulse rounded-full border-2 border-aesthetic-gold/50"></div>
                    <div className="absolute inset-2 bg-gradient-luxury rounded-full"></div>
                  </div>
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
            
            {/* Ultra Aesthetic Navigation Bar */}
            <TabsList className="fixed bottom-0 left-0 right-0 h-20 grid grid-cols-5 bg-gradient-luxury backdrop-blur-2xl 
                              border-t-2 border-aesthetic-crimson/50 rounded-none shadow-strong relative overflow-hidden">
              
              {/* Luxury Top Border */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-royal"></div>
              <div className="absolute top-1 left-0 w-full h-0.5 bg-gradient-shimmer animate-shimmer-pass"></div>
              
              {/* Aesthetic Glow Background */}
              <div className="absolute inset-0 bg-gradient-aurora opacity-5 animate-elegant-float"></div>
              
              <TabsTrigger 
                value="home" 
                className="flex flex-col gap-2 data-[state=active]:bg-aesthetic-crimson/30 data-[state=active]:text-aesthetic-pearl 
                         text-aesthetic-platinum/70 hover:text-aesthetic-pearl/90 border-0 rounded-none h-full transition-all duration-500 
                         data-[state=active]:shadow-glow data-[state=active]:border-t-2 data-[state=active]:border-aesthetic-gold
                         group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-shimmer opacity-0 group-data-[state=active]:opacity-20 transition-opacity duration-300"></div>
                <Home className="h-6 w-6 relative z-10 group-data-[state=active]:animate-elegant-float" />
                <span className="text-xs font-bold tracking-[0.1em] relative z-10">ГЛАВНАЯ</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tournaments" 
                className="flex flex-col gap-2 data-[state=active]:bg-aesthetic-crimson/30 data-[state=active]:text-aesthetic-pearl 
                         text-aesthetic-platinum/70 hover:text-aesthetic-pearl/90 border-0 rounded-none h-full transition-all duration-500 
                         data-[state=active]:shadow-glow data-[state=active]:border-t-2 data-[state=active]:border-aesthetic-gold
                         group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-shimmer opacity-0 group-data-[state=active]:opacity-20 transition-opacity duration-300"></div>
                <Calendar className="h-6 w-6 relative z-10 group-data-[state=active]:animate-elegant-float" />
                <span className="text-xs font-bold tracking-[0.1em] relative z-10">СОБЫТИЯ</span>
              </TabsTrigger>
              <TabsTrigger 
                value="rating" 
                className="flex flex-col gap-2 data-[state=active]:bg-aesthetic-crimson/30 data-[state=active]:text-aesthetic-pearl 
                         text-aesthetic-platinum/70 hover:text-aesthetic-pearl/90 border-0 rounded-none h-full transition-all duration-500 
                         data-[state=active]:shadow-glow data-[state=active]:border-t-2 data-[state=active]:border-aesthetic-gold
                         group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-shimmer opacity-0 group-data-[state=active]:opacity-20 transition-opacity duration-300"></div>
                <TrendingUp className="h-6 w-6 relative z-10 group-data-[state=active]:animate-elegant-float" />
                <span className="text-xs font-bold tracking-[0.1em] relative z-10">РЕЙТИНГ</span>
              </TabsTrigger>
              <TabsTrigger 
                value="qa" 
                className="flex flex-col gap-2 data-[state=active]:bg-aesthetic-crimson/30 data-[state=active]:text-aesthetic-pearl 
                         text-aesthetic-platinum/70 hover:text-aesthetic-pearl/90 border-0 rounded-none h-full transition-all duration-500 
                         data-[state=active]:shadow-glow data-[state=active]:border-t-2 data-[state=active]:border-aesthetic-gold
                         group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-shimmer opacity-0 group-data-[state=active]:opacity-20 transition-opacity duration-300"></div>
                <MessageSquare className="h-6 w-6 relative z-10 group-data-[state=active]:animate-elegant-float" />
                <span className="text-xs font-bold tracking-[0.1em] relative z-10">ПОМОЩЬ</span>
              </TabsTrigger>
              <TabsTrigger 
                value="profile" 
                className="flex flex-col gap-2 data-[state=active]:bg-aesthetic-crimson/30 data-[state=active]:text-aesthetic-pearl 
                         text-aesthetic-platinum/70 hover:text-aesthetic-pearl/90 border-0 rounded-none h-full transition-all duration-500 
                         data-[state=active]:shadow-glow data-[state=active]:border-t-2 data-[state=active]:border-aesthetic-gold
                         group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-shimmer opacity-0 group-data-[state=active]:opacity-20 transition-opacity duration-300"></div>
                <User className="h-6 w-6 relative z-10 group-data-[state=active]:animate-elegant-float" />
                <span className="text-xs font-bold tracking-[0.1em] relative z-10">ПРОФИЛЬ</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}
    </div>
  );
};