// ==========================================
// POKER TIMER HOOK
// ==========================================
// Smooth countdown timer for player turns
// With warning sounds and visual feedback

import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePokerTimerOptions {
  duration: number; // Total time in seconds
  warningTime?: number; // Time when warning starts (default: 10s)
  criticalTime?: number; // Time when critical warning starts (default: 5s)
  onTimeout?: () => void;
  onWarning?: () => void;
  onCritical?: () => void;
  autoStart?: boolean;
}

export function usePokerTimer({
  duration,
  warningTime = 10,
  criticalTime = 5,
  onTimeout,
  onWarning,
  onCritical,
  autoStart = false
}: UsePokerTimerOptions) {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningFiredRef = useRef(false);
  const criticalFiredRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  
  // Start the timer
  const start = useCallback(() => {
    if (isRunning) return;
    
    startTimeRef.current = Date.now();
    setIsRunning(true);
    warningFiredRef.current = false;
    criticalFiredRef.current = false;
  }, [isRunning]);
  
  // Stop the timer
  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  // Reset to full duration
  const reset = useCallback((newDuration?: number) => {
    stop();
    setTimeRemaining(newDuration ?? duration);
    setIsWarning(false);
    setIsCritical(false);
    warningFiredRef.current = false;
    criticalFiredRef.current = false;
    startTimeRef.current = null;
  }, [duration, stop]);
  
  // Restart with new duration
  const restart = useCallback((newDuration?: number) => {
    reset(newDuration);
    // Use RAF to ensure state is updated before starting
    requestAnimationFrame(() => {
      start();
    });
  }, [reset, start]);
  
  // Timer tick effect
  useEffect(() => {
    if (!isRunning) return;
    
    // Use high-precision timing
    const tick = () => {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }
      
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      
      setTimeRemaining(remaining);
      
      // Check warning threshold
      if (remaining <= warningTime && !warningFiredRef.current) {
        warningFiredRef.current = true;
        setIsWarning(true);
        onWarning?.();
      }
      
      // Check critical threshold
      if (remaining <= criticalTime && !criticalFiredRef.current) {
        criticalFiredRef.current = true;
        setIsCritical(true);
        onCritical?.();
      }
      
      // Check timeout
      if (remaining <= 0) {
        stop();
        onTimeout?.();
      }
    };
    
    // Initial tick
    tick();
    
    // Update at 60fps for smooth animation
    intervalRef.current = setInterval(tick, 1000 / 60);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, duration, warningTime, criticalTime, onTimeout, onWarning, onCritical, stop]);
  
  // Progress percentage (0-1)
  const progress = timeRemaining / duration;
  
  // Formatted time string
  const formattedTime = `${Math.ceil(timeRemaining)}`;
  
  return {
    timeRemaining,
    isRunning,
    isWarning,
    isCritical,
    progress,
    formattedTime,
    start,
    stop,
    reset,
    restart
  };
}

// Multiple timers for all players
export function useMultiPlayerTimers(playerCount: number, duration: number) {
  const [activePlayer, setActivePlayer] = useState<number | null>(null);
  const [timers, setTimers] = useState<Map<number, number>>(new Map());
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimesRef = useRef<Map<number, number>>(new Map());
  
  // Activate timer for a specific seat
  const activateTimer = useCallback((seat: number) => {
    // Stop previous timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    setActivePlayer(seat);
    startTimesRef.current.set(seat, Date.now());
    setTimers(prev => new Map(prev).set(seat, duration));
    
    // Start countdown
    intervalRef.current = setInterval(() => {
      const startTime = startTimesRef.current.get(seat);
      if (!startTime) return;
      
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      
      setTimers(prev => new Map(prev).set(seat, remaining));
      
      if (remaining <= 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
      }
    }, 100);
  }, [duration]);
  
  // Stop all timers
  const stopAll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setActivePlayer(null);
    startTimesRef.current.clear();
  }, []);
  
  // Get timer for seat
  const getTimer = useCallback((seat: number): number => {
    return timers.get(seat) ?? duration;
  }, [timers, duration]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  return {
    activePlayer,
    activateTimer,
    stopAll,
    getTimer,
    timers
  };
}
