import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Home,
  Calendar, 
  Users, 
  MessageSquare,
  User,
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
      <h2 className="text-white text-lg font-bold mb-4">Добро пожаловать в EPC Poker Club!</h2>
      
      {/* Navigation Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#2E2E2E] p-3 rounded-lg text-center">
          <span className="text-[#E63946] font-bold text-sm">О клубе</span>
        </div>
        <div className="bg-[#2E2E2E] p-3 rounded-lg text-center">
          <span className="text-[#E63946] font-bold text-sm">Легенды</span>
        </div>
        <div className="bg-[#2E2E2E] p-3 rounded-lg text-center">
          <span className="text-[#E63946] font-bold text-sm">Q&A</span>
        </div>
        <div className="bg-[#2E2E2E] p-3 rounded-lg text-center">
          <span className="text-[#E63946] font-bold text-sm">Support</span>
        </div>
      </div>

      {/* User Stats */}
      {userStats && (
        <div className="bg-[#1A1A1A] p-4 rounded-xl mb-4">
          <h3 className="text-white text-base font-bold mb-3">Ваша статистика</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-white text-lg font-bold">{userStats.elo_rating}</div>
              <div className="text-[#AAAAAA] text-sm">Рейтинг</div>
            </div>
            <div className="text-center">
              <div className="text-white text-lg font-bold">{userStats.wins}</div>
              <div className="text-[#AAAAAA] text-sm">Побед</div>
            </div>
            <div className="text-center">
              <div className="text-white text-lg font-bold">{userStats.games_played}</div>
              <div className="text-[#AAAAAA] text-sm">Игр</div>
            </div>
          </div>
        </div>
      )}

      {/* Nearest Tournament */}
      <div className="bg-[#1A1A1A] p-4 rounded-xl">
        <h3 className="text-white text-base font-bold mb-3">Ближайший турнир</h3>
        {tournaments.length > 0 ? (
          <div className="space-y-3">
            <div>
              <h4 className="text-white font-bold text-base mb-1">{tournaments[0].name}</h4>
              <p className="text-[#AAAAAA] text-sm mb-2">
                {new Date(tournaments[0].start_time).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short'
                })} / {new Date(tournaments[0].start_time).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <p className={`font-bold text-sm mb-3 ${
                tournaments[0].status === 'scheduled' ? 'text-[#00FF00]' : 'text-[#E63946]'
              }`}>
                {tournaments[0].status === 'scheduled' ? 'OPEN' : tournaments[0].status.toUpperCase()}
              </p>
              
              {tournaments[0].status === 'scheduled' ? (
                <button 
                  className="w-full bg-[#E63946] text-white font-bold py-3 rounded-lg"
                  onClick={() => registerForTournament(tournaments[0].id)}
                  disabled={registering === tournaments[0].id}
                >
                  {registering === tournaments[0].id ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    'Записаться'
                  )}
                </button>
              ) : (
                <button className="w-full bg-[#555555] text-white font-bold py-3 rounded-lg">
                  В список ожидания
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-[#AAAAAA]">
            <p className="text-sm">Нет запланированных турниров</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTournaments = () => (
    <div className="space-y-4 pb-20">
      {tournaments.map((tournament) => (
        <div key={tournament.id} className="bg-[#1A1A1A] p-4 rounded-xl">
          <h3 className="text-white font-bold text-base mb-1">{tournament.name}</h3>
          <p className="text-[#AAAAAA] text-sm mb-2">
            {new Date(tournament.start_time).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short'
            })} / {new Date(tournament.start_time).toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <p className={`font-bold text-sm mb-3 ${
            tournament.status === 'scheduled' ? 'text-[#00FF00]' : 'text-[#E63946]'
          }`}>
            {tournament.status === 'scheduled' ? 'OPEN' : tournament.status.toUpperCase()}
          </p>
          
          <div className="grid grid-cols-3 gap-4 mb-4 text-center">
            <div>
              <p className="text-[#AAAAAA] text-xs">Бай-ин</p>
              <p className="text-white font-bold">{tournament.buy_in}₽</p>
            </div>
            <div>
              <p className="text-[#AAAAAA] text-xs">Игроки</p>
              <p className="text-white font-bold">
                {tournament.tournament_registrations?.[0]?.count || 0}/{tournament.max_players}
              </p>
            </div>
            <div>
              <p className="text-[#AAAAAA] text-xs">Фишки</p>
              <p className="text-white font-bold">{tournament.starting_chips.toLocaleString()}</p>
            </div>
          </div>

          {tournament.status === 'scheduled' ? (
            <button 
              className="w-full bg-[#E63946] text-white font-bold py-3 rounded-lg"
              onClick={() => registerForTournament(tournament.id)}
              disabled={registering === tournament.id}
            >
              {registering === tournament.id ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                'Записаться'
              )}
            </button>
          ) : (
            <button className="w-full bg-[#555555] text-white font-bold py-3 rounded-lg">
              В список ожидания
            </button>
          )}
        </div>
      ))}
      
      {tournaments.length === 0 && (
        <div className="text-center py-6 text-[#AAAAAA]">
          <p className="text-sm">Нет запланированных турниров</p>
        </div>
      )}
    </div>
  );

  const renderRating = () => (
    <div className="space-y-4 pb-20">
      {players.map((player, index) => (
        <div key={player.id} className="bg-[#1A1A1A] p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E63946] rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">#{index + 1}</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-base">{player.name}</h3>
                <p className="text-[#AAAAAA] text-sm">
                  {player.games_played} игр • {player.wins} побед
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[#E63946] font-bold text-lg">{player.elo_rating}</div>
              <div className="text-[#AAAAAA] text-xs">ELO</div>
            </div>
          </div>
        </div>
      ))}
      
      {players.length === 0 && (
        <div className="text-center py-6 text-[#AAAAAA]">
          <p className="text-sm">Нет данных о рейтинге</p>
        </div>
      )}
    </div>
  );

  const renderQA = () => (
    <div className="space-y-4 pb-20">
      <div className="bg-[#1A1A1A] p-4 rounded-xl space-y-4">
        <div>
          <h3 className="text-white font-bold text-base mb-2">❓ Как зарегистрироваться на турнир?</h3>
          <p className="text-[#AAAAAA] text-sm">
            Выберите турнир в разделе "Турниры" и нажмите кнопку "Записаться". 
            Регистрация подтверждается автоматически.
          </p>
        </div>
        
        <div>
          <h3 className="text-white font-bold text-base mb-2">💰 Какие способы оплаты?</h3>
          <p className="text-[#AAAAAA] text-sm">
            Принимаем наличные и банковские карты. Оплата производится в клубе 
            перед началом турнира.
          </p>
        </div>
        
        <div>
          <h3 className="text-white font-bold text-base mb-2">📍 Где находится клуб?</h3>
          <p className="text-[#AAAAAA] text-sm">
            г. Москва, ул. Покерная, д. 1. Работаем ежедневно с 18:00 до 06:00.
          </p>
        </div>
        
        <div>
          <h3 className="text-white font-bold text-base mb-2">🏆 Как работает рейтинг?</h3>
          <p className="text-[#AAAAAA] text-sm">
            Используется система ELO. Рейтинг обновляется после каждого турнира 
            в зависимости от занятого места.
          </p>
        </div>
        
        <div>
          <h3 className="text-white font-bold text-base mb-2">📞 Поддержка</h3>
          <p className="text-[#AAAAAA] text-sm">
            По всем вопросам обращайтесь к администратору клуба или в телеграм 
            @ips_poker_support
          </p>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-4 pb-20">
      <div className="bg-[#1A1A1A] p-4 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-[#E63946] rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base">
              {telegramUser?.firstName} {telegramUser?.lastName}
            </h3>
            <p className="text-[#AAAAAA] text-sm">@{telegramUser?.username}</p>
          </div>
        </div>

        {userStats ? (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-[#AAAAAA]">Никнейм:</span>
              <span className="text-white font-bold">{userStats.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#AAAAAA]">Рейтинг:</span>
              <span className="text-white font-bold">{userStats.elo_rating}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#AAAAAA]">Игр сыграно:</span>
              <span className="text-white font-bold">{userStats.games_played}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#AAAAAA]">Побед:</span>
              <span className="text-white font-bold">{userStats.wins}</span>
            </div>
          </div>
        ) : (
          <p className="text-[#AAAAAA] text-sm">История игр пока отсутствует</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {!isAuthenticated ? (
        <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
          <TelegramAuth onAuthComplete={handleAuthComplete} />
        </div>
      ) : (
        <div className="relative">
          {/* Header */}
          <div className="bg-[#1A1A1A] p-4 text-center">
            <h1 className="text-[#E63946] text-xl font-bold">EPC Poker Club</h1>
          </div>

          {/* Main Content */}
          <div className="px-4 pt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsContent value="home" className="mt-0">
                {loading ? (
                  <div className="flex items-center justify-center min-h-[50vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-[#E63946]" />
                  </div>
                ) : (
                  renderHome()
                )}
              </TabsContent>
              
              <TabsContent value="tournaments" className="mt-0">
                {loading ? (
                  <div className="flex items-center justify-center min-h-[50vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-[#E63946]" />
                  </div>
                ) : (
                  renderTournaments()
                )}
              </TabsContent>
              
              <TabsContent value="rating" className="mt-0">
                {loading ? (
                  <div className="flex items-center justify-center min-h-[50vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-[#E63946]" />
                  </div>
                ) : (
                  renderRating()
                )}
              </TabsContent>
              
              <TabsContent value="qa" className="mt-0">
                {renderQA()}
              </TabsContent>
              
              <TabsContent value="profile" className="mt-0">
                {renderProfile()}
              </TabsContent>

              {/* Bottom Navigation */}
              <div className="fixed bottom-0 left-0 right-0 bg-[#1A1A1A] border-t border-[#2E2E2E]">
                <TabsList className="grid w-full grid-cols-5 bg-transparent h-16">
                  <TabsTrigger value="home" className="flex flex-col items-center gap-1 text-xs text-[#AAAAAA] data-[state=active]:text-[#E63946] data-[state=active]:bg-transparent">
                    <Home className="h-5 w-5" />
                    <span className="font-bold">Главная</span>
                  </TabsTrigger>
                  <TabsTrigger value="tournaments" className="flex flex-col items-center gap-1 text-xs text-[#AAAAAA] data-[state=active]:text-[#E63946] data-[state=active]:bg-transparent">
                    <Calendar className="h-5 w-5" />
                    <span className="font-bold">Турниры</span>
                  </TabsTrigger>
                  <TabsTrigger value="rating" className="flex flex-col items-center gap-1 text-xs text-[#AAAAAA] data-[state=active]:text-[#E63946] data-[state=active]:bg-transparent">
                    <Users className="h-5 w-5" />
                    <span className="font-bold">Рейтинг</span>
                  </TabsTrigger>
                  <TabsTrigger value="qa" className="flex flex-col items-center gap-1 text-xs text-[#AAAAAA] data-[state=active]:text-[#E63946] data-[state=active]:bg-transparent">
                    <MessageSquare className="h-5 w-5" />
                    <span className="font-bold">Q&A</span>
                  </TabsTrigger>
                  <TabsTrigger value="profile" className="flex flex-col items-center gap-1 text-xs text-[#AAAAAA] data-[state=active]:text-[#E63946] data-[state=active]:bg-transparent">
                    <User className="h-5 w-5" />
                    <span className="font-bold">Профиль</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
};