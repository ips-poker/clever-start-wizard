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
    <div className="group relative perspective-1000">
      {/* Основная карточка-билет */}
      <div className="relative bg-gradient-card rounded-3xl overflow-hidden border border-poker-border/50 hover:border-poker-accent/40 transition-all duration-700 hover:shadow-floating hover:shadow-poker-accent/20 hover:-translate-y-3 transform hover:rotate-y-1 preserve-3d"
           style={{
             background: 'var(--gradient-card)',
             boxShadow: 'var(--shadow-card)'
           }}>
        
        {/* Перфорация сверху - улучшенная */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-r from-transparent via-poker-border/30 to-transparent">
          <div className="flex justify-center items-center h-full space-x-2">
            {Array.from({ length: 15 }).map((_, i) => (
              <div 
                key={i} 
                className="w-1.5 h-1.5 rounded-full bg-poker-border/60 animate-pulse"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '2s'
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Голографический эффект */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
             style={{
               background: 'linear-gradient(45deg, transparent 30%, hsl(var(--poker-accent) / 0.1) 50%, transparent 70%)',
               animation: 'shimmer 3s infinite'
             }}></div>

        {/* Заголовок билета - улучшенный */}
        <div className="pt-8 px-7 pb-5 relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 pr-4">
              <h3 className="text-2xl font-black text-foreground mb-2 line-clamp-1 group-hover:text-poker-accent transition-all duration-300 transform group-hover:scale-105">
                {tournament.name}
              </h3>
              <p className="text-sm text-poker-text-secondary line-clamp-2 leading-relaxed opacity-80">
                {tournament.description || "Рейтинговый покерный турнир"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="relative">
                {getStatusBadge(tournament.status)}
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-poker-accent rounded-full animate-ping"></div>
              </div>
              <div className="text-right bg-poker-surface/50 rounded-lg px-3 py-2 backdrop-blur-sm">
                <div className="text-xs text-poker-text-muted uppercase tracking-widest">ID турнира</div>
                <div className="text-xs font-mono text-poker-accent font-bold">{tournament.id.slice(-8).toUpperCase()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Разделительная линия с перфорацией - улучшенная */}
        <div className="relative mx-7">
          <div className="border-t-2 border-dashed border-poker-border/40 relative">
            <div className="absolute inset-0 border-t border-poker-accent/20 transform translate-y-0.5"></div>
          </div>
          <div className="absolute -left-7 top-0 w-4 h-4 bg-gradient-surface rounded-full border-2 border-poker-border/50 transform -translate-y-2 shadow-inner"></div>
          <div className="absolute -right-7 top-0 w-4 h-4 bg-gradient-surface rounded-full border-2 border-poker-border/50 transform -translate-y-2 shadow-inner"></div>
        </div>

        {/* Основная информация - улучшенная */}
        <div className="p-7 space-y-5">
          {/* Дата и время */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-surface/80 border border-poker-border/30 hover:border-poker-accent/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-subtle">
            <div className="w-12 h-12 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-accent transform transition-transform group-hover:scale-110">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-poker-text-muted uppercase tracking-widest font-semibold">Дата проведения</div>
              <div className="text-base font-bold text-foreground mt-1">
                {new Date(tournament.start_time).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
              <div className="text-sm text-poker-accent font-medium">
                {new Date(tournament.start_time).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>

          {/* Игроки */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-surface/80 border border-poker-border/30 hover:border-blue-400/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-subtle">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-poker-text-muted uppercase tracking-widest font-semibold">Участники</div>
              <div className="text-base font-bold text-foreground mt-1">
                {tournament._count?.tournament_registrations || 0} из {tournament.max_players}
              </div>
              <div className="text-sm text-blue-600 font-medium">
                {tournament.max_players - (tournament._count?.tournament_registrations || 0)} свободных мест
              </div>
            </div>
          </div>

          {/* Стоимость участия */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-surface/80 border border-poker-border/30 hover:border-emerald-400/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-subtle">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-poker-text-muted uppercase tracking-widest font-semibold">Организационный взнос</div>
              <div className="text-xl font-black text-foreground mt-1">
                {tournament.participation_fee.toLocaleString()} ₽
              </div>
              <div className="text-sm text-emerald-600 font-bold">
                = {Math.round(tournament.participation_fee / 10)} RPS баллов
              </div>
            </div>
          </div>

          {/* Дополнительная информация */}
          <div className="grid grid-cols-2 gap-4 pt-3">
            <div className="text-center p-4 bg-gradient-surface rounded-2xl border border-poker-border/30 hover:border-orange-400/40 transition-all duration-300 hover:scale-[1.05] hover:shadow-subtle">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="text-xs text-poker-text-muted uppercase tracking-wide font-semibold">Стартовый стек</div>
              <div className="text-sm font-bold text-foreground mt-1">{tournament.starting_chips.toLocaleString()}</div>
            </div>
            <div className="text-center p-4 bg-gradient-surface rounded-2xl border border-poker-border/30 hover:border-purple-400/40 transition-all duration-300 hover:scale-[1.05] hover:shadow-subtle">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <PlayCircle className="w-5 h-5 text-white" />
              </div>
              <div className="text-xs text-poker-text-muted uppercase tracking-wide font-semibold">Формат</div>
              <div className="text-sm font-bold text-foreground mt-1 capitalize">{tournament.tournament_format}</div>
            </div>
          </div>
        </div>

        {/* Разделительная линия */}
        <div className="relative mx-6">
          <div className="border-t border-dashed border-border/60"></div>
          <div className="absolute -left-6 top-0 w-3 h-3 bg-background rounded-full border border-border/40 transform -translate-y-1.5"></div>
          <div className="absolute -right-6 top-0 w-3 h-3 bg-background rounded-full border border-border/40 transform -translate-y-1.5"></div>
        </div>

        {/* Кнопки действий - улучшенные */}
        <div className="p-7 space-y-4">
          <Button 
            variant="outline"
            onClick={() => onViewDetails(tournament)}
            className="w-full h-12 rounded-2xl border-2 border-poker-accent/30 text-poker-accent hover:bg-poker-accent/10 hover:border-poker-accent/60 transition-all duration-500 group-hover:scale-[1.03] font-bold tracking-wide backdrop-blur-sm bg-white/5"
          >
            <Info className="w-5 h-5 mr-3" />
            Подробная информация
            <ChevronRight className="w-5 h-5 ml-3 transform group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <Button 
            onClick={() => onRegister(tournament.id)}
            disabled={isDisabled}
            className="w-full h-14 rounded-2xl bg-gradient-accent hover:shadow-accent font-black text-lg tracking-wide transition-all duration-500 group-hover:scale-[1.03] disabled:from-muted disabled:to-muted disabled:text-muted-foreground relative overflow-hidden"
            style={{
              background: isDisabled ? 'var(--gradient-surface)' : 'var(--gradient-accent)'
            }}
          >
            <div className="relative z-10 flex items-center justify-center">
              {tournament.status === 'registration' && (
                <Trophy className="w-5 h-5 mr-3 animate-pulse" />
              )}
              {getButtonText()}
            </div>
            {!isDisabled && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            )}
          </Button>
        </div>

        {/* Декоративные элементы - улучшенные */}
        <div className="absolute top-6 right-6 opacity-5 group-hover:opacity-15 transition-all duration-700 transform group-hover:scale-110 group-hover:rotate-12">
          <Trophy className="w-20 h-20 text-poker-accent" />
        </div>
        
        {/* Угловые акценты */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-poker-accent/30 rounded-tl-3xl opacity-50"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-poker-accent/30 rounded-br-3xl opacity-50"></div>
        
        {/* Перфорация снизу - улучшенная */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-r from-transparent via-poker-border/30 to-transparent">
          <div className="flex justify-center items-center h-full space-x-2">
            {Array.from({ length: 15 }).map((_, i) => (
              <div 
                key={i} 
                className="w-1.5 h-1.5 rounded-full bg-poker-border/60 animate-pulse"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '2s'
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Многослойная тень для эффекта билета */}
      <div className="absolute inset-0 bg-gradient-to-br from-poker-accent/10 to-poker-accent/5 rounded-3xl transform translate-x-2 translate-y-2 -z-10 group-hover:translate-x-4 group-hover:translate-y-4 transition-transform duration-700 blur-sm"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-poker-accent/5 to-transparent rounded-3xl transform translate-x-1 translate-y-1 -z-20 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-500"></div>
    </div>
  );
}