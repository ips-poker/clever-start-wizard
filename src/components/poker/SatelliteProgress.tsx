/**
 * SatelliteProgress - Shows progress towards winning tickets in satellite tournaments
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Ticket, Trophy, Users, TrendingUp, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface SatelliteProgressProps {
  tournamentId: string;
  currentPlayerId?: string;
  className?: string;
}

interface TicketCandidate {
  playerId: string;
  playerName: string;
  avatarUrl: string | null;
  chips: number;
  position: number;
  inTicketZone: boolean;
  isCurrentPlayer: boolean;
}

interface SatelliteInfo {
  ticketsAwarded: number;
  ticketValue: number;
  totalPlayers: number;
  playersRemaining: number;
}

export function SatelliteProgress({
  tournamentId,
  currentPlayerId,
  className
}: SatelliteProgressProps) {
  const [candidates, setCandidates] = useState<TicketCandidate[]>([]);
  const [satelliteInfo, setSatelliteInfo] = useState<SatelliteInfo | null>(null);
  const [isSatellite, setIsSatellite] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;

    const fetchSatelliteData = async () => {
      // Check if satellite tournament
      const { data: tournament } = await supabase
        .from('online_poker_tournaments')
        .select('tickets_for_top, ticket_value')
        .eq('id', tournamentId)
        .single();

      if (!tournament || !tournament.tickets_for_top) {
        setIsSatellite(false);
        return;
      }

      setIsSatellite(true);

      // Get participant counts
      const { count: totalCount } = await supabase
        .from('online_poker_tournament_participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId);

      const { count: activeCount } = await supabase
        .from('online_poker_tournament_participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('status', 'playing');

      setSatelliteInfo({
        ticketsAwarded: tournament.tickets_for_top,
        ticketValue: tournament.ticket_value || 1000,
        totalPlayers: totalCount || 0,
        playersRemaining: activeCount || 0
      });

      // Get top players by chips
      const { data: topPlayers } = await supabase
        .from('online_poker_tournament_participants')
        .select(`
          player_id,
          chips,
          players:player_id (name, avatar_url)
        `)
        .eq('tournament_id', tournamentId)
        .eq('status', 'playing')
        .order('chips', { ascending: false })
        .limit(Math.min(tournament.tickets_for_top + 3, 10));

      if (topPlayers) {
        setCandidates(topPlayers.map((p, index) => ({
          playerId: p.player_id,
          playerName: (p.players as any)?.name || 'Unknown',
          avatarUrl: (p.players as any)?.avatar_url || null,
          chips: p.chips || 0,
          position: index + 1,
          inTicketZone: index < tournament.tickets_for_top,
          isCurrentPlayer: p.player_id === currentPlayerId
        })));
      }
    };

    fetchSatelliteData();

    // Subscribe to updates
    const channel = supabase
      .channel(`satellite-${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'online_poker_tournament_participants',
        filter: `tournament_id=eq.${tournamentId}`
      }, () => {
        fetchSatelliteData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, currentPlayerId]);

  if (!isSatellite || !satelliteInfo) {
    return null;
  }

  const currentPlayerPosition = candidates.find(c => c.isCurrentPlayer)?.position || 0;
  const isInTicketZone = currentPlayerPosition > 0 && currentPlayerPosition <= satelliteInfo.ticketsAwarded;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-gradient-to-br from-amber-900/80 to-black/60 backdrop-blur-md",
        "rounded-xl border border-amber-500/30 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-amber-500/20 border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-amber-400" />
          <span className="text-white font-bold">Сателлит</span>
        </div>
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <span>{satelliteInfo.ticketsAwarded}</span>
          <span className="text-white/60 text-sm font-normal">билетов</span>
        </div>
      </div>

      {/* Ticket Value */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-white/60 text-sm">Стоимость билета:</span>
          <span className="text-amber-400 font-bold text-lg">
            {satelliteInfo.ticketValue.toLocaleString()} 💎
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2 text-white/50 text-xs">
          <Users className="h-3.5 w-3.5" />
          <span>{satelliteInfo.playersRemaining} из {satelliteInfo.totalPlayers} осталось</span>
        </div>
      </div>

      {/* Current Player Status */}
      {currentPlayerId && currentPlayerPosition > 0 && (
        <div className={cn(
          "px-4 py-3 border-b border-white/10",
          isInTicketZone ? "bg-green-500/10" : "bg-red-500/10"
        )}>
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm">Ваша позиция:</span>
            <div className="flex items-center gap-2">
              {isInTicketZone ? (
                <Crown className="h-4 w-4 text-amber-400" />
              ) : (
                <TrendingUp className="h-4 w-4 text-red-400" />
              )}
              <span className={cn(
                "font-bold text-lg",
                isInTicketZone ? "text-green-400" : "text-red-400"
              )}>
                #{currentPlayerPosition}
              </span>
            </div>
          </div>
          {!isInTicketZone && (
            <div className="mt-1 text-xs text-red-400">
              До билета: {currentPlayerPosition - satelliteInfo.ticketsAwarded} позиции
            </div>
          )}
        </div>
      )}

      {/* Progress to tickets */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between text-xs text-white/50 mb-1">
          <span>Прогресс до билетной зоны</span>
          <span>{satelliteInfo.ticketsAwarded}/{satelliteInfo.playersRemaining}</span>
        </div>
        <Progress 
          value={(satelliteInfo.ticketsAwarded / satelliteInfo.playersRemaining) * 100} 
          className="h-2"
        />
      </div>

      {/* Ticket Zone Leaderboard */}
      <div className="px-4 py-3">
        <div className="text-white/60 text-xs mb-2">Билетная зона:</div>
        <div className="space-y-2">
          {candidates.slice(0, satelliteInfo.ticketsAwarded + 2).map((candidate, index) => (
            <div
              key={candidate.playerId}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg",
                candidate.inTicketZone 
                  ? "bg-green-500/20 border border-green-500/30" 
                  : "bg-red-500/10 border border-red-500/20",
                candidate.isCurrentPlayer && "ring-2 ring-amber-400/50"
              )}
            >
              <span className={cn(
                "w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold",
                candidate.inTicketZone ? "bg-green-500 text-white" : "bg-red-500/50 text-white/80"
              )}>
                {candidate.position}
              </span>
              <Avatar className="h-6 w-6">
                <AvatarImage src={candidate.avatarUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {candidate.playerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className={cn(
                "flex-1 text-sm truncate",
                candidate.isCurrentPlayer ? "text-amber-400 font-bold" : "text-white"
              )}>
                {candidate.playerName}
              </span>
              <span className="text-white/60 text-xs">
                {candidate.chips.toLocaleString()}
              </span>
              {candidate.inTicketZone && (
                <Ticket className="h-3.5 w-3.5 text-amber-400" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-2 bg-white/5 text-center">
        <span className="text-white/40 text-xs">
          Топ {satelliteInfo.ticketsAwarded} получат билеты
        </span>
      </div>
    </motion.div>
  );
}

export default SatelliteProgress;
