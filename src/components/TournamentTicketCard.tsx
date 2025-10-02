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
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/10 to-amber-600/0 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Main ticket container - more compact */}
      <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border-2 border-amber-400/20 rounded-2xl overflow-hidden shadow-xl group-hover:scale-[1.02] group-hover:border-amber-400/40 transition-all duration-500 backdrop-blur-2xl">
        
        {/* Ticket perforations with enhanced design */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-gradient-to-br from-slate-900 via-black to-slate-800 rounded-full -ml-4 border-2 border-amber-400/20 shadow-xl group-hover:border-amber-400/40 transition-colors duration-500">
          <div className="absolute inset-1 bg-gradient-to-br from-amber-400/5 to-amber-600/5 rounded-full"></div>
        </div>
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-gradient-to-br from-slate-900 via-black to-slate-800 rounded-full -mr-4 border-2 border-amber-400/20 shadow-xl group-hover:border-amber-400/40 transition-colors duration-500">
          <div className="absolute inset-1 bg-gradient-to-br from-amber-400/5 to-amber-600/5 rounded-full"></div>
        </div>
        
        {/* Enhanced dashed separation line with animation */}
        <div className="absolute left-8 right-8 top-1/2 transform -translate-y-1/2">
          <div className="h-px border-t-2 border-dashed border-amber-400/30 group-hover:border-amber-400/50 transition-colors duration-500"></div>
        </div>
        
        {/* Enhanced decorative poker symbols */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10 group-hover:opacity-25 transition-opacity duration-700">
          <div className="absolute top-6 right-6 text-amber-400/40 text-4xl animate-float">♠</div>
          <div className="absolute top-10 left-6 text-amber-400/30 text-3xl animate-float-delayed">♣</div>
          <div className="absolute bottom-10 right-8 text-amber-400/35 text-3xl animate-float">♥</div>
          <div className="absolute bottom-6 left-8 text-amber-400/25 text-2xl animate-float-delayed">♦</div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-amber-400/5 text-8xl animate-rotate-slow">♠</div>
        </div>

        {/* Top section - Compact Tournament Info */}
        <div className="p-5 pb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-amber-400/8 to-amber-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative z-10">
            {/* Compact Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-lg ring-1 ring-amber-400/30">
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-white group-hover:text-amber-50 transition-colors duration-300 leading-tight mb-1 truncate">
                    {tournament.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge variant={tournament.status === 'registration' ? 'default' : 'secondary'} className="text-xs py-0 h-5">
                      {tournament.status === 'registration' ? 'Регистрация' : tournament.status === 'running' ? 'Идет' : 'Скоро'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Compact Tournament details */}
            <div className="space-y-3">
              {/* Date & Time - Compact */}
              <div className="flex items-center gap-3 bg-gradient-to-r from-white/5 to-white/10 rounded-lg p-3 border border-white/10">
                <Calendar className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">
                    {new Date(tournament.start_time).toLocaleDateString('ru-RU', { 
                      day: 'numeric', 
                      month: 'short'
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-amber-400" />
                  <p className="text-white/70 text-xs font-medium">
                    {new Date(tournament.start_time).toLocaleTimeString('ru-RU', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>

              {/* Players & Stack - Compact Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-lg p-2.5 border border-purple-400/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users className="h-3 w-3 text-purple-400" />
                    <p className="text-purple-300 text-xs font-medium">Игроки</p>
                  </div>
                  <p className="text-white font-bold text-sm">
                    {tournament._count?.tournament_registrations || 0}/{tournament.max_players}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 rounded-lg p-2.5 border border-amber-400/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Coins className="h-3 w-3 text-amber-400" />
                    <p className="text-amber-300 text-xs font-medium">Стек</p>
                  </div>
                  <p className="text-white font-bold text-sm">
                    {(tournament.starting_chips / 1000).toFixed(0)}K
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom section - Compact Pricing & Actions */}
        <div className="p-5 pt-6 bg-gradient-to-br from-slate-900/80 to-black/80 relative backdrop-blur-md border-t-2 border-dashed border-amber-400/20">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/3 to-amber-600/5"></div>
          
          <div className="relative z-10">
            {/* Compact Pricing */}
            <div className="mb-4">
              <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-amber-500/15 rounded-xl p-4 border border-amber-400/30 backdrop-blur-sm relative overflow-hidden group-hover:border-amber-400/50 transition-colors duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white/60 text-xs font-medium mb-0.5">Орг. взнос</p>
                      <span className="text-amber-400 text-2xl font-bold">
                        {tournament.participation_fee.toLocaleString()}
                        <span className="text-base ml-1">₽</span>
                      </span>
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                </div>
              </div>

              {/* Compact Additional fees */}
              {(tournament.reentry_fee && tournament.reentry_fee > 0) || (tournament.additional_fee && tournament.additional_fee > 0) ? (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {tournament.reentry_fee && tournament.reentry_fee > 0 && (
                    <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg px-3 py-2 border border-green-400/20">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Coffee className="h-3 w-3 text-green-400" />
                        <span className="text-green-300 text-xs">Ребай</span>
                      </div>
                      <span className="text-white font-bold text-sm">{tournament.reentry_fee.toLocaleString()} ₽</span>
                    </div>
                  )}
                  
                  {tournament.additional_fee && tournament.additional_fee > 0 && (
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg px-3 py-2 border border-blue-400/20">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Gem className="h-3 w-3 text-blue-400" />
                        <span className="text-blue-300 text-xs">Аддон</span>
                      </div>
                      <span className="text-white font-bold text-sm">{tournament.additional_fee.toLocaleString()} ₽</span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Compact Action buttons */}
            <div className="space-y-2">
              <Button 
                size="lg" 
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold transition-all duration-300 rounded-lg shadow-lg hover:shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed h-11 group/btn"
                onClick={onRegister}
                disabled={tournament.status !== 'registration'}
              >
                <PlayCircle className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                {getButtonText(tournament.status)}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border border-amber-400/40 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/60 transition-all duration-300 rounded-lg h-9 group/btn"
                onClick={onViewDetails}
              >
                Подробнее
                <ChevronRight className="h-4 w-4 ml-auto group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Enhanced Custom animations */}
      <style>{`
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 5s ease-in-out 2.5s infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(var(--tw-rotate)); }
          33% { transform: translateY(-15px) translateX(8px) rotate(var(--tw-rotate)); }
          66% { transform: translateY(-8px) translateX(-8px) rotate(var(--tw-rotate)); }
        }
        .animate-rotate-slow {
          animation: rotate-slow 15s linear infinite;
        }
        @keyframes rotate-slow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}