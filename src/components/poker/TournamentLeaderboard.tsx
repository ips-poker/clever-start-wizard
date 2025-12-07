import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Users, Medal, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';

interface LeaderboardPlayer {
  id: string;
  playerId: string;
  playerName: string;
  chips: number;
  status: string;
  previousPosition?: number;
  avatarUrl?: string;
}

interface TournamentLeaderboardProps {
  tournamentId: string;
  currentPlayerId?: string;
}

export const TournamentLeaderboard = ({ tournamentId, currentPlayerId }: TournamentLeaderboardProps) => {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [previousChips, setPreviousChips] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
    
    const channel = supabase
      .channel(`leaderboard-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'online_poker_tournament_participants',
          filter: `tournament_id=eq.${tournamentId}`
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const fetchLeaderboard = async () => {
    const { data: participants, error } = await supabase
      .from('online_poker_tournament_participants')
      .select('id, player_id, chips, status')
      .eq('tournament_id', tournamentId)
      .order('chips', { ascending: false });

    if (error || !participants) {
      console.error('Error fetching leaderboard:', error);
      setLoading(false);
      return;
    }

    const playerIds = participants.map(p => p.player_id);
    const { data: playersData } = await supabase
      .from('players')
      .select('id, name, avatar_url')
      .in('id', playerIds);

    const playersMap = new Map(playersData?.map(p => [p.id, p]) || []);

    const newPreviousChips = new Map<string, number>();
    const leaderboardPlayers: LeaderboardPlayer[] = participants.map((p, index) => {
      const player = playersMap.get(p.player_id);
      const prevChips = previousChips.get(p.player_id);
      newPreviousChips.set(p.player_id, p.chips || 0);
      
      const currentPlayers = players;
      const prevPosition = currentPlayers.findIndex(cp => cp.playerId === p.player_id);
      
      return {
        id: p.id,
        playerId: p.player_id,
        playerName: player?.name || 'Unknown',
        chips: p.chips || 0,
        status: p.status,
        previousPosition: prevPosition >= 0 ? prevPosition : undefined,
        avatarUrl: player?.avatar_url
      };
    });

    setPreviousChips(newPreviousChips);
    setPlayers(leaderboardPlayers);
    setLoading(false);
  };

  const getPositionIcon = (position: number) => {
    if (position === 0) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (position === 1) return <Medal className="h-4 w-4 text-gray-400" />;
    if (position === 2) return <Medal className="h-4 w-4 text-amber-600" />;
    return <span className="text-xs text-muted-foreground w-4 text-center">{position + 1}</span>;
  };

  const getPositionChange = (currentIndex: number, previousPosition?: number) => {
    if (previousPosition === undefined) return null;
    const change = previousPosition - currentIndex;
    if (change > 0) return <ChevronUp className="h-3 w-3 text-green-500" />;
    if (change < 0) return <ChevronDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const activePlayers = players.filter(p => p.status !== 'eliminated');
  const eliminatedPlayers = players.filter(p => p.status === 'eliminated');
  const totalChips = players.reduce((sum, p) => sum + p.chips, 0);

  if (loading) {
    return (
      <div className="bg-card/80 backdrop-blur-sm rounded-lg p-4 border border-border/50">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-8 bg-muted rounded"></div>
          <div className="h-8 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-lg border border-border/50 overflow-hidden">
      <div className="p-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span className="font-medium text-sm">Лидерборд</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{activePlayers.length} активных</span>
          </div>
        </div>
      </div>

      <ScrollArea className="h-64">
        <div className="p-2 space-y-1">
          <AnimatePresence mode="popLayout">
            {activePlayers.map((player, index) => {
              const chipPercentage = totalChips > 0 ? (player.chips / totalChips) * 100 : 0;
              const isCurrentPlayer = player.playerId === currentPlayerId;

              return (
                <motion.div
                  key={player.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className={`relative rounded-md p-2 ${
                    isCurrentPlayer 
                      ? 'bg-primary/20 border border-primary/30' 
                      : 'bg-muted/20 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 w-8">
                      {getPositionIcon(index)}
                      {getPositionChange(index, player.previousPosition)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium truncate ${
                          isCurrentPlayer ? 'text-primary' : ''
                        }`}>
                          {player.playerName}
                          {isCurrentPlayer && <span className="ml-1 text-xs">(вы)</span>}
                        </span>
                        <span className="text-sm font-mono font-bold text-foreground">
                          {player.chips.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-amber-600' :
                            'bg-primary/60'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${chipPercentage}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {chipPercentage.toFixed(1)}% фишек
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {eliminatedPlayers.length > 0 && (
            <div className="mt-3 pt-2 border-t border-border/50">
              <div className="text-xs text-muted-foreground mb-2 px-1">
                Выбывшие ({eliminatedPlayers.length})
              </div>
              {eliminatedPlayers.slice(0, 3).map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-1.5 rounded text-muted-foreground opacity-50"
                >
                  <span className="text-xs truncate">{player.playerName}</span>
                  <span className="text-xs">#{activePlayers.length + index + 1}</span>
                </div>
              ))}
              {eliminatedPlayers.length > 3 && (
                <div className="text-xs text-muted-foreground text-center py-1">
                  +{eliminatedPlayers.length - 3} ещё
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
