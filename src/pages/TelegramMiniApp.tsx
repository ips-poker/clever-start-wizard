import { useEffect } from 'react';
import { TelegramApp } from '@/components/telegram/TelegramApp';

// Declare Telegram WebApp types
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        expand: () => void;
        disableVerticalSwipes: () => void;
        setHeaderColor: (color: string) => void;
        ready: () => void;
      };
    };
  }
}

export default function TelegramMiniApp() {
  useEffect(() => {
    try {
      // Initialize Telegram Mini App
      const initTelegramApp = async () => {
        // Expand the Mini App to fullscreen
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.expand();
          window.Telegram.WebApp.disableVerticalSwipes();
          window.Telegram.WebApp.setHeaderColor('#0f172a'); // Dark header
          window.Telegram.WebApp.ready();
        }
        
        // Set viewport for Telegram Mini App
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        if (viewportMeta) {
          viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
        }

        // Disable zoom and scroll behaviors
        document.body.style.overscrollBehavior = 'none';
        document.body.style.touchAction = 'pan-x pan-y';
        document.body.style.height = '100vh';
        document.body.style.overflow = 'hidden';
        
        // Set dark theme by default
        document.documentElement.classList.add('dark');
        
        // Hide address bar on mobile
        setTimeout(() => {
          window.scrollTo(0, 1);
        }, 100);
      };
      
      initTelegramApp();
    } catch (error) {
      console.error('Telegram initialization error:', error);
    }
  }, []);

  return <TelegramApp />;
}