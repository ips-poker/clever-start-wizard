/**
 * Straddle Controls Component - PPPoker Style
 * 
 * PPPOKER IMPLEMENTATION:
 * 1. Regular Straddle: ONLY from UTG position (first player after BB)
 * 2. Mississippi Straddle: ONLY from Button position
 * 3. Amount: always 2× Big Blind (fixed, not a raise)
 * 4. Straddle is a LIVE blind - straddler can raise if action returns uncapped
 * 
 * PPPoker-style UI Features:
 * - Compact pill-style controls always visible when in valid position
 * - Auto-Straddle toggle with clear indicator
 * - Post Straddle button appears ONLY during straddle window (between hands)
 * - Countdown timer showing remaining time to post straddle
 * - Guaranteed 4-second minimum window for posting
 * - Clear visual feedback when straddle is queued/posted
 */

import React, { memo, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Zap, Check, RotateCcw, Clock } from 'lucide-react';

interface StraddleControlsProps {
  // Feature flags from table settings
  straddleEnabled: boolean;
  mississippiStraddleEnabled: boolean;
  
  // Table state
  bigBlind: number;
  playerStack: number;
  phase: string;
  handId: string | null;
  currentPlayerSeat: number | null;
  mySeat: number | null;
  dealerSeat: number | null;
  
  // Position info for validation
  smallBlindSeat?: number | null;
  bigBlindSeat?: number | null;
  players?: { seatNumber: number; status?: string }[];
  
  // Actions
  onStraddleRequest: () => void;
  
  // Auto-straddle state (persisted)
  autoStraddleEnabled: boolean;
  onAutoStraddleChange: (enabled: boolean) => void;
}

// PPPoker straddle window duration (seconds)
const STRADDLE_WINDOW_DURATION = 4;

// Format chip amount for display
const formatAmount = (amount: number): string => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toString();
};

