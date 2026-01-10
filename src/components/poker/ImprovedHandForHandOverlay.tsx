/**
 * ImprovedHandForHandOverlay - Enhanced Hand-for-Hand mode display
 * Professional bubble stage with sync status and countdown
 */
import React, { useState, useEffect, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Users, CheckCircle2, Loader2, Target, Sparkles, Timer, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableStatus {
  tableId: string;
  tableName: string;
  isPlaying: boolean;
  playersRemaining: number;
  handNumber?: number;
}

export interface HandForHandStatus {
  active: boolean;
  bubblePosition: number;
  playersRemaining: number;
  tablesWaiting: number;
  totalTables: number;
  tables: TableStatus[];
  completedHands: number;
  startedAt?: number;
}

interface ImprovedHandForHandOverlayProps {
  status: HandForHandStatus | null;
  currentTableId?: string;
  className?: string;
}

export const ImprovedHandForHandOverlay = memo(function ImprovedHandForHandOverlay({
  status,
  currentTableId,
  className
}: ImprovedHandForHandOverlayProps) {
  const [elapsed, setElapsed] = useState(0);

  // Timer for elapsed time
  useEffect(() => {
    if (!status?.active || !status.startedAt) return;
    
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - status.startedAt!) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [status?.active, status?.startedAt]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTable = useMemo(() => 
    status?.tables.find(t => t.tableId === currentTableId),
    [status?.tables, currentTableId]
  );

  const isWaiting = currentTable && !currentTable.isPlaying;
  const allTablesReady = status ? status.tablesWaiting === status.totalTables : false;
  const playersToMoneyBubble = status ? status.playersRemaining - (status.bubblePosition - 1) : 0;

  if (!status?.active) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20 }}
        className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-50",
          "w-[95%] max-w-[450px]",
          className
        )}
      >
        {/* Glowing background effect */}
        <motion.div
          className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500/40 via-orange-500/40 to-red-500/40 blur-xl -z-10"
          animate={{
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Main container */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl",
          "bg-gradient-to-br from-slate-900/98 via-slate-900/95 to-slate-800/98",
          "border border-amber-500/30 shadow-2xl shadow-amber-500/20"
        )}>
          {/* Animated top border */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500"
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ backgroundSize: '200% 100%' }}
          />

          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  className="relative"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Target className="h-7 w-7 text-amber-400" />
                  <motion.div
                    className="absolute inset-0"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  >
                    <div className="w-2 h-2 bg-red-500 rounded-full absolute -top-0.5 left-1/2 -translate-x-1/2" />
                  </motion.div>
                </motion.div>
                
                <div>
                  <h3 className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-orange-300">
                    HAND-FOR-HAND
                  </h3>
                  <p className="text-xs text-amber-300/70">
                    Bubble • Позиция {status.bubblePosition}
                  </p>
                </div>
              </div>

              {/* Timer badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <Timer className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-mono text-amber-200 tabular-nums">
                  {formatTime(elapsed)}
                </span>
              </div>
            </div>
          </div>

          {/* Bubble info banner */}
          <motion.div
            className="px-4 py-2 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-b border-white/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-400" />
              <span className="text-sm">
                <span className="text-white/70">До призовых осталось выбыть: </span>
                <span className="font-bold text-amber-400">{playersToMoneyBubble}</span>
                <span className="text-white/70"> игрок{playersToMoneyBubble === 1 ? '' : playersToMoneyBubble < 5 ? 'а' : 'ов'}</span>
              </span>
              <Sparkles className="h-4 w-4 text-yellow-400" />
            </div>
          </motion.div>

          {/* Stats bar */}
          <div className="px-4 py-3 flex items-center justify-between text-sm border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-white/70">Игроков:</span>
                <span className="font-bold text-blue-300">{status.playersRemaining}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-400" />
                <span className="text-white/70">Раздач:</span>
                <span className="font-bold text-purple-300">{status.completedHands}</span>
              </div>
            </div>
          </div>

          {/* Tables grid */}
          <div className="px-4 py-3 space-y-2 max-h-[200px] overflow-y-auto">
            {status.tables.map((table) => {
              const isCurrentTable = table.tableId === currentTableId;
              const isTableWaiting = !table.isPlaying;
              
              return (
                <motion.div
                  key={table.tableId}
                  layout
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-xl transition-all",
                    isCurrentTable 
                      ? "bg-amber-500/15 border-2 border-amber-500/40" 
                      : "bg-white/5 border border-white/5",
                    isTableWaiting && "opacity-80"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Status indicator */}
                    <div className="relative">
                      {table.isPlaying ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        >
                          <Loader2 className="h-5 w-5 text-amber-400" />
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring' }}
                        >
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        </motion.div>
                      )}
                      
                      {/* Live pulse for playing */}
                      {table.isPlaying && (
                        <motion.div
                          className="absolute inset-0 rounded-full bg-amber-400/30"
                          animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                    </div>

                    {/* Table name */}
                    <div>
                      <span className={cn(
                        "font-medium",
                        isCurrentTable ? "text-amber-100" : "text-white/80"
                      )}>
                        {table.tableName}
                        {isCurrentTable && (
                          <span className="text-amber-400 ml-2 text-xs">(ваш стол)</span>
                        )}
                      </span>
                      {table.handNumber && (
                        <p className="text-xs text-white/40">
                          Рука #{table.handNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Players count */}
                    <div className="flex items-center gap-1.5 text-white/60">
                      <Users className="h-3.5 w-3.5" />
                      <span className="text-sm">{table.playersRemaining}</span>
                    </div>
                    
                    {/* Status badge */}
                    <span className={cn(
                      "text-xs px-2.5 py-1 rounded-full font-medium",
                      table.isPlaying 
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" 
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    )}>
                      {table.isPlaying ? 'В игре' : 'Готов'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Sync status bar */}
          <div className={cn(
            "px-4 py-3 border-t border-white/5",
            allTablesReady 
              ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/10" 
              : "bg-gradient-to-r from-amber-500/5 to-orange-500/5"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-300" />
                <span className="text-sm">
                  {allTablesReady ? (
                    <span className="text-emerald-400 font-medium">
                      ✓ Все столы готовы — начинаем новую раздачу!
                    </span>
                  ) : (
                    <span className="text-amber-200">
                      Ожидание: {status.tablesWaiting}/{status.totalTables} столов
                    </span>
                  )}
                </span>
              </div>
              
              {/* Progress bar */}
              {!allTablesReady && (
                <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(status.tablesWaiting / status.totalTables) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Waiting message for current table */}
          {isWaiting && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="px-4 py-3 bg-amber-500/10 border-t border-amber-500/20"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </motion.div>
                <div>
                  <p className="text-sm text-amber-100 font-medium">
                    Ваш стол ожидает синхронизации
                  </p>
                  <p className="text-xs text-amber-200/60">
                    Раздача начнётся когда все столы завершат текущую руку
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

export default ImprovedHandForHandOverlay;
