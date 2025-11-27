import { useEffect } from 'react';
import { TelegramApp } from '@/components/telegram/TelegramApp';
import { init, miniApp, viewport, themeParams } from '@telegram-apps/sdk-react';

export default function TelegramMiniApp() {
  useEffect(() => {
    // Add telegram-mini-app class to body for specific styling
    document.body.classList.add('telegram-mini-app');
    
    // Initialize Telegram SDK
    try {
      init();
      console.log('Telegram SDK initialized successfully');

      // Mount the mini app
      miniApp.mount();
      
      // Mount and expand viewport to fullscreen
      viewport.mount();
      viewport.expand();
      
      // Enable stable viewport height for better fullscreen experience
      if (viewport.isExpanded()) {
        console.log('Viewport expanded successfully');
        // Request stable height to prevent jumps when keyboard appears
        try {
          viewport.requestFullscreen?.();
        } catch (e) {
          console.log('Fullscreen API not available:', e);
        }
      }
      
      // Set header and background colors to match app theme
      miniApp.setHeaderColor('#000000');
      miniApp.setBackgroundColor('#000000');
      
      // Get theme params for better integration
      try {
        themeParams.mount();
        console.log('Theme params:', {
          bgColor: themeParams.backgroundColor(),
          textColor: themeParams.textColor()
        });
      } catch (e) {
        console.log('Theme params not available');
      }
      
      // Notify Telegram that the app is ready
      miniApp.ready();
      
      console.log('Mini app configured for fullscreen launch');
    } catch (error) {
      console.error('Failed to initialize Telegram SDK:', error);
    }

    // Enhanced viewport setup for fullscreen
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }

    // Add safe area CSS variables for iOS notch support
    const root = document.documentElement;
    root.style.setProperty('--sat', 'env(safe-area-inset-top)');
    root.style.setProperty('--sar', 'env(safe-area-inset-right)');
    root.style.setProperty('--sab', 'env(safe-area-inset-bottom)');
    root.style.setProperty('--sal', 'env(safe-area-inset-left)');

    // Fullscreen body styles
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.width = '100vw';
    document.body.style.height = '100vh';
    document.body.style.position = 'fixed';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.touchAction = 'pan-x pan-y';
    document.body.style.webkitUserSelect = 'none';
    
    // Prevent pull-to-refresh on mobile
    document.body.style.overscrollBehaviorY = 'contain';
    
    // Set dark theme by default
    document.documentElement.classList.add('dark');
    
    // Prevent scrolling on the root element
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.style.width = '100%';
      rootElement.style.height = '100vh';
      rootElement.style.position = 'fixed';
      rootElement.style.overflow = 'hidden';
    }

    // Listen for viewport changes
    const handleResize = () => {
      // Update viewport height to account for any UI changes
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.classList.remove('telegram-mini-app');
    };
  }, []);

  return (
    <div style={{ 
      width: '100%', 
      height: 'calc(var(--vh, 1vh) * 100)',
      position: 'fixed',
      top: 0,
      left: 0,
      overflow: 'hidden'
    }}>
      <TelegramApp />
    </div>
  );
}