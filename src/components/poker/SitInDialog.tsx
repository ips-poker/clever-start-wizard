import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Clock, DollarSign, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SitInDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSitIn: (options: { postDead?: boolean; waitForBB?: boolean }) => void;
  missedBB: boolean;
  missedSB: boolean;
  bigBlind: number;
  smallBlind: number;
  isTournament?: boolean;
  playerStack: number;
}

/**
 * Professional dialog for returning from sit-out
 * Handles missed blinds and wait-for-BB options (PokerStars style)
 */
export const SitInDialog: React.FC<SitInDialogProps> = ({
  isOpen,
  onClose,
  onSitIn,
  missedBB,
  missedSB,
  bigBlind,
  smallBlind,
  isTournament = false,
  playerStack
}) => {
  const [waitForBB, setWaitForBB] = useState(false);
  
  // Calculate dead money to post
  const deadMoney = (missedBB ? bigBlind : 0) + (missedSB ? smallBlind : 0);
  const canAffordDead = playerStack >= deadMoney;
  
  // In tournaments, players don't have missed blind options
  if (isTournament) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background/95 border border-border rounded-2xl p-6 max-w-sm mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-emerald-500" />
                Вернуться в турнир
              </h3>
              
              <p className="text-muted-foreground text-sm mb-6">
                Вы будете автоматически включены в следующую раздачу.
              </p>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                >
                  Отмена
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                  onClick={() => {
                    onSitIn({});
                    onClose();
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Вернуться
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
  
  // Cash game - show missed blind options
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-background/95 border border-border rounded-2xl p-6 max-w-md mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-emerald-500" />
              Вернуться в игру
            </h3>
            
            {/* Missed blinds info */}
            {(missedBB || missedSB) && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-400 font-medium text-sm">
                      Пропущенные блайнды
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Вы пропустили:
                      {missedBB && <span className="text-amber-400"> BB ({bigBlind})</span>}
                      {missedBB && missedSB && ' и'}
                      {missedSB && <span className="text-amber-400"> SB ({smallBlind})</span>}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Options */}
            <div className="space-y-3 mb-6">
              {/* Option 1: Post dead money now */}
              {(missedBB || missedSB) && (
                <button
                  onClick={() => {
                    if (canAffordDead) {
                      onSitIn({ postDead: true });
                      onClose();
                    }
                  }}
                  disabled={!canAffordDead}
                  className={cn(
                    "w-full p-4 rounded-lg border text-left transition-all",
                    canAffordDead
                      ? "border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer"
                      : "border-muted opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="font-medium text-foreground">
                        Внести Dead Money: {deadMoney}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Начать играть немедленно
                      </p>
                    </div>
                  </div>
                </button>
              )}
              
              {/* Option 2: Wait for Big Blind */}
              <button
                onClick={() => {
                  setWaitForBB(true);
                  onSitIn({ waitForBB: true });
                  onClose();
                }}
                className="w-full p-4 rounded-lg border border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-foreground">
                      Дождаться Big Blind
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Вступить бесплатно, когда BB придёт к вам
                    </p>
                  </div>
                </div>
              </button>
              
              {/* Option 3: Just return (no missed blinds) */}
              {!missedBB && !missedSB && (
                <button
                  onClick={() => {
                    onSitIn({});
                    onClose();
                  }}
                  className="w-full p-4 rounded-lg border border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-left transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <RotateCcw className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="font-medium text-foreground">
                        Вернуться в игру
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Без дополнительных ставок
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </div>
            
            <Button
              variant="ghost"
              className="w-full"
              onClick={onClose}
            >
              Отмена
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SitInDialog;
