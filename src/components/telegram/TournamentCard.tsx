import React, { useState, useEffect } from 'react';
import { Trophy, Users, Clock, Calendar, ChevronRight, Zap } from 'lucide-react';
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
    if (tournament.status === 'active') {
      return (
        <div className="px-3 py-1.5 bg-syndikate-red/20 brutal-border text-sm uppercase animate-pulse">
          <span className="text-syndikate-red font-display">● LIVE</span>
        </div>
      );
    }
    if (tournament.status === 'registration') {
      if (daysUntil === 0 && hoursUntil <= 1) {
        return (
          <div className="px-3 py-1.5 bg-syndikate-orange/20 brutal-border text-sm uppercase animate-pulse">
            <span className="text-syndikate-orange font-display">● СКОРО</span>
          </div>
        );
      }
      return (
        <div className="px-3 py-1.5 bg-syndikate-orange/20 brutal-border text-sm uppercase">
          <span className="text-syndikate-orange font-display">● РЕГИСТРАЦИЯ</span>
        </div>
      );
    }
    return null;
  };

  const handleQuickRegister = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickRegister?.();
  };

  return (
    <div
      className="relative bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal overflow-hidden group cursor-pointer hover:shadow-neon-orange transition-all duration-300 hover:scale-[1.01] animate-fade-in"
      onClick={onClick}
      style={{
        animationDelay: `${index * 100}ms`,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Animated glow background */}
      <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/10 via-transparent to-syndikate-red/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute inset-0 industrial-texture opacity-30" />
      
      {/* Metallic shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
      
      {/* Corner brackets */}
      <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-syndikate-orange transition-all group-hover:w-10 group-hover:h-10" />
      <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-syndikate-orange transition-all group-hover:w-10 group-hover:h-10" />

      <div className="relative z-10 p-5 space-y-4">
        {/* Header with name and status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-display mb-2 leading-tight">
              <GlitchText text={tournament.name} />
            </h3>
            {getStatusBadge()}
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-display text-syndikate-orange font-bold">
              {tournament.participation_fee.toLocaleString()}₽
            </div>
            <div className="text-sm text-syndikate-concrete">Взнос</div>
          </div>
        </div>

        {/* PROMINENT DATE & TIME SECTION */}
        <div className="bg-gradient-to-r from-syndikate-orange/20 to-syndikate-red/10 brutal-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-syndikate-orange/20 brutal-border flex items-center justify-center">
                <Calendar className="h-6 w-6 text-syndikate-orange" />
              </div>
              <div>
                <div className="text-2xl font-display text-foreground font-bold">
                  {startTime.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </div>
                <div className="text-sm text-syndikate-concrete uppercase">
                  {startTime.toLocaleDateString('ru-RU', { weekday: 'long' })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-syndikate-orange/20 brutal-border flex items-center justify-center">
                <Clock className="h-6 w-6 text-syndikate-orange" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-display text-syndikate-orange font-bold">
                  {startTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-sm text-syndikate-concrete uppercase">Начало</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Countdown Timer */}
        {tournament.status === 'registration' && timeUntilStart > 0 && (
          <div className="bg-background/40 brutal-border p-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-2 h-2 bg-syndikate-orange rounded-full animate-pulse" />
              <div className="text-sm text-syndikate-orange uppercase font-display tracking-wider">
                До начала осталось
              </div>
            </div>
            <div className="flex justify-center items-center gap-3">
              <div className="flex flex-col items-center bg-syndikate-metal brutal-border px-4 py-3 min-w-[80px]">
                <div className="text-3xl font-display text-syndikate-orange tabular-nums leading-none font-bold">
                  {timeDisplay.primary}
                </div>
                <div className="text-xs text-syndikate-concrete uppercase mt-1 font-display">
                  {timeDisplay.primaryLabel}
                </div>
              </div>
              {timeDisplay.secondary !== null && (
                <>
                  <div className="text-2xl font-display text-syndikate-orange/50">:</div>
                  <div className="flex flex-col items-center bg-syndikate-metal brutal-border px-4 py-3 min-w-[80px]">
                    <div className="text-3xl font-display text-syndikate-orange tabular-nums leading-none font-bold">
                      {timeDisplay.secondary}
                    </div>
                    <div className="text-xs text-syndikate-concrete uppercase mt-1 font-display">
                      {timeDisplay.secondaryLabel}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tournament Format & Stack */}
        <div className="grid grid-cols-2 gap-3">
          {tournament.tournament_format && (
            <div className="bg-background/30 brutal-border p-3 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-syndikate-orange shrink-0" />
              <div>
                <div className="text-xs text-syndikate-concrete uppercase">Формат</div>
                <div className="text-base font-display text-foreground">{tournament.tournament_format}</div>
              </div>
            </div>
          )}
          <div className="bg-background/30 brutal-border p-3 flex items-center gap-2">
            <Zap className="h-5 w-5 text-syndikate-orange shrink-0" />
            <div>
              <div className="text-xs text-syndikate-concrete uppercase">Стек</div>
              <div className="text-base font-display text-foreground">{tournament.starting_chips.toLocaleString()}</div>
            </div>
          </div>
        </div>
        
        {/* Registration Progress Bar */}
        {tournament.status === 'registration' && (
          <div className="space-y-2">
            <div className="flex justify-between text-base">
              <span className="text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-syndikate-orange" />
                <span className="font-display">{registeredCount}/{maxPlayers}</span>
                <span className="text-syndikate-concrete text-sm">игроков</span>
              </span>
              <span className={`font-display ${fillPercentage >= 90 ? "text-syndikate-red animate-pulse" : "text-syndikate-orange"}`}>
                {spotsLeft} мест
              </span>
            </div>
            <div className="h-3 bg-background brutal-border overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  fillPercentage >= 90 
                    ? 'bg-gradient-to-r from-syndikate-red to-syndikate-orange shadow-neon-red animate-pulse' 
                    : 'bg-gradient-to-r from-syndikate-orange to-syndikate-red shadow-neon-orange'
                }`}
                style={{ width: `${fillPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {tournament.status === 'registration' && onQuickRegister && (
            <Button
              onClick={handleQuickRegister}
              className="flex-1 h-12 bg-syndikate-orange hover:bg-syndikate-orange/90 text-syndikate-metal font-display text-base uppercase tracking-wider brutal-border shadow-brutal hover:shadow-neon-orange transition-all"
            >
              <Zap className="h-5 w-5 mr-2" />
              Регистрация
            </Button>
          )}
          <Button
            onClick={onClick}
            variant="outline"
            className="flex-1 h-12 bg-transparent border-syndikate-concrete/30 hover:bg-syndikate-concrete/10 text-foreground font-display text-base uppercase tracking-wider brutal-border"
          >
            Подробнее
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};
