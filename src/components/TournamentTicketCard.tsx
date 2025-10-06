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
  const ticketNumber = tournament.id.split('-')[0].toUpperCase();
  const barcodeSegments = Array.from({ length: 35 }, (_, i) => Math.random() > 0.3);

  return (
    <div className="group relative w-full max-w-sm mx-auto">
      {/* Holographic glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 via-purple-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-30 blur-xl transition-all duration-700 animate-pulse"></div>
      
      {/* Main ticket container */}
      <div className="relative bg-gradient-to-br from-slate-900/98 via-black/95 to-slate-800/98 border border-amber-400/30 rounded-2xl overflow-hidden shadow-2xl group-hover:shadow-amber-500/40 group-hover:border-amber-400/50 group-hover:-translate-y-1 transition-all duration-500 backdrop-blur-2xl">
        
        {/* Ticket perforations */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
          <div className="flex flex-col gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-2 h-2 bg-slate-950 rounded-full -ml-1 border border-amber-400/20 group-hover:border-amber-400/40 transition-colors"></div>
            ))}
          </div>
        </div>
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
          <div className="flex flex-col gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-2 h-2 bg-slate-950 rounded-full -mr-1 border border-amber-400/20 group-hover:border-amber-400/40 transition-colors"></div>
            ))}
          </div>
        </div>
        
        {/* Holographic shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
        
        {/* Покерные масти декорация */}
        <div className="absolute inset-0 opacity-5 overflow-hidden pointer-events-none">
          <div className="absolute top-4 right-6 text-3xl text-amber-400 transform rotate-12 animate-pulse">♠</div>
          <div className="absolute top-16 left-4 text-2xl text-amber-500 transform -rotate-12 animate-bounce-subtle">♥</div>
          <div className="absolute bottom-12 right-8 text-4xl text-amber-400 transform rotate-45 animate-pulse">♦</div>
          <div className="absolute bottom-4 left-6 text-3xl text-amber-500 transform -rotate-30 animate-bounce-subtle">♣</div>
        </div>

        {/* Top section - Tournament Info */}
        <div className="p-5 relative z-10">
          {/* Ticket number badge - top right corner */}
          <div className="absolute top-3 right-3 bg-gradient-to-br from-amber-500/20 to-amber-600/20 backdrop-blur-sm border border-amber-400/30 rounded-lg px-3 py-1.5 group-hover:border-amber-400/50 transition-colors">
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="text-[8px] text-amber-400/80 font-mono uppercase tracking-wider">TICKET</span>
                <span className="text-xs text-amber-300 font-bold font-mono tracking-wide">#{ticketNumber}</span>
              </div>
              <Trophy className="h-3 w-3 text-amber-400" />
            </div>
          </div>

          {/* Header with title and status */}
          <div className="text-center mb-4 pr-24">
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
          {/* Barcode */}
          <div className="mb-4 flex justify-center">
            <div className="bg-white/95 rounded px-3 py-2 flex items-center gap-0.5">
              {barcodeSegments.map((tall, i) => (
                <div 
                  key={i} 
                  className={`${tall ? 'h-8' : 'h-6'} w-[2px] bg-slate-900 transition-all duration-300`}
                  style={{ opacity: 0.8 + Math.random() * 0.2 }}
                />
              ))}
            </div>
          </div>
          
          {/* Serial number */}
          <div className="text-center mb-4">
            <p className="text-[10px] text-white/40 font-mono tracking-widest">
              {tournament.id.toUpperCase()}
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <Button 
              onClick={onRegister}
              disabled={tournament.status !== 'registration'}
              className="relative w-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:via-amber-500 hover:to-amber-600 text-white font-semibold py-3 rounded-lg shadow-xl hover:shadow-2xl hover:shadow-amber-500/50 transition-all duration-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group/btn"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
              <PlayCircle className="relative h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
              <span className="relative">{getButtonText(tournament.status)}</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onViewDetails}
              className="w-full border border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-amber-400/40 transition-all duration-300 text-xs rounded-lg group/info"
            >
              Подробная информация
              <ChevronRight className="h-4 w-4 ml-auto group-hover/info:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
        
        {/* Corner decorations */}
        <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-amber-400/20 rounded-tl-2xl group-hover:border-amber-400/40 transition-colors"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-amber-400/20 rounded-br-2xl group-hover:border-amber-400/40 transition-colors"></div>
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
