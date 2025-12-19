import { useCallback, useRef, useEffect } from 'react';

// =====================================================
// POKER SOUND SYSTEM - CARD DEAL ONLY
// =====================================================

export function usePokerSounds() {
  const enabledRef = useRef(true);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const dealSoundRef = useRef<HTMLAudioElement | null>(null);

  // Preload only card deal sound
  useEffect(() => {
    dealSoundRef.current = new Audio('/sounds/card-deal.mp3');
    dealSoundRef.current.volume = 0.35;
    dealSoundRef.current.preload = 'auto';
  }, []);

  // Card deal - the only active sound
  const playDeal = useCallback(() => {
    if (!enabledRef.current) return;
    
    try {
      if (dealSoundRef.current) {
        const sound = dealSoundRef.current.cloneNode() as HTMLAudioElement;
        sound.volume = 0.35;
        sound.playbackRate = 1.3;
        sound.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, []);

  // All other sounds - silent
  const playFold = useCallback(() => {}, []);
  const playCheck = useCallback(() => {}, []);
  const playCall = useCallback(() => {}, []);
  const playBet = useCallback(() => {}, []);
  const playRaise = useCallback(() => {}, []);
  const playAllIn = useCallback(() => {}, []);
  const playWin = useCallback(() => {}, []);
  const playLose = useCallback(() => {}, []);
  const playCardFlip = useCallback(() => {}, []);
  const playShuffle = useCallback(() => {}, []);
  const playChipSingle = useCallback(() => {}, []);
  const playChipStack = useCallback(() => {}, []);
  const playChipSlide = useCallback(() => {}, []);
  const playPotWin = useCallback(() => {}, []);
  const playTimerTick = useCallback(() => {}, []);
  const playTimerWarning = useCallback(() => {}, []);
  const playTimerCritical = useCallback(() => {}, []);
  const playTimerExpired = useCallback(() => {}, []);
  const startTimerWarning = useCallback((secondsRemaining: number) => {}, []);
  const stopTimerWarning = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);
  const playTurn = useCallback(() => {}, []);
  const playMyTurn = useCallback(() => {}, []);
  const playChat = useCallback(() => {}, []);
  const playNotification = useCallback(() => {}, []);
  const playButtonClick = useCallback(() => {}, []);
  const playShowdown = useCallback(() => {}, []);
  const playReveal = useCallback(() => {}, []);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    if (!enabled) stopTimerWarning();
  }, [stopTimerWarning]);

  useEffect(() => {
    return () => {
      stopTimerWarning();
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
