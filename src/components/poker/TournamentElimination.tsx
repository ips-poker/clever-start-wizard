import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Award, Coins, Skull, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Payout {
  position: number;
  percentage: number;
  amount: number;
}

interface EliminatedPlayer {
  player_id: string;
  player_name?: string;
  finish_position: number;
  prize_amount: number;
  eliminated_at: string;
}

interface TournamentEliminationProps {
  tournamentId: string;
  playerId: string;
  playerStack: number;
  onEliminated?: (position: number, prize: number) => void;
}

export const TournamentElimination = ({
  tournamentId,
  playerId,
  playerStack,
  onEliminated
}: TournamentEliminationProps) => {
  const [showEliminationModal, setShowEliminationModal] = useState(false);
  const [eliminatedPlayers, setEliminatedPlayers] = useState<EliminatedPlayer[]>([]);
  const [myResult, setMyResult] = useState<EliminatedPlayer | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [tournamentFinished, setTournamentFinished] = useState(false);

  // Загрузка выплат
  useEffect(() => {
    const fetchPayouts = async () => {
      const { data } = await supabase
        .from('online_poker_tournament_payouts')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('position');

      if (data) {
        setPayouts(data);
      }
    };

    fetchPayouts();
  }, [tournamentId]);

  // Отслеживание выбывших игроков в реальном времени
  useEffect(() => {
    const channel = supabase
      .channel(`elimination-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'online_poker_tournament_participants',
          filter: `tournament_id=eq.${tournamentId}`
        },
        async (payload) => {
          const updated = payload.new as any;
          
          // Проверяем, был ли игрок только что выбит
          if (updated.status === 'eliminated' && updated.finish_position) {
            // Получаем имя игрока
            const { data: playerData } = await supabase
              .from('players')
              .select('name')
              .eq('id', updated.player_id)
              .single();

            const eliminatedPlayer: EliminatedPlayer = {
              player_id: updated.player_id,
              player_name: playerData?.name || 'Игрок',
              finish_position: updated.finish_position,
              prize_amount: updated.prize_amount || 0,
              eliminated_at: updated.eliminated_at
            };

            setEliminatedPlayers(prev => [...prev, eliminatedPlayer]);

            // Если это текущий игрок
            if (updated.player_id === playerId) {
              setMyResult(eliminatedPlayer);
              setShowEliminationModal(true);
              onEliminated?.(updated.finish_position, updated.prize_amount || 0);
            } else {
              toast.info(`${eliminatedPlayer.player_name} выбыл на ${eliminatedPlayer.finish_position} месте`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, playerId, onEliminated]);

  // Отслеживание завершения турнира
  useEffect(() => {
    const channel = supabase
      .channel(`tournament-finish-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'online_poker_tournaments',
          filter: `id=eq.${tournamentId}`
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated.status === 'completed') {
            setTournamentFinished(true);
            toast.success('Турнир завершён!');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  // Проверка на выбывание при 0 фишках
  useEffect(() => {
    const checkElimination = async () => {
      if (playerStack <= 0) {
        // Получаем количество активных игроков для определения позиции
        const { count: activeCount } = await supabase
          .from('online_poker_tournament_participants')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId)
          .in('status', ['registered', 'playing']);

        const finishPosition = (activeCount || 0) + 1;
        
        // Определяем приз
        const payout = payouts.find(p => p.position === finishPosition);
        const prizeAmount = payout?.amount || 0;

        // Обновляем статус игрока
        await supabase
          .from('online_poker_tournament_participants')
          .update({
            status: 'eliminated',
            finish_position: finishPosition,
            prize_amount: prizeAmount,
            eliminated_at: new Date().toISOString()
          })
          .eq('tournament_id', tournamentId)
          .eq('player_id', playerId);

        // Начисляем приз на баланс если есть
        if (prizeAmount > 0) {
          await supabase.rpc('update_player_balance', {
            p_player_id: playerId,
            p_amount: prizeAmount,
            p_is_win: true
          });
        }

        // Проверяем, остался ли только один игрок
        if (activeCount === 1) {
          // Находим победителя
          const { data: winnerData } = await supabase
            .from('online_poker_tournament_participants')
            .select('player_id')
            .eq('tournament_id', tournamentId)
            .in('status', ['registered', 'playing'])
            .single();

          if (winnerData) {
            const winnerPayout = payouts.find(p => p.position === 1);
            const winnerPrize = winnerPayout?.amount || 0;

            // Обновляем победителя
            await supabase
              .from('online_poker_tournament_participants')
              .update({
                status: 'winner',
                finish_position: 1,
                prize_amount: winnerPrize
              })
              .eq('tournament_id', tournamentId)
              .eq('player_id', winnerData.player_id);

            // Начисляем приз победителю
            if (winnerPrize > 0) {
              await supabase.rpc('update_player_balance', {
                p_player_id: winnerData.player_id,
                p_amount: winnerPrize,
                p_is_win: true
              });
            }

            // Завершаем турнир
            await supabase
              .from('online_poker_tournaments')
              .update({
                status: 'completed',
                finished_at: new Date().toISOString()
              })
              .eq('id', tournamentId);
          }
        }
      }
    };

    checkElimination();
  }, [playerStack, tournamentId, playerId, payouts]);

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-8 w-8 text-yellow-500" />;
      case 2:
        return <Medal className="h-8 w-8 text-gray-400" />;
      case 3:
        return <Award className="h-8 w-8 text-amber-600" />;
      default:
        return <Skull className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return 'from-yellow-500 to-amber-600';
      case 2:
        return 'from-gray-400 to-gray-500';
      case 3:
        return 'from-amber-600 to-orange-700';
      default:
        return 'from-muted to-muted-foreground/50';
    }
  };

  return (
    <>
      {/* Модальное окно выбывания */}
      <Dialog open={showEliminationModal} onOpenChange={setShowEliminationModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              {myResult?.finish_position === 1 ? '🎉 Победа!' : 'Турнир завершён'}
            </DialogTitle>
          </DialogHeader>

          {myResult && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4 py-6"
            >
              <div className={`p-6 rounded-full bg-gradient-to-br ${getPositionColor(myResult.finish_position)}`}>
                {getPositionIcon(myResult.finish_position)}
              </div>

              <div className="text-center">
                <h3 className="text-3xl font-bold">
                  {myResult.finish_position} место
                </h3>
                <p className="text-muted-foreground mt-1">
                  из {eliminatedPlayers.length + 1} участников
                </p>
              </div>

              {myResult.prize_amount > 0 && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-2 bg-primary/10 px-6 py-3 rounded-xl"
                >
                  <Coins className="h-6 w-6 text-primary" />
                  <span className="text-2xl font-bold text-primary">
                    +{myResult.prize_amount.toLocaleString()}
                  </span>
                </motion.div>
              )}

              <Button 
                onClick={() => setShowEliminationModal(false)}
                className="mt-4"
              >
                Закрыть
              </Button>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      {/* Индикатор выбывших игроков */}
      <AnimatePresence>
        {eliminatedPlayers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 right-4 z-10"
          >
            <Badge variant="secondary" className="gap-1">
              <Skull className="h-3 w-3" />
              Выбыло: {eliminatedPlayers.length}
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
