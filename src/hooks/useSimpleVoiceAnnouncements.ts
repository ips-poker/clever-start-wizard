import { useRef, useCallback } from 'react';

interface VoiceOptions {
  enabled: boolean;
  volume?: number;
}

export const useSimpleVoiceAnnouncements = (options: VoiceOptions = { enabled: true }) => {
  const lastAnnouncementRef = useRef<string>('');
  const timeoutRef = useRef<number | null>(null);

  const playAnnouncement = useCallback(async (text: string) => {
    if (!options.enabled || !text) {
      console.log('🔇 Voice disabled or no text:', text);
      return;
    }

    // Предотвращаем дублирование
    if (lastAnnouncementRef.current === text) {
      console.log('🔇 Skipping duplicate:', text);
      return;
    }

    lastAnnouncementRef.current = text;
    
    // Сбрасываем через 3 секунды
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      lastAnnouncementRef.current = '';
    }, 3000);

    try {
      console.log('🔊 Playing announcement:', text);
      
      // Используем браузерную речь
      if ('speechSynthesis' in window) {
        // Останавливаем предыдущую речь
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.volume = options.volume || 0.8;
        utterance.rate = 0.9;
        utterance.pitch = 1;
        
        utterance.onstart = () => console.log('✅ Speech started');
        utterance.onend = () => console.log('✅ Speech ended');
        utterance.onerror = (e) => console.error('❌ Speech error:', e);
        
        speechSynthesis.speak(utterance);
      } else {
        console.error('❌ Speech synthesis not supported');
      }
    } catch (error) {
      console.error('❌ Announcement failed:', error);
    }
  }, [options.enabled, options.volume]);

  const announceCustomMessage = useCallback(async (message: string) => {
    console.log('📢 Custom message:', message);
    await playAnnouncement(message);
  }, [playAnnouncement]);

  const stopAnnouncement = useCallback(() => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    lastAnnouncementRef.current = '';
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    announceCustomMessage,
    stopAnnouncement,
    playAnnouncement
  };
};