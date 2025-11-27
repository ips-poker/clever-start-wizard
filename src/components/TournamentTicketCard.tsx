import React from "react";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateTotalRPSPool, formatRPSPoints, formatParticipationFee } from "@/utils/rpsCalculations";
import { 
  Calendar, 
  Clock, 
  Users, 
  Trophy, 
  DollarSign, 
  ChevronRight,
  Coins,
  Target,
  Zap,
  Shield,
  Repeat,
  Lock,
  AlertTriangle
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
  calculated_prize_pool?: number;
  total_reentries?: number;
  total_additional_sets?: number;
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
      'registration': { 
        label: 'Регистрация', 
        className: 'bg-syndikate-orange/20 text-syndikate-orange border-2 border-syndikate-orange/50',
        icon: <Target className="h-3 w-3" />
      },
      'running': { 
        label: 'Идет', 
        className: 'bg-syndikate-red/20 text-syndikate-red border-2 border-syndikate-red/50',
        icon: <Zap className="h-3 w-3" />
      },
      'scheduled': { 
        label: 'Запланирован', 
        className: 'bg-syndikate-metal-light/30 text-foreground border-2 border-border',
        icon: <Clock className="h-3 w-3" />
      },
      'completed': { 
        label: 'Завершен', 
        className: 'bg-muted/30 text-muted-foreground border-2 border-border/50',
        icon: <Trophy className="h-3 w-3" />
      },
      'paused': { 
        label: 'Приостановлен', 
        className: 'bg-muted/30 text-muted-foreground border-2 border-border/50',
        icon: <AlertTriangle className="h-3 w-3" />
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    
    return (
      <Badge className={`px-3 py-1 text-xs font-bold uppercase tracking-wider ${config.className}`}>
        {config.icon}
        <span className="ml-1.5">{config.label}</span>
      </Badge>
    );
  };

  const getButtonText = (status: string) => {
    switch (status) {
      case 'registration':
        return 'Регистрация';
      case 'running':
        return 'Идет турнир';
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
  
  // Calculate RPS prize pool
  const totalReentries = tournament.total_reentries || 0;
  const totalAdditionalSets = tournament.total_additional_sets || 0;
  const totalRPSPool = calculateTotalRPSPool(
    registeredCount,
    tournament.participation_fee,
    totalReentries,
    tournament.reentry_fee || 0,
    totalAdditionalSets,
    tournament.additional_fee || 0
  );
  
  // Calculate time until start
  const timeUntilStart = () => {
    const now = new Date();
    const start = new Date(tournament.start_time);
    const diff = start.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}д`;
    }
    if (hours > 0) {
      return `${hours}ч ${minutes}м`;
    }
    return `${minutes}м`;
  };
  
  // Get format icon
  const getFormatIcon = () => {
    switch (tournament.tournament_format) {
      case 'rebuy':
        return <Repeat className="h-3.5 w-3.5" />;
      case 'reentry':
        return <Shield className="h-3.5 w-3.5" />;
      default:
        return <Lock className="h-3.5 w-3.5" />;
    }
  };
  
  // Get format name
  const getFormatName = () => {
    switch (tournament.tournament_format) {
      case 'rebuy':
        return 'REBUY';
      case 'reentry':
        return 'RE-ENTRY';
      default:
        return 'FREEZEOUT';
    }
  };

  return (
    <div className="group relative w-full">
      {/* Neon Glow Effect */}
      <div className="absolute -inset-1 bg-gradient-neon rounded opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500"></div>
      
      {/* Main Card Container */}
      <div className="relative brutal-metal brutal-border overflow-hidden shadow-brutal group-hover:shadow-neon-orange transition-all duration-500">
        
        {/* Industrial Background Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 255, 255, 0.02) 10px, rgba(255, 255, 255, 0.02) 20px)
            `
          }}
        />

        {/* Corner Brackets */}
        <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-syndikate-orange" />
        <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-syndikate-orange" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-syndikate-orange" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-syndikate-orange" />

        {/* Warning Stripes at Top */}
        <div 
          className="absolute top-0 left-0 right-0 h-2 opacity-30"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(255, 135, 31, 0.3), rgba(255, 135, 31, 0.3) 10px, transparent 10px, transparent 20px)'
          }}
        />

        {/* Main Content */}
        <div className="relative z-10 p-5">
          
          {/* Header Section */}
          <div className="mb-4 space-y-3">
            {/* Tournament Name */}
            <h3 className="font-display text-2xl uppercase tracking-wider text-foreground group-hover:text-syndikate-orange transition-colors duration-300">
              {tournament.name}
            </h3>
            
            {/* Status and Format Row */}
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(tournament.status)}
              
              {/* Format Badge */}
              <Badge className="bg-syndikate-metal-light/30 border-2 border-border px-2.5 py-1 text-xs font-bold uppercase tracking-wider">
                {getFormatIcon()}
                <span className="ml-1.5">{getFormatName()}</span>
              </Badge>
              
              {/* Ticket Number */}
              <div className="ml-auto bg-syndikate-orange/20 border-2 border-syndikate-orange/50 px-3 py-1 brutal-border">
                <span className="text-[10px] text-syndikate-orange font-bold tracking-widest">#{ticketNumber}</span>
              </div>
            </div>

            {/* Warning Badges */}
            {(isFilling || timeUntilStart()) && (
              <div className="flex gap-2">
                {isFilling && (
                  <Badge className="bg-syndikate-red/20 text-syndikate-red border-2 border-syndikate-red/50 px-2 py-1 text-xs font-bold uppercase">
                    <Zap className="h-3 w-3 mr-1" />
                    {spotsLeft} мест
                  </Badge>
                )}
                {timeUntilStart() && tournament.status === 'registration' && (
                  <Badge className="bg-syndikate-metal-light/30 border-2 border-border px-2 py-1 text-xs font-bold uppercase">
                    <Clock className="h-3 w-3 mr-1" />
                    {timeUntilStart()}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Divider Line */}
          <div className="h-[2px] bg-gradient-neon mb-4 opacity-50" />

          {/* RPS Prize Pool Banner */}
          {totalRPSPool > 0 && (
            <div className="mb-4 bg-syndikate-metal/50 brutal-border p-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-syndikate-orange/10 rounded-full blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-syndikate-orange brutal-border flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-background" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Призовой фонд</p>
                    <p className="font-display text-3xl text-syndikate-orange">{formatRPSPoints(totalRPSPool)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Date & Time */}
            <div className="bg-syndikate-metal/30 brutal-border p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-syndikate-orange brutal-border flex items-center justify-center">
                  <Calendar className="h-3.5 w-3.5 text-background" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Дата</span>
              </div>
              <p className="text-sm text-foreground/80 mb-1">
                {new Date(tournament.start_time).toLocaleDateString('ru-RU', { 
                  day: 'numeric', 
                  month: 'short'
                })}
              </p>
              <p className="font-display text-lg text-syndikate-orange">
                {new Date(tournament.start_time).toLocaleTimeString('ru-RU', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>

            {/* Participants */}
            <div className="bg-syndikate-metal/30 brutal-border p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-syndikate-orange brutal-border flex items-center justify-center">
                  <Users className="h-3.5 w-3.5 text-background" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Игроки</span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="font-display text-lg text-syndikate-orange">{registeredCount}</span>
                <span className="text-muted-foreground text-xs">/</span>
                <span className="text-sm text-foreground/80">{tournament.max_players}</span>
              </div>
              <div className="h-1.5 bg-background brutal-border overflow-hidden">
                <div 
                  className="h-full bg-gradient-neon transition-all duration-500"
                  style={{ width: `${Math.min((registeredCount / tournament.max_players) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Buy-in */}
            <div className="bg-syndikate-metal/30 brutal-border p-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-syndikate-orange/10 rounded-full blur-xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-syndikate-orange brutal-border flex items-center justify-center">
                    <DollarSign className="h-3.5 w-3.5 text-background" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Взнос</span>
                </div>
                <p className="font-display text-2xl text-syndikate-orange">{formatParticipationFee(tournament.participation_fee)}</p>
                {(tournament.reentry_fee && tournament.reentry_fee > 0) && (
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                    Re: {formatParticipationFee(tournament.reentry_fee)}
                  </p>
                )}
              </div>
            </div>

            {/* Starting Stack */}
            <div className="bg-syndikate-metal/30 brutal-border p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-syndikate-orange brutal-border flex items-center justify-center">
                  <Coins className="h-3.5 w-3.5 text-background" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Стек</span>
              </div>
              <p className="font-display text-2xl text-syndikate-orange">
                {tournament.starting_chips?.toLocaleString() || 'N/A'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button 
              onClick={onViewDetails}
              variant="outline"
              className="w-full border-2 border-syndikate-orange text-syndikate-orange hover:bg-syndikate-orange hover:text-background font-bold uppercase tracking-wider transition-all group/btn"
            >
              Детали
              <ChevronRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
            
            {tournament.status === 'registration' && (
              <Button 
                onClick={onRegister}
                className="w-full bg-syndikate-orange hover:bg-syndikate-orange-glow text-background font-bold uppercase tracking-wider shadow-neon-orange hover:shadow-neon-orange transition-all"
              >
                {getButtonText(tournament.status)}
              </Button>
            )}
          </div>
        </div>

        {/* Bottom Warning Strip */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-2 opacity-30"
          style={{
            backgroundImage: 'repeating-linear-gradient(-45deg, rgba(255, 135, 31, 0.3), rgba(255, 135, 31, 0.3) 10px, transparent 10px, transparent 20px)'
          }}
        />
      </div>
    </div>
  );
}
