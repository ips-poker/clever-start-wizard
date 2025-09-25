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
      console.log('Starting authentication for user:', telegramUserData);
      
      const telegramId = telegramUserData.id.toString();
      
      // Используем supabase client вместо прямых fetch запросов
      let { data: existingPlayer, error: checkError } = await supabase
        .from('players')
        .select('*')
        .eq('telegram', telegramId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking player:', checkError);
        throw checkError;
      }

      if (existingPlayer) {
        console.log('Player exists, updating:', existingPlayer.id);
        // Игрок существует, обновляем данные
        const { error: updateError } = await supabase
          .from('players')
          .update({
            name: [telegramUserData.firstName, telegramUserData.lastName]
              .filter(Boolean)
              .join(' ') || telegramUserData.username || existingPlayer.name,
            avatar_url: telegramUserData.photoUrl || existingPlayer.avatar_url,
            updated_at: new Date().toISOString()
          })
          .eq('telegram', telegramId);

        if (updateError) {
          console.error('Error updating player:', updateError);
          throw updateError;
        }
      } else {
        console.log('Creating new player for telegram ID:', telegramId);
        // Создаем нового игрока
        const playerName = [telegramUserData.firstName, telegramUserData.lastName]
          .filter(Boolean)
          .join(' ') || telegramUserData.username || `Player${telegramUserData.id}`;

        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert({
            name: playerName,
            telegram: telegramId,
            avatar_url: telegramUserData.photoUrl,
            elo_rating: 100,
            games_played: 0,
            wins: 0
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating player:', createError);
          throw createError;
        }

        existingPlayer = newPlayer;
        console.log('Created new player:', existingPlayer);
      }

      console.log('Authentication completed successfully');
      onAuthComplete(telegramUserData);
    } catch (error) {
      console.error('Supabase auth error:', error);
      setAuthError('Ошибка создания профиля игрока. Попробуйте еще раз.');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
      <Card className="bg-slate-900/50 border-slate-700 max-w-sm mx-4">
        <CardHeader className="text-center pb-3">
          <div className="w-20 h-20 bg-amber-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-amber-600/30">
            {telegramUser?.photoUrl ? (
              <img 
                src={telegramUser.photoUrl} 
                alt="Avatar" 
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-amber-400" />
            )}
          </div>
          <CardTitle className="text-white text-xl">
            Добро пожаловать в EPC Event Poker Club!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-slate-300 mb-2 font-medium">
            {telegramUser?.firstName} {telegramUser?.lastName}
          </p>
          {telegramUser?.username && (
            <p className="text-slate-400 mb-4 text-sm">@{telegramUser.username}</p>
          )}
          <Button 
            onClick={() => telegramUser && onAuthComplete(telegramUser)}
            disabled={registering}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white border-0"
          >
            {registering ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Создание профиля...
              </>
            ) : (
              'Войти в клуб'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};