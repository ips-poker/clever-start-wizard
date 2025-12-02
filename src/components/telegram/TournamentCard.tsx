import React, { useState, useEffect } from 'react';
import { Trophy, Users, Clock, ChevronRight, Zap, Flame } from 'lucide-react';
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
  const fillPercentage = (registeredCount / maxPlayers) * 100;
  const isHot = spotsLeft <= 3 && spotsLeft > 0;
  const isAlmostFull = fillPercentage >= 80;
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);
  
  const startTime = new Date(tournament.start_time);
  const timeUntilStart = startTime.getTime() - currentTime.getTime();
  const daysUntil = Math.floor(timeUntilStart / (1000 * 60 * 60 * 24));
  const hoursUntil = Math.floor((timeUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutesUntil = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));
  const isUrgent = daysUntil === 0 && hoursUntil <= 2;
  
  const getCountdownText = () => {
    if (daysUntil > 0) {
      return `${daysUntil}д ${hoursUntil}ч`;
    } else if (hoursUntil > 0) {
      return `${hoursUntil}ч ${minutesUntil}м`;
    } else {
      return `${minutesUntil} мин`;
    }
  };

  const handleQuickRegister = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickRegister?.();
  };

  return (
    <div
      className={`relative bg-syndikate-metal/95 brutal-border backdrop-blur-xl overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.01] animate-fade-in ${
        isHot ? 'shadow-neon-red ring-2 ring-syndikate-red/50' : 'shadow-brutal hover:shadow-neon-orange'
      }`}
      onClick={onClick}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Hot indicator */}
      {isHot && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-syndikate-red via-syndikate-orange to-syndikate-red h-1 animate-pulse" />
      )}
      
      {/* Animated glow background */}
      <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/10 via-transparent to-syndikate-red/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute inset-0 industrial-texture opacity-20" />
      
      {/* Metallic shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

      <div className="relative z-10 p-4 space-y-4">
        {/* Header: Name + Hot badge */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-display font-bold leading-tight text-foreground flex-1">
            <GlitchText text={tournament.name} />
          </h3>
          {isHot && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-syndikate-red/30 brutal-border animate-pulse shrink-0">
              <Flame className="h-4 w-4 text-syndikate-red" />
              <span className="text-syndikate-red font-display font-bold text-sm uppercase">HOT</span>
            </div>
          )}
        </div>

        {/* Main Info Block: Date/Time + Countdown combined */}
        <div className="bg-gradient-to-r from-syndikate-orange/20 to-syndikate-red/10 brutal-border p-4">
          <div className="flex items-center justify-between">
            {/* Date & Time */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-syndikate-orange/30 brutal-border flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6 text-syndikate-orange" />
              </div>
              <div>
                <div className="text-2xl font-display text-syndikate-orange font-bold">
                  {startTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-base text-foreground/80 font-medium">
                  {startTime.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' })}
                </div>
              </div>
            </div>
            
            {/* Countdown */}
            {tournament.status === 'registration' && timeUntilStart > 0 && (
              <div className={`text-right px-4 py-2 brutal-border ${isUrgent ? 'bg-syndikate-red/20 animate-pulse' : 'bg-background/50'}`}>
                <div className={`text-2xl font-display font-bold tabular-nums ${isUrgent ? 'text-syndikate-red' : 'text-foreground'}`}>
                  {getCountdownText()}
                </div>
                <div className={`text-xs uppercase tracking-wide font-medium ${isUrgent ? 'text-syndikate-red/80' : 'text-foreground/60'}`}>
                  до старта
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="flex gap-3">
          {/* Buy-in */}
          <div className="flex-1 bg-background/40 brutal-border p-3 text-center">
            <div className="text-2xl font-display text-syndikate-orange font-bold">
              {tournament.participation_fee.toLocaleString()}₽
            </div>
            <div className="text-xs text-foreground/60 uppercase font-medium mt-1">Взнос</div>
          </div>
          
          {/* Stack */}
          <div className="flex-1 bg-background/40 brutal-border p-3 text-center">
            <div className="text-2xl font-display text-foreground font-bold flex items-center justify-center gap-1.5">
              <Zap className="h-5 w-5 text-syndikate-orange" />
              {(tournament.starting_chips / 1000).toFixed(0)}K
            </div>
            <div className="text-xs text-foreground/60 uppercase font-medium mt-1">Стек</div>
          </div>
          
          {/* Format */}
          {tournament.tournament_format && (
            <div className="flex-1 bg-background/40 brutal-border p-3 text-center">
              <div className="text-lg font-display text-foreground font-bold flex items-center justify-center gap-1.5">
                <Trophy className="h-5 w-5 text-syndikate-orange" />
                <span className="truncate">{tournament.tournament_format}</span>
              </div>
              <div className="text-xs text-foreground/60 uppercase font-medium mt-1">Формат</div>
            </div>
          )}
        </div>
        
        {/* Registration Progress */}
        {tournament.status === 'registration' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-foreground flex items-center gap-2 text-base font-medium">
                <Users className="h-5 w-5 text-syndikate-orange" />
                <span className="font-display font-bold">{registeredCount}</span>
                <span className="text-foreground/50">/ {maxPlayers}</span>
              </span>
              <span className={`font-display font-bold text-base ${isHot ? "text-syndikate-red animate-pulse" : isAlmostFull ? "text-syndikate-orange" : "text-foreground/70"}`}>
                {spotsLeft === 0 ? 'FULL' : `${spotsLeft} мест`}
              </span>
            </div>
            <div className="h-3 bg-background brutal-border overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  isHot 
                    ? 'bg-gradient-to-r from-syndikate-red to-syndikate-orange shadow-neon-red animate-pulse' 
                    : isAlmostFull
                    ? 'bg-gradient-to-r from-syndikate-orange to-syndikate-red shadow-neon-orange'
                    : 'bg-syndikate-orange'
                }`}
                style={{ width: `${fillPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-1">
          {tournament.status === 'registration' && onQuickRegister && spotsLeft > 0 && (
            <Button
              onClick={handleQuickRegister}
              className={`flex-[2] h-14 font-display text-lg uppercase tracking-wider brutal-border transition-all font-bold ${
                isHot 
                  ? 'bg-syndikate-red hover:bg-syndikate-red/90 text-white shadow-neon-red animate-pulse' 
                  : 'bg-syndikate-orange hover:bg-syndikate-orange/90 text-syndikate-metal shadow-brutal hover:shadow-neon-orange'
              }`}
            >
              <Zap className="h-5 w-5 mr-2" />
              {isHot ? 'Успей!' : 'Регистрация'}
            </Button>
          )}
          <Button
            onClick={onClick}
            variant="outline"
            className={`${tournament.status === 'registration' && onQuickRegister && spotsLeft > 0 ? 'flex-1' : 'flex-1'} h-14 bg-transparent border-2 border-foreground/30 hover:bg-foreground/10 hover:border-syndikate-orange text-foreground font-display text-base uppercase tracking-wider brutal-border font-bold`}
          >
            Детали
            <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
