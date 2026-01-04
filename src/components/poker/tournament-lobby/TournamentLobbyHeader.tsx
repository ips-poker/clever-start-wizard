import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Users, 
  Coins, 
  Clock, 
  Award,
  TrendingUp,
  Timer,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TournamentStats {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  buy_in: number;
  prize_pool: number;
  starting_chips: number;
  current_level: number;
  small_blind: number;
  big_blind: number;
  ante?: number;
  max_players: number;
  player_count: number;
  players_remaining: number;
  average_stack: number;
  largest_stack: number;
  smallest_stack: number;
  next_break_level?: number;
  level_duration?: number;
  time_remaining?: number;
  rebuy_enabled?: boolean;
  addon_enabled?: boolean;
  late_registration_enabled?: boolean;
  late_registration_level?: number;
  tickets_for_top?: number;
  ticket_value?: number;
  tournament_format?: string;
}

interface TournamentLobbyHeaderProps {
  tournament: TournamentStats;
  className?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  registration: { label: 'Регистрация', color: 'bg-emerald-500' },
  starting: { label: 'Запуск', color: 'bg-yellow-500' },
  running: { label: 'Идёт игра', color: 'bg-primary' },
  final_table: { label: 'Финальный стол', color: 'bg-red-500' },
  hand_for_hand: { label: 'Hand-for-Hand', color: 'bg-orange-500' },
  completed: { label: 'Завершён', color: 'bg-muted-foreground' },
  cancelled: { label: 'Отменён', color: 'bg-destructive' }
};

export function TournamentLobbyHeader({ tournament, className }: TournamentLobbyHeaderProps) {
  const status = statusConfig[tournament.status] || { label: tournament.status, color: 'bg-muted' };
  const progressPercent = ((tournament.max_players - tournament.players_remaining) / tournament.max_players) * 100;
  
  const bigBlindsAvg = tournament.big_blind > 0 
    ? Math.floor(tournament.average_stack / tournament.big_blind) 
    : 0;

  // Calculate RPS pool: buy_in / 50 * player_count = RPS points
  const rpsPool = Math.floor((tournament.buy_in / 50) * tournament.player_count);
  const hasTickets = (tournament.tickets_for_top || 0) > 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Tournament Title & Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-amber-500" />
          <div>
            <h2 className="text-xl font-bold">{tournament.name}</h2>
            {tournament.description && (
              <p className="text-sm text-muted-foreground">{tournament.description}</p>
            )}
          </div>
        </div>
        <Badge className={cn("text-white", status.color)}>
          {status.label}
        </Badge>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Buy-in & RPS Pool */}
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Coins className="h-4 w-4" />
            <span className="text-xs">Бай-ин / RPS Пул</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">{tournament.buy_in.toLocaleString()} 💎</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-lg font-bold text-amber-500">{rpsPool.toLocaleString()} RPS</span>
          </div>
        </div>

        {/* Players */}
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs">Игроки</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-primary">{tournament.players_remaining}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{tournament.player_count}</span>
            <span className="text-xs text-muted-foreground">из {tournament.max_players}</span>
          </div>
          <Progress value={progressPercent} className="h-1 mt-2" />
        </div>

        {/* Current Level */}
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Layers className="h-4 w-4" />
            <span className="text-xs">Уровень / Блайнды</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">Ур. {tournament.current_level}</span>
            <span className="text-sm text-muted-foreground">
              {tournament.small_blind}/{tournament.big_blind}
              {tournament.ante ? ` (${tournament.ante})` : ''}
            </span>
          </div>
        </div>

        {/* Average Stack */}
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">Средний стек</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">{tournament.average_stack.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">({bigBlindsAvg} BB)</span>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="flex flex-wrap gap-3 text-sm">
        {/* Tickets for top places */}
        {hasTickets && (
          <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/30">
            <span className="text-lg">🎟️</span>
            <span className="text-emerald-400 font-medium">Топ-{tournament.tickets_for_top} → входы на офлайн</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
          <Award className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-muted-foreground">Стартовые фишки:</span>
          <span className="font-medium">{tournament.starting_chips.toLocaleString()}</span>
        </div>
        
        <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-muted-foreground">Макс:</span>
          <span className="font-medium">{tournament.largest_stack.toLocaleString()}</span>
        </div>
        
        <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
          <TrendingUp className="h-3.5 w-3.5 text-red-500 rotate-180" />
          <span className="text-muted-foreground">Мин:</span>
          <span className="font-medium">{tournament.smallest_stack.toLocaleString()}</span>
        </div>

        {tournament.rebuy_enabled && (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
            Ребай
          </Badge>
        )}
        
        {tournament.addon_enabled && (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">
            Аддон
          </Badge>
        )}
        
        {tournament.late_registration_enabled && (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
            Late Reg (до ур. {tournament.late_registration_level})
          </Badge>
        )}
      </div>
    </div>
  );
}
