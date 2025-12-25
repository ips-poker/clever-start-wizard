import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import {
  Trophy,
  Users,
  Plus,
  RefreshCw,
  Trash2,
  Play,
  Pause,
  Square,
  Clock,
  TrendingUp,
  UserMinus,
  Eye,
  Settings,
  Coins,
  Timer,
  ChevronUp,
  ChevronDown,
  Diamond,
  Award,
  Ticket,
  Gift
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { convertFeeToRPS, formatRPSPoints } from '@/utils/rpsCalculations';

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  status: string;
  buy_in: number;
  starting_chips: number;
  max_players: number;
  min_players: number;
  current_level: number | null;
  small_blind: number | null;
  big_blind: number | null;
  ante: number | null;
  level_duration: number | null;
  level_end_at: string | null;
  prize_pool: number | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  participants_count?: number;
}

interface Participant {
  id: string;
  player_id: string;
  player_name: string;
  status: string;
  chips: number | null;
  finish_position: number | null;
  prize_amount: number | null;
  eliminated_at: string | null;
  seat_number: number | null;
  table_id: string | null;
}

interface BlindLevel {
  id: string;
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number | null;
  duration: number | null;
  is_break: boolean | null;
}

export function OnlineTournamentManager() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showParticipantsDialog, setShowParticipantsDialog] = useState(false);
  const [showLevelsDialog, setShowLevelsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  const [newTournament, setNewTournament] = useState({
    name: '',
    description: '',
    buy_in: 1000,
    starting_chips: 5000,
    max_players: 9,
    min_players: 2,
    level_duration: 300
  });

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('online_poker_tournaments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading tournaments:', error);
      setLoading(false);
      return;
    }

    // Get participant counts
    const tournamentsWithCounts = await Promise.all(
      (data || []).map(async (t) => {
        const { count } = await supabase
          .from('online_poker_tournament_participants')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', t.id);
        return { ...t, participants_count: count || 0 };
      })
    );

    setTournaments(tournamentsWithCounts);
    setLoading(false);
  }, []);

  const loadParticipants = async (tournamentId: string) => {
    const { data, error } = await supabase
      .from('online_poker_tournament_participants')
      .select(`
        *,
        players!inner(name)
      `)
      .eq('tournament_id', tournamentId)
      .order('chips', { ascending: false });

    if (error) {
      console.error('Error loading participants:', error);
      return;
    }

    const participantsData = data?.map(p => ({
      ...p,
      player_name: (p.players as any)?.name || 'Unknown'
    })) || [];

    setParticipants(participantsData);
  };

  const loadBlindLevels = async (tournamentId: string) => {
    const { data, error } = await supabase
      .from('online_poker_tournament_levels')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('level', { ascending: true });

    if (error) {
      console.error('Error loading blind levels:', error);
      return;
    }

    setBlindLevels(data || []);
  };

  useEffect(() => {
    loadTournaments();

    // Subscribe to changes
    const channel = supabase
      .channel('online-tournaments-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_poker_tournaments' }, () => {
        loadTournaments();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_poker_tournament_participants' }, () => {
        if (selectedTournament) {
          loadParticipants(selectedTournament.id);
        }
        loadTournaments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTournaments, selectedTournament]);

  // Timer countdown
  useEffect(() => {
    if (selectedTournament?.status === 'running' && selectedTournament.level_end_at) {
      const interval = setInterval(() => {
        const endTime = new Date(selectedTournament.level_end_at!).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeRemaining(remaining);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [selectedTournament]);

  const handleCreateTournament = async () => {
    if (!newTournament.name.trim()) {
      toast.error('Укажите название турнира');
      return;
    }

    const { error } = await supabase
      .from('online_poker_tournaments')
      .insert({
        name: newTournament.name,
        description: newTournament.description || null,
        buy_in: newTournament.buy_in,
        starting_chips: newTournament.starting_chips,
        max_players: newTournament.max_players,
        min_players: newTournament.min_players,
        level_duration: newTournament.level_duration,
        status: 'registration'
      });

    if (error) {
      toast.error('Ошибка создания турнира');
      console.error(error);
      return;
    }

    toast.success('Турнир создан');
    setShowCreateDialog(false);
    setNewTournament({
      name: '',
      description: '',
      buy_in: 1000,
      starting_chips: 5000,
      max_players: 9,
      min_players: 2,
      level_duration: 300
    });
    loadTournaments();
  };

  const handleStartTournament = async (tournament: Tournament) => {
    if ((tournament.participants_count || 0) < tournament.min_players) {
      toast.error(`Минимум ${tournament.min_players} участников`);
      return;
    }

    // Calculate level end time
    const levelEndAt = new Date(Date.now() + (tournament.level_duration || 300) * 1000).toISOString();

    const { error } = await supabase
      .from('online_poker_tournaments')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        current_level: 1,
        level_end_at: levelEndAt
      })
      .eq('id', tournament.id);

    if (error) {
      toast.error('Ошибка запуска турнира');
      return;
    }

    // Update all registered participants to playing status
    await supabase
      .from('online_poker_tournament_participants')
      .update({ status: 'playing', chips: tournament.starting_chips })
      .eq('tournament_id', tournament.id)
      .eq('status', 'registered');

    toast.success('Турнир запущен!');
    loadTournaments();
  };

  const handlePauseTournament = async (tournament: Tournament) => {
    const { error } = await supabase
      .from('online_poker_tournaments')
      .update({ status: 'paused' })
      .eq('id', tournament.id);

    if (error) {
      toast.error('Ошибка паузы');
      return;
    }

    toast.success('Турнир на паузе');
    loadTournaments();
  };

  const handleResumeTournament = async (tournament: Tournament) => {
    // Calculate new level end time based on remaining time
    const levelEndAt = new Date(Date.now() + timeRemaining * 1000).toISOString();

    const { error } = await supabase
      .from('online_poker_tournaments')
      .update({ status: 'running', level_end_at: levelEndAt })
      .eq('id', tournament.id);

    if (error) {
      toast.error('Ошибка возобновления');
      return;
    }

    toast.success('Турнир возобновлен');
    loadTournaments();
  };

  const handleAdvanceLevel = async (tournament: Tournament) => {
    const { data, error } = await supabase.rpc('advance_online_tournament_level', {
      p_tournament_id: tournament.id
    });

    if (error) {
      toast.error('Ошибка повышения уровня');
      console.error(error);
      return;
    }

    toast.success(`Уровень ${(data as any)?.level || 'следующий'}`);
    loadTournaments();
  };

  const handleFinishTournament = async (tournament: Tournament) => {
    const { error } = await supabase
      .from('online_poker_tournaments')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString()
      })
      .eq('id', tournament.id);

    if (error) {
      toast.error('Ошибка завершения');
      return;
    }

    toast.success('Турнир завершен');
    loadTournaments();
  };

  const handleIssueTickets = async (tournament: Tournament) => {
    const { data, error } = await supabase.rpc('issue_offline_tickets_for_winners', {
      p_tournament_id: tournament.id,
      p_ticket_value: 1000, // 1000 руб вход на офлайн турнир
      p_top_positions: 3 // Топ 3 получают билеты
    });

    if (error) {
      toast.error('Ошибка выдачи билетов');
      console.error(error);
      return;
    }

    const result = data as any;
    toast.success(`Выдано ${result?.tickets_issued || 0} билетов на офлайн турнир`);
  };

  const handleDeleteTournament = async () => {
    if (!tournamentToDelete) return;

    // Delete participants first
    await supabase
      .from('online_poker_tournament_participants')
      .delete()
      .eq('tournament_id', tournamentToDelete.id);

    // Delete levels
    await supabase
      .from('online_poker_tournament_levels')
      .delete()
      .eq('tournament_id', tournamentToDelete.id);

    // Delete payouts
    await supabase
      .from('online_poker_tournament_payouts')
      .delete()
      .eq('tournament_id', tournamentToDelete.id);

    // Delete tournament
    const { error } = await supabase
      .from('online_poker_tournaments')
      .delete()
      .eq('id', tournamentToDelete.id);

    if (error) {
      toast.error('Ошибка удаления');
      return;
    }

    toast.success('Турнир удален');
    setShowDeleteDialog(false);
    setTournamentToDelete(null);
    loadTournaments();
  };

  const handleEliminatePlayer = async (participant: Participant) => {
    if (!selectedTournament) return;

    const { data, error } = await supabase.rpc('eliminate_online_tournament_player', {
      p_tournament_id: selectedTournament.id,
      p_player_id: participant.player_id
    });

    if (error) {
      toast.error('Ошибка выбывания');
      console.error(error);
      return;
    }

    const result = data as any;
    toast.success(`${participant.player_name} выбыл на месте ${result?.finish_position}`);
    loadParticipants(selectedTournament.id);
    loadTournaments();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registration':
        return <Badge variant="secondary">Регистрация</Badge>;
      case 'running':
        return <Badge className="bg-green-500">Идет</Badge>;
      case 'paused':
        return <Badge variant="outline" className="border-amber-500 text-amber-500">Пауза</Badge>;
      case 'completed':
        return <Badge variant="default">Завершен</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Онлайн турниры</h3>
          <p className="text-sm text-muted-foreground">Создание и управление турнирами</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadTournaments} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Создать
          </Button>
        </div>
      </div>

      {/* Tournament Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="pt-3 pb-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Всего</p>
                <p className="text-lg font-bold">{tournaments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-3 pb-2">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Активных</p>
                <p className="text-lg font-bold">{tournaments.filter(t => t.status === 'running').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-3 pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">На регистрации</p>
                <p className="text-lg font-bold">{tournaments.filter(t => t.status === 'registration').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <CardContent className="pt-3 pb-2">
            <div className="flex items-center gap-2">
              <Diamond className="h-4 w-4 text-cyan-500" />
              <div>
                <p className="text-xs text-muted-foreground">Призовой фонд 💎</p>
                <p className="text-lg font-bold">{tournaments.reduce((sum, t) => sum + (t.prize_pool || 0), 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tournaments List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Список турниров</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Игроки</TableHead>
                  <TableHead>Buy-in 💎</TableHead>
                  <TableHead>RPS приз</TableHead>
                  <TableHead>Уровень</TableHead>
                  <TableHead>Блайнды</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tournaments.map((tournament) => (
                  <TableRow key={tournament.id}>
                    <TableCell>
                      <div className="font-medium">{tournament.name}</div>
                      {tournament.description && (
                        <div className="text-xs text-muted-foreground">{tournament.description}</div>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(tournament.status)}</TableCell>
                    <TableCell>
                      <span className="font-medium">{tournament.participants_count}</span>
                      <span className="text-muted-foreground">/{tournament.max_players}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Diamond className="h-3 w-3 text-cyan-400" />
                        {tournament.buy_in.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-amber-500">
                        <Award className="h-3 w-3" />
                        {formatRPSPoints(convertFeeToRPS((tournament.participants_count || 0) * tournament.buy_in))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {tournament.current_level || '-'}
                    </TableCell>
                    <TableCell>
                      {tournament.small_blind && tournament.big_blind 
                        ? `${tournament.small_blind}/${tournament.big_blind}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {tournament.status === 'registration' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-500 hover:text-green-600"
                            onClick={() => handleStartTournament(tournament)}
                            title="Запустить"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {tournament.status === 'running' && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-amber-500"
                              onClick={() => handlePauseTournament(tournament)}
                              title="Пауза"
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleAdvanceLevel(tournament)}
                              title="Следующий уровень"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {tournament.status === 'paused' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-500"
                            onClick={() => handleResumeTournament(tournament)}
                            title="Продолжить"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedTournament(tournament);
                            loadParticipants(tournament.id);
                            setShowParticipantsDialog(true);
                          }}
                          title="Участники"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedTournament(tournament);
                            loadBlindLevels(tournament.id);
                            setShowLevelsDialog(true);
                          }}
                          title="Структура"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        {tournament.status === 'completed' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-amber-500"
                            onClick={() => handleIssueTickets(tournament)}
                            title="Выдать билеты победителям"
                          >
                            <Ticket className="h-4 w-4" />
                          </Button>
                        )}
                        {(tournament.status === 'running' || tournament.status === 'paused') && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-500"
                            onClick={() => handleFinishTournament(tournament)}
                            title="Завершить"
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        )}
                        {tournament.status === 'registration' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-500"
                            onClick={() => {
                              setTournamentToDelete(tournament);
                              setShowDeleteDialog(true);
                            }}
                            title="Удалить"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {tournaments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Нет турниров
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Create Tournament Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Создать онлайн турнир
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                placeholder="Вечерний турнир"
                value={newTournament.name}
                onChange={(e) => setNewTournament(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                placeholder="Описание турнира..."
                value={newTournament.description}
                onChange={(e) => setNewTournament(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Diamond className="h-3 w-3 text-cyan-400" />
                  Buy-in (алмазы)
                </Label>
                <Input
                  type="number"
                  value={newTournament.buy_in}
                  onChange={(e) => setNewTournament(prev => ({ ...prev, buy_in: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground">
                  = {formatRPSPoints(convertFeeToRPS(newTournament.buy_in))} за 1 место
                </p>
              </div>
              <div className="space-y-2">
                <Label>Стартовые фишки</Label>
                <Input
                  type="number"
                  value={newTournament.starting_chips}
                  onChange={(e) => setNewTournament(prev => ({ ...prev, starting_chips: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Мин. игроков</Label>
                <Input
                  type="number"
                  value={newTournament.min_players}
                  onChange={(e) => setNewTournament(prev => ({ ...prev, min_players: parseInt(e.target.value) || 2 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Макс. игроков</Label>
                <Input
                  type="number"
                  value={newTournament.max_players}
                  onChange={(e) => setNewTournament(prev => ({ ...prev, max_players: parseInt(e.target.value) || 9 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Уровень (сек)</Label>
                <Input
                  type="number"
                  value={newTournament.level_duration}
                  onChange={(e) => setNewTournament(prev => ({ ...prev, level_duration: parseInt(e.target.value) || 300 }))}
                />
              </div>
            </div>
            
            {/* Prize Info */}
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <h4 className="font-semibold text-amber-500 mb-2 flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Система призов
              </h4>
              <div className="text-sm space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Валюта входа:</span>
                  <span className="text-cyan-400 flex items-center gap-1">
                    <Diamond className="h-3 w-3" /> Алмазы
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Призы:</span>
                  <span className="text-amber-400 flex items-center gap-1">
                    <Award className="h-3 w-3" /> RPS рейтинговые очки
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Топ-3:</span>
                  <span className="text-purple-400 flex items-center gap-1">
                    <Ticket className="h-3 w-3" /> Билеты на офлайн (1000₽)
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Отмена</Button>
            <Button onClick={handleCreateTournament}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Participants Dialog */}
      <Dialog open={showParticipantsDialog} onOpenChange={setShowParticipantsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Участники: {selectedTournament?.name}
            </DialogTitle>
            <DialogDescription>
              {participants.filter(p => p.status === 'playing').length} активных / {participants.length} всего
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Игрок</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Фишки</TableHead>
                  <TableHead className="text-right">Место</TableHead>
                  <TableHead className="text-right">Приз</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.player_name}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'playing' ? 'default' : 'secondary'}>
                        {p.status === 'playing' ? 'Играет' : p.status === 'eliminated' ? 'Выбыл' : p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{(p.chips || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{p.finish_position || '-'}</TableCell>
                    <TableCell className="text-right">{(p.prize_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {p.status === 'playing' && selectedTournament?.status === 'running' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500"
                          onClick={() => handleEliminatePlayer(p)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Blind Levels Dialog */}
      <Dialog open={showLevelsDialog} onOpenChange={setShowLevelsDialog}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Структура блайндов: {selectedTournament?.name}
            </DialogTitle>
            <DialogDescription>
              Текущий уровень: {selectedTournament?.current_level || 1}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ур.</TableHead>
                  <TableHead>SB</TableHead>
                  <TableHead>BB</TableHead>
                  <TableHead>Ante</TableHead>
                  <TableHead>Время</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blindLevels.map((level) => (
                  <TableRow 
                    key={level.id}
                    className={selectedTournament?.current_level === level.level ? 'bg-primary/10' : ''}
                  >
                    <TableCell className="font-medium">
                      {level.is_break ? (
                        <Badge variant="secondary">Перерыв</Badge>
                      ) : (
                        level.level
                      )}
                    </TableCell>
                    <TableCell>{level.is_break ? '-' : level.small_blind}</TableCell>
                    <TableCell>{level.is_break ? '-' : level.big_blind}</TableCell>
                    <TableCell>{level.ante || '-'}</TableCell>
                    <TableCell>{level.duration ? `${Math.floor(level.duration / 60)}:${(level.duration % 60).toString().padStart(2, '0')}` : '-'}</TableCell>
                  </TableRow>
                ))}
                {blindLevels.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Структура не настроена
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить турнир?</AlertDialogTitle>
            <AlertDialogDescription>
              Турнир "{tournamentToDelete?.name}" и все связанные данные будут удалены.
              Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTournament} className="bg-red-500 hover:bg-red-600">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}