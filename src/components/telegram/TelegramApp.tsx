import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Calendar, Users, Star, MessageSquare, User, Home, TrendingUp, Clock, MapPin, Coins, ChevronRight, Award, Target, CheckCircle, UserPlus, Loader2, Crown, Gem, Zap, Shield, Play, Pause, CircleDot, ArrowLeft, Heart, Globe, Camera, ChevronLeft, Download, X, Bell, Spade } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TelegramAuth } from './TelegramAuth';
import { TelegramTournamentModal } from './TelegramTournamentModal';
import { TelegramProfile } from './TelegramProfile';
import { toast } from 'sonner';
import { addToHomeScreen } from '@telegram-apps/sdk';
import syndikateLogo from '@/assets/syndikate-logo-main.png';
import { GlitchText } from '@/components/ui/glitch-text';
import { TournamentCard } from './TournamentCard';
import { RatingPodium } from './RatingPodium';
import { PlayerRatingCard } from './PlayerRatingCard';
import { RankedPlayerModal } from './RankedPlayerModal';
import { MafiaHierarchy } from './MafiaHierarchy';
import mainPokerRoom from '@/assets/gallery/main-poker-room.jpg';
import tournamentTable from '@/assets/gallery/tournament-table.jpg';
import vipZone from '@/assets/gallery/vip-zone.jpg';
import loungeArea from '@/assets/gallery/lounge-area.jpg';
import teamTournament from '@/assets/gallery/team-tournament.jpg';
import awardsCeremony from '@/assets/gallery/awards-ceremony.jpg';
import masterclass from '@/assets/gallery/masterclass.jpg';
import registration from '@/assets/gallery/registration.jpg';
import pokerChips from '@/assets/gallery/poker-chips.jpg';
import { calculateTotalRPSPool, formatRPSPoints } from '@/utils/rpsCalculations';
import { getEffectiveMafiaRank, getRarityInfo } from '@/utils/mafiaRanks';
import { fixStorageUrl } from '@/utils/storageUtils';
import { GlitchAvatarFrame } from '@/components/ui/glitch-avatar-frame';
import { useClanRealtimeNotifications } from '@/hooks/useClanRealtimeNotifications';
import { useClanSystem } from '@/hooks/useClanSystem';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CLAN_EMBLEMS } from '@/utils/clanEmblems';
import { TelegramPokerLobby } from './TelegramPokerLobby';
import syndikateBg from '@/assets/syndikate-poker-bg.jpg';

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
  manual_rank?: string | null;
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
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showPlayerStatsModal, setShowPlayerStatsModal] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentRuleIndex, setCurrentRuleIndex] = useState(0);
  const [canAddToHomeScreen, setCanAddToHomeScreen] = useState(false);
  const [userRegistrations, setUserRegistrations] = useState<Set<string>>(new Set());
  const [scrollY, setScrollY] = useState(0);
  const [playerBalance, setPlayerBalance] = useState(10000);
  const [isAtPokerTable, setIsAtPokerTable] = useState(false);
  
  // Clan notifications
  const { pendingInvitations, acceptInvitation, declineInvitation, refresh: refreshClan } = useClanSystem();
  const { newInvitations, unreadCount, clearNotifications } = useClanRealtimeNotifications(userStats?.id || null);
  
  // Refs for parallax effects
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
      
      if (glowTopRef.current) {
        glowTopRef.current.style.transform = `translate(-24px, ${-128 + currentScrollY * 0.1}px)`;
      }
      if (glowBottomRef.current) {
        glowBottomRef.current.style.transform = `translate(-120px, ${-180 + currentScrollY * 0.15}px)`;
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
      fetchPlayerBalance();
    }
  }, [userStats]);

  const fetchPlayerBalance = async () => {
    if (!userStats) return;
    
    try {
      // First try to get existing balance
      const { data, error } = await supabase
        .from('player_balances')
        .select('balance')
        .eq('player_id', userStats.id)
        .maybeSingle();
      
      if (data) {
        setPlayerBalance(data.balance);
      } else if (!error || error.code === 'PGRST116') {
        // No balance exists - use RPC function to create it (bypasses RLS)
        const { data: newBalance, error: rpcError } = await supabase
          .rpc('ensure_player_balance', { p_player_id: userStats.id });
        
        if (!rpcError && newBalance !== null) {
          setPlayerBalance(newBalance);
        } else {
          // Fallback: set default balance in UI
          setPlayerBalance(10000);
        }
      }
    } catch (error) {
      console.error('Error fetching player balance:', error);
      setPlayerBalance(10000); // Default fallback
    }
  };

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
    });
    
    tournamentsChannel.subscribe();

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
    });
    
    playersChannel.subscribe();

    const registrationsChannel = supabase.channel('registrations-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tournament_registrations'
    }, payload => {
      console.log('Registration update:', payload);
      fetchTournaments();
      fetchUserRegistrations();
    });
    
    registrationsChannel.subscribe();

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
    <div className="space-y-4 pb-28 px-4 pt-24 bg-transparent min-h-screen relative z-10">
      {/* Hero Card with Glitch Logo */}
      <div className="relative cursor-pointer group/hero" onClick={() => setActiveTab('about')}>
        <Card className="bg-syndikate-metal/80 brutal-border overflow-hidden relative transition-all duration-500 group-hover/hero:scale-[1.02] group-hover/hero:shadow-neon-orange backdrop-blur-xl">
          {/* Animated border glow */}
          <div className="absolute inset-0 rounded-sm opacity-0 group-hover/hero:opacity-100 transition-opacity duration-500" 
               style={{ boxShadow: 'inset 0 0 30px hsla(24, 100%, 50%, 0.15)' }}></div>
          
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center gap-5">
              {/* Logo with glitch effect - larger */}
              <div className="relative w-24 h-24 flex-shrink-0">
                {/* Glow behind logo */}
                <div className="absolute inset-0 bg-syndikate-orange/25 blur-2xl rounded-full"></div>
                {/* Glitch layers */}
                <img 
                  src={syndikateLogo} 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-contain opacity-70 animate-glitch-logo-1" 
                  style={{ filter: 'drop-shadow(3px 0 0 hsl(24, 100%, 50%))' }}
                />
                <img 
                  src={syndikateLogo} 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-contain opacity-65 animate-glitch-logo-2" 
                  style={{ filter: 'drop-shadow(-3px 0 0 hsl(0, 84%, 45%))' }}
                />
                <img 
                  src={syndikateLogo} 
                  alt="" 
                  className="relative w-full h-full object-contain group-hover/hero:scale-110 transition-transform duration-500" 
                />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="font-display text-2xl sm:text-3xl uppercase text-foreground tracking-wider drop-shadow-lg group-hover/hero:text-syndikate-orange transition-colors duration-300">
                      <GlitchText 
                        text="SYNDICATE" 
                        glitchIntensity="high" 
                        glitchInterval={4500}
                      />
                    </h1>
                    <p className="font-display text-sm sm:text-base uppercase tracking-wider text-syndikate-orange font-bold mt-1">
                      Власть за столом
                    </p>
                  </div>

                  {/* Download icon button */}
                  {canAddToHomeScreen && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToHomeScreen();
                      }}
                      className="w-10 h-10 flex-shrink-0 bg-syndikate-concrete brutal-border flex items-center justify-center text-syndikate-orange hover:bg-syndikate-orange hover:text-background transition-all duration-300 hover:shadow-neon-orange"
                      title="Установить"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                  )}
                </div>
                
                {/* "О клубе" button */}
                <div className="mt-4 bg-syndikate-concrete/60 brutal-border px-4 py-3 backdrop-blur-md group-hover/hero:border-syndikate-orange/50 transition-all duration-300 flex items-center justify-between">
                  <span className="text-foreground text-sm font-bold uppercase tracking-wide">О клубе</span>
                  <ChevronRight className="h-5 w-5 text-syndikate-orange group-hover/hero:translate-x-1 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-syndikate-metal/90 brutal-border overflow-hidden cursor-pointer group transition-all duration-500 hover:scale-[1.02] hover:shadow-neon-orange backdrop-blur-xl relative" onClick={() => setActiveTab('rating')}>
        <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
          <div className="absolute top-6 right-6 text-syndikate-orange/30 text-4xl animate-pulse">♦</div>
          <div className="absolute bottom-6 left-6 text-syndikate-orange/20 text-3xl">♥</div>
        </div>
        
        <CardContent className="p-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-syndikate-orange brutal-border flex items-center justify-center shadow-neon-orange group-hover:shadow-neon-orange transition-all duration-300">
              <Trophy className="h-6 w-6 text-background group-hover:scale-110 transition-transform duration-300" />
            </div>
            
            <div className="flex-1">
              <h3 className="font-display text-xl uppercase text-foreground tracking-wider group-hover:text-syndikate-orange transition-colors duration-300">
                RATING POINTS
              </h3>
              <p className="text-muted-foreground text-sm mt-0.5">Общий рейтинг игроков</p>
            </div>
            
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-syndikate-orange group-hover:translate-x-1 transition-all duration-300" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-syndikate-metal/90 brutal-border cursor-pointer group transition-all duration-500 hover:scale-105 hover:shadow-neon-orange backdrop-blur-xl relative overflow-hidden" onClick={() => setActiveTab('qa')}>
          <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-4 flex items-center gap-3 relative z-10">
            <div className="w-11 h-11 bg-syndikate-orange brutal-border flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md">
              <MessageSquare className="h-5 w-5 text-background" />
            </div>
            <div className="flex-1">
              <h3 className="text-foreground font-bold uppercase text-sm tracking-wider group-hover:text-syndikate-orange transition-colors duration-300">Q&A</h3>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-syndikate-orange transition-colors duration-300" />
          </CardContent>
        </Card>

        <Card className="bg-syndikate-metal/90 brutal-border cursor-pointer group transition-all duration-500 hover:scale-105 hover:shadow-neon-orange backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-4 flex items-center gap-3 relative z-10">
            <div className="w-11 h-11 bg-syndikate-orange brutal-border flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md">
              <Shield className="h-5 w-5 text-background" />
            </div>
            <div className="flex-1">
              <h3 className="text-foreground font-bold uppercase text-sm tracking-wider group-hover:text-syndikate-orange transition-colors duration-300">Support</h3>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-syndikate-orange transition-colors duration-300" />
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="w-1.5 h-6 bg-gradient-to-b from-syndikate-orange to-syndikate-red rounded-full"></div>
          <p className="text-foreground text-lg font-bold uppercase tracking-wide">Ближайший турнир</p>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-syndikate-rust/50 to-transparent"></div>
        </div>
        
        {tournaments.length > 0 ? (
          <div 
            className="relative group cursor-pointer"
            onClick={() => setActiveTab('tournaments')}
          >
            {/* External Neon Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-syndikate-orange via-syndikate-red to-syndikate-orange rounded-lg opacity-0 group-hover:opacity-40 blur-xl transition-all duration-500"></div>
            
            <Card className="bg-gradient-to-br from-syndikate-metal/95 to-syndikate-concrete/90 brutal-border overflow-hidden transition-all duration-500 hover:shadow-neon-orange backdrop-blur-xl relative">
              {/* Warning Stripes at Top */}
              <div 
                className="absolute top-0 left-0 right-0 h-2 opacity-50"
                style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, rgba(255, 135, 31, 0.4), rgba(255, 135, 31, 0.4) 8px, transparent 8px, transparent 16px)'
                }}
              />
              
              {/* Corner Brackets */}
              <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-syndikate-orange transition-all duration-300 group-hover:w-8 group-hover:h-8 group-hover:border-l-3 group-hover:border-t-3" />
              <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-syndikate-orange transition-all duration-300 group-hover:w-8 group-hover:h-8" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-syndikate-orange transition-all duration-300 group-hover:w-8 group-hover:h-8" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-syndikate-orange transition-all duration-300 group-hover:w-8 group-hover:h-8" />
              
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/10 via-transparent to-syndikate-red/10 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Industrial Texture */}
              <div className="absolute inset-0 industrial-texture opacity-20" />
              
              {/* Metal Grid Overlay */}
              <div 
                className="absolute inset-0 opacity-5"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 135, 31, 0.1) 2px, rgba(255, 135, 31, 0.1) 3px),
                    repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255, 135, 31, 0.1) 2px, rgba(255, 135, 31, 0.1) 3px)
                  `,
                  backgroundSize: '24px 24px'
                }}
              />
              
              {/* Animated Orange Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-syndikate-orange/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-syndikate-red/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
              
              {/* Metallic shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              
              <CardContent className="p-5 pt-6 relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    {/* Status badges with icon */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-syndikate-orange brutal-border flex items-center justify-center animate-pulse shadow-neon-orange">
                        <Target className="h-4 w-4 text-background" />
                      </div>
                      <div className={`px-3 py-1.5 text-xs uppercase font-bold tracking-wider brutal-border ${
                        tournaments[0].status === 'active' 
                          ? 'bg-syndikate-red/20 text-syndikate-red border-2 border-syndikate-red/50 animate-pulse' 
                          : 'bg-syndikate-orange/20 text-syndikate-orange border-2 border-syndikate-orange/50'
                      }`}>
                        {tournaments[0].status === 'active' ? '● LIVE' : '● РЕГИСТРАЦИЯ'}
                      </div>
                      {tournaments[0].tournament_format && (
                        <div className="px-2.5 py-1.5 bg-syndikate-metal/50 brutal-border border-2 border-border text-xs uppercase text-muted-foreground font-bold">
                          {tournaments[0].tournament_format === 'rebuy' && <Zap className="h-3 w-3 inline mr-1" />}
                          {tournaments[0].tournament_format === 'reentry' && <Shield className="h-3 w-3 inline mr-1" />}
                          {tournaments[0].tournament_format}
                        </div>
                      )}
                    </div>
                    
                    {/* Tournament name */}
                    <h3 className="text-2xl font-display font-bold text-foreground tracking-wider uppercase group-hover:text-syndikate-orange transition-colors duration-300 leading-tight mb-2">
                      <GlitchText text={tournaments[0].name} glitchIntensity="medium" glitchInterval={8000} />
                    </h3>
                    
                    {/* Description if exists */}
                    {tournaments[0].description && (
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-2">{tournaments[0].description}</p>
                    )}
                  </div>
                  
                  {/* Ticket Number */}
                  <div className="bg-syndikate-orange/20 border-2 border-syndikate-orange/50 px-3 py-1.5 brutal-border ml-3">
                    <span className="text-[10px] text-syndikate-orange font-bold tracking-widest">#{tournaments[0].id.split('-')[0].toUpperCase()}</span>
                  </div>
                </div>
                
                {/* Divider Line */}
                <div className="h-[2px] bg-gradient-to-r from-syndikate-orange via-syndikate-red to-syndikate-orange mb-4 opacity-60" />
                
                {/* Prize Pool Banner */}
                <div className="mb-4 bg-syndikate-metal/50 brutal-border p-4 relative overflow-hidden group/prize">
                  <div className="absolute inset-0 industrial-texture opacity-10" />
                  <div className="absolute top-0 right-0 w-20 h-20 bg-syndikate-orange/20 rounded-full blur-2xl animate-pulse" />
                  <div className="relative flex items-center gap-4">
                    <div className="w-14 h-14 bg-syndikate-orange brutal-border flex items-center justify-center shadow-neon-orange group-hover/prize:animate-pulse">
                      <Trophy className="h-7 w-7 text-background" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Zap className="h-3 w-3 text-syndikate-orange animate-pulse" />
                        Призовой фонд RPS
                      </p>
                      <p className="font-display text-3xl text-syndikate-orange drop-shadow-[0_0_10px_rgba(255,107,0,0.5)]">
                        {formatRPSPoints(calculateTotalRPSPool(
                          tournaments[0].tournament_registrations?.[0]?.count || 0,
                          tournaments[0].participation_fee || 0,
                          0,
                          tournaments[0].reentry_fee || 0,
                          0,
                          tournaments[0].additional_fee || 0
                        ))}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Main info grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* Date & Time */}
                  <div className="bg-syndikate-metal/30 brutal-border p-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-syndikate-orange/10 rounded-full blur-xl" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 bg-syndikate-orange brutal-border flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-background" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Дата</span>
                      </div>
                      <div className="text-foreground/80 text-sm mb-0.5">
                        {new Date(tournaments[0].start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </div>
                      <div className="font-display text-xl text-syndikate-orange">
                        {new Date(tournaments[0].start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  
                  {/* Buy-in */}
                  <div className="bg-syndikate-metal/30 brutal-border p-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-syndikate-orange/15 rounded-full blur-xl" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 bg-syndikate-orange brutal-border flex items-center justify-center">
                          <Coins className="h-4 w-4 text-background" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Взнос</span>
                      </div>
                      <div className="font-display text-2xl text-syndikate-orange">
                        {tournaments[0].participation_fee.toLocaleString()}₽
                      </div>
                      {tournaments[0].reentry_fee && tournaments[0].reentry_fee > 0 && (
                        <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
                          Re: {tournaments[0].reentry_fee.toLocaleString()}₽
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Secondary info row */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-syndikate-metal/30 brutal-border p-2.5 text-center relative overflow-hidden group/stat hover:bg-syndikate-metal/50 transition-colors">
                    <div className="w-7 h-7 bg-syndikate-orange/80 brutal-border flex items-center justify-center mx-auto mb-1.5">
                      <Users className="h-4 w-4 text-background" />
                    </div>
                    <div className="text-foreground font-bold text-base">
                      {tournaments[0].tournament_registrations?.[0]?.count || 0}/{tournaments[0].max_players}
                    </div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Игроков</div>
                  </div>
                  <div className="bg-syndikate-metal/30 brutal-border p-2.5 text-center relative overflow-hidden group/stat hover:bg-syndikate-metal/50 transition-colors">
                    <div className="w-7 h-7 bg-syndikate-orange/80 brutal-border flex items-center justify-center mx-auto mb-1.5">
                      <Gem className="h-4 w-4 text-background" />
                    </div>
                    <div className="text-foreground font-bold text-base">
                      {(tournaments[0].starting_chips / 1000).toFixed(0)}K
                    </div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Стек</div>
                  </div>
                  <div className="bg-syndikate-metal/30 brutal-border p-2.5 text-center relative overflow-hidden group/stat hover:bg-syndikate-metal/50 transition-colors">
                    <div className="w-7 h-7 bg-syndikate-orange/80 brutal-border flex items-center justify-center mx-auto mb-1.5">
                      <Clock className="h-4 w-4 text-background" />
                    </div>
                    <div className="text-foreground font-bold text-base">
                      {Math.max(0, tournaments[0].max_players - (tournaments[0].tournament_registrations?.[0]?.count || 0))}
                    </div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Мест</div>
                  </div>
                </div>
                
                {/* Registration progress */}
                <div className="mb-4 bg-syndikate-metal/20 brutal-border p-3">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-bold">Регистрация</span>
                    <span className={`font-bold uppercase tracking-wider text-[10px] ${
                      ((tournaments[0].tournament_registrations?.[0]?.count || 0) / tournaments[0].max_players) >= 0.9 
                        ? 'text-syndikate-red animate-pulse' 
                        : 'text-syndikate-orange'
                    }`}>
                      {((tournaments[0].tournament_registrations?.[0]?.count || 0) / tournaments[0].max_players) >= 0.9 && (
                        <Zap className="h-3 w-3 inline mr-1" />
                      )}
                      {tournaments[0].max_players - (tournaments[0].tournament_registrations?.[0]?.count || 0)} мест
                    </span>
                  </div>
                  <div className="h-3 bg-background brutal-border overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        ((tournaments[0].tournament_registrations?.[0]?.count || 0) / tournaments[0].max_players) >= 0.9 
                          ? 'bg-gradient-to-r from-syndikate-red to-syndikate-orange shadow-[0_0_10px_rgba(255,59,48,0.5)] animate-pulse' 
                          : 'bg-gradient-to-r from-syndikate-orange to-syndikate-red shadow-[0_0_10px_rgba(255,107,0,0.3)]'
                      }`}
                      style={{ width: `${((tournaments[0].tournament_registrations?.[0]?.count || 0) / tournaments[0].max_players) * 100}%` }}
                    />
                  </div>
                </div>
                
                {/* CTA Button */}
                <button className="w-full py-3.5 brutal-border bg-syndikate-orange/20 hover:bg-syndikate-orange hover:text-background border-2 border-syndikate-orange/50 hover:border-syndikate-orange transition-all duration-300 flex items-center justify-center gap-2 group/btn shadow-brutal hover:shadow-neon-orange">
                  <Target className="h-5 w-5 text-syndikate-orange group-hover/btn:text-background transition-colors" />
                  <span className="text-syndikate-orange group-hover/btn:text-background font-bold uppercase tracking-wider transition-colors">Подробнее</span>
                  <ChevronRight className="h-5 w-5 text-syndikate-orange group-hover/btn:text-background group-hover/btn:translate-x-1 transition-all duration-300" />
                </button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="bg-syndikate-metal/90 brutal-border overflow-hidden backdrop-blur-xl">
            <CardContent className="p-6 text-center">
              <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Нет запланированных турниров</p>
            </CardContent>
          </Card>
        )}
      </div>

      {userStats && (() => {
        const effectiveRankData = getEffectiveMafiaRank({
          gamesPlayed: userStats.games_played,
          wins: userStats.wins,
          rating: userStats.elo_rating
        }, userStats.manual_rank);
        const userRank = effectiveRankData.rank;
        const userRarityInfo = getRarityInfo(userRank.rarity);
        
        // Стили карточек по конкретному рангу (id), а не по rarity - синхронизировано с getRankCardStyle
        const rankStyles: Record<string, { cardBg: string; border: string; glow: string; accent: string }> = {
          outsider: {
            cardBg: 'bg-gradient-to-br from-zinc-900/90 to-zinc-950/90',
            border: 'border-zinc-700/50',
            glow: '',
            accent: 'text-zinc-400',
          },
          picciotto: {
            cardBg: 'bg-gradient-to-br from-zinc-800/90 to-neutral-900/90',
            border: 'border-zinc-600/50',
            glow: '',
            accent: 'text-zinc-300',
          },
          soldato: {
            cardBg: 'bg-gradient-to-br from-stone-800/90 to-neutral-900/90',
            border: 'border-stone-600/50',
            glow: 'shadow-[0_0_15px_rgba(168,162,158,0.3)]',
            accent: 'text-stone-300',
          },
          sgarrista: {
            cardBg: 'bg-gradient-to-br from-amber-950/90 to-zinc-900/90',
            border: 'border-amber-600/40',
            glow: 'shadow-[0_0_20px_rgba(251,191,36,0.4)]',
            accent: 'text-amber-400',
          },
          associato: {
            cardBg: 'bg-gradient-to-br from-orange-950/90 to-zinc-900/90',
            border: 'border-orange-500/50',
            glow: 'shadow-[0_0_25px_rgba(249,115,22,0.5)]',
            accent: 'text-orange-400',
          },
          caporegime: {
            cardBg: 'bg-gradient-to-br from-blue-950/90 to-slate-900/90',
            border: 'border-blue-500/50',
            glow: 'shadow-[0_0_25px_rgba(59,130,246,0.5)]',
            accent: 'text-blue-400',
          },
          shark: {
            cardBg: 'bg-gradient-to-br from-purple-950/90 to-violet-950/90',
            border: 'border-purple-500/50',
            glow: 'shadow-[0_0_30px_rgba(147,51,234,0.5)]',
            accent: 'text-purple-400',
          },
          kapo: {
            cardBg: 'bg-gradient-to-br from-red-950/90 to-rose-950/90',
            border: 'border-red-500/50',
            glow: 'shadow-[0_0_30px_rgba(239,68,68,0.5)]',
            accent: 'text-red-400',
          },
          konsigliere: {
            cardBg: 'bg-gradient-to-br from-yellow-950/90 to-amber-950/90',
            border: 'border-yellow-500/50',
            glow: 'shadow-[0_0_35px_rgba(234,179,8,0.5)]',
            accent: 'text-yellow-400',
          },
          don: {
            cardBg: 'bg-gradient-to-br from-rose-950/90 via-fuchsia-950/90 to-violet-950/90',
            border: 'border-rose-400/50',
            glow: 'shadow-[0_0_35px_rgba(244,63,94,0.6)]',
            accent: 'text-rose-400',
          },
          patriarch: {
            cardBg: 'bg-gradient-to-br from-cyan-950/90 via-blue-950/90 to-purple-950/90',
            border: 'border-cyan-400/60',
            glow: 'shadow-[0_0_40px_rgba(34,211,238,0.5),0_0_60px_rgba(168,85,247,0.3)]',
            accent: 'text-cyan-300',
          },
        };
        
        const currentStyle = rankStyles[userRank.id] || rankStyles.outsider;
        
        return (
          <Card className={`${currentStyle.cardBg} brutal-border ${currentStyle.border} overflow-hidden relative backdrop-blur-xl group hover:scale-[1.02] transition-all duration-500 animate-fade-in ${currentStyle.glow}`}>
            {/* Rank-specific top accent line */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${userRank.id === 'patriarch' ? 'from-cyan-400 via-purple-500 to-pink-500' : userRank.id === 'don' ? 'from-rose-500 via-fuchsia-400 to-cyan-400' : `${userRank.bgGradient}`}`} />
            
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
            </div>
            
            {/* Rank badge with rank avatar */}
            <div className={`absolute top-2 right-2 px-2 py-1 text-[8px] font-bold uppercase tracking-wider ${userRarityInfo.class} rounded brutal-border flex items-center gap-1.5 z-20`}>
              <img src={userRank.avatar} alt={userRank.name} className="w-4 h-4 rounded-full" />
              {userRank.name}
            </div>
            
            <CardContent className="p-3 relative z-10">
              {/* Profile Header with Avatar */}
              <div className="flex items-center gap-3 mb-3">
                {/* Avatar with GlitchAvatarFrame */}
                <div className="relative">
                  <GlitchAvatarFrame rank={userRank} size="sm">
                    <Avatar className="w-full h-full">
                      <AvatarImage src={fixStorageUrl(userStats.avatar_url, userStats.id) || telegramUser?.photoUrl} alt="Avatar" />
                      <AvatarFallback className={`bg-gradient-to-br ${userRank.bgGradient} text-lg font-display text-white`}>
                        {(telegramUser?.firstName || 'П').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </GlitchAvatarFrame>
                  {/* Online indicator */}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background shadow-lg flex items-center justify-center z-20">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  </div>
                </div>
                
                {/* Name & Info */}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-display font-bold text-lg uppercase tracking-wider drop-shadow-lg truncate ${currentStyle.accent}`}>
                    <GlitchText text={telegramUser?.username || telegramUser?.firstName || 'ИГРОК'} glitchIntensity="low" />
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${currentStyle.accent}`}>#{players.findIndex(p => p.id === userStats.id) + 1 || '—'}</span>
                    <span className="text-muted-foreground text-[10px]">•</span>
                    <span className="text-muted-foreground text-[10px] truncate">{userRank.title}</span>
                  </div>
                </div>
                
                {/* Menu button */}
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`w-8 h-8 rounded-lg bg-white/5 backdrop-blur-sm border ${currentStyle.border} flex items-center justify-center hover:bg-white/10 transition-all duration-300 flex-shrink-0`}
                >
                  <ChevronRight className={`h-4 w-4 ${currentStyle.accent}`} />
                </button>
              </div>
              
              {/* Stats Grid - Compact */}
              <div className="grid grid-cols-3 gap-1.5">
                <div className={`text-center p-2 rounded-lg bg-white/5 backdrop-blur-sm border ${currentStyle.border}`}>
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${userRank.bgGradient} flex items-center justify-center mx-auto mb-1`}>
                    <Trophy className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className={`font-bold text-base font-display ${currentStyle.accent}`}>{userStats.elo_rating}</div>
                  <div className="text-muted-foreground text-[8px] uppercase tracking-wider">RPS</div>
                </div>
                
                <div className={`text-center p-2 rounded-lg bg-white/5 backdrop-blur-sm border ${currentStyle.border}`}>
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${userRank.bgGradient} flex items-center justify-center mx-auto mb-1`}>
                    <Crown className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className={`font-bold text-base font-display ${currentStyle.accent}`}>{userStats.wins}</div>
                  <div className="text-muted-foreground text-[8px] uppercase tracking-wider">Побед</div>
                </div>
                
                <div className={`text-center p-2 rounded-lg bg-white/5 backdrop-blur-sm border ${currentStyle.border}`}>
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${userRank.bgGradient} flex items-center justify-center mx-auto mb-1`}>
                    <Target className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className={`font-bold text-base font-display ${currentStyle.accent}`}>{userStats.games_played}</div>
                  <div className="text-muted-foreground text-[8px] uppercase tracking-wider">Игр</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}
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
    <div className="pb-28 px-4 pt-24 bg-transparent min-h-screen relative z-10">
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
                <img src={syndikateLogo} alt="SYNDICATE Logo" className="w-full h-full object-contain neon-orange group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="flex-1">
                <h1 className="font-display text-3xl uppercase text-foreground tracking-wider drop-shadow-lg group-hover:text-syndikate-orange transition-colors duration-300">
                  <GlitchText text="SYNDICATE" glitchIntensity="medium" glitchInterval={5000} />
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
                  <span className="font-bold uppercase">Важно:</span> Участвуя в турнирах SYNDICATE, вы автоматически соглашаетесь с данными правилами.
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
    <div className="w-full h-full bg-background relative overflow-hidden flex flex-col">
      {/* Industrial Background - no orange edges */}
      <>
        {/* Dark base - extended */}
        <div className="fixed inset-[-50px] bg-background z-0" />
        
        {/* Industrial metal base texture */}
        <div 
          className="fixed inset-[-50px] pointer-events-none industrial-texture opacity-40 z-0" 
        />

        {/* Metal grid overlay */}
        <div
          className="fixed inset-[-50px] pointer-events-none opacity-15 z-0"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(255,255,255,0.03) 48px, rgba(255,255,255,0.03) 49px),
              repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(255,255,255,0.03) 48px, rgba(255,255,255,0.03) 49px)
            `,
          }}
        />

        {/* Diagonal metal plates */}
        <div
          className="fixed inset-[-50px] pointer-events-none opacity-10 z-0"
          style={{
            backgroundImage: `
              linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.9) 40%, rgba(255,255,255,0.04) 41%, rgba(255,255,255,0.04) 42%, rgba(0,0,0,0.9) 43%, rgba(0,0,0,0.9) 100%)
            `,
            backgroundSize: "220px 220px",
          }}
        />

        {/* Subtle center glow only */}
        <div 
          ref={glowTopRef}
          className="fixed w-[300px] h-[300px] bg-syndikate-orange/10 rounded-full blur-[150px] opacity-40 will-change-transform z-0" 
          style={{ left: '-150px', top: '-150px' }}
        />
        <div 
          ref={glowBottomRef}
          className="fixed w-[300px] h-[300px] bg-syndikate-red/8 rounded-full blur-[150px] opacity-30 will-change-transform z-0" 
          style={{ right: '-150px', bottom: '-150px' }}
        />

        {/* Subtle noise */}
        <div
          className="fixed inset-0 pointer-events-none opacity-20 mix-blend-soft-light z-0"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)",
            backgroundSize: "4px 4px",
          }}
        />
        
        {/* Dark vignette - hide any color on edges */}
        <div 
          className="fixed inset-0 pointer-events-none z-[1]"
          style={{
            boxShadow: 'inset 0 0 150px 80px hsl(var(--background))'
          }}
        />
      </>
      
      {/* Content Area with relative z-index */}
      <div className="flex-1 overflow-y-auto telegram-content relative z-20 overflow-x-hidden" style={{ maxHeight: '100%' }}>
        <div className="max-w-lg mx-auto">
          {activeTab === 'home' && renderHome()}
          {activeTab === 'about' && renderAbout()}
      
      {activeTab === 'tournaments' && (
        <div className="space-y-4 pb-28 px-4 pt-24 bg-transparent min-h-screen relative z-10">
          {/* Header */}
          <div className="relative p-4 bg-syndikate-metal/90 brutal-border backdrop-blur-xl overflow-hidden">
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255, 107, 0, 0.05) 25%, rgba(255, 107, 0, 0.05) 26%, transparent 27%, transparent 74%, rgba(255, 107, 0, 0.05) 75%, rgba(255, 107, 0, 0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 107, 0, 0.05) 25%, rgba(255, 107, 0, 0.05) 26%, transparent 27%, transparent 74%, rgba(255, 107, 0, 0.05) 75%, rgba(255, 107, 0, 0.05) 76%, transparent 77%, transparent)',
                backgroundSize: '50px 50px'
              }}></div>
            </div>
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 bg-syndikate-orange brutal-border flex items-center justify-center shadow-neon-orange">
                <Trophy className="h-6 w-6 text-background" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-display tracking-wider uppercase">
                  <GlitchText text="Турниры" glitchIntensity="medium" />
                </h2>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {tournaments.length} активных турниров
                </p>
              </div>
            </div>
          </div>
          
          {tournaments.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-20 h-20 mx-auto bg-syndikate-metal brutal-border flex items-center justify-center">
                <Trophy className="h-10 w-10 text-syndikate-concrete" />
              </div>
              <h3 className="text-xl font-display text-syndikate-concrete uppercase">
                No Active Tournaments
              </h3>
              <p className="text-sm text-syndikate-concrete/60">
                Check back soon for upcoming tournaments
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tournaments.map((tournament, index) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  index={index}
                  onClick={() => {
                    setSelectedTournament(tournament);
                    setShowTournamentModal(true);
                  }}
                  onRegister={registerForTournament}
                  isRegistering={registering === tournament.id}
                  isRegistered={userRegistrations.has(tournament.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'rating' && (
        <div className="space-y-4 pb-28 px-4 pt-24 bg-transparent min-h-screen relative z-10">
          {/* Header */}
          <div className="relative p-4 bg-syndikate-metal/90 brutal-border backdrop-blur-xl overflow-hidden">
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255, 107, 0, 0.05) 25%, rgba(255, 107, 0, 0.05) 26%, transparent 27%, transparent 74%, rgba(255, 107, 0, 0.05) 75%, rgba(255, 107, 0, 0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 107, 0, 0.05) 25%, rgba(255, 107, 0, 0.05) 26%, transparent 27%, transparent 74%, rgba(255, 107, 0, 0.05) 75%, rgba(255, 107, 0, 0.05) 76%, transparent 77%, transparent)',
                backgroundSize: '50px 50px'
              }}></div>
            </div>
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 bg-syndikate-orange brutal-border flex items-center justify-center shadow-neon-orange">
                <Award className="h-6 w-6 text-background" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-display tracking-wider uppercase">
                  <GlitchText text="Рейтинг RPS" glitchIntensity="medium" />
                </h2>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {players.length} игроков в системе
                </p>
              </div>
            </div>
          </div>

          {/* Mafia Hierarchy - показываем для текущего пользователя */}
          {userStats && (
            <MafiaHierarchy 
              gamesPlayed={userStats.games_played} 
              wins={userStats.wins} 
              rating={userStats.elo_rating} 
            />
          )}

          {/* Podium for top 3 */}
          {players.length >= 3 && (
            <>
              {/* Decorative header for Top 3 */}
              <div className="relative py-4 mt-2">
                {/* Gradient lines */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-syndikate-orange/40 to-transparent" />
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 mt-1 h-px bg-gradient-to-r from-transparent via-syndikate-red/20 to-transparent" />
                
                {/* Center badge */}
                <div className="relative flex justify-center">
                  <div className="px-6 py-2.5 bg-gradient-to-r from-syndikate-metal via-background to-syndikate-metal border border-syndikate-orange/30 flex items-center gap-3">
                    <div className="w-2 h-2 bg-syndikate-orange rotate-45 animate-pulse" />
                    <Crown className="h-5 w-5 text-syndikate-orange" />
                    <span className="text-sm font-display uppercase tracking-[0.2em] text-syndikate-orange">
                      Топ 3
                    </span>
                    <Crown className="h-5 w-5 text-syndikate-orange" />
                    <div className="w-2 h-2 bg-syndikate-orange rotate-45 animate-pulse" />
                  </div>
                </div>
                
                {/* Decorative corners */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 border-l-2 border-t-2 border-syndikate-orange/30" />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 border-r-2 border-b-2 border-syndikate-orange/30" />
              </div>
              
              <RatingPodium 
                topPlayers={players.slice(0, 3)}
                onPlayerClick={(player) => {
                  setSelectedPlayer(player);
                  setShowPlayerStatsModal(true);
                }}
              />
            </>
          )}

          {players.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-20 h-20 mx-auto bg-syndikate-metal brutal-border flex items-center justify-center">
                <Award className="h-10 w-10 text-syndikate-concrete" />
              </div>
              <h3 className="text-xl font-display text-syndikate-concrete uppercase">
                Пока нет игроков
              </h3>
              <p className="text-sm text-syndikate-concrete/60">
                Станьте первым участником рейтинга
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Эффектный разделитель перед списком */}
              {players.length >= 3 && (
                <div className="relative py-6 my-4">
                  {/* Gradient line */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-syndikate-orange/60 to-transparent" />
                  
                  {/* Center badge */}
                  <div className="relative flex justify-center">
                    <div className="px-4 py-2 bg-background border border-syndikate-orange/30 flex items-center gap-2 animate-fade-in">
                      <div className="w-2 h-2 bg-syndikate-orange rounded-full animate-pulse" />
                      <span className="text-xs font-display uppercase tracking-wider text-syndikate-orange/80">
                        Остальные участники
                      </span>
                      <div className="w-2 h-2 bg-syndikate-orange rounded-full animate-pulse" />
                    </div>
                  </div>
                  
                  {/* Decorative corners */}
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 border-l-2 border-t-2 border-syndikate-orange/20" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 border-r-2 border-b-2 border-syndikate-orange/20" />
                </div>
              )}
              
              {/* Show remaining players (after top 3 if podium shown, or all if less than 3) */}
              {(players.length >= 3 ? players.slice(3) : players).map((player, index) => {
                const actualRank = players.length >= 3 ? index + 4 : index + 1;
                return (
                  <PlayerRatingCard
                    key={player.id}
                    player={player}
                    rank={actualRank}
                    index={index}
                    isCurrentUser={userStats?.id === player.id}
                    onClick={() => {
                      setSelectedPlayer(player);
                      setShowPlayerStatsModal(true);
                    }}
                  />
                );
              })}
            </div>
          )}
          
          {/* Your position highlight if not in visible list */}
          {userStats && players.length > 10 && !players.slice(0, 10).some(p => p.id === userStats.id) && (
            <div className="mt-4 p-4 bg-syndikate-orange/10 brutal-border">
              <div className="text-center">
                <p className="text-sm text-muted-foreground uppercase mb-2">Ваша позиция</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl font-display text-syndikate-orange">
                    #{players.findIndex(p => p.id === userStats.id) + 1}
                  </span>
                  <span className="text-lg font-display">{userStats.elo_rating} RPS</span>
                </div>
              </div>
            </div>
          )}
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

      {activeTab === 'poker' && (
        <div className={isAtPokerTable ? "min-h-screen relative z-10" : "pb-28 pt-24 px-4 min-h-screen relative z-10"}>
          {/* Syndikate luxury background for poker table */}
          {isAtPokerTable && (
            <>
              <div 
                className="fixed inset-0 z-0"
                style={{
                  backgroundImage: `url(${syndikateBg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <div className="fixed inset-0 z-0" style={{
                background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.6) 100%)'
              }} />
            </>
          )}
          <TelegramPokerLobby 
            playerId={userStats?.id}
            playerName={userStats?.name || telegramUser?.firstName || 'Гость'}
            playerAvatar={fixStorageUrl(userStats?.avatar_url, userStats?.id) || telegramUser?.photoUrl}
            playerBalance={playerBalance}
            onTableStateChange={setIsAtPokerTable}
          />
        </div>
      )}

      {activeTab === 'qa' && (
        <div className="space-y-6 pb-28 px-4 pt-24 bg-transparent min-h-screen relative z-10">
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
                      Абсолютно! Мы проводим спортивные турниры без денежных призов, что полностью соответствует российскому законодательству. Согласно ФЗ №244, запрещены только азартные игры с материальными выигрышами. SYNDICATE — это спортивное сообщество для развития навыков и общения.
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
                      SYNDICATE — это уникальное комьюнити единомышленников! Где еще вы найдете профессиональное оборудование, отличный сервис и возможность развивать покерные навыки в безопасной среде? Мы создаем атмосферу спортивного соревнования и дружеского общения.
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
                      В SYNDICATE действует продуманная RPS-система для честного ранжирования участников. Рейтинговые очки начисляются за результативные выступления в турнирах и отражают исключительно игровое мастерство. Система мотивирует на спортивное развитие и определяет лучших игроков клуба.
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
                      Это эксклюзивные события для топовых игроков рейтинга SYNDICATE. Проводятся в особом формате с повышенным комфортом и сервисом. Участие строго по приглашениям на основе достижений в рейтинге. Место нельзя передать — только личное участие лучших игроков клуба.
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
                      Это набор игровых фишек, который получает каждый участник турнира. Фишки — развлекательное оборудование без денежной стоимости, их нельзя обменять или вывести. Стандартный стартовый стек в SYNDICATE составляет 30,000 фишек для всех участников.
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

      {/* Fixed bottom navigation - site style - hidden when at poker table */}
      {!isAtPokerTable && (
      <div className="fixed bottom-4 left-4 right-4 z-50 pb-safe">
        <div className="flex items-center justify-center gap-2">
          {[
            { value: 'home', icon: Home, title: 'Главная' },
            { value: 'tournaments', icon: Trophy, title: 'Турниры' },
            { value: 'poker', icon: Spade, title: 'Покер' },
            { value: 'rating', icon: Crown, title: 'Рейтинг' },
            { value: 'profile', icon: User, title: 'Профиль' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.value;
            return (
              <button
                key={item.value}
                onClick={() => setActiveTab(item.value)}
                className={`
                  relative flex flex-col items-center justify-center gap-0.5 px-4 py-2
                  transition-all duration-300
                  backdrop-blur-md bg-background/40 border border-border/30 rounded-lg
                  hover:scale-105 hover:bg-background/60 hover:border-syndikate-orange/40
                  ${isActive ? 'bg-background/60 border-syndikate-orange/50' : ''}
                `}
                style={{
                  boxShadow: isActive 
                    ? '0 4px 16px rgba(255, 90, 31, 0.25)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.3)'
                }}
              >
                {/* Active indicator - top accent */}
                {isActive && (
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-syndikate-orange rounded-full" />
                )}
                
                {/* Icon */}
                <Icon 
                  className={`h-5 w-5 transition-all duration-300 ${
                    isActive 
                      ? 'text-syndikate-orange drop-shadow-[0_0_8px_rgba(255,90,31,0.6)]' 
                      : 'text-muted-foreground'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                
                {/* Label */}
                <span className={`text-[9px] font-semibold uppercase tracking-wide transition-all duration-300 font-mono whitespace-nowrap ${
                  isActive 
                    ? 'text-syndikate-orange' 
                    : 'text-muted-foreground'
                }`}>
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Floating Notification Bell - top right corner */}
      {!isAtPokerTable && isAuthenticated && (
        <div className="fixed top-4 right-4 z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="relative flex items-center justify-center w-11 h-11 transition-all duration-300 backdrop-blur-md bg-background/60 border border-border/40 rounded-full hover:scale-105 hover:bg-background/80 hover:border-syndikate-orange/50 shadow-lg"
              >
                <Bell className="h-5 w-5 text-foreground transition-all duration-300" strokeWidth={2} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center animate-pulse font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-syndikate-metal brutal-border" align="end">
              <div className="p-3 border-b border-border">
                <h4 className="font-semibold text-sm text-foreground">Приглашения в семью</h4>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {newInvitations.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Нет новых приглашений
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {newInvitations.map((invitation) => {
                      const emblem = CLAN_EMBLEMS.find(e => e.id === invitation.clan?.emblem_id);
                      return (
                        <div key={invitation.id} className="p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                              {emblem?.icon || '🏠'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate text-foreground">
                                {invitation.clan?.name || 'Неизвестная семья'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Приглашение в клан
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-syndikate-orange hover:bg-syndikate-orange-glow"
                              onClick={async () => {
                                await acceptInvitation(invitation.id, invitation.clan_id);
                                refreshClan();
                              }}
                            >
                              Принять
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={async () => {
                                await declineInvitation(invitation.id, invitation.clan_id);
                                refreshClan();
                              }}
                            >
                              Отклонить
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

        </div>
      </div>

      <TelegramTournamentModal
        tournament={selectedTournament}
        open={showTournamentModal}
        onOpenChange={setShowTournamentModal}
        onRegister={registerForTournament}
        registering={registering !== null}
      />

      {showPlayerStatsModal && selectedPlayer && (
        <RankedPlayerModal
          player={selectedPlayer}
          onClose={() => {
            setShowPlayerStatsModal(false);
            setSelectedPlayer(null);
          }}
        />
      )}
    </div>
  );
};