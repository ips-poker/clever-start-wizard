import { useCallback, useRef, useEffect } from 'react';

// =====================================================
// PROFESSIONAL POKER SOUND SYSTEM
// =====================================================
// Realistic casino sounds with proper audio design

// Sound configurations with proper frequencies for casino feel
const SOUNDS = {
  // Action sounds
  fold: { frequencies: [180, 120], duration: 180, type: 'sine' as OscillatorType, volume: 0.2 },
  check: { frequencies: [800, 600], duration: 80, type: 'triangle' as OscillatorType, volume: 0.25 },
  call: { frequencies: [600, 800, 600], duration: 150, type: 'sine' as OscillatorType, volume: 0.3 },
  bet: { frequencies: [500, 700, 900], duration: 180, type: 'sine' as OscillatorType, volume: 0.3 },
  raise: { frequencies: [600, 800, 1000, 1200], duration: 250, type: 'sine' as OscillatorType, volume: 0.35 },
  allIn: { frequencies: [400, 600, 800, 1000, 1200], duration: 500, type: 'square' as OscillatorType, volume: 0.4 },
  
  // Game events
  win: { frequencies: [523, 659, 784, 880, 1047], duration: 800, type: 'sine' as OscillatorType, volume: 0.45 },
  lose: { frequencies: [400, 300, 200], duration: 400, type: 'sine' as OscillatorType, volume: 0.2 },
  
  // Card sounds
  deal: { frequencies: [2000, 1500], duration: 40, type: 'triangle' as OscillatorType, volume: 0.15 },
  cardFlip: { frequencies: [1800, 1200, 800], duration: 60, type: 'triangle' as OscillatorType, volume: 0.18 },
  shuffle: { frequencies: [1500, 2000, 1800, 2200], duration: 300, type: 'triangle' as OscillatorType, volume: 0.12 },
  
  // Chip sounds
  chipSingle: { frequencies: [3000, 2500], duration: 50, type: 'triangle' as OscillatorType, volume: 0.2 },
  chipStack: { frequencies: [2800, 3200, 2600, 3000, 2400], duration: 200, type: 'triangle' as OscillatorType, volume: 0.25 },
  chipSlide: { frequencies: [2000, 2500, 3000], duration: 150, type: 'triangle' as OscillatorType, volume: 0.18 },
  potWin: { frequencies: [2500, 3000, 3500, 4000], duration: 400, type: 'triangle' as OscillatorType, volume: 0.3 },
  
  // Timer warnings
  timerTick: { frequencies: [1000], duration: 30, type: 'sine' as OscillatorType, volume: 0.15 },
  timerWarning: { frequencies: [880, 660], duration: 150, type: 'square' as OscillatorType, volume: 0.3 },
  timerCritical: { frequencies: [1000, 500, 1000], duration: 200, type: 'square' as OscillatorType, volume: 0.4 },
  timerExpired: { frequencies: [400, 300, 200, 100], duration: 400, type: 'sawtooth' as OscillatorType, volume: 0.35 },
  
  // UI sounds
  turn: { frequencies: [660, 880], duration: 200, type: 'sine' as OscillatorType, volume: 0.3 },
  myTurn: { frequencies: [880, 1100, 880], duration: 300, type: 'sine' as OscillatorType, volume: 0.35 },
  chat: { frequencies: [1200], duration: 60, type: 'sine' as OscillatorType, volume: 0.12 },
  notification: { frequencies: [800, 1000, 1200], duration: 200, type: 'sine' as OscillatorType, volume: 0.25 },
  buttonClick: { frequencies: [1500], duration: 30, type: 'sine' as OscillatorType, volume: 0.1 },
  
  // Showdown
  showdown: { frequencies: [523, 659, 784, 1047], duration: 500, type: 'sine' as OscillatorType, volume: 0.35 },
  reveal: { frequencies: [600, 800, 1000], duration: 250, type: 'sine' as OscillatorType, volume: 0.3 },
};

