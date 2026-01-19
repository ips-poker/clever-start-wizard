import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Trophy, Percent, Coins, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HandHistoryStatsProps {
  totalHands: number;
  totalWon: number;
  totalLost: number;
  winRate: number;
  biggestWin: number;
  biggestPot: number;
  className?: string;
}

export function HandHistoryStats({
  totalHands,
  totalWon,
  totalLost,
  winRate,
  biggestWin,
  biggestPot,
  className
}: HandHistoryStatsProps) {
  const netProfit = totalWon - totalLost;
  const isProfit = netProfit >= 0;

  const stats = [
    {
      label: 'Руки',
      value: totalHands.toLocaleString(),
      icon: Target,
      color: 'text-blue-500'
    },
    {
      label: 'Win Rate',
      value: `${winRate.toFixed(1)}%`,
      icon: Percent,
      color: winRate >= 50 ? 'text-green-500' : 'text-red-500'
    },
    {
      label: 'P/L',
      value: `${isProfit ? '+' : ''}${netProfit.toLocaleString()}`,
      icon: isProfit ? TrendingUp : TrendingDown,
      color: isProfit ? 'text-green-500' : 'text-red-500'
    },
    {
      label: 'Макс. выигрыш',
      value: `+${biggestWin.toLocaleString()}`,
      icon: Trophy,
      color: 'text-amber-500'
    },
    {
      label: 'Макс. банк',
      value: biggestPot.toLocaleString(),
      icon: Coins,
      color: 'text-purple-500'
    }
  ];

  return (
    <Card className={cn('p-3 bg-gradient-to-r from-slate-900 to-slate-800', className)}>
      <div className="grid grid-cols-5 gap-2">
        {stats.map((stat, i) => (
          <div key={i} className="flex flex-col items-center text-center">
            <stat.icon className={cn('w-4 h-4 mb-1', stat.color)} />
            <span className={cn('text-sm font-bold', stat.color)}>{stat.value}</span>
            <span className="text-[10px] text-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
