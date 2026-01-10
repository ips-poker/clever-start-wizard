/**
 * Tournament Sounds Hook
 * Provides sound effects for tournament events
 */

import { useCallback, useRef, useEffect } from 'react';

export type TournamentSoundType = 
  | 'break_start'      // Break started
  | 'break_end'        // Break ended, resume play
  | 'level_up'         // Blind level increased
  | 'player_eliminated' // Player eliminated
  | 'hand_for_hand'    // Hand-for-hand mode started
  | 'bubble_burst'     // Bubble burst, in the money
  | 'final_table'      // Final table reached
  | 'your_turn'        // Your turn to act
  | 'time_warning'     // Time bank warning
  | 'tournament_win';  // Tournament victory

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  pattern?: number[]; // For multi-tone sounds
}

const SOUND_CONFIGS: Record<TournamentSoundType, SoundConfig | SoundConfig[]> = {
  break_start: [
    { frequency: 523.25, duration: 150, type: 'sine', gain: 0.3 },
    { frequency: 392, duration: 150, type: 'sine', gain: 0.3 },
    { frequency: 329.63, duration: 300, type: 'sine', gain: 0.25 }
  ],
  break_end: [
    { frequency: 329.63, duration: 100, type: 'sine', gain: 0.3 },
    { frequency: 392, duration: 100, type: 'sine', gain: 0.3 },
    { frequency: 523.25, duration: 200, type: 'sine', gain: 0.35 }
  ],
  level_up: [
    { frequency: 440, duration: 100, type: 'sine', gain: 0.25 },
    { frequency: 554.37, duration: 100, type: 'sine', gain: 0.25 },
    { frequency: 659.25, duration: 150, type: 'sine', gain: 0.3 }
  ],
  player_eliminated: [
    { frequency: 220, duration: 200, type: 'triangle', gain: 0.25 },
    { frequency: 196, duration: 200, type: 'triangle', gain: 0.2 },
    { frequency: 174.61, duration: 400, type: 'triangle', gain: 0.15 }
  ],
  hand_for_hand: [
    { frequency: 523.25, duration: 150, type: 'square', gain: 0.15 },
    { frequency: 523.25, duration: 150, type: 'square', gain: 0.15 },
    { frequency: 659.25, duration: 300, type: 'square', gain: 0.2 }
  ],
  bubble_burst: [
    { frequency: 523.25, duration: 100, type: 'sine', gain: 0.3 },
    { frequency: 659.25, duration: 100, type: 'sine', gain: 0.3 },
    { frequency: 783.99, duration: 100, type: 'sine', gain: 0.35 },
    { frequency: 1046.5, duration: 300, type: 'sine', gain: 0.4 }
  ],
  final_table: [
    { frequency: 523.25, duration: 150, type: 'sine', gain: 0.3 },
    { frequency: 659.25, duration: 150, type: 'sine', gain: 0.3 },
    { frequency: 783.99, duration: 150, type: 'sine', gain: 0.35 },
    { frequency: 1046.5, duration: 400, type: 'sine', gain: 0.4 }
  ],
  your_turn: { frequency: 880, duration: 100, type: 'sine', gain: 0.2 },
  time_warning: [
    { frequency: 880, duration: 80, type: 'square', gain: 0.2 },
    { frequency: 880, duration: 80, type: 'square', gain: 0.2 }
  ],
  tournament_win: [
    { frequency: 523.25, duration: 150, type: 'sine', gain: 0.35 },
    { frequency: 659.25, duration: 150, type: 'sine', gain: 0.35 },
    { frequency: 783.99, duration: 150, type: 'sine', gain: 0.35 },
    { frequency: 1046.5, duration: 150, type: 'sine', gain: 0.4 },
    { frequency: 1318.51, duration: 400, type: 'sine', gain: 0.45 }
  ]
};

export interface UseTournamentSoundsOptions {
  enabled?: boolean;
  volume?: number;
}

export function useTournamentSounds(options: UseTournamentSoundsOptions = {}) {
  const { enabled = true, volume = 0.5 } = options;
  const audioContextRef = useRef<AudioContext | null>(null);
  const isMutedRef = useRef(false);

  // Initialize AudioContext lazily
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Play a single tone
  const playTone = useCallback((config: SoundConfig, delay: number = 0): Promise<void> => {
    return new Promise((resolve) => {
      if (!enabled || isMutedRef.current) {
        resolve();
        return;
      }

      try {
        const ctx = getAudioContext();
        
        // Resume if suspended (required for some browsers)
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = config.type;
        oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime + delay / 1000);
        
        const adjustedGain = config.gain * volume;
        gainNode.gain.setValueAtTime(0, ctx.currentTime + delay / 1000);
        gainNode.gain.linearRampToValueAtTime(adjustedGain, ctx.currentTime + (delay + 10) / 1000);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (delay + config.duration) / 1000);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(ctx.currentTime + delay / 1000);
        oscillator.stop(ctx.currentTime + (delay + config.duration + 50) / 1000);

        setTimeout(resolve, delay + config.duration);
      } catch (error) {
        console.warn('[TournamentSounds] Error playing tone:', error);
        resolve();
      }
    });
  }, [enabled, volume, getAudioContext]);

  // Play a sound effect
  const playSound = useCallback(async (type: TournamentSoundType) => {
    if (!enabled || isMutedRef.current) return;

    const config = SOUND_CONFIGS[type];
    
    if (Array.isArray(config)) {
      // Multi-tone sequence
      let delay = 0;
      for (const tone of config) {
        await playTone(tone, delay);
        delay = 0; // Subsequent tones play immediately after
      }
    } else {
      // Single tone
      await playTone(config);
    }
  }, [enabled, playTone]);

  // Mute/unmute
  const setMuted = useCallback((muted: boolean) => {
    isMutedRef.current = muted;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  return {
    playSound,
    setMuted,
    isEnabled: enabled
  };
}

// Standalone function for playing sounds outside of React components
let globalAudioContext: AudioContext | null = null;

export function playTournamentSound(type: TournamentSoundType, volume: number = 0.5) {
  try {
    if (!globalAudioContext) {
      globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = globalAudioContext;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const config = SOUND_CONFIGS[type];
    const configs = Array.isArray(config) ? config : [config];
    
    let totalDelay = 0;
    
    configs.forEach((tone) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = tone.type;
      oscillator.frequency.setValueAtTime(tone.frequency, ctx.currentTime + totalDelay / 1000);
      
      const adjustedGain = tone.gain * volume;
      gainNode.gain.setValueAtTime(0, ctx.currentTime + totalDelay / 1000);
      gainNode.gain.linearRampToValueAtTime(adjustedGain, ctx.currentTime + (totalDelay + 10) / 1000);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (totalDelay + tone.duration) / 1000);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime + totalDelay / 1000);
      oscillator.stop(ctx.currentTime + (totalDelay + tone.duration + 50) / 1000);

      totalDelay += tone.duration;
    });
  } catch (error) {
    console.warn('[TournamentSounds] Error playing sound:', error);
  }
}

export default useTournamentSounds;
