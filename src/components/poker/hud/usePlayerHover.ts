/**
 * Hook for managing player avatar hover state
 * Provides debounced hover logic for HUD popups
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface UsePlayerHoverOptions {
  enterDelay?: number;  // Delay before showing popup (ms)
  leaveDelay?: number;  // Delay before hiding popup (ms)
  disabled?: boolean;   // Disable hover functionality
}

interface UsePlayerHoverReturn {
  isHovered: boolean;
  hoveredPlayerId: string | null;
  onMouseEnter: (playerId: string) => void;
  onMouseLeave: () => void;
  forceClose: () => void;
}

export function usePlayerHover({
  enterDelay = 400,
  leaveDelay = 150,
  disabled = false
}: UsePlayerHoverOptions = {}): UsePlayerHoverReturn {
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);
  
  const enterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentPlayerRef = useRef<string | null>(null);

  // Clear all timeouts
  const clearTimeouts = useCallback(() => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  }, []);

  const onMouseEnter = useCallback((playerId: string) => {
    if (disabled) return;
    
    // Clear leave timeout if exists
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }

    // If already showing for same player, do nothing
    if (hoveredPlayerId === playerId && isHovered) {
      return;
    }

    // If showing for different player, switch immediately
    if (hoveredPlayerId && hoveredPlayerId !== playerId && isHovered) {
      currentPlayerRef.current = playerId;
      setHoveredPlayerId(playerId);
      return;
    }

    // Set up enter delay
    currentPlayerRef.current = playerId;
    enterTimeoutRef.current = setTimeout(() => {
      if (currentPlayerRef.current === playerId) {
        setHoveredPlayerId(playerId);
        setIsHovered(true);
      }
    }, enterDelay);
  }, [disabled, enterDelay, hoveredPlayerId, isHovered]);

  const onMouseLeave = useCallback(() => {
    if (disabled) return;
    
    // Clear enter timeout if exists
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }

    // Set up leave delay
    leaveTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setHoveredPlayerId(null);
      currentPlayerRef.current = null;
    }, leaveDelay);
  }, [disabled, leaveDelay]);

  const forceClose = useCallback(() => {
    clearTimeouts();
    setIsHovered(false);
    setHoveredPlayerId(null);
    currentPlayerRef.current = null;
  }, [clearTimeouts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  return {
    isHovered,
    hoveredPlayerId,
    onMouseEnter,
    onMouseLeave,
    forceClose
  };
}

export default usePlayerHover;
