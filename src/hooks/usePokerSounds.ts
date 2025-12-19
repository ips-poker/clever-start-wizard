import { useCallback, useRef, useEffect } from 'react';

// =====================================================
// POKER SOUND SYSTEM - MP3 ONLY
// =====================================================
// All sounds use preloaded MP3 files, no generated tones

export function usePokerSounds() {
  const enabledRef = useRef(true);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chipSoundRef = useRef<HTMLAudioElement | null>(null);
  const shuffleSoundRef = useRef<HTMLAudioElement | null>(null);
  const dealSoundRef = useRef<HTMLAudioElement | null>(null);
  const chipWinSoundRef = useRef<HTMLAudioElement | null>(null);
  const allInSoundRef = useRef<HTMLAudioElement | null>(null);
  const checkSoundRef = useRef<HTMLAudioElement | null>(null);
  const cardFlipSoundRef = useRef<HTMLAudioElement | null>(null);
  const foldSoundRef = useRef<HTMLAudioElement | null>(null);

  // Preload sound MP3s
  useEffect(() => {
    chipSoundRef.current = new Audio('/sounds/chip-bet.mp3');
    chipSoundRef.current.volume = 0.5;
    chipSoundRef.current.preload = 'auto';
    
    shuffleSoundRef.current = new Audio('/sounds/card-shuffle.mp3');
    shuffleSoundRef.current.volume = 0.4;
    shuffleSoundRef.current.preload = 'auto';
    
    dealSoundRef.current = new Audio('/sounds/card-deal.mp3');
    dealSoundRef.current.volume = 0.35;
    dealSoundRef.current.preload = 'auto';
    
    chipWinSoundRef.current = new Audio('/sounds/chip-win.mp3');
    chipWinSoundRef.current.volume = 0.5;
    chipWinSoundRef.current.preload = 'auto';
    
    allInSoundRef.current = new Audio('/sounds/chip-allin.mp3');
    allInSoundRef.current.volume = 0.6;
    allInSoundRef.current.preload = 'auto';
    
    checkSoundRef.current = new Audio('/sounds/check.mp3');
    checkSoundRef.current.volume = 0.5;
    checkSoundRef.current.preload = 'auto';
    
    cardFlipSoundRef.current = new Audio('/sounds/card-flip.mp3');
    cardFlipSoundRef.current.volume = 0.45;
    cardFlipSoundRef.current.preload = 'auto';
    
    foldSoundRef.current = new Audio('/sounds/fold.mp3');
    foldSoundRef.current.volume = 0.25;
    foldSoundRef.current.preload = 'auto';
  }, []);


  // Action sounds - fold uses dedicated fold sound (muted)
  const playFold = useCallback(() => {
    if (!enabledRef.current) return;
    try {
      if (foldSoundRef.current) {
        const sound = foldSoundRef.current.cloneNode() as HTMLAudioElement;
        sound.volume = 0.25; // Приглушённый звук
        sound.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, []);

  // Check - play preloaded MP3 sound
  const playCheck = useCallback(() => {
    if (!enabledRef.current) return;
    
    try {
      if (checkSoundRef.current) {
        const sound = checkSoundRef.current.cloneNode() as HTMLAudioElement;
        sound.volume = 0.7; // Increased volume
        sound.play().catch((e) => console.warn('Check sound failed:', e));
      } else {
        // Fallback: create new audio if ref not ready
        const sound = new Audio('/sounds/check.mp3');
        sound.volume = 0.7;
        sound.play().catch((e) => console.warn('Check sound fallback failed:', e));
      }
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, []);

  // Call - pleasant chip toss onto table
  // Play chip sound from MP3
  const playChipSound = useCallback((volume: number = 0.5) => {
    if (!enabledRef.current) return;
    
    try {
      if (chipSoundRef.current) {
        const sound = chipSoundRef.current.cloneNode() as HTMLAudioElement;
        sound.volume = volume;
        sound.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, []);

  // Call - pleasant chip toss onto table (uses MP3)
  const playCall = useCallback(() => {
    playChipSound(0.5);
  }, [playChipSound]);

  const playBet = useCallback(() => {
    playChipSound(0.45);
  }, [playChipSound]);

  // Raise - use chip sound (same as bet/call but slightly louder)
  const playRaise = useCallback(() => {
    playChipSound(0.55);
  }, [playChipSound]);

  const playAllIn = useCallback(() => {
    if (!enabledRef.current) return;
    
    try {
      if (allInSoundRef.current) {
        const sound = allInSoundRef.current.cloneNode() as HTMLAudioElement;
        sound.volume = 0.6;
        sound.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, []);

  // Win/Lose - use chip sounds (no annoying melodies)
  const playWin = useCallback(() => {
    if (!enabledRef.current) return;
    // Just play chip slide for win - victory is visual
    try {
      if (chipWinSoundRef.current) {
        const sound = chipWinSoundRef.current.cloneNode() as HTMLAudioElement;
        sound.volume = 0.5;
        sound.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, []);

  const playLose = useCallback(() => {
    // Silent - no sound for losing
  }, []);

  // Card sounds
  const playDeal = useCallback(() => {
    if (!enabledRef.current) return;
    
    try {
      if (dealSoundRef.current) {
        const sound = dealSoundRef.current.cloneNode() as HTMLAudioElement;
        sound.volume = 0.35;
        sound.playbackRate = 1.3; // Ускоренное воспроизведение
        sound.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, []);

  const playCardFlip = useCallback(() => {
    if (!enabledRef.current) return;
    
    try {
      if (cardFlipSoundRef.current) {
        const sound = cardFlipSoundRef.current.cloneNode() as HTMLAudioElement;
        sound.volume = 0.45;
        sound.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, []);

  const playShuffle = useCallback(() => {
    // Silent - no shuffle sound
  }, []);

  // Chip sounds - use preloaded MP3s
  const playChipSingle = useCallback(() => {
    playChipSound(0.4);
  }, [playChipSound]);

  const playChipStack = useCallback(() => {
    // Play chip sound twice with slight delay for stack effect
    playChipSound(0.45);
    setTimeout(() => playChipSound(0.35), 80);
  }, [playChipSound]);

  const playChipSlide = useCallback(() => {
    if (!enabledRef.current) return;
    
    try {
      if (chipWinSoundRef.current) {
        const sound = chipWinSoundRef.current.cloneNode() as HTMLAudioElement;
        sound.volume = 0.5;
        sound.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, []);

  const playPotWin = useCallback(() => {
    if (!enabledRef.current) return;
    // Play chip win sound twice for pot collection effect
    try {
      if (chipWinSoundRef.current) {
        const sound = chipWinSoundRef.current.cloneNode() as HTMLAudioElement;
        sound.volume = 0.55;
        sound.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, []);

  // Timer sounds - disabled (no generated sounds)
  const playTimerTick = useCallback(() => {
    // Silent - no annoying beeps
  }, []);

  const playTimerWarning = useCallback(() => {
    // Silent - no annoying beeps
  }, []);

  const playTimerCritical = useCallback(() => {
    // Silent - no annoying beeps
  }, []);

  const playTimerExpired = useCallback(() => {
    // Silent - no annoying beeps
  }, []);

  // Start timer warning sequence - disabled
  const startTimerWarning = useCallback((secondsRemaining: number) => {
    // Disabled - no timer sounds
  }, []);

  const stopTimerWarning = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Turn sounds - silent
  const playTurn = useCallback(() => {
    // Silent
  }, []);

  const playMyTurn = useCallback(() => {
    // Silent
  }, []);

  // UI sounds - silent
  const playChat = useCallback(() => {
    // Silent
  }, []);

  const playNotification = useCallback(() => {
    // Silent
  }, []);

  const playButtonClick = useCallback(() => {
    // Silent
  }, []);

  // Showdown sounds - use chip win sound instead
  const playShowdown = useCallback(() => {
    if (!enabledRef.current) return;
    try {
      if (chipWinSoundRef.current) {
        const sound = chipWinSoundRef.current.cloneNode() as HTMLAudioElement;
        sound.volume = 0.4;
        sound.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, []);

  const playReveal = useCallback(() => {
    // Use card flip sound for reveal
    if (!enabledRef.current) return;
    try {
      if (cardFlipSoundRef.current) {
        const sound = cardFlipSoundRef.current.cloneNode() as HTMLAudioElement;
        sound.volume = 0.4;
        sound.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    if (!enabled) stopTimerWarning();
  }, [stopTimerWarning]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopTimerWarning();
    };
  }, [stopTimerWarning]);

  return {
    // Actions
    playFold,
    playCheck,
    playCall,
    playBet,
    playRaise,
    playAllIn,
    
    // Win/Lose
    playWin,
    playLose,
    
    // Cards
    playDeal,
    playCardFlip,
    playShuffle,
    
    // Chips
    playChipSingle,
    playChipStack,
    playChipSlide,
    playPotWin,
    
    // Timer
    playTimerTick,
    playTimerWarning,
    playTimerCritical,
    playTimerExpired,
    startTimerWarning,
    stopTimerWarning,
    
    // Turn
    playTurn,
    playMyTurn,
    
    // UI
    playChat,
    playNotification,
    playButtonClick,
    
    // Showdown
    playShowdown,
    playReveal,
    
    // Control
    setEnabled
  };
}