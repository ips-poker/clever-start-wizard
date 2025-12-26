import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

interface ActionPanelProps {
  currentBet: number;
  playerStack: number;
  minRaise: number;
  maxRaise: number;
  pot: number;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  isActive: boolean;
  timeRemaining?: number;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onBet: (amount: number) => void;
  onRaise: (amount: number) => void;
  onAllIn: () => void;
  className?: string;
}

const QUICK_BET_MULTIPLIERS = [
  { label: '1/2', multiplier: 0.5 },
  { label: '2/3', multiplier: 0.67 },
  { label: 'Pot', multiplier: 1 },
  { label: '2x', multiplier: 2 }
];

export const ActionPanel: React.FC<ActionPanelProps> = ({
  currentBet,
  playerStack,
  minRaise,
  maxRaise,
  pot,
  canCheck,
  canCall,
  callAmount,
  isActive,
  timeRemaining,
  onFold,
  onCheck,
  onCall,
  onBet,
  onRaise,
  onAllIn,
  className
}) => {
  const [betAmount, setBetAmount] = useState(minRaise);
  const [showBetSlider, setShowBetSlider] = useState(false);

  const handleQuickBet = useCallback((multiplier: number) => {
    const amount = Math.min(Math.floor(pot * multiplier), maxRaise);
    setBetAmount(Math.max(amount, minRaise));
  }, [pot, maxRaise, minRaise]);

  const handleConfirmBet = useCallback(() => {
    if (currentBet === 0) {
      onBet(betAmount);
    } else {
      onRaise(betAmount);
    }
    setShowBetSlider(false);
  }, [betAmount, currentBet, onBet, onRaise]);

  if (!isActive) {
    return (
      <div className={cn(
        'bg-gray-900/80 backdrop-blur-sm rounded-xl p-4 border border-gray-700',
        'flex items-center justify-center',
        className
      )}>
        <span className="text-gray-500 font-roboto-condensed">Ожидание хода...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        'bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-sm',
        'rounded-xl border border-gray-700 overflow-hidden',
        'shadow-[0_-10px_30px_rgba(0,0,0,0.5)]',
        className
      )}
    >
      {/* Timer bar */}
      {timeRemaining !== undefined && (
        <div className="h-1 bg-gray-800">
          <motion.div
            className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
            initial={{ width: '100%' }}
            animate={{ width: `${(timeRemaining / 30) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}

      <div className="p-4">
        {/* Bet slider section */}
        <AnimatePresence>
          {showBetSlider && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-4 overflow-hidden"
            >
              {/* Quick bet buttons */}
              <div className="flex gap-2 mb-4">
                {QUICK_BET_MULTIPLIERS.map(({ label, multiplier }) => (
                  <button
                    key={label}
                    onClick={() => handleQuickBet(multiplier)}
                    className={cn(
                      'flex-1 py-2 rounded-lg font-roboto-condensed text-sm',
                      'bg-gray-800 text-white border border-gray-600',
                      'hover:bg-gray-700 hover:border-casino-gold/50',
                      'transition-all duration-200'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Slider */}
              <div className="px-2 mb-4">
                <Slider
                  value={[betAmount]}
                  onValueChange={([value]) => setBetAmount(value)}
                  min={minRaise}
                  max={maxRaise}
                  step={Math.max(1, Math.floor(minRaise / 10))}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{minRaise.toLocaleString()}</span>
                  <span className="text-casino-gold font-orbitron text-lg">
                    {betAmount.toLocaleString()}
                  </span>
                  <span>{maxRaise.toLocaleString()}</span>
                </div>
              </div>

              {/* Confirm bet button */}
              <button
                onClick={handleConfirmBet}
                className={cn(
                  'w-full py-3 rounded-lg font-bebas text-lg',
                  'bg-gradient-to-r from-casino-gold to-amber-500',
                  'text-black shadow-lg',
                  'hover:from-amber-400 hover:to-casino-gold',
                  'active:scale-95 transition-all duration-200'
                )}
              >
                {currentBet === 0 ? 'BET' : 'RAISE'} {betAmount.toLocaleString()}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main action buttons */}
        <div className="flex gap-2">
          {/* Fold */}
          <ActionButton
            onClick={onFold}
            variant="fold"
            className="flex-1"
          >
            FOLD
          </ActionButton>

          {/* Check / Call */}
          {canCheck ? (
            <ActionButton
              onClick={onCheck}
              variant="check"
              className="flex-1"
            >
              CHECK
            </ActionButton>
          ) : canCall ? (
            <ActionButton
              onClick={onCall}
              variant="call"
              className="flex-1"
            >
              CALL {callAmount.toLocaleString()}
            </ActionButton>
          ) : null}

          {/* Bet / Raise toggle */}
          <ActionButton
            onClick={() => setShowBetSlider(!showBetSlider)}
            variant="raise"
            className="flex-1"
            active={showBetSlider}
          >
            {currentBet === 0 ? 'BET' : 'RAISE'}
          </ActionButton>

          {/* All-in */}
          <ActionButton
            onClick={onAllIn}
            variant="allIn"
            className="flex-1"
          >
            ALL IN
          </ActionButton>
        </div>
      </div>
    </motion.div>
  );
};

// Individual action button component
interface ActionButtonProps {
  onClick: () => void;
  variant: 'fold' | 'check' | 'call' | 'raise' | 'allIn';
  children: React.ReactNode;
  className?: string;
  active?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  variant,
  children,
  className,
  active
}) => {
  const variants = {
    fold: 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600',
    check: 'bg-green-700 hover:bg-green-600 text-white border-green-500',
    call: 'bg-blue-700 hover:bg-blue-600 text-white border-blue-500',
    raise: cn(
      'bg-gradient-to-r from-orange-600 to-amber-600',
      'hover:from-orange-500 hover:to-amber-500',
      'text-white border-orange-400',
      active && 'ring-2 ring-casino-gold'
    ),
    allIn: cn(
      'bg-gradient-to-r from-red-700 to-red-600',
      'hover:from-red-600 hover:to-red-500',
      'text-white border-red-400',
      'shadow-[0_0_15px_rgba(220,38,38,0.5)]'
    )
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'py-3 px-4 rounded-lg font-bebas text-base',
        'border transition-all duration-200',
        variants[variant],
        className
      )}
    >
      {children}
    </motion.button>
  );
};

// Pre-action buttons (auto actions)
export const PreActionButtons: React.FC<{
  onAutoFold: (enabled: boolean) => void;
  onAutoCheck: (enabled: boolean) => void;
  onAutoCall: (enabled: boolean) => void;
  autoFold: boolean;
  autoCheck: boolean;
  autoCall: boolean;
  className?: string;
}> = ({
  onAutoFold,
  onAutoCheck,
  onAutoCall,
  autoFold,
  autoCheck,
  autoCall,
  className
}) => {
  return (
    <div className={cn('flex gap-2', className)}>
      <PreActionToggle
        label="Auto Fold"
        active={autoFold}
        onChange={onAutoFold}
      />
      <PreActionToggle
        label="Check/Fold"
        active={autoCheck}
        onChange={onAutoCheck}
      />
      <PreActionToggle
        label="Auto Call"
        active={autoCall}
        onChange={onAutoCall}
      />
    </div>
  );
};

const PreActionToggle: React.FC<{
  label: string;
  active: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, active, onChange }) => (
  <button
    onClick={() => onChange(!active)}
    className={cn(
      'px-3 py-1.5 rounded-lg text-xs font-roboto-condensed',
      'border transition-all duration-200',
      active
        ? 'bg-casino-gold/20 border-casino-gold text-casino-gold'
        : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
    )}
  >
    {label}
  </button>
);

export default ActionPanel;
