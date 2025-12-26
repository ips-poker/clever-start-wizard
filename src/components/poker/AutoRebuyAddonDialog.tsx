/**
 * Auto Rebuy/Addon Dialog Component
 * 5.3 - Smart dialogs for rebuy and addon with auto-trigger
 */
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, 
  Plus, 
  Diamond, 
  Clock, 
  AlertCircle,
  Zap,
  Check,
  X,
  Settings,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface AutoRebuyAddonDialogProps {
  // Current state
  isOpen: boolean;
  type: 'rebuy' | 'addon' | 'auto-settings';
  currentStack: number;
  startingStack: number;
  
  // Rebuy settings
  rebuyCost: number;
  rebuyChips: number;
  rebuyEndLevel: number;
  currentLevel: number;
  maxRebuys: number;
  usedRebuys: number;
  
  // Addon settings
  addonCost: number;
  addonChips: number;
  addonLevel: number; // Level when addon is available
  
  // Player info
  playerBalance: number;
  bigBlind: number;
  
  // Auto settings
  autoRebuyEnabled: boolean;
  autoRebuyThresholdBB: number; // Auto rebuy when stack falls below X BB
  
  // Callbacks
  onClose: () => void;
  onRebuy: () => void;
  onAddon: () => void;
  onUpdateAutoSettings: (enabled: boolean, thresholdBB: number) => void;
}

