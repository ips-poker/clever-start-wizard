/**
 * Smart HUD Component
 * Professional heads-up display for poker tables
 * Similar to PokerTracker/Hold'em Manager
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Percent,
  AlertTriangle,
  Zap,
  BarChart3,
  Eye
} from 'lucide-react';
import { PlayerStats, getPlayerType, formatPercentage } from '@/utils/pokerAnalytics';

interface SmartHUDProps {
  playerId: string;
  playerName: string;
  stats: PlayerStats | null;
  isActive?: boolean;
  compact?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

interface HUDStat {
  label: string;
  value: string;
  color: string;
  tooltip: string;
}

export function SmartHUD({ 
  playerId, 
  playerName, 
  stats, 
  isActive = false,
  compact = false,
  position = 'bottom',
  className = ''
}: SmartHUDProps) {
  
  const hudStats = useMemo((): HUDStat[] => {
    if (!stats || stats.handsPlayed < 10) {
      return [];
    }
    
    const vpipColor = stats.vpip > 35 ? 'text-red-400' : 
                      stats.vpip > 25 ? 'text-yellow-400' : 
                      stats.vpip < 15 ? 'text-blue-400' : 'text-green-400';
    
    const pfrColor = stats.pfr > 25 ? 'text-red-400' :
                     stats.pfr > 18 ? 'text-yellow-400' :
                     stats.pfr < 10 ? 'text-blue-400' : 'text-green-400';
    
    const afColor = stats.afPostflop > 4 ? 'text-red-400' :
                    stats.afPostflop > 2.5 ? 'text-yellow-400' :
                    stats.afPostflop < 1.5 ? 'text-blue-400' : 'text-green-400';
    
    const threeBetColor = stats.threeBet > 12 ? 'text-red-400' :
                          stats.threeBet > 8 ? 'text-yellow-400' :
                          stats.threeBet < 4 ? 'text-blue-400' : 'text-green-400';
    
    return [
      {
        label: 'VPIP',
        value: formatPercentage(stats.vpip, 0),
        color: vpipColor,
        tooltip: 'Voluntarily Put money In Pot'
      },
      {
        label: 'PFR',
        value: formatPercentage(stats.pfr, 0),
        color: pfrColor,
        tooltip: 'Pre-Flop Raise %'
      },
      {
        label: 'AF',
        value: stats.afPostflop.toFixed(1),
        color: afColor,
        tooltip: 'Aggression Factor (Bet+Raise)/Call'
      },
      {
        label: '3B',
        value: formatPercentage(stats.threeBet, 0),
        color: threeBetColor,
        tooltip: '3-Bet Percentage'
      }
    ];
  }, [stats]);
  
  const playerType = useMemo(() => {
    if (!stats || stats.handsPlayed < 20) return null;
    return getPlayerType(stats.vpip, stats.pfr);
  }, [stats]);
  
  const sampleSize = stats?.handsPlayed || 0;
  const sampleSizeColor = sampleSize < 50 ? 'text-red-400' : 
                          sampleSize < 200 ? 'text-yellow-400' : 'text-green-400';
  
  if (!stats || stats.handsPlayed < 10) {
    return (
      <div className={`${className} bg-black/60 backdrop-blur-sm rounded px-2 py-1 text-xs text-muted-foreground`}>
        <span className="opacity-50">Нет данных</span>
      </div>
    );
  }
  
  if (compact) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`${className} bg-black/80 backdrop-blur-sm rounded-lg border border-border/30 px-2 py-1`}
      >
        <div className="flex items-center gap-2 text-xs">
          {hudStats.slice(0, 3).map((stat, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-muted-foreground">{stat.label}</span>
              <span className={stat.color}>{stat.value}</span>
            </div>
          ))}
          <span className={`${sampleSizeColor} ml-1`}>({sampleSize})</span>
        </div>
      </motion.div>
    );
  }
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: position === 'top' ? -10 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: position === 'top' ? -10 : 10 }}
        className={`
          ${className}
          bg-gradient-to-br from-black/90 to-black/70 
          backdrop-blur-md rounded-lg 
          border border-border/40
          shadow-lg shadow-black/20
          overflow-hidden
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30">
          <div className="flex items-center gap-2">
            {playerType && (
              <span 
                className={`
                  px-1.5 py-0.5 rounded text-[10px] font-bold
                  ${playerType.color === 'green' ? 'bg-green-500/20 text-green-400' :
                    playerType.color === 'red' ? 'bg-red-500/20 text-red-400' :
                    playerType.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                    playerType.color === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                    playerType.color === 'purple' ? 'bg-purple-500/20 text-purple-400' :
                    playerType.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-muted text-muted-foreground'}
                `}
              >
                {playerType.type}
              </span>
            )}
            <span className={`text-[10px] ${sampleSizeColor}`}>
              {sampleSize} рук
            </span>
          </div>
          {isActive && (
            <Zap className="w-3 h-3 text-yellow-400 animate-pulse" />
          )}
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-1 p-2">
          {hudStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="text-center group relative"
              title={stat.tooltip}
            >
              <div className={`text-sm font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-[9px] text-muted-foreground">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Extended Stats (on hover) */}
        <div className="px-2 pb-2 pt-1 border-t border-border/30 grid grid-cols-3 gap-2 text-[10px]">
          <div className="text-center">
            <div className="text-muted-foreground">WTSD</div>
            <div className="text-foreground">{formatPercentage(stats.wtsd, 0)}</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">W$SD</div>
            <div className="text-foreground">{formatPercentage(stats.wsd, 0)}</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">C-Bet</div>
            <div className="text-foreground">{formatPercentage(stats.cbet, 0)}</div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Mini HUD for table display
 */
