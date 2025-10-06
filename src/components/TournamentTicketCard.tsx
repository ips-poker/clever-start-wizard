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
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/15 to-amber-600/0 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      
      {/* Main ticket container - Classic ticket style */}
      <div className="relative bg-white rounded-3xl overflow-hidden shadow-2xl group-hover:shadow-amber-500/30 transition-all duration-500">
        
        {/* Ticket perforations - Top */}
        <div className="absolute top-0 left-0 right-0 flex justify-between px-4 -mt-1">
          {[...Array(12)].map((_, i) => (
            <div key={`top-${i}`} className="w-2 h-2 bg-slate-100 rounded-full"></div>
          ))}
        </div>
        
        {/* Ticket perforations - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 -mb-1">
          {[...Array(12)].map((_, i) => (
            <div key={`bottom-${i}`} className="w-2 h-2 bg-slate-100 rounded-full"></div>
          ))}
        </div>
        
        {/* Main perforations for tear line */}
        <div className="absolute left-0 top-[52%] w-6 h-6 bg-slate-100 rounded-full -ml-3 shadow-inner"></div>
        <div className="absolute right-0 top-[52%] w-6 h-6 bg-slate-100 rounded-full -mr-3 shadow-inner"></div>
        
        {/* Perforation dots along tear line */}
        <div className="absolute left-0 right-0 top-[52%] flex justify-around px-6">
          {[...Array(15)].map((_, i) => (
            <div key={`perf-${i}`} className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
          ))}
        </div>

        {/* Top section - Main ticket info */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 pt-8 pb-8">
          {/* Ticket header with corner design */}
          <div className="relative mb-5">
            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-12 h-12 border-l-2 border-t-2 border-amber-400/30 rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-r-2 border-t-2 border-amber-400/30 rounded-tr-lg"></div>
            
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/20 rounded-full border border-amber-400/30 mb-3">
                <Trophy className="h-4 w-4 text-amber-400" />
                <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">Poker Tournament</span>
              </div>
              <h3 className="text-white text-xl font-bold leading-tight px-4">
                {tournament.name}
              </h3>
            </div>
          </div>

          {/* Date & Time block */}
          <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Дата</p>
                  <p className="text-white font-bold text-base">
                    {new Date(tournament.start_time).toLocaleDateString('ru-RU', { 
                      day: 'numeric', 
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Время</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-400" />
                  <p className="text-white font-bold text-base tabular-nums">
                    {new Date(tournament.start_time).toLocaleTimeString('ru-RU', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Status badge */}
            <div className="flex justify-center">
              {getStatusBadge(tournament.status)}
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-4 border border-purple-400/30 text-center">
              <Users className="h-5 w-5 text-purple-400 mx-auto mb-2" />
              <p className="text-purple-300 text-xs uppercase tracking-wider mb-1">Игроки</p>
              <p className="text-white font-bold text-2xl">
                {tournament._count?.tournament_registrations || 0}<span className="text-slate-400 text-base">/{tournament.max_players}</span>
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-xl p-4 border border-amber-400/30 text-center">
              <Coins className="h-5 w-5 text-amber-400 mx-auto mb-2" />
              <p className="text-amber-300 text-xs uppercase tracking-wider mb-1">Стартовый стек</p>
              <p className="text-white font-bold text-2xl">
                {(tournament.starting_chips / 1000).toFixed(0)}<span className="text-slate-400 text-base">K</span>
              </p>
            </div>
          </div>

          {/* Ticket number */}
          <div className="text-center">
            <p className="text-slate-500 text-xs font-mono tracking-widest">
              TICKET #{tournament.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Tear line with scissors icon */}
        <div className="relative h-8 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 flex items-center justify-center">
          <div className="absolute left-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-slate-200">
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
            </svg>
          </div>
        </div>
        
        {/* Bottom section - Stub/Coupon */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 pb-8">
          {/* Price section */}
          <div className="mb-4">
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 rounded-2xl p-5 border-2 border-amber-400/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs uppercase tracking-wider mb-0.5">Взнос</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-slate-900 text-3xl font-bold tabular-nums">
                        {tournament.participation_fee.toLocaleString()}
                      </span>
                      <span className="text-slate-600 text-lg font-semibold">₽</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center">
                    <div className="w-12 h-12 bg-slate-200 rounded"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional fees */}
            {(tournament.reentry_fee && tournament.reentry_fee > 0) || (tournament.additional_fee && tournament.additional_fee > 0) ? (
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                {tournament.reentry_fee && tournament.reentry_fee > 0 && (
                  <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Coffee className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-slate-700 text-xs font-semibold">Ребай</span>
                    </div>
                    <span className="text-slate-900 font-bold text-base tabular-nums">{tournament.reentry_fee.toLocaleString()} ₽</span>
                  </div>
                )}
                
                {tournament.additional_fee && tournament.additional_fee > 0 && (
                  <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Gem className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-slate-700 text-xs font-semibold">Аддон</span>
                    </div>
                    <span className="text-slate-900 font-bold text-base tabular-nums">{tournament.additional_fee.toLocaleString()} ₽</span>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Barcode */}
          <div className="mb-4 bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex gap-px justify-center h-12">
              {[...Array(30)].map((_, i) => (
                <div key={i} className="bg-slate-900 rounded-sm" style={{ width: '2px', height: `${Math.random() * 100}%` }}></div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2.5">
            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold transition-all duration-300 rounded-xl shadow-lg hover:shadow-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed h-12 text-base group/btn"
              onClick={onRegister}
              disabled={tournament.status !== 'registration'}
            >
              <PlayCircle className="h-5 w-5 mr-2 group-hover/btn:scale-110 transition-transform" />
              {getButtonText(tournament.status)}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full border-2 border-slate-300 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 transition-all duration-300 rounded-xl h-10 font-semibold group/btn"
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