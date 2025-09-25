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
  Spade,
  Heart,
  Diamond,
  Club,
  Crown,
  Zap,
  Shield,
  Gem,
  Medal,
  Sparkles,
  Phone,
  Mail,
  Globe
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
    <div className="space-y-6 pb-20">
      {/* Luxury Club Header */}
      <Card className="relative overflow-hidden border-0 shadow-2xl animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-poker-primary via-poker-accent/90 to-purple-900/80"></div>
        
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-40 h-40 opacity-8">
          <Trophy className="w-full h-full text-white/20 rotate-12 animate-float" />
        </div>
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-gradient-radial from-white/15 to-transparent rounded-full animate-pulse"></div>
        <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-gradient-radial from-poker-accent/30 to-transparent rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        {/* Floating Particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/40 rounded-full animate-float" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute top-3/4 right-1/3 w-1.5 h-1.5 bg-poker-accent/60 rounded-full animate-float" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/2 left-3/4 w-1 h-1 bg-white/60 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
        
        <CardHeader className="relative pb-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="w-20 h-20 bg-gradient-to-br from-white/25 to-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl border border-white/40 group-hover:scale-110 transition-all duration-500">
                <div className="relative">
                  <Crown className="h-10 w-10 text-white group-hover:rotate-12 transition-transform duration-500 drop-shadow-lg" />
                  <Spade className="absolute -top-1 -right-1 h-4 w-4 text-white/80 rotate-12" />
                </div>
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-poker-accent/40 to-poker-primary/40 rounded-3xl blur opacity-75 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            <div className="flex-1">
              <CardTitle className="text-3xl text-white font-black tracking-tight mb-2 drop-shadow-lg">
                EPC Poker Club
              </CardTitle>
              <CardDescription className="text-white font-bold text-lg leading-relaxed drop-shadow-md flex items-center gap-2">
                <Gem className="h-5 w-5 text-poker-warning animate-pulse" />
                Премиальный покерный клуб
              </CardDescription>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-3 py-1 border border-white/30">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-white font-semibold text-sm">Online</span>
                </div>
                <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-3 py-1 border border-white/25">
                  <Users className="h-3 w-3 text-white/90" />
                  <span className="text-white/90 font-semibold text-sm">{players.length}+ игроков</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="relative pt-0 pb-8">
          <div className="grid grid-cols-3 gap-4">
            <div className="group text-center p-5 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl rounded-2xl border border-white/30 hover:border-white/50 hover:bg-white/25 transform hover:-translate-y-2 transition-all duration-500 shadow-2xl">
              <div className="relative mb-3">
                <Spade className="h-6 w-6 text-white/80 mx-auto mb-2" />
                <div className="text-4xl font-black text-white drop-shadow-lg group-hover:scale-110 transition-transform duration-300">{tournaments.length}</div>
                <div className="absolute inset-0 bg-gradient-to-t from-poker-accent/30 to-transparent rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div className="text-sm text-white font-bold uppercase tracking-wider drop-shadow-sm">Турниров</div>
            </div>
            <div className="group text-center p-5 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl rounded-2xl border border-white/30 hover:border-white/50 hover:bg-white/25 transform hover:-translate-y-2 transition-all duration-500 shadow-2xl">
              <div className="relative mb-3">
                <Heart className="h-6 w-6 text-red-400 mx-auto mb-2" />
                <div className="text-4xl font-black text-white drop-shadow-lg group-hover:scale-110 transition-transform duration-300">{players.length}+</div>
                <div className="absolute inset-0 bg-gradient-to-t from-poker-success/30 to-transparent rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div className="text-sm text-white font-bold uppercase tracking-wider drop-shadow-sm">Игроков</div>
            </div>
            <div className="group text-center p-5 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl rounded-2xl border border-white/30 hover:border-white/50 hover:bg-white/25 transform hover:-translate-y-2 transition-all duration-500 shadow-2xl">
              <div className="relative mb-3">
                <Diamond className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                <div className="text-4xl font-black text-white drop-shadow-lg group-hover:scale-110 transition-transform duration-300">24/7</div>
                <div className="absolute inset-0 bg-gradient-to-t from-blue-500/30 to-transparent rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div className="text-sm text-white font-bold uppercase tracking-wider drop-shadow-sm">Доступ</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Luxury Quick Actions */}
      <div className="grid grid-cols-2 gap-5">
        <Card className="group cursor-pointer border-0 bg-gradient-to-br from-background via-background/95 to-poker-accent/5 backdrop-blur-lg hover:shadow-2xl hover:-translate-y-2 hover:rotate-1 transition-all duration-700 animate-slide-up overflow-hidden" 
              onClick={() => setActiveTab('tournaments')}
              style={{ animationDelay: '0.1s' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-poker-accent/10 via-transparent to-poker-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute top-0 right-0 w-20 h-20 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
            <Calendar className="w-full h-full text-poker-accent rotate-12 group-hover:rotate-45 transition-transform duration-700" />
          </div>
          
          <CardContent className="relative p-8 text-center">
            <div className="relative group/icon mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-poker-accent/25 via-poker-accent/20 to-poker-primary/25 rounded-3xl mx-auto flex items-center justify-center shadow-2xl border border-poker-accent/40 group-hover:scale-125 group-hover:rotate-6 transition-all duration-500">
                <div className="relative">
                  <Spade className="h-8 w-8 text-poker-accent group-hover:text-poker-primary transition-colors duration-300 drop-shadow-md" />
                  <Calendar className="absolute -bottom-2 -right-2 h-4 w-4 text-poker-primary/80" />
                </div>
              </div>
              <div className="absolute -inset-3 bg-gradient-to-r from-poker-accent/25 to-poker-primary/25 rounded-3xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            
            <h3 className="font-black text-poker-primary text-xl mb-3 group-hover:text-poker-accent transition-colors duration-300 drop-shadow-sm">Турниры</h3>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-poker-accent animate-pulse" />
              <span className="font-black text-poker-accent text-2xl drop-shadow-sm">{tournaments.length}</span>
              <span className="text-sm text-foreground font-semibold">активных</span>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-poker-accent via-poker-primary to-poker-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-full shadow-lg"></div>
          </CardContent>
        </Card>
        
        <Card className="group cursor-pointer border-0 bg-gradient-to-br from-background via-background/95 to-poker-success/5 backdrop-blur-lg hover:shadow-2xl hover:-translate-y-2 hover:-rotate-1 transition-all duration-700 animate-slide-up overflow-hidden" 
              onClick={() => setActiveTab('rating')}
              style={{ animationDelay: '0.2s' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-poker-success/10 via-transparent to-poker-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute top-0 right-0 w-20 h-20 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
            <TrendingUp className="w-full h-full text-poker-success rotate-12 group-hover:rotate-45 transition-transform duration-700" />
          </div>
          
          <CardContent className="relative p-8 text-center">
            <div className="relative group/icon mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-poker-success/25 via-poker-success/20 to-poker-accent/25 rounded-3xl mx-auto flex items-center justify-center shadow-2xl border border-poker-success/40 group-hover:scale-125 group-hover:rotate-6 transition-all duration-500">
                <div className="relative">
                  <Crown className="h-8 w-8 text-poker-warning group-hover:text-poker-accent transition-colors duration-300 drop-shadow-md" />
                  <TrendingUp className="absolute -bottom-2 -right-2 h-4 w-4 text-poker-success" />
                </div>
              </div>
              <div className="absolute -inset-3 bg-gradient-to-r from-poker-success/25 to-poker-accent/25 rounded-3xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            
            <h3 className="font-black text-poker-primary text-xl mb-3 group-hover:text-poker-success transition-colors duration-300 drop-shadow-sm">Рейтинг</h3>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Medal className="h-4 w-4 text-poker-warning animate-pulse" />
              <span className="text-sm text-foreground font-semibold">Топ игроков клуба</span>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-poker-success via-poker-accent to-poker-success transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-full shadow-lg"></div>
          </CardContent>
        </Card>
      </div>

      {/* Luxury User Stats */}
      {userStats && (
        <Card className="relative border-0 bg-gradient-to-br from-background via-background/95 to-poker-primary/5 backdrop-blur-xl shadow-2xl animate-fade-in overflow-hidden" style={{ animationDelay: '0.3s' }}>
          <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
            <User className="w-full h-full text-poker-primary rotate-12" />
          </div>
          
          <CardHeader className="pb-6 relative">
            <CardTitle className="text-xl text-poker-primary flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-poker-primary/25 to-poker-accent/25 rounded-2xl flex items-center justify-center shadow-xl border border-poker-primary/40">
                  <div className="relative">
                    <Shield className="h-6 w-6 text-poker-primary drop-shadow-md" />
                    <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-poker-accent animate-pulse" />
                  </div>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-poker-primary/25 to-poker-accent/25 rounded-2xl blur opacity-100"></div>
              </div>
              <div>
                <span className="font-black text-2xl drop-shadow-sm">Ваша статистика</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-poker-success rounded-full animate-pulse shadow-sm"></div>
                  <span className="text-sm text-foreground font-bold">Профиль активен</span>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-5">
              <div className="group text-center p-6 bg-gradient-to-br from-poker-accent/15 via-poker-accent/10 to-poker-primary/15 rounded-2xl border border-poker-accent/30 hover:border-poker-accent/60 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-poker-accent/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <Zap className="h-6 w-6 text-poker-accent mx-auto mb-2 drop-shadow-md" />
                  <div className="text-4xl font-black text-poker-accent mb-3 group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">{userStats.elo_rating}</div>
                  <div className="text-xs text-foreground font-bold uppercase tracking-widest">ELO Rating</div>
                </div>
              </div>
              
              <div className="group text-center p-6 bg-gradient-to-br from-poker-success/15 via-poker-success/10 to-green-500/15 rounded-2xl border border-poker-success/30 hover:border-poker-success/60 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-poker-success/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <Trophy className="h-6 w-6 text-poker-success mx-auto mb-2 drop-shadow-md" />
                  <div className="text-4xl font-black text-poker-success mb-3 group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">{userStats.wins}</div>
                  <div className="text-xs text-foreground font-bold uppercase tracking-widest">Побед</div>
                </div>
              </div>
              
              <div className="group text-center p-6 bg-gradient-to-br from-blue-500/15 via-blue-500/10 to-poker-accent/15 rounded-2xl border border-blue-500/30 hover:border-blue-500/60 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-blue-500/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <Star className="h-6 w-6 text-blue-500 mx-auto mb-2 drop-shadow-md" />
                  <div className="text-4xl font-black text-blue-500 mb-3 group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">{userStats.games_played}</div>
                  <div className="text-xs text-foreground font-bold uppercase tracking-widest">Турниров</div>
                </div>
              </div>
            </div>
            
            {/* Enhanced Win Rate Progress */}
            {userStats.games_played > 0 && (
              <div className="p-6 bg-gradient-to-br from-background/80 to-background/60 rounded-2xl border border-border/30 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-base font-bold text-muted-foreground flex items-center gap-2">
                    <Target className="h-4 w-4 text-poker-success" />
                    Процент побед
                  </span>
                  <span className="text-xl font-black text-poker-success">
                    {Math.round((userStats.wins / userStats.games_played) * 100)}%
                  </span>
                </div>
                <div className="relative">
                  <div className="w-full bg-gradient-to-r from-border/50 to-border/30 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-poker-success via-green-500 to-poker-success h-3 rounded-full transition-all duration-2000 relative overflow-hidden"
                      style={{ width: `${Math.round((userStats.wins / userStats.games_played) * 100)}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-white/50 to-white/30 animate-shimmer"></div>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-full h-full flex items-center justify-end pr-2">
                    {Math.round((userStats.wins / userStats.games_played) * 100) >= 70 && (
                      <Trophy className="h-3 w-3 text-poker-warning animate-bounce" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enhanced Upcoming Tournaments */}
            <Card className="border-0 bg-gradient-to-br from-background via-background/95 to-poker-accent/5 backdrop-blur-xl shadow-2xl animate-fade-in overflow-hidden" style={{ animationDelay: '0.4s' }}>
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
          <Spade className="w-full h-full text-poker-accent rotate-12" />
        </div>
        
        <CardHeader className="pb-6 relative">
          <CardTitle className="text-xl text-poker-primary flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-poker-accent/25 to-poker-primary/25 rounded-2xl flex items-center justify-center shadow-xl border border-poker-accent/40">
                  <div className="relative">
                    <Clock className="h-6 w-6 text-poker-accent drop-shadow-md" />
                    <Zap className="absolute -top-1 -right-1 h-3 w-3 text-poker-primary animate-pulse" />
                  </div>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-poker-accent/25 to-poker-primary/25 rounded-2xl blur opacity-100"></div>
              </div>
              <span className="font-black text-2xl drop-shadow-sm">Ближайшие турниры</span>
            </div>
            <Button variant="ghost" size="sm" className="text-poker-accent hover:text-poker-primary hover:bg-poker-accent/15 text-sm h-9 px-4 rounded-xl font-bold border border-poker-accent/20 hover:border-poker-accent/40 transition-all duration-300"
                    onClick={() => setActiveTab('tournaments')}>
              Все турниры
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tournaments.slice(0, 3).map((tournament, index) => {
            const playersFilled = ((tournament.tournament_registrations?.[0]?.count || 0) / tournament.max_players) * 100;
            
            return (
              <div key={tournament.id} 
                   className="group p-4 bg-gradient-to-r from-background/80 to-background/60 rounded-xl border border-border/30 hover:border-poker-accent/30 hover:shadow-card transition-all duration-300 animate-slide-up"
                   style={{ animationDelay: `${0.1 * (index + 1)}s` }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-bold text-poker-primary text-base mb-2 group-hover:text-poker-accent transition-colors">{tournament.name}</h4>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(tournament.start_time).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>
                          {tournament.tournament_registrations?.[0]?.count || 0}/{tournament.max_players}
                        </span>
                      </div>
                    </div>
                    
                    {/* Tournament Progress */}
                    <div className="mb-2">
                      <div className="w-full bg-border/20 rounded-full h-1.5">
                        <div 
                          className="bg-gradient-to-r from-poker-accent to-poker-primary h-1.5 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(playersFilled, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <Badge className="bg-gradient-to-r from-poker-accent/20 to-poker-primary/20 text-poker-accent border-poker-accent/30 font-bold px-3 py-1">
                      {tournament.buy_in}₽
                    </Badge>
                    {tournament.status === 'scheduled' && (
                      <div className="mt-2">
                        <Button 
                          size="sm"
                          onClick={() => registerForTournament(tournament.id)}
                          disabled={registering === tournament.id}
                          className="bg-gradient-to-r from-poker-accent to-poker-primary hover:shadow-accent text-white text-xs px-3 py-1.5 transition-all duration-300"
                        >
                          {registering === tournament.id ? 'Регистрируем...' : 'Записаться'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {tournaments.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-poker-accent/10 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Calendar className="h-10 w-10 text-poker-accent opacity-50" />
              </div>
              <h3 className="text-lg font-semibold text-poker-primary mb-2">Нет запланированных турниров</h3>
              <p className="text-sm text-muted-foreground">Следите за обновлениями в нашем канале</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderTournaments = () => (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-poker-primary">Турниры клуба</h2>
        <Badge className="bg-gradient-to-r from-poker-accent/20 to-poker-primary/20 text-poker-accent border-poker-accent/30 px-3 py-1 font-semibold">
          {tournaments.length} турниров
        </Badge>
      </div>
      
      {tournaments.map((tournament, index) => {
        const playersFilled = ((tournament.tournament_registrations?.[0]?.count || 0) / tournament.max_players) * 100;
        const isAlmostFull = playersFilled >= 80;
        
        return (
          <Card key={tournament.id} 
                className="border-border/30 bg-gradient-card backdrop-blur-sm hover:shadow-floating hover:-translate-y-1 transition-all duration-500 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 opacity-5">
                <Trophy className="w-full h-full text-poker-accent rotate-12" />
              </div>
              
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-poker-accent rounded-full animate-pulse"></div>
                      <span className="text-xs font-semibold text-poker-accent uppercase tracking-wider">
                        {tournament.tournament_format || 'Freezeout'}
                      </span>
                    </div>
                    <CardTitle className="text-xl text-poker-primary mb-2">{tournament.name}</CardTitle>
                    <CardDescription className="text-base text-muted-foreground">
                      {new Date(tournament.start_time).toLocaleString('ru-RU', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </CardDescription>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={tournament.status === 'running' ? 'default' : 'secondary'}
                           className={tournament.status === 'running' 
                             ? 'bg-gradient-to-r from-poker-success/20 to-green-500/20 text-poker-success border-poker-success/30 animate-pulse' 
                             : 'bg-background/50 text-muted-foreground border-border/30'}>
                      {tournament.status === 'scheduled' ? 'Скоро старт' : 
                       tournament.status === 'running' ? 'Турнир идет' : 
                       tournament.status === 'registration' ? 'Регистрация' : tournament.status}
                    </Badge>
                    {isAlmostFull && (
                      <Badge className="bg-gradient-to-r from-poker-warning/20 to-red-500/20 text-poker-warning border-poker-warning/30 animate-bounce-subtle text-xs">
                        Почти заполнен
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Tournament Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                    <span className="font-medium">Заполнено мест</span>
                    <span className="font-bold">
                      {tournament.tournament_registrations?.[0]?.count || 0} / {tournament.max_players}
                    </span>
                  </div>
                  <div className="w-full bg-border/30 rounded-full h-2.5">
                    <div 
                      className="bg-gradient-to-r from-poker-accent to-poker-primary h-2.5 rounded-full transition-all duration-1000 relative overflow-hidden"
                      style={{ width: `${Math.min(playersFilled, 100)}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </div>
            
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gradient-to-br from-poker-success/10 to-green-500/10 rounded-xl border border-poker-success/20 hover:shadow-success transition-all duration-300">
                  <div className="w-8 h-8 bg-poker-success/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <Coins className="w-4 h-4 text-poker-success" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Бай-ин</p>
                  <p className="font-bold text-poker-success text-lg">{tournament.buy_in}₽</p>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-poker-accent/10 rounded-xl border border-blue-500/20 hover:shadow-card transition-all duration-300">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Игроки</p>
                  <p className="font-bold text-blue-500 text-lg">
                    {tournament.tournament_registrations?.[0]?.count || 0}/{tournament.max_players}
                  </p>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-poker-accent/10 to-purple-500/10 rounded-xl border border-poker-accent/20 hover:shadow-accent transition-all duration-300">
                  <div className="w-8 h-8 bg-poker-accent/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-poker-accent" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Фишки</p>
                  <p className="font-bold text-poker-accent text-lg">{tournament.starting_chips.toLocaleString()}</p>
                </div>
              </div>
              
              {tournament.description && (
                <div className="mb-4 p-3 bg-background/50 rounded-lg border border-border/30">
                  <p className="text-sm text-muted-foreground leading-relaxed">{tournament.description}</p>
                </div>
              )}
              
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <Badge variant="outline" className="border-poker-accent/30 text-poker-accent bg-poker-accent/5 text-xs font-semibold">
                  {tournament.tournament_format || 'Freezeout'}
                </Badge>
                {tournament.rebuy_cost && tournament.rebuy_cost > 0 && (
                  <Badge variant="outline" className="border-poker-success/30 text-poker-success bg-poker-success/5 text-xs font-semibold">
                    Ребай {tournament.rebuy_cost}₽
                  </Badge>
                )}
                {tournament.addon_cost && tournament.addon_cost > 0 && (
                  <Badge variant="outline" className="border-poker-warning/30 text-poker-warning bg-poker-warning/5 text-xs font-semibold">
                    Аддон {tournament.addon_cost}₽
                  </Badge>
                )}
              </div>
              
              {tournament.status === 'scheduled' && (
                <Button 
                  onClick={() => registerForTournament(tournament.id)}
                  disabled={registering === tournament.id}
                  className="w-full bg-gradient-to-r from-poker-accent to-poker-primary hover:shadow-elevated text-white border-0 py-3 font-semibold text-base relative overflow-hidden group" 
                  size="lg"
                >
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <span className="relative flex items-center justify-center gap-2">
                    {registering === tournament.id ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Регистрируем...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-5 w-5" />
                        Записаться на турнир
                      </>
                    )}
                  </span>
                </Button>
              )}
              
              {tournament.status === 'running' && (
                <Button className="w-full bg-gradient-to-r from-poker-success/20 to-green-500/20 text-poker-success border border-poker-success/30 hover:bg-poker-success/10 py-3 font-semibold text-base" 
                        size="lg">
                  <Trophy className="h-5 w-5 mr-2" />
                  Следить за турниром
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
      
      {tournaments.length === 0 && (
        <Card className="border-border/30 bg-gradient-card backdrop-blur-sm">
          <CardContent className="text-center py-16">
            <div className="w-24 h-24 bg-poker-accent/10 rounded-3xl mx-auto mb-6 flex items-center justify-center">
              <Calendar className="h-12 w-12 text-poker-accent opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-poker-primary mb-3">Нет активных турниров</h3>
            <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
              В данный момент нет запланированных турниров. Следите за обновлениями в нашем телеграм-канале!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderRating = () => (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-poker-primary">Рейтинг игроков</h2>
        <Badge className="bg-gradient-to-r from-poker-accent/20 to-poker-primary/20 text-poker-accent border-poker-accent/30 px-3 py-1 font-semibold">
          Топ {players.length}
        </Badge>
      </div>
      
      {/* Enhanced Podium for top 3 */}
      {players.length >= 3 && (
        <Card className="relative overflow-hidden border-0 shadow-floating animate-fade-in mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-poker-primary/90 via-poker-accent/80 to-poker-primary/90"></div>
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
            <Trophy className="w-full h-full text-white rotate-12" />
          </div>
          <div className="absolute -top-10 -right-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute -bottom-5 -left-5 w-16 h-16 bg-poker-accent/20 rounded-full blur-lg animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          <CardContent className="relative p-8">
            <div className="flex items-end justify-center gap-8">
              {/* 2nd place */}
              <div className="text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="relative mb-6">
                  <div className="w-20 h-16 bg-gradient-to-br from-slate-400 to-slate-600 rounded-t-2xl flex items-end justify-center shadow-card relative">
                    <div className="absolute -top-3 w-10 h-10 bg-gradient-to-br from-slate-300 to-slate-500 rounded-full flex items-center justify-center shadow-card animate-bounce-subtle">
                      <span className="text-white font-bold text-sm">2</span>
                    </div>
                  </div>
                </div>
                <Avatar className="w-12 h-12 mx-auto mb-3 border-3 border-slate-300 shadow-card">
                  <AvatarImage src={players[1]?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-600 text-white font-bold">
                    {players[1]?.name?.[0] || 'P'}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm text-white font-bold mb-1">{players[1]?.name}</p>
                <p className="text-xs text-white/80 font-semibold">{players[1]?.elo_rating} RPS</p>
              </div>
              
              {/* 1st place */}
              <div className="text-center animate-scale-in" style={{ animationDelay: '0.1s' }}>
                <div className="relative mb-6">
                  <div className="w-24 h-20 bg-gradient-to-br from-poker-warning to-yellow-600 rounded-t-2xl flex items-end justify-center shadow-floating relative">
                    <div className="absolute -top-4 w-12 h-12 bg-gradient-to-br from-poker-warning to-yellow-500 rounded-full flex items-center justify-center shadow-floating animate-glow">
                      <Trophy className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
                <Avatar className="w-16 h-16 mx-auto mb-3 border-4 border-poker-warning shadow-floating">
                  <AvatarImage src={players[0]?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-poker-warning to-yellow-600 text-white font-bold text-lg">
                    {players[0]?.name?.[0] || 'P'}
                  </AvatarFallback>
                </Avatar>
                <p className="text-base text-white font-bold mb-1">{players[0]?.name}</p>
                <p className="text-sm text-poker-warning font-bold">{players[0]?.elo_rating} RPS</p>
                <Badge className="mt-2 bg-poker-warning/20 text-poker-warning border-poker-warning/30 text-xs font-bold">
                  Чемпион
                </Badge>
              </div>
              
              {/* 3rd place */}
              <div className="text-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <div className="relative mb-6">
                  <div className="w-20 h-12 bg-gradient-to-br from-amber-700 to-amber-900 rounded-t-2xl flex items-end justify-center shadow-card relative">
                    <div className="absolute -top-3 w-10 h-10 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center shadow-card animate-bounce-subtle" style={{ animationDelay: '0.5s' }}>
                      <span className="text-white font-bold text-sm">3</span>
                    </div>
                  </div>
                </div>
                <Avatar className="w-12 h-12 mx-auto mb-3 border-3 border-amber-600 shadow-card">
                  <AvatarImage src={players[2]?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-amber-700 to-amber-900 text-white font-bold">
                    {players[2]?.name?.[0] || 'P'}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm text-white font-bold mb-1">{players[2]?.name}</p>
                <p className="text-xs text-white/80 font-semibold">{players[2]?.elo_rating} RPS</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Enhanced full rating list */}
      {players.map((player, index) => (
        <Card key={player.id} 
              className="border-border/30 bg-gradient-card backdrop-blur-sm hover:shadow-card hover:-translate-y-0.5 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              {/* Enhanced Position Badge */}
              <div className={`flex items-center justify-center w-12 h-12 rounded-2xl text-base font-bold shadow-card ${
                index === 0 ? 'bg-gradient-to-br from-poker-warning to-yellow-600 text-white animate-glow' :
                index === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-600 text-white' :
                index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
                'bg-gradient-to-br from-background to-muted text-muted-foreground border border-border'
              }`}>
                {index < 3 ? (
                  index === 0 ? <Trophy className="h-6 w-6" /> : index + 1
                ) : (
                  index + 1
                )}
              </div>
              
              {/* Enhanced Avatar */}
              <Avatar className={`w-14 h-14 shadow-card border-2 ${
                index < 3 ? 'border-poker-accent/50' : 'border-border'
              }`}>
                <AvatarImage src={player.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-poker-accent/20 to-poker-primary/20 text-poker-primary font-bold">
                  {player.name?.[0] || 'P'}
                </AvatarFallback>
              </Avatar>
              
              {/* Player Info */}
              <div className="flex-1">
                <h3 className="font-bold text-poker-primary text-lg mb-1">{player.name}</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-muted-foreground">{player.games_played} игр</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-poker-success rounded-full"></div>
                    <span className="text-poker-success font-semibold">{player.wins} побед</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-poker-accent rounded-full"></div>
                    <span className="text-muted-foreground">
                      {player.games_played > 0 ? Math.round((player.wins / player.games_played) * 100) : 0}% WR
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Enhanced Rating Display */}
              <div className="text-right">
                <div className={`font-black text-2xl mb-1 ${
                  index === 0 ? 'text-poker-warning' :
                  index === 1 ? 'text-slate-500' :
                  index === 2 ? 'text-amber-600' :
                  'text-poker-accent'
                }`}>
                  {player.elo_rating}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                  RPS
                </div>
              </div>
            </div>
            
            {/* Win Rate Progress for Top Players */}
            {index < 5 && player.games_played > 0 && (
              <div className="mt-4 pt-3 border-t border-border/30">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Процент побед</span>
                  <span className="font-bold text-poker-success">
                    {Math.round((player.wins / player.games_played) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-border/30 rounded-full h-1.5">
                  <div 
                    className="bg-gradient-to-r from-poker-success to-green-500 h-1.5 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.round((player.wins / player.games_played) * 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      
      {players.length === 0 && (
        <Card className="border-border/30 bg-gradient-card backdrop-blur-sm">
          <CardContent className="text-center py-16">
            <div className="w-24 h-24 bg-poker-accent/10 rounded-3xl mx-auto mb-6 flex items-center justify-center">
              <TrendingUp className="h-12 w-12 text-poker-accent opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-poker-primary mb-3">Рейтинг формируется</h3>
            <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
              Станьте первым в рейтинге! Участвуйте в турнирах и зарабатывайте RPS баллы.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderQA = () => (
    <div className="space-y-6 pb-20">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-poker-primary mb-3">Вопросы и ответы</h2>
        <p className="text-muted-foreground">Ответы на самые популярные вопросы о нашем покерном клубе</p>
      </div>
      
      <Card className="border-border/30 bg-gradient-card backdrop-blur-sm shadow-card animate-fade-in">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-poker-primary flex items-center gap-3">
            <div className="w-10 h-10 bg-poker-accent/10 rounded-xl flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-poker-accent" />
            </div>
            Как записаться на турнир?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-background/50 rounded-xl border border-border/30">
            <p className="text-muted-foreground text-base leading-relaxed">
              Выберите интересующий турнир в разделе <strong>"Турниры"</strong> и нажмите кнопку 
              <strong> "Записаться"</strong>. После этого подтвердите участие через администратора клуба 
              или напишите в наш чат поддержки.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/30 bg-gradient-card backdrop-blur-sm shadow-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-poker-primary flex items-center gap-3">
            <div className="w-10 h-10 bg-poker-success/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-poker-success" />
            </div>
            Как работает рейтинговая система?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-background/50 rounded-xl border border-border/30 mb-4">
            <p className="text-muted-foreground text-base leading-relaxed mb-3">
              Мы используем профессиональную систему <strong>RPS (Rating Points System)</strong> для 
              расчета рейтинга игроков. Рейтинг изменяется в зависимости от результатов турниров и силы соперников.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-poker-success/10 rounded-xl border border-poker-success/20">
              <div className="text-lg font-bold text-poker-success mb-1">+50</div>
              <div className="text-xs text-muted-foreground">За победу</div>
            </div>
            <div className="text-center p-3 bg-poker-accent/10 rounded-xl border border-poker-accent/20">
              <div className="text-lg font-bold text-poker-accent mb-1">+20</div>
              <div className="text-xs text-muted-foreground">За призовые</div>
            </div>
            <div className="text-center p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <div className="text-lg font-bold text-blue-500 mb-1">1000</div>
              <div className="text-xs text-muted-foreground">Стартовый</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/30 bg-gradient-card backdrop-blur-sm shadow-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-poker-primary flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <MapPin className="h-5 w-5 text-blue-500" />
            </div>
            Контакты и адрес клуба
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-background/50 rounded-xl border border-border/30 hover:border-blue-500/30 transition-colors">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Адрес клуба</p>
                <p className="font-semibold text-poker-primary">г. Москва, ул. Примерная, д. 123</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-background/50 rounded-xl border border-border/30 hover:border-poker-success/30 transition-colors">
              <div className="w-10 h-10 bg-poker-success/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-lg">📞</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Телефон</p>
                <p className="font-semibold text-poker-primary">+7 (999) 123-45-67</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-background/50 rounded-xl border border-border/30 hover:border-poker-accent/30 transition-colors">
              <div className="w-10 h-10 bg-poker-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-poker-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Режим работы</p>
                <p className="font-semibold text-poker-primary">Круглосуточно 24/7</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/30 bg-gradient-card backdrop-blur-sm shadow-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-poker-primary flex items-center gap-3">
            <div className="w-10 h-10 bg-poker-warning/10 rounded-xl flex items-center justify-center">
              <Coins className="h-5 w-5 text-poker-warning" />
            </div>
            Стоимость игр и услуг
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-background/50 rounded-xl border border-border/30">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-poker-accent" />
                <span className="font-medium text-poker-primary">Турнир (бай-ин)</span>
              </div>
              <span className="font-bold text-poker-accent text-lg">от 1000₽</span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-background/50 rounded-xl border border-border/30">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-500" />
                <span className="font-medium text-poker-primary">Кэш-игра (час)</span>
              </div>
              <span className="font-bold text-blue-500 text-lg">200₽</span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-background/50 rounded-xl border border-border/30">
              <div className="flex items-center gap-3">
                <span className="text-lg">☕</span>
                <span className="font-medium text-poker-primary">Напитки и снеки</span>
              </div>
              <span className="font-bold text-poker-success text-lg">Бесплатно</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/30 bg-gradient-card backdrop-blur-sm shadow-card animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-poker-primary flex items-center gap-3">
            <div className="w-10 h-10 bg-poker-error/10 rounded-xl flex items-center justify-center">
              <Award className="h-5 w-5 text-poker-error" />
            </div>
            Правила участия в турнирах
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { icon: "⏰", text: "Приходите за 15 минут до начала турнира" },
              { icon: "📋", text: "Документы обязательны для регистрации" },
              { icon: "📱", text: "Телефоны только на беззвучном режиме" },
              { icon: "👔", text: "Дресс-код: smart casual (опрятный вид)" },
              { icon: "🤝", text: "Соблюдайте этикет и уважайте соперников" },
              { icon: "🚫", text: "Запрещено употребление алкоголя за столом" }
            ].map((rule, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-background/50 rounded-xl border border-border/30">
                <div className="w-8 h-8 bg-poker-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">{rule.icon}</span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{rule.text}</p>
              </div>
            ))}
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