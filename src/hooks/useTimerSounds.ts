import { useRef, useCallback, useState } from 'react';

export type SoundType = 'beep' | 'bell' | 'chime' | 'alert' | 'digital';

interface TimerSoundsOptions {
  enabled: boolean;
  soundType: SoundType;
  volume: number;
}

export const useTimerSounds = (options: TimerSoundsOptions = { 
  enabled: true, 
  soundType: 'beep', 
  volume: 0.5 
}) => {
  const [soundsEnabled, setSoundsEnabled] = useState(options.enabled);
  const [currentSoundType, setCurrentSoundType] = useState<SoundType>(options.soundType);
  const [volume, setVolume] = useState(options.volume);

  const audioContextRef = useRef<AudioContext | null>(null);

  // Инициализация AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Генерация звуковых эффектов
  const playSound = useCallback(async (soundType: SoundType, duration: number = 200) => {
    if (!soundsEnabled) return;

    try {
      const audioContext = getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Настройки для разных типов звуков
      switch (soundType) {
        case 'beep':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          break;
        case 'bell':
          oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
          oscillator.type = 'sine';
          break;
        case 'chime':
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(900, audioContext.currentTime + 0.1);
          break;
        case 'alert':
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
          oscillator.type = 'square';
          break;
        case 'digital':
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
          oscillator.type = 'sawtooth';
          break;
      }

      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);

    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, [soundsEnabled, volume, getAudioContext]);

  // Специальные звуки для разных оповещений
  const playWarningSound = useCallback(async (timeRemaining: number) => {
    if (timeRemaining === 300) { // 5 минут
      await playSound(currentSoundType, 500);
    } else if (timeRemaining === 60) { // 1 минута
      await playSound(currentSoundType, 300);
      setTimeout(() => playSound(currentSoundType, 300), 400);
    } else if (timeRemaining === 10) { // 10 секунд
      await playSound(currentSoundType, 200);
      setTimeout(() => playSound(currentSoundType, 200), 300);
      setTimeout(() => playSound(currentSoundType, 200), 600);
    } else if (timeRemaining <= 5 && timeRemaining > 0) { // Последние 5 секунд
      await playSound('alert', 150);
    }
  }, [currentSoundType, playSound]);

  // Воспроизведение серии быстрых сигналов
  const playFinalCountdown = useCallback(async () => {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => playSound('alert', 100), i * 200);
    }
  }, [playSound]);

  return {
    soundsEnabled,
    setSoundsEnabled,
    currentSoundType,
    setCurrentSoundType,
    volume,
    setVolume,
    playSound,
    playWarningSound,
    playFinalCountdown
  };
};