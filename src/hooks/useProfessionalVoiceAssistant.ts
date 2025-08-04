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

  // Обработка очереди объявлений
  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    setIsPlaying(true);

    // Сортировка по приоритету
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

    // Обработка следующего элемента в очереди
    if (queueRef.current.length > 0) {
      setTimeout(() => processQueue(), 500);
    }
  }, [settings]);

  // Непосредственное воспроизведение
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
        // Останавливаем предыдущую речь
        speechSynthesis.cancel();
        
        // Небольшая задержка после cancel для стабильности
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(text);
          
          // Настройки голоса
          utterance.lang = settings.language;
          utterance.volume = settings.volume;
          utterance.rate = 0.9;
          utterance.pitch = 1.0;

          // Выбор конкретного голоса если указан
          if (settings.voice) {
            const voices = speechSynthesis.getVoices();
            const selectedVoice = voices.find(v => v.name === settings.voice);
            if (selectedVoice) {
              utterance.voice = selectedVoice;
            }
          }

          utterance.onstart = () => {
            if (settings.debugMode) console.log('✅ Speech started:', text);
            setLastAnnouncement(text);
          };

          utterance.onend = () => {
            if (settings.debugMode) console.log('✅ Speech ended');
            resolve();
          };

          utterance.onerror = (e) => {
            console.error('❌ Speech error:', e);
            resolve();
          };

          if (settings.debugMode) {
            console.log('🔊 Playing announcement:', text);
          }

          speechSynthesis.speak(utterance);
        }, 100);

      } catch (error) {
        console.error('❌ Speech synthesis error:', error);
        resolve();
      }
    });
  }, [settings]);

  // ElevenLabs TTS
  const playWithElevenLabs = useCallback(async (text: string): Promise<void> => {
    try {
      const response = await fetch('/api/elevenlabs-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          voice_id: settings.elevenLabsVoiceId || 'pNInz6obpgDQGcFmaJgB' // Adam voice
        })
      });
      
      if (!response.ok) throw new Error('ElevenLabs API error');
      
      const audioData = await response.blob();
      const audio = new Audio(URL.createObjectURL(audioData));
      audio.volume = settings.volume;
      await audio.play();
    } catch (error) {
      console.error('ElevenLabs error, fallback to browser TTS:', error);
      // Fallback to browser TTS
      await playAnnouncementNow(text);
    }
  }, [settings, playAnnouncementNow]);

  // Добавление объявления в очередь
  const addToQueue = useCallback((text: string, priority: VoiceAnnouncementQueue['priority'] = 'medium') => {
    if (!settings.enabled || !text.trim()) return;

    // Предотвращение дублирования
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

    // Сброс дублирования через время
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      lastAnnouncementRef.current = '';
    }, 3000);

    // Запускаем обработку очереди
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

    if (timeLeft === 600) { // 10 минут
      addToQueue("До окончания уровня осталось 10 минут.", 'medium');
    } else if (timeLeft === 300) { // 5 минут
      if (nextLevel) {
        if (nextLevel.is_break) {
          addToQueue(`До перерыва осталось 5 минут. Следующий перерыв на ${Math.round(nextLevel.duration / 60)} минут.`, 'medium');
        } else {
          addToQueue(`До повышения блайндов осталось 5 минут. Следующий уровень: блайнды ${nextLevel.small_blind} - ${nextLevel.big_blind}${nextLevel.ante ? `, анте ${nextLevel.ante}` : ''}.`, 'medium');
        }
      } else {
        addToQueue("До окончания уровня осталось 5 минут.", 'medium');
      }
    } else if (timeLeft === 120) { // 2 минуты
      addToQueue("До окончания уровня осталось 2 минуты.", 'medium');
    } else if (timeLeft === 60) { // 1 минута
      addToQueue("До окончания уровня осталась 1 минута.", 'medium');
    } else if (timeLeft === 30) { // 30 секунд
      addToQueue("До окончания уровня осталось 30 секунд.", 'medium');
    } else if (timeLeft === 10) { // 10 секунд с деталями следующего уровня
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