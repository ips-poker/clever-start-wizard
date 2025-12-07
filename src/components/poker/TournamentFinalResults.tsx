import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, Coins, Crown, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface FinalResult {
  player_id: string;
  player_name: string;
  finish_position: number;
  prize_amount: number;
}

interface TournamentFinalResultsProps {
  tournamentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TournamentFinalResults = ({
  tournamentId,
  isOpen,
  onClose
}: TournamentFinalResultsProps) => {
  const [results, setResults] = useState<FinalResult[]>([]);
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchResults = async () => {
      try {
        // Получаем турнир
        const { data: tourney } = await supabase
          .from('online_poker_tournaments')
          .select('*')
          .eq('id', tournamentId)
          .single();

        if (tourney) {
          setTournament(tourney);
        }

        // Получаем результаты
        const { data: participants } = await supabase
          .from('online_poker_tournament_participants')
          .select('player_id, finish_position, prize_amount, status')
          .eq('tournament_id', tournamentId)
          .not('finish_position', 'is', null)
          .order('finish_position');

        if (participants) {
          // Получаем имена игроков
          const playerIds = participants.map(p => p.player_id);
          const { data: players } = await supabase
            .from('players')
            .select('id, name')
            .in('id', playerIds);

          const enrichedResults = participants.map(p => ({
            player_id: p.player_id,
            player_name: players?.find(pl => pl.id === p.player_id)?.name || 'Игрок',
            finish_position: p.finish_position || 0,
            prize_amount: p.prize_amount || 0
          }));

          setResults(enrichedResults);
        }
      } catch (error) {
        console.error('Error fetching results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [tournamentId, isOpen]);

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{position}</span>;
    }
  };

  const getPositionBg = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-orange-500/20 border-amber-600/30';
      default:
        return 'bg-muted/30 border-border';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Итоги турнира
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Загрузка результатов...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Информация о турнире */}
            {tournament && (
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <h3 className="font-bold text-lg">{tournament.name}</h3>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{results.length} участников</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span className="text-yellow-500 font-medium">
                      {(tournament.prize_pool || 0).toLocaleString()} призовой фонд
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Таблица результатов */}
            <div className="space-y-2">
              {results.map((result, index) => (
                <motion.div
                  key={result.player_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center justify-between p-3 rounded-lg border ${getPositionBg(result.finish_position)}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-background/50 flex items-center justify-center">
                      {getPositionIcon(result.finish_position)}
                    </div>
                    <div>
                      <p className="font-medium">{result.player_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {result.finish_position === 1 ? 'Победитель' : `${result.finish_position} место`}
                      </p>
                    </div>
                  </div>

                  {result.prize_amount > 0 && (
                    <Badge variant="secondary" className="gap-1 text-primary">
                      <Coins className="h-3 w-3" />
                      +{result.prize_amount.toLocaleString()}
                    </Badge>
                  )}
                </motion.div>
              ))}
            </div>

            <Button onClick={onClose} className="w-full mt-4">
              Закрыть
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
