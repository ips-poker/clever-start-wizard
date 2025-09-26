import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface TelegramAuthData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export const useTelegramAuth = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const authenticateWithTelegram = useCallback(async (telegramData: TelegramAuthData) => {
    setLoading(true);
    
    try {
      console.log('Processing Telegram authentication...');

      // Вызываем нашу edge function для обработки Telegram авторизации
      const { data, error } = await supabase.functions.invoke('telegram-auth', {
        body: telegramData
      });

      if (error) {
        console.error('Telegram auth error:', error);
        toast({
          title: 'Ошибка авторизации',
          description: 'Не удалось войти через Telegram',
          variant: 'destructive'
        });
        return { success: false, error };
      }

      if (data?.success && data?.login_url) {
        toast({
          title: 'Успешная авторизация',
          description: 'Перенаправление...',
        });
        
        // Перенаправляем на ссылку для автоматического входа
        setTimeout(() => {
          window.location.href = data.login_url;
        }, 1000);
        
        return { success: true, data };
      } else {
        toast({
          title: 'Ошибка',
          description: 'Неверный ответ сервера',
          variant: 'destructive'
        });
        return { success: false, error: 'Invalid server response' };
      }
    } catch (error) {
      console.error('Error during Telegram authentication:', error);
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при авторизации',
        variant: 'destructive'
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const openTelegramBot = useCallback((botUsername = 'EPC_Poker_Bot') => {
    const currentUrl = encodeURIComponent(window.location.href);
    const telegramUrl = `https://t.me/${botUsername}?start=webauth_${Date.now()}`;
    
    // Открываем Telegram в новой вкладке
    const telegramWindow = window.open(telegramUrl, '_blank');
    
    if (telegramWindow) {
      toast({
        title: 'Перенаправление в Telegram',
        description: 'Откройте Telegram и нажмите "Старт" для авторизации',
      });
    } else {
      toast({
        title: 'Не удалось открыть Telegram',
        description: 'Пожалуйста, разрешите всплывающие окна и попробуйте снова',
        variant: 'destructive'
      });
    }
  }, [toast]);

  return {
    loading,
    authenticateWithTelegram,
    openTelegramBot
  };
};