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

  const registeredCount = tournament._count?.tournament_registrations || 0;
  const spotsLeft = tournament.max_players - registeredCount;
  const isFilling = spotsLeft <= 3 && spotsLeft > 0;
  const ticketNumber = tournament.id.split('-')[0].toUpperCase();

  return (
    <div className="group relative w-full max-w-sm mx-auto perspective-1000">
      {/* Animated outer glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-purple-500 to-amber-500 rounded-[28px] opacity-0 group-hover:opacity-20 blur-xl transition-all duration-700 animate-pulse"></div>
      
      {/* Main ticket container */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl group-hover:shadow-amber-500/30 group-hover:border-amber-400/50 group-hover:-translate-y-2 transition-all duration-500 backdrop-blur-xl">
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        
        {/* Ticket perforations with glow */}
        <div className="absolute left-0 top-[47%] transform -translate-y-1/2 w-7 h-7 bg-slate-950 rounded-full -ml-3.5 border-2 border-slate-700/50 shadow-inner group-hover:border-amber-400/30 transition-colors duration-500"></div>
        <div className="absolute right-0 top-[47%] transform -translate-y-1/2 w-7 h-7 bg-slate-950 rounded-full -mr-3.5 border-2 border-slate-700/50 shadow-inner group-hover:border-amber-400/30 transition-colors duration-500"></div>
        
        {/* Dashed separation line with gradient */}
        <div className="absolute left-8 right-8 top-[47%] transform -translate-y-1/2 overflow-hidden">
          <div className="h-[2px] border-t-2 border-dashed border-slate-700/80 group-hover:border-amber-400/40 transition-colors duration-500"></div>
        </div>
        
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

        {/* Ticket number badge */}
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-lg px-3 py-1.5 group-hover:border-amber-400/30 transition-colors duration-300">
            <p className="text-slate-400 text-xs font-mono">#{ticketNumber}</p>
          </div>
        </div>

        {/* Top section - Tournament Info */}
        <div className="p-5 pb-7 relative">
          {/* Header with trophy icon and title */}
          <div className="flex items-start gap-3 mb-4">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl blur-md opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
              <div className="relative w-12 h-12 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-amber-400/30 group-hover:ring-4 group-hover:ring-amber-400/50 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                <Trophy className="h-6 w-6 text-white drop-shadow-lg" />
              </div>
            </div>
            <div className="flex-1 min-w-0 pr-20">
              <h3 className="text-base font-bold text-white group-hover:text-amber-50 transition-colors duration-300 leading-tight mb-2 line-clamp-2">
                {tournament.name}
              </h3>
              <div className="flex items-center gap-2">
                {getStatusBadge(tournament.status)}
                {isFilling && (
                  <Badge variant="destructive" className="animate-pulse">
                    Осталось {spotsLeft}!
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Date & Time - compact */}
          <div className="bg-gradient-to-r from-slate-800/60 to-slate-800/40 rounded-xl p-3 mb-3 border border-slate-700/40 group-hover:border-slate-600/60 group-hover:bg-slate-800/80 transition-all duration-300">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Calendar className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <p className="text-white font-semibold text-sm truncate">
                  {new Date(tournament.start_time).toLocaleDateString('ru-RU', { 
                    day: 'numeric', 
                    month: 'short'
                  })}
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/40 rounded-lg flex-shrink-0">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <p className="text-white font-semibold text-xs">
                  {new Date(tournament.start_time).toLocaleTimeString('ru-RU', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Players & Stack Grid - compact */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-3 border border-purple-400/30 group-hover:border-purple-400/50 group-hover:shadow-lg group-hover:shadow-purple-500/20 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-t from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center gap-2 mb-1.5">
                <Users className="h-3.5 w-3.5 text-purple-400" />
                <p className="text-purple-300 text-[10px] font-semibold uppercase tracking-wider">Игроки</p>
              </div>
              <p className="relative text-white font-bold text-lg leading-none">
                {registeredCount}<span className="text-slate-400 text-sm">/{tournament.max_players}</span>
              </p>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-xl p-3 border border-amber-400/30 group-hover:border-amber-400/50 group-hover:shadow-lg group-hover:shadow-amber-500/20 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-t from-amber-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center gap-2 mb-1.5">
                <Coins className="h-3.5 w-3.5 text-amber-400" />
                <p className="text-amber-300 text-[10px] font-semibold uppercase tracking-wider">Стек</p>
              </div>
              <p className="relative text-white font-bold text-lg leading-none">
                {(tournament.starting_chips / 1000).toFixed(0)}K
              </p>
            </div>
          </div>
        </div>
        
        {/* Bottom section - Pricing & Actions */}
        <div className="p-5 pt-7 bg-gradient-to-br from-slate-900/80 via-black/60 to-slate-900/80 relative backdrop-blur-md">
          {/* Main Price - more prominent */}
          <div className="mb-3">
            <div className="relative group/price bg-gradient-to-r from-amber-500/25 via-amber-400/30 to-amber-500/25 rounded-2xl p-4 border-2 border-amber-400/40 backdrop-blur-sm overflow-hidden group-hover:border-amber-400/60 group-hover:shadow-xl group-hover:shadow-amber-500/30 transition-all duration-300">
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-400/20 to-amber-500/0 translate-x-[-100%] group-hover/price:translate-x-[100%] transition-transform duration-1000"></div>
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl blur-md opacity-50"></div>
                    <div className="relative w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-amber-200/60 text-[10px] font-bold uppercase tracking-wider mb-0.5">Вступительный взнос</p>
                    <span className="text-amber-300 text-2xl font-black tracking-tight drop-shadow-lg">
                      {tournament.participation_fee.toLocaleString()}
                      <span className="text-base ml-1">₽</span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse shadow-lg shadow-amber-400/60"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/60" style={{ animationDelay: '0.3s' }}></div>
                </div>
              </div>
            </div>

            {/* Additional fees - compact */}
            {(tournament.reentry_fee && tournament.reentry_fee > 0) || (tournament.additional_fee && tournament.additional_fee > 0) ? (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {tournament.reentry_fee && tournament.reentry_fee > 0 && (
                  <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg px-3 py-2 border border-green-400/30 group-hover:border-green-400/50 transition-all duration-300">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Coffee className="h-3 w-3 text-green-400" />
                      <span className="text-green-300 text-[9px] font-semibold uppercase tracking-wide">Ре-энтри</span>
                    </div>
                    <span className="text-white font-bold text-sm">{tournament.reentry_fee.toLocaleString()} ₽</span>
                  </div>
                )}
                
                {tournament.additional_fee && tournament.additional_fee > 0 && (
                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg px-3 py-2 border border-blue-400/30 group-hover:border-blue-400/50 transition-all duration-300">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Gem className="h-3 w-3 text-blue-400" />
                      <span className="text-blue-300 text-[9px] font-semibold uppercase tracking-wide">Аддон</span>
                    </div>
                    <span className="text-white font-bold text-sm">{tournament.additional_fee.toLocaleString()} ₽</span>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Action buttons - more dynamic */}
          <div className="space-y-2">
            <Button 
              size="lg" 
              className="relative w-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:via-amber-500 hover:to-amber-600 text-white font-bold transition-all duration-500 rounded-xl shadow-xl hover:shadow-2xl hover:shadow-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed h-11 text-sm group/btn overflow-hidden"
              onClick={onRegister}
              disabled={tournament.status !== 'registration'}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
              <PlayCircle className="relative h-5 w-5 mr-2 group-hover/btn:scale-125 group-hover/btn:rotate-90 transition-all duration-500" />
              <span className="relative">{getButtonText(tournament.status)}</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full border-2 border-slate-600/60 bg-slate-800/30 text-slate-300 hover:bg-slate-800/60 hover:border-amber-400/40 hover:text-amber-100 transition-all duration-300 rounded-xl h-9 text-xs group/btn backdrop-blur-sm"
              onClick={onViewDetails}
            >
              <span>Подробная информация</span>
              <ChevronRight className="h-4 w-4 ml-auto group-hover/btn:translate-x-1 transition-transform duration-300" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}