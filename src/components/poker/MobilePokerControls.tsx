import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { 
  X, 
  Check, 
  ArrowUp, 
  Coins,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface MobilePokerControlsProps {
  isMyTurn: boolean;
  canCheck: boolean;
  callAmount: number;
  currentBet: number;
  myStack: number;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: (amount: number) => void;
  onAllIn: () => void;
}

export function MobilePokerControls({
  isMyTurn,
  canCheck,
  callAmount,
  currentBet,
  myStack,
  onFold,
  onCheck,
  onCall,
  onRaise,
  onAllIn
}: MobilePokerControlsProps) {
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(currentBet * 2 || 40);

  const minRaise = currentBet * 2 || 40;
  const maxRaise = myStack;

  const quickRaises = [
    { label: '2x', value: currentBet * 2 },
    { label: '3x', value: currentBet * 3 },
    { label: '½ Pot', value: Math.floor(myStack * 0.5) },
    { label: 'Pot', value: myStack }
  ].filter(r => r.value <= maxRaise && r.value >= minRaise);

  if (!isMyTurn) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border safe-area-bottom"
      >
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse" />
          <span className="text-sm">Ожидание хода...</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border safe-area-bottom"
    >
      {/* Raise Slider Panel */}
      <AnimatePresence>
        {showRaiseSlider && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border"
          >
            <div className="p-4 space-y-3">
              {/* Quick raise buttons */}
              <div className="flex gap-2 justify-center">
                {quickRaises.map((qr) => (
                  <Button
                    key={qr.label}
                    variant="outline"
                    size="sm"
                    onClick={() => setRaiseAmount(qr.value)}
                    className={cn(
                      "text-xs",
                      raiseAmount === qr.value && "bg-primary text-primary-foreground"
                    )}
                  >
                    {qr.label}
                  </Button>
                ))}
              </div>

              {/* Slider */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium w-16 text-right">
                  {minRaise.toLocaleString()}
                </span>
                <Slider
                  value={[raiseAmount]}
                  onValueChange={([val]) => setRaiseAmount(val)}
                  min={minRaise}
                  max={maxRaise}
                  step={10}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-16">
                  {maxRaise.toLocaleString()}
                </span>
              </div>

              {/* Current value */}
              <div className="flex items-center justify-center gap-2">
                <Coins className="h-4 w-4 text-amber-500" />
                <span className="text-lg font-bold">{raiseAmount.toLocaleString()}</span>
              </div>

              {/* Confirm raise */}
              <Button 
                onClick={() => {
                  onRaise(raiseAmount);
                  setShowRaiseSlider(false);
                }}
                className="w-full gap-2"
              >
                <ArrowUp className="h-4 w-4" />
                Raise {raiseAmount.toLocaleString()}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main action buttons */}
      <div className="p-4 space-y-3">
        {/* Toggle raise slider */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRaiseSlider(!showRaiseSlider)}
            className="text-xs gap-1"
          >
            {showRaiseSlider ? (
              <>
                <ChevronDown className="h-3 w-3" />
                Скрыть рейз
              </>
            ) : (
              <>
                <ChevronUp className="h-3 w-3" />
                Настроить рейз
              </>
            )}
          </Button>
        </div>

        {/* Action buttons grid */}
        <div className="grid grid-cols-4 gap-2">
          <Button 
            variant="destructive" 
            onClick={onFold}
            className="flex flex-col h-14 gap-0.5"
          >
            <X className="h-5 w-5" />
            <span className="text-[10px]">Fold</span>
          </Button>

          {canCheck ? (
            <Button 
              variant="secondary" 
              onClick={onCheck}
              className="flex flex-col h-14 gap-0.5"
            >
              <Check className="h-5 w-5" />
              <span className="text-[10px]">Check</span>
            </Button>
          ) : (
            <Button 
              variant="secondary" 
              onClick={onCall}
              className="flex flex-col h-14 gap-0.5"
            >
              <Check className="h-5 w-5" />
              <span className="text-[10px]">Call {callAmount}</span>
            </Button>
          )}

          <Button 
            onClick={() => onRaise(raiseAmount)}
            className="flex flex-col h-14 gap-0.5"
          >
            <ArrowUp className="h-5 w-5" />
            <span className="text-[10px]">Raise</span>
          </Button>

          <Button 
            variant="outline"
            onClick={onAllIn}
            className="flex flex-col h-14 gap-0.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20"
          >
            <Coins className="h-5 w-5 text-amber-500" />
            <span className="text-[10px]">All-in</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
