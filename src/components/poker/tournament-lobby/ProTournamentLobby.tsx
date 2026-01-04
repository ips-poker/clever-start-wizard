import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trophy, 
  Users, 
  Layers,
  Award,
  Info,
  Play,
  RefreshCw,
  Loader2,
  Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TournamentLobbyHeader } from './TournamentLobbyHeader';
import { PlayersListTab } from './PlayersListTab';
import { BlindStructureTab } from './BlindStructureTab';
import { PayoutsTab } from './PayoutsTab';
import { TournamentInfoTab } from './TournamentInfoTab';
import { ICMDealCalculator } from '@/components/poker/ICMDealCalculator';

interface ProTournamentLobbyProps {
  tournamentId: string;
  playerId: string;
  playerBalance: number;
  isRegistered: boolean;
  open: boolean;
  onClose: () => void;
  onRegister: () => void;
  onUnregister: () => void;
  onJoin: () => void;
}

interface TournamentData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  tournament_format: string | null;
  buy_in: number;
  starting_chips: number;
  prize_pool: number | null;
  guaranteed_prize_pool: number | null;
  max_players: number;
  min_players: number;
  current_level: number | null;
  small_blind: number | null;
  big_blind: number | null;
  ante: number | null;
  level_duration: number | null;
  level_end_at: string | null;
  action_time_seconds: number | null;
  time_bank_initial: number | null;
  time_bank_per_level: number | null;
  rebuy_enabled: boolean | null;
  rebuy_cost: number | null;
  rebuy_chips: number | null;
  rebuy_end_level: number | null;
  addon_enabled: boolean | null;
  addon_cost: number | null;
  addon_chips: number | null;
  addon_level: number | null;
  late_registration_enabled: boolean | null;
  late_registration_level: number | null;
  break_duration: number | null;
  break_interval: number | null;
  registration_start: string | null;
  scheduled_start_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  tickets_for_top: number | null;
  ticket_value: number | null;
}

interface Participant {
  id: string;
  player_id: string;
  status: string;
  chips: number | null;
  rebuys_count: number | null;
  addons_count: number | null;
  table_id: string | null;
  seat_number: number | null;
  finish_position: number | null;
  prize_amount: number | null;
  eliminated_at: string | null;
}

interface BlindLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number | null;
  duration: number | null;
  is_break: boolean | null;
}

interface Payout {
  position: number;
  percentage: number;
  amount: number | null;
  player_id: string | null;
}

