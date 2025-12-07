import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Users, 
  Clock, 
  Coins, 
  Play, 
  Plus,
  Calendar,
  Award,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CreateTournamentModal } from './CreateTournamentModal';
import { TournamentDetailsModal } from './TournamentDetailsModal';

interface OnlineTournament {
  id: string;
  name: string;
  description: string | null;
  buy_in: number;
  starting_chips: number;
  max_players: number;
  min_players: number;
  current_level: number;
  small_blind: number;
  big_blind: number;
  prize_pool: number;
  status: string;
  registration_start: string;
  started_at: string | null;
  player_count?: number;
}

interface OnlineTournamentLobbyProps {
  playerId: string;
  playerBalance: number;
  onJoinTournament: (tournamentId: string) => void;
}

export function OnlineTournamentLobby({ playerId, playerBalance, onJoinTournament }: OnlineTournamentLobbyProps) {
  const [tournaments, setTournaments] = useState<OnlineTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<OnlineTournament | null>(null);
  const [myRegistrations, setMyRegistrations] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('registration');

  useEffect(() => {
    fetchTournaments();
    fetchMyRegistrations();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('online-tournaments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'online_poker_tournaments'
      }, () => {
        fetchTournaments();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'online_poker_tournament_participants'
      }, () => {
        fetchTournaments();
        fetchMyRegistrations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId]);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('online_poker_tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get participant counts
      const tournamentsWithCounts = await Promise.all(
        (data || []).map(async (t) => {
          const { count } = await supabase
            .from('online_poker_tournament_participants')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', t.id)
            .neq('status', 'cancelled');
          
          return { ...t, player_count: count || 0 };
        })
      );

      setTournaments(tournamentsWithCounts);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('online_poker_tournament_participants')
        .select('tournament_id')
        .eq('player_id', playerId)
        .neq('status', 'cancelled');

      if (error) throw error;

      setMyRegistrations(new Set((data || []).map(r => r.tournament_id)));
    } catch (error) {
      console.error('Error fetching registrations:', error);
    }
  };

  const handleRegister = async (tournament: OnlineTournament) => {
    if (playerBalance < tournament.buy_in) {
      toast.error('Недостаточно средств для регистрации');
      return;
    }

    try {
      const { error } = await supabase
        .from('online_poker_tournament_participants')
        .insert({
          tournament_id: tournament.id,
          player_id: playerId,
          chips: tournament.starting_chips
        });

      if (error) throw error;

      // Deduct buy-in from balance
      await supabase.rpc('update_player_balance', {
        p_player_id: playerId,
        p_amount: -tournament.buy_in
      });

      // Update prize pool
      await supabase.rpc('calculate_online_tournament_prize_pool', {
        tournament_id_param: tournament.id
      });

      toast.success('Вы зарегистрированы на турнир!');
      fetchMyRegistrations();
      fetchTournaments();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка регистрации');
    }
  };

  const handleUnregister = async (tournamentId: string) => {
    try {
      const tournament = tournaments.find(t => t.id === tournamentId);
      
      const { error } = await supabase
        .from('online_poker_tournament_participants')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId);

      if (error) throw error;

      // Refund buy-in
      if (tournament) {
        await supabase.rpc('update_player_balance', {
          p_player_id: playerId,
          p_amount: tournament.buy_in
        });

        // Update prize pool
        await supabase.rpc('calculate_online_tournament_prize_pool', {
          tournament_id_param: tournamentId
        });
      }

      toast.success('Регистрация отменена');
      fetchMyRegistrations();
      fetchTournaments();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка отмены регистрации');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      registration: { label: 'Регистрация', variant: 'default' },
      starting: { label: 'Запускается', variant: 'secondary' },
      running: { label: 'Идёт игра', variant: 'destructive' },
      final_table: { label: 'Финальный стол', variant: 'destructive' },
      completed: { label: 'Завершён', variant: 'outline' },
      cancelled: { label: 'Отменён', variant: 'outline' }
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredTournaments = tournaments.filter(t => {
    if (activeTab === 'registration') return t.status === 'registration';
    if (activeTab === 'running') return ['running', 'final_table', 'starting'].includes(t.status);
    if (activeTab === 'completed') return t.status === 'completed';
    if (activeTab === 'my') return myRegistrations.has(t.id);
    return true;
  });

  const renderTournamentCard = (tournament: OnlineTournament) => {
    const isRegistered = myRegistrations.has(tournament.id);
    const canRegister = tournament.status === 'registration' && 
                        (tournament.player_count || 0) < tournament.max_players &&
                        !isRegistered;
    const canUnregister = isRegistered && tournament.status === 'registration';
    const canJoin = isRegistered && ['running', 'starting', 'final_table'].includes(tournament.status);

    return (
      <motion.div
        key={tournament.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        layout
      >
        <Card 
          className={cn(
            "hover:border-primary/50 transition-colors cursor-pointer",
            isRegistered && "border-primary/30 bg-primary/5"
          )}
          onClick={() => setSelectedTournament(tournament)}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  {tournament.name}
                </h3>
                {tournament.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {tournament.description}
                  </p>
                )}
              </div>
              {getStatusBadge(tournament.status)}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Coins className="h-3.5 w-3.5" />
                <span>{tournament.buy_in.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>{tournament.player_count}/{tournament.max_players}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Award className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-medium text-amber-500">{tournament.prize_pool.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2">
              {canRegister && (
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRegister(tournament);
                  }}
                  disabled={playerBalance < tournament.buy_in}
                >
                  Регистрация
                </Button>
              )}
              {canUnregister && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnregister(tournament.id);
                  }}
                >
                  Отменить
                </Button>
              )}
              {canJoin && (
                <Button 
                  size="sm" 
                  className="flex-1 gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onJoinTournament(tournament.id);
                  }}
                >
                  <Play className="h-3.5 w-3.5" />
                  Войти
                </Button>
              )}
              {isRegistered && tournament.status === 'registration' && (
                <Badge variant="secondary" className="ml-auto">Вы зарегистрированы</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-muted-foreground">Загрузка турниров...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Онлайн турниры
        </h2>
        <Button onClick={() => setShowCreateModal(true)} size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Создать турнир
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="registration" className="gap-1">
            <Clock className="h-3.5 w-3.5" />
            Регистрация
          </TabsTrigger>
          <TabsTrigger value="running" className="gap-1">
            <Play className="h-3.5 w-3.5" />
            Идущие
          </TabsTrigger>
          <TabsTrigger value="my" className="gap-1">
            <Users className="h-3.5 w-3.5" />
            Мои
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1">
            <Award className="h-3.5 w-3.5" />
            Завершённые
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <AnimatePresence mode="popLayout">
            {filteredTournaments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    {activeTab === 'my' 
                      ? 'Вы не зарегистрированы ни на один турнир'
                      : 'Нет доступных турниров'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredTournaments.map(renderTournamentCard)}
              </div>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* Create Tournament Modal */}
      <CreateTournamentModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        playerId={playerId}
        onCreated={fetchTournaments}
      />

      {/* Tournament Details Modal */}
      {selectedTournament && (
        <TournamentDetailsModal
          tournament={selectedTournament}
          playerId={playerId}
          isRegistered={myRegistrations.has(selectedTournament.id)}
          playerBalance={playerBalance}
          onClose={() => setSelectedTournament(null)}
          onRegister={() => handleRegister(selectedTournament)}
          onUnregister={() => handleUnregister(selectedTournament.id)}
          onJoin={() => onJoinTournament(selectedTournament.id)}
        />
      )}
    </div>
  );
}
