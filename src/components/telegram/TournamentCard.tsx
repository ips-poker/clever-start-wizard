import React, { useState, useEffect } from 'react';
import { Trophy, Users, Clock, ChevronRight, Zap, Flame, Coins, Timer } from 'lucide-react';
import { GlitchText } from '@/components/ui/glitch-text';
import { Button } from '@/components/ui/button';

interface Tournament {
  id: string;
  name: string;
  start_time: string;
  participation_fee: number;
  max_players: number;
  status: string;
  starting_chips: number;
  description?: string;
  tournament_format?: string;
  tournament_registrations?: Array<{
    count: number;
  }>;
}

interface TournamentCardProps {
  tournament: Tournament;
  index: number;
  onClick: () => void;
  onQuickRegister?: () => void;
}

export const TournamentCard: React.FC<TournamentCardProps> = ({ 
  tournament, 
  index, 
  onClick,
  onQuickRegister 
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const registeredCount = tournament.tournament_registrations?.[0]?.count || 0;
  const maxPlayers = tournament.max_players;
  const spotsLeft = maxPlayers - registeredCount;
  const fillPercentage = Math.min((registeredCount / maxPlayers) * 100, 100);
  const isHot = spotsLeft <= 3 && spotsLeft > 0;
  const isFull = spotsLeft === 0;
  const isAlmostFull = fillPercentage >= 80;
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second for more precise countdown
    
    return () => clearInterval(timer);
  }, []);
  
  const startTime = new Date(tournament.start_time);
  const timeUntilStart = startTime.getTime() - currentTime.getTime();
  const daysUntil = Math.floor(timeUntilStart / (1000 * 60 * 60 * 24));
  const hoursUntil = Math.floor((timeUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutesUntil = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));
  const secondsUntil = Math.floor((timeUntilStart % (1000 * 60)) / 1000);
  
  const isLive = tournament.status === 'active';
  const isUrgent = daysUntil === 0 && hoursUntil <= 2;
  const isStartingSoon = daysUntil === 0 && hoursUntil === 0 && minutesUntil <= 30;
  
  const getCountdownDisplay = () => {
    if (daysUntil > 0) {
      return { value: `${daysUntil}д ${hoursUntil}ч`, urgent: false };
    } else if (hoursUntil > 0) {
      return { value: `${hoursUntil}ч ${minutesUntil}м`, urgent: hoursUntil <= 2 };
    } else if (minutesUntil > 0) {
      return { value: `${minutesUntil}:${secondsUntil.toString().padStart(2, '0')}`, urgent: true };
    } else {
      return { value: 'СКОРО', urgent: true };
    }
  };
  
  const countdown = getCountdownDisplay();

  const handleQuickRegister = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickRegister?.();
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('ru-RU');
  };

  const getStatusConfig = () => {
    if (isLive) {
      return { label: 'LIVE', color: 'syndikate-red', pulse: true };
    }
    if (isStartingSoon) {
      return { label: 'СКОРО', color: 'syndikate-orange', pulse: true };
    }
    if (isFull) {
      return { label: 'FULL', color: 'foreground/50', pulse: false };
    }
    return null;
  };

  const status = getStatusConfig();

  return (
    <div
      className={`relative overflow-hidden group cursor-pointer transition-all duration-300 ease-out animate-fade-in ${
        isHot 
          ? 'bg-gradient-to-br from-syndikate-metal via-syndikate-metal to-syndikate-red/10 ring-2 ring-syndikate-red/60 shadow-neon-red' 
          : isLive
          ? 'bg-gradient-to-br from-syndikate-metal via-syndikate-metal to-syndikate-red/20 ring-2 ring-syndikate-red shadow-neon-red'
          : 'bg-syndikate-metal/95 shadow-brutal hover:shadow-neon-orange'
      } brutal-border backdrop-blur-xl hover:translate-y-[-2px]`}
      onClick={onClick}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${
        isHot || isLive
          ? 'bg-gradient-to-r from-syndikate-red via-syndikate-orange to-syndikate-red animate-pulse'
          : 'bg-gradient-to-r from-transparent via-syndikate-orange/50 to-transparent'
      }`} />
      
      {/* Corner accents */}
      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-syndikate-orange/60 transition-all duration-300 group-hover:w-6 group-hover:h-6 group-hover:border-syndikate-orange" />
      <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-syndikate-orange/60 transition-all duration-300 group-hover:w-6 group-hover:h-6 group-hover:border-syndikate-orange" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-syndikate-orange/60 transition-all duration-300 group-hover:w-6 group-hover:h-6 group-hover:border-syndikate-orange" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-syndikate-orange/60 transition-all duration-300 group-hover:w-6 group-hover:h-6 group-hover:border-syndikate-orange" />
      
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute inset-0 industrial-texture opacity-10" />
      
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />

      <div className="relative z-10 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-display font-black leading-tight text-foreground tracking-tight">
              <GlitchText text={tournament.name} />
            </h3>
            {tournament.tournament_format && (
              <div className="flex items-center gap-1.5 mt-2">
                <Trophy className="h-3.5 w-3.5 text-syndikate-orange/70" />
                <span className="text-sm text-foreground/60 font-medium">{tournament.tournament_format}</span>
              </div>
            )}
          </div>
          
          {/* Status Badge */}
          {(status || isHot) && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 brutal-border shrink-0 ${
              isHot && !status ? 'bg-syndikate-red/20' : `bg-${status?.color}/20`
            } ${status?.pulse || isHot ? 'animate-pulse' : ''}`}>
              {isHot && !status && <Flame className="h-4 w-4 text-syndikate-red" />}
              <span className={`font-display font-black text-xs uppercase tracking-wider ${
                isHot && !status ? 'text-syndikate-red' : status?.color === 'syndikate-red' ? 'text-syndikate-red' : status?.color === 'syndikate-orange' ? 'text-syndikate-orange' : 'text-foreground/50'
              }`}>
                {isHot && !status ? 'HOT' : status?.label}
              </span>
            </div>
          )}
        </div>

        {/* Main Time Block */}
        <div className={`brutal-border p-4 mb-4 ${
          isUrgent || isLive
            ? 'bg-gradient-to-r from-syndikate-red/15 to-syndikate-orange/10'
            : 'bg-gradient-to-r from-syndikate-orange/10 to-transparent'
        }`}>
          <div className="flex items-center justify-between gap-4">
            {/* Date & Time */}
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 brutal-border flex items-center justify-center shrink-0 ${
                isUrgent ? 'bg-syndikate-red/30' : 'bg-syndikate-orange/20'
              }`}>
                <Clock className={`h-5 w-5 ${isUrgent ? 'text-syndikate-red' : 'text-syndikate-orange'}`} />
              </div>
              <div>
                <div className={`text-2xl font-display font-black tabular-nums tracking-tight ${
                  isUrgent ? 'text-syndikate-red' : 'text-syndikate-orange'
                }`}>
                  {startTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-sm text-foreground/70 font-semibold capitalize">
                  {startTime.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' })}
                </div>
              </div>
            </div>
            
            {/* Countdown */}
            {tournament.status === 'registration' && timeUntilStart > 0 && (
              <div className={`text-right px-4 py-2 brutal-border ${
                countdown.urgent ? 'bg-syndikate-red/20' : 'bg-background/40'
              } ${countdown.urgent ? 'animate-pulse' : ''}`}>
                <div className="flex items-center gap-2 justify-end">
                  <Timer className={`h-4 w-4 ${countdown.urgent ? 'text-syndikate-red' : 'text-foreground/50'}`} />
                  <span className={`text-xl font-display font-black tabular-nums ${
                    countdown.urgent ? 'text-syndikate-red' : 'text-foreground'
                  }`}>
                    {countdown.value}
                  </span>
                </div>
                <div className={`text-[10px] uppercase tracking-widest font-bold mt-0.5 ${
                  countdown.urgent ? 'text-syndikate-red/70' : 'text-foreground/50'
                }`}>
                  до старта
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Buy-in */}
          <div className="bg-background/30 brutal-border p-3 group/stat hover:bg-background/50 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="h-4 w-4 text-syndikate-orange" />
              <span className="text-[10px] text-foreground/50 uppercase tracking-widest font-bold">Взнос</span>
            </div>
            <div className="text-2xl font-display text-syndikate-orange font-black tabular-nums">
              {formatNumber(tournament.participation_fee)}
              <span className="text-lg ml-0.5">₽</span>
            </div>
          </div>
          
          {/* Stack */}
          <div className="bg-background/30 brutal-border p-3 group/stat hover:bg-background/50 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-syndikate-orange" />
              <span className="text-[10px] text-foreground/50 uppercase tracking-widest font-bold">Стек</span>
            </div>
            <div className="text-2xl font-display text-foreground font-black tabular-nums">
              {formatNumber(tournament.starting_chips)}
            </div>
          </div>
        </div>
        
        {/* Registration Progress */}
        {tournament.status === 'registration' && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Users className={`h-4 w-4 ${isHot ? 'text-syndikate-red' : 'text-syndikate-orange'}`} />
                <span className="text-sm font-semibold text-foreground/80">
                  <span className="font-display font-black text-foreground">{registeredCount}</span>
                  <span className="text-foreground/40 mx-1">/</span>
                  <span className="text-foreground/60">{maxPlayers}</span>
                </span>
              </div>
              <span className={`text-sm font-display font-black ${
                isFull 
                  ? 'text-foreground/40' 
                  : isHot 
                  ? 'text-syndikate-red animate-pulse' 
                  : isAlmostFull 
                  ? 'text-syndikate-orange' 
                  : 'text-foreground/60'
              }`}>
                {isFull ? 'Мест нет' : `${spotsLeft} ${spotsLeft === 1 ? 'место' : spotsLeft < 5 ? 'места' : 'мест'}`}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="h-2.5 bg-background/60 brutal-border overflow-hidden">
              <div 
                className={`h-full transition-all duration-700 ease-out relative ${
                  isFull
                    ? 'bg-foreground/30'
                    : isHot 
                    ? 'bg-gradient-to-r from-syndikate-red to-syndikate-orange' 
                    : isAlmostFull
                    ? 'bg-gradient-to-r from-syndikate-orange to-syndikate-red/80'
                    : 'bg-syndikate-orange'
                }`}
                style={{ width: `${fillPercentage}%` }}
              >
                {/* Shine on progress bar */}
                {!isFull && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {tournament.status === 'registration' && onQuickRegister && !isFull && (
            <Button
              onClick={handleQuickRegister}
              className={`flex-[2] h-12 font-display text-base uppercase tracking-wider brutal-border transition-all duration-300 font-black ${
                isHot 
                  ? 'bg-syndikate-red hover:bg-syndikate-red/90 text-white shadow-neon-red hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]' 
                  : 'bg-syndikate-orange hover:bg-syndikate-orange/90 text-syndikate-metal shadow-brutal hover:shadow-neon-orange'
              }`}
            >
              <Zap className={`h-5 w-5 mr-2 ${isHot ? 'animate-pulse' : ''}`} />
              {isHot ? 'Успей!' : 'Играть'}
            </Button>
          )}
          <Button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            variant="outline"
            className={`${
              tournament.status === 'registration' && onQuickRegister && !isFull ? 'flex-1' : 'flex-1'
            } h-12 bg-transparent border-2 border-foreground/20 hover:border-syndikate-orange hover:bg-syndikate-orange/10 text-foreground font-display text-sm uppercase tracking-wider brutal-border font-bold transition-all duration-300`}
          >
            Детали
            <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
