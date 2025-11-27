import React from 'react';
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
  const registeredCount = tournament.tournament_registrations?.[0]?.count || 0;
  const maxPlayers = tournament.max_players;
  const spotsLeft = maxPlayers - registeredCount;
  const fillPercentage = (registeredCount / maxPlayers) * 100;
  
  // Calculate countdown
  const now = new Date();
  const startTime = new Date(tournament.start_time);
  const timeUntilStart = startTime.getTime() - now.getTime();
  const hoursUntil = Math.floor(timeUntilStart / (1000 * 60 * 60));
  const minutesUntil = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));
  
  const getStatusBadge = () => {
    if (tournament.status === 'active') {
      return (
        <div className="px-3 py-1 bg-syndikate-red/20 brutal-border text-xs uppercase animate-pulse">
          <span className="text-syndikate-red">● Live</span>
        </div>
      );
    }
    if (tournament.status === 'registration') {
      if (hoursUntil <= 1) {
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
        
        {/* Countdown Timer for upcoming tournaments */}
        {tournament.status === 'registration' && timeUntilStart > 0 && (
          <div className="bg-background/50 brutal-border p-3 space-y-2">
            <div className="text-xs text-syndikate-concrete uppercase text-center">
              Starts In
            </div>
            <div className="flex justify-center gap-2">
              <div className="text-center">
                <div className="text-2xl font-display text-syndikate-orange tabular-nums">
                  {String(hoursUntil).padStart(2, '0')}
                </div>
                <div className="text-xs text-syndikate-concrete uppercase">Hours</div>
              </div>
              <div className="text-2xl font-display text-syndikate-orange animate-pulse">:</div>
              <div className="text-center">
                <div className="text-2xl font-display text-syndikate-orange tabular-nums">
                  {String(minutesUntil).padStart(2, '0')}
                </div>
                <div className="text-xs text-syndikate-concrete uppercase">Minutes</div>
              </div>
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

        {/* Tournament info grid */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-syndikate-concrete/20">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-syndikate-orange" />
            <div>
              <div className="text-xs text-syndikate-concrete">Time</div>
              <div className="text-sm font-display">{new Date(tournament.start_time).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-syndikate-orange" />
            <div>
              <div className="text-xs text-syndikate-concrete">Stack</div>
              <div className="text-sm font-display">{tournament.starting_chips.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
