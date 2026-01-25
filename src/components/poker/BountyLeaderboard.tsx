/**
 * BountyLeaderboard - Shows top bounty hunters in PKO tournament
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Crosshair, Crown, Skull, Medal, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getMaskedName } from '@/hooks/useMaskedPlayerName';

interface BountyLeaderboardProps {
  tournamentId: string;
  currentPlayerId?: string;
  className?: string;
  maxPlayers?: number;
}

interface BountyHunter {
  playerId: string;
  playerName: string;
  avatarUrl: string | null;
  knockouts: number;
  bountiesCollected: number;
  currentBounty: number;
  isCurrentPlayer: boolean;
}

export function BountyLeaderboard({
  tournamentId,
  currentPlayerId,
  className,
  maxPlayers = 5
}: BountyLeaderboardProps) {
  const [hunters, setHunters] = useState<BountyHunter[]>([]);
  const [isPKO, setIsPKO] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [startingBounty, setStartingBounty] = useState(0);

  useEffect(() => {
    if (!tournamentId) return;

    const fetchLeaderboard = async () => {
      // Check if tournament is PKO format
      const { data: tournament } = await supabase
        .from('online_poker_tournaments')
        .select('tournament_format, buy_in')
        .eq('id', tournamentId)
        .single();

      if (!tournament || tournament.tournament_format !== 'pko') {
        setIsPKO(false);
        return;
      }

      setIsPKO(true);
      const bounty = Math.floor((tournament.buy_in || 0) * 0.5);
      setStartingBounty(bounty);

      // Use new RPC function for efficient bounty leaderboard
      const { data: leaderboardData, error: rpcError } = await supabase
        .rpc('get_pko_bounty_leaderboard', {
          p_tournament_id: tournamentId,
          p_limit: 20
        });

      if (rpcError || !leaderboardData) {
        // Fallback to direct query if RPC fails
        const { data: participants } = await supabase
          .from('online_poker_tournament_participants')
          .select(`
            player_id,
            knockouts_count,
            bounty_collected,
            bounty_value,
            players:player_id (
              id,
              name,
              avatar_url
            )
          `)
          .eq('tournament_id', tournamentId)
          .gt('knockouts_count', 0)
          .order('knockouts_count', { ascending: false });

        if (participants) {
          const hunterData: BountyHunter[] = participants.map(p => {
            const player = p.players as any;
            return {
              playerId: p.player_id,
              playerName: getMaskedName(p.player_id, player?.name || 'Unknown'),
              avatarUrl: player?.avatar_url || null,
              knockouts: p.knockouts_count || 0,
              bountiesCollected: p.bounty_collected || 0,
              currentBounty: p.bounty_value || bounty,
              isCurrentPlayer: p.player_id === currentPlayerId
            };
          });
          setHunters(hunterData);
        }
        return;
      }

      // Use RPC result
      const hunterData: BountyHunter[] = (leaderboardData as any[]).map(h => ({
        playerId: h.player_id,
        playerName: h.player_name || 'Unknown',
        avatarUrl: h.avatar_url || null,
        knockouts: h.knockouts || 0,
        bountiesCollected: h.bounty_collected || 0,
        currentBounty: h.current_bounty || bounty,
        isCurrentPlayer: h.player_id === currentPlayerId
      }));

      // Sort by knockouts (most first)
      hunterData.sort((a, b) => b.knockouts - a.knockouts);
      setHunters(hunterData);
    };

    fetchLeaderboard();

    // Real-time subscription
    const channel = supabase
      .channel(`bounty-leaderboard-${tournamentId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'online_poker_tournament_participants',
        filter: `tournament_id=eq.${tournamentId}`
      }, () => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, currentPlayerId]);

  if (!isPKO || hunters.length === 0) {
    return null;
  }

  const displayedHunters = expanded ? hunters : hunters.slice(0, maxPlayers);

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 0:
        return <Crown className="h-4 w-4 text-amber-400" />;
      case 1:
        return <Medal className="h-4 w-4 text-gray-300" />;
      case 2:
        return <Medal className="h-4 w-4 text-amber-700" />;
      default:
        return <span className="text-white/40 text-xs w-4 text-center">{position + 1}</span>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-gradient-to-br from-red-900/60 to-black/60 backdrop-blur-md",
        "rounded-xl border border-red-500/30 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-red-500/20 border-b border-red-500/20">
        <div className="flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-red-500" />
          <span className="text-white font-semibold text-sm">Охотники за баунти</span>
        </div>
        <div className="flex items-center gap-1">
          <Skull className="h-3.5 w-3.5 text-red-400" />
          <span className="text-red-400 text-xs font-bold">{hunters.reduce((sum, h) => sum + h.knockouts, 0)} KO</span>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="divide-y divide-white/10">
        {displayedHunters.map((hunter, index) => (
          <motion.div
            key={hunter.playerId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex items-center gap-3 px-3 py-2",
              hunter.isCurrentPlayer && "bg-amber-500/10"
            )}
          >
            {/* Position */}
            <div className="w-5 flex justify-center">
              {getMedalIcon(index)}
            </div>

            {/* Avatar */}
            <Avatar className="h-7 w-7">
              <AvatarImage src={hunter.avatarUrl || undefined} />
              <AvatarFallback className="text-xs bg-red-500/20 text-red-400">
                {hunter.playerName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className={cn(
                "text-sm font-medium truncate",
                hunter.isCurrentPlayer ? "text-amber-400" : "text-white"
              )}>
                {hunter.playerName}
                {hunter.isCurrentPlayer && " (вы)"}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <Skull className="h-3.5 w-3.5 text-red-400" />
                <span className="text-red-400 font-bold">{hunter.knockouts}</span>
              </div>
              <div className="text-green-400 font-bold">
                +{hunter.bountiesCollected.toLocaleString()}💎
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Expand/Collapse */}
      {hunters.length > maxPlayers && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-2 text-white/50 hover:text-white/80 text-xs transition-colors border-t border-white/10"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Свернуть
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Показать всех ({hunters.length})
            </>
          )}
        </button>
      )}
    </motion.div>
  );
}

export default BountyLeaderboard;
