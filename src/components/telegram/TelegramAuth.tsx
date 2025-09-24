import React, { useEffect, useState } from 'react';
import { initData } from '@telegram-apps/sdk-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, LogIn, Loader2 } from 'lucide-react';

interface TelegramUser {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
}

interface TelegramAuthProps {
  onAuthComplete: (user: TelegramUser) => void;
}

export const TelegramAuth: React.FC<TelegramAuthProps> = ({ onAuthComplete }) => {
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    initializeTelegramAuth();
  }, []);

  const initializeTelegramAuth = async () => {
    try {
      // Проверяем режим эмуляции ПЕРЕД попыткой восстановления Telegram данных
      const isDevelopment = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1' ||
                            window.location.hostname.includes('.lovableproject.com');
      
      if (isDevelopment) {
        // Тестовый пользователь для разработки
        const testUser: TelegramUser = {
          id: 123456789,
          firstName: 'Тестовый',
          lastName: 'Пользователь',
          username: 'test_user',
          photoUrl: undefined,
        };
        
        setTelegramUser(testUser);
        await authenticateWithSupabase(testUser);
        return;
      }
      
      // Обычная авторизация через Telegram только если НЕ режим разработки
      await initData.restore();
      const user = initData.user();
      
      if (user) {
        const telegramUserData: TelegramUser = {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
          photoUrl: user.photo_url,
        };
        
        setTelegramUser(telegramUserData);
        await authenticateWithSupabase(telegramUserData);
      } else {
        setAuthError('Приложение должно быть открыто через Telegram бота');
      }
    } catch (error) {
      console.error('Telegram auth error:', error);
      setAuthError('Приложение должно быть открыто через Telegram бота');
    } finally {
      setLoading(false);
    }
  };

  const authenticateWithSupabase = async (telegramUserData: TelegramUser) => {
    try {
      setRegistering(true);
      
      const telegramId = telegramUserData.id.toString();
      const supabaseUrl = 'https://mokhssmnorrhohrowxvu.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1va2hzc21ub3JyaG9ocm93eHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODUzNDYsImV4cCI6MjA2ODY2MTM0Nn0.ZWYgSZFeidY0b_miC7IyfXVPh1EUR2WtxlEvt_fFmGc';
      
      // Простая проверка существования игрока
      const checkResult = await fetch(`${supabaseUrl}/rest/v1/players?telegram_id=eq.${telegramId}&select=id,name`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const existingPlayers = await checkResult.json();
      const existingPlayer = existingPlayers?.[0];

      if (existingPlayer) {
        // Игрок существует, обновляем данные
        await fetch(`${supabaseUrl}/rest/v1/players?telegram_id=eq.${telegramId}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            telegram_username: telegramUserData.username,
            updated_at: new Date().toISOString()
          })
        });
      } else {
        // Создаем нового игрока
        const playerName = [telegramUserData.firstName, telegramUserData.lastName]
          .filter(Boolean)
          .join(' ') || telegramUserData.username || `Player${telegramUserData.id}`;

        await fetch(`${supabaseUrl}/rest/v1/players`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: playerName,
            telegram_id: telegramId,
            telegram_username: telegramUserData.username,
            avatar_url: telegramUserData.photoUrl,
            elo_rating: 1000,
            games_played: 0,
            wins: 0
          })
        });
      }

      onAuthComplete(telegramUserData);
    } catch (error) {
      console.error('Supabase auth error:', error);
      setAuthError('Ошибка создания профиля игрока');
    } finally {
      setRegistering(false);
    }
  };

  const retryAuth = () => {
    setLoading(true);
    setAuthError(null);
    initializeTelegramAuth();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
        <Card className="bg-slate-900/50 border-slate-700 p-6 max-w-sm mx-4">
          <CardContent className="text-center p-6">
            <div className="animate-spin w-10 h-10 border-2 border-amber-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <CardTitle className="text-white text-lg mb-2">Авторизация</CardTitle>
            <p className="text-slate-400">Подключение к Telegram...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
        <Card className="bg-slate-900/50 border-slate-700 p-6 max-w-sm mx-4">
          <CardContent className="text-center p-6">
            <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-6 h-6 text-red-400" />
            </div>
            <CardTitle className="text-white text-lg mb-2">Ошибка авторизации</CardTitle>
            <p className="text-slate-400 mb-4">{authError}</p>
            <Button 
              onClick={retryAuth}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            >
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-f1-carbon to-f1-carbon-light flex items-center justify-center relative overflow-hidden">
      
      {/* F1 Grid Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(0deg, transparent 24%, hsl(var(--f1-red)) 25%, hsl(var(--f1-red)) 26%, transparent 27%),
            linear-gradient(90deg, transparent 24%, hsl(var(--f1-red)) 25%, hsl(var(--f1-red)) 26%, transparent 27%)
          `,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* Speed Lines */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <div className="absolute top-20 left-0 w-full h-0.5 bg-gradient-speed animate-speed-lines"></div>
        <div className="absolute top-40 left-0 w-full h-0.5 bg-gradient-speed animate-speed-lines" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-40 left-0 w-full h-0.5 bg-gradient-speed animate-speed-lines" style={{animationDelay: '2s'}}></div>
      </div>

      <Card className="bg-gradient-carbon border-2 border-f1-red/50 max-w-sm mx-4 shadow-2xl relative overflow-hidden">
        {/* Racing Stripe */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-racing"></div>
        
        <CardHeader className="text-center pb-3 relative">
          <div className="w-24 h-24 bg-gradient-f1-red rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-f1-gold/50 shadow-2xl relative">
            {telegramUser?.photoUrl ? (
              <img 
                src={telegramUser.photoUrl} 
                alt="Avatar" 
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-white animate-neon-glow" />
            )}
            <div className="absolute inset-0 rounded-full border-2 border-f1-gold/30 animate-racing-pulse"></div>
          </div>
          <CardTitle className="text-white text-xl font-black tracking-wider">
            🏁 ДОБРО ПОЖАЛОВАТЬ В
          </CardTitle>
          <div className="text-center mt-2">
            <h1 className="text-2xl font-black text-f1-red tracking-widest animate-neon-glow">EPC</h1>
            <h2 className="text-lg font-bold text-f1-gold tracking-wide -mt-1">EVENT POKER CLUB</h2>
            <p className="text-f1-silver text-sm mt-1 font-medium">ФОРМУЛА ПОКЕРА</p>
          </div>
        </CardHeader>
        <CardContent className="text-center relative">
          <p className="text-white font-bold mb-2 text-lg">
            {telegramUser?.firstName} {telegramUser?.lastName}
          </p>
          {telegramUser?.username && (
            <p className="text-f1-gold mb-4 text-sm font-semibold">@{telegramUser.username}</p>
          )}
          <Button 
            onClick={() => telegramUser && onAuthComplete(telegramUser)}
            disabled={registering}
            className="w-full bg-gradient-f1-red hover:bg-f1-red-dark text-white border-0 font-black text-lg py-3 shadow-xl
                     hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]" 
          >
            {registering ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ПОДКЛЮЧЕНИЕ К ПИТУ...
              </>
            ) : (
              <>
                🏁 ВОЙТИ В КОМАНДУ
              </>
            )}
          </Button>
        </CardContent>
        
        {/* Bottom Racing Stripe */}
        <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-racing"></div>
      </Card>
    </div>
  );
};