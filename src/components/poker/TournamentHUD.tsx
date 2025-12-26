/**
 * Tournament HUD - Displays tournament info overlay on poker table
 * Shows: Current level, blinds, ante, time remaining, players left, avg stack, BB count
 */
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Clock, Users, TrendingUp, Layers, ChevronUp, ChevronDown, Target, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TournamentHUDProps {
  tournamentId: string;
  currentPlayerId?: string;
  className?: string;
  compact?: boolean;
}

interface TournamentInfo {
  id: string;
  name: string;
  status: string;
  current_level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  level_end_at: string | null;
  prize_pool: number;
  starting_chips: number;
}

interface LevelInfo {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number | null;
  duration: number | null;
  is_break: boolean;
}

interface PlayerRanking {
  position: number;
  totalPlayers: number;
  stack: number;
  bbCount: number;
}

export function TournamentHUD({ 
  tournamentId, 
  currentPlayerId,
  className, 
  compact = false 
}: TournamentHUDProps) {
  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [nextLevel, setNextLevel] = useState<LevelInfo | null>(null);
  const [playersRemaining, setPlayersRemaining] = useState(0);
  const [totalChips, setTotalChips] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(!compact);
  const [isBreak, setIsBreak] = useState(false);
  const [playerRanking, setPlayerRanking] = useState<PlayerRanking | null>(null);

  // Fetch tournament data
  useEffect(() => {
    if (!tournamentId) return;

    const fetchTournament = async () => {
      const { data, error } = await supabase
        .from('online_poker_tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (!error && data) {
        setTournament(data);
        
        // Check if current level is a break
        const { data: currentLevelData } = await supabase
          .from('online_poker_tournament_levels')
          .select('*')
          .eq('tournament_id', tournamentId)
          .eq('level', data.current_level || 1)
          .single();
        
        if (currentLevelData) {
          setIsBreak(currentLevelData.is_break || false);
        }
      }
    };

    const fetchNextLevel = async () => {
      if (!tournament?.current_level) return;
      
      const { data } = await supabase
        .from('online_poker_tournament_levels')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('level', tournament.current_level + 1)
        .single();

      if (data) {
        setNextLevel(data);
      }
    };

    const fetchParticipants = async () => {
      const { data, count } = await supabase
        .from('online_poker_tournament_participants')
        .select('player_id, chips', { count: 'exact' })
        .eq('tournament_id', tournamentId)
        .eq('status', 'playing');

      if (data) {
        setPlayersRemaining(count || 0);
        setTotalChips(data.reduce((sum, p) => sum + (p.chips || 0), 0));
        
        // Calculate current player ranking
        if (currentPlayerId) {
          const sortedByChips = [...data].sort((a, b) => (b.chips || 0) - (a.chips || 0));
          const playerIndex = sortedByChips.findIndex(p => p.player_id === currentPlayerId);
          
          if (playerIndex !== -1) {
            const playerData = sortedByChips[playerIndex];
            setPlayerRanking({
              position: playerIndex + 1,
              totalPlayers: count || 0,
              stack: playerData.chips || 0,
              bbCount: tournament?.big_blind ? Math.floor((playerData.chips || 0) / tournament.big_blind) : 0,
            });
          }
        }
      }
    };

    fetchTournament();
    fetchParticipants();

    // Fetch next level when tournament loads
    if (tournament?.current_level) {
      fetchNextLevel();
    }

    // Real-time subscription
    const channel = supabase
      .channel(`tournament-hud-${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'online_poker_tournaments',
        filter: `id=eq.${tournamentId}`
      }, () => {
        fetchTournament();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'online_poker_tournament_participants',
        filter: `tournament_id=eq.${tournamentId}`
      }, () => {
        fetchParticipants();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, tournament?.current_level, currentPlayerId, tournament?.big_blind]);

  // Timer countdown
  useEffect(() => {
    if (!tournament?.level_end_at) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const endTime = new Date(tournament.level_end_at!).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [tournament?.level_end_at]);

  // Calculate average stack
  const avgStack = useMemo(() => {
    if (playersRemaining === 0) return 0;
    return Math.round(totalChips / playersRemaining);
  }, [totalChips, playersRemaining]);

  // Calculate average BB
  const avgBB = useMemo(() => {
    if (!tournament?.big_blind || tournament.big_blind === 0) return 0;
    return Math.round(avgStack / tournament.big_blind);
  }, [avgStack, tournament?.big_blind]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get BB indicator color
  const getBBColor = (bb: number) => {
    if (bb >= 30) return 'text-green-400';
    if (bb >= 15) return 'text-amber-400';
    if (bb >= 10) return 'text-orange-400';
    return 'text-red-400';
  };

  if (!tournament || tournament.status === 'registration') {
    return null;
  }

  // Compact view
  if (compact && !expanded) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "absolute top-2 left-2 z-40",
          className
        )}
      >
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-amber-500/30 text-white/90 text-xs font-medium hover:bg-black/80 transition-colors"
        >
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          <span>Ур.{tournament.current_level}</span>
          <span className="text-amber-400">
            {(tournament.small_blind || 0).toLocaleString()}/{(tournament.big_blind || 0).toLocaleString()}
          </span>
          {playerRanking && (
            <span className={cn("font-mono", getBBColor(playerRanking.bbCount))}>
              {playerRanking.bbCount}BB
            </span>
          )}
          {timeRemaining !== null && (
            <span className={cn(
              "font-mono",
              timeRemaining <= 60 ? "text-red-400" : "text-white/70"
            )}>
              {formatTime(timeRemaining)}
            </span>
          )}
          <ChevronDown className="h-3 w-3 text-white/50" />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "absolute top-2 left-2 z-40",
        className
      )}
    >
      <div className="bg-gradient-to-br from-black/80 to-black/60 backdrop-blur-md rounded-xl border border-amber-500/30 overflow-hidden min-w-[220px]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-amber-500/10 border-b border-amber-500/20">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="text-white font-semibold text-sm truncate max-w-[140px]">
              {tournament.name}
            </span>
          </div>
          {compact && (
            <button
              onClick={() => setExpanded(false)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <ChevronUp className="h-3 w-3 text-white/50" />
            </button>
          )}
        </div>

        {/* Level & Blinds */}
        <div className="px-3 py-2 border-b border-white/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/60 text-xs">
              {isBreak ? 'Перерыв' : `Уровень ${tournament.current_level}`}
            </span>
            {timeRemaining !== null && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-mono",
                timeRemaining <= 60 ? "text-red-400 animate-pulse" : 
                timeRemaining <= 120 ? "text-amber-400" : "text-white/80"
              )}>
                <Clock className="h-3 w-3" />
                {formatTime(timeRemaining)}
              </div>
            )}
          </div>
          
          {!isBreak && (
            <div className="flex items-center gap-2">
              <div className="text-amber-400 font-bold text-lg">
                {(tournament.small_blind || 0).toLocaleString()}/{(tournament.big_blind || 0).toLocaleString()}
              </div>
              {(tournament.ante || 0) > 0 && (
                <span className="text-white/50 text-xs">
                  анте {(tournament.ante || 0).toLocaleString()}
                </span>
              )}
            </div>
          )}

          {isBreak && (
            <div className="text-amber-400 font-bold">
              ☕ Перерыв
            </div>
          )}
        </div>

        {/* Current Player Stats */}
        {playerRanking && !isBreak && (
          <div className="px-3 py-2 bg-gradient-to-r from-amber-500/10 to-transparent border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-white/80 text-xs">Ваша позиция:</span>
                <span className="text-amber-400 font-bold">
                  #{playerRanking.position}/{playerRanking.totalPlayers}
                </span>
              </div>
              <div className={cn(
                "flex items-center gap-1 font-bold text-sm",
                getBBColor(playerRanking.bbCount)
              )}>
                <Coins className="h-3.5 w-3.5" />
                {playerRanking.bbCount} BB
              </div>
            </div>
          </div>
        )}

        {/* Next Level Preview */}
        {nextLevel && !isBreak && (
          <div className="px-3 py-1.5 bg-white/5 border-b border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">
                {nextLevel.is_break ? 'След: Перерыв' : `След: ${nextLevel.small_blind.toLocaleString()}/${nextLevel.big_blind.toLocaleString()}`}
              </span>
              {nextLevel.ante && nextLevel.ante > 0 && (
                <span className="text-white/40">анте {nextLevel.ante.toLocaleString()}</span>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="px-3 py-2 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-blue-400" />
            <div className="text-xs">
              <span className="text-white font-medium">{playersRemaining}</span>
              <span className="text-white/50 ml-1">игроков</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-green-400" />
            <div className="text-xs">
              <span className="text-white font-medium">{avgStack.toLocaleString()}</span>
              <span className={cn("ml-1 font-medium", getBBColor(avgBB))}>
                ({avgBB}BB)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 col-span-2">
            <Layers className="h-3.5 w-3.5 text-amber-400" />
            <div className="text-xs">
              <span className="text-amber-400 font-medium">
                {(tournament.prize_pool || 0).toLocaleString()}
              </span>
              <span className="text-white/50 ml-1">💎 призовой фонд</span>
            </div>
          </div>
        </div>

        {/* Status bar */}
        {tournament.status === 'break' && (
          <div className="px-3 py-1.5 bg-amber-500/20 text-center">
            <span className="text-amber-400 text-xs font-medium">⏸ ПЕРЕРЫВ</span>
          </div>
        )}
        
        {tournament.status === 'final_table' && (
          <div className="px-3 py-1.5 bg-red-500/20 text-center">
            <span className="text-red-400 text-xs font-medium">🏆 ФИНАЛЬНЫЙ СТОЛ</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default TournamentHUD;
