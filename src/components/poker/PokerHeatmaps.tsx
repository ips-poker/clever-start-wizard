import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, TrendingDown, Target, MapPin, 
  Clock, Zap, Flame, Snowflake
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Position statistics
export interface PositionHeatmapData {
  position: 'BTN' | 'CO' | 'MP' | 'EP' | 'SB' | 'BB';
  handsPlayed: number;
  vpip: number;    // Voluntarily Put $ In Pot
  pfr: number;     // Pre-Flop Raise
  winRate: number; // BB/100
  profit: number;
  aggression: number;
}

// Card heatmap data
export interface CardHeatmapData {
  card: string; // e.g., "AA", "AKs", "72o"
  timesDealt: number;
  timesPlayed: number;
  winRate: number;
  profit: number;
  showdownWin: number;
}

interface PositionHeatmapProps {
  data: PositionHeatmapData[];
  metric: 'vpip' | 'pfr' | 'winRate' | 'aggression';
  className?: string;
}

// Position order for display
const POSITION_ORDER = ['EP', 'MP', 'CO', 'BTN', 'SB', 'BB'];

export function PositionHeatmap({ data, metric, className }: PositionHeatmapProps) {
  const getColor = (value: number, type: typeof metric) => {
    // Different scales for different metrics
    const ranges = {
      vpip: { low: 15, mid: 25, high: 40 },
      pfr: { low: 10, mid: 18, high: 30 },
      winRate: { low: -5, mid: 0, high: 10 },
      aggression: { low: 1, mid: 2, high: 4 },
    };
    
    const range = ranges[type];
    
    if (type === 'winRate') {
      if (value < range.low) return 'bg-red-600';
      if (value < range.mid) return 'bg-red-400';
      if (value < range.high) return 'bg-green-400';
      return 'bg-green-600';
    }
    
    if (value < range.low) return 'bg-blue-400';
    if (value < range.mid) return 'bg-yellow-400';
    if (value < range.high) return 'bg-orange-400';
    return 'bg-red-500';
  };

  const getValue = (pos: PositionHeatmapData) => {
    switch (metric) {
      case 'vpip': return pos.vpip;
      case 'pfr': return pos.pfr;
      case 'winRate': return pos.winRate;
      case 'aggression': return pos.aggression;
    }
  };

  const formatValue = (value: number) => {
    if (metric === 'winRate') return `${value >= 0 ? '+' : ''}${value.toFixed(1)} BB/100`;
    if (metric === 'aggression') return `${value.toFixed(1)}x`;
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Позиции</span>
        <span className="text-xs text-muted-foreground uppercase">
          {metric === 'vpip' ? 'VPIP' : 
           metric === 'pfr' ? 'PFR' : 
           metric === 'winRate' ? 'Win Rate' : 'Aggression'}
        </span>
      </div>
      
      <div className="flex gap-1">
        {POSITION_ORDER.map((posName) => {
          const posData = data.find(d => d.position === posName);
          if (!posData) return null;
          
          const value = getValue(posData);
          const color = getColor(value, metric);
          
          return (
            <TooltipProvider key={posName}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className={cn(
                      "flex-1 p-2 rounded-lg text-center cursor-pointer",
                      color
                    )}
                  >
                    <p className="text-xs font-bold text-white/90">{posName}</p>
                    <p className="text-lg font-bold text-white">{value.toFixed(0)}</p>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent className="p-3">
                  <div className="space-y-1">
                    <p className="font-bold">{posName}</p>
                    <p className="text-sm">Рук: {posData.handsPlayed}</p>
                    <p className="text-sm">VPIP: {posData.vpip.toFixed(1)}%</p>
                    <p className="text-sm">PFR: {posData.pfr.toFixed(1)}%</p>
                    <p className="text-sm">Win Rate: {posData.winRate >= 0 ? '+' : ''}{posData.winRate.toFixed(1)} BB/100</p>
                    <p className="text-sm">Профит: {posData.profit >= 0 ? '+' : ''}{posData.profit.toLocaleString()}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Snowflake className="w-3 h-3 text-blue-400" />
          <span>Тайт</span>
        </div>
        <div className="flex items-center gap-1">
          <Flame className="w-3 h-3 text-red-400" />
          <span>Лузовый</span>
        </div>
      </div>
    </div>
  );
}

// Hand matrix heatmap (13x13 grid)
interface HandMatrixProps {
  data: CardHeatmapData[];
  metric: 'winRate' | 'profit' | 'playRate';
  className?: string;
}

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

export function HandMatrix({ data, metric, className }: HandMatrixProps) {
  // Create matrix lookup
  const matrixData = useMemo(() => {
    const lookup: Record<string, CardHeatmapData> = {};
    data.forEach(d => {
      lookup[d.card] = d;
    });
    return lookup;
  }, [data]);

  const getHandKey = (row: number, col: number): string => {
    const r1 = RANKS[row];
    const r2 = RANKS[col];
    if (row === col) return `${r1}${r2}`; // Pairs
    if (row < col) return `${r1}${r2}s`;  // Suited (upper triangle)
    return `${r2}${r1}o`;                  // Offsuit (lower triangle)
  };

  const getColor = (hand: CardHeatmapData | undefined) => {
    if (!hand) return 'bg-slate-800';
    
    const value = metric === 'winRate' ? hand.winRate : 
                  metric === 'profit' ? hand.profit : 
                  (hand.timesPlayed / Math.max(hand.timesDealt, 1)) * 100;
    
    if (metric === 'profit' || metric === 'winRate') {
      if (value < -20) return 'bg-red-700';
      if (value < -5) return 'bg-red-500';
      if (value < 0) return 'bg-red-400/50';
      if (value < 5) return 'bg-green-400/30';
      if (value < 20) return 'bg-green-500';
      return 'bg-green-600';
    }
    
    // Play rate
    if (value < 10) return 'bg-slate-700';
    if (value < 30) return 'bg-blue-600/50';
    if (value < 60) return 'bg-blue-500';
    return 'bg-blue-400';
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Матрица рук</span>
        <span className="text-xs text-muted-foreground">
          {metric === 'winRate' ? 'Win Rate' : 
           metric === 'profit' ? 'Профит' : 'Частота игры'}
        </span>
      </div>
      
      <div className="grid grid-cols-13 gap-[1px] bg-slate-700/50 p-[1px] rounded-lg overflow-hidden">
        {RANKS.map((_, row) => (
          RANKS.map((_, col) => {
            const handKey = getHandKey(row, col);
            const hand = matrixData[handKey];
            const isPair = row === col;
            const isSuited = row < col;
            
            return (
              <TooltipProvider key={`${row}-${col}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.2, zIndex: 10 }}
                      className={cn(
                        "aspect-square flex items-center justify-center cursor-pointer",
                        "text-[8px] font-medium transition-colors",
                        getColor(hand),
                        isPair && "ring-1 ring-amber-400/50"
                      )}
                    >
                      <span className={cn(
                        "text-white/90",
                        isSuited && "text-red-200",
                        !isSuited && !isPair && "text-slate-300"
                      )}>
                        {handKey.substring(0, 2)}
                      </span>
                    </motion.div>
                  </TooltipTrigger>
                  {hand && (
                    <TooltipContent className="p-2">
                      <div className="space-y-1 text-xs">
                        <p className="font-bold">{handKey}</p>
                        <p>Сдано: {hand.timesDealt}</p>
                        <p>Сыграно: {hand.timesPlayed}</p>
                        <p>Win Rate: {hand.winRate.toFixed(1)}%</p>
                        <p>Профит: {hand.profit >= 0 ? '+' : ''}{hand.profit}</p>
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          })
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex gap-2">
          <span className="text-red-300">Suited ↗</span>
          <span className="text-slate-400">Offsuit ↙</span>
          <span className="text-amber-300 ring-1 ring-amber-400/50 px-1 rounded">Pairs ↘</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span className="text-muted-foreground">-EV</span>
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span className="text-muted-foreground">+EV</span>
        </div>
      </div>
    </div>
  );
}

// Session timeline heatmap
interface SessionHeatmapData {
  hour: number; // 0-23
  dayOfWeek: number; // 0-6 (Sun-Sat)
  handsPlayed: number;
  profit: number;
  winRate: number;
}

interface SessionHeatmapProps {
  data: SessionHeatmapData[];
  className?: string;
}

const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export function SessionHeatmap({ data, className }: SessionHeatmapProps) {
  const dataMap = useMemo(() => {
    const map: Record<string, SessionHeatmapData> = {};
    data.forEach(d => {
      map[`${d.dayOfWeek}-${d.hour}`] = d;
    });
    return map;
  }, [data]);

  const getColor = (value: SessionHeatmapData | undefined) => {
    if (!value || value.handsPlayed === 0) return 'bg-slate-800/50';
    
    const wr = value.winRate;
    if (wr < -10) return 'bg-red-600';
    if (wr < -2) return 'bg-red-400';
    if (wr < 2) return 'bg-slate-600';
    if (wr < 10) return 'bg-green-400';
    return 'bg-green-600';
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Время игры</span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Лучшие часы для игры</span>
        </div>
      </div>
      
      <div className="space-y-1">
        {/* Hours header */}
        <div className="flex ml-8">
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} className="flex-1 text-center text-[8px] text-muted-foreground">
              {i % 4 === 0 ? i : ''}
            </div>
          ))}
        </div>
        
        {/* Grid */}
        {DAYS.map((day, dayIndex) => (
          <div key={day} className="flex items-center gap-1">
            <span className="w-6 text-xs text-muted-foreground">{day}</span>
            <div className="flex-1 flex gap-[1px]">
              {Array.from({ length: 24 }, (_, hour) => {
                const cellData = dataMap[`${dayIndex}-${hour}`];
                return (
                  <TooltipProvider key={hour}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "flex-1 h-4 rounded-sm transition-colors",
                            getColor(cellData),
                            "hover:ring-1 hover:ring-white/50"
                          )}
                        />
                      </TooltipTrigger>
                      {cellData && cellData.handsPlayed > 0 && (
                        <TooltipContent className="text-xs">
                          <p>{day} {hour}:00-{hour + 1}:00</p>
                          <p>Рук: {cellData.handsPlayed}</p>
                          <p>Win Rate: {cellData.winRate >= 0 ? '+' : ''}{cellData.winRate.toFixed(1)} BB/100</p>
                          <p>Профит: {cellData.profit >= 0 ? '+' : ''}{cellData.profit}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <TrendingDown className="w-3 h-3 text-red-400" />
          <span className="text-muted-foreground">Убыточные часы</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-green-400" />
          <span className="text-muted-foreground">Прибыльные часы</span>
        </div>
      </div>
    </div>
  );
}
