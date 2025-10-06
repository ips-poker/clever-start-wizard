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
      {/* Outer glow */}
      <div className="absolute inset-0 bg-amber-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Ticket container - Compact */}
      <div className="relative bg-white rounded-2xl overflow-hidden shadow-xl group-hover:shadow-amber-500/20 transition-all duration-300">
        
        {/* Perforations top */}
        <div className="absolute top-0 left-0 right-0 flex justify-between px-3 -mt-0.5">
          {[...Array(10)].map((_, i) => (
            <div key={`top-${i}`} className="w-1.5 h-1.5 bg-slate-100 rounded-full"></div>
          ))}
        </div>
        
        {/* Perforations bottom */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-3 -mb-0.5">
          {[...Array(10)].map((_, i) => (
            <div key={`bottom-${i}`} className="w-1.5 h-1.5 bg-slate-100 rounded-full"></div>
          ))}
        </div>
        
        {/* Tear line perforations */}
        <div className="absolute left-0 top-[58%] w-5 h-5 bg-slate-100 rounded-full -ml-2.5"></div>
        <div className="absolute right-0 top-[58%] w-5 h-5 bg-slate-100 rounded-full -mr-2.5"></div>
        
        {/* Perforation dots */}
        <div className="absolute left-0 right-0 top-[58%] flex justify-around px-5">
          {[...Array(12)].map((_, i) => (
            <div key={`mid-${i}`} className="w-1 h-1 bg-slate-300 rounded-full"></div>
          ))}
        </div>

        {/* Top - Main Info */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 pt-6">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 rounded-full border border-amber-400/30 mb-2">
              <Trophy className="h-3 w-3 text-amber-400" />
              <span className="text-amber-400 text-[10px] font-bold uppercase tracking-wider">Tournament</span>
            </div>
            <h3 className="text-white text-base font-bold leading-tight px-2">
              {tournament.name}
            </h3>
          </div>

          {/* Date & Time */}
          <div className="bg-slate-800/50 rounded-xl p-3 mb-3 border border-slate-700/50">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-9 h-9 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                  <Calendar className="h-4 w-4 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-slate-400 text-[10px] uppercase tracking-wide">Дата</p>
                  <p className="text-white font-semibold text-xs truncate">
                    {new Date(tournament.start_time).toLocaleDateString('ru-RU', { 
                      day: 'numeric', 
                      month: 'short'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700/40 rounded-lg">
                <Clock className="h-3 w-3 text-amber-400" />
                <p className="text-white font-bold text-xs tabular-nums">
                  {new Date(tournament.start_time).toLocaleTimeString('ru-RU', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div className="bg-purple-500/15 rounded-lg p-2.5 border border-purple-400/25 text-center">
              <Users className="h-4 w-4 text-purple-400 mx-auto mb-1" />
              <p className="text-purple-300 text-[9px] uppercase tracking-wide mb-0.5">Игроки</p>
              <p className="text-white font-bold text-lg leading-none">
                {tournament._count?.tournament_registrations || 0}<span className="text-slate-400 text-sm">/{tournament.max_players}</span>
              </p>
            </div>

            <div className="bg-amber-500/15 rounded-lg p-2.5 border border-amber-400/25 text-center">
              <Coins className="h-4 w-4 text-amber-400 mx-auto mb-1" />
              <p className="text-amber-300 text-[9px] uppercase tracking-wide mb-0.5">Стек</p>
              <p className="text-white font-bold text-lg leading-none">
                {(tournament.starting_chips / 1000).toFixed(0)}<span className="text-slate-400 text-sm">K</span>
              </p>
            </div>
          </div>

          {/* Status & Ticket ID */}
          <div className="flex items-center justify-between">
            {getStatusBadge(tournament.status)}
            <p className="text-slate-500 text-[9px] font-mono tracking-wider">
              #{tournament.id.slice(0, 6).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Tear line */}
        <div className="h-6 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 flex items-center justify-center">
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
          </svg>
        </div>
        
        {/* Bottom - Pricing */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5">
          {/* Main Price */}
          <div className="bg-gradient-to-r from-amber-400/15 via-amber-300/20 to-amber-400/15 rounded-xl p-4 border-2 border-amber-400/30 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center shadow-md">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-slate-600 text-[9px] uppercase tracking-wide mb-0.5">Взнос</p>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-slate-900 text-2xl font-bold tabular-nums">
                      {tournament.participation_fee.toLocaleString()}
                    </span>
                    <span className="text-slate-600 text-base font-semibold">₽</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional fees - Compact */}
          {(tournament.reentry_fee && tournament.reentry_fee > 0) || (tournament.additional_fee && tournament.additional_fee > 0) ? (
            <div className="flex gap-2 mb-3">
              {tournament.reentry_fee && tournament.reentry_fee > 0 && (
                <div className="flex-1 bg-white rounded-lg p-2.5 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Coffee className="h-3 w-3 text-green-600" />
                    <span className="text-slate-700 text-[9px] font-semibold uppercase">Ребай</span>
                  </div>
                  <span className="text-slate-900 font-bold text-sm tabular-nums">{tournament.reentry_fee.toLocaleString()} ₽</span>
                </div>
              )}
              
              {tournament.additional_fee && tournament.additional_fee > 0 && (
                <div className="flex-1 bg-white rounded-lg p-2.5 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Gem className="h-3 w-3 text-blue-600" />
                    <span className="text-slate-700 text-[9px] font-semibold uppercase">Аддон</span>
                  </div>
                  <span className="text-slate-900 font-bold text-sm tabular-nums">{tournament.additional_fee.toLocaleString()} ₽</span>
                </div>
              )}
            </div>
          ) : null}

          {/* Barcode - Compact */}
          <div className="bg-white rounded-lg p-2 border border-slate-200 mb-3">
            <div className="flex gap-px justify-center h-8">
              {[...Array(25)].map((_, i) => (
                <div key={i} className="bg-slate-900 rounded-sm" style={{ width: '2px', height: `${Math.random() * 100}%` }}></div>
              ))}
            </div>
          </div>

          {/* Buttons - Compact */}
          <div className="space-y-2">
            <Button 
              size="sm" 
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-lg shadow-md hover:shadow-amber-500/40 h-10 text-sm group/btn"
              onClick={onRegister}
              disabled={tournament.status !== 'registration'}
            >
              <PlayCircle className="h-4 w-4 mr-1.5 group-hover/btn:scale-110 transition-transform" />
              {getButtonText(tournament.status)}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-lg h-9 text-xs font-semibold group/btn"
              onClick={onViewDetails}
            >
              Подробнее
              <ChevronRight className="h-3 w-3 ml-auto group-hover/btn:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}