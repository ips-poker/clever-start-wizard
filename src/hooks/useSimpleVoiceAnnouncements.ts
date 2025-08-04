import { useRef, useCallback } from 'react';

interface VoiceOptions {
  enabled: boolean;
  volume?: number;
}

export const useSimpleVoiceAnnouncements = (options: VoiceOptions = { enabled: true }) => {
  const lastAnnouncementRef = useRef<string>('');
  const timeoutRef = useRef<number | null>(null);

  const playAnnouncement = useCallback(async (text: string) => {
    console.log('🎙️ playAnnouncement called with:', { text, enabled: options.enabled });
    
    if (!options.enabled || !text) {
      console.log('🔇 Voice disabled or no text:', { enabled: options.enabled, text });
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
      console.log('🔊 Attempting to play announcement:', text);
      
      // Проверяем поддержку speechSynthesis
      if (!('speechSynthesis' in window)) {
        console.error('❌ Speech synthesis not supported in this browser');
        alert('Голосовые объявления не поддерживаются в этом браузере');
        return;
      }

      console.log('✅ speechSynthesis is available');
      console.log('🔍 speechSynthesis state:', {
        speaking: speechSynthesis.speaking,
        pending: speechSynthesis.pending,
        paused: speechSynthesis.paused
      });

      // Останавливаем предыдущую речь
      speechSynthesis.cancel();
      
      // Ждем немного после cancel
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ru-RU';
      utterance.volume = options.volume || 0.8;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      utterance.onstart = () => {
        console.log('✅ Speech started successfully');
      };
      
      utterance.onend = () => {
        console.log('✅ Speech ended successfully');
      };
      
      utterance.onerror = (e) => {
        console.error('❌ Speech error:', e);
        console.error('Error details:', {
          error: e.error,
          type: e.type
        });
      };

      // Проверяем доступные голоса
      const voices = speechSynthesis.getVoices();
      console.log('🗣️ Available voices:', voices.length);
      
      if (voices.length === 0) {
        console.log('⏳ No voices loaded yet, waiting...');
        speechSynthesis.onvoiceschanged = () => {
          console.log('🗣️ Voices loaded:', speechSynthesis.getVoices().length);
        };
      }

      console.log('🎤 Starting speech synthesis...');
      speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error('❌ Announcement failed:', error);
      alert(`Ошибка голосовых объявлений: ${error.message}`);
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