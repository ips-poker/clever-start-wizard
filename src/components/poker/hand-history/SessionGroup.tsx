import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Calendar, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HandHistoryRow, HandRowData } from './HandHistoryRow';

interface SessionGroupProps {
  date: string;
  hands: HandRowData[];
  totalWon: number;
  totalLost: number;
  onSelectHand: (hand: HandRowData) => void;
  onReplayHand?: (hand: HandRowData) => void;
  defaultExpanded?: boolean;
}

export function SessionGroup({
  date,
  hands,
  totalWon,
  totalLost,
  onSelectHand,
  onReplayHand,
  defaultExpanded = true
}: SessionGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const netResult = totalWon - totalLost;
  const isProfit = netResult >= 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
      return 'Сегодня';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    }
    return date.toLocaleDateString('ru-RU', {
      weekday: 'short',
      day: 'numeric',
      month: 'long'
    });
  };

  const getDuration = () => {
    if (hands.length < 2) return null;
    const first = new Date(hands[hands.length - 1].timestamp);
    const last = new Date(hands[0].timestamp);
    const diffMs = last.getTime() - first.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} мин`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}ч ${mins}м`;
  };

  const duration = getDuration();

  return (
    <div className="space-y-2">
      {/* Session Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between p-2 rounded-lg',
          'bg-gradient-to-r from-slate-800/80 to-slate-800/40',
          'hover:from-slate-700/80 hover:to-slate-700/40 transition-colors',
          'border border-slate-700/50'
        )}
      >
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">{formatDate(date)}</span>
          <Badge variant="secondary" className="text-xs">
            {hands.length} рук
          </Badge>
          {duration && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {duration}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Net result for session */}
          <div className={cn(
            'flex items-center gap-1 text-sm font-bold',
            isProfit ? 'text-green-500' : 'text-red-500'
          )}>
            {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {isProfit ? '+' : ''}{netResult.toLocaleString()}
          </div>

          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Hands List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5 pl-2"
          >
            {hands.map((hand) => (
              <HandHistoryRow
                key={hand.id}
                hand={hand}
                onSelect={() => onSelectHand(hand)}
                onReplay={onReplayHand ? () => onReplayHand(hand) : undefined}
                compact
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
