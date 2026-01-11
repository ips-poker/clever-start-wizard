/**
 * Waiting List Panel
 * Allows players to join/leave waiting list for full cash tables
 */

import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Users, 
  Clock, 
  X, 
  Check,
  AlertCircle
} from 'lucide-react';
import { useCashGameSitOut } from '@/hooks/poker/useCashGameSitOut';
import { cn } from '@/lib/utils';

interface WaitingListPanelProps {
  tableId: string;
  playerId: string;
  minBuyIn: number;
  maxBuyIn: number;
  bigBlind: number;
  onSeatOffered?: (seatNumber: number) => void;
}

export const WaitingListPanel = memo(function WaitingListPanel({
  tableId,
  playerId,
  minBuyIn,
  maxBuyIn,
  bigBlind,
  onSeatOffered,
}: WaitingListPanelProps) {
  const {
    waitingList,
    myWaitingPosition,
    isLoading,
    isInQueue,
    joinWaitingList,
    leaveWaitingList,
  } = useCashGameSitOut(tableId, playerId);

  const [buyInAmount, setBuyInAmount] = useState(Math.floor((minBuyIn + maxBuyIn) / 2));
  const [showJoinForm, setShowJoinForm] = useState(false);

  const handleJoin = async () => {
    await joinWaitingList(minBuyIn, maxBuyIn);
    setShowJoinForm(false);
  };

  const formatBuyIn = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  // Already in queue - show position
  if (isInQueue) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-medium">Waiting List</span>
          </div>
          <Badge variant="secondary">
            #{myWaitingPosition} of {waitingList.length}
          </Badge>
        </div>

        <div className="text-center py-6">
          <div className="text-4xl font-bold text-primary mb-2">
            #{myWaitingPosition}
          </div>
          <div className="text-muted-foreground text-sm">
            Your position in queue
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Clock className="w-4 h-4" />
          <span>
            Estimated wait: {Math.max(1, (myWaitingPosition || 1) * 5)} - {(myWaitingPosition || 1) * 15} min
          </span>
        </div>

        <Button
          variant="destructive"
          className="w-full"
          onClick={() => leaveWaitingList()}
          disabled={isLoading}
        >
          <X className="w-4 h-4 mr-2" />
          Leave Queue
        </Button>
      </div>
    );
  }

  // Not in queue - show join option
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <span className="font-medium">Waiting List</span>
        </div>
        {waitingList.length > 0 && (
          <Badge variant="outline">
            {waitingList.length} waiting
          </Badge>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showJoinForm ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Buy-in Amount</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[buyInAmount]}
                  min={minBuyIn}
                  max={maxBuyIn}
                  step={bigBlind}
                  onValueChange={([value]) => setBuyInAmount(value)}
                  className="flex-1"
                />
                <div className="w-20 text-right font-mono">
                  {formatBuyIn(buyInAmount)}
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Min: {formatBuyIn(minBuyIn)}</span>
                <span>Max: {formatBuyIn(maxBuyIn)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleJoin}
                disabled={isLoading}
              >
                <Check className="w-4 h-4 mr-2" />
                Join Queue
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowJoinForm(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {waitingList.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Table is full</p>
                <p className="text-xs">Join the waiting list to play when a seat opens</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {waitingList.slice(0, 5).map((entry, index) => (
                  <div 
                    key={entry.id}
                    className="flex items-center justify-between py-1 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                        index === 0 ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        {index + 1}
                      </span>
                      <span>{entry.playerName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.floor((Date.now() - entry.joinedAt.getTime()) / 60000)}m ago
                    </span>
                  </div>
                ))}
                
                {waitingList.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{waitingList.length - 5} more
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => setShowJoinForm(true)}
            >
              <Users className="w-4 h-4 mr-2" />
              Join Waiting List
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default WaitingListPanel;