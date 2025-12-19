import { useCallback, useRef, useEffect } from 'react';

// =====================================================
// PROFESSIONAL POKER SOUND SYSTEM
// =====================================================
// Realistic casino sounds with proper audio design

// Sound configurations with proper frequencies for casino feel
const SOUNDS = {
  // Action sounds - realistic poker table sounds
  fold: { frequencies: [150, 100], duration: 120, type: 'sine' as OscillatorType, volume: 0.15 },
  // Check - will be handled specially as double tap
  check: { frequencies: [120, 80], duration: 35, type: 'sine' as OscillatorType, volume: 0.35 },
  // Call - pleasant chip toss sound
  call: { frequencies: [2200, 2800, 2400], duration: 120, type: 'triangle' as OscillatorType, volume: 0.22 },
  // Bet - chip placement
  bet: { frequencies: [2400, 3000, 2600], duration: 100, type: 'triangle' as OscillatorType, volume: 0.2 },
  // Raise - more emphatic chip sound
  raise: { frequencies: [2600, 3200, 2800, 3400], duration: 150, type: 'triangle' as OscillatorType, volume: 0.25 },
  allIn: { frequencies: [2000, 2600, 3200, 3800, 4200], duration: 400, type: 'triangle' as OscillatorType, volume: 0.35 },
  
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
  const chipSoundRef = useRef<HTMLAudioElement | null>(null);
  const shuffleSoundRef = useRef<HTMLAudioElement | null>(null);
  const dealSoundRef = useRef<HTMLAudioElement | null>(null);
  const chipWinSoundRef = useRef<HTMLAudioElement | null>(null);

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
  }, []);

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

  // Double tap on table for check - realistic poker knock
  const playCheck = useCallback(() => {
    if (!enabledRef.current) return;
    
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Create two muffled knocks like tapping on felt/wood table
      [0, 0.12].forEach((delay) => {
        // Low frequency thump
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, now + delay);
        osc.frequency.exponentialRampToValueAtTime(60, now + delay + 0.05);
        
        // Lowpass filter for muffled sound
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        filter.Q.value = 1;
        
        // Quick attack, fast decay for knock effect
        gainNode.gain.setValueAtTime(0, now + delay);
        gainNode.gain.linearRampToValueAtTime(0.4, now + delay + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(now + delay);
        osc.stop(now + delay + 0.1);
      });
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, [getAudioContext]);

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

  // Raise - more emphatic chip stack sound
  const playRaise = useCallback(() => {
    if (!enabledRef.current) return;
    
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Multiple chips stacking - cascading tones
      [0, 0.04, 0.09].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.type = 'triangle';
        const baseFreq = 2600 + i * 200;
        osc.frequency.setValueAtTime(baseFreq, now + delay);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + delay + 0.06);
        
        filter.type = 'bandpass';
        filter.frequency.value = 2800;
        filter.Q.value = 1.5;
        
        gainNode.gain.setValueAtTime(0, now + delay);
        gainNode.gain.linearRampToValueAtTime(0.2, now + delay + 0.003);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(now + delay);
        osc.stop(now + delay + 0.12);
      });
      
      playNoise(60, 0.08);
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, [getAudioContext, playNoise]);

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
    if (!enabledRef.current) return;
    
    try {
      if (dealSoundRef.current) {
        const sound = dealSoundRef.current.cloneNode() as HTMLAudioElement;
        sound.volume = 0.35;
        sound.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, []);

  const playCardFlip = useCallback(() => {
    const s = SOUNDS.cardFlip;
    playTone(s.frequencies, s.duration, s.type, s.volume);
    playNoise(30, 0.06);
  }, [playTone, playNoise]);

  const playShuffle = useCallback(() => {
    if (!enabledRef.current) return;
    
    try {
      if (shuffleSoundRef.current) {
        const sound = shuffleSoundRef.current.cloneNode() as HTMLAudioElement;
        sound.volume = 0.4;
        sound.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, []);

  // Chip sounds - pleasant ceramic/clay chip sounds
  const playChipSingle = useCallback(() => {
    if (!enabledRef.current) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(3200, now);
      osc.frequency.exponentialRampToValueAtTime(2400, now + 0.04);
      
      filter.type = 'bandpass';
      filter.frequency.value = 2800;
      filter.Q.value = 2;
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.18, now + 0.003);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      
      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, [getAudioContext]);

  const playChipStack = useCallback(() => {
    if (!enabledRef.current) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Pleasant cascading chip sounds
      [0, 0.03, 0.07, 0.1].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.type = 'triangle';
        const freq = 2600 + (i % 2) * 400;
        osc.frequency.setValueAtTime(freq, now + delay);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.75, now + delay + 0.05);
        
        filter.type = 'bandpass';
        filter.frequency.value = 2700;
        filter.Q.value = 1.5;
        
        gainNode.gain.setValueAtTime(0, now + delay);
        gainNode.gain.linearRampToValueAtTime(0.15, now + delay + 0.002);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(now + delay);
        osc.stop(now + delay + 0.1);
      });
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, [getAudioContext]);

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
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Satisfying chip cascade for winning pot
      [0, 0.04, 0.08, 0.13, 0.18, 0.24].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.type = 'triangle';
        const freq = 2400 + Math.random() * 800;
        osc.frequency.setValueAtTime(freq, now + delay);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + delay + 0.06);
        
        filter.type = 'bandpass';
        filter.frequency.value = 2600;
        filter.Q.value = 1.2;
        
        const vol = 0.12 + (i * 0.02);
        gainNode.gain.setValueAtTime(0, now + delay);
        gainNode.gain.linearRampToValueAtTime(vol, now + delay + 0.003);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(now + delay);
        osc.stop(now + delay + 0.12);
      });
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, [getAudioContext]);

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