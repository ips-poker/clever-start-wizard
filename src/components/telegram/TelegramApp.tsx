import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Calendar, Users, Star, MessageSquare, User, Home, TrendingUp, Clock, MapPin, Coins, ChevronRight, Award, Target, CheckCircle, UserPlus, Loader2, Crown, Gem, Zap, Shield, Play, Pause, CircleDot, ArrowLeft, Heart, Globe, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TelegramAuth } from './TelegramAuth';
import { toast } from 'sonner';
import epcLogo from '@/assets/epc-logo.png';
import mainPokerRoom from '@/assets/gallery/main-poker-room.jpg';
import tournamentTable from '@/assets/gallery/tournament-table.jpg';
import vipZone from '@/assets/gallery/vip-zone.jpg';
import loungeArea from '@/assets/gallery/lounge-area.jpg';
import teamTournament from '@/assets/gallery/team-tournament.jpg';
import awardsCeremony from '@/assets/gallery/awards-ceremony.jpg';
import masterclass from '@/assets/gallery/masterclass.jpg';
import registration from '@/assets/gallery/registration.jpg';
import pokerChips from '@/assets/gallery/poker-chips.jpg';
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
      fetchTournaments();
    } catch (error) {
      console.error('Error registering for tournament:', error);
      toast.error("Не удалось зарегистрироваться на турнир");
    } finally {
      setRegistering(null);
    }
  };
  const renderHome = () => <div className="space-y-6 pb-20 px-4 bg-transparent min-h-screen relative z-10">
      <Card className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 overflow-hidden relative cursor-pointer group transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-500/20 backdrop-blur-xl" onClick={() => setActiveTab('about')}>
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
          <div className="absolute top-4 right-4 text-amber-400/30 text-5xl animate-pulse">♠</div>
          <div className="absolute top-12 left-4 text-amber-400/20 text-3xl animate-bounce-subtle">♣</div>
          <div className="absolute bottom-4 right-12 text-amber-400/25 text-4xl animate-pulse">♦</div>
          <div className="absolute bottom-12 left-12 text-amber-400/15 text-2xl animate-bounce-subtle">♥</div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-amber-400/5 text-9xl rotate-12 animate-glow">♠</div>
        </div>
        
        <CardContent className="p-8 relative z-10">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-2xl flex items-center justify-center overflow-hidden shadow-xl group-hover:shadow-2xl transition-shadow duration-300 ring-2 ring-white/20 group-hover:ring-amber-400/30">
              <img src={epcLogo} alt="EPC Logo" className="w-14 h-14 object-contain group-hover:scale-110 transition-transform duration-300" />
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-light text-white tracking-wider drop-shadow-2xl group-hover:text-amber-100 transition-colors duration-300">
                EVENT POKER CLUB
              </h1>
              <div className="h-0.5 w-16 bg-gradient-to-r from-amber-400 to-amber-600 mt-2 group-hover:w-24 transition-all duration-500"></div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-xl p-5 backdrop-blur-md border border-white/20 group-hover:border-amber-400/30 transition-all duration-300 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
              <p className="text-white/90 text-base font-medium tracking-wide">Узнать больше о клубе</p>
              <ChevronRight className="h-4 w-4 text-amber-400 ml-auto group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-slate-800/90 via-gray-900/95 to-slate-900/90 border border-white/10 overflow-hidden cursor-pointer group transition-all duration-500 hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/20 backdrop-blur-xl relative" onClick={() => setActiveTab('rating')}>
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 via-transparent to-amber-600/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute inset-0 opacity-8 group-hover:opacity-20 transition-opacity duration-500">
          <div className="absolute top-6 right-6 text-amber-400/30 text-4xl animate-pulse">♦</div>
          <div className="absolute bottom-6 left-6 text-amber-400/20 text-3xl animate-bounce-subtle">♥</div>
        </div>
        
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-2xl group-hover:shadow-amber-500/30 transition-all duration-300 ring-2 ring-amber-400/20 group-hover:ring-amber-400/40">
              <Trophy className="h-7 w-7 text-white group-hover:scale-110 transition-transform duration-300" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-light text-white tracking-wider group-hover:text-amber-100 transition-colors duration-300">
                RATING POINTS
              </h3>
              <div className="h-0.5 w-12 bg-gradient-to-r from-amber-400 to-amber-600 mt-1 group-hover:w-16 transition-all duration-500"></div>
            </div>
            
            <div className="text-white/60 group-hover:text-amber-400 transition-colors duration-300">
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </div>
          
          <div className="mt-5 bg-gradient-to-r from-white/8 via-white/12 to-white/8 rounded-xl p-4 border border-white/10 group-hover:border-amber-400/20 transition-all duration-300 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <p className="text-white/80 text-sm font-medium">Общий рейтинг игроков</p>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-400" />
                <span className="text-amber-400 text-xs font-semibold">TOP</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 cursor-pointer group transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20 backdrop-blur-xl relative overflow-hidden" onClick={() => setActiveTab('qa')}>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 via-transparent to-blue-600/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute inset-0 opacity-6 group-hover:opacity-15 transition-opacity duration-500">
            <div className="absolute top-3 right-3 text-purple-400/40 text-2xl animate-pulse">♣</div>
            <div className="absolute bottom-3 left-3 text-blue-400/30 text-xl animate-bounce-subtle">♠</div>
          </div>
          <CardContent className="p-6 text-center relative z-10">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-white font-medium text-base tracking-wide group-hover:text-purple-100 transition-colors duration-300">Q&A</h3>
            <p className="text-white/60 text-xs mt-1">Вопросы и ответы</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 cursor-pointer group transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-green-500/20 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/8 via-transparent to-emerald-600/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute inset-0 opacity-6 group-hover:opacity-15 transition-opacity duration-500">
            <div className="absolute top-3 left-3 text-green-400/40 text-2xl animate-pulse">♥</div>
            <div className="absolute bottom-3 right-3 text-emerald-400/30 text-xl animate-bounce-subtle">♦</div>
          </div>
          <CardContent className="p-6 text-center relative z-10">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-white font-medium text-base tracking-wide group-hover:text-green-100 transition-colors duration-300">SUPPORT</h3>
            <p className="text-white/60 text-xs mt-1">Техническая поддержка</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="w-1 h-6 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full"></div>
          <p className="text-white/80 text-base font-semibold tracking-wide">Ближайший турнир</p>
          <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent"></div>
        </div>
        
        <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-amber-400/20 overflow-hidden cursor-pointer group transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-500/30 backdrop-blur-xl relative" onClick={() => setActiveTab('tournaments')}>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/8 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute inset-0 opacity-8 group-hover:opacity-20 transition-opacity duration-500">
            <div className="absolute top-4 right-4 text-amber-400/30 text-5xl animate-glow">♠</div>
            <div className="absolute top-16 left-4 text-amber-400/20 text-3xl animate-bounce-subtle">♣</div>
            <div className="absolute bottom-4 right-16 text-amber-400/25 text-4xl animate-pulse">♦</div>
            <div className="absolute bottom-16 left-16 text-amber-400/15 text-2xl animate-bounce-subtle">♥</div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-amber-400/3 text-8xl rotate-12 animate-glow">♠</div>
          </div>
          
          <CardContent className="p-8 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                {tournaments.length > 0 ? <div>
                    <h3 className="text-3xl font-light text-white tracking-wider uppercase drop-shadow-2xl group-hover:text-amber-100 transition-colors duration-300">
                      {tournaments[0].name.split(' ')[0] || 'PHOENIX'}
                    </h3>
                    <h3 className="text-3xl font-light text-white tracking-wider uppercase -mt-1 drop-shadow-2xl group-hover:text-amber-100 transition-colors duration-300">
                      {tournaments[0].name.split(' ').slice(1).join(' ') || 'TOURNAMENT'}
                    </h3>
                    <div className="h-0.5 w-20 bg-gradient-to-r from-amber-400 to-amber-600 mt-3 group-hover:w-28 transition-all duration-500"></div>
                  </div> : <div>
                    <h3 className="text-3xl font-light text-white tracking-wider drop-shadow-2xl group-hover:text-amber-100 transition-colors duration-300">PHOENIX</h3>
                    <h3 className="text-3xl font-light text-white tracking-wider -mt-1 drop-shadow-2xl group-hover:text-amber-100 transition-colors duration-300">TOURNAMENT</h3>
                    <div className="h-0.5 w-20 bg-gradient-to-r from-amber-400 to-amber-600 mt-3 group-hover:w-28 transition-all duration-500"></div>
                  </div>}
              </div>
              <div className="text-amber-400 group-hover:text-amber-300 transition-colors duration-300">
                <Trophy className="h-8 w-8 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-3 bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-xl p-4 backdrop-blur-md border border-white/20 group-hover:border-amber-400/30 transition-all duration-300">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="text-white font-semibold text-base">
                    {tournaments.length > 0 ? `${tournaments[0]?.tournament_registrations?.[0]?.count || 0}/${tournaments[0]?.max_players}` : '509/500'}
                  </span>
                  <p className="text-white/60 text-xs">игроков</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-xl p-4 backdrop-blur-md border border-white/20 group-hover:border-amber-400/30 transition-all duration-300">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="text-white font-semibold text-base">
                    {tournaments.length > 0 ? new Date(tournaments[0]?.start_time).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '19:00'}
                  </span>
                  <p className="text-white/60 text-xs">время старта</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-center">
              <div className="flex items-center gap-2 text-amber-400 group-hover:gap-3 transition-all duration-300">
                <span className="text-sm font-medium">Подробнее</span>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {userStats && <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 relative overflow-hidden backdrop-blur-xl group hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-600/5 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute inset-0 opacity-6 group-hover:opacity-15 transition-opacity duration-500">
            <div className="absolute top-6 right-6 text-purple-400/30 text-4xl animate-pulse">♠</div>
            <div className="absolute bottom-6 left-6 text-blue-400/20 text-3xl animate-bounce-subtle">♣</div>
            <div className="absolute top-1/2 right-12 text-purple-400/15 text-2xl animate-glow">♥</div>
          </div>
          
          <CardContent className="p-8 relative z-10">
            <div className="flex items-center gap-5 mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-2xl group-hover:shadow-purple-500/30 transition-all duration-300 ring-2 ring-purple-400/20 group-hover:ring-purple-400/40">
                <User className="h-8 w-8 text-white group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-xl tracking-wide group-hover:text-purple-100 transition-colors duration-300">
                  {telegramUser?.username || telegramUser?.firstName || 'Игрок'}
                </h3>
                <p className="text-white/70 text-sm mt-1">Мой профиль и статистика</p>
                <div className="h-0.5 w-16 bg-gradient-to-r from-purple-400 to-blue-500 mt-2 group-hover:w-24 transition-all duration-500"></div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-white/8 via-white/12 to-white/8 rounded-xl border border-white/10 group-hover:border-purple-400/20 transition-all duration-300 backdrop-blur-sm hover:scale-105">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Trophy className="h-4 w-4 text-white" />
                </div>
                <div className="text-white font-bold text-lg">{userStats.elo_rating}</div>
                <div className="text-white/60 text-xs">Рейтинг ELO</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-white/8 via-white/12 to-white/8 rounded-xl border border-white/10 group-hover:border-purple-400/20 transition-all duration-300 backdrop-blur-sm hover:scale-105">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Crown className="h-4 w-4 text-white" />
                </div>
                <div className="text-white font-bold text-lg">{userStats.wins}</div>
                <div className="text-white/60 text-xs">Побед</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-white/8 via-white/12 to-white/8 rounded-xl border border-white/10 group-hover:border-purple-400/20 transition-all duration-300 backdrop-blur-sm hover:scale-105">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Target className="h-4 w-4 text-white" />
                </div>
                <div className="text-white font-bold text-lg">{userStats.games_played}</div>
                <div className="text-white/60 text-xs">Игр сыграно</div>
              </div>
            </div>
            
            <div className="mt-8 p-6 bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded-xl border border-white/10 group-hover:border-purple-400/20 transition-all duration-300 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-3 w-3 text-white" />
                </div>
                <h4 className="text-white font-semibold text-base">Последние достижения</h4>
              </div>
              <p className="text-white/70 text-sm leading-relaxed">Статистика обновляется после каждого турнира. Продолжайте играть для улучшения рейтинга!</p>
            </div>
          </CardContent>
        </Card>}
    </div>;
  const renderAbout = () => <div className="space-y-6 pb-20 px-4 bg-transparent min-h-screen relative z-10">
      {/* Header with back button */}
      <div className="flex items-center gap-4 p-4">
        <Button variant="ghost" size="sm" onClick={() => setActiveTab('home')} className="text-white hover:bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10 hover:border-amber-400/30 transition-all duration-300">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-light text-white tracking-wider">О НАС</h2>
          <div className="h-0.5 w-12 bg-gradient-to-r from-amber-400 to-amber-600 mt-2"></div>
        </div>
      </div>

      {/* Company Info Card */}
      <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 overflow-hidden relative shadow-2xl backdrop-blur-xl group hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/8 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
          <div className="absolute top-6 right-6 text-amber-400/30 text-5xl animate-glow">♠</div>
          <div className="absolute bottom-6 left-6 text-amber-400/20 text-3xl animate-bounce-subtle">♣</div>
          <div className="absolute top-1/2 right-12 text-amber-400/15 text-2xl animate-pulse">♥</div>
        </div>
        
        <CardContent className="p-8 relative z-10">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-2xl flex items-center justify-center overflow-hidden shadow-xl group-hover:shadow-2xl transition-shadow duration-300 ring-2 ring-white/20 group-hover:ring-amber-400/30">
              <img src={epcLogo} alt="EPC Logo" className="w-14 h-14 object-contain group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-light text-white tracking-wider group-hover:text-amber-100 transition-colors duration-300">
                EVENT POKER CLUB
              </h1>
              <p className="text-white/70 text-sm mt-2 leading-relaxed">
                Ведущий покерный клуб с многолетней историей и профессиональным подходом к организации турниров.
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-white/8 via-white/12 to-white/8 rounded-xl p-5 backdrop-blur-md border border-white/10 group-hover:border-amber-400/20 transition-all duration-300">
              <h3 className="text-white font-semibold text-lg mb-3">Наша миссия</h3>
              <p className="text-white/80 text-sm leading-relaxed">
                Создавать профессиональную и дружелюбную среду для развития покерного мастерства игроков всех уровней через честные и увлекательные турниры.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
          <div className="absolute top-12 left-3 text-amber-400/30 text-4xl">♣</div>
          <div className="absolute bottom-3 right-12 text-amber-400/35 text-5xl">♦</div>
          <div className="absolute bottom-12 left-12 text-amber-400/25 text-3xl">♥</div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-amber-400/10 text-8xl rotate-12">♠</div>
        </div>
        
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center overflow-hidden">
              <img src={epcLogo} alt="EPC Logo" className="w-12 h-12 object-contain" />
            </div>
            
            <div className="flex-1">
              <h1 className="text-2xl font-light italic text-white tracking-wide">EVENT POKER CLUB</h1>
              <p className="text-white/80 text-sm">Международный покерный стиль</p>
            </div>
          </div>
          
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-white text-sm leading-relaxed">
              Мы создали уникальное пространство для любителей покера, где каждый может развивать свои навыки, 
              участвовать в честных турнирах и расти в профессиональной рейтинговой системе.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Photo Gallery */}
      <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-white font-bold text-lg">Познакомьтесь с атмосферой премиального покерного клуба IPS</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="aspect-square bg-gray-700 rounded-lg overflow-hidden">
              <img src="https://mokhssmnorrhohrowxvu.supabase.co/storage/v1/object/public/gallery/gallery/1754322902150.jpg" alt="Главный покерный зал IPS" className="w-full h-full object-cover" />
            </div>
            <div className="aspect-square bg-gray-700 rounded-lg overflow-hidden">
              <img src="https://mokhssmnorrhohrowxvu.supabase.co/storage/v1/object/public/gallery/gallery/1754322816633.jpg" alt="Турнирный стол" className="w-full h-full object-cover" />
            </div>
            <div className="aspect-square bg-gray-700 rounded-lg overflow-hidden">
              <img src="https://mokhssmnorrhohrowxvu.supabase.co/storage/v1/object/public/gallery/gallery/1754322798457.jpg" alt="VIP зона" className="w-full h-full object-cover" />
            </div>
            <div className="aspect-square bg-gray-700 rounded-lg overflow-hidden">
              <img src="https://mokhssmnorrhohrowxvu.supabase.co/storage/v1/object/public/gallery/gallery/1754322873019.jpg" alt="Зона отдыха" className="w-full h-full object-cover" />
            </div>
            <div className="aspect-square bg-gray-700 rounded-lg overflow-hidden">
              <img src="https://mokhssmnorrhohrowxvu.supabase.co/storage/v1/object/public/gallery/gallery/1754322886855.jpg" alt="Главный покерный зал IPS" className="w-full h-full object-cover" />
            </div>
            <div className="aspect-square bg-gray-700 rounded-lg overflow-hidden">
              <img src="https://mokhssmnorrhohrowxvu.supabase.co/storage/v1/object/public/gallery/gallery/1754322830449.jpg" alt="Церемония награждения" className="w-full h-full object-cover" />
            </div>
          </div>
          
          <p className="text-white/70 text-sm text-center mt-4">
            Наши покерные залы и мероприятия
          </p>
        </CardContent>
      </Card>

      {/* Achievements Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 cursor-pointer group transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-amber-500/20 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 via-transparent to-amber-600/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-6 text-center relative z-10">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg group-hover:shadow-amber-500/30">
              <Trophy className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-white font-bold text-2xl mb-1 group-hover:text-amber-100 transition-colors duration-300">500+</h3>
            <p className="text-white/70 text-sm font-medium">Турниров проведено</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 cursor-pointer group transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 via-transparent to-blue-600/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-6 text-center relative z-10">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg group-hover:shadow-blue-500/30">
              <Users className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-white font-bold text-2xl mb-1 group-hover:text-blue-100 transition-colors duration-300">1000+</h3>
            <p className="text-white/70 text-sm font-medium">Активных игроков</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 cursor-pointer group transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-green-500/20 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/8 via-transparent to-green-600/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-6 text-center relative z-10">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg group-hover:shadow-green-500/30">
              <Star className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-white font-bold text-2xl mb-1 group-hover:text-green-100 transition-colors duration-300">4.9/5</h3>
            <p className="text-white/70 text-sm font-medium">Рейтинг клуба</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 cursor-pointer group transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 via-transparent to-purple-600/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-6 text-center relative z-10">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg group-hover:shadow-purple-500/30">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-white font-bold text-2xl mb-1 group-hover:text-purple-100 transition-colors duration-300">100%</h3>
            <p className="text-white/70 text-sm font-medium">Безопасность данных</p>
          </CardContent>
        </Card>
      </div>

      {/* Values */}
      <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 backdrop-blur-xl shadow-xl group hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-green-600/5 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <CardContent className="p-8 relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-white font-semibold text-xl tracking-wide group-hover:text-emerald-100 transition-colors duration-300">Наши ценности</h3>
          </div>
          
          <div className="space-y-5">
            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-white/5 via-white/8 to-white/5 rounded-xl border border-white/10 group-hover:border-emerald-400/20 transition-all duration-300 backdrop-blur-sm hover:scale-[1.02]">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mt-1 shadow-lg">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-semibold text-base mb-1">Честность</h4>
                <p className="text-white/70 text-sm leading-relaxed">Прозрачная рейтинговая система и честная игра для всех участников</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-white/5 via-white/8 to-white/5 rounded-xl border border-white/10 group-hover:border-emerald-400/20 transition-all duration-300 backdrop-blur-sm hover:scale-[1.02]">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-red-500 rounded-xl flex items-center justify-center mt-1 shadow-lg">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-semibold text-base mb-1">Сообщество</h4>
                <p className="text-white/70 text-sm leading-relaxed">Дружелюбная атмосфера для игроков всех уровней подготовки</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-white/5 via-white/8 to-white/5 rounded-xl border border-white/10 group-hover:border-emerald-400/20 transition-all duration-300 backdrop-blur-sm hover:scale-[1.02]">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mt-1 shadow-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-semibold text-base mb-1">Инновации</h4>
                <p className="text-white/70 text-sm leading-relaxed">Современные технологии для лучшего игрового опыта</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-white/5 via-white/8 to-white/5 rounded-xl border border-white/10 group-hover:border-emerald-400/20 transition-all duration-300 backdrop-blur-sm hover:scale-[1.02]">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mt-1 shadow-lg">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-semibold text-base mb-1">Международный уровень</h4>
                <p className="text-white/70 text-sm leading-relaxed">Соответствуем мировым стандартам проведения турниров</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>;

      {/* Contact Info */}
      <Card className="bg-gradient-to-br from-red-600/90 via-red-700/95 to-red-800/90 border border-red-500/20 backdrop-blur-xl shadow-2xl group hover:shadow-2xl hover:shadow-red-500/30 transition-all duration-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-red-600/15 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
          <div className="absolute top-4 right-4 text-red-300/30 text-4xl animate-pulse">♠</div>
          <div className="absolute bottom-4 left-4 text-red-300/20 text-3xl animate-bounce-subtle">♥</div>
        </div>
        
        <CardContent className="p-8 relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/10 rounded-xl flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-white font-bold text-xl tracking-wide group-hover:text-red-100 transition-colors duration-300">Присоединяйтесь к нам</h3>
          </div>
          
          <p className="text-white/90 text-sm mb-6 leading-relaxed">
            Готовы стать частью нашего покерного сообщества? Свяжитесь с нами для получения дополнительной информации о турнирах и мероприятиях.
          </p>
          
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-xl border border-white/20 backdrop-blur-sm">
            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
            <span className="text-white text-sm font-medium">Лицензированная деятельность с полным соблюдением законодательства</span>
          </div>
        </CardContent>
      </Card>
    </div>;
  if (!isAuthenticated) {
    return <TelegramAuth onAuthComplete={handleAuthComplete} />;
  }
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>;
  }
  return <div className="max-w-lg mx-auto bg-black min-h-screen relative overflow-hidden">
      {/* Покерные масти в фоне */}
      <div className="absolute inset-0 opacity-5 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-8 text-6xl text-red-500 transform rotate-12">♠</div>
        <div className="absolute top-40 right-12 text-5xl text-red-600 transform -rotate-12">♥</div>
        <div className="absolute top-80 left-16 text-7xl text-red-400 transform rotate-45">♦</div>
        <div className="absolute top-96 right-8 text-6xl text-red-500 transform -rotate-30">♣</div>
        <div className="absolute top-[28rem] left-4 text-5xl text-red-600 transform rotate-60">♠</div>
        <div className="absolute top-[32rem] right-16 text-6xl text-red-400 transform -rotate-45">♥</div>
        <div className="absolute top-[40rem] left-20 text-7xl text-red-500 transform rotate-15">♦</div>
        <div className="absolute top-[44rem] right-6 text-5xl text-red-600 transform -rotate-60">♣</div>
      </div>
      {activeTab === 'home' && renderHome()}
      {activeTab === 'tournaments' && <div className="space-y-6 pb-20 px-4 bg-transparent min-h-screen relative z-10">
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-light text-white tracking-wider">ТУРНИРЫ</h2>
              <div className="h-0.5 w-16 bg-gradient-to-r from-amber-400 to-amber-600 mt-2"></div>
            </div>
          </div>
          
          {tournaments.map((tournament, index) => <Card key={tournament.id} className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-amber-400/20 backdrop-blur-xl shadow-xl group hover:shadow-2xl hover:shadow-amber-500/30 transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/8 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-amber-400/30 text-4xl animate-pulse">♠</div>
                <div className="absolute bottom-4 left-4 text-amber-400/20 text-3xl animate-bounce-subtle">♣</div>
              </div>
              
              <CardContent className="p-8 relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h3 className="text-2xl font-light text-white tracking-wider uppercase mb-3 group-hover:text-amber-100 transition-colors duration-300">
                      {tournament.name}
                    </h3>
                    <div className="h-0.5 w-12 bg-gradient-to-r from-amber-400 to-amber-600 group-hover:w-20 transition-all duration-500"></div>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-xl flex items-center justify-center border border-amber-400/30 group-hover:scale-110 transition-transform duration-300">
                    <Trophy className="h-6 w-6 text-amber-400" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-white/8 via-white/12 to-white/8 rounded-xl border border-white/10 group-hover:border-amber-400/20 transition-all duration-300 backdrop-blur-sm">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <span className="text-white font-semibold text-base">{tournament.tournament_registrations?.[0]?.count || 0}/{tournament.max_players}</span>
                      <p className="text-white/60 text-xs">участников</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-white/8 via-white/12 to-white/8 rounded-xl border border-white/10 group-hover:border-amber-400/20 transition-all duration-300 backdrop-blur-sm">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <span className="text-white font-semibold text-base">{new Date(tournament.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                      <p className="text-white/60 text-xs">{new Date(tournament.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                </div>
                
                {tournament.status === 'scheduled' && <Button 
                    onClick={() => registerForTournament(tournament.id)} 
                    disabled={registering === tournament.id} 
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-amber-500/30 transition-all duration-300 group-hover:scale-[1.02] border-0"
                  >
                    {registering === tournament.id ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Регистрируем...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        <span>Записаться на турнир</span>
                      </div>
                    )}
                  </Button>}
              </CardContent>
            </Card>)}
        </div>}
      {activeTab === 'rating' && <div className="space-y-6 pb-20 px-4 bg-transparent min-h-screen relative z-10">
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-light text-white tracking-wider">ЛЕГЕНДЫ EPC</h1>
              <div className="h-0.5 w-20 bg-gradient-to-r from-amber-400 to-amber-600 mt-2"></div>
            </div>
          </div>
          
          <div className="space-y-4">
            {players.map((player, index) => <Card key={player.id} className={`bg-gradient-to-br backdrop-blur-xl shadow-xl group hover:shadow-2xl transition-all duration-500 relative overflow-hidden border ${
                index === 0 ? 'from-amber-600/20 via-amber-700/30 to-amber-800/20 border-amber-400/30 hover:shadow-amber-500/30' :
                index === 1 ? 'from-gray-400/20 via-gray-500/30 to-gray-600/20 border-gray-400/30 hover:shadow-gray-500/30' :
                index === 2 ? 'from-orange-600/20 via-orange-700/30 to-orange-800/20 border-orange-400/30 hover:shadow-orange-500/30' :
                'from-slate-800/90 via-slate-900/95 to-black/90 border-white/10 hover:shadow-purple-500/20'
              } hover:scale-[1.02] cursor-pointer`}>
                <div className={`absolute inset-0 opacity-60 group-hover:opacity-100 transition-opacity duration-500 ${
                  index === 0 ? 'bg-gradient-to-br from-amber-500/10 via-transparent to-amber-600/15' :
                  index === 1 ? 'bg-gradient-to-br from-gray-400/10 via-transparent to-gray-600/15' :
                  index === 2 ? 'bg-gradient-to-br from-orange-500/10 via-transparent to-orange-600/15' :
                  'bg-gradient-to-br from-purple-500/5 via-transparent to-blue-600/5'
                }`}></div>
                
                <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                  <div className={`absolute top-4 right-4 text-3xl animate-pulse ${
                    index < 3 ? 'text-amber-400/30' : 'text-purple-400/30'
                  }`}>
                    {index === 0 ? '♠' : index === 1 ? '♥' : index === 2 ? '♦' : '♣'}
                  </div>
                </div>
                
                <CardContent className="p-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="w-14 h-14 ring-2 ring-white/20 group-hover:ring-amber-400/40 transition-all duration-300">
                          <AvatarImage src={player.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-white font-semibold text-lg">{player.name?.[0] || 'P'}</AvatarFallback>
                        </Avatar>
                        {index < 3 && (
                          <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg ${
                            index === 0 ? 'bg-gradient-to-br from-amber-500 to-amber-600' :
                            index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                            'bg-gradient-to-br from-orange-500 to-orange-600'
                          }`}>
                            {index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-lg group-hover:text-amber-100 transition-colors duration-300">{player.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-white/70 text-sm">{player.games_played} игр</p>
                          <div className="w-1 h-1 bg-white/40 rounded-full"></div>
                          <p className="text-white/70 text-sm">{player.wins} побед</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold mb-1 ${
                        index === 0 ? 'text-amber-400' :
                        index === 1 ? 'text-gray-300' :
                        index === 2 ? 'text-orange-400' :
                        'text-white'
                      } group-hover:scale-110 transition-transform duration-300`}>
                        {player.elo_rating}
                      </div>
                      <p className="text-white/60 text-xs">ELO рейтинг</p>
                    </div>
                  </div>
                </CardContent>
              </Card>)}
          </div>
      </div>}
      
      {activeTab === 'about' && renderAbout()}
      
      {activeTab === 'qa' && <div className="space-y-6 pb-20 px-4 bg-transparent min-h-screen relative z-10">
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-light text-white tracking-wider">Q&A</h2>
              <div className="h-0.5 w-8 bg-gradient-to-r from-purple-400 to-blue-500 mt-2"></div>
            </div>
          </div>
          
          <div className="space-y-4">
            <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 backdrop-blur-xl shadow-xl group hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-600/5 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-purple-400/30 text-3xl animate-pulse">♠</div>
              </div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-3 group-hover:text-purple-100 transition-colors duration-300">1. Это законно?</h3>
                    <p className="text-white/80 text-sm leading-relaxed">Да, совершенно законно! Мы проводим турниры по техасскому холдему как хобби и развлечение. Все наши мероприятия соответствуют действующему законодательству.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 backdrop-blur-xl shadow-xl group hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-600/5 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-blue-400/30 text-3xl animate-bounce-subtle">♣</div>
              </div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-3 group-hover:text-blue-100 transition-colors duration-300">2. Как стать участником?</h3>
                    <p className="text-white/80 text-sm leading-relaxed">Для участия в турнирах необходимо зарегистрироваться через наше приложение. Мы приветствуем игроков всех уровней подготовки.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 backdrop-blur-xl shadow-xl group hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-600/5 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-amber-400/30 text-3xl animate-glow">♦</div>
              </div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Trophy className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-3 group-hover:text-amber-100 transition-colors duration-300">3. Как работает рейтинговая система?</h3>
                    <p className="text-white/80 text-sm leading-relaxed">Мы используем систему ELO для честного ранжирования игроков. Рейтинг обновляется после каждого турнира на основе результатов и уровня соперников.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 backdrop-blur-xl shadow-xl group hover:shadow-2xl hover:shadow-red-500/20 transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-pink-600/5 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-red-400/30 text-3xl animate-pulse">♥</div>
              </div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-3 group-hover:text-red-100 transition-colors duration-300">4. Безопасность данных?</h3>
                    <p className="text-white/80 text-sm leading-relaxed">Мы серьезно относимся к защите персональных данных. Вся информация шифруется и хранится в соответствии с современными стандартами безопасности.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>}
        </div>}

      {activeTab === 'profile' && <div className="space-y-6 pb-20 px-4 bg-transparent min-h-screen relative z-10">
          <h2 className="text-2xl font-light italic text-white tracking-wide p-4">ПРОФИЛЬ</h2>
          {userStats ? <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-xl">
                      {telegramUser?.username || telegramUser?.firstName || 'Игрок'}
                    </h3>
                    <p className="text-white/60 text-sm">Игрок клуба</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <div className="text-white font-bold text-2xl">{userStats.elo_rating}</div>
                    <div className="text-white/60 text-sm">Рейтинг</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <div className="text-white font-bold text-2xl">{userStats.games_played}</div>
                    <div className="text-white/60 text-sm">Игр сыграно</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-white/70">Побед</span>
                    <span className="text-white font-bold">{userStats.wins}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-white/70">Процент побед</span>
                    <span className="text-white font-bold">
                      {userStats.games_played > 0 ? Math.round(userStats.wins / userStats.games_played * 100) : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card> : <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-0">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">
                  {telegramUser?.username || telegramUser?.firstName || 'Игрок'}
                </h3>
                <p className="text-white/60 text-sm">Зарегистрируйтесь на турнир, чтобы увидеть статистику</p>
              </CardContent>
            </Card>}
        </div>}

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-slate-900/95 to-slate-800/90 border-t border-amber-400/20 backdrop-blur-xl z-50 shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"></div>
        <div className="max-w-lg mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 bg-transparent h-20 p-2 gap-1">
              <TabsTrigger value="home" className="group flex flex-col gap-2 text-white/60 data-[state=active]:text-amber-400 hover:text-white/80 transition-all duration-300 border-0 rounded-xl bg-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-500/10 data-[state=active]:to-amber-600/5 cursor-pointer relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 group-data-[state=active]:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                <div className="relative z-10 flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 group-data-[state=active]:bg-amber-500/20 transition-all duration-300 group-data-[state=active]:shadow-lg group-data-[state=active]:shadow-amber-500/20">
                    <Home className="h-4 w-4 group-data-[state=active]:scale-110 transition-transform duration-300" />
                  </div>
                  <span className="text-xs font-medium tracking-wide">Главная</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="tournaments" className="group flex flex-col gap-2 text-white/60 data-[state=active]:text-amber-400 hover:text-white/80 transition-all duration-300 border-0 rounded-xl bg-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-500/10 data-[state=active]:to-amber-600/5 cursor-pointer relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 group-data-[state=active]:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                <div className="relative z-10 flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 group-data-[state=active]:bg-amber-500/20 transition-all duration-300 group-data-[state=active]:shadow-lg group-data-[state=active]:shadow-amber-500/20">
                    <Trophy className="h-4 w-4 group-data-[state=active]:scale-110 transition-transform duration-300" />
                  </div>
                  <span className="text-xs font-medium tracking-wide">Турниры</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="rating" className="group flex flex-col gap-2 text-white/60 data-[state=active]:text-amber-400 hover:text-white/80 transition-all duration-300 border-0 rounded-xl bg-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-500/10 data-[state=active]:to-amber-600/5 cursor-pointer relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 group-data-[state=active]:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                <div className="relative z-10 flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 group-data-[state=active]:bg-amber-500/20 transition-all duration-300 group-data-[state=active]:shadow-lg group-data-[state=active]:shadow-amber-500/20">
                    <Star className="h-4 w-4 group-data-[state=active]:scale-110 transition-transform duration-300" />
                  </div>
                  <span className="text-xs font-medium tracking-wide">Рейтинг</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="profile" className="group flex flex-col gap-2 text-white/60 data-[state=active]:text-amber-400 hover:text-white/80 transition-all duration-300 border-0 rounded-xl bg-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-500/10 data-[state=active]:to-amber-600/5 cursor-pointer relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 group-data-[state=active]:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                <div className="relative z-10 flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 group-data-[state=active]:bg-amber-500/20 transition-all duration-300 group-data-[state=active]:shadow-lg group-data-[state=active]:shadow-amber-500/20">
                    <User className="h-4 w-4 group-data-[state=active]:scale-110 transition-transform duration-300" />
                  </div>
                  <span className="text-xs font-medium tracking-wide">Профиль</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"></div>
      </div>
    </div>;
};