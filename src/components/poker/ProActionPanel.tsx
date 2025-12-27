// Professional Poker Action Panel - PPPoker/GGPoker Style
import React, { memo, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Zap, Minus, Plus, Check, X } from 'lucide-react';
import { usePokerSounds } from '@/hooks/usePokerSounds';

interface ProActionPanelProps {
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

// Format chip amount
const formatAmount = (amount: number): string => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toLocaleString();
};

// (Timer ring removed - using SmoothAvatarTimer around the avatar instead)

// Action Button Component
const ActionButton = memo(function ActionButton({
  label,
  subLabel,
  variant,
  onClick,
  disabled = false,
  icon,
  isActive = false,
  flex = 1
}: {
  label: string;
  subLabel?: string;
  variant: 'fold' | 'check' | 'call' | 'raise' | 'allin';
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  isActive?: boolean;
  flex?: number;
}) {
  const variants = {
    fold: {
      bg: 'bg-gray-500/20',
      hover: 'hover:bg-gray-500/30',
      border: 'border-gray-400/30',
      shadow: 'shadow-gray-600/20',
      text: 'text-white/90',
      glow: ''
    },
    check: {
      bg: 'bg-blue-500/25',
      hover: 'hover:bg-blue-500/35',
      border: 'border-blue-400/40',
      shadow: 'shadow-blue-500/30',
      text: 'text-blue-100',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]'
    },
    call: {
      bg: 'bg-emerald-500/25',
      hover: 'hover:bg-emerald-500/35',
      border: 'border-emerald-400/40',
      shadow: 'shadow-emerald-500/30',
      text: 'text-emerald-100',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]'
    },
    raise: {
      bg: isActive ? 'bg-amber-500/35' : 'bg-amber-500/25',
      hover: 'hover:bg-amber-500/35',
      border: 'border-amber-400/40',
      shadow: 'shadow-amber-500/30',
      text: 'text-amber-100',
      glow: isActive ? 'shadow-[0_0_25px_rgba(245,158,11,0.4)]' : 'shadow-[0_0_20px_rgba(245,158,11,0.3)]'
    },
    allin: {
      bg: 'bg-red-500/30',
      hover: 'hover:bg-red-500/40',
      border: 'border-red-400/50',
      shadow: 'shadow-red-500/40',
      text: 'text-red-100',
      glow: 'shadow-[0_0_25px_rgba(239,68,68,0.4)]'
    }
  };

  const v = variants[variant];

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      style={{ flex }}
      className={cn(
        "relative h-14 px-3 rounded-xl font-bold transition-all duration-200",
        "backdrop-blur-md",
        "flex flex-col items-center justify-center gap-0.5",
        "border",
        "active:brightness-110",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        v.bg, v.hover, v.border, v.text, v.glow
      )}
    >
      {/* Glass shine effect */}
      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
      </div>
      
      {icon ? (
        <span className="flex items-center gap-1.5 relative z-10">
          {icon}
          <span className="text-sm font-bold drop-shadow-sm">{label}</span>
        </span>
      ) : (
        <div className="relative z-10">
          <span className="text-sm font-bold drop-shadow-sm">{label}</span>
          {subLabel && (
            <span className="block text-[10px] opacity-80 font-semibold">{subLabel}</span>
          )}
        </div>
      )}
    </motion.button>
  );
});

// Preset Button
const PresetButton = memo(function PresetButton({
  label,
  isActive,
  onClick
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg text-xs font-bold transition-all",
        "border",
        isActive
          ? "bg-amber-500/20 border-amber-400 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
          : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
      )}
    >
      {label}
    </button>
  );
});

// Pre-action Checkbox
const PreActionCheckbox = memo(function PreActionCheckbox({
  label,
  checked,
  onChange,
  variant
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  variant: 'fold' | 'check' | 'call' | 'callAny';
}) {
  const colors = {
    fold: { active: 'text-red-400', border: 'border-red-400', bg: 'bg-red-500' },
    check: { active: 'text-blue-400', border: 'border-blue-400', bg: 'bg-blue-500' },
    call: { active: 'text-emerald-400', border: 'border-emerald-400', bg: 'bg-emerald-500' },
    callAny: { active: 'text-amber-400', border: 'border-amber-400', bg: 'bg-amber-500' }
  };
  const c = colors[variant];

  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={onChange}
        className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
          checked ? `${c.bg} ${c.border}` : "border-white/30 bg-transparent"
        )}
      >
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
      <span className={cn(
        "text-sm font-medium transition-colors",
        checked ? c.active : "text-white/60"
      )}>
        {label}
      </span>
    </label>
  );
});

