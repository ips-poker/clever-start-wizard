import { useEffect } from 'react';
import { TelegramApp } from '@/components/telegram/TelegramApp';
import { init, miniApp, viewport, themeParams } from '@telegram-apps/sdk-react';

export default function TelegramMiniApp() {
  useEffect(() => {
    // Add telegram-mini-app class to body for specific styling
    document.body.classList.add('telegram-mini-app');

    // Save previous inline styles to restore later
    const prevBodyStyle = {
      margin: document.body.style.margin,
      padding: document.body.style.padding,
      width: document.body.style.width,
      height: document.body.style.height,
      position: document.body.style.position,
      overflow: document.body.style.overflow,
      overscrollBehavior: (document.body.style as any).overscrollBehavior,
      overscrollBehaviorY: (document.body.style as any).overscrollBehaviorY,
      touchAction: document.body.style.touchAction,
      webkitUserSelect: (document.body.style as any).webkitUserSelect,
    };

    const rootElement = document.getElementById('root');
    const prevRootStyle = rootElement
      ? {
          width: rootElement.style.width,
          height: rootElement.style.height,
          position: rootElement.style.position,
          overflow: rootElement.style.overflow,
        }
      : null;
    
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
          textColor: themeParams.textColor(),
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
      viewportMeta.setAttribute(
        'content',
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
    (document.body.style as any).overscrollBehavior = 'none';
    document.body.style.touchAction = 'pan-x pan-y';
    (document.body.style as any).webkitUserSelect = 'none';
    
    // Prevent pull-to-refresh on mobile
    (document.body.style as any).overscrollBehaviorY = 'contain';
    
    // Set dark theme by default
    document.documentElement.classList.add('dark');
    
    // Prevent scrolling on the root element
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

      // Restore previous body styles
      document.body.style.margin = prevBodyStyle.margin;
      document.body.style.padding = prevBodyStyle.padding;
      document.body.style.width = prevBodyStyle.width;
      document.body.style.height = prevBodyStyle.height;
      document.body.style.position = prevBodyStyle.position;
      document.body.style.overflow = prevBodyStyle.overflow;
      if (prevBodyStyle.overscrollBehavior !== undefined) {
        (document.body.style as any).overscrollBehavior = prevBodyStyle.overscrollBehavior || '';
      }
      if (prevBodyStyle.overscrollBehaviorY !== undefined) {
        (document.body.style as any).overscrollBehaviorY = prevBodyStyle.overscrollBehaviorY || '';
      }
      document.body.style.touchAction = prevBodyStyle.touchAction;
      (document.body.style as any).webkitUserSelect = prevBodyStyle.webkitUserSelect;

      // Restore root element styles
      if (rootElement && prevRootStyle) {
        rootElement.style.width = prevRootStyle.width;
        rootElement.style.height = prevRootStyle.height;
        rootElement.style.position = prevRootStyle.position;
        rootElement.style.overflow = prevRootStyle.overflow;
      }
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