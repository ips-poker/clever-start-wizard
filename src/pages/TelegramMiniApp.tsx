import { useEffect } from 'react';
import { TelegramApp } from '@/components/telegram/TelegramApp';

export default function TelegramMiniApp() {
  useEffect(() => {
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
    
    // Register Service Worker для PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }, []);

  return <TelegramApp />;
}