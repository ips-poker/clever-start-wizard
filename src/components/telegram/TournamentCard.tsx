import React, { useState, useEffect } from 'react';
import { Trophy, Users, Clock } from 'lucide-react';
import { GlitchText } from '@/components/ui/glitch-text';

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
}

export const TournamentCard: React.FC<TournamentCardProps> = ({ tournament, index, onClick }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const registeredCount = tournament.tournament_registrations?.[0]?.count || 0;
  const maxPlayers = tournament.max_players;
  const spotsLeft = maxPlayers - registeredCount;
  const fillPercentage = (registeredCount / maxPlayers) * 100;
  
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
    if (tournament.status === 'active') {
      return (
        <div className="px-3 py-1 bg-syndikate-red/20 brutal-border text-xs uppercase animate-pulse">
          <span className="text-syndikate-red">● Live</span>
        </div>
      );
    }
    if (tournament.status === 'registration') {
      if (daysUntil === 0 && hoursUntil <= 1) {
        return (
          <div className="px-3 py-1 bg-syndikate-orange/20 brutal-border text-xs uppercase animate-pulse">
            <span className="text-syndikate-orange">● Starting Soon</span>
          </div>
        );
      }
      return (
        <div className="px-3 py-1 bg-syndikate-orange/20 brutal-border text-xs uppercase">
          <span className="text-syndikate-orange">● Registration</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="relative bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal overflow-hidden group cursor-pointer hover:shadow-neon-orange transition-all duration-300 hover:scale-[1.02] animate-fade-in"
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
      <div className="absolute top-2 left-2 w-8 h-8 border-l-2 border-t-2 border-syndikate-orange transition-all group-hover:w-12 group-hover:h-12" />
      <div className="absolute top-2 right-2 w-8 h-8 border-r-2 border-t-2 border-syndikate-orange transition-all group-hover:w-12 group-hover:h-12" />

      <div className="relative z-10 p-4 space-y-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-lg font-display mb-2">
              <GlitchText text={tournament.name} />
            </h3>
            {getStatusBadge()}
          </div>
          <div className="text-right ml-4">
            <div className="text-xl font-display text-syndikate-orange">
              {tournament.participation_fee.toLocaleString()}₽
            </div>
            <div className="text-xs text-syndikate-concrete">Entry Fee</div>
          </div>
        </div>
        
        {/* Enhanced Live Countdown Timer for upcoming tournaments */}
        {tournament.status === 'registration' && timeUntilStart > 0 && (
          <div className="bg-syndikate-concrete/10 brutal-border p-3 space-y-2 backdrop-blur-sm animate-fade-in">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-syndikate-orange animate-pulse" />
              <div className="text-xs text-syndikate-orange uppercase font-display tracking-wider">
                Начало через
              </div>
            </div>
            <div className="flex justify-center items-center gap-2">
              <div className="flex flex-col items-center bg-background/50 brutal-border px-3 py-2 min-w-[65px] transition-all duration-300 hover:scale-105">
                <div className="text-2xl font-display text-syndikate-orange tabular-nums leading-none animate-fade-in">
                  {timeDisplay.primary}
                </div>
                <div className="text-[10px] text-syndikate-concrete uppercase mt-1 font-display">
                  {timeDisplay.primaryLabel}
                </div>
              </div>
              {timeDisplay.secondary !== null && (
                <>
                  <div className="text-xl font-display text-syndikate-orange animate-pulse">•</div>
                  <div className="flex flex-col items-center bg-background/50 brutal-border px-3 py-2 min-w-[65px] transition-all duration-300 hover:scale-105">
                    <div className="text-2xl font-display text-syndikate-orange tabular-nums leading-none animate-fade-in">
                      {timeDisplay.secondary}
                    </div>
                    <div className="text-[10px] text-syndikate-concrete uppercase mt-1 font-display">
                      {timeDisplay.secondaryLabel}
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Live indicator */}
            <div className="flex items-center justify-center gap-1 mt-1">
              <div className="w-1 h-1 bg-syndikate-orange rounded-full animate-pulse" />
              <div className="text-[10px] text-syndikate-concrete/60 uppercase tracking-wide">
                Live
              </div>
            </div>
          </div>
        )}
        
        {/* Tournament Description */}
        {tournament.description && (
          <div className="bg-background/30 brutal-border p-3">
            <div className="text-xs text-foreground/80 line-clamp-2">
              {tournament.description}
            </div>
          </div>
        )}
        
        {/* Tournament Format Badge */}
        {tournament.tournament_format && (
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-syndikate-orange/10 brutal-border">
              <span className="text-xs text-syndikate-orange uppercase font-display">
                {tournament.tournament_format}
              </span>
            </div>
          </div>
        )}
        
        {/* Registration Progress Bar */}
        {tournament.status === 'registration' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-syndikate-concrete">
                {registeredCount}/{maxPlayers} Players
              </span>
              <span className={fillPercentage >= 90 ? "text-syndikate-red animate-pulse" : "text-syndikate-orange"}>
                {spotsLeft} spots left
              </span>
            </div>
            <div className="h-2 bg-background brutal-border overflow-hidden">
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

        {/* Tournament info grid - Enhanced with more details */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-syndikate-concrete/20">
          <div className="flex flex-col items-center gap-1 p-2 bg-background/20 brutal-border hover:bg-background/30 transition-colors">
            <Clock className="h-4 w-4 text-syndikate-orange" />
            <div className="text-xs text-syndikate-concrete">Время</div>
            <div className="text-sm font-display text-foreground">{new Date(tournament.start_time).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}</div>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 bg-background/20 brutal-border hover:bg-background/30 transition-colors">
            <Trophy className="h-4 w-4 text-syndikate-orange" />
            <div className="text-xs text-syndikate-concrete">Стек</div>
            <div className="text-sm font-display text-foreground">{tournament.starting_chips.toLocaleString()}</div>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 bg-background/20 brutal-border hover:bg-background/30 transition-colors">
            <Users className="h-4 w-4 text-syndikate-orange" />
            <div className="text-xs text-syndikate-concrete">Макс</div>
            <div className="text-sm font-display text-foreground">{maxPlayers}</div>
          </div>
        </div>
        
        {/* Additional tournament details */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-syndikate-concrete/10">
          <div className="flex items-center gap-1 text-syndikate-concrete">
            <span>📅</span>
            <span>{new Date(tournament.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
          </div>
          {tournament.status === 'registration' && (
            <div className="flex items-center gap-1 text-syndikate-orange font-display">
              <span>→</span>
              <span className="uppercase text-[10px] tracking-wider">Tap to register</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
