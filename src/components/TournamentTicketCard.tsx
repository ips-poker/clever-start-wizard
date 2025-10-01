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
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/10 to-amber-600/0 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      
      {/* Main ticket container */}
      <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border-2 border-amber-400/20 rounded-3xl overflow-hidden shadow-2xl group-hover:scale-[1.03] group-hover:border-amber-400/40 transition-all duration-700 backdrop-blur-2xl">
        
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

        {/* Top section - Enhanced Tournament Info */}
        <div className="p-7 pb-10 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-amber-400/8 to-amber-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          
          <div className="relative z-10">
            {/* Enhanced Header */}
            <div className="flex items-start justify-between mb-7">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative w-14 h-14 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl ring-2 ring-amber-400/30 group-hover:ring-amber-400/50">
                    <Trophy className="h-7 w-7 text-white drop-shadow-lg" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white group-hover:text-amber-50 transition-colors duration-300 leading-tight mb-2 drop-shadow-md">
                    {tournament.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></div>
                    <p className="text-white/50 text-xs font-mono">ID: {tournament.id.slice(0, 8)}</p>
                  </div>
                </div>
              </div>
              <div className="group-hover:scale-110 transition-transform duration-300">
                {getStatusBadge(tournament.status)}
              </div>
            </div>

            {/* Enhanced Tournament details */}
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-white/5 via-white/8 to-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm group-hover:border-amber-400/20 transition-colors duration-500">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg flex items-center justify-center border border-blue-400/20">
                    <Calendar className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-base">
                      {new Date(tournament.start_time).toLocaleDateString('ru-RU', { 
                        day: 'numeric', 
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-amber-400" />
                      <p className="text-white/70 text-sm font-medium">
                        {new Date(tournament.start_time).toLocaleTimeString('ru-RU', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-xl p-3 border border-purple-400/20 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-purple-400" />
                    <p className="text-purple-300 text-xs font-semibold uppercase tracking-wide">Игроки</p>
                  </div>
                  <p className="text-white font-bold text-lg">
                    {tournament._count?.tournament_registrations || 0} / {tournament.max_players}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl p-3 border border-green-400/20 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-green-400" />
                    <p className="text-green-300 text-xs font-semibold uppercase tracking-wide">Формат</p>
                  </div>
                  <p className="text-white font-bold text-sm">
                    {tournament.tournament_format === 'freezeout' ? 'Фриз-аут' : 
                     tournament.tournament_format === 'rebuy' ? 'Ребай' : 
                     tournament.tournament_format || 'Стандарт'}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 rounded-xl p-4 border border-amber-400/20 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500/30 to-amber-600/30 rounded-lg flex items-center justify-center border border-amber-400/30">
                    <Coins className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-amber-300 text-xs font-semibold uppercase tracking-wide mb-1">Стартовый стек</p>
                    <p className="text-white font-bold text-xl">
                      {tournament.starting_chips.toLocaleString()}
                    </p>
                  </div>
                </div>
                {tournament.description && (
                  <p className="text-white/70 text-xs mt-3 leading-relaxed line-clamp-2 border-t border-white/10 pt-3">
                    {tournament.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom section - Enhanced Pricing & Actions */}
        <div className="p-7 pt-8 bg-gradient-to-br from-slate-900/80 to-black/80 relative backdrop-blur-md border-t-2 border-dashed border-amber-400/20">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/3 to-amber-600/5"></div>
          
          <div className="relative z-10">
            {/* Enhanced Pricing info */}
            <div className="mb-6">
              <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-amber-500/15 rounded-2xl p-5 border-2 border-amber-400/30 backdrop-blur-sm mb-4 relative overflow-hidden group-hover:border-amber-400/50 transition-colors duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-1">Орг. взнос</p>
                      <span className="text-amber-400 text-3xl font-black drop-shadow-lg">
                        {tournament.participation_fee.toLocaleString()}
                        <span className="text-xl ml-1">₽</span>
                      </span>
                    </div>
                  </div>
                  <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse shadow-lg shadow-amber-400/50"></div>
                </div>
              </div>

              {/* Enhanced Additional fees */}
              {(tournament.reentry_fee && tournament.reentry_fee > 0) || (tournament.additional_fee && tournament.additional_fee > 0) ? (
                <div className="grid grid-cols-2 gap-3">
                  {tournament.reentry_fee && tournament.reentry_fee > 0 && (
                    <div className="bg-gradient-to-br from-green-500/15 to-green-600/15 rounded-xl px-4 py-3 border border-green-400/30 backdrop-blur-sm group-hover:border-green-400/50 transition-colors duration-300">
                      <div className="flex items-center gap-2 mb-1">
                        <Coffee className="h-3 w-3 text-green-400" />
                        <span className="text-green-300 text-xs font-semibold">Повторный вход</span>
                      </div>
                      <span className="text-white font-bold text-lg block">{tournament.reentry_fee.toLocaleString()} ₽</span>
                    </div>
                  )}
                  
                  {tournament.additional_fee && tournament.additional_fee > 0 && (
                    <div className="bg-gradient-to-br from-blue-500/15 to-blue-600/15 rounded-xl px-4 py-3 border border-blue-400/30 backdrop-blur-sm group-hover:border-blue-400/50 transition-colors duration-300">
                      <div className="flex items-center gap-2 mb-1">
                        <Gem className="h-3 w-3 text-blue-400" />
                        <span className="text-blue-300 text-xs font-semibold">Доп. набор</span>
                      </div>
                      <span className="text-white font-bold text-lg block">{tournament.additional_fee.toLocaleString()} ₽</span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Enhanced Action buttons */}
            <div className="space-y-3">
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full border-2 border-amber-400/40 text-amber-400 hover:bg-amber-400/20 hover:border-amber-400/60 transition-all duration-300 rounded-xl backdrop-blur-sm font-bold py-6 group/btn"
                onClick={onViewDetails}
              >
                <Info className="h-5 w-5 mr-2 group-hover/btn:scale-110 transition-transform" />
                Подробная информация
                <ChevronRight className="h-5 w-5 ml-auto group-hover/btn:translate-x-1 transition-transform" />
              </Button>
              
              <Button 
                size="lg" 
                className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:via-amber-500 hover:to-amber-600 text-white font-black text-lg transition-all duration-500 rounded-xl shadow-2xl hover:shadow-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed py-6 border-2 border-amber-400/30 group/btn hover:scale-105"
                onClick={onRegister}
                disabled={tournament.status !== 'registration'}
              >
                <PlayCircle className="h-5 w-5 mr-2 group-hover/btn:scale-125 transition-transform" />
                {getButtonText(tournament.status)}
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