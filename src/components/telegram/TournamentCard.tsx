import React, { useState, useEffect } from 'react';
import { Trophy, Users, Clock, Calendar, Coins, Target, Zap, Shield, ChevronRight, Gem } from 'lucide-react';
import { GlitchText } from '@/components/ui/glitch-text';
import { calculateTotalRPSPool, formatRPSPoints } from '@/utils/rpsCalculations';

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
  reentry_fee?: number;
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
  
  // Live countdown timer - updates every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
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
      return `${daysUntil}д ${hoursUntil}ч`;
    } else if (hoursUntil > 0) {
      return `${hoursUntil}ч ${minutesUntil}м`;
    } else {
      return `${minutesUntil}м`;
    }
  };
  
  // Get format icon
  const getFormatIcon = () => {
    switch (tournament.tournament_format) {
      case 'rebuy':
        return <Zap className="h-3 w-3" />;
      case 'reentry':
        return <Shield className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <div
      className="relative group cursor-pointer animate-fade-in"
      onClick={onClick}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* External Neon Glow Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-syndikate-orange via-syndikate-red to-syndikate-orange rounded opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500"></div>
      
      <div className="relative bg-gradient-to-br from-syndikate-metal/95 to-syndikate-concrete/90 brutal-border backdrop-blur-xl overflow-hidden transition-all duration-500 hover:shadow-neon-orange">
        {/* Warning Stripes at Top */}
        <div 
          className="absolute top-0 left-0 right-0 h-1.5 opacity-50"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(255, 135, 31, 0.4), rgba(255, 135, 31, 0.4) 6px, transparent 6px, transparent 12px)'
          }}
        />
        
        {/* Corner Brackets */}
        <div className="absolute top-2 left-2 w-5 h-5 border-l-2 border-t-2 border-syndikate-orange transition-all duration-300 group-hover:w-7 group-hover:h-7" />
        <div className="absolute top-2 right-2 w-5 h-5 border-r-2 border-t-2 border-syndikate-orange transition-all duration-300 group-hover:w-7 group-hover:h-7" />
        <div className="absolute bottom-2 left-2 w-5 h-5 border-l-2 border-b-2 border-syndikate-orange transition-all duration-300 group-hover:w-7 group-hover:h-7" />
        <div className="absolute bottom-2 right-2 w-5 h-5 border-r-2 border-b-2 border-syndikate-orange transition-all duration-300 group-hover:w-7 group-hover:h-7" />
        
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/10 via-transparent to-syndikate-red/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Industrial Texture */}
        <div className="absolute inset-0 industrial-texture opacity-20" />
        
        {/* Metal Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 135, 31, 0.1) 2px, rgba(255, 135, 31, 0.1) 3px),
              repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255, 135, 31, 0.1) 2px, rgba(255, 135, 31, 0.1) 3px)
            `,
            backgroundSize: '20px 20px'
          }}
        />
        
        {/* Animated Orange Glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-syndikate-orange/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-syndikate-red/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Metallic shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

        <div className="relative z-10 p-4 pt-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              {/* Status badges with icon */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 bg-syndikate-orange brutal-border flex items-center justify-center animate-pulse shadow-neon-orange">
                  <Target className="h-3.5 w-3.5 text-background" />
                </div>
                <div className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider brutal-border ${
                  tournament.status === 'active' 
                    ? 'bg-syndikate-red/20 text-syndikate-red border border-syndikate-red/50 animate-pulse' 
                    : 'bg-syndikate-orange/20 text-syndikate-orange border border-syndikate-orange/50'
                }`}>
                  {tournament.status === 'active' ? '● LIVE' : '● OPEN'}
                </div>
                {tournament.tournament_format && (
                  <div className="px-2 py-1 bg-syndikate-metal/50 brutal-border border border-border text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                    {getFormatIcon()}
                    {tournament.tournament_format}
                  </div>
                )}
              </div>
              
              {/* Tournament name */}
              <h3 className="text-lg font-display font-bold text-foreground tracking-wide uppercase group-hover:text-syndikate-orange transition-colors duration-300 leading-tight">
                <GlitchText text={tournament.name} glitchIntensity="low" />
              </h3>
            </div>
            
            {/* Ticket Number */}
            <div className="bg-syndikate-orange/20 border border-syndikate-orange/50 px-2 py-1 brutal-border ml-2">
              <span className="text-[9px] text-syndikate-orange font-bold tracking-widest">#{ticketNumber}</span>
            </div>
          </div>
          
          {/* Warning Badges */}
          {(isFilling || (timeUntilStart > 0 && tournament.status === 'registration')) && (
            <div className="flex gap-2 mb-3">
              {isFilling && (
                <div className="px-2 py-1 bg-syndikate-red/20 text-syndikate-red border border-syndikate-red/50 brutal-border text-[10px] font-bold uppercase flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {spotsLeft} мест
                </div>
              )}
              {timeUntilStart > 0 && tournament.status === 'registration' && (
                <div className="px-2 py-1 bg-syndikate-metal/50 border border-border brutal-border text-[10px] font-bold uppercase flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3 text-syndikate-orange animate-pulse" />
                  {getTimeDisplay()}
                </div>
              )}
            </div>
          )}
          
          {/* Divider Line */}
          <div className="h-[2px] bg-gradient-to-r from-syndikate-orange via-syndikate-red to-syndikate-orange mb-3 opacity-50" />
          
          {/* Main info grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* Date & Time */}
            <div className="bg-syndikate-metal/30 brutal-border p-2.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-10 h-10 bg-syndikate-orange/10 rounded-full blur-xl" />
              <div className="relative">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-6 h-6 bg-syndikate-orange brutal-border flex items-center justify-center">
                    <Calendar className="h-3 w-3 text-background" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Дата</span>
                </div>
                <div className="text-foreground/80 text-xs mb-0.5">
                  {new Date(tournament.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </div>
                <div className="font-display text-lg text-syndikate-orange">
                  {new Date(tournament.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            
            {/* Buy-in */}
            <div className="bg-syndikate-metal/30 brutal-border p-2.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-12 h-12 bg-syndikate-orange/15 rounded-full blur-xl" />
              <div className="relative">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-6 h-6 bg-syndikate-orange brutal-border flex items-center justify-center">
                    <Coins className="h-3 w-3 text-background" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Взнос</span>
                </div>
                <div className="font-display text-xl text-syndikate-orange">
                  {tournament.participation_fee.toLocaleString()}₽
                </div>
                {tournament.reentry_fee && tournament.reentry_fee > 0 && (
                  <div className="text-muted-foreground text-[9px] uppercase tracking-wider">
                    Re: {tournament.reentry_fee.toLocaleString()}₽
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Secondary info row */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <div className="bg-syndikate-metal/30 brutal-border p-2 text-center group/stat hover:bg-syndikate-metal/50 transition-colors">
              <div className="w-6 h-6 bg-syndikate-orange/80 brutal-border flex items-center justify-center mx-auto mb-1">
                <Users className="h-3 w-3 text-background" />
              </div>
              <div className="text-foreground font-bold text-sm">
                {registeredCount}/{maxPlayers}
              </div>
              <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Игроков</div>
            </div>
            <div className="bg-syndikate-metal/30 brutal-border p-2 text-center group/stat hover:bg-syndikate-metal/50 transition-colors">
              <div className="w-6 h-6 bg-syndikate-orange/80 brutal-border flex items-center justify-center mx-auto mb-1">
                <Gem className="h-3 w-3 text-background" />
              </div>
              <div className="text-foreground font-bold text-sm">
                {(tournament.starting_chips / 1000).toFixed(0)}K
              </div>
              <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Стек</div>
            </div>
            <div className="bg-syndikate-metal/30 brutal-border p-2 text-center group/stat hover:bg-syndikate-metal/50 transition-colors">
              <div className="w-6 h-6 bg-syndikate-orange/80 brutal-border flex items-center justify-center mx-auto mb-1">
                <Trophy className="h-3 w-3 text-background" />
              </div>
              <div className="text-foreground font-bold text-sm">
                {calculateTotalRPSPool(registeredCount, tournament.participation_fee || 0, 0, tournament.reentry_fee || 0, 0, 0)}
              </div>
              <div className="text-[8px] text-muted-foreground uppercase tracking-wider">RPS</div>
            </div>
          </div>
          
          {/* Registration progress */}
          {tournament.status === 'registration' && (
            <div className="bg-syndikate-metal/20 brutal-border p-2.5 mb-3">
              <div className="flex justify-between text-[10px] mb-1.5">
                <span className="text-muted-foreground uppercase tracking-wider font-bold">Регистрация</span>
                <span className={`font-bold uppercase tracking-wider ${
                  fillPercentage >= 90 ? 'text-syndikate-red animate-pulse' : 'text-syndikate-orange'
                }`}>
                  {fillPercentage >= 90 && <Zap className="h-3 w-3 inline mr-0.5" />}
                  {spotsLeft} мест
                </span>
              </div>
              <div className="h-2.5 bg-background brutal-border overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    fillPercentage >= 90 
                      ? 'bg-gradient-to-r from-syndikate-red to-syndikate-orange shadow-[0_0_10px_rgba(255,59,48,0.5)] animate-pulse' 
                      : 'bg-gradient-to-r from-syndikate-orange to-syndikate-red shadow-[0_0_8px_rgba(255,107,0,0.3)]'
                  }`}
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
            </div>
          )}
          
          {/* CTA */}
          <div className="flex items-center justify-between pt-2 border-t border-syndikate-concrete/20">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <div className="w-1.5 h-1.5 bg-syndikate-orange rounded-full animate-pulse" />
              <span className="uppercase tracking-wider">Live update</span>
            </div>
            <div className="flex items-center gap-1 text-syndikate-orange font-bold uppercase text-[10px] tracking-wider group-hover:translate-x-1 transition-transform duration-300">
              <span>Подробнее</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