export function MiniHUD({ stats, className = '' }: { stats: PlayerStats | null; className?: string }) {
  if (!stats || stats.handsPlayed < 10) {
    return null;
  }
  
  const playerType = getPlayerType(stats.vpip, stats.pfr);
  const typeColors: Record<string, string> = {
    green: 'border-green-500/50 bg-green-500/10',
    red: 'border-red-500/50 bg-red-500/10',
    yellow: 'border-yellow-500/50 bg-yellow-500/10',
    orange: 'border-orange-500/50 bg-orange-500/10',
    purple: 'border-purple-500/50 bg-purple-500/10',
    blue: 'border-blue-500/50 bg-blue-500/10',
    gray: 'border-border bg-muted/50'
  };
  
  return (
    <div className={`
      ${className}
      ${typeColors[playerType.color] || typeColors.gray}
      border rounded px-1.5 py-0.5 text-[10px] font-mono
      flex items-center gap-1.5
    `}>
      <span className="text-muted-foreground">{formatPercentage(stats.vpip, 0)}</span>
      <span>/</span>
      <span className="text-muted-foreground">{formatPercentage(stats.pfr, 0)}</span>
      <span>/</span>
      <span className="text-muted-foreground">{stats.afPostflop.toFixed(1)}</span>
    </div>
  );
}

/**
 * Action indicator based on player tendencies
 */
export function TendencyIndicator({ 
  stats, 
  action 
}: { 
  stats: PlayerStats | null; 
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise';
}) {
  if (!stats || stats.handsPlayed < 50) return null;
  
  const getIndicator = () => {
    switch (action) {
      case 'raise':
      case 'bet':
        if (stats.afPostflop > 3) {
          return { icon: AlertTriangle, color: 'text-yellow-400', text: 'Часто блефует' };
        }
        if (stats.afPostflop < 1.5) {
          return { icon: Target, color: 'text-red-400', text: 'Сильная рука!' };
        }
        break;
      case 'call':
        if (stats.wtsd > 35 && stats.wsd < 45) {
          return { icon: TrendingDown, color: 'text-green-400', text: 'Calling station' };
        }
        break;
    }
    return null;
  };
  
  const indicator = getIndicator();
  if (!indicator) return null;
  
  const Icon = indicator.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-1 text-xs ${indicator.color}`}
    >
      <Icon className="w-3 h-3" />
      <span>{indicator.text}</span>
    </motion.div>
  );
}
