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

export const useVoiceAnnouncements = (options: VoiceAnnouncementOptions = { enabled: true }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastAnnouncementRef = useRef<number>(0);

  const playAnnouncement = useCallback(async (text: string) => {
    if (!options.enabled) return;

    try {
      console.log('🔊 Generating voice announcement:', text);

      // Попробуем сначала OpenAI TTS
      const { data, error } = await supabase.functions.invoke('voice-announcement', {
        body: {
          text,
          voice: 'alloy' // Используем OpenAI голос
        }
      });

      if (error) {
        console.error('❌ OpenAI TTS error, trying browser speech:', error);
        // Fallback на встроенную речь браузера
        await playBrowserSpeech(text);
        return;
      }

      if (data?.audioContent) {
        // Создаем аудио элемент и воспроизводим
        const audio = new Audio();
        audio.volume = options.volume || 0.7;
        audio.src = `data:audio/mpeg;base64,${data.audioContent}`;
        
        audioRef.current = audio;
        await audio.play();
        console.log('✅ OpenAI TTS played successfully');
      } else {
        // Fallback на встроенную речь
        await playBrowserSpeech(text);
      }
    } catch (error) {
      console.error('❌ Failed to play OpenAI TTS, trying browser speech:', error);
      // Fallback на встроенную речь браузера
      await playBrowserSpeech(text);
    }
  }, [options.enabled, options.voice, options.volume]);

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
    // Предотвращаем повторные оповещения для того же времени
    if (Math.abs(currentTime - lastAnnouncementRef.current) < 2) {
      return;
    }
    lastAnnouncementRef.current = currentTime;

    if (!nextLevel) {
      await playAnnouncement('Внимание! Через 10 секунд время уровня истекает');
      return;
    }

    let announcementText = '';

    if (nextLevel.is_break) {
      announcementText = `Внимание! Через 10 секунд начинается перерыв на ${Math.floor(nextLevel.duration / 60)} минут`;
    } else {
      announcementText = `Внимание! Через 10 секунд переход на уровень ${nextLevel.level}. `;
      announcementText += `Малый блайнд ${nextLevel.small_blind}, большой блайнд ${nextLevel.big_blind}`;
      
      if (nextLevel.ante && nextLevel.ante > 0) {
        announcementText += `, анте ${nextLevel.ante}`;
      }
    }

    await playAnnouncement(announcementText);
  }, [playAnnouncement]);

  const announceCustomMessage = useCallback(async (message: string) => {
    await playAnnouncement(message);
  }, [playAnnouncement]);

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