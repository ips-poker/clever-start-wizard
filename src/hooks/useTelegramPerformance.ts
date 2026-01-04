/**
 * Telegram Performance Hook
 * Detects Telegram Mini App environment and provides performance flags
 */

import { useMemo } from 'react';

interface TelegramPerformanceFlags {
  /** Whether we're running in Telegram Mini App */
  isTelegram: boolean;
  /** Whether we should use lightweight animations */
  useLightweightAnimations: boolean;
  /** Whether we should reduce motion */
  reduceMotion: boolean;
  /** Whether we should use simpler chip graphics */
  useSimpleChips: boolean;
  /** Recommended animation duration multiplier */
  animationSpeed: number;
  /** Max number of animated elements */
  maxAnimatedElements: number;
}

// Detect Telegram environment
const detectTelegramEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check URL for telegram path
  if (window.location.pathname.includes('/telegram')) return true;
  
  // Check for Telegram WebApp object
  if ((window as any).Telegram?.WebApp) return true;
  
  // Check for TMA init data in URL
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has('tgWebAppData') || searchParams.has('tgWebAppStartParam')) return true;
  
  return false;
};

// Detect low-end device
const detectLowEndDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  
  // Check for device memory API
  if ((navigator as any).deviceMemory && (navigator as any).deviceMemory < 4) return true;
  
  // Check for hardware concurrency (CPU cores)
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return true;
  
  // Check user preference for reduced motion
  if (typeof window !== 'undefined' && 
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return true;
  
  return false;
};

export function useTelegramPerformance(): TelegramPerformanceFlags {
  return useMemo(() => {
    const isTelegram = detectTelegramEnvironment();
    const isLowEnd = detectLowEndDevice();
    const shouldOptimize = isTelegram || isLowEnd;

    return {
      isTelegram,
      useLightweightAnimations: shouldOptimize,
      reduceMotion: isLowEnd,
      useSimpleChips: shouldOptimize,
      // Faster animations on mobile for snappier feel
      animationSpeed: shouldOptimize ? 0.7 : 1,
      // Limit animated elements on mobile
      maxAnimatedElements: shouldOptimize ? 6 : 12
    };
  }, []);
}

/**
 * Get static performance flags (for use outside React components)
 */
export function getTelegramPerformanceFlags(): TelegramPerformanceFlags {
  const isTelegram = detectTelegramEnvironment();
  const isLowEnd = detectLowEndDevice();
  const shouldOptimize = isTelegram || isLowEnd;

  return {
    isTelegram,
    useLightweightAnimations: shouldOptimize,
    reduceMotion: isLowEnd,
    useSimpleChips: shouldOptimize,
    animationSpeed: shouldOptimize ? 0.7 : 1,
    maxAnimatedElements: shouldOptimize ? 6 : 12
  };
}

export default useTelegramPerformance;
