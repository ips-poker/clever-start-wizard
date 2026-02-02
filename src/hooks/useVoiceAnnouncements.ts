import { useRef, useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVoiceSettings } from './useVoiceSettings';

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
  const { settings } = useVoiceSettings();
  const [customIntervals, setCustomIntervals] = useState<Array<{seconds: number, message: string}>>([]);

  // Load custom time intervals
  useEffect(() => {
    const loadCustomIntervals = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('voice_time_intervals')
          .select('seconds, message')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (data) {
          console.log('🔄 Loaded custom intervals:', data);
          setCustomIntervals(data);
        }
      } catch (error) {
        console.error('Error loading custom intervals:', error);
      }
    };

    loadCustomIntervals();

    // Подписка на изменения в таблице пользовательских интервалов
    const subscription = supabase
      .channel('voice_time_intervals_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'voice_time_intervals' },
        (payload) => {
          console.log('🔄 Voice time intervals changed:', payload);
          loadCustomIntervals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const playAnnouncement = useCallback(async (text: string) => {
    console.log('🎯 playAnnouncement called with text:', text);
    console.log('🎯 Options enabled:', options.enabled, 'Voice enabled:', settings.voice_enabled);
    
    if (!options.enabled || !settings.voice_enabled) {
      console.log('🚫 Announcement blocked - options.enabled:', options.enabled, 'settings.voice_enabled:', settings.voice_enabled);
      return;
    }

    try {
      console.log('🔊 Generating voice announcement:', text);
      console.log('Voice settings:', { 
        provider: settings.voice_provider, 
        voice: settings.elevenlabs_voice,
        enabled: settings.voice_enabled 
      });

      const useElevenLabs = settings.voice_provider === 'elevenlabs';

      if (useElevenLabs) {
        // Используем ElevenLabs TTS
        const { data, error } = await supabase.functions.invoke('voice-announcement', {
          body: {
            text,
            voice: settings.elevenlabs_voice,
            volume: settings.volume_level / 100,
            language: settings.voice_language
          }
        });

        if (error) {
          console.error('❌ ElevenLabs TTS error:', error);
          // Fallback на встроенную речь браузера только если включено
          if (settings.browser_tts_fallback !== false) {
            console.log('🔄 Trying browser speech fallback...');
            await playBrowserSpeech(text);
          } else {
            console.log('🚫 Browser TTS fallback is disabled');
          }
          return;
        }

        if (data?.audioContent) {
          // Создаем аудио элемент и воспроизводим
          const audio = new Audio();
          audio.volume = settings.volume_level / 100;
          
          // Безопасное создание blob из base64
          try {
            // Проверяем корректность base64
            if (!data.audioContent || typeof data.audioContent !== 'string') {
              throw new Error('Invalid audio content format');
            }
            
            // Простая проверка валидности base64
            if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data.audioContent)) {
              throw new Error('Invalid base64 format');
            }
            
            const binaryString = atob(data.audioContent);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(blob);
            
            audio.src = audioUrl;
            audioRef.current = audio;
            
            // Очистка URL после проигрывания
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
            };
            
            await audio.play();
            console.log('✅ ElevenLabs TTS played successfully');
          } catch (base64Error) {
            console.error('❌ Base64 decode error:', base64Error);
            throw new Error('Failed to decode audio content');
          }
        } else {
          // Fallback на встроенную речь только если включено
          if (settings.browser_tts_fallback !== false) {
            await playBrowserSpeech(text);
          }
        }
      } else {
        // Используем системный голос
        await playBrowserSpeech(text);
      }
    } catch (error) {
      console.error('❌ Failed to play voice announcement:', error);
      // Fallback на встроенную речь браузера только если включено
      if (settings.browser_tts_fallback !== false) {
        console.log('🔄 Trying browser speech fallback after error...');
        await playBrowserSpeech(text);
      }
    }
  }, [options.enabled, settings]);

  const playBrowserSpeech = useCallback(async (text: string) => {
    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = settings.voice_language === 'en' ? 'en-US' : 'ru-RU';
        utterance.volume = settings.volume_level / 100;
        utterance.rate = settings.voice_speed;
        utterance.pitch = 1;
        
        speechSynthesis.speak(utterance);
        console.log('✅ Browser speech played successfully');
      }
    } catch (error) {
      console.error('❌ Browser speech also failed:', error);
    }
  }, [settings]);

  // Объявления для таймера турнира с поддержкой пользовательских интервалов
  const announceTimeWarning = useCallback(async (timeInSeconds: number) => {
    console.log('🕒 announceTimeWarning called with:', timeInSeconds, 'seconds');
    console.log('🔧 Voice settings check:', { 
      enabled: settings.voice_enabled, 
      provider: settings.voice_provider,
      optionsEnabled: options.enabled,
      warningIntervals: settings.warning_intervals
    });
    
    // Проверяем настройки голоса
    if (!options.enabled || !settings.voice_enabled) {
      console.log('🚫 Voice announcements disabled');
      return;
    }
    
    // Проверяем конкретные интервалы предупреждений
    const warningIntervals = settings.warning_intervals as any || {};
    
    if (timeInSeconds === 300 && !warningIntervals.five_minutes) {
      console.log('🚫 5-minute warning disabled');
      return;
    }
    if (timeInSeconds === 120 && !warningIntervals.two_minutes) {
      console.log('🚫 2-minute warning disabled');
      return;
    }
    if (timeInSeconds === 60 && !warningIntervals.one_minute) {
      console.log('🚫 1-minute warning disabled');
      return;
    }
    if (timeInSeconds === 30 && !warningIntervals.thirty_seconds) {
      console.log('🚫 30-second warning disabled');
      return;
    }
    if (timeInSeconds === 10 && !warningIntervals.ten_seconds) {
      console.log('🚫 10-second warning disabled');
      return;
    }
    
    // Проверяем пользовательские интервалы
    const customInterval = customIntervals.find(interval => interval.seconds === timeInSeconds);
    if (customInterval) {
      console.log('📝 Using custom interval:', customInterval);
      await playAnnouncement(customInterval.message);
      return;
    }

    // Стандартные интервалы с правильными склонениями
    const minutes = Math.floor(timeInSeconds / 60);
    let message = '';
    if (timeInSeconds === 300) {
      message = 'Внимание! До окончания уровня осталось пять минут.';
    } else if (timeInSeconds === 120) {
      message = 'Внимание! До окончания уровня остались две минуты. Скоро блайнд ап!';
    } else if (timeInSeconds === 60) {
      message = 'Внимание! До окончания уровня осталась одна минута. Готовьтесь к повышению блайндов!';
    } else if (timeInSeconds === 30) {
      message = 'Внимание! До окончания уровня осталось тридцать секунд!';
    } else if (timeInSeconds === 10) {
      message = 'Внимание! До окончания уровня осталось десять секунд!';
    } else if (minutes > 0) {
      // Правильное склонение для русского языка
      let timeWord = '';
      if (minutes === 1) {
        timeWord = 'одна минута';
      } else if (minutes === 2) {
        timeWord = 'две минуты';
      } else if (minutes === 3) {
        timeWord = 'три минуты';
      } else if (minutes === 4) {
        timeWord = 'четыре минуты';
      } else if (minutes >= 5 && minutes <= 20) {
        timeWord = `${minutes} минут`;
      } else {
        const lastDigit = minutes % 10;
        if (lastDigit === 1 && minutes !== 11) {
          timeWord = `${minutes} минута`;
        } else if ([2, 3, 4].includes(lastDigit) && ![12, 13, 14].includes(minutes)) {
          timeWord = `${minutes} минуты`;
        } else {
          timeWord = `${minutes} минут`;
        }
      }
      message = `Внимание! До окончания уровня осталось ${timeWord}.`;
    } else {
      // Правильное склонение для секунд
      let timeWord = '';
      if (timeInSeconds === 1) {
        timeWord = 'одна секунда';
      } else if (timeInSeconds === 2) {
        timeWord = 'две секунды';
      } else if (timeInSeconds === 3) {
        timeWord = 'три секунды';
      } else if (timeInSeconds === 4) {
        timeWord = 'четыре секунды';
      } else if (timeInSeconds >= 5 && timeInSeconds <= 20) {
        timeWord = `${timeInSeconds} секунд`;
      } else {
        const lastDigit = timeInSeconds % 10;
        if (lastDigit === 1 && timeInSeconds !== 11) {
          timeWord = `${timeInSeconds} секунда`;
        } else if ([2, 3, 4].includes(lastDigit) && ![12, 13, 14].includes(timeInSeconds)) {
          timeWord = `${timeInSeconds} секунды`;
        } else {
          timeWord = `${timeInSeconds} секунд`;
        }
      }
      message = `Внимание! До окончания уровня осталось ${timeWord}.`;
    }
    
    console.log('📢 Final message to announce:', message);
    await playAnnouncement(message);
  }, [playAnnouncement, customIntervals, settings, options]);

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

  const announceLevelStart = useCallback(async (level: BlindLevel) => {
    let announcementText = '';
    
    if (level.is_break) {
      announcementText = `Начинается перерыв на ${Math.floor(level.duration / 60)} минут. Участники могут отдохнуть.`;
    } else {
      announcementText = `Новый уровень ${level.level}! `;
      announcementText += `Малый блайнд ${level.small_blind}, большой блайнд ${level.big_blind}`;
      
      if (level.ante && level.ante > 0) {
        announcementText += `, анте ${level.ante}`;
      }
      
      announcementText += '. Блайнды повышены, удачи игрокам!';
    }

    await playAnnouncement(announcementText);
  }, [playAnnouncement]);

  const announceTournamentStatus = useCallback(async (status: string) => {
    let message = '';
    
    switch (status) {
      case 'running':
        message = 'Турнир запущен. Игра началась!';
        break;
      case 'paused':
        message = 'Турнир приостановлен. Участники, сохраните свои позиции.';
        break;
      case 'completed':
        message = 'Турнир завершен. Поздравляем победителей!';
        break;
      default:
        return;
    }
    
    await playAnnouncement(message);
  }, [playAnnouncement]);

  const announceCustomMessage = useCallback(async (message: string) => {
    await playAnnouncement(message);
  }, [playAnnouncement]);

  const announceBlindIncrease = useCallback(async (currentLevel: BlindLevel, nextLevel: BlindLevel) => {
    const blindIncreaseMessage = `Внимание! Блайнды повышаются с уровня ${currentLevel.level} на уровень ${nextLevel.level}. ` +
      `Новые блайнды: малый ${nextLevel.small_blind}, большой ${nextLevel.big_blind}` +
      (nextLevel.ante && nextLevel.ante > 0 ? `, анте ${nextLevel.ante}` : '') + 
      '. Приспосабливайтесь к новым условиям игры!';
    
    await playAnnouncement(blindIncreaseMessage);
  }, [playAnnouncement]);

  const announcePlayerElimination = useCallback(async (playerName: string, position: number) => {
    const message = `Игрок ${playerName} покидает турнир на ${position} месте. Спасибо за участие!`;
    await playAnnouncement(message);
  }, [playAnnouncement]);

  const announceBreakStart = useCallback(async (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const message = `Внимание! Начинается перерыв на ${minutes} минут. Игроки могут отдохнуть и восстановить силы.`;
    await playAnnouncement(message);
  }, [playAnnouncement]);

  const announceBreakEnd = useCallback(async () => {
    const message = 'Перерыв окончен! Игроки, займите свои места. Игра возобновляется!';
    await playAnnouncement(message);
  }, [playAnnouncement]);

  const announceChipCount = useCallback(async (totalChips: number, averageStack: number) => {
    const message = `Статистика турнира: общий банк фишек ${totalChips.toLocaleString()}, средний стек ${Math.round(averageStack).toLocaleString()} фишек.`;
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
    announceLevelStart,
    announceTimeWarning,
    announceCustomMessage,
    announceBlindIncrease,
    announcePlayerElimination,
    announceBreakStart,
    announceBreakEnd,
    announceChipCount,
    announceTournamentStatus,
    stopAnnouncement,
    playAnnouncement
  };
};