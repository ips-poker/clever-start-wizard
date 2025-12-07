import { useCallback, useRef } from 'react';

// Sound frequencies and durations for poker actions
const SOUNDS = {
  fold: { frequency: 200, duration: 150, type: 'sine' as OscillatorType },
  check: { frequency: 600, duration: 100, type: 'sine' as OscillatorType },
  call: { frequency: 800, duration: 150, type: 'sine' as OscillatorType },
  raise: { frequency: [600, 900], duration: 200, type: 'sine' as OscillatorType },
  allIn: { frequency: [400, 600, 800, 1000], duration: 400, type: 'square' as OscillatorType },
  win: { frequency: [523, 659, 784, 1047], duration: 600, type: 'sine' as OscillatorType },
  deal: { frequency: 1200, duration: 50, type: 'triangle' as OscillatorType },
  turn: { frequency: 440, duration: 200, type: 'sine' as OscillatorType },
  chat: { frequency: 1000, duration: 80, type: 'sine' as OscillatorType },
};

export function usePokerSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((
    frequency: number | number[], 
    duration: number, 
    type: OscillatorType = 'sine',
    volume: number = 0.3
  ) => {
    if (!enabledRef.current) return;

    try {
      const ctx = getAudioContext();
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

      const frequencies = Array.isArray(frequency) ? frequency : [frequency];
      
      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.connect(gainNode);
        
        const startTime = ctx.currentTime + (index * duration / frequencies.length / 1000);
        const endTime = startTime + duration / frequencies.length / 1000;
        
        osc.start(startTime);
        osc.stop(endTime + 0.1);
      });
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }, [getAudioContext]);

  const playFold = useCallback(() => {
    const { frequency, duration, type } = SOUNDS.fold;
    playTone(frequency, duration, type, 0.2);
  }, [playTone]);

  const playCheck = useCallback(() => {
    const { frequency, duration, type } = SOUNDS.check;
    playTone(frequency, duration, type, 0.25);
  }, [playTone]);

  const playCall = useCallback(() => {
    const { frequency, duration, type } = SOUNDS.call;
    playTone(frequency, duration, type, 0.3);
  }, [playTone]);

  const playRaise = useCallback(() => {
    const { frequency, duration, type } = SOUNDS.raise;
    playTone(frequency, duration, type, 0.35);
  }, [playTone]);

  const playAllIn = useCallback(() => {
    const { frequency, duration, type } = SOUNDS.allIn;
    playTone(frequency, duration, type, 0.4);
  }, [playTone]);

  const playWin = useCallback(() => {
    const { frequency, duration, type } = SOUNDS.win;
    playTone(frequency, duration, type, 0.4);
  }, [playTone]);

  const playDeal = useCallback(() => {
    const { frequency, duration, type } = SOUNDS.deal;
    playTone(frequency, duration, type, 0.15);
  }, [playTone]);

  const playTurn = useCallback(() => {
    const { frequency, duration, type } = SOUNDS.turn;
    playTone(frequency, duration, type, 0.25);
  }, [playTone]);

  const playChat = useCallback(() => {
    const { frequency, duration, type } = SOUNDS.chat;
    playTone(frequency, duration, type, 0.15);
  }, [playTone]);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);

  return {
    playFold,
    playCheck,
    playCall,
    playRaise,
    playAllIn,
    playWin,
    playDeal,
    playTurn,
    playChat,
    setEnabled
  };
}
