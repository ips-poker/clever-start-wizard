import { useEffect } from 'react';
import { TelegramApp } from '@/components/telegram/TelegramApp';
import { init, miniApp, viewport } from '@telegram-apps/sdk-react';

export default function TelegramMiniApp() {
  useEffect(() => {
    // Initialize Telegram SDK
    try {
      init();
      console.log('Telegram SDK initialized successfully');

      // Mount the mini app
      miniApp.mount();
      
      // Expand to fullscreen
      viewport.mount();
      viewport.expand();
      
      // Set header and background colors to match app theme
      miniApp.setHeaderColor('#000000');
      miniApp.setBackgroundColor('#000000');
      
      // Notify Telegram that the app is ready
      miniApp.ready();
      
      console.log('Mini app configured for fullscreen launch');
    } catch (error) {
      console.error('Failed to initialize Telegram SDK:', error);
    }

    // Set viewport for Telegram Mini App
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }

    // Disable zoom and scroll behaviors
    document.body.style.overscrollBehavior = 'none';
    document.body.style.touchAction = 'pan-x pan-y';
    
    // Set dark theme by default
    document.documentElement.classList.add('dark');
  }, []);

  return <TelegramApp />;
}