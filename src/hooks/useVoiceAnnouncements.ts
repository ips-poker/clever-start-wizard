import { useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BlindLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante?: number;
  duration: number;
  is_break: boolean;
}

interface VoiceAnnouncementOptions {
  enabled: boolean;
  voice?: string;
  volume?: number;
}

export const useVoiceAnnouncements = (options: VoiceAnnouncementOptions = { enabled: false }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastAnnouncementRef = useRef<number>(0);

  // Отключаем голосовые оповещения - используем только звуковые сигналы
  const playAnnouncement = useCallback(async (text: string) => {
    // Голосовые оповещения отключены - используем только звуковые сигналы
    console.log('🔇 Voice announcements disabled, text skipped:', text);
    return;
  }, []);

  const playBrowserSpeech = useCallback(async (text: string) => {
    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.volume = options.volume || 0.7;
        utterance.rate = 0.9;
        utterance.pitch = 1;
        
        speechSynthesis.speak(utterance);
        console.log('✅ Browser speech played successfully');
      }
    } catch (error) {
      console.error('❌ Browser speech also failed:', error);
    }
  }, [options.volume]);

  const announceNextLevel = useCallback(async (
    currentLevel: number,
    nextLevel: BlindLevel | null,
    currentTime: number
  ) => {
    // Голосовые оповещения отключены
    console.log('🔇 Voice announcement skipped for level transition');
    return;
  }, []);

  const announceCustomMessage = useCallback(async (message: string) => {
    // Голосовые оповещения отключены
    console.log('🔇 Custom message skipped:', message);
    return;
  }, []);

  const stopAnnouncement = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  return {
    announceNextLevel,
    announceCustomMessage,
    stopAnnouncement,
    playAnnouncement
  };
};