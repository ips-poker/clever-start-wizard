import React, { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'allin';

interface StableActionPanelProps {
  isVisible: boolean;
  canCheck: boolean;
  callAmount: number;
  minRaise: number;
  maxBet: number;
  currentPot: number;
  onAction: (action: ActionType, amount?: number) => void;
}

// Preset button component
const PresetButton = memo(function PresetButton({
  label,
  amount,
  isActive,
  onClick
}: {
  label: string;
  amount: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
        'border border-white/20 bg-white/5 text-white/80',
        'hover:bg-white/15 active:scale-95',
        isActive && 'bg-amber-600/40 border-amber-500 text-amber-300'
      )}
    >
      {label}
    </button>
  );
}, (prev, next) => 
  prev.label === next.label && 
  prev.amount === next.amount && 
  prev.isActive === next.isActive
);

// Main action button component
const ActionButton = memo(function ActionButton({
  action,
  label,
  subLabel,
  gradient,
  onClick,
  disabled = false,
  pulsing = false
}: {
  action: ActionType;
  label: string;
  subLabel?: string;
  gradient: string;
  onClick: () => void;
  disabled?: boolean;
  pulsing?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex-1 max-w-[100px] h-12 rounded-xl font-bold text-white shadow-lg',
        'flex flex-col items-center justify-center gap-0.5',
        'transition-all active:scale-95 disabled:opacity-50',
        gradient,
        pulsing && 'animate-pulse'
      )}
    >
      <span className="text-sm">{label}</span>
      {subLabel && (
        <span className="text-[10px] opacity-80">{subLabel}</span>
      )}
    </button>
  );
}, (prev, next) => 
  prev.label === next.label && 
  prev.subLabel === next.subLabel && 
  prev.disabled === next.disabled
);

export const StableActionPanel = memo(function StableActionPanel({
  isVisible,
  canCheck,
  callAmount,
  minRaise,
  maxBet,
  currentPot,
  onAction
}: StableActionPanelProps) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);

  // Reset raise amount when minRaise changes
  useEffect(() => {
    setRaiseAmount(minRaise);
  }, [minRaise]);

  // Calculate presets based on pot
  const presets = useMemo(() => {
    const pot = currentPot || callAmount * 3;
    return [
      { label: '½ Pot', amount: Math.max(minRaise, Math.floor(pot * 0.5)) },
      { label: '¾ Pot', amount: Math.max(minRaise, Math.floor(pot * 0.75)) },
      { label: 'Pot', amount: Math.max(minRaise, pot) },
      { label: '2× Pot', amount: Math.max(minRaise, pot * 2) }
    ].filter(p => p.amount <= maxBet);
  }, [currentPot, callAmount, minRaise, maxBet]);

  // Handlers
  const handleFold = useCallback(() => onAction('fold'), [onAction]);
  const handleCheck = useCallback(() => onAction('check'), [onAction]);
  const handleCall = useCallback(() => onAction('call'), [onAction]);
  const handleRaise = useCallback(() => onAction('raise', raiseAmount), [onAction, raiseAmount]);
  const handleAllIn = useCallback(() => onAction('allin'), [onAction]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRaiseAmount(Number(e.target.value));
  }, []);

  // Calculate slider fill percentage
  const sliderProgress = useMemo(() => {
    if (maxBet <= minRaise) return 100;
    return ((raiseAmount - minRaise) / (maxBet - minRaise)) * 100;
  }, [raiseAmount, minRaise, maxBet]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-gray-900 via-gray-900/98 to-transparent"
        >
          {/* Presets */}
          <div className="flex justify-center gap-2 mb-3">
            {presets.map((preset) => (
              <PresetButton
                key={preset.label}
                label={preset.label}
                amount={preset.amount}
                isActive={raiseAmount === preset.amount}
                onClick={() => setRaiseAmount(preset.amount)}
              />
            ))}
          </div>

          {/* Slider */}
          <div className="mx-auto max-w-sm mb-4">
            <input
              type="range"
              min={minRaise}
              max={maxBet}
              value={raiseAmount}
              onChange={handleSliderChange}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${sliderProgress}%, rgba(255,255,255,0.2) ${sliderProgress}%, rgba(255,255,255,0.2) 100%)`
              }}
            />
            <div className="text-center text-amber-400 font-bold text-lg mt-1">
              {raiseAmount.toLocaleString()}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-center gap-3 max-w-md mx-auto">
            <ActionButton
              action="fold"
              label="Fold"
              gradient="bg-gradient-to-b from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600"
              onClick={handleFold}
            />
            
            {canCheck ? (
              <ActionButton
                action="check"
                label="Check"
                gradient="bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600"
                onClick={handleCheck}
              />
            ) : (
              <ActionButton
                action="call"
                label="Call"
                subLabel={callAmount.toLocaleString()}
                gradient="bg-gradient-to-b from-green-600 to-green-700 hover:from-green-500 hover:to-green-600"
                onClick={handleCall}
                disabled={callAmount > maxBet}
              />
            )}

            <ActionButton
              action="raise"
              label="Raise"
              subLabel={raiseAmount.toLocaleString()}
              gradient="bg-gradient-to-b from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600"
              onClick={handleRaise}
              disabled={raiseAmount > maxBet}
            />

            {maxBet <= callAmount * 4 && (
              <ActionButton
                action="allin"
                label="All-In"
                subLabel={maxBet.toLocaleString()}
                gradient="bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600"
                onClick={handleAllIn}
                pulsing
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}, (prev, next) => {
  return (
    prev.isVisible === next.isVisible &&
    prev.canCheck === next.canCheck &&
    prev.callAmount === next.callAmount &&
    prev.minRaise === next.minRaise &&
    prev.maxBet === next.maxBet &&
    prev.currentPot === next.currentPot
  );
});

export default StableActionPanel;
