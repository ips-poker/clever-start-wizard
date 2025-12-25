import { useCallback, useRef, useEffect } from 'react';

// =====================================================
// POKER SOUND SYSTEM - FULL IMPLEMENTATION
// =====================================================

interface SoundConfig {
  src: string;
  volume: number;
  playbackRate?: number;
}

const SOUNDS: Record<string, SoundConfig> = {
  deal: { src: '/sounds/card-deal.mp3', volume: 0.35, playbackRate: 1.3 },
  cardFlip: { src: '/sounds/card-flip.mp3', volume: 0.4 },
  shuffle: { src: '/sounds/card-shuffle.mp3', volume: 0.3 },
  check: { src: '/sounds/check.mp3', volume: 0.5 },
  fold: { src: '/sounds/fold.mp3', volume: 0.4 },
  chip: { src: '/sounds/chip-bet.mp3', volume: 0.5 },
  allIn: { src: '/sounds/chip-allin.mp3', volume: 0.6 },
  win: { src: '/sounds/chip-win.mp3', volume: 0.5 },
};

export function usePokerSounds() {
  const enabledRef = useRef(true);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);

  // Preload all sounds
  useEffect(() => {
    Object.entries(SOUNDS).forEach(([key, config]) => {
      const audio = new Audio(config.src);
      audio.volume = config.volume;
      audio.preload = 'auto';
      audioCache.current.set(key, audio);
    });

    return () => {
      audioCache.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioCache.current.clear();
    };
  }, []);

  // Play sound utility
  const playSound = useCallback((key: string, options?: { volume?: number; playbackRate?: number }) => {
    if (!enabledRef.current) return;

    try {
      const cached = audioCache.current.get(key);
      if (cached) {
        const sound = cached.cloneNode() as HTMLAudioElement;
        const config = SOUNDS[key];
        sound.volume = options?.volume ?? config.volume;
        sound.playbackRate = options?.playbackRate ?? config.playbackRate ?? 1;
        sound.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, []);

  // Generate beep using Web Audio API for timer warnings
  const playBeep = useCallback((frequency: number, duration: number, volume: number = 0.3) => {
    if (!enabledRef.current) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Web Audio not available:', e);
    }
  }, []);

  // Card sounds
  const playDeal = useCallback(() => playSound('deal'), [playSound]);
  const playCardFlip = useCallback(() => playSound('cardFlip'), [playSound]);
  const playShuffle = useCallback(() => playSound('shuffle'), [playSound]);

  // Action sounds
  const playFold = useCallback(() => playSound('fold'), [playSound]);
  const playCheck = useCallback(() => playSound('check'), [playSound]);
  const playCall = useCallback(() => playSound('chip'), [playSound]);
  const playBet = useCallback(() => playSound('chip'), [playSound]);
  const playRaise = useCallback(() => playSound('chip', { volume: 0.55 }), [playSound]);
  const playAllIn = useCallback(() => playSound('allIn'), [playSound]);

  // Win/Lose sounds
  const playWin = useCallback(() => playSound('win'), [playSound]);
  const playPotWin = useCallback(() => playSound('win', { volume: 0.6 }), [playSound]);
  const playLose = useCallback(() => {}, []); // Silent - no negative feedback

  // Chip sounds
  const playChipSingle = useCallback(() => playSound('chip', { volume: 0.3 }), [playSound]);
  const playChipStack = useCallback(() => playSound('chip', { volume: 0.5 }), [playSound]);
  const playChipSlide = useCallback(() => playSound('chip', { volume: 0.4 }), [playSound]);

  // Timer sounds
  const playTimerTick = useCallback(() => playBeep(800, 0.1, 0.15), [playBeep]);
  const playTimerWarning = useCallback(() => playBeep(600, 0.15, 0.25), [playBeep]);
  const playTimerCritical = useCallback(() => playBeep(400, 0.2, 0.35), [playBeep]);
  const playTimerExpired = useCallback(() => playBeep(300, 0.3, 0.4), [playBeep]);

  // Start timer warning beeps
  const startTimerWarning = useCallback((secondsRemaining: number) => {
    stopTimerWarning();
    
    if (secondsRemaining <= 10 && secondsRemaining > 5) {
      timerIntervalRef.current = setInterval(() => {
        playTimerWarning();
      }, 1000);
    } else if (secondsRemaining <= 5) {
      timerIntervalRef.current = setInterval(() => {
        playTimerCritical();
      }, 500);
    }
  }, [playTimerWarning, playTimerCritical]);

  const stopTimerWarning = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // UI sounds
  const playTurn = useCallback(() => playBeep(1000, 0.1, 0.2), [playBeep]);
  const playMyTurn = useCallback(() => {
    playBeep(800, 0.1, 0.3);
    setTimeout(() => playBeep(1000, 0.15, 0.3), 150);
  }, [playBeep]);
  const playChat = useCallback(() => playBeep(600, 0.05, 0.1), [playBeep]);
  const playNotification = useCallback(() => playBeep(900, 0.15, 0.25), [playBeep]);
  const playButtonClick = useCallback(() => playBeep(700, 0.05, 0.1), [playBeep]);

  // Showdown sounds
  const playShowdown = useCallback(() => {
    // Dramatic reveal sequence
    playShuffle();
    setTimeout(() => playCardFlip(), 200);
  }, [playShuffle, playCardFlip]);

  const playReveal = useCallback(() => playCardFlip(), [playCardFlip]);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    if (!enabled) stopTimerWarning();
  }, [stopTimerWarning]);

  useEffect(() => {
    return () => {
      stopTimerWarning();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopTimerWarning]);

  return {
    playFold,
    playCheck,
    playCall,
    playBet,
    playRaise,
    playAllIn,
    playWin,
    playLose,
    playDeal,
    playCardFlip,
    playShuffle,
    playChipSingle,
    playChipStack,
    playChipSlide,
    playPotWin,
    playTimerTick,
    playTimerWarning,
    playTimerCritical,
    playTimerExpired,
    startTimerWarning,
    stopTimerWarning,
    playTurn,
    playMyTurn,
    playChat,
    playNotification,
    playButtonClick,
    playShowdown,
    playReveal,
    setEnabled
  };
}
