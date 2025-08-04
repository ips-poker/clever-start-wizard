import React, { useRef, useCallback, useState, useEffect } from 'react';

export interface VoiceSettings {
  enabled: boolean;
  volume: number;
  language: string;
  voice: string | null;
  autoAnnouncements: boolean;
  debugMode: boolean;
  useElevenLabs: boolean;
  elevenLabsVoiceId: string;
}

export interface BlindLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration: number;
  is_break?: boolean;
}

interface VoiceAnnouncementQueue {
  id: string;
  text: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

export const useProfessionalVoiceAssistant = (settings: VoiceSettings) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const [lastAnnouncement, setLastAnnouncement] = useState('');
  
  const lastAnnouncementRef = useRef<string>('');
  const timeoutRef = useRef<number | null>(null);
  const queueRef = useRef<VoiceAnnouncementQueue[]>([]);
  const processingRef = useRef(false);
  const voicesLoadedRef = useRef(false);

  // Непосредственное воспроизведение браузерным TTS (улучшенная версия)
  const playAnnouncementNow = useCallback(async (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!settings.enabled || !text) {
        if (settings.debugMode) console.log('🔇 Voice disabled or no text');
        resolve();
        return;
      }

      if (!('speechSynthesis' in window)) {
        console.error('❌ Speech synthesis not supported');
        resolve();
        return;
      }

      try {
        speechSynthesis.cancel();
        
        // Увеличиваем задержку для надежности
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(text);
          
          // Проверяем доступные голоса
          const voices = speechSynthesis.getVoices();
          const russianVoices = voices.filter(v => v.lang.includes('ru'));
          
          if (russianVoices.length > 0) {
            utterance.voice = russianVoices[0];
          }
          
          utterance.lang = 'ru-RU';
          utterance.volume = settings.volume;
          utterance.rate = 0.85; // Немного медленнее для лучшего понимания
          utterance.pitch = 1.0;

          utterance.onstart = () => {
            if (settings.debugMode) console.log('✅ Speech started:', text);
            setLastAnnouncement(text);
          };

          utterance.onend = () => {
            if (settings.debugMode) console.log('✅ Speech ended successfully');
            resolve();
          };

          utterance.onerror = (e) => {
            console.warn('⚠️ Speech error, trying again:', e);
            // Пробуем еще раз без настроек голоса
            const simpleUtterance = new SpeechSynthesisUtterance(text);
            simpleUtterance.lang = 'ru-RU';
            simpleUtterance.volume = settings.volume;
            simpleUtterance.onend = () => resolve();
            simpleUtterance.onerror = () => resolve(); // Не блокируем выполнение
            speechSynthesis.speak(simpleUtterance);
          };

          if (settings.debugMode) {
            console.log('🔊 Playing announcement:', text);
            console.log('Available voices:', voices.length);
          }

          speechSynthesis.speak(utterance);
        }, 200);

      } catch (error) {
        console.error('❌ Speech synthesis error:', error);
        resolve();
      }
    });
  }, [settings]);

  // ElevenLabs TTS (временно отключаем)
  const playWithElevenLabs = useCallback(async (text: string): Promise<void> => {
    // Пока ElevenLabs не работает, используем браузерный TTS
    console.log('⚠️ ElevenLabs temporarily disabled, using browser TTS');
    await playAnnouncementNow(text);
  }, [playAnnouncementNow]);

  // Обработка очереди объявлений
  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    setIsPlaying(true);

    queueRef.current.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const announcement = queueRef.current.shift();
    if (announcement) {
      setQueueLength(queueRef.current.length);
      await (settings.useElevenLabs ? playWithElevenLabs(announcement.text) : playAnnouncementNow(announcement.text));
    }

    processingRef.current = false;
    setIsPlaying(false);

    if (queueRef.current.length > 0) {
      setTimeout(() => processQueue(), 500);
    }
  }, [settings, playWithElevenLabs, playAnnouncementNow]);

  // Инициализация голосов
  const initializeVoices = useCallback(() => {
    if ('speechSynthesis' in window) {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0 && !voicesLoadedRef.current) {
        voicesLoadedRef.current = true;
        if (settings.debugMode) {
          console.log('🗣️ Loaded voices:', voices.map(v => `${v.name} (${v.lang})`));
        }
      } else if (voices.length === 0) {
        speechSynthesis.onvoiceschanged = () => {
          voicesLoadedRef.current = true;
          if (settings.debugMode) {
            console.log('🗣️ Voices loaded on change:', speechSynthesis.getVoices().length);
          }
        };
      }
    }
  }, [settings.debugMode]);

  // Добавление объявления в очередь
  const addToQueue = useCallback((text: string, priority: VoiceAnnouncementQueue['priority'] = 'medium') => {
    if (!settings.enabled || !text.trim()) return;

    if (lastAnnouncementRef.current === text) {
      if (settings.debugMode) console.log('🔇 Skipping duplicate:', text);
      return;
    }

    const announcement: VoiceAnnouncementQueue = {
      id: Date.now().toString(),
      text: text.trim(),
      priority,
      timestamp: Date.now()
    };

    queueRef.current.push(announcement);
    setQueueLength(queueRef.current.length);
    lastAnnouncementRef.current = text;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      lastAnnouncementRef.current = '';
    }, 3000);

    processQueue();
  }, [settings.enabled, settings.debugMode, processQueue]);

  // Очистка очереди
  const clearQueue = useCallback(() => {
    queueRef.current = [];
    setQueueLength(0);
    processingRef.current = false;
    setIsPlaying(false);
    speechSynthesis.cancel();
  }, []);

  // Остановка всех объявлений
  const stopAll = useCallback(() => {
    clearQueue();
    lastAnnouncementRef.current = '';
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [clearQueue]);

  // Специфичные методы для турнирного директора
  const announceNewLevel = useCallback((level: BlindLevel, isAutomatic = false) => {
    if (!settings.autoAnnouncements && isAutomatic) return;

    const prefix = isAutomatic ? "Автоматический переход." : "";
    
    if (level.is_break) {
      const message = `${prefix} Начинается перерыв на ${Math.round(level.duration / 60)} минут. Игроки могут отдохнуть и размяться.`;
      addToQueue(message, 'high');
    } else {
      const message = `${prefix} Начинается уровень ${level.level}. Малый блайнд ${level.small_blind}, большой блайнд ${level.big_blind}${level.ante ? `, анте ${level.ante}` : ''}. Продолжительность уровня ${Math.round(level.duration / 60)} минут.`;
      addToQueue(message, 'high');
    }
  }, [addToQueue, settings.autoAnnouncements]);

  const announceTimeWarning = useCallback((timeLeft: number, nextLevel?: BlindLevel) => {
    if (!settings.autoAnnouncements) return;

    if (timeLeft === 600) {
      addToQueue("До окончания уровня осталось 10 минут.", 'medium');
    } else if (timeLeft === 300) {
      if (nextLevel) {
        if (nextLevel.is_break) {
          addToQueue(`До перерыва осталось 5 минут. Следующий перерыв на ${Math.round(nextLevel.duration / 60)} минут.`, 'medium');
        } else {
          addToQueue(`До повышения блайндов осталось 5 минут. Следующий уровень: блайнды ${nextLevel.small_blind} - ${nextLevel.big_blind}${nextLevel.ante ? `, анте ${nextLevel.ante}` : ''}.`, 'medium');
        }
      } else {
        addToQueue("До окончания уровня осталось 5 минут.", 'medium');
      }
    } else if (timeLeft === 120) {
      addToQueue("До окончания уровня осталось 2 минуты.", 'medium');
    } else if (timeLeft === 60) {
      addToQueue("До окончания уровня осталась 1 минута.", 'medium');
    } else if (timeLeft === 30) {
      addToQueue("До окончания уровня осталось 30 секунд.", 'medium');
    } else if (timeLeft === 10) {
      if (nextLevel) {
        if (nextLevel.is_break) {
          addToQueue(`Со следующей раздачи начинается перерыв на ${Math.round(nextLevel.duration / 60)} минут.`, 'high');
        } else {
          addToQueue(`Со следующей раздачи блайнды ап! Уровень ${nextLevel.level}: малый блайнд ${nextLevel.small_blind}, большой блайнд ${nextLevel.big_blind}${nextLevel.ante ? `, анте ${nextLevel.ante}` : ''}.`, 'high');
        }
      } else {
        addToQueue("Внимание! Через 10 секунд уровень завершается.", 'high');
      }
    }
  }, [addToQueue, settings.autoAnnouncements]);

  const announcePlayerAction = useCallback((action: string, playerName?: string) => {
    const messages = {
      'player_eliminated': playerName ? `Игрок ${playerName} покидает турнир.` : 'Игрок покидает турнир.',
      'break_over': 'Перерыв окончен. Игроки, займите свои места за столами.',
      'seats_please': 'Игроки, займите свои места за столами.',
      'shuffle_up_deal': 'Перетасовка и раздача! Турнир начинается.',
      'level_complete': 'Уровень завершен.',
      'tournament_started': 'Турнир официально начался. Желаем всем удачи!',
      'tournament_paused': 'Турнир приостановлен.',
      'tournament_resumed': 'Турнир возобновлен.',
      'final_table': 'Собирается финальный стол!',
      'heads_up': 'Начинается игра один на один!'
    };

    const message = messages[action as keyof typeof messages];
    if (message) {
      addToQueue(message, action.includes('tournament') ? 'high' : 'medium');
    }
  }, [addToQueue]);

  const announceCustomMessage = useCallback((message: string, priority: VoiceAnnouncementQueue['priority'] = 'medium') => {
    addToQueue(message, priority);
  }, [addToQueue]);

  const testVoice = useCallback(() => {
    addToQueue("Тестовое голосовое объявление профессиональной системы турнирного директора. Все системы работают корректно.", 'high');
  }, [addToQueue]);

  // Инициализация при монтировании
  useEffect(() => {
    initializeVoices();
  }, [initializeVoices]);

  return {
    // Состояние
    isPlaying,
    queueLength,
    lastAnnouncement,
    
    // Основные методы
    announceCustomMessage,
    testVoice,
    stopAll,
    clearQueue,
    
    // Специализированные методы турнирного директора
    announceNewLevel,
    announceTimeWarning,
    announcePlayerAction,
    
    // Утилиты
    addToQueue,
    playAnnouncementNow
  };
};