export const ProActionPanel = memo(function ProActionPanel({
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
}: ProActionPanelProps) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const [showSlider, setShowSlider] = useState(false);
  const [preAction, setPreAction] = useState<'fold' | 'check' | 'call' | 'callAny' | null>(null);
  const sounds = usePokerSounds();

  // Sync raise amount with minRaise
  useEffect(() => {
    setRaiseAmount(Math.max(minRaise, Math.min(raiseAmount, maxRaise)));
  }, [minRaise, maxRaise]);

  // Close slider when turn ends
  useEffect(() => {
    if (!isMyTurn) setShowSlider(false);
  }, [isMyTurn]);

  // Execute pre-action
  useEffect(() => {
    if (isMyTurn && preAction && !disabled) {
      const timeout = setTimeout(() => {
        switch (preAction) {
          case 'fold': 
            sounds.playFold();
            onFold(); 
            break;
          case 'check': 
            if (canCheck) {
              sounds.playCheck();
              onCheck();
            }
            break;
          case 'call': 
            if (!canCheck && callAmount <= myStack) {
              sounds.playCall();
              onCall();
            }
            break;
          case 'callAny':
            if (canCheck) {
              sounds.playCheck();
              onCheck();
            } else if (callAmount <= myStack) {
              sounds.playCall();
              onCall();
            }
            break;
        }
        setPreAction(null);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [isMyTurn, preAction, canCheck, callAmount, myStack, disabled, onFold, onCheck, onCall, sounds]);

  // Handle preset click
  const handlePreset = useCallback((multiplier: number) => {
    const potBet = Math.floor(pot * multiplier);
    setRaiseAmount(Math.max(minRaise, Math.min(potBet, maxRaise)));
  }, [pot, minRaise, maxRaise]);

  // Handle raise confirm
  const handleRaiseConfirm = useCallback(() => {
    const finalAmount = Math.max(raiseAmount, minRaise);
    console.log('[ProActionPanel] handleRaiseConfirm - finalAmount:', finalAmount, 'minRaise:', minRaise, 'maxRaise:', maxRaise);
    sounds.playRaise();
    onRaise(finalAmount);
    setShowSlider(false);
  }, [raiseAmount, minRaise, maxRaise, onRaise, sounds]);

  // Wrapped action handlers with sounds
  const handleFold = useCallback(() => {
    sounds.playFold();
    onFold();
  }, [onFold, sounds]);

  const handleCheck = useCallback(() => {
    sounds.playCheck();
    onCheck();
  }, [onCheck, sounds]);

  const handleCall = useCallback(() => {
    sounds.playCall();
    onCall();
  }, [onCall, sounds]);

  const handleAllIn = useCallback(() => {
    sounds.playAllIn();
    onAllIn();
  }, [onAllIn, sounds]);

  // Step for slider
  const step = Math.max(1, Math.floor(minRaise / 2));

  // Pre-action panel (when not my turn)
  if (!isMyTurn) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6 backdrop-blur-2xl border-t border-white/5"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.12) 70%, rgba(0,0,0,0) 100%)'
        }}
      >
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <PreActionCheckbox
            label="Fold"
            checked={preAction === 'fold'}
            onChange={() => setPreAction(p => p === 'fold' ? null : 'fold')}
            variant="fold"
          />
          <PreActionCheckbox
            label="Check/Fold"
            checked={preAction === 'check'}
            onChange={() => setPreAction(p => p === 'check' ? null : 'check')}
            variant="check"
          />
          {callAmount > 0 && callAmount <= myStack && (
            <PreActionCheckbox
              label={`Call ${formatAmount(callAmount)}`}
              checked={preAction === 'call'}
              onChange={() => setPreAction(p => p === 'call' ? null : 'call')}
              variant="call"
            />
          )}
          <PreActionCheckbox
            label="Call Any"
            checked={preAction === 'callAny'}
            onChange={() => setPreAction(p => p === 'callAny' ? null : 'callAny')}
            variant="callAny"
          />
        </div>
        <p className="text-center text-white/40 text-xs mt-2">Ожидание хода...</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6 backdrop-blur-2xl border-t border-white/5"
      style={{
        background: 'linear-gradient(to top, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.12) 65%, rgba(0,0,0,0) 100%)'
      }}
    >

      {/* Raise slider panel */}
      <AnimatePresence>
        {showSlider && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
              {/* Presets */}
              <div className="flex justify-center gap-2 mb-3">
                <PresetButton
                  label="1/3"
                  isActive={raiseAmount === Math.floor(pot / 3)}
                  onClick={() => handlePreset(1/3)}
                />
                <PresetButton
                  label="1/2"
                  isActive={raiseAmount === Math.floor(pot / 2)}
                  onClick={() => handlePreset(0.5)}
                />
                <PresetButton
                  label="2/3"
                  isActive={raiseAmount === Math.floor(pot * 2/3)}
                  onClick={() => handlePreset(2/3)}
                />
                <PresetButton
                  label="POT"
                  isActive={raiseAmount === pot}
                  onClick={() => handlePreset(1)}
                />
              </div>

              {/* Slider with controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRaiseAmount(a => Math.max(minRaise, a - step))}
                  className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-5 h-5 text-white" />
                </button>

                <div className="flex-1">
                  <input
                    type="range"
                    min={minRaise}
                    max={maxRaise}
                    value={raiseAmount}
                    onChange={(e) => setRaiseAmount(Number(e.target.value))}
                    step={step}
                    className="w-full h-2 appearance-none cursor-pointer rounded-full"
                    style={{
                      background: `linear-gradient(to right, #f59e0b ${((raiseAmount - minRaise) / (maxRaise - minRaise)) * 100}%, rgba(255,255,255,0.2) ${((raiseAmount - minRaise) / (maxRaise - minRaise)) * 100}%)`
                    }}
                  />
                  <div className="text-center mt-2">
                    <span className="text-2xl font-black text-amber-400">
                      {formatAmount(raiseAmount)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setRaiseAmount(a => Math.min(maxRaise, a + step))}
                  className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Close button */}
              <button
                onClick={() => setShowSlider(false)}
                className="absolute top-2 right-2 p-1 text-white/40 hover:text-white/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main action buttons */}
      <div className="flex gap-2">
        <ActionButton
          label="Fold"
          variant="fold"
          onClick={handleFold}
          disabled={disabled}
        />

        {canCheck ? (
          <ActionButton
            label="Check"
            variant="check"
            onClick={handleCheck}
            disabled={disabled}
          />
        ) : (
          <ActionButton
            label="Call"
            subLabel={formatAmount(callAmount)}
            variant="call"
            onClick={handleCall}
            disabled={disabled || callAmount > myStack}
          />
        )}

        {/* Raise/Bet button - show slider on first click, confirm on second */}
        {showSlider ? (
          // When slider is open, show CONFIRM button
          <ActionButton
            label="Confirm"
            subLabel={formatAmount(raiseAmount)}
            variant="raise"
            onClick={() => {
              console.log('[ProActionPanel] Confirm clicked, raiseAmount:', raiseAmount, 'minRaise:', minRaise, 'maxRaise:', maxRaise);
              handleRaiseConfirm();
            }}
            disabled={disabled}
            isActive={true}
          />
        ) : (
          // When slider is closed, show Raise/Bet button
          <ActionButton
            label={currentBet > 0 ? "Raise" : "Bet"}
            variant="raise"
            onClick={() => {
              console.log('[ProActionPanel] Raise/Bet clicked, opening slider. minRaise:', minRaise, 'maxRaise:', maxRaise, 'myStack:', myStack);
              setShowSlider(true);
            }}
            disabled={disabled || minRaise > myStack}
          />
        )}

        <ActionButton
          label="All-In"
          subLabel={formatAmount(myStack)}
          variant="allin"
          onClick={handleAllIn}
          disabled={disabled}
          icon={<Zap className="w-4 h-4" />}
          flex={0.8}
        />
      </div>

      {/* Stack info */}
      <div className="flex justify-center mt-2">
        <span className="text-white/50 text-xs">
          Стек: <span className="text-amber-400 font-bold">{formatAmount(myStack)}</span>
        </span>
      </div>
    </motion.div>
  );
});

export default ProActionPanel;
