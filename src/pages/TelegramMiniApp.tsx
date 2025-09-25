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
          
          // Use multiple methods to hide address bar more aggressively
          tg.expand();
          
          // Request fullscreen via postMessage
          window.parent.postMessage({
            eventType: 'web_app_request_fullscreen'
          }, '*');
          
          // iOS Safari specific - try to hide address bar
          if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            // Delay to ensure DOM is ready
            setTimeout(() => {
              window.scrollTo(0, 1);
              tg.expand();
              
              // Try viewport manipulation
              const viewport = document.querySelector('meta[name="viewport"]');
              if (viewport) {
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, minimal-ui');
              }
            }, 100);
            
            // Try again after a longer delay
            setTimeout(() => {
              window.scrollTo(0, 1);
              tg.expand();
            }, 1000);
          }
          
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

        // Mobile optimizations - prevent app closing on pull-down but allow interactions
        document.body.style.overscrollBehavior = 'none';
        document.body.style.touchAction = 'manipulation'; // Allow taps but prevent zoom
        document.body.style.height = '100vh';
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.overscrollBehavior = 'none';
        
        // Add passive event listeners to prevent blocking interactions
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

  // Function to prevent pull to refresh only at top
  const preventPullToRefresh = (e: TouchEvent) => {
    // Only prevent if user is at the very top and trying to pull down
    if (window.scrollY === 0 && e.touches[0] && e.touches[0].clientY > 50) {
      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      
      // Don't prevent if touching interactive elements
      if (element && (
        element.tagName === 'BUTTON' || 
        element.closest('button') ||
        element.closest('[role="button"]') ||
        element.closest('.clickable') ||
        element.closest('a')
      )) {
        return;
      }
      
      e.preventDefault();
    }
  };

  return <TelegramApp />;
}