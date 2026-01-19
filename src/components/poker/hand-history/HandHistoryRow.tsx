import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Coins, Users, Clock, Play, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MiniCardGroup } from './MiniPokerCard';

export interface HandRowData {
  id: string;
  handNumber: number;
  timestamp: string;
  pot: number;
  communityCards: string[];
  myCards: string[];
  result: 'won' | 'lost' | 'folded';
  amountWon: number;
  amountLost: number;
  playerCount: number;
  winnerName?: string;
  handRank?: string;
  tableName?: string;
}

interface HandHistoryRowProps {
  hand: HandRowData;
  isSelected?: boolean;
  onSelect: () => void;
  onReplay?: () => void;
  compact?: boolean;
}

export function HandHistoryRow({ hand, isSelected, onSelect, onReplay, compact = false }: HandHistoryRowProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const getResultInfo = () => {
    switch (hand.result) {
      case 'won':
        return {
          icon: TrendingUp,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10 border-green-500/30',
          label: `+${hand.amountWon.toLocaleString()}`
        };
      case 'lost':
        return {
          icon: TrendingDown,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10 border-red-500/30',
          label: `-${hand.amountLost.toLocaleString()}`
        };
      case 'folded':
        return {
          icon: Minus,
          color: 'text-muted-foreground',
          bgColor: 'border-muted',
          label: 'Фолд'
        };
    }
  };

  const resultInfo = getResultInfo();
  const ResultIcon = resultInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group border rounded-lg transition-all cursor-pointer',
        resultInfo.bgColor,
        isSelected && 'ring-2 ring-primary',
        !compact ? 'p-3' : 'p-2'
      )}
      onClick={onSelect}
    >
      {/* Main Row */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Hand info */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Hand number & time */}
          <div className="flex flex-col min-w-16">
            <span className="text-xs font-medium text-foreground">#{hand.handNumber}</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {formatTime(hand.timestamp)}
            </span>
          </div>

          {/* Community Cards */}
          <div className="hidden sm:flex items-center gap-2">
            {hand.communityCards.length > 0 ? (
              <MiniCardGroup cards={hand.communityCards} size="xs" />
            ) : (
              <span className="text-[10px] text-muted-foreground">—</span>
            )}
          </div>

          {/* My Cards */}
          {hand.myCards.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground hidden md:inline">Мои:</span>
              <MiniCardGroup cards={hand.myCards} size="xs" overlap={false} />
            </div>
          )}
        </div>

        {/* Right: Result and actions */}
        <div className="flex items-center gap-2">
          {/* Pot */}
          <Badge variant="outline" className="text-xs gap-1 hidden sm:flex">
            <Coins className="w-3 h-3 text-amber-500" />
            {hand.pot.toLocaleString()}
          </Badge>

          {/* Players count */}
          <Badge variant="outline" className="text-xs gap-1 hidden md:flex">
            <Users className="w-3 h-3" />
            {hand.playerCount}
          </Badge>

          {/* Result */}
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-md font-medium text-sm min-w-20 justify-center',
            resultInfo.color,
            hand.result === 'won' && 'bg-green-500/20',
            hand.result === 'lost' && 'bg-red-500/20'
          )}>
            <ResultIcon className="w-3.5 h-3.5" />
            {resultInfo.label}
          </div>

          {/* Replay button */}
          {onReplay && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onReplay();
              }}
            >
              <Play className="w-3.5 h-3.5" />
            </Button>
          )}

          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Winner info (when won or on hover) */}
      {hand.result === 'won' && hand.handRank && !compact && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <Trophy className="w-3 h-3 text-amber-500" />
          <span className="text-green-500 font-medium">{hand.handRank}</span>
        </div>
      )}
    </motion.div>
  );
}
