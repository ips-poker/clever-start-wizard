import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Calendar, Users, Star, MessageSquare, User, Home, TrendingUp, Clock, MapPin, Coins, ChevronRight, Award, Target, CheckCircle, UserPlus, Loader2, Crown, Gem, Zap, Shield, Play, Pause, CircleDot, ArrowLeft, Heart, Globe, Camera, ChevronLeft, Download, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TelegramAuth } from './TelegramAuth';
import { TelegramTournamentModal } from './TelegramTournamentModal';
import { TelegramProfile } from './TelegramProfile';
import { toast } from 'sonner';
import { addToHomeScreen } from '@telegram-apps/sdk';
import syndikateLogo from '@/assets/syndikate-logo-main.png';
import { GlitchText } from '@/components/ui/glitch-text';
import { FloatingParticles } from '@/components/ui/floating-particles';
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
  const [userRegistrations, setUserRegistrations] = useState<Set<string>>(new Set());
  const [scrollY, setScrollY] = useState(0);
  
  // Refs for parallax effects
  const baseTextureRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const glowTopRef = useRef<HTMLDivElement>(null);
  const glowBottomRef = useRef<HTMLDivElement>(null);

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

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const currentScrollY = target.scrollTop || 0;
      setScrollY(currentScrollY);
      
      if (baseTextureRef.current) {
        baseTextureRef.current.style.transform = `translateY(${currentScrollY * 0.15}px)`;
      }
      if (gridRef.current) {
        gridRef.current.style.transform = `translateY(${currentScrollY * 0.25}px)`;
      }
      if (glowTopRef.current) {
        glowTopRef.current.style.transform = `translate(-24px, ${-128 + currentScrollY * 0.1}px)`;
      }
      if (glowBottomRef.current) {
        glowBottomRef.current.style.transform = `translate(-120px, ${-180 + currentScrollY * 0.2}px)`;
      }
    };

    const contentElement = document.querySelector('.telegram-content');
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll, { passive: true });
      return () => contentElement.removeEventListener('scroll', handleScroll);
    }
  }, [activeTab]);

  useEffect(() => {
    if (isAuthenticated && telegramUser) {
      fetchData();
      fetchGalleryImages();
      setupRealtimeSubscriptions();
    }
  }, [isAuthenticated, telegramUser]);

  useEffect(() => {
    if (userStats) {
      fetchUserRegistrations();
    }
  }, [userStats]);

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
      fetchUserRegistrations();
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
      await Promise.all([fetchTournaments(), fetchPlayers(), fetchUserStats(), fetchUserRegistrations()]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const fetchUserRegistrations = async () => {
    if (!userStats) return;
    
    try {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select('tournament_id')
        .eq('player_id', userStats.id)
        .in('status', ['registered', 'confirmed', 'playing']);

      if (error) throw error;
      
      const registeredIds = new Set(data?.map(r => r.tournament_id) || []);
      setUserRegistrations(registeredIds);
    } catch (error) {
      console.error('Error fetching user registrations:', error);
    }
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
      await fetchTournaments();
      await fetchUserRegistrations();
    } catch (error) {
      console.error('Error registering for tournament:', error);
      toast.error("Не удалось зарегистрироваться на турнир");
    } finally {
      setRegistering(null);
    }
  };

  const unregisterFromTournament = async (tournamentId: string) => {
    if (!userStats) {
      toast.error("Не удалось найти данные пользователя");
      return;
    }
    
    try {
      setLoading(true);
      
      // Удаляем регистрацию по tournament_id и player_id (как на сайте)
      const { error } = await supabase
        .from('tournament_registrations')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('player_id', userStats.id);

      if (error) {
        throw error;
      }

      toast.success("Регистрация отменена");
      
      // Обновляем список турниров и регистраций
      await fetchTournaments();
      await fetchUserRegistrations();
    } catch (error) {
      console.error('Error unregistering from tournament:', error);
      toast.error("Не удалось отменить регистрацию");
    } finally {
      setLoading(false);
    }
  };

  const renderHome = () => (
    <div className="space-y-4 pb-20 px-4 pt-24 bg-transparent min-h-screen relative z-10">
      <Card className="bg-syndikate-metal/90 brutal-border overflow-hidden relative cursor-pointer group transition-all duration-500 hover:scale-[1.02] hover:shadow-neon-orange backdrop-blur-xl" onClick={() => setActiveTab('about')}>
        <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
          <div className="absolute top-4 right-4 text-syndikate-orange/30 text-5xl animate-pulse">♠</div>
          <div className="absolute top-12 left-4 text-syndikate-orange/20 text-3xl">♣</div>
          <div className="absolute bottom-4 right-12 text-syndikate-orange/25 text-4xl animate-pulse">♦</div>
          <div className="absolute bottom-12 left-12 text-syndikate-orange/15 text-2xl">♥</div>
        </div>
        
        <CardContent className="p-5 relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 border-2 border-syndikate-orange bg-syndikate-concrete brutal-border flex items-center justify-center overflow-hidden shadow-lg group-hover:shadow-neon-orange transition-shadow duration-300 p-2">
              <img src={syndikateLogo} alt="Syndikate Logo" className="w-full h-full object-contain neon-orange group-hover:scale-110 transition-transform duration-300" />
            </div>
            
            <div className="flex-1">
              <h1 className="font-display text-3xl uppercase text-foreground tracking-wider drop-shadow-lg group-hover:text-syndikate-orange transition-colors duration-300">
                <GlitchText 
                  text="SYNDIKATE" 
                  glitchIntensity="high" 
                  glitchInterval={4500}
                />
              </h1>
              <div className="h-[2px] w-16 bg-gradient-neon mt-1 group-hover:w-24 transition-all duration-500"></div>
              <p className="font-display text-sm uppercase tracking-wider text-syndikate-orange mt-1">
                Власть за столом
              </p>
            </div>

            {canAddToHomeScreen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToHomeScreen();
                }}
                className="text-foreground hover:text-syndikate-orange hover:bg-syndikate-metal p-2 transition-all duration-300"
                title="Установить на главный экран"
              >
                <Download className="h-5 w-5" />
              </Button>
            )}
          </div>
          
          <div className="bg-syndikate-concrete/50 brutal-border p-3 backdrop-blur-md group-hover:border-syndikate-orange/30 transition-all duration-300">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-syndikate-orange brutal-border animate-pulse"></div>
              <p className="text-foreground text-base font-bold uppercase tracking-wide">Узнать больше о клубе</p>
              <ChevronRight className="h-4 w-4 text-syndikate-orange ml-auto group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-syndikate-metal/90 brutal-border overflow-hidden cursor-pointer group transition-all duration-500 hover:scale-[1.02] hover:shadow-neon-orange backdrop-blur-xl relative" onClick={() => setActiveTab('rating')}>
        <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
          <div className="absolute top-6 right-6 text-syndikate-orange/30 text-4xl animate-pulse">♦</div>
          <div className="absolute bottom-6 left-6 text-syndikate-orange/20 text-3xl">♥</div>
        </div>
        
        <CardContent className="p-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-syndikate-orange brutal-border flex items-center justify-center shadow-neon-orange group-hover:shadow-neon-orange transition-all duration-300">
              <Trophy className="h-5 w-5 text-background group-hover:scale-110 transition-transform duration-300" />
            </div>
            
            <div className="flex-1">
              <h3 className="font-display text-xl uppercase text-foreground tracking-wider group-hover:text-syndikate-orange transition-colors duration-300">
                RATING POINTS
              </h3>
              <div className="h-[2px] w-10 bg-gradient-neon mt-1 group-hover:w-14 transition-all duration-500"></div>
            </div>
            
            <div className="text-muted-foreground group-hover:text-syndikate-orange transition-colors duration-300">
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </div>
          
          <div className="mt-3 bg-syndikate-concrete/50 brutal-border p-3 group-hover:border-syndikate-orange/30 transition-all duration-300 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <p className="text-foreground text-sm font-bold uppercase tracking-wider">Общий рейтинг</p>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-syndikate-orange" />
                <span className="text-syndikate-orange text-sm font-bold">TOP</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-syndikate-metal/90 brutal-border cursor-pointer group transition-all duration-500 hover:scale-105 hover:shadow-neon-orange backdrop-blur-xl relative overflow-hidden" onClick={() => setActiveTab('qa')}>
          <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
            <div className="absolute top-3 right-3 text-syndikate-orange/40 text-2xl animate-pulse">♣</div>
            <div className="absolute bottom-3 left-3 text-syndikate-orange/30 text-xl">♠</div>
          </div>
          <CardContent className="p-4 text-center relative z-10">
            <div className="w-8 h-8 bg-syndikate-orange brutal-border flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-300 shadow-md">
              <MessageSquare className="h-4 w-4 text-background" />
            </div>
            <h3 className="text-foreground font-bold uppercase text-base tracking-wider group-hover:text-syndikate-orange transition-colors duration-300">Q&A</h3>
            <p className="text-muted-foreground text-sm mt-1">Вопросы и ответы</p>
          </CardContent>
        </Card>

        <Card className="bg-syndikate-metal/90 brutal-border cursor-pointer group transition-all duration-500 hover:scale-105 hover:shadow-neon-orange backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
            <div className="absolute top-3 left-3 text-syndikate-orange/40 text-2xl animate-pulse">♥</div>
            <div className="absolute bottom-3 right-3 text-syndikate-orange/30 text-xl">♦</div>
          </div>
          <CardContent className="p-4 text-center relative z-10">
            <div className="w-8 h-8 bg-syndikate-orange brutal-border flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-300 shadow-md">
              <Shield className="h-4 w-4 text-background" />
            </div>
            <h3 className="text-foreground font-bold uppercase text-base tracking-wider group-hover:text-syndikate-orange transition-colors duration-300">SUPPORT</h3>
            <p className="text-muted-foreground text-sm mt-1">Техническая поддержка</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-5 bg-gradient-neon brutal-border"></div>
          <p className="text-foreground text-base font-bold uppercase tracking-wide">🎫 Билет на ближайший турнир</p>
          <div className="flex-1 h-[2px] bg-syndikate-rust/30"></div>
        </div>
        
        <Card className="bg-syndikate-metal/95 brutal-border border-2 border-dashed border-syndikate-orange/40 overflow-hidden cursor-pointer group transition-all duration-500 hover:scale-[1.02] hover:shadow-neon-orange backdrop-blur-xl relative" onClick={() => setActiveTab('tournaments')}>
          {/* Перфорированные края */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-background brutal-border -ml-3"></div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-background brutal-border -mr-3"></div>
          
          {/* Номер билета */}
          <div className="absolute top-3 right-4 text-syndikate-orange text-xs font-mono tracking-wider bg-syndikate-concrete/50 px-2 py-1 brutal-border backdrop-blur-sm">
            #{tournaments.length > 0 ? tournaments[0].id.slice(-6).toUpperCase() : 'EPC001'}
          </div>
          
          {/* Штрих-код */}
          <div className="absolute bottom-3 right-4 flex gap-0.5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`bg-syndikate-orange/60 ${i % 2 === 0 ? 'w-0.5 h-6' : 'w-1 h-8'}`}></div>
            ))}
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
            <div className="absolute top-2 left-4 text-syndikate-orange/30 text-2xl animate-pulse">♠</div>
            <div className="absolute bottom-8 left-8 text-syndikate-orange/20 text-xl">♣</div>
          </div>
          
          <CardContent className="p-6 relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="text-syndikate-orange text-xs font-bold uppercase tracking-widest mb-1">🎫 БИЛЕТ НА ТУРНИР</div>
                {tournaments.length > 0 ? (
                  <div>
                    <h3 className="text-2xl font-display font-bold text-foreground tracking-wide uppercase drop-shadow-lg group-hover:text-syndikate-orange transition-colors duration-300">
                      {tournaments[0].name.split(' ')[0] || 'PHOENIX'}
                    </h3>
                    <h3 className="text-xl font-display font-bold text-syndikate-orange tracking-wide uppercase -mt-1 drop-shadow-lg group-hover:text-syndikate-orange-glow transition-colors duration-300">
                      {tournaments[0].name.split(' ').slice(1).join(' ') || 'TOURNAMENT'}
                    </h3>
                    <div className="h-[2px] w-20 bg-gradient-neon mt-2 group-hover:w-24 transition-all duration-500"></div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-2xl font-display font-bold text-foreground tracking-wide drop-shadow-lg group-hover:text-syndikate-orange transition-colors duration-300">PHOENIX</h3>
                    <h3 className="text-xl font-display font-bold text-syndikate-orange tracking-wide -mt-1 drop-shadow-lg group-hover:text-syndikate-orange-glow transition-colors duration-300">TOURNAMENT</h3>
                    <div className="h-[2px] w-20 bg-gradient-neon mt-2 group-hover:w-24 transition-all duration-500"></div>
                  </div>
                )}
              </div>
              <div className="text-syndikate-orange group-hover:text-syndikate-orange-glow transition-colors duration-300 bg-syndikate-concrete/50 p-3 brutal-border backdrop-blur-sm">
                <Trophy className="h-8 w-8 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-3 bg-syndikate-concrete/50 brutal-border p-4 group-hover:border-syndikate-orange/30 transition-all duration-300 backdrop-blur-sm">
                <div className="w-8 h-8 bg-syndikate-orange brutal-border flex items-center justify-center shadow-lg">
                  <Users className="h-4 w-4 text-background" />
                </div>
                <div>
                  <span className="text-foreground font-bold text-base">
                    {tournaments.length > 0 ? `${tournaments[0]?.tournament_registrations?.[0]?.count || 0}/${tournaments[0]?.max_players}` : '509/500'}
                  </span>
                  <p className="text-muted-foreground text-sm font-medium">игроков</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-syndikate-concrete/50 brutal-border p-4 group-hover:border-syndikate-orange/30 transition-all duration-300 backdrop-blur-sm">
                <div className="w-8 h-8 bg-syndikate-orange brutal-border flex items-center justify-center shadow-lg">
                  <Clock className="h-4 w-4 text-background" />
                </div>
                <div>
                  <span className="text-foreground font-bold text-base">
                    {tournaments.length > 0 ? new Date(tournaments[0]?.start_time).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '19:00'}
                  </span>
                  <p className="text-muted-foreground text-sm font-medium">время старта</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-center">
              <div className="flex items-center gap-3 text-syndikate-orange group-hover:gap-4 transition-all duration-300 bg-syndikate-concrete/50 brutal-border px-6 py-3 group-hover:border-syndikate-orange/60 backdrop-blur-md group-hover:bg-syndikate-concrete/70">
                <span className="text-sm font-bold uppercase tracking-wider">🎫 Участвовать</span>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {userStats && (
        <Card className="bg-syndikate-metal/90 brutal-border overflow-hidden relative shadow-brutal backdrop-blur-xl group hover:shadow-neon-orange transition-all duration-500 animate-fade-in">
          {/* Industrial texture overlay */}
          <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
            <div className="absolute inset-0" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 107, 0, 0.03) 10px, rgba(255, 107, 0, 0.03) 20px)'
            }}></div>
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          {/* Animated card suits */}
          <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
            <div className="absolute top-4 right-4 text-syndikate-orange/40 text-4xl animate-pulse">♠</div>
            <div className="absolute top-12 left-4 text-syndikate-orange/20 text-3xl">♣</div>
            <div className="absolute bottom-4 right-8 text-syndikate-red/30 text-3xl animate-pulse">♦</div>
            <div className="absolute bottom-8 left-8 text-syndikate-red/20 text-2xl">♥</div>
          </div>
          
          {/* Corner brackets */}
          <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-syndikate-orange/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-syndikate-orange/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-syndikate-orange/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-syndikate-orange/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-syndikate-orange to-syndikate-red brutal-border flex items-center justify-center shadow-lg group-hover:shadow-neon-orange transition-all duration-300 group-hover:scale-110">
                <User className="h-7 w-7 text-background" />
              </div>
              <div className="flex-1">
                <h3 className="text-foreground font-display font-bold text-xl uppercase tracking-wider drop-shadow-lg group-hover:text-syndikate-orange transition-colors duration-300">
                  <GlitchText text={telegramUser?.username || telegramUser?.firstName || 'ИГРОК'} glitchIntensity="low" />
                </h3>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mt-1 font-display">Мой профиль и статистика</p>
                <div className="h-[2px] w-12 bg-gradient-neon mt-2 group-hover:w-20 transition-all duration-500"></div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-4 bg-syndikate-concrete/60 brutal-border backdrop-blur-sm group/stat hover:bg-syndikate-concrete/80 hover:shadow-neon-orange transition-all duration-300 hover:scale-105 relative overflow-hidden">
                <div className="absolute top-1 right-1 text-syndikate-orange/20 text-lg">♠</div>
                <div className="w-8 h-8 bg-syndikate-orange brutal-border flex items-center justify-center mx-auto mb-2 shadow-md group-hover/stat:shadow-neon-orange transition-shadow duration-300">
                  <Trophy className="h-4 w-4 text-background" />
                </div>
                <div className="text-foreground font-bold text-lg font-display neon-orange">{userStats.elo_rating}</div>
                <div className="text-muted-foreground text-xs uppercase tracking-wider font-display">Рейтинг RPS</div>
              </div>
              
              <div className="text-center p-4 bg-syndikate-concrete/60 brutal-border backdrop-blur-sm group/stat hover:bg-syndikate-concrete/80 hover:shadow-neon-red transition-all duration-300 hover:scale-105 relative overflow-hidden">
                <div className="absolute top-1 right-1 text-syndikate-red/20 text-lg">♥</div>
                <div className="w-8 h-8 bg-syndikate-red brutal-border flex items-center justify-center mx-auto mb-2 shadow-md group-hover/stat:shadow-neon-red transition-shadow duration-300">
                  <Crown className="h-4 w-4 text-background" />
                </div>
                <div className="text-foreground font-bold text-lg font-display neon-red">{userStats.wins}</div>
                <div className="text-muted-foreground text-xs uppercase tracking-wider font-display">Побед</div>
              </div>
              
              <div className="text-center p-4 bg-syndikate-concrete/60 brutal-border backdrop-blur-sm group/stat hover:bg-syndikate-concrete/80 hover:shadow-neon-orange transition-all duration-300 hover:scale-105 relative overflow-hidden">
                <div className="absolute top-1 right-1 text-syndikate-orange/20 text-lg">♦</div>
                <div className="w-8 h-8 bg-syndikate-metal-light brutal-border flex items-center justify-center mx-auto mb-2 shadow-md group-hover/stat:shadow-neon-orange transition-shadow duration-300">
                  <Target className="h-4 w-4 text-syndikate-orange" />
                </div>
                <div className="text-foreground font-bold text-lg font-display">{userStats.games_played}</div>
                <div className="text-muted-foreground text-xs uppercase tracking-wider font-display">Игр сыграно</div>
              </div>
            </div>
            
            <div className="p-4 bg-syndikate-concrete/50 brutal-border backdrop-blur-md group-hover:border-syndikate-orange/40 transition-all duration-300 relative overflow-hidden">
              {/* Metal grid pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(255, 107, 0, 0.1) 10px, rgba(255, 107, 0, 0.1) 11px), repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(255, 107, 0, 0.1) 10px, rgba(255, 107, 0, 0.1) 11px)',
                }}></div>
              </div>
              
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="w-6 h-6 bg-syndikate-orange brutal-border flex items-center justify-center shadow-md">
                  <TrendingUp className="h-3 w-3 text-background" />
                </div>
                <h4 className="text-foreground font-display font-bold text-sm uppercase tracking-wider">Последние достижения</h4>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed uppercase tracking-wide font-display relative z-10">
                Статистика обновляется после каждого турнира. Продолжайте играть для улучшения рейтинга!
              </p>
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
    <div className="pb-20 px-4 pt-24 bg-transparent min-h-screen relative z-10">
      {/* Industrial header with glitch effect */}
      <div className="relative p-6 bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal overflow-hidden group mb-4">
        {/* Metal grid background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255, 107, 0, 0.05) 25%, rgba(255, 107, 0, 0.05) 26%, transparent 27%, transparent 74%, rgba(255, 107, 0, 0.05) 75%, rgba(255, 107, 0, 0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 107, 0, 0.05) 25%, rgba(255, 107, 0, 0.05) 26%, transparent 27%, transparent 74%, rgba(255, 107, 0, 0.05) 75%, rgba(255, 107, 0, 0.05) 76%, transparent 77%, transparent)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>
        
        {/* Corner brackets */}
        <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-syndikate-orange"></div>
        <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-syndikate-orange"></div>
        <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-syndikate-orange"></div>
        <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-syndikate-orange"></div>
        
        <div className="flex items-center gap-4 relative z-10">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setActiveTab('home')} 
            className="text-foreground hover:text-syndikate-orange hover:bg-syndikate-metal/50 p-2 brutal-border backdrop-blur-sm transition-all duration-300 group shadow-md hover:shadow-neon-orange"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-300" />
          </Button>
          <div className="flex-1">
            <h2 className="font-display text-4xl uppercase text-foreground tracking-wider drop-shadow-lg">
              <GlitchText 
                text="О НАС" 
                glitchIntensity="high" 
                glitchInterval={4000}
              />
            </h2>
            <div className="h-[3px] w-16 bg-gradient-neon mt-2 group-hover:w-24 transition-all duration-500"></div>
            <p className="font-display text-xs uppercase tracking-wider text-syndikate-orange mt-1">
              ЭЛИТНЫЙ ПОКЕРНЫЙ КЛУБ
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Hero Card - Enhanced */}
        <Card className="bg-syndikate-metal/90 brutal-border overflow-hidden relative shadow-brutal backdrop-blur-xl group hover:shadow-neon-orange transition-all duration-500 animate-fade-in">
          {/* Industrial texture overlay */}
          <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
            <div className="absolute inset-0" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 107, 0, 0.03) 10px, rgba(255, 107, 0, 0.03) 20px)'
            }}></div>
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          {/* Animated card suits */}
          <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
            <div className="absolute top-4 right-4 text-syndikate-orange/40 text-5xl animate-pulse">♠</div>
            <div className="absolute top-12 left-4 text-syndikate-orange/20 text-3xl">♣</div>
            <div className="absolute bottom-4 right-12 text-syndikate-orange/30 text-4xl animate-pulse">♦</div>
            <div className="absolute bottom-12 left-12 text-syndikate-orange/15 text-2xl">♥</div>
          </div>
          
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 border-2 border-syndikate-orange bg-syndikate-concrete brutal-border flex items-center justify-center overflow-hidden shadow-lg group-hover:shadow-neon-orange transition-shadow duration-300 p-2">
                <img src={syndikateLogo} alt="Syndikate Logo" className="w-full h-full object-contain neon-orange group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="flex-1">
                <h1 className="font-display text-3xl uppercase text-foreground tracking-wider drop-shadow-lg group-hover:text-syndikate-orange transition-colors duration-300">
                  <GlitchText text="SYNDIKATE" glitchIntensity="medium" glitchInterval={5000} />
                </h1>
                <div className="h-[2px] w-20 bg-gradient-neon mt-2 group-hover:w-28 transition-all duration-500"></div>
                <p className="font-display text-sm uppercase tracking-wider text-syndikate-orange mt-2">
                  Власть за столом
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photo Gallery with Scroll */}
        <Card className="bg-syndikate-metal/90 brutal-border overflow-hidden relative shadow-brutal backdrop-blur-xl group hover:shadow-neon-orange transition-all duration-500 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {/* Metal texture */}
          <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
            <div className="absolute inset-0" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 107, 0, 0.03) 10px, rgba(255, 107, 0, 0.03) 20px)'
            }}></div>
          </div>
          
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-syndikate-orange brutal-border flex items-center justify-center shadow-md group-hover:shadow-neon-orange transition-shadow duration-300">
                  <Camera className="h-5 w-5 text-background" />
                </div>
                <h3 className="text-foreground font-display font-bold text-lg uppercase tracking-wider group-hover:text-syndikate-orange transition-colors duration-300">
                  Наши залы
                </h3>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm font-mono bg-syndikate-concrete/50 brutal-border px-2 py-1">
                <span>{currentPhotoIndex + 1} / {galleryImages.length}</span>
              </div>
            </div>
            
            <div className="relative">
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3 pb-2">
                  {galleryImages.map((image, index) => (
                    <div 
                      key={image.id}
                      className="flex-none w-40 h-32 bg-syndikate-concrete brutal-border overflow-hidden shadow-lg cursor-pointer relative group"
                      onClick={() => setCurrentPhotoIndex(index)}
                    >
                      <img 
                        src={image.image_url} 
                        alt={image.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-foreground text-xs font-bold uppercase drop-shadow-lg truncate">
                          {image.title}
                        </p>
                      </div>
                      {index === currentPhotoIndex && (
                        <div className="absolute inset-0 border-2 border-syndikate-orange shadow-neon-orange"></div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            <div className="text-center p-3 bg-syndikate-concrete/50 brutal-border backdrop-blur-sm mt-4">
              <p className="text-foreground text-sm leading-relaxed uppercase tracking-wide">
                Профессиональные покерные залы
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Club Rules - Swipeable with animations */}
        <Card className="bg-syndikate-red/90 brutal-border backdrop-blur-xl shadow-brutal relative overflow-hidden group hover:shadow-neon-red hover:scale-[1.01] transition-all duration-500 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {/* Industrial texture overlay */}
          <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
            <div className="absolute inset-0" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0, 0, 0, 0.05) 10px, rgba(0, 0, 0, 0.05) 20px)'
            }}></div>
          </div>
          
          {/* Animated suits background */}
          <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500">
            <div className="absolute top-4 right-4 text-background/30 text-5xl animate-pulse">♠</div>
            <div className="absolute bottom-4 left-4 text-background/20 text-3xl">♦</div>
          </div>
          
          {/* Corner brackets */}
          <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-background/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-background/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-background/20 brutal-border flex items-center justify-center shadow-md group-hover:shadow-neon-red transition-shadow duration-300">
                  <MessageSquare className="h-6 w-6 text-background" />
                </div>
                <div>
                  <h3 className="text-background font-display text-2xl uppercase tracking-wider drop-shadow-lg">
                    <GlitchText text="ПРАВИЛА" glitchIntensity="low" />
                  </h3>
                  <div className="h-[2px] w-12 bg-background/50 mt-1"></div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentRuleIndex(Math.max(0, currentRuleIndex - 1))}
                  disabled={currentRuleIndex === 0}
                  className="text-background/60 hover:text-background hover:bg-background/10 p-1 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-background/80 text-sm min-w-[3rem] text-center font-mono">
                  {currentRuleIndex + 1} / {rules.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentRuleIndex(Math.min(rules.length - 1, currentRuleIndex + 1))}
                  disabled={currentRuleIndex === rules.length - 1}
                  className="text-background/60 hover:text-background hover:bg-background/10 p-1 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="min-h-[160px]">
              <div className="p-5 bg-syndikate-concrete/60 brutal-border backdrop-blur-sm relative overflow-hidden group/rule animate-fade-in">
                {/* Metal texture for rule card */}
                <div className="absolute inset-0 opacity-5 group-hover/rule:opacity-10 transition-opacity duration-500">
                  <div className="absolute inset-0" style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 107, 0, 0.03) 10px, rgba(255, 107, 0, 0.03) 20px)'
                  }}></div>
                </div>
                
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-10 h-10 bg-syndikate-orange brutal-border flex items-center justify-center flex-shrink-0 shadow-md group-hover/rule:shadow-neon-orange transition-shadow duration-300">
                    <span className="text-background text-base font-display font-bold">
                      <GlitchText text={String(currentRuleIndex + 1).padStart(2, '0')} glitchIntensity="low" />
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-foreground font-display font-bold uppercase text-base mb-3 tracking-wider group-hover/rule:text-syndikate-orange transition-colors duration-300">
                      {rules[currentRuleIndex].title}
                    </h4>
                    <p className="text-foreground/80 text-sm leading-relaxed">
                      {rules[currentRuleIndex].content}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-syndikate-orange/10 brutal-border backdrop-blur-sm">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 bg-syndikate-orange brutal-border flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="h-2.5 w-2.5 text-background" />
                </div>
                <p className="text-foreground text-xs leading-relaxed">
                  <span className="font-bold uppercase">Важно:</span> Участвуя в турнирах Syndikate, вы автоматически соглашаетесь с данными правилами.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mission & Values - Enhanced */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-syndikate-orange/90 brutal-border overflow-hidden relative shadow-neon-orange backdrop-blur-xl group hover:scale-105 transition-all duration-500 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            {/* Industrial texture */}
            <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
              <div className="absolute inset-0" style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0, 0, 0, 0.05) 10px, rgba(0, 0, 0, 0.05) 20px)'
              }}></div>
            </div>
            
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-background/20 brutal-border flex items-center justify-center shadow-md group-hover:shadow-neon-orange transition-shadow duration-300">
                  <Target className="h-5 w-5 text-background" />
                </div>
                <h3 className="text-background font-display font-bold uppercase text-sm tracking-wider">Миссия</h3>
              </div>
              <p className="text-background/90 text-xs leading-relaxed uppercase tracking-wide font-medium">
                Создание элитной среды для покера
              </p>
            </CardContent>
          </Card>

          <Card className="bg-syndikate-red/90 brutal-border overflow-hidden relative shadow-brutal backdrop-blur-xl group hover:scale-105 transition-all duration-500 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {/* Industrial texture */}
            <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
              <div className="absolute inset-0" style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0, 0, 0, 0.05) 10px, rgba(0, 0, 0, 0.05) 20px)'
              }}></div>
            </div>
            
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-background/20 brutal-border flex items-center justify-center shadow-md group-hover:shadow-neon-red transition-shadow duration-300">
                  <Heart className="h-5 w-5 text-background" />
                </div>
                <h3 className="text-background font-display font-bold uppercase text-sm tracking-wider">Ценности</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-background/60 brutal-border"></div>
                  <span className="text-background/90 text-xs uppercase font-medium">Честность</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-background/60 brutal-border"></div>
                  <span className="text-background/90 text-xs uppercase font-medium">Профессионализм</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-background/60 brutal-border"></div>
                  <span className="text-background/90 text-xs uppercase font-medium">Сила</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact - Enhanced */}
        <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal relative overflow-hidden group hover:shadow-neon-orange hover:scale-[1.01] transition-all duration-500 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          {/* Industrial texture */}
          <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
            <div className="absolute inset-0" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 107, 0, 0.03) 10px, rgba(255, 107, 0, 0.03) 20px)'
            }}></div>
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
            <div className="absolute top-4 right-4 text-syndikate-orange/40 text-5xl animate-pulse">♠</div>
            <div className="absolute top-12 left-4 text-syndikate-orange/20 text-3xl">♣</div>
            <div className="absolute bottom-4 right-8 text-syndikate-orange/30 text-4xl">♦</div>
            <div className="absolute bottom-8 left-8 text-syndikate-orange/15 text-2xl animate-pulse">♥</div>
          </div>
          
          {/* Corner brackets */}
          <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-syndikate-orange/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-syndikate-orange/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-syndikate-orange brutal-border flex items-center justify-center shadow-md group-hover:shadow-neon-orange transition-shadow duration-300">
                <Shield className="h-6 w-6 text-background" />
              </div>
              <div>
                <h3 className="text-foreground font-display font-bold text-xl tracking-wide uppercase drop-shadow-lg group-hover:text-syndikate-orange transition-colors duration-300">
                  <GlitchText text="EPC" glitchIntensity="low" />
                </h3>
                <div className="h-[2px] w-12 bg-gradient-neon mt-1"></div>
              </div>
            </div>
            
            <p className="text-muted-foreground text-sm mb-4 leading-relaxed uppercase font-medium tracking-wide">
              Станьте частью элитного покерного сообщества
            </p>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3 p-3 bg-syndikate-concrete/60 brutal-border backdrop-blur-sm group/item hover:bg-syndikate-concrete/80 transition-all duration-300">
                <CheckCircle className="h-5 w-5 text-syndikate-orange flex-shrink-0" />
                <span className="text-foreground text-sm font-display font-bold uppercase">100% легальная деятельность</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-syndikate-concrete/60 brutal-border backdrop-blur-sm group/item hover:bg-syndikate-concrete/80 transition-all duration-300">
                <Globe className="h-5 w-5 text-syndikate-orange flex-shrink-0" />
                <span className="text-foreground text-sm font-display font-bold uppercase">Международные стандарты</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-syndikate-concrete/60 brutal-border backdrop-blur-sm group/item hover:bg-syndikate-concrete/80 transition-all duration-300">
                <Users className="h-5 w-5 text-syndikate-orange flex-shrink-0" />
                <span className="text-foreground text-sm font-display font-bold uppercase">Активное сообщество</span>
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
      <div className="flex items-center justify-center min-h-screen bg-background industrial-texture relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-[300px] h-[300px] bg-syndikate-orange/20 blur-[80px] animate-pulse" />
          <div className="absolute bottom-10 right-10 w-[250px] h-[250px] bg-syndikate-red/15 blur-[70px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="text-center relative z-10">
          <Loader2 className="h-12 w-12 animate-spin text-syndikate-orange mx-auto mb-4" />
          <p className="text-foreground font-display uppercase tracking-wider">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background industrial-texture relative overflow-hidden flex flex-col">
      <FloatingParticles />
      
      {/* Background Effects - only on home page */}
      {activeTab === 'home' && (
        <>
          {/* Industrial metal base texture */}
          <div 
            ref={baseTextureRef}
            className="fixed inset-0 pointer-events-none industrial-texture opacity-50 z-0 transition-transform duration-0 will-change-transform" 
          />

          {/* Metal grid overlay */}
          <div
            ref={gridRef}
            className="fixed inset-0 pointer-events-none opacity-20 z-0 transition-transform duration-0 will-change-transform"
            style={{
              backgroundImage: `
                repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(255,255,255,0.04) 48px, rgba(255,255,255,0.04) 49px),
                repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(255,255,255,0.04) 48px, rgba(255,255,255,0.04) 49px)
              `,
            }}
          />

          {/* Neon glows */}
          <div 
            ref={glowTopRef}
            className="fixed w-[520px] h-[520px] bg-syndikate-orange/25 rounded-full blur-[160px] opacity-80 animate-pulse will-change-transform z-0" 
          />
          <div 
            ref={glowBottomRef}
            className="fixed right-0 bottom-0 w-[520px] h-[520px] bg-syndikate-red/20 rounded-full blur-[160px] opacity-80 animate-pulse will-change-transform z-0" 
          />

          {/* Side rails */}
          <div className="fixed inset-y-0 left-0 w-[2px] bg-gradient-to-b from-syndikate-orange/70 via-syndikate-red/40 to-transparent shadow-neon-orange pointer-events-none z-10" />
          <div className="fixed inset-y-0 right-0 w-[2px] bg-gradient-to-b from-syndikate-orange/70 via-syndikate-red/40 to-transparent shadow-neon-orange pointer-events-none z-10" />
          
          {/* Subtle noise */}
          <div
            className="fixed inset-0 pointer-events-none opacity-25 mix-blend-soft-light z-0"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
              backgroundSize: "4px 4px",
            }}
          />
        </>
      )}
      
      {/* Content Area with relative z-index */}
      <div className="flex-1 overflow-y-auto telegram-content relative z-20 overflow-x-hidden" style={{ maxHeight: '100%' }}>
        <div className="max-w-lg mx-auto">
          {activeTab === 'home' && renderHome()}
          {activeTab === 'about' && renderAbout()}
      
      {activeTab === 'tournaments' && (
        <div className="space-y-4 pb-20 px-4 pt-24 bg-transparent min-h-screen relative z-10">
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 bg-syndikate-orange brutal-border flex items-center justify-center">
              <Trophy className="h-5 w-5 text-background" />
            </div>
            <div>
              <h2 className="font-display text-3xl uppercase text-foreground tracking-wider">ТУРНИРЫ</h2>
              <div className="h-[2px] w-16 bg-gradient-neon mt-2"></div>
            </div>
          </div>
          
          {tournaments.map((tournament, index) => (
            <Card key={tournament.id} className="bg-syndikate-metal/90 brutal-border border-2 border-dashed border-syndikate-orange/40 backdrop-blur-xl shadow-brutal group hover:shadow-neon-orange transition-all duration-500 relative overflow-hidden cursor-pointer hover:scale-[1.01]"
                  onClick={() => {
                    setSelectedTournament(tournament);
                    setShowTournamentModal(true);
                  }}>
              {/* Corner Decorations */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-background brutal-border -ml-3"></div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-background brutal-border -mr-3"></div>
              
              {/* Номер билета */}
              <div className="absolute top-3 right-4 text-syndikate-orange text-xs font-mono tracking-wider bg-syndikate-concrete/50 px-2 py-1 brutal-border backdrop-blur-sm">
                #{tournament.id.slice(-6).toUpperCase()}
              </div>
              
              {/* Barcode Effect */}
              <div className="absolute bottom-3 right-4 flex gap-0.5">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`bg-syndikate-orange/60 ${i % 2 === 0 ? 'w-0.5 h-6' : 'w-1 h-8'}`}></div>
                ))}
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                <div className="absolute top-3 left-4 text-2xl text-syndikate-orange/30 animate-pulse">♠</div>
                <div className="absolute bottom-8 left-8 text-xl text-syndikate-orange/20">♣</div>
              </div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="text-syndikate-orange text-xs font-bold uppercase tracking-widest mb-1">🎫 БИЛЕТ НА ТУРНИР</div>
                    <h3 className="font-display text-xl uppercase text-foreground tracking-wide mb-2 group-hover:text-syndikate-orange transition-colors duration-300">
                      {tournament.name}
                    </h3>
                    <div className="h-[2px] w-12 bg-gradient-neon group-hover:w-16 transition-all duration-500"></div>
                    {tournament.description && (
                      <p className="text-muted-foreground text-sm mt-2 line-clamp-1">{tournament.description}</p>
                    )}
                  </div>
                  <div className="w-10 h-10 bg-syndikate-orange brutal-border flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                    <Trophy className="h-5 w-5 text-background" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-3 p-3 bg-syndikate-concrete/50 brutal-border group-hover:border-syndikate-orange/30 transition-all duration-300 backdrop-blur-sm">
                    <div className="w-7 h-7 bg-syndikate-orange brutal-border flex items-center justify-center shadow-lg">
                      <Users className="h-4 w-4 text-background" />
                    </div>
                    <div>
                      <span className="text-foreground font-bold text-sm">{tournament.tournament_registrations?.[0]?.count || 0}/{tournament.max_players}</span>
                      <p className="text-muted-foreground text-xs">участников</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-syndikate-concrete/50 brutal-border group-hover:border-syndikate-orange/30 transition-all duration-300 backdrop-blur-sm">
                    <div className="w-7 h-7 bg-syndikate-orange brutal-border flex items-center justify-center shadow-lg">
                      <Clock className="h-4 w-4 text-background" />
                    </div>
                    <div>
                      <span className="text-foreground font-bold text-sm">{new Date(tournament.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                      <p className="text-muted-foreground text-xs">{new Date(tournament.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-3 p-3 bg-syndikate-concrete/50 brutal-border group-hover:border-syndikate-orange/30 transition-all duration-300 backdrop-blur-sm">
                    <div className="w-7 h-7 bg-syndikate-red brutal-border flex items-center justify-center shadow-lg">
                      <Coins className="h-4 w-4 text-background" />
                    </div>
                    <div>
                      <span className="text-foreground font-bold text-sm">{tournament.participation_fee.toLocaleString()} ₽</span>
                      <p className="text-muted-foreground text-xs">орг. взнос</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 bg-syndikate-concrete/50 brutal-border group-hover:border-syndikate-orange/30 transition-all duration-300 backdrop-blur-sm">
                    <div className="w-6 h-6 bg-syndikate-orange brutal-border flex items-center justify-center">
                      <Target className="h-3 w-3 text-background" />
                    </div>
                    <div>
                      <span className="text-foreground font-semibold text-sm">{tournament.starting_chips?.toLocaleString() || 'N/A'}</span>
                      <p className="text-muted-foreground text-xs">стартовый стек</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 mt-4">
                  <div className="flex items-center gap-2 text-syndikate-orange group-hover:gap-3 transition-all duration-300">
                    <span className="font-display text-sm uppercase tracking-widest font-bold">🎫 Подробнее</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                  
                  <Badge 
                    className={`px-3 py-1.5 text-xs font-bold uppercase brutal-border backdrop-blur-sm ${
                      tournament.status === 'registration' ? 'bg-syndikate-orange/20 text-syndikate-orange' :
                      tournament.status === 'running' ? 'bg-syndikate-red/20 text-syndikate-red' :
                      tournament.status === 'scheduled' ? 'bg-syndikate-orange/20 text-syndikate-orange' :
                      'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tournament.status === 'registration' ? 'Регистрация' :
                     tournament.status === 'running' ? 'В процессе' :
                     tournament.status === 'scheduled' ? 'Запланирован' :
                     tournament.status}
                  </Badge>
                </div>
                
                {tournament.status === 'registration' && (
                  userRegistrations.has(tournament.id) ? (
                    <div className="w-full mt-4 flex items-center justify-between gap-2">
                      <Badge className="flex-1 bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-400 border border-emerald-500/40 hover:from-emerald-500/30 hover:to-green-500/30 transition-all duration-300 px-4 py-2.5 text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-500/20 justify-center">
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                        Зарегистрирован
                      </Badge>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          unregisterFromTournament(tournament.id);
                        }}
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        className="bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/40 text-red-400 hover:from-red-500/20 hover:to-rose-500/20 hover:text-red-300 hover:border-red-400/60 transition-all duration-300 px-3 py-2.5 h-auto text-xs font-semibold shadow-lg shadow-red-500/20 hover:shadow-red-500/30"
                      >
                        {loading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <X className="h-3.5 w-3.5 mr-1" />
                            Отменить
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
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
                          <UserPlus className="h-4 w-4" />
                          <span>Записаться на турнир</span>
                        </div>
                      )}
                    </Button>
                  )
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'rating' && (
        <div className="space-y-4 pb-20 px-4 pt-24 bg-transparent min-h-screen relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 bg-syndikate-orange brutal-border flex items-center justify-center">
              <Crown className="h-5 w-5 text-background" />
            </div>
            <div>
              <h2 className="font-display text-3xl uppercase text-foreground tracking-wider">ЛЕГЕНДЫ EPC</h2>
              <div className="h-[2px] w-16 bg-gradient-neon mt-2"></div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal group hover:shadow-neon-orange transition-all duration-500 relative overflow-hidden hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-2 right-2 text-syndikate-orange/30 text-2xl animate-pulse">♠</div>
              
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-syndikate-orange brutal-border flex items-center justify-center">
                    <Users className="h-4 w-4 text-background" />
                  </div>
                  <div>
                    <div className="text-foreground font-bold text-lg">{players.length}</div>
                    <div className="text-muted-foreground text-xs uppercase tracking-wider">Активных игроков</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal group hover:shadow-neon-orange transition-all duration-500 relative overflow-hidden hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-2 right-2 text-syndikate-orange/30 text-2xl animate-pulse">♥</div>
              
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-syndikate-red brutal-border flex items-center justify-center">
                    <Trophy className="h-4 w-4 text-background" />
                  </div>
                  <div>
                    <div className="text-foreground font-bold text-lg">{players[0]?.elo_rating || 0}</div>
                    <div className="text-muted-foreground text-xs uppercase tracking-wider">Лучший рейтинг</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top 3 Podium */}
          {players.length >= 3 && (
            <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal group hover:shadow-neon-orange transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                <div className="absolute top-3 right-3 text-syndikate-orange/30 text-3xl animate-pulse">♠</div>
                <div className="absolute bottom-3 left-3 text-syndikate-orange/20 text-2xl">♦</div>
              </div>
              
              <CardContent className="p-5 relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-gradient-neon brutal-border"></div>
                  <h3 className="text-foreground font-display font-bold text-base tracking-wider uppercase">ТОП-3 ИГРОКОВ</h3>
                </div>
                
                <div className="flex items-end justify-center gap-2">
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center">
                    <div className="relative mb-2">
                      <Avatar className="w-10 h-10 brutal-border ring-2 ring-muted/40">
                        <AvatarImage src={players[1]?.avatar_url} />
                        <AvatarFallback className="bg-muted text-foreground text-xs font-bold">{players[1]?.name?.[0] || 'P'}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-muted brutal-border flex items-center justify-center text-xs">
                        🥈
                      </div>
                    </div>
                    <div className="w-12 h-16 bg-syndikate-concrete/50 brutal-border flex flex-col items-center justify-end pb-2">
                      <span className="text-foreground text-xs font-bold">{players[1]?.elo_rating}</span>
                    </div>
                    <p className="text-muted-foreground text-xs mt-1 text-center truncate w-12 uppercase">{players[1]?.name}</p>
                  </div>

                  {/* 1st Place */}
                  <div className="flex flex-col items-center">
                    <div className="relative mb-2">
                      <Avatar className="w-12 h-12 brutal-border ring-2 ring-syndikate-orange/50 shadow-neon-orange">
                        <AvatarImage src={players[0]?.avatar_url} />
                        <AvatarFallback className="bg-syndikate-orange text-background text-sm font-bold">{players[0]?.name?.[0] || 'P'}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-syndikate-orange brutal-border flex items-center justify-center shadow-neon-orange">
                        👑
                      </div>
                    </div>
                    <div className="w-14 h-20 bg-syndikate-orange/30 brutal-border flex flex-col items-center justify-end pb-2 shadow-neon-orange">
                      <span className="text-syndikate-orange text-sm font-bold neon-orange">{players[0]?.elo_rating}</span>
                    </div>
                    <p className="text-foreground text-xs mt-1 text-center font-bold truncate w-14 uppercase">{players[0]?.name}</p>
                  </div>

                  {/* 3rd Place */}
                  <div className="flex flex-col items-center">
                    <div className="relative mb-2">
                      <Avatar className="w-10 h-10 brutal-border ring-2 ring-syndikate-red/40">
                        <AvatarImage src={players[2]?.avatar_url} />
                        <AvatarFallback className="bg-syndikate-red text-background text-xs font-bold">{players[2]?.name?.[0] || 'P'}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-syndikate-red brutal-border flex items-center justify-center text-xs">
                        🥉
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-syndikate-red/30 brutal-border flex flex-col items-center justify-end pb-2">
                      <span className="text-syndikate-red text-xs font-bold">{players[2]?.elo_rating}</span>
                    </div>
                    <p className="text-muted-foreground text-xs mt-1 text-center truncate w-12 uppercase">{players[2]?.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Players List */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-1 h-4 bg-gradient-neon brutal-border"></div>
              <p className="text-foreground text-sm font-bold uppercase tracking-wide">Полный рейтинг</p>
              <div className="flex-1 h-[2px] bg-syndikate-rust/30"></div>
            </div>
            
            {players.map((player, index) => (
              <Card key={player.id} className={`backdrop-blur-xl shadow-brutal group hover:shadow-neon-orange transition-all duration-500 relative overflow-hidden brutal-border ${
                  index === 0 ? 'bg-syndikate-orange/20 border-syndikate-orange/40' :
                  index === 1 ? 'bg-muted/20 border-muted/40' :
                  index === 2 ? 'bg-syndikate-red/20 border-syndikate-red/40' :
                  'bg-syndikate-metal/90'
                } hover:scale-[1.01] cursor-pointer`}>
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                  index === 0 ? 'bg-gradient-to-r from-syndikate-orange/5 to-transparent' :
                  index === 1 ? 'bg-gradient-to-r from-muted/5 to-transparent' :
                  index === 2 ? 'bg-gradient-to-r from-syndikate-red/5 to-transparent' :
                  'bg-gradient-to-r from-syndikate-orange/5 to-transparent'
                }`}></div>
                
                <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                  <div className={`text-2xl animate-pulse ${
                    index < 3 ? 'text-syndikate-orange/30' : 'text-syndikate-orange/30'
                  }`}>
                    {index === 0 ? '♠' : index === 1 ? '♥' : index === 2 ? '♦' : '♣'}
                  </div>
                </div>
                
                <CardContent className="p-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 min-w-[1.5rem]">
                      <span className={`text-sm font-bold uppercase ${
                        index < 3 ? 'text-syndikate-orange' : 'text-muted-foreground'
                      }`}>
                        #{index + 1}
                      </span>
                    </div>
                    
                    <div className="relative">
                      <Avatar className={`w-10 h-10 brutal-border group-hover:ring-2 group-hover:ring-syndikate-orange/30 transition-all duration-300 ${
                        index === 0 ? 'ring-2 ring-syndikate-orange/50' : ''
                      }`}>
                        <AvatarImage src={player.avatar_url} />
                        <AvatarFallback className="bg-syndikate-concrete text-foreground font-bold text-sm">{player.name?.[0] || 'P'}</AvatarFallback>
                      </Avatar>
                      {index < 3 && (
                        <div className={`absolute -top-1 -right-1 w-4 h-4 brutal-border flex items-center justify-center text-xs font-bold text-background shadow-md ${
                          index === 0 ? 'bg-syndikate-orange' :
                          index === 1 ? 'bg-muted' :
                          'bg-syndikate-red'
                        }`}>
                          {index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-foreground font-bold text-sm uppercase tracking-wide group-hover:text-syndikate-orange transition-colors duration-300">{player.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-muted-foreground text-xs uppercase tracking-wider">{player.games_played} игр</p>
                        <div className="w-1 h-1 bg-muted-foreground/40 brutal-border"></div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wider">{player.wins} побед</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        index === 0 ? 'text-syndikate-orange neon-orange' :
                        index === 1 ? 'text-muted-foreground' :
                        index === 2 ? 'text-syndikate-red' :
                        'text-foreground'
                      } group-hover:scale-110 transition-transform duration-300`}>
                        {player.elo_rating}
                      </div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider">RPS</p>
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
          onUnregister={unregisterFromTournament}
        />
      )}

      {activeTab === 'qa' && (
        <div className="space-y-6 pb-20 px-4 pt-24 bg-transparent min-h-screen relative z-10">
          {/* Industrial header with glitch effect */}
          <div className="relative p-6 bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal overflow-hidden group">
            {/* Metal grid background */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255, 107, 0, 0.05) 25%, rgba(255, 107, 0, 0.05) 26%, transparent 27%, transparent 74%, rgba(255, 107, 0, 0.05) 75%, rgba(255, 107, 0, 0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 107, 0, 0.05) 25%, rgba(255, 107, 0, 0.05) 26%, transparent 27%, transparent 74%, rgba(255, 107, 0, 0.05) 75%, rgba(255, 107, 0, 0.05) 76%, transparent 77%, transparent)',
                backgroundSize: '50px 50px'
              }}></div>
            </div>
            
            {/* Corner brackets */}
            <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-syndikate-orange"></div>
            <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-syndikate-orange"></div>
            <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-syndikate-orange"></div>
            <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-syndikate-orange"></div>
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-syndikate-orange brutal-border flex items-center justify-center shadow-neon-orange group-hover:scale-110 transition-transform duration-300">
                <MessageSquare className="h-6 w-6 text-background" />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-4xl uppercase text-foreground tracking-wider drop-shadow-lg">
                  <GlitchText 
                    text="Q&A" 
                    glitchIntensity="high" 
                    glitchInterval={3500}
                  />
                </h2>
                <div className="h-[3px] w-16 bg-gradient-neon mt-2 group-hover:w-24 transition-all duration-500"></div>
                <p className="font-display text-xs uppercase tracking-wider text-syndikate-orange mt-1">
                  ВОПРОСЫ И ОТВЕТЫ
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal group hover:shadow-neon-orange hover:scale-[1.02] transition-all duration-500 relative overflow-hidden animate-fade-in">
              {/* Industrial texture overlay */}
              <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 107, 0, 0.03) 10px, rgba(255, 107, 0, 0.03) 20px)'
                }}></div>
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Animated card suits */}
              <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-syndikate-orange/40 text-4xl animate-pulse">♠</div>
                <div className="absolute bottom-4 left-4 text-syndikate-orange/20 text-2xl">♦</div>
              </div>
              
              {/* Corner brackets */}
              <div className="absolute top-2 left-2 w-4 h-4 border-l border-t border-syndikate-orange/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-r border-t border-syndikate-orange/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-syndikate-orange brutal-border flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-neon-orange transition-shadow duration-300">
                    <CheckCircle className="h-5 w-5 text-background" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-display text-2xl text-syndikate-orange drop-shadow-lg">
                        <GlitchText text="01" glitchIntensity="low" />
                      </span>
                      <h3 className="text-foreground font-display uppercase text-lg tracking-wider group-hover:text-syndikate-orange transition-colors duration-300">
                        Это законно?
                      </h3>
                    </div>
                    <p className="text-foreground/80 text-sm leading-relaxed">
                      Абсолютно! Мы проводим спортивные турниры без денежных призов, что полностью соответствует российскому законодательству. Согласно ФЗ №244, запрещены только азартные игры с материальными выигрышами. Syndikate — это спортивное сообщество для развития навыков и общения.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal group hover:shadow-neon-orange hover:scale-[1.02] transition-all duration-500 relative overflow-hidden animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 107, 0, 0.03) 10px, rgba(255, 107, 0, 0.03) 20px)'
                }}></div>
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-syndikate-orange/40 text-4xl">♣</div>
                <div className="absolute bottom-4 left-4 text-syndikate-orange/20 text-2xl animate-pulse">♥</div>
              </div>
              
              <div className="absolute top-2 left-2 w-4 h-4 border-l border-t border-syndikate-orange/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-r border-t border-syndikate-orange/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-syndikate-orange brutal-border flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-neon-orange transition-shadow duration-300">
                    <Users className="h-5 w-5 text-background" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-display text-2xl text-syndikate-orange drop-shadow-lg">
                        <GlitchText text="02" glitchIntensity="low" />
                      </span>
                      <h3 className="text-foreground font-display uppercase text-lg tracking-wider group-hover:text-syndikate-orange transition-colors duration-300">
                        Зачем играть без призов?
                      </h3>
                    </div>
                    <p className="text-foreground/80 text-sm leading-relaxed">
                      Syndikate — это уникальное комьюнити единомышленников! Где еще вы найдете профессиональное оборудование, отличный сервис и возможность развивать покерные навыки в безопасной среде? Мы создаем атмосферу спортивного соревнования и дружеского общения.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal group hover:shadow-neon-orange hover:scale-[1.02] transition-all duration-500 relative overflow-hidden animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 107, 0, 0.03) 10px, rgba(255, 107, 0, 0.03) 20px)'
                }}></div>
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-syndikate-orange/40 text-4xl animate-pulse">♦</div>
                <div className="absolute bottom-4 left-4 text-syndikate-orange/20 text-2xl">♠</div>
              </div>
              
              <div className="absolute top-2 left-2 w-4 h-4 border-l border-t border-syndikate-orange/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-r border-t border-syndikate-orange/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-syndikate-orange brutal-border flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-neon-orange transition-shadow duration-300">
                    <Trophy className="h-5 w-5 text-background" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-display text-2xl text-syndikate-orange drop-shadow-lg">
                        <GlitchText text="03" glitchIntensity="low" />
                      </span>
                      <h3 className="text-foreground font-display uppercase text-lg tracking-wider group-hover:text-syndikate-orange transition-colors duration-300">
                        Как работает рейтинг RPS?
                      </h3>
                    </div>
                    <p className="text-foreground/80 text-sm leading-relaxed">
                      В Syndikate действует продуманная RPS-система для честного ранжирования участников. Рейтинговые очки начисляются за результативные выступления в турнирах и отражают исключительно игровое мастерство. Система мотивирует на спортивное развитие и определяет лучших игроков клуба.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal group hover:shadow-neon-red hover:scale-[1.02] transition-all duration-500 relative overflow-hidden animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 107, 0, 0.03) 10px, rgba(255, 107, 0, 0.03) 20px)'
                }}></div>
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-br from-syndikate-red/5 via-transparent to-syndikate-orange/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-syndikate-red/40 text-4xl animate-pulse">♥</div>
                <div className="absolute bottom-4 left-4 text-syndikate-red/20 text-2xl">♦</div>
              </div>
              
              <div className="absolute top-2 left-2 w-4 h-4 border-l border-t border-syndikate-red/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-r border-t border-syndikate-red/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-syndikate-red brutal-border flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-neon-red transition-shadow duration-300">
                    <Crown className="h-5 w-5 text-background" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-display text-2xl text-syndikate-red drop-shadow-lg">
                        <GlitchText text="04" glitchIntensity="low" />
                      </span>
                      <h3 className="text-foreground font-display uppercase text-lg tracking-wider group-hover:text-syndikate-red transition-colors duration-300">
                        Что такое VIP-турниры?
                      </h3>
                    </div>
                    <p className="text-foreground/80 text-sm leading-relaxed">
                      Это эксклюзивные события для топовых игроков рейтинга Syndikate. Проводятся в особом формате с повышенным комфортом и сервисом. Участие строго по приглашениям на основе достижений в рейтинге. Место нельзя передать — только личное участие лучших игроков клуба.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal group hover:shadow-neon-orange hover:scale-[1.02] transition-all duration-500 relative overflow-hidden animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 107, 0, 0.03) 10px, rgba(255, 107, 0, 0.03) 20px)'
                }}></div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-syndikate-orange/40 text-4xl">♠</div>
                <div className="absolute bottom-4 left-4 text-syndikate-orange/20 text-2xl animate-pulse">♣</div>
              </div>
              <div className="absolute top-2 left-2 w-4 h-4 border-l border-t border-syndikate-orange/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-r border-t border-syndikate-orange/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-syndikate-orange brutal-border flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-neon-orange transition-shadow duration-300">
                    <UserPlus className="h-5 w-5 text-background" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-display text-2xl text-syndikate-orange drop-shadow-lg">
                        <GlitchText text="05" glitchIntensity="low" />
                      </span>
                      <h3 className="text-foreground font-display uppercase text-lg tracking-wider group-hover:text-syndikate-orange transition-colors duration-300">
                        Как записаться на турнир?
                      </h3>
                    </div>
                    <p className="text-foreground/80 text-sm leading-relaxed">
                      После первичной регистрации в нашем Telegram-боте, вы получаете доступ к удобному мини-приложению. В нем можно бронировать места на любые турниры. Внимание: количество мест ограничено! При частых пропусках без предупреждения возможность записи может быть временно ограничена.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal group hover:shadow-neon-red hover:scale-[1.02] transition-all duration-500 relative overflow-hidden animate-fade-in" style={{ animationDelay: '0.5s' }}>
              <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 107, 0, 0.03) 10px, rgba(255, 107, 0, 0.03) 20px)'
                }}></div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-syndikate-red/5 via-transparent to-syndikate-orange/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-syndikate-red/40 text-4xl animate-pulse">♣</div>
                <div className="absolute bottom-4 left-4 text-syndikate-red/20 text-2xl">♥</div>
              </div>
              <div className="absolute top-2 left-2 w-4 h-4 border-l border-t border-syndikate-red/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-r border-t border-syndikate-red/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-syndikate-red brutal-border flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-neon-red transition-shadow duration-300">
                    <Coins className="h-5 w-5 text-background" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-display text-2xl text-syndikate-red drop-shadow-lg">
                        <GlitchText text="06" glitchIntensity="low" />
                      </span>
                      <h3 className="text-foreground font-display uppercase text-lg tracking-wider group-hover:text-syndikate-red transition-colors duration-300">
                        Что такое организационный взнос?
                      </h3>
                    </div>
                    <p className="text-foreground/80 text-sm leading-relaxed">
                      Это плата за комплекс услуг: аренду профессионального оборудования, игровых фишек, зала и сервисное обслуживание. Фишки — исключительно игровое оборудование без денежной стоимости, их нельзя обменять или вывести. Повторный вход (re-entry) оплачивается отдельно.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal group hover:shadow-neon-orange hover:scale-[1.02] transition-all duration-500 relative overflow-hidden animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 107, 0, 0.03) 10px, rgba(255, 107, 0, 0.03) 20px)'
                }}></div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-syndikate-orange/40 text-4xl animate-pulse">♦</div>
                <div className="absolute bottom-4 left-4 text-syndikate-orange/20 text-2xl">♠</div>
              </div>
              <div className="absolute top-2 left-2 w-4 h-4 border-l border-t border-syndikate-orange/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-r border-t border-syndikate-orange/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-syndikate-orange brutal-border flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-neon-orange transition-shadow duration-300">
                    <Clock className="h-5 w-5 text-background" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-display text-2xl text-syndikate-orange drop-shadow-lg">
                        <GlitchText text="07" glitchIntensity="low" />
                      </span>
                      <h3 className="text-foreground font-display uppercase text-lg tracking-wider group-hover:text-syndikate-orange transition-colors duration-300">
                        Что такое поздняя регистрация?
                      </h3>
                    </div>
                    <p className="text-foreground/80 text-sm leading-relaxed">
                      Это возможность присоединиться к турниру после официального старта — полезно, если вы опаздываете или хотите сделать повторный вход. Время поздней регистрации указывается для каждого турнира отдельно. После её завершения предусмотрен короткий перерыв для окончательного входа.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal group hover:shadow-neon-orange hover:scale-[1.02] transition-all duration-500 relative overflow-hidden animate-fade-in" style={{ animationDelay: '0.7s' }}>
              <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 107, 0, 0.03) 10px, rgba(255, 107, 0, 0.03) 20px)'
                }}></div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-syndikate-orange/40 text-4xl">♥</div>
                <div className="absolute bottom-4 left-4 text-syndikate-orange/20 text-2xl animate-pulse">♦</div>
              </div>
              <div className="absolute top-2 left-2 w-4 h-4 border-l border-t border-syndikate-orange/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-r border-t border-syndikate-orange/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-syndikate-orange brutal-border flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-neon-orange transition-shadow duration-300">
                    <Target className="h-5 w-5 text-background" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-display text-2xl text-syndikate-orange drop-shadow-lg">
                        <GlitchText text="08" glitchIntensity="low" />
                      </span>
                      <h3 className="text-foreground font-display uppercase text-lg tracking-wider group-hover:text-syndikate-orange transition-colors duration-300">
                        Что такое стартовый стек?
                      </h3>
                    </div>
                    <p className="text-foreground/80 text-sm leading-relaxed">
                      Это набор игровых фишек, который получает каждый участник турнира. Фишки — развлекательное оборудование без денежной стоимости, их нельзя обменять или вывести. Стандартный стартовый стек в Syndikate составляет 30,000 фишек для всех участников.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal group hover:shadow-neon-red hover:scale-[1.02] transition-all duration-500 relative overflow-hidden animate-fade-in" style={{ animationDelay: '0.8s' }}>
              <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 107, 0, 0.03) 10px, rgba(255, 107, 0, 0.03) 20px)'
                }}></div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-syndikate-red/5 via-transparent to-syndikate-orange/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                <div className="absolute top-4 right-4 text-syndikate-red/40 text-4xl animate-pulse">♠</div>
                <div className="absolute bottom-4 left-4 text-syndikate-red/20 text-2xl">♣</div>
              </div>
              <div className="absolute top-2 left-2 w-4 h-4 border-l border-t border-syndikate-red/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-r border-t border-syndikate-red/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-syndikate-red brutal-border flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-neon-red transition-shadow duration-300">
                    <Users className="h-5 w-5 text-background" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-display text-2xl text-syndikate-red drop-shadow-lg">
                        <GlitchText text="09" glitchIntensity="low" />
                      </span>
                      <h3 className="text-foreground font-display uppercase text-lg tracking-wider group-hover:text-syndikate-red transition-colors duration-300">
                        Как работает лист ожидания?
                      </h3>
                    </div>
                    <p className="text-foreground/80 text-sm leading-relaxed">
                      Если турнир полностью забронирован, вы можете встать в лист ожидания. При освобождении мест участники переносятся в основной список в порядке очереди. Можно также приехать лично и занять живую очередь — это обсуждается с администратором индивидуально.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-syndikate-concrete/95 brutal-border border-t border-syndikate-orange/30 backdrop-blur-xl z-50 shadow-brutal pb-safe">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-neon"></div>
        <div className="max-w-lg mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 bg-transparent h-20 p-2 gap-1">
              <TabsTrigger value="home" className="group flex flex-col gap-2 text-muted-foreground data-[state=active]:text-syndikate-orange hover:text-foreground transition-all duration-300 border-0 bg-transparent data-[state=active]:bg-syndikate-orange/10 cursor-pointer relative overflow-hidden brutal-border">
                <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 to-transparent opacity-0 group-hover:opacity-100 group-data-[state=active]:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10 flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 flex items-center justify-center bg-syndikate-metal group-hover:bg-syndikate-metal-light group-data-[state=active]:bg-syndikate-orange/20 transition-all duration-300 group-data-[state=active]:shadow-neon-orange">
                    <Home className="h-4 w-4 group-data-[state=active]:scale-110 transition-transform duration-300" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">Главная</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="tournaments" className="group flex flex-col gap-2 text-muted-foreground data-[state=active]:text-syndikate-orange hover:text-foreground transition-all duration-300 border-0 bg-transparent data-[state=active]:bg-syndikate-orange/10 cursor-pointer relative overflow-hidden brutal-border">
                <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 to-transparent opacity-0 group-hover:opacity-100 group-data-[state=active]:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10 flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 flex items-center justify-center bg-syndikate-metal group-hover:bg-syndikate-metal-light group-data-[state=active]:bg-syndikate-orange/20 transition-all duration-300 group-data-[state=active]:shadow-neon-orange">
                    <Trophy className="h-4 w-4 group-data-[state=active]:scale-110 transition-transform duration-300" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">Турниры</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="rating" className="group flex flex-col gap-2 text-muted-foreground data-[state=active]:text-syndikate-orange hover:text-foreground transition-all duration-300 border-0 bg-transparent data-[state=active]:bg-syndikate-orange/10 cursor-pointer relative overflow-hidden brutal-border">
                <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 to-transparent opacity-0 group-hover:opacity-100 group-data-[state=active]:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10 flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 flex items-center justify-center bg-syndikate-metal group-hover:bg-syndikate-metal-light group-data-[state=active]:bg-syndikate-orange/20 transition-all duration-300 group-data-[state=active]:shadow-neon-orange">
                    <Star className="h-4 w-4 group-data-[state=active]:scale-110 transition-transform duration-300" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">Рейтинг</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="profile" className="group flex flex-col gap-2 text-muted-foreground data-[state=active]:text-syndikate-orange hover:text-foreground transition-all duration-300 border-0 bg-transparent data-[state=active]:bg-syndikate-orange/10 cursor-pointer relative overflow-hidden brutal-border">
                <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 to-transparent opacity-0 group-hover:opacity-100 group-data-[state=active]:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10 flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 flex items-center justify-center bg-syndikate-metal group-hover:bg-syndikate-metal-light group-data-[state=active]:bg-syndikate-orange/20 transition-all duration-300 group-data-[state=active]:shadow-neon-orange">
                    <User className="h-4 w-4 group-data-[state=active]:scale-110 transition-transform duration-300" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">Профиль</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-neon"></div>
      </div>

        </div>
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