export function ProTournamentLobby({
  tournamentId,
  playerId,
  playerBalance,
  isRegistered,
  open,
  onClose,
  onRegister,
  onUnregister,
  onJoin
}: ProTournamentLobbyProps) {
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [playersData, setPlayersData] = useState<Map<string, { name: string; avatar_url: string | null }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('players');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [icmOpen, setIcmOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Fetch tournament
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('online_poker_tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      // Calculate time remaining from level_end_at
      if (tournamentData.level_end_at) {
        const endTime = new Date(tournamentData.level_end_at).getTime();
        const now = Date.now();
        setTimeRemaining(Math.max(0, Math.floor((endTime - now) / 1000)));
      }

      // Fetch participants
      const { data: participantsData } = await supabase
        .from('online_poker_tournament_participants')
        .select('*')
        .eq('tournament_id', tournamentId)
        .neq('status', 'cancelled')
        .order('chips', { ascending: false, nullsFirst: false });

      setParticipants(participantsData || []);

      // Fetch player names
      if (participantsData && participantsData.length > 0) {
        const playerIds = participantsData.map(p => p.player_id);
        const { data: playersDataResult } = await supabase
          .from('players')
          .select('id, name, avatar_url')
          .in('id', playerIds);

        const map = new Map<string, { name: string; avatar_url: string | null }>();
        (playersDataResult || []).forEach(p => map.set(p.id, { name: p.name, avatar_url: p.avatar_url }));
        setPlayersData(map);
      }

      // Fetch blind levels
      const { data: levelsData } = await supabase
        .from('online_poker_tournament_levels')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('level');

      setBlindLevels(levelsData || []);

      // Fetch payouts
      const { data: payoutsData } = await supabase
        .from('online_poker_tournament_payouts')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('position');

      setPayouts(payoutsData || []);

    } catch (error) {
      console.error('Error fetching tournament data:', error);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    if (open) {
      fetchData();

      // Subscribe to real-time updates
      const channel = supabase
        .channel(`tournament-lobby-${tournamentId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'online_poker_tournaments',
          filter: `id=eq.${tournamentId}`
        }, () => fetchData())
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'online_poker_tournament_participants',
          filter: `tournament_id=eq.${tournamentId}`
        }, () => fetchData())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, tournamentId, fetchData]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timeRemaining]);

  if (!open) return null;

  if (loading || !tournament) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Prepare stats
  const activePlayers = participants.filter(p => p.status !== 'eliminated');
  const totalChips = activePlayers.reduce((sum, p) => sum + (p.chips || 0), 0);
  const averageStack = activePlayers.length > 0 ? Math.floor(totalChips / activePlayers.length) : 0;
  const largestStack = activePlayers.reduce((max, p) => Math.max(max, p.chips || 0), 0);
  const smallestStack = activePlayers.length > 0 
    ? activePlayers.reduce((min, p) => Math.min(min, p.chips || Infinity), Infinity)
    : 0;

  const tournamentStats = {
    ...tournament,
    prize_pool: tournament.prize_pool || 0,
    current_level: tournament.current_level || 1,
    small_blind: tournament.small_blind || 0,
    big_blind: tournament.big_blind || 0,
    player_count: participants.length,
    players_remaining: activePlayers.length,
    average_stack: averageStack,
    largest_stack: largestStack,
    smallest_stack: smallestStack,
    tickets_for_top: tournament.tickets_for_top || 0,
    ticket_value: tournament.ticket_value || 0,
    tournament_format: tournament.tournament_format
  };

  // Prepare players list
  const playersList = participants.map(p => ({
    id: p.id,
    player_id: p.player_id,
    player_name: playersData.get(p.player_id)?.name || 'Игрок',
    player_avatar: playersData.get(p.player_id)?.avatar_url,
    status: p.status as 'registered' | 'playing' | 'eliminated',
    chips: p.chips || 0,
    rebuys_count: p.rebuys_count || 0,
    addons_count: p.addons_count || 0,
    table_number: p.table_id ? 1 : undefined, // TODO: get actual table number
    seat_number: p.seat_number || undefined,
    finish_position: p.finish_position,
    prize_amount: p.prize_amount || 0,
    eliminated_at: p.eliminated_at
  }));

  // Prepare blind levels
  const blindLevelsList = blindLevels.map(l => ({
    level: l.level,
    small_blind: l.small_blind,
    big_blind: l.big_blind,
    ante: l.ante || 0,
    duration: l.duration || 600,
    is_break: l.is_break || false
  }));

  // Prepare payouts
  const payoutsList = payouts.map(p => ({
    position: p.position,
    percentage: p.percentage,
    amount: p.amount || 0,
    player_id: p.player_id,
    player_name: p.player_id ? playersData.get(p.player_id)?.name : null
  }));

  // Action buttons logic
  const canRegister = tournament.status === 'registration' && 
                      participants.length < tournament.max_players &&
                      !isRegistered &&
                      playerBalance >= tournament.buy_in;
  
  const isLateRegOpen = tournament.late_registration_enabled && 
                        ['running', 'starting'].includes(tournament.status) &&
                        (tournament.current_level || 1) <= (tournament.late_registration_level || 0);
  
  const canLateRegister = isLateRegOpen && !isRegistered && playerBalance >= tournament.buy_in;
  const canUnregister = isRegistered && tournament.status === 'registration';
  const canJoin = isRegistered && ['running', 'starting', 'final_table', 'break', 'hand_for_hand'].includes(tournament.status);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="p-6 pb-0">
          <TournamentLobbyHeader tournament={tournamentStats} />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col px-6">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="players" className="gap-1.5">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Игроки</span>
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {activePlayers.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="structure" className="gap-1.5">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Структура</span>
            </TabsTrigger>
            <TabsTrigger value="payouts" className="gap-1.5">
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Призы</span>
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-1.5">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">Инфо</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="players" className="m-0 h-[400px]">
              <PlayersListTab
                players={playersList}
                currentPlayerId={playerId}
                bigBlind={tournament.big_blind || 0}
                averageStack={averageStack}
              />
            </TabsContent>

            <TabsContent value="structure" className="m-0 h-[400px]">
              <BlindStructureTab
                levels={blindLevelsList}
                currentLevel={tournament.current_level || 1}
                timeRemaining={timeRemaining}
              />
            </TabsContent>

            <TabsContent value="payouts" className="m-0 h-[400px]">
              <PayoutsTab
                payouts={payoutsList}
                prizePool={tournament.prize_pool || 0}
                playersRemaining={activePlayers.length}
                totalPlayers={participants.length}
                currentPlayerId={playerId}
                buyIn={tournament.buy_in}
                ticketsForTop={tournament.tickets_for_top || 0}
                tournamentStatus={tournament.status}
              />
            </TabsContent>

            <TabsContent value="info" className="m-0 pb-4">
              <TournamentInfoTab
                tournament={{
                  ...tournament,
                  prize_pool: tournament.prize_pool || 0,
                  player_count: participants.length,
                  players_remaining: activePlayers.length
                }}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-2 p-4 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Закрыть
          </Button>
          
          {/* ICM Calculator Button - show when tournament is running with multiple players */}
          {['running', 'final_table', 'hand_for_hand'].includes(tournament.status) && 
           activePlayers.length >= 2 && activePlayers.length <= 10 && payouts.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => setIcmOpen(true)}
              className="gap-1 border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
            >
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">ICM</span>
            </Button>
          )}
          
          {(canRegister || canLateRegister) && (
            <Button onClick={onRegister} className="flex-1 gap-1">
              <Trophy className="h-4 w-4" />
              {canLateRegister ? 'Поздняя регистрация' : 'Регистрация'}
              <span className="text-xs opacity-75">({tournament.buy_in.toLocaleString()})</span>
            </Button>
          )}
          
          {canUnregister && (
            <Button variant="destructive" onClick={onUnregister} className="flex-1">
              Отменить регистрацию
            </Button>
          )}
          
          {canJoin && (
            <Button onClick={onJoin} className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700">
              <Play className="h-4 w-4" />
              Войти в турнир
            </Button>
          )}
        </div>
      </DialogContent>

      {/* ICM Calculator Modal */}
      <ICMDealCalculator
        isOpen={icmOpen}
        onClose={() => setIcmOpen(false)}
        players={activePlayers.map(p => ({
          id: p.player_id,
          name: playersData.get(p.player_id)?.name || 'Игрок',
          avatarUrl: playersData.get(p.player_id)?.avatar_url || undefined,
          chips: p.chips || 0,
          seatNumber: p.seat_number || 0
        }))}
        payoutStructure={payouts.map(p => ({
          position: p.position,
          amount: p.amount || 0
        }))}
        prizePoolRemaining={tournament.prize_pool || 0}
        currentPlayerId={playerId}
      />
    </Dialog>
  );
}
