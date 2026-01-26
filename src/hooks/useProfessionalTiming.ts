/**
 * Professional Timing Hook
 * Manages PokerStars-style animation timing for poker phases
 */
import { useState, useEffect, useRef, useCallback } from 'react';

// POKERSTARS-STYLE Professional poker room timing constants (in ms)
// Updated to match actual PokerStars timings
export const PROFESSIONAL_TIMINGS = {
  // Phase transition delays
  afterAction: 400,           // POKERSTARS: ~400ms after each player action
  betCollection: 700,         // POKERSTARS: Time to collect bets to pot
  
  // Card dealing delays - POKERSTARS TIMINGS
  flop: {
    preDeal: 650,             // POKERSTARS: ~600-700ms pause before dealing flop
    perCard: 200,             // POKERSTARS: ~180-220ms between each flop card
    postDeal: 350             // POKERSTARS: ~350ms pause after all 3 cards dealt
  },
  turn: {
    preDeal: 550,             // POKERSTARS: ~500-600ms pause before turn
    perCard: 0,               // Single card
    postDeal: 300             // POKERSTARS: ~300ms pause after turn
  },
  river: {
    preDeal: 550,             // POKERSTARS: ~500-600ms pause before river
    perCard: 0,               // Single card
    postDeal: 300             // POKERSTARS: ~300ms pause after river
  },
  
  // Showdown timing - POKERSTARS TIMINGS
  showdown: {
    revealDelay: 750,         // POKERSTARS: ~700-800ms between each player reveal
    winnerHighlight: 3000,    // POKERSTARS: ~3s to highlight winning hand
    potCollection: 1500,      // POKERSTARS: ~1.5s chips moving to winner
    displayDuration: 4000     // POKERSTARS: ~4s total showdown display time
  },
  
  // Between hands - POKERSTARS TIMINGS
  nextHand: {
    minDelay: 3000,           // POKERSTARS: ~3s minimum delay before next hand
    maxDelay: 3500            // POKERSTARS: ~3.5s maximum delay
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
