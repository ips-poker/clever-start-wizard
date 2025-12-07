import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  X, 
  Check, 
  ArrowUp, 
  Coins, 
  ChevronUp,
  ChevronDown,
  Zap
} from 'lucide-react';

interface EnhancedPokerControlsProps {
  isMyTurn: boolean;
  canCheck: boolean;
  callAmount: number;
  currentBet: number;
  myStack: number;
  minRaise?: number;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: (amount: number) => void;
  onAllIn: () => void;
  disabled?: boolean;
}

export function EnhancedPokerControls({
  isMyTurn,
  canCheck,
  callAmount,
  currentBet,
  myStack,
  minRaise = currentBet * 2,
  onFold,
  onCheck,
  onCall,
  onRaise,
  onAllIn,
  disabled = false
}: EnhancedPokerControlsProps) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);

  const handleRaiseConfirm = () => {
    onRaise(raiseAmount);
    setShowRaiseSlider(false);
  };

  const quickRaiseAmounts = [
    { label: '2x', multiplier: 2 },
    { label: '3x', multiplier: 3 },
    { label: '1/2 pot', multiplier: 0.5, isPot: true },
    { label: 'Pot', multiplier: 1, isPot: true },
  ];

  if (!isMyTurn) {
    return (
      <div className="flex items-center justify-center p-4 bg-black/40 rounded-xl backdrop-blur-sm">
        <span className="text-muted-foreground">Ожидание хода...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      className="p-4 bg-gradient-to-t from-black/80 to-black/40 backdrop-blur-sm rounded-xl border border-white/10"
    >
      {/* Main action buttons */}
      <div className="flex gap-2 mb-3">
        {/* Fold button */}
        <Button
          variant="destructive"
          size="lg"
          onClick={onFold}
          disabled={disabled}
          className="flex-1 h-14 text-lg font-bold bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 border border-red-400/30"
        >
          <X className="w-5 h-5 mr-2" />
          Fold
        </Button>

        {/* Check/Call button */}
        {canCheck ? (
          <Button
            variant="secondary"
            size="lg"
            onClick={onCheck}
            disabled={disabled}
            className="flex-1 h-14 text-lg font-bold bg-gradient-to-br from-slate-600 to-slate-800 hover:from-slate-500 hover:to-slate-700 border border-slate-400/30"
          >
            <Check className="w-5 h-5 mr-2" />
            Check
          </Button>
        ) : (
          <Button
            variant="default"
            size="lg"
            onClick={onCall}
            disabled={disabled || callAmount > myStack}
            className="flex-1 h-14 text-lg font-bold bg-gradient-to-br from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 border border-green-400/30"
          >
            <Coins className="w-5 h-5 mr-2" />
            Call {callAmount}
          </Button>
        )}

        {/* Raise button */}
        <Button
          variant="default"
          size="lg"
          onClick={() => setShowRaiseSlider(!showRaiseSlider)}
          disabled={disabled || myStack <= callAmount}
          className={cn(
            "flex-1 h-14 text-lg font-bold border",
            showRaiseSlider
              ? "bg-primary hover:bg-primary/90 border-primary"
              : "bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 border-blue-400/30"
          )}
        >
          <ArrowUp className="w-5 h-5 mr-2" />
          Raise
        </Button>

        {/* All-in button */}
        <Button
          variant="default"
          size="lg"
          onClick={onAllIn}
          disabled={disabled}
          className="flex-1 h-14 text-lg font-bold bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 border border-amber-400/30 text-black"
        >
          <Zap className="w-5 h-5 mr-2" />
          All-In
        </Button>
      </div>

      {/* Raise slider panel */}
      <AnimatePresence>
        {showRaiseSlider && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 border-t border-white/10">
              {/* Quick raise buttons */}
              <div className="flex gap-2 mb-3">
                {quickRaiseAmounts.map(({ label, multiplier, isPot }) => {
                  const amount = isPot 
                    ? Math.floor(currentBet * multiplier) 
                    : currentBet * multiplier;
                  return (
                    <Button
                      key={label}
                      variant="outline"
                      size="sm"
                      onClick={() => setRaiseAmount(Math.min(amount, myStack))}
                      disabled={amount > myStack}
                      className="flex-1 bg-white/5 border-white/20 hover:bg-white/10"
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>

              {/* Slider */}
              <div className="flex items-center gap-4 mb-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRaiseAmount(prev => Math.max(minRaise, prev - currentBet))}
                  className="h-8 w-8"
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
                
                <div className="flex-1">
                  <Slider
                    value={[raiseAmount]}
                    onValueChange={([value]) => setRaiseAmount(value)}
                    min={minRaise}
                    max={myStack}
                    step={Math.max(1, Math.floor(myStack / 100))}
                    className="w-full"
                  />
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRaiseAmount(prev => Math.min(myStack, prev + currentBet))}
                  className="h-8 w-8"
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
              </div>

              {/* Raise amount display and confirm */}
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Размер рейза</p>
                  <p className="text-2xl font-bold text-amber-400">{raiseAmount.toLocaleString()}</p>
                </div>
                
                <Button
                  size="lg"
                  onClick={handleRaiseConfirm}
                  disabled={disabled}
                  className="px-8 h-12 text-lg font-bold bg-gradient-to-br from-green-600 to-green-800 hover:from-green-500 hover:to-green-700"
                >
                  Raise to {raiseAmount.toLocaleString()}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stack info */}
      <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-sm">
        <span className="text-muted-foreground">Ваш стек:</span>
        <span className="font-bold text-amber-400">{myStack.toLocaleString()}</span>
      </div>
    </motion.div>
  );
}
