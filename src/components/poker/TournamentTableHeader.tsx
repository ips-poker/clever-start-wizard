import { useState, useEffect } from 'react';
import { Trophy, Users, Coins, Clock, Skull } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface TournamentTableHeaderProps {
  tournamentId: string;
}

export const TournamentTableHeader = ({ tournamentId }: TournamentTableHeaderProps) => {
  const [tournament, setTournament] = useState<any>(null);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [activePlayers, setActivePlayers] = useState(0);
  const [eliminatedCount, setEliminatedCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      // Загружаем данные турнира
      const { data: tourney } = await supabase
        .from('online_poker_tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tourney) {
        setTournament(tourney);
      }

      // Загружаем участников
      const { data: participants, count } = await supabase
        .from('online_poker_tournament_participants')
        .select('*', { count: 'exact' })
        .eq('tournament_id', tournamentId);

      setParticipantsCount(count || 0);
      
      const active = participants?.filter(p => 
        p.status === 'playing' || p.status === 'registered'
      ).length || 0;
      setActivePlayers(active);
      
      const eliminated = participants?.filter(p => 
        p.status === 'eliminated' || p.status === 'winner'
      ).length || 0;
      setEliminatedCount(eliminated);
    };

    fetchData();

    // Realtime подписка на изменения турнира
    const channel = supabase
      .channel(`tournament-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'online_poker_tournaments',
          filter: `id=eq.${tournamentId}`
        },
        (payload) => {
          if (payload.new) {
            setTournament(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'online_poker_tournament_participants',
          filter: `tournament_id=eq.${tournamentId}`
        },
        () => {
          // Перезагружаем участников
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  if (!tournament) return null;

  const formatDuration = (startedAt: string) => {
    if (!startedAt) return '00:00:00';
    const start = new Date(startedAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border border-primary/30 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Название турнира */}
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg">{tournament.name}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                tournament.status === 'running' ? 'bg-green-500/20 text-green-400' :
                tournament.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-muted text-muted-foreground'
              }`}>
                {tournament.status === 'running' ? 'В игре' :
                 tournament.status === 'paused' ? 'Пауза' :
                 tournament.status === 'finished' ? 'Завершён' : 'Регистрация'}
              </span>
            </div>
          </div>
        </div>

        {/* Статистика */}
        <div className="flex items-center gap-6">
          {/* Игроки */}
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-bold">{activePlayers}/{participantsCount}</div>
              <div className="text-xs text-muted-foreground">В игре</div>
            </div>
          </div>

          {/* Выбывшие */}
          {eliminatedCount > 0 && (
            <div className="flex items-center gap-2">
              <Skull className="h-5 w-5 text-destructive" />
              <div>
                <div className="font-bold text-destructive">{eliminatedCount}</div>
                <div className="text-xs text-muted-foreground">Выбыло</div>
              </div>
            </div>
          )}

          {/* Призовой фонд */}
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            <div>
              <div className="font-bold text-yellow-500">
                {(tournament.prize_pool || 0).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Призовой фонд</div>
            </div>
          </div>

          {/* Блайнды */}
          <div className="hidden sm:flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
            <div className="text-sm font-mono">
              <span className="text-muted-foreground">Блайнды:</span>{' '}
              <span className="font-bold">
                {tournament.small_blind}/{tournament.big_blind}
              </span>
              {tournament.ante > 0 && (
                <span className="text-muted-foreground ml-1">
                  (ante {tournament.ante})
                </span>
              )}
            </div>
          </div>

          {/* Время игры */}
          {tournament.started_at && (
            <div className="hidden md:flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div className="font-mono text-sm">
                {formatDuration(tournament.started_at)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
