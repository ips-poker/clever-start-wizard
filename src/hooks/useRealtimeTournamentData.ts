import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Tournament {
  id: string;
  name: string;
  current_level: number;
  current_small_blind: number;
  current_big_blind: number;
  timer_duration: number;
  timer_remaining: number;
  buy_in: number;
  starting_chips: number;
  status: string;
}

interface Registration {
  id: string;
  status: string;
  rebuys: number;
  addons: number;
  chips?: number;
  seat_number?: number;
  table_number?: number;
  player_id: string;
}

interface BlindLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration: number;
  is_break: boolean;
}

interface UseRealtimeTournamentDataProps {
  tournamentId: string;
}

export function useRealtimeTournamentData({ tournamentId }: UseRealtimeTournamentDataProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>([]);
  const [loading, setLoading] = useState(true);

  // Загрузка данных турнира
  const loadTournamentData = useCallback(async () => {
    if (!tournamentId) return;

    try {
      setLoading(true);

      // Загружаем данные турнира
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;
      if (tournamentData) setTournament(tournamentData);

      // Загружаем структуру блайндов
      const { data: blindData, error: blindError } = await supabase
        .from('blind_levels')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('level', { ascending: true });

      if (blindError) throw blindError;
      if (blindData) setBlindLevels(blindData);

      // Загружаем регистрации с данными игроков
      const { data: registrationData, error: registrationError } = await supabase
        .from('tournament_registrations')
        .select(`
          *,
          player:players(*)
        `)
        .eq('tournament_id', tournamentId);

      if (registrationError) throw registrationError;
      if (registrationData) setRegistrations(registrationData);

    } catch (error) {
      console.error('Error loading tournament data:', error);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  // Настройка real-time подписок
  useEffect(() => {
    if (!tournamentId) return;

    loadTournamentData();

    // Подписка на изменения турнира
    const tournamentChannel = supabase
      .channel('tournament-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${tournamentId}`
        },
        (payload) => {
          console.log('Tournament updated:', payload);
          if (payload.new) {
            setTournament(payload.new as Tournament);
          }
        }
      )
      .subscribe();

    // Подписка на изменения регистраций
    const registrationChannel = supabase
      .channel('registrations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_registrations',
          filter: `tournament_id=eq.${tournamentId}`
        },
        (payload) => {
          console.log('Registration updated:', payload);
          loadTournamentData(); // Перезагружаем все регистрации при изменении
        }
      )
      .subscribe();

    // Подписка на изменения блайндов
    const blindLevelsChannel = supabase
      .channel('blind-levels-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blind_levels',
          filter: `tournament_id=eq.${tournamentId}`
        },
        (payload) => {
          console.log('Blind levels updated:', payload);
          loadTournamentData(); // Перезагружаем структуру блайндов
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tournamentChannel);
      supabase.removeChannel(registrationChannel);
      supabase.removeChannel(blindLevelsChannel);
    };
  }, [tournamentId, loadTournamentData]);

  return {
    tournament,
    registrations,
    blindLevels,
    loading,
    refreshData: loadTournamentData
  };
}