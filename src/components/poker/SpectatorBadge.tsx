import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SpectatorBadgeProps {
  count: number;
  isSpectator?: boolean;
  className?: string;
}

export function SpectatorBadge({ count, isSpectator, className }: SpectatorBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("flex items-center gap-1", className)}
    >
      <Badge 
        variant={isSpectator ? "secondary" : "outline"} 
        className={cn(
          "gap-1 text-xs",
          isSpectator && "bg-blue-500/20 text-blue-400 border-blue-500/30"
        )}
      >
        <Eye className="h-3 w-3" />
        {isSpectator ? 'Зритель' : (
          <>
            <Users className="h-3 w-3" />
            {count}
          </>
        )}
      </Badge>
    </motion.div>
  );
}

interface SpectatorListProps {
  spectators: Array<{ id: string; name?: string }>;
  className?: string;
}

export function SpectatorList({ spectators, className }: SpectatorListProps) {
  if (spectators.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-3 rounded-lg bg-muted/30 border border-border/50",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">
          Зрители ({spectators.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {spectators.map((spectator) => (
          <Badge key={spectator.id} variant="outline" className="text-xs">
            {spectator.name || `Гость ${spectator.id.slice(0, 4)}`}
          </Badge>
        ))}
      </div>
    </motion.div>
  );
}
