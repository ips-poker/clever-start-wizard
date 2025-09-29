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
      {/* Основная карточка-билет с 3D эффектами */}
      <div className="relative bg-gradient-to-br from-poker-surface via-poker-surface-elevated to-poker-surface/80 rounded-2xl overflow-hidden border border-poker-gray/20 hover:border-poker-red/40 transition-all duration-700 hover:shadow-poker-elevated hover:-translate-y-3 hover:scale-[1.02] transform-gpu preserve-3d">
        
        {/* Голографическая подложка */}
        <div className="absolute inset-0 bg-gradient-to-br from-poker-red/5 via-transparent to-poker-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        
        {/* Анимированная перфорация сверху */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-r from-transparent via-poker-gray/30 to-transparent overflow-hidden">
          <div className="flex justify-center items-center h-full space-x-3">
            {Array.from({ length: 15 }).map((_, i) => (
              <div 
                key={i} 
                className="w-1.5 h-1.5 rounded-full bg-poker-gray/60 group-hover:bg-poker-red/60 transition-all duration-700"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
          {/* Блестящий эффект */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-poker-gold/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
        </div>

        {/* Заголовок билета с премиальным дизайном */}
        <div className="pt-8 px-8 pb-6 relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 pr-4">
              <h3 className="text-2xl font-black text-foreground mb-2 line-clamp-1 group-hover:text-poker-red transition-all duration-500 tracking-tight">
                {tournament.name}
              </h3>
              <p className="text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed font-medium">
                {tournament.description || "Рейтинговый покерный турнир"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              {getStatusBadge(tournament.status)}
              <div className="text-right bg-poker-surface/50 rounded-lg p-2 border border-poker-gray/20">
                <div className="text-xs text-muted-foreground/70 uppercase tracking-widest font-semibold">Турнир</div>
                <div className="text-xs font-mono text-poker-red font-bold">{tournament.id.slice(-8).toUpperCase()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Разделительная линия с премиальной перфорацией */}
        <div className="relative mx-8">
          <div className="border-t border-dashed border-poker-gray/40 group-hover:border-poker-red/40 transition-colors duration-500"></div>
          <div className="absolute -left-8 top-0 w-4 h-4 bg-poker-surface rounded-full border-2 border-poker-gray/30 group-hover:border-poker-red/50 transform -translate-y-2 transition-all duration-500 group-hover:scale-110"></div>
          <div className="absolute -right-8 top-0 w-4 h-4 bg-poker-surface rounded-full border-2 border-poker-gray/30 group-hover:border-poker-red/50 transform -translate-y-2 transition-all duration-500 group-hover:scale-110"></div>
        </div>

        {/* Основная информация с премиальным стилем */}
        <div className="p-8 space-y-6">
          {/* Дата и время */}
          <div className="flex items-center gap-4 group/item">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-poker-red/10 to-poker-red/5 flex items-center justify-center group-hover/item:scale-110 transition-transform duration-300 border border-poker-red/20">
              <Calendar className="w-6 h-6 text-poker-red" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground/70 uppercase tracking-[0.1em] font-bold mb-1">Дата проведения</div>
              <div className="text-base font-bold text-foreground group-hover/item:text-poker-red transition-colors duration-300">
                {new Date(tournament.start_time).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
              <div className="text-sm text-muted-foreground/80 font-medium">
                {new Date(tournament.start_time).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>

          {/* Игроки */}
          <div className="flex items-center gap-4 group/item">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 flex items-center justify-center group-hover/item:scale-110 transition-transform duration-300 border border-blue-500/20">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground/70 uppercase tracking-[0.1em] font-bold mb-1">Участники</div>
              <div className="text-base font-bold text-foreground group-hover/item:text-blue-500 transition-colors duration-300">
                {tournament._count?.tournament_registrations || 0} из {tournament.max_players}
              </div>
              <div className="text-sm text-muted-foreground/80 font-medium">
                {tournament.max_players - (tournament._count?.tournament_registrations || 0)} свободных мест
              </div>
            </div>
          </div>

          {/* Стоимость участия */}
          <div className="flex items-center gap-4 group/item">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 flex items-center justify-center group-hover/item:scale-110 transition-transform duration-300 border border-emerald-500/20">
              <DollarSign className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground/70 uppercase tracking-[0.1em] font-bold mb-1">Организационный взнос</div>
              <div className="text-xl font-black text-foreground group-hover/item:text-emerald-500 transition-colors duration-300">
                {tournament.participation_fee.toLocaleString()} ₽
              </div>
              <div className="text-sm text-emerald-600 font-semibold">
                = {Math.round(tournament.participation_fee / 10)} RPS баллов
              </div>
            </div>
          </div>

          {/* Дополнительная информация */}
          <div className="grid grid-cols-2 gap-6 pt-4">
            <div className="text-center p-4 bg-gradient-to-br from-poker-surface-elevated/50 to-poker-surface/30 rounded-2xl border border-poker-gray/20 group-hover:border-orange-500/30 transition-all duration-300 hover:scale-105">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 flex items-center justify-center mx-auto mb-2 border border-orange-500/20">
                <Target className="w-5 h-5 text-orange-500" />
              </div>
              <div className="text-xs text-muted-foreground/70 uppercase tracking-[0.1em] font-bold mb-1">Стартовый стек</div>
              <div className="text-sm font-bold text-foreground">{tournament.starting_chips.toLocaleString()}</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-poker-surface-elevated/50 to-poker-surface/30 rounded-2xl border border-poker-gray/20 group-hover:border-purple-500/30 transition-all duration-300 hover:scale-105">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 flex items-center justify-center mx-auto mb-2 border border-purple-500/20">
                <PlayCircle className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-xs text-muted-foreground/70 uppercase tracking-[0.1em] font-bold mb-1">Формат</div>
              <div className="text-sm font-bold text-foreground capitalize">{tournament.tournament_format}</div>
            </div>
          </div>
        </div>

        {/* Нижняя разделительная линия */}
        <div className="relative mx-8">
          <div className="border-t border-dashed border-poker-gray/40 group-hover:border-poker-red/40 transition-colors duration-500"></div>
          <div className="absolute -left-8 top-0 w-4 h-4 bg-poker-surface rounded-full border-2 border-poker-gray/30 group-hover:border-poker-red/50 transform -translate-y-2 transition-all duration-500 group-hover:scale-110"></div>
          <div className="absolute -right-8 top-0 w-4 h-4 bg-poker-surface rounded-full border-2 border-poker-gray/30 group-hover:border-poker-red/50 transform -translate-y-2 transition-all duration-500 group-hover:scale-110"></div>
        </div>

        {/* Премиальные кнопки действий */}
        <div className="p-8 space-y-4">
          <Button 
            variant="outline"
            onClick={() => onViewDetails(tournament)}
            className="w-full h-14 rounded-2xl border-2 border-poker-gray/30 text-foreground hover:bg-poker-surface-elevated hover:border-poker-red/50 transition-all duration-500 group-hover:scale-[1.03] font-semibold text-base backdrop-blur-sm"
          >
            <Info className="w-5 h-5 mr-3" />
            Подробная информация
            <ChevronRight className="w-5 h-5 ml-3" />
          </Button>
          
          <Button 
            onClick={() => onRegister(tournament.id)}
            disabled={isDisabled}
            className="w-full h-16 rounded-2xl bg-gradient-to-r from-poker-red via-poker-red-light to-poker-red hover:from-poker-red-light hover:via-poker-red hover:to-poker-red-dark text-white font-black text-lg shadow-poker-red hover:shadow-poker-elevated disabled:from-poker-gray disabled:to-poker-gray-dark disabled:text-muted-foreground transition-all duration-500 group-hover:scale-[1.03] relative overflow-hidden"
          >
            {/* Блестящий эффект */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            {tournament.status === 'registration' && (
              <Trophy className="w-5 h-5 mr-3 z-10 relative" />
            )}
            <span className="z-10 relative">{getButtonText()}</span>
          </Button>
        </div>

        {/* Декоративные элементы с анимацией */}
        <div className="absolute top-6 right-6 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700 group-hover:scale-110 group-hover:rotate-12">
          <Trophy className="w-20 h-20 text-poker-red" />
        </div>
        
        {/* Световой эффект */}
        <div className="absolute inset-0 bg-gradient-to-br from-poker-gold/5 via-transparent to-poker-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"></div>
        
        {/* Анимированная перфорация снизу */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-r from-transparent via-poker-gray/30 to-transparent overflow-hidden">
          <div className="flex justify-center items-center h-full space-x-3">
            {Array.from({ length: 15 }).map((_, i) => (
              <div 
                key={i} 
                className="w-1.5 h-1.5 rounded-full bg-poker-gray/60 group-hover:bg-poker-red/60 transition-all duration-700"
                style={{ animationDelay: `${(15-i) * 50}ms` }}
              />
            ))}
          </div>
          {/* Обратный блестящий эффект */}
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-poker-gold/20 to-transparent translate-x-[100%] group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
        </div>
      </div>

      {/* Многослойная тень для объемного эффекта */}
      <div className="absolute inset-0 bg-gradient-to-br from-poker-red/10 to-poker-gold/5 rounded-2xl transform translate-x-2 translate-y-2 -z-20 group-hover:translate-x-4 group-hover:translate-y-4 transition-transform duration-700 blur-sm"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-poker-red/5 to-transparent rounded-2xl transform translate-x-1 translate-y-1 -z-10 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform duration-500"></div>
    </div>
  );
}