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
        'px-3 py-1.5 text-xs font-bold transition-all uppercase tracking-wider',
        'border bg-black/40 text-white/80',
        'hover:bg-black/60 active:scale-95',
        isActive 
          ? 'border-orange-500 text-orange-400 bg-orange-500/20 shadow-[0_0_15px_rgba(255,122,0,0.3)]' 
          : 'border-orange-500/30 hover:border-orange-500/50'
      )}
      style={{
        clipPath: 'polygon(8% 0%, 92% 0%, 100% 35%, 100% 65%, 92% 100%, 8% 100%, 0% 65%, 0% 35%)'
      }}
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
        'flex-1 max-w-[100px] h-14 font-black text-white uppercase tracking-wide',
        'flex flex-col items-center justify-center gap-0.5',
        'transition-all active:scale-95 disabled:opacity-50',
        gradient,
        pulsing && 'animate-pulse'
      )}
      style={{
        clipPath: 'polygon(5% 0%, 95% 0%, 100% 20%, 100% 80%, 95% 100%, 5% 100%, 0% 80%, 0% 20%)',
        boxShadow: pulsing ? '0 0 20px rgba(255, 122, 0, 0.5)' : '0 4px 15px rgba(0,0,0,0.4)'
      }}
    >
      <span className="text-sm font-black">{label}</span>
      {subLabel && (
        <span className="text-[10px] opacity-90 font-bold">{subLabel}</span>
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
          className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe"
          style={{
            background: 'linear-gradient(to top, rgba(10,10,10,0.98) 0%, rgba(26,26,26,0.95) 70%, transparent 100%)',
            borderTop: '1px solid rgba(255, 122, 0, 0.2)'
          }}
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

          {/* Slider - Syndikate orange */}
          <div className="mx-auto max-w-sm mb-4">
            <input
              type="range"
              min={minRaise}
              max={maxBet}
              value={raiseAmount}
              onChange={handleSliderChange}
              className="w-full h-2 appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #ff7a00 0%, #ff7a00 ${sliderProgress}%, rgba(255,122,0,0.2) ${sliderProgress}%, rgba(255,122,0,0.2) 100%)`,
                borderRadius: '0px'
              }}
            />
            <div 
              className="text-center font-black text-xl mt-2"
              style={{ 
                color: '#ff7a00',
                textShadow: '0 0 15px rgba(255, 122, 0, 0.5)'
              }}
            >
              {raiseAmount.toLocaleString()}
            </div>
          </div>

          {/* Action buttons - Syndikate brutal style */}
          <div className="flex justify-center gap-3 max-w-md mx-auto">
            <ActionButton
              action="fold"
              label="Fold"
              gradient="bg-gradient-to-b from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 border border-gray-600"
              onClick={handleFold}
            />
            
            {canCheck ? (
              <ActionButton
                action="check"
                label="Check"
                gradient="bg-gradient-to-b from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 border border-blue-500"
                onClick={handleCheck}
              />
            ) : (
              <ActionButton
                action="call"
                label="Call"
                subLabel={callAmount.toLocaleString()}
                gradient="bg-gradient-to-b from-green-700 to-green-800 hover:from-green-600 hover:to-green-700 border border-green-500"
                onClick={handleCall}
                disabled={callAmount > maxBet}
              />
            )}

            <ActionButton
              action="raise"
              label="Raise"
              subLabel={raiseAmount.toLocaleString()}
              gradient="bg-gradient-to-b from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 border border-orange-400"
              onClick={handleRaise}
              disabled={raiseAmount > maxBet}
            />

            {maxBet <= callAmount * 4 && (
              <ActionButton
                action="allin"
                label="All-In"
                subLabel={maxBet.toLocaleString()}
                gradient="bg-gradient-to-b from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 border border-red-500"
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
