import React, { memo, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
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
  myCurrentBet?: number;
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

// Pre-action types
type PreAction = 'fold' | 'check' | 'call' | 'callAny' | null;

export const PPPokerActionButtons = memo(function PPPokerActionButtons({
  isMyTurn,
  canCheck,
  callAmount,
  minRaise,
  maxRaise,
  currentBet,
  pot,
  myStack,
  myCurrentBet = 0,
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
  const [preAction, setPreAction] = useState<PreAction>(null);

  useEffect(() => {
    setBetAmount(Math.max(minRaise, Math.min(betAmount, maxRaise)));
  }, [minRaise, maxRaise]);

  useEffect(() => {
    if (!isMyTurn) setShowSlider(false);
  }, [isMyTurn]);

  // Execute pre-action when turn comes
  useEffect(() => {
    if (isMyTurn && preAction && !disabled) {
      const timeout = setTimeout(() => {
        switch (preAction) {
          case 'fold':
            onFold();
            break;
          case 'check':
            if (canCheck) onCheck();
            break;
          case 'call':
            if (!canCheck && callAmount <= myStack) onCall();
            break;
          case 'callAny':
            if (canCheck) {
              onCheck();
            } else if (callAmount <= myStack) {
              onCall();
            }
            break;
        }
        setPreAction(null);
      }, 300); // Small delay for visual feedback
      return () => clearTimeout(timeout);
    }
  }, [isMyTurn, preAction, canCheck, callAmount, myStack, disabled, onFold, onCheck, onCall]);

  // Reset pre-action when situation changes significantly
  useEffect(() => {
    if (preAction === 'call' && canCheck) {
      setPreAction(null);
    }
  }, [canCheck, preAction]);

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

  const togglePreAction = useCallback((action: PreAction) => {
    setPreAction(prev => prev === action ? null : action);
  }, []);

  // Pre-action checkboxes when not my turn
  if (!isMyTurn) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2 p-3 bg-black/70 backdrop-blur-sm rounded-t-2xl"
      >
        <span className="text-white/50 text-xs font-medium text-center">Ожидание хода...</span>
        
        {/* Pre-action checkboxes */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {/* Fold checkbox */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <Checkbox 
              checked={preAction === 'fold'}
              onCheckedChange={() => togglePreAction('fold')}
              className={cn(
                "border-red-400/50 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500",
                "transition-all"
              )}
            />
            <span className={cn(
              "text-sm transition-colors",
              preAction === 'fold' ? "text-red-400 font-medium" : "text-white/60 group-hover:text-white/80"
            )}>
              Fold
            </span>
          </label>

          {/* Check/Fold checkbox */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <Checkbox 
              checked={preAction === 'check'}
              onCheckedChange={() => togglePreAction('check')}
              className={cn(
                "border-blue-400/50 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500",
                "transition-all"
              )}
            />
            <span className={cn(
              "text-sm transition-colors",
              preAction === 'check' ? "text-blue-400 font-medium" : "text-white/60 group-hover:text-white/80"
            )}>
              Check/Fold
            </span>
          </label>

          {/* Call checkbox */}
          {callAmount > 0 && callAmount <= myStack && (
            <label className="flex items-center gap-2 cursor-pointer group">
              <Checkbox 
                checked={preAction === 'call'}
                onCheckedChange={() => togglePreAction('call')}
                className={cn(
                  "border-green-400/50 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500",
                  "transition-all"
                )}
              />
              <span className={cn(
                "text-sm transition-colors",
                preAction === 'call' ? "text-green-400 font-medium" : "text-white/60 group-hover:text-white/80"
              )}>
                Call {formatChipAmount(callAmount)}
              </span>
            </label>
          )}

          {/* Call Any checkbox */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <Checkbox 
              checked={preAction === 'callAny'}
              onCheckedChange={() => togglePreAction('callAny')}
              className={cn(
                "border-amber-400/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500",
                "transition-all"
              )}
            />
            <span className={cn(
              "text-sm transition-colors",
              preAction === 'callAny' ? "text-amber-400 font-medium" : "text-white/60 group-hover:text-white/80"
            )}>
              Call Any
            </span>
          </label>
        </div>
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