export const StraddleControls = memo(function StraddleControls({
  straddleEnabled,
  mississippiStraddleEnabled,
  bigBlind,
  playerStack,
  phase,
  handId,
  currentPlayerSeat,
  mySeat,
  dealerSeat,
  smallBlindSeat,
  bigBlindSeat,
  players = [],
  onStraddleRequest,
  autoStraddleEnabled,
  onAutoStraddleChange
}: StraddleControlsProps) {
  // PPPoker-style state
  const [straddleQueued, setStraddleQueued] = useState(false); // "Straddle Next Hand"
  const [hasPostedThisHand, setHasPostedThisHand] = useState(false);
  const [windowCountdown, setWindowCountdown] = useState<number | null>(null);
  const [showPostedConfirm, setShowPostedConfirm] = useState(false);
  
  const windowStartRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const straddleAmount = bigBlind * 2;
  const canAffordStraddle = playerStack >= straddleAmount;
  
  // Calculate UTG position (first player after BB)
  const utgSeat = useMemo(() => {
    if (!bigBlindSeat || players.length < 3) return null;
    
    const activePlayers = players
      .filter(p => p.status === 'active' || !p.status)
      .sort((a, b) => a.seatNumber - b.seatNumber);
    
    if (activePlayers.length < 3) return null;
    
    const bbIdx = activePlayers.findIndex(p => p.seatNumber === bigBlindSeat);
    if (bbIdx === -1) return null;
    
    const utgIdx = (bbIdx + 1) % activePlayers.length;
    return activePlayers[utgIdx]?.seatNumber ?? null;
  }, [bigBlindSeat, players]);
  
  // Determine straddle eligibility based on position
  const straddleType = useMemo((): 'utg' | 'mississippi' | null => {
    if (mySeat === null) return null;
    
    // Mississippi (Button) straddle - only from button
    if (mississippiStraddleEnabled && mySeat === dealerSeat) {
      return 'mississippi';
    }
    
    // Regular UTG straddle - only from UTG position
    if (straddleEnabled && mySeat === utgSeat) {
      return 'utg';
    }
    
    return null;
  }, [mySeat, dealerSeat, utgSeat, straddleEnabled, mississippiStraddleEnabled]);
  
  const isEligible = straddleType !== null && canAffordStraddle;
  const isMississippi = straddleType === 'mississippi';
  
  // PPPoker: Straddle window is open between hands
  const isStraddleWindow = useMemo(() => {
    return phase === 'waiting' || 
           phase === 'showdown' || 
           (phase === 'preflop' && !currentPlayerSeat);
  }, [phase, currentPlayerSeat]);
  
  // Reset state when new hand starts
  useEffect(() => {
    if (handId) {
      setHasPostedThisHand(false);
      setShowPostedConfirm(false);
    }
  }, [handId]);
  
  // PPPoker: Countdown timer for straddle window
  useEffect(() => {
    if (isStraddleWindow && isEligible && !hasPostedThisHand) {
      // Start countdown
      if (!windowStartRef.current) {
        windowStartRef.current = Date.now();
        setWindowCountdown(STRADDLE_WINDOW_DURATION);
      }
      
      countdownIntervalRef.current = setInterval(() => {
        if (windowStartRef.current) {
          const elapsed = (Date.now() - windowStartRef.current) / 1000;
          const remaining = Math.max(0, STRADDLE_WINDOW_DURATION - elapsed);
          setWindowCountdown(Math.ceil(remaining));
          
          if (remaining <= 0) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
          }
        }
      }, 100);
      
      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    } else {
      // Reset when window closes
      windowStartRef.current = null;
      setWindowCountdown(null);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }
  }, [isStraddleWindow, isEligible, hasPostedThisHand]);
  
  // Auto-post straddle when window opens
  useEffect(() => {
    if (
      autoStraddleEnabled && 
      isStraddleWindow && 
      isEligible && 
      !hasPostedThisHand
    ) {
      const timer = setTimeout(() => {
        onStraddleRequest();
        setHasPostedThisHand(true);
        setShowPostedConfirm(true);
        setTimeout(() => setShowPostedConfirm(false), 2500);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [autoStraddleEnabled, isStraddleWindow, isEligible, hasPostedThisHand, onStraddleRequest]);
  
  // Handle queued straddle (one-time)
  useEffect(() => {
    if (
      straddleQueued && 
      isStraddleWindow && 
      isEligible && 
      !hasPostedThisHand
    ) {
      onStraddleRequest();
      setHasPostedThisHand(true);
      setStraddleQueued(false);
      setShowPostedConfirm(true);
      setTimeout(() => setShowPostedConfirm(false), 2500);
    }
  }, [straddleQueued, isStraddleWindow, isEligible, hasPostedThisHand, onStraddleRequest]);
  
  const handlePostStraddle = useCallback(() => {
    if (!hasPostedThisHand && isEligible) {
      onStraddleRequest();
      setHasPostedThisHand(true);
      setShowPostedConfirm(true);
      setTimeout(() => setShowPostedConfirm(false), 2500);
    }
  }, [hasPostedThisHand, isEligible, onStraddleRequest]);
  
  // Don't show if both straddle types are disabled
  if (!straddleEnabled && !mississippiStraddleEnabled) {
    return null;
  }
  
  // Don't show if player is not at table
  if (mySeat === null) {
    return null;
  }
  
  // PPPoker: Show compact indicator when NOT eligible (wrong position)
  if (!isEligible) {
    return null; // PPPoker hides controls completely when not in position
  }
  
  // PPPoker-style controls
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center gap-2"
    >
      {/* PPPoker: Straddle info pill */}
      <div className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
        "border backdrop-blur-sm",
        isMississippi 
          ? "bg-orange-500/20 border-orange-500/40 text-orange-300"
          : "bg-purple-500/20 border-purple-500/40 text-purple-300"
      )}>
        <Zap className="w-3 h-3" />
        <span>{isMississippi ? 'BTN' : 'UTG'}</span>
        <span className="opacity-60">•</span>
        <span>{formatAmount(straddleAmount)}</span>
      </div>
      
      {/* PPPoker: Auto-Straddle toggle */}
      <button
        onClick={() => onAutoStraddleChange(!autoStraddleEnabled)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all",
          "border backdrop-blur-sm",
          autoStraddleEnabled 
            ? isMississippi 
              ? "bg-orange-500/30 border-orange-400 text-orange-300"
              : "bg-purple-500/30 border-purple-400 text-purple-300"
            : "bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:text-white/80"
        )}
      >
        <div className={cn(
          "w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all",
          autoStraddleEnabled 
            ? isMississippi ? "bg-orange-500 border-orange-400" : "bg-purple-500 border-purple-400"
            : "border-white/40 bg-transparent"
        )}>
          {autoStraddleEnabled && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
        </div>
        <RotateCcw className="w-3 h-3" />
        <span>Auto</span>
      </button>
      
      {/* PPPoker: Queue straddle for next hand (when not in window) */}
      {!isStraddleWindow && !autoStraddleEnabled && (
        <button
          onClick={() => setStraddleQueued(!straddleQueued)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all",
            "border backdrop-blur-sm",
            straddleQueued 
              ? "bg-amber-500/30 border-amber-400 text-amber-300"
              : "bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:text-white/80"
          )}
        >
          <div className={cn(
            "w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all",
            straddleQueued 
              ? "bg-amber-500 border-amber-400"
              : "border-white/40 bg-transparent"
          )}>
            {straddleQueued && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
          </div>
          <span>×1</span>
        </button>
      )}
      
      {/* PPPoker: Post Straddle button with countdown (during window) */}
      <AnimatePresence mode="wait">
        {isStraddleWindow && !hasPostedThisHand && !autoStraddleEnabled && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            onClick={handlePostStraddle}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
              "shadow-lg",
              isMississippi
                ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-orange-500/30"
                : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-purple-500/30"
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Post</span>
            {windowCountdown !== null && windowCountdown > 0 && (
              <span className="flex items-center gap-0.5 ml-1 opacity-80">
                <Clock className="w-3 h-3" />
                <span>{windowCountdown}s</span>
              </span>
            )}
          </motion.button>
        )}
        
        {/* PPPoker: Posted confirmation */}
        {showPostedConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold",
              isMississippi 
                ? "bg-orange-500/30 text-orange-300 border border-orange-400"
                : "bg-green-500/30 text-green-300 border border-green-400"
            )}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Straddle {formatAmount(straddleAmount)}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default StraddleControls;
