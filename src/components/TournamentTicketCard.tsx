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
      {/* Outer glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/20 to-amber-600/0 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      
      {/* Main ticket container */}
      <div className="relative bg-gradient-to-br from-slate-800/95 via-slate-900/98 to-black/95 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl group-hover:shadow-amber-500/20 group-hover:border-slate-600/60 transition-all duration-500 backdrop-blur-3xl">
        
        {/* Ticket perforations - Left side */}
        <div className="absolute left-0 top-[42%] flex flex-col gap-2 -ml-1">
          <div className="w-2 h-2 bg-slate-950 rounded-full border border-slate-700/40"></div>
          <div className="w-2 h-2 bg-slate-950 rounded-full border border-slate-700/40"></div>
          <div className="w-2 h-2 bg-slate-950 rounded-full border border-slate-700/40"></div>
        </div>
        
        {/* Ticket perforations - Right side */}
        <div className="absolute right-0 top-[42%] flex flex-col gap-2 -mr-1">
          <div className="w-2 h-2 bg-slate-950 rounded-full border border-slate-700/40"></div>
          <div className="w-2 h-2 bg-slate-950 rounded-full border border-slate-700/40"></div>
          <div className="w-2 h-2 bg-slate-950 rounded-full border border-slate-700/40"></div>
        </div>
        
        {/* Main perforations */}
        <div className="absolute left-0 top-[44%] w-7 h-7 bg-slate-950 rounded-full -ml-3.5 border border-slate-700/50 shadow-inner"></div>
        <div className="absolute right-0 top-[44%] w-7 h-7 bg-slate-950 rounded-full -mr-3.5 border border-slate-700/50 shadow-inner"></div>
        
        {/* Dashed separation line */}
        <div className="absolute left-8 right-8 top-[44%]">
          <div className="h-px border-t-2 border-dashed border-slate-700/70"></div>
        </div>

        {/* Top section - Tournament Info */}
        <div className="p-7 pb-9 relative">
          {/* Ticket number */}
          <div className="absolute top-3 right-4 text-slate-600 text-xs font-mono tracking-wider">
            #{tournament.id.slice(0, 8).toUpperCase()}
          </div>
          
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg ring-1 ring-amber-400/20 group-hover:ring-amber-400/40 group-hover:scale-105 transition-all duration-500">
                <Trophy className="h-8 w-8 text-white drop-shadow-md" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-green-500 to-green-600 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h3 className="text-xl font-bold text-white group-hover:text-amber-50 transition-colors duration-300 leading-tight mb-2.5">
                {tournament.name}
              </h3>
              {getStatusBadge(tournament.status)}
            </div>
          </div>

          {/* Info Grid */}
          <div className="space-y-3">
            {/* Date & Time */}
            <div className="flex items-center justify-between bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg flex items-center justify-center border border-blue-500/20">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-medium mb-0.5">Дата турнира</p>
                  <p className="text-white font-semibold text-sm">
                    {new Date(tournament.start_time).toLocaleDateString('ru-RU', { 
                      day: 'numeric', 
                      month: 'long'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/40 rounded-lg border border-slate-600/30">
                <Clock className="h-4 w-4 text-amber-400" />
                <p className="text-white font-bold text-sm tabular-nums">
                  {new Date(tournament.start_time).toLocaleTimeString('ru-RU', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>

            {/* Players & Stack */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-purple-500/15 to-purple-600/15 rounded-xl p-3.5 border border-purple-400/25">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-purple-400" />
                  </div>
                  <p className="text-purple-300 text-xs font-semibold uppercase tracking-wide">Участники</p>
                </div>
                <p className="text-white font-bold text-2xl ml-10">
                  {tournament._count?.tournament_registrations || 0}<span className="text-slate-500 text-lg font-normal">/{tournament.max_players}</span>
                </p>
              </div>

              <div className="bg-gradient-to-br from-amber-500/15 to-amber-600/15 rounded-xl p-3.5 border border-amber-400/25">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <Coins className="h-4 w-4 text-amber-400" />
                  </div>
                  <p className="text-amber-300 text-xs font-semibold uppercase tracking-wide">Стек</p>
                </div>
                <p className="text-white font-bold text-2xl ml-10">
                  {(tournament.starting_chips / 1000).toFixed(0)}<span className="text-slate-500 text-base font-normal">K</span>
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom section - Pricing & Actions */}
        <div className="p-7 pt-9 bg-gradient-to-br from-slate-900/70 to-black/70 relative backdrop-blur-md border-t border-slate-700/30">
          {/* Main Price */}
          <div className="mb-5">
            <div className="bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-500/20 rounded-2xl p-5 border border-amber-400/30 backdrop-blur-sm relative overflow-hidden group-hover:border-amber-400/50 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Вступительный взнос</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-amber-400 text-3xl font-bold tracking-tight tabular-nums">
                        {tournament.participation_fee.toLocaleString()}
                      </span>
                      <span className="text-amber-500 text-lg font-semibold">₽</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse shadow-lg shadow-amber-400/50"></div>
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse animation-delay-300"></div>
                </div>
              </div>
            </div>

            {/* Additional fees */}
            {(tournament.reentry_fee && tournament.reentry_fee > 0) || (tournament.additional_fee && tournament.additional_fee > 0) ? (
              <div className="grid grid-cols-2 gap-3 mt-3">
                {tournament.reentry_fee && tournament.reentry_fee > 0 && (
                  <div className="bg-gradient-to-br from-green-500/15 to-green-600/15 rounded-xl p-3 border border-green-400/25">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Coffee className="h-4 w-4 text-green-400" />
                      <span className="text-green-300 text-xs uppercase tracking-wide font-semibold">Повторный вход</span>
                    </div>
                    <span className="text-white font-bold text-lg tabular-nums">{tournament.reentry_fee.toLocaleString()}<span className="text-sm"> ₽</span></span>
                  </div>
                )}
                
                {tournament.additional_fee && tournament.additional_fee > 0 && (
                  <div className="bg-gradient-to-br from-blue-500/15 to-blue-600/15 rounded-xl p-3 border border-blue-400/25">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Gem className="h-4 w-4 text-blue-400" />
                      <span className="text-blue-300 text-xs uppercase tracking-wide font-semibold">Доп. набор</span>
                    </div>
                    <span className="text-white font-bold text-lg tabular-nums">{tournament.additional_fee.toLocaleString()}<span className="text-sm"> ₽</span></span>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Barcode style decoration */}
          <div className="flex gap-px justify-center mb-5 opacity-30">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="w-1 bg-slate-600 rounded-sm" style={{ height: `${Math.random() * 20 + 10}px` }}></div>
            ))}
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
              className="w-full border border-slate-600 text-slate-300 bg-slate-800/30 hover:bg-slate-700/50 hover:border-slate-500 hover:text-white transition-all duration-300 rounded-xl h-10 group/btn"
              onClick={onViewDetails}
            >
              Подробнее
              <ChevronRight className="h-4 w-4 ml-auto group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Custom animations */}
      <style>{`
        .animation-delay-300 {
          animation-delay: 0.3s;
        }
      `}</style>
    </div>
  );
}