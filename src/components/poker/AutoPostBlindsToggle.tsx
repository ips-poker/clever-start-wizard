import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AutoPostBlindsToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * PokerStars-style Auto-post blinds toggle
 * When enabled, player automatically posts blinds when returning from sit-out
 */
export const AutoPostBlindsToggle: React.FC<AutoPostBlindsToggleProps> = ({
  enabled,
  onChange,
  size = 'sm',
  className
}) => {
  const isSmall = size === 'sm';
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg",
              "bg-background/80 backdrop-blur-sm border border-border/50",
              "hover:bg-background/90 transition-colors cursor-pointer",
              isSmall ? "text-xs" : "text-sm",
              className
            )}
            onClick={() => onChange(!enabled)}
          >
            <DollarSign className={cn(
              "text-muted-foreground",
              isSmall ? "h-3 w-3" : "h-4 w-4"
            )} />
            <span className="text-muted-foreground whitespace-nowrap">
              Auto-post
            </span>
            <Switch
              checked={enabled}
              onCheckedChange={onChange}
              className={cn(
                "data-[state=checked]:bg-emerald-500",
                isSmall && "scale-75"
              )}
            />
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm font-medium mb-1">Auto-post Blinds</p>
          <p className="text-xs text-muted-foreground">
            {enabled 
              ? "Блайнды будут автоматически ставиться при возврате из sit-out"
              : "Включите для автоматической постановки блайндов при возврате в игру"
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Compact inline version for player controls area
 */
interface AutoPostBlindsInlineProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export const AutoPostBlindsInline: React.FC<AutoPostBlindsInlineProps> = ({
  enabled,
  onChange
}) => {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded text-[10px]",
        "transition-all duration-200",
        enabled 
          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
          : "bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted"
      )}
    >
      {enabled && <Check className="h-3 w-3" />}
      <DollarSign className="h-3 w-3" />
      <span>Auto BB</span>
    </button>
  );
};

export default AutoPostBlindsToggle;
