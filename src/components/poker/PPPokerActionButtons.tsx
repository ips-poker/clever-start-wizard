import React, { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, Zap } from 'lucide-react';

interface PPPokerActionButtonsProps {
  isMyTurn: boolean;
  canCheck: boolean;
  callAmount: number;
  minRaise: number;
  maxRaise: number;
  currentBet: number;
  pot: number;
  myStack: number;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: (amount: number) => void;
  onAllIn: () => void;
  disabled?: boolean;
}

// PPPoker-style bet presets
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
  onFold,
  onCheck,
  onCall,
  onRaise,
  onAllIn,
  disabled = false
}: PPPokerActionButtonsProps) {
  const [betAmount, setBetAmount] = useState(minRaise);
  const [showSlider, setShowSlider] = useState(false);

  // Update bet amount when minRaise changes
  React.useEffect(() => {
    setBetAmount(Math.max(minRaise, betAmount));
  }, [minRaise]);

  const handlePreset = useCallback((multiplier: number) => {
    const potBet = Math.floor(pot * multiplier);
    const newAmount = Math.max(minRaise, Math.min(potBet, maxRaise));
    setBetAmount(newAmount);
  }, [pot, minRaise, maxRaise]);

  const adjustBet = useCallback((delta: number) => {
    setBetAmount(prev => {
      const newAmount = prev + delta;
      return Math.max(minRaise, Math.min(newAmount, maxRaise));
    });
  }, [minRaise, maxRaise]);

  const handleRaise = useCallback(() => {
    onRaise(betAmount);
    setShowSlider(false);
  }, [betAmount, onRaise]);

  if (!isMyTurn) {
    return (
      <div className="flex items-center justify-center gap-3 p-3 bg-black/50 backdrop-blur-sm rounded-t-2xl">
        <span className="text-white/50 text-sm font-medium">Ожидание хода...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-gradient-to-t from-black via-black/95 to-black/80 backdrop-blur-sm rounded-t-2xl">
      {/* Bet slider & presets (when raised) */}
      {showSlider && (
        <div className="flex flex-col gap-2 pb-2 border-b border-white/10">
          {/* Preset buttons */}
          <div className="flex gap-2 justify-center">
            {BET_PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset.multiplier)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Slider with +/- buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => adjustBet(-minRaise)}
              className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
            
            <div className="flex-1 flex flex-col items-center">
              <Slider
                value={[betAmount]}
                onValueChange={([val]) => setBetAmount(val)}
                min={minRaise}
                max={maxRaise}
                step={Math.max(1, Math.floor(minRaise / 2))}
                className="w-full"
              />
              <span className="text-amber-400 font-bold text-lg mt-1">
                {betAmount.toLocaleString()}
              </span>
            </div>

            <button
              onClick={() => adjustBet(minRaise)}
              className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main action buttons - PPPoker style */}
      <div className="flex gap-2">
        {/* Fold */}
        <Button
          onClick={onFold}
          disabled={disabled}
          className={cn(
            "flex-1 h-14 text-base font-bold rounded-xl transition-all",
            "bg-gradient-to-b from-slate-600 to-slate-700",
            "hover:from-slate-500 hover:to-slate-600",
            "active:scale-95 shadow-lg",
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
              "active:scale-95 shadow-lg shadow-blue-500/30",
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
              "active:scale-95 shadow-lg shadow-green-500/30",
              "border-t border-green-400/50"
            )}
          >
            <span className="text-white text-sm">Call</span>
            <span className="text-white/90 text-xs">{callAmount.toLocaleString()}</span>
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
              "active:scale-95 shadow-lg shadow-amber-500/30",
              "border-t border-amber-400/50"
            )}
          >
            <span className="text-white text-sm">{currentBet > 0 ? 'Raise' : 'Bet'}</span>
            <span className="text-white/90 text-xs">{betAmount.toLocaleString()}</span>
          </Button>
        ) : (
          <Button
            onClick={() => setShowSlider(true)}
            disabled={disabled || minRaise > myStack}
            className={cn(
              "flex-1 h-14 text-base font-bold rounded-xl transition-all",
              "bg-gradient-to-b from-amber-500 to-amber-600",
              "hover:from-amber-400 hover:to-amber-500",
              "active:scale-95 shadow-lg shadow-amber-500/30",
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
            "active:scale-95 shadow-lg shadow-purple-500/30",
            "border-t border-purple-400/50"
          )}
        >
          <Zap className="w-5 h-5 text-white" />
        </Button>
      </div>
    </div>
  );
});
