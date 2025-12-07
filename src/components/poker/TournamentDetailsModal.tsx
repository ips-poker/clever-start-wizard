import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trophy, 
  Users, 
  Coins, 
  Clock, 
  Award,
  Play,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  player_id: string;
  status: string;
  chips: number;
  finish_position: number | null;
  prize_amount: number;
  player?: {
    name: string;
    avatar_url: string | null;
  };
}

interface BlindLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration: number;
  is_break: boolean;
}

interface Payout {
  position: number;
  percentage: number;
  amount: number;
}

interface TournamentDetailsModalProps {
  tournament: {
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
    player_count?: number;
  };
  playerId: string;
  isRegistered: boolean;
  playerBalance: number;
  onClose: () => void;
  onRegister: () => void;
  onUnregister: () => void;
  onJoin: () => void;
}

export function TournamentDetailsModal({
  tournament,
  playerId,
  isRegistered,
  playerBalance,
  onClose,
  onRegister,
  onUnregister,
  onJoin
}: TournamentDetailsModalProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetails();
  }, [tournament.id]);

  const fetchDetails = async () => {
    try {
      // Fetch participants
      const { data: participantsData } = await supabase
        .from('online_poker_tournament_participants')
        .select('*')
        .eq('tournament_id', tournament.id)
        .neq('status', 'cancelled')
        .order('registered_at');

      // Fetch player names separately
      if (participantsData && participantsData.length > 0) {
        const playerIds = participantsData.map(p => p.player_id);
        const { data: playersData } = await supabase
          .from('players')
          .select('id, name, avatar_url')
          .in('id', playerIds);

        const playersMap = new Map((playersData || []).map(p => [p.id, p]));
        
        const enrichedParticipants = participantsData.map(p => ({
          ...p,
          player: playersMap.get(p.player_id)
        }));
        
        setParticipants(enrichedParticipants);
      } else {
        setParticipants([]);
      }

      // Fetch blind levels
      const { data: levelsData } = await supabase
        .from('online_poker_tournament_levels')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('level');

      setBlindLevels(levelsData || []);

      // Fetch payouts
      const { data: payoutsData } = await supabase
        .from('online_poker_tournament_payouts')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('position');

      setPayouts(payoutsData || []);
    } catch (error) {
      console.error('Error fetching tournament details:', error);
    } finally {
      setLoading(false);
    }
  };

  const canRegister = tournament.status === 'registration' && 
                      (tournament.player_count || 0) < tournament.max_players &&
                      !isRegistered &&
                      playerBalance >= tournament.buy_in;
  const canUnregister = isRegistered && tournament.status === 'registration';
  const canJoin = isRegistered && ['running', 'starting', 'final_table'].includes(tournament.status);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      registration: 'Регистрация открыта',
      starting: 'Турнир запускается',
      running: 'Идёт игра',
      final_table: 'Финальный стол',
      completed: 'Турнир завершён',
      cancelled: 'Турнир отменён'
    };
    return labels[status] || status;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            {tournament.name}
          </DialogTitle>
        </DialogHeader>

        {/* Tournament info header */}
        <div className="grid grid-cols-4 gap-2 p-3 bg-muted/30 rounded-lg">
          <div className="text-center">
            <Coins className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Бай-ин</p>
            <p className="font-semibold">{tournament.buy_in.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Игроки</p>
            <p className="font-semibold">{participants.length}/{tournament.max_players}</p>
          </div>
          <div className="text-center">
            <Award className="h-4 w-4 mx-auto text-amber-500 mb-1" />
            <p className="text-xs text-muted-foreground">Призовой</p>
            <p className="font-semibold text-amber-500">{tournament.prize_pool.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <Clock className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Уровень</p>
            <p className="font-semibold">{tournament.current_level}</p>
          </div>
        </div>

        <Badge variant="outline" className="w-fit mx-auto">
          {getStatusLabel(tournament.status)}
        </Badge>

        {/* Tabs */}
        <Tabs defaultValue="players" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="players">Игроки</TabsTrigger>
            <TabsTrigger value="structure">Структура</TabsTrigger>
            <TabsTrigger value="payouts">Выплаты</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-2">
            <TabsContent value="players" className="m-0">
              <div className="space-y-2">
                {participants.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Пока нет участников
                  </p>
                ) : (
                  participants.map((p, index) => (
                    <div 
                      key={p.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg",
                        p.player_id === playerId && "bg-primary/10 border border-primary/30"
                      )}
                    >
                      <span className="text-sm text-muted-foreground w-6">
                        {p.finish_position || index + 1}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {p.player?.name || 'Игрок'}
                          {p.player_id === playerId && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">Вы</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.status === 'eliminated' ? 'Выбыл' : `${p.chips.toLocaleString()} фишек`}
                        </p>
                      </div>
                      {p.prize_amount > 0 && (
                        <Badge className="bg-amber-500">
                          +{p.prize_amount.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="structure" className="m-0">
              <div className="space-y-1">
                {blindLevels.map((level) => (
                  <div 
                    key={level.level}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg text-sm",
                      level.level === tournament.current_level && "bg-primary/10 border border-primary/30",
                      level.is_break && "bg-muted/50"
                    )}
                  >
                    <span className="w-8 text-muted-foreground">#{level.level}</span>
                    {level.is_break ? (
                      <span className="flex-1 text-muted-foreground">Перерыв</span>
                    ) : (
                      <>
                        <span className="flex-1">
                          {level.small_blind}/{level.big_blind}
                          {level.ante > 0 && ` (${level.ante})`}
                        </span>
                      </>
                    )}
                    <span className="text-muted-foreground">
                      {Math.floor(level.duration / 60)} мин
                    </span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="payouts" className="m-0">
              <div className="space-y-2">
                {payouts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Выплаты будут определены после начала турнира
                  </p>
                ) : (
                  payouts.map((payout) => (
                    <div 
                      key={payout.position}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold",
                        payout.position === 1 && "bg-amber-500 text-black",
                        payout.position === 2 && "bg-gray-300 text-black",
                        payout.position === 3 && "bg-amber-700 text-white",
                        payout.position > 3 && "bg-muted text-muted-foreground"
                      )}>
                        {payout.position}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Место {payout.position}</p>
                        <p className="text-xs text-muted-foreground">{payout.percentage}%</p>
                      </div>
                      <span className="font-bold text-amber-500">
                        {payout.amount.toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Закрыть
          </Button>
          {canRegister && (
            <Button onClick={onRegister} className="flex-1">
              Регистрация ({tournament.buy_in.toLocaleString()})
            </Button>
          )}
          {canUnregister && (
            <Button variant="destructive" onClick={onUnregister} className="flex-1">
              Отменить регистрацию
            </Button>
          )}
          {canJoin && (
            <Button onClick={onJoin} className="flex-1 gap-1">
              <Play className="h-4 w-4" />
              Войти в турнир
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
