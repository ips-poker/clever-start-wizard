import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseClubTournamentsOptions {
  clanId?: string;
  status?: string;
}

export function useClubTournaments({ clanId, status }: UseClubTournamentsOptions = {}) {
  const queryClient = useQueryClient();

  const { data: tournaments, isLoading, error } = useQuery({
    queryKey: ["club-tournaments", clanId, status],
    queryFn: async () => {
      let query = supabase
        .from('tournaments')
        .select('*')
        .order('start_time', { ascending: false });

      // Фильтр по клубу
      if (clanId) {
        query = query.eq('clan_id', clanId);
      }

      // Фильтр по статусу
      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!clanId,
  });

  const createTournament = useMutation({
    mutationFn: async (tournamentData: {
      name: string;
      description?: string;
      start_time: string;
      max_players?: number;
      starting_chips?: number;
      participation_fee?: number;
      tournament_format?: string;
      // Re-entry settings
      reentry_fee?: number;
      reentry_chips?: number;
      reentry_end_level?: number;
      // Addon settings
      additional_fee?: number;
      additional_chips?: number;
      additional_level?: number;
      // Timer settings
      timer_duration?: number;
      break_start_level?: number;
      players_per_table?: number;
    }) => {
      if (!clanId) throw new Error("No clan ID");

      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          ...tournamentData,
          clan_id: clanId,
          status: 'scheduled',
          current_level: 1,
          current_small_blind: 25,
          current_big_blind: 50
        })
        .select()
        .single();

      if (error) throw error;

      // Create default blind structure for the tournament
      const defaultLevels = [
        { level: 1, small_blind: 25, big_blind: 50, ante: 0, duration: tournamentData.timer_duration || 900, is_break: false },
        { level: 2, small_blind: 50, big_blind: 100, ante: 0, duration: tournamentData.timer_duration || 900, is_break: false },
        { level: 3, small_blind: 75, big_blind: 150, ante: 0, duration: tournamentData.timer_duration || 900, is_break: false },
        { level: 4, small_blind: 100, big_blind: 200, ante: 25, duration: tournamentData.timer_duration || 900, is_break: false },
        { level: 5, small_blind: 0, big_blind: 0, ante: 0, duration: 600, is_break: true },
        { level: 6, small_blind: 150, big_blind: 300, ante: 50, duration: tournamentData.timer_duration || 900, is_break: false },
        { level: 7, small_blind: 200, big_blind: 400, ante: 50, duration: tournamentData.timer_duration || 900, is_break: false },
        { level: 8, small_blind: 300, big_blind: 600, ante: 75, duration: tournamentData.timer_duration || 900, is_break: false },
        { level: 9, small_blind: 400, big_blind: 800, ante: 100, duration: tournamentData.timer_duration || 900, is_break: false },
        { level: 10, small_blind: 0, big_blind: 0, ante: 0, duration: 600, is_break: true },
        { level: 11, small_blind: 500, big_blind: 1000, ante: 100, duration: tournamentData.timer_duration || 900, is_break: false },
        { level: 12, small_blind: 600, big_blind: 1200, ante: 200, duration: tournamentData.timer_duration || 900, is_break: false },
      ];

      await supabase
        .from('blind_levels')
        .insert(defaultLevels.map(level => ({
          tournament_id: data.id,
          ...level
        })));

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-tournaments", clanId] });
      queryClient.invalidateQueries({ queryKey: ["club-usage", clanId] });
      toast.success("Турнир создан");
    },
    onError: (error) => {
      console.error("Error creating tournament:", error);
      toast.error("Ошибка при создании турнира");
    }
  });

  const updateTournament = useMutation({
    mutationFn: async ({ 
      id, 
      ...updateData 
    }: { 
      id: string; 
      [key: string]: any;
    }) => {
      const { data, error } = await supabase
        .from('tournaments')
        .update(updateData)
        .eq('id', id)
        .eq('clan_id', clanId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-tournaments", clanId] });
      toast.success("Турнир обновлён");
    },
    onError: (error) => {
      console.error("Error updating tournament:", error);
      toast.error("Ошибка при обновлении турнира");
    }
  });

  const deleteTournament = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id)
        .eq('clan_id', clanId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-tournaments", clanId] });
      queryClient.invalidateQueries({ queryKey: ["club-usage", clanId] });
      toast.success("Турнир удалён");
    },
    onError: (error) => {
      console.error("Error deleting tournament:", error);
      toast.error("Ошибка при удалении турнира");
    }
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["club-tournaments", clanId] });
  };

  return {
    tournaments: tournaments || [],
    loading: isLoading,
    error,
    createTournament,
    updateTournament,
    deleteTournament,
    refetch
  };
}
