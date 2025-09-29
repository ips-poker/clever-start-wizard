import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  Users, 
  Trophy, 
  DollarSign, 
  PlayCircle,
  Info,
  ChevronRight,
  Target,
  Coffee
} from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  description: string;
  participation_fee: number;
  reentry_fee: number;
  additional_fee: number;
  reentry_chips: number;
  additional_chips: number;
  starting_chips: number;
  max_players: number;
  start_time: string;
  status: string;
  tournament_format: string;
  reentry_end_level: number;
  additional_level: number;
  break_start_level: number;
  _count?: {
    tournament_registrations: number;
  };
}

interface TournamentTicketCardProps {
  tournament: Tournament;
  onViewDetails: (tournament: Tournament) => void;
  onRegister: (tournamentId: string) => void;
}

export function TournamentTicketCard({ tournament, onViewDetails, onRegister }: TournamentTicketCardProps) {
  const getStatusBadge = (status: string) => {
    const variants = {
      scheduled: "secondary",
      registration: "default", 
      running: "destructive",
      completed: "outline",
      paused: "outline"
    } as const;

    const labels = {
      scheduled: "Запланирован",
      registration: "Регистрация",
      running: "Идет турнир",
      completed: "Завершен",
      paused: "Приостановлен"
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"} className="text-xs">
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getButtonText = () => {
    switch (tournament.status) {
      case 'scheduled': return 'Скоро откроется регистрация';
      case 'registration': return 'Зарегистрироваться';
      case 'running': return 'Турнир идет';
      case 'paused': return 'Турнир приостановлен';
      default: return 'Турнир завершен';
    }
  };

  const isDisabled = ['running', 'finished', 'paused', 'completed'].includes(tournament.status);

  return (
    <div className="group relative">
      {/* Основная карточка-билет */}
      <div className="relative bg-gradient-to-br from-background via-background to-muted/20 rounded-2xl overflow-hidden border border-border/40 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 transform">
        
        {/* Перфорация сверху */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-r from-transparent via-border/20 to-transparent">
          <div className="flex justify-center items-center h-full space-x-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-border/40" />
            ))}
          </div>
        </div>

        {/* Заголовок билета */}
        <div className="pt-6 px-6 pb-4 relative">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 pr-4">
              <h3 className="text-xl font-bold text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                {tournament.name}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {tournament.description || "Рейтинговый покерный турнир"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {getStatusBadge(tournament.status)}
              <div className="text-right">
                <div className="text-xs text-muted-foreground">№ турнира</div>
                <div className="text-xs font-mono text-primary">{tournament.id.slice(-8).toUpperCase()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Разделительная линия с перфорацией по бокам */}
        <div className="relative mx-6">
          <div className="border-t border-dashed border-border/60"></div>
          <div className="absolute -left-6 top-0 w-3 h-3 bg-background rounded-full border border-border/40 transform -translate-y-1.5"></div>
          <div className="absolute -right-6 top-0 w-3 h-3 bg-background rounded-full border border-border/40 transform -translate-y-1.5"></div>
        </div>

        {/* Основная информация */}
        <div className="p-6 space-y-4">
          {/* Дата и время */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Дата проведения</div>
              <div className="text-sm font-medium text-foreground">
                {new Date(tournament.start_time).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(tournament.start_time).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>

          {/* Игроки */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Участники</div>
              <div className="text-sm font-medium text-foreground">
                {tournament._count?.tournament_registrations || 0} из {tournament.max_players}
              </div>
              <div className="text-xs text-muted-foreground">
                {tournament.max_players - (tournament._count?.tournament_registrations || 0)} свободных мест
              </div>
            </div>
          </div>

          {/* Стоимость участия */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Организационный взнос</div>
              <div className="text-lg font-bold text-foreground">
                {tournament.participation_fee.toLocaleString()} ₽
              </div>
              <div className="text-xs text-emerald-600">
                = {Math.round(tournament.participation_fee / 10)} RPS баллов
              </div>
            </div>
          </div>

          {/* Дополнительная информация */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="text-center p-3 bg-muted/30 rounded-xl">
              <Target className="w-4 h-4 text-orange-500 mx-auto mb-1" />
              <div className="text-xs text-muted-foreground">Стартовый стек</div>
              <div className="text-sm font-medium">{tournament.starting_chips.toLocaleString()}</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-xl">
              <PlayCircle className="w-4 h-4 text-purple-500 mx-auto mb-1" />
              <div className="text-xs text-muted-foreground">Формат</div>
              <div className="text-sm font-medium capitalize">{tournament.tournament_format}</div>
            </div>
          </div>
        </div>

        {/* Разделительная линия */}
        <div className="relative mx-6">
          <div className="border-t border-dashed border-border/60"></div>
          <div className="absolute -left-6 top-0 w-3 h-3 bg-background rounded-full border border-border/40 transform -translate-y-1.5"></div>
          <div className="absolute -right-6 top-0 w-3 h-3 bg-background rounded-full border border-border/40 transform -translate-y-1.5"></div>
        </div>

        {/* Кнопки действий */}
        <div className="p-6 space-y-3">
          <Button 
            variant="outline"
            onClick={() => onViewDetails(tournament)}
            className="w-full h-11 rounded-xl border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 transition-all duration-300 group-hover:scale-[1.02]"
          >
            <Info className="w-4 h-4 mr-2" />
            Подробная информация
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
          
          <Button 
            onClick={() => onRegister(tournament.id)}
            disabled={isDisabled}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold shadow-lg hover:shadow-xl disabled:from-muted disabled:to-muted disabled:text-muted-foreground transition-all duration-300 group-hover:scale-[1.02]"
          >
            {tournament.status === 'registration' && (
              <Trophy className="w-4 h-4 mr-2" />
            )}
            {getButtonText()}
          </Button>
        </div>

        {/* Декоративные элементы */}
        <div className="absolute top-4 right-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Trophy className="w-16 h-16 text-primary" />
        </div>
        
        {/* Перфорация снизу */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-r from-transparent via-border/20 to-transparent">
          <div className="flex justify-center items-center h-full space-x-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-border/40" />
            ))}
          </div>
        </div>
      </div>

      {/* Тень карточки для эффекта билета */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl transform translate-x-1 translate-y-1 -z-10 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-500"></div>
    </div>
  );
}