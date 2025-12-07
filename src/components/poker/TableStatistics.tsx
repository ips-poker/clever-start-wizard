import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Target,
  Coins,
  Clock,
  BarChart3,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableStatisticsProps {
  handHistory: any[];
  playerId: string;
  className?: string;
}

interface PlayerStats {
  handsPlayed: number;
  handsWon: number;
  totalWon: number;
  totalLost: number;
  biggestWin: number;
  biggestLoss: number;
  vpip: number; // Voluntarily Put $ In Pot
  pfr: number; // Pre-Flop Raise
  aggression: number;
  wtsd: number; // Went To ShowDown
  wonAtShowdown: number;
  foldToRaise: number;
  cbet: number; // Continuation Bet
  foldToCbet: number;
}

export function TableStatistics({ handHistory, playerId, className }: TableStatisticsProps) {
  const stats = useMemo<PlayerStats>(() => {
    if (handHistory.length === 0) {
      return {
        handsPlayed: 0, handsWon: 0, totalWon: 0, totalLost: 0,
        biggestWin: 0, biggestLoss: 0, vpip: 0, pfr: 0,
        aggression: 0, wtsd: 0, wonAtShowdown: 0, foldToRaise: 0,
        cbet: 0, foldToCbet: 0
      };
    }

    let handsPlayed = 0;
    let handsWon = 0;
    let totalWon = 0;
    let totalLost = 0;
    let biggestWin = 0;
    let biggestLoss = 0;
    let vpipHands = 0;
    let pfrHands = 0;
    let aggressiveActions = 0;
    let passiveActions = 0;
    let wentToShowdown = 0;
    let wonShowdown = 0;
    let facedRaise = 0;
    let foldedToRaise = 0;
    let cbetOpportunities = 0;
    let cbetsMade = 0;
    let facedCbet = 0;
    let foldedToCbet = 0;

    handHistory.forEach(hand => {
      const playerInHand = hand.players?.find((p: any) => p.playerId === playerId);
      if (!playerInHand) return;

      handsPlayed++;

      // Check if player won
      const isWinner = hand.winners?.some((w: any) => w.playerId === playerId);
      if (isWinner) {
        handsWon++;
        const winAmount = hand.winners.find((w: any) => w.playerId === playerId)?.amount || 0;
        totalWon += winAmount;
        if (winAmount > biggestWin) biggestWin = winAmount;
      } else {
        // Calculate loss (buy-in or bet amount)
        const lossAmount = playerInHand.totalBet || 0;
        totalLost += lossAmount;
        if (lossAmount > biggestLoss) biggestLoss = lossAmount;
      }

      // Analyze actions
      const playerActions = hand.actions?.filter((a: any) => 
        a.playerName === playerInHand.name || a.seatNumber === playerInHand.seatNumber
      ) || [];

      let vpipThisHand = false;
      let pfrThisHand = false;
      let wentToShowdownThisHand = false;
      let preflopRaiser = false;

      playerActions.forEach((action: any, idx: number) => {
        const actionType = action.action.toLowerCase();
        const phase = action.phase?.toLowerCase();

        // VPIP - any voluntary bet/call/raise preflop (excluding blinds)
        if (phase === 'preflop' && ['call', 'raise', 'bet', 'all-in'].includes(actionType)) {
          vpipThisHand = true;
        }

        // PFR - preflop raise
        if (phase === 'preflop' && ['raise', 'all-in'].includes(actionType)) {
          pfrThisHand = true;
          preflopRaiser = true;
        }

        // Aggression
        if (['bet', 'raise', 'all-in'].includes(actionType)) {
          aggressiveActions++;
        } else if (['call', 'check'].includes(actionType)) {
          passiveActions++;
        }

        // Fold to raise tracking
        if (actionType === 'fold' && idx > 0) {
          const prevAction = playerActions[idx - 1];
          if (prevAction && ['raise', 'all-in'].includes(prevAction.action?.toLowerCase())) {
            facedRaise++;
            foldedToRaise++;
          }
        }
      });

      if (vpipThisHand) vpipHands++;
      if (pfrThisHand) pfrHands++;

      // Went to showdown
      if (hand.communityCards?.length === 5 && !playerInHand.isFolded) {
        wentToShowdown++;
        wentToShowdownThisHand = true;
        if (isWinner) {
          wonShowdown++;
        }
      }

      // C-bet tracking
      if (preflopRaiser && hand.communityCards?.length >= 3) {
        cbetOpportunities++;
        const flopActions = playerActions.filter((a: any) => a.phase?.toLowerCase() === 'flop');
        if (flopActions.some((a: any) => ['bet', 'raise', 'all-in'].includes(a.action?.toLowerCase()))) {
          cbetsMade++;
        }
      }
    });

    return {
      handsPlayed,
      handsWon,
      totalWon,
      totalLost,
      biggestWin,
      biggestLoss,
      vpip: handsPlayed > 0 ? (vpipHands / handsPlayed) * 100 : 0,
      pfr: handsPlayed > 0 ? (pfrHands / handsPlayed) * 100 : 0,
      aggression: passiveActions > 0 ? (aggressiveActions / passiveActions) : aggressiveActions,
      wtsd: handsPlayed > 0 ? (wentToShowdown / handsPlayed) * 100 : 0,
      wonAtShowdown: wentToShowdown > 0 ? (wonShowdown / wentToShowdown) * 100 : 0,
      foldToRaise: facedRaise > 0 ? (foldedToRaise / facedRaise) * 100 : 0,
      cbet: cbetOpportunities > 0 ? (cbetsMade / cbetOpportunities) * 100 : 0,
      foldToCbet: facedCbet > 0 ? (foldedToCbet / facedCbet) * 100 : 0
    };
  }, [handHistory, playerId]);

  const netProfit = stats.totalWon - stats.totalLost;
  const winRate = stats.handsPlayed > 0 ? (stats.handsWon / stats.handsPlayed) * 100 : 0;

  if (stats.handsPlayed === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Статистика сессии
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Статистика появится после первой руки
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Статистика сессии
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {netProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">Профит</span>
            </div>
            <p className={cn(
              "text-lg font-bold",
              netProfit >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()}
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Винрейт</span>
            </div>
            <p className="text-lg font-bold">{winRate.toFixed(1)}%</p>
          </div>
        </div>

        <Separator />

        {/* Hand Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Рук</p>
            <p className="font-semibold">{stats.handsPlayed}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Побед</p>
            <p className="font-semibold text-green-500">{stats.handsWon}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Макс. выигрыш</p>
            <p className="font-semibold">{stats.biggestWin.toLocaleString()}</p>
          </div>
        </div>

        <Separator />

        {/* HUD Stats */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">VPIP</span>
            <div className="flex items-center gap-2">
              <Progress value={stats.vpip} className="w-20 h-2" />
              <span className="text-xs font-medium w-10 text-right">{stats.vpip.toFixed(0)}%</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">PFR</span>
            <div className="flex items-center gap-2">
              <Progress value={stats.pfr} className="w-20 h-2" />
              <span className="text-xs font-medium w-10 text-right">{stats.pfr.toFixed(0)}%</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">AF</span>
            <Badge variant="outline" className="text-xs">
              {stats.aggression.toFixed(2)}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">WTSD</span>
            <div className="flex items-center gap-2">
              <Progress value={stats.wtsd} className="w-20 h-2" />
              <span className="text-xs font-medium w-10 text-right">{stats.wtsd.toFixed(0)}%</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">W$SD</span>
            <div className="flex items-center gap-2">
              <Progress value={stats.wonAtShowdown} className="w-20 h-2" />
              <span className="text-xs font-medium w-10 text-right">{stats.wonAtShowdown.toFixed(0)}%</span>
            </div>
          </div>
          
          {stats.cbet > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">C-Bet</span>
              <div className="flex items-center gap-2">
                <Progress value={stats.cbet} className="w-20 h-2" />
                <span className="text-xs font-medium w-10 text-right">{stats.cbet.toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="pt-2 border-t">
          <p className="text-[10px] text-muted-foreground">
            VPIP: Добровольно внёс в пот | PFR: Рейз префлоп | AF: Агрессия | 
            WTSD: До шоудауна | W$SD: Выиграл на шоудауне | C-Bet: Конт-бет
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
