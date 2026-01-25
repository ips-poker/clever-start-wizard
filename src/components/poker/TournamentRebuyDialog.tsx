/**
 * Tournament Rebuy Dialog
 * Shows when player loses all chips in tournament with rebuy enabled
 * Provides countdown timer, rebuy and leave options
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Diamond, Timer, LogOut, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TournamentRebuyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  playerId: string;
  tableId: string;
  timeoutSeconds: number;
  timestamp: number;
  onRebuySuccess: (newChips: number) => void;
  onLeave: () => void;
  notifyServer?: (newChips: number) => void; // Notify WebSocket server after RPC
}

export function TournamentRebuyDialog({
  isOpen,
  onClose,
  tournamentId,
  playerId,
  tableId,
  timeoutSeconds,
  timestamp,
  onRebuySuccess,
  onLeave,
  notifyServer
}: TournamentRebuyDialogProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeoutSeconds);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tournamentInfo, setTournamentInfo] = useState<{
    name: string;
    rebuy_cost: number;
    rebuy_chips: number;
  } | null>(null);

  // Fetch tournament info
  useEffect(() => {
    if (!isOpen || !tournamentId) return;
    
    const fetchTournamentInfo = async () => {
      const { data } = await supabase
        .from('online_poker_tournaments')
        .select('name, rebuy_cost, rebuy_chips, starting_chips')
        .eq('id', tournamentId)
        .single();
      
      if (data) {
        setTournamentInfo({
          name: data.name,
          rebuy_cost: data.rebuy_cost || data.starting_chips || 5000,
          rebuy_chips: data.rebuy_chips || data.starting_chips || 5000
        });
      }
    };
    
    fetchTournamentInfo();
  }, [isOpen, tournamentId]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;
    
    // Calculate time remaining based on timestamp
    const elapsed = Math.floor((Date.now() - timestamp) / 1000);
    const remaining = Math.max(0, timeoutSeconds - elapsed);
    setTimeRemaining(remaining);
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-leave when timer expires
          onLeave();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isOpen, timeoutSeconds, timestamp, onLeave]);

  const handleRebuy = useCallback(async () => {
    if (!tournamentInfo || isProcessing) return;
    
    setIsProcessing(true);
    try {
      // Call RPC directly for rebuy - handles wallet deduction and chip addition
      const { data, error } = await supabase.rpc('process_online_tournament_rebuy', {
        p_tournament_id: tournamentId,
        p_player_id: playerId
      });

      if (error) {
        console.error('Rebuy RPC error:', error);
        toast.error(error.message || 'Ошибка при ребае');
        return;
      }

      const result = data as { success: boolean; error?: string; new_chips?: number; rebuy_cost?: number; new_balance?: number } | null;

      if (!result?.success) {
        toast.error(result?.error || 'Ошибка при ребае');
        return;
      }

      toast.success(`Ребай выполнен! +${tournamentInfo.rebuy_chips.toLocaleString()} фишек`);
      
      const newChips = result.new_chips || tournamentInfo.rebuy_chips;
      
      // CRITICAL: Notify WebSocket server to sync stack in memory and prevent timeout elimination
      notifyServer?.(newChips);
      
      onRebuySuccess(newChips);
      onClose();
    } catch (err) {
      console.error('Rebuy failed:', err);
      toast.error('Не удалось выполнить ребай');
    } finally {
      setIsProcessing(false);
    }
  }, [tournamentId, playerId, tournamentInfo, isProcessing, onRebuySuccess, onClose]);

  const handleLeave = useCallback(() => {
    onLeave();
    onClose();
  }, [onLeave, onClose]);

  if (!isOpen) return null;

  const isUrgent = timeRemaining <= 10;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className={`w-full max-w-sm rounded-2xl shadow-2xl border overflow-hidden ${
            isUrgent 
              ? 'bg-gradient-to-b from-red-900/90 to-slate-900 border-red-500/50' 
              : 'bg-gradient-to-b from-amber-900/50 to-slate-900 border-amber-500/30'
          }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${
            isUrgent ? 'border-red-500/30' : 'border-amber-500/20'
          }`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${isUrgent ? 'text-red-400' : 'text-amber-400'}`} />
              <span className="font-semibold text-white">Вы выбыли!</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
              onClick={handleLeave}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Timer */}
            <div className={`text-center py-4 rounded-xl ${
              isUrgent ? 'bg-red-500/20' : 'bg-amber-500/10'
            }`}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Timer className={`h-6 w-6 ${isUrgent ? 'text-red-400 animate-pulse' : 'text-amber-400'}`} />
                <span className={`text-4xl font-bold ${isUrgent ? 'text-red-400' : 'text-amber-400'}`}>
                  {timeRemaining}
                </span>
              </div>
              <p className="text-sm text-white/70">
                {isUrgent ? 'Срочно примите решение!' : 'секунд на решение'}
              </p>
            </div>

            {/* Tournament info */}
            {tournamentInfo && (
              <div className="bg-black/30 rounded-lg p-3 space-y-2">
                <div className="text-center">
                  <p className="text-white/60 text-xs">Турнир</p>
                  <p className="text-white font-medium truncate">{tournamentInfo.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                  <div className="text-center">
                    <p className="text-white/60 text-xs">Стоимость ребая</p>
                    <p className="text-amber-400 font-bold flex items-center justify-center gap-1">
                      {tournamentInfo.rebuy_cost.toLocaleString()}
                      <Diamond className="h-3 w-3" />
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/60 text-xs">Получите фишек</p>
                    <p className="text-green-400 font-bold">
                      {tournamentInfo.rebuy_chips.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleLeave}
                disabled={isProcessing}
                variant="outline"
                className="h-14 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Покинуть
              </Button>
              
              <Button
                onClick={handleRebuy}
                disabled={isProcessing || !tournamentInfo}
                className="h-14 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-semibold"
              >
                {isProcessing ? (
                  <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Diamond className="h-5 w-5 mr-2" />
                )}
                Ребай
              </Button>
            </div>

            <p className="text-center text-xs text-white/50">
              При истечении времени вы автоматически покинете турнир
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
