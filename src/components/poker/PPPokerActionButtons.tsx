import React, { memo, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TimerBar } from './PlayerActionTimer';
import { formatChipAmount } from './AnimatedChips';

interface PPPokerActionButtonsProps {
  isMyTurn: boolean;
  canCheck: boolean;
  callAmount: number;
  minRaise: number;
  maxRaise: number;
  currentBet: number;
  pot: number;
  myStack: number;
  timeRemaining?: number | null;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: (amount: number) => void;
  onAllIn: () => void;
  disabled?: boolean;
}

const BET_PRESETS = [
  { label: '1/3', multiplier: 1/3 },
  { label: '1/2', multiplier: 0.5 },
  { label: '2/3', multiplier: 2/3 },
  { label: 'POT', multiplier: 1 },
];

export const PPPokerActionButtons = memo(function PPPokerActionButtons({
  isMyTurn,
  canCheck,
  callAmount,
  minRaise,
  maxRaise,
  currentBet,
  pot,
  myStack,
  timeRemaining,
  onFold,
  onCheck,
  onCall,
  onRaise,
  onAllIn,
  disabled = false
}: PPPokerActionButtonsProps) {
  const [betAmount, setBetAmount] = useState(minRaise);
  const [showSlider, setShowSlider] = useState(false);

  useEffect(() => {
    setBetAmount(Math.max(minRaise, Math.min(betAmount, maxRaise)));
  }, [minRaise, maxRaise]);

  useEffect(() => {
    if (!isMyTurn) setShowSlider(false);
  }, [isMyTurn]);

  const handlePreset = useCallback((multiplier: number) => {
    const potBet = Math.floor(pot * multiplier);
    const newAmount = Math.max(minRaise, Math.min(potBet, maxRaise));
    setBetAmount(newAmount);
  }, [pot, minRaise, maxRaise]);

  const adjustBet = useCallback((delta: number) => {
    setBetAmount(prev => Math.max(minRaise, Math.min(prev + delta, maxRaise)));
  }, [minRaise, maxRaise]);

  const handleRaise = useCallback(() => {
    onRaise(betAmount);
    setShowSlider(false);
  }, [betAmount, onRaise]);

  if (!isMyTurn) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-3 p-4 bg-black/70 backdrop-blur-sm rounded-t-2xl"
      >
        <span className="text-white/50 text-sm font-medium">Ожидание хода...</span>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      className="flex flex-col gap-2 p-3 bg-gradient-to-t from-black via-black/95 to-black/80 backdrop-blur-md rounded-t-2xl border-t border-white/10"
    >
      {/* Timer bar */}
      {timeRemaining !== null && timeRemaining !== undefined && (
        <TimerBar timeRemaining={timeRemaining} totalTime={15} className="mb-1" />
      )}

      {/* Bet slider & presets */}
      <AnimatePresence>
        {showSlider && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 pb-3 border-b border-white/10">
              {/* Preset buttons */}
              <div className="flex gap-2 justify-center">
                {BET_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => handlePreset(preset.multiplier)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                      "bg-slate-700/80 hover:bg-slate-600 text-white",
                      "active:scale-95"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Slider with +/- */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => adjustBet(-Math.max(minRaise, 20))}
                  className="w-9 h-9 flex items-center justify-center bg-slate-700/80 hover:bg-slate-600 text-white rounded-lg active:scale-95"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
                
                <div className="flex-1 flex flex-col items-center gap-1">
                  <Slider
                    value={[betAmount]}
                    onValueChange={([val]) => setBetAmount(val)}
                    min={minRaise}
                    max={maxRaise}
                    step={Math.max(1, Math.floor(minRaise / 4))}
                    className="w-full"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold text-xl">
                      {formatChipAmount(betAmount)}
                    </span>
                    <button
                      onClick={() => setShowSlider(false)}
                      className="p-1 text-white/50 hover:text-white/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => adjustBet(Math.max(minRaise, 20))}
                  className="w-9 h-9 flex items-center justify-center bg-slate-700/80 hover:bg-slate-600 text-white rounded-lg active:scale-95"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main action buttons */}
      <div className="flex gap-2">
        {/* Fold */}
        <Button
          onClick={onFold}
          disabled={disabled}
          className={cn(
            "flex-1 h-14 text-base font-bold rounded-xl transition-all",
            "bg-gradient-to-b from-slate-600 to-slate-700",
            "hover:from-slate-500 hover:to-slate-600",
            "active:scale-[0.98] shadow-lg",
            "border-t border-slate-500/50"
          )}
        >
          <span className="text-white/90">Fold</span>
        </Button>

        {/* Check / Call */}
        {canCheck ? (
          <Button
            onClick={onCheck}
            disabled={disabled}
            className={cn(
              "flex-1 h-14 text-base font-bold rounded-xl transition-all",
              "bg-gradient-to-b from-blue-500 to-blue-600",
              "hover:from-blue-400 hover:to-blue-500",
              "active:scale-[0.98] shadow-lg shadow-blue-500/25",
              "border-t border-blue-400/50"
            )}
          >
            <span className="text-white">Check</span>
          </Button>
        ) : (
          <Button
            onClick={onCall}
            disabled={disabled || callAmount > myStack}
            className={cn(
              "flex-1 h-14 flex-col py-1 text-base font-bold rounded-xl transition-all",
              "bg-gradient-to-b from-green-500 to-green-600",
              "hover:from-green-400 hover:to-green-500",
              "active:scale-[0.98] shadow-lg shadow-green-500/25",
              "border-t border-green-400/50",
              callAmount > myStack && "opacity-50"
            )}
          >
            <span className="text-white text-sm">Call</span>
            <span className="text-white/80 text-xs">{formatChipAmount(callAmount)}</span>
          </Button>
        )}

        {/* Raise / Bet */}
        {showSlider ? (
          <Button
            onClick={handleRaise}
            disabled={disabled || betAmount > myStack}
            className={cn(
              "flex-1 h-14 flex-col py-1 text-base font-bold rounded-xl transition-all",
              "bg-gradient-to-b from-amber-500 to-amber-600",
              "hover:from-amber-400 hover:to-amber-500",
              "active:scale-[0.98] shadow-lg shadow-amber-500/25",
              "border-t border-amber-400/50"
            )}
          >
            <span className="text-white text-sm">{currentBet > 0 ? 'Raise' : 'Bet'}</span>
            <span className="text-white/80 text-xs">{formatChipAmount(betAmount)}</span>
          </Button>
        ) : (
          <Button
            onClick={() => setShowSlider(true)}
            disabled={disabled || minRaise > myStack}
            className={cn(
              "flex-1 h-14 text-base font-bold rounded-xl transition-all",
              "bg-gradient-to-b from-amber-500 to-amber-600",
              "hover:from-amber-400 hover:to-amber-500",
              "active:scale-[0.98] shadow-lg shadow-amber-500/25",
              "border-t border-amber-400/50"
            )}
          >
            <span className="text-white">{currentBet > 0 ? 'Raise' : 'Bet'}</span>
          </Button>
        )}

        {/* All-In */}
        <Button
          onClick={onAllIn}
          disabled={disabled}
          className={cn(
            "h-14 px-4 text-base font-bold rounded-xl transition-all",
            "bg-gradient-to-b from-purple-500 to-purple-700",
            "hover:from-purple-400 hover:to-purple-600",
            "active:scale-[0.98] shadow-lg shadow-purple-500/25",
            "border-t border-purple-400/50"
          )}
        >
          <Zap className="w-5 h-5 text-white" />
        </Button>
      </div>
    </motion.div>
  );
});
