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

      const { data, error } = await supabase.functions.invoke('voice-announcement', {
        body: {
          text,
          voice: options.voice || 'Aria'
        }
      });

      if (error) {
        console.error('❌ Voice announcement error:', error);
        return;
      }

      if (data?.audioContent) {
        // Create audio element and play
        const audio = new Audio();
        audio.volume = options.volume || 0.7;
        audio.src = `data:audio/mpeg;base64,${data.audioContent}`;
        
        // Store reference for potential cleanup
        audioRef.current = audio;
        
        await audio.play();
        console.log('✅ Voice announcement played successfully');
      }
    } catch (error) {
      console.error('❌ Failed to play voice announcement:', error);
    }
  }, [options.enabled, options.voice, options.volume]);

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