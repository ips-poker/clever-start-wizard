/**
 * Buy-in Dialog - PPPoker style seat selection and buy-in
 */
import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { X, Diamond, Users, Minus, Plus, Armchair } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BuyInDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (seatNumber: number, buyInAmount: number) => void;
  selectedSeat: number | null;
  minBuyIn: number;
  maxBuyIn: number;
  playerBalance: number;
  bigBlind: number;
  occupiedSeats: number[];
  maxSeats?: number;
}

export function BuyInDialog({
  isOpen,
  onClose,
  onConfirm,
  selectedSeat,
  minBuyIn,
  maxBuyIn,
  playerBalance,
  bigBlind,
  occupiedSeats,
  maxSeats = 6
}: BuyInDialogProps) {
  const [buyInAmount, setBuyInAmount] = useState(Math.min(minBuyIn, playerBalance));
  const [step, setStep] = useState<'seat' | 'amount'>(selectedSeat !== null ? 'amount' : 'seat');
  const [currentSeat, setCurrentSeat] = useState<number | null>(selectedSeat);

  // Available seats
  const availableSeats = useMemo(() => {
    const seats: number[] = [];
    for (let i = 0; i < maxSeats; i++) {
      if (!occupiedSeats.includes(i)) {
        seats.push(i);
      }
    }
    return seats;
  }, [occupiedSeats, maxSeats]);

  // Buy-in presets based on BB
  const presets = useMemo(() => {
    const effectiveMax = Math.min(maxBuyIn, playerBalance);
    return [
      { label: 'Мин', value: minBuyIn, bb: Math.round(minBuyIn / bigBlind) },
      { label: `${Math.round((minBuyIn + maxBuyIn) / 2 / bigBlind)}BB`, value: Math.round((minBuyIn + maxBuyIn) / 2), bb: Math.round((minBuyIn + maxBuyIn) / 2 / bigBlind) },
      { label: 'Макс', value: effectiveMax, bb: Math.round(effectiveMax / bigBlind) },
    ].filter(p => p.value <= playerBalance && p.value >= minBuyIn);
  }, [minBuyIn, maxBuyIn, playerBalance, bigBlind]);

  const handleSeatSelect = (seat: number) => {
    setCurrentSeat(seat);
    setStep('amount');
    setBuyInAmount(Math.min(Math.max(minBuyIn, bigBlind * 20), playerBalance));
  };

  const handleConfirm = () => {
    if (currentSeat !== null && buyInAmount >= minBuyIn && buyInAmount <= playerBalance) {
      onConfirm(currentSeat, buyInAmount);
    }
  };

  const adjustBuyIn = (delta: number) => {
    const newAmount = buyInAmount + delta;
    if (newAmount >= minBuyIn && newAmount <= Math.min(maxBuyIn, playerBalance)) {
      setBuyInAmount(newAmount);
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
          className="w-full max-w-md bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Armchair className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">
                {step === 'seat' ? 'Выберите место' : 'Сумма входа'}
              </h2>
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
          <div className="p-6">
            {step === 'seat' ? (
              /* Seat Selection */
              <div className="space-y-4">
                <p className="text-white/70 text-sm text-center mb-4">
                  Выберите свободное место за столом
                </p>
                
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: maxSeats }).map((_, i) => {
                    const isOccupied = occupiedSeats.includes(i);
                    const isSelected = currentSeat === i;
                    
                    return (
                      <button
                        key={i}
                        disabled={isOccupied}
                        onClick={() => handleSeatSelect(i)}
                        className={cn(
                          "relative h-20 rounded-xl border-2 transition-all duration-200",
                          "flex flex-col items-center justify-center gap-1",
                          isOccupied 
                            ? "border-red-500/30 bg-red-500/10 cursor-not-allowed opacity-50"
                            : isSelected
                              ? "border-amber-400 bg-amber-400/20 shadow-lg shadow-amber-400/20"
                              : "border-white/20 bg-white/5 hover:border-amber-400/50 hover:bg-white/10"
                        )}
                      >
                        <Armchair className={cn(
                          "h-6 w-6",
                          isOccupied ? "text-red-400" : isSelected ? "text-amber-400" : "text-white/60"
                        )} />
                        <span className={cn(
                          "text-sm font-medium",
                          isOccupied ? "text-red-400" : isSelected ? "text-amber-400" : "text-white/80"
                        )}>
                          {isOccupied ? 'Занято' : `Место ${i + 1}`}
                        </span>
                        
                        {/* Position indicator */}
                        <span className="absolute top-1 right-2 text-[10px] text-white/40">
                          {i === 0 ? 'BTN' : i === 1 ? 'SB' : i === 2 ? 'BB' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
                
                <div className="flex items-center justify-center gap-2 text-sm text-white/50">
                  <Users className="h-4 w-4" />
                  <span>{availableSeats.length} из {maxSeats} мест свободно</span>
                </div>
              </div>
            ) : (
              /* Buy-in Amount */
              <div className="space-y-6">
                {/* Selected seat indicator */}
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/70 text-sm">Место</span>
                  <div className="flex items-center gap-2">
                    <Armchair className="h-4 w-4 text-amber-400" />
                    <span className="text-white font-medium">#{(currentSeat || 0) + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-amber-400 hover:text-amber-300"
                      onClick={() => setStep('seat')}
                    >
                      Изменить
                    </Button>
                  </div>
                </div>

                {/* Amount display */}
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full border-white/20 text-white"
                      onClick={() => adjustBuyIn(-bigBlind)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    
                    <div className="min-w-[150px] py-3 px-6 bg-black/30 rounded-2xl border border-white/10">
                      <div className="flex items-center justify-center gap-2">
                        <Diamond className="h-5 w-5 text-cyan-400" />
                        <span className="text-2xl font-bold text-white">
                          {buyInAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-white/50 mt-1">
                        {Math.round(buyInAmount / bigBlind)} BB
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full border-white/20 text-white"
                      onClick={() => adjustBuyIn(bigBlind)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Slider */}
                <div className="px-2">
                  <Slider
                    value={[buyInAmount]}
                    min={minBuyIn}
                    max={Math.min(maxBuyIn, playerBalance)}
                    step={bigBlind}
                    onValueChange={([val]) => setBuyInAmount(val)}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-2">
                    <span>{minBuyIn.toLocaleString()} 💎</span>
                    <span>{Math.min(maxBuyIn, playerBalance).toLocaleString()} 💎</span>
                  </div>
                </div>

                {/* Presets */}
                <div className="flex gap-2 justify-center">
                  {presets.map((preset, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "px-4 border-white/20",
                        buyInAmount === preset.value
                          ? "bg-amber-500/20 border-amber-400 text-amber-400"
                          : "text-white/70 hover:text-white"
                      )}
                      onClick={() => setBuyInAmount(preset.value)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>

                {/* Balance */}
                <div className="flex items-center justify-between p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                  <span className="text-cyan-400/80 text-sm">Ваш баланс</span>
                  <div className="flex items-center gap-1.5">
                    <Diamond className="h-4 w-4 text-cyan-400" />
                    <span className="text-cyan-400 font-bold">{playerBalance.toLocaleString()}</span>
                  </div>
                </div>

                {/* Warning if low balance */}
                {playerBalance < minBuyIn && (
                  <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30 text-center">
                    <p className="text-red-400 text-sm">
                      Недостаточно алмазов для входа
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 bg-black/20">
            <Button
              className="w-full h-12 text-lg font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
              onClick={handleConfirm}
              disabled={currentSeat === null || buyInAmount < minBuyIn || buyInAmount > playerBalance}
            >
              {step === 'seat' ? 'Продолжить' : (
                <>
                  Сесть за стол • {buyInAmount.toLocaleString()} 💎
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
