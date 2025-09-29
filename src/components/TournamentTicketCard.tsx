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
  Coffee,
  Coins,
  Crown,
  Gem
} from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  description?: string;
  participation_fee: number;
  reentry_fee?: number;
  additional_fee?: number;
  reentry_chips?: number;
  additional_chips?: number;
  starting_chips: number;
  max_players: number;
  start_time: string;
  status: string;
  tournament_format?: string;
  reentry_end_level?: number;
  additional_level?: number;
  break_start_level?: number;
  _count?: {
    tournament_registrations: number;
  };
}

interface TournamentTicketCardProps {
  tournament: Tournament;
  onViewDetails: () => void;
  onRegister: () => void;
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
      <Badge variant={variants[status as keyof typeof variants] || "default"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getButtonText = (status: string) => {
    switch (status) {
      case 'registration':
        return 'Зарегистрироваться';
      case 'running':
        return 'Турнир идет';
      case 'completed':
        return 'Завершен';
      default:
        return 'Недоступно';
    }
  };

  return (
    <div className="group relative w-full max-w-md mx-auto">
      {/* Main ticket container */}
      <div className="bg-gradient-to-br from-slate-800/95 via-slate-900/98 to-black/95 border border-white/20 rounded-3xl overflow-hidden shadow-2xl group-hover:scale-[1.02] transition-all duration-700 hover:shadow-amber-500/30 backdrop-blur-2xl relative">
        
        {/* Ticket perforations */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-gradient-to-br from-slate-900 to-black rounded-full -ml-3 border border-white/10 shadow-lg"></div>
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-gradient-to-br from-slate-900 to-black rounded-full -mr-3 border border-white/10 shadow-lg"></div>
        
        {/* Dashed separation line */}
        <div className="absolute left-6 right-6 top-1/2 h-px border-t-2 border-dashed border-white/20 transform -translate-y-1/2"></div>
        
        {/* Decorative poker symbols */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-8 group-hover:opacity-20 transition-opacity duration-500">
          <div className="absolute top-4 right-4 text-amber-400/30 text-3xl animate-pulse">♠</div>
          <div className="absolute top-8 left-4 text-amber-400/20 text-2xl animate-bounce-subtle">♣</div>
          <div className="absolute bottom-8 right-6 text-amber-400/25 text-2xl animate-pulse">♥</div>
          <div className="absolute bottom-4 left-6 text-amber-400/15 text-xl animate-bounce-subtle">♦</div>
        </div>

        {/* Top section - Tournament Info */}
        <div className="p-6 pb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 via-transparent to-amber-600/8 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg ring-2 ring-amber-400/20">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white group-hover:text-amber-100 transition-colors duration-300 leading-tight mb-1">
                    {tournament.name}
                  </h3>
                  <p className="text-white/60 text-sm">ID: {tournament.id.slice(0, 8)}...</p>
                </div>
              </div>
              {getStatusBadge(tournament.status)}
            </div>

            {/* Tournament details */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-amber-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-white/80 text-sm font-medium">
                    {new Date(tournament.start_time).toLocaleDateString('ru-RU', { 
                      day: 'numeric', 
                      month: 'long'
                    })}
                  </p>
                  <p className="text-white/60 text-xs">
                    {new Date(tournament.start_time).toLocaleTimeString('ru-RU', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-amber-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-white/80 text-sm font-medium">
                    {tournament._count?.tournament_registrations || 0} / {tournament.max_players} игроков
                  </p>
                  <p className="text-white/60 text-xs">
                    {tournament.tournament_format === 'freezeout' ? 'Фриз-аут' : 
                     tournament.tournament_format === 'rebuy' ? 'Ребай' : 
                     tournament.tournament_format || 'Стандартный'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Coins className="h-4 w-4 text-amber-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-white/80 text-sm font-medium">
                    Стартовый стек: {tournament.starting_chips.toLocaleString()}
                  </p>
                  {tournament.description && (
                    <p className="text-white/60 text-xs mt-1 line-clamp-2">
                      {tournament.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom section - Pricing & Actions */}
        <div className="p-6 pt-4 bg-gradient-to-br from-slate-900/70 to-black/70 relative backdrop-blur-sm">
          <div className="relative z-10">
            {/* Pricing info */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                  <span className="text-amber-400 text-xl font-bold">
                    {tournament.participation_fee.toLocaleString()} ₽
                  </span>
                </div>
                <span className="text-white/60 text-sm">Орг. взнос</span>
              </div>

              {/* Additional fees */}
              {(tournament.reentry_fee && tournament.reentry_fee > 0) || (tournament.additional_fee && tournament.additional_fee > 0) ? (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {tournament.reentry_fee && tournament.reentry_fee > 0 && (
                    <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                      <span className="text-white/70">Повторный вход</span>
                      <span className="text-green-400 font-medium">{tournament.reentry_fee.toLocaleString()} ₽</span>
                    </div>
                  )}
                  
                  {tournament.additional_fee && tournament.additional_fee > 0 && (
                    <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                      <span className="text-white/70">Доп. набор</span>
                      <span className="text-blue-400 font-medium">{tournament.additional_fee.toLocaleString()} ₽</span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-amber-400/40 text-amber-400 hover:bg-amber-400/15 transition-all duration-300 rounded-xl backdrop-blur-sm font-medium"
                onClick={onViewDetails}
              >
                <Info className="h-4 w-4 mr-2" />
                Подробная информация
              </Button>
              
              <Button 
                size="sm" 
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold transition-all duration-300 rounded-xl shadow-lg hover:shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onRegister}
                disabled={tournament.status !== 'registration'}
              >
                {getButtonText(tournament.status)}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom animations */}
      <style>{`
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0px) rotate(var(--tw-rotate)); }
          50% { transform: translateY(-8px) rotate(var(--tw-rotate)); }
        }
      `}</style>
    </div>
  );
}