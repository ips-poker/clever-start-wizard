/**
 * Straddle Controls Component - PokerStars Style
 * Shows straddle options during pre-action phase (waiting for turn)
 * - Auto-Straddle: automatically post straddle when in UTG position
 * - Straddle Next Hand: one-time straddle for the next hand
 * - Mississippi Straddle: straddle from any position (before button acts)
 */

import React, { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Zap, Check, RotateCcw } from 'lucide-react';
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
  
  const straddleAmount = bigBlind * 2;
  const canAffordStraddle = playerStack >= straddleAmount;
  
  // Determine if straddle window is open
  // Regular straddle: only available when in UTG position (seat after BB)
  // Mississippi straddle: available from any position before button acts
  const isStraddleWindow = 
    phase === 'waiting' || 
    phase === 'showdown' || 
    (phase === 'preflop' && !currentPlayerSeat);
  
  // Check if player is in UTG position (first to act after BB)
  // For regular straddle, only UTG can straddle
  // For Mississippi, anyone except blinds can straddle
  const canPostRegularStraddle = straddleEnabled && !mississippiStraddleEnabled;
  const canPostMississippi = straddleEnabled && mississippiStraddleEnabled;
  
  // Reset straddle request when new hand starts
  useEffect(() => {
    if (handId) {
      setHasRequestedStraddle(false);
    }
  }, [handId]);
  
  // Auto-post straddle when new hand starts and auto-straddle is enabled
  useEffect(() => {
    if (
      autoStraddleEnabled && 
      isStraddleWindow && 
      canAffordStraddle && 
      !hasRequestedStraddle &&
      (straddleEnabled || mississippiStraddleEnabled)
    ) {
      // Auto-post with small delay
      const timer = setTimeout(() => {
        onStraddleRequest();
        setHasRequestedStraddle(true);
      }, 500);
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
    }
  }, [straddleNextHand, isStraddleWindow, canAffordStraddle, hasRequestedStraddle, straddleEnabled, mississippiStraddleEnabled, onStraddleRequest]);
  
  const handleManualStraddle = useCallback(() => {
    if (!hasRequestedStraddle && canAffordStraddle) {
      onStraddleRequest();
      setHasRequestedStraddle(true);
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
  
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {/* Auto-Straddle Toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none group">
        <div
          onClick={() => onAutoStraddleChange(!autoStraddleEnabled)}
          className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
            autoStraddleEnabled 
              ? "bg-purple-500 border-purple-400" 
              : "border-white/30 bg-transparent group-hover:border-white/50"
          )}
        >
          {autoStraddleEnabled && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
        <span className={cn(
          "text-sm font-medium transition-colors flex items-center gap-1.5",
          autoStraddleEnabled ? "text-purple-400" : "text-white/60 group-hover:text-white/80"
        )}>
          <RotateCcw className="w-3.5 h-3.5" />
          Auto-Straddle
        </span>
      </label>
      
      {/* One-time Straddle Toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none group">
        <div
          onClick={() => setStraddleNextHand(!straddleNextHand)}
          className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
            straddleNextHand 
              ? "bg-amber-500 border-amber-400" 
              : "border-white/30 bg-transparent group-hover:border-white/50"
          )}
        >
          {straddleNextHand && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
        <span className={cn(
          "text-sm font-medium transition-colors",
          straddleNextHand ? "text-amber-400" : "text-white/60 group-hover:text-white/80"
        )}>
          Straddle (x1)
        </span>
      </label>
      
      {/* Mississippi Straddle info */}
      {mississippiStraddleEnabled && (
        <span className="text-[10px] text-orange-400/70 italic">
          Mississippi
        </span>
      )}
      
      {/* Manual Straddle Button - show when in straddle window */}
      <AnimatePresence>
        {isStraddleWindow && !hasRequestedStraddle && !autoStraddleEnabled && !straddleNextHand && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Button
              onClick={handleManualStraddle}
              size="sm"
              className={cn(
                "gap-1.5 text-xs font-bold rounded-full px-3 h-8",
                mississippiStraddleEnabled
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400"
                  : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400"
              )}
            >
              <Zap className="w-3.5 h-3.5" />
              Straddle {straddleAmount}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Already posted indicator */}
      {hasRequestedStraddle && (
        <span className="text-xs text-green-400 flex items-center gap-1">
          <Check className="w-3.5 h-3.5" />
          Straddle posted
        </span>
      )}
    </div>
  );
});

export default StraddleControls;
