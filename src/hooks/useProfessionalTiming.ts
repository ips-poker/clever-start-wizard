/**
 * Professional Timing Hook
 * Manages PokerStars-style animation timing for poker phases
 */
import { useState, useEffect, useRef, useCallback } from 'react';

// Professional poker room timing constants (in ms)
export const PROFESSIONAL_TIMINGS = {
  // Phase transition delays
  afterAction: 400,           // Delay after each player action
  betCollection: 600,         // Time to collect bets to pot
  
  // Card dealing delays
  flop: {
    preDeal: 500,             // Pause before dealing flop
    perCard: 150,             // Time between each flop card
    postDeal: 300             // Pause after all 3 cards dealt
  },
  turn: {
    preDeal: 400,             // Pause before turn
    perCard: 0,               // Single card
    postDeal: 250
  },
  river: {
    preDeal: 400,             // Pause before river
    perCard: 0,               // Single card
    postDeal: 250
  },
  
  // Showdown timing
  showdown: {
    revealDelay: 500,         // Delay between each player reveal
    winnerHighlight: 1500,    // Time to highlight winning hand
    potCollection: 1000,      // Chips moving to winner
    displayDuration: 3000     // Total showdown display time
  },
  
  // Between hands
  nextHand: {
    minDelay: 2000,           // Minimum delay before next hand
    maxDelay: 3000            // Maximum delay
  }
};

interface TimingState {
  isCollectingBets: boolean;
  isDealingCards: boolean;
  isShowdown: boolean;
  currentPhase: string;
  phaseStartTime: number;
}

interface UseProfessionalTimingOptions {
  phase: string;
  onBetCollectionStart?: () => void;
  onBetCollectionEnd?: () => void;
  onCardDealStart?: () => void;
  onCardDealEnd?: () => void;
  onShowdownStart?: () => void;
  onShowdownEnd?: () => void;
}

export function useProfessionalTiming({
  phase,
  onBetCollectionStart,
  onBetCollectionEnd,
  onCardDealStart,
  onCardDealEnd,
  onShowdownStart,
  onShowdownEnd
}: UseProfessionalTimingOptions) {
  const [timingState, setTimingState] = useState<TimingState>({
    isCollectingBets: false,
    isDealingCards: false,
    isShowdown: false,
    currentPhase: phase,
    phaseStartTime: Date.now()
  });

  const prevPhaseRef = useRef(phase);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Clear all pending timeouts
  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
  }, []);

  // Add timeout with tracking
  const addTimeout = useCallback((fn: () => void, delay: number) => {
    const timeout = setTimeout(fn, delay);
    timeoutsRef.current.push(timeout);
    return timeout;
  }, []);

  // Handle phase transitions
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    
    if (phase !== prevPhase) {
      prevPhaseRef.current = phase;
      clearTimeouts();
      
      // Bet collection happens when moving to new betting round
      const phaseOrder = ['preflop', 'flop', 'turn', 'river', 'showdown'];
      const prevIndex = phaseOrder.indexOf(prevPhase);
      const currIndex = phaseOrder.indexOf(phase);
      
      if (currIndex > prevIndex && prevIndex >= 0) {
        // Phase advanced - collect bets first
        setTimingState(prev => ({ 
          ...prev, 
          isCollectingBets: true,
          currentPhase: phase,
          phaseStartTime: Date.now()
        }));
        
        onBetCollectionStart?.();
        
        // End bet collection after delay
        addTimeout(() => {
          setTimingState(prev => ({ ...prev, isCollectingBets: false }));
          onBetCollectionEnd?.();
          
          // Start card dealing if applicable
          if (['flop', 'turn', 'river'].includes(phase)) {
            setTimingState(prev => ({ ...prev, isDealingCards: true }));
            onCardDealStart?.();
            
            const timing = PROFESSIONAL_TIMINGS[phase as 'flop' | 'turn' | 'river'];
            const totalDealTime = timing.preDeal + (timing.perCard * (phase === 'flop' ? 3 : 1)) + timing.postDeal;
            
            addTimeout(() => {
              setTimingState(prev => ({ ...prev, isDealingCards: false }));
              onCardDealEnd?.();
            }, totalDealTime);
          }
          
          // Handle showdown
          if (phase === 'showdown') {
            setTimingState(prev => ({ ...prev, isShowdown: true }));
            onShowdownStart?.();
            
            addTimeout(() => {
              setTimingState(prev => ({ ...prev, isShowdown: false }));
              onShowdownEnd?.();
            }, PROFESSIONAL_TIMINGS.showdown.displayDuration);
          }
        }, PROFESSIONAL_TIMINGS.betCollection);
      } else if (phase === 'waiting' || phase === 'preflop') {
        // New hand starting
        setTimingState({
          isCollectingBets: false,
          isDealingCards: false,
          isShowdown: false,
          currentPhase: phase,
          phaseStartTime: Date.now()
        });
      }
    }
  }, [phase, clearTimeouts, addTimeout, onBetCollectionStart, onBetCollectionEnd, onCardDealStart, onCardDealEnd, onShowdownStart, onShowdownEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeouts();
  }, [clearTimeouts]);

  // Get timing for specific phase
  const getPhaseTimings = useCallback((targetPhase: string) => {
    if (['flop', 'turn', 'river'].includes(targetPhase)) {
      return PROFESSIONAL_TIMINGS[targetPhase as 'flop' | 'turn' | 'river'];
    }
    if (targetPhase === 'showdown') {
      return PROFESSIONAL_TIMINGS.showdown;
    }
    return null;
  }, []);

  // Calculate delay for card at index
  const getCardDelay = useCallback((cardIndex: number, targetPhase: string): number => {
    if (targetPhase === 'flop') {
      const timing = PROFESSIONAL_TIMINGS.flop;
      return timing.preDeal + (cardIndex * timing.perCard);
    } else if (targetPhase === 'turn' && cardIndex === 3) {
      return PROFESSIONAL_TIMINGS.turn.preDeal;
    } else if (targetPhase === 'river' && cardIndex === 4) {
      return PROFESSIONAL_TIMINGS.river.preDeal;
    }
    
    return 0;
  }, []);

  return {
    ...timingState,
    getPhaseTimings,
    getCardDelay,
    TIMINGS: PROFESSIONAL_TIMINGS
  };
}

export default useProfessionalTiming;
