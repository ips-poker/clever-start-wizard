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
    <div className="group relative w-full max-w-sm mx-auto">
      {/* Outer glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/20 to-amber-600/0 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      
      {/* Main ticket container - Telegram style */}
      <div className="relative bg-gradient-to-br from-slate-800/95 via-slate-900/98 to-black/95 border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl group-hover:shadow-amber-500/20 group-hover:border-amber-400/30 transition-all duration-500 backdrop-blur-3xl">
        
        {/* Ticket perforations - Telegram style */}
        <div className="absolute left-0 top-[45%] transform -translate-y-1/2 w-6 h-6 bg-slate-950 rounded-full -ml-3 border border-slate-700/50 shadow-inner"></div>
        <div className="absolute right-0 top-[45%] transform -translate-y-1/2 w-6 h-6 bg-slate-950 rounded-full -mr-3 border border-slate-700/50 shadow-inner"></div>
        
        {/* Dashed separation line */}
        <div className="absolute left-6 right-6 top-[45%] transform -translate-y-1/2">
          <div className="h-px border-t border-dashed border-slate-700/60"></div>
        </div>
        
        {/* Subtle decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

        {/* Top section - Tournament Info */}
        <div className="p-6 pb-8 relative">
          {/* Header with trophy icon and title */}
          <div className="flex items-start gap-4 mb-5">
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-amber-400/20 group-hover:ring-amber-400/40 group-hover:scale-110 transition-all duration-500">
                <Trophy className="h-7 w-7 text-white drop-shadow-md" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white group-hover:text-amber-50 transition-colors duration-300 leading-snug mb-2">
                {tournament.name}
              </h3>
              {getStatusBadge(tournament.status)}
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-slate-800/40 rounded-xl p-4 mb-4 border border-slate-700/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-white font-semibold text-base">
                    {new Date(tournament.start_time).toLocaleDateString('ru-RU', { 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/30 rounded-lg">
                <Clock className="h-4 w-4 text-amber-400" />
                <p className="text-white font-semibold text-sm">
                  {new Date(tournament.start_time).toLocaleTimeString('ru-RU', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Players & Stack Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-purple-500/15 to-purple-600/15 rounded-xl p-4 border border-purple-400/20">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-purple-400" />
                <p className="text-purple-300 text-xs font-medium uppercase tracking-wide">Игроки</p>
              </div>
              <p className="text-white font-bold text-xl">
                {tournament._count?.tournament_registrations || 0}<span className="text-slate-400 text-base">/{tournament.max_players}</span>
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-500/15 to-amber-600/15 rounded-xl p-4 border border-amber-400/20">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="h-4 w-4 text-amber-400" />
                <p className="text-amber-300 text-xs font-medium uppercase tracking-wide">Стартовый стек</p>
              </div>
              <p className="text-white font-bold text-xl">
                {(tournament.starting_chips / 1000).toFixed(0)}K
              </p>
            </div>
          </div>
        </div>
        
        {/* Bottom section - Pricing & Actions */}
        <div className="p-6 pt-8 bg-gradient-to-br from-slate-900/60 to-black/60 relative backdrop-blur-md">
          {/* Main Price */}
          <div className="mb-4">
            <div className="bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-500/20 rounded-2xl p-5 border border-amber-400/30 backdrop-blur-sm relative overflow-hidden group-hover:border-amber-400/50 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white/50 text-xs font-medium uppercase tracking-wide mb-1">Организационный взнос</p>
                    <span className="text-amber-400 text-3xl font-bold tracking-tight">
                      {tournament.participation_fee.toLocaleString()}
                      <span className="text-lg ml-1.5">₽</span>
                    </span>
                  </div>
                </div>
                <div className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse shadow-lg shadow-amber-400/50"></div>
              </div>
            </div>

            {/* Additional fees */}
            {(tournament.reentry_fee && tournament.reentry_fee > 0) || (tournament.additional_fee && tournament.additional_fee > 0) ? (
              <div className="grid grid-cols-2 gap-3 mt-3">
                {tournament.reentry_fee && tournament.reentry_fee > 0 && (
                  <div className="bg-gradient-to-br from-green-500/15 to-green-600/15 rounded-xl px-4 py-3 border border-green-400/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Coffee className="h-4 w-4 text-green-400" />
                      <span className="text-green-300 text-xs uppercase tracking-wide">Повторный вход</span>
                    </div>
                    <span className="text-white font-bold text-base">{tournament.reentry_fee.toLocaleString()} ₽</span>
                  </div>
                )}
                
                {tournament.additional_fee && tournament.additional_fee > 0 && (
                  <div className="bg-gradient-to-br from-blue-500/15 to-blue-600/15 rounded-xl px-4 py-3 border border-blue-400/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Gem className="h-4 w-4 text-blue-400" />
                      <span className="text-blue-300 text-xs uppercase tracking-wide">Доп. набор</span>
                    </div>
                    <span className="text-white font-bold text-base">{tournament.additional_fee.toLocaleString()} ₽</span>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold transition-all duration-300 rounded-xl shadow-xl hover:shadow-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed h-12 text-base group/btn"
              onClick={onRegister}
              disabled={tournament.status !== 'registration'}
            >
              <PlayCircle className="h-5 w-5 mr-2 group-hover/btn:scale-110 transition-transform" />
              {getButtonText(tournament.status)}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full border border-slate-600 text-slate-300 hover:bg-slate-800/50 hover:border-slate-500 hover:text-white transition-all duration-300 rounded-xl h-10 group/btn"
              onClick={onViewDetails}
            >
              Подробнее
              <ChevronRight className="h-4 w-4 ml-auto group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}