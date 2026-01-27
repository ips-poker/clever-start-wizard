/**
 * Straddle Controls Component - PokerStars/PokerBROS Style
 * Shows straddle options during pre-action phase (waiting for turn)
 * - Auto-Straddle: automatically post straddle every hand (persisted in localStorage)
 * - Straddle Next Hand: one-time straddle for the next hand
 * - Mississippi Straddle: straddle from any position (doubled amounts per position)
 * 
 * Key improvements over basic implementation:
 * 1. Auto-straddle persisted across sessions (localStorage)
 * 2. Visual indicator of straddle amount (2xBB)
 * 3. Mississippi mode shows orange styling with "any position" hint
 * 4. Clean integration in pre-action panel (not floating button)
 */

import React, { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Zap, Check, RotateCcw, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  
  // Actions
  onStraddleRequest: () => void;
  
  // Auto-straddle state (persisted)
  autoStraddleEnabled: boolean;
  onAutoStraddleChange: (enabled: boolean) => void;
}

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
  onStraddleRequest,
  autoStraddleEnabled,
  onAutoStraddleChange
}: StraddleControlsProps) {
  const [straddleNextHand, setStraddleNextHand] = useState(false);
  const [hasRequestedStraddle, setHasRequestedStraddle] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const straddleAmount = bigBlind * 2;
  const canAffordStraddle = playerStack >= straddleAmount;
  
  // Determine if straddle window is open
  // Window is open during:
  // 1. Waiting phase (between hands)
  // 2. Showdown phase (results displayed)
  // 3. Early preflop before action starts
  const isStraddleWindow = useMemo(() => {
    return phase === 'waiting' || 
           phase === 'showdown' || 
           (phase === 'preflop' && !currentPlayerSeat);
  }, [phase, currentPlayerSeat]);
  
  // Reset straddle request when new hand starts
  useEffect(() => {
    if (handId) {
      setHasRequestedStraddle(false);
      setShowConfirmation(false);
    }
  }, [handId]);
  
  // Auto-post straddle when window opens and auto-straddle is enabled
  useEffect(() => {
    if (
      autoStraddleEnabled && 
      isStraddleWindow && 
      canAffordStraddle && 
      !hasRequestedStraddle &&
      (straddleEnabled || mississippiStraddleEnabled)
    ) {
      // Auto-post with small delay for visual feedback
      const timer = setTimeout(() => {
        onStraddleRequest();
        setHasRequestedStraddle(true);
        setShowConfirmation(true);
        // Hide confirmation after 2s
        setTimeout(() => setShowConfirmation(false), 2000);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoStraddleEnabled, isStraddleWindow, canAffordStraddle, hasRequestedStraddle, straddleEnabled, mississippiStraddleEnabled, onStraddleRequest]);
  
  // Handle one-time straddle checkbox
  useEffect(() => {
    if (
      straddleNextHand && 
      isStraddleWindow && 
      canAffordStraddle && 
      !hasRequestedStraddle &&
      (straddleEnabled || mississippiStraddleEnabled)
    ) {
      onStraddleRequest();
      setHasRequestedStraddle(true);
      setStraddleNextHand(false); // Reset one-time straddle
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 2000);
    }
  }, [straddleNextHand, isStraddleWindow, canAffordStraddle, hasRequestedStraddle, straddleEnabled, mississippiStraddleEnabled, onStraddleRequest]);
  
  const handleManualStraddle = useCallback(() => {
    if (!hasRequestedStraddle && canAffordStraddle) {
      onStraddleRequest();
      setHasRequestedStraddle(true);
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 2000);
    }
  }, [hasRequestedStraddle, canAffordStraddle, onStraddleRequest]);
  
  // Don't show if straddle is not enabled
  if (!straddleEnabled && !mississippiStraddleEnabled) {
    return null;
  }
  
  // Don't show if can't afford
  if (!canAffordStraddle) {
    return null;
  }
  
  const isMississippi = mississippiStraddleEnabled;
  
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      {/* Straddle amount badge */}
      <div className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
        isMississippi 
          ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
          : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
      )}>
        <DollarSign className="w-3 h-3" />
        <span>{formatAmount(straddleAmount)}</span>
        <span className="opacity-60">(2×BB)</span>
      </div>
      
      {/* Auto-Straddle Toggle */}
      <label className="flex items-center gap-1.5 cursor-pointer select-none group">
        <div
          onClick={() => onAutoStraddleChange(!autoStraddleEnabled)}
          className={cn(
            "w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center transition-all",
            autoStraddleEnabled 
              ? isMississippi ? "bg-orange-500 border-orange-400" : "bg-purple-500 border-purple-400"
              : "border-white/30 bg-transparent group-hover:border-white/50"
          )}
        >
          {autoStraddleEnabled && <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" strokeWidth={3} />}
        </div>
        <span className={cn(
          "text-xs sm:text-sm font-medium transition-colors flex items-center gap-1",
          autoStraddleEnabled 
            ? isMississippi ? "text-orange-400" : "text-purple-400" 
            : "text-white/60 group-hover:text-white/80"
        )}>
          <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">Auto-</span>Straddle
        </span>
      </label>
      
      {/* One-time Straddle Toggle */}
      <label className="flex items-center gap-1.5 cursor-pointer select-none group">
        <div
          onClick={() => setStraddleNextHand(!straddleNextHand)}
          className={cn(
            "w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center transition-all",
            straddleNextHand 
              ? "bg-amber-500 border-amber-400" 
              : "border-white/30 bg-transparent group-hover:border-white/50"
          )}
        >
          {straddleNextHand && <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" strokeWidth={3} />}
        </div>
        <span className={cn(
          "text-xs sm:text-sm font-medium transition-colors",
          straddleNextHand ? "text-amber-400" : "text-white/60 group-hover:text-white/80"
        )}>
          <span className="hidden sm:inline">Straddle </span>×1
        </span>
      </label>
      
      {/* Mississippi indicator */}
      {isMississippi && (
        <span className="text-[10px] text-orange-400/70 italic hidden sm:inline">
          (любая позиция)
        </span>
      )}
      
      {/* Manual Straddle Button - show when in straddle window */}
      <AnimatePresence mode="wait">
        {isStraddleWindow && !hasRequestedStraddle && !autoStraddleEnabled && !straddleNextHand && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
          >
            <Button
              onClick={handleManualStraddle}
              size="sm"
              className={cn(
                "gap-1 text-xs font-bold rounded-full px-2 sm:px-3 h-7 sm:h-8",
                isMississippi
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 shadow-orange-500/30"
                  : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 shadow-purple-500/30",
                "shadow-lg"
              )}
            >
              <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Post </span>Straddle
            </Button>
          </motion.div>
        )}
        
        {/* Confirmation indicator */}
        {showConfirmation && (
          <motion.span
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "text-xs flex items-center gap-1 font-medium",
              isMississippi ? "text-orange-400" : "text-green-400"
            )}
          >
            <Check className="w-3.5 h-3.5" />
            Straddle {formatAmount(straddleAmount)} ✓
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
});

export default StraddleControls;
