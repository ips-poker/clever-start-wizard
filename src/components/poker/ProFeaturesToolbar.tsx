/**
 * Pro Features Toolbar
 * Quick access buttons for rabbit hunt, run it twice, insurance, cashout
 */

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rabbit, 
  Repeat2, 
  Shield, 
  DollarSign,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatChipAmount } from './AnimatedChips';

interface ProFeaturesToolbarProps {
  // Rabbit Hunt
  canRabbitHunt: boolean;
  rabbitHuntCost: number;
  onRabbitHunt: () => void;
  rabbitHuntActive: boolean;
  
  // Run It Twice
  canRunItTwice: boolean;
  onRunItTwice: () => void;
  runItTwiceActive: boolean;
  
  // Insurance
  hasInsuranceOptions: boolean;
  onOpenInsurance: () => void;
  
  // Cashout
  hasCashoutOffer: boolean;
  cashoutAmount?: number;
  onOpenCashout: () => void;
  
  // General
  playerStack: number;
  compact?: boolean;
  className?: string;
}

export const ProFeaturesToolbar = memo(function ProFeaturesToolbar({
  canRabbitHunt,
  rabbitHuntCost,
  onRabbitHunt,
  rabbitHuntActive,
  canRunItTwice,
  onRunItTwice,
  runItTwiceActive,
  hasInsuranceOptions,
  onOpenInsurance,
  hasCashoutOffer,
  cashoutAmount,
  onOpenCashout,
  playerStack,
  compact = false,
  className
}: ProFeaturesToolbarProps) {
  const canAffordRabbitHunt = playerStack >= rabbitHuntCost;
  
  // Don't render if no features available
  if (!canRabbitHunt && !canRunItTwice && !hasInsuranceOptions && !hasCashoutOffer) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <AnimatePresence mode="popLayout">
          {canRabbitHunt && !rabbitHuntActive && (
            <ToolbarIconButton
              key="rabbit"
              icon={Rabbit}
              color="purple"
              disabled={!canAffordRabbitHunt}
              onClick={onRabbitHunt}
              tooltip={`Rabbit Hunt (${rabbitHuntCost})`}
            />
          )}
          
          {canRunItTwice && !runItTwiceActive && (
            <ToolbarIconButton
              key="rit"
              icon={Repeat2}
              color="blue"
              onClick={onRunItTwice}
              tooltip="Run It Twice"
            />
          )}
          
          {hasInsuranceOptions && (
            <ToolbarIconButton
              key="insurance"
              icon={Shield}
              color="amber"
              onClick={onOpenInsurance}
              tooltip="All-In Insurance"
            />
          )}
          
          {hasCashoutOffer && (
            <ToolbarIconButton
              key="cashout"
              icon={DollarSign}
              color="green"
              onClick={onOpenCashout}
              tooltip={cashoutAmount ? `Cashout ${formatChipAmount(cashoutAmount)}` : 'EV Cashout'}
              highlight
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-wrap items-center gap-2 p-2 rounded-xl",
        "bg-black/40 backdrop-blur-md border border-white/10",
        className
      )}
    >
      <div className="flex items-center gap-1 px-2">
        <Sparkles className="w-3 h-3 text-amber-400" />
        <span className="text-[10px] font-medium text-white/60 uppercase tracking-wide">Pro</span>
      </div>

      <div className="w-px h-4 bg-white/20" />

      <AnimatePresence mode="popLayout">
        {/* Rabbit Hunt */}
        {canRabbitHunt && !rabbitHuntActive && (
          <motion.div
            key="rabbit-hunt"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Button
              size="sm"
              variant="ghost"
              disabled={!canAffordRabbitHunt}
              onClick={onRabbitHunt}
              className={cn(
                "h-8 gap-1.5 text-xs",
                "bg-purple-500/10 hover:bg-purple-500/20 text-purple-400",
                "border border-purple-500/30"
              )}
            >
              <Rabbit className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rabbit</span>
              <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1.5 bg-purple-500/20">
                {rabbitHuntCost}
              </Badge>
            </Button>
          </motion.div>
        )}

        {/* Run It Twice */}
        {canRunItTwice && !runItTwiceActive && (
          <motion.div
            key="run-it-twice"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Button
              size="sm"
              variant="ghost"
              onClick={onRunItTwice}
              className={cn(
                "h-8 gap-1.5 text-xs",
                "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400",
                "border border-blue-500/30"
              )}
            >
              <Repeat2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Run It Twice</span>
            </Button>
          </motion.div>
        )}

        {/* Insurance */}
        {hasInsuranceOptions && (
          <motion.div
            key="insurance"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Button
              size="sm"
              variant="ghost"
              onClick={onOpenInsurance}
              className={cn(
                "h-8 gap-1.5 text-xs",
                "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400",
                "border border-amber-500/30"
              )}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Insurance</span>
            </Button>
          </motion.div>
        )}

        {/* Cashout */}
        {hasCashoutOffer && (
          <motion.div
            key="cashout"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Button
              size="sm"
              onClick={onOpenCashout}
              className={cn(
                "h-8 gap-1.5 text-xs",
                "bg-gradient-to-r from-green-600 to-emerald-600",
                "hover:from-green-500 hover:to-emerald-500",
                "text-white shadow-lg shadow-green-500/25"
              )}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Cashout</span>
              {cashoutAmount && (
                <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1.5 bg-white/20">
                  {formatChipAmount(cashoutAmount)}
                </Badge>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active indicators */}
      {rabbitHuntActive && (
        <Badge variant="outline" className="h-6 gap-1 border-purple-500/50 text-purple-400 text-[10px]">
          <Rabbit className="w-3 h-3" />
          Active
        </Badge>
      )}
      
      {runItTwiceActive && (
        <Badge variant="outline" className="h-6 gap-1 border-blue-500/50 text-blue-400 text-[10px]">
          <Repeat2 className="w-3 h-3" />
          RIT
        </Badge>
      )}
    </motion.div>
  );
});

// Compact icon button for toolbar
interface ToolbarIconButtonProps {
  icon: React.ElementType;
  color: 'purple' | 'blue' | 'amber' | 'green';
  disabled?: boolean;
  onClick: () => void;
  tooltip: string;
  highlight?: boolean;
}

const ToolbarIconButton = memo(function ToolbarIconButton({
  icon: Icon,
  color,
  disabled,
  onClick,
  tooltip,
  highlight
}: ToolbarIconButtonProps) {
  const colorClasses = {
    purple: 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border-purple-500/30',
    blue: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/30',
    amber: 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-amber-500/30',
    green: 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/30'
  };

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      disabled={disabled}
      onClick={onClick}
      title={tooltip}
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center",
        "border transition-all",
        colorClasses[color],
        disabled && "opacity-50 cursor-not-allowed",
        highlight && "ring-2 ring-offset-2 ring-offset-black ring-green-500/50 animate-pulse"
      )}
    >
      <Icon className="w-4 h-4" />
    </motion.button>
  );
});
