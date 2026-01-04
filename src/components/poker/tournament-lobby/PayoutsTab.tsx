import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Trophy,
  Medal,
  Award,
  Coins,
  Users,
  TrendingUp,
  Ticket,
  Star
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
  buyIn?: number;
  ticketsForTop?: number;
  className?: string;
}

// RPS prize structure based on player count
function getRPSStructure(playerCount: number): { places: number; percentages: number[] } {
  if (playerCount >= 50) {
    return { places: 6, percentages: [35, 25, 15, 10, 8, 7] };
  } else if (playerCount >= 30) {
    return { places: 4, percentages: [40, 30, 20, 10] };
  } else if (playerCount >= 20) {
    return { places: 3, percentages: [50, 30, 20] };
  } else if (playerCount >= 10) {
    return { places: 2, percentages: [60, 40] };
  } else {
    return { places: 1, percentages: [100] };
  }
}

export function PayoutsTab({ 
  payouts, 
  prizePool, 
  playersRemaining,
  totalPlayers,
  currentPlayerId,
  buyIn = 0,
  ticketsForTop = 0,
  className 
}: PayoutsTabProps) {
  const paidPlaces = payouts.length;
  const bubblePosition = paidPlaces + 1;
  const isOnBubble = playersRemaining === bubblePosition;
  const inTheMoney = playersRemaining <= paidPlaces && paidPlaces > 0;

  // Calculate RPS pool (buy_in / 50 = RPS)
  const rpsPool = Math.floor(buyIn / 50) * totalPlayers;
  
  // Get predicted structure based on player count
  const predictedStructure = getRPSStructure(totalPlayers);

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

  // Show predicted structure when payouts not yet generated
  const showPredicted = payouts.length === 0;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Prize Pool Summary */}
      <div className="mb-4 p-4 bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            <span className="text-muted-foreground">RPS Призовой фонд</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-amber-500">
              {rpsPool > 0 ? rpsPool.toLocaleString() : prizePool.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">RPS</span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-background/50 rounded-lg p-2 text-center">
            <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-muted-foreground text-xs">Игроков</p>
            <p className="font-bold">{totalPlayers}</p>
          </div>
          <div className="bg-background/50 rounded-lg p-2 text-center">
            <Award className="h-4 w-4 mx-auto text-amber-500 mb-1" />
            <p className="text-muted-foreground text-xs">Призовых мест</p>
            <p className="font-bold">{showPredicted ? predictedStructure.places : paidPlaces}</p>
          </div>
          <div className="bg-background/50 rounded-lg p-2 text-center">
            <Ticket className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-muted-foreground text-xs">Билеты топ</p>
            <p className="font-bold">{ticketsForTop > 0 ? ticketsForTop : '—'}</p>
          </div>
        </div>
      </div>

      {/* Tickets Info */}
      {ticketsForTop > 0 && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
          <div className="flex items-center gap-2 text-primary">
            <Ticket className="h-5 w-5" />
            <span className="font-medium">Топ-{ticketsForTop} получают входы на офлайн турниры</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            1 место: 3 входа • 2 место: 2 входа • 3 место: 1 вход
          </p>
        </div>
      )}

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
        <div className="col-span-3 text-right">RPS</div>
        <div className="col-span-3 text-right">{showPredicted ? 'Бонус' : 'Игрок'}</div>
      </div>

      {/* Payouts List */}
      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {showPredicted ? (
            // Show predicted structure
            <>
              <div className="px-3 py-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  Предварительная структура для {totalPlayers} игроков
                </Badge>
              </div>
              {predictedStructure.percentages.map((percentage, index) => {
                const position = index + 1;
                const rpsAmount = Math.floor(rpsPool * percentage / 100);
                const hasTicket = position <= ticketsForTop;
                const barWidth = (percentage / 100) * 100;

                return (
                  <div
                    key={position}
                    className={cn(
                      "grid grid-cols-12 gap-2 px-3 py-3 rounded-lg items-center border transition-all",
                      getPositionBg(position)
                    )}
                  >
                    {/* Position */}
                    <div className="col-span-2 flex items-center gap-2">
                      {getPositionIcon(position)}
                      <span className={cn(
                        "font-bold",
                        position <= 3 && "text-lg"
                      )}>
                        {position}
                      </span>
                    </div>

                    {/* Percentage Bar */}
                    <div className="col-span-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all",
                              position === 1 && "bg-amber-500",
                              position === 2 && "bg-gray-400",
                              position === 3 && "bg-amber-700",
                              position > 3 && "bg-primary/60"
                            )}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12">
                          {percentage}%
                        </span>
                      </div>
                    </div>

                    {/* RPS Amount */}
                    <div className="col-span-3 text-right">
                      <span className={cn(
                        "font-bold font-mono",
                        position === 1 && "text-amber-500 text-lg",
                        position === 2 && "text-gray-400",
                        position === 3 && "text-amber-700"
                      )}>
                        {rpsAmount.toLocaleString()}
                      </span>
                    </div>

                    {/* Ticket bonus */}
                    <div className="col-span-3 text-right">
                      {hasTicket ? (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Ticket className="h-3 w-3" />
                          {position === 1 ? '3' : position === 2 ? '2' : '1'} вход
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            // Show actual payouts
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

      {/* Info Footer */}
      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1">
        <p>• {buyIn} 💎 = {Math.floor(buyIn / 50)} RPS за участника</p>
        <p>• Структура призов рассчитывается автоматически при старте турнира</p>
      </div>
    </div>
  );
}
