/**
 * Tournament Elimination Modal
 * Shows when player is eliminated from tournament with position and prize info
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Award, X, Eye, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TournamentEliminationModalProps {
  playerId: string;
  tournamentId: string;
  onClose?: () => void;
}

interface EliminationData {
  finish_position: number | null;
  prize_amount: number | null;
  tournament_name: string;
  total_players: number;
  eliminated_by_name?: string;
}

export function TournamentEliminationModal({ 
  playerId, 
  tournamentId,
  onClose 
}: TournamentEliminationModalProps) {
  const [showModal, setShowModal] = useState(false);
  const [eliminationData, setEliminationData] = useState<EliminationData | null>(null);
  const navigate = useNavigate();

  // Subscribe to elimination
  useEffect(() => {
    if (!playerId || !tournamentId) return;

    const channel = supabase
      .channel(`elimination-${playerId}-${tournamentId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'online_poker_tournament_participants',
        filter: `player_id=eq.${playerId}`
      }, async (payload) => {
        const newData = payload.new as any;
        const oldData = payload.old as any;

        // Check if player was just eliminated
        if (newData.status === 'eliminated' && oldData?.status !== 'eliminated') {
          // Fetch full elimination info
          await fetchEliminationData(newData);
        }
      })
      .subscribe();

    // Also check current status on mount
    checkCurrentStatus();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId, tournamentId]);

  const checkCurrentStatus = async () => {
    const { data } = await supabase
      .from('online_poker_tournament_participants')
      .select('status, finish_position, prize_amount, eliminated_by')
      .eq('player_id', playerId)
      .eq('tournament_id', tournamentId)
      .single();

    if (data?.status === 'eliminated' && data.finish_position) {
      await fetchEliminationData(data);
    }
  };

  const fetchEliminationData = async (participantData: any) => {
    // Get tournament info
    const { data: tournament } = await supabase
      .from('online_poker_tournaments')
      .select('name')
      .eq('id', tournamentId)
      .single();

    // Get total players count
    const { count: totalPlayers } = await supabase
      .from('online_poker_tournament_participants')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .neq('status', 'cancelled');

    // Get eliminator name if exists
    let eliminatedByName: string | undefined;
    if (participantData.eliminated_by) {
      const { data: eliminator } = await supabase
        .from('players')
        .select('name')
        .eq('id', participantData.eliminated_by)
        .single();
      eliminatedByName = eliminator?.name;
    }

    setEliminationData({
      finish_position: participantData.finish_position,
      prize_amount: participantData.prize_amount || 0,
      tournament_name: tournament?.name || 'Турнир',
      total_players: totalPlayers || 0,
      eliminated_by_name: eliminatedByName,
    });

    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    onClose?.();
  };

  const handleSpectate = () => {
    setShowModal(false);
    // Stay on the page in spectator mode
  };

  const handleGoToResults = () => {
    setShowModal(false);
    navigate(`/online-poker/tournament/${tournamentId}/results`);
  };

  const handleGoToLobby = () => {
    setShowModal(false);
    navigate('/online-poker');
  };

  // Position badge component
  const getPositionDisplay = (position: number) => {
    const isTopThree = position <= 3;
    const icons = {
      1: <Trophy className="h-12 w-12 text-yellow-400" />,
      2: <Medal className="h-12 w-12 text-gray-300" />,
      3: <Award className="h-12 w-12 text-amber-600" />,
    };

    return (
      <div className={cn(
        "flex flex-col items-center gap-2",
        isTopThree && "animate-pulse"
      )}>
        {icons[position as keyof typeof icons] || (
          <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{position}</span>
          </div>
        )}
        <span className={cn(
          "text-3xl font-bold",
          position === 1 ? "text-yellow-400" :
          position === 2 ? "text-gray-300" :
          position === 3 ? "text-amber-600" :
          "text-white"
        )}>
          {position === 1 ? '🥇 1-е место!' :
           position === 2 ? '🥈 2-е место!' :
           position === 3 ? '🥉 3-е место!' :
           `${position}-е место`}
        </span>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {showModal && eliminationData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            className={cn(
              "relative rounded-2xl border-2 p-6 max-w-md mx-4 shadow-2xl",
              eliminationData.finish_position === 1 
                ? "bg-gradient-to-br from-yellow-900/90 via-amber-800/90 to-yellow-900/90 border-yellow-500/70"
                : eliminationData.finish_position && eliminationData.finish_position <= 3
                ? "bg-gradient-to-br from-gray-800/90 via-gray-700/90 to-gray-800/90 border-gray-400/70"
                : eliminationData.prize_amount && eliminationData.prize_amount > 0
                ? "bg-gradient-to-br from-green-900/90 to-black/90 border-green-500/50"
                : "bg-gradient-to-br from-red-900/90 to-black/90 border-red-500/50"
            )}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 p-1 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
            >
              <X className="h-5 w-5 text-white/70" />
            </button>

            <div className="text-center space-y-4">
              {/* Position display */}
              {eliminationData.finish_position && getPositionDisplay(eliminationData.finish_position)}

              {/* Tournament name */}
              <p className="text-white/70 text-sm">
                {eliminationData.tournament_name}
              </p>

              {/* Out of X players */}
              <p className="text-white/60 text-sm">
                из {eliminationData.total_players} участников
              </p>

              {/* Eliminated by */}
              {eliminationData.eliminated_by_name && eliminationData.finish_position !== 1 && (
                <p className="text-red-300/80 text-sm">
                  Вас выбил: <span className="font-semibold">{eliminationData.eliminated_by_name}</span>
                </p>
              )}

              {/* Prize */}
              {eliminationData.prize_amount && eliminationData.prize_amount > 0 ? (
                <div className="bg-black/40 rounded-lg p-4 border border-green-500/30">
                  <div className="text-green-400 text-sm mb-1">Ваш выигрыш:</div>
                  <div className="text-3xl font-bold text-green-400">
                    💎 {eliminationData.prize_amount.toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="bg-black/40 rounded-lg p-4 border border-white/10">
                  <div className="text-white/60 text-sm">
                    К сожалению, вы не попали в призовую зону
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleSpectate}
                  className="flex items-center gap-2 border-white/20 hover:bg-white/10"
                >
                  <Eye className="h-4 w-4" />
                  Наблюдать
                </Button>
                <Button
                  onClick={handleGoToLobby}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black"
                >
                  <Home className="h-4 w-4" />
                  В лобби
                </Button>
              </div>

              {eliminationData.finish_position && eliminationData.finish_position <= 10 && (
                <Button
                  variant="ghost"
                  onClick={handleGoToResults}
                  className="w-full text-white/60 hover:text-white"
                >
                  Посмотреть итоговые результаты →
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TournamentEliminationModal;