export const AutoRebuyAddonDialog: React.FC<AutoRebuyAddonDialogProps> = ({
  isOpen,
  type,
  currentStack,
  startingStack,
  rebuyCost,
  rebuyChips,
  rebuyEndLevel,
  currentLevel,
  maxRebuys,
  usedRebuys,
  addonCost,
  addonChips,
  addonLevel,
  playerBalance,
  bigBlind,
  autoRebuyEnabled,
  autoRebuyThresholdBB,
  onClose,
  onRebuy,
  onAddon,
  onUpdateAutoSettings
}) => {
  const [autoEnabled, setAutoEnabled] = useState(autoRebuyEnabled);
  const [thresholdBB, setThresholdBB] = useState(autoRebuyThresholdBB);
  const [countdown, setCountdown] = useState(10);
  
  const stackInBB = Math.round(currentStack / bigBlind);
  const canRebuy = currentLevel <= rebuyEndLevel && usedRebuys < maxRebuys && playerBalance >= rebuyCost;
  const canAddon = currentLevel === addonLevel && playerBalance >= addonCost;
  const isEligibleForRebuy = currentStack <= startingStack;
  
  // Countdown timer for auto-decision
  useEffect(() => {
    if (!isOpen || type === 'auto-settings') return;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose(); // Auto-decline
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isOpen, type, onClose]);
  
  // Reset countdown when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCountdown(10);
    }
  }, [isOpen]);

  const handleAutoSettingsSave = () => {
    onUpdateAutoSettings(autoEnabled, thresholdBB);
    onClose();
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
          {/* Countdown indicator */}
          {type !== 'auto-settings' && (
            <div className="h-1 bg-slate-700">
              <motion.div 
                className="h-full bg-gradient-to-r from-amber-500 to-red-500"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 10, ease: 'linear' }}
              />
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              {type === 'rebuy' && <RefreshCw className="h-5 w-5 text-amber-400" />}
              {type === 'addon' && <Plus className="h-5 w-5 text-emerald-400" />}
              {type === 'auto-settings' && <Settings className="h-5 w-5 text-blue-400" />}
              <span className="font-semibold text-white">
                {type === 'rebuy' && 'Ребай'}
                {type === 'addon' && 'Аддон'}
                {type === 'auto-settings' && 'Авто-ребай настройки'}
              </span>
            </div>
            
            {type !== 'auto-settings' && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-white/60" />
                <span className={cn(
                  "font-mono text-sm",
                  countdown <= 3 ? "text-red-400" : "text-white/60"
                )}>
                  {countdown}с
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white/60 hover:text-white"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Current Stack Info */}
            {type !== 'auto-settings' && (
              <div className="bg-black/30 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Ваш стек:</span>
                  <span className={cn(
                    "font-medium",
                    stackInBB < 10 ? "text-red-400" :
                    stackInBB < 20 ? "text-amber-400" :
                    "text-white"
                  )}>
                    {currentStack.toLocaleString()} 💎 ({stackInBB} BB)
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-white/60">Ваш баланс:</span>
                  <span className="text-emerald-400 font-medium">
                    {playerBalance.toLocaleString()} 💎
                  </span>
                </div>
              </div>
            )}

            {/* Rebuy Content */}
            {type === 'rebuy' && (
              <>
                <div className="text-center py-2">
                  <div className="text-white/70 text-sm mb-1">Получить</div>
                  <div className="text-3xl font-bold text-amber-400">
                    +{rebuyChips.toLocaleString()} 💎
                  </div>
                  <div className="text-white/50 text-sm">
                    за {rebuyCost.toLocaleString()} 💎
                  </div>
                </div>

                {/* Rebuy Stats */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-black/20 rounded-lg p-2 text-center">
                    <div className="text-white/60">Ребаев:</div>
                    <div className="text-white font-medium">
                      {usedRebuys} / {maxRebuys}
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2 text-center">
                    <div className="text-white/60">До уровня:</div>
                    <div className="text-white font-medium">
                      {rebuyEndLevel} (сейчас {currentLevel})
                    </div>
                  </div>
                </div>

                {/* Eligibility Warning */}
                {!isEligibleForRebuy && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    <span className="text-amber-300 text-xs">
                      Ребай доступен только при стеке ≤ стартовому ({startingStack.toLocaleString()})
                    </span>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-white/20"
                    onClick={onClose}
                  >
                    Отказаться
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400"
                    onClick={onRebuy}
                    disabled={!canRebuy || !isEligibleForRebuy}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Ребай
                  </Button>
                </div>
              </>
            )}

            {/* Addon Content */}
            {type === 'addon' && (
              <>
                <div className="text-center py-2">
                  <Badge className="mb-2 bg-emerald-500/20 text-emerald-300">
                    <Zap className="h-3 w-3 mr-1" />
                    Аддон доступен!
                  </Badge>
                  <div className="text-white/70 text-sm mb-1">Получить</div>
                  <div className="text-3xl font-bold text-emerald-400">
                    +{addonChips.toLocaleString()} 💎
                  </div>
                  <div className="text-white/50 text-sm">
                    за {addonCost.toLocaleString()} 💎
                  </div>
                </div>

                {/* New Stack Preview */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                  <div className="flex justify-between">
                    <span className="text-white/70">Новый стек:</span>
                    <span className="text-emerald-400 font-bold">
                      {(currentStack + addonChips).toLocaleString()} 💎
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-white/50 mt-1">
                    <span>Это:</span>
                    <span>{Math.round((currentStack + addonChips) / bigBlind)} BB</span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-white/20"
                    onClick={onClose}
                  >
                    Пропустить
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400"
                    onClick={onAddon}
                    disabled={!canAddon}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Взять аддон
                  </Button>
                </div>
              </>
            )}

            {/* Auto Settings Content */}
            {type === 'auto-settings' && (
              <>
                <div className="space-y-4">
                  {/* Auto Rebuy Toggle */}
                  <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-amber-400" />
                      <div>
                        <div className="text-white font-medium">Авто-ребай</div>
                        <div className="text-xs text-white/50">
                          Автоматический ребай при низком стеке
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={autoEnabled}
                      onCheckedChange={setAutoEnabled}
                    />
                  </div>

                  {/* Threshold Setting */}
                  {autoEnabled && (
                    <div className="space-y-3 p-3 bg-black/20 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/70">Ребай когда стек ниже:</span>
                        <span className="text-amber-400 font-medium">
                          {thresholdBB} BB
                        </span>
                      </div>
                      
                      <Slider
                        value={[thresholdBB]}
                        onValueChange={([val]) => setThresholdBB(val)}
                        min={5}
                        max={50}
                        step={5}
                        className="w-full"
                      />
                      
                      <div className="flex justify-between text-xs text-white/50">
                        <span>5 BB</span>
                        <span>50 BB</span>
                      </div>
                    </div>
                  )}

                  {/* Info */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-300">
                    <AlertCircle className="h-4 w-4 mb-1" />
                    Авто-ребай сработает автоматически, если ваш стек упадет ниже 
                    порога и у вас достаточно баланса.
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    className="flex-1 border-white/20"
                    onClick={onClose}
                  >
                    Отмена
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500"
                    onClick={handleAutoSettingsSave}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Сохранить
                  </Button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AutoRebuyAddonDialog;
