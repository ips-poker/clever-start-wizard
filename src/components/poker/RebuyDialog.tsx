/**
 * Rebuy Dialog - Add chips when seated at table
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { X, Diamond, Minus, Plus } from 'lucide-react';

interface RebuyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (seatNumber: number, amount: number) => void;
  currentSeat: number;
  currentStack: number;
  minBuyIn: number;
  maxBuyIn: number;
  playerBalance: number;
  bigBlind: number;
}

export function RebuyDialog({
  isOpen,
  onClose,
  onConfirm,
  currentSeat,
  currentStack,
  minBuyIn,
  maxBuyIn,
  playerBalance,
  bigBlind
}: RebuyDialogProps) {
  // Can add up to maxBuyIn - currentStack
  const maxAddAmount = Math.min(maxBuyIn - currentStack, playerBalance);
  const minAddAmount = Math.max(bigBlind, 1);
  
  const [amount, setAmount] = useState(Math.min(bigBlind * 20, maxAddAmount));

  // Presets based on BB
  const presets = useMemo(() => {
    return [
      { label: '20BB', value: bigBlind * 20 },
      { label: '50BB', value: bigBlind * 50 },
      { label: '100BB', value: bigBlind * 100 },
      { label: 'Макс', value: maxAddAmount },
    ].filter(p => p.value <= maxAddAmount && p.value >= minAddAmount);
  }, [bigBlind, maxAddAmount, minAddAmount]);

  const handleConfirm = () => {
    if (amount >= minAddAmount && amount <= maxAddAmount) {
      onConfirm(currentSeat, amount);
    }
  };

  const adjustAmount = (delta: number) => {
    const newAmount = amount + delta;
    if (newAmount >= minAddAmount && newAmount <= maxAddAmount) {
      setAmount(newAmount);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-sm bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Diamond className="h-5 w-5 text-cyan-400" />
              <span className="font-semibold text-white">Докупка фишек</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Current stack info */}
            <div className="bg-black/30 rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Текущий стек:</span>
                <span className="text-white font-medium">{currentStack.toLocaleString()} 💎</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-white/60">Ваш баланс:</span>
                <span className="text-emerald-400 font-medium">{playerBalance.toLocaleString()} 💎</span>
              </div>
            </div>

            {/* Amount controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-white"
                  onClick={() => adjustAmount(-bigBlind)}
                >
                  <Minus className="h-5 w-5" />
                </Button>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-white flex items-center gap-2 justify-center">
                    <span>+{amount.toLocaleString()}</span>
                    <Diamond className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div className="text-sm text-white/60">
                    {Math.round(amount / bigBlind)} BB
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-white"
                  onClick={() => adjustAmount(bigBlind)}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              {/* Slider */}
              <Slider
                value={[amount]}
                onValueChange={([val]) => setAmount(val)}
                min={minAddAmount}
                max={maxAddAmount}
                step={bigBlind}
                className="w-full"
              />

              {/* Presets */}
              <div className="flex gap-2 flex-wrap justify-center">
                {presets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    size="sm"
                    className={`px-3 py-1 text-xs rounded-full transition-all ${
                      amount === preset.value
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                    onClick={() => setAmount(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* New total */}
            <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
              <div className="flex justify-between">
                <span className="text-white/80">Новый стек:</span>
                <span className="text-emerald-400 font-bold">
                  {(currentStack + amount).toLocaleString()} 💎
                </span>
              </div>
            </div>

            {/* Confirm button */}
            <Button
              className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-xl"
              onClick={handleConfirm}
              disabled={amount < minAddAmount || amount > maxAddAmount}
            >
              Докупить +{amount.toLocaleString()} 💎
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
