// Professional Poker Action Panel - PPPoker/GGPoker Style
import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Zap, Minus, Plus, Check, X } from 'lucide-react';

interface ProActionPanelProps {
  isMyTurn: boolean;
  canCheck: boolean;
  callAmount: number;
  minRaise: number;
  maxRaise: number;
  currentBet: number;
  pot: number;
  myStack: number;
  timeRemaining?: number;
  timeTotal?: number;
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

// Smooth 60fps Timer Ring
const SmoothTimerRing = memo(function SmoothTimerRing({
  remaining,
  total,
  size = 48
}: {
  remaining: number;
  total: number;
  size?: number;
}) {
  const [displayProgress, setDisplayProgress] = useState(remaining / total);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  const startProgressRef = useRef<number>(remaining / total);

  useEffect(() => {
    startTimeRef.current = Date.now();
    startProgressRef.current = remaining / total;

    const animate = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const newProgress = Math.max(0, startProgressRef.current - (elapsed / total));
      setDisplayProgress(newProgress);
      
      if (newProgress > 0) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [remaining, total]);

  const radius = (size / 2) - 3;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - displayProgress);
  
  const isCritical = displayProgress < 0.2;
  const isWarning = displayProgress < 0.4;
  const strokeColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e';

  return (
    <svg width={size} height={size} className="absolute -inset-1">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="3"
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          filter: `drop-shadow(0 0 6px ${strokeColor})`,
          transition: 'stroke 0.3s ease'
        }}
      />
      {/* Glow effect for critical */}
      {isCritical && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          opacity={0.3}
          className="animate-pulse"
        />
      )}
    </svg>
  );
});

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
      bg: 'from-gray-600 to-gray-700',
      hover: 'hover:from-gray-500 hover:to-gray-600',
      border: 'border-gray-500/30',
      shadow: 'shadow-gray-600/20',
      text: 'text-white/90'
    },
    check: {
      bg: 'from-blue-500 to-blue-600',
      hover: 'hover:from-blue-400 hover:to-blue-500',
      border: 'border-blue-400/30',
      shadow: 'shadow-blue-500/30',
      text: 'text-white'
    },
    call: {
      bg: 'from-emerald-500 to-emerald-600',
      hover: 'hover:from-emerald-400 hover:to-emerald-500',
      border: 'border-emerald-400/30',
      shadow: 'shadow-emerald-500/30',
      text: 'text-white'
    },
    raise: {
      bg: isActive ? 'from-amber-400 to-amber-500' : 'from-amber-500 to-amber-600',
      hover: 'hover:from-amber-400 hover:to-amber-500',
      border: 'border-amber-400/30',
      shadow: 'shadow-amber-500/30',
      text: 'text-white'
    },
    allin: {
      bg: 'from-red-500 to-red-600',
      hover: 'hover:from-red-400 hover:to-red-500',
      border: 'border-red-400/30',
      shadow: 'shadow-red-500/40',
      text: 'text-white'
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
        "relative h-14 px-3 rounded-xl font-bold transition-all duration-150",
        "bg-gradient-to-b shadow-lg",
        "flex flex-col items-center justify-center gap-0.5",
        "border-t",
        "active:brightness-110",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        v.bg, v.hover, v.border, v.shadow, v.text
      )}
    >
      {icon ? (
        <span className="flex items-center gap-1.5">
          {icon}
          <span className="text-sm font-bold">{label}</span>
        </span>
      ) : (
        <>
          <span className="text-sm font-bold">{label}</span>
          {subLabel && (
            <span className="text-[10px] opacity-80 font-semibold">{subLabel}</span>
          )}
        </>
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
  timeRemaining = 30,
  timeTotal = 30,
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
          case 'fold': onFold(); break;
          case 'check': if (canCheck) onCheck(); break;
          case 'call': if (!canCheck && callAmount <= myStack) onCall(); break;
          case 'callAny':
            if (canCheck) onCheck();
            else if (callAmount <= myStack) onCall();
            break;
        }
        setPreAction(null);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [isMyTurn, preAction, canCheck, callAmount, myStack, disabled, onFold, onCheck, onCall]);

  // Handle preset click
  const handlePreset = useCallback((multiplier: number) => {
    const potBet = Math.floor(pot * multiplier);
    setRaiseAmount(Math.max(minRaise, Math.min(potBet, maxRaise)));
  }, [pot, minRaise, maxRaise]);

  // Handle raise confirm
  const handleRaiseConfirm = useCallback(() => {
    onRaise(raiseAmount);
    setShowSlider(false);
  }, [raiseAmount, onRaise]);

  // Step for slider
  const step = Math.max(1, Math.floor(minRaise / 2));

  // Pre-action panel (when not my turn)
  if (!isMyTurn) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 70%, transparent 100%)'
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
      className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6"
      style={{
        background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(20,20,20,0.95) 60%, transparent 100%)'
      }}
    >
      {/* Timer indicator */}
      {timeRemaining !== undefined && (
        <div className="flex justify-center mb-3">
          <div className="relative">
            <SmoothTimerRing remaining={timeRemaining} total={timeTotal} size={44} />
            <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
              <span className={cn(
                "text-sm font-bold",
                timeRemaining < timeTotal * 0.2 ? "text-red-400" : 
                timeRemaining < timeTotal * 0.4 ? "text-amber-400" : "text-white"
              )}>
                {Math.ceil(timeRemaining)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Raise slider panel */}
      <AnimatePresence>
        {showSlider && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="bg-black/40 rounded-xl p-3 border border-white/10">
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
          onClick={onFold}
          disabled={disabled}
        />

        {canCheck ? (
          <ActionButton
            label="Check"
            variant="check"
            onClick={onCheck}
            disabled={disabled}
          />
        ) : (
          <ActionButton
            label="Call"
            subLabel={formatAmount(callAmount)}
            variant="call"
            onClick={onCall}
            disabled={disabled || callAmount > myStack}
          />
        )}

        {showSlider ? (
          <ActionButton
            label={currentBet > 0 ? "Raise" : "Bet"}
            subLabel={formatAmount(raiseAmount)}
            variant="raise"
            onClick={handleRaiseConfirm}
            disabled={disabled || raiseAmount > myStack}
            isActive
          />
        ) : (
          <ActionButton
            label={currentBet > 0 ? "Raise" : "Bet"}
            variant="raise"
            onClick={() => setShowSlider(true)}
            disabled={disabled || minRaise > myStack}
          />
        )}

        <ActionButton
          label="All-In"
          subLabel={formatAmount(myStack)}
          variant="allin"
          onClick={onAllIn}
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
