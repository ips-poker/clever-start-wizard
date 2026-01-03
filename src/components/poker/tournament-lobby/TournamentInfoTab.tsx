import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy,
  Calendar,
  Clock,
  Users,
  Coins,
  Layers,
  RefreshCw,
  Plus,
  Timer,
  Target,
  Shield,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TournamentDetails {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  tournament_format?: string;
  
  // Buy-in & Chips
  buy_in: number;
  starting_chips: number;
  prize_pool: number;
  guaranteed_prize_pool?: number;
  
  // Players
  max_players: number;
  min_players: number;
  player_count: number;
  players_remaining: number;
  
  // Timing
  level_duration?: number;
  action_time_seconds?: number;
  time_bank_initial?: number;
  time_bank_per_level?: number;
  
  // Rebuy/Addon
  rebuy_enabled?: boolean;
  rebuy_cost?: number;
  rebuy_chips?: number;
  rebuy_end_level?: number;
  addon_enabled?: boolean;
  addon_cost?: number;
  addon_chips?: number;
  addon_level?: number;
  
  // Late Registration
  late_registration_enabled?: boolean;
  late_registration_level?: number;
  
  // Breaks
  break_duration?: number;
  break_interval?: number;
  
  // Dates
  registration_start?: string;
  scheduled_start_at?: string;
  started_at?: string;
  finished_at?: string;
  created_at: string;
}

interface TournamentInfoTabProps {
  tournament: TournamentDetails;
  className?: string;
}

