/**
 * Cash Game Sit-Out Panel
 * Professional sit-out controls for cash games
 * Based on PokerStars/GGPoker UI patterns
 */

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Pause, 
  LogOut, 
  Clock, 
  Users, 
  AlertTriangle,
  ChevronRight,
  DollarSign,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useCashGameSitOut } from '@/hooks/poker/useCashGameSitOut';
import { cn } from '@/lib/utils';

interface CashGameSitOutPanelProps {
  tableId: string;
  playerId: string;
  onLeaveTable?: () => void;
  compact?: boolean;
}

export const CashGameSitOutPanel = memo(function CashGameSitOutPanel({
  tableId,
  playerId,
  onLeaveTable,
  compact = false,
}: CashGameSitOutPanelProps) {
  const {
    sitOutInfo,
    waitingList,
    myWaitingPosition,
    sessionStats,
    isLoading,
    isSittingOut,
    isActive,
    hasQueue,
    formattedTimeRemaining,
    sitOut,
    sitIn,
    setLeaveNextBB,
    setAutoPostBlinds,
  } = useCashGameSitOut(tableId, playerId);

  // Compact mode - just show sit out button and status
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isSittingOut ? (
          <Button
            variant="default"
            size="sm"
            onClick={() => sitIn()}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="w-4 h-4 mr-1" />
            I'm Back
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => sitOut()}
            disabled={isLoading}
          >
            <Pause className="w-4 h-4 mr-1" />
            Sit Out
          </Button>
        )}
        
        {sitOutInfo.returnWarningActive && (
          <Badge variant="destructive" className="animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {formattedTimeRemaining}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 space-y-4">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-3 h-3 rounded-full",
            isActive ? "bg-green-500" : "bg-yellow-500 animate-pulse"
          )} />
          <span className="font-medium">
            {isActive ? 'Active' : 'Sitting Out'}
          </span>
        </div>
        
        {hasQueue && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {waitingList.length} waiting
          </Badge>
        )}
      </div>

      {/* Warning banner when sitting out */}
      <AnimatePresence>
        {isSittingOut && sitOutInfo.returnWarningActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-destructive/10 border border-destructive/30 rounded-lg p-3"
          >
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <div className="font-semibold">
                  Return to table or lose your seat!
                </div>
                <div className="text-sm opacity-80">
                  Time remaining: {formattedTimeRemaining}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sit out countdown */}
      {isSittingOut && formattedTimeRemaining && !sitOutInfo.returnWarningActive && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span className="text-sm">
            Seat reserved for: {formattedTimeRemaining}
            {hasQueue && ' (queue active)'}
          </span>
        </div>
      )}

      {/* Main action buttons */}
      <div className="flex gap-2">
        {isSittingOut ? (
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => sitIn()}
            disabled={isLoading}
          >
            <Play className="w-4 h-4 mr-2" />
            I'm Back
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => sitOut()}
            disabled={isLoading}
          >
            <Pause className="w-4 h-4 mr-2" />
            Sit Out
          </Button>
        )}
        
        <Button
          variant="outline"
          onClick={onLeaveTable}
          disabled={isLoading}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Leave
        </Button>
      </div>

      <Separator />

      {/* Options */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="leave-next-bb" className="text-sm cursor-pointer">
            Leave Next Big Blind
          </Label>
          <Switch
            id="leave-next-bb"
            checked={sitOutInfo.leaveNextBB}
            onCheckedChange={setLeaveNextBB}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-post-blinds" className="text-sm cursor-pointer">
            Auto Post Blinds
          </Label>
          <Switch
            id="auto-post-blinds"
            checked={sitOutInfo.autoPostBlinds}
            onCheckedChange={setAutoPostBlinds}
          />
        </div>
      </div>

      {/* Session stats */}
      {sessionStats && (
        <>
          <Separator />
          
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Session Stats
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">Buy-in:</span>
                <span>{sessionStats.buyInAmount.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center gap-1">
                {sessionStats.profitLoss >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <span className="text-muted-foreground">P/L:</span>
                <span className={cn(
                  sessionStats.profitLoss >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {sessionStats.profitLoss >= 0 ? '+' : ''}
                  {sessionStats.profitLoss.toLocaleString()}
                </span>
              </div>
              
              <div className="text-muted-foreground">
                Hands: {sessionStats.handsPlayed}
              </div>
              
              <div className="text-muted-foreground">
                Peak: {sessionStats.peakStack.toLocaleString()}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Missed blinds info */}
      {sitOutInfo.missedBlinds > 0 && (
        <div className="text-xs text-muted-foreground">
          Missed {sitOutInfo.missedBlinds} blind{sitOutInfo.missedBlinds !== 1 ? 's' : ''} - 
          you may need to post to return
        </div>
      )}

      {/* Waiting list preview */}
      {hasQueue && waitingList.length > 0 && (
        <>
          <Separator />
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">
                Waiting List
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
            
            <div className="space-y-1">
              {waitingList.slice(0, 3).map((entry, index) => (
                <div 
                  key={entry.id}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs">
                      {index + 1}
                    </span>
                    <span>{entry.playerName}</span>
                  </div>
                </div>
              ))}
              
              {waitingList.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{waitingList.length - 3} more in queue
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default CashGameSitOutPanel;