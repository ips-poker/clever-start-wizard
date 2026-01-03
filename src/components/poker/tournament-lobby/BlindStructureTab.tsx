import React, { useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Coffee,
  ChevronRight,
  Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlindLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number | null;
  duration: number; // в секундах
  is_break: boolean;
}

interface BlindStructureTabProps {
  levels: BlindLevel[];
  currentLevel: number;
  timeRemaining?: number; // в секундах
  className?: string;
}

export function BlindStructureTab({ 
  levels, 
  currentLevel, 
  timeRemaining = 0,
  className 
}: BlindStructureTabProps) {
  const currentLevelRef = useRef<HTMLDivElement>(null);

  // Scroll to current level on mount
  useEffect(() => {
    if (currentLevelRef.current) {
      currentLevelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLevel]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} мин`;
  };

  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentLevelData = levels.find(l => l.level === currentLevel);
  const levelProgress = currentLevelData && timeRemaining 
    ? ((currentLevelData.duration - timeRemaining) / currentLevelData.duration) * 100
    : 0;

  // Find next non-break level
  const nextLevel = levels.find(l => l.level > currentLevel && !l.is_break);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Current Level Info */}
      {currentLevelData && (
        <div className="mb-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-primary">
                Уровень {currentLevel}
              </Badge>
              {currentLevelData.is_break ? (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                  <Coffee className="h-3 w-3 mr-1" />
                  Перерыв
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-1 text-lg font-mono">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="font-bold">{formatTimeRemaining(timeRemaining)}</span>
            </div>
          </div>
          
          {!currentLevelData.is_break && (
            <div className="flex items-center gap-4 mb-3">
              <div>
                <span className="text-2xl font-bold">
                  {currentLevelData.small_blind}/{currentLevelData.big_blind}
                </span>
                {currentLevelData.ante && currentLevelData.ante > 0 && (
                  <span className="text-muted-foreground ml-2">
                    (ante {currentLevelData.ante})
                  </span>
                )}
              </div>
            </div>
          )}
          
          <Progress value={levelProgress} className="h-2" />
          
          {nextLevel && (
            <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
              <ChevronRight className="h-4 w-4" />
              <span>Следующий:</span>
              <span className="font-medium text-foreground">
                {nextLevel.small_blind}/{nextLevel.big_blind}
                {nextLevel.ante && nextLevel.ante > 0 && ` (${nextLevel.ante})`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 rounded-lg mb-2 text-xs font-medium text-muted-foreground">
        <div className="col-span-2">Уровень</div>
        <div className="col-span-4">Блайнды</div>
        <div className="col-span-2 text-center">Анте</div>
        <div className="col-span-2 text-center">Время</div>
        <div className="col-span-2 text-right">Статус</div>
      </div>

      {/* Levels List */}
      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {levels.map((level) => {
            const isCurrent = level.level === currentLevel;
            const isPast = level.level < currentLevel;
            const isFuture = level.level > currentLevel;

            return (
              <div
                key={level.level}
                ref={isCurrent ? currentLevelRef : null}
                className={cn(
                  "grid grid-cols-12 gap-2 px-3 py-3 rounded-lg items-center transition-all",
                  isCurrent && "bg-primary/10 border border-primary/30 shadow-sm",
                  isPast && "opacity-50",
                  level.is_break && "bg-amber-500/5",
                  isFuture && !level.is_break && "hover:bg-muted/50"
                )}
              >
                {/* Level Number */}
                <div className="col-span-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    isCurrent && "bg-primary text-primary-foreground",
                    isPast && "bg-muted text-muted-foreground",
                    isFuture && !level.is_break && "bg-muted/50",
                    level.is_break && "bg-amber-500/20 text-amber-500"
                  )}>
                    {level.is_break ? (
                      <Coffee className="h-4 w-4" />
                    ) : (
                      level.level
                    )}
                  </div>
                </div>

                {/* Blinds */}
                <div className="col-span-4">
                  {level.is_break ? (
                    <span className="text-amber-500 font-medium">Перерыв</span>
                  ) : (
                    <span className={cn(
                      "font-mono font-medium",
                      isCurrent && "text-lg"
                    )}>
                      {level.small_blind.toLocaleString()}/{level.big_blind.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Ante */}
                <div className="col-span-2 text-center text-muted-foreground">
                  {level.is_break ? '—' : (
                    level.ante && level.ante > 0 ? level.ante.toLocaleString() : '—'
                  )}
                </div>

                {/* Duration */}
                <div className="col-span-2 text-center flex items-center justify-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(level.duration)}</span>
                </div>

                {/* Status */}
                <div className="col-span-2 text-right">
                  {isCurrent && (
                    <Badge className="bg-primary animate-pulse">
                      Сейчас
                    </Badge>
                  )}
                  {isPast && (
                    <Badge variant="outline" className="text-muted-foreground">
                      Пройден
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
