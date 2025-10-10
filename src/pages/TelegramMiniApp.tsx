import { useEffect } from 'react';
import { TelegramApp } from '@/components/telegram/TelegramApp';
import { init, miniApp, themeParams } from '@telegram-apps/sdk-react';

export default function TelegramMiniApp() {
  useEffect(() => {
    // Initialize Telegram SDK
    try {
      init();
      console.log('Telegram SDK initialized successfully');
      
      // Монтируем miniApp для управления внешним видом
      if (miniApp.mount.isAvailable()) {
        miniApp.mount();
        console.log('MiniApp mounted');
      }
      
      // Настройка внешнего вида Telegram Mini App
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        
        // Разворачиваем приложение на весь экран
        tg.expand();
        
        // Устанавливаем цвет заголовка и фона в черный чтобы слился с фоном приложения
        if (miniApp.setHeaderColor.isAvailable()) {
          miniApp.setHeaderColor('#000000');
          console.log('Header color set to black');
        }
        
        if (miniApp.setBackgroundColor.isAvailable()) {
          miniApp.setBackgroundColor('#000000');
          console.log('Background color set to black');
        }
        
        // Отключаем подтверждение закрытия
        tg.disableClosingConfirmation();
        
        console.log('Telegram WebApp appearance configured');
      }
    } catch (error) {
      console.error('Failed to configure Telegram SDK:', error);
    }

    // Set viewport for Telegram Mini App
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }

    // Disable zoom and scroll behaviors
    document.body.style.overscrollBehavior = 'none';
    document.body.style.touchAction = 'pan-x pan-y';
    
    // Set dark theme by default
    document.documentElement.classList.add('dark');
  }, []);

  return <TelegramApp />;
}