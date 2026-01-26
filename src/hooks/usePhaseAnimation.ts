/**
 * Professional Phase Animation Hook
 * Manages timing and sequencing of poker phase transitions
 * Based on PokerStars/PPPoker animation standards
 */
import { useState, useCallback, useRef, useEffect } from 'react';

export interface PhaseTimings {
  preDealDelay: number;
  perCardDelay: number;
  postDealDelay: number;
}

export interface AnimationState {
  /** Currently animating a phase transition */
  isAnimating: boolean;
  /** Phase being animated to */
  targetPhase: string | null;
  /** Cards being revealed (indices for sequential reveal) */
  revealedCardCount: number;
  /** Total cards to reveal in this phase */
  totalCardsToReveal: number;
  /** Animation progress 0-1 */
  progress: number;
}

// POKERSTARS-STYLE professional timings (ms)
const DEFAULT_TIMINGS = {
  flop: { preDealDelay: 650, perCardDelay: 200, postDealDelay: 350 },   // POKERSTARS: ~650ms pre, ~200ms/card, ~350ms post
  turn: { preDealDelay: 550, perCardDelay: 0, postDealDelay: 300 },    // POKERSTARS: ~550ms pre, ~300ms post
  river: { preDealDelay: 550, perCardDelay: 0, postDealDelay: 300 },   // POKERSTARS: ~550ms pre, ~300ms post
  showdown: { preDealDelay: 350, perCardDelay: 0, postDealDelay: 0 },  // Quick transition
};

export function usePhaseAnimation() {
  const [animationState, setAnimationState] = useState<AnimationState>({
    isAnimating: false,
    targetPhase: null,
    revealedCardCount: 0,
    totalCardsToReveal: 0,
    progress: 0,
  });
  
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const cardRevealRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
      if (cardRevealRef.current) clearInterval(cardRevealRef.current);
    };
  }, []);

  /**
   * Start a phase transition animation
   */
  const animatePhaseTransition = useCallback((
    toPhase: string,
    communityCardsCount: number,
    onComplete?: () => void
  ) => {
    const timings = DEFAULT_TIMINGS[toPhase as keyof typeof DEFAULT_TIMINGS];
    if (!timings) {
      onComplete?.();
      return;
    }

    // Determine how many NEW cards to reveal
    let newCards = 0;
    if (toPhase === 'flop') newCards = 3;
    else if (toPhase === 'turn' || toPhase === 'river') newCards = 1;
    
    setAnimationState({
      isAnimating: true,
      targetPhase: toPhase,
      revealedCardCount: 0,
      totalCardsToReveal: newCards,
      progress: 0,
    });

    // Pre-deal pause
    animationRef.current = setTimeout(() => {
      // Sequential card reveal for flop
      if (newCards > 0 && timings.perCardDelay > 0) {
        let revealed = 0;
        cardRevealRef.current = setInterval(() => {
          revealed++;
          setAnimationState(prev => ({
            ...prev,
            revealedCardCount: revealed,
            progress: revealed / newCards,
          }));
          
          if (revealed >= newCards) {
            if (cardRevealRef.current) clearInterval(cardRevealRef.current);
            
            // Post-deal pause
            animationRef.current = setTimeout(() => {
              setAnimationState({
                isAnimating: false,
                targetPhase: null,
                revealedCardCount: 0,
                totalCardsToReveal: 0,
                progress: 1,
              });
              onComplete?.();
            }, timings.postDealDelay);
          }
        }, timings.perCardDelay);
      } else {
        // Single card or no card delay
        setAnimationState(prev => ({
          ...prev,
          revealedCardCount: newCards,
          progress: 1,
        }));
        
        animationRef.current = setTimeout(() => {
          setAnimationState({
            isAnimating: false,
            targetPhase: null,
            revealedCardCount: 0,
            totalCardsToReveal: 0,
            progress: 1,
          });
          onComplete?.();
        }, timings.postDealDelay);
      }
    }, timings.preDealDelay);
  }, []);

  /**
   * Cancel any ongoing animation
   */
  const cancelAnimation = useCallback(() => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    if (cardRevealRef.current) {
      clearInterval(cardRevealRef.current);
      cardRevealRef.current = null;
    }
    setAnimationState({
      isAnimating: false,
      targetPhase: null,
      revealedCardCount: 0,
      totalCardsToReveal: 0,
      progress: 0,
    });
  }, []);

  return {
    animationState,
    animatePhaseTransition,
    cancelAnimation,
    isAnimating: animationState.isAnimating,
  };
}

/**
 * Hook for managing action feedback animations
 */
export function useActionAnimation() {
  const [lastAction, setLastAction] = useState<{
    playerId: string;
    action: string;
    amount?: number;
    timestamp: number;
  } | null>(null);
  
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const triggerActionAnimation = useCallback((
    playerId: string,
    action: string,
    amount?: number,
    durationMs: number = 400
  ) => {
    setLastAction({
      playerId,
      action,
      amount,
      timestamp: Date.now(),
    });
    setIsAnimating(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
    }, durationMs);
  }, []);

  return {
    lastAction,
    isAnimating,
    triggerActionAnimation,
  };
}
