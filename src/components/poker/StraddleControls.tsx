/**
 * Straddle Controls Component - PokerStars/PPPoker Industry Standard
 * 
 * INDUSTRY STANDARD RULES:
 * 1. Regular Straddle: ONLY from UTG position (first player after BB)
 * 2. Mississippi Straddle: ONLY from Button position
 * 3. Amount: always 2× Big Blind (fixed, not a raise)
 * 4. Straddle is a LIVE blind - straddler can raise if action returns uncapped
 * 
 * UI Features:
 * - Auto-Straddle: automatically post straddle every hand when in valid position
 * - Straddle Next Hand: one-time straddle for the next hand
 * - Position validation: only shows when player is in valid straddle position
 */

import React, { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Zap, Check, RotateCcw, DollarSign, AlertCircle, Target } from 'lucide-react';
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
  const [straddleNextHand, setStraddleNextHand] = useState(false);
  const [hasRequestedStraddle, setHasRequestedStraddle] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const straddleAmount = bigBlind * 2;
  const canAffordStraddle = playerStack >= straddleAmount;
  
  // POKERSTARS STANDARD: Calculate UTG position (first after BB)
  const utgSeat = useMemo(() => {
    if (!bigBlindSeat || players.length < 3) return null;
    
    const activePlayers = players
      .filter(p => p.status === 'active' || !p.status) // Include if status not provided
      .sort((a, b) => a.seatNumber - b.seatNumber);
    
    if (activePlayers.length < 3) return null;
    
    const bbIdx = activePlayers.findIndex(p => p.seatNumber === bigBlindSeat);
    if (bbIdx === -1) return null;
    
    // UTG is the next player after BB
    const utgIdx = (bbIdx + 1) % activePlayers.length;
    return activePlayers[utgIdx]?.seatNumber ?? null;
  }, [bigBlindSeat, players]);
  
  // Determine straddle eligibility based on position
  const straddleEligibility = useMemo((): 'utg' | 'button' | null => {
    if (mySeat === null) return null;
    
    // Mississippi (Button) straddle - only from button
    if (mississippiStraddleEnabled && mySeat === dealerSeat) {
      return 'button';
    }
    
    // Regular UTG straddle - only from UTG position
    if (straddleEnabled && mySeat === utgSeat) {
      return 'utg';
    }
    
    return null;
  }, [mySeat, dealerSeat, utgSeat, straddleEnabled, mississippiStraddleEnabled]);
  
  const canStraddle = straddleEligibility !== null && canAffordStraddle;
  const isMississippi = straddleEligibility === 'button';
  
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
      canStraddle && 
      !hasRequestedStraddle
    ) {
      // Auto-post with small delay for visual feedback
      const timer = setTimeout(() => {
        onStraddleRequest();
        setHasRequestedStraddle(true);
        setShowConfirmation(true);
        setTimeout(() => setShowConfirmation(false), 2000);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoStraddleEnabled, isStraddleWindow, canStraddle, hasRequestedStraddle, onStraddleRequest]);
  
  // Handle one-time straddle checkbox
  useEffect(() => {
    if (
      straddleNextHand && 
      isStraddleWindow && 
      canStraddle && 
      !hasRequestedStraddle
    ) {
      onStraddleRequest();
      setHasRequestedStraddle(true);
      setStraddleNextHand(false); // Reset one-time straddle
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 2000);
    }
  }, [straddleNextHand, isStraddleWindow, canStraddle, hasRequestedStraddle, onStraddleRequest]);
  
  const handleManualStraddle = useCallback(() => {
    if (!hasRequestedStraddle && canStraddle) {
      onStraddleRequest();
      setHasRequestedStraddle(true);
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 2000);
    }
  }, [hasRequestedStraddle, canStraddle, onStraddleRequest]);
  
  // Don't show if both straddle types are disabled
  if (!straddleEnabled && !mississippiStraddleEnabled) {
    return null;
  }
  
  // Don't show if player is not at table
  if (mySeat === null) {
    return null;
  }
  
  // Show position indicator if not in valid straddle position
  if (!canStraddle) {
    // Only show info if straddle is possible on this table
    const positionHint = straddleEnabled && !mississippiStraddleEnabled
      ? `UTG only (seat ${utgSeat ?? '?'})`
      : mississippiStraddleEnabled && !straddleEnabled
        ? `Button only (seat ${dealerSeat ?? '?'})`
        : `UTG (${utgSeat ?? '?'}) or Button (${dealerSeat ?? '?'})`;
    
    return (
      <div className="flex items-center gap-2 opacity-50">
        <AlertCircle className="w-3.5 h-3.5 text-white/40" />
        <span className="text-xs text-white/40">
          Straddle: {positionHint}
        </span>
      </div>
    );
  }
  
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      {/* Position badge - shows UTG or BTN */}
      <div className={cn(
        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide",
        isMississippi 
          ? "bg-orange-500/30 text-orange-300 border border-orange-500/40"
          : "bg-purple-500/30 text-purple-300 border border-purple-500/40"
      )}>
        <Target className="w-2.5 h-2.5" />
        <span>{isMississippi ? 'BTN' : 'UTG'}</span>
      </div>
      
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
