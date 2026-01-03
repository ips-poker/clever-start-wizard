import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy,
  Medal,
  Award,
  Coins,
  Users,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Payout {
  position: number;
  percentage: number;
  amount: number;
  player_id?: string | null;
  player_name?: string | null;
  paid_at?: string | null;
}

interface PayoutsTabProps {
  payouts: Payout[];
  prizePool: number;
  playersRemaining: number;
  totalPlayers: number;
  currentPlayerId?: string;
  className?: string;
}

export function PayoutsTab({ 
  payouts, 
  prizePool, 
  playersRemaining,
  totalPlayers,
  currentPlayerId,
  className 
}: PayoutsTabProps) {
  const paidPlaces = payouts.length;
  const bubblePosition = paidPlaces + 1;
  const isOnBubble = playersRemaining === bubblePosition;
  const inTheMoney = playersRemaining <= paidPlaces;

  // Calculate total percentage
  const totalPercentage = payouts.reduce((sum, p) => sum + p.percentage, 0);

  // Get position icon
  const getPositionIcon = (position: number) => {
    if (position === 1) return <Trophy className="h-5 w-5 text-amber-500" />;
    if (position === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (position === 3) return <Medal className="h-5 w-5 text-amber-700" />;
    return <Award className="h-4 w-4 text-muted-foreground" />;
  };

  // Get position background
  const getPositionBg = (position: number) => {
    if (position === 1) return 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-amber-500/30';
    if (position === 2) return 'bg-gradient-to-r from-gray-400/20 to-gray-400/5 border-gray-400/30';
    if (position === 3) return 'bg-gradient-to-r from-amber-700/20 to-amber-700/5 border-amber-700/30';
    return 'bg-muted/30 border-transparent';
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Prize Pool Summary */}
      <div className="mb-4 p-4 bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            <span className="text-muted-foreground">Призовой фонд</span>
          </div>
          <span className="text-2xl font-bold text-amber-500">
            {prizePool.toLocaleString()}
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-background/50 rounded-lg p-2 text-center">
            <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-muted-foreground text-xs">Осталось</p>
            <p className="font-bold">{playersRemaining}</p>
          </div>
          <div className="bg-background/50 rounded-lg p-2 text-center">
            <Award className="h-4 w-4 mx-auto text-amber-500 mb-1" />
            <p className="text-muted-foreground text-xs">В призах</p>
            <p className="font-bold">{paidPlaces}</p>
          </div>
          <div className="bg-background/50 rounded-lg p-2 text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-muted-foreground text-xs">Мин. приз</p>
            <p className="font-bold">
              {payouts.length > 0 ? payouts[payouts.length - 1].amount.toLocaleString() : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Bubble Alert */}
      {isOnBubble && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg animate-pulse">
          <div className="flex items-center gap-2 text-red-500">
            <Award className="h-5 w-5" />
            <span className="font-bold">BUBBLE!</span>
            <span className="text-sm">Ещё 1 вылет до призовой зоны</span>
          </div>
        </div>
      )}

      {inTheMoney && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-emerald-500">
            <Trophy className="h-5 w-5" />
            <span className="font-bold">IN THE MONEY!</span>
            <span className="text-sm">Все оставшиеся игроки в призах</span>
          </div>
        </div>
      )}

      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 rounded-lg mb-2 text-xs font-medium text-muted-foreground">
        <div className="col-span-2">Место</div>
        <div className="col-span-4">Процент</div>
        <div className="col-span-3 text-right">Приз</div>
        <div className="col-span-3 text-right">Игрок</div>
      </div>

      {/* Payouts List */}
      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {payouts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Структура выплат будет определена</p>
              <p className="text-sm">после начала турнира</p>
            </div>
          ) : (
            payouts.map((payout) => {
              const isCurrentPlayerWon = payout.player_id === currentPlayerId;
              const barWidth = (payout.percentage / totalPercentage) * 100;

              return (
                <div
                  key={payout.position}
                  className={cn(
                    "grid grid-cols-12 gap-2 px-3 py-3 rounded-lg items-center border transition-all",
                    getPositionBg(payout.position),
                    isCurrentPlayerWon && "ring-2 ring-primary"
                  )}
                >
                  {/* Position */}
                  <div className="col-span-2 flex items-center gap-2">
                    {getPositionIcon(payout.position)}
                    <span className={cn(
                      "font-bold",
                      payout.position <= 3 && "text-lg"
                    )}>
                      {payout.position}
                    </span>
                  </div>

                  {/* Percentage Bar */}
                  <div className="col-span-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            payout.position === 1 && "bg-amber-500",
                            payout.position === 2 && "bg-gray-400",
                            payout.position === 3 && "bg-amber-700",
                            payout.position > 3 && "bg-primary/60"
                          )}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12">
                        {payout.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Prize Amount */}
                  <div className="col-span-3 text-right">
                    <span className={cn(
                      "font-bold font-mono",
                      payout.position === 1 && "text-amber-500 text-lg",
                      payout.position === 2 && "text-gray-400",
                      payout.position === 3 && "text-amber-700"
                    )}>
                      {payout.amount.toLocaleString()}
                    </span>
                  </div>

                  {/* Winner (if assigned) */}
                  <div className="col-span-3 text-right">
                    {payout.player_name ? (
                      <Badge 
                        variant={isCurrentPlayerWon ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {payout.player_name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
