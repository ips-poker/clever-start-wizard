/**
 * Hand-for-Hand Overlay Component
 * Displays synchronized table status during bubble play
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Users, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableStatus {
  tableId: string;
  tableName: string;
  isPlaying: boolean;
  playersRemaining: number;
}

interface HandForHandStatus {
  active: boolean;
  bubblePosition: number;
  tablesWaiting: number;
  totalTables: number;
  tables: TableStatus[];
  completedHands: number;
}

interface HandForHandOverlayProps {
  status: HandForHandStatus | null;
  currentTableId?: string;
  className?: string;
}

export function HandForHandOverlay({ 
  status, 
  currentTableId,
  className 
}: HandForHandOverlayProps) {
  const [pulseAnimation, setPulseAnimation] = useState(false);

  // Pulse animation when waiting for other tables
  useEffect(() => {
    if (status?.active && status.tablesWaiting < status.totalTables) {
      const interval = setInterval(() => {
        setPulseAnimation(prev => !prev);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status?.active, status?.tablesWaiting, status?.totalTables]);

  if (!status?.active) return null;

  const currentTable = status.tables.find(t => t.tableId === currentTableId);
  const isWaiting = currentTable && !currentTable.isPlaying;
  const allTablesReady = status.tablesWaiting === status.totalTables;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-50",
          "bg-gradient-to-r from-amber-900/95 via-orange-900/95 to-red-900/95",
          "backdrop-blur-lg border-2 border-amber-500/50 rounded-xl shadow-2xl",
          "p-4 min-w-[320px] max-w-[500px]",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ 
                scale: pulseAnimation ? 1.2 : 1,
                opacity: pulseAnimation ? 0.8 : 1 
              }}
              transition={{ duration: 0.5 }}
            >
              <AlertTriangle className="h-6 w-6 text-amber-400" />
            </motion.div>
            <div>
              <h3 className="font-bold text-amber-100 text-lg">HAND-FOR-HAND</h3>
              <p className="text-xs text-amber-300/80">Bubble at position {status.bubblePosition}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-amber-200">
              Раздач: <span className="font-bold">{status.completedHands}</span>
            </div>
          </div>
        </div>

        {/* Tables Status Grid */}
        <div className="space-y-2 mb-3">
          {status.tables.map((table) => (
            <motion.div
              key={table.tableId}
              layout
              className={cn(
                "flex items-center justify-between p-2 rounded-lg",
                "transition-all duration-300",
                table.tableId === currentTableId 
                  ? "bg-amber-500/20 border border-amber-500/40" 
                  : "bg-black/20",
                table.isPlaying ? "opacity-100" : "opacity-70"
              )}
            >
              <div className="flex items-center gap-2">
                {table.isPlaying ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="h-4 w-4 text-amber-400" />
                  </motion.div>
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                )}
                <span className={cn(
                  "text-sm",
                  table.tableId === currentTableId ? "font-bold text-amber-100" : "text-amber-200/80"
                )}>
                  {table.tableName}
                  {table.tableId === currentTableId && " (Вы)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 text-amber-300/60" />
                <span className="text-xs text-amber-200">{table.playersRemaining}</span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  table.isPlaying 
                    ? "bg-amber-500/30 text-amber-200" 
                    : "bg-green-500/30 text-green-200"
                )}>
                  {table.isPlaying ? "В игре" : "Ожидает"}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Status Bar */}
        <div className={cn(
          "flex items-center justify-between p-2 rounded-lg",
          allTablesReady 
            ? "bg-green-500/20 border border-green-500/40" 
            : "bg-amber-500/10"
        )}>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-300" />
            <span className="text-sm text-amber-100">
              {allTablesReady 
                ? "Все столы готовы - начинаем новую раздачу!" 
                : `Ожидание: ${status.tablesWaiting}/${status.totalTables} столов`
              }
            </span>
          </div>
          {!allTablesReady && (
            <div className="w-16 h-2 bg-amber-900/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-amber-400"
                initial={{ width: 0 }}
                animate={{ width: `${(status.tablesWaiting / status.totalTables) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
        </div>

        {/* Current Table Waiting Message */}
        {isWaiting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Clock className="h-5 w-5 text-amber-400" />
              </motion.div>
              <p className="text-sm text-amber-100">
                <span className="font-bold">Ваш стол ожидает</span> — раздача начнётся когда все столы завершат текущую раздачу
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Hook to manage Hand-for-Hand state from WebSocket
 */
export function useHandForHandStatus(
  tournamentId: string | undefined,
  ws: WebSocket | null
): HandForHandStatus | null {
  const [status, setStatus] = useState<HandForHandStatus | null>(null);

  useEffect(() => {
    if (!tournamentId || !ws) {
      setStatus(null);
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'hfh_started':
            setStatus({
              active: true,
              bubblePosition: data.bubblePosition,
              tablesWaiting: 0,
              totalTables: data.tablesCount,
              tables: data.tables || [],
              completedHands: 0
            });
            break;
            
          case 'hfh_status_update':
            setStatus(prev => prev ? {
              ...prev,
              tablesWaiting: data.tablesWaiting,
              tables: data.tables || prev.tables,
              completedHands: data.completedHands || prev.completedHands
            } : null);
            break;
            
          case 'hfh_table_waiting':
            setStatus(prev => prev ? {
              ...prev,
              tablesWaiting: data.waitingCount,
              tables: prev.tables.map(t => 
                t.tableId === data.tableId 
                  ? { ...t, isPlaying: false }
                  : t
              )
            } : null);
            break;
            
          case 'hfh_all_tables_ready':
            setStatus(prev => prev ? {
              ...prev,
              tablesWaiting: prev.totalTables,
              completedHands: data.completedHands
            } : null);
            break;
            
          case 'hfh_ended':
          case 'hfh_bubble_burst':
            setStatus(null);
            break;
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [tournamentId, ws]);

  return status;
}
