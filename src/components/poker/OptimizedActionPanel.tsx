import React, { memo, useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Zap, X, RotateCcw, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

interface OptimizedActionPanelProps {
  gamePhase: GamePhase;
  isMyTurn: boolean;
  showActions: boolean;
  currentBet: number;
  minBet: number;
  myStack: number;
  onAction: (action: ActionType, amount?: number) => void;
  onStartGame: () => void;
  onNewHand: () => void;
  onLeave: () => void;
  className?: string;
}

// Preset bet buttons
const BetPresets = memo(function BetPresets({
  pot,
  minBet,
  maxBet,
  onSelect
}: {
  pot: number;
  minBet: number;
  maxBet: number;
  onSelect: (amount: number) => void;
}) {
  const presets = useMemo(() => [
    { label: '½', value: Math.max(minBet, Math.floor(pot * 0.5)) },
    { label: '¾', value: Math.max(minBet, Math.floor(pot * 0.75)) },
    { label: 'Pot', value: Math.max(minBet, pot) },
  ].filter(p => p.value <= maxBet), [pot, minBet, maxBet]);

  return (
    <div className="flex gap-1">
      {presets.map(preset => (
        <Button
          key={preset.label}
          size="sm"
          variant="ghost"
          onClick={() => onSelect(preset.value)}
          className="h-7 px-2 text-[10px] text-white/70 hover:text-white hover:bg-white/10"
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
});

// Action button component
const ActionButton = memo(function ActionButton({
  action,
  label,
  onClick,
  variant = 'default',
  disabled = false,
  className
}: {
  action: ActionType;
  label: string;
  onClick: () => void;
  variant?: 'fold' | 'check' | 'call' | 'raise' | 'allin' | 'default';
  disabled?: boolean;
  className?: string;
}) {
  const variantStyles = {
    fold: 'bg-red-600/80 hover:bg-red-600 active:bg-red-700',
    check: 'bg-blue-600/80 hover:bg-blue-600 active:bg-blue-700',
    call: 'bg-blue-600/80 hover:bg-blue-600 active:bg-blue-700',
    raise: 'bg-green-600/80 hover:bg-green-600 active:bg-green-700',
    allin: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500',
    default: 'bg-gray-600/80 hover:bg-gray-600',
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-12 text-white font-bold rounded-xl transition-all duration-150',
        'active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        className
      )}
    >
      {label}
    </Button>
  );
});

export const OptimizedActionPanel = memo(function OptimizedActionPanel({
  gamePhase,
  isMyTurn,
  showActions,
  currentBet,
  minBet,
  myStack,
  onAction,
  onStartGame,
  onNewHand,
  onLeave,
  className
}: OptimizedActionPanelProps) {
  const [betAmount, setBetAmount] = useState(minBet * 2);

  // Update bet amount when minBet changes
  React.useEffect(() => {
    setBetAmount(prev => Math.max(prev, minBet));
  }, [minBet]);

  const handleRaise = useCallback(() => {
    onAction('raise', betAmount);
  }, [onAction, betAmount]);

  const handleSliderChange = useCallback((value: number[]) => {
    setBetAmount(value[0]);
  }, []);

  const canCheck = currentBet === 0;
  const callAmount = Math.min(currentBet, myStack);

  // Waiting state
  if (gamePhase === 'waiting') {
    return (
      <motion.div 
        className={cn('flex gap-3', className)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button
          onClick={onStartGame}
          className="flex-1 h-12 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold text-base rounded-xl shadow-lg"
        >
          <Zap className="h-5 w-5 mr-2" />
          Start Game
        </Button>
        <Button
          onClick={onLeave}
          variant="outline"
          className="h-12 px-6 border-white/20 text-white hover:bg-white/10 rounded-xl"
        >
          <X className="h-5 w-5" />
        </Button>
      </motion.div>
    );
  }

  // Showdown state
  if (gamePhase === 'showdown') {
    return (
      <motion.div 
        className={cn('flex gap-3', className)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button
          onClick={onNewHand}
          className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-base rounded-xl"
        >
          <RotateCcw className="h-5 w-5 mr-2" />
          New Hand
        </Button>
      </motion.div>
    );
  }

  // Active betting state
  if (showActions && isMyTurn) {
    return (
      <motion.div 
        className={cn('space-y-3', className)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Bet slider */}
        <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setBetAmount(minBet)}
            className="text-white/70 hover:text-white text-xs h-8 px-2"
          >
            Min
          </Button>
          
          <div className="flex-1 flex flex-col gap-1">
            <Slider
              value={[betAmount]}
              min={minBet}
              max={myStack}
              step={Math.max(1, Math.floor(minBet / 2))}
              onValueChange={handleSliderChange}
              className="flex-1"
            />
            <BetPresets 
              pot={currentBet * 2} 
              minBet={minBet} 
              maxBet={myStack} 
              onSelect={setBetAmount} 
            />
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setBetAmount(myStack)}
            className="text-white/70 hover:text-white text-xs h-8 px-2"
          >
            Max
          </Button>
          
          <div className="min-w-[60px] text-right">
            <span className="text-yellow-400 font-bold">{betAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-4 gap-2">
          <ActionButton
            action="fold"
            label="Fold"
            variant="fold"
            onClick={() => onAction('fold')}
          />
          <ActionButton
            action={canCheck ? 'check' : 'call'}
            label={canCheck ? 'Check' : `Call ${callAmount}`}
            variant={canCheck ? 'check' : 'call'}
            onClick={() => onAction(canCheck ? 'check' : 'call')}
          />
          <ActionButton
            action="raise"
            label="Raise"
            variant="raise"
            onClick={handleRaise}
            disabled={myStack <= currentBet}
          />
          <ActionButton
            action="all-in"
            label="All-In"
            variant="allin"
            onClick={() => onAction('all-in')}
          />
        </div>
      </motion.div>
    );
  }

  // Waiting for opponents
  return (
    <div className={cn('flex items-center justify-center py-3 text-white/50', className)}>
      <Timer className="h-4 w-4 mr-2 animate-pulse" />
      Waiting for opponents...
    </div>
  );
});
