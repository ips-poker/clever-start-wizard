import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Users, Coins, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface TournamentPrizeCalculatorProps {
  tournamentId: string;
}

interface PayoutStructure {
  position: number;
  percentage: number;
  amount: number;
}

interface ParticipantWithPlayer {
  player_id: string;
  status: string;
  chips: number;
  finish_position: number | null;
  prize_amount: number | null;
  player_name?: string;
}

export const TournamentPrizeCalculator = ({ tournamentId }: TournamentPrizeCalculatorProps) => {
  const [prizePool, setPrizePool] = useState(0);
  const [payouts, setPayouts] = useState<PayoutStructure[]>([]);
  const [participants, setParticipants] = useState<ParticipantWithPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Получаем турнир
        const { data: tournament } = await supabase
          .from('online_poker_tournaments')
          .select('prize_pool, buy_in')
          .eq('id', tournamentId)
          .single();

        if (tournament) {
          setPrizePool(tournament.prize_pool || 0);
        }

        // Получаем структуру выплат
        const { data: payoutData } = await supabase
          .from('online_poker_tournament_payouts')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('position');

        if (payoutData) {
          setPayouts(payoutData);
        }

        // Получаем участников
        const { data: participantsData } = await supabase
          .from('online_poker_tournament_participants')
          .select('player_id, status, chips, finish_position, prize_amount')
          .eq('tournament_id', tournamentId)
          .order('finish_position', { ascending: true, nullsFirst: false });

        if (participantsData) {
          // Получаем имена игроков
          const playerIds = participantsData.map(p => p.player_id);
          const { data: playersData } = await supabase
            .from('players')
            .select('id, name')
            .in('id', playerIds);

          const enrichedParticipants = participantsData.map(p => ({
            ...p,
            player_name: playersData?.find(pl => pl.id === p.player_id)?.name || 'Игрок'
          }));

          setParticipants(enrichedParticipants);
        }
      } catch (error) {
        console.error('Error fetching prize data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Подписка на изменения
    const channel = supabase
      .channel(`prizes-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'online_poker_tournament_participants',
          filter: `tournament_id=eq.${tournamentId}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const activePlayers = participants.filter(p => 
    p.status === 'registered' || p.status === 'playing'
  );
  
  const eliminatedPlayers = participants.filter(p => 
    p.status === 'eliminated' || p.status === 'winner'
  ).sort((a, b) => (a.finish_position || 0) - (b.finish_position || 0));

  const totalChips = participants.reduce((sum, p) => sum + (p.chips || 0), 0);

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-8 text-center">
          <div className="animate-pulse">Загрузка призов...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-primary" />
          Призовой фонд
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Призовой фонд */}
        <div className="text-center py-4 bg-primary/10 rounded-xl">
          <div className="text-3xl font-bold text-primary">
            {prizePool.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <Coins className="h-4 w-4" />
            Общий призовой фонд
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
              <Users className="h-3 w-3" />
              В игре
            </div>
            <div className="text-xl font-bold text-green-500">
              {activePlayers.length}
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
              <Award className="h-3 w-3" />
              Выбыло
            </div>
            <div className="text-xl font-bold text-destructive">
              {eliminatedPlayers.length}
            </div>
          </div>
        </div>

        {/* Структура выплат */}
        {payouts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Выплаты</h4>
            {payouts.map((payout) => {
              const player = eliminatedPlayers.find(p => p.finish_position === payout.position);
              return (
                <div 
                  key={payout.position}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    player ? 'bg-primary/10' : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={payout.position <= 3 ? 'default' : 'secondary'}
                      className={
                        payout.position === 1 ? 'bg-yellow-500 hover:bg-yellow-600' :
                        payout.position === 2 ? 'bg-gray-400 hover:bg-gray-500' :
                        payout.position === 3 ? 'bg-amber-600 hover:bg-amber-700' : ''
                      }
                    >
                      #{payout.position}
                    </Badge>
                    <span className="text-sm">
                      {player ? player.player_name : `${payout.percentage}%`}
                    </span>
                  </div>
                  <span className="font-bold text-primary">
                    {payout.amount.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Активные игроки с фишками */}
        {activePlayers.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Лидеры по фишкам</h4>
            {activePlayers
              .sort((a, b) => (b.chips || 0) - (a.chips || 0))
              .slice(0, 5)
              .map((player, index) => {
                const chipPercentage = totalChips > 0 
                  ? ((player.chips || 0) / totalChips) * 100 
                  : 0;
                return (
                  <div key={player.player_id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground">#{index + 1}</span>
                        <span>{player.player_name}</span>
                      </span>
                      <span className="font-medium">{(player.chips || 0).toLocaleString()}</span>
                    </div>
                    <Progress value={chipPercentage} className="h-1" />
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
