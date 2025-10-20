import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Calendar, Users, Star, MessageSquare, User, Home, TrendingUp, Clock, MapPin, Coins, ChevronRight, Award, Target, CheckCircle, UserPlus, Loader2, Crown, Gem, Zap, Shield, Play, Pause, CircleDot, ArrowLeft, Heart, Globe, Camera, ChevronLeft, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TelegramAuth } from './TelegramAuth';
import { TelegramTournamentModal } from './TelegramTournamentModal';
import { TelegramProfile } from './TelegramProfile';
import { toast } from 'sonner';
import { addToHomeScreen } from '@telegram-apps/sdk';
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
  participation_fee: number;
  max_players: number;
  status: string;
  starting_chips: number;
  description?: string;
  tournament_format?: string;
  reentry_fee?: number;
  additional_fee?: number;
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

interface GalleryImage {
  id: string;
  title: string;
  image_url: string;
  description?: string;
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
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentRuleIndex, setCurrentRuleIndex] = useState(0);
  const [canAddToHomeScreen, setCanAddToHomeScreen] = useState(false);

  useEffect(() => {
    // Проверяем доступность функции добавления на главный экран
    const checkAddToHomeScreen = () => {
      try {
        const isAvailable = addToHomeScreen.isAvailable();
        console.log('Add to Home Screen check:', {
          isAvailable,
          telegramVersion: window.Telegram?.WebApp?.version,
          platform: window.Telegram?.WebApp?.platform
        });
        setCanAddToHomeScreen(isAvailable);
      } catch (error) {
        console.error('Error checking addToHomeScreen availability:', error);
        setCanAddToHomeScreen(false);
      }
    };
    
    // Проверяем с задержкой после инициализации SDK
    setTimeout(checkAddToHomeScreen, 500);
  }, []);

  useEffect(() => {
    if (isAuthenticated && telegramUser) {
      fetchData();
      fetchGalleryImages();
      setupRealtimeSubscriptions();
    }
  }, [isAuthenticated, telegramUser]);

  const handleAddToHomeScreen = () => {
    console.log('=== ADD TO HOME SCREEN CLICKED ===');
    
    try {
      if (addToHomeScreen.isAvailable()) {
        console.log('Calling addToHomeScreen from @telegram-apps/sdk...');
        addToHomeScreen();
        toast.success("Приложение будет добавлено на главный экран");
      } else {
        console.warn('addToHomeScreen is not available');
        toast.error("Функция недоступна на вашем устройстве или версии Telegram");
      }
    } catch (error) {
      console.error('Error adding to home screen:', error);
      toast.error("Ошибка: " + (error instanceof Error ? error.message : String(error)));
    }
  };

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

  const fetchGalleryImages = async () => {
    try {
      const { data, error } = await supabase
        .from('cms_gallery')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching gallery images:', error);
        return;
      }

      const fallbackImages: GalleryImage[] = [
        { id: '1', title: 'Турнирный стол', image_url: tournamentTable },
        { id: '2', title: 'VIP зона', image_url: vipZone },
        { id: '3', title: 'Зона отдыха', image_url: loungeArea },
        { id: '4', title: 'Главный покерный зал', image_url: mainPokerRoom }
      ];

      setGalleryImages(data && data.length > 0 ? data : fallbackImages);
    } catch (error) {
      console.error('Error fetching gallery images:', error);
      // Use fallback images
      const fallbackImages: GalleryImage[] = [
        { id: '1', title: 'Турнирный стол', image_url: tournamentTable },
        { id: '2', title: 'VIP зона', image_url: vipZone },
        { id: '3', title: 'Зона отдыха', image_url: loungeArea },
        { id: '4', title: 'Главный покерный зал', image_url: mainPokerRoom }
      ];
      setGalleryImages(fallbackImages);
    }
  };

  const fetchTournaments = async (): Promise<void> => {
    try {
      const { data } = await supabase.from('tournaments').select(`
          *,
          tournament_registrations(count)
        `).eq('is_published', true).order('start_time', { ascending: true });
      if (data) {
        setTournaments(data as Tournament[]);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const fetchPlayers = async (): Promise<void> => {
    try {
      const { data } = await supabase.from('players').select('*').order('elo_rating', { ascending: false });
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
      
      console.log('Fetching user stats for Telegram ID:', telegramId);
      
      // Сначала пытаемся найти игрока по telegram ID
      let { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('telegram', telegramId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user stats:', error);
        return;
      }
      
      console.log('Found player:', data ? { 
        id: data.id, 
        name: data.name, 
        avatar_url: data.avatar_url || 'NO AVATAR',
        hasAvatar: !!data.avatar_url 
      } : 'NOT FOUND');
      
      // Если игрок не найден, создаем нового через безопасную RPC функцию
      if (!data) {
        const playerName = telegramUser.firstName || telegramUser.username || `Player_${telegramId}`;
        
        console.log('Creating new player with Telegram data:', {
          name: playerName,
          telegram: telegramId,
          avatar_url: telegramUser.photoUrl || 'NO PHOTO',
          hasPhoto: !!telegramUser.photoUrl
        });
        
        const { data: createResult, error: createError } = await supabase.rpc('create_player_safe', {
          p_name: playerName,
          p_email: null,
          p_telegram: telegramId,
          p_avatar_url: telegramUser.photoUrl || null,
          p_user_id: null
        });
          
        if (createError) {
          console.error('Error creating player:', createError);
          toast.error('Не удалось создать профиль игрока');
          return;
        }

        const result = createResult as { success: boolean; error?: string; player?: any };
        
        if (!result?.success) {
          console.error('Player creation failed:', result?.error);
          toast.error(`Ошибка: ${result?.error || 'Не удалось создать профиль'}`);
          return;
        }
        
        console.log('Player created successfully:', {
          id: result.player?.id,
          name: result.player?.name,
          avatar_url: result.player?.avatar_url || 'NO AVATAR'
        });
        
        data = result.player;
        toast.success('Профиль игрока создан!');
      }
      
      if (data) {
        setUserStats(data);
      }
    } catch (error) {
      console.error('Error in fetchUserStats:', error);
    }
  };

  const registerForTournament = async (tournamentId: string) => {
    if (!telegramUser || !userStats) {
      toast.error("Не удалось найти данные пользователя");
      return;
    }
    setRegistering(tournamentId);
    try {
      const { data, error } = await supabase.rpc('register_tournament_safe', {
        p_tournament_id: tournamentId,
        p_player_id: userStats.id
      });

      if (error) {
        throw error;
      }

      const result = data as { success: boolean; error?: string };
      if (!result?.success) {
        if (result?.error === 'Already registered') {
          toast.info("Вы уже зарегистрированы на этот турнир");
        } else if (result?.error === 'Tournament is full') {
          toast.error("Турнир заполнен");
        } else {
          toast.error(`Ошибка: ${result?.error || 'Не удалось зарегистрироваться'}`);
        }
        return;
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
    <div className="space-y-4 pb-20 px-4 bg-transparent min-h-screen relative z-10">
      <Card className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 overflow-hidden relative cursor-pointer group transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-500/20 backdrop-blur-xl" onClick={() => setActiveTab('about')}>
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
          <div className="absolute top-4 right-4 text-amber-400/30 text-5xl animate-pulse">♠</div>
          <div className="absolute top-12 left-4 text-amber-400/20 text-3xl animate-bounce-subtle">♣</div>
          <div className="absolute bottom-4 right-12 text-amber-400/25 text-4xl animate-pulse">♦</div>
          <div className="absolute bottom-12 left-12 text-amber-400/15 text-2xl animate-bounce-subtle">♥</div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-amber-400/5 text-9xl rotate-12 animate-glow">♠</div>
        </div>
        
        <CardContent className="p-5 relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-xl flex items-center justify-center overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow duration-300 ring-1 ring-white/20 group-hover:ring-amber-400/30">
              <img src={epcLogo} alt="EPC Logo" className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300" />
            </div>
            
            <div className="flex-1">
              <h1 className="text-2xl font-light text-white tracking-wide drop-shadow-lg group-hover:text-amber-100 transition-colors duration-300">
                EVENT POKER CLUB
              </h1>
              <div className="h-0.5 w-12 bg-gradient-to-r from-amber-400 to-amber-600 mt-1 group-hover:w-16 transition-all duration-500"></div>
            </div>

            {canAddToHomeScreen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToHomeScreen();
                }}
                className="text-white hover:text-amber-400 hover:bg-white/10 p-2 transition-all duration-300 rounded-lg"
                title="Установить на главный экран"
              >
                <Download className="h-5 w-5" />
              </Button>
            )}
          </div>
          
            <div className="bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-lg p-3 backdrop-blur-md border border-white/20 group-hover:border-amber-400/30 transition-all duration-300">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></div>
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
        
        <CardContent className="p-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:shadow-amber-500/30 transition-all duration-300 ring-1 ring-amber-400/20 group-hover:ring-amber-400/40">
              <Trophy className="h-5 w-5 text-white group-hover:scale-110 transition-transform duration-300" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-light text-white tracking-wide group-hover:text-amber-100 transition-colors duration-300">
                RATING POINTS
              </h3>
              <div className="h-0.5 w-10 bg-gradient-to-r from-amber-400 to-amber-600 mt-1 group-hover:w-14 transition-all duration-500"></div>
            </div>
            
            <div className="text-white/60 group-hover:text-amber-400 transition-colors duration-300">
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </div>
          
          <div className="mt-3 bg-gradient-to-r from-white/8 via-white/12 to-white/8 rounded-lg p-3 border border-white/10 group-hover:border-amber-400/20 transition-all duration-300 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <p className="text-white/80 text-sm font-medium">Общий рейтинг игроков</p>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-amber-400" />
                <span className="text-amber-400 text-sm font-semibold">TOP</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 cursor-pointer group transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20 backdrop-blur-xl relative overflow-hidden" onClick={() => setActiveTab('qa')}>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 via-transparent to-blue-600/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute inset-0 opacity-6 group-hover:opacity-15 transition-opacity duration-500">
            <div className="absolute top-3 right-3 text-purple-400/40 text-2xl animate-pulse">♣</div>
            <div className="absolute bottom-3 left-3 text-blue-400/30 text-xl animate-bounce-subtle">♠</div>
          </div>
          <CardContent className="p-4 text-center relative z-10">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-300 shadow-md">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-white font-medium text-base tracking-wide group-hover:text-purple-100 transition-colors duration-300">Q&A</h3>
            <p className="text-white/60 text-sm mt-1">Вопросы и ответы</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 cursor-pointer group transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-green-500/20 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/8 via-transparent to-emerald-600/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute inset-0 opacity-6 group-hover:opacity-15 transition-opacity duration-500">
            <div className="absolute top-3 left-3 text-green-400/40 text-2xl animate-pulse">♥</div>
            <div className="absolute bottom-3 right-3 text-emerald-400/30 text-xl animate-bounce-subtle">♦</div>
          </div>
          <CardContent className="p-4 text-center relative z-10">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-300 shadow-md">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-white font-medium text-base tracking-wide group-hover:text-green-100 transition-colors duration-300">SUPPORT</h3>
            <p className="text-white/60 text-sm mt-1">Техническая поддержка</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-0.5 h-4 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full"></div>
          <p className="text-white/80 text-base font-semibold tracking-wide">🎫 Билет на ближайший турнир</p>
          <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent"></div>
        </div>
        
        <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border-2 border-dashed border-amber-400/40 overflow-hidden cursor-pointer group transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-500/50 backdrop-blur-xl relative rounded-3xl" onClick={() => setActiveTab('tournaments')}>
          {/* Перфорированные края */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-black rounded-full -ml-3 shadow-inner border border-white/20"></div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-black rounded-full -mr-3 shadow-inner border border-white/20"></div>
          
          {/* Номер билета */}
          <div className="absolute top-3 right-4 text-amber-400/80 text-xs font-mono tracking-wider bg-white/10 px-2 py-1 rounded backdrop-blur-sm">
            #{tournaments.length > 0 ? tournaments[0].id.slice(-6).toUpperCase() : 'EPC001'}
          </div>
          
          {/* Штрих-код */}
          <div className="absolute bottom-3 right-4 flex gap-0.5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`bg-amber-400/60 ${i % 2 === 0 ? 'w-0.5 h-6' : 'w-1 h-8'}`}></div>
            ))}
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/8 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute inset-0 opacity-8 group-hover:opacity-20 transition-opacity duration-500">
            <div className="absolute top-2 left-4 text-amber-400/30 text-2xl animate-glow">♠</div>
            <div className="absolute bottom-8 left-8 text-amber-400/20 text-xl animate-bounce-subtle">♣</div>
          </div>
          
          <CardContent className="p-6 relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="text-amber-400/80 text-xs font-semibold uppercase tracking-widest mb-1">🎫 БИЛЕТ НА ТУРНИР</div>
                {tournaments.length > 0 ? (
                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-wide uppercase drop-shadow-lg group-hover:text-amber-100 transition-colors duration-300">
                      {tournaments[0].name.split(' ')[0] || 'PHOENIX'}
                    </h3>
                    <h3 className="text-xl font-bold text-amber-200 tracking-wide uppercase -mt-1 drop-shadow-lg group-hover:text-amber-100 transition-colors duration-300">
                      {tournaments[0].name.split(' ').slice(1).join(' ') || 'TOURNAMENT'}
                    </h3>
                    <div className="h-1 w-20 bg-gradient-to-r from-amber-400 to-amber-600 mt-2 group-hover:w-24 transition-all duration-500 rounded-full"></div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-wide drop-shadow-lg group-hover:text-amber-100 transition-colors duration-300">PHOENIX</h3>
                    <h3 className="text-xl font-bold text-amber-200 tracking-wide -mt-1 drop-shadow-lg group-hover:text-amber-100 transition-colors duration-300">TOURNAMENT</h3>
                    <div className="h-1 w-20 bg-gradient-to-r from-amber-400 to-amber-600 mt-2 group-hover:w-24 transition-all duration-500 rounded-full"></div>
                  </div>
                )}
              </div>
              <div className="text-amber-400 group-hover:text-amber-300 transition-colors duration-300 bg-white/10 p-3 rounded-full backdrop-blur-sm border border-amber-400/30">
                <Trophy className="h-8 w-8 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-3 bg-gradient-to-r from-white/8 via-white/12 to-white/8 rounded-xl p-4 border border-white/10 group-hover:border-amber-400/30 transition-all duration-300 backdrop-blur-sm">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="text-white font-bold text-base">
                    {tournaments.length > 0 ? `${tournaments[0]?.tournament_registrations?.[0]?.count || 0}/${tournaments[0]?.max_players}` : '509/500'}
                  </span>
                  <p className="text-white/70 text-sm font-medium">игроков</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-gradient-to-r from-white/8 via-white/12 to-white/8 rounded-xl p-4 border border-white/10 group-hover:border-amber-400/30 transition-all duration-300 backdrop-blur-sm">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="text-white font-bold text-base">
                    {tournaments.length > 0 ? new Date(tournaments[0]?.start_time).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '19:00'}
                  </span>
                  <p className="text-white/70 text-sm font-medium">время старта</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-center">
              <div className="flex items-center gap-3 text-amber-400 group-hover:gap-4 transition-all duration-300 bg-gradient-to-r from-white/10 via-white/15 to-white/10 px-6 py-3 rounded-full border border-amber-400/40 group-hover:border-amber-400/60 backdrop-blur-md group-hover:bg-gradient-to-r group-hover:from-amber-500/10 group-hover:via-amber-400/15 group-hover:to-amber-500/10">
                <span className="text-sm font-bold uppercase tracking-wider">🎫 Участвовать</span>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {userStats && (
        <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 relative overflow-hidden backdrop-blur-xl group hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-600/5 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
            <div className="absolute top-3 right-3 text-purple-400/30 text-3xl animate-pulse">♠</div>
            <div className="absolute bottom-3 left-3 text-blue-400/20 text-2xl animate-bounce-subtle">♣</div>
          </div>
          
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:shadow-purple-500/30 transition-all duration-300 ring-1 ring-purple-400/20 group-hover:ring-purple-400/40">
                <User className="h-6 w-6 text-white group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg tracking-wide group-hover:text-purple-100 transition-colors duration-300">
                  {telegramUser?.username || telegramUser?.firstName || 'Игрок'}
                </h3>
                <p className="text-white/70 text-xs mt-1">Мой профиль и статистика</p>
                <div className="h-0.5 w-12 bg-gradient-to-r from-purple-400 to-blue-500 mt-1 group-hover:w-16 transition-all duration-500"></div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-gradient-to-br from-white/8 via-white/12 to-white/8 rounded-lg border border-white/10 group-hover:border-purple-400/20 transition-all duration-300 backdrop-blur-sm hover:scale-105">
                <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-md flex items-center justify-center mx-auto mb-2">
                  <Trophy className="h-3 w-3 text-white" />
                </div>
                <div className="text-white font-bold text-base">{userStats.elo_rating}</div>
                <div className="text-white/60 text-xs">Рейтинг RPS</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-white/8 via-white/12 to-white/8 rounded-lg border border-white/10 group-hover:border-purple-400/20 transition-all duration-300 backdrop-blur-sm hover:scale-105">
                <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-md flex items-center justify-center mx-auto mb-2">
                  <Crown className="h-3 w-3 text-white" />
                </div>
                <div className="text-white font-bold text-base">{userStats.wins}</div>
                <div className="text-white/60 text-xs">Побед</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-white/8 via-white/12 to-white/8 rounded-lg border border-white/10 group-hover:border-purple-400/20 transition-all duration-300 backdrop-blur-sm hover:scale-105">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-md flex items-center justify-center mx-auto mb-2">
                  <Target className="h-3 w-3 text-white" />
                </div>
                <div className="text-white font-bold text-base">{userStats.games_played}</div>
                <div className="text-white/60 text-xs">Игр сыграно</div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded-lg border border-white/10 group-hover:border-purple-400/20 transition-all duration-300 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-5 h-5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-md flex items-center justify-center">
                  <TrendingUp className="h-2.5 w-2.5 text-white" />
                </div>
                <h4 className="text-white font-semibold text-sm">Последние достижения</h4>
              </div>
              <p className="text-white/70 text-xs leading-relaxed">Статистика обновляется после каждого турнира. Продолжайте играть для улучшения рейтинга!</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const rules = [
    {
      title: "Спортивно-развлекательный покер",
      content: "Мы проводим турниры по спортивному покеру. Любая игра на деньги в нашем клубе запрещена. Никаких денежных призов, формирования призовых фондов или иных форм азартных игр с материальным вознаграждением мы не проводим.",
      color: "from-amber-500 to-amber-600"
    },
    {
      title: "Участие в турнирах",
      content: "Участие в турнире осуществляется за фиксированную стоимость (бай-ин). Это взнос за организацию мероприятия и аренду оборудования. Участие завершается при выбывании игрока или его победе в турнире.",
      color: "from-emerald-500 to-emerald-600"
    },
    {
      title: "Взаимное уважение",
      content: "Мы руководствуемся принципами взаимного уважения. Каждый игрок имеет право на комфортную игру, пока это не препятствует комфорту других участников. Наша свобода заканчивается там, где начинается свобода другого.",
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "Рейтинговая система RPS",
      content: "В клубе действует прозрачная рейтинговая система RPS. Участники получают рейтинговые очки за результаты в турнирах. Лучшие игроки месяца получают право участия в финальных турнирах.",
      color: "from-red-500 to-red-600"
    },
    {
      title: "Безопасность и конфиденциальность",
      content: "Мы гарантируем безопасность всех участников и конфиденциальность их данных. Все турниры проводятся в соответствии с международными стандартами покерного спорта.",
      color: "from-blue-500 to-blue-600"
    }
  ];

  const renderAbout = () => (
    <div className="pb-20 px-4 bg-transparent min-h-screen relative z-10">
      {/* Header with back button */}
      <div className="flex items-center gap-3 p-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setActiveTab('home')} 
          className="text-white hover:bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/10 hover:border-amber-400/30 transition-all duration-300 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform duration-300" />
        </Button>
        <div>
          <h2 className="text-2xl font-light text-white tracking-wider">О НАС</h2>
          <div className="h-0.5 w-10 bg-gradient-to-r from-amber-400 to-amber-600 mt-1"></div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Hero Card - Compact Version */}
        <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-amber-400/20 overflow-hidden relative shadow-xl backdrop-blur-xl">
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg">
                <img src={epcLogo} alt="EPC Logo" className="w-10 h-10 object-contain" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-light text-white tracking-wide">
                  EVENT POKER CLUB
                </h1>
                <div className="h-0.5 w-16 bg-gradient-to-r from-amber-400 to-amber-600 mt-1 rounded-full"></div>
                <p className="text-white/80 text-sm mt-2 leading-relaxed">
                  Элитный покерный клуб с безупречной репутацией
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photo Gallery with Scroll */}
        <Card className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 overflow-hidden relative shadow-xl backdrop-blur-xl">
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Camera className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-white font-semibold text-lg">Наши залы</h3>
              </div>
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <span>{currentPhotoIndex + 1} / {galleryImages.length}</span>
              </div>
            </div>
            
            <div className="relative">
              <ScrollArea className="w-full whitespace-nowrap rounded-lg">
                <div className="flex gap-3 pb-2">
                  {galleryImages.map((image, index) => (
                    <div 
                      key={image.id}
                      className="flex-none w-40 h-32 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl overflow-hidden shadow-lg border border-white/10 cursor-pointer relative group"
                      onClick={() => setCurrentPhotoIndex(index)}
                    >
                      <img 
                        src={image.image_url} 
                        alt={image.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-white text-xs font-medium drop-shadow-lg truncate">
                          {image.title}
                        </p>
                      </div>
                      {index === currentPhotoIndex && (
                        <div className="absolute inset-0 border-2 border-amber-400 rounded-xl"></div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            <div className="text-center p-3 bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded-lg border border-white/10 backdrop-blur-sm mt-4">
              <p className="text-white/80 text-sm leading-relaxed">
                Профессиональные покерные залы с современным оборудованием
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Club Rules - Swipeable */}
        <Card className="bg-gradient-to-br from-blue-600/90 via-blue-700/95 to-indigo-700/90 border border-blue-400/20 backdrop-blur-xl shadow-xl relative overflow-hidden">
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/10 rounded-xl flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-white font-bold text-xl tracking-wide">
                  Наши правила
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentRuleIndex(Math.max(0, currentRuleIndex - 1))}
                  disabled={currentRuleIndex === 0}
                  className="text-white/60 hover:text-white hover:bg-white/10 p-1 rounded-md disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-white/60 text-sm min-w-[3rem] text-center">
                  {currentRuleIndex + 1} / {rules.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentRuleIndex(Math.min(rules.length - 1, currentRuleIndex + 1))}
                  disabled={currentRuleIndex === rules.length - 1}
                  className="text-white/60 hover:text-white hover:bg-white/10 p-1 rounded-md disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="min-h-[120px]">
              <div className="p-4 bg-gradient-to-r from-white/8 via-white/12 to-white/8 rounded-xl border border-white/15 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 bg-gradient-to-br ${rules[currentRuleIndex].color} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <span className="text-white text-xs font-bold">{currentRuleIndex + 1}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-semibold text-sm mb-2">{rules[currentRuleIndex].title}</h4>
                    <p className="text-white/80 text-xs leading-relaxed">
                      {rules[currentRuleIndex].content}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gradient-to-r from-amber-500/10 via-amber-600/15 to-amber-500/10 rounded-lg border border-amber-400/30 backdrop-blur-sm">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="h-2.5 w-2.5 text-white" />
                </div>
                <p className="text-white/90 text-xs leading-relaxed">
                  <span className="font-semibold">Важно:</span> Участвуя в турнирах EPC, вы автоматически соглашаетесь с данными правилами.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mission & Values - Compact */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-emerald-600/90 via-emerald-700/95 to-emerald-800/90 border border-emerald-400/20 overflow-hidden relative shadow-lg backdrop-blur-xl">
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-white/20 to-white/10 rounded-lg flex items-center justify-center">
                  <Target className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-white font-semibold text-sm">Миссия</h3>
              </div>
              <p className="text-white/90 text-xs leading-relaxed">
                Создавать профессиональную игровую среду для развития навыков в покере
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600/90 via-purple-700/95 to-blue-600/90 border border-purple-400/20 overflow-hidden relative shadow-lg backdrop-blur-xl">
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-white/20 to-white/10 rounded-lg flex items-center justify-center">
                  <Heart className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-white font-semibold text-sm">Ценности</h3>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-white/60 rounded-full"></div>
                  <span className="text-white/90 text-xs">Честность</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-white/60 rounded-full"></div>
                  <span className="text-white/90 text-xs">Профессионализм</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-white/60 rounded-full"></div>
                  <span className="text-white/90 text-xs">Дружелюбие</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact - Compact */}
        <Card className="bg-gradient-to-br from-green-600/90 via-green-700/95 to-emerald-700/90 border border-green-400/20 backdrop-blur-xl shadow-lg relative overflow-hidden">
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/10 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-white font-bold text-lg tracking-wide">
                Присоединяйтесь к EPC
              </h3>
            </div>
            
            <p className="text-white/90 text-sm mb-4 leading-relaxed">
              Станьте частью элитного покерного сообщества
            </p>
            
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-lg border border-white/20 backdrop-blur-sm">
                <CheckCircle className="h-4 w-4 text-green-300 flex-shrink-0" />
                <span className="text-white text-xs font-medium">100% легальная деятельность</span>
              </div>
              
              <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-lg border border-white/20 backdrop-blur-sm">
                <Globe className="h-4 w-4 text-blue-300 flex-shrink-0" />
                <span className="text-white text-xs font-medium">Международные стандарты</span>
              </div>
              
              <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-lg border border-white/20 backdrop-blur-sm">
                <Users className="h-4 w-4 text-amber-300 flex-shrink-0" />
                <span className="text-white text-xs font-medium">Активное сообщество</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
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
    <div className="max-w-lg mx-auto bg-black min-h-screen relative overflow-hidden">
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
      {activeTab === 'about' && renderAbout()}
      
      {activeTab === 'tournaments' && (
        <div className="space-y-4 pb-20 px-4 bg-transparent min-h-screen relative z-10">
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-light text-white tracking-wider">ТУРНИРЫ</h2>
              <div className="h-0.5 w-16 bg-gradient-to-r from-amber-400 to-amber-600 mt-2"></div>
            </div>
          </div>
          
          {tournaments.map((tournament, index) => (
            <Card key={tournament.id} className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border-2 border-dashed border-amber-400/40 backdrop-blur-xl shadow-xl group hover:shadow-2xl hover:shadow-amber-500/50 transition-all duration-500 relative overflow-hidden cursor-pointer rounded-3xl hover:scale-[1.01]"
                  onClick={() => {
                    setSelectedTournament(tournament);
                    setShowTournamentModal(true);
                  }}>
              {/* Перфорированные края */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-black rounded-full -ml-3 shadow-inner border border-white/20"></div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-black rounded-full -mr-3 shadow-inner border border-white/20"></div>
              
              {/* Номер билета */}
              <div className="absolute top-3 right-4 text-amber-400/80 text-xs font-mono tracking-wider bg-white/10 px-2 py-1 rounded backdrop-blur-sm">
                #{tournament.id.slice(-6).toUpperCase()}
              </div>
              
              {/* Штрих-код */}
              <div className="absolute bottom-3 right-4 flex gap-0.5">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`bg-amber-400/60 ${i % 2 === 0 ? 'w-0.5 h-6' : 'w-1 h-8'}`}></div>
                ))}
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/8 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                <div className="absolute top-3 left-4 text-2xl text-amber-400/30 animate-pulse">♠</div>
                <div className="absolute bottom-8 left-8 text-xl text-amber-400/20 animate-bounce-subtle">♣</div>
              </div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="text-amber-400/80 text-xs font-semibold uppercase tracking-widest mb-1">🎫 БИЛЕТ НА ТУРНИР</div>
                    <h3 className="text-xl font-bold text-white tracking-wide uppercase mb-2 group-hover:text-amber-100 transition-colors duration-300">
                      {tournament.name}
                    </h3>
                    <div className="h-1 w-12 bg-gradient-to-r from-amber-400 to-amber-600 group-hover:w-16 transition-all duration-500 rounded-full"></div>
                    {tournament.description && (
                      <p className="text-white/60 text-sm mt-2 line-clamp-1">{tournament.description}</p>
                    )}
                  </div>
                  <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center border border-amber-400/30 group-hover:scale-110 transition-transform duration-300">
                    <Trophy className="h-5 w-5 text-amber-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-white/8 via-white/12 to-white/8 rounded-xl border border-white/10 group-hover:border-amber-400/20 transition-all duration-300 backdrop-blur-sm">
                    <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <span className="text-white font-bold text-sm">{tournament.tournament_registrations?.[0]?.count || 0}/{tournament.max_players}</span>
                      <p className="text-white/60 text-xs">участников</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-white/8 via-white/12 to-white/8 rounded-xl border border-white/10 group-hover:border-amber-400/20 transition-all duration-300 backdrop-blur-sm">
                    <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <span className="text-white font-bold text-sm">{new Date(tournament.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                      <p className="text-white/60 text-xs">{new Date(tournament.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-white/8 via-white/12 to-white/8 rounded-xl border border-white/10 group-hover:border-amber-400/20 transition-all duration-300 backdrop-blur-sm">
                    <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                      <Coins className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <span className="text-white font-bold text-sm">{tournament.participation_fee.toLocaleString()} ₽</span>
                      <p className="text-white/60 text-xs">орг. взнос</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-white/8 via-white/12 to-white/8 rounded-lg border border-white/10 group-hover:border-amber-400/20 transition-all duration-300 backdrop-blur-sm">
                    <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-red-600 rounded-md flex items-center justify-center">
                      <Target className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <span className="text-white font-semibold text-sm">{tournament.starting_chips?.toLocaleString() || 'N/A'}</span>
                      <p className="text-white/60 text-xs">стартовый стек</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 mt-4">
                  <div className="flex items-center gap-2 text-amber-400 group-hover:gap-3 transition-all duration-300">
                    <span className="text-sm font-bold uppercase tracking-wider">🎫 Подробнее</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                  
                  <Badge 
                    className={`px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm ${
                      tournament.status === 'registration' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      tournament.status === 'running' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      tournament.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}
                  >
                    {tournament.status === 'registration' ? 'Регистрация открыта' :
                     tournament.status === 'running' ? 'Турнир проходит' :
                     tournament.status === 'scheduled' ? 'Запланирован' :
                     tournament.status}
                  </Badge>
                </div>
                
                {tournament.status === 'registration' && (
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      registerForTournament(tournament.id);
                    }} 
                    disabled={registering === tournament.id} 
                    className="w-full mt-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-amber-500/40 transition-all duration-300 group-hover:scale-[1.02] border-0 text-sm uppercase tracking-wider"
                  >
                    {registering === tournament.id ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Регистрируем...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>🎫 Записаться на турнир</span>
                      </div>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'rating' && (
        <div className="space-y-4 pb-20 px-4 bg-transparent min-h-screen relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-light text-white tracking-wider">ЛЕГЕНДЫ EPC</h1>
              <div className="h-0.5 w-16 bg-gradient-to-r from-amber-400 to-amber-600 mt-1"></div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-gradient-to-br from-emerald-600/90 via-emerald-700/95 to-emerald-800/90 border border-emerald-400/20 backdrop-blur-xl shadow-lg group hover:shadow-emerald-500/20 transition-all duration-500 relative overflow-hidden hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-600/15 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-2 right-2 text-emerald-300/30 text-2xl animate-pulse">♠</div>
              
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-white/20 to-white/10 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-lg">{players.length}</div>
                    <div className="text-white/80 text-xs">Активных игроков</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-600/90 via-purple-700/95 to-indigo-700/90 border border-purple-400/20 backdrop-blur-xl shadow-lg group hover:shadow-purple-500/20 transition-all duration-500 relative overflow-hidden hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-indigo-600/15 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-2 right-2 text-purple-300/30 text-2xl animate-pulse">♥</div>
              
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-white/20 to-white/10 rounded-lg flex items-center justify-center">
                    <Trophy className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-lg">{players[0]?.elo_rating || 0}</div>
                    <div className="text-white/80 text-xs">Лучший рейтинг</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top 3 Podium */}
          {players.length >= 3 && (
            <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-amber-400/20 backdrop-blur-xl shadow-xl group hover:shadow-amber-500/20 transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/8 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                <div className="absolute top-3 right-3 text-amber-400/30 text-3xl animate-glow">♠</div>
                <div className="absolute bottom-3 left-3 text-amber-400/20 text-2xl animate-bounce-subtle">♦</div>
              </div>
              
              <CardContent className="p-5 relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full"></div>
                  <h3 className="text-white font-semibold text-base tracking-wide">ТОП-3 ИГРОКОВ</h3>
                </div>
                
                <div className="flex items-end justify-center gap-2">
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center">
                    <div className="relative mb-2">
                      <Avatar className="w-10 h-10 ring-2 ring-gray-400/40">
                        <AvatarImage src={players[1]?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-gray-500 to-gray-600 text-white text-xs">{players[1]?.name?.[0] || 'P'}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-xs">
                        🥈
                      </div>
                    </div>
                    <div className="w-12 h-16 bg-gradient-to-t from-gray-400/30 to-gray-500/20 rounded-t-lg border border-gray-400/20 flex flex-col items-center justify-end pb-2">
                      <span className="text-gray-300 text-xs font-bold">{players[1]?.elo_rating}</span>
                    </div>
                    <p className="text-white/80 text-xs mt-1 text-center truncate w-12">{players[1]?.name}</p>
                  </div>

                  {/* 1st Place */}
                  <div className="flex flex-col items-center">
                    <div className="relative mb-2">
                      <Avatar className="w-12 h-12 ring-2 ring-amber-400/50">
                        <AvatarImage src={players[0]?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-amber-500 to-amber-600 text-white text-sm">{players[0]?.name?.[0] || 'P'}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center">
                        👑
                      </div>
                    </div>
                    <div className="w-14 h-20 bg-gradient-to-t from-amber-500/30 to-amber-400/20 rounded-t-lg border border-amber-400/30 flex flex-col items-center justify-end pb-2">
                      <span className="text-amber-400 text-sm font-bold">{players[0]?.elo_rating}</span>
                    </div>
                    <p className="text-white text-xs mt-1 text-center font-medium truncate w-14">{players[0]?.name}</p>
                  </div>

                  {/* 3rd Place */}
                  <div className="flex flex-col items-center">
                    <div className="relative mb-2">
                      <Avatar className="w-10 h-10 ring-2 ring-orange-400/40">
                        <AvatarImage src={players[2]?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs">{players[2]?.name?.[0] || 'P'}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-xs">
                        🥉
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-t from-orange-500/30 to-orange-400/20 rounded-t-lg border border-orange-400/20 flex flex-col items-center justify-end pb-2">
                      <span className="text-orange-400 text-xs font-bold">{players[2]?.elo_rating}</span>
                    </div>
                    <p className="text-white/80 text-xs mt-1 text-center truncate w-12">{players[2]?.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Players List */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-0.5 h-4 bg-gradient-to-b from-purple-400 to-purple-600 rounded-full"></div>
              <p className="text-white/80 text-sm font-semibold tracking-wide">Полный рейтинг</p>
              <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent"></div>
            </div>
            
            {players.map((player, index) => (
              <Card key={player.id} className={`backdrop-blur-xl shadow-lg group hover:shadow-xl transition-all duration-500 relative overflow-hidden border ${
                  index === 0 ? 'bg-gradient-to-r from-amber-600/20 to-amber-700/10 border-amber-400/30 hover:shadow-amber-500/20' :
                  index === 1 ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/30 hover:shadow-gray-500/20' :
                  index === 2 ? 'bg-gradient-to-r from-orange-600/20 to-orange-700/10 border-orange-400/30 hover:shadow-orange-500/20' :
                  'bg-gradient-to-r from-slate-800/90 to-slate-900/80 border-white/10 hover:shadow-purple-500/20'
                } hover:scale-[1.01] cursor-pointer`}>
                <div className={`absolute inset-0 opacity-60 group-hover:opacity-100 transition-opacity duration-500 ${
                  index === 0 ? 'bg-gradient-to-r from-amber-500/8 to-transparent' :
                  index === 1 ? 'bg-gradient-to-r from-gray-400/8 to-transparent' :
                  index === 2 ? 'bg-gradient-to-r from-orange-500/8 to-transparent' :
                  'bg-gradient-to-r from-purple-500/5 to-transparent'
                }`}></div>
                
                <div className="absolute top-2 right-2 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                  <div className={`text-2xl animate-pulse ${
                    index < 3 ? 'text-amber-400/30' : 'text-purple-400/30'
                  }`}>
                    {index === 0 ? '♠' : index === 1 ? '♥' : index === 2 ? '♦' : '♣'}
                  </div>
                </div>
                
                <CardContent className="p-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 min-w-[1.5rem]">
                      <span className={`text-sm font-bold ${
                        index < 3 ? 'text-amber-400' : 'text-white/60'
                      }`}>
                        #{index + 1}
                      </span>
                    </div>
                    
                    <div className="relative">
                      <Avatar className="w-10 h-10 ring-1 ring-white/20 group-hover:ring-amber-400/30 transition-all duration-300">
                        <AvatarImage src={player.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-white font-semibold text-sm">{player.name?.[0] || 'P'}</AvatarFallback>
                      </Avatar>
                      {index < 3 && (
                        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ${
                          index === 0 ? 'bg-gradient-to-br from-amber-500 to-amber-600' :
                          index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                          'bg-gradient-to-br from-orange-500 to-orange-600'
                        }`}>
                          {index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-white font-medium text-sm group-hover:text-amber-100 transition-colors duration-300">{player.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-white/60 text-xs">{player.games_played} игр</p>
                        <div className="w-1 h-1 bg-white/40 rounded-full"></div>
                        <p className="text-white/60 text-xs">{player.wins} побед</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        index === 0 ? 'text-amber-400' :
                        index === 1 ? 'text-gray-300' :
                        index === 2 ? 'text-orange-400' :
                        'text-white'
                      } group-hover:scale-110 transition-transform duration-300`}>
                        {player.elo_rating}
                      </div>
                      <p className="text-white/60 text-xs">RPS</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <TelegramProfile 
          telegramUser={telegramUser}
          userStats={userStats}
          onStatsUpdate={setUserStats}
        />
      )}

      {activeTab === 'qa' && (
        <div className="space-y-6 pb-20 px-4 bg-transparent min-h-screen relative z-10">
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
            <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 backdrop-blur-xl shadow-xl group hover:shadow-2xl hover:shadow-green-500/20 transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-600/5 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-green-400/30 text-3xl animate-pulse">♠</div>
              </div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-3 group-hover:text-green-100 transition-colors duration-300">1. Это законно?</h3>
                    <p className="text-white/80 text-sm leading-relaxed">Абсолютно! Мы проводим спортивные турниры без денежных призов, что полностью соответствует российскому законодательству. Согласно ФЗ №244, запрещены только азартные игры с материальными выигрышами. Event Poker Club — это спортивное сообщество для развития навыков и общения.</p>
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
                    <h3 className="text-white font-semibold text-lg mb-3 group-hover:text-blue-100 transition-colors duration-300">2. Зачем играть без призов?</h3>
                    <p className="text-white/80 text-sm leading-relaxed">EPC — это уникальное комьюнити единомышленников! Где еще вы найдете профессиональное оборудование, отличный сервис и возможность развивать покерные навыки в безопасной среде? Мы создаем атмосферу спортивного соревнования и дружеского общения.</p>
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
                    <h3 className="text-white font-semibold text-lg mb-3 group-hover:text-amber-100 transition-colors duration-300">3. Как работает рейтинг EPC?</h3>
                    <p className="text-white/80 text-sm leading-relaxed">В Event Poker Club действует продуманная RPS-система для честного ранжирования участников. Рейтинговые очки начисляются за результативные выступления в турнирах и отражают исключительно игровое мастерство. Система мотивирует на спортивное развитие и определяет лучших игроков клуба.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 backdrop-blur-xl shadow-xl group hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-600/5 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-purple-400/30 text-3xl animate-pulse">♥</div>
              </div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Crown className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-3 group-hover:text-purple-100 transition-colors duration-300">4. Что такое VIP-турниры?</h3>
                    <p className="text-white/80 text-sm leading-relaxed">Это эксклюзивные события для топовых игроков рейтинга EPC. Проводятся в особом формате с повышенным комфортом и сервисом. Участие строго по приглашениям на основе достижений в рейтинге. Место нельзя передать — только личное участие лучших игроков клуба.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 backdrop-blur-xl shadow-xl group hover:shadow-2xl hover:shadow-cyan-500/20 transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-600/5 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-cyan-400/30 text-3xl animate-bounce-subtle">♠</div>
              </div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <UserPlus className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-3 group-hover:text-cyan-100 transition-colors duration-300">5. Как записаться на турнир?</h3>
                    <p className="text-white/80 text-sm leading-relaxed">После первичной регистрации в нашем Telegram-боте, вы получаете доступ к удобному мини-приложению. В нем можно бронировать места на любые турниры. Внимание: количество мест ограничено! При частых пропусках без предупреждения возможность записи может быть временно ограничена.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 backdrop-blur-xl shadow-xl group hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-600/5 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-orange-400/30 text-3xl animate-glow">♣</div>
              </div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Coins className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-3 group-hover:text-orange-100 transition-colors duration-300">6. Что такое организационный взнос?</h3>
                    <p className="text-white/80 text-sm leading-relaxed">Это плата за комплекс услуг: аренду профессионального оборудования, игровых фишек, зала и сервисное обслуживание. Фишки — исключительно игровое оборудование без денежной стоимости, их нельзя обменять или вывести. Повторный вход (re-entry) оплачивается отдельно.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 backdrop-blur-xl shadow-xl group hover:shadow-2xl hover:shadow-teal-500/20 transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-green-600/5 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-teal-400/30 text-3xl animate-pulse">♦</div>
              </div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-green-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-3 group-hover:text-teal-100 transition-colors duration-300">7. Что такое поздняя регистрация?</h3>
                    <p className="text-white/80 text-sm leading-relaxed">Это возможность присоединиться к турниру после официального старта — полезно, если вы опаздываете или хотите сделать повторный вход. Время поздней регистрации указывается для каждого турнира отдельно. После её завершения предусмотрен короткий перерыв для окончательного входа.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 backdrop-blur-xl shadow-xl group hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-600/5 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-indigo-400/30 text-3xl animate-bounce-subtle">♥</div>
              </div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Target className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-3 group-hover:text-indigo-100 transition-colors duration-300">8. Что такое стартовый стек?</h3>
                    <p className="text-white/80 text-sm leading-relaxed">Это набор игровых фишек, который получает каждый участник турнира. Фишки — развлекательное оборудование без денежной стоимости, их нельзя обменять или вывести. Стандартный стартовый стек в Event Poker Club составляет 30,000 фишек для всех участников.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 backdrop-blur-xl shadow-xl group hover:shadow-2xl hover:shadow-pink-500/20 transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-rose-600/5 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-pink-400/30 text-3xl animate-glow">♠</div>
              </div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-3 group-hover:text-pink-100 transition-colors duration-300">9. Как работает лист ожидания?</h3>
                    <p className="text-white/80 text-sm leading-relaxed">Если турнир полностью забронирован, вы можете встать в лист ожидания. При освобождении мест участники переносятся в основной список в порядке очереди. Можно также приехать лично и занять живую очередь — это обсуждается с администратором индивидуально.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

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

      <TelegramTournamentModal
        tournament={selectedTournament}
        open={showTournamentModal}
        onOpenChange={setShowTournamentModal}
        onRegister={registerForTournament}
        registering={registering !== null}
      />
    </div>
  );
};