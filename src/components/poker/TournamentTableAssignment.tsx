import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Play, 
  MapPin, 
  Armchair, 
  Loader2,
  Clock,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface TableAssignment {
  success: boolean;
  status?: string;
  table_assigned?: boolean;
  table_id?: string;
  table_name?: string;
  seat_number?: number;
  chips?: number;
  error?: string;
}

interface TournamentTableAssignmentProps {
  tournamentId: string;
  playerId: string;
  tournamentName: string;
  onJoinTable: (tableId: string) => void;
}

export function TournamentTableAssignment({ 
  tournamentId, 
  playerId, 
  tournamentName,
  onJoinTable 
}: TournamentTableAssignmentProps) {
  const [assignment, setAssignment] = useState<TableAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetchAssignment();
    
    // Subscribe to changes
    const channel = supabase
      .channel(`tournament-assignment-${tournamentId}-${playerId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'online_poker_tournament_participants',
        filter: `tournament_id=eq.${tournamentId}`
      }, () => {
        fetchAssignment();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, playerId]);

  const fetchAssignment = async () => {
    try {
      const { data, error } = await supabase.rpc('get_player_tournament_table', {
        p_tournament_id: tournamentId,
        p_player_id: playerId
      });

      if (error) throw error;
      setAssignment(data as unknown as TableAssignment);
    } catch (error) {
      console.error('Error fetching assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTable = () => {
    if (!assignment?.table_id) return;
    setJoining(true);
    onJoinTable(assignment.table_id);
  };

  if (loading) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-6 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Загрузка рассадки...</span>
        </CardContent>
      </Card>
    );
  }

  if (!assignment?.success) {
    return null;
  }

  // Waiting for tournament to start
  if (!assignment.table_assigned) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-full">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm">{tournamentName}</h4>
                <p className="text-xs text-muted-foreground">
                  Ожидание начала турнира...
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                Зарегистрирован
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Table assigned - show join button
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Card className="border-green-500/50 bg-gradient-to-br from-green-500/10 to-emerald-500/5 overflow-hidden">
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span className="font-semibold text-sm">{tournamentName}</span>
              </div>
              
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{assignment.table_name}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Armchair className="h-3 w-3" />
                  <span>Место {assignment.seat_number}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-sm font-medium text-green-500">
                <span>{(assignment.chips || 0).toLocaleString()} фишек</span>
              </div>
            </div>

            <Button
              onClick={handleJoinTable}
              disabled={joining}
              className="bg-green-600 hover:bg-green-700 gap-1.5"
              size="sm"
            >
              {joining ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Войти за стол
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Component to show all active tournament assignments for a player
interface ActiveTournamentAssignmentsProps {
  playerId: string;
  onJoinTable: (tableId: string) => void;
}

export function ActiveTournamentAssignments({ playerId, onJoinTable }: ActiveTournamentAssignmentsProps) {
  const [tournaments, setTournaments] = useState<Array<{
    id: string;
    name: string;
    status: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveTournaments();

    const channel = supabase
      .channel(`player-tournaments-${playerId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'online_poker_tournament_participants',
        filter: `player_id=eq.${playerId}`
      }, () => {
        fetchActiveTournaments();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'online_poker_tournaments'
      }, () => {
        fetchActiveTournaments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId]);

  const fetchActiveTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('online_poker_tournament_participants')
        .select(`
          tournament_id,
          status,
          tournament:online_poker_tournaments(id, name, status)
        `)
        .eq('player_id', playerId)
        .in('status', ['registered', 'playing']);

      if (error) throw error;

      const activeTournaments = (data || [])
        .filter(p => p.tournament && ['registration', 'running', 'final_table'].includes((p.tournament as any).status))
        .map(p => ({
          id: (p.tournament as any).id,
          name: (p.tournament as any).name,
          status: (p.tournament as any).status
        }));

      setTournaments(activeTournaments);
    } catch (error) {
      console.error('Error fetching active tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || tournaments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Trophy className="h-4 w-4" />
        Мои турниры
      </h3>
      <AnimatePresence>
        {tournaments.map(tournament => (
          <TournamentTableAssignment
            key={tournament.id}
            tournamentId={tournament.id}
            playerId={playerId}
            tournamentName={tournament.name}
            onJoinTable={onJoinTable}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}