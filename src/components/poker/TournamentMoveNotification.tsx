/**
 * Tournament Move Notification
 * Shows when a player is moved to a different table during balancing
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoveRight, Table2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface TournamentMoveNotificationProps {
  playerId: string;
  tournamentId: string;
  onJoinNewTable: (tableId: string) => void;
}

export function TournamentMoveNotification({ 
  playerId, 
  tournamentId,
  onJoinNewTable 
}: TournamentMoveNotificationProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [newTableId, setNewTableId] = useState<string | null>(null);
  const [newTableName, setNewTableName] = useState<string>('');
  const [newSeatNumber, setNewSeatNumber] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(10);

  // Subscribe to participant updates
  useEffect(() => {
    let previousTableId: string | null = null;

    const checkCurrentTable = async () => {
      const { data } = await supabase
        .from('online_poker_tournament_participants')
        .select('table_id, seat_number')
        .eq('player_id', playerId)
        .eq('tournament_id', tournamentId)
        .single();

      if (data) {
        previousTableId = data.table_id;
      }
    };

    checkCurrentTable();

    const channel = supabase
      .channel(`player-move-${playerId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'online_poker_tournament_participants',
        filter: `player_id=eq.${playerId}`
      }, async (payload) => {
        const newData = payload.new as any;
        
        // Check if table changed
        if (newData.table_id && newData.table_id !== previousTableId && previousTableId !== null) {
          // Fetch new table name
          const { data: tableData } = await supabase
            .from('poker_tables')
            .select('name')
            .eq('id', newData.table_id)
            .single();

          setNewTableId(newData.table_id);
          setNewTableName(tableData?.name || 'Новый стол');
          setNewSeatNumber(newData.seat_number);
          setShowNotification(true);
          setCountdown(10);
          previousTableId = newData.table_id;
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId, tournamentId]);

  // Countdown timer
  useEffect(() => {
    if (!showNotification || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Auto-join when countdown reaches 0
          if (newTableId) {
            onJoinNewTable(newTableId);
          }
          setShowNotification(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showNotification, countdown, newTableId, onJoinNewTable]);

  const handleJoinNow = () => {
    if (newTableId) {
      onJoinNewTable(newTableId);
    }
    setShowNotification(false);
  };

  return (
    <AnimatePresence>
      {showNotification && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="bg-gradient-to-br from-amber-900/90 to-black/90 rounded-2xl border-2 border-amber-500/50 p-6 max-w-md mx-4 shadow-2xl"
          >
            <div className="text-center space-y-4">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="relative">
                  <motion.div
                    animate={{ x: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="flex items-center gap-3"
                  >
                    <div className="p-3 bg-amber-500/20 rounded-full">
                      <Table2 className="h-8 w-8 text-amber-400" />
                    </div>
                    <MoveRight className="h-6 w-6 text-amber-500" />
                    <div className="p-3 bg-green-500/20 rounded-full">
                      <Users className="h-8 w-8 text-green-400" />
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-white">
                Вас переместили!
              </h2>

              {/* Description */}
              <p className="text-white/80">
                Для балансировки столов вы переведены на:
              </p>

              {/* New table info */}
              <div className="bg-black/40 rounded-lg p-4 border border-amber-500/30">
                <div className="text-amber-400 font-semibold text-lg">
                  {newTableName}
                </div>
                {newSeatNumber && (
                  <div className="text-white/60 text-sm mt-1">
                    Место #{newSeatNumber}
                  </div>
                )}
              </div>

              {/* Countdown */}
              <div className="flex items-center justify-center gap-2">
                <span className="text-white/60">Автоматический переход через:</span>
                <span className="text-2xl font-bold text-amber-400 font-mono w-8">
                  {countdown}
                </span>
              </div>

              {/* Action button */}
              <Button
                onClick={handleJoinNow}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3"
              >
                Перейти сейчас
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TournamentMoveNotification;