export function usePokerSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Play multi-frequency tone with envelope
  const playTone = useCallback((
    frequencies: number[], 
    duration: number, 
    type: OscillatorType = 'sine',
    volume: number = 0.3
  ) => {
    if (!enabledRef.current) return;

    try {
      const ctx = getAudioContext();
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      const segmentDuration = duration / frequencies.length / 1000;
      
      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        
        // ADSR envelope for more natural sound
        const startTime = now + (index * segmentDuration);
        const attackTime = 0.01;
        const decayTime = segmentDuration * 0.3;
        const sustainLevel = volume * 0.7;
        const releaseTime = segmentDuration * 0.2;
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + attackTime);
        gainNode.gain.linearRampToValueAtTime(sustainLevel, startTime + attackTime + decayTime);
        gainNode.gain.linearRampToValueAtTime(0.001, startTime + segmentDuration);
        
        osc.connect(gainNode);
        gainNode.connect(masterGain);
        
        osc.start(startTime);
        osc.stop(startTime + segmentDuration + 0.1);
      });
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, [getAudioContext]);

  // Play noise burst for chip/card sounds
  const playNoise = useCallback((duration: number, volume: number = 0.1) => {
    if (!enabledRef.current) return;
    
    try {
      const ctx = getAudioContext();
      const bufferSize = ctx.sampleRate * (duration / 1000);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufferSize * 3);
      }
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2000;
      
      const gain = ctx.createGain();
      gain.gain.value = volume;
      
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      source.start();
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, [getAudioContext]);

  // Action sounds
  const playFold = useCallback(() => {
    const s = SOUNDS.fold;
    playTone(s.frequencies, s.duration, s.type, s.volume);
  }, [playTone]);

  const playCheck = useCallback(() => {
    const s = SOUNDS.check;
    playTone(s.frequencies, s.duration, s.type, s.volume);
    playNoise(30, 0.05);
  }, [playTone, playNoise]);

  const playCall = useCallback(() => {
    const s = SOUNDS.call;
    playTone(s.frequencies, s.duration, s.type, s.volume);
  }, [playTone]);

  const playBet = useCallback(() => {
    const s = SOUNDS.bet;
    playTone(s.frequencies, s.duration, s.type, s.volume);
    playNoise(50, 0.08);
  }, [playTone, playNoise]);

  const playRaise = useCallback(() => {
    const s = SOUNDS.raise;
    playTone(s.frequencies, s.duration, s.type, s.volume);
    playNoise(80, 0.1);
  }, [playTone, playNoise]);

  const playAllIn = useCallback(() => {
    const s = SOUNDS.allIn;
    playTone(s.frequencies, s.duration, s.type, s.volume);
    setTimeout(() => playNoise(200, 0.15), 100);
  }, [playTone, playNoise]);

  // Win/Lose
  const playWin = useCallback(() => {
    const s = SOUNDS.win;
    playTone(s.frequencies, s.duration, s.type, s.volume);
    setTimeout(() => {
      const pot = SOUNDS.potWin;
      playTone(pot.frequencies, pot.duration, pot.type, pot.volume);
    }, 200);
  }, [playTone]);

  const playLose = useCallback(() => {
    const s = SOUNDS.lose;
    playTone(s.frequencies, s.duration, s.type, s.volume);
  }, [playTone]);

  // Card sounds
  const playDeal = useCallback(() => {
    const s = SOUNDS.deal;
    playTone(s.frequencies, s.duration, s.type, s.volume);
    playNoise(40, 0.08);
  }, [playTone, playNoise]);

  const playCardFlip = useCallback(() => {
    const s = SOUNDS.cardFlip;
    playTone(s.frequencies, s.duration, s.type, s.volume);
    playNoise(30, 0.06);
  }, [playTone, playNoise]);

  const playShuffle = useCallback(() => {
    const s = SOUNDS.shuffle;
    playTone(s.frequencies, s.duration, s.type, s.volume);
    // Multiple noise bursts for shuffle effect
    for (let i = 0; i < 5; i++) {
      setTimeout(() => playNoise(40, 0.05), i * 50);
    }
  }, [playTone, playNoise]);

  // Chip sounds
  const playChipSingle = useCallback(() => {
    const s = SOUNDS.chipSingle;
    playTone(s.frequencies, s.duration, s.type, s.volume);
    playNoise(30, 0.1);
  }, [playTone, playNoise]);

  const playChipStack = useCallback(() => {
    const s = SOUNDS.chipStack;
    playTone(s.frequencies, s.duration, s.type, s.volume);
    // Cascading chip sounds
    for (let i = 0; i < 4; i++) {
      setTimeout(() => playNoise(30, 0.08), i * 40);
    }
  }, [playTone, playNoise]);

  const playChipSlide = useCallback(() => {
    const s = SOUNDS.chipSlide;
    playTone(s.frequencies, s.duration, s.type, s.volume);
    playNoise(100, 0.06);
  }, [playTone, playNoise]);

  const playPotWin = useCallback(() => {
    const s = SOUNDS.potWin;
    playTone(s.frequencies, s.duration, s.type, s.volume);
    // Chip cascade
    for (let i = 0; i < 8; i++) {
      setTimeout(() => playNoise(25, 0.1), i * 30);
    }
  }, [playTone, playNoise]);

  // Timer sounds
  const playTimerTick = useCallback(() => {
    const s = SOUNDS.timerTick;
    playTone(s.frequencies, s.duration, s.type, s.volume);
  }, [playTone]);

  const playTimerWarning = useCallback(() => {
    const s = SOUNDS.timerWarning;
    playTone(s.frequencies, s.duration, s.type, s.volume);
  }, [playTone]);

  const playTimerCritical = useCallback(() => {
    const s = SOUNDS.timerCritical;
    playTone(s.frequencies, s.duration, s.type, s.volume);
  }, [playTone]);

  const playTimerExpired = useCallback(() => {
    const s = SOUNDS.timerExpired;
    playTone(s.frequencies, s.duration, s.type, s.volume);
  }, [playTone]);

  // Start timer warning sequence
  const startTimerWarning = useCallback((secondsRemaining: number) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    let remaining = secondsRemaining;
    timerIntervalRef.current = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        playTimerExpired();
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      } else if (remaining <= 3) {
        playTimerCritical();
      } else if (remaining <= 5) {
        playTimerWarning();
      } else if (remaining <= 10) {
        playTimerTick();
      }
    }, 1000);
  }, [playTimerTick, playTimerWarning, playTimerCritical, playTimerExpired]);

  const stopTimerWarning = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Turn sounds
  const playTurn = useCallback(() => {
    const s = SOUNDS.turn;
    playTone(s.frequencies, s.duration, s.type, s.volume);
  }, [playTone]);

  const playMyTurn = useCallback(() => {
    const s = SOUNDS.myTurn;
    playTone(s.frequencies, s.duration, s.type, s.volume);
  }, [playTone]);

  // UI sounds
  const playChat = useCallback(() => {
    const s = SOUNDS.chat;
    playTone(s.frequencies, s.duration, s.type, s.volume);
  }, [playTone]);

  const playNotification = useCallback(() => {
    const s = SOUNDS.notification;
    playTone(s.frequencies, s.duration, s.type, s.volume);
  }, [playTone]);

  const playButtonClick = useCallback(() => {
    const s = SOUNDS.buttonClick;
    playTone(s.frequencies, s.duration, s.type, s.volume);
  }, [playTone]);

  // Showdown sounds
  const playShowdown = useCallback(() => {
    const s = SOUNDS.showdown;
    playTone(s.frequencies, s.duration, s.type, s.volume);
  }, [playTone]);

  const playReveal = useCallback(() => {
    const s = SOUNDS.reveal;
    playTone(s.frequencies, s.duration, s.type, s.volume);
    playNoise(60, 0.1);
  }, [playTone, playNoise]);

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