export function TournamentInfoTab({ tournament, className }: TournamentInfoTabProps) {
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    return format(new Date(dateString), 'd MMMM yyyy, HH:mm', { locale: ru });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    return `${mins} мин`;
  };

  const getFormatLabel = (format?: string) => {
    const formats: Record<string, string> = {
      freezeout: 'Freezeout',
      rebuy: 'Rebuy',
      addon: 'Addon',
      knockout: 'Knockout',
      bounty: 'Bounty',
      satellite: 'Сателлит'
    };
    return formats[format || ''] || format || 'Стандартный';
  };

  const InfoRow = ({ 
    icon: Icon, 
    label, 
    value, 
    valueClass 
  }: { 
    icon: any; 
    label: string; 
    value: React.ReactNode;
    valueClass?: string;
  }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <span className={cn("font-medium", valueClass)}>{value}</span>
    </div>
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Tournament Description */}
      {tournament.description && (
        <div className="p-4 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">{tournament.description}</p>
        </div>
      )}

      {/* Basic Info */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Основная информация
        </h3>
        <div className="bg-card border rounded-lg p-4 space-y-1">
          <InfoRow 
            icon={Layers} 
            label="Формат" 
            value={
              <Badge variant="outline">{getFormatLabel(tournament.tournament_format)}</Badge>
            }
          />
          <Separator />
          <InfoRow 
            icon={Coins} 
            label="Бай-ин" 
            value={tournament.buy_in.toLocaleString()}
          />
          <Separator />
          <InfoRow 
            icon={Trophy} 
            label="Призовой фонд" 
            value={tournament.prize_pool.toLocaleString()}
            valueClass="text-amber-500"
          />
          {tournament.guaranteed_prize_pool && tournament.guaranteed_prize_pool > 0 && (
            <>
              <Separator />
              <InfoRow 
                icon={Shield} 
                label="Гарантированный приз" 
                value={tournament.guaranteed_prize_pool.toLocaleString()}
                valueClass="text-emerald-500"
              />
            </>
          )}
          <Separator />
          <InfoRow 
            icon={Zap} 
            label="Стартовые фишки" 
            value={tournament.starting_chips.toLocaleString()}
          />
        </div>
      </div>

      {/* Players */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Игроки
        </h3>
        <div className="bg-card border rounded-lg p-4 space-y-1">
          <InfoRow 
            icon={Users} 
            label="Зарегистрировано" 
            value={`${tournament.player_count} из ${tournament.max_players}`}
          />
          <Separator />
          <InfoRow 
            icon={Target} 
            label="Минимум для старта" 
            value={tournament.min_players}
          />
          <Separator />
          <InfoRow 
            icon={Users} 
            label="Осталось в игре" 
            value={tournament.players_remaining}
            valueClass="text-primary"
          />
        </div>
      </div>

      {/* Timing */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          Время
        </h3>
        <div className="bg-card border rounded-lg p-4 space-y-1">
          <InfoRow 
            icon={Timer} 
            label="Длительность уровня" 
            value={formatDuration(tournament.level_duration)}
          />
          <Separator />
          <InfoRow 
            icon={Clock} 
            label="Время на действие" 
            value={tournament.action_time_seconds ? `${tournament.action_time_seconds} сек` : '—'}
          />
          {tournament.time_bank_initial && (
            <>
              <Separator />
              <InfoRow 
                icon={Timer} 
                label="Тайм-банк" 
                value={`${tournament.time_bank_initial} сек (+${tournament.time_bank_per_level || 0}/ур)`}
              />
            </>
          )}
          {tournament.break_interval && (
            <>
              <Separator />
              <InfoRow 
                icon={Clock} 
                label="Перерывы" 
                value={`каждые ${tournament.break_interval} ур. по ${formatDuration((tournament.break_duration || 5) * 60)}`}
              />
            </>
          )}
        </div>
      </div>

      {/* Rebuy/Addon */}
      {(tournament.rebuy_enabled || tournament.addon_enabled) && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-purple-500" />
            Ребай и Аддон
          </h3>
          <div className="bg-card border rounded-lg p-4 space-y-1">
            {tournament.rebuy_enabled && (
              <>
                <InfoRow 
                  icon={RefreshCw} 
                  label="Ребай" 
                  value={
                    <span>
                      {tournament.rebuy_cost?.toLocaleString()} → {tournament.rebuy_chips?.toLocaleString()} фишек
                      <span className="text-muted-foreground ml-1">(до ур. {tournament.rebuy_end_level})</span>
                    </span>
                  }
                />
              </>
            )}
            {tournament.rebuy_enabled && tournament.addon_enabled && <Separator />}
            {tournament.addon_enabled && (
              <InfoRow 
                icon={Plus} 
                label="Аддон" 
                value={
                  <span>
                    {tournament.addon_cost?.toLocaleString()} → {tournament.addon_chips?.toLocaleString()} фишек
                    <span className="text-muted-foreground ml-1">(на ур. {tournament.addon_level})</span>
                  </span>
                }
              />
            )}
          </div>
        </div>
      )}

      {/* Late Registration */}
      {tournament.late_registration_enabled && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            Поздняя регистрация
          </h3>
          <div className="bg-card border rounded-lg p-4">
            <InfoRow 
              icon={Clock} 
              label="Доступна до уровня" 
              value={tournament.late_registration_level}
              valueClass="text-emerald-500"
            />
          </div>
        </div>
      )}

      {/* Dates */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Даты
        </h3>
        <div className="bg-card border rounded-lg p-4 space-y-1">
          {tournament.registration_start && (
            <>
              <InfoRow 
                icon={Calendar} 
                label="Начало регистрации" 
                value={formatDate(tournament.registration_start)}
              />
              <Separator />
            </>
          )}
          <InfoRow 
            icon={Calendar} 
            label="Запланированный старт" 
            value={formatDate(tournament.scheduled_start_at)}
          />
          {tournament.started_at && (
            <>
              <Separator />
              <InfoRow 
                icon={Calendar} 
                label="Фактический старт" 
                value={formatDate(tournament.started_at)}
              />
            </>
          )}
          {tournament.finished_at && (
            <>
              <Separator />
              <InfoRow 
                icon={Calendar} 
                label="Завершён" 
                value={formatDate(tournament.finished_at)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
