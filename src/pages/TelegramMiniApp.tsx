import { useEffect } from 'react';
import { TelegramApp } from '@/components/telegram/TelegramApp';
import { init, miniApp, viewport, themeParams } from '@telegram-apps/sdk-react';

export default function TelegramMiniApp() {
  useEffect(() => {
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
    const originalViewportContent = viewportMeta?.getAttribute('content');
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
    
    // Set dark theme by default
    document.documentElement.classList.add('dark');

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
      // Restore original viewport if needed
      if (viewportMeta && originalViewportContent) {
        viewportMeta.setAttribute('content', originalViewportContent);
      }
    };
  }, []);

  return (
    <div 
      className="telegram-mini-app-container"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        zIndex: 9999,
        backgroundColor: '#000',
        margin: 0,
        padding: 0,
        touchAction: 'pan-x pan-y',
      }}
    >
      <TelegramApp />
    </div>
  );
}