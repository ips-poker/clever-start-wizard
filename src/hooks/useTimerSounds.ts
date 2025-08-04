import { useRef, useCallback, useState } from 'react';

interface SoundOption {
  id: string;
  name: string;
  frequency: number;
  duration: number;
}

export const SOUND_OPTIONS: SoundOption[] = [
  { id: 'beep', name: 'Простой сигнал', frequency: 800, duration: 200 },
  { id: 'bell', name: 'Колокольчик', frequency: 1000, duration: 300 },
  { id: 'chime', name: 'Звон', frequency: 600, duration: 400 }
];

interface TimerSoundsOptions {
  enabled: boolean;
  selectedSound: string;
  volume: number;
}

export const useTimerSounds = (options: TimerSoundsOptions = { 
  enabled: true, 
  selectedSound: 'beep',
  volume: 0.7 
}) => {
  const lastPlayedRef = useRef<number>(0);

  const createBeep = useCallback((frequency: number = 800, duration: number = 200) => {
    if (!options.enabled) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(options.volume * 0.3, audioContext.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration / 1000);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }, [options.enabled, options.volume]);

  const playSound = useCallback((count: number = 1) => {
    if (!options.enabled) return;

    // Предотвращаем повторное воспроизведение
    const now = Date.now();
    if (now - lastPlayedRef.current < 100) return;
    lastPlayedRef.current = now;

    const selectedSoundOption = SOUND_OPTIONS.find(s => s.id === options.selectedSound) || SOUND_OPTIONS[0];

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        createBeep(selectedSoundOption.frequency, selectedSoundOption.duration);
      }, i * 250); // Интервал между сигналами
    }
  }, [options.enabled, options.selectedSound, createBeep]);

  const playTimerAlert = useCallback((timeRemaining: number) => {
    if (!options.enabled) return;

    if (timeRemaining === 120) {
      // 2 минуты - 1 длинный сигнал
      console.log('🔊 2 minutes remaining - playing 1 beep');
      playSound(1);
    } else if (timeRemaining === 60) {
      // 1 минута - 2 сигнала
      console.log('🔊 1 minute remaining - playing 2 beeps');
      playSound(2);
    } else if (timeRemaining <= 5 && timeRemaining > 0) {
      // 5 секунд - 5 коротких сигналов
      console.log(`🔊 ${timeRemaining} seconds remaining - playing 5 beeps`);
      playSound(5);
    }
  }, [playSound, options.enabled]);

  const stopSound = useCallback(() => {
    // Для Web Audio API нет необходимости в explicit stop, звуки короткие
  }, []);

  return {
    playSound,
    playTimerAlert,
    stopSound,
    soundOptions: SOUND_OPTIONS
  };
};