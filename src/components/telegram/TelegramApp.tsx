import React, { useEffect, useState } from 'react';
import { initData, backButton, mainButton, themeParams } from '@telegram-apps/sdk-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Trophy, MessageCircle, User, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Tournament {
  id: string;
  name: string;
  start_time: string;
  buy_in: number;
  max_players: number;
  status: string;
  registered_players?: number;
}

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  avatar_url?: string;
}

export const TelegramApp = () => {
  const [currentView, setCurrentView] = useState<'home' | 'tournaments' | 'rating' | 'qna' | 'profile'>('home');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Initialize Telegram Mini App
    const init = async () => {
      try {
        await initData.restore();
        const telegramUser = initData.user();
        setUser(telegramUser);
        
        // Set theme colors based on Telegram theme
        const theme = themeParams.isDark() ? 'dark' : 'light';
        document.documentElement.className = theme;
        
        loadData();
      } catch (error) {
        console.error('Telegram init error:', error);
        loadData(); // Load data even if Telegram init fails
      }
    };

    init();
  }, []);

  const loadData = async () => {
    try {
      // Load tournaments
      const { data: tournamentsData } = await supabase
        .from('tournaments')
        .select('*')
        .eq('is_published', true)
        .order('start_time', { ascending: true })
        .limit(5);

      // Load top players
      const { data: playersData } = await supabase
        .rpc('get_players_public')
        .order('elo_rating', { ascending: false })
        .limit(10);

      setTournaments(tournamentsData || []);
      setPlayers(playersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderHome = () => (
    <div className="space-y-4">
      {/* Club Header */}
      <Card className="bg-gradient-to-r from-red-900/50 to-red-800/50 border-red-700 p-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-black/30 rounded-full flex items-center justify-center">
            <Trophy className="w-8 h-8 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">EPC CLUB</h1>
            <p className="text-red-200">Elite Poker Community</p>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gray-900/50 border-gray-700 p-4">
          <div className="text-center">
            <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-white">{tournaments.length}</div>
            <div className="text-xs text-gray-400">Активных турниров</div>
          </div>
        </Card>
        <Card className="bg-gray-900/50 border-gray-700 p-4">
          <div className="text-center">
            <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-white">{players.length}</div>
            <div className="text-xs text-gray-400">Игроков в рейтинге</div>
          </div>
        </Card>
      </div>

      {/* Upcoming Tournament */}
      {tournaments[0] && (
        <Card className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-700">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Ближайший турнир</h3>
              <Badge variant="secondary" className="bg-green-600 text-white">
                {tournaments[0].status}
              </Badge>
            </div>
            <h4 className="text-lg font-bold text-white mb-2">{tournaments[0].name}</h4>
            <div className="space-y-1 text-sm text-gray-300">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {new Date(tournaments[0].start_time).toLocaleDateString('ru-RU')}
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                {tournaments[0].registered_players || 0}/{tournaments[0].max_players}
              </div>
            </div>
            <Button 
              className="w-full mt-3 bg-red-600 hover:bg-red-700"
              onClick={() => setCurrentView('tournaments')}
            >
              Подробнее
            </Button>
          </div>
        </Card>
      )}
    </div>
  );

  const renderTournaments = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Турниры</h2>
        <Button variant="ghost" size="sm" onClick={() => setCurrentView('home')}>
          <Home className="w-4 h-4" />
        </Button>
      </div>
      
      {tournaments.map((tournament) => (
        <Card key={tournament.id} className="bg-gray-900/50 border-gray-700">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white">{tournament.name}</h3>
              <Badge variant={tournament.status === 'registration' ? 'default' : 'secondary'}>
                {tournament.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 mb-3">
              <div>
                <span className="text-gray-400">Бай-ин:</span> {tournament.buy_in}₽
              </div>
              <div>
                <span className="text-gray-400">Игроков:</span> {tournament.registered_players || 0}/{tournament.max_players}
              </div>
            </div>
            <div className="text-sm text-gray-400 mb-3">
              {new Date(tournament.start_time).toLocaleString('ru-RU')}
            </div>
            <Button 
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={tournament.status !== 'registration'}
            >
              {tournament.status === 'registration' ? 'Записаться' : 'Недоступно'}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderRating = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Рейтинг</h2>
        <Button variant="ghost" size="sm" onClick={() => setCurrentView('home')}>
          <Home className="w-4 h-4" />
        </Button>
      </div>

      {players.map((player, index) => (
        <Card key={player.id} className="bg-gray-900/50 border-gray-700">
          <div className="p-4 flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                {index < 3 ? (
                  <Trophy className={`w-5 h-5 ${
                    index === 0 ? 'text-yellow-400' : 
                    index === 1 ? 'text-gray-300' : 'text-amber-600'
                  }`} />
                ) : (
                  <span className="text-white font-bold">{index + 1}</span>
                )}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">{player.name}</h3>
              <div className="text-sm text-gray-400">
                Игр: {player.games_played} • Побед: {player.wins}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-yellow-400">{player.elo_rating}</div>
              <div className="text-xs text-gray-400">рейтинг</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderQnA = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Q&A</h2>
        <Button variant="ghost" size="sm" onClick={() => setCurrentView('home')}>
          <Home className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <Card className="bg-gray-900/50 border-gray-700">
          <div className="p-4">
            <h3 className="font-semibold text-white mb-2">1. Это законно?</h3>
            <p className="text-gray-300 text-sm">
              Да, соревновательный покер в России регулируется 244-ФЗ О государственном регулировании деятельности по организации и проведению азартных игр.
            </p>
          </div>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700">
          <div className="p-4">
            <h3 className="font-semibold text-white mb-2">2. Если нет призов, зачем играть?</h3>
            <p className="text-gray-300 text-sm">
              Мы обеспечиваем честную конкуренцию и ведем рейтинг игроков. Это отличный способ улучшить свои навыки.
            </p>
          </div>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700">
          <div className="p-4">
            <h3 className="font-semibold text-white mb-2">3. Что такое рейтинг?</h3>
            <p className="text-gray-300 text-sm">
              Рейтинговая система отслеживает уровень мастерства каждого игрока на основе результатов турниров.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Профиль</h2>
        <Button variant="ghost" size="sm" onClick={() => setCurrentView('home')}>
          <Home className="w-4 h-4" />
        </Button>
      </div>

      <Card className="bg-gray-900/50 border-gray-700">
        <div className="p-6 text-center">
          <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
            <User className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {user?.firstName || 'Гость'} {user?.lastName || ''}
          </h3>
          <p className="text-gray-400 mb-4">Мой рейтинг</p>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-1">0</div>
            <div className="text-sm text-gray-400">Нет данных</div>
          </div>
        </div>
      </Card>

      <Card className="bg-gray-900/50 border-gray-700">
        <div className="p-4">
          <h4 className="font-semibold text-white mb-3">История игр</h4>
          <div className="text-center text-gray-400 py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Нет данных</p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderBottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-black/90 border-t border-gray-700">
      <div className="grid grid-cols-5 py-2">
        {[
          { id: 'home', icon: Home, label: 'Главная' },
          { id: 'tournaments', icon: Trophy, label: 'Турниры' },
          { id: 'rating', icon: Users, label: 'Рейтинг' },
          { id: 'qna', icon: MessageCircle, label: 'Q&A' },
          { id: 'profile', icon: User, label: 'Профиль' },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setCurrentView(id as any)}
            className={`flex flex-col items-center py-2 px-1 ${
              currentView === id ? 'text-red-400' : 'text-gray-400'
            }`}
          >
            <Icon className="w-5 h-5 mb-1" />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="container max-w-md mx-auto p-4">
        {currentView === 'home' && renderHome()}
        {currentView === 'tournaments' && renderTournaments()}
        {currentView === 'rating' && renderRating()}
        {currentView === 'qna' && renderQnA()}
        {currentView === 'profile' && renderProfile()}
      </div>
      {renderBottomNav()}
    </div>
  );
};