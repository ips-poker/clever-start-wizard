/**
 * Bubble Protection Component
 * 5.2 - Shows bubble status, hand-for-hand mode, and protection alerts
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  Users, 
  Trophy,
  Pause,
  Play,
  HandMetal,
  CircleDot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface TableStatus {
  tableId: string;
  tableName: string;
  isWaiting: boolean;
  currentHand: number;
  playersRemaining: number;
}

interface BubbleProtectionProps {
  isActive: boolean;
  bubblePosition: number; // First ITM position
  playersRemaining: number;
  tablesInTournament: TableStatus[];
  prizeForBubble: number; // Min cash amount
  handForHandActive: boolean;
  currentTableId?: string;
  onToggleHandForHand?: (active: boolean) => void;
  className?: string;
}

export const BubbleProtection: React.FC<BubbleProtectionProps> = ({
  isActive,
  bubblePosition,
  playersRemaining,
  tablesInTournament,
  prizeForBubble,
  handForHandActive,
  currentTableId,
  onToggleHandForHand,
  className
}) => {
  const [isPulsing, setIsPulsing] = useState(false);
  const playersFromMoney = playersRemaining - bubblePosition;
  const bubbleProgress = Math.max(0, 100 - (playersFromMoney / bubblePosition) * 100);
  
  // Pulse effect when close to bubble
  useEffect(() => {
    if (playersFromMoney <= 3 && playersFromMoney > 0) {
      setIsPulsing(true);
    } else {
      setIsPulsing(false);
    }
  }, [playersFromMoney]);
  
  // Count waiting vs playing tables
  const waitingTables = tablesInTournament.filter(t => t.isWaiting).length;
  const playingTables = tablesInTournament.filter(t => !t.isWaiting).length;
  
  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          "bg-gradient-to-r from-amber-900/90 to-orange-900/90 rounded-xl border-2 border-amber-500/50 p-4 shadow-xl backdrop-blur-sm",
          isPulsing && "animate-pulse",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <motion.div
              animate={isPulsing ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Shield className="h-6 w-6 text-amber-400" />
            </motion.div>
            <span className="font-bold text-white text-lg">BUBBLE ZONE</span>
            {handForHandActive && (
              <Badge className="bg-red-500/30 text-red-300 border-red-500/50">
                <HandMetal className="h-3 w-3 mr-1" />
                Hand-for-Hand
              </Badge>
            )}
          </div>
          
          {onToggleHandForHand && (
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "border-amber-500/50",
                handForHandActive 
                  ? "bg-red-500/20 hover:bg-red-500/30" 
                  : "bg-amber-500/20 hover:bg-amber-500/30"
              )}
              onClick={() => onToggleHandForHand(!handForHandActive)}
            >
              {handForHandActive ? (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Resume Normal
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Start H4H
                </>
              )}
            </Button>
          )}
        </div>

        {/* Bubble Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-white/70">До денег:</span>
            <span className={cn(
              "font-bold",
              playersFromMoney <= 1 ? "text-red-400" :
              playersFromMoney <= 3 ? "text-amber-400" :
              "text-white"
            )}>
              {playersFromMoney > 0 ? (
                `${playersFromMoney} ${playersFromMoney === 1 ? 'игрок' : 'игрока'}`
              ) : (
                <span className="text-emerald-400">🎉 В деньгах!</span>
              )}
            </span>
          </div>
          
          <Progress 
            value={bubbleProgress} 
            className="h-3 bg-slate-700"
          />
          
          <div className="flex justify-between text-xs text-white/50 mt-1">
            <span>Bubble: {bubblePosition} место</span>
            <span>Мин. приз: {prizeForBubble.toLocaleString()} 💎</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-black/30 rounded-lg p-2 text-center">
            <Users className="h-4 w-4 text-blue-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">{playersRemaining}</div>
            <div className="text-[10px] text-white/50">Осталось</div>
          </div>
          
          <div className="bg-black/30 rounded-lg p-2 text-center">
            <Trophy className="h-4 w-4 text-amber-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">{bubblePosition}</div>
            <div className="text-[10px] text-white/50">ITM</div>
          </div>
          
          <div className="bg-black/30 rounded-lg p-2 text-center">
            <CircleDot className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">{tablesInTournament.length}</div>
            <div className="text-[10px] text-white/50">Столов</div>
          </div>
        </div>

        {/* Hand-for-Hand Table Status */}
        {handForHandActive && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">Статус столов:</span>
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300">
                  ✓ {waitingTables} ждут
                </Badge>
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                  ▶ {playingTables} играют
                </Badge>
              </div>
            </div>
            
            <div className="max-h-32 overflow-y-auto space-y-1">
              {tablesInTournament.map(table => (
                <div 
                  key={table.tableId}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg text-xs",
                    table.tableId === currentTableId ? "bg-amber-500/20 border border-amber-500/30" : "bg-black/20",
                    table.isWaiting ? "border-l-2 border-l-emerald-500" : "border-l-2 border-l-blue-500"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {table.isWaiting ? (
                      <Clock className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Play className="h-3 w-3 text-blue-400 animate-pulse" />
                    )}
                    <span className="text-white">{table.tableName}</span>
                    {table.tableId === currentTableId && (
                      <Badge variant="outline" className="h-4 px-1 text-[9px]">
                        Вы здесь
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 text-white/60">
                    <span>Рука #{table.currentHand}</span>
                    <span>{table.playersRemaining} игр.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning Banner */}
        {playersFromMoney === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 bg-red-500/20 border border-red-500/40 rounded-lg p-2 flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <span className="text-red-300 text-sm">
              ⚠️ BUBBLE! Следующее выбывание = В деньгах!
            </span>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default BubbleProtection;
