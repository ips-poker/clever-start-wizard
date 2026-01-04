/**
 * BountyDisplay - Shows player's current bounty value and collected bounties
 * For PKO (Progressive Knockout) tournaments
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Crosshair, DollarSign, Crown, Skull, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BountyDisplayProps {
  tournamentId: string;
  playerId: string;
  className?: string;
  compact?: boolean;
}

interface BountyInfo {
  currentBounty: number;
  collectedBounties: number;
  knockouts: number;
  startingBounty: number;
}

export function BountyDisplay({
  tournamentId,
  playerId,
  className,
  compact = false
}: BountyDisplayProps) {
  const [bountyInfo, setBountyInfo] = useState<BountyInfo | null>(null);
  const [isPKO, setIsPKO] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (!tournamentId || !playerId) return;

    const fetchBountyInfo = async () => {
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

      // Get participant data with bounty info
      const { data: participant } = await supabase
        .from('online_poker_tournament_participants')
        .select('player_id, knockouts_count, bounty_collected, bounty_value')
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId)
        .single();

      if (participant) {
        // Use new bounty columns from database
        const startingBounty = Math.floor((tournament.buy_in || 0) * 0.5);
        
        // Use database-stored values if available, otherwise calculate
        const knockoutCount = (participant as any).knockouts_count || 0;
        const collectedBounties = (participant as any).bounty_collected || (knockoutCount * startingBounty * 0.5);
        const currentBounty = (participant as any).bounty_value || (startingBounty + collectedBounties);

        setBountyInfo({
          currentBounty,
          collectedBounties,
          knockouts: knockoutCount,
          startingBounty
        });
      }
    };

    fetchBountyInfo();

    // Real-time subscription for bounty updates
    const channel = supabase
      .channel(`bounty-${tournamentId}-${playerId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'online_poker_tournament_participants',
        filter: `tournament_id=eq.${tournamentId}`
      }, (payload) => {
        // Check if someone was eliminated by this player
        if (payload.new && (payload.new as any).eliminated_by === playerId) {
          setShowAnimation(true);
          setTimeout(() => setShowAnimation(false), 2000);
        }
        fetchBountyInfo();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, playerId]);

  if (!isPKO || !bountyInfo) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full",
        "bg-red-500/20 border border-red-500/30",
        className
      )}>
        <Crosshair className="h-3.5 w-3.5 text-red-400" />
        <span className="text-red-400 font-bold text-xs">
          {bountyInfo.currentBounty.toLocaleString()}💎
        </span>
        {bountyInfo.knockouts > 0 && (
          <span className="text-white/60 text-xs">
            ({bountyInfo.knockouts}KO)
          </span>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "bg-gradient-to-br from-red-900/80 to-black/60 backdrop-blur-md",
        "rounded-xl border border-red-500/30 overflow-hidden min-w-[180px]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-red-500/20 border-b border-red-500/20">
        <div className="flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-red-500" />
          <span className="text-white font-semibold text-sm">Баунти PKO</span>
        </div>
        <AnimatePresence>
          {showAnimation && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="flex items-center gap-1"
            >
              <Skull className="h-4 w-4 text-red-400" />
              <span className="text-red-400 text-xs font-bold">KO!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Your Bounty */}
      <div className="px-3 py-2 border-b border-white/10">
        <div className="text-white/60 text-xs mb-1">Ваш баунти:</div>
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-400" />
          <span className="text-amber-400 font-bold text-xl">
            {bountyInfo.currentBounty.toLocaleString()} 💎
          </span>
        </div>
        {bountyInfo.currentBounty > bountyInfo.startingBounty && (
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="h-3 w-3 text-green-400" />
            <span className="text-green-400 text-xs">
              +{(bountyInfo.currentBounty - bountyInfo.startingBounty).toLocaleString()} от КО
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="px-3 py-2 grid grid-cols-2 gap-2">
        <div>
          <div className="text-white/50 text-xs">Нокауты:</div>
          <div className="flex items-center gap-1">
            <Skull className="h-3.5 w-3.5 text-red-400" />
            <span className="text-white font-bold">{bountyInfo.knockouts}</span>
          </div>
        </div>
        <div>
          <div className="text-white/50 text-xs">Собрано:</div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-green-400" />
            <span className="text-green-400 font-bold">
              {bountyInfo.collectedBounties.toLocaleString()}💎
            </span>
          </div>
        </div>
      </div>

      {/* Bounty Info */}
      <div className="px-3 py-1.5 bg-white/5 text-center">
        <span className="text-white/40 text-xs">
          50% за КО, 50% на ваш баунти
        </span>
      </div>
    </motion.div>
  );
}

export default BountyDisplay;
