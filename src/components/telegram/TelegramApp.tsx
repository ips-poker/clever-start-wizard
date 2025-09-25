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
  const renderHome = () => <div className="space-y-4 pb-20 px-4 bg-transparent min-h-screen relative z-10">
      <Card className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-0 overflow-hidden relative cursor-pointer hover:from-slate-600 hover:to-slate-800 transition-all duration-300 shadow-2xl" onClick={() => setActiveTab('about')}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-2 right-2 text-amber-400/40 text-6xl">♠</div>
          <div className="absolute top-8 left-2 text-amber-400/30 text-4xl">♣</div>
          <div className="absolute bottom-2 right-8 text-amber-400/35 text-5xl">♦</div>
          <div className="absolute bottom-8 left-8 text-amber-400/25 text-3xl">♥</div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-amber-400/8 text-8xl">♠</div>
        </div>
        
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-lg">
              <img src={epcLogo} alt="EPC Logo" className="w-12 h-12 object-contain" />
            </div>
            
            <div className="flex-1">
              <h1 className="text-2xl font-light italic text-white tracking-wide drop-shadow-lg">EVENT POKER CLUB</h1>
            </div>
          </div>
          
          <div className="bg-white/15 rounded-xl p-4 backdrop-blur-sm border border-white/10">
            <p className="text-white text-sm font-medium leading-relaxed">О нас</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-slate-800 via-gray-800 to-slate-900 border-0 overflow-hidden cursor-pointer hover:from-slate-700 hover:to-slate-800 transition-all duration-300 shadow-xl relative" onClick={() => setActiveTab('rating')}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 text-amber-400/40 text-4xl">♦</div>
          <div className="absolute bottom-4 left-4 text-amber-400/30 text-3xl">♥</div>
        </div>
        
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-light italic text-white tracking-wide">REYTING POINTS</h3>
              <h3 className="text-xl font-black text-white tracking-wide -mt-1"></h3>
            </div>
            
            <div className="text-white/60">
              <ChevronRight className="h-5 w-5" />
            </div>
          </div>
          
          <div className="mt-4 bg-gradient-to-r from-white/5 to-white/10 rounded-lg p-3 border border-white/5">
            <p className="text-white/70 text-sm font-medium">Общий рейтинг</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-0 cursor-pointer hover:from-slate-600 hover:to-slate-800 transition-all duration-300 shadow-lg relative overflow-hidden" onClick={() => setActiveTab('qa')}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-2 right-2 text-amber-400/30 text-3xl">♣</div>
            <div className="absolute bottom-2 left-2 text-amber-400/20 text-2xl">♠</div>
          </div>
          <CardContent className="p-5 text-center relative z-10">
            <h3 className="text-white font-light italic text-lg tracking-wide">Q&A</h3>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-0 cursor-pointer hover:from-slate-600 hover:to-slate-800 transition-all duration-300 shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-2 left-2 text-amber-400/30 text-3xl">♥</div>
            <div className="absolute bottom-2 right-2 text-amber-400/20 text-2xl">♦</div>
          </div>
          <CardContent className="p-5 text-center relative z-10">
            <h3 className="text-white font-light italic text-lg tracking-wide">SUPPORT</h3>
          </CardContent>
        </Card>
      </div>

      <div>
        <p className="text-white/70 text-sm font-medium mb-2 px-1">Ближайший турнир</p>
        
        <Card className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-0 overflow-hidden cursor-pointer hover:from-slate-600 hover:to-slate-800 transition-all duration-300 relative shadow-2xl" onClick={() => setActiveTab('tournaments')}>
          <div className="absolute inset-0 opacity-12">
            <div className="absolute top-3 right-3 text-amber-400/40 text-5xl">♠</div>
            <div className="absolute top-12 left-3 text-amber-400/30 text-3xl">♣</div>
            <div className="absolute bottom-3 right-12 text-amber-400/35 text-4xl">♦</div>
            <div className="absolute bottom-12 left-12 text-amber-400/25 text-2xl">♥</div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-amber-400/8 text-7xl rotate-12">♠</div>
          </div>
          
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                {tournaments.length > 0 ? <div>
                    <h3 className="text-2xl font-light italic text-white tracking-wide uppercase drop-shadow-lg">
                      {tournaments[0].name.split(' ')[0] || 'PHOENIX'}
                    </h3>
                    <h3 className="text-2xl font-light italic text-white tracking-wide uppercase -mt-1 drop-shadow-lg">
                      {tournaments[0].name.split(' ').slice(1).join(' ') || 'TOURNAMENT'}
                    </h3>
                  </div> : <div>
                    <h3 className="text-2xl font-light italic text-white tracking-wide drop-shadow-lg">PHOENIX</h3>
                    <h3 className="text-2xl font-light italic text-white tracking-wide -mt-1 drop-shadow-lg">TOURNAMENT</h3>
                  </div>}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="flex items-center gap-2 bg-white/15 rounded-lg p-3 backdrop-blur-sm border border-white/10">
                <Users className="h-4 w-4 text-white" />
                <span className="text-white text-sm font-medium">
                  {tournaments.length > 0 ? `${tournaments[0]?.tournament_registrations?.[0]?.count || 0}/${tournaments[0]?.max_players}` : '509/500'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 bg-white/15 rounded-lg p-3 backdrop-blur-sm border border-white/10">
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

      {userStats && <Card className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-0 relative overflow-hidden shadow-xl">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 text-amber-400/30 text-4xl">♠</div>
            <div className="absolute bottom-4 left-4 text-amber-400/20 text-3xl">♣</div>
            <div className="absolute top-1/2 right-8 text-amber-400/15 text-2xl">♥</div>
          </div>
          
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
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
              <div className="text-center p-3 bg-gradient-to-br from-white/10 to-white/5 rounded-lg border border-white/10">
                <div className="text-white font-bold text-lg">{userStats.elo_rating}</div>
                <div className="text-white/60 text-xs">Месячно</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-white/10 to-white/5 rounded-lg border border-white/10">
                <div className="text-white font-bold text-lg">{userStats.wins}</div>
                <div className="text-white/60 text-xs">Полугодие</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-white/10 to-white/5 rounded-lg border border-white/10">
                <div className="text-white font-bold text-lg">{userStats.games_played}</div>
                <div className="text-white/60 text-xs">Рейтинг</div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gradient-to-r from-white/8 to-white/5 rounded-lg border border-white/10">
              <h4 className="text-white font-bold mb-2">История игр</h4>
              <p className="text-white/60 text-sm">Нет данных</p>
            </div>
          </CardContent>
        </Card>}
    </div>;
  const renderAbout = () => <div className="space-y-4 pb-20 px-4 bg-transparent min-h-screen relative z-10">
      {/* Header with back button */}
      <div className="flex items-center gap-4 p-4">
        <Button variant="ghost" size="sm" onClick={() => setActiveTab('home')} className="text-white hover:bg-white/10 p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-light italic text-white tracking-wide">О НАС</h2>
      </div>

      {/* Company Info Card */}
      <Card className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-0 overflow-hidden relative shadow-2xl">
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-3 right-3 text-amber-400/40 text-6xl">♠</div>
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
        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-0">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-white font-bold text-lg">500+</h3>
            <p className="text-white/60 text-xs">Турниров проведено</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-0">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-white font-bold text-lg">1000+</h3>
            <p className="text-white/60 text-xs">Активных игроков</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-0">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Star className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-white font-bold text-lg">4.9/5</h3>
            <p className="text-white/60 text-xs">Рейтинг клуба</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-0">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-white font-bold text-lg">100%</h3>
            <p className="text-white/60 text-xs">Безопасность данных</p>
          </CardContent>
        </Card>
      </div>

      {/* Values */}
      <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-0">
        <CardContent className="p-6">
          <h3 className="text-white font-bold text-lg mb-4">Наши ценности</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center mt-1">
                <Target className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">Честность</h4>
                <p className="text-white/70 text-xs">Прозрачная рейтинговая система и честная игра</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center mt-1">
                <Heart className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">Сообщество</h4>
                <p className="text-white/70 text-xs">Дружелюбная атмосфера для игроков всех уровней</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center mt-1">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">Инновации</h4>
                <p className="text-white/70 text-xs">Современные технологии для лучшего опыта</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center mt-1">
                <Globe className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">Международный уровень</h4>
                <p className="text-white/70 text-xs">Соответствуем мировым стандартам</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card className="bg-gradient-to-br from-red-600 to-red-800 border-0">
        <CardContent className="p-6">
          <h3 className="text-white font-bold text-lg mb-4">Присоединяйтесь к нам</h3>
          <p className="text-white/80 text-sm mb-4">
            Готовы стать частью нашего покерного сообщества? Свяжитесь с нами для получения дополнительной информации.
          </p>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-white" />
            <span className="text-white text-sm">Лицензированная деятельность</span>
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
      {activeTab === 'tournaments' && <div className="space-y-4 pb-20 px-4 bg-transparent min-h-screen relative z-10">
          <h2 className="text-2xl font-light italic text-white tracking-wide p-4">ТУРНИРЫ</h2>
          {tournaments.map((tournament, index) => <Card key={tournament.id} className="bg-gradient-to-br from-red-600 to-red-800 border-0">
              <CardContent className="p-6">
                <h3 className="text-xl font-light italic text-white tracking-wide uppercase mb-3">
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
                {tournament.status === 'scheduled' && <Button onClick={() => registerForTournament(tournament.id)} disabled={registering === tournament.id} className="w-full bg-black/30 hover:bg-black/50 text-white font-bold py-3 rounded-lg">
                    {registering === tournament.id ? 'Регистрируем...' : 'В список ожидания'}
                  </Button>}
              </CardContent>
            </Card>)}
        </div>}
      {activeTab === 'rating' && <div className="space-y-6 pb-20 px-4 bg-transparent min-h-screen relative z-10">
          <h1 className="text-2xl font-light italic text-white tracking-wide p-4">ЛЕГЕНДЫ EPC</h1>
          <div className="space-y-3">
            {players.map((player, index) => <Card key={player.id} className="bg-gray-800 border-0">
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
              </Card>)}
          </div>
      </div>}
      
      {activeTab === 'about' && renderAbout()}
      
      {activeTab === 'qa' && <div className="space-y-6 pb-20 px-4 bg-transparent min-h-screen relative z-10">
          <h2 className="text-2xl font-light italic text-white tracking-wide p-4">Q&A</h2>
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-white font-bold mb-2">1. Это законно?</h3>
              <p className="text-white/70 text-sm">Да, совершенно законно! Мы проводим турниры по техасскому холдему как хобби.</p>
            </div>
          </div>
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

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-gray-800 border-t border-gray-700/50 backdrop-blur-sm z-50">
        <div className="max-w-lg mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 bg-transparent h-16 p-0">
              <TabsTrigger value="home" className="flex flex-col gap-1 text-white/70 data-[state=active]:text-red-500 data-[state=active]:bg-transparent hover:text-white transition-colors border-0 rounded-none cursor-pointer">
                <Home className="h-5 w-5" />
                <span className="text-xs font-light italic tracking-wide uppercase">Главная</span>
              </TabsTrigger>
              <TabsTrigger value="tournaments" className="flex flex-col gap-1 text-white/70 data-[state=active]:text-red-500 data-[state=active]:bg-transparent hover:text-white transition-colors border-0 rounded-none cursor-pointer">
                <Trophy className="h-5 w-5" />
                <span className="text-xs font-light italic tracking-wide uppercase">Турниры</span>
              </TabsTrigger>
              <TabsTrigger value="rating" className="flex flex-col gap-1 text-white/70 data-[state=active]:text-red-500 data-[state=active]:bg-transparent hover:text-white transition-colors border-0 rounded-none cursor-pointer">
                <Star className="h-5 w-5" />
                <span className="text-xs font-light italic tracking-wide uppercase">Рейтинг</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex flex-col gap-1 text-white/70 data-[state=active]:text-red-500 data-[state=active]:bg-transparent hover:text-white transition-colors border-0 rounded-none cursor-pointer">
                <User className="h-5 w-5" />
                <span className="text-xs font-light italic tracking-wide uppercase">Профиль</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>;
};