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
        setAuthError('Не удалось получить данные Telegram пользователя');
      }
    } catch (error) {
      console.error('Telegram auth error:', error);
      setAuthError('Ошибка авторизации через Telegram');
    } finally {
      setLoading(false);
    }
  };

  const authenticateWithSupabase = async (telegramUserData: TelegramUser) => {
    try {
      setRegistering(true);
      
      // Проверяем существует ли уже игрок с таким telegram_id
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('*')
        .eq('telegram_id', telegramUserData.id.toString())
        .single();

      if (existingPlayer) {
        // Игрок уже существует, обновляем данные если нужно
        const { error: updateError } = await supabase
          .from('players')
          .update({
            telegram_username: telegramUserData.username,
            updated_at: new Date().toISOString()
          })
          .eq('telegram_id', telegramUserData.id.toString());

        if (updateError) {
          console.error('Error updating player:', updateError);
        }
      } else {
        // Создаем нового игрока
        const playerName = [telegramUserData.firstName, telegramUserData.lastName]
          .filter(Boolean)
          .join(' ') || telegramUserData.username || `Player${telegramUserData.id}`;

        const { error: insertError } = await supabase
          .from('players')
          .insert({
            name: playerName,
            telegram_id: telegramUserData.id.toString(),
            telegram_username: telegramUserData.username,
            avatar_url: telegramUserData.photoUrl,
            elo_rating: 1000, // Начальный рейтинг
            games_played: 0,
            wins: 0
          });

        if (insertError) {
          console.error('Error creating player:', insertError);
          throw insertError;
        }
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
            Добро пожаловать в IPS Club!
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