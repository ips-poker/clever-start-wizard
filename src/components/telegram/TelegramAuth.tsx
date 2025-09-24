import React, { useEffect, useState } from 'react';
import { initData } from '@telegram-apps/sdk-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User, LogIn } from 'lucide-react';

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

  useEffect(() => {
    initializeTelegramAuth();
  }, []);

  const initializeTelegramAuth = async () => {
    try {
      // Try to get Telegram user data
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
      // For now, just complete auth without database integration
      // TODO: Add telegram_id field to players table for full integration
      onAuthComplete(telegramUserData);
    } catch (error) {
      console.error('Supabase auth error:', error);
      setAuthError('Ошибка аутентификации');
    }
  };

  const retryAuth = () => {
    setLoading(true);
    setAuthError(null);
    initializeTelegramAuth();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="bg-gray-900 border-gray-700 p-6 max-w-sm mx-4">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h2 className="text-white text-lg font-semibold mb-2">Авторизация</h2>
            <p className="text-gray-400">Подключение к Telegram...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="bg-gray-900 border-gray-700 p-6 max-w-sm mx-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-white text-lg font-semibold mb-2">Ошибка авторизации</h2>
            <p className="text-gray-400 mb-4">{authError}</p>
            <Button 
              onClick={retryAuth}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Попробовать снова
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Card className="bg-gray-900 border-gray-700 p-6 max-w-sm mx-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            {telegramUser?.photoUrl ? (
              <img 
                src={telegramUser.photoUrl} 
                alt="Avatar" 
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <h2 className="text-white text-lg font-semibold mb-2">
            Добро пожаловать!
          </h2>
          <p className="text-gray-400 mb-4">
            {telegramUser?.firstName} {telegramUser?.lastName}
          </p>
          <Button 
            onClick={() => telegramUser && onAuthComplete(telegramUser)}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            Войти в EPC Club
          </Button>
        </div>
      </Card>
    </div>
  );
};