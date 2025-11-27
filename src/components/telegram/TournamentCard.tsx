import React, { useState, useEffect } from 'react';
import { Trophy, Users, Clock, Zap, Coins, DollarSign, Target, Shield, Repeat, Lock, ChevronRight } from 'lucide-react';
import { GlitchText } from '@/components/ui/glitch-text';
import { Badge } from '@/components/ui/badge';
import { calculateTotalRPSPool, formatRPSPoints, formatParticipationFee } from '@/utils/rpsCalculations';

interface Tournament {
  id: string;
  name: string;
  start_time: string;
  participation_fee: number;
  reentry_fee?: number;
  additional_fee?: number;
  reentry_chips?: number;
  additional_chips?: number;
  max_players: number;
  status: string;
  starting_chips: number;
  description?: string;
  tournament_format?: string;
  reentry_end_level?: number;
  additional_level?: number;
  total_reentries?: number;
  total_additional_sets?: number;
  tournament_registrations?: Array<{
    count: number;
  }>;
}

interface TournamentCardProps {
  tournament: Tournament;
  index: number;
  onClick: () => void;
}

export const TournamentCard: React.FC<TournamentCardProps> = ({ tournament, index, onClick }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const registeredCount = tournament.tournament_registrations?.[0]?.count || 0;
  const maxPlayers = tournament.max_players;
  const spotsLeft = maxPlayers - registeredCount;
  const fillPercentage = (registeredCount / maxPlayers) * 100;
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
  
  // Live countdown timer - updates every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, []);
  
  // Calculate countdown with days
  const startTime = new Date(tournament.start_time);
  const timeUntilStart = startTime.getTime() - currentTime.getTime();
  const daysUntil = Math.floor(timeUntilStart / (1000 * 60 * 60 * 24));
  const hoursUntil = Math.floor((timeUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutesUntil = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));
  
  // Format time display
  const getTimeDisplay = () => {
    if (daysUntil > 0) {
      return { 
        primary: daysUntil, 
        primaryLabel: daysUntil === 1 ? 'День' : daysUntil < 5 ? 'Дня' : 'Дней',
        secondary: hoursUntil,
        secondaryLabel: hoursUntil === 1 ? 'Час' : hoursUntil < 5 ? 'Часа' : 'Часов'
      };
    } else if (hoursUntil > 0) {
      return { 
        primary: hoursUntil, 
        primaryLabel: hoursUntil === 1 ? 'Час' : hoursUntil < 5 ? 'Часа' : 'Часов',
        secondary: minutesUntil,
        secondaryLabel: minutesUntil === 1 ? 'Минута' : minutesUntil < 5 ? 'Минуты' : 'Минут'
      };
    } else {
      return { 
        primary: minutesUntil, 
        primaryLabel: minutesUntil === 1 ? 'Минута' : minutesUntil < 5 ? 'Минуты' : 'Минут',
        secondary: null,
        secondaryLabel: ''
      };
    }
  };
  
  const timeDisplay = getTimeDisplay();
  
  const getStatusBadge = () => {
    const statusConfig = {
      'active': { 
        label: 'Live', 
        className: 'bg-syndikate-red/20 text-syndikate-red border-2 border-syndikate-red/50',
        icon: <Zap className="h-3 w-3" />
      },
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
      }
    };

    const config = statusConfig[tournament.status as keyof typeof statusConfig] || statusConfig.scheduled;
    
    return (
      <Badge className={`px-3 py-1 text-xs font-bold uppercase tracking-wider ${config.className}`}>
        {config.icon}
        <span className="ml-1.5">{config.label}</span>
      </Badge>
    );
  };
  
  // Get format icon and name
  const getFormatIcon = () => {
    switch (tournament.tournament_format) {
      case 'rebuy':
        return <Repeat className="h-3 w-3" />;
      case 'reentry':
        return <Shield className="h-3 w-3" />;
      default:
        return <Lock className="h-3 w-3" />;
    }
  };
  
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
    <div
      className="relative bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal overflow-hidden group cursor-pointer hover:shadow-neon-orange transition-all duration-300 active:scale-[0.98] animate-fade-in"
      onClick={onClick}
      style={{
        animationDelay: `${index * 100}ms`,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Animated glow background */}
      <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/10 via-transparent to-syndikate-red/10 opacity-0 group-active:opacity-100 transition-opacity" />
      <div className="absolute inset-0 industrial-texture opacity-30" />
      
      {/* Animated Orange Glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-syndikate-orange/20 rounded-full blur-2xl animate-pulse" />
      
      {/* Corner brackets */}
      <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-syndikate-orange" />
      <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-syndikate-orange" />
      <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-syndikate-orange" />
      <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-syndikate-orange" />
      
      {/* Warning Stripes at Top */}
      <div 
        className="absolute top-0 left-0 right-0 h-1.5 opacity-30"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, rgba(255, 135, 31, 0.3), rgba(255, 135, 31, 0.3) 8px, transparent 8px, transparent 16px)'
        }}
      />

      <div className="relative z-10 p-4 space-y-3">
        {/* Header with Status and Ticket Number */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {getStatusBadge()}
            
            {/* Format Badge */}
            <Badge className="bg-syndikate-metal-light/30 border-2 border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              {getFormatIcon()}
              <span className="ml-1">{getFormatName()}</span>
            </Badge>
          </div>
          
          {/* Ticket Number */}
          <div className="bg-syndikate-orange/20 border-2 border-syndikate-orange/50 px-2.5 py-1 brutal-border">
            <span className="text-[9px] text-syndikate-orange font-bold tracking-widest">#{ticketNumber}</span>
          </div>
        </div>
        
        {/* Tournament Name */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 bg-syndikate-orange brutal-border flex items-center justify-center animate-pulse">
            <Target className="h-3.5 w-3.5 text-background" />
          </div>
          <h3 className="font-display text-lg uppercase tracking-wide text-foreground flex-1 leading-tight">
            <GlitchText 
              text={tournament.name}
              glitchIntensity="low"
              glitchInterval={10000}
            />
          </h3>
        </div>
        
        {/* Warning Badge for filling spots */}
        {isFilling && (
          <Badge className="bg-syndikate-red/20 text-syndikate-red border-2 border-syndikate-red/50 px-2 py-1 text-[10px] font-bold uppercase animate-pulse">
            <Zap className="h-3 w-3 mr-1 animate-pulse" />
            Осталось {spotsLeft} мест!
          </Badge>
        )}
        
        {/* Compact Live Countdown Timer */}
        {tournament.status === 'registration' && timeUntilStart > 0 && (
          <div className="bg-syndikate-metal/30 brutal-border p-2 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-syndikate-orange animate-pulse" />
                <span className="text-[10px] text-syndikate-orange uppercase font-display tracking-wider font-bold">
                  Начало через:
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="bg-background/50 brutal-border px-2 py-1">
                  <span className="text-lg font-display text-syndikate-orange tabular-nums leading-none">
                    {timeDisplay.primary}
                  </span>
                  <span className="text-[9px] text-syndikate-concrete uppercase ml-1 font-display">
                    {timeDisplay.primaryLabel}
                  </span>
                </div>
                {timeDisplay.secondary !== null && (
                  <>
                    <span className="text-syndikate-orange">•</span>
                    <div className="bg-background/50 brutal-border px-2 py-1">
                      <span className="text-lg font-display text-syndikate-orange tabular-nums leading-none">
                        {timeDisplay.secondary}
                      </span>
                      <span className="text-[9px] text-syndikate-concrete uppercase ml-1 font-display">
                        {timeDisplay.secondaryLabel}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* RPS Prize Pool Banner */}
        {totalRPSPool > 0 && (
          <div className="bg-syndikate-metal/50 brutal-border p-3 relative overflow-hidden">
            <div className="absolute inset-0 industrial-texture opacity-10" />
            <div className="absolute top-0 right-0 w-20 h-20 bg-syndikate-orange/20 rounded-full blur-xl animate-pulse" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-syndikate-orange brutal-border flex items-center justify-center shadow-neon-orange">
                  <Trophy className="h-5 w-5 text-background" />
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-0.5 flex items-center gap-1">
                    <Zap className="h-2.5 w-2.5 text-syndikate-orange animate-pulse" />
                    Призовой фонд RPS
                  </p>
                  <p className="font-display text-2xl text-syndikate-orange neon-orange leading-none">
                    {formatRPSPoints(totalRPSPool)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Info Grid - Main Stats */}
        <div className="grid grid-cols-2 gap-2">
          {/* Buy-in */}
          <div className="bg-syndikate-metal/30 brutal-border p-2.5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-12 h-12 bg-syndikate-orange/10 rounded-full blur-lg" />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-5 h-5 bg-syndikate-orange brutal-border flex items-center justify-center">
                  <DollarSign className="h-3 w-3 text-background" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Взнос</span>
              </div>
              <p className="font-display text-xl text-syndikate-orange leading-none">{formatParticipationFee(tournament.participation_fee)}</p>
              {(tournament.reentry_fee && tournament.reentry_fee > 0) && (
                <p className="text-[9px] text-muted-foreground mt-1 uppercase tracking-wider">
                  Re: {formatParticipationFee(tournament.reentry_fee)}
                </p>
              )}
            </div>
          </div>

          {/* Starting Stack */}
          <div className="bg-syndikate-metal/30 brutal-border p-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-5 h-5 bg-syndikate-orange brutal-border flex items-center justify-center">
                <Coins className="h-3 w-3 text-background" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Стек</span>
            </div>
            <p className="font-display text-xl text-syndikate-orange leading-none">
              {tournament.starting_chips?.toLocaleString()}
            </p>
          </div>
        </div>
        
        {/* Players Info with Progress */}
        <div className="bg-syndikate-metal/30 brutal-border p-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-5 h-5 bg-syndikate-orange brutal-border flex items-center justify-center">
              <Users className="h-3 w-3 text-background" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Игроки</span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="font-display text-xl text-syndikate-orange">{registeredCount}</span>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="text-sm text-foreground/80">{maxPlayers}</span>
            {isFilling && (
              <Badge className="ml-auto bg-syndikate-red/20 text-syndikate-red border border-syndikate-red/50 px-1.5 py-0.5 text-[9px] font-bold uppercase animate-pulse">
                <Zap className="h-2.5 w-2.5 mr-0.5" />
                {spotsLeft}!
              </Badge>
            )}
          </div>
          <div className="h-1.5 bg-background brutal-border overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                fillPercentage >= 90 
                  ? 'bg-gradient-to-r from-syndikate-red to-syndikate-orange shadow-neon-red' 
                  : 'bg-gradient-to-r from-syndikate-orange to-syndikate-red shadow-neon-orange'
              }`}
              style={{ width: `${Math.min(fillPercentage, 100)}%` }}
            />
          </div>
        </div>
        
        {/* Date and Time Info */}
        <div className="bg-syndikate-metal/20 brutal-border p-2">
          <div className="flex items-center justify-center gap-2 text-sm">
            <div className="flex items-center gap-1.5 text-foreground">
              <span className="text-base">📅</span>
              <span className="font-display font-bold">{new Date(tournament.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1.5 text-foreground">
              <Clock className="h-4 w-4 text-syndikate-orange" />
              <span className="font-display font-bold">{new Date(tournament.start_time).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}</span>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          {tournament.status === 'registration' && (
            <button 
              className="flex-1 bg-syndikate-orange hover:bg-syndikate-orange/90 text-background brutal-border px-4 py-2.5 font-display uppercase text-sm font-bold tracking-wider transition-all duration-200 active:scale-[0.98] shadow-brutal hover:shadow-neon-orange flex items-center justify-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              <Target className="h-4 w-4" />
              <span>Регистрация</span>
            </button>
          )}
          <button 
            className="flex-1 bg-syndikate-metal hover:bg-syndikate-metal-light text-foreground brutal-border px-4 py-2.5 font-display uppercase text-sm font-bold tracking-wider transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <span>Подробнее</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
