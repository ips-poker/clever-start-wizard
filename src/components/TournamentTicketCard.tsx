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
  ChevronRight,
  Coins,
  Crown,
  Gem,
  Target
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
    const statusConfig = {
      'registration': { label: 'Регистрация открыта', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      'running': { label: 'Турнир проходит', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
      'scheduled': { label: 'Запланирован', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      'completed': { label: 'Завершен', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
      'paused': { label: 'Приостановлен', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    
    return (
      <Badge className={`px-3 py-1 rounded-full text-xs font-medium border ${config.className}`}>
        {config.label}
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

  return (
    <div className="group relative w-full max-w-sm mx-auto">
      {/* Main ticket container - Telegram style */}
      <div className="relative bg-gradient-to-br from-slate-900/98 via-black/95 to-slate-800/98 border border-amber-400/20 rounded-2xl overflow-hidden shadow-2xl group-hover:shadow-amber-500/30 group-hover:border-amber-400/40 transition-all duration-500 backdrop-blur-2xl">
        
        {/* Покерные масти декорация */}
        <div className="absolute inset-0 opacity-5 overflow-hidden pointer-events-none">
          <div className="absolute top-4 right-6 text-3xl text-amber-400 transform rotate-12 animate-pulse">♠</div>
          <div className="absolute top-16 left-4 text-2xl text-amber-500 transform -rotate-12 animate-bounce-subtle">♥</div>
          <div className="absolute bottom-12 right-8 text-4xl text-amber-400 transform rotate-45 animate-pulse">♦</div>
          <div className="absolute bottom-4 left-6 text-3xl text-amber-500 transform -rotate-30 animate-bounce-subtle">♣</div>
        </div>

        {/* Top section - Tournament Info */}
        <div className="p-5 relative z-10">
          {/* Header with title and status */}
          <div className="text-center mb-4">
            <h3 className="text-xl font-light text-white tracking-wider uppercase mb-2">
              {tournament.name}
            </h3>
            <div className="h-0.5 w-12 bg-gradient-to-r from-amber-400 to-amber-600 mx-auto mb-3"></div>
            <div className="flex justify-center gap-2">
              {getStatusBadge(tournament.status)}
              {isFilling && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 px-3 py-1 rounded-full text-xs font-medium border animate-pulse">
                  Осталось {spotsLeft}!
                </Badge>
              )}
            </div>
          </div>

          {/* Дата, время и участники */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-lg p-3 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center">
                  <Calendar className="h-3 w-3 text-white" />
                </div>
                <h4 className="text-xs font-medium text-white">Дата и время</h4>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-light text-white">
                  {new Date(tournament.start_time).toLocaleDateString('ru-RU', { 
                    day: 'numeric', 
                    month: 'short'
                  })}
                </p>
                <p className="text-sm text-amber-400 font-medium">
                  {new Date(tournament.start_time).toLocaleTimeString('ru-RU', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-lg p-3 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-md flex items-center justify-center">
                  <Users className="h-3 w-3 text-white" />
                </div>
                <h4 className="text-xs font-medium text-white">Участники</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-light text-white">{registeredCount}</span>
                <span className="text-white/40">/</span>
                <span className="text-lg font-light text-white/80">{tournament.max_players}</span>
              </div>
              <div className="mt-2 bg-white/10 rounded-full h-1 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
                  style={{ width: `${Math.min((registeredCount / tournament.max_players) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Стартовый стек */}
          <div className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-lg p-3 border border-white/10 backdrop-blur-sm mb-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-red-600 rounded-md flex items-center justify-center">
                <Coins className="h-3 w-3 text-white" />
              </div>
              <h4 className="text-xs font-medium text-white">Стартовый стек</h4>
            </div>
            <p className="text-sm font-light text-white">{tournament.starting_chips?.toLocaleString() || 'N/A'} фишек</p>
          </div>

          {/* Организационный взнос */}
          <div className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-lg p-3 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-md flex items-center justify-center">
                <DollarSign className="h-3 w-3 text-white" />
              </div>
              <h4 className="text-xs font-medium text-white">Орг. взнос</h4>
            </div>
            <p className="text-lg font-semibold text-white">{tournament.participation_fee.toLocaleString()} ₽</p>
            
            {/* Additional fees */}
            {(tournament.reentry_fee && tournament.reentry_fee > 0) || (tournament.additional_fee && tournament.additional_fee > 0) ? (
              <div className="mt-2 space-y-1">
                {tournament.reentry_fee && tournament.reentry_fee > 0 && (
                  <p className="text-xs text-white/60">Повторный вход: {tournament.reentry_fee.toLocaleString()} ₽</p>
                )}
                {tournament.additional_fee && tournament.additional_fee > 0 && (
                  <p className="text-xs text-white/60">Доп. набор: {tournament.additional_fee.toLocaleString()} ₽</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
        
        {/* Bottom section - Actions */}
        <div className="p-5 bg-gradient-to-br from-slate-900/60 to-black/60 relative backdrop-blur-md border-t border-white/5">
          {/* Action buttons */}
          <div className="space-y-2">
            <Button 
              onClick={onRegister}
              disabled={tournament.status !== 'registration'}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-amber-500/30 transition-all duration-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              {getButtonText(tournament.status)}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onViewDetails}
              className="w-full border border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300 text-xs rounded-lg"
            >
              Подробная информация
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0px) rotate(var(--tw-rotate)); }
          50% { transform: translateY(-10px) rotate(var(--tw-rotate)); }
        }
      `}</style>
    </div>
  );
}
