import { useEffect } from 'react';
import { TelegramApp } from '@/components/telegram/TelegramApp';

// Declare Telegram WebApp types
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        expand: () => void;
        ready: () => void;
        sendData?: (data: string) => void;
      };
    };
  }
}

export default function TelegramMiniApp() {
  useEffect(() => {
    try {
      // Initialize Telegram Mini App with proper API
      const initTelegramApp = async () => {
        // Use proper Telegram WebApp API
        if (window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp;
          
          // Expand first
          tg.expand();
          
          // Request fullscreen mode to hide address bar
          tg.sendData = tg.sendData || (() => {});
          
          // Use multiple methods to hide address bar
          tg.expand();
          
          // iOS Safari specific
          if ((window.navigator as any).standalone === false) {
            // Add to homescreen prompt for iOS
            window.addEventListener('beforeinstallprompt', function(e) {
              e.preventDefault();
            });
          }
          
          // Try different fullscreen methods
          setTimeout(() => {
            window.scrollTo(0, 1);
            tg.expand();
          }, 500);
          
          // Set header color
          window.parent.postMessage(
            JSON.stringify({
              eventType: 'web_app_set_header_color',
              eventData: { color: '#0f172a' }
            }), 
            '*'
          );
          
          tg.ready();
        }
        
        // Set viewport for better mobile experience
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        if (viewportMeta) {
          viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
        }

        // Mobile optimizations - prevent app closing on pull-down
        document.body.style.overscrollBehavior = 'none';
        document.body.style.touchAction = 'pan-x pan-y';
        document.body.style.height = '100vh';
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.overscrollBehavior = 'none';
        
        // Prevent pull-to-refresh and rubber band scrolling
        document.addEventListener('touchstart', preventPullToRefresh, { passive: false });
        document.addEventListener('touchmove', preventPullToRefresh, { passive: false });
        
        // Set dark theme
        document.documentElement.classList.add('dark');
      };
      
      // Add console logging for debugging authentication
      console.log('Telegram WebApp available:', !!window.Telegram?.WebApp);
      console.log('Current URL:', window.location.href);
      
      initTelegramApp();
    } catch (error) {
      console.error('Telegram initialization error:', error);
    }
  }, []);

  // Function to prevent pull to refresh
  const preventPullToRefresh = (e: TouchEvent) => {
    const touch = e.touches[0];
    const startY = touch.clientY;
    
    // If user is at the top and trying to scroll up, prevent it
    if (window.scrollY === 0 && startY > 0) {
      e.preventDefault();
    }
  };

  return <TelegramApp />;
}