import React, { useEffect, useState } from 'react';
import { initData } from '@telegram-apps/sdk-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PrivacyConsent } from '@/components/PrivacyConsent';
import { User, LogIn, Loader2 } from 'lucide-react';
import syndikateLogo from '@/assets/syndikate-logo-main.png';
import { GlitchText } from '@/components/ui/glitch-text';

// Храним initDataRaw для отправки на сервер
let cachedInitDataRaw: string | null = null;

// Получаем initDataRaw напрямую из Telegram WebApp API (наиболее надёжный способ)
const getInitDataRaw = (): string | null => {
  try {
    // Способ 1: Напрямую из window.Telegram.WebApp.initData (самый надёжный)
    const webApp = (window as any).Telegram?.WebApp;
    if (webApp?.initData && webApp.initData.length > 0) {
      console.log('✅ initDataRaw получен из window.Telegram.WebApp.initData');
      console.log('📦 initDataRaw length:', webApp.initData.length);
      return webApp.initData;
    }
    
    // Способ 2: Из URL hash (Telegram иногда передаёт данные через hash)
    const hash = window.location.hash;
    if (hash && hash.includes('tgWebAppData=')) {
      const params = new URLSearchParams(hash.slice(1));
      const tgData = params.get('tgWebAppData');
      if (tgData) {
        console.log('✅ initDataRaw получен из URL hash');
        return decodeURIComponent(tgData);
      }
    }
    
    // Способ 3: Из URL search params
    const searchParams = new URLSearchParams(window.location.search);
    const tgWebAppData = searchParams.get('tgWebAppData');
    if (tgWebAppData) {
      console.log('✅ initDataRaw получен из URL search params');
      return tgWebAppData;
    }
    
    console.warn('⚠️ initDataRaw не найден ни одним способом');
    console.log('🔍 Диагностика:');
    console.log('  - window.Telegram:', typeof (window as any).Telegram);
    console.log('  - window.Telegram.WebApp:', typeof webApp);
    console.log('  - initData:', webApp?.initData ? `"${webApp.initData.substring(0, 50)}..."` : 'отсутствует');
    console.log('  - URL hash:', hash || 'пусто');
    console.log('  - URL search:', window.location.search || 'пусто');
    
    return null;
  } catch (error) {
    console.error('❌ Ошибка при получении initDataRaw:', error);
    return null;
  }
};

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
  const [privacyConsent, setPrivacyConsent] = useState(false);

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
      // Получаем initDataRaw для безопасной верификации на сервере
      cachedInitDataRaw = getInitDataRaw();
      
      await initData.restore();
      const user = initData.user();
      
      if (user) {
        console.log('Telegram user data from SDK:', {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
          photoUrl: user.photo_url,
          hasPhoto: !!user.photo_url,
          hasInitDataRaw: !!cachedInitDataRaw
        });
        
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
      
      // Проверяем, было ли ранее дано согласие
      const consentKey = `telegram_consent_${telegramUserData.id}`;
      const hasConsent = localStorage.getItem(consentKey) === 'true';
      
      if (!hasConsent) {
        // Если согласия нет, просто устанавливаем пользователя и показываем форму согласия
        setRegistering(false);
        return;
      }
      
      // Подготавливаем данные для Telegram авторизации через edge function
      // Используем initDataRaw для безопасной верификации на сервере
      const telegramAuthData = {
        id: telegramUserData.id,
        first_name: telegramUserData.firstName,
        last_name: telegramUserData.lastName,
        username: telegramUserData.username,
        photo_url: telegramUserData.photoUrl,
        auth_date: Math.floor(Date.now() / 1000),
        // Отправляем initDataRaw для HMAC верификации на сервере
        init_data_raw: cachedInitDataRaw || undefined
      };

      console.log('Authenticating with Telegram data:', telegramAuthData);

      // Показываем предупреждение, если нет фото
      if (!telegramUserData.photoUrl) {
        console.warn('⚠️ Telegram не предоставил фотографию профиля. Возможные причины:',
          '\n- Настройки приватности в Telegram',
          '\n- Фото профиля не установлено',
          '\n- Версия Telegram не поддерживает передачу фото');
      }

      // Используем edge function для полной авторизации
      const { data, error } = await supabase.functions.invoke('telegram-auth', {
        body: telegramAuthData
      });

      if (error) {
        console.error('Telegram auth edge function error:', error);
        setAuthError('Ошибка авторизации через Telegram');
        return;
      }

      if (data?.success) {
        console.log('Authentication successful');
        
        // Автоматически входим в приложение
        onAuthComplete(telegramUserData);
        return;
      } else {
        console.error('Invalid response from auth function:', data);
        setAuthError('Неверный ответ от сервера авторизации');
        return;
      }
    } catch (error) {
      console.error('Supabase auth error:', error);
      setAuthError('Ошибка создания профиля игрока');
    } finally {
      setRegistering(false);
    }
  };

  const handleLogin = async () => {
    if (!telegramUser || !privacyConsent) return;
    
    // Сохраняем согласие
    const consentKey = `telegram_consent_${telegramUser.id}`;
    localStorage.setItem(consentKey, 'true');
    
    // Выполняем авторизацию
    await authenticateWithSupabase(telegramUser);
  };

  const retryAuth = () => {
    setLoading(true);
    setAuthError(null);
    initializeTelegramAuth();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background industrial-texture flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-[300px] h-[300px] bg-syndikate-orange/20 rounded-full blur-[80px] animate-pulse" />
          <div className="absolute bottom-10 right-10 w-[250px] h-[250px] bg-syndikate-red/15 rounded-full blur-[70px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <Card className="bg-syndikate-metal/90 brutal-border max-w-sm mx-4 backdrop-blur-xl relative z-10">
          <CardContent className="text-center p-6">
            <div className="animate-spin w-10 h-10 border-2 border-syndikate-orange border-t-transparent rounded-full mx-auto mb-4"></div>
            <CardTitle className="text-foreground font-display text-2xl uppercase tracking-wider mb-2">Авторизация</CardTitle>
            <p className="text-muted-foreground">Подключение к Telegram...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-background industrial-texture flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-[300px] h-[300px] bg-syndikate-orange/20 rounded-full blur-[80px] animate-pulse" />
          <div className="absolute bottom-10 right-10 w-[250px] h-[250px] bg-syndikate-red/15 rounded-full blur-[70px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <Card className="bg-syndikate-metal/90 brutal-border max-w-sm mx-4 backdrop-blur-xl relative z-10">
          <CardContent className="text-center p-6">
            <div className="w-12 h-12 bg-syndikate-red/20 brutal-border flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-6 h-6 text-syndikate-red" />
            </div>
            <CardTitle className="text-foreground font-display text-2xl uppercase tracking-wider mb-2">Ошибка</CardTitle>
            <p className="text-muted-foreground mb-4">{authError}</p>
            <Button 
              onClick={retryAuth}
              className="w-full bg-syndikate-orange hover:bg-syndikate-orange-glow text-background font-bold uppercase tracking-wider shadow-neon-orange"
            >
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background industrial-texture flex items-center justify-center relative overflow-hidden">
      {/* Industrial Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-[300px] h-[300px] bg-syndikate-orange/20 rounded-full blur-[80px] animate-pulse" />
        <div className="absolute bottom-10 right-10 w-[250px] h-[250px] bg-syndikate-red/15 rounded-full blur-[70px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      {/* Metal Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px),
            repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px)
          `
        }}
      />

      <Card className="bg-syndikate-metal/90 brutal-border max-w-sm mx-4 backdrop-blur-xl relative z-10">
        <CardHeader className="text-center pb-3">
          {/* SYNDICATE Logo */}
          <div className="w-32 h-32 mx-auto mb-4 border-4 border-syndikate-orange bg-syndikate-metal brutal-border flex items-center justify-center p-4 relative group">
            <img 
              src={syndikateLogo} 
              alt="SYNDICATE Logo" 
              className="w-full h-full object-contain neon-orange"
            />
            {/* Corner Decorations */}
            <div className="absolute -top-2 -left-2 w-6 h-6 border-l-2 border-t-2 border-syndikate-red" />
            <div className="absolute -top-2 -right-2 w-6 h-6 border-r-2 border-t-2 border-syndikate-red" />
            <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-2 border-b-2 border-syndikate-red" />
            <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-2 border-b-2 border-syndikate-red" />
          </div>
          
          <CardTitle className="font-display text-3xl uppercase tracking-wider neon-orange mb-2">
            <GlitchText 
              text="SYNDICATE" 
              glitchIntensity="high" 
              glitchInterval={4500}
            />
          </CardTitle>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-[2px] w-8 bg-gradient-neon" />
            <p className="font-display text-lg uppercase tracking-wider text-syndikate-orange">
              Власть за столом
            </p>
            <div className="h-[2px] w-8 bg-gradient-neon" />
          </div>
          
          {/* User Avatar */}
          <div className="w-20 h-20 brutal-border flex items-center justify-center mx-auto mb-4 bg-syndikate-concrete/50">
            {telegramUser?.photoUrl ? (
              <img 
                src={telegramUser.photoUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-syndikate-orange" />
            )}
          </div>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-foreground mb-2 font-bold uppercase tracking-wider">
            {telegramUser?.firstName} {telegramUser?.lastName}
          </p>
          {telegramUser?.username && (
            <p className="text-muted-foreground mb-4 text-sm">@{telegramUser.username}</p>
          )}
          
          <PrivacyConsent
            checked={privacyConsent}
            onCheckedChange={setPrivacyConsent}
            disabled={registering}
            className="mb-4 text-left"
          />
          
          <Button 
            onClick={handleLogin}
            disabled={registering || !privacyConsent}
            className="w-full bg-syndikate-orange hover:bg-syndikate-orange-glow text-background font-bold uppercase tracking-wider shadow-neon-orange hover:shadow-neon-orange transition-all"
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