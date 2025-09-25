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
  Crown,
  Gem,
  Zap,
  Shield,
  Play,
  Pause,
  CircleDot
} from 'lucide-react';
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
      {/* Premium Club Header - PokerStars Style */}
      <Card className="bg-gradient-poker-red border-0 overflow-hidden relative poker-shine">
        <div className="absolute inset-0 bg-gradient-poker-red"></div>
        
        {/* Decorative Elements */}
        <div className="absolute top-4 right-4 opacity-10">
          <Crown className="h-24 w-24" />
        </div>
        <div className="absolute bottom-4 left-4 opacity-5">
          <Gem className="h-16 w-16" />
        </div>
        
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-5 mb-6">
            {/* Premium Logo */}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-poker-gold rounded-2xl flex items-center justify-center poker-glass border border-poker-gold/30 glow-gold overflow-hidden">
                <img src={epcLogo} alt="EPC Logo" className="w-16 h-16 object-contain" />
              </div>
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-black text-white tracking-wider text-shadow-poker">EPC</h1>
                <Crown className="h-6 w-6 text-poker-gold animate-pulse" />
              </div>
              <h2 className="text-lg font-bold text-white/95 -mt-1 tracking-wide">EVENT POKER CLUB</h2>
              <div className="flex items-center gap-2 mt-2">
                <Gem className="h-4 w-4 text-poker-gold" />
                <p className="text-white/90 text-sm font-semibold">Премиальный покерный клуб</p>
              </div>
            </div>
          </div>
          
          <p className="text-white/95 text-sm leading-relaxed font-medium mb-6 text-shadow-poker">
            Добро пожаловать в элитный мир покера. Профессиональная игра, честные турниры, крупные призы.
          </p>
          
          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
            {[
              { value: tournaments.length, label: "Активных турниров", icon: Trophy },
              { value: `${players.length}+`, label: "Опытных игроков", icon: Users },
              { value: "24/7", label: "Работаем", icon: Zap }
            ].map((stat, index) => (
              <div key={index} className="text-center p-3 bg-white/10 rounded-xl poker-glass">
                <stat.icon className="h-5 w-5 text-poker-gold mx-auto mb-2" />
                <div className="text-xl font-black text-white text-shadow-poker">{stat.value}</div>
                <div className="text-xs text-white/80 font-medium uppercase tracking-wide leading-tight">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Premium Action Cards */}
      <div className="space-y-4">
        {/* EPC Rating System - Premium Design */}
        <Card className="bg-gradient-poker-dark border border-poker-gold/20 overflow-hidden cursor-pointer 
                       hover:scale-[1.02] hover:shadow-poker-elevated transition-all duration-300 group poker-shine" 
              onClick={() => setActiveTab('rating')}>
          <CardContent className="p-6 relative">
            <div className="absolute inset-0 bg-gradient-poker-surface"></div>
            
            {/* Decorative poker suits */}
            <div className="absolute top-2 right-2 opacity-5 text-6xl">♠</div>
            <div className="absolute bottom-2 left-2 opacity-5 text-4xl text-poker-red">♥</div>
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-poker-gold rounded-2xl flex items-center justify-center 
                              border border-poker-gold/40 group-hover:border-poker-gold transition-colors glow-gold">
                  <Crown className="h-8 w-8 text-poker-gray-dark drop-shadow-lg" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-poker-red rounded-full flex items-center justify-center">
                  <Star className="h-2 w-2 text-white" />
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-white tracking-wider text-shadow-poker">EPC RATING</h3>
                  <Zap className="h-5 w-5 text-poker-gold animate-pulse" />
                </div>
                <h3 className="text-xl font-black text-poker-gold tracking-wider -mt-1 text-shadow-poker">SYSTEM</h3>
                <p className="text-white/80 text-sm mt-2 font-semibold">Рейтинговая система клуба</p>
              </div>
              
              <div className="text-poker-gold/60 group-hover:text-poker-gold transition-colors">
                <ChevronRight className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access Grid - Premium Design */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-poker-surface border border-poker-blue/20 cursor-pointer 
                         hover:scale-[1.02] hover:shadow-poker-card transition-all duration-300 group poker-shine" 
                onClick={() => setActiveTab('qa')}>
            <CardContent className="p-5 text-center relative">
              <div className="absolute inset-0 bg-gradient-poker-surface rounded-lg"></div>
              <div className="absolute top-1 right-1 text-2xl opacity-5">♣</div>
              
              <div className="relative z-10">
                <div className="w-12 h-12 bg-poker-blue/20 rounded-xl mx-auto mb-3 flex items-center justify-center 
                              group-hover:bg-poker-blue/30 transition-colors border border-poker-blue/30">
                  <MessageSquare className="h-6 w-6 text-poker-blue" />
                </div>
                <h3 className="text-white font-black text-lg text-shadow-poker">Q&A</h3>
                <p className="text-white/70 text-xs mt-1 font-medium">Вопросы и ответы</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-poker-surface border border-poker-green/20 cursor-pointer 
                         hover:scale-[1.02] hover:shadow-poker-card transition-all duration-300 group poker-shine">
            <CardContent className="p-5 text-center relative">
              <div className="absolute inset-0 bg-gradient-poker-surface rounded-lg"></div>
              <div className="absolute top-1 right-1 text-2xl opacity-5 text-poker-green">♦</div>
              
              <div className="relative z-10">
                <div className="w-12 h-12 bg-poker-green/20 rounded-xl mx-auto mb-3 flex items-center justify-center 
                              group-hover:bg-poker-green/30 transition-colors border border-poker-green/30">
                  <Shield className="h-6 w-6 text-poker-green" />
                </div>
                <h3 className="text-white font-black text-lg text-shadow-poker">SUPPORT</h3>
                <p className="text-white/70 text-xs mt-1 font-medium">Поддержка 24/7</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Premium Tournament Section */}
        <Card className="bg-gradient-poker-red border border-poker-gold/20 overflow-hidden cursor-pointer 
                       hover:scale-[1.02] hover:shadow-poker-elevated transition-all duration-300 group relative poker-shine" 
              onClick={() => setActiveTab('tournaments')}>
          <div className="absolute inset-0 bg-gradient-poker-red"></div>
          
          {/* Decorative Elements */}
          <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-15 transition-opacity">
            <Trophy className="h-20 w-20" />
          </div>
          <div className="absolute bottom-2 left-2 opacity-5">
            <Coins className="h-16 w-16" />
          </div>
          <div className="absolute top-4 left-4 text-4xl opacity-5">♠</div>
          
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CircleDot className="h-3 w-3 text-poker-gold animate-pulse" />
                  <p className="text-white/90 text-sm font-semibold uppercase tracking-wide">Ближайший турнир</p>
                </div>
                {tournaments.length > 0 ? (
                  <>
                    <h3 className="text-3xl font-black text-white tracking-wider text-shadow-poker">
                      {tournaments[0].name.split(' ')[0] || 'EPC'}
                    </h3>
                    <div className="flex items-center gap-2">
                      <h3 className="text-3xl font-black text-poker-gold tracking-wider -mt-1 text-shadow-poker">
                        {tournaments[0].name.split(' ').slice(1).join(' ') || 'TOURNAMENT'}
                      </h3>
                      <Crown className="h-6 w-6 text-poker-gold" />
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-3xl font-black text-white tracking-wider text-shadow-poker">СКОРО</h3>
                    <div className="flex items-center gap-2">
                      <h3 className="text-3xl font-black text-poker-gold tracking-wider -mt-1 text-shadow-poker">НОВЫЙ ТУРНИР</h3>
                      <Crown className="h-6 w-6 text-poker-gold" />
                    </div>
                  </>
                )}
              </div>
              <div className="text-white/60 group-hover:text-white transition-colors">
                <ChevronRight className="h-8 w-8" />
              </div>
            </div>
            
            {/* Enhanced Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-white/15 rounded-xl poker-glass">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white/90 block">Участники</span>
                  <span className="text-xl font-black text-white text-shadow-poker">
                    {tournaments.length > 0 ? 
                      `${tournaments[0]?.tournament_registrations?.[0]?.count || 0}/${tournaments[0]?.max_players}` : 
                      '0/100'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-white/15 rounded-xl poker-glass">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white/90 block">Начало</span>
                  <span className="text-xl font-black text-white text-shadow-poker">
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

      {/* Premium User Statistics */}
      {userStats && (
        <Card className="bg-gradient-poker-surface border border-poker-gold/20 poker-shine glow-gold">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-white font-black text-xl flex items-center gap-3 text-shadow-poker">
                <div className="w-10 h-10 bg-gradient-poker-gold rounded-xl flex items-center justify-center">
                  <Crown className="h-5 w-5 text-poker-gray-dark" />
                </div>
                Ваша статистика
              </h4>
              <Button variant="ghost" size="sm" 
                      className="text-poker-gold hover:text-poker-gold hover:bg-poker-gold/10 
                               text-xs h-8 px-3 font-semibold border border-poker-gold/30 rounded-lg">
                Подробнее
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: userStats.elo_rating, label: "Рейтинг", icon: Star, color: "poker-gold" },
                { value: userStats.wins, label: "Побед", icon: Trophy, color: "poker-green" },
                { value: userStats.games_played, label: "Игр", icon: Target, color: "poker-blue" }
              ].map((stat, index) => (
                <div key={index} className="text-center p-4 bg-poker-gray-dark/50 rounded-xl 
                                           border border-poker-gray-light/20 hover:border-poker-gold/30 
                                           transition-all duration-300 group">
                  <div className={`w-8 h-8 bg-${stat.color}/20 rounded-lg mx-auto mb-3 flex items-center justify-center 
                                  border border-${stat.color}/30 group-hover:border-${stat.color}/50 transition-colors`}>
                    <stat.icon className={`h-4 w-4 text-${stat.color}`} />
                  </div>
                  <div className={`text-2xl font-black text-${stat.color} text-shadow-poker`}>{stat.value}</div>
                  <div className="text-xs text-white/70 font-medium uppercase tracking-wide mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderTournaments = () => (
    <div className="space-y-5 pb-20 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-poker-gold rounded-xl flex items-center justify-center glow-gold">
            <Trophy className="h-6 w-6 text-poker-gray-dark" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white text-shadow-poker">Турниры</h2>
            <p className="text-white/70 text-sm">Премиальные события</p>
          </div>
        </div>
      </div>
      
      {tournaments.map((tournament, index) => (
        <Card key={tournament.id} className="bg-gradient-poker-surface border border-poker-gold/20 overflow-hidden relative 
                                            hover:scale-[1.01] hover:border-poker-gold/40 transition-all duration-300 group poker-shine">
          
          {/* Premium Background Elements */}
          <div className="absolute inset-0 bg-gradient-poker-surface"></div>
          <div className="absolute top-2 right-2 opacity-5 text-6xl">
            {index % 4 === 0 ? '♠' : index % 4 === 1 ? '♥' : index % 4 === 2 ? '♦' : '♣'}
          </div>
          <div className="absolute bottom-2 left-2 opacity-10 group-hover:opacity-15 transition-opacity">
            <Coins className="h-16 w-16" />
          </div>
          
          <CardContent className="p-6 relative z-10">
            {/* Tournament Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 bg-poker-gold rounded-full animate-pulse"></div>
                  <Badge 
                    variant={tournament.status === 'running' ? 'default' : 'secondary'}
                    className={`${tournament.status === 'running' 
                      ? 'bg-poker-green text-white border-poker-green' 
                      : 'bg-poker-surface-elevated text-poker-gold border-poker-gold/30'
                    } font-semibold uppercase tracking-wider`}
                  >
                    {tournament.status === 'scheduled' ? '🕐 Запланирован' : 
                     tournament.status === 'running' ? '🔴 В процессе' : tournament.status}
                  </Badge>
                </div>
                
                <h3 className="text-2xl font-black text-white uppercase tracking-wide text-shadow-poker mb-2">
                  {tournament.name}
                </h3>
                
                <div className="flex items-center gap-6 text-white/80">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-poker-blue/20 rounded-lg flex items-center justify-center border border-poker-blue/30">
                      <Users className="h-4 w-4 text-poker-blue" />
                    </div>
                    <span className="text-sm font-semibold">
                      {tournament.tournament_registrations?.[0]?.count || 0}/{tournament.max_players}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-poker-red/20 rounded-lg flex items-center justify-center border border-poker-red/30">
                      <Clock className="h-4 w-4 text-poker-red" />
                    </div>
                    <span className="text-sm font-semibold">
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
            <div className="space-y-5">
              {/* Location & Date Card */}
              <div className="bg-poker-gray-dark/50 rounded-xl p-4 border border-poker-gray-light/20">
                <h4 className="text-white font-black mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-poker-gold" />
                  Место и время
                </h4>
                <div className="space-y-2 text-white/80 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-poker-red/20 rounded-lg flex items-center justify-center">
                      <MapPin className="h-3 w-3 text-poker-red" />
                    </div>
                    <span className="font-medium">г. Уфа, Российская Сутолочная перулок 5-1</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-poker-blue/20 rounded-lg flex items-center justify-center">
                      <Calendar className="h-3 w-3 text-poker-blue" />
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
              <div className="bg-poker-gray-dark/50 rounded-xl p-4 border border-poker-gray-light/20">
                <h4 className="text-white font-black mb-3 flex items-center gap-2">
                  <Coins className="h-4 w-4 text-poker-gold" />
                  Правила турнира
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-poker-surface/50 rounded-lg p-3 border border-poker-gold/20">
                    <span className="text-white/70 font-semibold block mb-1">Бай-ин</span>
                    <div className="text-xl font-black text-poker-gold">{tournament.buy_in}₽</div>
                  </div>
                  <div className="bg-poker-surface/50 rounded-lg p-3 border border-poker-blue/20">
                    <span className="text-white/70 font-semibold block mb-1">Стартовые фишки</span>
                    <div className="text-xl font-black text-poker-blue">{tournament.starting_chips?.toLocaleString() || '10,000'}</div>
                  </div>
                </div>
              </div>

              {/* Tournament Features */}
              <div className="bg-poker-gray-dark/50 rounded-xl p-4 border border-poker-gray-light/20">
                <h4 className="text-white font-black mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-poker-gold" />
                  Особенности
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-poker-gold/20 text-poker-gold border-poker-gold/30 text-xs font-semibold">
                    {tournament.tournament_format || 'Freezeout'}
                  </Badge>
                  {tournament.rebuy_cost && tournament.rebuy_cost > 0 && (
                    <Badge className="bg-poker-green/20 text-poker-green border-poker-green/30 text-xs font-semibold">
                      Ребай {tournament.rebuy_cost}₽
                    </Badge>
                  )}
                  {tournament.addon_cost && tournament.addon_cost > 0 && (
                    <Badge className="bg-poker-blue/20 text-poker-blue border-poker-blue/30 text-xs font-semibold">
                      Аддон {tournament.addon_cost}₽
                    </Badge>
                  )}
                  <Badge className="bg-poker-red/20 text-poker-red border-poker-red/30 text-xs font-semibold">
                    Начальный рейтинг = 1000₽
                  </Badge>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              {tournament.status === 'scheduled' && (
                <Button 
                  onClick={() => registerForTournament(tournament.id)}
                  disabled={registering === tournament.id}
                  className="w-full bg-gradient-poker-gold hover:bg-poker-gold text-poker-gray-dark 
                           font-black text-lg py-3 rounded-xl border border-poker-gold/30 
                           hover:shadow-poker-gold transition-all duration-300 glow-gold" 
                  size="lg"
                >
                  {registering === tournament.id ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                      Регистрируем...
                    </>
                  ) : (
                    <>
                      <Crown className="h-5 w-5 mr-3" />
                      В список ожидания
                    </>
                  )}
                </Button>
              )}
              
              {tournament.status === 'running' && (
                <Button 
                  variant="outline" 
                  className="w-full border-poker-green/40 text-poker-green hover:bg-poker-green/10 
                           font-black text-lg py-3 rounded-xl" 
                  size="lg"
                >
                  <Play className="h-5 w-5 mr-3" />
                  Турнир в процессе
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      
      {tournaments.length === 0 && (
        <Card className="bg-gradient-poker-surface border border-poker-gray-light/20 poker-glass">
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 bg-poker-gold/20 rounded-full mx-auto mb-6 flex items-center justify-center border border-poker-gold/30">
              <Calendar className="h-10 w-10 text-poker-gold" />
            </div>
            <h3 className="text-2xl font-black text-white mb-4 text-shadow-poker">Нет активных турниров</h3>
            <p className="text-white/70 text-sm max-w-md mx-auto leading-relaxed">
              Следите за обновлениями в нашем канале.<br/>
              Новые турниры добавляются регулярно!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderRating = () => (
    <div className="space-y-4 pb-20 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">EPC RATING</h1>
          <h2 className="text-2xl font-bold text-white">SYSTEM</h2>
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
    <div className="min-h-screen bg-gradient-to-br from-black via-poker-gray-dark to-poker-gray">
      {!isAuthenticated ? (
        <TelegramAuth onAuthComplete={handleAuthComplete} />
      ) : (
        <div className="max-w-md mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="py-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-3 border-poker-red border-t-transparent shadow-lg"></div>
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
            
            {/* Премиум нижняя панель навигации */}
            <TabsList className="fixed bottom-0 left-0 right-0 h-20 grid grid-cols-5 bg-black/95 backdrop-blur-xl border-t border-poker-gray-light/20 rounded-none shadow-2xl">
              <TabsTrigger 
                value="home" 
                className="flex flex-col gap-1 data-[state=active]:bg-poker-red/20 data-[state=active]:text-poker-red text-white/60 hover:text-white/80 border-0 rounded-none h-full transition-all duration-200"
              >
                <Home className="h-5 w-5" />
                <span className="text-xs font-medium">Главная</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tournaments" 
                className="flex flex-col gap-1 data-[state=active]:bg-poker-red/20 data-[state=active]:text-poker-red text-white/60 hover:text-white/80 border-0 rounded-none h-full transition-all duration-200"
              >
                <Calendar className="h-5 w-5" />
                <span className="text-xs font-medium">Турниры</span>
              </TabsTrigger>
              <TabsTrigger 
                value="rating" 
                className="flex flex-col gap-1 data-[state=active]:bg-poker-red/20 data-[state=active]:text-poker-red text-white/60 hover:text-white/80 border-0 rounded-none h-full transition-all duration-200"
              >
                <TrendingUp className="h-5 w-5" />
                <span className="text-xs font-medium">Рейтинг</span>
              </TabsTrigger>
              <TabsTrigger 
                value="qa" 
                className="flex flex-col gap-1 data-[state=active]:bg-poker-red/20 data-[state=active]:text-poker-red text-white/60 hover:text-white/80 border-0 rounded-none h-full transition-all duration-200"
              >
                <MessageSquare className="h-5 w-5" />
                <span className="text-xs font-medium">Вопросы</span>
              </TabsTrigger>
              <TabsTrigger 
                value="profile" 
                className="flex flex-col gap-1 data-[state=active]:bg-poker-red/20 data-[state=active]:text-poker-red text-white/60 hover:text-white/80 border-0 rounded-none h-full transition-all duration-200"
              >
                <User className="h-5 w-5" />
                <span className="text-xs font-medium">Профиль</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}
    </div>
  );
};