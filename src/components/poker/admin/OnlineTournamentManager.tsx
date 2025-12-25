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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Gift,
  Layers,
  Calendar,
  DoorOpen
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
import { OnlineBlindStructureEditor, OnlineBlindLevel } from './OnlineBlindStructureEditor';

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
  // Extended settings
  tournament_format?: string;
  rebuy_enabled?: boolean;
  rebuy_cost?: number;
  rebuy_chips?: number;
  rebuy_end_level?: number;
  addon_enabled?: boolean;
  addon_cost?: number;
  addon_chips?: number;
  addon_level?: number;
  late_registration_enabled?: boolean;
  late_registration_level?: number;
  tickets_for_top?: number;
  ticket_value?: number;
  break_interval?: number;
  break_duration?: number;
  guaranteed_prize_pool?: number;
  time_bank_initial?: number;
  time_bank_per_level?: number;
  action_time_seconds?: number;
  scheduled_start_at?: string;
  auto_start?: boolean;
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
  const [createTab, setCreateTab] = useState('basic');
  const [newBlindLevels, setNewBlindLevels] = useState<OnlineBlindLevel[]>([]);

  const [newTournament, setNewTournament] = useState({
    name: '',
    description: '',
    buy_in: 1000,
    starting_chips: 5000,
    max_players: 9,
    min_players: 2,
    level_duration: 300,
    // Extended settings
    tournament_format: 'freezeout',
    rebuy_enabled: false,
    rebuy_cost: 1000,
    rebuy_chips: 5000,
    rebuy_end_level: 6,
    addon_enabled: false,
    addon_cost: 1000,
    addon_chips: 10000,
    addon_level: 6,
    late_registration_enabled: true,
    late_registration_level: 6,
    tickets_for_top: 3,
    ticket_value: 1000,
    break_interval: 0,
    break_duration: 300,
    guaranteed_prize_pool: 0,
    time_bank_initial: 30,
    time_bank_per_level: 5,
    action_time_seconds: 30,
    scheduled_start_at: '',
    auto_start: false
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

    if (newBlindLevels.length === 0) {
      toast.error('Настройте структуру блайндов');
      setCreateTab('structure');
      return;
    }

    const { data: tournamentData, error } = await supabase
      .from('online_poker_tournaments')
      .insert({
        name: newTournament.name,
        description: newTournament.description || null,
        buy_in: newTournament.buy_in,
        starting_chips: newTournament.starting_chips,
        max_players: newTournament.max_players,
        min_players: newTournament.min_players,
        level_duration: newTournament.level_duration,
        status: 'registration',
        // Extended settings
        tournament_format: newTournament.tournament_format,
        rebuy_enabled: newTournament.rebuy_enabled,
        rebuy_cost: newTournament.rebuy_cost,
        rebuy_chips: newTournament.rebuy_chips,
        rebuy_end_level: newTournament.rebuy_end_level,
        addon_enabled: newTournament.addon_enabled,
        addon_cost: newTournament.addon_cost,
        addon_chips: newTournament.addon_chips,
        addon_level: newTournament.addon_level,
        late_registration_enabled: newTournament.late_registration_enabled,
        late_registration_level: newTournament.late_registration_level,
        tickets_for_top: newTournament.tickets_for_top,
        ticket_value: newTournament.ticket_value,
        break_interval: newTournament.break_interval,
        break_duration: newTournament.break_duration,
        guaranteed_prize_pool: newTournament.guaranteed_prize_pool,
        time_bank_initial: newTournament.time_bank_initial,
        time_bank_per_level: newTournament.time_bank_per_level,
        action_time_seconds: newTournament.action_time_seconds,
        scheduled_start_at: newTournament.scheduled_start_at || null,
        auto_start: newTournament.auto_start
      })
      .select('id')
      .single();

    if (error || !tournamentData) {
      toast.error('Ошибка создания турнира');
      console.error(error);
      return;
    }

    // Create blind levels
    const blindLevelsToInsert = newBlindLevels.map(level => ({
      tournament_id: tournamentData.id,
      level: level.level,
      small_blind: level.small_blind,
      big_blind: level.big_blind,
      ante: level.ante,
      duration: level.duration,
      is_break: level.is_break
    }));

    const { error: levelsError } = await supabase
      .from('online_poker_tournament_levels')
      .insert(blindLevelsToInsert);

    if (levelsError) {
      console.error('Error creating blind levels:', levelsError);
      toast.error('Турнир создан, но ошибка создания структуры блайндов');
    } else {
      toast.success('Турнир создан со структурой блайндов');
    }

    setShowCreateDialog(false);
    setNewBlindLevels([]);
    setCreateTab('basic');
    setNewTournament({
      name: '',
      description: '',
      buy_in: 1000,
      starting_chips: 5000,
      max_players: 9,
      min_players: 2,
      level_duration: 300,
      tournament_format: 'freezeout',
      rebuy_enabled: false,
      rebuy_cost: 1000,
      rebuy_chips: 5000,
      rebuy_end_level: 6,
      addon_enabled: false,
      addon_cost: 1000,
      addon_chips: 10000,
      addon_level: 6,
      late_registration_enabled: true,
      late_registration_level: 6,
      tickets_for_top: 3,
      ticket_value: 1000,
      break_interval: 0,
      break_duration: 300,
      guaranteed_prize_pool: 0,
      time_bank_initial: 30,
      time_bank_per_level: 5,
      action_time_seconds: 30,
      scheduled_start_at: '',
      auto_start: false
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
    // Структура входов в зависимости от места: 1 место = 3 входа, 2 = 2, 3 = 1
    const entriesPerPosition = getEntriesStructure(tournament.tickets_for_top || 3);
    
    const { data, error } = await supabase.rpc('issue_offline_tickets_for_winners', {
      p_tournament_id: tournament.id,
      p_top_positions: tournament.tickets_for_top || 3,
      p_entries_per_position: entriesPerPosition
    });

    if (error) {
      toast.error('Ошибка выдачи входов');
      console.error(error);
      return;
    }

    const result = data as any;
    toast.success(`Выдано ${result?.total_entries || 0} входов для ${result?.tickets_issued || 0} победителей`);
  };

  // Генерация структуры входов для призовых мест
  const getEntriesStructure = (topPositions: number): number[] => {
    const structures: { [key: number]: number[] } = {
      1: [1],
      2: [2, 1],
      3: [3, 2, 1],
      4: [4, 3, 2, 1],
      5: [5, 4, 3, 2, 1],
      6: [5, 4, 3, 2, 1, 1]
    };
    return structures[topPositions] || structures[3];
  };

  // Генерация структуры призов автоматически
  const handleGeneratePayoutStructure = async (tournamentId: string) => {
    const { data, error } = await supabase.rpc('generate_online_tournament_payout_structure', {
      p_tournament_id: tournamentId
    });

    if (error) {
      toast.error('Ошибка генерации призовой структуры');
      console.error(error);
      return;
    }

    const result = data as any;
    if (result?.success) {
      toast.success(`Сгенерирована призовая структура для ${result.participants_count} участников`);
      loadTournaments();
    }
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Создать онлайн турнир
            </DialogTitle>
            <DialogDescription>
              Полная настройка турнира с структурой блайндов
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={createTab} onValueChange={setCreateTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic" className="text-xs">
                <Settings className="h-3 w-3 mr-1" />
                Основное
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                Настройки
              </TabsTrigger>
              <TabsTrigger value="structure" className="text-xs">
                <Layers className="h-3 w-3 mr-1" />
                Структура
              </TabsTrigger>
              <TabsTrigger value="prizes" className="text-xs">
                <Award className="h-3 w-3 mr-1" />
                Призы
              </TabsTrigger>
            </TabsList>

            {/* Tab: Basic */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Название турнира</Label>
                  <Input
                    placeholder="Вечерний турнир 💎"
                    value={newTournament.name}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Описание</Label>
                  <Textarea
                    placeholder="Описание турнира..."
                    value={newTournament.description}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Формат турнира</Label>
                  <Select
                    value={newTournament.tournament_format}
                    onValueChange={(v) => setNewTournament(prev => ({ ...prev, tournament_format: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="freezeout">Freezeout (без ребаев)</SelectItem>
                      <SelectItem value="rebuy">Rebuy (с ребаями)</SelectItem>
                      <SelectItem value="knockout">Knockout (с нокаутами)</SelectItem>
                      <SelectItem value="bounty">Bounty (с баунти)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Планируемый старт
                  </Label>
                  <Input
                    type="datetime-local"
                    value={newTournament.scheduled_start_at}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, scheduled_start_at: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                    = {formatRPSPoints(convertFeeToRPS(newTournament.buy_in))} RPS
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
                <div className="space-y-2">
                  <Label>Гарант. призовой 💎</Label>
                  <Input
                    type="number"
                    value={newTournament.guaranteed_prize_pool}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, guaranteed_prize_pool: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <input
                  type="checkbox"
                  checked={newTournament.auto_start}
                  onChange={(e) => setNewTournament(prev => ({ ...prev, auto_start: e.target.checked }))}
                  className="h-4 w-4 rounded"
                />
                <div>
                  <Label>Автостарт при минимуме игроков</Label>
                  <p className="text-xs text-muted-foreground">Турнир начнется автоматически</p>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Settings */}
            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="grid grid-cols-4 gap-4">
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
                <div className="space-y-2">
                  <Label>Время хода (сек)</Label>
                  <Input
                    type="number"
                    value={newTournament.action_time_seconds}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, action_time_seconds: parseInt(e.target.value) || 30 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Тайм-банк старт</Label>
                  <Input
                    type="number"
                    value={newTournament.time_bank_initial}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, time_bank_initial: parseInt(e.target.value) || 30 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Тайм-банк +уровень</Label>
                  <Input
                    type="number"
                    value={newTournament.time_bank_per_level}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, time_bank_per_level: parseInt(e.target.value) || 5 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Перерыв каждые N ур.</Label>
                  <Input
                    type="number"
                    placeholder="0 = нет"
                    value={newTournament.break_interval}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, break_interval: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Перерыв (сек)</Label>
                  <Input
                    type="number"
                    value={newTournament.break_duration}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, break_duration: parseInt(e.target.value) || 300 }))}
                  />
                </div>
              </div>

              {/* Rebuy & Addon */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3 p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newTournament.rebuy_enabled}
                        onChange={(e) => setNewTournament(prev => ({ ...prev, rebuy_enabled: e.target.checked }))}
                        className="h-4 w-4 rounded"
                      />
                      Ребай включен
                    </Label>
                  </div>
                  {newTournament.rebuy_enabled && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Цена 💎</Label>
                        <Input
                          type="number"
                          className="h-8"
                          value={newTournament.rebuy_cost}
                          onChange={(e) => setNewTournament(prev => ({ ...prev, rebuy_cost: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Фишки</Label>
                        <Input
                          type="number"
                          className="h-8"
                          value={newTournament.rebuy_chips}
                          onChange={(e) => setNewTournament(prev => ({ ...prev, rebuy_chips: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">До уровня</Label>
                        <Input
                          type="number"
                          className="h-8"
                          value={newTournament.rebuy_end_level}
                          onChange={(e) => setNewTournament(prev => ({ ...prev, rebuy_end_level: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3 p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newTournament.addon_enabled}
                        onChange={(e) => setNewTournament(prev => ({ ...prev, addon_enabled: e.target.checked }))}
                        className="h-4 w-4 rounded"
                      />
                      Аддон включен
                    </Label>
                  </div>
                  {newTournament.addon_enabled && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Цена 💎</Label>
                        <Input
                          type="number"
                          className="h-8"
                          value={newTournament.addon_cost}
                          onChange={(e) => setNewTournament(prev => ({ ...prev, addon_cost: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Фишки</Label>
                        <Input
                          type="number"
                          className="h-8"
                          value={newTournament.addon_chips}
                          onChange={(e) => setNewTournament(prev => ({ ...prev, addon_chips: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">На уровне</Label>
                        <Input
                          type="number"
                          className="h-8"
                          value={newTournament.addon_level}
                          onChange={(e) => setNewTournament(prev => ({ ...prev, addon_level: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Late Registration */}
              <div className="grid grid-cols-2 gap-4 p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={newTournament.late_registration_enabled}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, late_registration_enabled: e.target.checked }))}
                    className="h-4 w-4 rounded"
                  />
                  <Label>Поздняя регистрация</Label>
                </div>
                {newTournament.late_registration_enabled && (
                  <div className="space-y-2">
                    <Label className="text-xs">До уровня</Label>
                    <Input
                      type="number"
                      className="h-8"
                      value={newTournament.late_registration_level}
                      onChange={(e) => setNewTournament(prev => ({ ...prev, late_registration_level: parseInt(e.target.value) || 6 }))}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab: Structure */}
            <TabsContent value="structure" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Структура блайндов
                  </CardTitle>
                  <CardDescription>
                    Настройте уровни блайндов для турнира. Выберите шаблон или создайте свою структуру.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <OnlineBlindStructureEditor
                    blindLevels={newBlindLevels}
                    onBlindLevelsChange={setNewBlindLevels}
                    levelDuration={newTournament.level_duration}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Prizes */}
            <TabsContent value="prizes" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Входы для топ N мест</Label>
                  <Select
                    value={String(newTournament.tickets_for_top)}
                    onValueChange={(v) => setNewTournament(prev => ({ ...prev, tickets_for_top: parseInt(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Топ-1 (только победитель)</SelectItem>
                      <SelectItem value="2">Топ-2</SelectItem>
                      <SelectItem value="3">Топ-3</SelectItem>
                      <SelectItem value="4">Топ-4</SelectItem>
                      <SelectItem value="5">Топ-5</SelectItem>
                      <SelectItem value="6">Топ-6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Гарантированный призовой фонд 💎</Label>
                  <Input
                    type="number"
                    value={newTournament.guaranteed_prize_pool}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, guaranteed_prize_pool: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              {/* Entries Structure Preview */}
              <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
                <h4 className="font-semibold text-purple-400 mb-3 flex items-center gap-2">
                  <DoorOpen className="h-4 w-4" />
                  Структура входов на офлайн
                </h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {Array.from({ length: newTournament.tickets_for_top }, (_, i) => {
                    const entriesMap: { [key: number]: number[] } = {
                      1: [1],
                      2: [2, 1],
                      3: [3, 2, 1],
                      4: [4, 3, 2, 1],
                      5: [5, 4, 3, 2, 1],
                      6: [5, 4, 3, 2, 1, 1]
                    };
                    const entries = entriesMap[newTournament.tickets_for_top] || [1];
                    return (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-background/50">
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3 w-3 text-amber-500" />
                          {i + 1} место
                        </span>
                        <Badge variant="outline" className="text-purple-400 border-purple-400/50">
                          {entries[i]} {entries[i] === 1 ? 'вход' : entries[i] < 5 ? 'входа' : 'входов'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Каждый вход = 1 участие в любом офлайн турнире. Входы действительны 90 дней.
                </p>
              </div>

              {/* Prize Info */}
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                <h4 className="font-semibold text-amber-500 mb-3 flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Автоматическая система призов
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-2 rounded bg-background/50">
                    <span className="text-muted-foreground">Валюта входа:</span>
                    <span className="text-cyan-400 flex items-center gap-1 font-medium">
                      <Diamond className="h-4 w-4" /> Алмазы ({newTournament.buy_in.toLocaleString()} 💎)
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-background/50">
                    <span className="text-muted-foreground">Призы за места:</span>
                    <span className="text-amber-400 flex items-center gap-1 font-medium">
                      <Award className="h-4 w-4" /> RPS очки (автоматически)
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-background/50">
                    <span className="text-muted-foreground">Расчёт RPS пула:</span>
                    <span className="text-green-400 font-medium">
                      1000₽ = 100 RPS
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-background/50">
                    <span className="text-muted-foreground">Топ-{newTournament.tickets_for_top} получают:</span>
                    <span className="text-purple-400 flex items-center gap-1 font-medium">
                      <DoorOpen className="h-4 w-4" /> Входы на офлайн турниры
                    </span>
                  </div>
                </div>
                <div className="mt-3 p-3 rounded bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-400">
                    <strong>Автоматический расчёт:</strong> Призовая структура (% RPS за каждое место) 
                    автоматически рассчитывается при старте турнира в зависимости от количества участников:
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>• 2-9 игроков: 1 призовое место (100%)</li>
                    <li>• 10-19 игроков: 2 места (60% / 40%)</li>
                    <li>• 20-29 игроков: 3 места (50% / 30% / 20%)</li>
                    <li>• 30-49 игроков: 4 места (40% / 30% / 20% / 10%)</li>
                    <li>• 50+ игроков: 6 мест (35% / 25% / 15% / 10% / 8% / 7%)</li>
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Денежных выплат нет. Алмазы на деньги не меняются. Легальный формат.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Отмена</Button>
            <Button onClick={handleCreateTournament}>
              <Trophy className="h-4 w-4 mr-2" />
              Создать турнир
            </Button>
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