import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TournamentState {
  id: string;
  tournament_id: string;
  timer_active: boolean;
  timer_started_at: string | null;
  timer_paused_at: string | null;
  timer_remaining: number | null;
  last_sync_at: string;
  sync_source: string | null;
}

interface UseTournamentSyncProps {
  tournamentId: string;
  onTimerUpdate?: (timerRemaining: number, isActive: boolean) => void;
}

export function useTournamentSync({ tournamentId, onTimerUpdate }: UseTournamentSyncProps) {
  const [tournamentState, setTournamentState] = useState<TournamentState | null>(null);
  const [isSync, setIsSync] = useState(false);
  const { toast } = useToast();

  // Загрузка состояния турнира
  const loadTournamentState = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_state')
        .select('*')
        .eq('tournament_id', tournamentId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading tournament state:', error);
        return;
      }

      if (data) {
        setTournamentState(data);
        if (onTimerUpdate) {
          onTimerUpdate(data.timer_remaining || 0, data.timer_active);
        }
      }
    } catch (error) {
      console.error('Error loading tournament state:', error);
    }
  }, [tournamentId, onTimerUpdate]);

  // Обновление состояния турнира
  const updateTournamentState = useCallback(async (updates: Partial<TournamentState>) => {
    if (isSync) return; // Предотвращаем циклические обновления

    try {
      setIsSync(true);
      
      const updateData = {
        ...updates,
        tournament_id: tournamentId,
        last_sync_at: new Date().toISOString(),
        sync_source: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
      };

      const { data, error } = await supabase
        .from('tournament_state')
        .upsert(updateData, { onConflict: 'tournament_id' })
        .select()
        .single();

      if (error) throw error;

      setTournamentState(data);
    } catch (error) {
      console.error('Error updating tournament state:', error);
      toast({
        title: 'Ошибка синхронизации',
        description: 'Не удалось синхронизировать состояние турнира',
        variant: 'destructive',
      });
    } finally {
      setIsSync(false);
    }
  }, [tournamentId, isSync, toast]);

  // Запуск таймера
  const startTimer = useCallback(async (timerRemaining: number) => {
    await updateTournamentState({
      timer_active: true,
      timer_started_at: new Date().toISOString(),
      timer_paused_at: null,
      timer_remaining: timerRemaining
    });
  }, [updateTournamentState]);

  // Пауза таймера
  const pauseTimer = useCallback(async (timerRemaining: number) => {
    await updateTournamentState({
      timer_active: false,
      timer_paused_at: new Date().toISOString(),
      timer_remaining: timerRemaining
    });
  }, [updateTournamentState]);

  // Обновление оставшегося времени
  const updateTimerRemaining = useCallback(async (timerRemaining: number) => {
    await updateTournamentState({
      timer_remaining: timerRemaining
    });
  }, [updateTournamentState]);

  // Синхронизация времени с сервером
  const syncTimeWithServer = useCallback(() => {
    if (!tournamentState || !tournamentState.timer_active || !tournamentState.timer_started_at) {
      return tournamentState?.timer_remaining || 0;
    }

    const startTime = new Date(tournamentState.timer_started_at).getTime();
    const pauseTime = tournamentState.timer_paused_at ? new Date(tournamentState.timer_paused_at).getTime() : null;
    const currentTime = Date.now();

    if (pauseTime) {
      // Таймер на паузе
      return tournamentState.timer_remaining || 0;
    }

    // Вычисляем оставшееся время
    const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
    const remainingTime = (tournamentState.timer_remaining || 0) - elapsedSeconds;

    return Math.max(0, remainingTime);
  }, [tournamentState]);

  // Настройка real-time подписки
  useEffect(() => {
    loadTournamentState();

    const channel = supabase
      .channel('tournament_state_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_state',
          filter: `tournament_id=eq.${tournamentId}`
        },
        (payload) => {
          console.log('Tournament state changed:', payload);
          
          if (payload.new && !isSync) {
            const newState = payload.new as TournamentState;
            setTournamentState(newState);
            
            if (onTimerUpdate) {
              const currentTime = syncTimeWithServer();
              onTimerUpdate(currentTime, newState.timer_active);
            }
            
            toast({
              title: 'Турнир синхронизирован',
              description: `Обновлено с ${newState.sync_source || 'другого устройства'}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, loadTournamentState, onTimerUpdate, isSync, syncTimeWithServer, toast]);

  return {
    tournamentState,
    startTimer,
    pauseTimer,
    updateTimerRemaining,
    syncTimeWithServer,
    isSync
  };
}